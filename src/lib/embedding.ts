/**
 * Browser-native embedding model powered by Transformers.js.
 *
 * Loads Xenova/all-MiniLM-L6-v2 from HuggingFace and runs inference
 * entirely in the browser — no server, no external ML dependencies,
 * 100% private.
 *
 * This is the inference layer for v0.26 (RAG — embedding model).
 */

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers'

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmbeddingEngineState {
  /** Whether the pipeline is loaded and ready */
  isLoaded: boolean
  /** Progress of the current loading operation (0–100) */
  progress: number
  /** Error message if loading failed */
  error: string | null
}

export interface EmbeddingResult {
  /** The embedding vector (normalized) */
  data: Float32Array
  /** Dimensionality of the embedding */
  dimension: number
}

// ── Singleton pipeline instance ────────────────────────────────────────────

let pipelineInstance: FeatureExtractionPipeline | null = null
let state: EmbeddingEngineState = {
  isLoaded: false,
  progress: 0,
  error: null,
}

// ── Pipeline lifecycle ─────────────────────────────────────────────────────

/**
 * Load the embedding model from HuggingFace.
 * Downloads ~90 MB of ONNX weights and caches them in the browser.
 */
export async function loadEmbeddingModel(
  modelId: string = 'Xenova/all-MiniLM-L6-v2',
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (pipelineInstance) {
    state = { isLoaded: true, progress: 100, error: null }
    return
  }

  state = { isLoaded: false, progress: 0, error: null }

  try {
    pipelineInstance = await pipeline(
      'feature-extraction',
      modelId,
      {
        progress_callback: (msg: { status: string; progress?: number }) => {
          if (msg.status === 'progress' && typeof msg.progress === 'number') {
            const p = msg.progress * 100
            state = { isLoaded: false, progress: p, error: null }
            onProgress?.(p)
          }
        },
      },
    )

    state = { isLoaded: true, progress: 100, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    state = { isLoaded: false, progress: 0, error: `Failed to load embedding model: ${message}` }
    pipelineInstance = null
    throw err
  }
}

/**
 * Unload the embedding model and free memory.
 */
export async function unloadEmbeddingModel(): Promise<void> {
  if (pipelineInstance) {
    pipelineInstance = null
    state = { isLoaded: false, progress: 0, error: null }
  }
}

/**
 * Get the current pipeline state.
 */
export function getEmbeddingState(): EmbeddingEngineState {
  return { ...state }
}

// ── Embedding inference ────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text.
 * Returns a normalized Float32Array of dimension 384 (for all-MiniLM-L6-v2).
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!pipelineInstance) {
    throw new Error('Embedding model not loaded. Call loadEmbeddingModel() first.')
  }

  const result = await pipelineInstance(text, {
    pooling: 'mean',
    normalize: true,
  })

  // The result is a Tensor from the feature-extraction pipeline
  const tensor = result as { data: Float32Array; dims: number[] }
  const data = tensor.data as Float32Array
  return { data, dimension: data.length }
}

/**
 * Generate embeddings for multiple texts in a batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
  if (!pipelineInstance) {
    throw new Error('Embedding model not loaded. Call loadEmbeddingModel() first.')
  }

  const result = await pipelineInstance(texts, {
    pooling: 'mean',
    normalize: true,
  })

  // The result may be a single tensor (batch) or array of tensors
  const tensor = result as { data: Float32Array; dims: number[] }
  const data = tensor.data as Float32Array
  const dim = tensor.dims?.[tensor.dims.length - 1] ?? 384
  const numTexts = data.length / dim

  const embeddings: Float32Array[] = []
  for (let i = 0; i < numTexts; i++) {
    embeddings.push(data.slice(i * dim, (i + 1) * dim))
  }
  return embeddings
}
