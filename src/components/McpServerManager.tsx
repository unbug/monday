/**
 * McpServerManager — UI for managing MCP (Model Context Protocol) servers.
 *
 * Users can add MCP servers by WebSocket URL, view connection status
 * and available tools, and remove servers.
 */

import { useState, useCallback } from 'react'
import { useMcpServers } from '../hooks/useMcpServers'

interface Props {
  onBack: () => void
  offline: boolean
}

export function McpServerManager({ onBack, offline }: Props) {
  const { state, addServer, removeServer, reconnectServer } = useMcpServers()
  const [url, setUrl] = useState('')
  const [connecting, setConnecting] = useState(false)

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
        <button className="mcp-server-manager-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          MCP Servers
        </button>
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
