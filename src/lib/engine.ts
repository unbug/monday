import {
  CreateMLCEngine,
  type MLCEngineInterface,
  type InitProgressReport,
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
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  if (systemPrompt?.trim()) {
    chatMessages = [
      { role: 'system', content: systemPrompt.trim() },
      ...messages,
    ] as Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
    }>
  } else {
    chatMessages = messages as Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
    }>
  }

  const chunks = await engine.chat.completions.create({
    messages: chatMessages,
    temperature,
    top_p,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  })

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
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  images: Array<{ id: string; data: string; name?: string }>,
): Array<{
  role: 'user' | 'assistant' | 'system'
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

export function streamChatWithUsage(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
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

    const { temperature = 0.7, top_p = 0.9, maxTokens = 1024, systemPrompt, context, images, files } =
      options

    let chatMessages: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
    }>

    // Prepend context if provided
    let contextMessage: Array<{
      role: 'user' | 'assistant' | 'system'
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
      role: 'user' | 'assistant' | 'system'
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = images && images.length > 0
      ? toVisionMessages(chatMessages, images)
      : chatMessages

    const chunks = await engine.chat.completions.create({
      messages: visionMessages as any,
      temperature,
      top_p,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    })

    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield delta
      }
      // Capture usage from the last chunk with usage data
      if (chunk.usage) {
        usageRef.current = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          totalTokens: chunk.usage.total_tokens ?? 0,
        }
      }
    }
  })()

  return { generator, usage: usageRef }
}
