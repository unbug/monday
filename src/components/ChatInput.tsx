import { useState, useRef, useCallback, useEffect } from 'react'
import { BorderBeam } from 'border-beam'
import { PROMPT_TEMPLATES } from '../lib/prompts'
import { ContextPanel } from './ContextPanel'
import { ImagePreview } from './ImagePreview'
import type { ModelInfo } from '../types'

interface ImageItem {
  id: string
  data: string
  name?: string
}

interface Props {
  sessionId?: string
  onSend: (content: string, images?: ImageItem[]) => void
  onStop: () => void
  onApplyPersona: (personaId: string) => void
  isGenerating: boolean
  disabled: boolean
  modelInfo?: ModelInfo | null
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
  modelInfo,
  tokenStats,
  isStreaming,
  context = '',
  onContextChange,
}: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSlashHint, setShowSlashHint] = useState(false)
  const [images, setImages] = useState<ImageItem[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if current model supports vision
  const isVisionModel = modelInfo?.tags?.includes('vision') ?? false

  // Compress image to max 1MB to avoid oversized payloads
  const compressImage = useCallback(
    (file: File, maxWidth = 1920): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              resolve(e.target?.result as string)
              return
            }

            ctx.drawImage(img, 0, 0, width, height)

            // Try webp first, fallback to jpeg
            let dataUrl = canvas.toDataURL('image/webp', 0.85)
            if (dataUrl.length > 1_000_000) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            }
            resolve(dataUrl)
          }
          img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
      })
    },
    [],
  )

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newImages: ImageItem[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const data = await compressImage(file)
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          data,
          name: file.name,
        })
      }
      setImages((prev) => [...prev, ...newImages])
    },
    [compressImage],
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith('image/'),
      )
      if (imageItems.length === 0) return

      e.preventDefault()
      for (const item of imageItems) {
        const file = item.getAsFile()
        if (!file) continue
        const data = await compressImage(file)
        setImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            data,
            name: file.name || 'pasted-image',
          },
        ])
      }
    },
    [compressImage],
  )

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const handleClearImages = useCallback(() => {
    setImages([])
  }, [])

  const handleSend = useCallback(() => {
    if ((!input.trim() && images.length === 0) || disabled) return

    onSend(input.trim(), images.length > 0 ? images : undefined)
    setInput('')
    setImages([])
    setShowSlashHint(false)
  }, [input, images, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setInput(val)
      if (val.endsWith('/')) {
        setShowSlashHint(true)
      } else {
        setShowSlashHint(false)
      }
    },
    [],
  )

  return (
    <div className="chat-input-wrapper">
      {sessionId && (
        <ContextPanel
          sessionId={sessionId}
          onContextChange={onContextChange ?? (() => {})}
        />
      )}
      {isVisionModel && images.length > 0 && (
        <ImagePreview
          images={images}
          onRemove={handleRemoveImage}
          onClear={handleClearImages}
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
          {isVisionModel && (
            <button
              className="chat-input-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Add image"
              type="button"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="chat-input-file-input"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={disabled}
          />
          <textarea
            className="chat-input"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            placeholder={
              disabled
                ? 'Select and load a model to start chatting...'
                : images.length > 0
                  ? 'Add a message or remove images above...'
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
              disabled={disabled || (!input.trim() && images.length === 0)}
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
