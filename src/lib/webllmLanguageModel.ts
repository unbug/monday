import type {
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1FinishReason,
  LanguageModelV1FunctionTool,
  LanguageModelV1FunctionToolCall,
  LanguageModelV1Message,
  LanguageModelV1StreamPart,
} from '@ai-sdk/provider'
import {
  APICallError,
  InvalidPromptError,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider'
import { getEngine, loadModel } from './engine'

type WebLLMChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
}


type WebLLMCompletionResponse = {
  id?: string
  created?: number
  model?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string
      tool_calls?: Array<{
        id?: string
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
  }>
}

type WebLLMChunk = {
  id?: string
  created?: number
  model?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  choices?: Array<{
    finish_reason?: string | null
    delta?: {
      content?: string
      tool_calls?: Array<{
        id?: string
        index?: number
        type?: 'function'
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
  }>
}

function mapFinishReason(reason: string | null | undefined): LanguageModelV1FinishReason {
  switch (reason) {
    case 'stop':
      return 'stop'
    case 'length':
      return 'length'
    case 'tool_calls':
      return 'tool-calls'
    case 'content_filter':
      return 'content-filter'
    case null:
    case undefined:
      return 'unknown'
    default:
      return 'other'
  }
}

function stringifyResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

function textFromMessage(message: LanguageModelV1Message): string {
  if (message.role === 'system') return message.content

  const parts = message.content
  const text = parts
    .filter((p) => p.type === 'text' || p.type === 'reasoning')
    .map((p) => ('text' in p ? p.text : ''))
    .join('')

  const hasUnsupportedPart = parts.some((p) => p.type === 'image' || p.type === 'file')
  if (hasUnsupportedPart) {
    throw new UnsupportedFunctionalityError({
      functionality: 'multimodal prompt parts',
      message: 'WebLLM provider currently supports text-only prompt content.',
    })
  }

  return text
}

function toWebLLMPrompt(prompt: LanguageModelV1CallOptions['prompt']): WebLLMChatMessage[] {
  const mapped: WebLLMChatMessage[] = []

  for (const message of prompt) {
    if (message.role === 'system' || message.role === 'user') {
      mapped.push({
        role: message.role,
        content: textFromMessage(message),
      })
      continue
    }

    if (message.role === 'assistant') {
      const content = textFromMessage(message)
      const toolCalls = message.content
        .filter((part) => part.type === 'tool-call')
        .map((part) => ({
          id: part.toolCallId,
          type: 'function' as const,
          function: {
            name: part.toolName,
            arguments: JSON.stringify(part.args ?? {}),
          },
        }))

      mapped.push({
        role: 'assistant',
        content,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      })
      continue
    }

    // role === 'tool'
    for (const part of message.content) {
      mapped.push({
        role: 'tool',
        tool_call_id: part.toolCallId,
        content: stringifyResult(part.result),
      })
    }
  }

  return mapped
}

function toWebLLMTools(options: LanguageModelV1CallOptions): Array<{ type: 'function'; function: { name: string; description?: string; parameters: unknown } }> | undefined {
  if (options.mode.type === 'object-tool') {
    const tool = options.mode.tool
    return [{
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }]
  }

  if (options.mode.type !== 'regular' || !options.mode.tools?.length) {
    return undefined
  }

  const functionTools = options.mode.tools.filter((tool): tool is LanguageModelV1FunctionTool => tool.type === 'function')

  if (functionTools.length === 0) {
    return undefined
  }

  return functionTools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

function toToolChoice(options: LanguageModelV1CallOptions): unknown {
  if (options.mode.type !== 'regular' || !options.mode.toolChoice) {
    return undefined
  }

  switch (options.mode.toolChoice.type) {
    case 'auto':
    case 'none':
    case 'required':
      return options.mode.toolChoice.type
    case 'tool':
      return {
        type: 'function',
        function: {
          name: options.mode.toolChoice.toolName,
        },
      }
    default:
      return undefined
  }
}

function createCallArgs(options: LanguageModelV1CallOptions): Record<string, unknown> {
  const tools = toWebLLMTools(options)
  const toolChoice = toToolChoice(options)

  const args: Record<string, unknown> = {
    messages: toWebLLMPrompt(options.prompt),
    temperature: options.temperature,
    top_p: options.topP,
    max_tokens: options.maxTokens,
    stop: options.stopSequences,
  }

  if (tools?.length) {
    args.tools = tools
  }

  if (toolChoice) {
    args.tool_choice = toolChoice
  }

  if (options.responseFormat?.type === 'json' || options.mode.type === 'object-json') {
    args.response_format = { type: 'json_object' }
  }

  return args
}

function toUsage(usage?: { prompt_tokens?: number; completion_tokens?: number }): { promptTokens: number; completionTokens: number } {
  return {
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
  }
}

async function getOrLoadEngine(modelId: string) {
  let engine = getEngine()
  if (!engine) {
    engine = await loadModel(modelId)
  }
  return engine
}

function toProviderError(error: unknown, requestBodyValues: unknown): APICallError {
  const message = error instanceof Error ? error.message : 'Unknown WebLLM error'
  return new APICallError({
    message: `WebLLM call failed: ${message}`,
    url: 'webllm://chat/completions',
    requestBodyValues,
    cause: error,
    isRetryable: false,
  })
}

export function createWebLLMLanguageModel(modelId: string): LanguageModelV1 {
  return {
    specificationVersion: 'v1',
    provider: 'web-llm',
    modelId,
    defaultObjectGenerationMode: 'json',

    async doGenerate(options) {
      const callArgs = createCallArgs(options)

      try {
        const engine = await getOrLoadEngine(modelId)
        const response = await engine.chat.completions.create({
          ...callArgs,
          stream: false,
        } as unknown as Record<string, unknown>) as WebLLMCompletionResponse

        const choice = response?.choices?.[0] ?? {}
        const message = choice?.message ?? {}
        const toolCalls = Array.isArray(message.tool_calls)
          ? message.tool_calls.map((tc, index: number): LanguageModelV1FunctionToolCall => ({
              toolCallType: 'function',
              toolCallId: tc?.id ?? `tool_${index}`,
              toolName: tc?.function?.name ?? 'unknown_tool',
              args: tc?.function?.arguments ?? '{}',
            }))
          : undefined

        return {
          text: typeof message.content === 'string' ? message.content : '',
          toolCalls,
          finishReason: mapFinishReason(choice?.finish_reason),
          usage: toUsage(response?.usage),
          rawCall: {
            rawPrompt: options.prompt,
            rawSettings: callArgs,
          },
          rawResponse: {
            body: response,
          },
          request: {
            body: JSON.stringify(callArgs),
          },
          response: {
            id: response?.id,
            modelId: response?.model,
            timestamp: response?.created ? new Date(response.created * 1000) : undefined,
          },
        }
      } catch (error) {
        if (error instanceof UnsupportedFunctionalityError || error instanceof InvalidPromptError || error instanceof APICallError) {
          throw error
        }
        throw toProviderError(error, callArgs)
      }
    },

    async doStream(options) {
      const callArgs = createCallArgs(options)

      let engine = null
      try {
        engine = await getOrLoadEngine(modelId)
      } catch (error) {
        throw toProviderError(error, callArgs)
      }

      const stream = new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          const toolCallState = new Map<string, { toolName: string; args: string }>()
          let usage = { promptTokens: 0, completionTokens: 0 }
          let finishReason: LanguageModelV1FinishReason = 'unknown'
          let responseId: string | undefined
          let responseModelId: string | undefined
          let responseTimestamp: Date | undefined
          let finished = false

          try {
            const chunks = await engine!.chat.completions.create({
              ...callArgs,
              stream: true,
              stream_options: { include_usage: true },
            } as unknown as Record<string, unknown>) as unknown as AsyncIterable<WebLLMChunk>

            for await (const chunk of chunks) {
              if (chunk.usage) {
                usage = toUsage(chunk.usage)
              }
              if (!responseId && chunk.id) responseId = chunk.id
              if (!responseModelId && chunk.model) responseModelId = chunk.model
              if (!responseTimestamp && chunk.created) responseTimestamp = new Date(chunk.created * 1000)

              const choice = chunk.choices?.[0]
              const delta = choice?.delta

              if (delta?.content) {
                controller.enqueue({
                  type: 'text-delta',
                  textDelta: delta.content,
                })
              }

              if (delta?.tool_calls?.length) {
                for (const [index, tc] of delta.tool_calls.entries()) {
                  const key = tc.id ?? `tool_${tc.index ?? index}`
                  const existing = toolCallState.get(key) ?? {
                    toolName: tc.function?.name ?? '',
                    args: '',
                  }

                  if (tc.function?.name) {
                    existing.toolName = tc.function.name
                  }
                  if (tc.function?.arguments) {
                    existing.args += tc.function.arguments
                  }

                  toolCallState.set(key, existing)
                }
              }

              if (choice?.finish_reason) {
                finishReason = mapFinishReason(choice.finish_reason)

                if (finishReason === 'tool-calls') {
                  for (const [toolCallId, call] of toolCallState.entries()) {
                    controller.enqueue({
                      type: 'tool-call',
                      toolCallType: 'function',
                      toolCallId,
                      toolName: call.toolName || 'unknown_tool',
                      args: call.args || '{}',
                    })
                  }
                }

                if (responseId || responseModelId || responseTimestamp) {
                  controller.enqueue({
                    type: 'response-metadata',
                    id: responseId,
                    modelId: responseModelId,
                    timestamp: responseTimestamp,
                  })
                }

                controller.enqueue({
                  type: 'finish',
                  finishReason,
                  usage,
                })
                finished = true
                break
              }
            }

            if (!finished) {
              if (responseId || responseModelId || responseTimestamp) {
                controller.enqueue({
                  type: 'response-metadata',
                  id: responseId,
                  modelId: responseModelId,
                  timestamp: responseTimestamp,
                })
              }
              controller.enqueue({
                type: 'finish',
                finishReason,
                usage,
              })
            }

            controller.close()
          } catch (error) {
            controller.error(toProviderError(error, callArgs))
          }
        },
      })

      return {
        stream,
        rawCall: {
          rawPrompt: options.prompt,
          rawSettings: callArgs,
        },
      }
    },
  }
}
