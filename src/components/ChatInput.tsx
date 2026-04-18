import { useState, type KeyboardEvent } from 'react'
import { BorderBeam } from 'border-beam'

interface Props {
  onSend: (content: string) => void
  onStop: () => void
  isGenerating: boolean
  disabled: boolean
}

export function ChatInput({ onSend, onStop, isGenerating, disabled }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-wrapper">
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
            onChange={(e) => setInput(e.target.value)}
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
    </div>
  )
}
