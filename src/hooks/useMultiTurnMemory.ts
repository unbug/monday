/**
 * Multi-turn memory management hook.
 * v0.30: Detects context overflow, triggers summarization, manages summary lifecycle.
 */

import { useState, useCallback, useRef } from 'react'
import type { MemorySummary } from '../types'
import { summarizeMessages, summarizeMessagesStreaming } from '../lib/summarizer'

export interface MemoryState {
  /** Current summaries for the active session */
  summaries: MemorySummary[]
  /** Whether a summarization is in progress */
  isSummarizing: boolean
  /** Whether context is getting too long and summarization is recommended */
  needsSummarization: boolean
  /** Total estimated token count of messages */
  estimatedTokens: number
}

export interface UseMultiTurnMemoryOptions {
  /** Callback when a new summary is generated */
  onSummaryGenerated?: (sessionId: string, summary: MemorySummary) => void
  /** Callback when summaries are edited */
  onSummariesUpdated?: (sessionId: string, summaries: MemorySummary[]) => void
}

/**
 * Approximate token count for a string (rough estimate).
 * ~4 chars per token for English, ~1.5 chars per token for CJK.
 */
function estimateTokens(text: string): number {
  let cjkCount = 0
  for (const char of text) {
    if (char.charCodeAt(0) > 0x2ff || char.charCodeAt(0) <= 0x1fff) {
      cjkCount++
    }
  }
  const nonCjk = text.length - cjkCount
  return Math.ceil(nonCjk / 4) + Math.ceil(cjkCount / 1.5)
}

/**
 * Maximum estimated tokens before we auto-summarize.
 * Conservative estimate to leave room for system prompt + context.
 */
const MAX_ESTIMATED_TOKENS = 3000

/**
 * Number of recent messages to keep without summarization.
 * Messages before this threshold are candidates for summarization.
 */
const KEEP_RECENT_MESSAGES = 6

/**
 * Hook that manages multi-turn memory: detection, summarization, and injection.
 */
