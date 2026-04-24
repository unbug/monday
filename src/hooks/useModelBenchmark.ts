import { useState, useCallback, useRef } from 'react'
import { loadModel, unloadModel, streamChatWithUsage } from '../lib/engine'
import { recordModelUsage } from '../lib/modelUsage'
import type { ModelInfo } from '../types'
import {
  BENCHMARK_PROMPT,
  type BenchmarkResult,
  type BenchmarkState,
} from '../lib/benchmark'

interface UseModelBenchmarkOptions {
  onProgress?: (p: number) => void
}

export function useModelBenchmark(options: UseModelBenchmarkOptions = {}) {
  const [state, setState] = useState<BenchmarkState>({
    isRunning: false,
    result: null,
    currentStep: 'idle',
    progress: 0,
  })
  const abortRef = useRef(false)

  const runBenchmark = useCallback(
    async (model: ModelInfo) => {
      abortRef.current = false
      setState({
        isRunning: true,
        result: null,
        currentStep: 'loading',
        progress: 0,
      })

      const startTime = Date.now()

      try {
        // Load model
        await loadModel(model.id, (report) => {
          if (report.text) {
            setState((prev) => ({ ...prev, progress: Math.round(report.progress * 100) }))
          }
        })

        setState((prev) => ({
          ...prev,
          currentStep: 'generating',
          progress: 100,
        }))
        if (options.onProgress) options.onProgress(100)

        // Run benchmark prompt
        const { generator, usage } = streamChatWithUsage(
          [{ role: 'user', content: BENCHMARK_PROMPT }],
          { temperature: 0.7, top_p: 0.9, maxTokens: 512 },
        )

        let fullContent = ''
        let tokenCount = 0

        for await (const token of generator) {
          if (abortRef.current) break
          fullContent += token
          tokenCount++

          const elapsed = (Date.now() - startTime) / 1000
          const tps = elapsed > 0 ? Math.round(tokenCount / elapsed) : 0

          setState({
            isRunning: true,
            result: {
              modelId: model.id,
              modelName: model.name,
              content: fullContent,
              tokensPerSecond: tps,
              totalTokens: tokenCount,
              latencyMs: Date.now() - startTime,
              isStreaming: true,
              error: null,
            },
            currentStep: 'generating',
            progress: 100,
          })
        }

        const finalResult: BenchmarkResult = {
          modelId: model.id,
          modelName: model.name,
          content: fullContent,
          tokensPerSecond: usage.current?.completionTokens
            ? Math.round(
                usage.current.completionTokens / ((Date.now() - startTime) / 1000),
              )
            : 0,
          totalTokens: usage.current?.completionTokens ?? tokenCount,
          latencyMs: Date.now() - startTime,
          isStreaming: false,
          error: null,
        }

        setState({
          isRunning: false,
          result: finalResult,
          currentStep: 'done',
          progress: 100,
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Benchmark failed'
        setState({
          isRunning: false,
          result: {
            modelId: model.id,
            modelName: model.name,
            content: '',
            tokensPerSecond: 0,
            totalTokens: 0,
            latencyMs: Date.now() - startTime,
            isStreaming: false,
            error: errMsg,
          },
          currentStep: 'error',
          progress: 0,
        })
      } finally {
        // Clean up
        if (!abortRef.current) {
          unloadModel()
        }
      }
    },
    [options],
  )

  const stop = useCallback(() => {
    abortRef.current = true
  }, [])

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      result: null,
      currentStep: 'idle',
      progress: 0,
    })
  }, [])

  return {
    state,
    runBenchmark,
    stop,
    reset,
    BENCHMARK_PROMPT,
  }
}
