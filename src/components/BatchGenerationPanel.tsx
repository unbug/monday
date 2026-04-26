/**
 * BatchGenerationPanel — displays N parallel responses side by side.
 * Each response can be picked (appended to session) or discarded.
 */
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { useBatchGeneration, type BatchResponse } from '../hooks/useBatchGeneration'
import type { ModelInfo } from '../types'

interface Props {
  prompt: string
  modelId: string
  modelInfo: ModelInfo | null
  generationParams: { temperature: number; top_p: number; maxTokens: number }
  systemPrompt: string
  onPickResponse: (content: string, modelId: string) => void
  onDiscardAll: () => void
  onBack: () => void
  tokenStats: {
    totalTokens: number
    sessionTokens: number
    tokensPerSecond: number
    elapsedSeconds: number
  } | null
  isStreaming?: boolean
  knowledgeBaseName?: string | null
  knowledgeContextCount?: number
}

export function BatchGenerationPanel({
  prompt,
  modelId,
  modelInfo,
  generationParams,
  systemPrompt,
  onPickResponse,
  onDiscardAll,
  onBack,
  tokenStats,
  isStreaming,
  knowledgeBaseName,
  knowledgeContextCount,
}: Props) {
  const [count, setCount] = useState(2)
  const { state, startBatch, stopBatch, updateCount } = useBatchGeneration()

  const handleStart = () => {
    startBatch(count, {
      temperature: generationParams.temperature,
      top_p: generationParams.top_p,
      maxTokens: generationParams.maxTokens,
      systemPrompt,
      modelId,
    }, [
      { role: 'user', content: prompt },
    ])
  }

  const handlePick = (response: BatchResponse) => {
    onPickResponse(response.content, response.modelId)
  }

  const isAnyDone = state.responses.some((r) => r.status === 'done')
  const isAnyError = state.responses.some((r) => r.status === 'error')

  return (
    <div className="batch-generation-panel">
      {/* Header */}
      <div className="batch-header">
        <div className="batch-header-left">
          <button className="batch-back-btn" onClick={onBack} title="Back to chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="batch-title">Batch Generation</h3>
        </div>
        <div className="batch-header-right">
          {/* Count selector */}
          <div className="batch-count-selector">
            <span className="batch-count-label">Responses:</span>
            <div className="batch-count-buttons">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`batch-count-btn ${count === n ? 'active' : ''}`}
                  onClick={() => updateCount(n)}
                  disabled={state.isRunning}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {/* Start / Stop */}
          {!state.isRunning ? (
            <button
              className="batch-start-btn"
              onClick={handleStart}
              disabled={!prompt}
            >
              {isAnyDone ? 'Generate Again' : 'Generate'}
            </button>
          ) : (
            <button className="batch-stop-btn" onClick={stopBatch}>
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Prompt display */}
      <div className="batch-prompt">
        <span className="batch-prompt-label">Prompt:</span>
        <span className="batch-prompt-text">{prompt}</span>
      </div>

      {/* Model info */}
      {modelInfo && (
        <div className="batch-model-info">
          <span className="batch-model-badge">{modelInfo.name}</span>
          <span className="batch-model-meta">{generationParams.temperature} / {generationParams.top_p} / {generationParams.maxTokens}tok</span>
        </div>
      )}

      {/* Response panels */}
      <div className="batch-results-grid">
        {state.responses.map((response) => (
          <BatchResponseCard
            key={response.id}
            response={response}
            onPick={() => handlePick(response)}
          />
        ))}
      </div>

      {/* Footer actions */}
      {isAnyDone && (
        <div className="batch-footer">
          {isAnyError && (
            <span className="batch-error-notice">
              Some responses had errors. Pick a successful one or discard all.
            </span>
          )}
          <button className="batch-discard-all-btn" onClick={onDiscardAll}>
            Discard All
          </button>
        </div>
      )}
    </div>
  )
}

interface BatchResponseCardProps {
  response: BatchResponse
  onPick: () => void
}

function BatchResponseCard({ response, onPick }: BatchResponseCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = response.status === 'done'
    ? '✓'
    : response.status === 'error'
      ? '✕'
      : response.status === 'streaming'
        ? '⟳'
        : '○'

  const statusColor = response.status === 'done'
    ? 'var(--batch-done-color, #34d399)'
    : response.status === 'error'
      ? 'var(--batch-error-color, #f87171)'
      : 'var(--batch-streaming-color, #a78bfa)'

  return (
    <div className={`batch-response-card batch-response-card-${response.status}`}>
      {/* Card header */}
      <div className="batch-card-header">
        <div className="batch-card-status">
          <span
            className="batch-status-dot"
            style={{ color: statusColor }}
          >
            {statusIcon}
          </span>
          <span className="batch-card-model">{response.modelId || 'Current Model'}</span>
        </div>
        <div className="batch-card-stats">
          {response.usage && (
            <span className="batch-stat-item">
              {response.usage.completionTokens} tok
            </span>
          )}
          <span className="batch-stat-item">
            {response.elapsed}s
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="batch-card-content">
        {response.status === 'streaming' ? (
          <div className="batch-streaming-placeholder">
            <span className="batch-typing">Generating…</span>
            <span className="batch-cursor-blink">▊</span>
          </div>
        ) : response.status === 'error' ? (
          <div className="batch-error-content">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {response.error}
          </div>
        ) : (
          <>
            <div className="batch-rendered-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
              >
                {response.content}
              </ReactMarkdown>
            </div>
            {response.content.length > 500 && (
              <button
                className="batch-expand-btn"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? '▲ Collapse' : '▼ Expand'} ({response.content.length} chars)
              </button>
            )}
          </>
        )}
      </div>

      {/* Card footer */}
      {response.status === 'done' && (
        <div className="batch-card-footer">
          <button className="batch-pick-btn" onClick={onPick}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Pick
          </button>
        </div>
      )}
    </div>
  )
}
