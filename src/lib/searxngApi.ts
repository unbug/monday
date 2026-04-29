/**
 * SearXNG integration — web search via a self-hosted SearXNG instance.
 *
 * SearXNG exposes:
 *   GET  {baseUrl}/search?q=QUERY&format=json
 *     → { results: Array<{ title, url, content, engine }> }
 *
 * No API key is required for public SearXNG instances.
 */

export interface SearXNGResult {
  title: string
  url: string
  content: string
  engine: string
}

/** Query a SearXNG instance for search results. */
export async function searchSearXNG(
  baseUrl: string,
  query: string,
): Promise<SearXNGResult[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/search?q=${encodeURIComponent(query)}&format=json`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`SearXNG server unreachable (${resp.status})`)
  }
  const data = await resp.json() as { results?: Array<{
    title?: string
    url?: string
    content?: string
    long_content?: string
    snippet?: string
    engine?: string
  }> }
  return (data.results ?? []).map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    content: r.content ?? r.long_content ?? r.snippet ?? '',
    engine: r.engine ?? 'unknown',
  }))
}

/** Test whether a SearXNG instance is reachable. */
export async function testSearXNG(url: string): Promise<boolean> {
  try {
    const resp = await fetch(`${url.replace(/\/+$/, '')}/search?q=test&format=json`, {
      method: 'GET',
    })
    return resp.ok
  } catch {
    return false
  }
}
