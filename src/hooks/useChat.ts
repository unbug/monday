import { useState, useCallback, useRef } from 'react'
import { streamChat } from '../lib/engine'
import {
  createMessage,
  generateTitle,
  saveSessions,
  loadSessions,
  createSession,
} from '../lib/storage'
import type { ChatSession, ChatMessage } from '../types'

function paramsForSession(session: ChatSession | undefined) {
  const params = session?.generationParams
  return {
    temperature: params?.temperature ?? 0.7,
    top_p: params?.top_p ?? 0.9,
    maxTokens: params?.maxTokens ?? 1024,
    systemPrompt: session?.systemPrompt,
  }
}

export function useChat(modelId: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const abortRef = useRef(false)
  const sessionsLoaded = useRef(false)

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
    const session = createSession(modelId)
    const updated = [session, ...sessions]
    setActiveSessionId(session.id)
    persistSessions(updated)
    return session.id
  }, [modelId, sessions, persistSessions])

  const sendMessage = useCallback(
    async (content: string) => {
      if (isGenerating || !content.trim()) return

      let currentSessions = [...sessions]
      let sessionId = activeSessionId

      if (!sessionId) {
        const session = createSession(modelId)
        currentSessions = [session, ...currentSessions]
        sessionId = session.id
        setActiveSessionId(sessionId)
      }

      const userMsg = createMessage('user', content)
      const assistantMsg: ChatMessage = {
        ...createMessage('assistant', ''),
        isStreaming: true,
      }

      // Add user message
      currentSessions = currentSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, userMsg],
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
        const history = active.messages.filter((m) => !m.isStreaming).map((m) => ({
          role: m.role,
          content: m.content,
        }))
        const opts = paramsForSession(active)

        let fullContent = ''
        for await (const token of streamChat(history, opts)) {
          if (abortRef.current) break
          fullContent += token
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

        // Finalize
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
            title: s.title === 'New Chat' ? generateTitle(msgs) : s.title,
            updatedAt: Date.now(),
          }
        })

        await persistSessions(currentSessions)
      } catch (err) {
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
    [sessions, activeSessionId, modelId, isGenerating, persistSessions],
  )

  const stopGenerating = useCallback(() => {
    abortRef.current = true
  }, [])

  const deleteSession = useCallback(
    async (id: string) => {
      const updated = sessions.filter((s) => s.id !== id)
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null)
      }
      await persistSessions(updated)
    },
    [sessions, activeSessionId, persistSessions],
  )

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id)
  }, [])

  const updateSessions = useCallback(
    (updated: ChatSession[]) => {
      setSessions(updated)
      saveSessions(updated)
    },
    [],
  )

  return {
    sessions,
    activeSession,
    messages,
    isGenerating,
    initSessions,
    newSession,
    sendMessage,
    stopGenerating,
    deleteSession,
    switchSession,
    updateSessions,
  }
}
