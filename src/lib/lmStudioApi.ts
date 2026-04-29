/**
 * LM Studio integration — local server streaming via the OpenAI-compatible API.
 *
 * LM Studio exposes:
 *   GET  /v1/models          — list available models (OpenAI-compatible format)
 *   POST /v1/chat/completions — OpenAI-compatible chat completions (SSE streaming)
 *
 * Default server URL: http://localhost:1234
 * No API key required for local LM Studio instances.
 */

export interface LmStudioModel {
  id: string
  name?: string
  object: string
  created?: number
  owned_by?: string
}

/** Fetch the list of models available on a local LM Studio server. */
export async function fetchLmStudioModels(url: string): Promise<LmStudioModel[]> {
  const resp = await fetch(`${url.replace(/\/+$/, '')}/v1/models`)
  if (!resp.ok) {
    throw new Error(`LM Studio server unreachable (${resp.status})`)
  }
  const data = await resp.json() as { data?: LmStudioModel[] }
  return data.data ?? []
}

/**
 * Stream chat completions from an LM Studio server.
 * Uses the `/v1/chat/completions` endpoint (OpenAI-compatible).
 */
export async function* streamLmStudio(
  baseUrl: string,
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number
    topP?: number
    maxTokens?: number
    systemPrompt?: string
  } = {},
): AsyncGenerator<string, void, unknown> {
  const { temperature = 0.7, topP = 0.9, maxTokens = 1024, systemPrompt } = options

  // Build the chat messages array
  let chatMessages: Array<{ role: string; content: string }> = [...messages]

  // Prepend system prompt if provided
  if (systemPrompt?.trim()) {
    chatMessages = [
      { role: 'system', content: systemPrompt.trim() },
      ...messages,
    ]
  }

  const resp = await fetch(`${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: chatMessages,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`LM Studio API error (${resp.status}): ${body}`)
  }

  if (!resp.body) {
    throw new Error('LM Studio response has no body')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const json = JSON.parse(trimmed.slice(6))
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            yield delta
          }
        } catch {
          // Skip unparseable SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
