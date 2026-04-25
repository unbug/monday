import {
  CreateMLCEngine,
  type MLCEngineInterface,
  type InitProgressReport,
  type ChatCompletionChunk,
} from '@mlc-ai/web-llm'

let engineInstance: MLCEngineInterface | null = null
let currentModelId: string | null = null

export type ProgressCallback = (report: InitProgressReport) => void

export async function loadModel(
  modelId: string,
  onProgress?: ProgressCallback,
): Promise<MLCEngineInterface> {
  if (engineInstance && currentModelId === modelId) {
    return engineInstance
  }

  if (engineInstance) {
    engineInstance.unload()
    engineInstance = null
    currentModelId = null
  }

  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
  })

  engineInstance = engine
  currentModelId = modelId
  return engine
}

export function getEngine(): MLCEngineInterface | null {
  return engineInstance
}

export function unloadModel(): void {
  if (engineInstance) {
    engineInstance.unload()
    engineInstance = null
    currentModelId = null
  }
}

export function getCurrentModelId(): string | null {
  return currentModelId
}

export async function* streamChat(
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number
    top_p?: number
    maxTokens?: number
    systemPrompt?: string
  } = {},
): AsyncGenerator<string, void, unknown> {
  const engine = engineInstance
  if (!engine) {
    throw new Error('No model loaded')
  }

  const { temperature = 0.7, top_p = 0.9, maxTokens = 1024, systemPrompt } =
    options

  // Prepend system prompt if provided
  let chatMessages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
  }>
  if (systemPrompt?.trim()) {
    chatMessages = [
      { role: 'system', content: systemPrompt.trim() },
      ...messages,
    ] as Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }>
  } else {
    chatMessages = messages as Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }>
  }

  const chunks = (await engine.chat.completions.create({
    messages: chatMessages as any,
    temperature,
    top_p,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  } as any)) as unknown as AsyncIterable<any>

  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      yield delta
    }
  }
}

export function checkWebGPUSupport(): boolean {
  return 'gpu' in navigator
}

export interface StreamUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Wrapper around streamChat that returns both the generator and a mutable
 * usage ref. The usage is populated when the stream completes.
 */
export interface StreamWithUsage {
  generator: AsyncGenerator<string>
  usage: { current: StreamUsage | null }
}

/**
 * Convert string-content messages to vision-format messages when images are present.
 * Web-LLM vision models expect content as an array of text + image_url parts.
 */
function toVisionMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>,
  images: Array<{ id: string; data: string; name?: string }>,
): Array<{
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}> {
  const imageParts = images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: img.data },
  }))

  return messages.map((msg, i) => {
    // Only user messages can have images
    if (msg.role === 'user' && i === messages.length - 1 && images.length > 0) {
      return {
        role: msg.role,
        content: [
          ...imageParts,
          { type: 'text' as const, text: msg.content },
        ],
      }
    }
    return { role: msg.role, content: msg.content }
  })
}

/**
 * Parse a tool call from a Web-LLM chunk.
 * Web-LLM streams tool_calls in the last chunk only, but we also handle
 * partial accumulation for future compatibility.
 */
function parseToolCallsFromChunk(
  chunk: ChatCompletionChunk,
): Array<{
  id: string
  name: string
  arguments: string
}> | null {
  const lastChunk = chunk.choices[chunk.choices.length - 1]
  if (!lastChunk?.delta?.tool_calls?.length) return null

  const calls: Array<{
    id: string
    name: string
    arguments: string
  }> = []

  for (const tc of lastChunk.delta.tool_calls) {
    if (tc.function?.name) {
      calls.push({
        id: tc.id || String(calls.length),
        name: tc.function.name,
        arguments: tc.function.arguments || '{}',
      })
    }
  }

  return calls.length > 0 ? calls : null
}

export interface ToolCallInfo {
  id: string
  name: string
  rawArgs: string
  args: Record<string, unknown>
}

/**
 * Wrapper around streamChat that returns both the generator and a mutable
 * usage ref. The usage is populated when the stream completes.
 */
export function streamChatWithUsage(
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>,
  options: {
    temperature?: number
    top_p?: number
    maxTokens?: number
    systemPrompt?: string
    context?: string
    images?: Array<{ id: string; data: string; name?: string }>
    files?: Array<{ id: string; name: string; size: number; type: string; content: string }>
  } = {},
): StreamWithUsage {
  const usageRef = { current: null } as { current: StreamUsage | null }

  const generator = (async function* () {
    const engine = engineInstance
    if (!engine) {
      throw new Error('No model loaded')
    }

    const {
      temperature = 0.7,
      top_p = 0.9,
      maxTokens = 1024,
      systemPrompt,
      context,
      images,
      files,
    } = options

    let chatMessages: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }>

    // Prepend context if provided
    let contextMessage: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }> = []
    if (context?.trim()) {
      contextMessage.push(
        { role: 'user', content: `Context:\n${context}\n\n---\n\n` },
      )
    }

    // Prepend file content if files are provided
    if (files?.length) {
      for (const file of files) {
        contextMessage.push({
          role: 'user',
          content: `File: ${file.name} (${file.type})\n${file.content}`,
        })
      }
      if (contextMessage.length > 0) {
        contextMessage.push({ role: 'user', content: '\n---\n' })
      }
    }

    if (systemPrompt?.trim()) {
      chatMessages = [
        { role: 'system', content: systemPrompt.trim() },
        ...contextMessage,
        ...messages,
      ]
    } else {
      chatMessages = [...contextMessage, ...messages]
    }

    // Convert to vision format if images are present
    const visionMessages: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = images && images.length > 0
      ? toVisionMessages(chatMessages, images)
      : chatMessages

    const chunks = (await engine.chat.completions.create({
      messages: visionMessages as any,
      temperature,
      top_p,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    } as any)) as unknown as AsyncIterable<any>

    for await (const chunk of chunks) {
      // Capture usage from the last chunk with usage data
      if (chunk.usage) {
        usageRef.current = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          totalTokens: chunk.usage.total_tokens ?? 0,
        }
      }

      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield delta
      }
    }
  })()

  return { generator, usage: usageRef }
}

