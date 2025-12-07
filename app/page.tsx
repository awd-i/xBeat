"use client"

import { useState, useCallback } from "react"
import type { Track, MusicObject, TransitionPlan } from "@/lib/types"
import { useMusicEngine } from "@/hooks/use-music-engine"
import { useTracks } from "@/hooks/use-tracks"
import { ThreeVisualizer } from "@/components/visualizer/three-visualizer"
import { Deck } from "@/components/dj/deck"
import { Mixer } from "@/components/dj/mixer"
import { MusicLibrary } from "@/components/library/music-library"
import { GrokCopilot } from "@/components/grok/grok-copilot"
import { VoiceControl } from "@/components/grok/voice-control"
import { VisualizerControls } from "@/components/dj/visualizer-controls"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Disc3, Mic, PanelLeftClose, PanelRightClose } from "lucide-react"

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
  const [showCopilot, setShowCopilot] = useState(true)
  const [showVoiceControl, setShowVoiceControl] = useState(false)
  const [controlsExpanded, setControlsExpanded] = useState(true)
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
          controlsExpanded ? "top-0 bottom-[40%]" : "inset-0"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCopilot(!showCopilot)}
              className={`h-7 px-2 ${showCopilot ? "text-cyan-400" : "text-slate-400"}`}
            >
              Grok
              <PanelRightClose className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceControl(!showVoiceControl)}
              className={`h-7 px-2 ${showVoiceControl ? "text-green-400" : "text-slate-400"}`}
            >
              <Mic className="h-4 w-4 mr-1" />
              Voice
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {showLibrary && (
            <div className="pointer-events-auto absolute left-0 top-0 bottom-0 w-64 p-2 overflow-hidden bg-slate-950/70 backdrop-blur-sm border-r border-purple-500/20">
              <MusicLibrary onLoadToDeck={handleLoadToDeck} />
            </div>
          )}

          {showVoiceControl ? (
            <div className="pointer-events-auto absolute right-0 top-0 bottom-0 w-72 p-2 overflow-hidden bg-slate-950/70 backdrop-blur-sm border-l border-cyan-500/20">
              <VoiceControl
                trackA={trackA}
                trackB={trackB}
                musicObject={musicObject}
                getAnalyserData={getAnalyserData}
                onApplySettings={handleApplyPreset}
                onAction={handleVoiceAction}
                onLoadTrack={handleLoadToDeck}
                tracks={tracks}
              />
            </div>
          ) : showCopilot ? (
            <div className="pointer-events-auto absolute right-0 top-0 bottom-0 w-72 p-2 overflow-hidden bg-slate-950/70 backdrop-blur-sm border-l border-cyan-500/20">
              <GrokCopilot
                trackA={trackA}
                trackB={trackB}
                musicObject={musicObject}
                tracks={tracks}
                transitionState={transitionState}
                onApplyTransition={handleApplyTransition}
                onApplyPreset={handleApplyPreset}
                onLoadTrack={handleLoadToDeck}
                onCancelTransition={cancelTransition}
              />
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto">
          <button
            onClick={() => setControlsExpanded(!controlsExpanded)}
            className="w-full flex items-center justify-center py-1 bg-slate-950/70 backdrop-blur-sm border-t border-purple-500/20 hover:bg-slate-900/80 transition-colors"
          >
            {controlsExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {controlsExpanded && (
            <div className="bg-slate-950/80 backdrop-blur-xl border-t border-purple-500/20 p-3">
              <div className="max-w-5xl mx-auto flex gap-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
