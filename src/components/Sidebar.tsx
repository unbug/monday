import { BorderBeam } from 'border-beam'
import type { ChatSession } from '../types'

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
}: Props) {
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

      <div className="sidebar-sessions">
        {sessions.length === 0 && (
          <p className="sidebar-empty">No conversations yet</p>
        )}
        {sessions.map((session) => {
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
                <div
                  className="sidebar-session"
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
              )}
            </div>
          )
        })}
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
        <span className="sidebar-version">v0.1.0</span>
      </div>
    </aside>
  )
}
