import { useState, useCallback, useEffect } from 'react'
import type { Snippet } from '../types'
import { loadSnippets } from '../lib/storage'
import { t } from '../lib/i18n'

interface Props {
  attachedIds: string[]
  onAttach: (id: string) => void
  onDetach: (id: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  code: '#61dafb',
  text: '#a78bfa',
  template: '#f59e0b',
  reference: '#10b981',
  custom: '#f472b6',
}

const CATEGORY_ICONS: Record<string, string> = {
  code: '⟨/⟩',
  text: '¶',
  template: '☰',
  reference: '※',
  custom: '✎',
}

export function SessionContextPanel({ attachedIds, onAttach, onDetach }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadSnippets().then((s) => {
      setSnippets(s)
      setLoading(false)
    })
  }, [])

  const handleToggle = useCallback(
    (id: string) => {
      if (attachedIds.includes(id)) {
        onDetach(id)
      } else {
        onAttach(id)
      }
    },
    [attachedIds, onAttach, onDetach],
  )

  const attachedSnippets = snippets.filter((s) => attachedIds.includes(s.id))
  const unattachedSnippets = snippets.filter((s) => !attachedIds.includes(s.id))

  return (
    <div className="session-context-panel">
      <button
        className="session-context-toggle"
        onClick={() => setExpanded(!expanded)}
        title={t('contextPanel.title')}
      >
        <span className="session-context-icon">📎</span>
        <span className="session-context-count">{attachedSnippets.length}</span>
      </button>

      {expanded && (
        <div className="session-context-dropdown">
          {/* Attached snippets */}
          {attachedSnippets.length > 0 && (
            <div className="session-context-section">
              <div className="session-context-section-title">
                {t('contextPanel.attached')} ({attachedSnippets.length})
              </div>
              {attachedSnippets.map((s) => (
                <div key={s.id} className="session-context-chip attached">
                  <span
                    className="session-context-chip-icon"
                    style={{ color: CATEGORY_COLORS[s.category] || '#888' }}
                  >
                    {CATEGORY_ICONS[s.category] || '✎'}
                  </span>
                  <span className="session-context-chip-title">{s.title}</span>
                  <button
                    className="session-context-chip-detach"
                    onClick={() => handleToggle(s.id)}
                    title={t('contextPanel.detach')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Unattached snippets */}
          {loading ? (
            <div className="session-context-loading">{t('contextPanel.loading')}</div>
          ) : unattachedSnippets.length > 0 ? (
            <div className="session-context-section">
              <div className="session-context-section-title">
                {t('contextPanel.available')} ({unattachedSnippets.length})
              </div>
              {unattachedSnippets.map((s) => (
                <div key={s.id} className="session-context-chip unattached">
                  <span
                    className="session-context-chip-icon"
                    style={{ color: CATEGORY_COLORS[s.category] || '#888' }}
                  >
                    {CATEGORY_ICONS[s.category] || '✎'}
                  </span>
                  <span className="session-context-chip-title">{s.title}</span>
                  <button
                    className="session-context-chip-attach"
                    onClick={() => handleToggle(s.id)}
                    title={t('contextPanel.attach')}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <div className="session-context-empty">
                {attachedSnippets.length > 0
                  ? t('contextPanel.allAttached')
                  : t('contextPanel.noSnippets')}
              </div>
            )
          )}

          {attachedSnippets.length > 0 && (
            <div className="session-context-preview">
              <div className="session-context-preview-title">{t('contextPanel.preview')}</div>
              <div className="session-context-preview-content">
                {attachedSnippets.map((s) => (
                  <div key={s.id} className="session-context-preview-block">
                    <div className="session-context-preview-label">
                      <span
                        style={{ color: CATEGORY_COLORS[s.category] || '#888' }}
                      >
                        {CATEGORY_ICONS[s.category] || '✎'} {s.title}
                      </span>
                    </div>
                    <div className="session-context-preview-text">
                      {s.content.length > 200
                        ? s.content.slice(0, 200) + '…'
                        : s.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
