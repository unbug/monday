/**
 * AsyncTaskQueue — "delegate and come back" UI for v1.3.
 *
 * Users submit browser tasks here, minimize the panel, and get notified
 * via the v0.29 background notification system when the agent finishes
 * or needs human input.
 *
 * Inspired by Codex Web's task-delegation model.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { loadAsyncTasks, saveAsyncTask, deleteAsyncTask } from '../lib/storage'
import { loadAllTaskBriefs } from '../lib/storage'
import type { AsyncTask, TaskBrief } from '../types'
import { t } from '../lib/i18n'
import './AsyncTaskQueue.css'

interface AsyncTaskQueueProps {
  /** Called when a task completes and needs notification */
  onTaskComplete?: (task: AsyncTask) => void
  /** Called when a task needs human input */
  onNeedsInput?: (task: AsyncTask) => void
  /** Called to submit a new task to the agent loop */
  onSubmitTask?: (goal: string, briefId: string | null) => void
  /** Whether the panel is minimized (shows only a chip) */
  minimized?: boolean
  /** Toggle minimized state */
  onToggleMinimize?: () => void
}

/** Status badge colors */
const STATUS_COLORS: Record<AsyncTask['status'], string> = {
  pending: '#f59e0b',
  running: '#3b82f6',
  done: '#22c55e',
  error: '#ef4444',
  cancelled: '#6b7280',
  needs_input: '#a855f7',
}

/** Status label */
function statusLabel(status: AsyncTask['status']): string {
  const map: Record<AsyncTask['status'], string> = {
    pending: at('pending'),
    running: at('running'),
    done: at('done'),
    error: at('error'),
    cancelled: at('cancelled'),
    needs_input: at('needsInput'),
  }
  return map[status]
}

/** i18n helper for asyncTask keys */
function at(key: string): string {
  return t(`asyncTask.${key}`)
}

/** Relative time string */
function relativeTime(ts: number | null): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 0) return at('justNow')
  if (diff < 60_000) return at('justNow')
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

