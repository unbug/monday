/**
 * Skill Workshop — proposal generator for v1.2.4.
 *
 * Analyzes session corrections, memories, and user edits to propose
 * skill refinements. The model generates structured diff hunks that
 * the user can review and approve.
 */

import { getEngine } from './engine'
import type { Skill, MemoryEntry, WorkshopProposal, WorkshopHunk, WorkshopHunkType } from '../types'

interface WorkshopInput {
  /** Corrections captured during sessions */
  corrections: Array<{ message: string; timestamp: number }>
  /** Relevant memories from the session */
  memories: Array<{ key: string; value: string; namespace: string }>
  /** Currently installed skills */
  skills: Skill[]
  /** Session IDs that contributed data */
  sessionIds: string[]
}

/**
 * Generate skill refinement proposals from corrections and memories.
 * Returns an array of WorkshopProposal objects.
 */
export async function generateWorkshopProposals(
  input: WorkshopInput,
): Promise<WorkshopProposal[]> {
  const engine = getEngine()
  if (!engine) {
    return []
  }

  const { corrections, memories, skills, sessionIds } = input

  // Skip if no signal data
  if (corrections.length === 0 && memories.length === 0) {
    return []
  }

  // Build a summary of the input data
  const correctionSummary = corrections
    .map((c) => `- [${new Date(c.timestamp).toLocaleDateString()}] ${c.message}`)
    .join('\n')

  const memorySummary = memories
    .map((m) => `- [${m.namespace}] ${m.key}: ${m.value}`)
    .join('\n')

  const skillContext = skills
    .map((s) => `Skill: ${s.name} (${s.id})\n  Instructions: ${s.instructions.substring(0, 300)}\n  Tags: ${s.tags.join(', ')}`)
    .join('\n\n')

  const prompt = `You are a Skill Workshop assistant. Analyze the user's corrections and memories to propose skill refinements.

## Corrections (user edits/regenerations):
${correctionSummary || '(none)'}

## Memories:
${memorySummary || '(none)'}

## Installed Skills:
${skillContext || '(none)'}

Rules:
- Only propose changes that are clearly supported by the data
- Each proposal should target ONE specific skill
- Propose concrete, actionable changes (not vague suggestions)
- Use diff format: show old content (-) and new content (+)
- Set confidence: 0.9+ for explicit corrections, 0.6-0.8 for inferred patterns
- Skip if no clear signal for any skill

Respond with ONLY a JSON array. Each item:
{
  "skillId": "<skill id to modify>",
  "skillName": "<skill display name>",
  "title": "<short description of the change>",
  "hunks": [
    {
      "type": "instructions|description|tags|systemPrompt|custom",
      "fieldLabel": "<field name>",
      "oldContent": "<old text or null if new>",
      "newContent": "<new text or null if removed>"
    }
  ],
  "confidence": <0-1>
}

If no clear improvements are needed, respond with an empty array [].`

  try {
    const chunks = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a structured data extractor. Output ONLY valid JSON arrays.' },
        { role: 'user', content: prompt },
      ] as any,
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 1024,
      stream: false,
    } as any) as any

    const content = chunks.choices?.[0]?.message?.content ?? ''
    const trimmed = content.trim()

    let jsonStr = trimmed
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr) as Array<{
      skillId: string
      skillName: string
      title: string
      hunks: Array<{
        type: WorkshopHunkType
        fieldLabel: string
        oldContent: string | null
        newContent: string | null
      }>
      confidence: number
    }>

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((p) => p && p.skillId && p.title && Array.isArray(p.hunks) && p.hunks.length > 0)
      .map((p) => ({
        id: crypto.randomUUID(),
        skillId: p.skillId,
        skillName: p.skillName,
        title: p.title.trim(),
        hunks: p.hunks.map((h) => ({
          type: h.type,
          fieldLabel: h.fieldLabel,
          oldContent: h.oldContent ?? '',
          newContent: h.newContent ?? '',
        })),
        status: 'pending' as const,
        sessionIds,
        createdAt: Date.now(),
        resolvedAt: null,
      }))
  } catch (err) {
    console.warn('[monday] Workshop proposal generation failed:', err)
    return []
  }
}

/**
 * Apply approved workshop proposals to a skill.
 * Returns the updated skill, or null if no hunks applied.
 */
export function applyProposalsToSkill(
  skill: Skill,
  proposals: WorkshopProposal[],
): Skill | null {
  const approved = proposals.filter((p) => p.status === 'approved')
  if (approved.length === 0) return null

  const updated = { ...skill }

  for (const proposal of approved) {
    for (const hunk of proposal.hunks) {
      switch (hunk.type) {
        case 'instructions':
          updated.instructions = hunk.newContent || skill.instructions
          break
        case 'description':
          updated.description = hunk.newContent || skill.description
          break
        case 'tags': {
          try {
            const tags = JSON.parse(hunk.newContent || '[]')
            if (Array.isArray(tags)) updated.tags = tags
          } catch {
            // ignore parse errors
          }
          break
        }
        case 'systemPrompt':
          // systemPrompt is on ChatSession, not Skill — skip
          break
        case 'custom':
          // Custom hunks are informational only
          break
      }
    }
  }

  updated.lastUsedAt = Date.now()
  return updated
}
