"use client"

import type { Track } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeckProps {
  deck: "A" | "B"
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onGainChange: (gain: number) => void
  onTempoChange: (rate: number) => void
  gain?: number
  playbackRate?: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function Deck({
  deck,
  track,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  onGainChange,
  onTempoChange,
  gain = 1,
  playbackRate = 1,
}: DeckProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const adjustedBPM = track?.bpm ? Math.round(track.bpm * playbackRate) : null

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-xl backdrop-blur-xl border",
        "bg-slate-900/60 border-purple-500/30",
        deck === "A" ? "border-l-2 border-l-purple-500" : "border-r-2 border-r-cyan-500",
      )}
    >
      {/* Deck Label */}
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-bold tracking-wider", deck === "A" ? "text-purple-400" : "text-cyan-400")}>
          DECK {deck}
        </span>
        {adjustedBPM && (
          <span className="text-xs font-mono">
            <span className={cn(deck === "A" ? "text-purple-400" : "text-cyan-400")}>{adjustedBPM}</span>
            <span className="text-slate-500"> BPM</span>
          </span>
        )}
      </div>

      {/* Track Info */}
      <div className="min-h-[40px]">
        {track ? (
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-white truncate">{track.title}</p>
            <p className="text-xs text-slate-400 truncate">{track.key || "Key not detected"}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No track loaded</p>
        )}
      </div>

      {/* Waveform / Progress */}
      <div
        className="relative h-12 bg-slate-800/50 rounded-lg overflow-hidden cursor-pointer group"
        onClick={(e) => {
          if (!track || !duration) return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const percent = x / rect.width
          onSeek(percent * duration)
        }}
      >
        {/* Progress Bar - no transition to stay in sync with playhead */}
        <div
          className={cn(
            "absolute inset-y-0 left-0",
            deck === "A" ? "bg-purple-500/30" : "bg-cyan-500/30",
          )}
          style={{ width: `${progress}%` }}
        />

        {/* Playhead */}
        <div
          className={cn("absolute top-0 bottom-0 w-0.5", deck === "A" ? "bg-purple-400" : "bg-cyan-400")}
          style={{ left: `${progress}%` }}
        />

        {/* Fake waveform visualization - starts at left edge */}
        <div className="absolute inset-0 flex items-center gap-[1px] opacity-50">
          {Array.from({ length: 100 }).map((_, i) => {
            // Deterministic height based on index to avoid hydration mismatch
            const height = Math.round(20 + Math.sin(i * 0.5) * 15 + Math.sin(i * 2.3) * 8 + Math.cos(i * 1.7) * 5)
            return (
              <div
                key={i}
                className={cn("flex-1 min-w-0 rounded-sm", deck === "A" ? "bg-purple-400" : "bg-cyan-400")}
                style={{ height: `${height}%` }}
              />
            )
          })}
        </div>

        {/* Time display */}
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[10px] font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSeek(0)} disabled={!track}>
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            deck === "A"
              ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
              : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400",
          )}
          onClick={isPlaying ? onPause : onPlay}
          disabled={!track}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-slate-400" />
          <Slider
            value={[gain * 100]}
            onValueChange={([v]) => onGainChange(v / 100)}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* Tempo Control */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Tempo</span>
          <span className="text-[10px] font-mono text-slate-500">
            {playbackRate > 1 ? "+" : ""}
            {((playbackRate - 1) * 100).toFixed(1)}%
          </span>
        </div>
        <Slider
          value={[playbackRate * 100]}
          onValueChange={([v]) => onTempoChange(v / 100)}
          min={20}
          max={180}
          step={0.5}
          disabled={!track}
          className="flex-1"
        />
      </div>

      {/* Track metadata */}
      {track?.analyzed && (
        <div className="flex flex-wrap gap-1 mt-1">
          {track.genre && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/20 text-purple-300">{track.genre}</span>
          )}
          {track.key && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-300">{track.key}</span>
          )}
          {track.energy !== undefined && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300">
              Energy: {Math.round(track.energy * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
