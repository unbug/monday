import { useState, useEffect } from 'react'
import { BorderBeam } from 'border-beam'
import type { ChatSession } from '../types'
import { downloadSession, downloadAll } from '../lib/export'
import { SettingsPanel } from './SettingsPanel'
import { QuickPrompts } from './QuickPrompts'
import { SessionSearch } from './SessionSearch'
import { DEFAULT_PERSONA, PROMPT_TEMPLATES } from '../lib/prompts'
import type { DateFilter } from './SessionSearch'
import { getLocalDataSize } from '../lib/recentModels'
import { version } from '../../package.json'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function StorageQuota() {
  const [size, setSize] = useState<number | null>(null)

  useEffect(() => {
    setSize(getLocalDataSize())
  }, [])

  if (size === null) return <span className="sidebar-storage-text">—</span>
  return <span className="sidebar-storage-text">{formatBytes(size)}</span>
}

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onVersionClick?: () => void
  onOpenStats?: () => void
  onOpenComparison?: () => void
  onOpenBenchmark?: () => void
  onOpenCustomModels?: () => void
  onOpenPersonaMarketplace?: () => void
  onOpenKnowledge?: () => void
  onOpenPlugins?: () => void
  onOpenMcpServers?: () => void
  onOpenWebDAV?: () => void
  onOpenMemory?: () => void
  onOpenShortcuts?: () => void
  onOpenInNewWindow?: (sessionId: string) => void
  onShare?: () => void
  onUpdateSession?: (session: ChatSession) => void
  activePersonaId: string | null
  onApplyPersona?: (persona: any) => void
  onClearPersona: () => void
  shareSession?: (session: ChatSession) => void
  onImport?: (file: File) => Promise<void>
  onExport?: () => Promise<void>
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
  onVersionClick,
  onOpenStats,
  onOpenComparison,
  onOpenBenchmark,
  onOpenCustomModels,
  onOpenPersonaMarketplace,
  onOpenKnowledge,
  onOpenPlugins,
  onOpenMcpServers,
  onOpenWebDAV,
  onOpenMemory,
  onOpenShortcuts,
  onOpenInNewWindow,
  onShare,
  onImport,
  onExport,
  onUpdateSession,
  activePersonaId,
  onApplyPersona,
  onClearPersona,
  shareSession,
}: Props) {
  const [showExport, setShowExport] = useState(false)
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const activeSession = sessions.find((s) => s.id === activeSessionId)

  // Filter sessions by search query and date filter
  const filteredSessions = sessions.filter((session) => {
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff =
        dateFilter === 'today'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
          : dateFilter === 'yesterday'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()
            : dateFilter === 'week'
              ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime()
              : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime()
      if (session.updatedAt < cutoff) return false
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!session.title.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          Monday
        </h1>
        <BorderBeam size="sm" theme="auto" colorVariant="mono" strength={0.5} duration={2.4}>
          <button className="sidebar-new-btn" onClick={onNew} title="New Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </BorderBeam>
      </div>

      <SessionSearch
        sessions={sessions}
        activeSessionId={activeSessionId}
        searchQuery={searchQuery}
        dateFilter={dateFilter}
        onSearchChange={setSearchQuery}
        onDateFilterChange={setDateFilter}
        filteredSessions={filteredSessions}
      />

      {/* Hidden state sync — keep App.tsx in sync for command palette filtering */}
      {typeof window !== 'undefined' && searchQuery && (
        <div style={{ display: 'none' }} data-search-query={searchQuery} />
      )}

      <div className="sidebar-sessions">
        {sessions.length === 0 && (
          <p className="sidebar-empty">No conversations yet</p>
        )}
        {filteredSessions.length === 0 && sessions.length > 0 && (
          <p className="sidebar-empty">No matching conversations</p>
        )}
        {filteredSessions.map((session) => {
          const isActive = session.id === activeSessionId
          const isFork = session.forkId !== null
          return (
            <div key={session.id} className="sidebar-session-wrapper">
              {isActive ? (
                <BorderBeam size="sm" theme="auto" colorVariant="ocean" strength={0.5} duration={3}>
                  <div
                    className={`sidebar-session sidebar-session-active${isFork ? ' forked' : ''}`}
                    onClick={() => onSelect(session.id)}
                  >
                    <span className="sidebar-session-title">{session.title}</span>
                    <button
                      className="sidebar-session-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(session.id)
                      }}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    {onOpenInNewWindow && (
                      <button
                        className="sidebar-session-new-window"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenInNewWindow(session.id)
                        }}
                        title="Open in New Window"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </BorderBeam>
              ) : (
                <BorderBeam size="sm" theme="auto" colorVariant="mono" strength={0.4} active={hoveredSessionId === session.id} duration={2.4}>
                  <div
                    className={`sidebar-session${isFork ? ' forked' : ''}`}
                    onClick={() => onSelect(session.id)}
                    onMouseEnter={() => setHoveredSessionId(session.id)}
                    onMouseLeave={() => setHoveredSessionId(null)}
                  >
                    <span className="sidebar-session-title">{session.title}</span>
                    <button
                      className="sidebar-session-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(session.id)
                      }}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    {onOpenInNewWindow && (
                      <button
                        className="sidebar-session-new-window"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenInNewWindow(session.id)
                        }}
                        title="Open in New Window"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </BorderBeam>
              )}
            </div>
          )
        })}
      </div>

      {activeSession && onUpdateSession && (
        <div className="sidebar-settings">
          <SettingsPanel
            session={activeSession}
            onUpdate={onUpdateSession}
          />
        </div>
      )}

      {activeSession && onApplyPersona && (
        <div className="sidebar-quick-prompts">
          <QuickPrompts
            activePersonaId={activePersonaId}
            onApplyPersona={onApplyPersona}
            onClearPersona={onClearPersona}
          />
        </div>
      )}

      {/* Quick Nav */}
      <div className="sidebar-quick-nav">
        <button
          className="sidebar-nav-btn"
          onClick={onOpenStats}
          title="Usage Statistics"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span className="sidebar-nav-label">Stats</span>
        </button>
        {onOpenComparison && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenComparison}
            title="Model Comparison"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.813L3 3" />
              <path d="M21 3l-7.173 7.173a4 4 0 0 0-2.813 1.172L21 21" />
            </svg>
            <span className="sidebar-nav-label">Compare</span>
          </button>
        )}
        {onOpenBenchmark && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenBenchmark}
            title="Model Benchmark"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="sidebar-nav-label">Bench</span>
          </button>
        )}
        {onOpenCustomModels && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenCustomModels}
            title="Custom Model Import"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="sidebar-nav-label">Models</span>
          </button>
        )}
        {onOpenPersonaMarketplace && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenPersonaMarketplace}
            title="Persona Marketplace"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="sidebar-nav-label">Personas</span>
          </button>
        )}
        {onOpenKnowledge && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenKnowledge}
            title="Knowledge"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="sidebar-nav-label">Docs</span>
          </button>
        )}
        {onOpenPlugins && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenPlugins}
            title="Plugins"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
              <line x1="16" y1="8" x2="2" y2="22" />
              <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
            <span className="sidebar-nav-label">Plugins</span>
          </button>
        )}
        {onOpenMcpServers && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenMcpServers}
            title="MCP Servers"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="sidebar-nav-label">MCP</span>
          </button>
        )}
        {onOpenWebDAV && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenWebDAV}
            title="WebDAV Sync"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9" />
              <path d="M12 3v9l6-3" />
            </svg>
            <span className="sidebar-nav-label">WebDAV</span>
          </button>
        )}
        {onOpenMemory && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenMemory}
            title="Memory"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="sidebar-nav-label">Memory</span>
          </button>
        )}
        {onOpenShortcuts && (
          <button
            className="sidebar-nav-btn"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12" />
            </svg>
            <span className="sidebar-nav-label">Hotkeys</span>
          </button>
        )}
        {onShare && (
          <button
            className="sidebar-nav-btn"
            onClick={onShare}
            title="Share conversation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="sidebar-nav-label">Share</span>
          </button>
        )}
        <button
          className="sidebar-nav-btn"
          onClick={onVersionClick}
          title="Changelog"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="sidebar-nav-label">What's New</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <a
          href="https://github.com/unbug/monday"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-link"
        >
          GitHub
        </a>
        <span className="sidebar-separator">·</span>
        <button
          className="sidebar-version-btn"
          onClick={onVersionClick}
          title="View changelog"
        >
          v{version}
        </button>
        <span className="sidebar-separator">·</span>
        <span className="sidebar-storage-info" title="localStorage usage">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <StorageQuota />
        </span>
        <span className="sidebar-separator">·</span>
        <div className="sidebar-export-wrapper">
          <button
            className="sidebar-export-btn"
            onClick={() => setShowExport(!showExport)}
            title="Export conversations"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {showExport && (
            <div className="sidebar-export-menu">
              <button
                className="sidebar-export-menu-item"
                onClick={() => {
                  if (activeSession) downloadSession(activeSession)
                  setShowExport(false)
                }}
                disabled={!activeSession}
              >
                Export current conversation
              </button>
              <button
                className="sidebar-export-menu-item"
                onClick={() => {
                  downloadAll(sessions)
                  setShowExport(false)
                }}
              >
                Export all conversations
              </button>
              {activeSession && (
                <button
                  className="sidebar-export-menu-item"
                  onClick={() => {
                    if (shareSession) shareSession(activeSession)
                    setShowExport(false)
                  }}
                >
                  Share as HTML
                </button>
              )}
              <button
                className="sidebar-export-menu-item"
                onClick={() => {
                  if (onExport) onExport()
                  setShowExport(false)
                }}
              >
                Export all data
              </button>
              <button
                className="sidebar-export-menu-item"
                onClick={() => {
                  if (onImport) {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.monday'
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) await onImport(file)
                    }
                    input.click()
                  }
                  setShowExport(false)
                }}
              >
                Import data
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