/**
 * Stream chat with function calling support.
 * When the model returns tool_calls, this function returns them for execution.
 * After execution, the caller can call this function again with tool results appended
 * to continue the conversation.
 */
export function streamChatWithTools(
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>,
  options: {
    temperature?: number
    top_p?: number
    maxTokens?: number
    systemPrompt?: string
    context?: string
    images?: Array<{ id: string; data: string; name?: string }>
    files?: Array<{ id: string; name: string; size: number; type: string; content: string }>
    tools?: Array<{
      function: {
        name: string
        description?: string
        parameters?: Record<string, unknown>
      }
      type: 'function'
    }>
  } = {},
): {
  generator: AsyncGenerator<string>
  usage: { current: StreamUsage | null }
  toolCalls: ToolCallInfo[] | null
  finishReason: string | null
} {
  const usageRef = { current: null } as { current: StreamUsage | null }
  let accumulatedToolCalls: Array<{
    id: string
    name: string
    arguments: string
  }> | null = null
  let _toolCalls: ToolCallInfo[] | null = null

  const generator = (async function* () {
    const engine = engineInstance
    if (!engine) {
      throw new Error('No model loaded')
    }

    const {
      temperature = 0.7,
      top_p = 0.9,
      maxTokens = 1024,
      systemPrompt,
      context,
      images,
      files,
      tools,
    } = options

    let chatMessages: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }>

    // Prepend context if provided
    let contextMessage: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
    }> = []
    if (context?.trim()) {
      contextMessage.push(
        { role: 'user', content: `Context:\n${context}\n\n---\n\n` },
      )
    }

    // Prepend file content if files are provided
    if (files?.length) {
      for (const file of files) {
        contextMessage.push({
          role: 'user',
          content: `File: ${file.name} (${file.type})\n${file.content}`,
        })
      }
      if (contextMessage.length > 0) {
        contextMessage.push({ role: 'user', content: '\n---\n' })
      }
    }

    if (systemPrompt?.trim()) {
      chatMessages = [
        { role: 'system', content: systemPrompt.trim() },
        ...contextMessage,
        ...messages,
      ]
    } else {
      chatMessages = [...contextMessage, ...messages]
    }

    // Convert to vision format if images are present
    const visionMessages: Array<{
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = images && images.length > 0
      ? toVisionMessages(chatMessages, images)
      : chatMessages

    const createArgs: Record<string, unknown> = {
      messages: visionMessages as any,
      temperature,
      top_p,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      (createArgs as any).tools = tools
    }

    const chunks = (await engine.chat.completions.create(createArgs as any)) as unknown as AsyncIterable<any>

    for await (const chunk of chunks) {
      // Capture usage from the last chunk with usage data
      if (chunk.usage) {
        usageRef.current = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          totalTokens: chunk.usage.total_tokens ?? 0,
        }
      }

      // Check for tool calls (Web-LLM returns them in the last chunk)
      const toolCalls = parseToolCallsFromChunk(chunk)
      if (toolCalls) {
        accumulatedToolCalls = toolCalls
      }

      // Check finish reason — if "tool_calls", we're done
      const finishReason = chunk.choices[0]?.finish_reason
      if (finishReason === 'tool_calls') {
        break
      }

      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield delta
      }
    }

    // Convert accumulated tool calls to ToolCallInfo
    if (accumulatedToolCalls) {
      const toolCallInfos: ToolCallInfo[] = accumulatedToolCalls.map((tc) => {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.arguments)
        } catch {
          args = { raw: tc.arguments }
        }
        return {
          id: tc.id,
          name: tc.name,
          rawArgs: tc.arguments,
          args,
        }
      })

      // Store for later access via closure variable
      _toolCalls = toolCallInfos
      return
    }

    // Store null tool calls for the return object
    _toolCalls = null
  })()

  // Attach getter for getToolCalls to access
  Object.defineProperty(generator, '_toolCalls', {
    get() { return _toolCalls },
    enumerable: true,
    configurable: true,
  })

  return { generator, usage: usageRef, toolCalls: null, finishReason: null }
}

/**
 * Parse tool calls from a completed stream.
 * Call this after the stream has fully completed to get the tool calls.
 */
export function getToolCalls(
  generator: AsyncGenerator<string>,
): ToolCallInfo[] | null {
  return (generator as any)._toolCalls ?? null
}
