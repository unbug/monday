import { useState, useCallback, useRef } from 'react'
import type { KnowledgeDocument } from '../types'

interface Props {
  docs: KnowledgeDocument[]
  loading: boolean
  error: string | null
  onUpload: (files: FileList) => void
  onRemove: (id: string) => void
  onClear: () => void
  onBack: () => void
}

const DOC_ICONS: Record<string, string> = {
  pdf: '📕',
  txt: '📄',
  md: '📝',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function KnowledgePanel({
  docs,
  loading,
  error,
  onUpload,
  onRemove,
  onClear,
  onBack,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        onUpload(e.dataTransfer.files)
      }
    },
    [onUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpload(e.target.files)
        e.target.value = ''
      }
    },
    [onUpload],
  )

  return (
    <div className="main-content main-content--knowledge">
      <div className="knowledge-header">
        <button className="knowledge-back-btn" onClick={onBack} title="Back to chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Knowledge
        </button>
        <span className="knowledge-count">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
        {docs.length > 0 && (
          <button className="knowledge-clear-btn" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      {/* Upload area */}
      <div
        className={`knowledge-drop-zone ${dragOver ? 'knowledge-drop-zone-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,text/plain,text/markdown,application/pdf"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <div className="knowledge-drop-icon">📂</div>
        <p className="knowledge-drop-title">Drop PDF, TXT, or MD files here</p>
        <p className="knowledge-drop-subtitle">or click to browse</p>
      </div>

      {/* Error */}
      {error && (
        <div className="knowledge-error">
          <span>{error}</span>
          <button onClick={() => null}>✕</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="knowledge-loading">
          <div className="knowledge-spinner" />
          <span>Parsing documents…</span>
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="knowledge-doc-list">
          {docs.map((doc) => (
            <div key={doc.id} className="knowledge-doc-item">
              <span className="knowledge-doc-icon">{DOC_ICONS[doc.type] ?? '📄'}</span>
              <div className="knowledge-doc-info">
                <span className="knowledge-doc-name" title={doc.name}>{doc.name}</span>
                <span className="knowledge-doc-meta">
                  {formatSize(doc.size)} · {doc.chunks.length} chunks · {formatDate(doc.createdAt)}
                </span>
              </div>
              <button
                className="knowledge-doc-remove"
                onClick={() => onRemove(doc.id)}
                title="Remove document"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" y2="18" />
                  <line x1="6" y1="6" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {docs.length === 0 && !loading && (
        <div className="knowledge-empty">
          <p>No documents yet. Upload files to build your knowledge base.</p>
        </div>
      )}
    </div>
  )
}
