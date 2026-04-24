import { memo, useCallback, useRef } from 'react'

interface ImageItem {
  id: string
  data: string
  name?: string
}

interface Props {
  images: ImageItem[]
  onRemove: (id: string) => void
  onClear: () => void
}

export const ImagePreview = memo(function ImagePreview({
  images,
  onRemove,
  onClear,
}: Props) {
  if (images.length === 0) return null

  const handleRemove = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onRemove(id)
    },
    [onRemove],
  )

  return (
    <div className="image-preview">
      <div className="image-preview-list">
        {images.map((img) => (
          <div key={img.id} className="image-preview-item">
            <img
              src={img.data}
              alt={img.name || 'uploaded image'}
              className="image-preview-thumb"
            />
            <button
              className="image-preview-remove"
              onClick={handleRemove(img.id)}
              title="Remove image"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button className="image-preview-clear" onClick={onClear}>
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
