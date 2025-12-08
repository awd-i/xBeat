"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { useVoiceCommands } from "@/hooks/use-voice-commands"
import { analyzeFrequencyData, describeAudioState, type AudioSnapshot } from "@/lib/audio-analyzer"
import type { Track, MusicObject, TransitionPlan } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2, Sparkles, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { deepMerge } from "@/lib/utils"
import Image from "next/image"

interface GrokChatPanelProps {
  trackA: Track | null
  trackB: Track | null
  musicObject: MusicObject
  tracks: Track[]
  transitionState: any
  getAnalyserData: () => { frequency: Uint8Array; timeDomain: Uint8Array }
  onApplySettings: (settings: Partial<MusicObject>) => void
  onApplyTransition: (plan: TransitionPlan) => void
  onApplyPreset: (preset: Partial<MusicObject>) => void
  onAction: (action: string, params?: Record<string, unknown>) => void
  onLoadTrack: (track: Track, deck: "A" | "B") => void
  onCancelTransition: () => void
}

interface ParsedAction {
  action: string
  settings?: Partial<MusicObject>
  deck?: "A" | "B" | "both"
  transitionType?: string
  trackId?: string
  trackTitle?: string
  transitionPlan?: TransitionPlan
  preset?: Partial<MusicObject>
}

type GrokVoice = "Ara" | "Rex" | "Sal" | "Eve" | "Una" | "Leo"

