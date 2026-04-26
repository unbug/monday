/**
 * Plugin loader — fetches a plugin manifest from a URL, validates it,
 * fetches the handler JS, and registers the tool with the tool registry.
 *
 * Plugin manifest format (JSON):
 * {
 *   "id": "my-plugin",
 *   "name": "My Plugin",
 *   "description": "Does something cool",
 *   "version": "1.0.0",
 *   "inputSchema": { "type": "object", "properties": {...} },
 *   "handlerUrl": "https://example.com/plugin-handler.js",
 *   "author": "Author Name",
 *   "sourceUrl": "https://github.com/user/repo"
 * }
 *
 * Handler JS format — sets `window._pluginExecute` to an async function:
 * window._pluginExecute = async function(args) {
 *   return JSON.stringify({ result: "ok" })
 * }
 */

import type { PluginManifest, InstalledPlugin, ToolDefinition } from '../types'
import { toolRegistry } from './toolRegistry'

const INSTALLED_PLUGINS_KEY = 'monday:installed-plugins'

/**
 * Fetch and validate a plugin manifest from a URL.
 */
export async function fetchPluginManifest(url: string): Promise<PluginManifest> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch plugin manifest: HTTP ${response.status}`)
  }

  const manifest: PluginManifest = await response.json()

  // Validate required fields
  const requiredFields: (keyof PluginManifest)[] = ['id', 'name', 'description', 'version', 'inputSchema', 'handlerUrl']
  for (const field of requiredFields) {
    if (!manifest[field]) {
      throw new Error(`Plugin manifest missing required field: ${field}`)
    }
  }

  // Validate inputSchema is a valid JSON Schema
  if (typeof manifest.inputSchema !== 'object' || manifest.inputSchema === null) {
    throw new Error('Plugin manifest: inputSchema must be an object')
  }

  // Validate id format (a-z, 0-9, dash)
  if (!/^[a-z0-9-]{1,64}$/.test(manifest.id)) {
    throw new Error('Plugin manifest: id must be 1-64 chars, lowercase alphanumeric and dash only')
  }

  return manifest
}

/**
 * Execute a plugin handler in a sandboxed iframe and return the result.
 * The handler JS must set `window._pluginExecute` to an async function.
 */
export function executePluginHandler(
  handlerUrl: string,
  args: Record<string, unknown>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let iframe: HTMLIFrameElement | null = null
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('Plugin handler timed out after 30 seconds'))
    }, 30_000)

    function cleanup() {
      window.removeEventListener('message', handleMessage)
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
    }

    function handleMessage(event: MessageEvent) {
      if (!iframe || event.source !== iframe.contentWindow) return
      clearTimeout(timeoutId)
      window.removeEventListener('message', handleMessage)

      if (event.data?.type === 'plugin-result') {
        resolve(event.data.result)
      } else if (event.data?.type === 'plugin-error') {
        reject(new Error(event.data.error))
      }
      cleanup()
    }

    window.addEventListener('message', handleMessage)

    // Fetch the handler JS text
    fetch(handlerUrl, { signal: AbortSignal.timeout(15_000) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((handlerCode) => {
        // Create a sandboxed iframe that loads the handler and calls it
        const wrapperCode = `
          (async function() {
            try {
              // Evaluate handler code in iframe global scope
              ${handlerCode}
              // Call the exported execute function
              if (typeof window._pluginExecute !== 'function') {
                throw new Error('Handler did not set window._pluginExecute');
              }
              const result = await window._pluginExecute(${JSON.stringify(args)});
              parent.postMessage({ type: 'plugin-result', result: String(result) }, '*');
            } catch (err) {
              parent.postMessage({ type: 'plugin-error', error: err instanceof Error ? err.message : String(err) }, '*');
            }
          })();
        `

        iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.sandbox = 'allow-scripts'
        iframe.srcdoc = wrapperCode

        document.body.appendChild(iframe)
      })
      .catch((err) => {
        cleanup()
        reject(new Error(`Failed to fetch handler: ${err instanceof Error ? err.message : String(err)}`))
      })
  })
}

/**
 * Load a plugin from a manifest URL and register its tool.
 * Returns the installed plugin record.
 */
export async function loadPlugin(manifestUrl: string): Promise<InstalledPlugin> {
  const manifest = await fetchPluginManifest(manifestUrl)

  const installed: InstalledPlugin = {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    manifestUrl,
    handlerUrl: manifest.handlerUrl,
    installedAt: Date.now(),
    lastLoadedAt: Date.now(),
    loaded: false,
    error: null,
  }

  // Validate no duplicate
  const existing = getInstalledPlugins()
  const dup = existing.find((p) => p.id === manifest.id)
  if (dup) {
    installed.installedAt = dup.installedAt
  }

  // Register the tool with the registry
  const toolDef: ToolDefinition = {
    name: manifest.id,
    description: manifest.description,
    parameters: manifest.inputSchema,
  }

  // Create a wrapper handler that executes the plugin in a sandbox
  const handlerUrl = manifest.handlerUrl
  const wrapperHandler = async (args: Record<string, unknown>): Promise<string> => {
    try {
      return await executePluginHandler(handlerUrl, args)
    } catch (err) {
      throw new Error(`Plugin "${manifest.name}" execution failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  toolRegistry.register(toolDef, wrapperHandler)

  // Update installed state
  installed.loaded = true
  installed.error = null

  // Save to localStorage
  const plugins = getInstalledPlugins()
  const idx = plugins.findIndex((p) => p.id === manifest.id)
  if (idx >= 0) {
    plugins[idx] = installed
  } else {
    plugins.push(installed)
  }
  localStorage.setItem(INSTALLED_PLUGINS_KEY, JSON.stringify(plugins))

  return installed
}

/**
 * Uninstall a plugin by ID and unregister its tool.
 */
export function uninstallPlugin(id: string): void {
  toolRegistry.unregister(id)
  const plugins = getInstalledPlugins()
  const filtered = plugins.filter((p) => p.id !== id)
  localStorage.setItem(INSTALLED_PLUGINS_KEY, JSON.stringify(filtered))
}

/**
 * Get all installed plugins from localStorage.
 */
export function getInstalledPlugins(): InstalledPlugin[] {
  try {
    const raw = localStorage.getItem(INSTALLED_PLUGINS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as InstalledPlugin[]
  } catch {
    return []
  }
}

/**
 * Get the tool definition for a specific installed plugin.
 */
export function getPluginToolDefinition(id: string): ToolDefinition | null {
  const plugin = getInstalledPlugins().find((p) => p.id === id)
  if (!plugin) return null
  return {
    name: plugin.id,
    description: plugin.description,
    parameters: {}, // inputSchema not persisted; return empty
  }
}
