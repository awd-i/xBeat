"use client"

import { useState, useCallback } from "react"
import type { Track, MusicObject, TransitionPlan } from "@/lib/types"
import { useMusicEngine } from "@/hooks/use-music-engine"
import { useTracks } from "@/hooks/use-tracks"
import { ThreeVisualizer } from "@/components/visualizer/three-visualizer"
import { Deck } from "@/components/dj/deck"
import { Mixer } from "@/components/dj/mixer"
import { MusicLibrary } from "@/components/library/music-library"
import { GrokChatPanel } from "@/components/grok/grok-chat-panel"
import { VisualizerControls } from "@/components/dj/visualizer-controls"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Disc3, PanelLeftClose, Sliders, Sparkles } from "lucide-react"

export default function DJSystem() {
  const { tracks } = useTracks()
  const {
    isInitialized,
    initialize,
    loadTrack,
    play,
    pause,
    seek,
    setCrossfade,
    updateMusicObject,
    applyTransitionPlan,
    cancelTransition,
    isPlayingA,
    isPlayingB,
    currentTimeA,
    currentTimeB,
    durationA,
    durationB,
    musicObject,
    analyserData,
    getAnalyserData,
    transitionState,
    musicEngine,
  } = useMusicEngine()

  const [trackA, setTrackA] = useState<Track | null>(null)
  const [trackB, setTrackB] = useState<Track | null>(null)
  const [showLibrary, setShowLibrary] = useState(true)
  const [controlsExpanded, setControlsExpanded] = useState(true)
  const [activePanel, setActivePanel] = useState<"dj" | "grok">("grok")
  const [bpmA, setBpmA] = useState<number | null>(null)
  const [bpmB, setBpmB] = useState<number | null>(null)

  const handleLoadToDeck = useCallback(
    async (track: Track, deck: "A" | "B") => {
      if (!isInitialized) {
        await initialize()
      }

      await loadTrack(deck, track.url)

      // Initialize track settings with default playbackRate
      const trackSettings = {
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist,
        gain: 1,
        pan: 0,
        playbackRate: 1,
        enabled: true,
      }

      updateMusicObject({
        tracks: {
          ...musicObject.tracks,
          [deck]: trackSettings,
        },
      })

      if (deck === "A") {
        setTrackA(track)
        setTimeout(() => {
          const bpm = musicEngine?.getBPM("A") ?? null
          setBpmA(bpm)
        }, 1000)
      } else {
        setTrackB(track)
        setTimeout(() => {
          const bpm = musicEngine?.getBPM("B") ?? null
          setBpmB(bpm)
        }, 1000)
      }
    },
    [isInitialized, initialize, loadTrack, musicEngine, musicObject.tracks, updateMusicObject],
  )

  const handleApplyTransition = useCallback(
    (plan: TransitionPlan) => {
      console.log("[v0] Applying transition plan:", plan)

      // Ensure both decks are playing before starting transition
      if (!isPlayingA && trackA) {
        console.log("[v0] Starting deck A for transition")
        play("A")
      }
      if (!isPlayingB && trackB) {
        console.log("[v0] Starting deck B for transition")
        play("B")
      }

      // Apply the transition automation
      applyTransitionPlan(plan)

      // Apply visualizer config if present
      if (plan.visualizerConfig) {
        console.log("[v0] Applying visualizer config:", plan.visualizerConfig)
        updateMusicObject(plan.visualizerConfig)
      }

      console.log("[v0] Transition started, duration:", plan.durationSeconds, "seconds")
    },
    [applyTransitionPlan, updateMusicObject, isPlayingA, isPlayingB, trackA, trackB, play],
  )

  const handleApplyPreset = useCallback(
    (preset: Partial<MusicObject>) => {
      console.log("[v0] Applying preset to mixer:", preset)

      const merged: Partial<MusicObject> = {
        ...preset,
        eq: preset.eq ? { ...musicObject.eq, ...preset.eq } : musicObject.eq,
        filter: preset.filter ? { ...musicObject.filter, ...preset.filter } : musicObject.filter,
        tracks: preset.tracks
          ? {
              A: preset.tracks.A ? { ...musicObject.tracks.A, ...preset.tracks.A } : musicObject.tracks.A,
              B: preset.tracks.B ? { ...musicObject.tracks.B, ...preset.tracks.B } : musicObject.tracks.B,
            }
          : musicObject.tracks,
      }

      updateMusicObject(merged)
    },
    [updateMusicObject, musicObject],
  )

  const handleVoiceAction = useCallback(
    async (action: string, params?: Record<string, unknown>) => {
      switch (action) {
        case "play":
          if (!isInitialized) await initialize()
          if (params?.deck === "both") {
            play()
          } else {
            play(params?.deck as "A" | "B" | undefined)
          }
          break
        case "pause":
          if (params?.deck === "both") {
            pause()
          } else {
            pause(params?.deck as "A" | "B" | undefined)
          }
          break
        case "transition":
          if (params?.type === "smooth") {
            const start = musicObject.crossfader
            const end = start < 0.5 ? 1 : 0
            let progress = 0
            const interval = setInterval(() => {
              progress += 0.02
              if (progress >= 1) {
                clearInterval(interval)
                setCrossfade(end)
              } else {
                setCrossfade(start + (end - start) * progress)
              }
            }, 50)
          }
          break
        case "analyze":
          break
      }
    },
    [isInitialized, initialize, play, pause, musicObject.crossfader, setCrossfade],
  )

  const handleIsolationChange = useCallback(
    (deck: "A" | "B", type: "bass" | "voice" | "melody", value: number) => {
      const trackSettings = musicObject.tracks[deck]
      if (!trackSettings) return

      const isolationKey = `${type}Isolation` as any
      updateMusicObject({
        tracks: {
          ...musicObject.tracks,
          [deck]: {
            ...trackSettings,
            [isolationKey]: value,
          },
        },
      })
    },
    [musicObject.tracks, updateMusicObject],
  )

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col">
      <div
        className={`absolute left-0 right-0 z-0 transition-all duration-500 ${
          controlsExpanded ? "top-0 bottom-[45%]" : "inset-0"
        }`}
      >
        <ThreeVisualizer analyserData={analyserData} musicObject={musicObject} />
      </div>

      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <header className="pointer-events-auto flex items-center justify-between px-3 py-1.5 bg-slate-950/70 backdrop-blur-sm border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Disc3 className="h-5 w-5 text-purple-400 animate-[spin_3s_linear_infinite]" />
            </div>
            <h1 className="text-base font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              xBeat
            </h1>
            <div className="ml-4 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-400/30">
              <span className="text-xs font-medium bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                Made with ❤️ by Ryan, Aidan, and John
              </span>
            </div>
          </div>

          <VisualizerControls
            musicObject={musicObject}
            onModeChange={(mode) => updateMusicObject({ visualizerMode: mode })}
            onColorSchemeChange={(scheme) => updateMusicObject({ colorScheme: scheme })}
          />

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLibrary(!showLibrary)}
              className={`h-7 px-2 ${showLibrary ? "text-purple-400" : "text-slate-400"}`}
            >
              <PanelLeftClose className="h-4 w-4 mr-1" />
              Library
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {showLibrary && (
            <div className="pointer-events-auto absolute left-0 top-0 bottom-0 w-64 p-2 overflow-hidden bg-slate-950/70 backdrop-blur-sm border-r border-purple-500/20">
              <MusicLibrary onLoadToDeck={handleLoadToDeck} />
            </div>
          )}
        </div>

        <div className="pointer-events-auto">
          {/* Panel Tabs */}
          <div className="bg-slate-950/90 backdrop-blur-sm border-t border-purple-500/20 flex items-center justify-center gap-2 py-2">
            <button
              onClick={() => {
                setActivePanel("grok")
                if (!controlsExpanded) setControlsExpanded(true)
              }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activePanel === "grok"
                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Grok AI Chat</span>
            </button>

            <button
              onClick={() => {
                setActivePanel("dj")
                if (!controlsExpanded) setControlsExpanded(true)
              }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activePanel === "dj"
                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>DJ Controls</span>
            </button>

            <button
              onClick={() => setControlsExpanded(!controlsExpanded)}
              className="ml-4 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            >
              {controlsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {controlsExpanded && (
            <div className="bg-slate-950/90 backdrop-blur-xl border-t border-purple-500/20 p-4 max-h-[45vh] overflow-y-auto">
              <div className="max-w-7xl mx-auto">
                {/* DJ Controls Panel */}
                <div className={`flex gap-3 ${activePanel === "dj" ? "" : "hidden"}`}>
                  <div className="flex-1">
                    <Deck
                      deck="A"
                      track={trackA}
                      isPlaying={isPlayingA}
                      currentTime={currentTimeA}
                      duration={durationA}
                      onPlay={() => play("A")}
                      onPause={() => pause("A")}
                      onSeek={(time) => seek("A", time)}
                      onGainChange={(gain) =>
                        updateMusicObject({
                          tracks: {
                            ...musicObject.tracks,
                            A: musicObject.tracks.A ? { ...musicObject.tracks.A, gain } : null,
                          },
                        })
                      }
                      onTempoChange={(playbackRate) =>
                        updateMusicObject({
                          tracks: {
                            ...musicObject.tracks,
                            A: musicObject.tracks.A ? { ...musicObject.tracks.A, playbackRate } : null,
                          },
                        })
                      }
                      gain={musicObject.tracks.A?.gain}
                      playbackRate={musicObject.tracks.A?.playbackRate ?? 1}
                    />
                  </div>

                  <div className="w-56">
                    <Mixer
                      musicObject={musicObject}
                      onCrossfadeChange={setCrossfade}
                      onEQChange={(band, value) =>
                        updateMusicObject({
                          eq: { ...musicObject.eq, [band]: value },
                        })
                      }
                      onFilterChange={(cutoff) =>
                        updateMusicObject({
                          filter: { ...musicObject.filter, cutoff },
                        })
                      }
                      onReverbChange={(value) => updateMusicObject({ reverbAmount: value })}
                      onDelayChange={(value) => updateMusicObject({ delayAmount: value })}
                      onMasterGainChange={(value) => updateMusicObject({ masterGain: value })}
                      onIsolationChange={handleIsolationChange}
                      bpmA={bpmA}
                      bpmB={bpmB}
                    />
                  </div>

                  <div className="flex-1">
                    <Deck
                      deck="B"
                      track={trackB}
                      isPlaying={isPlayingB}
                      currentTime={currentTimeB}
                      duration={durationB}
                      onPlay={() => play("B")}
                      onPause={() => pause("B")}
                      onSeek={(time) => seek("B", time)}
                      onGainChange={(gain) =>
                        updateMusicObject({
                          tracks: {
                            ...musicObject.tracks,
                            B: musicObject.tracks.B ? { ...musicObject.tracks.B, gain } : null,
                          },
                        })
                      }
                      onTempoChange={(playbackRate) =>
                        updateMusicObject({
                          tracks: {
                            ...musicObject.tracks,
                            B: musicObject.tracks.B ? { ...musicObject.tracks.B, playbackRate } : null,
                          },
                        })
                      }
                      gain={musicObject.tracks.B?.gain}
                      playbackRate={musicObject.tracks.B?.playbackRate ?? 1}
                    />
                  </div>
                </div>

                {/* Grok Chat Panel - Keep mounted to preserve chat history */}
                <div className={activePanel === "grok" ? "" : "hidden"}>
                  <GrokChatPanel
                    trackA={trackA}
                    trackB={trackB}
                    musicObject={musicObject}
                    tracks={tracks}
                    transitionState={transitionState}
                    getAnalyserData={getAnalyserData}
                    onApplySettings={handleApplyPreset}
                    onApplyTransition={handleApplyTransition}
                    onApplyPreset={handleApplyPreset}
                    onAction={handleVoiceAction}
                    onLoadTrack={handleLoadToDeck}
                    onCancelTransition={cancelTransition}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
