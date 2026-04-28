import { useState, useCallback, useRef, useEffect } from 'react'
import { loadModel, unloadModel, checkWebGPUSupport, streamChatWithUsage } from '../lib/engine'
import { recordModelUsage } from '../lib/modelUsage'
import type { ModelInfo } from '../types'
import type { InitProgressReport } from '@mlc-ai/web-llm'

// Extract HTML code blocks from markdown content
function extractHTMLCode(content: string): string | null {
  // Match ```html ... ``` or ``` ... ``` (no language specified)
  const blockRegex = /```(?:html|HTML)?\s*\n?([\s\S]*?)```/g
  let match
  const blocks: string[] = []

  while ((match = blockRegex.exec(content)) !== null) {
    blocks.push(match[1].trim())
  }

  if (blocks.length === 0) return null

  // Combine all blocks into a single HTML document
  const styles = blocks
    .map((b) => {
      const styleMatch = b.match(/<style>([\s\S]*?)<\/style>/i)
      return styleMatch ? styleMatch[1] : null
    })
    .filter(Boolean)

  const scripts = blocks
    .map((b) => {
      const scriptMatch = b.match(/<script>([\s\S]*?)<\/script>/i)
      return scriptMatch ? scriptMatch[1] : null
    })
    .filter(Boolean)

  const bodies = blocks.filter((b) => !b.includes('<style') && !b.includes('<script'))

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    ...(styles.length > 0 ? [`<style>${styles.join('\n')}</style>`] : []),
    '</head>',
    '<body>',
    ...(bodies.length > 0 ? bodies : ['<div style="padding:16px;font-family:sans-serif;color:#333">No visual output — text-only generation.</div>']),
    '</body>',
    ...(scripts.length > 0 ? [`<script>${scripts.join('\n')}</script>`] : []),
    '</html>',
  ].join('\n')

  return html
}

type PaneStatus = 'pending' | 'streaming' | 'done' | 'error'

