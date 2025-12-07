"use client"

import { useState, useCallback, useRef, useEffect } from "react"

// Speech Recognition types
interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface VoiceCommandState {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  isSupported: boolean
}

interface UseVoiceCommandsOptions {
  onCommand: (command: string) => void
  continuous?: boolean
  language?: string
}

export function useVoiceCommands({ onCommand, continuous = false, language = "en-US" }: UseVoiceCommandsOptions) {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    transcript: "",
    interimTranscript: "",
    error: null,
    isSupported:
      typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
  })

  const recognitionRef = useRef<any | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      setState((prev) => ({ ...prev, isListening: true, error: null }))
    }

    recognition.onend = () => {
      setState((prev) => ({ ...prev, isListening: false, interimTranscript: "" }))
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: event.error === "not-allowed" ? "Microphone access denied" : `Speech recognition error: ${event.error}`,
      }))
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let final = ""

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
        transcript: final || prev.transcript,
      }))

      if (final) {
        onCommand(final.trim())
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [continuous, language, onCommand])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setState((prev) => ({ ...prev, error: "Speech recognition not supported" }))
      return
    }

    setState((prev) => ({ ...prev, transcript: "", interimTranscript: "", error: null }))

    try {
      recognitionRef.current.start()
    } catch (e) {
      // Already started
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [state.isListening, startListening, stopListening])

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
  }
}

// Add types for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
