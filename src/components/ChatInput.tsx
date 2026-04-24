import { useState, useRef } from 'react'
import { BorderBeam } from 'border-beam'
import { PROMPT_TEMPLATES } from '../lib/prompts'
import { ContextPanel } from './ContextPanel'

interface Props {
  sessionId?: string
  onSend: (content: string) => void
  onStop: () => void
  onApplyPersona: (personaId: string) => void
  isGenerating: boolean
  disabled: boolean
  tokenStats?: {
    totalTokens: number
    sessionTokens: number
    tokensPerSecond: number
    elapsedSeconds: number
  }
  isStreaming?: boolean
  context?: string
  onContextChange?: (context: string) => void
}

export function ChatInput({
  sessionId,
  onSend,
  onStop,
  onApplyPersona,
  isGenerating,
  disabled,
  tokenStats,
  isStreaming,
  context = '',
  onContextChange,
}: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSlashHint, setShowSlashHint] = useState(false)

  const handleSend = () => {
    if (!input.trim() || disabled) return

    // Check for slash commands
    const slashMatch = input.trim().match(/^\/(\w+)/)
    if (slashMatch) {
      const cmd = slashMatch[1].toLowerCase()
      const matched = PROMPT_TEMPLATES.find(
        (p) => p.id === cmd || p.name.toLowerCase().replace(/\s+/g, '-') === cmd,
      )
      if (matched) {
        onApplyPersona(matched.id)
        setInput('')
        setShowSlashHint(false)
        return
      }
    }

    onSend(input.trim())
    setInput('')
    setShowSlashHint(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    if (val.endsWith('/')) {
      setShowSlashHint(true)
    } else {
      setShowSlashHint(false)
    }
  }

  return (
    <div className="chat-input-wrapper">
      {sessionId && (
        <ContextPanel
          sessionId={sessionId}
          onContextChange={onContextChange ?? (() => {})}
        />
      )}
      <BorderBeam
        size="line"
        theme="auto"
        colorVariant="colorful"
        strength={focused ? 0.8 : 0.3}
        active={focused || isGenerating}
        duration={1.96}
      >
        <div className="chat-input-container">
          <textarea
            className="chat-input"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              disabled
                ? 'Select and load a model to start chatting...'
                : 'Type a message... (Enter to send, Shift+Enter for new line)'
            }
            disabled={disabled}
            rows={1}
          />
          {showSlashHint && (
            <div className="slash-hint">
              <span className="slash-hint-label">Quick personas:</span>
              {PROMPT_TEMPLATES.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  className="slash-hint-item"
                  onClick={() => onApplyPersona(p.id)}
                >
                  {p.icon} /{p.id.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          )}
          {isGenerating ? (
            <button className="chat-btn chat-btn-stop" onClick={onStop}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop
            </button>
          ) : (
            <button
              className="chat-btn chat-btn-send"
              onClick={handleSend}
              disabled={disabled || !input.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send
            </button>
          )}
        </div>
      </BorderBeam>
      <p className="chat-input-hint">
        Running 100% locally in your browser via WebGPU
      </p>
      {isGenerating && tokenStats && (
        <div className="token-stats">
          <span className="token-stats-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            {tokenStats.tokensPerSecond} tok/s
          </span>
          <span className="token-stats-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {tokenStats.elapsedSeconds}s
          </span>
          <span className="token-stats-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {tokenStats.sessionTokens} tokens
          </span>
        </div>
      )}
    </div>
  )
}
