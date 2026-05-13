import { useState, useRef, useCallback, useEffect } from 'react'

interface VoiceInputState {
  isListening: boolean
  isSupported: boolean
  interimTranscript: string
  error: string | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

export interface UseVoiceInputOptions {
  /** Silence detection timeout in ms; 0 to disable (default 2000) */
  silenceTimeout?: number
  /** Callback fired when silence timeout triggers (auto-send) */
  onSilence?: (transcript: string) => void
}

export function useVoiceInput(
  onResult: (transcript: string) => void,
  options?: UseVoiceInputOptions,
) {
  const silenceTimeout = options?.silenceTimeout ?? 2000
  const onSilence = options?.onSilence

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    interimTranscript: '',
    error: null,
  })

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isListeningRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSpeechTimeRef = useRef<number>(0)

  // Check Speech Recognition support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition as SpeechRecognitionConstructor | undefined
    const supported = !!SpeechRecognition
    setState((prev) => ({ ...prev, isSupported: supported }))
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition as SpeechRecognitionConstructor | undefined
    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        error:
          'Speech recognition is not supported in this browser. Try Chrome or Edge.',
      }))
      return
    }

    if (isListeningRef.current) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    // Use browser's preferred language
    recognition.lang =
      navigator.language ||
      (navigator as any).userLanguage ||
      'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      // Reset silence timer on new speech
      lastSpeechTimeRef.current = Date.now()
      resetSilenceTimer()
      setState((prev) => ({
        ...prev,
        interimTranscript: interim,
      }))
      if (final) {
        onResult(final)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      isListeningRef.current = false
      setState((prev) => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
        error:
          event.error === 'no-speech'
            ? 'No speech detected. Try again.'
            : event.error === 'not-allowed'
              ? 'Microphone access denied. Check browser permissions.'
              : `Speech error: ${event.error}`,
      }))
    }

    recognition.onend = () => {
      isListeningRef.current = false
      clearSilenceTimer()
      setState((prev) => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
      }))
    }

    recognitionRef.current = recognition
    isListeningRef.current = true
    setState((prev) => ({
      ...prev,
      isListening: true,
      error: null,
      interimTranscript: '',
    }))

    try {
      recognition.start()
    } catch {
      isListeningRef.current = false
      setState((prev) => ({
        ...prev,
        error: 'Failed to start speech recognition.',
      }))
    }
  }, [onResult])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
      setState((prev) => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    silenceTimerRef.current = setTimeout(() => {
      const transcript = state.interimTranscript.trim()
      if (transcript && onSilence) {
        onSilence(transcript)
      }
      silenceTimerRef.current = null
    }, silenceTimeout)
  }, [silenceTimeout, state.interimTranscript, onSilence])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Cleanup silence timer on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer()
    }
  }, [clearSilenceTimer])

  return {
    ...state,
    startListening,
    stopListening,
    clearError,
  }
}
