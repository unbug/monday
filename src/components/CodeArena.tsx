import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { MODELS } from '../lib/models'
import { useModelComparison } from '../hooks/useModelComparison'
import type { ModelInfo } from '../types'
import { VerdictPanel } from '../components/VerdictPanel'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { t } from '../lib/i18n'
import { extractHTMLCode } from '../lib/htmlExtract'
import { CHALLENGE_PRESETS, getChallengePreset } from '../data/challengePresets'

function codeHash(code: string | null): string {
  if (!code) return 'empty'
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    const chr = code.charCodeAt(i)
    hash = ((hash << 5) - hash + chr) | 0
  }
  return hash.toString(36)
}

type PaneView = 'code' | 'preview'

interface Props {
  onBack: () => void
}

type ViewMode = 'select' | 'compare'

export function CodeArena({ onBack }: Props) {
  const comparison = useModelComparison()
  const [prompt, setPrompt] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null)
  const [paneViewModes, setPaneViewModes] = useState<Record<number, PaneView>>({})
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
    setActiveChallenge(null)
    setPaneViewModes({})
  }, [comparison])

  const handleLoadChallenge = useCallback(
    (presetId: string) => {
      const preset = getChallengePreset(presetId)
      if (preset) {
        setPrompt(preset.prompt)
        setActiveChallenge(presetId)
      }
    },
    [],
  )

  const handleClearChallenge = useCallback(() => {
    setActiveChallenge(null)
  }, [])

  const setPaneView = useCallback((idx: number, mode: PaneView) => {
    setPaneViewModes((prev) => ({ ...prev, [idx]: mode }))
  }, [])

  const copyCode = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
  }, [])

  const isReady = !!comparison.modelA && !!comparison.modelB

  // Scroll sync toggle handler
  const toggleScrollSync = useCallback(() => {
    comparison.setScrollSyncEnabled((prev) => !prev)
  }, [comparison])

  const scrollSyncActive = comparison.scrollSyncEnabled

  // Recording handlers
  const [fps, setFps] = useState(30)
  const handleStartRecording = useCallback(() => {
    comparison.startRecording(fps)
  }, [comparison, fps])
  const handleStopRecording = useCallback(() => {
    comparison.stopRecording()
  }, [comparison])
  const handleDownload = useCallback(() => {
    comparison.downloadRecording()
  }, [comparison])
  const handleResetRecording = useCallback(() => {
    comparison.resetRecording()
  }, [comparison])
  const rec = comparison.recording

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
        <h2 className="code-arena-title">
          <span className="arena-icon">⚔️</span> Code Arena
        </h2>
        <div className="code-arena-header-actions">
          <button
            className={`arena-scroll-sync-btn ${scrollSyncActive ? 'active' : ''}`}
            onClick={toggleScrollSync}
            title={scrollSyncActive ? t('arena.scrollSyncOff') : t('arena.scrollSyncOn')}
          >
            {scrollSyncActive ? '⛓' : '⛓‍💥'}
          </button>
        </div>
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

          {/* Challenge presets */}
          <div className="arena-challenges">
            <div className="arena-challenges-header">
              <span className="arena-challenges-title">{t('arena.challengesTitle')}</span>
              <span className="arena-challenges-subtitle">{t('arena.challengesSubtitle')}</span>
            </div>
            <div className="arena-challenges-grid">
              {CHALLENGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`arena-challenge-card ${activeChallenge === preset.id ? 'active' : ''}`}
                  onClick={() => handleLoadChallenge(preset.id)}
                  title={preset.description}
                >
                  <span className="arena-challenge-icon">{preset.icon}</span>
                  <span className="arena-challenge-name">{preset.name}</span>
                  <span className={`arena-challenge-difficulty difficulty-${preset.difficulty}`}>{preset.difficulty}</span>
                </button>
              ))}
            </div>
            {activeChallenge && (
              <button
                className="arena-challenge-clear"
                onClick={handleClearChallenge}
              >
                {t('arena.challengeClear')}
              </button>
            )}
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
                    {/* Refresh button — visible when code is available */}
                    {result.extractedCode && (
                      <button
                        className="arena-iframe-refresh"
                        title="Refresh iframe preview"
                        onClick={() => {
                          const iframe = comparison.iframeRef.current[idx]
                          if (iframe && result.extractedCode) {
                            const doc = iframe.contentDocument
                            if (doc) {
                              doc.open()
                              doc.write(result.extractedCode)
                              doc.close()
                            }
                          }
                        }}
                      >
                        ↻
                      </button>
                    )}
                  </div>
                  <div className="arena-terminal-status">
                    {statusBadge(result.status)}
                  </div>
                </div>

                {/* Terminal body */}
                <div
                  className="arena-terminal-body"
                  ref={(el) => {
                    comparison.scrollContainerRefs.current[idx] = el
                  }}
                  onScroll={() => {
                    if (paneViewModes[idx] === 'code') {
                      comparison.handleScrollSync(idx)
                    }
                  }}
                  style={{ overflowY: 'auto', flex: 1 }}
                >
                  {result.status === 'pending' ? (
                    <div className="arena-pending-msg">{t('arena.waiting')}</div>
                  ) : result.error && result.status === 'error' ? (
                    <div className="arena-error-content">
                      <span className="arena-error-content-icon">✕</span>
                      {result.error}
                    </div>
                  ) : (
                    <>
                      {/* Per-pane Code / Preview tabs */}
                      <div className="arena-pane-tabs">
                        <button
                          className={`arena-pane-tab ${(paneViewModes[idx] || 'code') === 'code' ? 'active' : ''}`}
                          onClick={() => setPaneView(idx, 'code')}
                        >
                          {t('arena.code')}
                        </button>
                        <button
                          className={`arena-pane-tab ${(paneViewModes[idx] || 'code') === 'preview' ? 'active' : ''}`}
                          onClick={() => setPaneView(idx, 'preview')}
                        >
                          {t('arena.preview')}
                        </button>
                        <button
                          className="arena-pane-copy-btn"
                          title="Copy code"
                          onClick={() => copyCode(result.content)}
                        >
                          {t('arena.copy')}
                        </button>
                      </div>
                      {/* Code view */}
                      {(paneViewModes[idx] || 'code') === 'code' && (
                        <>
                          {result.status === 'streaming' ? (
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
                        </>
                      )}
                      {/* Preview view */}
                      {(paneViewModes[idx] || 'code') === 'preview' && result.extractedCode && (
                        <div className="arena-iframe-container">
                          <iframe
                            key={'code-' + codeHash(result.extractedCode)}
                            srcDoc={result.extractedCode}
                            sandbox="allow-scripts"
                            className="arena-iframe"
                            ref={(el) => {
                              if (el) comparison.iframeRef.current[idx] = el
                            }}
                          />
                        </div>
                      )}
                      {(paneViewModes[idx] || 'code') === 'preview' && !result.extractedCode && (
                        <div className="arena-no-preview-msg">{t('arena.noPreview')}</div>
                      )}
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

              {/* PNG share card */}
              <button className="arena-share-card-btn" onClick={() => comparison.exportShareCard()}>
                <span className="arena-share-card-icon">🖼</span>
                {t('arena.shareCard')}
              </button>

              {/* Verdict & Leaderboard */}
              {comparison.modelA && comparison.modelB && (
                <VerdictPanel
                  modelAId={comparison.modelA.id}
                  modelAName={comparison.modelA.name}
                  modelBId={comparison.modelB.id}
                  modelBName={comparison.modelB.name}
                />
              )}

              {/* Recording controls */}
              <div className="arena-recording-controls">
                <span className="arena-recording-label">{t('arena.fpsLabel')}</span>
                <select
                  className="arena-fps-selector"
                  value={rec.status === 'recording' ? rec.fps : fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  disabled={rec.status === 'recording'}
                >
                  <option value={15}>15 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>

                {rec.status === 'idle' && (
                  <button className="arena-recording-btn" onClick={handleStartRecording}>
                    <span className="arena-rec-dot" />
                    {t('arena.record')}
                  </button>
                )}

                {rec.status === 'recording' && (
                  <button className="arena-recording-btn recording" onClick={handleStopRecording}>
                    <span className="arena-rec-dot-pulse" />
                    {t('arena.recording')} {rec.duration}s
                  </button>
                )}

                {rec.status === 'done' && (
                  <>
                    <span className="arena-recording-duration">
                      {t('arena.recordingDuration')}: {rec.duration}s
                    </span>
                    <button className="arena-recording-btn download" onClick={handleDownload}>
                      <span className="arena-download-icon">⬇</span>
                      {t('arena.download')}
                    </button>
                    <button className="arena-recording-btn reset" onClick={handleResetRecording}>
                      ↺
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
