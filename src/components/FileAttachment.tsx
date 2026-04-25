import { memo, useCallback } from 'react'

interface FileItem {
  id: string
  name: string
  size: number
  type: string
  content: string
}

interface Props {
  files: FileItem[]
  onRemove: (id: string) => void
  onClear: () => void
}

const ICON_MAP: Record<string, string> = {
  'text/plain': '📄',
  'text/markdown': '📝',
  'text/html': '🌐',
  'text/css': '🎨',
  'text/javascript': '📜',
  'application/json': '🔧',
  'application/xml': '📋',
  'text/x-typescript': '📘',
}

function getIcon(type: string): string {
  if (type in ICON_MAP) return ICON_MAP[type]
  if (type.startsWith('text/')) return '📄'
  return '📎'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const FileAttachment = memo(function FileAttachment({
  files,
  onRemove,
  onClear,
}: Props) {
  if (files.length === 0) return null

  const handleRemove = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onRemove(id)
    },
    [onRemove],
  )

  return (
    <div className="file-attachment">
      <div className="file-attachment-list">
        {files.map((file) => (
          <div key={file.id} className="file-attachment-item">
            <span className="file-attachment-icon">{getIcon(file.type)}</span>
            <div className="file-attachment-info">
              <span className="file-attachment-name" title={file.name}>
                {file.name}
              </span>
              <span className="file-attachment-size">{formatSize(file.size)}</span>
            </div>
            <button
              className="file-attachment-remove"
              onClick={handleRemove(file.id)}
              title="Remove file"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button className="file-attachment-clear" onClick={onClear}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Clear all
      </button>
    </div>
  )
})
