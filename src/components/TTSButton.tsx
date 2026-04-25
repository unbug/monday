import { useTTSOutput } from '../hooks/useTTSOutput'
import type { TTSState } from '../hooks/useTTSOutput'

interface Props {
  text: string
  compact?: boolean
}

export function TTSButton({ text, compact = false }: Props) {
  const { state, isSupported, speak, pause, resume, stop } = useTTSOutput()

  if (!isSupported) return null

  const handleToggle = () => {
    if (state === 'idle') {
      speak(text)
    } else if (state === 'speaking') {
      pause()
    } else if (state === 'paused') {
      resume()
    }
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    stop()
  }

  // Determine which icon to show
  let icon: React.ReactNode
  let title: string
  let btnClass = 'tts-btn'

  if (state === 'speaking') {
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    )
    title = 'Pause'
  } else if (state === 'paused') {
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    )
    title = 'Resume'
  } else {
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    )
    title = 'Read aloud'
  }

  return (
    <span className={`tts-wrapper ${state !== 'idle' ? 'tts-wrapper-active' : ''}`}>
      <button
        className={btnClass}
        onClick={handleToggle}
        title={title}
        type="button"
      >
        {icon}
      </button>
      {state !== 'idle' && (
        <button
          className="tts-btn tts-btn-stop"
          onClick={handleStop}
          title="Stop"
          type="button"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      )}
    </span>
  )
}
