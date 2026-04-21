/**
 * Model cache management utilities.
 * Web-LLM stores downloaded models in the browser's Cache Storage API
 * under a specific cache name prefix.
 */

const CACHE_PREFIX = 'mlc-chat-'

type CacheWithName = Cache & { name: string }

/**
 * List all Web-LLM model caches with their approximate sizes.
 */
export async function listModelCaches(): Promise<
  Array<{ name: string; size: number; modelId: string }>
> {
  const allCaches = await (globalThis as any).caches.keys()
  const modelCaches = allCaches.filter((c: CacheWithName) => c.name.startsWith(CACHE_PREFIX))

  const results: Array<{ name: string; size: number; modelId: string }> = []

  for (const cache of modelCaches) {
    const keys: ReadonlyArray<Request> = await cache.keys()
    let totalSize = 0
    for (const key of keys) {
      const res = await cache.match(key)
      if (res) {
        const blob = await res.blob()
        totalSize += blob.size
      }
    }
    // Extract model ID from cache name (e.g., "mlc-chat-Qwen3-0.6B-q4f16_1-MLC")
    const modelId = cache.name.replace(CACHE_PREFIX, '')
    if (totalSize > 0) {
      results.push({ name: cache.name, size: totalSize, modelId })
    }
  }

  return results
}

/**
 * Delete a specific model cache by model ID.
 */
export async function deleteModelCache(modelId: string): Promise<boolean> {
  const allCaches = await (globalThis as any).caches.keys()
  const target = allCaches.find((c: CacheWithName) => c.name === `${CACHE_PREFIX}${modelId}`)

  if (target) {
    const result = await (globalThis as any).caches.delete(target.name)
    return result
  }
  return false
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
