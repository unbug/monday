import { useState, useCallback } from 'react'
import { MODELS } from '../lib/models'
import { useModelComparison } from '../hooks/useModelComparison'
import type { ModelInfo } from '../types'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'

interface Props {
  onBack: () => void
}

export function ModelComparison({ onBack }: Props) {
  const comparison = useModelComparison()
  const [prompt, setPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const handleSelectA = useCallback(
    (model: ModelInfo) => comparison.loadModelA(model),
    [comparison],
  )
  const handleSelectB = useCallback(
    (model: ModelInfo) => comparison.loadModelB(model),
    [comparison],
  )

  const handleStart = useCallback(() => {
    if (prompt.trim()) {
      comparison.startComparison(prompt.trim())
      setShowPrompt(false)
    }
  }, [prompt, comparison])

  const handleStop = useCallback(() => {
    comparison.stopComparison()
  }, [comparison])

  const handleReset = useCallback(() => {
    comparison.reset()
    setPrompt('')
    setShowPrompt(false)
  }, [comparison])

  const isReady = !!comparison.modelA && !!comparison.modelB

  return (
    <div className="model-comparison">
      <div className="model-comparison-header">
        <button className="model-comparison-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="model-comparison-title">Model Comparison</h2>
        <p className="model-comparison-desc">
          Select two models and compare their responses side by side
        </p>
      </div>

      {/* Selection Phase */}
      {comparison.currentStep === 'select' && (
        <div className="model-comparison-select">
          <div className="comparison-select-grid">
            {/* Model A */}
            <div className="comparison-select-card">
              <div className="comparison-select-label">
                <span className="comparison-select-badge">Model A</span>
              </div>
              <div className="comparison-model-list">
                {MODELS.slice(0, 10).map((model) => (
                  <button
                    key={model.id}
                    className={`comparison-model-option ${comparison.modelA?.id === model.id ? 'active' : ''}`}
                    onClick={() => handleSelectA(model)}
                    disabled={comparison.modelB?.id === model.id}
                  >
                    <span className="comparison-model-name">{model.name}</span>
                    <span className="comparison-model-meta">
                      {model.parameters} · {model.size}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* VS separator */}
            <div className="comparison-vs">
              <span className="comparison-vs-text">VS</span>
            </div>

            {/* Model B */}
            <div className="comparison-select-card">
              <div className="comparison-select-label">
                <span className="comparison-select-badge comparison-select-badge-b">Model B</span>
              </div>
              <div className="comparison-model-list">
                {MODELS.slice(0, 10).map((model) => (
                  <button
                    key={model.id}
                    className={`comparison-model-option ${comparison.modelB?.id === model.id ? 'active' : ''}`}
                    onClick={() => handleSelectB(model)}
                    disabled={comparison.modelA?.id === model.id}
                  >
                    <span className="comparison-model-name">{model.name}</span>
                    <span className="comparison-model-meta">
                      {model.parameters} · {model.size}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt input */}
          {isReady && (
            <div className="comparison-prompt-section">
              <h3 className="comparison-prompt-title">Test Prompt</h3>
              <textarea
                className="comparison-prompt-input"
                placeholder="Enter a prompt to test both models..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <div className="comparison-start-group">
                <button
                  className="comparison-start-btn"
                  onClick={handleStart}
                  disabled={!prompt.trim()}
                >
                  Start Comparison
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {comparison.error && (
            <div className="comparison-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {comparison.error}
              <button className="comparison-error-close" onClick={() => comparison.setError(null)}>
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Running / Done Phase */}
      {(comparison.currentStep === 'running' || comparison.currentStep === 'done') && (
        <div className="comparison-results">
          {comparison.isComparing && (
            <button className="comparison-stop-btn" onClick={handleStop}>
              Stop
            </button>
          )}

          <div className="comparison-results-grid">
            {comparison.results.map((result) => (
              <div key={result.modelId} className="comparison-result-panel">
                <div className="comparison-result-header">
                  <span className="comparison-result-model">{result.modelName}</span>
                  <div className="comparison-result-stats">
                    <span className="comparison-stat">
                      {result.tokensPerSecond} t/s
                    </span>
                    <span className="comparison-stat">
                      {result.totalTokens} tokens
                    </span>
                    <span className="comparison-stat">
                      {Math.round(result.elapsedMs / 1000)}s
                    </span>
                  </div>
                </div>
                <div className="comparison-result-content">
                  {result.isStreaming ? (
                    <div className="comparison-streaming-text">
                      {result.content || <span className="comparison-typing">Generating...</span>}
                      {result.isStreaming && <span className="comparison-cursor">▊</span>}
                    </div>
                  ) : result.error ? (
                    <div className="comparison-error-text">{result.error}</div>
                  ) : (
                    <div className="comparison-rendered-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeKatex]}
                      >
                        {result.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {comparison.currentStep === 'done' && (
            <div className="comparison-footer">
              <button className="comparison-reset-btn" onClick={handleReset}>
                Compare Another Pair
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
