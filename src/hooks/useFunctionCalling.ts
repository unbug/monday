/**
 * useFunctionCalling — manages the multi-turn function calling loop.
 *
 * When the model returns tool_calls, this hook:
 * 1. Executes each tool via the tool registry
 * 2. Appends tool results as "tool" role messages
 * 3. Continues streaming until the model produces a text response
 *
 * The caller sees a single continuous stream with tool call events.
 */

import { useState, useCallback, useRef } from 'react'
import { streamChatWithTools, getToolCalls } from '../lib/engine'
import { toolRegistry } from '../lib/toolRegistry'
import type { ToolCall, ToolCallResult } from '../types'

export interface ToolCallEvent {
  type: 'tool_call' | 'tool_result'
  call: ToolCall
  result?: ToolCallResult
}

export interface FunctionCallingState {
  /** Whether a tool-calling loop is in progress */
  isProcessing: boolean
  /** Events from the current tool-calling session */
  events: ToolCallEvent[]
  /** The final text content (after all tool calls complete) */
  finalContent: string
  /** Error message if something went wrong */
  error: string | null
}

export function useFunctionCalling() {
  const [state, setState] = useState<FunctionCallingState>({
    isProcessing: false,
    events: [],
    finalContent: '',
    error: null,
  })

  const abortRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Run the function calling loop.
   * @param baseMessages — the conversation messages to send
   * @param extraOptions — additional options (tools, context, etc.)
   * @returns Promise that resolves when the loop completes (text response or error)
   */
  const run = useCallback(
    async (
      baseMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      extraOptions: {
        temperature?: number
        top_p?: number
        maxTokens?: number
        systemPrompt?: string
        context?: string
        images?: Array<{ id: string; data: string; name?: string }>
        files?: Array<{ id: string; name: string; size: number; type: string; content: string }>
      } = {},
    ): Promise<string> => {
      abortRef.current = false
      let currentMessages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }> = [...baseMessages]
      let finalContent = ''
      const events: ToolCallEvent[] = []
      let maxTurns = 5 // Safety limit to prevent infinite loops

      while (maxTurns > 0) {
        if (abortRef.current) {
          setState({ isProcessing: false, events, finalContent, error: 'Cancelled' })
          return finalContent
        }

        setState({
          isProcessing: true,
          events,
          finalContent,
          error: null,
        })

        const tools = toolRegistry.getDefinitions().map((t) => ({
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
          type: 'function' as const,
        }))

        const result = streamChatWithTools(currentMessages, {
          ...extraOptions,
          tools,
        })

        // Consume the stream
        for await (const token of result.generator) {
          if (abortRef.current) break
          finalContent += token
        }

        // Check for tool calls
        const toolCalls = getToolCalls(result.generator)

        if (!toolCalls || toolCalls.length === 0) {
          // No tool calls — we're done
          break
        }

        // Execute each tool call
        for (const tc of toolCalls) {
          if (abortRef.current) break

          const call: ToolCall = {
            id: tc.id,
            name: tc.name,
            args: tc.args,
            rawArgs: tc.rawArgs,
          }

          // Emit tool call event
          events.push({ type: 'tool_call', call })
          setState({ isProcessing: true, events, finalContent, error: null })

          // Execute the tool
          const toolResult = await toolRegistry.execute(call)

          // Emit tool result event
          events.push({ type: 'tool_result', call, result: toolResult })
          setState({ isProcessing: true, events, finalContent, error: null })

          // Append tool message to conversation
          const toolMessage = toolRegistry.resultToToolMessage(call, toolResult)
          currentMessages.push(toolMessage)
        }

        maxTurns--
      }

      setState({ isProcessing: false, events, finalContent, error: null })
      return finalContent
    },
    [],
  )

  const stop = useCallback(() => {
    abortRef.current = true
  }, [])

  const reset = useCallback(() => {
    setState({ isProcessing: false, events: [], finalContent: '', error: null })
  }, [])

  return {
    state,
    run,
    stop,
    reset,
  }
}
