import { useState, useMemo } from 'react'
import { MODELS } from '../lib/models'
import { useModelBenchmark } from '../hooks/useModelBenchmark'
import type { ModelInfo } from '../types'

export function ModelBenchmark({ onBack }: { onBack?: () => void }) {
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null)
  const { state, runBenchmark, stop, reset, BENCHMARK_PROMPT } = useModelBenchmark()

  const handleRun = () => {
    if (!selectedModel) return
    runBenchmark(selectedModel)
  }

  const handleReset = () => {
    reset()
    setSelectedModel(null)
  }

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  const formatLatency = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
  }

  return (
    <div className="model-benchmark">
      <div className="model-benchmark-header">
        <h2 className="model-benchmark-title">Model Benchmark</h2>
        <p className="model-benchmark-desc">
          Run a standardized test prompt to measure model performance. Results are not scientifically rigorous — just a quick sanity check.
        </p>

      </div>

      {/* Prompt display */}
      <div className="benchmark-prompt">
        <div className="benchmark-prompt-label">Test Prompt</div>
        <div className="benchmark-prompt-text">{BENCHMARK_PROMPT}</div>
      </div>

      {/* Model selector */}
      <div className="benchmark-model-select">
        <label className="benchmark-label">Select Model</label>
        <select
          className="benchmark-select"
          value={selectedModel?.id ?? ''}
          onChange={(e) => {
            const model = MODELS.find((m) => m.id === e.target.value)
            if (model) setSelectedModel(model)
          }}
          disabled={state.isRunning}
        >
          <option value="">Choose a model...</option>
          {MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.size})
            </option>
          ))}
        </select>
      </div>

      {/* Run button */}
      <div className="benchmark-actions">
        {!state.isRunning ? (
          <button
            className="benchmark-run-btn"
            onClick={handleRun}
            disabled={!selectedModel}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Benchmark
          </button>
        ) : (
          <button className="benchmark-stop-btn" onClick={stop}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop
          </button>
        )}
        {state.currentStep === 'done' && (
          <button className="benchmark-reset-btn" onClick={handleReset}>
            Run Again
          </button>
        )}
      </div>

      {/* Progress */}
      {state.isRunning && (
        <div className="benchmark-progress">
          <div className="benchmark-progress-bar">
            <div
              className="benchmark-progress-fill"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <span className="benchmark-progress-text">
            {state.currentStep === 'loading'
              ? `Loading model... ${state.progress}%`
              : 'Generating response...'}
          </span>
        </div>
      )}

      {/* Results */}
      {state.result && (
        <div className="benchmark-results">
          <h3 className="benchmark-results-title">Results</h3>

          {state.result.error ? (
            <div className="benchmark-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {state.result.error}
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="benchmark-stats-grid">
                <div className="benchmark-stat-card">
                  <div className="benchmark-stat-icon">⚡</div>
                  <div className="benchmark-stat-value">
                    {state.result.tokensPerSecond}
                  </div>
                  <div className="benchmark-stat-label">tokens/sec</div>
                </div>
                <div className="benchmark-stat-card">
                  <div className="benchmark-stat-icon">📊</div>
                  <div className="benchmark-stat-value">
                    {formatTokens(state.result.totalTokens)}
                  </div>
                  <div className="benchmark-stat-label">Total Tokens</div>
                </div>
                <div className="benchmark-stat-card">
                  <div className="benchmark-stat-icon">⏱️</div>
                  <div className="benchmark-stat-value">
                    {formatLatency(state.result.latencyMs)}
                  </div>
                  <div className="benchmark-stat-label">Latency</div>
                </div>
              </div>

              {/* Generated content */}
              <div className="benchmark-content">
                <div className="benchmark-content-header">
                  <span>Generated Response</span>
                  <button
                    className="benchmark-collapse-btn"
                    onClick={() => {
                      const el = document.getElementById('benchmark-content-body')
                      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
                    }}
                  >
                    Collapse
                  </button>
                </div>
                <div id="benchmark-content-body" className="benchmark-content-body">
                  <p className="benchmark-content-text">{state.result.content}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
