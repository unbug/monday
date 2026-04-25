/**
 * ToolCallPanel — displays tool calls and results during function calling.
 * Collapsible panel that shows each tool call with its arguments, result, and latency.
 */

import { useState } from 'react'
import type { ToolCallEvent } from '../hooks/useFunctionCalling'

interface ToolCallPanelProps {
  events: ToolCallEvent[]
  isProcessing: boolean
  onCollapse: () => void
}

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
  if (entries.length === 0) return '(no arguments)'
  return entries
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: "${v}"`
      if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`
      return `${k}: ${JSON.stringify(v).slice(0, 100)}`
    })
    .join(', ')
}

function formatResult(result: string): string {
  if (result.length > 200) return result.slice(0, 200) + '…'
  return result
}

export function ToolCallPanel({ events, isProcessing, onCollapse }: ToolCallPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const toolCalls = events.filter((e) => e.type === 'tool_call')
  const toolResults = events.filter((e) => e.type === 'tool_result')

  if (toolCalls.length === 0) return null

  return (
    <div className="tool-call-panel">
      <button
        className="tool-call-panel-header"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Collapse' : 'Expand'}
      >
        <span className="tool-call-panel-icon">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="tool-call-panel-title">
          {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''} {isProcessing ? 'executing…' : 'executed'}
        </span>
        <span className="tool-call-panel-close" onClick={(e) => { e.stopPropagation(); onCollapse(); }}>
          ✕
        </span>
      </button>

      {expanded && (
        <div className="tool-call-panel-body">
          {toolCalls.map((tc, i) => {
            const result = toolResults[i]?.result
            const success = result?.success
            return (
              <div key={tc.call.id} className={`tool-call-item ${success ? 'tool-call-success' : 'tool-call-error'}`}>
                <div className="tool-call-header">
                  <span className="tool-call-icon">
                    {success ? '✓' : '✗'}
                  </span>
                  <span className="tool-call-name">{tc.call.name}</span>
                  <span className="tool-call-latency">
                    {result ? `${result.latency.toFixed(0)}ms` : '…'}
                  </span>
                </div>
                <div className="tool-call-args">
                  {formatArgs(tc.call.args)}
                </div>
                {result && (
                  <div className={`tool-call-result ${success ? 'tool-call-result-ok' : 'tool-call-result-err'}`}>
                    {formatResult(result.result)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
