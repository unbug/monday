import { useRef, useEffect, useState, useCallback } from 'react'
import type { ChatMessage } from '../types'
import { MarkdownRenderer } from './MarkdownRenderer'
import { MessageActions } from './MessageActions'

interface Props {
  messages: ChatMessage[]
  isStreaming: boolean
  onRegenerateMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
}

export function MessageList({
  messages,
  isStreaming,
  onRegenerateMessage,
  onEditMessage,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Track scroll position to detect if user scrolled up
  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // User is within 80px of bottom = consider them "at bottom"
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 80
      setShouldAutoScroll(isNearBottom)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll only when user is at bottom or during streaming
  useEffect(() => {
    if (shouldAutoScroll || isStreaming) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, shouldAutoScroll, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <div className="messages-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3>Start a conversation</h3>
        <p>Your messages are processed locally in your browser. Nothing is sent to any server.</p>
      </div>
    )
  }

  return (
    <div className="messages">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
        >
          <div className="message-avatar">
            {msg.role === 'user' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7.001 7.001 0 0 1 8 18H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 3-5.75V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm-2 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
            )}
          </div>
          <div className="message-content">
            {msg.role === 'assistant' ? (
              <div className="message-text message-text-assistant">
                {msg.isStreaming ? (
                  <>
                    <MarkdownRenderer content={msg.content} />
                    <span className="cursor-blink">|</span>
                  </>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
              </div>
            ) : (
              <div className="message-text message-text-user">
                <div className="user-msg-content">{msg.content}</div>
                <button
                  className="msg-copy-btn"
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  title="Copy message"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                {onRegenerateMessage && onEditMessage && (
                  <MessageActions
                    messageContent={msg.content}
                    isUser={true}
                    isStreaming={isStreaming}
                    onEdit={(content) => onEditMessage(msg.id, content)}
                    onRegenerate={() => onRegenerateMessage(msg.id)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
