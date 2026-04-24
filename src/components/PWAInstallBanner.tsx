interface PWAInstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

export function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-banner-content">
        <svg className="pwa-install-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9" />
        </svg>
        <span className="pwa-install-text">Install Monday for a better experience</span>
      </div>
      <div className="pwa-install-banner-actions">
        <button className="pwa-install-btn pwa-install-btn--primary" onClick={onInstall}>
          Install
        </button>
        <button className="pwa-install-btn pwa-install-btn--dismiss" onClick={onDismiss}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
