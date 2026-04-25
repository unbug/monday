export type ModelTag = 'vision' | 'tools' | 'thinking' | 'embedding'

export type KnowledgeDocType = 'pdf' | 'txt' | 'md'

export interface KnowledgeDocument {
  id: string
  name: string
  type: KnowledgeDocType
  size: number
  content: string
  chunks: string[]
  createdAt: number
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  size: string
  parameters: string
  provider: string
  paramCount: number
  releaseDate: string
  recommended?: boolean
  tags?: ModelTag[]
}

export interface CitationEntry {
  /** docId from the knowledge document */
  docId: string
  /** document display name */
  docName: string
  /** chunk index within the document */
  chunkIndex: number
  /** relevance score from the search */
  score: number
  /** snippet of the chunk text (truncated for display) */
  snippet: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: ChatMessageImage[]
  isStreaming?: boolean
  /** Citations: which knowledge chunks were used to generate this response (v0.26) */
  citations?: CitationEntry[]
  timestamp: number
}

export interface GenerationParams {
  temperature: number
  top_p: number
  maxTokens: number
}

export interface ChatSession {
  id: string
  title: string
  modelId: string
  messages: ChatMessage[]
  systemPrompt: string
  generationParams: GenerationParams
  personaId: string | null
  knowledgeBaseId: string | null
  createdAt: number
  updatedAt: number
}

export interface ChatMessageImage {
  id: string
  data: string // base64 data URL
  name?: string
}

export interface KnowledgeBase {
  id: string
  name: string
  docIds: string[]
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