export function AsyncTaskQueue({
  onTaskComplete,
  onNeedsInput,
  onSubmitTask,
  minimized = false,
  onToggleMinimize,
}: AsyncTaskQueueProps) {
  const [tasks, setTasks] = useState<AsyncTask[]>([])
  const [briefs, setBriefs] = useState<TaskBrief[]>([])
  const [goal, setGoal] = useState('')
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null)
  const intervalRef = useRef(pollTimer)
  intervalRef.current = pollTimer

  // Load tasks and briefs
  const refreshTasks = useCallback(async () => {
    const [loaded, briefList] = await Promise.all([
      loadAsyncTasks(),
      loadAllTaskBriefs(),
    ])
    setTasks(loaded)
    setBriefs(briefList)
  }, [])

  useEffect(() => {
    refreshTasks()
  }, [refreshTasks])

  // Poll for task status changes every 2s
  useEffect(() => {
    const timer = setInterval(async () => {
      const active = await loadAsyncTasks()
      const hadActive = tasks.some((t) => t.status === 'pending' || t.status === 'running')
      const nowActive = active.some((t) => t.status === 'pending' || t.status === 'running')

      // If tasks changed state, notify
      for (const task of active) {
        const prev = tasks.find((t) => t.id === task.id)
        if (prev && prev.status !== task.status) {
          if (task.status === 'done' || task.status === 'error' || task.status === 'cancelled') {
            onTaskComplete?.(task)
          }
          if (task.status === 'needs_input') {
            onNeedsInput?.(task)
          }
        }
      }

      setTasks(active)
    }, 2000)

    return () => clearInterval(timer)
  }, [tasks, onTaskComplete, onNeedsInput])

  // Submit task
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!goal.trim()) return

      const task: AsyncTask = {
        id: `at-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        goal: goal.trim(),
        briefId: selectedBriefId || null,
        status: 'pending',
        steps: [],
        result: '',
        error: null,
        createdAt: Date.now(),
        finishedAt: null,
      }

      setTasks((prev) => [task, ...prev])
      setGoal('')
      setSelectedBriefId(null)

      // Notify parent to start executing
      onSubmitTask?.(task.goal, task.briefId)
    },
    [goal, selectedBriefId, onSubmitTask],
  )

  // Delete task
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteAsyncTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    },
    [],
  )

  // Cancel running task
  const handleCancel = useCallback(
    async (task: AsyncTask) => {
      if (task.status !== 'pending' && task.status !== 'running') return
      const updated = { ...task, status: 'cancelled' as const, finishedAt: Date.now() }
      await saveAsyncTask(updated)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    },
    [],
  )

  // Expand/collapse task
  const toggleExpand = useCallback((id: string) => {
    setExpandedTaskId((prev) => (prev === id ? null : id))
  }, [])

  if (minimized) {
    const activeCount = tasks.filter(
      (t) => t.status === 'pending' || t.status === 'running',
    ).length
    const doneCount = tasks.filter((t) => t.status === 'done').length

    return (
      <div className="async-task-queue-minimized">
        <button
          className="async-task-queue-minimized-btn"
          onClick={onToggleMinimize}
          title={at('title')}
        >
          <span className="async-task-queue-minimized-icon">📋</span>
          {activeCount > 0 && (
            <span className="async-task-queue-minimized-badge">{activeCount}</span>
          )}
          {doneCount > 0 && (
            <span className="async-task-queue-minimized-badge async-task-queue-minimized-badge--done">
              {doneCount}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="async-task-queue">
      <div className="async-task-queue-header">
        <h3 className="async-task-queue-title">{at('title')}</h3>
        <span className="async-task-queue-count">{tasks.length}</span>
      </div>

      {/* Task submission form */}
      <form className="async-task-queue-form" onSubmit={handleSubmit}>
        <textarea
          className="async-task-queue-goal-input"
          placeholder={at('goalPlaceholder')}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
        />
        {briefs.length > 0 && (
          <div className="async-task-queue-brief-selector">
            <label>{at('briefLabel')}</label>
            <select
              className="async-task-queue-brief-select"
              value={selectedBriefId ?? ''}
              onChange={(e) => setSelectedBriefId(e.target.value || null)}
            >
              <option value="">{at('noBrief')}</option>
              {briefs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="async-task-queue-submit-btn"
          disabled={!goal.trim()}
        >
          {at('submit')}
        </button>
      </form>

      {/* Task list */}
      <div className="async-task-queue-list">
        {tasks.length === 0 && (
          <div className="async-task-queue-empty">{at('empty')}</div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="async-task-queue-item">
            <div
              className="async-task-queue-item-header"
              onClick={() => toggleExpand(task.id)}
            >
              <span
                className="async-task-queue-status-dot"
                style={{ backgroundColor: STATUS_COLORS[task.status] }}
              />
              <span className="async-task-queue-item-goal">{task.goal}</span>
              <span
                className="async-task-queue-item-status"
                style={{ color: STATUS_COLORS[task.status] }}
              >
                {statusLabel(task.status)}
              </span>
              <span className="async-task-queue-item-time">
                {relativeTime(task.createdAt)}
              </span>
              <span className="async-task-queue-item-expand">
                {expandedTaskId === task.id ? '▾' : '▸'}
              </span>
            </div>

            {expandedTaskId === task.id && (
              <div className="async-task-queue-item-body">
                {task.briefId && (
                  <div className="async-task-queue-item-brief">
                    📄 Brief: <strong>{briefs.find((b) => b.id === task.briefId)?.name}</strong>
                  </div>
                )}
                {task.steps.length > 0 && (
                  <div className="async-task-queue-item-steps">
                    <strong>{at('steps')}:</strong> {task.steps.length}
                  </div>
                )}
                {task.result && (
                  <div className="async-task-queue-item-result">
                    <strong>{at('result')}:</strong>
                    <pre className="async-task-queue-item-result-text">{task.result}</pre>
                  </div>
                )}
                {task.error && (
                  <div className="async-task-queue-item-error">
                    <strong>{at('error')}:</strong>
                    <pre className="async-task-queue-item-error-text">{task.error}</pre>
                  </div>
                )}
                <div className="async-task-queue-item-actions">
                  {task.status === 'running' && (
                    <button
                      className="async-task-queue-cancel-btn"
                      onClick={() => handleCancel(task)}
                    >
                      {at('cancel')}
                    </button>
                  )}
                  <button
                    className="async-task-queue-delete-btn"
                    onClick={() => handleDelete(task.id)}
                  >
                    {at('delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
