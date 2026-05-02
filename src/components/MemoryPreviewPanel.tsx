/**
 * MemoryPreviewPanel — Shows which memories a persona can read based on
 * its readNamespaces declaration. Used in the persona marketplace's
 * "Memory" tab to preview accessible memories before applying a persona.
 */

import { useState } from 'react'
import type { MemoryEntry, MemoryNamespace } from '../types'
import type { MarketplacePersona } from '../data/personaRegistry'
import { t } from '../lib/i18n'

interface MemoryPreviewPanelProps {
  persona: MarketplacePersona | null
  memories: MemoryEntry[]
  personas: MarketplacePersona[]
  onClose: () => void
}

function namespaceLabel(ns: MemoryNamespace): string {
  switch (ns) {
    case 'global':
      return t('memory.namespaceGlobal')
    case 'persona':
      return t('memory.namespacePersona')
    case 'skill':
      return t('memory.namespaceSkill')
  }
}

function namespaceColor(ns: MemoryNamespace): string {
  switch (ns) {
    case 'global':
      return 'var(--accent-color)'
    case 'persona':
      return '#f59e0b'
    case 'skill':
      return '#10b981'
  }
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return t('memory.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('memory.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('memory.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('memory.daysAgo', { count: days })
}

function targetLabel(memory: MemoryEntry, personas: MarketplacePersona[]): string | null {
  if (memory.namespace === 'persona') {
    return personas.find((p) => p.id === memory.targetId)?.name ?? memory.targetId
  }
  return null
}

export function MemoryPreviewPanel({ persona, memories, personas, onClose }: MemoryPreviewPanelProps) {
  const [filter, setFilter] = useState<'all' | MemoryNamespace>('all')

  if (!persona) {
    return (
      <div className="memory-preview-panel">
        <div className="memory-preview-header">
          <h3>{t('memory.readableNamespaces')}</h3>
          <button className="memory-preview-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="memory-preview-empty">
          <span className="memory-preview-empty-icon">👆</span>
          <p>{t('memory.previewSelectPersona')}</p>
        </div>
      </div>
    )
  }

  const readNamespaces = persona.readNamespaces ?? []

  const accessibleMemories = memories.filter((m) => {
    // Namespace filter
    if (filter !== 'all' && m.namespace !== filter) return false
    // Persona scope: only show persona-scoped memories where target matches
    if (m.namespace === 'persona' && m.targetId && m.targetId !== persona.id) return false
    return true
  })

  return (
    <div className="memory-preview-panel">
      {/* Header */}
      <div className="memory-preview-header">
        <div className="memory-preview-title-row">
          <h3>{t('memory.readableNamespaces')}</h3>
          <span className="memory-preview-persona-badge">
            {persona.icon} {persona.name}
          </span>
        </div>
        <button className="memory-preview-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {/* Readable namespaces */}
      <div className="memory-preview-namespaces">
        <span className="memory-preview-ns-label">{t('memory.reads')}:</span>
        <div className="memory-preview-ns-chips">
          {readNamespaces.length === 0 ? (
            <span className="memory-preview-ns-none">{t('memory.none')}</span>
          ) : (
            readNamespaces.map((ns) => (
              <span
                key={ns}
                className="memory-preview-ns-chip"
                style={{ borderColor: namespaceColor(ns) }}
              >
                {namespaceLabel(ns)}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="memory-preview-filters">
        {(['all', 'global', 'persona', 'skill'] as const).map((ns) => (
          <button
            key={ns}
            className={`memory-preview-filter ${filter === ns ? 'active' : ''}`}
            onClick={() => setFilter(ns)}
          >
            {ns === 'all' ? t('memory.all') : namespaceLabel(ns)}
            <span className="memory-preview-count">
              {ns === 'all'
                ? accessibleMemories.length
                : accessibleMemories.filter((m) => m.namespace === ns).length}
            </span>
          </button>
        ))}
      </div>

      {/* Memory list */}
      <div className="memory-preview-list">
        {accessibleMemories.length === 0 ? (
          <div className="memory-preview-empty">
            <span className="memory-preview-empty-icon">🧠</span>
            <p>{t('memory.noMemories')}</p>
            <span className="memory-preview-empty-hint">
              {t('memory.emptyHint')}
            </span>
          </div>
        ) : (
          accessibleMemories.map((memory) => {
            const targetName = targetLabel(memory, personas)
            const isCorrection = memory.source === 'correction'
            return (
              <div
                key={memory.id}
                className={`memory-preview-card ${isCorrection ? 'memory-preview-card-correction' : ''}`}
              >
                <div className="memory-preview-card-header">
                  {isCorrection && (
                    <span className="memory-preview-correction-badge">
                      {memory.key.includes('edit') ? t('memory.correctionEdit') : t('memory.correctionRegen')}
                    </span>
                  )}
                  <span className="memory-preview-key">{memory.key}</span>
                  <span
                    className="memory-preview-namespace-badge"
                    style={{ borderColor: namespaceColor(memory.namespace) }}
                  >
                    {namespaceLabel(memory.namespace)}
                  </span>
                </div>

                {targetName && (
                  <div className="memory-preview-target-chip">
                    → {targetName}
                  </div>
                )}

                <div className="memory-preview-value">
                  {memory.value.length > 200
                    ? memory.value.slice(0, 200) + '…'
                    : memory.value}
                </div>

                <div className="memory-preview-meta">
                  <span className="memory-preview-time">
                    {memory.updatedAt !== memory.createdAt
                      ? `${t('memory.edited')} ${formatRelativeTime(memory.updatedAt)}`
                      : `${t('memory.created')} ${formatRelativeTime(memory.createdAt)}`}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
