import { useState, useCallback } from 'react'
import type { KnowledgeDocument } from '../types'
import { saveKnowledgeDocs, loadKnowledgeDocs, deleteKnowledgeDoc } from '../lib/storage'
import { parseDocument } from '../lib/documentParser'

export function useKnowledge() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadKnowledgeDocs()
      setDocs(loaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setLoading(true)
      setError(null)
      const newDocs: KnowledgeDocument[] = []

      for (const file of files) {
        // Only accept PDF, TXT, MD
        const validTypes = [
          'application/pdf',
          'text/plain',
          'text/markdown',
        ]
        const validExtensions = ['.pdf', '.txt', '.md', '.markdown']
        const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
        const isTXT = file.type === 'text/plain' || file.name.endsWith('.txt')
        const isMD =
          file.type === 'text/markdown' ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.markdown')

        if (!isPDF && !isTXT && !isMD) {
          setError(`Unsupported file type: ${file.name}`)
          continue
        }

        try {
          const parsed = await parseDocument(file)
          newDocs.push({
            id: crypto.randomUUID(),
            name: file.name,
            type: parsed.type,
            size: file.size,
            content: parsed.content,
            chunks: parsed.chunks,
            createdAt: Date.now(),
          })
        } catch (e) {
          setError(`Failed to parse ${file.name}: ${e instanceof Error ? e.message : 'unknown error'}`)
        }
      }

      if (newDocs.length > 0) {
        const updated = [...newDocs, ...docs]
        setDocs(updated)
        await saveKnowledgeDocs(updated)
      }

      setLoading(false)
    },
    [docs],
  )

  const removeDoc = useCallback(
    async (id: string) => {
      await deleteKnowledgeDoc(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    },
    [],
  )

  const clearDocs = useCallback(async () => {
    await saveKnowledgeDocs([])
    setDocs([])
  }, [])

  // Load on mount
  useState(() => {
    loadDocs()
  })

  return {
    docs,
    loading,
    error,
    setError,
    loadDocs,
    uploadFiles,
    removeDoc,
    clearDocs,
  }
}
