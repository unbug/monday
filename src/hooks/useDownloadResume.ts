import { useState, useCallback, useRef, useEffect } from 'react'

const DOWNLOAD_RESUME_KEY = 'monday:download-resume'

interface DownloadState {
  modelId: string
  progress: number
  startedAt: number
}

function getDownloadState(): DownloadState | null {
  try {
    const raw = localStorage.getItem(DOWNLOAD_RESUME_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as DownloadState
    // Expire after 24 hours
    if (Date.now() - state.startedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DOWNLOAD_RESUME_KEY)
      return null
    }
    return state
  } catch {
    return null
  }
}

function setDownloadState(modelId: string, progress: number): void {
  try {
    localStorage.setItem(
      DOWNLOAD_RESUME_KEY,
      JSON.stringify({
        modelId,
        progress,
        startedAt: Date.now(),
      }),
    )
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function clearDownloadState(): void {
  try {
    localStorage.removeItem(DOWNLOAD_RESUME_KEY)
  } catch {
    // ignore
  }
}

interface UseDownloadResumeReturn {
  partialDownload: DownloadState | null
  hasPartialDownload: boolean
  progress: number
  error: boolean
  isDownloading: boolean
  isInterrupted: boolean
  onProgress: (progress: number) => void
  onInterrupted: (modelId: string) => void
  onCompleted: () => void
  onResume: () => void
}

export function useDownloadResume(): UseDownloadResumeReturn {
  const [partialDownload, setPartialDownload] = useState<DownloadState | null>(
    () => getDownloadState(),
  )
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isInterrupted, setIsInterrupted] = useState(false)
  const modelIdRef = useRef<string | null>(null)

  // Check for partial download on mount
  useEffect(() => {
    const state = getDownloadState()
    if (state) {
      setPartialDownload(state)
      setProgress(state.progress)
    }
  }, [])

  const onProgress = useCallback((p: number) => {
    setProgress(p)
    if (modelIdRef.current) {
      setDownloadState(modelIdRef.current, p)
    }
  }, [])

  const onInterrupted = useCallback((modelId: string) => {
    modelIdRef.current = modelId
    setIsInterrupted(true)
    setError(true)
    setIsDownloading(false)
  }, [])

  const onCompleted = useCallback(() => {
    clearDownloadState()
    setPartialDownload(null)
    setProgress(0)
    setError(false)
    setIsInterrupted(false)
    setIsDownloading(false)
    modelIdRef.current = null
  }, [])

  const onResume = useCallback(() => {
    // Clear the interrupted state so the UI can show the model card again
    setIsInterrupted(false)
    setError(false)
    setIsDownloading(true)
    // The parent component should call load() again
  }, [])

  return {
    partialDownload,
    hasPartialDownload: partialDownload !== null,
    progress,
    error,
    isDownloading,
    isInterrupted,
    onProgress,
    onInterrupted,
    onCompleted,
    onResume,
  }
}
