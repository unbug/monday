/**
 * Model Chaining — Pipeline: fast draft → quality refine (v0.30)
 *
 * When a persona has both draftModelId and refineModelId configured,
 * this module orchestrates a two-stage generation:
 *   1. Load draft model → generate a quick draft
 *   2. Switch to refine model → generate a refined response using the draft as context
 */

import { loadModel, unloadModel, getEngine, streamChatWithUsage } from './engine'
import type { MLCEngineInterface } from '@mlc-ai/web-llm'
import type { StreamUsage } from './engine'

export interface ModelChainConfig {
  draftModelId: string
  refineModelId: string
}

export interface ChainProgress {
  status: 'loading_draft' | 'drafting' | 'switching' | 'refining' | 'done' | 'error'
  draftContent?: string
  refinedContent?: string
  error?: string
}

export interface ModelChainCallbacks {
  onProgress?: (progress: ChainProgress) => void
  onDraftComplete?: (draft: string) => void
}

/**
 * Run the model chaining pipeline.
 *
 * @param userMessage - The user's original message content
 * @param config - Draft and refine model IDs
 * @param messages - Conversation history (without the new user message)
 * @param systemPrompt - Session system prompt
 * @param callbacks - Progress and draft-complete callbacks
 * @returns Refined content (final output)
 */
export async function runModelChain(
  userMessage: string,
  config: ModelChainConfig,
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>,
  systemPrompt: string,
  callbacks: ModelChainCallbacks = {},
): Promise<string> {
  const { draftModelId, refineModelId } = config
  const { onProgress, onDraftComplete } = callbacks

  // Stage 1: Load draft model and generate draft
  onProgress?.({ status: 'loading_draft' })

  let draftEngine: MLCEngineInterface | null = null
  let refineEngine: MLCEngineInterface | null = null

  try {
    draftEngine = await loadModel(draftModelId)

    onProgress?.({ status: 'drafting' })

    // Build messages for draft: same as normal but with draft-specific params
    const draftMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
      { role: 'user' as const, content: userMessage },
    ]

    const draftResult = streamChatWithUsage(draftMessages, {
      temperature: 0.7,
      top_p: 0.9,
      maxTokens: 2048,
    })

    let draftContent = ''
    for await (const token of draftResult.generator) {
      draftContent += token
    }

    // Notify parent that draft is ready (for UI display)
    onDraftComplete?.(draftContent)
    onProgress?.({ status: 'drafting', draftContent })

    // Stage 2: Switch to refine model
    onProgress?.({ status: 'switching' })

    // Unload draft engine
    draftEngine.unload()
    draftEngine = null

    // Load refine model
    refineEngine = await loadModel(refineModelId)

    onProgress?.({ status: 'refining' })

    // Build messages for refinement: original + draft as context
    const refineMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
      { role: 'user' as const, content: userMessage },
      {
        role: 'assistant' as const,
        content: `[Draft]\n${draftContent}\n\n[Refine this draft — improve accuracy, clarity, and completeness.]\n`,
      },
    ]

    const refineResult = streamChatWithUsage(refineMessages, {
      temperature: 0.5,
      top_p: 0.9,
      maxTokens: 4096,
    })

    let refinedContent = ''
    for await (const token of refineResult.generator) {
      refinedContent += token
    }

    onProgress?.({ status: 'done', refinedContent })
    return refinedContent
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Model chaining failed'
    onProgress?.({ status: 'error', error: errorMsg })
    throw err
  } finally {
    // Cleanup: unload both engines
    if (draftEngine) {
      draftEngine.unload()
      draftEngine = null
    }
    if (refineEngine) {
      refineEngine.unload()
      refineEngine = null
    }
  }
}

/**
 * Check if a persona has model chaining configured.
 */
export function hasModelChaining(persona: { draftModelId?: string; refineModelId?: string } | null): boolean {
  if (!persona) return false
  return !!(persona.draftModelId && persona.refineModelId)
}

/**
 * Get the model chaining config from a persona.
 */
export function getModelChainConfig(persona: { draftModelId?: string; refineModelId?: string } | null): ModelChainConfig | null {
  if (!persona?.draftModelId || !persona.refineModelId) return null
  return {
    draftModelId: persona.draftModelId,
    refineModelId: persona.refineModelId,
  }
}
