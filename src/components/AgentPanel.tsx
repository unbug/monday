/**
 * AgentPanel — displays the agent mode task execution progress.
 *
 * Shows the task goal, execution status, step-by-step progress,
 * tool calls and results, and the final answer.
 */

import { useState, useMemo } from 'react'
import type { AgentTask, AgentStep } from '../types'

interface AgentPanelProps {
  task: AgentTask
  onStop: () => void
  onClose: () => void
}

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
  if (entries.length === 0) return '(no arguments)'
  return entries
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}: "${v}"`
      if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`
      return `${k}: ${JSON.stringify(v).slice(0, 80)}`
    })
    .join(', ')
}

function formatDuration(startedAt: number, finishedAt: number | null): string {
  const end = finishedAt ?? Date.now()
  const ms = end - startedAt
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function statusIcon(status: AgentStep['status']): string {
  switch (status) {
    case 'planning': return '🧠'
    case 'executing': return '⚙️'
    case 'tool_call': return '🔧'
    case 'tool_result': return '✅'
    case 'done': return '🏁'
    case 'error': return '❌'
    default: return '⏳'
  }
}

function statusColor(status: AgentStep['status']): string {
  switch (status) {
    case 'done': return 'var(--agent-done-color, #22c55e)'
    case 'error': return 'var(--agent-error-color, #ef4444)'
    case 'tool_call': return 'var(--agent-executing-color, #f59e0b)'
    case 'tool_result': return 'var(--agent-done-color, #22c55e)'
    default: return 'var(--agent-planning-color, #8b5cf6)'
  }
}

export function AgentPanel({ task, onStop, onClose }: AgentPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const isRunning = task.status === 'running' || task.status === 'idle'
  const progress = useMemo(() => {
    if (!isRunning) return 100
    const total = task.steps.length + 5 // estimate 5 more steps
    return Math.min(100, (task.steps.length / total) * 100)
  }, [task.steps.length, isRunning])

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  return (
    <div className="agent-panel">
      {/* Header */}
      <div className="agent-panel-header">
        <span className="agent-panel-icon">🤖</span>
        <span className="agent-panel-title">Agent Mode</span>
        <span className={`agent-panel-status agent-panel-status-${task.status}`}>
          {isRunning ? 'Running' : task.status === 'done' ? 'Complete' : task.status === 'cancelled' ? 'Cancelled' : task.status === 'error' ? 'Error' : 'Idle'}
        </span>
        <button className="agent-panel-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      {/* Task goal */}
      <div className="agent-panel-goal">
        <span className="agent-panel-goal-label">Goal</span>
        <p className="agent-panel-goal-text">{task.goal}</p>
      </div>

      {/* Progress */}
      <div className="agent-panel-progress">
        <div className="agent-panel-progress-bar">
          <div
            className="agent-panel-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="agent-panel-progress-label">
          {task.steps.length} steps{isRunning ? '…' : ''}
        </span>
      </div>

      {/* Action buttons */}
      <div className="agent-panel-actions">
        {isRunning && (
          <button className="agent-panel-btn agent-panel-btn-stop" onClick={onStop}>
            Stop
          </button>
        )}
        {task.status === 'done' && task.result && (
          <span className="agent-panel-complete">✓ Task complete</span>
        )}
        {task.status === 'error' && (
          <span className="agent-panel-error">{task.error}</span>
        )}
      </div>

      {/* Steps */}
      <div className="agent-panel-steps">
        {task.steps.length === 0 && (
          <div className="agent-panel-empty">Waiting to start…</div>
        )}
        {task.steps.map((step) => (
          <div
            key={step.id}
            className={`agent-panel-step ${isRunning && step.status === 'tool_call' ? 'agent-panel-step-active' : ''}`}
            onClick={() => toggleStep(step.id)}
          >
            <div className="agent-panel-step-header">
              <span
                className="agent-panel-step-dot"
                style={{ backgroundColor: statusColor(step.status) }}
              />
              <span className="agent-panel-step-num">#{step.step}</span>
              <span className="agent-panel-step-status">{statusIcon(step.status)}</span>
              <span className="agent-panel-step-time">
                {formatDuration(step.startedAt, step.finishedAt)}
              </span>
              {expandedSteps.has(step.id) && (
                <span className="agent-panel-step-chevron">▾</span>
              )}
            </div>

            {/* Step details */}
            {expandedSteps.has(step.id) && (
              <div className="agent-panel-step-body">
                {step.thought && (
                  <div className="agent-panel-step-thought">
                    <span className="agent-panel-step-label">Thought</span>
                    <p>{step.thought}</p>
                  </div>
                )}
                {step.toolName && (
                  <div className="agent-panel-step-tool">
                    <span className="agent-panel-step-label">Tool</span>
                    <span className="agent-panel-step-tool-name">{step.toolName}</span>
                    {step.toolArgs && (
                      <pre className="agent-panel-step-tool-args">
                        {formatArgs(step.toolArgs)}
                      </pre>
                    )}
                  </div>
                )}
                {step.toolResult && (
                  <div className="agent-panel-step-result">
                    <span className="agent-panel-step-label">Result</span>
                    <pre className="agent-panel-step-result-text">
                      {step.toolResult.length > 500
                        ? step.toolResult.slice(0, 500) + '…'
                        : step.toolResult}
                    </pre>
                  </div>
                )}
                {step.error && (
                  <div className="agent-panel-step-error">
                    <span className="agent-panel-step-label">Error</span>
                    <span>{step.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final result */}
      {task.status === 'done' && task.result && (
        <div className="agent-panel-result">
          <span className="agent-panel-result-label">Final Answer</span>
          <div className="agent-panel-result-content">{task.result}</div>
        </div>
      )}
    </div>
  )
}
