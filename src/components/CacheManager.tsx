import { useState, useCallback } from 'react'
import { BorderBeam } from 'border-beam'
import { listModelCaches, deleteModelCache, formatBytes } from '../lib/cache'
import type { ModelInfo } from '../types'

interface Props {
  downloadedModelIds: Set<string>
  onCacheChanged: () => void
}

export function CacheManager({ downloadedModelIds, onCacheChanged }: Props) {
  const [caches, setCaches] = useState<
    Array<{ name: string; size: number; modelId: string }>
  >([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const loadCaches = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listModelCaches()
      setCaches(result)
    } catch {
      setCaches([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = useCallback(
    async (modelId: string) => {
      setDeleting(modelId)
      try {
        await deleteModelCache(modelId)
        await loadCaches()
        onCacheChanged()
      } finally {
        setDeleting(null)
      }
    },
    [loadCaches, onCacheChanged],
  )

  const handleDeleteAll = useCallback(async () => {
    if (!window.confirm('Delete all model caches? This cannot be undone.')) return
    const { deleteAllModelCaches } = await import('../lib/cache')
    await deleteAllModelCaches()
    await loadCaches()
    onCacheChanged()
  }, [loadCaches, onCacheChanged])

  // Enrich caches with model info
  const enrichedCaches = caches.map((cache) => {
    const model = [...downloadedModelIds].length > 0 ? undefined : undefined
    return { ...cache }
  })

  const displayCaches = showAll ? enrichedCaches : enrichedCaches.slice(0, 10)

  return (
    <div className="cache-manager">
      <div className="cache-manager-header">
        <h3 className="cache-manager-title">Model Cache</h3>
        <div className="cache-manager-actions">
          <button className="cache-refresh-btn" onClick={loadCaches} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="cache-loading">
          <div className="cache-loading-spinner" />
          <span>Loading cache info...</span>
        </div>
      ) : caches.length === 0 ? (
        <div className="cache-empty">
          <p>No cached models found.</p>
          <p className="cache-empty-hint">Downloaded models are automatically cached in your browser.</p>
        </div>
      ) : (
        <>
          <div className="cache-total">
            Total: {formatBytes(caches.reduce((sum, c) => sum + c.size, 0))}
            {caches.length > 10 && (
              <button className="cache-show-all-btn" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show less' : `+${caches.length - 10} more`}
              </button>
            )}
          </div>

          <div className="cache-list">
            {displayCaches.map((cache) => {
              const modelInfo = [...downloadedModelIds].length > 0 ? undefined : undefined
              const displayName = cache.modelId || cache.name

              return (
                <div key={cache.name} className="cache-item">
                  <div className="cache-item-info">
                    <span className="cache-item-name" title={cache.modelId}>
                      {displayName.length > 30 ? displayName.slice(0, 30) + '...' : displayName}
                    </span>
                    <span className="cache-item-size">{formatBytes(cache.size)}</span>
                  </div>
                  <button
                    className={`cache-delete-btn ${deleting === cache.modelId ? 'cache-deleting' : ''}`}
                    onClick={() => handleDelete(cache.modelId)}
                    disabled={deleting !== null}
                    title="Delete cached model"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {caches.length > 0 && (
            <button className="cache-delete-all-btn" onClick={handleDeleteAll}>
              Delete All Caches
            </button>
          )}
        </>
      )}
    </div>
  )
}
