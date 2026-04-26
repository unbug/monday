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

// v0.27: Function calling types
export interface ToolDefinition {
  /** Unique name of the tool (a-z, A-Z, 0-9, underscore, dash; max 64 chars) */
  name: string
  /** Description of what the tool does, used by the model to decide when to call it */
  description: string
  /** JSON Schema describing the parameters the tool accepts */
  parameters: Record<string, unknown>
}

export interface ToolCall {
  /** Unique call ID */
  id: string
  /** Name of the tool being called */
  name: string
  /** Arguments as a parsed object (if valid JSON), or raw string */
  args: Record<string, unknown>
  /** Raw argument string from the model */
  rawArgs: string
}

export interface ToolCallResult {
  /** The tool call this result corresponds to */
  call: ToolCall
  /** Whether the tool executed successfully */
  success: boolean
  /** Result data (for display in tool call inspector) */
  result: string
  /** Error message if the tool failed */
  error?: string
  /** Time in ms to execute the tool */
  latency: number
}

export interface ToolCallEvent {
  type: 'tool_call' | 'tool_result'
  call: ToolCall
  result?: ToolCallResult
}

export interface ModelState {
  status: ModelStatus
  progress: number
  error: string | null
}

export interface EngineStats {
  tokensPerSecond: number
  totalTokens: number
}

// v0.27.1: Plugin system types
export interface PluginManifest {
  /** Unique plugin identifier (a-z, 0-9, dash; max 64 chars) */
  id: string
  /** Plugin display name */
  name: string
  /** What the plugin does, shown to the user */
  description: string
  /** Version string (semver) */
  version: string
  /** JSON Schema describing the plugin's input */
  inputSchema: Record<string, unknown>
  /** URL to the JavaScript handler (exported as ES module) */
  handlerUrl: string
  /** Optional author / publisher info */
  author?: string
  /** Optional URL to plugin source or docs */
  sourceUrl?: string
}

export interface InstalledPlugin {
  /** Unique plugin identifier */
  id: string
  /** Plugin display name */
  name: string
  /** Description */
  description: string
  /** Version */
  version: string
  /** URL where the manifest was loaded from */
  manifestUrl: string
  /** URL to the handler JS */
  handlerUrl: string
  /** When it was installed (timestamp) */
  installedAt: number
  /** Last time it was loaded (timestamp) */
  lastLoadedAt: number
  /** Whether the handler was successfully loaded */
  loaded: boolean
  /** Error message if loading failed */
  error: string | null
}
