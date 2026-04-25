/**
 * Hook that manages the embedding model lifecycle (load/unload/state).
 *
 * The embedding model is loaded on demand and cached in memory.
 * It persists its loaded state in localStorage so the UI can show
 * whether the model is available without re-loading.
 *
 * This is part of v0.26 (RAG — embedding model).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
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
  const loadedRef = useRef(false)

  // Check localStorage for previously loaded state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMBEDDING_LOADED_KEY)
      if (saved === 'true') {
        loadedRef.current = true
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  const load = useCallback(async () => {
    if (loadedRef.current) {
      setState(getEmbeddingState())
      return
    }

    try {
      await loadEmbeddingModel('Xenova/all-MiniLM-L6-v2', (p) => {
        setState((prev) => ({ ...prev, progress: p }))
      })
      loadedRef.current = true
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
    loadedRef.current = false
    localStorage.removeItem(EMBEDDING_LOADED_KEY)
    setState(getEmbeddingState())
  }, [])

  return {
    state,
    isLoaded: loadedRef.current,
    progress: state.progress,
    error: state.error,
    load,
    unload,
  }
}
