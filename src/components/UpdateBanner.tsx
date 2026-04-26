import { useCallback } from 'react'

interface UpdateBannerProps {
  onReload: () => void
  onDismiss: () => void
}

/**
 * Banner shown when a new service worker is installed and waiting to activate.
 * Dismissed for 24 hours via localStorage.
 */
export function UpdateBanner({ onReload, onDismiss }: UpdateBannerProps) {
  const handleReload = useCallback(() => {
    onReload()
  }, [onReload])

  const handleDismiss = useCallback(() => {
    // Persist dismissal for 24 hours
    localStorage.setItem('monday-update-dismissed', Date.now().toString())
    onDismiss()
  }, [onDismiss])

  // Check if recently dismissed
  const dismissedAt = localStorage.getItem('monday-update-dismissed')
  if (dismissedAt) {
    const hoursSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60)
    if (hoursSince < 24) return null
    // Expired — show again
    localStorage.removeItem('monday-update-dismissed')
  }

  return (
    <div className="update-banner">
      <div className="update-banner-content">
        <span className="update-banner-icon">🔄</span>
        <span className="update-banner-text">
          <strong>Monday updated!</strong> A new version is ready. Reload to get the latest.
        </span>
      </div>
      <div className="update-banner-actions">
        <button className="update-banner-btn update-banner-btn-reload" onClick={handleReload}>
          Reload
        </button>
        <button className="update-banner-btn update-banner-btn-dismiss" onClick={handleDismiss}>
          Later
        </button>
      </div>
    </div>
  )
}
