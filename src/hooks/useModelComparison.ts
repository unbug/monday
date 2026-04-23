import { useState, useCallback, useRef, useEffect } from 'react'
import { loadModel, unloadModel, checkWebGPUSupport, streamChatWithUsage } from '../lib/engine'
import { recordModelUsage } from '../lib/modelUsage'
import type { ModelInfo } from '../types'
import type { InitProgressReport } from '@mlc-ai/web-llm'

interface ComparisonResult {
  modelId: string
  modelName: string
  content: string
  tokensPerSecond: number
  totalTokens: number
  elapsedMs: number
  isStreaming: boolean
  error: string | null
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
      const opts = { temperature: 0.7, top_p: 0.9, maxTokens: 1024 }

      // Run Model A
      const resultA: ComparisonResult = {
        modelId: modelA.id,
        modelName: modelA.name,
        content: '',
        tokensPerSecond: 0,
        totalTokens: 0,
        elapsedMs: 0,
        isStreaming: true,
        error: null,
      }

      setResults([resultA])

      try {
        // Load model A
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

          setResults([
            {
              ...resultA,
              content: fullContentA,
              isStreaming: true,
              tokensPerSecond: tps,
              totalTokens: tokenCountA,
              elapsedMs: Date.now() - startTime,
            },
          ])
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
          isStreaming: false,
          error: null,
        }

        setResults([finalA])

        // Run Model B
        const resultB: ComparisonResult = {
          modelId: modelB.id,
          modelName: modelB.name,
          content: '',
          tokensPerSecond: 0,
          totalTokens: 0,
          elapsedMs: 0,
          isStreaming: true,
          error: null,
        }

        setResults([finalA, resultB])

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

          setResults([
            finalA,
            {
              ...resultB,
              content: fullContentB,
              isStreaming: true,
              tokensPerSecond: tps,
              totalTokens: tokenCountB,
              elapsedMs: Date.now() - startTime,
            },
          ])
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
          isStreaming: false,
          error: null,
        }

        setResults([finalA, finalB])
        setCurrentStep('done')
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Comparison failed'
        setError(errMsg)
        setCurrentStep('done')
      } finally {
        setIsComparing(false)
      }
    },
    [modelA, modelB],
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
