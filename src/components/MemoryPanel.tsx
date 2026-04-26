/**
 * MemoryPanel — View and edit conversation summaries.
 * v0.30: Multi-turn memory UI for managing auto-compressed context.
 */

import { useState, useEffect } from 'react'
import type { MemorySummary } from '../types'
import type { UseMultiTurnMemoryReturn } from '../hooks/useMultiTurnMemory'

interface MemoryPanelProps {
  summaries: MemorySummary[]
  isSummarizing: boolean
  summarizeProgress: string
  needsSummarization: boolean
  estimatedTokens: number
  onCompress: () => Promise<void>
  onCancelCompress: () => void
  onEditSummary: (id: string, text: string) => void
  onDeleteSummary: (id: string) => void
  onClose: () => void
}

export function MemoryPanel({
  summaries,
  isSummarizing,
  summarizeProgress,
  needsSummarization,
  estimatedTokens,
  onCompress,
  onCancelCompress,
  onEditSummary,
  onDeleteSummary,
  onClose,
}: MemoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    if (editingId) {
      const summary = summaries.find((s) => s.id === editingId)
      if (summary) setEditText(summary.summary)
    }
  }, [editingId, summaries])

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      onEditSummary(editingId, editText.trim())
      setEditingId(null)
      setEditText('')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return `${tokens}`
    if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k`
    return `${Math.round(tokens / 1000)}k`
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="memory-panel">
      <div className="memory-panel-header">
        <h3>Memory</h3>
        <button className="memory-panel-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {/* Status bar */}
      <div className="memory-status-bar">
        <span className="memory-token-count">
          ~{formatTokens(estimatedTokens)} tokens
        </span>
        {needsSummarization && (
          <span className="memory-attention-badge">Context full</span>
        )}
        {isSummarizing && (
          <span className="memory-summarizing-badge">
            Compressing…
          </span>
        )}
      </div>

      {/* Compress button */}
      {isSummarizing ? (
        <div className="memory-compress-progress">
          <div className="memory-progress-bar">
            <div className="memory-progress-fill" />
          </div>
          <p className="memory-progress-text">{summarizeProgress}</p>
          <button className="memory-cancel-btn" onClick={onCancelCompress}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          className={`memory-compress-btn ${needsSummarization ? 'memory-compress-urgent' : ''}`}
          onClick={onCompress}
          disabled={summaries.length > 0}
        >
          {summaries.length > 0
            ? 'Summarize More History'
            : 'Compress Early Turns'}
        </button>
      )}

      {/* Summaries list */}
      <div className="memory-summaries-list">
        {summaries.length === 0 ? (
          <div className="memory-empty-state">
            <span className="memory-empty-icon">🧠</span>
            <p>No summaries yet</p>
            <span className="memory-empty-hint">
              Compress early turns to save context
            </span>
          </div>
        ) : (
          summaries.map((summary, index) => (
            <div key={summary.id} className="memory-summary-card">
              <div className="memory-summary-header">
                <span className="memory-summary-label">
                  Summary {index + 1}
                </span>
                <span className="memory-summary-range">
                  Messages {summary.startMsgIndex + 1}–{summary.endMsgIndex}
                </span>
              </div>
              {editingId === summary.id ? (
                <div className="memory-edit-area">
                  <textarea
                    className="memory-edit-textarea"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  <div className="memory-edit-actions">
                    <button className="memory-save-btn" onClick={handleSaveEdit}>
                      Save
                    </button>
                    <button className="memory-discard-btn" onClick={handleCancelEdit}>
                      Discard
                    </button>
                    <button
                      className="memory-delete-btn"
                      onClick={() => onDeleteSummary(summary.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="memory-summary-content"
                    onClick={() => {
                      setEditingId(summary.id)
                      setEditText(summary.summary)
                    }}
                    title="Click to edit"
                  >
                    {summary.summary.length > 300
                      ? summary.summary.slice(0, 300) + '…'
                      : summary.summary}
                  </div>
                  <div className="memory-summary-meta">
                    <span className="memory-summary-time">
                      {summary.editedAt
                        ? `Edited ${formatTime(summary.editedAt)}`
                        : `Generated ${formatTime(summary.generatedAt)}`}
                    </span>
                    <button
                      className="memory-edit-btn"
                      onClick={() => {
                        setEditingId(summary.id)
                        setEditText(summary.summary)
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
