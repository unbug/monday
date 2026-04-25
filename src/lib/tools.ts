/**
 * Built-in browser-side tools available to the model for function calling.
 * These are the first-class tools that ship with Monday — no server needed.
 */

import type { ToolDefinition } from '../types'

/**
 * Get the current date and time in the user's browser timezone.
 */
export function currentTimeTool(): ToolDefinition {
  return {
    name: 'current_time',
    description:
      'Get the current date and time in the user\'s local timezone. Returns formatted date, time, timezone name, and ISO string.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  }
}

export function currentTimeHandler(): (args: Record<string, unknown>) => Promise<string> {
  return async () => {
    const now = new Date()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const formatted = now.toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return JSON.stringify({
      datetime: now.toISOString(),
      local: formatted,
      timezone: tz,
      utcOffset: now.getTimezoneOffset(),
    })
  }
}

/**
 * Search the web using a SearXNG instance.
 * The user must provide a valid SearXNG URL in settings.
 */
export function webSearchTool(): ToolDefinition {
  return {
    name: 'web_search',
    description:
      'Search the web using a SearXNG instance. Returns up to 5 results with title, URL, and snippet. Requires a SearXNG URL configured in settings.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return (default: 5)',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['query'],
    },
  }
}

export function webSearchHandler(): (args: Record<string, unknown>) => Promise<string> {
  return async (args) => {
    const query = args.query as string
    const maxResults = Math.min(Math.max(Number(args.max_results) || 5, 1), 10)

    // Try to get SearXNG URL from localStorage
    const searxngUrl = localStorage.getItem('monday:searxng_url')
    if (!searxngUrl) {
      return JSON.stringify({
        error: 'SearXNG URL not configured. Add a SearXNG instance URL in Settings > Integrations.',
      })
    }

    try {
      // Use a CORS proxy as fallback chain
      const proxyUrl = new URL('/search', searxngUrl)
      proxyUrl.searchParams.set('q', query)
      proxyUrl.searchParams.set('format', 'json')
      proxyUrl.searchParams.set('engines', 'google,bing,duckduckgo')

      const response = await fetch(proxyUrl.toString(), {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return JSON.stringify({
          error: `SearXNG returned status ${response.status}`,
        })
      }

      const data = await response.json()
      const results = (data.results || []).slice(0, maxResults)

      return JSON.stringify({
        query,
        results: results.map((r: any) => ({
          title: r.title || '',
          url: r.url || '',
          snippet: r.content || '',
        })),
      })
    } catch (err) {
      return JSON.stringify({
        error: `Web search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }
}

/**
 * Copy text to the user's clipboard.
 */
export function clipboardCopyTool(): ToolDefinition {
  return {
    name: 'clipboard_copy',
    description:
      'Copy text to the user\'s clipboard. Useful for copying code, links, or formatted text for the user to paste elsewhere.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to copy to the clipboard',
        },
      },
      required: ['text'],
    },
  }
}

export function clipboardCopyHandler(): (args: Record<string, unknown>) => Promise<string> {
  return async (args) => {
    const text = args.text as string
    try {
      await navigator.clipboard.writeText(text)
      return JSON.stringify({
        success: true,
        copiedLength: text.length,
        message: 'Text copied to clipboard',
      })
    } catch (err) {
      return JSON.stringify({
        success: false,
        error: `Failed to copy to clipboard: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }
}

/**
 * Open a URL in a new browser tab.
 */
export function openUrlTool(): ToolDefinition {
  return {
    name: 'open_url',
    description:
      'Open a URL in a new browser tab. Useful for showing the user a webpage, documentation, or reference material.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to open',
        },
        title: {
          type: 'string',
          description: 'Optional title for the new tab',
        },
      },
      required: ['url'],
    },
  }
}

export function openUrlHandler(): (args: Record<string, unknown>) => Promise<string> {
  return async (args) => {
    const url = args.url as string
    const title = (args.title as string) || url
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer')
      if (win) {
        win.focus()
        return JSON.stringify({
          success: true,
          url,
          message: `Opened "${title}" in a new tab`,
        })
      }
      return JSON.stringify({
        success: false,
        error: 'Popup blocked by browser. Please allow popups for this site.',
      })
    } catch (err) {
      return JSON.stringify({
        success: false,
        error: `Failed to open URL: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }
}

/**
 * Get all built-in tools as a list of ToolDefinition objects.
 */
export function getBuiltInTools(): ToolDefinition[] {
  return [
    currentTimeTool(),
    webSearchTool(),
    clipboardCopyTool(),
    openUrlTool(),
  ]
}

/**
 * Get a handler function for a tool by name.
 */
export function getToolHandler(name: string): ((args: Record<string, unknown>) => Promise<string>) | null {
  switch (name) {
    case 'current_time':
      return currentTimeHandler()
    case 'web_search':
      return webSearchHandler()
    case 'clipboard_copy':
      return clipboardCopyHandler()
    case 'open_url':
      return openUrlHandler()
    default:
      return null
  }
}
