import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { ChatSession } from '../types'

export type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month'

interface Props {
  sessions: ChatSession[]
  activeSessionId: string | null
  /** Current search query from parent */
  searchQuery: string
  /** Current date filter from parent */
  dateFilter: DateFilter
  /** Callback to update search query */
  onSearchChange: (query: string) => void
  /** Callback to update date filter */
  onDateFilterChange: (filter: DateFilter) => void
  /** Filtered sessions — computed from search + date filter */
  filteredSessions: ChatSession[]
}

/**
 * Session search and filter component for the sidebar.
 * Provides text search and date range filtering for conversation sessions.
 */
export function SessionSearch({
  sessions,
  activeSessionId,
  searchQuery,
  dateFilter,
  onSearchChange,
  onDateFilterChange,
  filteredSessions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = useCallback(() => {
    onSearchChange('')
    inputRef.current?.focus()
  }, [onSearchChange])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const dateFilters: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  return (
    <div className="session-search">
      <div className="session-search-input-wrapper">
        <svg
          className="session-search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className="session-search-input"
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="session-search-clear" onClick={handleClear} title="Clear search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="session-search-filters">
        {dateFilters.map((f) => (
          <button
            key={f.key}
            className={`session-search-filter ${dateFilter === f.key ? 'active' : ''}`}
            onClick={() => onDateFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {(searchQuery || dateFilter !== 'all') && (
        <div className="session-search-count">
          {filteredSessions.length} of {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
