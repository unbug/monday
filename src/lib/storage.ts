import type { ChatSession, ChatMessage, GenerationParams, KnowledgeDocument, KnowledgeBase, OpenAISettings, OllamaSettings, LmStudioSettings, LlamaCppSettings, VllmSettings, DeepSeekSettings, SearXngSettings, Skill, MemoryEntry, OntologyEntity, EntityType, WorkshopProposal, PlaywrightMcpSettings, TaskBrief, AsyncTask } from '../types'
import { SCHEMA_VERSION } from './migrationRegistry'

const DB_NAME = 'monday-ai'
const DB_VERSION = SCHEMA_VERSION
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
const SKILLS_STORE = 'skills'
const MEMORIES_STORE = 'memories'
const ONTOLOGY_STORE = 'ontology'
const WORKSHOP_STORE = 'workshop'
const PLAYWRIGHT_MCP_SETTINGS_STORE = 'playwrightMcpSettings'
const TASK_BRIEFS_STORE = 'taskBriefs'
const ASYNC_TASKS_STORE = 'asyncTasks'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result
      const oldVersion = event.oldVersion
      // IMPORTANT: use the implicit upgrade transaction — never call db.transaction()
      // inside onupgradeneeded, as it throws InvalidStateError and aborts the upgrade.
      //
      // All migrations are documented in src/lib/migrationRegistry.ts (MIGRATION_REGISTRY).
      // Rules: additive-only — future migrations MUST only add stores or fields, never
      // rename, remove, or change types of existing ones.
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
      // Migration v15→v16: add skills object store for v1.1 Skills System
      if (!db.objectStoreNames.contains(SKILLS_STORE)) {
        db.createObjectStore(SKILLS_STORE, { keyPath: 'id' })
      }
      // Migration v16→v17: add skillIds field to existing sessions for v1.1 Skill composer
      if (oldVersion > 0 && oldVersion < 17) {
        const sessionsStore = upgradeTx.objectStore(SESSIONS_STORE)
        const req = sessionsStore.getAll()
        req.onsuccess = () => {
          for (const session of req.result as ChatSession[]) {
            if (session.skillIds === undefined) {
              session.skillIds = []
              sessionsStore.put(session)
            }
          }
        }
      }
      // Migration v17→v18: add memories object store for v1.2 Persistent memory
      if (!db.objectStoreNames.contains(MEMORIES_STORE)) {
        db.createObjectStore(MEMORIES_STORE, { keyPath: 'id' })
      }
      // Migration v18→v19: add ontology object store for v1.2.2 Ontology store
      if (!db.objectStoreNames.contains(ONTOLOGY_STORE)) {
        db.createObjectStore(ONTOLOGY_STORE, { keyPath: 'id' })
      }
      // Migration v19→v20: add workshop proposals store for v1.2.4 Skill Workshop
      if (!db.objectStoreNames.contains(WORKSHOP_STORE)) {
        db.createObjectStore(WORKSHOP_STORE, { keyPath: 'id' })
      }
      // Migration v20→v21: add playwrightMcpSettings object store for v1.3.4 Playwright MCP bridge
      if (!db.objectStoreNames.contains(PLAYWRIGHT_MCP_SETTINGS_STORE)) {
        db.createObjectStore(PLAYWRIGHT_MCP_SETTINGS_STORE, { keyPath: 'id' })
      }
      // Migration v21→v22: add taskBriefs object store for v1.3 Task brief
      if (!db.objectStoreNames.contains(TASK_BRIEFS_STORE)) {
        db.createObjectStore(TASK_BRIEFS_STORE, { keyPath: 'id' })
      }
      // Migration v22→v23: add asyncTasks object store for v1.3 Async task queue
      if (!db.objectStoreNames.contains(ASYNC_TASKS_STORE)) {
        db.createObjectStore(ASYNC_TASKS_STORE, { keyPath: 'id' })
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
  if (migrated.personaSoul === undefined) migrated.personaSoul = ''
  if (migrated.knowledgeBaseId === undefined) migrated.knowledgeBaseId = null
  if (migrated.forkId === undefined) migrated.forkId = null
  if (migrated.summaries === undefined) migrated.summaries = []
  if (migrated.provider === undefined) migrated.provider = null
  if (migrated.personaReadNamespaces === undefined) migrated.personaReadNamespaces = []
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
    personaSoul: '',
    personaReadNamespaces: [],
    knowledgeBaseId: null,
    skillIds: [],
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

// ── Skills storage (v1.1) ───────────────────────────────────────────────────

export async function saveSkills(skills: Skill[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SKILLS_STORE, 'readwrite')
  const store = tx.objectStore(SKILLS_STORE)
  store.clear()
  for (const skill of skills) {
    store.put(skill)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSkills(): Promise<Skill[]> {
  const db = await openDB()
  const tx = db.transaction(SKILLS_STORE, 'readonly')
  const store = tx.objectStore(SKILLS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const skills = request.result as Skill[]
      skills.sort((a, b) => b.createdAt - a.createdAt)
      resolve(skills)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteSkill(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SKILLS_STORE, 'readwrite')
  const store = tx.objectStore(SKILLS_STORE)
  store.delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Skills event emitter (v1.1.6 — hot-reload) ──────────────────────────────
// Lightweight pub/sub used to notify UI components when skills change.
// The engine-level hot-reload already works because sendUserMessage() calls
// loadSkills() fresh each turn; this emitter refreshes the SkillComposer
// UI so the user sees updated skill data without leaving the chat.

type SkillsListener = () => void

const skillsListeners = new Set<SkillsListener>()

export function onSkillsChanged(listener: SkillsListener): () => void {
  skillsListeners.add(listener)
  return () => skillsListeners.delete(listener)
}

export function emitSkillsChanged(): void {
  for (const listener of skillsListeners) {
    try { listener() }
    catch { /* ignore listener errors */ }
  }
}

// ── Persistent Memory storage (v1.2) ────────────────────────────────────────
// Cross-session key-value memories. The model can read these at session start
// and write new ones during conversation. Memories are scoped to namespaces:
// global (all sessions), persona (per-persona), or skill (per-skill).

export async function saveMemories(memories: MemoryEntry[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(MEMORIES_STORE, 'readwrite')
  const store = tx.objectStore(MEMORIES_STORE)
  store.clear()
  for (const memory of memories) {
    store.put(memory)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadMemories(): Promise<MemoryEntry[]> {
  const db = await openDB()
  const tx = db.transaction(MEMORIES_STORE, 'readonly')
  const store = tx.objectStore(MEMORIES_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const memories = request.result as MemoryEntry[]
      memories.sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(memories)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function loadMemoriesByNamespace(namespace: MemoryEntry['namespace'], targetId: string | null): Promise<MemoryEntry[]> {
  const memories = await loadMemories()
  return memories.filter((m) => m.namespace === 'global' || (m.namespace === namespace && m.targetId === targetId))
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(MEMORIES_STORE, 'readwrite')
  const store = tx.objectStore(MEMORIES_STORE)
  store.delete(id)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function createMemory(key: string, value: string, namespace: MemoryEntry['namespace'], targetId: string | null, sessionId: string): Promise<MemoryEntry> {
  const now = Date.now()
  const memory: MemoryEntry = {
    id: crypto.randomUUID(),
    key,
    value,
    namespace,
    targetId,
    sessionId,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  }
  await saveMemories([...(await loadMemories()), memory])
  return memory
}

export async function updateMemory(id: string, key: string, value: string): Promise<void> {
  const memories = await loadMemories()
  const idx = memories.findIndex((m) => m.id === id)
  if (idx !== -1) {
    memories[idx].key = key
    memories[idx].value = value
    memories[idx].updatedAt = Date.now()
    await saveMemories(memories)
  }
}

// ── Correction capture (v1.2.1) ─────────────────────────────────────────────
// Auto-captures message edits/regenerations as named memory entries.
// The persona reads these corrections at session start to infer user preferences.

export interface CorrectionEvent {
  /** Message ID that was corrected */
  messageId: string
  /** Correction type */
  type: 'edit' | 'regenerate'
  /** Old content (before correction) */
  oldContent: string
  /** New content (after correction) */
  newContent: string
}

export async function saveCorrection(
  correction: CorrectionEvent,
  sessionId: string,
): Promise<MemoryEntry> {
  const now = Date.now()
  const typeLabel = correction.type === 'edit' ? 'edit' : 'regen'
  const key = `correction:${typeLabel}`
  const value = JSON.stringify({
    messageId: correction.messageId,
    type: correction.type,
    oldContent: correction.oldContent,
    newContent: correction.newContent,
    capturedAt: now,
  })
  const memory: MemoryEntry = {
    id: crypto.randomUUID(),
    key,
    value,
    namespace: 'global',
    targetId: null,
    sessionId,
    createdAt: now,
    updatedAt: now,
    source: 'correction',
  }
  await saveMemories([...(await loadMemories()), memory])
  return memory
}

// ── Ontology Store (v1.2.2) ─────────────────────────────────────────────────
// Typed entity graph: Person, Project, Task, Event, Document.
// Entities have properties + relationships; browsable/editable in a side panel;
// injected as a compact context block when relevant entities are mentioned.

export async function saveOntologyEntities(entities: OntologyEntity[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(ONTOLOGY_STORE, 'readwrite')
  const store = tx.objectStore(ONTOLOGY_STORE)
  store.clear()
  for (const entity of entities) {
    store.put(entity)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadOntologyEntities(): Promise<OntologyEntity[]> {
  const db = await openDB()
  const tx = db.transaction(ONTOLOGY_STORE, 'readonly')
  const store = tx.objectStore(ONTOLOGY_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const entities = request.result as OntologyEntity[]
      entities.sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(entities)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function loadOntologyEntitiesByType(type: EntityType): Promise<OntologyEntity[]> {
  const entities = await loadOntologyEntities()
  return entities.filter((e) => e.type === type)
}

export async function getOntologyEntity(id: string): Promise<OntologyEntity | null> {
  const db = await openDB()
  const tx = db.transaction(ONTOLOGY_STORE, 'readonly')
  const store = tx.objectStore(ONTOLOGY_STORE)
  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => {
      resolve((request.result as OntologyEntity | undefined) ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function createOntologyEntity(
  type: EntityType,
  name: string,
  properties: Record<string, string>,
): Promise<OntologyEntity> {
  const now = Date.now()
  const entity: OntologyEntity = {
    id: crypto.randomUUID(),
    type,
    name,
    properties,
    relationships: [],
    createdAt: now,
    updatedAt: now,
  }
  const entities = await loadOntologyEntities()
  await saveOntologyEntities([...entities, entity])
  return entity
}

export async function updateOntologyEntity(
  id: string,
  name: string,
  properties: Record<string, string>,
): Promise<void> {
  const entities = await loadOntologyEntities()
  const idx = entities.findIndex((e) => e.id === id)
  if (idx !== -1) {
    entities[idx].name = name
    entities[idx].properties = properties
    entities[idx].updatedAt = Date.now()
    await saveOntologyEntities(entities)
  }
}

export async function deleteOntologyEntity(id: string): Promise<void> {
  const entities = await loadOntologyEntities()
  const filtered = entities.filter((e) => e.id !== id)
  // Also remove this entity from other entities' relationship lists
  for (const entity of filtered) {
    if (entity.relationships.includes(id)) {
      entity.relationships = entity.relationships.filter((r) => r !== id)
    }
  }
  await saveOntologyEntities(filtered)
}

export async function addEntityRelationship(fromId: string, toId: string, label: string): Promise<void> {
  const entities = await loadOntologyEntities()
  const fromIdx = entities.findIndex((e) => e.id === fromId)
  if (fromIdx !== -1 && !entities[fromIdx].relationships.includes(toId)) {
    entities[fromIdx].relationships.push(toId)
    entities[fromIdx].updatedAt = Date.now()
    await saveOntologyEntities(entities)
  }
}

export async function removeEntityRelationship(fromId: string, toId: string): Promise<void> {
  const entities = await loadOntologyEntities()
  const fromIdx = entities.findIndex((e) => e.id === fromId)
  if (fromIdx !== -1) {
    entities[fromIdx].relationships = entities[fromIdx].relationships.filter((r) => r !== toId)
    entities[fromIdx].updatedAt = Date.now()
    await saveOntologyEntities(entities)
  }
}

export async function searchOntologyEntities(query: string): Promise<OntologyEntity[]> {
  const entities = await loadOntologyEntities()
  const lower = query.toLowerCase()
  return entities.filter(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      Object.values(e.properties).some((v) => v.toLowerCase().includes(lower)),
  )
}

export function getEntityIcon(type: EntityType): string {
  switch (type) {
    case 'person': return '👤'
    case 'project': return '📁'
    case 'task': return '✅'
    case 'event': return '📅'
    case 'document': return '📄'
  }
}

export function getEntityColor(type: EntityType): string {
  switch (type) {
    case 'person': return '#3b82f6'
    case 'project': return '#8b5cf6'
    case 'task': return '#10b981'
    case 'event': return '#f59e0b'
    case 'document': return '#ef4444'
  }
}

// ── v1.2.4: Skill Workshop — workshop proposals CRUD ────────────────────────

export async function saveWorkshopProposals(proposals: WorkshopProposal[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(WORKSHOP_STORE, 'readwrite')
  const store = tx.objectStore(WORKSHOP_STORE)
  for (const p of proposals) {
    store.put(p)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadWorkshopProposals(): Promise<WorkshopProposal[]> {
  const db = await openDB()
  const tx = db.transaction(WORKSHOP_STORE, 'readonly')
  const store = tx.objectStore(WORKSHOP_STORE)
  const req = store.getAll()
  return new Promise<WorkshopProposal[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as WorkshopProposal[])
    req.onerror = () => reject(req.error)
  })
}

export async function updateWorkshopProposal(id: string, patch: Partial<WorkshopProposal>): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(WORKSHOP_STORE, 'readwrite')
  const store = tx.objectStore(WORKSHOP_STORE)
  const getReq = store.get(id)
  await new Promise<void>((resolve, reject) => {
    getReq.onsuccess = () => {
      const existing = getReq.result as WorkshopProposal
      if (existing) {
        Object.assign(existing, patch)
        store.put(existing)
        resolve()
      } else {
        reject(new Error('Workshop proposal not found'))
      }
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function deleteWorkshopProposal(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(WORKSHOP_STORE, 'readwrite')
  const store = tx.objectStore(WORKSHOP_STORE)
  store.delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadPendingWorkshopProposals(): Promise<WorkshopProposal[]> {
  const proposals = await loadWorkshopProposals()
  return proposals.filter((p) => p.status === 'pending')
}

// ── v1.3.4: Playwright MCP settings ─────────────────────────────────────────

export async function savePlaywrightMcpSettings(settings: PlaywrightMcpSettings): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(PLAYWRIGHT_MCP_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(PLAYWRIGHT_MCP_SETTINGS_STORE)
  store.put({ id: 'playwrightMcp', ...settings })
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadPlaywrightMcpSettings(): Promise<PlaywrightMcpSettings | null> {
  const db = await openDB()
  const tx = db.transaction(PLAYWRIGHT_MCP_SETTINGS_STORE, 'readonly')
  const store = tx.objectStore(PLAYWRIGHT_MCP_SETTINGS_STORE)
  const req = store.get('playwrightMcp')
  return new Promise<PlaywrightMcpSettings | null>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deletePlaywrightMcpSettings(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(PLAYWRIGHT_MCP_SETTINGS_STORE, 'readwrite')
  const store = tx.objectStore(PLAYWRIGHT_MCP_SETTINGS_STORE)
  store.delete('playwrightMcp')
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Task Brief CRUD (v1.3 Task brief) ──────────────────────────────────────

export async function saveTaskBrief(brief: TaskBrief): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(TASK_BRIEFS_STORE, 'readwrite')
  const store = tx.objectStore(TASK_BRIEFS_STORE)
  store.put(brief)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadTaskBrief(id: string): Promise<TaskBrief | null> {
  const db = await openDB()
  const tx = db.transaction(TASK_BRIEFS_STORE, 'readonly')
  const store = tx.objectStore(TASK_BRIEFS_STORE)
  const req = store.get(id)
  return new Promise<TaskBrief | null>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function loadAllTaskBriefs(): Promise<TaskBrief[]> {
  const db = await openDB()
  const tx = db.transaction(TASK_BRIEFS_STORE, 'readonly')
  const store = tx.objectStore(TASK_BRIEFS_STORE)
  const req = store.getAll()
  return new Promise<TaskBrief[]>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteTaskBrief(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(TASK_BRIEFS_STORE, 'readwrite')
  const store = tx.objectStore(TASK_BRIEFS_STORE)
  store.delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Async Task Queue (v1.3) ───────────────────────────────────────────────────

export async function saveAsyncTask(task: AsyncTask): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(ASYNC_TASKS_STORE, 'readwrite')
  const store = tx.objectStore(ASYNC_TASKS_STORE)
  store.put(task)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAsyncTask(id: string): Promise<AsyncTask | null> {
  const db = await openDB()
  const tx = db.transaction(ASYNC_TASKS_STORE, 'readonly')
  const store = tx.objectStore(ASYNC_TASKS_STORE)
  const req = store.get(id)
  return new Promise<AsyncTask | null>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function loadAsyncTasks(): Promise<AsyncTask[]> {
  const db = await openDB()
  const tx = db.transaction(ASYNC_TASKS_STORE, 'readonly')
  const store = tx.objectStore(ASYNC_TASKS_STORE)
  const req = store.getAll()
  return new Promise<AsyncTask[]>((resolve, reject) => {
    req.onsuccess = () => {
      const tasks = req.result ?? []
      // Sort by createdAt descending (newest first)
      resolve(tasks.sort((a, b) => b.createdAt - a.createdAt))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAsyncTask(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(ASYNC_TASKS_STORE, 'readwrite')
  const store = tx.objectStore(ASYNC_TASKS_STORE)
  store.delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadActiveAsyncTasks(): Promise<AsyncTask[]> {
  const all = await loadAsyncTasks()
  // Return only pending or running tasks
  return all.filter((t) => t.status === 'pending' || t.status === 'running')
}

