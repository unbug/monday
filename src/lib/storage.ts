import type { ChatSession, ChatMessage, GenerationParams, KnowledgeDocument, KnowledgeBase, OpenAISettings, OllamaSettings, LmStudioSettings, LlamaCppSettings, VllmSettings, DeepSeekSettings, SearXngSettings } from '../types'

const DB_NAME = 'monday-ai'
const DB_VERSION = 15
const SESSIONS_STORE = 'sessions'
const KNOWLEDGE_STORE = 'knowledge'
const VECTOR_STORE = 'vectorIndex'
const BASES_STORE = 'knowledgeBases'
const EMBEDDINGS_STORE = 'embeddings'
const VERDICTS_STORE = 'verdicts'
const API_SETTINGS_STORE = 'apiSettings'
const OLLAMA_SETTINGS_STORE = 'ollamaSettings'
const LMSTUDIO_SETTINGS_STORE = 'lmstudioSettings'
const LLAMACPP_SETTINGS_STORE = 'llamaCppSettings'
const VLLM_SETTINGS_STORE = 'vllmSettings'
const DEEPSEEK_SETTINGS_STORE = 'deepseekSettings'
const SEARXNG_SETTINGS_STORE = 'searxngSettings'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result
      const oldVersion = event.oldVersion
      // IMPORTANT: use the implicit upgrade transaction — never call db.transaction()
      // inside onupgradeneeded, as it throws InvalidStateError and aborts the upgrade.
      const upgradeTx = (event.target as IDBOpenDBRequest).transaction!

      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(KNOWLEDGE_STORE)) {
        db.createObjectStore(KNOWLEDGE_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(VECTOR_STORE)) {
        db.createObjectStore(VECTOR_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(BASES_STORE)) {
        db.createObjectStore(BASES_STORE, { keyPath: 'id' })
      }
      // Migration v4→v5: add embeddings object store for v0.26 RAG
      if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
        db.createObjectStore(EMBEDDINGS_STORE, { keyPath: 'id' })
      }
      // Migration v5→v6: add forkId to existing sessions for v0.28 conversation forking
      if (oldVersion > 0 && oldVersion < 6) {
        const sessionsStore = upgradeTx.objectStore(SESSIONS_STORE)
        const req = sessionsStore.getAll()
        req.onsuccess = () => {
          for (const session of req.result as ChatSession[]) {
            if (session.forkId === undefined) {
              session.forkId = null
              sessionsStore.put(session)
            }
          }
        }
      }
      // Migration v6→v7: add summaries to existing sessions for v0.30 multi-turn memory
      if (oldVersion > 0 && oldVersion < 7) {
        const sessionsStore = upgradeTx.objectStore(SESSIONS_STORE)
        const req = sessionsStore.getAll()
        req.onsuccess = () => {
          for (const session of req.result as ChatSession[]) {
            if (session.summaries === undefined) {
              session.summaries = []
              sessionsStore.put(session)
            }
          }
        }
      }
      // Migration v7→v8: add verdicts object store for v0.31.7 Code Arena verdicts
      if (!db.objectStoreNames.contains(VERDICTS_STORE)) {
        db.createObjectStore(VERDICTS_STORE, { keyPath: 'id' })
      }
      // Migration v8→v9: add apiSettings object store + provider field on sessions for v1.0
      if (!db.objectStoreNames.contains(API_SETTINGS_STORE)) {
        db.createObjectStore(API_SETTINGS_STORE, { keyPath: 'id' })
      }
      if (oldVersion > 0 && oldVersion < 9) {
        const sessionsStore = upgradeTx.objectStore(SESSIONS_STORE)
        const req = sessionsStore.getAll()
        req.onsuccess = () => {
          for (const session of req.result as ChatSession[]) {
            if (session.provider === undefined) {
              session.provider = null
              sessionsStore.put(session)
            }
          }
        }
      }
      // Migration v9→v10: add ollamaSettings object store for v1.0.1 Ollama integration
      if (!db.objectStoreNames.contains(OLLAMA_SETTINGS_STORE)) {
        db.createObjectStore(OLLAMA_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v10→v11: add lmstudioSettings object store for v1.0.2 LM Studio
      if (!db.objectStoreNames.contains(LMSTUDIO_SETTINGS_STORE)) {
        db.createObjectStore(LMSTUDIO_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v11→v12: add llamaCppSettings object store for v1.0.3 llama.cpp
      if (!db.objectStoreNames.contains(LLAMACPP_SETTINGS_STORE)) {
        db.createObjectStore(LLAMACPP_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v12→v13: add vllmSettings object store for v1.0.4 vLLM
      if (!db.objectStoreNames.contains(VLLM_SETTINGS_STORE)) {
        db.createObjectStore(VLLM_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v13→v14: add deepseekSettings object store for v1.0.5 DeepSeek API
      if (!db.objectStoreNames.contains(DEEPSEEK_SETTINGS_STORE)) {
        db.createObjectStore(DEEPSEEK_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v14→v15: add searxngSettings object store for v1.0.6 SearXNG search
      if (!db.objectStoreNames.contains(SEARXNG_SETTINGS_STORE)) {
        db.createObjectStore(SEARXNG_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v3→v4: add knowledgeBaseId to existing sessions
      if (oldVersion > 0 && oldVersion < 4) {
        const sessionsStore = upgradeTx.objectStore(SESSIONS_STORE)
        const req = sessionsStore.getAll()
        req.onsuccess = () => {
          for (const session of req.result as ChatSession[]) {
            if (session.knowledgeBaseId === undefined) {
              session.knowledgeBaseId = null
              sessionsStore.put(session)
            }
          }
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveSessions(sessions: ChatSession[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SESSIONS_STORE, 'readwrite')
  const store = tx.objectStore(SESSIONS_STORE)

  const newIds = new Set(sessions.map((s) => s.id))

  return new Promise((resolve, reject) => {
    // First, read existing keys so we can delete sessions that have been removed.
    // Using getAllKeys() + selective delete instead of store.clear() prevents
    // total data loss if a subsequent put fails mid-way.
    const keysReq = store.getAllKeys()
    keysReq.onsuccess = () => {
      for (const key of keysReq.result as string[]) {
        if (!newIds.has(key)) store.delete(key)
      }
      for (const session of sessions) {
        store.put(session)
      }
    }
    keysReq.onerror = () => reject(keysReq.error)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSessions(): Promise<ChatSession[]> {
  const db = await openDB()
  const tx = db.transaction(SESSIONS_STORE, 'readonly')
  const store = tx.objectStore(SESSIONS_STORE)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const sessions = request.result as ChatSession[]
      sessions.sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(sessions.map(migrateSession))
    }
    request.onerror = () => reject(request.error)
  })
}

function migrateSession(session: ChatSession): ChatSession {
  const migrated = { ...session }
  if (!migrated.systemPrompt) migrated.systemPrompt = ''
  if (!migrated.generationParams) {
    migrated.generationParams = { temperature: 0.7, top_p: 0.9, maxTokens: 1024 }
  }
  if (migrated.personaId === undefined) migrated.personaId = null
  if (migrated.knowledgeBaseId === undefined) migrated.knowledgeBaseId = null
  if (migrated.forkId === undefined) migrated.forkId = null
  if (migrated.summaries === undefined) migrated.summaries = []
  if (migrated.provider === undefined) migrated.provider = null
  return migrated
}

export function createSession(modelId: string): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    modelId,
    messages: [],
    systemPrompt: '',
    generationParams: { temperature: 0.7, top_p: 0.9, maxTokens: 1024 },
    personaId: null,
    knowledgeBaseId: null,
    forkId: null,
    summaries: [],
    provider: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now() }
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user')
  if (!firstUserMsg) return 'New Chat'
  const text = firstUserMsg.content.slice(0, 40)
  return text.length < firstUserMsg.content.length ? `${text}...` : text
}

const DOWNLOADED_MODELS_KEY = 'monday-downloaded-models'

export function getDownloadedModelIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DOWNLOADED_MODELS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function markModelDownloaded(modelId: string): void {
  const ids = getDownloadedModelIds()
  ids.add(modelId)
  localStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify([...ids]))
}

// ── Knowledge document storage ──

export async function saveKnowledgeDocs(docs: KnowledgeDocument[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(KNOWLEDGE_STORE, 'readwrite')
  const store = tx.objectStore(KNOWLEDGE_STORE)
  store.clear()
  for (const doc of docs) {
    store.put(doc)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadKnowledgeDocs(): Promise<KnowledgeDocument[]> {
  const db = await openDB()
  const tx = db.transaction(KNOWLEDGE_STORE, 'readonly')
  const store = tx.objectStore(KNOWLEDGE_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const docs = request.result as KnowledgeDocument[]
      docs.sort((a, b) => b.createdAt - a.createdAt)
      resolve(docs)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(KNOWLEDGE_STORE, 'readwrite')
  const store = tx.objectStore(KNOWLEDGE_STORE)
  store.delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Knowledge base storage ──

export async function saveKnowledgeBases(bases: KnowledgeBase[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(BASES_STORE, 'readwrite')
  const store = tx.objectStore(BASES_STORE)
  store.clear()
  for (const base of bases) {
    store.put(base)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadKnowledgeBases(): Promise<KnowledgeBase[]> {
  const db = await openDB()
  const tx = db.transaction(BASES_STORE, 'readonly')
  const store = tx.objectStore(BASES_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const bases = request.result as KnowledgeBase[]
      bases.sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(bases)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(BASES_STORE, 'readwrite')
  const store = tx.objectStore(BASES_STORE)
  store.delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Embedding storage (v0.26.0) ────────────────────────────────────────────

export interface EmbeddingEntry {
  id: string
  /** Chunk text this embedding represents */
  text: string
  /** Source document name */
  docName: string
  /** Embedding vector (384-dim for all-MiniLM-L6-v2) */
  vector: number[]
  /** Timestamp of when this embedding was created */
  createdAt: number
}

export async function saveEmbeddings(embeddings: EmbeddingEntry[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(EMBEDDINGS_STORE, 'readwrite')
  const store = tx.objectStore(EMBEDDINGS_STORE)
  store.clear()
  for (const emb of embeddings) {
    store.put(emb)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadEmbeddings(): Promise<EmbeddingEntry[]> {
  const db = await openDB()
  const tx = db.transaction(EMBEDDINGS_STORE, 'readonly')
  const store = tx.objectStore(EMBEDDINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const embeddings = request.result as EmbeddingEntry[]
      embeddings.sort((a, b) => b.createdAt - a.createdAt)
      resolve(embeddings)
    }
    request.onerror = () => reject(request.error)
  })
}

// ── API Settings storage (v1.0.0) ───────────────────────────────────────────

export async function saveApiSettings(settings: OpenAISettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(API_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(API_SETTINGS_STORE)
  store.put({ id: 'api-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadApiSettings(): Promise<OpenAISettings | null> {
  const db = await openDB()
  const tx = db.transaction(API_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(API_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('api-settings')
    request.onsuccess = () => {
      resolve((request.result as OpenAISettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteApiSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(API_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(API_SETTINGS_STORE)
  store.delete('api-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearEmbeddings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(EMBEDDINGS_STORE, 'readwrite')
  const store = tx.objectStore(EMBEDDINGS_STORE)
  store.clear()
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Ollama Settings storage (v1.0.1) ────────────────────────────────────────

export async function saveOllamaSettings(settings: OllamaSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(OLLAMA_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(OLLAMA_SETTINGS_STORE)
  store.put({ id: 'ollama-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadOllamaSettings(): Promise<OllamaSettings | null> {
  const db = await openDB()
  const tx = db.transaction(OLLAMA_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(OLLAMA_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('ollama-settings')
    request.onsuccess = () => {
      resolve((request.result as OllamaSettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteOllamaSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(OLLAMA_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(OLLAMA_SETTINGS_STORE)
  store.delete('ollama-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── LM Studio Settings storage (v1.0.2) ──────────────────────────────────────

export async function saveLmStudioSettings(settings: LmStudioSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(LMSTUDIO_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(LMSTUDIO_SETTINGS_STORE)
  store.put({ id: 'lmstudio-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadLmStudioSettings(): Promise<LmStudioSettings | null> {
  const db = await openDB()
  const tx = db.transaction(LMSTUDIO_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(LMSTUDIO_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('lmstudio-settings')
    request.onsuccess = () => {
      resolve((request.result as LmStudioSettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteLmStudioSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(LMSTUDIO_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(LMSTUDIO_SETTINGS_STORE)
  store.delete('lmstudio-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── llama.cpp Settings storage (v1.0.3) ──────────────────────────────────────

export async function saveLlamaCppSettings(settings: LlamaCppSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(LLAMACPP_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(LLAMACPP_SETTINGS_STORE)
  store.put({ id: 'llamacpp-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadLlamaCppSettings(): Promise<LlamaCppSettings | null> {
  const db = await openDB()
  const tx = db.transaction(LLAMACPP_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(LLAMACPP_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('llamacpp-settings')
    request.onsuccess = () => {
      resolve((request.result as LlamaCppSettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteLlamaCppSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(LLAMACPP_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(LLAMACPP_SETTINGS_STORE)
  store.delete('llamacpp-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── vLLM Settings storage (v1.0.4) ──────────────────────────────────────────

export async function saveVllmSettings(settings: VllmSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(VLLM_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(VLLM_SETTINGS_STORE)
  store.put({ id: 'vllm-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadVllmSettings(): Promise<VllmSettings | null> {
  const db = await openDB()
  const tx = db.transaction(VLLM_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(VLLM_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('vllm-settings')
    request.onsuccess = () => {
      resolve((request.result as VllmSettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteVllmSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(VLLM_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(VLLM_SETTINGS_STORE)
  store.delete('vllm-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── DeepSeek Settings storage (v1.0.5) ────────────────────────────────────────

export async function saveDeepSeekSettings(settings: DeepSeekSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(DEEPSEEK_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(DEEPSEEK_SETTINGS_STORE)
  store.put({ id: 'deepseek-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadDeepSeekSettings(): Promise<DeepSeekSettings | null> {
  const db = await openDB()
  const tx = db.transaction(DEEPSEEK_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(DEEPSEEK_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('deepseek-settings')
    request.onsuccess = () => {
      resolve((request.result as DeepSeekSettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteDeepSeekSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(DEEPSEEK_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(DEEPSEEK_SETTINGS_STORE)
  store.delete('deepseek-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── SearXNG Settings storage (v1.0.6) ────────────────────────────────────────

export async function saveSearXngSettings(settings: SearXngSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SEARXNG_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(SEARXNG_SETTINGS_STORE)
  store.put({ id: 'searxng-settings', ...settings })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSearXngSettings(): Promise<SearXngSettings | null> {
  const db = await openDB()
  const tx = db.transaction(SEARXNG_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(SEARXNG_SETTINGS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get('searxng-settings')
    request.onsuccess = () => {
      resolve((request.result as SearXngSettings | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteSearXngSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SEARXNG_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(SEARXNG_SETTINGS_STORE)
  store.delete('searxng-settings')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
