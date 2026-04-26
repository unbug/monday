/**
 * Full data import — restore all data from a `.monday` file.
 *
 * Validates the magic header and format version, then restores
 * sessions, knowledge docs, knowledge bases, embeddings, vector index,
 * custom personas, downloaded models, model usage, recent models,
 * installed plugins, MCP servers, context, theme, and embedding state.
 */

import type { MondayExport } from './dataExport'

const MAGIC = 'monday'
const SUPPORTED_VERSION = 1

export interface ImportResult {
  success: boolean
  message: string
  stats: {
    sessions: number
    knowledgeDocs: number
    knowledgeBases: number
    embeddings: number
    customPersonas: number
    installedPlugins: number
    mcpServers: number
    contextEntries: number
  }
}

/**
 * Import data from a `.monday` file.
 * @param file - The .monday file to import
 * @param clearExisting - If true, clear all existing data before importing
 */
export async function importMondayData(
  file: File,
  clearExisting = false,
): Promise<ImportResult> {
  // Validate file extension
  if (!file.name.toLowerCase().endsWith('.monday')) {
    return {
      success: false,
      message: 'Invalid file format. Please select a .monday file.',
      stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
    }
  }

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Decompress
  let json: string
  try {
    json = await decompressData(uint8Array)
  } catch {
    return {
      success: false,
      message: 'Failed to decompress file. The file may be corrupted.',
      stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
    }
  }

  // Parse JSON
  let exportData: MondayExport
  try {
    exportData = JSON.parse(json) as MondayExport
  } catch {
    return {
      success: false,
      message: 'Failed to parse file. The file may be corrupted.',
      stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
    }
  }

  // Validate magic header
  if (exportData.magic !== MAGIC) {
    return {
      success: false,
      message: 'Invalid file format. Not a Monday data export.',
      stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
    }
  }

  // Validate format version
  if (exportData.formatVersion !== SUPPORTED_VERSION) {
    return {
      success: false,
      message: `Unsupported format version ${exportData.formatVersion}. Expected ${SUPPORTED_VERSION}.`,
      stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
    }
  }

  const data = exportData.data

  // Optionally clear existing data
  if (clearExisting) {
    try {
      await clearAllData()
    } catch (err) {
      return {
        success: false,
        message: `Failed to clear existing data: ${err instanceof Error ? err.message : String(err)}`,
        stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
      }
    }
  }

  // Restore data
  try {
    await restoreData(data)
  } catch (err) {
    return {
      success: false,
      message: `Failed to restore data: ${err instanceof Error ? err.message : String(err)}`,
      stats: { sessions: 0, knowledgeDocs: 0, knowledgeBases: 0, embeddings: 0, customPersonas: 0, installedPlugins: 0, mcpServers: 0, contextEntries: 0 },
    }
  }

  return {
    success: true,
    message: `Imported ${data.sessions.length} sessions, ${data.knowledgeDocs.length} knowledge docs, ${data.knowledgeBases.length} knowledge bases, ${data.customPersonas.length} personas, ${data.installedPlugins.length} plugins, ${data.mcpServers.length} MCP servers.`,
    stats: {
      sessions: data.sessions.length,
      knowledgeDocs: data.knowledgeDocs.length,
      knowledgeBases: data.knowledgeBases.length,
      embeddings: data.embeddings.length,
      customPersonas: data.customPersonas.length,
      installedPlugins: data.installedPlugins.length,
      mcpServers: data.mcpServers.length,
      contextEntries: Object.keys(data.context).length,
    },
  }
}

async function decompressData(data: Uint8Array): Promise<string> {
  const blob = new Blob([data.buffer as ArrayBuffer])
  const decompressed = blob.stream().pipeThrough(new DecompressionStream('deflateRaw' as CompressionFormat))
  const reader = decompressed.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  return new TextDecoder().decode(combined)
}

