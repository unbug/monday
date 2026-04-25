import { useState, useCallback, useRef, useEffect } from 'react'
import type { KnowledgeDocument } from '../types'
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
}

/**
 * Hook that manages the TF-IDF vector index and search for knowledge documents.
 *
 * Index is persisted in IndexedDB (vectorIndex object store) so it survives
 * page reloads. Re-indexing is triggered when documents change.
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
  }
}
