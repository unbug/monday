import { BorderBeam } from 'border-beam'
import { useState, useMemo } from 'react'
import type { ModelInfo, ModelState } from '../types'
import { MODELS } from '../lib/models'

type SortMode = 'latest' | 'size'

interface Props {
  currentModelId: string | null
  modelState: ModelState
  onSelect: (model: ModelInfo) => void
}

export function ModelSelector({ currentModelId, modelState, onSelect }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('latest')
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null)

  const sortedModels = useMemo(() => {
    const list = [...MODELS]
    if (sortMode === 'size') {
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

  return (
    <div className="model-selector">
      <div className="model-selector-header">
        <h2 className="model-selector-title">Select a Model</h2>
        <p className="model-selector-desc">
          All models run directly in your browser using WebGPU. No server needed.
        </p>
        <div className="model-sort-group">
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
                  <div className="model-error">{modelState.error}</div>
                )}
              </button>
            </BorderBeam>
          )
        })}
      </div>
    </div>
  )
}
