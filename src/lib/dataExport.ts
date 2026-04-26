/**
 * Full data export — sessions, personas, settings, knowledge bases
 * as a single `.monday` file (gzipped JSON).
 *
 * Format version: 1
 * Schema:
 *   magic: "monday"
 *   formatVersion: 1
 *   exportedAt: timestamp
 *   appVersion: string
 *   data: {
 *     sessions: ChatSession[]
 *     knowledgeDocs: KnowledgeDocument[]
 *     knowledgeBases: KnowledgeBase[]
 *     embeddings: EmbeddingEntry[]
 *     vectorIndex: SerializedVectorIndex
 *     customPersonas: CustomPersona[]
 *     downloadedModels: string[]
 *     modelUsage: ModelUsageData
 *     recentModels: RecentModelEntry[]
 *     installedPlugins: InstalledPlugin[]
 *     mcpServers: McpServer[]
 *     context: Record<string, ContextEntry>
 *     theme: string
 *     embeddingLoaded: boolean
 *   }
 */

import type { ChatSession } from '../types'
import type { KnowledgeDocument } from '../types'
import type { KnowledgeBase } from '../types'
import type { EmbeddingEntry } from './storage'
import type { SerializedVectorIndex } from './vectorStore'
import type { CustomPersona } from './prompts'
import type { InstalledPlugin } from '../types'
import type { McpServer } from '../types'

interface ContextEntry {
  text: string
  timestamp: number
}

interface ModelUsageData {
  models: Record<string, number>
  history: Array<{ date: string; count: number }>
}

interface RecentModelEntry {
  modelId: string
  lastUsed: number
}

const MAGIC = 'monday'
const FORMAT_VERSION = 1

export interface MondayExport {
  magic: string
  formatVersion: number
  exportedAt: number
  appVersion: string
  data: MondayData
}

interface MondayData {
  sessions: ChatSession[]
  knowledgeDocs: KnowledgeDocument[]
  knowledgeBases: KnowledgeBase[]
  embeddings: EmbeddingEntry[]
  vectorIndex: SerializedVectorIndex | null
  customPersonas: CustomPersona[]
  downloadedModels: string[]
  modelUsage: ModelUsageData | null
  recentModels: RecentModelEntry[]
  installedPlugins: InstalledPlugin[]
  mcpServers: McpServer[]
  context: Record<string, ContextEntry>
  theme: string
  embeddingLoaded: boolean
}

/** Export all Monday data as a `.monday` file. */
export async function exportMondayData(appVersion: string): Promise<void> {
  const data = await collectExportData()
  const mondayExport: MondayExport = {
    magic: MAGIC,
    formatVersion: FORMAT_VERSION,
    exportedAt: Date.now(),
    appVersion,
    data,
  }

  const json = JSON.stringify(mondayExport, null, 2)
  const compressed = await compressData(json)

  const blob = new Blob([compressed.buffer as ArrayBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `monday-export-${new Date().toISOString().split('T')[0]}.monday`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function collectExportData(): Promise<MondayData> {
  // Sessions
  const sessions = await loadAllSessions()

  // Knowledge docs
  const knowledgeDocs = await loadAllKnowledgeDocs()

  // Knowledge bases
  const knowledgeBases = await loadAllKnowledgeBases()

  // Embeddings
  const embeddings = await loadAllEmbeddings()

  // Vector index
  const vectorIndex = await loadAllVectorIndex()

  // Custom personas
  const customPersonas = loadCustomPersonas()

  // Downloaded models
  const downloadedModels = loadDownloadedModels()

  // Model usage
  const modelUsage = loadModelUsage()

  // Recent models
  const recentModels = loadRecentModels()

  // Installed plugins
  const installedPlugins = loadInstalledPlugins()

  // MCP servers
  const mcpServers = loadMcpServers()

  // Context
  const context = loadAllContext()

  // Theme
  const theme = loadTheme()

  // Embedding loaded state
  const embeddingLoaded = loadEmbeddingLoaded()

  return {
    sessions,
    knowledgeDocs,
    knowledgeBases,
    embeddings,
    vectorIndex,
    customPersonas,
    downloadedModels,
    modelUsage,
    recentModels,
    installedPlugins,
    mcpServers,
    context,
    theme,
    embeddingLoaded,
  }
}

// ── IndexedDB collectors ───────────────────────────────────────────────────

async function loadAllSessions(): Promise<ChatSession[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open('monday-ai', 5)
    req.onsuccess = () => {
      const db = req.result
      const store = db.transaction('sessions', 'readonly').objectStore('sessions')
      const getAll = store.getAll()
      getAll.onsuccess = () => resolve(getAll.result as ChatSession[])
    }
    req.onerror = () => resolve([])
  })
}

async function loadAllKnowledgeDocs(): Promise<KnowledgeDocument[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open('monday-ai', 5)
    req.onsuccess = () => {
      const db = req.result
      const store = db.transaction('knowledge', 'readonly').objectStore('knowledge')
      const getAll = store.getAll()
      getAll.onsuccess = () => resolve(getAll.result as KnowledgeDocument[])
    }
    req.onerror = () => resolve([])
  })
}

