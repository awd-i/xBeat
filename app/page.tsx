"use client"

import { useState, useCallback } from "react"
import type { Track, MusicObject, TransitionPlan } from "@/lib/types"
import { useMusicEngine } from "@/hooks/use-music-engine"
import { useTracks } from "@/hooks/use-tracks"
import { ClientOnlyVisualizer } from "@/components/visualizer/client-only-visualizer"
import { DJHeader } from "@/components/layout/dj-header"
import { DJSidebar } from "@/components/layout/dj-sidebar"
import { DeckArea } from "@/components/layout/deck-area"
import { ClientWrapper } from "@/components/client-wrapper"
import { logError } from "@/lib/logger"

export default function DJSystem() {
  const { tracks } = useTracks()
  const musicEngine = useMusicEngine()
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
  } = musicEngine

  const [trackA, setTrackA] = useState<Track | null>(null)
  const [trackB, setTrackB] = useState<Track | null>(null)
  const [showLibrary, setShowLibrary] = useState(true)
  const [showCopilot, setShowCopilot] = useState(true)
  const [showVoiceControl, setShowVoiceControl] = useState(false)

  const handleLoadToDeck = useCallback(
    async (track: Track, deck: "A" | "B") => {
      try {
        if (!isInitialized) {
          await initialize()
        }

        await loadTrack(deck, track.url)

        if (deck === "A") {
          setTrackA(track)
        } else {
          setTrackB(track)
        }
      } catch (error) {
        logError('Failed to load track to deck', error, { deck, trackId: track.id })
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
      try {
        switch (action) {
          case "play":
            if (!isInitialized) await initialize()
            if (params?.deck === "both") {
              await play()
            } else {
              await play(params?.deck as "A" | "B" | undefined)
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
              handleSmoothTransition()
            }
            break
          case "analyze":
            // Voice analysis action
            break
        }
      } catch (error) {
        logError('Voice action failed', error, { action, params })
      }
    },
    [isInitialized, initialize, play, pause, musicObject.crossfader, setCrossfade],
  )
  
  const handleSmoothTransition = useCallback(() => {
    const start = musicObject.crossfader
    const end = start < 0.5 ? 1 : 0
    const duration = 2000 // 2 seconds
    const startTime = performance.now()
    
    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const value = start + (end - start) * progress
      setCrossfade(value)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [musicObject.crossfader, setCrossfade])

  return (
    <ClientWrapper>
      <div className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col">
        <div className="absolute inset-0 z-0">
          <ClientOnlyVisualizer analyserData={analyserData} musicObject={musicObject} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <DJHeader
            musicObject={musicObject}
            showLibrary={showLibrary}
            showCopilot={showCopilot}
            showVoiceControl={showVoiceControl}
            onToggleLibrary={() => setShowLibrary(!showLibrary)}
            onToggleCopilot={() => setShowCopilot(!showCopilot)}
            onToggleVoiceControl={() => setShowVoiceControl(!showVoiceControl)}
            onUpdateMusicObject={updateMusicObject}
          />

          <div className="flex-1 flex overflow-hidden">
            {(showLibrary || showCopilot || showVoiceControl) && (
              <DJSidebar
                showLibrary={showLibrary}
                showCopilot={showCopilot}
                showVoiceControl={showVoiceControl}
                trackA={trackA}
                trackB={trackB}
                tracks={tracks}
                musicObject={musicObject}
                onLoadToDeck={handleLoadToDeck}
                onApplyTransition={handleApplyTransition}
                onApplyPreset={handleApplyPreset}
                onVoiceAction={handleVoiceAction}
                getAnalyserData={getAnalyserData}
              />
            )}

            <div className="flex-1" />
          </div>

          <DeckArea
            trackA={trackA}
            trackB={trackB}
            musicObject={musicObject}
            isPlayingA={isPlayingA}
            isPlayingB={isPlayingB}
            currentTimeA={currentTimeA}
            currentTimeB={currentTimeB}
            durationA={durationA}
            durationB={durationB}
            onPlay={play}
            onPause={pause}
            onSeek={seek}
            onCrossfadeChange={setCrossfade}
            onUpdateMusicObject={updateMusicObject}
          />
        </div>
      </div>
    </ClientWrapper>
  )
}
