/**
 * Agent mode engine — multi-step task execution with tool use.
 *
 * Wraps the existing function-calling loop (v0.27) with a task-driven
 * outer planner. The model receives a task goal, calls tools autonomously,
 * and continues until it determines the task is complete.
 *
 * Usage:
 *   const engine = createAgentEngine({
 *     goal: 'Search for X, summarize it, save to IndexedDB',
 *     onStep: (step) => console.log(step),
 *     onResult: (result) => console.log('done!', result),
 *   })
 *   await engine.run()
 */

import { streamChatWithTools, getToolCalls, type ToolCallInfo } from './engine'
import { toolRegistry } from './toolRegistry'
import type { ToolCallResult } from '../types'
import type { AgentTask, AgentStep } from '../types'

export interface AgentEngineOptions {
  /** The task goal the agent should accomplish */
  goal: string
  /** Max steps before forcing completion (default: 20) */
  maxSteps?: number
  /** Additional system prompt to prepend */
  systemPrompt?: string
  /** Callback for each agent step */
  onStep?: (step: AgentStep) => void
  /** Callback for final result */
  onResult?: (result: string) => void
  /** Abort signal to stop the agent */
  signal?: AbortSignal
}

export interface AgentEngine {
  task: AgentTask
  run(): Promise<string>
  stop(): void
}

/**
 * Create a new agent engine instance.
 */
export function createAgentEngine(options: AgentEngineOptions): AgentEngine {
  const maxSteps = options.maxSteps ?? 20
  const task: AgentTask = {
    id: crypto.randomUUID(),
    goal: options.goal,
    status: 'idle',
    steps: [],
    result: '',
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
  }

  let aborted = false

  const addStep = (
    status: AgentStep['status'],
    overrides: Partial<AgentStep> = {},
  ): AgentStep => {
    const step: AgentStep = {
      id: crypto.randomUUID(),
      step: task.steps.length + 1,
      status,
      startedAt: Date.now(),
      finishedAt: null,
      ...overrides,
    }
    task.steps.push(step)
    options.onStep?.(step)
    return step
  }

  const run = async (): Promise<string> => {
    task.status = 'running'

    try {
    addStep('planning', {
      thought: `Analyzing task: ${options.goal}`,
    })

    // Build conversation history
    // Start with system prompt + task goal
    const messages: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }> = [
      {
        role: 'system',
        content: [
          options.systemPrompt ?? '',
          `You are an autonomous agent. Your goal is: ${options.goal}`,
          `Rules:`,
          `- Use available tools to accomplish your goal`,
          `- When you have completed the task, respond with a clear summary of what you found and did`,
          `- Do NOT mention that you are an agent or that you have tools`,
          `- Always provide a final answer even if the task is partially complete`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
      {
        role: 'user',
        content: `Please accomplish this task: ${options.goal}`,
      },
    ]

    let finalContent = ''
    let stepCount = 0

    while (stepCount < maxSteps && !aborted) {
      if (options.signal?.aborted) {
        aborted = true
        break
      }

      stepCount++

      // Get available tools
      const toolDefs = toolRegistry.getDefinitions()
      const tools = toolDefs.map((t) => ({
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
        type: 'function' as const,
      }))

      // Call the model
      let result
      try {
        result = streamChatWithTools(messages, {
          temperature: 0.3, // Lower temperature for more deterministic behavior
          maxTokens: 2048,
          tools,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('function call') || msg.toLowerCase().includes('tool')) {
          throw new Error('This model does not support function calling (tool use). Please switch to a model tagged with "tools" — e.g. Phi-4 Mini, Llama 3.2 3B, Hermes-3, or Qwen2.5-Coder.')
        }
        throw err
      }

      // Stream any text content (the model may output thoughts before tool calls)
      let textContent = ''
      try {
        for await (const token of result.generator) {
          if (aborted || options.signal?.aborted) break
          textContent += token
          finalContent += token
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('function call') || msg.toLowerCase().includes('tool')) {
          throw new Error('This model does not support function calling (tool use). Please switch to a model tagged with "tools" — e.g. Phi-4 Mini, Llama 3.2 3B, Hermes-3, or Qwen2.5-Coder.')
        }
        throw err
      }

      // Check for tool calls
      const toolCalls = getToolCalls(result.generator)

      if (toolCalls && toolCalls.length > 0) {
        // Log the tool call step
        for (const tc of toolCalls) {
          addStep('tool_call', {
            toolName: tc.name,
            toolArgs: tc.args,
            thought: textContent.trim() || undefined,
          })

          // Execute the tool
          const call = {
            id: tc.id,
            name: tc.name,
            args: tc.args,
            rawArgs: tc.rawArgs,
          }

          let toolResult: ToolCallResult
          try {
            toolResult = await toolRegistry.execute(call)
          } catch (err) {
            toolResult = {
              call,
              success: false,
              result: '',
              error: err instanceof Error ? err.message : 'Unknown error',
              latency: 0,
            }
          }

          // Log the tool result step
          addStep('tool_result', {
            toolName: tc.name,
            toolResult: toolResult.result || undefined,
            error: toolResult.error || undefined,
          })

          // Append tool message to conversation
          const toolMessage = toolRegistry.resultToToolMessage(call, toolResult)
          messages.push(toolMessage)
        }

        // Continue the loop — feed tool results back to the model
        continue
      }

      // No tool calls — model is done
      if (textContent.trim()) {
        addStep('done', {
          thought: textContent.trim(),
        })
        finalContent = textContent.trim()
      } else {
        addStep('done', {
          thought: '(No response)',
        })
      }

      break
    }

    if (aborted) {
      task.status = 'cancelled'
      task.finishedAt = Date.now()
      return finalContent
    }

    if (stepCount >= maxSteps && (task.status as string) !== 'done') {
      task.status = 'error'
      task.error = `Reached maximum step limit (${maxSteps})`
      task.finishedAt = Date.now()
      addStep('error', {
        error: task.error,
      })
      return finalContent
    }

    task.status = 'done'
    task.result = finalContent
    task.finishedAt = Date.now()
    options.onResult?.(finalContent)

    return finalContent
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      task.status = 'error'
      task.error = msg
      task.finishedAt = Date.now()
      addStep('error', { error: msg })
      throw err
    }
  }

  const stop = () => {
    aborted = true
    if (task.status === 'running') {
      task.status = 'cancelled'
      task.finishedAt = Date.now()
    }
  }

  return {
    task,
    run,
    stop,
  }
}
