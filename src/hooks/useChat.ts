import { useState, useCallback, useRef } from 'react'
import { streamChatWithUsage } from '../lib/engine'
import { useTokenStats } from './useTokenStats'
import {
  createMessage,
  generateTitle,
  saveSessions,
  loadSessions,
  createSession,
  loadKnowledgeBases,
  loadKnowledgeDocs,
} from '../lib/storage'
import type { ChatSession, ChatMessage, CitationEntry, ToolCallEvent } from '../types'
import type { PromptTemplate } from '../lib/prompts'
import type { MarketplacePersona } from '../data/personaRegistry'
import { PROMPT_TEMPLATES } from '../lib/prompts'
import { getModelById } from '../lib/models'
import { toolRegistry } from '../lib/toolRegistry'
import { streamChatWithTools, getToolCalls } from '../lib/engine'
import { useVectorStore } from './useVectorStore'

function paramsForSession(session: ChatSession | undefined) {
  const params = session?.generationParams
  return {
    temperature: params?.temperature ?? 0.7,
    top_p: params?.top_p ?? 0.9,
    maxTokens: params?.maxTokens ?? 1024,
    systemPrompt: session?.systemPrompt,
    personaId: session?.personaId,
  }
}

export function useChat(
  modelId: string,
  options?: { onGenerationComplete?: (title: string, body: string) => void },
) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [context, setContext] = useState('')
  // v0.26.1: tracks how many knowledge chunks were injected on last send
  const [knowledgeContextCount, setKnowledgeContextCount] = useState<number | undefined>(undefined)
  // v0.27: tool call events for display
  const [toolCallEvents, setToolCallEvents] = useState<ToolCallEvent[]>([])
  const abortRef = useRef(false)
  const sessionsLoaded = useRef(false)
  const tokenStats = useTokenStats()

  // Always keep a ref to the latest sessions so sendUserMessage can read
  // up-to-date session data (e.g. systemPrompt) without relying on the closure.
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const messages = activeSession?.messages ?? []

  const persistSessions = useCallback(async (updated: ChatSession[]) => {
    setSessions(updated)
    await saveSessions(updated)
  }, [])

  const initSessions = useCallback(async () => {
    if (sessionsLoaded.current) return
    sessionsLoaded.current = true
    try {
      const loaded = await loadSessions()
      if (loaded.length > 0) {
        setSessions(loaded)
        setActiveSessionId(loaded[0].id)
      }
    } catch (err) {
      console.error('[monday] Failed to load sessions from IndexedDB:', err)
    }
  }, [])

  const newSession = useCallback(() => {
    tokenStats.reset()
    const session = createSession(modelId)
    const updated = [session, ...sessions]
    setActiveSessionId(session.id)
    persistSessions(updated)
    return session.id
  }, [modelId, sessions, persistSessions, tokenStats])

  const stopGenerating = useCallback(() => {
    abortRef.current = true
  }, [])

  /**
   * Internal function to send a message and stream the response.
   * Used by both sendMessage and regenerateMessage.
   */
  const sendUserMessage = useCallback(
    async (
      content: string,
      userMsg?: ChatMessage,
      existingAssistantMsg?: ChatMessage,
      sessionContext?: string,
      images?: Array<{ id: string; data: string; name?: string }>,
      files?: Array<{ id: string; name: string; size: number; type: string; content: string }>,
      citations?: CitationEntry[],
    ) => {
      let currentSessions = [...sessions]
      let sessionId = activeSessionId

      if (!sessionId) {
        const session = createSession(modelId)
        currentSessions = [session, ...currentSessions]
        sessionId = session.id
        setActiveSessionId(sessionId)
      }

      const messageToSend =
        userMsg ?? createMessage('user', content)
      const assistantMsg =
        existingAssistantMsg ?? {
          ...createMessage('assistant', ''),
          isStreaming: true,
          ...(citations && citations.length > 0 ? { citations } : {}),
        }

      // Add user message
      currentSessions = currentSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, messageToSend],
              updatedAt: Date.now(),
            }
          : s,
      )
      setSessions(currentSessions)
      setIsGenerating(true)
      abortRef.current = false

      // Add empty assistant message
      currentSessions = currentSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, assistantMsg],
            }
          : s,
      )
      setSessions(currentSessions)

      try {
        const active = currentSessions.find((s) => s.id === sessionId)!
        const history = active.messages
          .filter((m) => !m.isStreaming)
          .map((m) => ({ role: m.role, content: m.content }))

        // Prepend context to the first user message
        let messagesToSend = history
        if (sessionContext?.trim()) {
          const prefix = `Context:\n${sessionContext}\n\n---\n\n`
          messagesToSend = history.map((m, i) =>
            i === 0
              ? { ...m, content: prefix + m.content }
              : m,
          )
        }

        // Read session config (incl. systemPrompt) from the ref so we always
        // use the most recently saved value, even if the closure is stale.
        const latestSession = sessionsRef.current.find((s) => s.id === sessionId)
        const opts = paramsForSession(latestSession ?? active)

        // Check if the current model supports tools
        const modelInfo = getModelById(modelId)
        const supportsTools = modelInfo?.tags?.includes('tools') ?? false
        const toolDefs = supportsTools ? toolRegistry.getDefinitions() : []

        // Start token tracking
        tokenStats.startStreaming()
        let fullContent = ''
        let tokenCount = 0
        let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null

        if (supportsTools && toolDefs.length > 0) {
          // --- Function calling path (v0.27) ---
          const events: ToolCallEvent[] = []
          let conversationMessages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }> = [...messagesToSend]
          let maxTurns = 5

          while (maxTurns > 0 && !abortRef.current) {
            const tools = toolDefs.map((t) => ({
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
              type: 'function' as const,
            }))

            const result = streamChatWithTools(conversationMessages, {
              ...opts,
              context: sessionContext,
              images,
              files,
              tools,
            })

            // Stream tokens
            for await (const token of result.generator) {
              if (abortRef.current) break
              fullContent += token
              tokenCount++
              tokenStats.addTokens(1)
              const captured = fullContent
              currentSessions = currentSessions.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsg.id
                          ? { ...m, content: captured }
                          : m,
                      ),
                    }
                  : s,
              )
              setSessions([...currentSessions])
            }

            // Capture usage from stream
            if (result.usage.current) {
              finalUsage = result.usage.current
            }

            // Check for tool calls
            const toolCalls = getToolCalls(result.generator)

            if (!toolCalls || toolCalls.length === 0) {
              // No tool calls — done
              break
            }

            // Execute each tool call
            for (const tc of toolCalls) {
              if (abortRef.current) break

              const call = {
                id: tc.id,
                name: tc.name,
                args: tc.args,
                rawArgs: tc.rawArgs,
              }

              events.push({ type: 'tool_call', call })
              setToolCallEvents([...events])

              const toolResult = await toolRegistry.execute(call)
              events.push({ type: 'tool_result', call, result: toolResult })
              setToolCallEvents([...events])

              // Append tool message to conversation
              const toolMessage = toolRegistry.resultToToolMessage(call, toolResult)
              conversationMessages.push(toolMessage)
            }

            maxTurns--
          }

          setToolCallEvents(events)
        } else {
          // --- Standard streaming path ---
          const { generator } = streamChatWithUsage(messagesToSend, {
            ...opts,
            context: sessionContext,
            images,
            files,
          })
          for await (const token of generator) {
            if (abortRef.current) break
            fullContent += token
            tokenCount++
            tokenStats.addTokens(1)
            const captured = fullContent
            currentSessions = currentSessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: captured }
                        : m,
                    ),
                  }
                : s,
            )
            setSessions([...currentSessions])
          }
        }

        // v0.29.2: notify user if tab was hidden during generation
        if (options?.onGenerationComplete && fullContent.trim()) {
          const preview = fullContent.trim().slice(0, 120)
          options.onGenerationComplete('Generation complete', preview)
        }

        // Finalize with usage stats
        tokenStats.finishStreaming(
          finalUsage ?? {
            promptTokens: 0,
            completionTokens: tokenCount,
            totalTokens: tokenCount,
          },
        )

        currentSessions = currentSessions.map((s) => {
          if (s.id !== sessionId) return s
          const msgs = s.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: fullContent, isStreaming: false }
              : m,
          )
          return {
            ...s,
            messages: msgs,
            title:
              s.title === 'New Chat'
                ? generateTitle(msgs)
                : s.title,
            updatedAt: Date.now(),
          }
        })

        // Attach citations to the assistant message if available
        if (citations && citations.length > 0) {
          currentSessions = currentSessions.map((s) => {
            if (s.id !== sessionId) return s
            const msgs = s.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, citations }
                : m,
            )
            return { ...s, messages: msgs }
          })
        }

        await persistSessions(currentSessions)
      } catch (err) {
        tokenStats.finishStreaming({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        })

        const errorContent =
          err instanceof Error ? err.message : 'Generation failed'

        currentSessions = currentSessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        content: `Error: ${errorContent}`,
                        isStreaming: false,
                      }
                    : m,
                ),
              }
            : s,
        )
        await persistSessions(currentSessions)
      } finally {
        setIsGenerating(false)
      }
    },
    [
      sessions,
      activeSessionId,
      modelId,
      persistSessions,
      tokenStats,
      options?.onGenerationComplete,
    ],
  )

  const sendMessage = useCallback(
    async (
      content: string,
      sessionContext?: string,
      images?: Array<{ id: string; data: string; name?: string }>,
      files?: Array<{ id: string; name: string; size: number; type: string; content: string }>,
      knowledgeBaseId?: string,
    ) => {
      if ((isGenerating || (!content.trim() && !images && !files)) && !images && !files) return

      // v0.26.1: semantic search — inject top-K chunks from active knowledge base
      let knowledgeContext = ''
      let searchResults: Array<{ docName: string; id: string; text: string; score: number }> | null = null
      if (knowledgeBaseId) {
        try {
          const bases = await loadKnowledgeBases()
          const docs = await loadKnowledgeDocs()
          const base = bases.find((b) => b.id === knowledgeBaseId)
          if (base && docs.length > 0) {
            const vs = useVectorStore()
            searchResults = await vs.knowledgeSearch(content, knowledgeBaseId, docs, (id) => bases.find((b) => b.id === id))
            if (searchResults.length > 0) {
              knowledgeContext = searchResults
                .map((r) => `[${r.docName}]\n${r.text}`)
                .join('\n\n---\n\n')
            }
          }
        } catch {
          // Semantic search failed — continue without knowledge context
        }
      }

      const combinedContext = [knowledgeContext, sessionContext]
        .filter(Boolean)
        .join('\n\n')

      // v0.26.1: track how many chunks were injected
      setKnowledgeContextCount(knowledgeContext ? knowledgeContext.split('\n\n---\n\n').length : undefined)

      // v0.26: convert search results to citations for display
      const citations: CitationEntry[] | undefined = searchResults && searchResults.length > 0
        ? searchResults.map((r) => ({
            docId: r.docName, // docName is the doc identifier
            docName: r.docName,
            chunkIndex: parseInt(r.id.split(':')[1], 10) || 0,
            score: r.score,
            snippet: r.text.slice(0, 120),
          }))
        : undefined

      sendUserMessage(content, undefined, undefined, combinedContext, images, files, citations)
    },
    [isGenerating, sendUserMessage],
  )

  const regenerateMessage = useCallback(
    (messageId: string) => {
      const active = sessions.find((s) => s.id === activeSessionId)
      if (!active) return

      // Find the last user message before the current assistant response
      const messages = active.messages.filter((m) => !m.isStreaming)
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
      if (!lastUserMsg) return

      // Find the current assistant message
      const assistantMsg = active.messages.find((m) => m.isStreaming)

      // Clear the current assistant response
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.isStreaming
                  ? { ...m, content: '', isStreaming: true }
                  : m,
              ),
            }
          : s,
      )
      setSessions(updatedSessions)

      // Re-send the last user message
      sendUserMessage(lastUserMsg.content, lastUserMsg, assistantMsg)
    },
    [sessions, activeSessionId, sendUserMessage],
  )

  const editMessage = useCallback(
    (messageId: string, newContent: string) => {
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId
                  ? { ...m, content: newContent }
                  : m,
              ),
              updatedAt: Date.now(),
            }
          : s,
      )
      setSessions(updatedSessions)
      persistSessions(updatedSessions)
    },
    [sessions, activeSessionId, persistSessions],
  )

  const deleteSession = useCallback(
    async (id: string) => {
      tokenStats.reset()
      const updated = sessions.filter((s) => s.id !== id)
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null)
      }
      await persistSessions(updated)
    },
    [sessions, activeSessionId, persistSessions, tokenStats],
  )

  const switchSession = useCallback((id: string) => {
    tokenStats.reset()
    setActiveSessionId(id)
  }, [tokenStats])

  const updateSessions = useCallback(
    (updated: ChatSession[]) => {
      setSessions(updated)
      saveSessions(updated)
    },
    [],
  )

  /**
   * Apply a persona to the active session.
   * The persona's system prompt is merged with the session's custom system prompt.
   */
  const applyPersona = useCallback(
    (persona: PromptTemplate | MarketplacePersona) => {
      if (!activeSessionId) return
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              personaId: persona.id,
              // Merge persona system prompt with existing custom prompt
              systemPrompt: [persona.systemPrompt, s.systemPrompt]
                .filter(Boolean)
                .join('\n\n'),
              updatedAt: Date.now(),
            }
          : s,
      )
      persistSessions(updatedSessions)
    },
    [activeSessionId, sessions, persistSessions],
  )

  /**
   * Clear the persona from the active session.
   * Removes the persona system prompt but keeps any custom text the user added.
   */
  const clearPersona = useCallback(() => {
    if (!activeSessionId) return
    const updatedSessions = sessions.map((s) => {
      if (s.id !== activeSessionId) return s
      // Remove persona prefix from system prompt
      const personaPrompts = [
        PROMPT_TEMPLATES.find((p) => p.id === s.personaId)?.systemPrompt,
      ].filter(Boolean)
      let newSystemPrompt = s.systemPrompt
      for (const pp of personaPrompts) {
        if (pp && newSystemPrompt.startsWith(pp)) {
          newSystemPrompt = newSystemPrompt.slice(pp.length).replace(/^\n\n+/, '')
        }
      }
      return {
        ...s,
        personaId: null,
        systemPrompt: newSystemPrompt,
        updatedAt: Date.now(),
      }
    })
    persistSessions(updatedSessions)
  }, [activeSessionId, sessions, persistSessions])

  const clearFiles = useCallback(() => {
    setContext('')
  }, [])

  const removeFile = useCallback((id: string) => {
    // Remove file content from context
    setContext((prev) => {
      const lines = prev?.split('\n') ?? []
      const filtered = lines.filter((line) => !line.includes(`[file:${id}]`))
      return filtered.join('\n')
    })
  }, [])

  const setKnowledgeBaseId = useCallback(
    (id: string | null) => {
      if (!activeSessionId) return
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? { ...s, knowledgeBaseId: id, updatedAt: Date.now() }
          : s,
      )
      persistSessions(updatedSessions)
    },
    [activeSessionId, sessions, persistSessions],
  )

  /**
   * Fork a session at a specific message index.
   * Creates a new session with all messages up to and including messageIndex.
   * The new session's forkId points to the original session.
   */
  const forkSession = useCallback(
    (sourceSessionId: string, messageIndex: number) => {
      const source = sessions.find((s) => s.id === sourceSessionId)
      if (!source) return

      // Copy messages up to and including messageIndex
      const forkedMessages = source.messages.slice(0, messageIndex + 1)

      const forkedSession: ChatSession = {
        id: crypto.randomUUID(),
        title: `Fork of ${source.title}`,
        modelId: source.modelId,
        messages: forkedMessages,
        systemPrompt: source.systemPrompt,
        generationParams: { ...source.generationParams },
        personaId: source.personaId,
        knowledgeBaseId: source.knowledgeBaseId,
        forkId: source.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const updated = [forkedSession, ...sessions]
      setActiveSessionId(forkedSession.id)
      persistSessions(updated)
    },
    [sessions, persistSessions],
  )

  return {
    sessions,
    activeSession,
    messages,
    isGenerating,
    tokenStats: tokenStats.stats,
    isStreaming: tokenStats.isStreaming,
    context,
    setContext,
    initSessions,
    newSession,
    sendMessage,
    stopGenerating,
    regenerateMessage,
    editMessage,
    deleteSession,
    switchSession,
    updateSessions,
    applyPersona,
    clearPersona,
    clearFiles,
    removeFile,
    setKnowledgeBaseId,
    // v0.28: conversation forking
    forkSession,
    // v0.26.1: knowledge context
    knowledgeContextCount,
    // v0.27: tool call events for display
    toolCallEvents,
  }
}
