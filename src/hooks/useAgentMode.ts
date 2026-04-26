/**
 * useAgentMode — manages the agent mode lifecycle.
 *
 * When enabled, the user's message becomes a task goal. The agent
 * autonomously executes tools to accomplish it, with progress
 * displayed in the AgentPanel.
 */

import { useState, useCallback, useRef } from 'react'
import { createAgentEngine } from '../lib/agent'
import type { AgentTask } from '../types'

export interface AgentModeState {
  /** Current agent task */
  task: AgentTask | null
  /** Whether the agent is currently running */
  isRunning: boolean
  /** Latest step count */
  stepCount: number
  /** Last error message */
  error: string | null
}

export interface UseAgentModeOptions {
  /** Called when the agent produces a result */
  onAgentResult?: (result: string) => void
  /** Called when the agent completes */
  onAgentComplete?: () => void
}

export function useAgentMode(options: UseAgentModeOptions = {}) {
  const [state, setState] = useState<AgentModeState>({
    task: null,
    isRunning: false,
    stepCount: 0,
    error: null,
  })

  const engineRef = useRef<ReturnType<typeof createAgentEngine> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Start a new agent task with the given goal.
   */
  const start = useCallback(
    async (goal: string): Promise<AgentTask> => {
      // Cancel any existing agent
      if (engineRef.current) {
        engineRef.current.stop()
      }

      const newTask: AgentTask = {
        id: crypto.randomUUID(),
        goal,
        status: 'idle',
        steps: [],
        result: '',
        error: null,
        createdAt: Date.now(),
        finishedAt: null,
      }

      setState({
        task: newTask,
        isRunning: true,
        stepCount: 0,
        error: null,
      })

      const controller = new AbortController()
      engineRef.current = createAgentEngine({
        goal,
        onStep: (step) => {
          setState((prev) => ({
            ...prev,
            task: prev.task ? { ...prev.task, steps: [...prev.task.steps, step] } : null,
            stepCount: prev.task ? prev.task.steps.length + 1 : prev.stepCount,
          }))
        },
        onResult: (result) => {
          setState((prev) => ({
            ...prev,
            isRunning: false,
          }))
          options.onAgentResult?.(result)
          options.onAgentComplete?.()
        },
        signal: controller.signal,
      })

      const task = engineRef.current.task
      setState((prev) => ({ ...prev, task }))

      try {
        const result = await engineRef.current.run()
        return task
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Agent execution failed'
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: errorMsg,
          task: prev.task ? { ...prev.task, status: 'error' as const, error: errorMsg } : null,
        }))
        throw err
      }
    },
    [options],
  )

  /**
   * Stop the current agent task.
   */
  const stop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop()
      setState((prev) => ({
        ...prev,
        isRunning: false,
      }))
    }
  }, [])

  /**
   * Clear the current agent task.
   */
  const clear = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop()
      engineRef.current = null
    }
    setState({
      task: null,
      isRunning: false,
      stepCount: 0,
      error: null,
    })
  }, [])

  return {
    state,
    start,
    stop,
    clear,
  }
}
