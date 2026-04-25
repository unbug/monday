/**
 * Browser-native TF-IDF vector store with cosine similarity search.
 *
 * No external ML dependencies — pure JS tokenization, TF-IDF computation,
 * and cosine similarity ranking. IndexedDB persistence for the index
 * survives page reloads.
 *
 * This is the storage layer for v0.25 (Knowledge & RAG). Actual embedding
 * models arrive in v0.26.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface VectorIndexEntry {
  /** Unique chunk ID */
  id: string
  /** TF-IDF vector: term → score */
  vector: Record<string, number>
  /** Original text (retrieved with search results) */
  text: string
  /** Source document name */
  docName: string
}

export interface SearchScore {
  id: string
  text: string
  docName: string
  score: number
  /** Source of this score: 'tfidf' or 'embedding'. Default 'tfidf' for backward compat. */
  source?: 'tfidf' | 'embedding'
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

/**
 * Tokenize text into lowercase tokens.
 * Handles CJK characters (each char is a token), English words, and punctuation.
 */
export function tokenize(text: string): string[] {
  if (!text.trim()) return []

  const tokens: string[] = []
  let currentWord = ''

  for (const char of text) {
    const code = char.charCodeAt(0)
    // CJK characters (0x2E80-0x9FFF, 0x3000-0x303F, 0xFF00-0xFFEF)
    if (
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef) ||
      code === 0x3400 ||
      code === 0x20000 ||
      code === 0x2a6d6
    ) {
      // Flush pending word first
      if (currentWord) {
        tokens.push(currentWord.toLowerCase())
        currentWord = ''
      }
      // CJK char as its own token
      tokens.push(char)
    } else if (/[a-zA-Z0-9]/.test(char)) {
      currentWord += char
    } else {
      if (currentWord) {
        tokens.push(currentWord.toLowerCase())
        currentWord = ''
      }
    }
  }
  if (currentWord) tokens.push(currentWord.toLowerCase())
  return tokens
}

// ── TF-IDF computation ─────────────────────────────────────────────────────

/**
 * Compute term frequency for a token list.
 * Returns { term → count }.
 */
function termFrequency(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {}
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1
  }
  return tf
}

/**
 * Compute inverse document frequency from a set of document token lists.
 * Returns { term → IDF score }.
 */
export function computeIDF(docTokenLists: string[][]): Record<string, number> {
  const N = docTokenLists.length
  if (N === 0) return {}

  // Count document frequency for each term
  const df: Record<string, number> = {}
  for (const tokens of docTokenLists) {
    const unique = new Set(tokens)
    for (const t of unique) {
      df[t] = (df[t] || 0) + 1
    }
  }

  // IDF = log((N + 1) / (df + 1)) + 1  (smoothed IDF)
  const idf: Record<string, number> = {}
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((N + 1) / (count + 1)) + 1
  }
  return idf
}

/**
 * Compute TF-IDF vector for a token list given IDF scores.
 * Returns { term → tf-idf score }.
 */
function computeTFIDF(tf: Record<string, number>, idf: Record<string, number>): Record<string, number> {
  const vector: Record<string, number> = {}
  for (const [term, count] of Object.entries(tf)) {
    vector[term] = count * (idf[term] || 1)
  }
  return vector
}

/**
 * Compute cosine similarity between two sparse vectors.
 */
export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  let dotProduct = 0
  let normA = 0
  let normB = 0

  // Iterate over the smaller key set for efficiency
  const [smaller, larger] = keysA.length <= keysB.length ? [keysA, keysB] : [keysB, keysA]

  for (const key of smaller) {
    const valA = a[key]
    const valB = b[key]
    if (valA !== undefined && valB !== undefined) {
      dotProduct += valA * valB
    }
    if (valA !== undefined) normA += valA * valA
    if (valB !== undefined) normB += valB * valB
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0
  return dotProduct / denominator
}

// ── Vector Index ───────────────────────────────────────────────────────────

const VECTOR_INDEX_KEY = 'monday-vector-index'

export interface SerializedVectorIndex {
  version: number
  idf: Record<string, number>
  entries: { id: string; vector: Record<string, number>; text: string; docName: string }[]
}

/**
 * Build a TF-IDF index from document chunks.
 */
