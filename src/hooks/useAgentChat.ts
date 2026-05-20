import { useState, useCallback, useRef } from 'react'
import { streamText } from 'ai'
import { createWebLLMLanguageModel } from '../lib/webllmLanguageModel'
import { agentTools } from '../lib/agentTools'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: Array<{
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
    result?: unknown
    state: 'call' | 'result'
  }>
  timestamp: number
}

export function useAgentChat(modelId: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!modelId || isGenerating) return

    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    const assistantMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      toolInvocations: [],
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsGenerating(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const model = createWebLLMLanguageModel(modelId)
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const result = streamText({
        model,
        messages: history,
        tools: agentTools,
        maxSteps: 10,
        abortSignal: controller.signal,
        onStepFinish({ toolCalls, toolResults }) {
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last.role !== 'assistant') return prev

            const updated = { ...last }
            if (toolCalls?.length) {
              const calls = toolCalls.map((tc) => ({
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                args: tc.args as Record<string, unknown>,
                state: 'call' as const,
              }))
              updated.toolInvocations = [...(updated.toolInvocations ?? []), ...calls]
            }

            if (toolResults?.length) {
              updated.toolInvocations = (updated.toolInvocations ?? []).map((inv) => {
                const res = toolResults.find((r) => r.toolCallId === inv.toolCallId)
                if (res) return { ...inv, result: res.result, state: 'result' as const }
                return inv
              })
            }

            return [...prev.slice(0, -1), updated]
          })
        },
      })

      for await (const delta of result.textStream) {
        if (controller.signal.aborted) break
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
        })
      }
    } catch (err) {
      if (controller.signal.aborted) return
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last.role !== 'assistant') return prev
        return [
          ...prev.slice(0, -1),
          { ...last, content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
        ]
      })
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [modelId, messages, isGenerating])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isGenerating, sendMessage, stop, clearMessages }
}
