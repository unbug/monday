/**
 * Playwright MCP bridge (Tier 3) — auto-discovery + connection management.
 *
 * @playwright/mcp typically runs on ws://localhost:8931 by default.
 * This module auto-discovers the server, manages the McpClient lifecycle,
 * and exposes available tools for invocation.
 */

import { McpClient } from './mcpClient'
import type { McpTool } from '../types'

/** Default @playwright/mcp WebSocket port */
const DEFAULT_PLAYWRIGHT_MCP_PORT = 8931
const DEFAULT_PLAYWRIGHT_MCP_URL = `ws://localhost:${DEFAULT_PLAYWRIGHT_MCP_PORT}`

/**
 * Try to connect to the default @playwright/mcp server on the standard port.
 * Returns the URL if successful, null otherwise.
 */
export async function autoDiscoverPlaywrightMcp(): Promise<string | null> {
  const testClient = new McpClient(DEFAULT_PLAYWRIGHT_MCP_URL)
  try {
    await testClient.connect()
    const tools = await testClient.listTools()
    if (tools.length > 0) {
      testClient.disconnect()
      return DEFAULT_PLAYWRIGHT_MCP_URL
    }
    testClient.disconnect()
    return null
  } catch {
    return null
  }
}

/**
 * Check if a given URL responds to MCP handshake.
 */
export async function testPlaywrightMcpConnection(url: string): Promise<boolean> {
  const testClient = new McpClient(url)
  try {
    await testClient.connect()
    const tools = await testClient.listTools()
    testClient.disconnect()
    return tools.length > 0
  } catch {
    return false
  }
}

/**
 * Active McpClient instance for the Playwright MCP bridge.
 * Only one connection is managed at a time.
 */
let activeClient: McpClient | null = null
let onStateChange: ((state: McpConnectionState) => void) | null = null

export interface McpConnectionState {
  url: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  tools: McpTool[]
}

export function setOnMcpStateChange(cb: (state: McpConnectionState) => void): () => void {
  onStateChange = cb
  return () => { if (onStateChange === cb) onStateChange = null }
}

function notifyStateChange(state: McpConnectionState): void {
  if (onStateChange) {
    onStateChange(state)
  }
}

/**
 * Connect to the Playwright MCP server at the given URL.
 * Optionally passes domainAllowlist and blockedOrigins as init parameters
 * so the server enforces them on every browser action.
 */
export async function connectPlaywrightMcp(
  url: string,
  options?: { domainAllowlist?: string[]; blockedOrigins?: string[] },
): Promise<boolean> {
  if (activeClient) {
    activeClient.disconnect()
    activeClient = null
  }

  activeClient = new McpClient(url)
  notifyStateChange({ url, status: 'connecting', error: null, tools: [] })

  try {
    await activeClient.connect(options)
    const tools = await activeClient.listTools()
    notifyStateChange({ url, status: 'connected', error: null, tools })
    return true
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed'
    notifyStateChange({ url, status: 'error', error: errorMsg, tools: [] })
    activeClient = null
    return false
  }
}

/**
 * Disconnect from the Playwright MCP server.
 */
export function disconnectPlaywrightMcp(): void {
  if (activeClient) {
    activeClient.disconnect()
    activeClient = null
  }
  notifyStateChange({ url: '', status: 'disconnected', error: null, tools: [] })
}

/**
 * Get the current connection state.
 */
export function getPlaywrightMcpState(): McpConnectionState {
  if (activeClient) {
    return { ...activeClient.state }
  }
  return { url: '', status: 'disconnected', error: null, tools: [] }
}

/**
 * List available tools from the connected MCP server.
 */
export async function listPlaywrightMcpTools(): Promise<McpTool[]> {
  if (!activeClient || !activeClient.isConnected()) {
    return []
  }
  return activeClient.listTools()
}

/**
 * Call a tool on the connected MCP server.
 * Returns the tool output as a string.
 */
export async function callPlaywrightMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (!activeClient || !activeClient.isConnected()) {
    throw new Error('Not connected to Playwright MCP server')
  }
  return activeClient.callTool(name, args)
}

/**
 * Check if the Playwright MCP server is currently connected.
 */
export function isPlaywrightMcpConnected(): boolean {
  return activeClient !== null && activeClient.isConnected()
}