export function useMultiTurnMemory(
  sessionId: string | null,
  messages: Array<{ role: string; content: string; isStreaming?: boolean }>,
  options: UseMultiTurnMemoryOptions = {},
) {
  const [summaries, setSummaries] = useState<MemorySummary[]>([])
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarizeProgress, setSummarizeProgress] = useState<string>('')
  const abortRef = useRef(false)

  const totalTokens = messages.reduce(
    (acc, m) => acc + estimateTokens(m.content),
    0,
  )

  const needsSummarization = totalTokens > MAX_ESTIMATED_TOKENS || messages.length > KEEP_RECENT_MESSAGES + 4

  /**
   * Compress early messages into a summary.
   * Keeps the most recent messages intact and summarizes the rest.
   */
  const compressEarlyTurns = useCallback(
    async (messagesList: Array<{ role: string; content: string; isStreaming?: boolean }>) => {
      if (isSummarizing) return null

      // Determine which messages to summarize (everything before the recent window)
      const recentCount = Math.min(KEEP_RECENT_MESSAGES, messagesList.length)
      const toSummarize = messagesList.slice(0, messagesList.length - recentCount)

      if (toSummarize.length === 0) return null

      setIsSummarizing(true)
      setSummarizeProgress('Compressing conversation history...')
      abortRef.current = false

      try {
        const result = await summarizeMessages(
          toSummarize.map((m) => ({ role: m.role, content: m.content })),
          { temperature: 0.3, maxTokens: 512 },
        )

        if (abortRef.current || !result) {
          setIsSummarizing(false)
          return null
        }

        const summary: MemorySummary = {
          id: crypto.randomUUID(),
          startMsgIndex: 0,
          endMsgIndex: toSummarize.length,
          summary: result.summary,
          generatedAt: Date.now(),
          editedAt: null,
        }

        const newSummaries = [...summaries, summary]
        setSummaries(newSummaries)
        setIsSummarizing(false)
        setSummarizeProgress('')

        options.onSummaryGenerated?.(sessionId!, summary)
        return summary
      } catch (err) {
        console.error('[monday] Summarization failed:', err)
        setIsSummarizing(false)
        setSummarizeProgress('')
        return null
      }
    },
    [isSummarizing, summaries, sessionId, options],
  )

  /**
   * Streaming version of compressEarlyTurns.
   * Yields partial summary text as it's generated.
   */
  const compressEarlyTurnsStreaming = useCallback(
    async (
      messagesList: Array<{ role: string; content: string; isStreaming?: boolean }>,
    ): Promise<MemorySummary | null> => {
      if (isSummarizing) return null

      const recentCount = Math.min(KEEP_RECENT_MESSAGES, messagesList.length)
      const toSummarize = messagesList.slice(0, messagesList.length - recentCount)

      if (toSummarize.length === 0) return null

      setIsSummarizing(true)
      setSummarizeProgress('Compressing conversation history...')
      abortRef.current = false

      let partialText = ''

      try {
        const generator = summarizeMessagesStreaming(
          toSummarize.map((m) => ({ role: m.role, content: m.content })),
          { temperature: 0.3, maxTokens: 512 },
        )

        for await (const chunk of generator) {
          if (abortRef.current) {
            setIsSummarizing(false)
            setSummarizeProgress('')
            return null
          }
          partialText += chunk
          setSummarizeProgress(partialText.slice(0, 100) + (partialText.length > 100 ? '...' : ''))
        }

        const summary: MemorySummary = {
          id: crypto.randomUUID(),
          startMsgIndex: 0,
          endMsgIndex: toSummarize.length,
          summary: partialText.trim(),
          generatedAt: Date.now(),
          editedAt: null,
        }

        const newSummaries = [...summaries, summary]
        setSummaries(newSummaries)
        setIsSummarizing(false)
        setSummarizeProgress('')

        options.onSummaryGenerated?.(sessionId!, summary)
        return summary
      } catch (err) {
        console.error('[monday] Streaming summarization failed:', err)
        setIsSummarizing(false)
        setSummarizeProgress('')
        return null
      }
    },
    [isSummarizing, summaries, sessionId, options],
  )

  /**
   * Cancel an in-progress summarization.
   */
  const cancelSummarization = useCallback(() => {
    abortRef.current = true
  }, [])

  /**
   * Edit an existing summary.
   */
  const editSummary = useCallback(
    (summaryId: string, newSummary: string) => {
      const updated = summaries.map((s) =>
        s.id === summaryId
          ? { ...s, summary: newSummary, editedAt: Date.now() }
          : s,
      )
      setSummaries(updated)
      options.onSummariesUpdated?.(sessionId!, updated)
    },
    [summaries, sessionId, options],
  )

  /**
   * Delete a summary.
   */
  const deleteSummary = useCallback(
    (summaryId: string) => {
      const updated = summaries.filter((s) => s.id !== summaryId)
      setSummaries(updated)
      options.onSummariesUpdated?.(sessionId!, updated)
    },
    [summaries, sessionId, options],
  )

  /**
   * Get the system prompt that includes all summaries.
   * Summaries are prepended to the session's system prompt.
   */
  const getSummarizedSystemPrompt = useCallback(
    (baseSystemPrompt: string): string => {
      const summaryParts = summaries.map((s) => `[Conversation Summary ${s.startMsgIndex + 1}–${s.endMsgIndex}]:\n${s.summary}`)
      const summaryBlock = summaryParts.length > 0 ? summaryParts.join('\n\n---\n\n') : ''

      if (summaryBlock && baseSystemPrompt.trim()) {
        return `${baseSystemPrompt.trim()}\n\n---\n\n${summaryBlock}`
      }
      if (summaryBlock) {
        return summaryBlock
      }
      return baseSystemPrompt
    },
    [summaries],
  )

  return {
    summaries,
    isSummarizing,
    summarizeProgress,
    needsSummarization,
    estimatedTokens: totalTokens,
    compressEarlyTurns,
    compressEarlyTurnsStreaming,
    cancelSummarization,
    editSummary,
    deleteSummary,
    getSummarizedSystemPrompt,
  }
}

export type UseMultiTurnMemoryReturn = ReturnType<typeof useMultiTurnMemory>
