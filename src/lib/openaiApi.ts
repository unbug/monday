/**
 * OpenAI-compatible API streaming engine.
 * Sends messages to any OpenAI-compatible endpoint and streams the response.
 * No new dependencies — uses native fetch.
 */

export interface OpenAISettings {
  /** Custom base URL (e.g. https://api.openai.com/v1 or http://localhost:11434/v1) */
  baseUrl: string
  /** API key for authentication */
  apiKey: string
  /** Model ID to use (e.g. gpt-4o, qwen2.5:latest) */
  modelId: string
}

export interface OpenAIStreamOptions {
  settings: OpenAISettings
  temperature?: number
  topP?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface OpenAIStreamUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Stream chat via an OpenAI-compatible API.
 * Yields text deltas as they arrive; returns usage stats when complete.
 */
export async function* streamOpenAI(
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>,
  options: OpenAIStreamOptions,
): AsyncGenerator<string, OpenAIStreamUsage, unknown> {
  const { baseUrl, apiKey, modelId } = options.settings
  const {
    temperature = 0.7,
    topP = 0.9,
    maxTokens = 1024,
    systemPrompt,
  } = options

  // Build the request body — strip 'tool' role for API compatibility
  let chatMessages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>

  if (systemPrompt?.trim()) {
    chatMessages = [
      { role: 'system', content: systemPrompt.trim() },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    ]
  } else {
    chatMessages = messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

  const response = await fetch(url, {
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

  if (!response.ok) {
    const body = await response.text()
    let errMsg: string
    try {
      const parsed = JSON.parse(body)
      errMsg = parsed.error?.message ?? body
    } catch {
      errMsg = body || `HTTP ${response.status}`
    }
    throw new Error(`OpenAI API error (${response.status}): ${errMsg}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('OpenAI API returned no body')
  }

  const decoder = new TextDecoder()
  let fullContent = ''
  let promptTokens = 0
  let completionTokens = 0
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
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          break
        }

        try {
          const chunk = JSON.parse(data)
          const delta = chunk.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            yield delta
          }

          // Capture usage from the last chunk
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? 0
            completionTokens = chunk.usage.completion_tokens ?? 0
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  }
}

/**
 * Non-streaming version — waits for full response then yields it once.
 */
export async function chatOpenAI(
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>,
  options: OpenAIStreamOptions,
): Promise<{ content: string; usage: OpenAIStreamUsage }> {
  let fullContent = ''
  let usage: OpenAIStreamUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

  for await (const chunk of streamOpenAI(messages, options)) {
    fullContent += chunk
  }
  return { content: fullContent, usage }
}
