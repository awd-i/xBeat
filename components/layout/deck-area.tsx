"use client"

import type { Track, MusicObject } from "@/lib/types"
import { Deck } from "@/components/dj/deck"
import { Mixer } from "@/components/dj/mixer"

interface DeckAreaProps {
  trackA: Track | null
  trackB: Track | null
  musicObject: MusicObject
  isPlayingA: boolean
  isPlayingB: boolean
  currentTimeA: number
  currentTimeB: number
  durationA: number
  durationB: number
  onPlay: (deck?: "A" | "B") => void
  onPause: (deck?: "A" | "B") => void
  onSeek: (deck: "A" | "B", time: number) => void
  onCrossfadeChange: (value: number) => void
  onUpdateMusicObject: (updates: Partial<MusicObject>) => void
}

export function DeckArea({
  trackA,
  trackB,
  musicObject,
  isPlayingA,
  isPlayingB,
  currentTimeA,
  currentTimeB,
  durationA,
  durationB,
  onPlay,
  onPause,
  onSeek,
  onCrossfadeChange,
  onUpdateMusicObject,
}: DeckAreaProps) {
  const handleGainChange = (deck: "A" | "B", gain: number) => {
    onUpdateMusicObject({
      tracks: {
        ...musicObject.tracks,
        [deck]: musicObject.tracks[deck] ? { ...musicObject.tracks[deck], gain } : null,
      },
    })
  }

  return (
    <div className="bg-slate-950/90 backdrop-blur-xl border-t border-purple-500/20 p-4">
      <div className="max-w-6xl mx-auto flex gap-4">
        <div className="flex-1">
          <Deck
            deck="A"
            track={trackA}
            isPlaying={isPlayingA}
            currentTime={currentTimeA}
            duration={durationA}
            onPlay={() => onPlay("A")}
            onPause={() => onPause("A")}
            onSeek={(time) => onSeek("A", time)}
            onGainChange={(gain) => handleGainChange("A", gain)}
            gain={musicObject.tracks.A?.gain}
          />
        </div>

        <div className="w-64">
          <Mixer
            musicObject={musicObject}
            onCrossfadeChange={onCrossfadeChange}
            onEQChange={(band, value) =>
              onUpdateMusicObject({
                eq: { ...musicObject.eq, [band]: value },
              })
            }
            onFilterChange={(cutoff) =>
              onUpdateMusicObject({
                filter: { ...musicObject.filter, cutoff },
              })
            }
            onReverbChange={(value) => onUpdateMusicObject({ reverbAmount: value })}
            onDelayChange={(value) => onUpdateMusicObject({ delayAmount: value })}
          />
        </div>

        <div className="flex-1">
          <Deck
            deck="B"
            track={trackB}
            isPlaying={isPlayingB}
            currentTime={currentTimeB}
            duration={durationB}
            onPlay={() => onPlay("B")}
            onPause={() => onPause("B")}
            onSeek={(time) => onSeek("B", time)}
            onGainChange={(gain) => handleGainChange("B", gain)}
            gain={musicObject.tracks.B?.gain}
          />
        </div>
      </div>
    </div>
  )
}