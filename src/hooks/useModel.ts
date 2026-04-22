import { useState, useCallback, useRef, useEffect } from 'react'
import {
  loadModel,
  unloadModel,
  getCurrentModelId,
  checkWebGPUSupport,
} from '../lib/engine'
import { getDownloadedModelIds, markModelDownloaded } from '../lib/storage'
import { recordModelUsage } from '../lib/modelUsage'
import type { ModelState } from '../types'
import type { InitProgressReport } from '@mlc-ai/web-llm'

export function useModel() {
  const [state, setState] = useState<ModelState>({
    status: 'idle',
    progress: 0,
    error: null,
  })
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null)
  const [downloadedModelIds, setDownloadedModelIds] = useState<Set<string>>(() => getDownloadedModelIds())
  const abortRef = useRef(false)

  useEffect(() => {
    setWebgpuSupported(checkWebGPUSupport())
  }, [])

  const load = useCallback(async (modelId: string) => {
    if (getCurrentModelId() === modelId) {
      setState({ status: 'ready', progress: 100, error: null })
      return
    }

    abortRef.current = false
    setState({ status: 'downloading', progress: 0, error: null })

    try {
      await loadModel(modelId, (report: InitProgressReport) => {
        if (abortRef.current) return
        const progress = report.progress
          ? Math.round(report.progress * 100)
          : 0
        setState({
          status: 'downloading',
          progress,
          error: null,
        })
      })

      if (!abortRef.current) {
        markModelDownloaded(modelId)
        recordModelUsage(modelId)
        setDownloadedModelIds(getDownloadedModelIds())
        setState({ status: 'ready', progress: 100, error: null })
      }
    } catch (err) {
      if (!abortRef.current) {
        const message =
          err instanceof Error ? err.message : 'Failed to load model'
        setState({ status: 'error', progress: 0, error: message })
      }
    }
  }, [])

  const unload = useCallback(() => {
    abortRef.current = true
    unloadModel()
    setState({ status: 'idle', progress: 0, error: null })
  }, [])

  return {
    ...state,
    webgpuSupported,
    downloadedModelIds,
    load,
    unload,
  }
}
