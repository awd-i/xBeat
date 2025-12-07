"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { useVoiceCommands } from "@/hooks/use-voice-commands"
import { analyzeFrequencyData, describeAudioState, type AudioSnapshot } from "@/lib/audio-analyzer"
import type { Track, MusicObject } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2, Sparkles, AudioWaveform } from "lucide-react"
import { cn } from "@/lib/utils"
import { deepMerge } from "@/lib/utils"

interface VoiceControlProps {
  trackA: Track | null
  trackB: Track | null
  musicObject: MusicObject
  getAnalyserData: () => { frequency: Uint8Array; timeDomain: Uint8Array }
  onApplySettings: (settings: Partial<MusicObject>) => void
  onAction: (action: string, params?: Record<string, unknown>) => void
}

interface ParsedAction {
  action: string
  settings?: Partial<MusicObject>
  deck?: "A" | "B" | "both"
  transitionType?: string
}

type GrokVoice = "Ara" | "Rex" | "Sal" | "Eve" | "Una" | "Leo"

export function VoiceControl({
  trackA,
  trackB,
  musicObject,
  getAnalyserData,
  onApplySettings,
  onAction,
}: VoiceControlProps) {
  const [textInput, setTextInput] = useState("")
  const [audioSnapshot, setAudioSnapshot] = useState<AudioSnapshot | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const analyzeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: string; content: string }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [grokVoice, setGrokVoice] = useState<GrokVoice>("Ara")
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speakText = useCallback(
    async (text: string) => {
      if (!ttsEnabled || !text.trim()) return

      // Clean the text - remove JSON blocks and markdown
      const cleanText = text
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\*\*/g, "")
        .replace(/\n+/g, " ")
        .trim()

      if (!cleanText || cleanText.length < 3) return

      try {
        setIsSpeaking(true)

        const response = await fetch("/api/grok/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText, voice: grokVoice }),
        })

        if (!response.ok) throw new Error("TTS failed")

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // Stop any existing audio
        if (audioRef.current) {
          audioRef.current.pause()
          URL.revokeObjectURL(audioRef.current.src)
        }

        // Play new audio
        const audio = new Audio(audioUrl)
        audioRef.current = audio

        audio.onended = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
        }

        audio.onerror = () => {
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
        }

        await audio.play()
      } catch (error) {
        console.error("TTS error:", error)
        setIsSpeaking(false)
      }
    },
    [ttsEnabled, grokVoice],
  )

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsSpeaking(false)
    }
  }, [])

  const handleAction = useCallback(
    (parsed: ParsedAction) => {
      switch (parsed.action) {
        case "mixer":
          if (parsed.settings) {
            onApplySettings(parsed.settings)
          }
          break
        case "play":
        case "pause":
          onAction(parsed.action, { deck: parsed.deck })
          break
        case "transition":
          onAction("transition", { type: parsed.transitionType })
          break
        case "analyze":
          onAction("analyze")
          break
      }
    },
    [onApplySettings, onAction],
  )

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage = { id: crypto.randomUUID(), role: "user", content }
      setLocalMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        const response = await fetch("/api/grok/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: content,
            audioSnapshot,
            currentTrackA: trackA,
            currentTrackB: trackB,
            musicObject,
            conversationHistory: localMessages.slice(-10),
          }),
        })

        if (!response.ok) throw new Error("Failed to get response")

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader")

        const decoder = new TextDecoder()
        let fullText = ""
        const assistantId = crypto.randomUUID()

        setLocalMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2))
                fullText += text
                setLocalMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)))
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // Parse response for actions
        const jsonMatch = fullText.match(/```json\n?([\s\S]*?)\n?```/)
        if (jsonMatch) {
          try {
            const parsed: ParsedAction = JSON.parse(jsonMatch[1])
            if (parsed.settings) {
              console.log("[v0] Applying Grok settings:", parsed.settings)
              onApplySettings(deepMerge(musicObject, parsed.settings))
            }
            handleAction(parsed)
          } catch (e) {
            console.error("Failed to parse action JSON:", e)
          }
        }

        speakText(fullText)
      } catch (error) {
        console.error("Voice command error:", error)
        setLocalMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [audioSnapshot, trackA, trackB, musicObject, localMessages, handleAction, speakText],
  )

  const handleVoiceCommand = useCallback(
    (command: string) => {
      sendMessage(command)
    },
    [sendMessage],
  )

  const {
    isListening,
    interimTranscript,
    error: voiceError,
    isSupported,
    toggleListening,
  } = useVoiceCommands({
    onCommand: handleVoiceCommand,
  })

  // Audio analysis loop
  const startAudioAnalysis = useCallback(() => {
    if (analyzeIntervalRef.current) return
    setIsAnalyzing(true)

    analyzeIntervalRef.current = setInterval(() => {
      const { frequency } = getAnalyserData()
      const snapshot = analyzeFrequencyData(frequency)
      setAudioSnapshot(snapshot)
    }, 100)
  }, [getAnalyserData])

  const stopAudioAnalysis = useCallback(() => {
    if (analyzeIntervalRef.current) {
      clearInterval(analyzeIntervalRef.current)
      analyzeIntervalRef.current = null
    }
    setIsAnalyzing(false)
  }, [])

  useEffect(() => {
    startAudioAnalysis()
    return () => stopAudioAnalysis()
  }, [startAudioAnalysis, stopAudioAnalysis])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
  }, [])

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim()) return
    sendMessage(textInput)
    setTextInput("")
  }

  const audioDescription = audioSnapshot ? describeAudioState(audioSnapshot) : "No audio"

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-xl rounded-xl border border-cyan-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <div className="absolute inset-0 animate-pulse">
                <Sparkles className="h-4 w-4 text-cyan-400 opacity-50" />
              </div>
            </div>
            <h2 className="text-sm font-semibold text-white">Voice Control</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking()
                } else {
                  setTtsEnabled(!ttsEnabled)
                }
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors",
                isSpeaking
                  ? "bg-purple-500/30 text-purple-400 animate-pulse"
                  : ttsEnabled
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-slate-700/50 text-slate-500",
              )}
              title={isSpeaking ? "Click to stop" : ttsEnabled ? "TTS enabled" : "TTS disabled"}
            >
              {ttsEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              <span>{isSpeaking ? "Speaking..." : "TTS"}</span>
            </button>

            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px]",
                isAnalyzing ? "bg-green-500/20 text-green-400" : "bg-slate-700/50 text-slate-500",
              )}
            >
              <AudioWaveform className="h-3 w-3" />
              <span>Audio</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-500">Voice:</span>
          <div className="flex gap-1">
            {(["Ara", "Rex", "Eve", "Leo"] as GrokVoice[]).map((voice) => (
              <button
                key={voice}
                onClick={() => setGrokVoice(voice)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] transition-colors",
                  grokVoice === voice
                    ? "bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
                    : "bg-slate-800/50 text-slate-500 hover:text-slate-300",
                )}
              >
                {voice}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 bg-slate-800/50 rounded px-2 py-1">
          <span className="text-cyan-400">Hearing:</span> {audioDescription}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {localMessages.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Click the mic or type to talk to Grok.</p>
              <p className="mt-1 text-slate-600">Grok will speak responses aloud!</p>
            </div>
          )}

          {localMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-2 rounded-lg text-xs",
                message.role === "user"
                  ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-100 ml-8"
                  : "bg-slate-800/50 border border-slate-700/50 text-slate-300 mr-8",
              )}
            >
              {message.role === "assistant" ? (
                <div className="whitespace-pre-wrap">{message.content.replace(/```json[\s\S]*?```/g, "").trim()}</div>
              ) : (
                message.content
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Grok is thinking...</span>
            </div>
          )}

          {interimTranscript && (
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs italic ml-8">
              {interimTranscript}...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-3 border-t border-slate-700/50 space-y-2">
        {voiceError && <p className="text-xs text-red-400">{voiceError}</p>}

        <div className="flex gap-2">
          <Button
            onClick={toggleListening}
            disabled={!isSupported}
            variant="outline"
            size="icon"
            className={cn(
              "shrink-0 transition-all",
              isListening
                ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                : "border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50",
            )}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-slate-800/50 border-slate-700 text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !textInput.trim()}
              className="shrink-0 bg-gradient-to-r from-purple-600 to-cyan-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1">
          {["More bass", "Drop the filter", "Fade to B", "Add reverb", "What's playing?"].map((cmd) => (
            <button
              key={cmd}
              onClick={() => sendMessage(cmd)}
              disabled={isLoading}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-800/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
