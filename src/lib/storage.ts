import type { ChatSession, ChatMessage, GenerationParams, KnowledgeDocument, KnowledgeBase } from '../types'

const DB_NAME = 'monday-ai'
const DB_VERSION = 4
const SESSIONS_STORE = 'sessions'
const KNOWLEDGE_STORE = 'knowledge'
const VECTOR_STORE = 'vectorIndex'
const BASES_STORE = 'knowledgeBases'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result
      const oldVersion = event.oldVersion
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
      // Migration v3→v4: add knowledgeBaseId to existing sessions
      if (oldVersion < 4) {
        if (db.objectStoreNames.contains(SESSIONS_STORE)) {
          const tx = db.transaction(SESSIONS_STORE, 'readwrite')
          const sessionsStore = tx.objectStore(SESSIONS_STORE)
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
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveSessions(sessions: ChatSession[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(SESSIONS_STORE, 'readwrite')
  const store = tx.objectStore(SESSIONS_STORE)

  store.clear()
  for (const session of sessions) {
    store.put(session)
  }

  return new Promise((resolve, reject) => {
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
