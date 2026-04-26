/**
 * useMcpServers — manages a list of MCP servers.
 *
 * Each server is connected via WebSocket. When connected, its tools
 * are registered with the tool registry under the prefix
 * "<serverId>_<toolName>".
 */

import { useState, useCallback, useRef } from 'react'
import { toolRegistry } from '../lib/toolRegistry'
import { McpClient } from '../lib/mcpClient'
import type { McpServer, McpTool } from '../types'

const STORAGE_KEY = 'monday:mcp-servers'

function generateServerId(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/\./g, '-').replace(/_/g, '-')
  } catch {
    return url.replace(/[^a-z0-9-]/gi, '').slice(0, 64) || 'mcp-server'
  }
}

function getDisplayName(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function loadServers(): McpServer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Omit<McpServer, 'tools'>[]
    return parsed.map((s) => ({ ...s, tools: [] }))
  } catch {
    return []
  }
}

function saveServers(servers: McpServer[]): void {
  const serialized = servers.map(({ tools: _, ...rest }) => rest)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
}

/**
 * Convert an MCP tool to a ToolDefinition suitable for the tool registry.
 */
function mcpToolToDefinition(serverId: string, tool: McpTool) {
  const fullName = `${serverId}_${tool.name}`
  return {
    name: fullName,
    description: `[MCP: ${tool.displayName}] ${tool.description}`,
    parameters: tool.inputSchema as Record<string, unknown>,
  }
}

export interface McpServersState {
  /** List of MCP servers */
  servers: McpServer[]
  /** Whether any server is currently connecting */
  isConnecting: boolean
  /** Error message from the last failed operation */
  error: string | null
}

export function useMcpServers() {
  const [state, setState] = useState<McpServersState>({
    servers: loadServers(),
    isConnecting: false,
    error: null,
  })

  // Track active MCP clients by server ID
  const clientsRef = useRef<Map<string, McpClient>>(new Map())

  /**
   * Add a new MCP server and connect to it.
   */
  const addServer = useCallback(async (url: string): Promise<boolean> => {
    // Check for duplicate
    if (state.servers.some((s) => s.url === url)) {
      setState((prev) => ({ ...prev, error: 'Server URL already added' }))
      return false
    }

    const id = generateServerId(url)
    const displayName = getDisplayName(url)

    const newServer: McpServer = {
      id,
      url,
      displayName,
      status: 'connecting',
      error: null,
      tools: [],
      addedAt: Date.now(),
    }

    setState((prev) => ({
      servers: [...prev.servers, newServer],
      isConnecting: true,
      error: null,
    }))

    // Create client and connect
    const client = new McpClient(url)

    try {
      await client.connect()

      // List tools
      const tools = await client.listTools()

      // Register tools with tool registry
      for (const tool of tools) {
        const def = mcpToolToDefinition(id, tool)
        const toolName = def.name

        // Create handler that routes through MCP client
        const handler = async (args: Record<string, unknown>): Promise<string> => {
          const mc = clientsRef.current.get(id)
          if (!mc) throw new Error('MCP client not found')
          const result = await mc.callTool(tool.name, args)
          return result
        }

        toolRegistry.register(def, handler)
      }

      // Update server state
      const updatedServer: McpServer = { ...newServer, status: 'connected', tools }
      setState((prev) => ({
        servers: prev.servers.map((s) => (s.id === id ? updatedServer : s)),
        isConnecting: false,
        error: null,
      }))

      // Save to localStorage (without tools to keep size small)
      const servers = loadServers()
      const existing = servers.findIndex((s) => s.id === id)
      if (existing >= 0) {
        servers[existing] = { ...servers[existing], url, displayName, status: 'connected', addedAt: newServer.addedAt }
      } else {
        servers.push({ id, url, displayName, status: 'connected', error: null, tools: [], addedAt: newServer.addedAt })
      }
      saveServers(servers)

      // Store client reference
      clientsRef.current.set(id, client)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'

      const errorServer: McpServer = { ...newServer, status: 'error', error: message, tools: [] }
      setState((prev) => ({
        servers: prev.servers.map((s) => (s.id === id ? errorServer : s)),
        isConnecting: false,
        error: message,
      }))

      // Save error state
      const servers = loadServers()
      const existing = servers.findIndex((s) => s.id === id)
      if (existing >= 0) {
        servers[existing] = { ...servers[existing], url, displayName, status: 'error', error: message }
      } else {
        servers.push({ id, url, displayName, status: 'error', error: message, tools: [], addedAt: newServer.addedAt })
      }
      saveServers(servers)

      return false
    }
  }, [state.servers])

  /**
   * Disconnect and remove a server.
   */
  const removeServer = useCallback((id: string) => {
    // Disconnect client
    const client = clientsRef.current.get(id)
    if (client) {
      client.disconnect()
      clientsRef.current.delete(id)
    }

    // Unregister tools
    const server = state.servers.find((s) => s.id === id)
    if (server) {
      for (const tool of server.tools) {
        toolRegistry.unregister(`${id}_${tool.name}`)
      }
    }

    // Remove from state
    setState((prev) => ({
      servers: prev.servers.filter((s) => s.id !== id),
      isConnecting: false,
      error: null,
    }))

    // Remove from localStorage
    const servers = loadServers().filter((s) => s.id !== id)
    saveServers(servers)
  }, [state.servers])

  /**
   * Reconnect a disconnected server.
   */
  const reconnectServer = useCallback(async (id: string): Promise<boolean> => {
    const server = state.servers.find((s) => s.id === id)
    if (!server) return false

    // Disconnect existing client
    const existing = clientsRef.current.get(id)
    if (existing) existing.disconnect()
    clientsRef.current.delete(id)

    // Unregister old tools
    for (const tool of server.tools) {
      toolRegistry.unregister(`${id}_${tool.name}`)
    }

    setState((prev) => ({
      servers: prev.servers.map((s) =>
        s.id === id ? { ...s, status: 'connecting' as const, error: null, tools: [] } : s,
      ),
      isConnecting: true,
      error: null,
    }))

    const client = new McpClient(server.url)

    try {
      await client.connect()
      const tools = await client.listTools()

      for (const tool of tools) {
        const def = mcpToolToDefinition(id, tool)
        const toolName = def.name
        const handler = async (args: Record<string, unknown>): Promise<string> => {
          const mc = clientsRef.current.get(id)
          if (!mc) throw new Error('MCP client not found')
          const result = await mc.callTool(tool.name, args)
          return result
        }
        toolRegistry.register(def, handler)
      }

      const updatedServer: McpServer = { ...server, status: 'connected', tools }
      setState((prev) => ({
        servers: prev.servers.map((s) => (s.id === id ? updatedServer : s)),
        isConnecting: false,
        error: null,
      }))

      saveServers(
        loadServers().map((s) => (s.id === id ? { ...s, url: server.url, displayName: server.displayName, status: 'connected', error: null } : s)),
      )

      clientsRef.current.set(id, client)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reconnection failed'
      const errorServer: McpServer = { ...server, status: 'error', error: message, tools: [] }
      setState((prev) => ({
        servers: prev.servers.map((s) => (s.id === id ? errorServer : s)),
        isConnecting: false,
        error: message,
      }))
      return false
    }
  }, [state.servers])

  /**
   * Refresh the server list from localStorage.
   */
  const refresh = useCallback(() => {
    const servers = loadServers()
    setState({
      servers,
      isConnecting: false,
      error: null,
    })
  }, [])

  return {
    state,
    addServer,
    removeServer,
    reconnectServer,
    refresh,
  }
}
