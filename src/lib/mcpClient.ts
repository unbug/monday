/**
 * MCP (Model Context Protocol) client — WebSocket transport.
 *
 * Implements the MCP JSON-RPC 2.0 protocol over WebSocket:
 * 1. Client sends `initialize` with protocol version + capabilities
 * 2. Server responds with `initialize` (capabilities + tools)
 * 3. Client sends `notifications/initialized`
 * 4. Client can call `tools/list` to get available tools
 * 5. Client can call `tools/call{name, arguments}` to invoke tools
 */

import type { McpTool } from '../types'

// JSON-RPC 2.0 message types
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: Record<string, unknown>
  error?: { code: number; message: string }
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

/** MCP protocol version supported by this client */
const MCP_PROTOCOL_VERSION = '2025-03-26'

/** Client capabilities */
const CLIENT_CAPABILITIES = {
  capabilities: {
    roots: { supported: true },
    sampling: { supported: false },
  },
}

/** Server capabilities response shape */
interface ServerCapabilities {
  capabilities?: {
    tools?: { listChanged?: boolean }
    logging?: { listChanged?: boolean }
  }
  tools?: McpTool[]
}

/** tools/list response shape */
interface ToolsListResponse {
  tools: McpTool[]
}

/** tools/call response shape */
interface ToolCallResponse {
  content: Array<{ type: string; text: string }>
  isError?: boolean
}

export interface McpServerState {
  /** WebSocket URL of the MCP server */
  url: string
  /** Connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  /** Error message if connection failed */
  error: string | null
  /** Available tools from the server */
  tools: McpTool[]
}

export class McpClient {
  private ws: WebSocket | null = null
  private pendingRequests = new Map<number, {
    resolve: (value: Record<string, unknown>) => void
    reject: (reason: unknown) => void
  }>()
  private nextId = 1
  private _state: McpServerState

  /** Current connection state */
  get state(): McpServerState {
    return this._state
  }

  /** Available tools from the server */
  get tools(): McpTool[] {
    return this._state.tools
  }

  constructor(url: string) {
    this._state = { url, status: 'disconnected', error: null, tools: [] }
  }

  /**
   * Connect to the MCP server and initialize the protocol handshake.
   */
  async connect(): Promise<void> {
    this._updateState({ status: 'connecting', error: null })

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this._state.url)

        this.ws.onopen = () => {
          this._updateState({ status: 'connected', error: null })

          // Send initialize request
          const initReq = this._makeRequest('initialize', {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: CLIENT_CAPABILITIES.capabilities,
            clientInfo: { name: 'monday', version: '0.27.2' },
          })

          initReq.then((result) => {
            const serverCaps = result as ServerCapabilities
            if (serverCaps.tools) {
              this._updateState({ tools: serverCaps.tools })
            }

            // Send initialized notification
            this._sendNotification('notifications/initialized', {})

            resolve()
          }).catch((err) => {
            this._updateState({ status: 'error', error: err instanceof Error ? err.message : 'Initialize failed' })
            reject(err)
          })
        }

        this.ws.onmessage = (event) => {
          let msg: JsonRpcResponse | JsonRpcNotification
          try {
            msg = JSON.parse(event.data as string)
          } catch {
            return
          }

          if ('id' in msg && msg.id !== undefined) {
            // Response to a pending request
            const pending = this.pendingRequests.get(msg.id as number)
            if (pending) {
              this.pendingRequests.delete(msg.id as number)
              if (msg.error) {
                pending.reject(new Error(msg.error.message))
              } else {
                pending.resolve(msg.result || {})
              }
            }
          } else if ('method' in msg) {
            // Server notification (e.g., tools/listChanged)
            // For now, we don't handle server-side notifications
          }
        }

        this.ws.onerror = () => {
          this._updateState({ status: 'error', error: 'WebSocket error' })
          reject(new Error('WebSocket connection error'))
        }

        this.ws.onclose = () => {
          this._updateState({ status: 'disconnected', tools: [] })
          // Reject all pending requests
          for (const [, pending] of this.pendingRequests) {
            pending.reject(new Error('Connection closed'))
          }
          this.pendingRequests.clear()
        }
      } catch (err) {
        this._updateState({ status: 'error', error: err instanceof Error ? err.message : 'Connection failed' })
        reject(err)
      }
    })
  }

  /**
   * Disconnect from the MCP server.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._updateState({ status: 'disconnected', tools: [] })
  }

  /**
   * List available tools from the server.
   */
  async listTools(): Promise<McpTool[]> {
    const result = await this._request('tools/list', {})
    const response = result as unknown as ToolsListResponse
    this._updateState({ tools: response.tools ?? [] })
    return response.tools ?? []
  }

  /**
   * Call a tool on the MCP server.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this._request('tools/call', {
      name,
      arguments: args,
    })
    const response = result as unknown as ToolCallResponse
    // Combine all content parts
    return (response.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
  }

  /**
   * Check if the server is connected.
   */
  isConnected(): boolean {
    return this._state.status === 'connected'
  }

  // --- Private helpers ---

  private _makeRequest(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      const req: JsonRpcRequest = { jsonrpc: '2.0', id, method, params }
      this.pendingRequests.set(id, { resolve, reject })
      this._send(req)
    })
  }

  private _request(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this._makeRequest(method, params)
  }

  private _sendNotification(method: string, params: Record<string, unknown>): void {
    const msg: JsonRpcNotification = { jsonrpc: '2.0', method, params }
    this._send(msg)
  }

  private _send(msg: JsonRpcRequest | JsonRpcNotification): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private _updateState(partial: Partial<McpServerState>): void {
    this._state = { ...this._state, ...partial }
  }
}
