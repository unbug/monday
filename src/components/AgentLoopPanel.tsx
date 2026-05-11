/**
 * AgentLoopPanel — Sandbox iframe execution loop (Tier 1).
 *
 * UI for the agent loop: task input, sandboxed iframe, screenshot preview,
 * iteration log, and controls (start/stop/refresh).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAgentLoop } from '../hooks/useAgentLoop'
import type { AgentLoopStatus } from '../hooks/useAgentLoop'
import { t } from '../lib/i18n'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'

interface Props {
  onBack: () => void
  /** When a screenshot is captured, this callback receives the data URL for injection into the next LLM call */
  onScreenshotReady?: (dataUrl: string) => void
  /** When the model generates HTML, this callback receives it for rendering */
  onHtmlGenerated?: (html: string) => void
  /** Current task goal from the agent engine */
  taskGoal?: string
  /** Steps from the agent engine */
  steps?: Array<{
    id: string
    step: number
    status: string
    startedAt: number
    finishedAt: number | null
    toolName?: string
    toolArgs?: Record<string, unknown>
    toolResult?: string
    error?: string
    thought?: string
  }>
  /** Whether the agent is actively running */
  agentRunning?: boolean
  /** Stop the agent */
  onAgentStop?: () => void
}

interface IterationEntry {
  iteration: number
  html: string | null
  screenshotDataUrl: string | null
  timestamp: number
  error: string | null
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

export function AgentLoopPanel({
  onBack,
  onScreenshotReady,
  onHtmlGenerated,
  taskGoal,
  steps,
  agentRunning,
  onAgentStop,
}: Props) {
  const [taskInput, setTaskInput] = useState('')
  const [iterations, setIterations] = useState<IterationEntry[]>([])
  const [activeIteration, setActiveIteration] = useState<number | null>(null)
  const [iframeVisible, setIframeVisible] = useState(true)
  const [showHtml, setShowHtml] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const iframeContainerRef = useRef<HTMLDivElement>(null)

  const { state: loopState, actions: loopActions, iframeEl, screenshotRef } = useAgentLoop({
    onScreenshot: (dataUrl, iteration) => {
      setIterations((prev) => {
        const entry = {
          iteration,
          html: null,
          screenshotDataUrl: dataUrl,
          timestamp: Date.now(),
          error: null,
        }
        onScreenshotReady?.(dataUrl)
        return [...prev.slice(-19), entry]
      })
      setActiveIteration(iteration)
    },
    onIterationComplete: (html, iteration) => {
      if (html) {
        onHtmlGenerated?.(html)
        setIterations((prev) => {
          return prev.map((e) =>
            e.iteration === iteration ? { ...e, html } : e,
          )
        })
      }
    },
    autoRefreshDelay: autoRefresh ? 800 : Infinity,
  })

  // Update iframe srcDoc when HTML changes
  useEffect(() => {
    if (loopState.currentHtml && iframeEl) {
      loopActions.setHtml(loopState.currentHtml)
    }
  }, [loopState.currentHtml, iframeEl])

  const handleStart = useCallback(() => {
    const goal = taskInput.trim() || taskGoal
    if (!goal) return
    loopActions.start(goal)
    setIterations([])
    setActiveIteration(null)
    setIframeVisible(true)
  }, [taskInput, taskGoal, loopActions])

  const handleStop = useCallback(() => {
    loopActions.stop()
    onAgentStop?.()
  }, [loopActions, onAgentStop])

  const handleRefresh = useCallback(() => {
    loopActions.refresh()
  }, [loopActions])

  const handleClear = useCallback(() => {
    loopActions.clear()
    setTaskInput('')
    setIterations([])
    setActiveIteration(null)
    setIframeVisible(false)
  }, [loopActions])

  const activeEntry = iterations.find((e) => e.iteration === activeIteration) ?? iterations[iterations.length - 1]

  const statusIcon: Record<AgentLoopStatus, string> = {
    idle: '⏸',
    running: '🔄',
    paused: '⏹',
    error: '⚠️',
  }

  const statusColor: Record<AgentLoopStatus, string> = {
    idle: '#6b7280',
    running: '#8b5cf6',
    paused: '#6b7280',
    error: '#ef4444',
  }

  return (
    <div className="agent-loop-panel">
      {/* Header */}
      <div className="agent-loop-header">
        <button className="agent-loop-back-btn" onClick={onBack} title={t('agent.back') || 'Back'}>
          ←
        </button>
        <div className="agent-loop-title-row">
          <h2 className="agent-loop-title">
            <span className="agent-loop-icon">🤖</span>
            {t('agent.loopTitle') || 'Sandboxed Agent Loop'}
          </h2>
          <span
            className="agent-loop-status-dot"
            style={{ '--loop-status-color': statusColor[loopState.status] } as React.CSSProperties}
          >
            {statusIcon[loopState.status]}
          </span>
        </div>
        <p className="agent-loop-subtitle">
          {t('agent.loopSubtitle') || 'Generate → render → screenshot → iterate'}
        </p>
      </div>

      {/* Task input */}
      <div className="agent-loop-task-section">
        <label className="agent-loop-task-label">
          {t('agent.loopGoal') || 'Task Goal'}
        </label>
        <textarea
          className="agent-loop-task-input"
          placeholder={t('agent.loopGoalPlaceholder') || 'Describe what the agent should accomplish...'}
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          rows={2}
        />
        <div className="agent-loop-controls">
          {loopState.status === 'idle' || loopState.status === 'paused' ? (
            <button
              className="agent-loop-start-btn"
              onClick={handleStart}
              disabled={!taskInput.trim() && !taskGoal}
            >
              ▶ {t('agent.loopStart') || 'Start Loop'}
            </button>
          ) : (
            <button className="agent-loop-stop-btn" onClick={handleStop}>
              ⏹ {t('agent.loopStop') || 'Stop'}
            </button>
          )}

          {loopState.status === 'running' && (
            <>
              <button className="agent-loop-refresh-btn" onClick={handleRefresh}>
                ↻ {t('agent.loopRefresh') || 'Refresh'}
              </button>
              <label className="agent-loop-autorefresh-toggle">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>{t('agent.loopAutoRefresh') || 'Auto-refresh'}</span>
              </label>
            </>
          )}

          {(loopState.status === 'running' || iterations.length > 0) && (
            <button className="agent-loop-clear-btn" onClick={handleClear}>
              ↺ {t('agent.loopClear') || 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Iteration count */}
      <div className="agent-loop-stats">
        <span className="agent-loop-stat-item">
          {t('agent.loopIterations') || 'Iterations'}: {loopState.iterations}
        </span>
        {loopState.lastScreenshotAt && (
          <span className="agent-loop-stat-item">
            {t('agent.loopLastScreenshot') || 'Last screenshot'}: {relativeTime(loopState.lastScreenshotAt)}
          </span>
        )}
        {loopState.error && (
          <span className="agent-loop-stat-error">
            {t('agent.loopError') || 'Error'}: {loopState.error}
          </span>
        )}
      </div>

      {/* Iframe preview */}
      {iframeVisible && (
        <div className="agent-loop-iframe-section">
          <div className="agent-loop-iframe-header">
            <span className="agent-loop-iframe-label">
              {t('agent.loopPreview') || 'Sandboxed Preview'}
            </span>
            <button
              className="agent-loop-iframe-toggle"
              onClick={() => setIframeVisible(false)}
            >
              ✕
            </button>
          </div>
          <div className="agent-loop-iframe-container" ref={iframeContainerRef}>
            <iframe
              ref={screenshotRef}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="agent-loop-iframe"
              title="Sandboxed agent preview"
            />
          </div>
        </div>
      )}

      {/* Show iframe button when hidden */}
      {!iframeVisible && (
        <button
          className="agent-loop-show-iframe-btn"
          onClick={() => setIframeVisible(true)}
        >
          👁 {t('agent.loopShowPreview') || 'Show Preview'}
        </button>
      )}

      {/* HTML source toggle */}
      {activeEntry?.html && (
        <div className="agent-loop-html-section">
          <div className="agent-loop-html-header">
            <button
              className={`agent-loop-html-toggle ${showHtml ? 'active' : ''}`}
              onClick={() => setShowHtml(!showHtml)}
            >
              {showHtml ? '▼' : '▶'} {t('agent.loopHtmlSource') || 'HTML Source'}
            </button>
          </div>
          {showHtml && (
            <pre className="agent-loop-html-source">
              <code>{activeEntry.html.slice(0, 5000)}</code>
              {activeEntry.html.length > 5000 && (
                <span className="agent-loop-html-truncated">
                  {' '}
                  ({t('agent.loopTruncated') || 'truncated'})
                </span>
              )}
            </pre>
          )}
        </div>
      )}

      {/* Screenshot preview */}
      {activeEntry?.screenshotDataUrl && (
        <div className="agent-loop-screenshot-section">
          <div className="agent-loop-screenshot-header">
            <span className="agent-loop-screenshot-label">
              📸 {t('agent.loopScreenshot') || 'Screenshot'} #{activeEntry.iteration}
            </span>
          </div>
          <img
            className="agent-loop-screenshot-img"
            src={activeEntry.screenshotDataUrl}
            alt={`Screenshot iteration ${activeEntry.iteration}`}
          />
        </div>
      )}

      {/* Iteration history */}
      {iterations.length > 0 && (
        <div className="agent-loop-iterations-section">
          <h3 className="agent-loop-iterations-title">
            {t('agent.loopHistory') || 'Iteration History'}
          </h3>
          <div className="agent-loop-iterations-list">
            {iterations.map((entry) => (
              <button
                key={entry.iteration}
                className={`agent-loop-iteration-card ${
                  entry.iteration === activeIteration ? 'active' : ''
                }`}
                onClick={() => setActiveIteration(entry.iteration)}
              >
                <span className="agent-loop-iteration-num">#{entry.iteration}</span>
                <span className="agent-loop-iteration-status">
                  {entry.error ? (
                    <span className="agent-loop-iteration-error">✕</span>
                  ) : entry.screenshotDataUrl ? (
                    <span className="agent-loop-iteration-ok">✓</span>
                  ) : (
                    <span className="agent-loop-iteration-pending">○</span>
                  )}
                </span>
                <span className="agent-loop-iteration-time">
                  {relativeTime(entry.timestamp)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent steps (if provided from agent engine) */}
      {steps && steps.length > 0 && (
        <div className="agent-loop-steps-section">
          <h3 className="agent-loop-steps-title">
            {t('agent.loopSteps') || 'Agent Steps'}
          </h3>
          <div className="agent-loop-steps-list">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`agent-loop-step-card agent-loop-step-${step.status}`}
              >
                <div className="agent-loop-step-header">
                  <span className="agent-loop-step-num">#{step.step}</span>
                  <span className="agent-loop-step-status">
                    {step.status === 'tool_call' && '🔧'}
                    {step.status === 'tool_result' && '📋'}
                    {step.status === 'done' && '✅'}
                    {step.status === 'error' && '❌'}
                    {step.status === 'planning' && '🧠'}
                  </span>
                  <span className="agent-loop-step-duration">
                    {step.finishedAt
                      ? `${Math.round((step.finishedAt - step.startedAt) / 1000)}s`
                      : '...'}
                  </span>
                </div>
                {step.thought && (
                  <div className="agent-loop-step-thought">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight, rehypeKatex]}
                    >
                      {step.thought}
                    </ReactMarkdown>
                  </div>
                )}
                {step.toolName && (
                  <div className="agent-loop-step-tool">
                    <span className="agent-loop-step-tool-name">{step.toolName}</span>
                    {step.toolArgs && (
                      <pre className="agent-loop-step-tool-args">
                        {JSON.stringify(step.toolArgs, null, 2).slice(0, 500)}
                      </pre>
                    )}
                  </div>
                )}
                {step.toolResult && (
                  <div className="agent-loop-step-result">
                    <pre>{step.toolResult.slice(0, 1000)}</pre>
                  </div>
                )}
                {step.error && (
                  <div className="agent-loop-step-error">
                    {step.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
