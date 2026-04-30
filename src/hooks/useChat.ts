import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { streamChatWithUsage, streamChatWithProvider } from '../lib/engine'
import { loadApiSettings, saveApiSettings, deleteApiSettings, loadOllamaSettings, loadLmStudioSettings, loadLlamaCppSettings, loadVllmSettings, loadDeepSeekSettings, loadSearXngSettings, saveSearXngSettings, deleteSearXngSettings, loadSkills } from '../lib/storage'
import type { OpenAISettings } from '../lib/openaiApi'
import type { LmStudioModel } from '../lib/lmStudioApi'
import { streamLmStudio } from '../lib/lmStudioApi'
import type { VllmModel } from '../lib/vllmApi'
import { streamVllm } from '../lib/vllmApi'
import type { DeepSeekModel } from '../lib/deepSeekApi'
import { streamDeepSeek } from '../lib/deepSeekApi'
import type { SearXNGResult } from '../lib/searxngApi'
import { searchSearXNG, testSearXNG } from '../lib/searxngApi'
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
import type { ChatSession, ChatMessage, CitationEntry, ToolCallEvent, MemorySummary } from '../types'
import type { PromptTemplate, CustomPersona } from '../lib/prompts'
import type { MarketplacePersona } from '../data/personaRegistry'
import { PROMPT_TEMPLATES } from '../lib/prompts'
import { getModelById, MODELS } from '../lib/models'
import { toolRegistry } from '../lib/toolRegistry'
import { streamChatWithTools, getToolCalls } from '../lib/engine'
import { useVectorStore } from './useVectorStore'
import { useMultiTurnMemory } from './useMultiTurnMemory'
import { hasModelChaining, getModelChainConfig } from '../lib/modelChaining'
import type { ModelChainConfig, ChainProgress } from '../lib/modelChaining'
import { recordTokenUsage } from '../lib/usageAnalytics'

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

/**
 * Get the persona (built-in, custom, or marketplace) for a session.
 */
