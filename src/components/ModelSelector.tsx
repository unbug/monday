import { BorderBeam } from 'border-beam'
import { useState, useMemo, useCallback } from 'react'
import type { ModelInfo, ModelState } from '../types'
import { MODELS } from '../lib/models'
import { CacheManager } from './CacheManager'
import { DownloadResumeIndicator } from './DownloadResumeIndicator'
import { getTopModels } from '../lib/modelUsage'
import { getRecentModels } from '../lib/recentModels'
import { useDownloadResume } from '../hooks/useDownloadResume'

type SortMode = 'popular' | 'latest' | 'size'

interface Props {
  currentModelId: string | null
  modelState: ModelState
  downloadedModelIds: Set<string>
  onSelect: (model: ModelInfo) => void
  onOpenCache?: () => void
  showCacheManager?: boolean
  onResetRecommendations?: () => void
  onResetRecentModels?: () => void
  onOpenBenchmark?: () => void
  onOpenCustomModels?: () => void
  onOpenPersonaMarketplace?: () => void
  onRetryModel?: (modelId: string) => void
}

export function ModelSelector({
  currentModelId,
  modelState,
  downloadedModelIds,
  onSelect,
  onOpenCache,
  showCacheManager,
  onResetRecommendations,
  onResetRecentModels,
  onOpenBenchmark,
  onOpenCustomModels,
  onOpenPersonaMarketplace,
  onRetryModel,
}: Props) {
  const downloadResume = useDownloadResume()
  const [sortMode, setSortMode] = useState<SortMode>('popular')
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null)

  const sortedModels = useMemo(() => {
    const list = [...MODELS]
    if (sortMode === 'popular') {
      list.sort((a, b) => {
        const aRec = a.recommended ? 1 : 0
        const bRec = b.recommended ? 1 : 0
        if (bRec !== aRec) return bRec - aRec
        const dateA = new Date(a.releaseDate).getTime()
        const dateB = new Date(b.releaseDate).getTime()
        return dateB - dateA
      })
    } else if (sortMode === 'size') {
      list.sort((a, b) => b.paramCount - a.paramCount)
    } else {
      list.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime()
        const dateB = new Date(b.releaseDate).getTime()
        return dateB - dateA
      })
    }
    return list
  }, [sortMode])

  const topModelIds = useMemo(() => getTopModels(3), [])
  const recentModels = useMemo(() => getRecentModels(5), [])

  const tagColors: Record<string, string> = {
    thinking: '#a78bfa',
    tools: '#60a5fa',
    vision: '#34d399',
    embedding: '#fbbf24',
  }

  const tagLabels: Record<string, string> = {
    thinking: '🧠',
    tools: '🔧',
    vision: '👁️',
    embedding: '📇',
  }

  const handleCacheChanged = useCallback(() => {
    // Trigger a re-render to update downloaded model indicators
    // The parent will re-pass downloadedModelIds
  }, [])

  return (
    <div className="model-selector">
      {showCacheManager ? (
        <>
          <div className="model-selector-header">
            <h2 className="model-selector-title">Model Cache</h2>
            <p className="model-selector-desc">
              Manage downloaded models cached in your browser. Deleting a cache means you'll need to re-download the model.
            </p>
          </div>
          <CacheManager
            downloadedModelIds={downloadedModelIds}
            onCacheChanged={handleCacheChanged}
          />
        </>
      ) : (
        <>
          <div className="model-selector-header">
            <h2 className="model-selector-title">Select a Model</h2>
            <p className="model-selector-desc">
              All models run directly in your browser using WebGPU. No server needed.
            </p>
            {onOpenCache && (
              <button
                className="model-cache-link"
                onClick={onOpenCache}
                title="Manage model cache"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                Cache
              </button>
            )}
            <div className="model-sort-group">
              <button
                className={`model-sort-btn ${sortMode === 'popular' ? 'model-sort-active' : ''}`}
                onClick={() => setSortMode('popular')}
              >
                Popular
              </button>
              <button
                className={`model-sort-btn ${sortMode === 'latest' ? 'model-sort-active' : ''}`}
                onClick={() => setSortMode('latest')}
              >
                Latest
              </button>
              <button
                className={`model-sort-btn ${sortMode === 'size' ? 'model-sort-active' : ''}`}
                onClick={() => setSortMode('size')}
              >
                Size
              </button>
            </div>
          </div>

          {/* Recent models section */}
          {recentModels.length > 0 && (
            <div className="model-recent-section">
              <div className="model-recent-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="model-recent-title">Recently used</span>
                {onResetRecentModels && (
                  <button
                    className="model-recent-reset"
                    onClick={onResetRecentModels}
                    title="Reset recent models"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="model-recent-list">
                {recentModels.map((id) => {
                  const model = MODELS.find((m) => m.id === id)
                  if (!model) return null
                  return (
                    <button
                      key={model.id}
                      className={`model-recent-item ${currentModelId === model.id ? 'active' : ''}`}
                      onClick={() => onSelect(model)}
                    >
                      <span className="model-recent-name">{model.name}</span>
                      <span className="model-recent-size">{model.size}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recommended for you section */}
          {topModelIds.length > 0 && (
            <div className="model-recommendation">
              <div className="model-recommendation-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="model-recommendation-title">Recommended for you</span>
                {onResetRecommendations && (
                  <button
                    className="model-recommendation-reset"
                    onClick={onResetRecommendations}
                    title="Reset recommendations"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="model-recommendation-list">
                {topModelIds.map((id) => {
                  const model = MODELS.find((m) => m.id === id)
                  if (!model) return null
                  return (
                    <button
                      key={model.id}
                      className={`model-recommendation-item ${currentModelId === model.id ? 'active' : ''}`}
                      onClick={() => onSelect(model)}
                    >
                      <span className="model-recommendation-name">{model.name}</span>
                      <span className="model-recommendation-size">{model.size}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="model-grid">
            {sortedModels.map((model) => {
              const isActive = currentModelId === model.id
              const isLoading =
                isActive && modelState.status === 'downloading'

              return (
                <BorderBeam
                  key={model.id}
                  size="md"
                  theme="auto"
                  colorVariant={isActive ? 'ocean' : 'colorful'}
                  strength={isActive ? 0.8 : 0.4}
                  active={isActive || hoveredModelId === model.id}
                  duration={2.4}
                >
                  <button
                    className={`model-card ${isActive ? 'model-card-active' : ''}`}
                    onClick={() => onSelect(model)}
                    disabled={isLoading}
                    onMouseEnter={() => setHoveredModelId(model.id)}
                    onMouseLeave={() => setHoveredModelId(null)}
                  >
                    <div className="model-card-header">
                      <span className="model-card-name">{model.name}</span>
                      <div className="model-card-badges">
                        {model.recommended && (
                          <span className="model-badge model-badge-recommended">Recommended</span>
                        )}
                        {downloadedModelIds.has(model.id) && (
                          <span className="model-badge model-badge-downloaded">✓ Downloaded</span>
                        )}
                        {model.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="model-badge model-badge-tag"
                            style={{ backgroundColor: tagColors[tag] + '20', color: tagColors[tag] }}
                          >
                            {tagLabels[tag]} {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="model-card-desc">{model.description}</p>
                    <div className="model-card-meta">
                      <span>{model.parameters} params</span>
                      <span>{model.size}</span>
                      <span>{model.provider}</span>
                    </div>
                    {isLoading && (
                      <div className="model-progress">
                        <div
                          className="model-progress-bar"
                          style={{ width: `${modelState.progress}%` }}
                        />
                        <span className="model-progress-text">
                          {modelState.progress}%
                        </span>
                      </div>
                    )}
                    {isActive && modelState.status === 'ready' && (
                      <div className="model-ready">● Ready</div>
                    )}
                    {isActive && modelState.status === 'error' && (
                      <div className="model-error">
                        {modelState.error}
                        {downloadResume.hasPartialDownload && onRetryModel && (
                          <DownloadResumeIndicator
                            key={currentModelId}
                            modelId={currentModelId}
                            progress={downloadResume.progress}
                            onResume={downloadResume.onResume}
                          />
                        )}
                      </div>
                    )}
                  </button>
                </BorderBeam>
              )
            })}
          </div>

          {/* Quick Nav */}
          <div className="model-selector-quick-nav">
            {onOpenBenchmark && (
              <button
                className="model-selector-nav-btn"
                onClick={onOpenBenchmark}
                title="Model Benchmark"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </button>
            )}
            {onOpenCustomModels && (
              <button
                className="model-selector-nav-btn"
                onClick={onOpenCustomModels}
                title="Custom Model Import"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </button>
            )}
            {onOpenPersonaMarketplace && (
              <button
                className="model-selector-nav-btn"
                onClick={onOpenPersonaMarketplace}
                title="Persona Marketplace"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
