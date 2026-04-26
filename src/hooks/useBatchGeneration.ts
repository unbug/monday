/**
 * useBatchGeneration — orchestrates N parallel streaming generations
 * and tracks per-response progress, content, and stats.
 */
import { useState, useCallback, useRef } from 'react'
import { streamChatWithUsage } from '../lib/engine'
import { streamChatWithTools, getToolCalls } from '../lib/engine'
import { toolRegistry } from '../lib/toolRegistry'
import { getModelById } from '../lib/models'
import type { ToolCallEvent } from '../types'
import type { StreamUsage } from '../lib/engine'

export type BatchResponseStatus = 'pending' | 'streaming' | 'done' | 'error'

export interface BatchResponse {
  id: string
  modelId: string
  status: BatchResponseStatus
  content: string
  usage: StreamUsage | null
  error: string | null
  elapsed: number
}

export interface BatchGenerationState {
  responses: BatchResponse[]
  isRunning: boolean
  count: number
  modelId: string | null
}

interface RunSingleResponseOptions {
  streamOptions: {
    temperature?: number
    top_p?: number
    maxTokens?: number
    systemPrompt?: string
    modelId?: string
  }
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>
  context?: string
  images?: Array<{ id: string; data: string; name?: string }>
  files?: Array<{ id: string; name: string; size: number; type: string; content: string }>
  abortSignal: { current: boolean }
  onUpdate: (response: BatchResponse) => void
}

function createResponse(modelId: string, index: number): BatchResponse {
  return {
    id: `batch-${index}-${crypto.randomUUID()}`,
    modelId,
    status: 'pending',
    content: '',
    usage: null,
    error: null,
    elapsed: 0,
  }
}

export function useBatchGeneration() {
  const [state, setState] = useState<BatchGenerationState>({
    responses: [],
    isRunning: false,
    count: 2,
    modelId: null,
  })

  const abortRef = useRef(false)
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  /**
   * Start batch generation: N parallel streams.
   */
  const startBatch = useCallback(
    (
      count: number,
      streamOptions: RunSingleResponseOptions['streamOptions'],
      conversationHistory: RunSingleResponseOptions['conversationHistory'],
      extraOptions?: {
        context?: string
        images?: Array<{ id: string; data: string; name?: string }>
        files?: Array<{ id: string; name: string; size: number; type: string; content: string }>
      },
    ) => {
      const clampedCount = Math.min(Math.max(count, 2), 4)
      const responses = Array.from({ length: clampedCount }, (_, i) =>
        createResponse(streamOptions.modelId ?? '', i),
      )

      setState({
        responses,
        isRunning: true,
        count: clampedCount,
        modelId: streamOptions.modelId ?? null,
      })

      abortRef.current = false

      // Start each response in parallel
      responses.forEach((resp, index) => {
        setState((prev) => ({
          ...prev,
          responses: prev.responses.map((r, i) =>
            i === index ? { ...r, status: 'streaming' as const } : r,
          ),
        }))

        // Start elapsed timer
        const timer = setInterval(() => {
          setState((prev) => ({
            ...prev,
            responses: prev.responses.map((r, i) =>
              i === index ? { ...r, elapsed: r.elapsed + 1 } : r,
            ),
          }))
        }, 1000)
        timersRef.current.set(resp.id, timer)

        // Run the stream (async, runs in parallel)
        runSingleResponse(resp, undefined, {
          streamOptions,
          conversationHistory,
          context: extraOptions?.context,
          images: extraOptions?.images,
          files: extraOptions?.files,
          abortSignal: abortRef,
          onUpdate: (updatedResp) => {
            setState((prev) => ({
              ...prev,
              responses: prev.responses.map((r) =>
                r.id === updatedResp.id ? updatedResp : r,
              ),
            }))
          },
        }).finally(() => {
          clearInterval(timer)
          timersRef.current.delete(resp.id)

          // Check if all done
          setState((prev) => {
            const allDone = prev.responses.every(
              (r) => r.status === 'done' || r.status === 'error',
            )
            return { ...prev, isRunning: !allDone }
          })
        })
      })
    },
    [],
  )

  const stopBatch = useCallback(() => {
    abortRef.current = true
    timersRef.current.forEach((t) => clearInterval(t))
    timersRef.current.clear()
  }, [])

  const updateCount = useCallback((count: number) => {
    const clamped = Math.min(Math.max(count, 2), 4)
    setState((prev) => ({ ...prev, count: clamped }))
  }, [])

  return {
    state,
    startBatch,
    stopBatch,
    updateCount,
  }
}

/**
 * Run a single response stream. Updates state via the onUpdate callback.
 */
async function runSingleResponse(
  resp: BatchResponse,
  modelOverride: string | undefined,
  options: RunSingleResponseOptions,
): Promise<void> {
  const {
    streamOptions,
    conversationHistory,
    context,
    images,
    files,
    abortSignal,
    onUpdate,
  } = options

  const modelId = modelOverride ?? streamOptions.modelId ?? ''

  // Check if the current model supports tools
  const modelInfo = getModelById(modelId)
  const supportsTools = modelInfo?.tags?.includes('tools') ?? false
  const toolDefs = supportsTools ? toolRegistry.getDefinitions() : []

  let fullContent = ''
  let finalUsage: StreamUsage | null = null

  if (supportsTools && toolDefs.length > 0) {
    // --- Function calling path ---
    let conversationMessages: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }> = [...conversationHistory]
    let maxTurns = 5

    while (maxTurns > 0 && !abortSignal.current) {
      const tools = toolDefs.map((t) => ({
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
        type: 'function' as const,
      }))

      const result = streamChatWithTools(conversationMessages, {
        ...streamOptions,
        context,
        images,
        files,
        tools,
        modelId,
      })

      // Stream tokens
      for await (const token of result.generator) {
        if (abortSignal.current) break
        fullContent += token
      }

      // Capture usage
      if (result.usage.current) {
        finalUsage = result.usage.current
      }

      // Check for tool calls
      const toolCalls = getToolCalls(result.generator)

      if (!toolCalls || toolCalls.length === 0) {
        break
      }

      // Execute each tool call
      for (const tc of toolCalls) {
        if (abortSignal.current) break
        const toolResult = await toolRegistry.execute(tc)
        const toolMessage = toolRegistry.resultToToolMessage(tc, toolResult)
        conversationMessages.push(toolMessage)
      }

      maxTurns--
    }
  } else {
    // --- Standard streaming path ---
    const { generator } = streamChatWithUsage(conversationHistory, {
      ...streamOptions,
      context,
      images,
      files,
      modelId,
    })

    for await (const token of generator) {
      if (abortSignal.current) break
      fullContent += token
    }
  }

  // Finalize this response
  onUpdate({
    ...resp,
    status: 'done' as const,
    content: fullContent,
    usage: finalUsage,
  })
}
