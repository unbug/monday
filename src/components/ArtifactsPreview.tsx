import { useState, useRef, useEffect, useCallback } from 'react'

type ArtifactType = 'html' | 'svg'

interface Props {
  content: string
  type: ArtifactType
  onClose: () => void
  title?: string
}

export function ArtifactsPreview({ content, type, onClose, title }: Props) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  // Reload iframe when content changes
  useEffect(() => {
    setReloadKey((k) => k + 1)
  }, [content])

  const htmlPreview = type === 'svg'
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">${content}</svg>`
    : `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #ffffff; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
${content}
</body>
</html>`

  return (
    <div className="artifacts-panel">
      <div className="artifacts-header">
        <div className="artifacts-header-left">
          <span className="artifacts-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </span>
          <span className="artifacts-title">{title || `${type === 'html' ? 'HTML' : 'SVG'} Preview`}</span>
          <span className="artifacts-badge">{type.toUpperCase()}</span>
        </div>
        <div className="artifacts-header-right">
          <button
            className="artifacts-tab-btn"
            onClick={() => setActiveTab('preview')}
            disabled={activeTab === 'preview'}
          >
            Preview
          </button>
          <button
            className="artifacts-tab-btn"
            onClick={() => setActiveTab('code')}
            disabled={activeTab === 'code'}
          >
            Code
          </button>
          <button
            className="artifacts-action-btn"
            onClick={handleReload}
            title="Reload preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <button
            className="artifacts-close-btn"
            onClick={onClose}
            title="Close preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="artifacts-body">
        {activeTab === 'preview' ? (
          <div className="artifacts-preview-container">
            <iframe
              ref={iframeRef}
              key={reloadKey}
              className="artifacts-iframe"
              srcDoc={htmlPreview}
              title="Artifact preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <pre className="artifacts-code">{content}</pre>
        )}
      </div>
    </div>
  )
}
