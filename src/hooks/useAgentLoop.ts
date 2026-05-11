/**
 * useAgentLoop — Sandbox iframe execution loop (Tier 1).
 *
 * Manages the agent loop: generate HTML → render in sandboxed iframe →
 * screenshot → attach as image to next LLM call → iterate.
 * Supports debounced auto-refresh and manual refresh.
 * Reuses the iframe registry from browserUseTools.ts.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { getOrCreateIframe, getSandboxIframe, removeSandboxIframe } from '../lib/browserUseTools'
import { extractHTMLCode } from '../lib/htmlExtract'
import { serializeIframeDomState, type SerializeOptions } from '../lib/domState'

export type AgentLoopStatus = 'idle' | 'running' | 'paused' | 'error'

export interface AgentLoopState {
  status: AgentLoopStatus
  taskGoal: string
  iterations: number
  currentHtml: string | null
  screenshotDataUrl: string | null
  error: string | null
  lastScreenshotAt: number | null
}

export interface AgentLoopActions {
  start: (goal: string) => void
  stop: () => void
  refresh: () => void
  setHtml: (html: string | null) => void
  clear: () => void
}

export interface UseAgentLoopOptions {
  /** Called when a new screenshot is captured — receives data URL */
  onScreenshot?: (dataUrl: string, iteration: number) => void
  /** Called when iteration completes — receives iteration count and HTML */
  onIterationComplete?: (html: string | null, iteration: number) => void
  /** Called before each model turn — receives serialized DOM-state JSON for context injection */
  onDomState?: (domState: string, iteration: number) => void
  /** DOM-state serialization options (depth + node-count budget) */
  domStateOptions?: SerializeOptions
  /** Debounce delay in ms for auto-refresh (default: 500) */
  autoRefreshDelay?: number
  /** Iframe target ID (default: 'agent-loop') */
  iframeId?: string
}

/**
 * Capture a screenshot of a sandboxed iframe using canvas + SVG foreignObject.
 * Falls back to DOM metadata if rendering fails.
 */
