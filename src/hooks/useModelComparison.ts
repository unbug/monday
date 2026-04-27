import { useState, useCallback, useRef, useEffect } from 'react'
import { loadModel, unloadModel, checkWebGPUSupport, streamChatWithUsage } from '../lib/engine'
import { recordModelUsage } from '../lib/modelUsage'
import type { ModelInfo } from '../types'
import type { InitProgressReport } from '@mlc-ai/web-llm'

type PaneStatus = 'pending' | 'streaming' | 'done' | 'error'

interface ComparisonResult {
  modelId: string
  modelName: string
  content: string
  tokensPerSecond: number
  totalTokens: number
  elapsedMs: number
  status: PaneStatus
  error: string | null
  provider: 'WebGPU' | 'WASM' | 'Unknown'
}

export function useModelComparison() {
  const [modelA, setModelA] = useState<ModelInfo | null>(null)
  const [modelB, setModelB] = useState<ModelInfo | null>(null)
  const [results, setResults] = useState<ComparisonResult[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'running' | 'done'>('select')
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    setWebgpuSupported(checkWebGPUSupport())
  }, [])

  const detectProvider = useCallback((): 'WebGPU' | 'WASM' | 'Unknown' => {
    if (checkWebGPUSupport()) return 'WebGPU'
    return 'WASM'
  }, [])

  const loadModelForComparison = useCallback(
    async (info: ModelInfo, slot: 'A' | 'B') => {
      const setModel = slot === 'A' ? setModelA : setModelB
      setModel(info)
      recordModelUsage(info.id)
    },
    [],
  )

  const startComparison = useCallback(
    async (prompt: string) => {
      if (!modelA || !modelB) return

      abortRef.current = false
      setIsComparing(true)
      setCurrentStep('running')
      setError(null)
      setResults([])

      const startTime = Date.now()
      const provider = detectProvider()
      const opts = { temperature: 0.7, top_p: 0.9, maxTokens: 1024 }

      // Create result slots
      const resultA: ComparisonResult = {
        modelId: modelA.id,
        modelName: modelA.name,
        content: '',
        tokensPerSecond: 0,
        totalTokens: 0,
        elapsedMs: 0,
        status: 'pending',
        error: null,
        provider,
      }

      const resultB: ComparisonResult = {
        modelId: modelB.id,
        modelName: modelB.name,
        content: '',
        tokensPerSecond: 0,
        totalTokens: 0,
        elapsedMs: 0,
        status: 'pending',
        error: null,
        provider,
      }

      setResults([resultA, resultB])

      try {
        // Run Model A
        const slotAIndex = 0
        setResults((prev) =>
          prev.map((r, i) => (i === slotAIndex ? { ...r, status: 'streaming' as PaneStatus } : r)),
        )

        await loadModel(modelA.id, () => {})
        const { generator: genA, usage: usageA } = streamChatWithUsage(
          [{ role: 'user', content: prompt }],
          opts,
        )

        let fullContentA = ''
        let tokenCountA = 0

        for await (const token of genA) {
          if (abortRef.current) break
          fullContentA += token
          tokenCountA++

          const elapsed = (Date.now() - startTime) / 1000
          const tps = elapsed > 0 ? Math.round(tokenCountA / elapsed) : 0

          setResults((prev) =>
            prev.map((r, i) =>
              i === slotAIndex
                ? {
                    ...r,
                    content: fullContentA,
                    status: 'streaming' as PaneStatus,
                    tokensPerSecond: tps,
                    totalTokens: tokenCountA,
                    elapsedMs: Date.now() - startTime,
                  }
                : r,
            ),
          )
        }

        const finalA: ComparisonResult = {
          modelId: modelA.id,
          modelName: modelA.name,
          content: fullContentA,
          tokensPerSecond: usageA.current?.completionTokens
            ? Math.round(usageA.current.completionTokens / ((Date.now() - startTime) / 1000))
            : 0,
          totalTokens: usageA.current?.completionTokens ?? tokenCountA,
          elapsedMs: Date.now() - startTime,
          status: 'done' as PaneStatus,
          error: null,
          provider,
        }

        setResults([finalA, resultB])

        // Run Model B
        const slotBIndex = 1
        setResults((prev) =>
          prev.map((r, i) => (i === slotBIndex ? { ...r, status: 'streaming' as PaneStatus } : r)),
        )

        await loadModel(modelB.id, () => {})
        const { generator: genB, usage: usageB } = streamChatWithUsage(
          [{ role: 'user', content: prompt }],
          opts,
        )

        let fullContentB = ''
        let tokenCountB = 0

        for await (const token of genB) {
          if (abortRef.current) break
          fullContentB += token
          tokenCountB++

          const elapsed = (Date.now() - startTime) / 1000
          const tps = elapsed > 0 ? Math.round(tokenCountB / elapsed) : 0

          setResults((prev) =>
            prev.map((r, i) =>
              i === slotBIndex
                ? {
                    ...r,
                    content: fullContentB,
                    status: 'streaming' as PaneStatus,
                    tokensPerSecond: tps,
                    totalTokens: tokenCountB,
                    elapsedMs: Date.now() - startTime,
                  }
                : r,
            ),
          )
        }

        const finalB: ComparisonResult = {
          modelId: modelB.id,
          modelName: modelB.name,
          content: fullContentB,
          tokensPerSecond: usageB.current?.completionTokens
            ? Math.round(usageB.current.completionTokens / ((Date.now() - startTime) / 1000))
            : 0,
          totalTokens: usageB.current?.completionTokens ?? tokenCountB,
          elapsedMs: Date.now() - startTime,
          status: 'done' as PaneStatus,
          error: null,
          provider,
        }

        setResults([finalA, finalB])
        setCurrentStep('done')
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Comparison failed'
        setError(errMsg)
        setCurrentStep('done')
        setResults((prev) =>
          prev.map((r) => (r.status === 'streaming' ? { ...r, status: 'error' as PaneStatus, error: errMsg } : r)),
        )
      } finally {
        setIsComparing(false)
      }
    },
    [modelA, modelB, detectProvider],
  )

  const stopComparison = useCallback(() => {
    abortRef.current = true
  }, [])

  const reset = useCallback(() => {
    setModelA(null)
    setModelB(null)
    setResults([])
    setCurrentStep('select')
    setIsComparing(false)
    setError(null)
  }, [])

  return {
    modelA,
    modelB,
    results,
    isComparing,
    currentStep,
    webgpuSupported,
    error,
    loadModelA: (info: ModelInfo) => loadModelForComparison(info, 'A'),
    loadModelB: (info: ModelInfo) => loadModelForComparison(info, 'B'),
    startComparison,
    stopComparison,
    reset,
    setError,
  }
}
