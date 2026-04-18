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
  options: { temperature?: number; maxTokens?: number } = {},
): AsyncGenerator<string, void, unknown> {
  const engine = engineInstance
  if (!engine) {
    throw new Error('No model loaded')
  }

  const { temperature = 0.7, maxTokens = 1024 } = options

  const chunks = await engine.chat.completions.create({
    messages: messages as Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
    }>,
    temperature,
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
