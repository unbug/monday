import { useState, useCallback, useRef, useEffect } from 'react'
import { getContext, setContext, clearContext, hasContext } from '../lib/contextStore'

interface Props {
  sessionId: string
  onContextChange: (newText: string) => void
}

export function ContextPanel({ sessionId, onContextChange }: Props) {
  const [collapsed, setCollapsed] = useState(!hasContext(sessionId))
  const [text, setText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing context on mount
  useEffect(() => {
    setText(getContext(sessionId))
  }, [sessionId])

  const debouncedSave = useCallback(
    (value: string) => {
      setText(value)
      onContextChange(value)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setContext(sessionId, value)
      }, 300)
    },
    [sessionId, onContextChange],
  )

  const handleClear = useCallback(() => {
    clearContext(sessionId)
    setText('')
    onContextChange('')
  }, [sessionId, onContextChange])

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    debouncedSave(e.target.value)
  }

  const charCount = text.length
  const hasContent = charCount > 0

  if (collapsed) {
    return (
      <div className="context-pill" onClick={handleToggle}>
        <span className="context-pill-text">
          {hasContent ? `${charCount} chars` : 'Context'}
        </span>
        <span className="context-pill-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    )
  }

  return (
    <div className={`context-panel ${isFocused ? 'focused' : ''}`}>
      <div className="context-panel-header">
        <button
          className="context-collapse-btn"
          onClick={handleToggle}
          aria-label="Collapse context panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <span className="context-panel-title">Context</span>
        <span className="context-char-count">{charCount} chars</span>
        {hasContent && (
          <button className="context-clear-btn" onClick={handleClear} aria-label="Clear context">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <textarea
        className="context-textarea"
        value={text}
        onChange={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Attach context (code, docs, notes)..."
        rows={4}
      />
    </div>
  )
}
