import type { ModelInfo } from '../types'

export const MODELS: ModelInfo[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B',
    description: 'Alibaba Qwen 2.5 - ultra lightweight, fast inference',
    size: '~350 MB',
    parameters: '0.5B',
    provider: 'Alibaba',
    recommended: true,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B',
    description: 'Alibaba Qwen 2.5 - balanced performance and quality',
    size: '~900 MB',
    parameters: '1.5B',
    provider: 'Alibaba',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    description: 'HuggingFace SmolLM2 - smallest and fastest',
    size: '~200 MB',
    parameters: '360M',
    provider: 'HuggingFace',
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B',
    description: 'HuggingFace SmolLM2 - stronger reasoning capability',
    size: '~1 GB',
    parameters: '1.7B',
    provider: 'HuggingFace',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B',
    description: 'Google Gemma 2 - high quality small model',
    size: '~1.3 GB',
    parameters: '2B',
    provider: 'Google',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    description: 'Microsoft Phi 3.5 Mini - strong reasoning for its size',
    size: '~2 GB',
    parameters: '3.8B',
    provider: 'Microsoft',
  },
  {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    name: 'TinyLlama 1.1B',
    description: 'TinyLlama - community favorite compact model',
    size: '~600 MB',
    parameters: '1.1B',
    provider: 'Community',
  },
]

export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id)
}
