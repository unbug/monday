/**
 * WebDAVSettings — UI for configuring and managing WebDAV sync.
 *
 * Users can:
 * - Enter a WebDAV server URL, username, and password
 * - Test the connection
 * - Upload / download / sync data
 * - Remove saved config
 */

import { useState, useCallback } from 'react'
import { useWebDAV } from '../hooks/useWebDAV'
import type { WebDAVConfig } from '../lib/webdav'

interface Props {
  onBack: () => void
  onSyncComplete: (success: boolean, message: string) => void
}

export function WebDAVSettings({ onBack, onSyncComplete }: Props) {
  const {
    config,
    hasConfig,
    url,
    setUrl,
    setUsername,
    setPassword,
    hasChanges,
    saveConfig,
    removeConfig,
    testConnection,
    upload,
    download,
    sync,
    connectionStatus,
    lastSyncTimestamp,
    loading,
  } = useWebDAV()

  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncDirection, setSyncDirection] = useState<'upload' | 'download' | 'both'>('both')
  const [showPassword, setShowPassword] = useState(false)

  const handleTest = useCallback(async () => {
    setTesting(true)
    const result = await testConnection()
    setTesting(false)
    if (result.connected) {
      onSyncComplete(true, 'Connected to WebDAV server successfully.')
    } else {
      onSyncComplete(false, result.error ?? 'Connection failed.')
    }
  }, [testConnection, onSyncComplete])

  const handleSave = useCallback(() => {
    saveConfig()
    onSyncComplete(true, 'WebDAV config saved.')
  }, [saveConfig, onSyncComplete])

  const handleRemove = useCallback(() => {
    removeConfig()
    onSyncComplete(true, 'WebDAV config removed.')
  }, [removeConfig, onSyncComplete])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    const result = await sync(syncDirection)
    setSyncing(false)
    onSyncComplete(result.success, result.message)
  }, [sync, syncDirection, onSyncComplete])

  const handleDataLoaded = useCallback(
    async (data: Uint8Array) => {
      // Trigger a reload to restore the imported data
      window.location.reload()
    },
    [],
  )

  const handleDownload = useCallback(async () => {
    setSyncing(true)
    const result = await download(handleDataLoaded)
    setSyncing(false)
    if (result.success) {
      onSyncComplete(true, result.message)
    } else {
      onSyncComplete(false, result.message)
    }
  }, [download, onSyncComplete])

  const handleUpload = useCallback(async () => {
    setSyncing(true)
    const result = await upload()
    setSyncing(false)
    onSyncComplete(result.success, result.message)
  }, [upload, onSyncComplete])

  const formatTimestamp = (ts: number | null): string => {
    if (!ts) return 'Never'
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="webdav-settings">
      <div className="webdav-settings-header">
        <button className="webdav-settings-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          WebDAV Sync
        </button>
      </div>

      {/* Connection status */}
      {hasConfig && connectionStatus && (
        <div className={`webdav-settings-status ${connectionStatus.connected ? 'webdav-status-ok' : 'webdav-status-error'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {connectionStatus.connected ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          <span>{connectionStatus.connected ? 'Connected' : connectionStatus.error}</span>
        </div>
      )}

      {/* Last sync info */}
      {hasConfig && lastSyncTimestamp && (
        <div className="webdav-settings-last-sync">
          Last sync: {formatTimestamp(lastSyncTimestamp)}
        </div>
      )}

      {/* Config form */}
      <div className="webdav-settings-form">
        <h3 className="webdav-settings-section-title">WebDAV Server</h3>
        <p className="webdav-settings-hint">
          Enter your WebDAV server details to sync your Monday data across devices.
          {hasConfig && (
            <span className="webdav-settings-configured">
              {' '}
              <span className="webdav-configured-badge">✓ Configured</span>
            </span>
          )}
        </p>

        <div className="webdav-settings-input">
          <label className="webdav-settings-label">Server URL</label>
          <input
            className="webdav-settings-url-input"
            type="url"
            placeholder="https://dav.example.com/remote.php/dav/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="webdav-settings-input">
          <label className="webdav-settings-label">Username</label>
          <input
            className="webdav-settings-username-input"
            type="text"
            placeholder="your-username"
            value={hasConfig ? config?.username ?? '' : ''}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="webdav-settings-input">
          <label className="webdav-settings-label">Password</label>
          <div className="webdav-settings-password-wrap">
            <input
              className="webdav-settings-password-input"
              type={showPassword ? 'text' : 'password'}
              placeholder={hasConfig ? '••••••••' : 'your-password'}
              value={hasConfig ? config?.password ?? '' : ''}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              className="webdav-settings-toggle-password"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="webdav-settings-actions">
          <button
            className="webdav-settings-test-btn"
            onClick={handleTest}
            disabled={testing || loading}
          >
            {testing ? (
              <>
                <span className="webdav-settings-spinner" />
                Testing…
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          {hasChanges ? (
            <button
              className="webdav-settings-save-btn"
              onClick={handleSave}
              disabled={loading}
            >
              Save Config
            </button>
          ) : (
            <button
              className="webdav-settings-remove-btn"
              onClick={handleRemove}
              disabled={loading}
            >
              Remove Config
            </button>
          )}
        </div>
      </div>

      {/* Sync actions */}
      {hasConfig && (
        <div className="webdav-settings-sync">
          <h3 className="webdav-settings-section-title">Sync Data</h3>
          <p className="webdav-settings-hint">
            Upload your current data to WebDAV, download data from WebDAV, or sync both ways.
            Downloading will replace your current data — make sure to export first if needed.
          </p>

          <div className="webdav-settings-direction">
            <button
              className={`webdav-direction-btn ${syncDirection === 'upload' ? 'webdav-direction-active' : ''}`}
              onClick={() => setSyncDirection('upload')}
            >
              Upload
            </button>
            <button
              className={`webdav-direction-btn ${syncDirection === 'both' ? 'webdav-direction-active' : ''}`}
              onClick={() => setSyncDirection('both')}
            >
              Both
            </button>
            <button
              className={`webdav-direction-btn ${syncDirection === 'download' ? 'webdav-direction-active' : ''}`}
              onClick={() => setSyncDirection('download')}
            >
              Download
            </button>
          </div>

          <div className="webdav-settings-sync-actions">
            <button
              className="webdav-settings-sync-btn webdav-settings-upload-btn"
              onClick={handleUpload}
              disabled={syncing || loading}
            >
              {syncing ? (
                <>
                  <span className="webdav-settings-spinner" />
                  Uploading…
                </>
              ) : (
                'Upload to WebDAV'
              )}
            </button>
            <button
              className="webdav-settings-sync-btn webdav-settings-download-btn"
              onClick={handleDownload}
              disabled={syncing || loading}
            >
              {syncing ? (
                <>
                  <span className="webdav-settings-spinner" />
                  Downloading…
                </>
              ) : (
                'Download from WebDAV'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasConfig && (
        <div className="webdav-settings-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="webdav-settings-empty-icon">
            <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9" />
            <path d="M12 3v9l6-3" />
          </svg>
          <p className="webdav-settings-empty-text">No WebDAV server configured.</p>
          <p className="webdav-settings-empty-hint">
            Enter your WebDAV server details above to enable cross-device sync.
          </p>
        </div>
      )}

      {/* CORS notice */}
      {hasConfig && (
        <div className="webdav-settings-cors-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            If connection fails with a CORS error, use a CORS proxy or browser extension
            (e.g., "CORS Unblock") to allow cross-origin requests.
          </span>
        </div>
      )}
    </div>
  )
}
