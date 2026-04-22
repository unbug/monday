/**
 * Model cache management utilities.
 * Web-LLM v0.2.x stores downloaded models in the browser's Cache Storage API
 * under three cache scopes: "webllm/model", "webllm/config", "webllm/wasm".
 * Model ID is embedded in the cache entry URLs, not the cache name.
 */

const CACHE_PREFIX = 'webllm/'

type CacheWithName = Cache & { name: string }

/**
 * Extract model ID from a cache entry URL.
 * web-llm stores model files under URLs like:
 *   https://huggingface.co/mlc-ai/{modelId}/resolve/main/{filename}
 */
function extractModelIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/')
    const mlcIndex = segments.indexOf('mlc-ai')
    if (mlcIndex >= 0 && mlcIndex + 1 < segments.length) {
      return segments[mlcIndex + 1]
    }
  } catch {
    // URL parsing failed, return null
  }
  return null
}

/**
 * List all Web-LLM model caches with their approximate sizes.
 * Returns one entry per unique model ID found across all web-llm caches.
 */
export async function listModelCaches(): Promise<
  Array<{ name: string; size: number; modelId: string }>
> {
  const allCaches = await (globalThis as any).caches.keys()
  const modelCaches = allCaches.filter((c: CacheWithName) => c.name.startsWith(CACHE_PREFIX))

  // Aggregate by model ID across all web-llm caches
  const modelMap = new Map<string, { name: string; size: number }>()

  for (const cache of modelCaches) {
    const keys: ReadonlyArray<Request> = await cache.keys()
    for (const key of keys) {
      const modelId = extractModelIdFromUrl(key.url)
      if (!modelId) continue

      const res = await cache.match(key)
      const blobSize = res ? (await res.blob()).size : 0

      const existing = modelMap.get(modelId)
      if (existing) {
        existing.size += blobSize
      } else {
        modelMap.set(modelId, { name: cache.name, size: blobSize })
      }
    }
  }

  const results: Array<{ name: string; size: number; modelId: string }> = []
  for (const [modelId, data] of modelMap) {
    if (data.size > 0) {
      results.push({ name: data.name, size: data.size, modelId })
    }
  }

  return results
}

/**
 * Delete a specific model cache by model ID.
 * Searches all web-llm caches for entries matching the model ID.
 */
export async function deleteModelCache(modelId: string): Promise<boolean> {
  const allCaches = await (globalThis as any).caches.keys()
  const webllmCaches = allCaches.filter((c: CacheWithName) => c.name.startsWith(CACHE_PREFIX))

  // Find caches that contain entries for this model
  const targetNames = new Set<string>()
  for (const cache of webllmCaches) {
    const keys: ReadonlyArray<Request> = await cache.keys()
    for (const key of keys) {
      const entryModelId = extractModelIdFromUrl(key.url)
      if (entryModelId === modelId) {
        targetNames.add(cache.name)
        break
      }
    }
  }

  // Delete all caches that contained this model's entries
  let success = true
  for (const name of targetNames) {
    const result = await (globalThis as any).caches.delete(name)
    if (!result) success = false
  }

  return success
}

/**
 * Delete all model caches.
 */
export async function deleteAllModelCaches(): Promise<number> {
  const allCaches = await (globalThis as any).caches.keys()
  const modelCaches = allCaches.filter((c: CacheWithName) => c.name.startsWith(CACHE_PREFIX))
  let deleted = 0

  for (const cache of modelCaches) {
    const result = await (globalThis as any).caches.delete(cache.name)
    if (result) deleted++
  }

  return deleted
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
