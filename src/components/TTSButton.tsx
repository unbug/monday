import { useState } from 'react'
import { useTTSOutput } from '../hooks/useTTSOutput'
import type { TTSState } from '../hooks/useTTSOutput'
import { t } from '../lib/i18n'

interface Props {
  text: string
  compact?: boolean
}

export function TTSButton({ text, compact = false }: Props) {
  const { state, isSupported, voices, selectedVoiceURI, setVoice, speak, pause, resume, stop } = useTTSOutput()
  const [showVoicePicker, setShowVoicePicker] = useState(false)

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

  const handleVoiceSelect = (voiceURI: string) => {
    setVoice(voiceURI)
    setShowVoicePicker(false)
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
    title = t('tts.pause')
  } else if (state === 'paused') {
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    )
    title = t('tts.resume')
  } else {
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    )
    title = t('tts.readAloud')
  }

  // Group voices by language for the dropdown
  const groupedVoices = voices.reduce<Record<string, typeof voices>>((acc, v) => {
    const key = v.lang
    if (!acc[key]) acc[key] = []
    acc[key].push(v)
    return acc
  }, {})

  const selectedName = voices.find((v) => v.voiceURI === selectedVoiceURI)?.name || 'Default'

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
          title={t('tts.stop')}
          type="button"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      )}
      {/* Voice selector */}
      <div className="tts-voice-picker">
        <button
          className="tts-voice-btn"
          onClick={() => setShowVoicePicker(!showVoicePicker)}
          title={t('tts.selectVoice')}
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <span className="tts-voice-label">{selectedName}</span>
        </button>
        {showVoicePicker && (
          <div className="tts-voice-dropdown">
            {Object.entries(groupedVoices).map(([lang, langVoices]) => (
              <div key={lang} className="tts-voice-group">
                <span className="tts-voice-group-label">{lang}</span>
                {langVoices.map((v) => (
                  <button
                    key={v.voiceURI}
                    className={`tts-voice-option ${v.voiceURI === selectedVoiceURI ? 'active' : ''}`}
                    onClick={() => handleVoiceSelect(v.voiceURI)}
                    type="button"
                  >
                    {v.name}
                    {v.localService && <span className="tts-voice-local">(local)</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </span>
  )
}
