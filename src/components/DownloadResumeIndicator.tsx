import { useCallback } from 'react'

interface Props {
  modelId: string
  progress: number
  onResume: () => void
}

export function DownloadResumeIndicator({ modelId, progress, onResume }: Props) {
  const handleClick = useCallback(() => {
    onResume()
  }, [onResume])

  return (
    <div className="download-resume">
      <button className="download-resume-btn" onClick={handleClick}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 1 3 6.7" />
          <path d="M3 7v5h5" />
        </svg>
        Resume Download ({progress}%)
      </button>
      <div className="download-resume-progress">
        <div
          className="download-resume-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
