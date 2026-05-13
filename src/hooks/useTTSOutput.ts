import { useState, useRef, useCallback, useEffect } from 'react'

export type TTSState = 'idle' | 'speaking' | 'paused'

export interface TTSVoice {
  name: string
  lang: string
  localService: boolean
  voiceURI: string
}

export interface TTSSettings {
  /** Auto-play TTS when a message completes */
  autoPlay: boolean
  /** Selected voice URI (empty = browser default) */
  voiceURI: string
}

interface TTSHookReturn {
  state: TTSState
  isSupported: boolean
  voices: TTSVoice[]
  selectedVoiceURI: string
  setVoice: (voiceURI: string) => void
  speak: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

export function useTTSOutput(): TTSHookReturn {
  const [state, setState] = useState<TTSState>('idle')
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(
    localStorage.getItem('monday-tts-voice') ?? '',
  )
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Check Speech Synthesis support and load voices on mount
  useEffect(() => {
    const supported = 'speechSynthesis' in window
    setIsSupported(supported)
    if (!supported) return

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      setVoices(
        available.map((v) => ({
          name: v.name,
          lang: v.lang,
          localService: v.localService,
          voiceURI: v.voiceURI,
        })),
      )
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1

      // Apply selected voice
      if (selectedVoiceURI) {
        const allVoices = window.speechSynthesis.getVoices()
        const voice = allVoices.find((v) => v.voiceURI === selectedVoiceURI)
        if (voice) utterance.voice = voice
      }

      utterance.onstart = () => setState('speaking')
      utterance.onend = () => setState('idle')
      utterance.onerror = () => setState('idle')

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [selectedVoiceURI],
  )

  const pause = useCallback(() => {
    if (window.speechSynthesis && state === 'speaking') {
      window.speechSynthesis.pause()
      setState('paused')
    }
  }, [state])

  const resume = useCallback(() => {
    if (window.speechSynthesis && state === 'paused') {
      window.speechSynthesis.resume()
      setState('speaking')
    }
  }, [state])

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setState('idle')
    }
  }, [])

  const setVoice = useCallback(
    (voiceURI: string) => {
      setSelectedVoiceURI(voiceURI)
      localStorage.setItem('monday-tts-voice', voiceURI)
    },
    [],
  )

  return { state, isSupported, voices, selectedVoiceURI, setVoice, speak, pause, resume, stop }
}
