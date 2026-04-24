import { useState, useCallback } from 'react'
import { loadModel } from '../lib/engine'
import type { InitProgressReport } from '@mlc-ai/web-llm'

interface CustomModelResult {
  status: 'idle' | 'loading' | 'ready' | 'error'
  progress: number
  error: string | null
  modelId: string
}

export function CustomModelImport({ onLoad }: { onLoad?: (modelId: string) => void }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<CustomModelResult>({
    status: 'idle',
    progress: 0,
    error: null,
    modelId: '',
  })

  const handleLoad = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setResult({ status: 'loading', progress: 0, error: null, modelId: trimmed })

    try {
      await loadModel(trimmed, (report: InitProgressReport) => {
        if (report.text) {
          setResult((prev) => ({
            ...prev,
            progress: Math.round(report.progress * 100),
          }))
        }
      })

      setResult({ status: 'ready', progress: 100, error: null, modelId: trimmed })
      onLoad?.(trimmed)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load model'
      setResult({ status: 'error', progress: 0, error: errMsg, modelId: trimmed })
    }
  }, [input, onLoad])

  const handleReset = useCallback(() => {
    setInput('')
    setResult({ status: 'idle', progress: 0, error: null, modelId: '' })
  }, [])

  return (
    <div className="custom-model-import">
      <h2 className="custom-model-title">Custom Model Import</h2>
      <p className="custom-model-desc">
        Load a custom MLC-compiled model from a HuggingFace model ID or URL.
        <br />
        Example: <code>onnx-community/Qwen2.5-0.5B-Instruct</code>
      </p>

      <div className="custom-model-input-group">
        <input
          type="text"
          className="custom-model-input"
          placeholder="e.g. onnx-community/Qwen2.5-0.5B-Instruct"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={result.status === 'loading'}
        />
        <button
          className="custom-model-load-btn"
          onClick={handleLoad}
          disabled={result.status === 'loading' || !input.trim()}
        >
          {result.status === 'loading' ? 'Loading...' : 'Load Model'}
        </button>
      </div>

      {/* Progress */}
      {result.status === 'loading' && (
        <div className="custom-model-progress">
          <div className="custom-model-progress-bar">
            <div
              className="custom-model-progress-fill"
              style={{ width: `${result.progress}%` }}
            />
          </div>
          <span className="custom-model-progress-text">{result.progress}%</span>
        </div>
      )}

      {/* Result */}
      {result.status === 'ready' && (
        <div className="custom-model-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Model loaded successfully! You can now use it in chat.
          <button className="custom-model-use-btn" onClick={() => onLoad?.(result.modelId)}>
            Use Model
          </button>
        </div>
      )}

      {result.status === 'error' && (
        <div className="custom-model-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{result.error}</span>
          <button className="custom-model-reset-btn" onClick={handleReset}>
            Try Again
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="custom-model-tips">
        <h4 className="custom-model-tips-title">Tips</h4>
        <ul className="custom-model-tips-list">
          <li>Model must be MLC-compiled (look for <code>-MLC</code> suffix in the model ID)</li>
          <li>Models are downloaded from HuggingFace and cached in your browser</li>
          <li>Larger models require more VRAM — check your device specs first</li>
          <li>Use <code>onnx-community/</code> prefix for WebGPU-compatible models</li>
        </ul>
      </div>
    </div>
  )
}
