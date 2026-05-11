/**
 * AgentAuditTrail — chronological log of every agent action + observation + screenshot.
 *
 * Inspired by Codex CLI's terminal-log citation model and Codex Web's
 * task-delegation audit view. Each step is collapsible and shows:
 * - step number + timestamp
 * - action type (thought / tool_call / tool_result / observation / final_answer)
 * - thought text (if present)
 * - tool name + args (if tool_call)
 * - result text (if tool_result)
 * - screenshot thumbnail (if observation with image)
 * - final answer (if final_answer)
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { t } from '../lib/i18n'

export interface AgentAuditEntry {
  id: string
  step: number
  type: 'thought' | 'tool_call' | 'tool_result' | 'observation' | 'final_answer'
  timestamp: number
  /** Thought / reasoning text */
  thought?: string
  /** Tool name for tool_call entries */
  toolName?: string
  /** Tool arguments for tool_call entries */
  toolArgs?: Record<string, unknown>
  /** Tool result text for tool_result entries */
  toolResult?: string
  /** Error text */
  error?: string
  /** Screenshot data URL for observation entries */
  screenshotDataUrl?: string
  /** Final answer text */
  finalAnswer?: string
  /** Duration in ms (if finished) */
  durationMs?: number
}

interface Props {
  entries: AgentAuditEntry[]
  /** Callback when user clicks a screenshot thumbnail */
  onScreenshotClick?: (entry: AgentAuditEntry) => void
  /** Expand/collapse all */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return t('agent.justNow') || 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function typeIcon(type: AgentAuditEntry['type']): string {
  switch (type) {
    case 'thought': return '🧠'
    case 'tool_call': return '🔧'
    case 'tool_result': return '📋'
    case 'observation': return '👁'
    case 'final_answer': return '✅'
  }
}

function typeLabel(type: AgentAuditEntry['type']): string {
  const map: Record<AgentAuditEntry['type'], string> = {
    thought: t('agent.thought') || 'Thought',
    tool_call: t('agent.tool') || 'Tool',
    tool_result: t('agent.result') || 'Result',
    observation: t('agent.observation') || 'Observation',
    final_answer: t('agent.finalAnswer') || 'Final Answer',
  }
  return map[type]
}

export function AgentAuditTrail({ entries, onScreenshotClick, expanded: propExpanded, onExpandedChange }: Props) {
  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>({})
  const [previewEntry, setPreviewEntry] = useState<AgentAuditEntry | null>(null)

  const allExpanded = entries.length > 0 && entries.every((e) => localExpanded[e.id])
  const isPropExpanded = propExpanded !== undefined

  const toggleAll = () => {
    const next = !allExpanded
    const updated: Record<string, boolean> = {}
    for (const e of entries) updated[e.id] = next
    setLocalExpanded(updated)
    onExpandedChange?.(next)
  }

  const toggleEntry = (id: string) => {
    setLocalExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const expandedCount = entries.filter((e) => localExpanded[e.id]).length

  return (
    <div className="agent-audit-trail">
      {/* Header */}
      <div className="agent-audit-header">
        <span className="agent-audit-icon">📋</span>
        <h3 className="agent-audit-title">
          {t('agent.auditTitle') || 'Agent Audit Trail'}
        </h3>
        <span className="agent-audit-count">
          {entries.length} {t('agent.auditSteps') || 'steps'}
          {expandedCount > 0 && expandedCount < entries.length
            ? ` · ${expandedCount} expanded`
            : ''}
        </span>
        <button
          className="agent-audit-toggle-all-btn"
          onClick={toggleAll}
          title={allExpanded
            ? (t('agent.auditCollapseAll') || 'Collapse all')
            : (t('agent.auditExpandAll') || 'Expand all')}
        >
          {allExpanded ? '▼' : '▶'} {allExpanded
            ? (t('agent.auditCollapse') || 'Collapse')
            : (t('agent.auditExpand') || 'Expand')}
        </button>
      </div>

      {/* Entries */}
      <div className="agent-audit-entries">
        {entries.length === 0 && (
          <div className="agent-audit-empty">
            {t('agent.auditEmpty') || 'No actions yet. Start the agent loop to see the audit trail.'}
          </div>
        )}
        {entries.map((entry) => (
          <AuditEntryCard
            key={entry.id}
            entry={entry}
            expanded={isPropExpanded ? propExpanded! : (localExpanded[entry.id] ?? false)}
            onToggle={() => toggleEntry(entry.id)}
            onScreenshotClick={() => {
              onScreenshotClick?.(entry)
              setPreviewEntry(entry)
            }}
            onClosePreview={() => setPreviewEntry(null)}
          />
        ))}
      </div>

      {/* Screenshot preview modal */}
      {previewEntry && previewEntry.screenshotDataUrl && (
        <div className="agent-audit-preview-overlay" onClick={() => setPreviewEntry(null)}>
          <div className="agent-audit-preview-card" onClick={(e) => e.stopPropagation()}>
            <div className="agent-audit-preview-header">
              <span>
                {typeIcon(previewEntry.type)} #{previewEntry.step} — {typeLabel(previewEntry.type)}
              </span>
              <button className="agent-audit-preview-close" onClick={() => setPreviewEntry(null)}>
                ✕
              </button>
            </div>
            <img
              className="agent-audit-preview-img"
              src={previewEntry.screenshotDataUrl}
              alt={`Screenshot step ${previewEntry.step}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface AuditEntryCardProps {
  entry: AgentAuditEntry
  expanded: boolean
  onToggle: () => void
  onScreenshotClick: () => void
  onClosePreview: () => void
}

function AuditEntryCard({ entry, expanded, onToggle, onScreenshotClick }: AuditEntryCardProps) {
  return (
    <div className={`agent-audit-entry agent-audit-entry-${entry.type} ${expanded ? 'expanded' : ''}`}>
      <button className="agent-audit-entry-header" onClick={onToggle}>
        <span className="agent-audit-entry-step">{entry.step}</span>
        <span className="agent-audit-entry-type-icon">{typeIcon(entry.type)}</span>
        <span className="agent-audit-entry-type-label">{typeLabel(entry.type)}</span>
        <span className="agent-audit-entry-time">{relativeTime(entry.timestamp)}</span>
        {entry.durationMs && (
          <span className="agent-audit-entry-duration">
            {entry.durationMs >= 1000
              ? `${(entry.durationMs / 1000).toFixed(1)}s`
              : `${entry.durationMs}ms`}
          </span>
        )}
        <span className="agent-audit-entry-chevron">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="agent-audit-entry-body">
          {/* Thought */}
          {entry.thought && (
            <div className="agent-audit-entry-thought">
              <span className="agent-audit-entry-field-label">
                {t('agent.thought') || 'Thought'}
              </span>
              <div className="agent-audit-entry-thought-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeKatex]}
                >
                  {entry.thought}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Tool call */}
          {entry.toolName && (
            <div className="agent-audit-entry-tool-call">
              <span className="agent-audit-entry-field-label">
                {t('agent.tool') || 'Tool'}
              </span>
              <span className="agent-audit-entry-tool-name">{entry.toolName}</span>
              {entry.toolArgs && Object.keys(entry.toolArgs).length > 0 && (
                <pre className="agent-audit-entry-tool-args">
                  {JSON.stringify(entry.toolArgs, null, 2).slice(0, 2000)}
                </pre>
              )}
            </div>
          )}

          {/* Tool result */}
          {entry.toolResult && (
            <div className="agent-audit-entry-tool-result">
              <span className="agent-audit-entry-field-label">
                {t('agent.result') || 'Result'}
              </span>
              <pre className="agent-audit-entry-tool-result-text">
                {entry.toolResult.slice(0, 3000)}
                {entry.toolResult.length > 3000 && (
                  <span className="agent-audit-entry-truncated">
                    {'... ('}
                    {t('agent.auditTruncated') || 'truncated'}
                    {')'}
                  </span>
                )}
              </pre>
            </div>
          )}

          {/* Error */}
          {entry.error && (
            <div className="agent-audit-entry-error">
              <span className="agent-audit-entry-field-label">
                {t('agent.errorLabel') || 'Error'}
              </span>
              <span className="agent-audit-entry-error-text">{entry.error}</span>
            </div>
          )}

          {/* Screenshot thumbnail */}
          {entry.screenshotDataUrl && (
            <div className="agent-audit-entry-screenshot">
              <span className="agent-audit-entry-field-label">
                {t('agent.loopScreenshot') || 'Screenshot'}
              </span>
              <button
                className="agent-audit-entry-screenshot-thumb"
                onClick={onScreenshotClick}
              >
                <img
                  className="agent-audit-entry-screenshot-img"
                  src={entry.screenshotDataUrl}
                  alt={`Step ${entry.step} screenshot`}
                />
                <span className="agent-audit-entry-screenshot-zoom">🔍</span>
              </button>
            </div>
          )}

          {/* Final answer */}
          {entry.finalAnswer && (
            <div className="agent-audit-entry-final-answer">
              <span className="agent-audit-entry-field-label">
                {t('agent.finalAnswer') || 'Final Answer'}
              </span>
              <div className="agent-audit-entry-final-answer-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeKatex]}
                >
                  {entry.finalAnswer}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
