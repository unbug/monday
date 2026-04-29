/**
 * DeepSeek API integration — cloud provider streaming via OpenAI-compatible API.
 *
 * DeepSeek exposes:
 *   GET  /v1/models          — list available models
 *   POST /v1/chat/completions — OpenAI-compatible chat completions (SSE streaming)
 *
 * Requires an API key. Default base URL: https://api.deepseek.com/v1
 */

export interface DeepSeekModel {
  id: string
  object: string
  created: number
  owned_by: string
}

/** Fetch the list of models available on the DeepSeek API. */
export async function fetchDeepSeekModels(
  baseUrl: string,
  apiKey: string,
): Promise<DeepSeekModel[]> {
  const resp = await fetch(`${baseUrl.replace(/\/+$/, '')}/v1/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!resp.ok) {
    throw new Error(`DeepSeek API unreachable (${resp.status})`)
  }
  const data = await resp.json() as { data?: DeepSeekModel[] }
  return data.data ?? []
}

/**
 * Stream chat completions from the DeepSeek API.
 * Supports both `deepseek-chat` and `deepseek-reasoner` models.
 */
export async function* streamDeepSeek(
  baseUrl: string,
  modelId: string,
  apiKey: string,
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
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`DeepSeek API error (${resp.status}): ${body}`)
  }

  if (!resp.body) {
    throw new Error('DeepSeek response has no body')
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