export function buildIndex(
  chunks: Array<{ id: string; text: string; docName: string }>,
): VectorIndexEntry[] {
  if (chunks.length === 0) return []

  const tokenLists = chunks.map((c) => tokenize(c.text))
  const idf = computeIDF(tokenLists)

  return chunks.map((chunk, i) => ({
    id: chunk.id,
    text: chunk.text,
    docName: chunk.docName,
    vector: computeTFIDF(termFrequency(tokenLists[i]), idf),
  }))
}

/**
 * Search the index for the top-K chunks matching a query.
 */
export function searchIndex(
  index: VectorIndexEntry[],
  query: string,
  topK: number = 10,
): SearchScore[] {
  if (index.length === 0 || !query.trim()) return []

  const queryTokens = tokenize(query)
  const queryTF = termFrequency(queryTokens)

  // Compute IDF from the index for consistent scoring
  const docTokenLists = index.map((entry) => tokenize(entry.text))
  const idf = computeIDF(docTokenLists)

  // Build query vector
  const queryVector = computeTFIDF(queryTF, idf)

  // Score each chunk
  const scores: { id: string; text: string; docName: string; score: number }[] = []
  for (const entry of index) {
    const sim = cosineSimilarity(queryVector, entry.vector)
    if (sim > 0) {
      scores.push({ id: entry.id, text: entry.text, docName: entry.docName, score: sim })
    }
  }

  // Sort by score descending, return top-K
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, topK).map((s) => ({ ...s, source: 'tfidf' as const })) as SearchScore[]
}

// ── IndexedDB persistence ──────────────────────────────────────────────────

const DB_NAME = 'monday-ai'
const VECTOR_STORE_NAME = 'vectorIndex'
const CURRENT_SCHEMA_VERSION = 1

export async function saveVectorIndex(index: VectorIndexEntry[]): Promise<void> {
  const db = await openVectorDB()
  const tx = db.transaction(VECTOR_STORE_NAME, 'readwrite')
  const store = tx.objectStore(VECTOR_STORE_NAME)
  store.clear()

  const serialized: SerializedVectorIndex = {
    version: CURRENT_SCHEMA_VERSION,
    idf: {},
    entries: index.map((entry) => ({
      id: entry.id,
      vector: entry.vector,
      text: entry.text,
      docName: entry.docName,
    })),
  }

  store.put(serialized, 'index')

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadVectorIndex(): Promise<VectorIndexEntry[] | null> {
  const db = await openVectorDB()
  const tx = db.transaction(VECTOR_STORE_NAME, 'readonly')
  const store = tx.objectStore(VECTOR_STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get('index')
    request.onsuccess = () => {
      const data = request.result as SerializedVectorIndex | undefined
      if (!data || !data.entries || data.entries.length === 0) {
        resolve(null)
        return
      }
      resolve(data.entries.map((e) => ({ ...e, vector: e.vector })))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function clearVectorIndex(): Promise<void> {
  const db = await openVectorDB()
  const tx = db.transaction(VECTOR_STORE_NAME, 'readwrite')
  const store = tx.objectStore(VECTOR_STORE_NAME)
  store.delete('index')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function openVectorDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(VECTOR_STORE_NAME)) {
        db.createObjectStore(VECTOR_STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── Embedding-based semantic search (v0.26.0) ──────────────────────────────

/**
 * Compute cosine similarity between two Float32Array vectors.
 */
export function embeddingSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0
  return dotProduct / denominator
}

/**
 * Semantic search: generate embeddings for the query and each chunk,
 * then rank by cosine similarity.
 *
 * Returns results with source='embedding' so callers can distinguish
 * them from TF-IDF results.
 */
export async function semanticSearch(
  chunks: Array<{ id: string; text: string; docName: string }>,
  query: string,
  generateEmbedding: (text: string) => Promise<{ data: Float32Array }>,
  topK: number = 10,
): Promise<SearchScore[]> {
  if (chunks.length === 0 || !query.trim()) return []

  // Generate query embedding
  const queryResult = await generateEmbedding(query)
  const queryEmbedding = queryResult.data

  const scores: Array<{ id: string; text: string; docName: string; score: number; source: 'embedding' }> = []
  for (const chunk of chunks) {
    const chunkResult = await generateEmbedding(chunk.text)
    const chunkEmbedding = chunkResult.data
    const sim = embeddingSimilarity(queryEmbedding, chunkEmbedding)
    if (sim > 0) {
      scores.push({ id: chunk.id, text: chunk.text, docName: chunk.docName, score: sim, source: 'embedding' })
    }
  }

  // Sort by score descending, return top-K
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, topK) as SearchScore[]
}
