import { useState } from 'react'
import { BorderBeam } from 'border-beam'
import type { ChatSession } from '../types'
import { downloadSession, downloadAll } from '../lib/export'
import { SettingsPanel } from './SettingsPanel'
import { QuickPrompts } from './QuickPrompts'
import { SessionSearch } from './SessionSearch'
import { DEFAULT_PERSONA, PROMPT_TEMPLATES } from '../lib/prompts'
import type { DateFilter } from './SessionSearch'

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onVersionClick?: () => void
  onOpenStats?: () => void
  onUpdateSession?: (session: ChatSession) => void
  activePersonaId: string | null
  onApplyPersona?: (persona: any) => void
  onClearPersona: () => void
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
  onVersionClick,
  onOpenStats,
  onUpdateSession,
  activePersonaId,
  onApplyPersona,
  onClearPersona,
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
          return (
            <div key={session.id} className="sidebar-session-wrapper">
              {isActive ? (
                <BorderBeam size="sm" theme="auto" colorVariant="ocean" strength={0.5} duration={3}>
                  <div
                    className={`sidebar-session sidebar-session-active`}
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
                  </div>
                </BorderBeam>
              ) : (
                <BorderBeam size="sm" theme="auto" colorVariant="mono" strength={0.4} active={hoveredSessionId === session.id} duration={2.4}>
                  <div
                    className="sidebar-session"
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
        </button>
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
          v0.9.0
        </button>
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
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