function getActivePersona(session: ChatSession | null): { draftModelId?: string; refineModelId?: string } | null {
  if (!session?.personaId) return null
  // Check built-in personas
  const builtin = PROMPT_TEMPLATES.find((p) => p.id === session.personaId)
  if (builtin) return { draftModelId: builtin.draftModelId, refineModelId: builtin.refineModelId }
  // Check custom personas
  try {
    const raw = localStorage.getItem('monday-custom-personas')
    if (raw) {
      const custom: CustomPersona[] = JSON.parse(raw)
      const found = custom.find((p) => p.id === session.personaId)
      if (found) return { draftModelId: found.draftModelId, refineModelId: found.refineModelId }
    }
  } catch {
    // Ignore parse errors
  }
  return null
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
  // v1.0.7: SearXNG web search state
  const [searxngUrl, setSearXngUrl] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearXNGResult[] | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  // v0.27: tool call events for display
  const [toolCallEvents, setToolCallEvents] = useState<ToolCallEvent[]>([])
  // v0.30: model chaining state
  const [chainProgress, setChainProgress] = useState<ChainProgress | null>(null)
  const [draftContent, setDraftContent] = useState<string | null>(null)
  const abortRef = useRef(false)
  const sessionsLoaded = useRef(false)
  const tokenStats = useTokenStats()

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const messages = activeSession?.messages ?? []

  // v0.30: multi-turn memory
  const memory = useMultiTurnMemory(
    activeSessionId,
    messages,
    {
      onSummaryGenerated: async (sessionId, summary) => {
        // Persist the new summary to the session
        const current = [...sessionsRef.current]
        const updated = current.map((s) =>
          s.id === sessionId
            ? { ...s, summaries: [...s.summaries, summary], updatedAt: Date.now() }
            : s,
        )
        await persistSessions(updated)
      },
    },
  )

  // Always keep a ref to the latest sessions so sendUserMessage can read
  // up-to-date session data (e.g. systemPrompt) without relying on the closure.
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

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

  // v1.0.7: load SearXNG settings on mount
  useEffect(() => {
    loadSearXngSettings().then((s) => {
      if (s) setSearXngUrl(s.url)
    }).catch(() => {})
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

  // v1.0.7: SearXNG web search handlers
  const toggleSearch = useCallback(async (query: string): Promise<SearXNGResult[] | null> => {
    if (!searxngUrl) return null
    if (isSearching) return null

    if (searchResults && searchResults.length > 0) {
      setSearchResults(null)
      setSearchQuery('')
      return null
    }

    setIsSearching(true)
    setSearchResults(null)
    setSearchQuery(query)
    try {
      const results = await searchSearXNG(searxngUrl, query)
      setSearchResults(results.length > 0 ? results : null)
      return results.length > 0 ? results : null
    } catch {
      console.warn('[monday] SearXNG search failed:', searxngUrl)
      return null
    } finally {
      setIsSearching(false)
    }
  }, [searxngUrl, isSearching, searchResults])

  const testSearchConnection = useCallback(async () => {
    if (!searxngUrl) return false
    return testSearXNG(searxngUrl)
  }, [searxngUrl])

  const saveSearXngUrl = useCallback(async (url: string) => {
    await saveSearXngSettings({ url }).catch(() => {})
    setSearXngUrl(url)
  }, [])

  const clearSearXngUrl = useCallback(async () => {
    await deleteSearXngSettings().catch(() => {})
    setSearXngUrl(null)
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

        // v0.30: auto-compress early turns if context is getting full
        let sessionSummaries: MemorySummary[] = []
        if (memory.needsSummarization && !memory.isSummarizing) {
          try {
            await memory.compressEarlyTurns(active.messages)
            // Read updated session to get new summaries
            const refreshed = sessionsRef.current.find((s) => s.id === sessionId)
            sessionSummaries = refreshed?.summaries ?? []
          } catch {
            // Summarization failed — continue without it
          }
        }
        sessionSummaries = latestSession?.summaries ?? []

        // v0.30: build system prompt with summaries injected
        let summarizedPrompt = memory.getSummarizedSystemPrompt(opts.systemPrompt ?? '')

        // v1.1: inject active skill instructions into system prompt
        if (latestSession?.skillIds?.length) {
          try {
            const allSkills = await loadSkills()
            const activeSkills = latestSession.skillIds
              .map((id) => allSkills.find((s) => s.id === id))
              .filter((s): s is NonNullable<typeof s> => !!s)
            if (activeSkills.length > 0) {
              const skillBlocks = activeSkills.map((s) => `## Skill: ${s.name}\n${s.instructions}`).join('\n\n')
              summarizedPrompt = summarizedPrompt + '\n\n' + skillBlocks
            }
          } catch {
            // Skill loading failed — continue without it
          }
        }

        // v0.30: check if active persona has model chaining configured
        const activePersona = getActivePersona(latestSession ?? active)
        const chainConfig = getModelChainConfig(activePersona)
        let effectiveModelId = modelId
        let draftForRefine: string | null = null

        if (chainConfig) {
          // Run draft generation first
          setChainProgress({ status: 'loading_draft' })
          try {
            const { runModelChain } = await import('../lib/modelChaining').then(m => m)
            const draft = await runModelChain(
              content,
              chainConfig,
              messagesToSend.map(m => ({ role: m.role, content: m.content })),
              summarizedPrompt,
              {
                onProgress: (progress) => setChainProgress(progress),
                onDraftComplete: (draftText) => setDraftContent(draftText),
              },
            )
            draftForRefine = draft
            // Switch to refine model — runModelChain already unloaded both engines
            effectiveModelId = chainConfig.refineModelId
            setChainProgress({ status: 'done', refinedContent: draft })
          } catch {
            // Model chaining failed — fall back to normal generation
            setChainProgress(null)
          }
        }

        // v1.0.0: check if using external API provider
        const activeProvider = latestSession?.provider ?? null
        let apiSettings: OpenAISettings | null = null
        let ollamaSettings: { url: string; modelId: string } | null = null
        let lmStudioSettings: { url: string; modelId: string } | null = null
        let llamaCppSettings: { url: string; modelId: string } | null = null
        let vllmSettings: { url: string; modelId: string } | null = null
        let deepSeekSettings: { baseUrl: string; apiKey: string; modelId: string } | null = null
        if (activeProvider === 'openai') {
          try {
            apiSettings = await loadApiSettings()
          } catch {
            // Ignore — will fall through to local
          }
        }
        if (activeProvider === 'ollama') {
          try {
            ollamaSettings = await loadOllamaSettings()
          } catch {
            // Ignore — will fall through to local
          }
        }
        if (activeProvider === 'lmstudio') {
          try {
            lmStudioSettings = await loadLmStudioSettings()
          } catch {
            // Ignore — will fall through to local
          }
        }
        if (activeProvider === 'llamacpp') {
          try {
            const llamaSettings = await loadLlamaCppSettings()
            if (llamaSettings) {
              llamaCppSettings = { url: llamaSettings.url, modelId: llamaSettings.modelId }
            }
          } catch {
            // Ignore — will fall through to local
          }
        }
        if (activeProvider === 'vllm') {
          try {
            const vSettings = await loadVllmSettings()
            if (vSettings) {
              vllmSettings = { url: vSettings.url, modelId: vSettings.modelId }
            }
          } catch {
            // Ignore — will fall through to local
          }
        }
        if (activeProvider === 'deepseek') {
          try {
            const dsSettings = await loadDeepSeekSettings()
            if (dsSettings) {
              deepSeekSettings = { baseUrl: dsSettings.baseUrl, apiKey: dsSettings.apiKey, modelId: dsSettings.modelId }
            }
          } catch {
            // Ignore — will fall through to local
          }
        }

        // Check if the current model supports tools
        const modelInfo = getModelById(effectiveModelId)
        const supportsTools = modelInfo?.tags?.includes('tools') ?? false
        const toolDefs = supportsTools ? toolRegistry.getDefinitions() : []

        // Start token tracking
        tokenStats.startStreaming()
        let fullContent = ''
        let tokenCount = 0
        let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null

        // v0.30: append draft as context if model chaining produced one
        let refineMessages = messagesToSend
        if (draftForRefine) {
          refineMessages = messagesToSend.map((m, i) =>
            i === messagesToSend.length - 1
              ? { ...m, content: m.content + `\n\n[Draft]\n${draftForRefine}\n\n[Refine this draft — improve accuracy, clarity, and completeness.]\n` }
              : m,
          )
        }

        // v1.0.0: external API path
        if (activeProvider === 'openai' && apiSettings) {
          try {
            const { streamOpenAI } = await import('../lib/openaiApi')
            let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null
            for await (const token of streamOpenAI(
              refineMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system' | 'tool', content: m.content })),
              {
                settings: apiSettings,
                temperature: opts.temperature ?? 0.7,
                topP: opts.top_p ?? 0.9,
                maxTokens: opts.maxTokens ?? 1024,
                systemPrompt: summarizedPrompt,
              },
            )) {
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
            // Usage is captured from the last chunk — use a ref to get it
            // For now, estimate from tokenCount
            finalUsage = { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount }
          } catch (apiErr: unknown) {
            const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
            throw new Error(`OpenAI API error: ${msg}`)
          }
        } else if (activeProvider === 'ollama' && ollamaSettings) {
          // v1.0.1: Ollama local server path
          try {
            const { streamOllama } = await import('../lib/ollamaApi')
            let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null
            for await (const token of streamOllama(
              ollamaSettings.url,
              ollamaSettings.modelId,
              refineMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system' | 'tool', content: m.content })),
              {
                temperature: opts.temperature ?? 0.7,
                topP: opts.top_p ?? 0.9,
                maxTokens: opts.maxTokens ?? 1024,
                systemPrompt: summarizedPrompt,
              },
            )) {
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
            finalUsage = { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount }
          } catch (ollamaErr: unknown) {
            const msg = ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr)
            throw new Error(`Ollama error: ${msg}`)
          }
        } else if (activeProvider === 'lmstudio' && lmStudioSettings) {
          // v1.0.2: LM Studio local server path
          try {
            let lmUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null
            for await (const token of streamLmStudio(
              lmStudioSettings.url,
              lmStudioSettings.modelId,
              refineMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system' | 'tool', content: m.content })),
              {
                temperature: opts.temperature ?? 0.7,
                topP: opts.top_p ?? 0.9,
                maxTokens: opts.maxTokens ?? 1024,
                systemPrompt: summarizedPrompt,
              },
            )) {
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
            finalUsage = { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount }
          } catch (lmstudioErr: unknown) {
            const msg = lmstudioErr instanceof Error ? lmstudioErr.message : String(lmstudioErr)
            throw new Error(`LM Studio error: ${msg}`)
          }
        } else if (activeProvider === 'llamacpp' && llamaCppSettings) {
          // v1.0.3: llama.cpp local server path
          try {
            const { streamLlama } = await import('../lib/llamaCppApi')
            let llamaUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null
            for await (const token of streamLlama(
              llamaCppSettings.url,
              llamaCppSettings.modelId,
              refineMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system' | 'tool', content: m.content })),
              {
                temperature: opts.temperature ?? 0.7,
                topP: opts.top_p ?? 0.9,
                maxTokens: opts.maxTokens ?? 1024,
                systemPrompt: summarizedPrompt,
              },
            )) {
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
            finalUsage = { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount }
          } catch (llamaErr: unknown) {
            const msg = llamaErr instanceof Error ? llamaErr.message : String(llamaErr)
            throw new Error(`llama.cpp error: ${msg}`)
          }
        } else if (activeProvider === 'vllm' && vllmSettings) {
          // v1.0.4: vLLM local server path
          try {
            let fullContent = ''
            let tokenCount = 0
            let finalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null
            for await (const token of streamVllm(
              vllmSettings.url,
              vllmSettings.modelId,
              refineMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system' | 'tool', content: m.content })),
              {
                temperature: opts.temperature ?? 0.7,
                topP: opts.top_p ?? 0.9,
                maxTokens: opts.maxTokens ?? 1024,
                systemPrompt: summarizedPrompt,
              },
            )) {
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
            finalUsage = { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount }
          } catch (vllmErr: unknown) {
            const msg = vllmErr instanceof Error ? vllmErr.message : String(vllmErr)
            throw new Error(`vLLM error: ${msg}`)
          }
        } else if (activeProvider === 'deepseek' && deepSeekSettings) {
          // v1.0.5: DeepSeek cloud API path
          try {
            let dsFullContent = ''
            let dsTokenCount = 0
            let dsFinalUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null
            for await (const token of streamDeepSeek(
              deepSeekSettings.baseUrl,
              deepSeekSettings.modelId,
              deepSeekSettings.apiKey,
              refineMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system' | 'tool', content: m.content })),
              {
                temperature: opts.temperature ?? 0.7,
                topP: opts.top_p ?? 0.9,
                maxTokens: opts.maxTokens ?? 1024,
                systemPrompt: summarizedPrompt,
              },
            )) {
              if (abortRef.current) break
              dsFullContent += token
              dsTokenCount++
              tokenStats.addTokens(1)
              const captured = dsFullContent
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
            dsFinalUsage = { promptTokens: 0, completionTokens: dsTokenCount, totalTokens: dsTokenCount }
          } catch (deepSeekErr: unknown) {
            const msg = deepSeekErr instanceof Error ? deepSeekErr.message : String(deepSeekErr)
            throw new Error(`DeepSeek error: ${msg}`)
          }
        } else if (supportsTools && toolDefs.length > 0) {
          // --- Function calling path (v0.27) ---
          let usedToolsPath = false
          try {
          const events: ToolCallEvent[] = []
          let conversationMessages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }> = [...refineMessages]
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
              systemPrompt: summarizedPrompt,
              context: sessionContext,
              images,
              files,
              tools,
              modelId: effectiveModelId,
            })

            // Stream tokens
            for await (const token of result.generator) {
              if (abortRef.current) break
              usedToolsPath = true
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
          } catch (toolErr: unknown) {
            // If the model doesn't actually support function calling, fall back to standard streaming
            const msg = toolErr instanceof Error ? toolErr.message : String(toolErr)
            const isFunctionCallingError = msg.includes('tool') || msg.includes('function call') || msg.includes('not supported')
            if (isFunctionCallingError && !usedToolsPath) {
              // Fall back to standard streaming silently
              const { generator } = streamChatWithUsage(refineMessages, {
                ...opts,
                systemPrompt: summarizedPrompt,
                context: sessionContext,
                images,
                files,
                modelId: effectiveModelId,
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
            } else {
              throw toolErr
            }
          }
        } else {
          // --- Standard streaming path ---
          const { generator } = streamChatWithUsage(refineMessages, {
            ...opts,
            systemPrompt: summarizedPrompt,
            context: sessionContext,
            images,
            files,
            modelId: effectiveModelId,
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
        const finalUsageData = finalUsage ?? {
          promptTokens: 0,
          completionTokens: tokenCount,
          totalTokens: tokenCount,
        }
        tokenStats.finishStreaming(finalUsageData)

        // v0.30: record token usage for analytics
        const avgTps = tokenStats.stats.tokensPerSecond
        recordTokenUsage(
          effectiveModelId,
          finalUsageData.promptTokens,
          finalUsageData.completionTokens,
          finalUsageData.totalTokens,
          avgTps,
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

  // v1.0.0: set provider for the active session
  const setProvider = useCallback(
    (provider: 'web-llm' | 'openai' | 'ollama' | 'lmstudio' | 'llamacpp' | 'vllm' | 'deepseek' | null) => {
      if (!activeSessionId) return
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? { ...s, provider, updatedAt: Date.now() }
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
        skillIds: [],
        forkId: source.id,
        summaries: [],
        provider: source.provider,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const updated = [forkedSession, ...sessions]
      setActiveSessionId(forkedSession.id)
      persistSessions(updated)
    },
    [sessions, persistSessions],
  )

  // v0.30: derive chain config from active persona
  const chainConfig = useMemo(() => {
    if (!activeSession?.personaId) return null
    const persona = getActivePersona(activeSession)
    return getModelChainConfig(persona)
  }, [activeSession?.personaId, activeSession?.id])

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
    // v1.0.0: set provider for the active session
    setProvider,
    // v0.28: conversation forking
    forkSession,
    // v0.26.1: knowledge context
    knowledgeContextCount,
    // v0.27: tool call events for display
    toolCallEvents,
    // v0.30: multi-turn memory
    memory,
    // v0.30: model chaining
    chainConfig,
    chainProgress,
    draftContent,
    // v1.0.7: SearXNG web search state
    searxngUrl,
    isSearching,
    searchResults,
    searchQuery,
    toggleSearch,
  }
}
