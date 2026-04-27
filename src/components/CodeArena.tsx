import { useState, useCallback, useEffect, useRef } from 'react'
import { MODELS } from '../lib/models'
import { useModelComparison } from '../hooks/useModelComparison'
import type { ModelInfo } from '../types'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { t } from '../lib/i18n'

interface Props {
  onBack: () => void
}

type ViewMode = 'select' | 'compare'

export function CodeArena({ onBack }: Props) {
  const comparison = useModelComparison()
  const [prompt, setPrompt] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [durationA, setDurationA] = useState(0)
  const [durationB, setDurationB] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live duration timer during streaming
  useEffect(() => {
    if (comparison.currentStep === 'running') {
      const baseTimeA = comparison.results[0]?.status === 'streaming' ? Date.now() - (comparison.results[0]?.elapsedMs || 0) : Date.now()
      const baseTimeB = comparison.results[1]?.status === 'streaming' ? Date.now() - (comparison.results[1]?.elapsedMs || 0) : Date.now()

      timerRef.current = setInterval(() => {
        if (comparison.results[0]?.status === 'streaming') {
          setDurationA(Math.round((Date.now() - baseTimeA) / 1000))
        }
        if (comparison.results[1]?.status === 'streaming') {
          setDurationB(Math.round((Date.now() - baseTimeB) / 1000))
        }
      }, 200)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [comparison.currentStep, comparison.results])

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
      setViewMode('compare')
    }
  }, [prompt, comparison])

  const handleStop = useCallback(() => {
    comparison.stopComparison()
  }, [comparison])

  const handleReset = useCallback(() => {
    comparison.reset()
    setPrompt('')
    setViewMode('select')
  }, [comparison])

  const isReady = !!comparison.modelA && !!comparison.modelB

  // Status badge helper
  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#6b7280',
      streaming: '#8b5cf6',
      done: '#22c55e',
      error: '#ef4444',
    }
    const labels: Record<string, string> = {
      pending: t('arena.pending'),
      streaming: t('arena.streaming'),
      done: t('arena.done'),
      error: t('arena.error'),
    }
    return (
      <span
        className="arena-status-badge"
        style={{ '--arena-badge-color': colors[status] || '#6b7280' } as React.CSSProperties}
      >
        {status === 'streaming' && <span className="arena-status-dot" />}
        {labels[status] || status}
      </span>
    )
  }

  // Provider badge helper
  const providerBadge = (provider: string) => {
    const isWebGPU = provider === 'WebGPU'
    return (
      <span className={`arena-provider-badge ${isWebGPU ? 'webgpu' : 'wasm'}`}>
        {isWebGPU ? '⚡' : '⚙️'} {isWebGPU ? t('arena.webgpu') : t('arena.wasm')}
      </span>
    )
  }

  return (
    <div className="code-arena">
      <div className="code-arena-header">
        <button className="arena-back-btn" onClick={onBack} title="Back">
          ← Back
        </button>
        <h2 className="code-arena-title">
          <span className="arena-icon">⚔️</span> Code Arena
        </h2>
        <p className="code-arena-desc">
          Side-by-side model comparison with live streaming
        </p>
      </div>

      {/* Selection Phase */}
      {viewMode === 'select' && (
        <div className="arena-select">
          <div className="arena-select-grid">
            {/* Model A */}
            <div className="arena-select-card">
              <div className="arena-select-header">
                <span className="arena-select-label">{t('arena.teamA')}</span>
                {comparison.modelA && (
                  <span className="arena-selected-model">
                    {comparison.modelA.name}
                  </span>
                )}
              </div>
              <div className="arena-model-list">
                {MODELS.slice(0, 12).map((model) => (
                  <button
                    key={model.id}
                    className={`arena-model-option ${comparison.modelA?.id === model.id ? 'active' : ''}`}
                    onClick={() => handleSelectA(model)}
                    disabled={comparison.modelB?.id === model.id}
                  >
                    <span className="arena-model-name">{model.name}</span>
                    <span className="arena-model-meta">
                      {model.parameters} · {model.size}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* VS separator */}
            <div className="arena-vs">
              <span className="arena-vs-text">⚔️</span>
            </div>

            {/* Model B */}
            <div className="arena-select-card">
              <div className="arena-select-header">
                <span className="arena-select-label">{t('arena.teamB')}</span>
                {comparison.modelB && (
                  <span className="arena-selected-model">
                    {comparison.modelB.name}
                  </span>
                )}
              </div>
              <div className="arena-model-list">
                {MODELS.slice(0, 12).map((model) => (
                  <button
                    key={model.id}
                    className={`arena-model-option ${comparison.modelB?.id === model.id ? 'active' : ''}`}
                    onClick={() => handleSelectB(model)}
                    disabled={comparison.modelA?.id === model.id}
                  >
                    <span className="arena-model-name">{model.name}</span>
                    <span className="arena-model-meta">
                      {model.parameters} · {model.size}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt input */}
          {isReady && (
            <div className="arena-prompt-section">
              <textarea
                className="arena-prompt-input"
                placeholder="Enter a prompt to test both models..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <button
                className="arena-start-btn"
                onClick={handleStart}
                disabled={!prompt.trim()}
              >
                {t('arena.start')}
              </button>
            </div>
          )}

          {/* Error display */}
          {comparison.error && (
            <div className="arena-error">
              <span className="arena-error-icon">✕</span>
              {comparison.error}
              <button
                className="arena-error-close"
                onClick={() => comparison.setError(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Running / Done Phase — Terminal-style dual panes */}
      {viewMode === 'compare' && (
        <div className="arena-results">
          {comparison.isComparing && (
            <button className="arena-stop-btn" onClick={handleStop}>
              ⏹ Stop
            </button>
          )}

          <div className="arena-results-grid">
            {/* Terminal-style card for each model */}
            {comparison.results.map((result, idx) => (
              <div key={result.modelId} className="arena-terminal-card">
                {/* Terminal title bar */}
                <div className="arena-terminal-header">
                  <div className="arena-terminal-dots">
                    <span className="arena-dot arena-dot-red" />
                    <span className="arena-dot arena-dot-yellow" />
                    <span className="arena-dot arena-dot-green" />
                  </div>
                  <div className="arena-terminal-title">
                    <span className="arena-terminal-model">{result.modelName}</span>
                    <span className="arena-terminal-divider">·</span>
                    {providerBadge(result.provider)}
                  </div>
                  <div className="arena-terminal-status">
                    {statusBadge(result.status)}
                  </div>
                </div>

                {/* Terminal body */}
                <div className="arena-terminal-body">
                  {result.status === 'pending' ? (
                    <div className="arena-pending-msg">{t('arena.waiting')}</div>
                  ) : result.error && result.status === 'error' ? (
                    <div className="arena-error-content">
                      <span className="arena-error-content-icon">✕</span>
                      {result.error}
                    </div>
                  ) : result.status === 'streaming' ? (
                    <>
                      <div className="arena-streaming-content">
                        {result.content || (
                          <span className="arena-typing">
                            {t('arena.generating')}<span className="arena-typing-dots">...</span>
                          </span>
                        )}
                        {result.status === 'streaming' && (
                          <span className="arena-cursor">▊</span>
                        )}
                      </div>
                      {/* Duration timer */}
                      <div className="arena-duration">
                        <span className="arena-duration-icon">⏱</span>
                        {idx === 0 ? durationA : durationB}s
                      </div>
                      {/* Stats bar */}
                      <div className="arena-stats-bar">
                        <span className="arena-stat-item">
                          {result.tokensPerSecond} t/s
                        </span>
                        <span className="arena-stat-item">
                          {result.totalTokens} tokens
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="arena-rendered-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight, rehypeKatex]}
                        >
                          {result.content}
                        </ReactMarkdown>
                      </div>
                      {/* Final stats */}
                      <div className="arena-final-stats">
                        <div className="arena-final-stat">
                          <span className="arena-final-stat-label">{t('arena.duration')}</span>
                          <span className="arena-final-stat-value">
                            {Math.round(result.elapsedMs / 1000)}s
                          </span>
                        </div>
                        <div className="arena-final-stat">
                          <span className="arena-final-stat-label">{t('arena.tokens')}</span>
                          <span className="arena-final-stat-value">
                            {result.totalTokens}
                          </span>
                        </div>
                        <div className="arena-final-stat">
                          <span className="arena-final-stat-label">{t('arena.speed')}</span>
                          <span className="arena-final-stat-value">
                            {result.tokensPerSecond} t/s
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {comparison.currentStep === 'done' && (
            <div className="arena-footer">
              <button className="arena-reset-btn" onClick={handleReset}>
                {t('arena.reset')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
