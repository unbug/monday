import { useState, useRef, useEffect } from 'react'

interface Props {
  messageContent: string
  isUser: boolean
  isStreaming: boolean
  onEdit: (content: string) => void
  onRegenerate: () => void
}

export function MessageActions({
  messageContent,
  isUser,
  isStreaming,
  onEdit,
  onRegenerate,
}: Props) {
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(messageContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Place cursor at the end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  useEffect(() => {
    setEditContent(messageContent)
  }, [messageContent])

  const handleSave = () => {
    if (editContent.trim()) {
      onEdit(editContent.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditContent(messageContent)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  // Only show actions for user messages
  if (!isUser) return null

  return (
    <div
      className="message-actions"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        if (!isEditing) setShowActions(false)
      }}
    >
      {isEditing ? (
        <div className="message-actions-edit">
          <textarea
            ref={textareaRef}
            className="message-edit-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <div className="message-edit-actions">
            <button
              className="message-edit-btn message-edit-save"
              onClick={handleSave}
              disabled={!editContent.trim()}
            >
              Save
            </button>
            <button
              className="message-edit-btn message-edit-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="message-actions-buttons">
          <button
            className="message-action-btn"
            onClick={() => setIsEditing(true)}
            title="Edit message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            className="message-action-btn"
            onClick={onRegenerate}
            disabled={isStreaming}
            title={isStreaming ? 'Generating...' : 'Regenerate response'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isStreaming ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      )}
    </div>
  )
}
