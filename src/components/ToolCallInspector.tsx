/**
 * ToolCallInspector — enhanced panel that shows the full request / response
 * / latency of every tool call in a session.
 *
 * Each call displays:
 * - Tool name + status icon
 * - Formatted args preview
 * - Raw JSON request (collapsible)
 * - Formatted result preview
 * - Raw JSON response (collapsible)
 * - Latency
 */

import { useState, useCallback } from 'react'
import type { ToolCallEvent } from '../hooks/useFunctionCalling'

interface ToolCallInspectorProps {
  events: ToolCallEvent[]
  isProcessing: boolean
  onCollapse: () => void
}

function formatArgs(args: Record<string, unknown>, rawArgs?: string): string {
  if (rawArgs) return rawArgs
  const entries = Object.entries(args)
  if (entries.length === 0) return '(no arguments)'
  return entries
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: "${v}"`
      if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`
      return `${k}: ${JSON.stringify(v).slice(0, 200)}`
    })
    .join(', ')
}

function formatResult(result: string): string {
  if (result.length > 500) return result.slice(0, 500) + '…'
  return result
}

function RawJsonViewer({ data, label }: { data: string; label: string }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(data).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [data])

  return (
    <div className="inspector-raw-section">
      <div className="inspector-raw-header">
        <button
          className="inspector-raw-toggle"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▾' : '▸'} {label}
        </button>
        <button
          className="inspector-copy-btn"
          onClick={handleCopy}
          title="Copy raw JSON"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      {expanded && (
        <pre className="inspector-raw-content">{data}</pre>
      )}
    </div>
  )
}

export function ToolCallInspector({ events, isProcessing, onCollapse }: ToolCallInspectorProps) {
  const [collapsed, setCollapsed] = useState(false)
  const toolCalls = events.filter((e) => e.type === 'tool_call')
  const toolResults = events.filter((e) => e.type === 'tool_result')

  if (toolCalls.length === 0) return null

  return (
    <div className="tool-call-inspector">
      <button
        className="tool-call-inspector-header"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <span className="tool-call-inspector-icon">
          {collapsed ? '▸' : '▾'}
        </span>
        <span className="tool-call-inspector-title">
          {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''} {isProcessing ? 'executing…' : 'executed'}
        </span>
        <span className="tool-call-inspector-close" onClick={(e) => { e.stopPropagation(); onCollapse(); }}>
          ✕
        </span>
      </button>

      {!collapsed && (
        <div className="tool-call-inspector-body">
          {toolCalls.map((tc, i) => {
            const result = toolResults[i]?.result
            const success = result?.success ?? false
            const rawArgs = tc.call.rawArgs ?? JSON.stringify(tc.call.args, null, 2)

            return (
              <div key={tc.call.id} className={`tool-call-inspector-item ${success ? 'tool-call-success' : 'tool-call-error'}`}>
                <div className="tool-call-inspector-header-row">
                  <span className="tool-call-inspector-status">
                    {success ? '✓' : '✗'}
                  </span>
                  <span className="tool-call-inspector-name">{tc.call.name}</span>
                  <span className="tool-call-inspector-latency">
                    {result ? `${result.latency.toFixed(0)}ms` : '…'}
                  </span>
                </div>

                <div className="tool-call-inspector-args-section">
                  <div className="tool-call-inspector-label">Args</div>
                  <div className="tool-call-inspector-args">{formatArgs(tc.call.args, tc.call.rawArgs)}</div>
                  <RawJsonViewer data={rawArgs} label="Raw JSON" />
                </div>

                {result && (
                  <div className="tool-call-inspector-result-section">
                    <div className="tool-call-inspector-label">Result</div>
                    <div className={`tool-call-inspector-result ${success ? 'tool-call-result-ok' : 'tool-call-result-err'}`}>
                      {formatResult(result.result)}
                    </div>
                    <RawJsonViewer data={JSON.stringify({ result: result.result, latency: result.latency, success: result.success }, null, 2)} label="Raw Response" />
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
