  /**
   * Browser-use agent action primitives.
   *
   * These tools let an autonomous agent interact with a sandboxed iframe
   * (Tier 1 of the browser-use system): navigate, click, type, scroll,
   * extract content, take screenshots, and read the DOM state.
   */

  import type { ToolDefinition } from '../types'

  interface SandboxIframe {
    id: string
    element: HTMLIFrameElement | null
    url: string
    ready: boolean
  }

  const iframeRegistry = new Map<string, SandboxIframe>()

  export function getOrCreateIframe(id: string, url: string): HTMLIFrameElement {
    let entry = iframeRegistry.get(id)

    if (entry && entry.element && entry.element.isConnected) {
      return entry.element
    }

    if (entry && entry.element) {
      entry.element.remove()
      entry.element = null
    }

    const iframe = document.createElement('iframe')
    iframe.id = `monday-agent-${id}`
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.style.display = 'block'
    iframe.src = url

    entry = { id, element: iframe, url, ready: false }
    iframeRegistry.set(id, entry)

    return iframe
  }

  export function getSandboxIframe(id: string): HTMLIFrameElement | null {
    const entry = iframeRegistry.get(id)
    return entry?.element ?? null
  }

  export function removeSandboxIframe(id: string): void {
    const entry = iframeRegistry.get(id)
    if (entry?.element) {
      entry.element.remove()
    }
    iframeRegistry.delete(id)
  }

  export function navigateTool(): ToolDefinition {
    return {
      name: 'navigate',
      description:
        'Navigate a sandboxed iframe to a URL. Creates a new sandboxed iframe if it does not exist. Returns the iframe ID and navigation status. Use this to load a webpage for the agent to interact with.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Unique identifier for the sandboxed iframe target (e.g. "task-1")',
          },
          url: {
            type: 'string',
            description: 'The URL to navigate to',
          },
        },
        required: ['target', 'url'],
      },
    }
  }

  export function navigateHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const url = args.url as string

      if (!target || !url) {
        return JSON.stringify({ success: false, error: 'Both "target" and "url" are required' })
      }

      const iframe = getOrCreateIframe(target, url)
      iframe.src = url

      return JSON.stringify({
        success: true,
        target,
        url,
        message: `Navigated iframe "${target}" to ${url}`,
      })
    }
  }

  export function clickTool(): ToolDefinition {
    return {
      name: 'click',
      description:
        'Click an element in the sandboxed iframe by CSS selector. The element must be visible and clickable. Returns the element tag name, text content, and click result.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The sandboxed iframe target identifier',
          },
          selector: {
            type: 'string',
            description: 'CSS selector for the element to click (e.g. "#submit-btn", ".nav > a:nth-child(3)")',
          },
        },
        required: ['target', 'selector'],
      },
    }
  }

  export function clickHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const selector = args.selector as string

      const iframe = getSandboxIframe(target)
      if (!iframe || !iframe.contentDocument) {
        return JSON.stringify({ success: false, error: `Iframe "${target}" not found or not ready` })
      }

      try {
        const el = iframe.contentDocument.querySelector(selector)
        if (!el) {
          return JSON.stringify({ success: false, error: `Element not found: ${selector}` })
        }

        const tag = el.tagName.toLowerCase()
        const text = (el.textContent || '').trim()

        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.focus()
        }

        return JSON.stringify({
          success: true,
          target,
          selector,
          element: { tag, text: text.slice(0, 200) },
          message: `Clicked <${tag}> "${text.slice(0, 50)}"`,
        })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: `Click failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  export function typeTool(): ToolDefinition {
    return {
      name: 'type',
      description:
        'Type text into an input element in the sandboxed iframe. Focuses the element first, then dispatches input events. Returns the element tag, value, and result.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The sandboxed iframe target identifier',
          },
          selector: {
            type: 'string',
            description: 'CSS selector for the input element',
          },
          text: {
            type: 'string',
            description: 'The text to type',
          },
          submit: {
            type: 'boolean',
            description: 'Whether to dispatch a submit event after typing (default: false)',
          },
        },
        required: ['target', 'selector', 'text'],
      },
    }
  }

  export function typeHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const selector = args.selector as string
      const text = args.text as string

      const iframe = getSandboxIframe(target)
      if (!iframe || !iframe.contentDocument) {
        return JSON.stringify({ success: false, error: `Iframe "${target}" not found or not ready` })
      }

      try {
        const el = iframe.contentDocument.querySelector(selector)
        if (!el) {
          return JSON.stringify({ success: false, error: `Element not found: ${selector}` })
        }

        const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        const isEditable = el instanceof HTMLElement && el.isContentEditable
        if (!isInput && !isEditable) {
          return JSON.stringify({ success: false, error: `Element is not an input: ${selector}` })
        }

        if (el instanceof HTMLElement) {
          el.focus()
        }
        if (isInput) {
          ;(el as HTMLInputElement | HTMLTextAreaElement).value = text
        } else if (isEditable) {
          ;(el as HTMLElement).innerHTML = text
        }

        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))

        if (args.submit === true && isInput) {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
          el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
          const formEl = (el as HTMLInputElement | HTMLTextAreaElement).form
          if (formEl) {
            formEl.requestSubmit?.()
          }
        }

        const value = ('value' in el ? (el as HTMLInputElement | HTMLTextAreaElement).value : el.innerHTML) || ''

        return JSON.stringify({
          success: true,
          target,
          selector,
          typed: text.length,
          currentValue: value.slice(0, 200),
        })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: `Type failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  export function scrollTool(): ToolDefinition {
    return {
      name: 'scroll',
      description:
        'Scroll the sandboxed iframe or a specific element within it. Supports pixel offsets and direction keywords (up, down, left, right, toTop, toBottom, toLeft, toRight).',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The sandboxed iframe target identifier',
          },
          selector: {
            type: 'string',
            description: 'Optional CSS selector for a scrollable element. If omitted, scrolls the iframe body.',
          },
          amount: {
            type: 'number',
            description: 'Pixels to scroll (positive = down/right). Required unless direction is a keyword.',
          },
          direction: {
            type: 'string',
            enum: ['up', 'down', 'left', 'right', 'toTop', 'toBottom', 'toLeft', 'toRight'],
            description: 'Direction keyword. If provided, amount is optional (defaults to 300px).',
          },
        },
        required: ['target'],
      },
    }
  }

  export function scrollHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const selector = args.selector as string
      const amount = args.amount as number
      const direction = args.direction as string

      const iframe = getSandboxIframe(target)
      if (!iframe || !iframe.contentDocument) {
        return JSON.stringify({ success: false, error: `Iframe "${target}" not found or not ready` })
      }

      try {
        let scrollTarget: Element | Window = iframe.contentDocument.documentElement

        if (selector) {
          const el = iframe.contentDocument.querySelector(selector)
          if (!el) {
            return JSON.stringify({ success: false, error: `Element not found: ${selector}` })
          }
          scrollTarget = el
        }

        let dx = 0
        let dy = 0

        if (direction) {
          const step = amount || 300
          switch (direction) {
            case 'up': dy = -step; break
            case 'down': dy = step; break
            case 'left': dx = -step; break
            case 'right': dx = step; break
            case 'toTop':
              if ('scrollTop' in scrollTarget) (scrollTarget as HTMLElement).scrollTop = 0
              else (scrollTarget as Window).scrollTo(0, 0)
              return JSON.stringify({ success: true, target, direction: 'toTop', position: { x: 0, y: 0 } })
            case 'toBottom':
              if ('scrollTop' in scrollTarget)
                (scrollTarget as HTMLElement).scrollTop = (scrollTarget as HTMLElement).scrollHeight
              else
                (scrollTarget as Window).scrollTo(0, (scrollTarget as Window).document?.body?.scrollHeight || 0)
              return JSON.stringify({ success: true, target, direction: 'toBottom' })
            case 'toLeft':
              if ('scrollLeft' in scrollTarget)
                (scrollTarget as HTMLElement).scrollLeft = 0
              else
                (scrollTarget as Window).scrollTo(0, 0)
              return JSON.stringify({ success: true, target, direction: 'toLeft' })
            case 'toRight':
              if ('scrollLeft' in scrollTarget)
                (scrollTarget as HTMLElement).scrollLeft = (scrollTarget as HTMLElement).scrollWidth
              else
                (scrollTarget as Window).scrollTo((scrollTarget as Window).document?.body?.scrollWidth || 0, 0)
              return JSON.stringify({ success: true, target, direction: 'toRight' })
          }
        } else if (amount) {
          dy = amount
        } else {
          return JSON.stringify({ success: false, error: 'Provide "amount" (pixels) or "direction" keyword' })
        }

        if ('scrollBy' in scrollTarget) {
          ;(scrollTarget as any).scrollBy({ left: dx, top: dy, behavior: 'smooth' })
        }

        return JSON.stringify({
          success: true,
          target,
          scrolled: { dx, dy },
        })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: `Scroll failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  export function extractTextTool(): ToolDefinition {
    return {
      name: 'extract-text',
      description:
        'Extract visible text content from elements in the sandboxed iframe by CSS selector. Returns the text content of matching elements, truncated for token safety.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The sandboxed iframe target identifier',
          },
          selector: {
            type: 'string',
            description: 'CSS selector to match elements (e.g. "p", ".article-body", "#content")',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of characters to return (default: 2000)',
          },
        },
        required: ['target', 'selector'],
      },
    }
  }

  export function extractTextHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const selector = args.selector as string
      const limit = (args.limit as number) || 2000

      const iframe = getSandboxIframe(target)
      if (!iframe || !iframe.contentDocument) {
        return JSON.stringify({ success: false, error: `Iframe "${target}" not found or not ready` })
      }

      try {
        const elements = iframe.contentDocument.querySelectorAll(selector)
        const texts: string[] = []

        for (const el of elements) {
          const text = (el.textContent || '').trim()
          if (text) {
            texts.push(text.slice(0, 500))
          }
        }

        const result = texts.join('\n\n').slice(0, limit)

        return JSON.stringify({
          success: true,
          target,
          selector,
          matchCount: elements.length,
          text: result,
        })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: `Extract failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  export function takeScreenshotTool(): ToolDefinition {
    return {
      name: 'take-screenshot',
      description:
        'Take a screenshot of the sandboxed iframe by rendering it to a canvas and returning a base64 PNG. Falls back to returning DOM metadata if rendering fails. Useful for visual observation in the agent loop.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The sandboxed iframe target identifier',
          },
          fullPage: {
            type: 'boolean',
            description: 'Whether to capture the full scrollable page (default: false)',
          },
        },
        required: ['target'],
      },
    }
  }

  export function takeScreenshotHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const fullPage = args.fullPage as boolean

      const iframe = getSandboxIframe(target)
      if (!iframe || !iframe.contentDocument) {
        return JSON.stringify({ success: false, error: `Iframe "${target}" not found or not ready` })
      }

      try {
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
          const body = doc.body
          return JSON.stringify({
            success: true,
            target,
            fallback: true,
            dimensions: { width, height },
            bodyText: (body?.textContent || '').slice(0, 500),
            links: Array.from(doc.querySelectorAll('a')).map((a) => ({
              href: a.href,
              text: (a.textContent || '').slice(0, 50),
            })),
            message: 'Screenshot unavailable (no canvas context). DOM metadata returned.',
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

        return new Promise<string>((resolve) => {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0)
            URL.revokeObjectURL(blobUrl)

            const dataUrl = canvas.toDataURL('image/png')
            const truncated = dataUrl.slice(0, 50000) + '\n...(truncated - full PNG available in artifact storage)'

            resolve(
              JSON.stringify({
                success: true,
                target,
                dimensions: { width, height },
                imageDataUrl: truncated,
                message: 'Screenshot captured as base64 PNG (truncated for display)',
              }),
            )
          }
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl)
            resolve(
              JSON.stringify({
                success: true,
                target,
                fallback: true,
                dimensions: { width, height },
                bodyText: (doc.body?.textContent || '').slice(0, 500),
                links: Array.from(doc.querySelectorAll('a')).map((a) => ({
                  href: a.href,
                  text: (a.textContent || '').slice(0, 50),
                })),
                message: 'Screenshot rendering failed. DOM metadata returned.',
              }),
            )
          }
          img.src = blobUrl
        })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: `Screenshot failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  export function readDomTool(): ToolDefinition {
    return {
      name: 'read-dom',
      description:
        'Read and serialize the DOM state of the sandboxed iframe as compact JSON. Returns an accessibility-tree-like structure with node type, tag, attributes, text, and interactive states. Respects depth limit to stay token-safe.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The sandboxed iframe target identifier',
          },
          selector: {
            type: 'string',
            description: 'Optional CSS selector to start from. If omitted, reads from the root.',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum tree depth to traverse (default: 8)',
          },
          maxNodes: {
            type: 'number',
            description: 'Maximum number of nodes to return (default: 100)',
          },
        },
        required: ['target'],
      },
    }
  }

  export function readDomHandler(): (args: Record<string, unknown>) => Promise<string> {
    return async (args) => {
      const target = args.target as string
      const selector = args.selector as string
      const maxDepth = (args.maxDepth as number) || 8
      const maxNodes = (args.maxNodes as number) || 100

      const iframe = getSandboxIframe(target)
      if (!iframe || !iframe.contentDocument) {
        return JSON.stringify({ success: false, error: `Iframe "${target}" not found or not ready` })
      }

      try {
        const root = selector
          ? iframe.contentDocument.querySelector(selector)
          : iframe.contentDocument.documentElement

        if (!root) {
          return JSON.stringify({ success: false, error: `Root element not found for selector: ${selector || 'root'}` })
        }

        const nodes: Array<Record<string, unknown>> = []
        let count = 0

        function serializeNode(node: Node, depth: number) {
          if (count >= maxNodes || depth > maxDepth) return
          if (!(node instanceof Element)) return

          const el = node as Element
          const entry: Record<string, unknown> = {
            tag: el.tagName.toLowerCase(),
            depth,
          }

          const importantAttrs = ['id', 'class', 'type', 'name', 'href', 'src', 'value', 'placeholder', 'aria-label', 'role', 'disabled', 'checked', 'selected']
          for (const attr of importantAttrs) {
            const val = el.getAttribute(attr)
            if (val) {
              entry[attr] = val.slice(0, 100)
            }
          }

          const text = (el.textContent || '').trim()
          if (text) {
            entry.text = text.slice(0, 100)
          }

          if (el instanceof HTMLInputElement) {
            entry.inputType = el.type
            entry.checked = el.checked
            entry.disabled = el.disabled
          }
          if (el instanceof HTMLOptionElement) {
            entry.selected = el.selected
          }

          nodes.push(entry)
          count++

          for (const child of el.children) {
            serializeNode(child, depth + 1)
          }
        }

        serializeNode(root, 0)

        return JSON.stringify({
          success: true,
          target,
          selector: selector || 'root',
          nodeCount: nodes.length,
          tree: nodes,
        })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: `DOM read failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }
  }

  const browserUseTools: ToolDefinition[] = [
    navigateTool(),
    clickTool(),
    typeTool(),
    scrollTool(),
    extractTextTool(),
    takeScreenshotTool(),
    readDomTool(),
  ]

  export function getBrowserUseTools(): ToolDefinition[] {
    return browserUseTools
  }

  export function getBrowserUseHandler(name: string): ((args: Record<string, unknown>) => Promise<string>) | null {
    switch (name) {
      case 'navigate':
        return navigateHandler()
      case 'click':
        return clickHandler()
      case 'type':
        return typeHandler()
      case 'scroll':
        return scrollHandler()
      case 'extract-text':
        return extractTextHandler()
      case 'take-screenshot':
        return takeScreenshotHandler()
      case 'read-dom':
        return readDomHandler()
      default:
        return null
    }
  }
