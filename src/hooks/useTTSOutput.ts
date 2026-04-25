import { useState, useRef, useCallback, useEffect } from 'react'

export type TTSState = 'idle' | 'speaking' | 'paused'

interface TTSHookReturn {
  state: TTSState
  isSupported: boolean
  speak: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

export function useTTSOutput(): TTSHookReturn {
  const [state, setState] = useState<TTSState>('idle')
  const [isSupported, setIsSupported] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Check Speech Synthesis support on mount
  useEffect(() => {
    const supported = 'speechSynthesis' in window
    setIsSupported(supported)
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    // Use a neutral voice; let the browser pick the default
    utterance.rate = 1
    utterance.pitch = 1

    utterance.onstart = () => setState('speaking')
    utterance.onend = () => setState('idle')
    utterance.onerror = () => setState('idle')

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

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

  return { state, isSupported, speak, pause, resume, stop }
}
