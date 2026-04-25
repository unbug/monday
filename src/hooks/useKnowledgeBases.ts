import { useState, useCallback } from 'react'
import type { KnowledgeBase } from '../types'
import {
  saveKnowledgeBases,
  loadKnowledgeBases,
  deleteKnowledgeBase,
} from '../lib/storage'

export interface UseKnowledgeBasesReturn {
  bases: KnowledgeBase[]
  loading: boolean
  error: string | null
  activeBaseId: string | null
  setActiveBaseId: (id: string | null) => void
  createBase: (name: string) => Promise<void>
  renameBase: (id: string, name: string) => Promise<void>
  deleteBase: (id: string) => Promise<void>
  addDocToBase: (baseId: string, docId: string) => Promise<void>
  removeDocFromBase: (baseId: string, docId: string) => Promise<void>
  getBaseById: (id: string) => KnowledgeBase | undefined
}

export function useKnowledgeBases(
  activeBaseId: string | null,
  onActiveBaseChange: (id: string | null) => void,
): UseKnowledgeBasesReturn {
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadKnowledgeBases()
      setBases(loaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load knowledge bases')
    } finally {
      setLoading(false)
    }
  }, [])

  const createBase = useCallback(
    async (name: string) => {
      const now = Date.now()
      const base: KnowledgeBase = {
        id: crypto.randomUUID(),
        name,
        docIds: [],
        createdAt: now,
        updatedAt: now,
      }
      const updated = [base, ...bases]
      setBases(updated)
      await saveKnowledgeBases(updated)
      onActiveBaseChange(base.id)
    },
    [bases, onActiveBaseChange],
  )

  const renameBase = useCallback(
    async (id: string, name: string) => {
      const updated = bases.map((b) =>
        b.id === id ? { ...b, name, updatedAt: Date.now() } : b,
      )
      setBases(updated)
      await saveKnowledgeBases(updated)
    },
    [bases],
  )

  const deleteBase = useCallback(
    async (id: string) => {
      await deleteKnowledgeBase(id)
      const updated = bases.filter((b) => b.id !== id)
      setBases(updated)
      if (activeBaseId === id) {
        onActiveBaseChange(null)
      }
    },
    [bases, activeBaseId, onActiveBaseChange],
  )

  const addDocToBase = useCallback(
    async (baseId: string, docId: string) => {
      const updated = bases.map((b) =>
        b.id === baseId && !b.docIds.includes(docId)
          ? { ...b, docIds: [...b.docIds, docId], updatedAt: Date.now() }
          : b,
      )
      setBases(updated)
      await saveKnowledgeBases(updated)
    },
    [bases],
  )

  const removeDocFromBase = useCallback(
    async (baseId: string, docId: string) => {
      const updated = bases.map((b) =>
        b.id === baseId
          ? { ...b, docIds: b.docIds.filter((d) => d !== docId), updatedAt: Date.now() }
          : b,
      )
      setBases(updated)
      await saveKnowledgeBases(updated)
    },
    [bases],
  )

  const getBaseById = useCallback(
    (id: string) => bases.find((b) => b.id === id),
    [bases],
  )

  // Load on mount
  useState(() => {
    loadBases()
  })

  return {
    bases,
    loading,
    error,
    activeBaseId,
    setActiveBaseId: onActiveBaseChange,
    createBase,
    renameBase,
    deleteBase,
    addDocToBase,
    removeDocFromBase,
    getBaseById,
  }
}
