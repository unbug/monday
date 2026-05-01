/**
 * In-browser conversation summarization using the loaded Web-LLM model.
 * v0.30: Multi-turn memory — auto-compress early turns when context grows too long.
 */

import { getEngine } from './engine'
import type { LearningItem, LearningItemType } from '../types'

interface SummarizeOptions {
  /** System prompt to prepend to the summarization request */
  systemPrompt?: string
  /** Temperature for summarization (lower = more deterministic) */
  temperature?: number
  /** Max tokens for the summary output */
  maxTokens?: number
}

interface SummarizeResult {
  summary: string
  /** Number of prompt tokens consumed */
  promptTokens: number
  /** Number of completion tokens consumed */
  completionTokens: number
}

/**
 * Build a prompt that asks the model to summarize a set of messages.
 */
function buildSummarizePrompt(
  messages: Array<{ role: string; content: string }>,
  options: SummarizeOptions,
): Array<{ role: 'system' | 'user'; content: string }> {
  const { systemPrompt = '', temperature = 0.3, maxTokens = 512 } = options

  const messageText = messages
    .map((m) => {
      const roleLabel = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'
      return `--- ${roleLabel} ---\n${m.content}`
    })
    .join('\n\n')

  const system = systemPrompt
    ? `${systemPrompt}\n\n---\n\nYou are a conversation summarizer. Your task is to create a concise, accurate summary of the conversation below. Preserve key facts, decisions, and context that will be needed for future turns. Do NOT start a new conversation — just summarize what was discussed.`
    : `You are a conversation summarizer. Your task is to create a concise, accurate summary of the conversation below. Preserve key facts, decisions, and context that will be needed for future turns. Do NOT start a new conversation — just summarize what was discussed.`

  return [
    { role: 'system', content: system },
    { role: 'user', content: `Please summarize the following conversation:\n\n${messageText}` },
  ]
}

/**
 * Summarize a range of messages using the loaded model.
 * Returns null if no model is loaded.
 */
export async function summarizeMessages(
  messages: Array<{ role: string; content: string }>,
  options: SummarizeOptions = {},
): Promise<SummarizeResult | null> {
  const engine = getEngine()
  if (!engine) {
    return null
  }

  const { temperature = 0.3, maxTokens = 512 } = options
  const chatMessages = buildSummarizePrompt(messages, options)

  const chunks = (await engine.chat.completions.create({
    messages: chatMessages as any,
    temperature,
    top_p: 0.9,
    max_tokens: maxTokens,
    stream: false,
  } as any)) as any

  // Non-streaming response
  const content = chunks.choices?.[0]?.message?.content ?? ''
  const usage = chunks.usage

  return {
    summary: content.trim(),
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
  }
}

/**
 * Streaming version of summarizeMessages.
 * Yields partial summary text as it arrives.
 */
export async function* summarizeMessagesStreaming(
  messages: Array<{ role: string; content: string }>,
  options: SummarizeOptions = {},
): AsyncGenerator<string, SummarizeResult | null, unknown> {
  const engine = getEngine()
  if (!engine) {
    yield ''
    return null
  }

  const { temperature = 0.3, maxTokens = 512 } = options
  const chatMessages = buildSummarizePrompt(messages, options)

  const responseChunks = (await engine.chat.completions.create({
    messages: chatMessages as any,
    temperature,
    top_p: 0.9,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  } as any)) as unknown as AsyncIterable<any>

  let fullContent = ''
  let promptTokens = 0
  let completionTokens = 0

  for await (const chunk of responseChunks) {
    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) {
      fullContent += delta
      completionTokens++
      yield delta
    }
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens ?? 0
      completionTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  return {
    summary: fullContent.trim(),
    promptTokens,
    completionTokens,
  }
}

/**
 * Extract learning items (preferences + entity mentions) from a summary text.
 * Uses a lightweight model call to identify structured learning signals.
 */
export async function extractLearningItems(
  summary: string,
  originalMessages: Array<{ role: string; content: string }>,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<LearningItem[]> {
  const engine = getEngine()
  if (!engine) {
    return []
  }

  const { temperature = 0.2, maxTokens = 256 } = options

  // Build a prompt that asks the model to extract preferences and entity mentions
  const extractionPrompt = `You are a learning extractor. Analyze the conversation summary below and extract:

1. **Preferences** — User preferences, style choices, or stated opinions (type: "preference")
2. **Entity mentions** — Named entities like projects, people, tasks, tools, or documents (type: "entity")

Format your response as a JSON array. Each item must have: type, title, content, confidence (0-1).

Rules:
- Only extract items explicitly stated or strongly implied
- For preferences: capture what the user wants, prefers, or dislikes
- For entities: capture named things the user is working with
- Skip generic statements that don't carry learning value
- Set confidence: 0.9+ for explicit statements, 0.6-0.8 for inferred items

Conversation summary:
${summary}

Respond with ONLY a JSON array. No markdown, no explanation.`

  try {
    const chunks = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a structured data extractor. Output ONLY valid JSON arrays.' },
        { role: 'user', content: extractionPrompt },
      ] as any,
      temperature,
      top_p: 0.9,
      max_tokens: maxTokens,
      stream: false,
    } as any) as any

    const content = chunks.choices?.[0]?.message?.content ?? ''
    const trimmed = content.trim()

    // Try to parse JSON array from the response
    // Handle markdown-wrapped JSON
    let jsonStr = trimmed
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr) as Array<{
      type: LearningItemType
      title: string
      content: string
      confidence?: number
    }>

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (item) =>
          item &&
          item.type &&
          (item.type === 'preference' || item.type === 'entity') &&
          item.title &&
          item.content,
      )
      .map((item) => ({
        id: crypto.randomUUID(),
        type: item.type,
        title: item.title.trim(),
        content: item.content.trim(),
        confidence: Math.min(1, Math.max(0, item.confidence ?? 0.7)),
      }))
  } catch (err) {
    console.warn('[monday] Learning extraction failed:', err)
    return []
  }
}
