/**
 * DOM-state capture (Tier 2) — serialize an iframe's DOM to compact JSON.
 *
 * Produces an accessibility-tree-like structure with ARIA roles, labels,
 * input states, and interactive element metadata. Respects depth and node-count
 * budgets to stay token-safe for injection into LLM context.
 */

export interface DomNode {
  tag: string
  depth: number
  role?: string
  ariaLabel?: string
  ariaRole?: string
  id?: string
  classes?: string
  type?: string
  name?: string
  value?: string
  placeholder?: string
  text?: string
  disabled?: boolean
  checked?: boolean | undefined
  selected?: string | boolean | undefined
  focused?: boolean
  href?: string
  src?: string
  interactive?: boolean
  children: DomNode[]
}

export interface SerializeOptions {
  /** Maximum tree depth to traverse (default: 10) */
  maxDepth?: number
  /** Maximum number of nodes to return (default: 150) */
  maxNodes?: number
  /** Optional CSS selector to start from. If omitted, starts from root. */
  selector?: string
  /** Whether to include all attributes (default: false — only important ones) */
  fullAttrs?: boolean
}

export interface SerializeResult {
  success: boolean
  nodeCount: number
  tree: DomNode[]
  budget: {
    maxDepth: number
    maxNodes: number
    depthReached: number
    nodesTruncated: boolean
  }
}

/**
 * Serialize an iframe's DOM to a compact accessibility-tree-like JSON structure.
 * Returns ARIA roles, labels, input states, and interactive element metadata.
 */
export function serializeIframeDomState(
  iframe: HTMLIFrameElement,
  options: SerializeOptions = {},
): SerializeResult {
  const {
    maxDepth = 10,
    maxNodes = 150,
    selector,
    fullAttrs = false,
  } = options

  if (!iframe || !iframe.contentDocument) {
    return {
      success: false,
      nodeCount: 0,
      tree: [],
      budget: {
        maxDepth,
        maxNodes,
        depthReached: 0,
        nodesTruncated: false,
      },
    }
  }

  const doc = iframe.contentDocument
  const root = selector
    ? doc.querySelector(selector)
    : doc.documentElement

  if (!root) {
    return {
      success: false,
      nodeCount: 0,
      tree: [],
      budget: {
        maxDepth,
        maxNodes,
        depthReached: 0,
        nodesTruncated: false,
      },
    }
  }

  const nodes: DomNode[] = []
  let count = 0
  let maxDepthReached = 0

  function serializeNode(node: Node, depth: number): boolean {
    if (count >= maxNodes) return false
    if (depth > maxDepth) return false
    if (depth > maxDepthReached) maxDepthReached = depth
    if (!(node instanceof Element)) return true

    const el = node
    const entry: DomNode = {
      tag: el.tagName.toLowerCase(),
      depth,
      children: [],
    }

    // ARIA attributes
    const ariaRole = el.getAttribute('role')
    if (ariaRole) entry.ariaRole = ariaRole

    const ariaLabel = el.getAttribute('aria-label')
    if (ariaLabel) entry.ariaLabel = ariaLabel

    const ariaLabelledBy = el.getAttribute('aria-labelledby')
    if (ariaLabelledBy) entry.ariaLabel = `[aria-labelledby="${ariaLabelledBy}"]`

    const ariaDescribedBy = el.getAttribute('aria-describedby')
    if (ariaDescribedBy) entry.ariaLabel = `[aria-describedby="${ariaDescribedBy}"]`

    // Key attributes
    const id = el.getAttribute('id')
    if (id) entry.id = id

    const classes = el.getAttribute('class')
    if (classes) entry.classes = classes

    const type = el.getAttribute('type')
    if (type) entry.type = type

    const name = el.getAttribute('name')
    if (name) entry.name = name

    const href = el.getAttribute('href')
    if (href) entry.href = href

    const src = el.getAttribute('src')
    if (src) entry.src = src

    const placeholder = el.getAttribute('placeholder')
    if (placeholder) entry.placeholder = placeholder

    // Interactive detection
    const isInteractive = isInteractiveElement(el)
    if (isInteractive) entry.interactive = true

    // Input-specific states
    if (el instanceof HTMLInputElement) {
      entry.value = el.value || undefined
      entry.checked = el.checked
      entry.disabled = el.disabled
      entry.focused = document.activeElement === el
      if (el.type === 'checkbox' || el.type === 'radio') {
        entry.checked = el.checked
      }
    }
    if (el instanceof HTMLTextAreaElement) {
      entry.value = el.value || undefined
      entry.disabled = el.disabled
      entry.focused = document.activeElement === el
    }
    if (el instanceof HTMLSelectElement) {
      const selected = el.selectedOptions?.[0]
      if (selected) entry.selected = selected.value
    }
    if (el instanceof HTMLButtonElement) {
      entry.disabled = el.disabled
    }
    if (el instanceof HTMLOptionElement) {
      entry.selected = el.selected
    }

    // Focus state
    if (doc.activeElement === el) {
      entry.focused = true
    }

    // Text content (trimmed)
    const text = el.textContent?.trim()
    if (text) {
      entry.text = text.slice(0, 200)
    }

    // Additional attributes if full mode
    if (fullAttrs) {
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i]
        if (!(attr.name in entry)) {
          Object.assign(entry, { [attr.name]: attr.value })
        }
      }
    }

    nodes.push(entry)
    count++

    // Recurse into children
    for (const child of el.children) {
      if (!serializeNode(child, depth + 1)) break
    }

    return true
  }

  serializeNode(root, 0)

  return {
    success: true,
    nodeCount: nodes.length,
    tree: nodes,
    budget: {
      maxDepth,
      maxNodes,
      depthReached: maxDepthReached,
      nodesTruncated: count >= maxNodes,
    },
  }
}

/**
 * Check if an element is interactive (clickable, focusable, etc.)
 */
function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase()

  // Interactive HTML elements
  const interactiveTags = new Set([
    'a', 'button', 'input', 'select', 'textarea',
    'summary', 'details', 'label', 'option',
  ])
  if (interactiveTags.has(tag)) return true

  // Elements with role that implies interaction
  const role = el.getAttribute('role')
  if (role) {
    const interactiveRoles = new Set([
      'button', 'link', 'checkbox', 'radio', 'tab',
      'menuitem', 'combobox', 'slider', 'spinbutton',
      'searchbox', 'textbox', 'switch', 'treeitem',
      'menu', 'menubar', 'listbox', 'list',
    ])
    if (interactiveRoles.has(role)) return true
  }

  // Elements with tabindex (focusable)
  const tabindex = el.getAttribute('tabindex')
  if (tabindex !== null && tabindex !== '-1') return true

  // Elements with click handler (best-effort check)
  if ('onclick' in el || 'onmousedown' in el) return true

  return false
}

/**
 * Serialize DOM state to a compact JSON string optimized for LLM context injection.
 * Returns a text representation suitable for direct insertion into a system prompt
 * or context block.
 */
export function serializeDomStateCompact(
  iframe: HTMLIFrameElement,
  options?: SerializeOptions,
): string {
  const result = serializeIframeDomState(iframe, options)

  if (!result.success) {
    return '// DOM state unavailable: iframe not found or not ready'
  }

  const lines: string[] = []
  lines.push(`// DOM State (${result.nodeCount} nodes, depth ${result.budget.depthReached}/${result.budget.maxDepth})`)
  if (result.budget.nodesTruncated) {
    lines.push('// ⚠️ Node budget exceeded — tree truncated')
  }
  lines.push('')

  for (const node of result.tree) {
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

  return lines.join('\n')
}
