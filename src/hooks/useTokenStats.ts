import { useState, useRef, useCallback, useEffect } from 'react'

export interface TokenStats {
  /** Total tokens generated so far */
  totalTokens: number
  /** Tokens generated in the current session */
  sessionTokens: number
  /** Tokens per second (0 when not streaming) */
  tokensPerSecond: number
  /** Elapsed time in seconds since streaming started */
  elapsedSeconds: number
}

export function useTokenStats() {
  const [stats, setStats] = useState<TokenStats>({
    totalTokens: 0,
    sessionTokens: 0,
    tokensPerSecond: 0,
    elapsedSeconds: 0,
  })
  const [isStreaming, setIsStreaming] = useState(false)

  const startTimeRef = useRef<number>(0)
  const tokenCountRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  const startStreaming = useCallback(() => {
    setIsStreaming(true)
    startTimeRef.current = Date.now()
    tokenCountRef.current = 0

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const tps = elapsed > 0 ? tokenCountRef.current / elapsed : 0
      setStats((prev) => ({
        ...prev,
        tokensPerSecond: Math.round(tps * 10) / 10,
        elapsedSeconds: Math.round(elapsed * 10) / 10,
      }))
    }, 200)
  }, [])

  const addTokens = useCallback((count: number) => {
    tokenCountRef.current += count
    setStats((prev) => ({
      ...prev,
      sessionTokens: prev.sessionTokens + count,
    }))
  }, [])

  const finishStreaming = useCallback((usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }) => {
    setIsStreaming(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const tps = elapsed > 0 ? tokenCountRef.current / elapsed : 0

    setStats({
      totalTokens: usage.totalTokens,
      sessionTokens: usage.completionTokens,
      tokensPerSecond: Math.round(tps * 10) / 10,
      elapsedSeconds: Math.round(elapsed * 10) / 10,
    })
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsStreaming(false)
    tokenCountRef.current = 0
    setStats({
      totalTokens: 0,
      sessionTokens: 0,
      tokensPerSecond: 0,
      elapsedSeconds: 0,
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return { stats, isStreaming, startStreaming, addTokens, finishStreaming, reset }
}
