/**
 * LearningReviewDialog — Review extracted learning items after session compaction.
 * v1.2.3: User reviews preference signals and entity mentions before they are
 * committed to the persistent memory store.
 */

import { useState } from 'react'
import type { LearningItem } from '../types'
import { t } from '../lib/i18n'

interface LearningReviewDialogProps {
  items: LearningItem[]
  summary: string
  onApproveAll: () => void
  onDismiss: () => void
}

function itemIcon(type: string): string {
  return type === 'preference' ? '💡' : '🏷️'
}

function itemLabel(type: string): string {
  return type === 'preference' ? t('learning.preference') : t('learning.entity')
}

function confidenceColor(c: number): string {
  if (c >= 0.9) return '#10b981'
  if (c >= 0.7) return '#f59e0b'
  return '#ef4444'
}

export function LearningReviewDialog({
  items,
  summary,
  onApproveAll,
  onDismiss,
}: LearningReviewDialogProps) {
  const [approved, setApproved] = useState<Record<string, boolean>>({})

  const allApproved = items.length > 0 && items.every((i) => approved[i.id])

  const toggleItem = (id: string) => {
    setApproved((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const approveAll = () => {
    const next: Record<string, boolean> = {}
    items.forEach((i) => (next[i.id] = true))
    setApproved(next)
  }

  const dismissAll = () => {
    const next: Record<string, boolean> = {}
    items.forEach((i) => (next[i.id] = false))
    setApproved(next)
  }

  const handleApproveAll = () => {
    approveAll()
    onApproveAll()
  }

  const handleDismiss = () => {
    dismissAll()
    onDismiss()
  }

  return (
    <div className="learning-review-overlay">
      <div className="learning-review-dialog">
        {/* Header */}
        <div className="learning-review-header">
          <h3>{t('learning.title')}</h3>
          <button className="learning-review-close" onClick={handleDismiss} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="learning-review-subtitle">{t('learning.subtitle')}</p>

        {/* Approved count */}
        <div className="learning-review-count">
          <span>{t('learning.approvedCount', { count: Object.values(approved).filter(Boolean).length })}</span>
          <span className="learning-review-total">/ {items.length}</span>
        </div>

        {/* Summary preview */}
        <details className="learning-review-summary">
          <summary className="learning-review-summary-toggle">{t('learning.showSummary')}</summary>
          <div className="learning-review-summary-content">{summary}</div>
        </details>

        {/* Items list */}
        <div className="learning-review-items">
          {items.map((item) => (
            <div
              key={item.id}
              className={`learning-review-item ${approved[item.id] ? 'learning-review-item-approved' : ''}`}
            >
              <div className="learning-review-item-header">
                <span className="learning-review-item-icon">{itemIcon(item.type)}</span>
                <span className="learning-review-item-label">{itemLabel(item.type)}</span>
                <span
                  className="learning-review-confidence"
                  style={{ color: confidenceColor(item.confidence) }}
                >
                  {Math.round(item.confidence * 100)}%
                </span>
                <button
                  className={`learning-review-toggle-btn ${approved[item.id] ? 'approved' : ''}`}
                  onClick={() => toggleItem(item.id)}
                  aria-pressed={approved[item.id]}
                >
                  {approved[item.id] ? '✓' : '○'}
                </button>
              </div>
              <div className="learning-review-item-title">{item.title}</div>
              <div className="learning-review-item-content">{item.content}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="learning-review-actions">
          <button className="learning-review-approve-all-btn" onClick={handleApproveAll}>
            {t('learning.approveAll')}
          </button>
          <button className="learning-review-dismiss-btn" onClick={handleDismiss}>
            {t('learning.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
