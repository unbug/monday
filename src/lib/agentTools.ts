import { tool } from 'ai'
import { z } from 'zod'

export const agentTools = {
  current_time: tool({
    description: 'Get the current date and time in the user\'s local timezone.',
    parameters: z.object({}),
    execute: async () => {
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

      return {
        datetime: now.toISOString(),
        local: formatted,
        timezone: tz,
        utcOffset: now.getTimezoneOffset(),
      }
    },
  }),

  web_search: tool({
    description: 'Search the web using a SearXNG instance.',
    parameters: z.object({
      query: z.string().describe('The search query'),
      max_results: z.number().int().min(1).max(10).optional().default(5),
    }),
    execute: async ({ query, max_results }) => {
      const searxngUrl = localStorage.getItem('monday:searxng_url')
      if (!searxngUrl) {
        return {
          error: 'SearXNG URL not configured. Add a SearXNG instance URL in Settings > Integrations.',
        }
      }

      try {
        const proxyUrl = new URL('/search', searxngUrl)
        proxyUrl.searchParams.set('q', query)
        proxyUrl.searchParams.set('format', 'json')
        proxyUrl.searchParams.set('engines', 'google,bing,duckduckgo')

        const response = await fetch(proxyUrl.toString(), {
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          return {
            error: `SearXNG returned status ${response.status}`,
          }
        }

        const data = await response.json()
        const results = (Array.isArray(data?.results) ? data.results : []).slice(0, max_results)

        return {
          query,
          results: results.map((r: unknown) => {
            const item = (r && typeof r === 'object') ? r as { title?: unknown; url?: unknown; content?: unknown } : {}
            return {
              title: typeof item.title === 'string' ? item.title : '',
              url: typeof item.url === 'string' ? item.url : '',
              snippet: typeof item.content === 'string' ? item.content : '',
            }
          }),
        }
      } catch (err) {
        return {
          error: `Web search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  }),

  clipboard_copy: tool({
    description: 'Copy text to the user\'s clipboard.',
    parameters: z.object({
      text: z.string().describe('The text to copy to the clipboard'),
    }),
    execute: async ({ text }) => {
      await navigator.clipboard.writeText(text)
      return { success: true, copiedLength: text.length }
    },
  }),

  open_url: tool({
    description: 'Open a URL in a new browser tab.',
    parameters: z.object({
      url: z.string().url().describe('The URL to open'),
      title: z.string().optional(),
    }),
    execute: async ({ url }) => {
      window.open(url, '_blank', 'noopener,noreferrer')
      return { success: true, url }
    },
  }),
}

export type AgentTools = typeof agentTools
