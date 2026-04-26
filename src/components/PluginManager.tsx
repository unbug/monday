/**
 * PluginManager — UI for installing and managing third-party tool plugins.
 *
 * Users paste a plugin manifest URL to install a plugin.
 * Installed plugins appear in a list with status indicators and a remove button.
 */

import { useState, useCallback } from 'react'
import { usePluginManager } from '../hooks/usePluginManager'

interface Props {
  onBack: () => void
  offline: boolean
}

export function PluginManager({ onBack, offline }: Props) {
  const { state, install, remove } = usePluginManager()
  const [url, setUrl] = useState('')
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const handleInstall = useCallback(async () => {
    if (!url.trim()) return
    setInstalling(true)
    setInstallError(null)

    const success = await install(url.trim())
    setInstalling(false)

    if (!success) {
      setInstallError(state.error || 'Failed to install plugin')
    } else {
      setUrl('')
      setInstallError(null)
    }
  }, [url, install, state.error])

  const handleRemove = useCallback(
    (id: string) => {
      remove(id)
    },
    [remove],
  )

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-header">
        <button className="plugin-manager-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Plugins
        </button>
        <span className="plugin-manager-count">{state.plugins.length} plugin{state.plugins.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Offline notice */}
      {offline && (
        <div className="plugin-manager-offline-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Plugin installation requires an internet connection.</span>
        </div>
      )}

      {/* Install form */}
      <div className="plugin-manager-install">
        <h3 className="plugin-manager-section-title">Install Plugin</h3>
        <p className="plugin-manager-hint">
          Paste a plugin manifest URL to install a third-party tool plugin.
          The manifest must be valid JSON with <code>id</code>, <code>name</code>, <code>description</code>, <code>version</code>, <code>inputSchema</code>, and <code>handlerUrl</code> fields.
        </p>
        <div className="plugin-manager-input-row">
          <input
            className="plugin-manager-url-input"
            type="url"
            placeholder="https://example.com/manifest.json"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInstall()
            }}
            disabled={installing}
          />
          <button
            className="plugin-manager-install-btn"
            onClick={handleInstall}
            disabled={installing || !url.trim() || offline}
          >
            {installing ? (
              <>
                <span className="plugin-manager-spinner" />
                Installing…
              </>
            ) : (
              'Install'
            )}
          </button>
        </div>
        {installError && (
          <div className="plugin-manager-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {installError}
          </div>
        )}
      </div>

      {/* Plugin list */}
      {state.plugins.length > 0 && (
        <div className="plugin-manager-list">
          <h3 className="plugin-manager-section-title">Installed Plugins</h3>
          {state.plugins.map((plugin) => (
            <div key={plugin.id} className="plugin-manager-card">
              <div className="plugin-manager-card-header">
                <div className="plugin-manager-card-info">
                  <span className="plugin-manager-card-name">{plugin.name}</span>
                  <span className="plugin-manager-card-version">v{plugin.version}</span>
                </div>
                <span className={`plugin-manager-status ${plugin.loaded ? 'status-loaded' : 'status-error'}`}>
                  {plugin.loaded ? '✓ Loaded' : '✗ Error'}
                </span>
              </div>
              <p className="plugin-manager-card-desc">{plugin.description}</p>
              <div className="plugin-manager-card-meta">
                <span className="plugin-manager-card-url" title={plugin.manifestUrl}>
                  {new URL(plugin.manifestUrl).hostname}
                </span>
                <span className="plugin-manager-card-date">
                  Installed {new Date(plugin.installedAt).toLocaleDateString()}
                </span>
              </div>
              {plugin.error && (
                <div className="plugin-manager-card-error">
                  {plugin.error}
                </div>
              )}
              <button
                className="plugin-manager-remove-btn"
                onClick={() => handleRemove(plugin.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {state.plugins.length === 0 && !installing && (
        <div className="plugin-manager-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="plugin-manager-empty-icon">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <p className="plugin-manager-empty-text">No plugins installed yet.</p>
          <p className="plugin-manager-empty-hint">
            Install a third-party plugin by pasting its manifest URL above.
          </p>
        </div>
      )}
    </div>
  )
}
