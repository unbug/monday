import { useRef, useEffect } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
}

export function MessageList({ messages }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
            <div className="message-text">
              {msg.content}
              {msg.isStreaming && <span className="cursor-blink">|</span>}
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
