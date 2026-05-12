/**
 * McpServerManager — UI for managing MCP (Model Context Protocol) servers.
 *
 * Users can add MCP servers by WebSocket URL, view connection status
 * and available tools, and remove servers.
 */

import { useState, useCallback, useEffect } from 'react'
import { useMcpServers } from '../hooks/useMcpServers'
import {
  autoDiscoverPlaywrightMcp,
  testPlaywrightMcpConnection,
  connectPlaywrightMcp,
  disconnectPlaywrightMcp,
  listPlaywrightMcpTools,
  getPlaywrightMcpState,
  isPlaywrightMcpConnected,
  setOnMcpStateChange,
} from '../lib/playwrightMcp'
import {
  loadPlaywrightMcpSettings,
  savePlaywrightMcpSettings,
  deletePlaywrightMcpSettings,
} from '../lib/storage'
import type { PlaywrightMcpSettings } from '../types'
import { t } from '../lib/i18n'
import type { McpTool } from '../types'

interface Props {
  onBack: () => void
  offline: boolean
}

export function McpServerManager({ onBack, offline }: Props) {
  const { state, addServer, removeServer, reconnectServer } = useMcpServers()
  const [url, setUrl] = useState('')
  const [connecting, setConnecting] = useState(false)

  // v1.3.4: Playwright MCP bridge state
  const [pwSettings, setPwSettings] = useState<PlaywrightMcpSettings | null>(null)
  const [pwConnecting, setPwConnecting] = useState(false)
  const [pwDiscovering, setPwDiscovering] = useState(false)
  const [pwTestResult, setPwTestResult] = useState<'ok' | 'error' | null>(null)
  const [pwTools, setPwTools] = useState<McpTool[]>([])
  const [pwDomainAllowlist, setPwDomainAllowlist] = useState('')
  const [pwBlockedOrigins, setPwBlockedOrigins] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // Load saved Playwright MCP settings
  useEffect(() => {
    loadPlaywrightMcpSettings().then((s) => {
      if (s) {
        setPwSettings(s)
        setPwDomainAllowlist((s.domainAllowlist || []).join('\n'))
        setPwBlockedOrigins((s.blockedOrigins || []).join('\n'))
      }
    }).catch(() => {})
  }, [])

  // v1.3.4: Auto-discover @playwright/mcp on mount
  useEffect(() => {
    if (offline) return
    autoDiscoverPlaywrightMcp().then((foundUrl) => {
      if (foundUrl && (!pwSettings || pwSettings.url !== foundUrl)) {
        setPwSettings((prev) => prev ? { ...prev, url: foundUrl } : { url: foundUrl, domainAllowlist: [], blockedOrigins: [] })
      }
    }).catch(() => {})
  }, [offline])

  // v1.3.4: Listen for MCP connection state changes
  useEffect(() => {
    const unsubscribe = setOnMcpStateChange((state) => {
      if (state.status === 'connected') {
        setPwTools(state.tools)
      }
    })
    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  const handlePwAutoDiscover = useCallback(async () => {
    setPwDiscovering(true)
    setPwTestResult(null)
    try {
      const foundUrl = await autoDiscoverPlaywrightMcp()
      if (foundUrl) {
        setPwTestResult('ok')
        setPwSettings((prev) => prev ? { ...prev, url: foundUrl } : { url: foundUrl, domainAllowlist: [], blockedOrigins: [] })
      } else {
        setPwTestResult('error')
      }
    } catch {
      setPwTestResult('error')
    }
    setPwDiscovering(false)
  }, [])

  const handlePwConnect = useCallback(async () => {
    if (!pwSettings?.url) return
    setPwConnecting(true)
    setPwTestResult(null)
    try {
      // Forward domain allowlist + blocked origins to Playwright MCP
      const success = await connectPlaywrightMcp(pwSettings.url, {
        domainAllowlist: pwDomainAllowlist.split('\n').map((s) => s.trim()).filter(Boolean),
        blockedOrigins: pwBlockedOrigins.split('\n').map((s) => s.trim()).filter(Boolean),
      })
      if (success) {
        setPwTestResult('ok')
        const tools = await listPlaywrightMcpTools()
        setPwTools(tools)
      } else {
        setPwTestResult('error')
      }
    } catch {
      setPwTestResult('error')
    }
    setPwConnecting(false)
  }, [pwSettings])

  const handlePwDisconnect = useCallback(async () => {
    disconnectPlaywrightMcp()
    setPwTools([])
    setPwTestResult(null)
  }, [])

  const handlePwSaveSettings = useCallback(async () => {
    if (!pwSettings) return
    setSavingPw(true)
    try {
      const settings: PlaywrightMcpSettings = {
        url: pwSettings.url,
        domainAllowlist: pwDomainAllowlist.split('\n').map((s) => s.trim()).filter(Boolean),
        blockedOrigins: pwBlockedOrigins.split('\n').map((s) => s.trim()).filter(Boolean),
      }
      await savePlaywrightMcpSettings(settings)
      setPwSettings(settings)
    } catch {
      // ignore save errors
    }
    setSavingPw(false)
  }, [pwSettings, pwDomainAllowlist, pwBlockedOrigins])

  const handlePwClearSettings = useCallback(async () => {
    await deletePlaywrightMcpSettings()
    setPwSettings(null)
    setPwDomainAllowlist('')
    setPwBlockedOrigins('')
    setPwTools([])
    setPwTestResult(null)
    if (isPlaywrightMcpConnected()) {
      disconnectPlaywrightMcp()
    }
  }, [])

  const handleAdd = useCallback(async () => {
    if (!url.trim()) return
    setConnecting(true)
    const success = await addServer(url.trim())
    if (success) {
      setUrl('')
    }
    setConnecting(false)
  }, [url, addServer])

  const handleRemove = useCallback(
    (id: string) => {
      removeServer(id)
    },
    [removeServer],
  )

  const handleReconnect = useCallback(
    async (id: string) => {
      await reconnectServer(id)
    },
    [reconnectServer],
  )

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#22c55e'
      case 'connecting': return '#eab308'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className="mcp-server-manager">
      <div className="mcp-server-manager-header">
        <h2 className="mcp-server-manager-title">MCP Servers</h2>
        <span className="mcp-server-manager-count">{state.servers.length} server{state.servers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Offline notice */}
      {offline && (
        <div className="mcp-server-manager-offline-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>MCP server connections require an internet connection.</span>
        </div>
      )}

      {/* Add server form */}
      <div className="mcp-server-manager-add">
        <h3 className="mcp-server-manager-section-title">Add MCP Server</h3>
        <p className="mcp-server-manager-hint">
          Enter the WebSocket URL of an MCP server (e.g., <code>ws://localhost:3001/mcp</code>).
          The server must implement the MCP JSON-RPC 2.0 protocol.
        </p>
        <div className="mcp-server-manager-input-row">
          <input
            className="mcp-server-manager-url-input"
            type="url"
            placeholder="ws://localhost:3001/mcp"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            disabled={connecting || offline}
          />
          <button
            className="mcp-server-manager-add-btn"
            onClick={handleAdd}
            disabled={connecting || !url.trim() || offline}
          >
            {connecting ? (
              <>
                <span className="mcp-server-manager-spinner" />
                Connecting…
              </>
            ) : (
              'Add Server'
            )}
          </button>
        </div>
        {state.error && (
          <div className="mcp-server-manager-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {state.error}
          </div>
        )}
      </div>

      {/* Server list */}
      {state.servers.length > 0 && (
        <div className="mcp-server-manager-list">
          <h3 className="mcp-server-manager-section-title">Connected Servers</h3>
          {state.servers.map((server) => (
            <div key={server.id} className="mcp-server-manager-card">
              <div className="mcp-server-manager-card-header">
                <div className="mcp-server-manager-card-info">
                  <span className="mcp-server-manager-card-name">{server.displayName}</span>
                  <span
                    className="mcp-server-manager-status-dot"
                    style={{ backgroundColor: statusColor(server.status) }}
                  />
                  <span className={`mcp-server-manager-status-text mcp-server-manager-status-${server.status}`}>
                    {server.status === 'connected' ? 'Connected' :
                     server.status === 'connecting' ? 'Connecting…' :
                     server.status === 'error' ? 'Error' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <p className="mcp-server-manager-card-url" title={server.url}>
                {server.url}
              </p>
              {server.error && (
                <div className="mcp-server-manager-card-error">{server.error}</div>
              )}
              {server.tools.length > 0 && (
                <div className="mcp-server-manager-tools">
                  <span className="mcp-server-manager-tools-label">
                    {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''} available
                  </span>
                  <div className="mcp-server-manager-tools-list">
                    {server.tools.map((tool) => (
                      <span key={tool.name} className="mcp-server-manager-tool-tag" title={tool.description}>
                        {tool.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mcp-server-manager-card-actions">
                {server.status === 'error' && (
                  <button
                    className="mcp-server-manager-reconnect-btn"
                    onClick={() => handleReconnect(server.id)}
                  >
                    Reconnect
                  </button>
                )}
                <button
                  className="mcp-server-manager-remove-btn"
                  onClick={() => handleRemove(server.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* v1.3.4: Playwright MCP Bridge Section */}
      <div className="mcp-server-manager-pw-section">
        <div className="mcp-server-manager-pw-header">
          <h3 className="mcp-server-manager-pw-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:'inline-block',verticalAlign:'middle',marginRight:6}}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
            {t('playwrightMcp.title')}
          </h3>
          {isPlaywrightMcpConnected() && (
            <span className="mcp-server-manager-pw-status mcp-server-manager-pw-connected">
              {t('playwrightMcp.connected')}
            </span>
          )}
        </div>
        <p className="mcp-server-manager-pw-desc">
          {t('playwrightMcp.desc')}
        </p>

        {/* Connection controls */}
        <div className="mcp-server-manager-pw-conn-row">
          <input
            className="mcp-server-manager-pw-url-input"
            type="url"
            placeholder={t('playwrightMcp.placeholderUrl')}
            value={pwSettings?.url ?? ''}
            onChange={(e) => setPwSettings(pwSettings ? { ...pwSettings, url: e.target.value } : { url: e.target.value, domainAllowlist: [], blockedOrigins: [] })}
            disabled={pwConnecting || pwDiscovering || isPlaywrightMcpConnected()}
          />
          <button
            className="mcp-server-manager-pw-discover-btn"
            onClick={handlePwAutoDiscover}
            disabled={pwDiscovering || offline}
          >
            {pwDiscovering ? (
              <>
                <span className="mcp-server-manager-pw-spinner" />
                {t('playwrightMcp.discovering')}
              </>
            ) : (
              t('playwrightMcp.autoDiscover')
            )}
          </button>
          {!isPlaywrightMcpConnected() ? (
            <button
              className="mcp-server-manager-pw-connect-btn"
              onClick={handlePwConnect}
              disabled={pwConnecting || !pwSettings?.url || offline}
            >
              {pwConnecting ? t('playwrightMcp.connecting') : t('playwrightMcp.connect')}
            </button>
          ) : (
            <button
              className="mcp-server-manager-pw-disconnect-btn"
              onClick={handlePwDisconnect}
            >
              {t('playwrightMcp.disconnect')}
            </button>
          )}
        </div>
        {pwTestResult === 'ok' && (
          <span className="mcp-server-manager-pw-status mcp-server-manager-pw-discovered">
            {t('playwrightMcp.discovered')}
          </span>
        )}
        {pwTestResult === 'error' && pwDiscovering === false && (
          <span className="mcp-server-manager-pw-status mcp-server-manager-pw-error">
            {t('playwrightMcp.notFound')}
          </span>
        )}

        {/* Domain allowlist + blocked origins */}
        <div className="mcp-server-manager-pw-config">
          <div className="mcp-server-manager-pw-config-field">
            <label className="mcp-server-manager-pw-config-label">{t('playwrightMcp.domainAllowlist')}</label>
            <textarea
              className="mcp-server-manager-pw-config-textarea"
              placeholder={t('playwrightMcp.domainAllowlistHint')}
              value={pwDomainAllowlist}
              onChange={(e) => setPwDomainAllowlist(e.target.value)}
              rows={3}
            />
          </div>
          <div className="mcp-server-manager-pw-config-field">
            <label className="mcp-server-manager-pw-config-label">{t('playwrightMcp.blockedOrigins')}</label>
            <textarea
              className="mcp-server-manager-pw-config-textarea"
              placeholder={t('playwrightMcp.blockedOriginsHint')}
              value={pwBlockedOrigins}
              onChange={(e) => setPwBlockedOrigins(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="mcp-server-manager-pw-actions">
          <button
            className="mcp-server-manager-pw-save-btn"
            onClick={handlePwSaveSettings}
            disabled={savingPw || !pwSettings?.url}
          >
            {savingPw ? t('playwrightMcp.saved') : t('playwrightMcp.save')}
          </button>
          <button
            className="mcp-server-manager-pw-clear-btn"
            onClick={handlePwClearSettings}
          >
            {t('playwrightMcp.clear')}
          </button>
        </div>

        {/* Available tools */}
        {pwTools.length > 0 && (
          <div className="mcp-server-manager-pw-tools">
            <h4 className="mcp-server-manager-pw-tools-title">{t('playwrightMcp.toolsTitle')}</h4>
            <div className="mcp-server-manager-pw-tools-list">
              {pwTools.map((tool) => (
                <div key={tool.name} className="mcp-server-manager-pw-tool-card">
                  <span className="mcp-server-manager-pw-tool-name">{tool.name}</span>
                  {tool.displayName && (
                    <span className="mcp-server-manager-pw-tool-display">{tool.displayName}</span>
                  )}
                  {tool.description && (
                    <span className="mcp-server-manager-pw-tool-desc">{tool.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {isPlaywrightMcpConnected() && pwTools.length === 0 && (
          <div className="mcp-server-manager-pw-no-tools">
            {t('playwrightMcp.noTools')}
          </div>
        )}
      </div>

      {/* Empty state */}
      {state.servers.length === 0 && !connecting && (
        <div className="mcp-server-manager-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mcp-server-manager-empty-icon">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <p className="mcp-server-manager-empty-text">No MCP servers connected.</p>
          <p className="mcp-server-manager-empty-hint">
            Add a server by entering its WebSocket URL above.
          </p>
        </div>
      )}
    </div>
  )
}
