/**
 * Standard benchmark prompt used for model performance testing.
 * This prompt is designed to:
 * - Be concise enough to generate quickly (avoiding timeouts)
 * - Be complex enough to produce meaningful token counts
 * - Test general reasoning and language capabilities
 */
export const BENCHMARK_PROMPT =
  'Write a concise paragraph (3-5 sentences) explaining the concept of artificial intelligence in simple terms. Include one example of how AI impacts daily life.'

export interface BenchmarkResult {
  modelId: string
  modelName: string
  content: string
  tokensPerSecond: number
  totalTokens: number
  latencyMs: number
  isStreaming: boolean
  error: string | null
}

export interface BenchmarkState {
  isRunning: boolean
  result: BenchmarkResult | null
  currentStep: 'idle' | 'loading' | 'generating' | 'done' | 'error'
  progress: number
}
