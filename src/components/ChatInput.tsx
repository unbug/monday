import { useState, useRef, useCallback, useEffect } from 'react'
import { BorderBeam } from 'border-beam'
import { PROMPT_TEMPLATES } from '../lib/prompts'
import { ImagePreview } from './ImagePreview'
import { FileAttachment } from './FileAttachment'
import { useVoiceInput } from '../hooks/useVoiceInput'
import type { ModelInfo } from '../types'

interface ImageItem {
  id: string
  data: string
  name?: string
}

interface FileItem {
  id: string
  name: string
  size: number
  type: string
  content: string
}

interface Props {
  onSend: (content: string, images?: ImageItem[], files?: FileItem[]) => void
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
}

export function ChatInput({
  onSend,
  onStop,
  onApplyPersona,
  isGenerating,
  disabled,
  modelInfo,
  tokenStats,
  isStreaming,
}: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSlashHint, setShowSlashHint] = useState(false)
  const [images, setImages] = useState<ImageItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Voice input
  const voiceInput = useVoiceInput(
    useCallback((transcript: string) => {
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
    }, []),
  )

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!voiceInput.error) return
    const timer = setTimeout(() => voiceInput.clearError(), 5000)
    return () => clearTimeout(timer)
  }, [voiceInput.error, voiceInput.clearError])

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

  const TEXT_TYPES = new Set([
    'text/plain',
    'text/markdown',
    'text/html',
    'text/css',
    'text/javascript',
    'text/x-typescript',
    'application/json',
    'application/xml',
    'application/x-httpd-eruby',
    'application/x-sh',
    'application/x-python',
    'application/x-perl',
    'application/x-ruby',
    'application/x-shellscript',
    'application/x-www-form-urlencoded',
  ])

  function canReadAsText(type: string): boolean {
    if (TEXT_TYPES.has(type)) return true
    if (type.startsWith('text/') || type.startsWith('application/json') || type.startsWith('application/xml')) return true
    return false
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newImages: ImageItem[] = []
      const newFiles: FileItem[] = []
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const data = await compressImage(file)
          newImages.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            data,
            name: file.name,
          })
        } else if (file.size <= 500_000 && canReadAsText(file.type)) {
          const content = await readFileAsText(file)
          newFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            content,
          })
        }
      }
      setImages((prev) => [...prev, ...newImages])
      setFiles((prev) => [...prev, ...newFiles])
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

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleClearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const handleSend = useCallback(() => {
    if ((!input.trim() && images.length === 0 && files.length === 0) || disabled) return

    onSend(input.trim(), images.length > 0 ? images : undefined, files.length > 0 ? files : undefined)
    setInput('')
    setImages([])
    setFiles([])
    setShowSlashHint(false)
  }, [input, images, files, disabled, onSend])

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
      {isVisionModel && images.length > 0 && (
        <ImagePreview
          images={images}
          onRemove={handleRemoveImage}
          onClear={handleClearImages}
        />
      )}
      {files.length > 0 && (
        <FileAttachment
          files={files}
          onRemove={handleRemoveFile}
          onClear={handleClearFiles}
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
        <div
          className="chat-input-container"
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            handleFileSelect(e.dataTransfer.files)
          }}
        >
          <button
            className="chat-input-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file"
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
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.md,.json,.xml,.html,.css,.js,.ts,.py,.rb,.sh,.yaml,.yml,.toml,.csv,.log"
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
          {voiceInput.isSupported && !isGenerating && (
            <>
              <button
                className={`chat-btn chat-btn-voice ${
                  voiceInput.isListening ? 'listening' : ''
                }`}
                onClick={
                  voiceInput.isListening
                    ? voiceInput.stopListening
                    : voiceInput.startListening
                }
                title={
                  voiceInput.isListening
                    ? 'Stop listening'
                    : 'Voice input'
                }
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              {voiceInput.isListening && voiceInput.interimTranscript && (
                <span className="voice-interim">
                  ♪ {voiceInput.interimTranscript}
                </span>
              )}
            </>
          )}
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
              disabled={disabled || (!input.trim() && images.length === 0 && files.length === 0)}
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
