/**
 * OfflineIndicator — small chip shown in the header when the browser
 * is offline. Warns about disabled cloud features.
 */

import { useState, useEffect, useCallback } from 'react'

interface Props {
  online: boolean
}

export function OfflineIndicator({ online }: Props) {
  if (online) return null

  const [visible, setVisible] = useState(true)

  // Auto-hide after 15 seconds so it doesn't nag forever
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 15_000)
    return () => clearTimeout(timer)
  }, [visible])

  const handleDismiss = useCallback(() => setVisible(false), [])

  return (
    <div className="offline-indicator">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="offline-indicator-text">
        You are offline — WebDAV, MCP and plugins are disabled
      </span>
      <button
        className="offline-indicator-dismiss"
        onClick={handleDismiss}
        title="Dismiss"
        aria-label="Dismiss offline notice"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
