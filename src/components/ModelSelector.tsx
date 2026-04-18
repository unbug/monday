import { BorderBeam } from 'border-beam'
import type { ModelInfo, ModelState } from '../types'
import { MODELS } from '../lib/models'

interface Props {
  currentModelId: string | null
  modelState: ModelState
  onSelect: (model: ModelInfo) => void
}

export function ModelSelector({ currentModelId, modelState, onSelect }: Props) {
  return (
    <div className="model-selector">
      <h2 className="model-selector-title">Select a Model</h2>
      <p className="model-selector-desc">
        All models run directly in your browser using WebGPU. No server needed.
      </p>
      <div className="model-grid">
        {MODELS.map((model) => {
          const isActive = currentModelId === model.id
          const isLoading =
            isActive && modelState.status === 'downloading'

          return (
            <BorderBeam
              key={model.id}
              size="md"
              colorVariant={isActive ? 'ocean' : 'mono'}
              strength={isActive ? 0.8 : 0.3}
              active={isActive || false}
              duration={2.4}
            >
              <button
                className={`model-card ${isActive ? 'model-card-active' : ''}`}
                onClick={() => onSelect(model)}
                disabled={isLoading}
              >
                <div className="model-card-header">
                  <span className="model-card-name">{model.name}</span>
                  {model.recommended && (
                    <span className="model-badge">Recommended</span>
                  )}
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
