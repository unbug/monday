/**
 * Tool registry — manages tool definitions, execution, and result formatting.
 * Built-in tools are registered automatically; external plugins can register too.
 */

import type { ToolDefinition, ToolCall, ToolCallResult } from '../types'
import { getBuiltInTools, getToolHandler } from './tools'

interface RegisteredTool {
  definition: ToolDefinition
  handler: (args: Record<string, unknown>) => Promise<string>
}

class ToolRegistry {
  private tools = new Map<string, RegisteredTool>()

  constructor() {
    // Register all built-in tools
    for (const tool of getBuiltInTools()) {
      const handler = getToolHandler(tool.name)
      if (handler) {
        this.tools.set(tool.name, { definition: tool, handler })
      }
    }
  }

  /** Get all registered tool definitions (for sending to the model) */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition)
  }

  /** Check if a tool is registered */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /** Register an external tool (for plugin system) */
  register(tool: ToolDefinition, handler: (args: Record<string, unknown>) => Promise<string>): void {
    this.tools.set(tool.name, { definition: tool, handler })
  }

  /** Unregister a tool */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Execute a tool call and return the result.
   */
  async execute(call: ToolCall): Promise<ToolCallResult> {
    const startTime = performance.now()
    const registered = this.tools.get(call.name)

    if (!registered) {
      return {
        call,
        success: false,
        result: '',
        error: `Unknown tool: ${call.name}`,
        latency: performance.now() - startTime,
      }
    }

    try {
      const result = await registered.handler(call.args)
      return {
        call,
        success: true,
        result,
        latency: performance.now() - startTime,
      }
    } catch (err) {
      return {
        call,
        success: false,
        result: '',
        error: err instanceof Error ? err.message : 'Unknown error',
        latency: performance.now() - startTime,
      }
    }
  }

  /** Convert a tool call result to a tool message for the model */
  resultToToolMessage(call: ToolCall, result: ToolCallResult): {
    role: 'tool'
    tool_call_id: string
    content: string
  } {
    return {
      role: 'tool' as const,
      tool_call_id: call.id,
      content: result.success ? result.result : `Error: ${result.error}`,
    }
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry()
