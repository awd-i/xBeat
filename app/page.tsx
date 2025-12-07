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
import { Disc3, Mic } from "lucide-react"

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
    isPlayingA,
    isPlayingB,
    currentTimeA,
    currentTimeB,
    durationA,
    durationB,
    musicObject,
    analyserData,
    getAnalyserData,
  } = useMusicEngine()

  const [trackA, setTrackA] = useState<Track | null>(null)
  const [trackB, setTrackB] = useState<Track | null>(null)
  const [showLibrary, setShowLibrary] = useState(true)
  const [showCopilot, setShowCopilot] = useState(true)
  const [showVoiceControl, setShowVoiceControl] = useState(false)

  const handleLoadToDeck = useCallback(
    async (track: Track, deck: "A" | "B") => {
      if (!isInitialized) {
        await initialize()
      }

      await loadTrack(deck, track.url)

      if (deck === "A") {
        setTrackA(track)
      } else {
        setTrackB(track)
      }
    },
    [isInitialized, initialize, loadTrack],
  )

  const handleApplyTransition = useCallback(
    (plan: TransitionPlan) => {
      applyTransitionPlan(plan)

      if (plan.visualizerConfig) {
        updateMusicObject(plan.visualizerConfig)
      }
    },
    [applyTransitionPlan, updateMusicObject],
  )

  const handleApplyPreset = useCallback(
    (preset: Partial<MusicObject>) => {
      updateMusicObject(preset)
    },
    [updateMusicObject],
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col">
      <div className="absolute inset-0 z-0">
        <ThreeVisualizer analyserData={analyserData} musicObject={musicObject} />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <header className="flex items-center justify-between px-4 py-2 bg-slate-950/80 backdrop-blur-sm border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Disc3 className="h-6 w-6 text-purple-400 animate-[spin_3s_linear_infinite]" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              xBeat
            </h1>
          </div>

          <VisualizerControls
            musicObject={musicObject}
            onModeChange={(mode) => updateMusicObject({ visualizerMode: mode })}
            onSensitivityChange={(value) => updateMusicObject({ visualSensitivity: value })}
            onColorSchemeChange={(scheme) => updateMusicObject({ colorScheme: scheme })}
          />

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLibrary(!showLibrary)}
              className={showLibrary ? "text-purple-400" : "text-slate-400"}
            >
              Library
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCopilot(!showCopilot)}
              className={showCopilot ? "text-cyan-400" : "text-slate-400"}
            >
              Grok
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceControl(!showVoiceControl)}
              className={showVoiceControl ? "text-green-400" : "text-slate-400"}
            >
              <Mic className="h-4 w-4 mr-1" />
              Voice
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {showLibrary && (
            <div className="w-72 p-3 overflow-hidden">
              <MusicLibrary onLoadToDeck={handleLoadToDeck} />
            </div>
          )}

          <div className="flex-1" />

          {showVoiceControl ? (
            <div className="w-80 p-3 overflow-hidden">
              <VoiceControl
                trackA={trackA}
                trackB={trackB}
                musicObject={musicObject}
                getAnalyserData={getAnalyserData}
                onApplySettings={handleApplyPreset}
                onAction={handleVoiceAction}
              />
            </div>
          ) : showCopilot ? (
            <div className="w-80 p-3 overflow-hidden">
              <GrokCopilot
                trackA={trackA}
                trackB={trackB}
                musicObject={musicObject}
                tracks={tracks}
                onApplyTransition={handleApplyTransition}
                onApplyPreset={handleApplyPreset}
                onLoadTrack={handleLoadToDeck}
              />
            </div>
          ) : null}
        </div>

        <div className="bg-slate-950/90 backdrop-blur-xl border-t border-purple-500/20 p-4">
          <div className="max-w-6xl mx-auto flex gap-4">
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
              />
            </div>

            <div className="w-64">
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
