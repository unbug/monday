/**
 * Hook that manages the embedding model lifecycle (load/unload/state).
 *
 * The embedding model is loaded on demand and cached in memory.
 * It persists its loaded state in localStorage so the UI can show
 * whether the model is available without re-loading.
 *
 * This is part of v0.26 (RAG — embedding model).
 */

import { useState, useCallback } from 'react'
import {
  loadEmbeddingModel,
  unloadEmbeddingModel,
  getEmbeddingState,
  type EmbeddingEngineState,
} from '../lib/embedding'

const EMBEDDING_LOADED_KEY = 'monday-embedding-loaded'

export interface UseEmbeddingModelReturn {
  /** Current engine state (loaded, progress, error) */
  state: EmbeddingEngineState
  /** Whether the model is currently loaded */
  isLoaded: boolean
  /** Loading progress (0–100) */
  progress: number
  /** Error message if loading failed */
  error: string | null
  /** Load the embedding model */
  load: () => Promise<void>
  /** Unload the embedding model (free memory) */
  unload: () => Promise<void>
}

export function useEmbeddingModel(): UseEmbeddingModelReturn {
  const [state, setState] = useState<EmbeddingEngineState>(() => getEmbeddingState())

  const load = useCallback(async () => {
    // Only skip when the model is actually loaded in memory. A stale
    // localStorage flag must never block a real load (e.g. after a page
    // reload, where the in-memory engine state is always "not loaded").
    if (getEmbeddingState().isLoaded) {
      setState(getEmbeddingState())
      return
    }

    try {
      await loadEmbeddingModel('Xenova/all-MiniLM-L6-v2', (p) => {
        setState((prev) => ({ ...prev, progress: p }))
      })
      localStorage.setItem(EMBEDDING_LOADED_KEY, 'true')
      setState(getEmbeddingState())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState((prev) => ({ ...prev, error: `Failed to load: ${message}` }))
      throw err
    }
  }, [])

  const unload = useCallback(async () => {
    await unloadEmbeddingModel()
    localStorage.removeItem(EMBEDDING_LOADED_KEY)
    setState(getEmbeddingState())
  }, [])

  return {
    state,
    // Derive from the authoritative in-memory engine state — a ref read
    // during render could be stale and out of sync with `state`.
    isLoaded: state.isLoaded,
    progress: state.progress,
    error: state.error,
    load,
    unload,
  }
}