interface ComparisonResult {
  modelId: string
  modelName: string
  content: string
  extractedCode: string | null
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
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true)

  // Recording state
  const [recording, setRecording] = useState<{
    active: boolean
    status: 'idle' | 'recording' | 'done'
    fps: number
    duration: number
  }>({ active: false, status: 'idle', fps: 30, duration: 0 })
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const animFrameRef = useRef<number | null>(null)
  const recordingStartRef = useRef<number>(0)
  const abortRef = useRef(false)
  const syncingRef = useRef(false)

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
        extractedCode: null,
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
        extractedCode: null,
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
          extractedCode: extractHTMLCode(fullContentA),
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
          extractedCode: extractHTMLCode(fullContentB),
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

  const iframeRef = useRef<Record<number, HTMLIFrameElement | null>>({ 0: null, 1: null })
  const scrollContainerRefs = useRef<Record<number, HTMLDivElement | null>>({ 0: null, 1: null })

  // Synchronized scroll handler
  const handleScrollSync = useCallback(
    (fromIdx: number) => {
      if (!scrollSyncEnabled) return
      const toIdx = fromIdx === 0 ? 1 : 0
      const fromEl = scrollContainerRefs.current[fromIdx]
      const toEl = scrollContainerRefs.current[toIdx]
      if (!fromEl || !toEl) return
      if (syncingRef.current) return

      syncingRef.current = true
      const fromScrollRatio = fromEl.scrollTop / Math.max(1, fromEl.scrollHeight - fromEl.clientHeight)
      toEl.scrollTop = fromScrollRatio * (toEl.scrollHeight - toEl.clientHeight)

      requestAnimationFrame(() => {
        syncingRef.current = false
      })
    },
    [scrollSyncEnabled],
  )

  // ── Recording helpers ──
  const drawFrame = useCallback(() => {
    const canvas = recordingCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const halfW = w / 2

    // Clear
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, w, h)

    // Draw each pane
    for (let i = 0; i < 2; i++) {
      const iframe = iframeRef.current[i]
      const x = i * halfW

      // Pane background
      ctx.fillStyle = '#161b22'
      ctx.fillRect(x + 4, 4, halfW - 8, h - 8)

      // Title bar
      ctx.fillStyle = '#21262d'
      ctx.fillRect(x + 4, 4, halfW - 8, 28)

      // Title bar dots
      ctx.fillStyle = '#f38ba8'
      ctx.beginPath()
      ctx.arc(x + 18, 18, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f9e2af'
      ctx.beginPath()
      ctx.arc(x + 32, 18, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#a6e3a1'
      ctx.beginPath()
      ctx.arc(x + 46, 18, 4, 0, Math.PI * 2)
      ctx.fill()

      // Model name in title bar
      ctx.fillStyle = '#c9d1d9'
      ctx.font = 'bold 12px monospace'
      ctx.fillText(i === 0 ? results[0]?.modelName || 'Model A' : results[1]?.modelName || 'Model B', x + 60, 22)

      // Draw iframe content
      if (iframe && iframe.contentDocument) {
        try {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x + 4, 36, halfW - 8, h - 44)
          ctx.clip()
          ctx.drawImage(iframe as unknown as CanvasImageSource, x + 4, 36, halfW - 8, h - 44)
          ctx.restore()
        } catch {
          // iframe may be sandboxed or cross-origin
        }
      }

      // Status text overlay
      const status = results[i]?.status || 'pending'
      const statusText = status === 'streaming' ? '● streaming' : status === 'done' ? '✓ done' : '○ pending'
      ctx.fillStyle = status === 'streaming' ? '#8b5cf6' : status === 'done' ? '#22c55e' : '#6b7280'
      ctx.font = '11px monospace'
      ctx.fillText(statusText, x + halfW - 100, h - 8)
    }

    // Timestamp
    const elapsed = recordingStartRef.current ? Math.floor((Date.now() - recordingStartRef.current) / 1000) : 0
    ctx.fillStyle = '#484f58'
    ctx.font = '11px monospace'
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const secs = String(elapsed % 60).padStart(2, '0')
    ctx.fillText(`${mins}:${secs}`, 8, 20)

    // Watermark
    ctx.fillStyle = 'rgba(167, 139, 250, 0.45)'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('@Monday', w - 120, h - 10)
  }, [iframeRef, results])

  const startRecording = useCallback(
    (fps: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const stream = canvas.captureStream(fps)

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      recordingStartRef.current = Date.now()

      const tick = () => {
        drawFrame()
        setRecording((prev) => ({
          ...prev,
          active: true,
          status: 'recording',
          fps,
          duration: recordingStartRef.current ? Math.floor((Date.now() - recordingStartRef.current) / 1000) : 0,
        }))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      animFrameRef.current = requestAnimationFrame(tick)
    },
    [drawFrame],
  )

  const stopRecording = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
      mediaRecorderRef.current = null
    }
    setRecording((prev) => ({ ...prev, active: false, status: 'done' }))
  }, [])

  const downloadRecording = useCallback(() => {
    if (chunksRef.current.length === 0) return null
    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    chunksRef.current = []
    const url = URL.createObjectURL(blob)
    const elapsed = recordingStartRef.current ? Math.floor((Date.now() - recordingStartRef.current) / 1000) : 0
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const secs = String(elapsed % 60).padStart(2, '0')
    const filename = `arena-${mins}-${secs}.webm`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return filename
  }, [])

  const resetRecording = useCallback(() => {
    setRecording({ active: false, status: 'idle', fps: 30, duration: 0 })
    chunksRef.current = []
  }, [])

  // ── PNG share card ──
  const exportShareCard = useCallback(() => {
    const W = 1280
    const H = 720
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, W, H)

    // Title
    ctx.fillStyle = '#c9d1d9'
    ctx.font = 'bold 28px -apple-system, sans-serif'
    ctx.fillText('Code Arena', 40, 44)

    // Model names + durations row
    const modelRowY = 72
    ctx.font = '16px -apple-system, sans-serif'
    const durA = results[0] ? Math.round(results[0].elapsedMs / 1000) : 0
    const durB = results[1] ? Math.round(results[1].elapsedMs / 1000) : 0
    const tokensA = results[0]?.totalTokens ?? 0
    const tokensB = results[1]?.totalTokens ?? 0
    const tpsA = results[0]?.tokensPerSecond ?? 0
    const tpsB = results[1]?.tokensPerSecond ?? 0

    // Left model info
    ctx.fillStyle = '#58a6ff'
    ctx.font = 'bold 16px -apple-system, sans-serif'
    ctx.fillText('Team A: ' + (results[0]?.modelName || 'Model A'), 40, modelRowY)
    ctx.fillStyle = '#8b949e'
    ctx.font = '13px monospace'
    ctx.fillText(`${durA}s  ·  ${tokensA} tokens  ·  ${tpsA} t/s`, 40, modelRowY + 22)

    // Right model info
    ctx.fillStyle = '#58a6ff'
    ctx.font = 'bold 16px -apple-system, sans-serif'
    const rightLabel = 'Team B: ' + (results[1]?.modelName || 'Model B')
    const rightLabelW = ctx.measureText(rightLabel).width
    ctx.fillText(rightLabel, W - 40 - rightLabelW, modelRowY)
    ctx.fillStyle = '#8b949e'
    ctx.font = '13px monospace'
    const rightStats = `${durB}s  ·  ${tokensB} tokens  ·  ${tpsB} t/s`
    const rightStatsW = ctx.measureText(rightStats).width
    ctx.fillText(rightStats, W - 40 - rightStatsW, modelRowY + 22)

    // Divider
    ctx.strokeStyle = '#21262d'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, 116)
    ctx.lineTo(W - 40, 116)
    ctx.stroke()

    // Preview cards
    const cardW = (W - 120) / 2
    const cardH = H - 200
    const cardY = 130

    for (let i = 0; i < 2; i++) {
      const x = 40 + i * (cardW + 40)

      // Card background
      ctx.fillStyle = '#161b22'
      ctx.fillRect(x, cardY, cardW, cardH)

      // Terminal title bar
      ctx.fillStyle = '#21262d'
      ctx.fillRect(x, cardY, cardW, 28)

      // Dots
      const dotColors = ['#f38ba8', '#f9e2af', '#a6e3a1']
      dotColors.forEach((c, di) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(x + 14 + di * 14, cardY + 14, 5, 0, Math.PI * 2)
        ctx.fill()
      })

      // Model name in title bar
      ctx.fillStyle = '#c9d1d9'
      ctx.font = 'bold 12px monospace'
      const modelName = results[i]?.modelName || 'Model' + (i === 0 ? 'A' : 'B')
      const nameW = ctx.measureText(modelName).width
      ctx.fillText(modelName, x + cardW - nameW - 12, cardY + 19)

      // Status badge
      const status = results[i]?.status || 'pending'
      const statusColors: Record<string, string> = { streaming: '#8b5cf6', done: '#22c55e', error: '#ef4444', pending: '#6b7280' }
      ctx.fillStyle = statusColors[status] || '#6b7280'
      const statusText = status === 'streaming' ? '● streaming' : status === 'done' ? '✓ done' : '○ pending'
      const statusW = ctx.measureText(statusText).width
      ctx.fillText(statusText, x + cardW - statusW - 12, cardY + 50)

      // Draw iframe content if available
      const iframe = iframeRef.current[i]
      if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
        try {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, cardY + 28, cardW, cardH - 28)
          ctx.clip()
          ctx.drawImage(iframe as unknown as CanvasImageSource, x, cardY + 28, cardW, cardH - 28)
          ctx.restore()
        } catch {
          // iframe may not be renderable (cross-origin, etc.)
        }
      }

      // Border
      ctx.strokeStyle = '#30363d'
      ctx.lineWidth = 1
      ctx.strokeRect(x, cardY, cardW, cardH)
    }

    // Footer
    const footerY = H - 40
    ctx.fillStyle = '#484f58'
    ctx.font = '12px monospace'
    const ts = new Date().toISOString().slice(0, 10)
    ctx.fillText('Generated on ' + ts, 40, footerY)

    // Watermark
    ctx.fillStyle = 'rgba(167, 139, 250, 0.45)'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('@Monday', W - 140, footerY)

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `arena-share-${ts}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')

    return canvas
  }, [results, iframeRef])

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
    iframeRef,
    scrollSyncEnabled,
    setScrollSyncEnabled,
    scrollContainerRefs,
    handleScrollSync,
    // Recording
    recording,
    recordingCanvasRef,
    startRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
    // PNG share card
    exportShareCard,
  }
}
