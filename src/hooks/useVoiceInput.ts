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

export function useVoiceInput(onResult: (transcript: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    interimTranscript: '',
    error: null,
  })

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isListeningRef = useRef(false)

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

  return {
    ...state,
    startListening,
    stopListening,
    clearError,
  }
}
