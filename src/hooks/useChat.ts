import { useState, useCallback, useRef } from 'react'
import { streamChatWithUsage } from '../lib/engine'
import { useTokenStats } from './useTokenStats'
import {
  createMessage,
  generateTitle,
  saveSessions,
  loadSessions,
  createSession,
} from '../lib/storage'
import type { ChatSession, ChatMessage } from '../types'
import type { PromptTemplate } from '../lib/prompts'
import type { MarketplacePersona } from '../data/personaRegistry'
import { PROMPT_TEMPLATES } from '../lib/prompts'

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

export function useChat(modelId: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [context, setContext] = useState('')
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
    const loaded = await loadSessions()
    if (loaded.length > 0) {
      setSessions(loaded)
      setActiveSessionId(loaded[0].id)
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

        // Start token tracking
        tokenStats.startStreaming()
        let fullContent = ''
        let tokenCount = 0

        const { generator, usage } = streamChatWithUsage(messagesToSend, {
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

        // Finalize with usage stats
        tokenStats.finishStreaming(
          usage.current ?? {
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
    ],
  )

  const sendMessage = useCallback(
    (content: string, sessionContext?: string, images?: Array<{ id: string; data: string; name?: string }>, files?: Array<{ id: string; name: string; size: number; type: string; content: string }>) => {
      if ((isGenerating || (!content.trim() && !images && !files)) && !images && !files) return
      sendUserMessage(content, undefined, undefined, sessionContext, images, files)
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
  }
}