function captureIframeScreenshot(
  iframeId: string,
  fullPage: boolean,
): Promise<{ success: boolean; dataUrl: string | null; fallback: Record<string, unknown> }> {
  const iframe = getSandboxIframe(iframeId)
  if (!iframe || !iframe.contentDocument) {
    return Promise.resolve({
      success: false,
      dataUrl: null,
      fallback: { error: 'Iframe not found or not ready' },
    })
  }

  const doc = iframe.contentDocument!
  const width = fullPage
    ? Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth)
    : (iframe.clientWidth || 1280)
  const height = fullPage
    ? Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
    : (iframe.clientHeight || 720)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return Promise.resolve({
      success: false,
      dataUrl: null,
      fallback: {
        bodyText: (doc.body?.textContent || '').slice(0, 500),
        links: Array.from(doc.querySelectorAll('a')).map((a) => ({
          href: a.href,
          text: (a.textContent || '').slice(0, 50),
        })),
      },
    })
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const html = doc.documentElement.outerHTML
  const svgData = new XMLSerializer().serializeToString(
    new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
        </foreignObject>
      </svg>`,
      'text/xml',
    ),
  )

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const blobUrl = URL.createObjectURL(svgBlob)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(blobUrl)
      const dataUrl = canvas.toDataURL('image/png')
      resolve({ success: true, dataUrl, fallback: {} })
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      resolve({
        success: false,
        dataUrl: null,
        fallback: {
          bodyText: (doc.body?.textContent || '').slice(0, 500),
          links: Array.from(doc.querySelectorAll('a')).map((a) => ({
            href: a.href,
            text: (a.textContent || '').slice(0, 50),
          })),
        },
      })
    }
    img.src = blobUrl
  })
}

export function useAgentLoop(options: UseAgentLoopOptions = {}): {
  state: AgentLoopState
  actions: AgentLoopActions
  iframeEl: HTMLIFrameElement | null
  currentDomState: string | null
  screenshotRef: React.RefCallback<HTMLIFrameElement>
} {
  const {
    onScreenshot,
    onIterationComplete,
    onDomState,
    domStateOptions,
    autoRefreshDelay = 500,
    iframeId = 'agent-loop',
  } = options

  const [state, setState] = useState<AgentLoopState>({
    status: 'idle',
    taskGoal: '',
    iterations: 0,
    currentHtml: null,
    screenshotDataUrl: null,
    error: null,
    lastScreenshotAt: null,
  })

  const [currentDomState, setCurrentDomState] = useState<string | null>(null)

  const statusRef = useRef<AgentLoopStatus>('idle')
  const htmlRef = useRef<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const abortRef = useRef(false)
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iterationRef = useRef(0)
  const domStateOptionsRef = useRef(domStateOptions)

  // Create iframe on mount
  useEffect(() => {
    const iframe = getOrCreateIframe(iframeId, 'about:blank')
    iframeRef.current = iframe
    return () => {
      abortRef.current = true
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current)
        autoRefreshTimerRef.current = null
      }
    }
  }, [iframeId])

  // Track iframe element ref
  const screenshotRef = useCallback((el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRef.current = el
    }
  }, [])

  // Update DOM-state options ref when they change
  useEffect(() => {
    domStateOptionsRef.current = domStateOptions
  }, [domStateOptions])

  const start = useCallback(
    (goal: string) => {
      abortRef.current = false
      iterationRef.current = 0
      htmlRef.current = null
      statusRef.current = 'running'

      setState({
        status: 'running',
        taskGoal: goal,
        iterations: 0,
        currentHtml: null,
        screenshotDataUrl: null,
        error: null,
        lastScreenshotAt: null,
      })
    },
    [],
  )

  const stop = useCallback(() => {
    abortRef.current = true
    statusRef.current = 'paused'
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current)
      autoRefreshTimerRef.current = null
    }

    setState((prev) => ({
      ...prev,
      status: 'paused',
    }))
  }, [])

  const refresh = useCallback(async () => {
    if (statusRef.current !== 'running') return

    const iframe = iframeRef.current
    if (!iframe || !iframe.contentDocument) {
      return
    }

    const iteration = ++iterationRef.current
    const fullPage = true

    try {
      const result = await captureIframeScreenshot(iframeId, fullPage)

      if (result.success && result.dataUrl) {
        setState((prev) => ({
          ...prev,
          screenshotDataUrl: result.dataUrl,
          iterations: iteration,
          lastScreenshotAt: Date.now(),
          error: null,
        }))
        onScreenshot?.(result.dataUrl, iteration)
      } else {
        setState((prev) => ({
          ...prev,
          screenshotDataUrl: null,
          iterations: iteration,
          lastScreenshotAt: Date.now(),
          error: 'Screenshot capture failed',
        }))
      }

      // Capture DOM-state for context injection (Tier 2)
      const iframe = iframeRef.current
      if (iframe && iframe.contentDocument && onDomState) {
        const domJson = serializeIframeDomState(iframe, domStateOptionsRef.current)
        const lines: string[] = []
        lines.push('// DOM State Context')
        lines.push(`// ${domJson.nodeCount} nodes, depth ${domJson.budget.depthReached}/${domJson.budget.maxDepth}`)
        if (domJson.budget.nodesTruncated) lines.push('// ⚠️ Truncated — node budget exceeded')
        lines.push('')
        for (const node of domJson.tree) {
          const indent = '  '.repeat(node.depth)
          const attrs: string[] = []
          if (node.id) attrs.push(`id="${node.id}"`)
          if (node.classes) attrs.push(`class="${node.classes}"`)
          if (node.type) attrs.push(`type="${node.type}"`)
          if (node.name) attrs.push(`name="${node.name}"`)
          if (node.value !== undefined) attrs.push(`value="${node.value}"`)
          if (node.checked !== undefined) attrs.push(`checked=${node.checked}`)
          if (node.disabled !== undefined) attrs.push(`disabled=${node.disabled}`)
          if (node.selected !== undefined) attrs.push(`selected=${node.selected}`)
          if (node.focused) attrs.push('focused')
          if (node.interactive) attrs.push('interactive')
          if (node.ariaRole) attrs.push(`role="${node.ariaRole}"`)
          if (node.ariaLabel) attrs.push(`aria-label="${node.ariaLabel}"`)
          const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : ''
          const text = node.text ? ` "${node.text.slice(0, 80)}"` : ''
          lines.push(`${indent}<${node.tag}${attrStr}>${text}</${node.tag}>`)
        }
        const domStateStr = lines.join('\n')
        setCurrentDomState(domStateStr)
        onDomState(domStateStr, iteration)
      }

      onIterationComplete?.(htmlRef.current, iteration)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Screenshot failed',
      }))
    }
  }, [iframeId, onScreenshot, onIterationComplete, onDomState])

  const setHtml = useCallback(
    (html: string | null) => {
      htmlRef.current = html
      const iframe = iframeRef.current
      if (!iframe || !iframe.contentDocument) return

      const doc = iframe.contentDocument
      doc.open()
      doc.write(html || '<html><body><p>No content</p></body></html>')
      doc.close()

      setState((prev) => ({
        ...prev,
        currentHtml: html,
      }))
    },
    [],
  )

  const clear = useCallback(() => {
    abortRef.current = true
    statusRef.current = 'idle'
    iterationRef.current = 0
    htmlRef.current = null
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current)
      autoRefreshTimerRef.current = null
    }

    removeSandboxIframe(iframeId)
    iframeRef.current = null

    setState({
      status: 'idle',
      taskGoal: '',
      iterations: 0,
      currentHtml: null,
      screenshotDataUrl: null,
      error: null,
      lastScreenshotAt: null,
    })
  }, [iframeId])

  // Debounced auto-refresh when running
  useEffect(() => {
    if (statusRef.current !== 'running' || !htmlRef.current) return

    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current)
    }

    autoRefreshTimerRef.current = setTimeout(() => {
      refresh()
    }, autoRefreshDelay)

    return () => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current)
        autoRefreshTimerRef.current = null
      }
    }
  }, [htmlRef.current, state.status, refresh, autoRefreshDelay])

  return {
    state,
    actions: { start, stop, refresh, setHtml, clear },
    iframeEl: iframeRef.current,
    currentDomState,
    screenshotRef,
  }
}