export function GrokChatPanel({
  trackA,
  trackB,
  musicObject,
  tracks,
  transitionState,
  getAnalyserData,
  onApplySettings,
  onApplyTransition,
  onApplyPreset,
  onAction,
  onLoadTrack,
  onCancelTransition,
}: GrokChatPanelProps) {
  const [textInput, setTextInput] = useState("")
  const [audioSnapshot, setAudioSnapshot] = useState<AudioSnapshot | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const analyzeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: string; content: string }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [grokVoice, setGrokVoice] = useState<GrokVoice>("Ara")
  const [hasReceivedFirstMessage, setHasReceivedFirstMessage] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const speakText = useCallback(
    async (text: string) => {
      if (!ttsEnabled || !text.trim()) return

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

        if (audioRef.current) {
          audioRef.current.pause()
          URL.revokeObjectURL(audioRef.current.src)
        }

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
    async (parsed: ParsedAction) => {
      switch (parsed.action) {
        case "mixer":
          if (parsed.settings) {
            onApplySettings(parsed.settings)
          }
          break
        case "transition":
          if (parsed.transitionPlan) {
            onApplyTransition(parsed.transitionPlan)
          } else {
            // Check if we need to load a track first
            if (parsed.trackTitle || parsed.trackId) {
              // Find the track to transition to
              const track = tracks.find(
                (t) =>
                  t.id === parsed.trackId ||
                  (parsed.trackTitle && t.title.toLowerCase().includes(parsed.trackTitle.toLowerCase())),
              )
              
              if (track) {
                console.log(`[GrokChat] Loading "${track.title}" for transition`)
                
                // Determine which deck to load to (opposite of the currently playing one)
                const targetDeck: "A" | "B" = trackA && !trackB ? "B" : !trackA && trackB ? "A" : musicObject.crossfader < 0.5 ? "B" : "A"
                
                // Load the track WITHOUT auto-playing (transition handler will start it)
                onLoadTrack(track, targetDeck)
                // Note: We don't call play() here - the transition handler will start it with proper crossfader position
                
                // Wait for track to load, then request transition
                setTimeout(async () => {
                  const currentTrackA = targetDeck === "A" ? track : trackA
                  const currentTrackB = targetDeck === "B" ? track : trackB
                  
                  if (currentTrackA && currentTrackB) {
                    try {
                      console.log("[GrokChat] Requesting transition after loading track")
                      const response = await fetch("/api/grok/transition", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          trackA: currentTrackA,
                          trackB: currentTrackB,
                          currentMusicObject: musicObject,
                          userPrompt: parsed.transitionType || "smooth transition",
                        }),
                      })

                      if (response.ok) {
                        const { plan } = await response.json()
                        console.log("[GrokChat] Received transition plan:", plan)
                        onApplyTransition(plan)
                      }
                    } catch (error) {
                      console.error("[GrokChat] Error requesting transition:", error)
                    }
                  }
                }, 1000) // Wait 1 second for track to load
              } else {
                console.warn("[GrokChat] Track not found for transition:", parsed.trackTitle || parsed.trackId)
              }
            } else {
              // Normal transition between currently loaded tracks
              if (trackA && trackB) {
                try {
                  console.log("[GrokChat] Requesting transition from A to B")
                  const response = await fetch("/api/grok/transition", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      trackA,
                      trackB,
                      currentMusicObject: musicObject,
                      userPrompt: parsed.transitionType || "smooth transition",
                    }),
                  })

                  if (response.ok) {
                    const { plan } = await response.json()
                    console.log("[GrokChat] Received transition plan:", plan)
                    onApplyTransition(plan)
                  } else {
                    console.error("[GrokChat] Failed to get transition plan")
                  }
                } catch (error) {
                  console.error("[GrokChat] Error requesting transition:", error)
                }
              } else {
                console.warn("[GrokChat] Cannot transition - missing tracks")
              }
            }
          }
          break
        case "preset":
          if (parsed.preset) {
            onApplyPreset(parsed.preset)
          }
          break
        case "loadTrack":
          const track = tracks.find(
            (t) =>
              t.id === parsed.trackId ||
              (parsed.trackTitle && t.title.toLowerCase().includes(parsed.trackTitle.toLowerCase())),
          )
          if (track) {
            // Intelligently choose which deck to load to
            let targetDeck: "A" | "B"
            
            if (parsed.deck && (parsed.deck === "A" || parsed.deck === "B")) {
              // Use specified deck
              targetDeck = parsed.deck
            } else {
              // Auto-choose deck: prefer empty deck, then non-playing deck, then deck A
              if (!trackA) {
                targetDeck = "A"
              } else if (!trackB) {
                targetDeck = "B"
              } else {
                // Both decks have tracks - load to the one that isn't playing
                // Or if both/neither playing, alternate based on current crossfader position
                const isAPlaying = musicObject.tracks.A?.enabled !== false
                const isBPlaying = musicObject.tracks.B?.enabled !== false
                
                if (isAPlaying && !isBPlaying) {
                  targetDeck = "B"
                } else if (!isAPlaying && isBPlaying) {
                  targetDeck = "A"
                } else {
                  // Both or neither playing - use crossfader position to decide
                  targetDeck = musicObject.crossfader < 0.5 ? "B" : "A"
                }
              }
            }
            
            console.log(`[GrokChat] Loading "${track.title}" to deck ${targetDeck}`)
            onLoadTrack(track, targetDeck)
            // Auto-play after loading (give time for track to load)
            setTimeout(() => onAction("play", { deck: targetDeck }), 500)
          } else {
            console.warn("[GrokChat] Track not found:", parsed.trackId || parsed.trackTitle)
          }
          break
        case "play":
          if (parsed.deck) {
            onAction("play", { deck: parsed.deck })
          } else {
            onAction("play", { deck: "both" })
          }
          break
        case "pause":
          if (parsed.deck) {
            onAction("pause", { deck: parsed.deck })
          } else {
            onAction("pause", { deck: "both" })
          }
          break
      }
    },
    [onApplySettings, onApplyTransition, onApplyPreset, onAction, onLoadTrack, tracks, trackA, trackB, musicObject],
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
            availableTracks: tracks,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`)
        }

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
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            console.log("[GrokChat] Stream line:", line)

            if (line.trim() === "[DONE]" || line.trim() === "data: [DONE]") continue

            // Handle AI SDK stream format (0: prefix for text deltas)
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2))
                console.log("[GrokChat] Text delta:", text)
                fullText += text
                setLocalMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
                )
              } catch (e) {
                console.error("[GrokChat] Failed to parse 0: line:", e)
              }
            }
            // Handle message content format
            else if (line.startsWith("2:")) {
              try {
                const parsed = JSON.parse(line.slice(2))
                console.log("[GrokChat] Message object:", parsed)
                if (parsed.content) {
                  fullText += parsed.content
                  setLocalMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
                  )
                }
              } catch (e) {
                console.error("[GrokChat] Failed to parse 2: line:", e)
              }
            }
            // Handle data: prefix format
            else if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim()
              if (jsonStr && jsonStr !== "[DONE]") {
                try {
                  const data = JSON.parse(jsonStr)
                  console.log("[GrokChat] Data object:", data)
                  const content = data.delta || data.choices?.[0]?.delta?.content || data.content || data.text
                  if (content) {
                    fullText += content
                    setLocalMessages((prev) =>
                      prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
                    )
                  }
                } catch (e) {
                  console.error("[GrokChat] Failed to parse data line:", e)
                }
              }
            }
            // Try parsing as raw JSON
            else if (line.startsWith("{")) {
              try {
                const data = JSON.parse(line)
                console.log("[GrokChat] Raw JSON object:", data)
                const content = data.delta || data.choices?.[0]?.delta?.content || data.content || data.text
                if (content) {
                  fullText += content
                  setLocalMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
                  )
                }
              } catch (e) {
                console.error("[GrokChat] Failed to parse raw JSON:", e)
              }
            }
          }
        }

        console.log("[GrokChat] Final text:", fullText)

        // If no text was received, show error
        if (!fullText || fullText.trim().length === 0) {
          setLocalMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "I didn't receive a response. Please try again." }
                : m,
            ),
          )
          return
        }

        // Auto-mute after first message
        if (!hasReceivedFirstMessage) {
          setHasReceivedFirstMessage(true)
          // Speak the first message
          speakText(fullText)
          // Then mute for subsequent messages
          setTimeout(() => {
            setTtsEnabled(false)
          }, 100)
        } else {
          // Speak if TTS is enabled
          speakText(fullText)
        }

        // Parse for actions
        const jsonMatch = fullText.match(/```json\n?([\s\S]*?)\n?```/)
        if (jsonMatch) {
          try {
            const parsed: ParsedAction = JSON.parse(jsonMatch[1])
            if (parsed.settings) {
              onApplySettings(deepMerge(musicObject, parsed.settings))
            }
            handleAction(parsed)
          } catch (e) {
            console.error("Failed to parse action JSON:", e)
          }
        }
      } catch (error) {
        console.error("Voice command error:", error)
        setLocalMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [
      audioSnapshot,
      trackA,
      trackB,
      musicObject,
      localMessages,
      handleAction,
      speakText,
      onApplySettings,
      tracks,
    ],
  )

  const handleVoiceCommand = useCallback(
    (command: string) => {
      sendMessage(command)
    },
    [sendMessage],
  )

  const { isListening, interimTranscript, error: voiceError, isSupported, toggleListening } = useVoiceCommands({
    onCommand: handleVoiceCommand,
  })

  // Audio analysis
  useEffect(() => {
    setIsAnalyzing(true)
    const interval = setInterval(() => {
      const { frequency } = getAnalyserData()
      const snapshot = analyzeFrequencyData(frequency)
      setAudioSnapshot(snapshot)
    }, 100)

    return () => {
      clearInterval(interval)
      setIsAnalyzing(false)
    }
  }, [getAnalyserData])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [localMessages])

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim()) return
    sendMessage(textInput)
    setTextInput("")
  }

  const audioDescription = audioSnapshot ? describeAudioState(audioSnapshot) : "Silence"

  return (
    <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Chat messages */}
      <ScrollArea className="h-[280px] p-4">
        <div className="space-y-3">
          {localMessages.length === 0 && (
            <div className="text-center py-12">
              <button
                onClick={toggleListening}
                disabled={!isSupported}
                className={cn(
                  "w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br flex items-center justify-center transition-all shadow-lg cursor-pointer",
                  isListening
                    ? "from-red-500 to-pink-500 animate-pulse ring-4 ring-red-500/50"
                    : "from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 hover:scale-110",
                )}
              >
                <Mic className={cn("h-10 w-10", isListening ? "text-white" : "text-purple-400")} />
              </button>
              <h3 className="text-lg font-semibold text-white mb-2">Speak to Grok</h3>
              <p className="text-sm text-slate-400 mb-4">
                Click the microphone and start talking
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {["Mix these tracks smoothly", "Drop the bass", "Create a transition", "What's playing?"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="px-3 py-1.5 rounded-full text-xs bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50 hover:border-purple-500/50 transition-all"
                    >
                      {suggestion}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {localMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 items-start",
                message.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  message.role === "user"
                    ? "bg-gradient-to-br from-cyan-500 to-blue-500"
                    : "bg-gradient-to-br from-purple-500 to-cyan-500",
                )}
              >
                {message.role === "user" ? (
                  <Mic className="h-4 w-4 text-white" />
                ) : (
                  <Sparkles className="h-4 w-4 text-white" />
                )}
              </div>

              <div
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-2xl text-sm max-w-[80%]",
                  message.role === "user"
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-50"
                    : "bg-slate-800/70 border border-slate-700/50 text-slate-200",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="whitespace-pre-wrap">
                    {message.content.replace(/```json[\s\S]*?```/g, "").trim()}
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
              <div className="px-4 py-2.5 bg-slate-800/70 border border-slate-700/50 rounded-2xl text-sm text-slate-300">
                Grok is thinking...
              </div>
            </div>
          )}

          {interimTranscript && (
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center animate-pulse">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <div className="px-4 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-sm text-purple-200 italic max-w-[80%]">
                {interimTranscript}...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input controls + Header */}
      <div className="border-t border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-cyan-900/20">
        {voiceError && (
          <div className="mx-4 mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {voiceError}
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex gap-3">
            <Button
              onClick={toggleListening}
              disabled={!isSupported}
              size="lg"
              className={cn(
                "shrink-0 h-14 w-14 rounded-full transition-all shadow-lg",
                isListening
                  ? "bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 animate-pulse ring-4 ring-red-500/50"
                  : "bg-gradient-to-br from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 ring-2 ring-purple-500/30 hover:ring-purple-500/50",
              )}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your message here..."
                className="flex-1 bg-slate-800/50 border-slate-700/50 text-sm h-14 px-4 focus:border-purple-500/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !textInput.trim()}
                className="shrink-0 h-14 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>

          {/* Grok branding and controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400" />
                </div>
                {isListening && <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />}
              </div>
              <div>
                <h2 className="text-sm font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Grok DJ Assistant
                </h2>
                <p className="text-[10px] text-slate-500">{audioDescription}</p>
              </div>
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isSpeaking
                    ? "bg-purple-500/30 text-purple-300 animate-pulse ring-2 ring-purple-500/50"
                    : ttsEnabled
                      ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                      : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50",
                )}
                title={
                  isSpeaking ? "Click to stop speaking" : ttsEnabled ? "Click to mute Grok" : "Click to unmute Grok"
                }
              >
                {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span>{isSpeaking ? "Speaking" : ttsEnabled ? "Unmuted" : "Muted"}</span>
              </button>

              {ttsEnabled && (
                <div className="flex gap-1">
                  {(["Ara", "Eve", "Rex", "Leo"] as GrokVoice[]).map((voice) => (
                    <button
                      key={voice}
                      onClick={() => setGrokVoice(voice)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-medium transition-all",
                        grokVoice === voice
                          ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
                          : "bg-slate-800/50 text-slate-400 hover:text-slate-200",
                      )}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
