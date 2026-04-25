import { useState, useCallback, useRef } from 'react'
import type { KnowledgeDocument } from '../types'
import type { SearchScore } from '../lib/vectorStore'
import type { KnowledgeBase } from '../types'

interface Props {
  docs: KnowledgeDocument[]
  loading: boolean
  error: string | null
  onUpload: (files: FileList) => void
  onRemove: (id: string) => void
  onClear: () => void
  onBack: () => void
  // Vector store
  indexing: boolean
  indexedCount: number
  results: SearchScore[]
  query: string
  onQueryChange: (q: string) => void
  onIndexDocs: (docs: KnowledgeDocument[]) => Promise<void>
  onClearIndex: () => void
  hasIndex: boolean
  // Knowledge bases
  bases: KnowledgeBase[]
  activeBaseId: string | null
  onCreateBase: (name: string) => void
  onRenameBase: (id: string, name: string) => void
  onDeleteBase: (id: string) => void
  onSetActiveBase: (id: string | null) => void
  onAddDocToBase: (baseId: string, docId: string) => void
  onRemoveDocFromBase: (baseId: string, docId: string) => void
  // Base filter for search
  baseDocIds: string[] | null
  // v0.26: citation highlight
  highlightDocId: string | null
  highlightChunkIndex: number
  // v0.26.0: embedding model
  embeddingLoaded: boolean
  embeddingProgress: number
  embeddingError: string | null
  onEmbeddingLoad: () => Promise<void>
  onEmbeddingUnload: () => Promise<void>
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

function formatScore(score: number): string {
  return score.toFixed(3)
}

export function KnowledgePanel({
  docs,
  loading,
  error,
  onUpload,
  onRemove,
  onClear,
  onBack,
  indexing,
  indexedCount,
  results,
  query,
  onQueryChange,
  onIndexDocs,
  onClearIndex,
  hasIndex,
  bases,
  activeBaseId,
  onCreateBase,
  onRenameBase,
  onDeleteBase,
  onSetActiveBase,
  onAddDocToBase,
  onRemoveDocFromBase,
  baseDocIds,
  // v0.26: citation highlight
  highlightDocId,
  highlightChunkIndex,
  // v0.26.0
  embeddingLoaded,
  embeddingProgress,
  embeddingError,
  onEmbeddingLoad,
  onEmbeddingUnload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showBases, setShowBases] = useState(false)
  const [newBaseName, setNewBaseName] = useState('')
  const [renamingBaseId, setRenamingBaseId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // v0.26: find the highlighted document and chunk
  const highlightedDoc = highlightDocId
    ? docs.find((d) => d.id === highlightDocId || d.name === highlightDocId)
    : null
  const highlightedChunkIndex = highlightedDoc && highlightChunkIndex >= 0
    ? highlightChunkIndex
    : -1

  // Track which docs belong to which base
  const getDocBaseIds = useCallback(
    (docId: string) => {
      const baseIds: string[] = []
      for (const base of bases) {
        if (base.docIds.includes(docId)) {
          baseIds.push(base.id)
        }
      }
      return baseIds
    },
    [bases],
  )

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

  const handleIndex = useCallback(() => {
    if (docs.length > 0) {
      onIndexDocs(docs)
    }
  }, [docs, onIndexDocs])

  const handleCreateBase = useCallback(() => {
    if (newBaseName.trim()) {
      onCreateBase(newBaseName.trim())
      setNewBaseName('')
    }
  }, [newBaseName, onCreateBase])

  const handleRenameBase = useCallback(
    (baseId: string) => {
      if (renameValue.trim()) {
        onRenameBase(baseId, renameValue.trim())
      }
      setRenamingBaseId(null)
      setRenameValue('')
    },
    [renameValue, onRenameBase],
  )

  const handleDocBaseToggle = useCallback(
    (docId: string, baseId: string) => {
      const current = getDocBaseIds(docId)
      if (current.includes(baseId)) {
        onRemoveDocFromBase(baseId, docId)
      } else {
        onAddDocToBase(baseId, docId)
      }
    },
    [getDocBaseIds, onAddDocToBase, onRemoveDocFromBase],
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
        <div className="knowledge-header-actions">
          {docs.length > 0 && (
            <button className="knowledge-index-btn" onClick={handleIndex} disabled={indexing}>
              {indexing ? '⏳ Indexing…' : '🔍 Index'}
            </button>
          )}
          {hasIndex && (
            <button className="knowledge-search-toggle" onClick={() => setShowSearch(!showSearch)}>
              {showSearch ? '✕ Close Search' : '🔎 Search'}
            </button>
          )}
          <button
            className="knowledge-bases-toggle"
            onClick={() => setShowBases(!showBases)}
          >
            📚 Bases {showBases ? '▴' : '▾'}
          </button>
          {docs.length > 0 && (
            <button className="knowledge-clear-btn" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Knowledge Bases section */}
      {showBases && (
        <div className="knowledge-bases-section">
          <div className="knowledge-bases-header">
            <span className="knowledge-bases-title">Knowledge Bases</span>
            <button
              className="knowledge-create-base-btn"
              onClick={() => {
                if (newBaseName.trim()) {
                  handleCreateBase()
                }
              }}
              title="Create new knowledge base"
            >
              + New Base
            </button>
          </div>

          {/* New base input */}
          <div className="knowledge-new-base-input">
            <input
              type="text"
              className="knowledge-new-base-name"
              placeholder="Base name…"
              value={newBaseName}
              onChange={(e) => setNewBaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBase()
              }}
            />
          </div>

          {/* Base list */}
          <div className="knowledge-bases-list">
            {bases.length === 0 && (
              <div className="knowledge-bases-empty">
                No knowledge bases yet. Create one to organize your documents.
              </div>
            )}
            {bases.map((base) => (
              <div
                key={base.id}
                className={`knowledge-base-item ${activeBaseId === base.id ? 'knowledge-base-item-active' : ''}`}
                onClick={() => onSetActiveBase(activeBaseId === base.id ? null : base.id)}
              >
                <div className="knowledge-base-info">
                  {renamingBaseId === base.id ? (
                    <input
                      className="knowledge-base-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameBase(base.id)
                        if (e.key === 'Escape') {
                          setRenamingBaseId(null)
                          setRenameValue('')
                        }
                      }}
                      onBlur={() => {
                        setRenamingBaseId(null)
                        setRenameValue('')
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="knowledge-base-name"
                      onDoubleClick={() => {
                        setRenamingBaseId(base.id)
                        setRenameValue(base.name)
                      }}
                      title="Double-click to rename"
                    >
                      {base.name}
                    </span>
                  )}
                  <span className="knowledge-base-doc-count">
                    {base.docIds.length} document{base.docIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="knowledge-base-actions">
                  <button
                    className="knowledge-base-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteBase(base.id)
                    }}
                    title="Delete base"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active base indicator */}
          {activeBaseId && (
            <div className="knowledge-active-base">
              <span>📌 Active base:</span>
              <span className="knowledge-active-base-name">
                {bases.find((b) => b.id === activeBaseId)?.name ?? 'Unknown'}
              </span>
              <button
                className="knowledge-clear-active-base"
                onClick={() => onSetActiveBase(null)}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Index status + embedding model status */}
      {(hasIndex || embeddingLoaded) && (
        <div className="knowledge-index-status">
          {hasIndex && (
            <span>📊 Indexed {indexedCount} chunks</span>
          )}
          {hasIndex && embeddingLoaded && (
            <span className="knowledge-status-separator">·</span>
          )}
          {embeddingLoaded && (
            <span className="knowledge-embedding-status">
              🧠 Embedding model loaded
              <button
                className="knowledge-embedding-unload"
                onClick={onEmbeddingUnload}
                title="Unload embedding model to free memory"
              >
                Unload
              </button>
            </span>
          )}
          {!embeddingLoaded && hasIndex && (
            <button
              className="knowledge-embedding-load"
              onClick={onEmbeddingLoad}
              title="Load embedding model for semantic search"
            >
              🧠 Load Embedding Model (~90 MB)
            </button>
          )}
          {embeddingError && (
            <span className="knowledge-embedding-error">{embeddingError}</span>
          )}
          {!embeddingLoaded && !hasIndex && (
            <button
              className="knowledge-embedding-load"
              onClick={onEmbeddingLoad}
              title="Load embedding model for semantic search"
            >
              🧠 Load Embedding Model (~90 MB)
            </button>
          )}
          {hasIndex && (
            <button className="knowledge-reindex-btn" onClick={onClearIndex}>
              Re-index
            </button>
          )}
        </div>
      )}

      {/* Search bar */}
      {showSearch && hasIndex && (
        <div className="knowledge-search-bar">
          <input
            type="text"
            className="knowledge-search-input"
            placeholder="Search indexed chunks…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoFocus
          />
          {results.length > 0 && (
            <span className="knowledge-search-count">{results.length} results</span>
          )}
        </div>
      )}

      {/* Search results */}
      {showSearch && results.length > 0 && (
        <div className="knowledge-search-results">
          {/* Embedding-based results header */}
          {results.some((r) => r.source === 'embedding') && (
            <div className="knowledge-embedding-results-header">
              <span className="knowledge-embedding-results-icon">🧠</span>
              <span className="knowledge-embedding-results-text">
                Semantic search (embedding model)
              </span>
            </div>
          )}
          {results.map((r) => (
            <div key={r.id} className="knowledge-search-result">
              <div className="knowledge-search-result-header">
                <span className="knowledge-search-result-doc">{r.docName}</span>
                <span className={`knowledge-search-result-score ${r.source === 'embedding' ? 'score-embedding' : ''}`}>
                  {r.source === 'embedding' ? '🧠 ' : '📊 '}{formatScore(r.score)}
                </span>
              </div>
              <p className="knowledge-search-result-text">{r.text}</p>
            </div>
          ))}
        </div>
      )}

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
          {docs.map((doc) => {
            const docBases = getDocBaseIds(doc.id)
            const isHighlighted = highlightedDoc?.id === doc.id
            return (
              <div key={doc.id} className={`knowledge-doc-item ${isHighlighted ? 'knowledge-doc-item-highlighted' : ''}`}>
                <span className="knowledge-doc-icon">{DOC_ICONS[doc.type] ?? '📄'}</span>
                <div className="knowledge-doc-info">
                  <span className="knowledge-doc-name" title={doc.name}>{doc.name}</span>
                  <span className="knowledge-doc-meta">
                    {formatSize(doc.size)} · {doc.chunks.length} chunks · {formatDate(doc.createdAt)}
                  </span>
                </div>
                {/* v0.26: highlighted chunk preview */}
                {isHighlighted && highlightedChunkIndex >= 0 && highlightedChunkIndex < doc.chunks.length && (
                  <div className="knowledge-highlighted-chunk">
                    <span className="knowledge-highlighted-chunk-label">📌 Source chunk</span>
                    <p className="knowledge-highlighted-chunk-text">{doc.chunks[highlightedChunkIndex]}</p>
                  </div>
                )}
                {/* Base assignment pills */}
                {showBases && bases.length > 0 && (
                  <div className="knowledge-doc-bases">
                    {bases.map((base) => {
                      const assigned = docBases.includes(base.id)
                      return (
                        <button
                          key={base.id}
                          className={`knowledge-doc-base-pill ${assigned ? 'knowledge-doc-base-pill-active' : ''}`}
                          onClick={() => handleDocBaseToggle(doc.id, base.id)}
                          title={assigned ? 'Remove from base' : 'Add to base'}
                        >
                          {assigned ? '✓ ' : '+ '}{base.name}
                        </button>
                      )
                    })}
                  </div>
                )}
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
            )
          })}
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