async function clearAllData(): Promise<void> {
  // Clear IndexedDB stores
  const stores = ['sessions', 'knowledge', 'knowledgeBases', 'embeddings', 'vectorIndex']
  for (const storeName of stores) {
    try {
      const db = await openDB('monday-ai', 5)
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.clear()
      await waitForTransaction(tx)
    } catch {
      // ignore errors for non-existent stores
    }
  }

  // Clear localStorage keys
  const keysToRemove = [
    'monday-custom-personas',
    'monday-downloaded-models',
    'monday-model-usage',
    'monday-model-usage:history',
    'monday-model-usage:timestamps',
    'monday-recent-models',
    'monday-installed-plugins',
    'monday-mcp-servers',
    'monday-theme',
    'monday-embedding-loaded',
  ]

  // Also remove context entries (monday-context-*)
  const contextKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('monday-context-')) {
      contextKeys.push(key)
    }
  }
  keysToRemove.push(...contextKeys)

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

async function restoreData(data: MondayExport['data']): Promise<void> {
  // Restore sessions
  if (data.sessions.length > 0) {
    const db = await openDB('monday-ai', 5)
    const tx = db.transaction('sessions', 'readwrite')
    const store = tx.objectStore('sessions')
    for (const session of data.sessions) {
      store.put(session)
    }
    await waitForTransaction(tx)
  }

  // Restore knowledge docs
  if (data.knowledgeDocs.length > 0) {
    const db = await openDB('monday-ai', 5)
    const tx = db.transaction('knowledge', 'readwrite')
    const store = tx.objectStore('knowledge')
    for (const doc of data.knowledgeDocs) {
      store.put(doc)
    }
    await waitForTransaction(tx)
  }

  // Restore knowledge bases
  if (data.knowledgeBases.length > 0) {
    const db = await openDB('monday-ai', 5)
    const tx = db.transaction('knowledgeBases', 'readwrite')
    const store = tx.objectStore('knowledgeBases')
    for (const base of data.knowledgeBases) {
      store.put(base)
    }
    await waitForTransaction(tx)
  }

  // Restore embeddings
  if (data.embeddings.length > 0) {
    const db = await openDB('monday-ai', 5)
    const tx = db.transaction('embeddings', 'readwrite')
    const store = tx.objectStore('embeddings')
    for (const emb of data.embeddings) {
      store.put(emb)
    }
    await waitForTransaction(tx)
  }

  // Restore vector index
  if (data.vectorIndex) {
    const db = await openDB('monday-ai', 5)
    const tx = db.transaction('vectorIndex', 'readwrite')
    const store = tx.objectStore('vectorIndex')
    store.put(data.vectorIndex, 'index')
    await waitForTransaction(tx)
  }

  // Restore localStorage data
  if (data.customPersonas.length > 0) {
    localStorage.setItem('monday-custom-personas', JSON.stringify(data.customPersonas))
  }

  if (data.downloadedModels.length > 0) {
    localStorage.setItem('monday-downloaded-models', JSON.stringify(data.downloadedModels))
  }

  if (data.modelUsage) {
    localStorage.setItem('monday-model-usage', JSON.stringify(data.modelUsage.models))
    localStorage.setItem('monday-model-usage:history', JSON.stringify(data.modelUsage.history))
  }

  if (data.recentModels && data.recentModels.length > 0) {
    localStorage.setItem('monday-recent-models', JSON.stringify(data.recentModels))
  }

  if (data.installedPlugins.length > 0) {
    localStorage.setItem('monday-installed-plugins', JSON.stringify(data.installedPlugins))
  }

  if (data.mcpServers.length > 0) {
    localStorage.setItem('monday-mcp-servers', JSON.stringify(data.mcpServers))
  }

  if (data.context) {
    for (const [key, value] of Object.entries(data.context)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }

  if (data.theme) {
    localStorage.setItem('monday-theme', data.theme)
  }

  if (data.embeddingLoaded) {
    localStorage.setItem('monday-embedding-loaded', 'true')
  }
}

function openDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
