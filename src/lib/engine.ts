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

export function streamChatWithUsage(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options: {
    temperature?: number
    top_p?: number
    maxTokens?: number
    systemPrompt?: string
  } = {},
): StreamWithUsage {
  const usageRef = { current: null } as { current: StreamUsage | null }

  const generator = (async function* () {
    const engine = engineInstance
    if (!engine) {
      throw new Error('No model loaded')
    }

    const { temperature = 0.7, top_p = 0.9, maxTokens = 1024, systemPrompt } =
      options

    let chatMessages: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
    }>
    if (systemPrompt?.trim()) {
      chatMessages = [
        { role: 'system', content: systemPrompt.trim() },
        ...messages,
      ]
    } else {
      chatMessages = messages
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
