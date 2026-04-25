import { useState, useCallback, useRef, useEffect } from 'react'
import type { KnowledgeDocument, KnowledgeBase } from '../types'
import type { VectorIndexEntry, SearchScore } from '../lib/vectorStore'
import { buildIndex, searchIndex, saveVectorIndex, loadVectorIndex, clearVectorIndex } from '../lib/vectorStore'

export interface UseVectorStoreReturn {
  /** Whether the index is being built */
  indexing: boolean
  /** Number of indexed chunks */
  indexedCount: number
  /** Search results */
  results: SearchScore[]
  /** Current query text */
  query: string
  /** Set the query text (triggers search) */
  setQuery: (q: string) => void
  /** Build the index from documents */
  indexDocs: (docs: KnowledgeDocument[]) => Promise<void>
  /** Clear the index */
  clearIndex: () => Promise<void>
  /** Whether the index has been built */
  hasIndex: boolean
  /** Filter results to only chunks from these doc IDs (base-aware search) */
  setBaseFilter: (docIds: string[] | null) => void
  /** Search using the embedding model (semantic search) */
  search: (query: string, topK?: number) => Promise<SearchScore[]>
  /** Search a knowledge base by ID and return top-K chunks (v0.26.1) */
  knowledgeSearch: (query: string, baseId: string, docs: KnowledgeDocument[], getBaseById: (id: string) => KnowledgeBase | undefined) => Promise<SearchScore[]>
  /** Load the embedding model if not already loaded (v0.26.1) */
  loadEmbedding: () => Promise<void>
}

/**
 * Hook that manages the TF-IDF vector index and search for knowledge documents.
 *
 * Index is persisted in IndexedDB (vectorIndex object store) so it survives
 * page reloads. Re-indexing is triggered when documents change.
 *
 * v0.26+: also exposes `search()` for embedding-based semantic search.
 */
export function useVectorStore(): UseVectorStoreReturn {
  const [indexing, setIndexing] = useState(false)
  const [indexedCount, setIndexedCount] = useState(0)
  const [results, setResults] = useState<SearchScore[]>([])
  const [query, setQuery] = useState('')
  const [hasIndex, setHasIndex] = useState(false)
  const [baseDocIds, setBaseDocIds] = useState<string[] | null>(null)

  // Load persisted index on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loaded = await loadVectorIndex()
        if (!cancelled && loaded && loaded.length > 0) {
          setHasIndex(true)
          setIndexedCount(loaded.length)
        }
      } catch {
        // Index not available yet
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    (q: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(async () => {
        if (!q.trim()) {
          setResults([])
          return
        }
        const loaded = await loadVectorIndex()
        if (!loaded || loaded.length === 0) {
          setResults([])
          return
        }
        let scored = searchIndex(loaded, q, 10)
        // Filter to active base if set
        if (baseDocIds && baseDocIds.length > 0) {
          const docSet = new Set(baseDocIds)
          scored = scored.filter((r) => docSet.has(r.docName))
        }
        setResults(scored)
      }, 150)
    },
    [baseDocIds],
  )

  const setQueryWithSearch = useCallback(
    (q: string) => {
      setQuery(q)
      doSearch(q)
    },
    [doSearch],
  )

  const indexDocs = useCallback(
    async (docs: KnowledgeDocument[]) => {
      setIndexing(true)
      try {
        const chunks = docs.flatMap((doc) =>
          doc.chunks.map((text, i) => ({
            id: `${doc.id}:${i}`,
            text,
            docName: doc.name,
          })),
        )
        const newIndex = buildIndex(chunks)
        await saveVectorIndex(newIndex)
        setHasIndex(true)
        setIndexedCount(newIndex.length)
        setResults([])
        setQuery('')
      } finally {
        setIndexing(false)
      }
    },
    [],
  )

  const clearIndex = useCallback(async () => {
    await clearVectorIndex()
    setHasIndex(false)
    setIndexedCount(0)
    setResults([])
    setQuery('')
  }, [])

  // Embedding-based semantic search (v0.26.0)
  const search = useCallback(async (q: string, topK: number = 10): Promise<SearchScore[]> => {
    if (!q.trim()) return []

    // Try to load embedding model if not loaded
    const { loadEmbeddingModel, generateEmbedding } = await import('../lib/embedding')
    try {
      await loadEmbeddingModel()
    } catch {
      // Model load failed or already loaded — fallback to empty
      return []
    }

    const loaded = await loadVectorIndex()
    if (!loaded || loaded.length === 0) return []

    const chunks = loaded.map((entry) => ({
      id: entry.id,
      text: entry.text,
      docName: entry.docName,
    }))

    // Filter to active base if set
    let filtered = chunks
    if (baseDocIds && baseDocIds.length > 0) {
      const docSet = new Set(baseDocIds)
      filtered = chunks.filter((c) => docSet.has(c.docName))
    }

    const { semanticSearch } = await import('../lib/vectorStore')
    return semanticSearch(filtered, q, generateEmbedding, topK)
  }, [baseDocIds])

  /**
   * Search a knowledge base by ID and return top-K chunks.
   * Loads the embedding model if needed.
   */
  const knowledgeSearch = useCallback(
    async (
      query: string,
      baseId: string,
      docs: KnowledgeDocument[],
      getBaseById: (id: string) => KnowledgeBase | undefined,
    ): Promise<SearchScore[]> => {
      if (!query.trim() || !baseId || docs.length === 0) return []

      // Load embedding model if not loaded
      const { loadEmbeddingModel } = await import('../lib/embedding')
      try {
        await loadEmbeddingModel()
      } catch {
        return []
      }

      // Get base documents
      const base = getBaseById(baseId)
      if (!base || base.docIds.length === 0) return []

      const baseDocs = docs.filter((d) => base.docIds.includes(d.id))

      if (baseDocs.length === 0) return []

      // Extract chunks
      const chunks = baseDocs.flatMap((doc) =>
        doc.chunks.map((text, i) => ({
          id: `${doc.id}:${i}`,
          text,
          docName: doc.name,
        })),
      )

      if (chunks.length === 0) return []

      // Run semantic search
      const { semanticSearch } = await import('../lib/vectorStore')
      return semanticSearch(chunks, query, async (t) => {
        const { generateEmbedding } = await import('../lib/embedding')
        return generateEmbedding(t)
      }, 10)
    },
    [],
  )

  /**
   * Load the embedding model if not already loaded.
   */
  const loadEmbedding = useCallback(async () => {
    const { loadEmbeddingModel } = await import('../lib/embedding')
    await loadEmbeddingModel()
  }, [])

  return {
    indexing,
    indexedCount,
    results,
    query,
    setQuery: setQueryWithSearch,
    indexDocs,
    clearIndex,
    hasIndex,
    setBaseFilter: setBaseDocIds,
    search,
    knowledgeSearch,
    loadEmbedding,
  }
}
