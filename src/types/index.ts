export interface ModelInfo {
  id: string
  name: string
  description: string
  size: string
  parameters: string
  provider: string
  recommended?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  modelId: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export type ModelStatus = 'idle' | 'downloading' | 'ready' | 'error'

export interface ModelState {
  status: ModelStatus
  progress: number
  error: string | null
}

export interface EngineStats {
  tokensPerSecond: number
  totalTokens: number
}