async function loadAllKnowledgeBases(): Promise<KnowledgeBase[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open('monday-ai', 5)
    req.onsuccess = () => {
      const db = req.result
      const store = db.transaction('knowledgeBases', 'readonly').objectStore('knowledgeBases')
      const getAll = store.getAll()
      getAll.onsuccess = () => resolve(getAll.result as KnowledgeBase[])
    }
    req.onerror = () => resolve([])
  })
}

async function loadAllEmbeddings(): Promise<EmbeddingEntry[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open('monday-ai', 5)
    req.onsuccess = () => {
      const db = req.result
      const store = db.transaction('embeddings', 'readonly').objectStore('embeddings')
      const getAll = store.getAll()
      getAll.onsuccess = () => resolve(getAll.result as EmbeddingEntry[])
    }
    req.onerror = () => resolve([])
  })
}

async function loadAllVectorIndex(): Promise<SerializedVectorIndex | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open('monday-ai', 5)
    req.onsuccess = () => {
      const db = req.result
      const store = db.transaction('vectorIndex', 'readonly').objectStore('vectorIndex')
      const get = store.get('index')
      get.onsuccess = () => resolve(get.result as SerializedVectorIndex | null)
    }
    req.onerror = () => resolve(null)
  })
}

// ── localStorage collectors ────────────────────────────────────────────────

function loadCustomPersonas(): CustomPersona[] {
  try {
    const raw = localStorage.getItem('monday-custom-personas')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadDownloadedModels(): string[] {
  try {
    const raw = localStorage.getItem('monday-downloaded-models')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadModelUsage(): ModelUsageData | null {
  try {
    const models = localStorage.getItem('monday-model-usage')
    const history = localStorage.getItem('monday-model-usage:history')
    if (!models && !history) return null
    return {
      models: models ? JSON.parse(models) : {},
      history: history ? JSON.parse(history) : [],
    }
  } catch {
    return null
  }
}

function loadRecentModels(): RecentModelEntry[] {
  try {
    const raw = localStorage.getItem('monday-recent-models')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadInstalledPlugins(): InstalledPlugin[] {
  try {
    const raw = localStorage.getItem('monday-installed-plugins')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadMcpServers(): McpServer[] {
  try {
    const raw = localStorage.getItem('monday-mcp-servers')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadAllContext(): Record<string, ContextEntry> {
  const result: Record<string, ContextEntry> = {}
  const prefix = 'monday-context-'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      try {
        const val = localStorage.getItem(key)
        if (val) result[key] = JSON.parse(val)
      } catch {
        // skip corrupt entries
      }
    }
  }
  return result
}

function loadTheme(): string {
  return localStorage.getItem('monday-theme') || 'system'
}

function loadEmbeddingLoaded(): boolean {
  return localStorage.getItem('monday-embedding-loaded') === 'true'
}

// ── Compression ────────────────────────────────────────────────────────────

async function compressData(data: string): Promise<Uint8Array> {
  const stream = new Blob([data]).stream()
  const compressed = stream.pipeThrough(new CompressionStream('deflateRaw' as CompressionFormat))
  const reader = compressed.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
