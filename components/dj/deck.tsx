"use client"

import { useMemo, useState } from "react"
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
  onLoadTrack?: (track: Track | File, deck: "A" | "B") => Promise<void>
  gain?: number
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
  onLoadTrack,
  gain = 1,
}: DeckProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Generate deterministic waveform heights to avoid hydration mismatch
  const waveformHeights = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
      // Use a deterministic pseudo-random pattern based on index
      const seed = i * 0.618033988749895 // Golden ratio for better distribution
      const pseudoRandom = (Math.sin(seed * 1000) + 1) / 2 // Convert to 0-1 range
      // Round to 2 decimal places to ensure consistent server/client rendering
      const height = 20 + Math.sin(i * 0.5) * 15 + pseudoRandom * 10
      return `${Math.round(height * 100) / 100}%`
    })
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide drag over state if we're actually leaving the deck container
    if (e.currentTarget === e.target) {
      setIsDragOver(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (!onLoadTrack) return

    setIsLoading(true)

    try {
      // Check if it's a track being dragged from the library
      const trackData = e.dataTransfer.getData("application/x-track")
      if (trackData) {
        const track: Track = JSON.parse(trackData)
        await onLoadTrack(track, deck)
        return
      }

      // Check if it's a file being dragged from the file system
      const files = Array.from(e.dataTransfer.files)
      const audioFiles = files.filter((file) => {
        const validTypes = [
          "audio/mpeg",
          "audio/wav",
          "audio/ogg",
          "audio/mp4",
          "audio/x-m4a",
          "audio/aac",
          "audio/flac",
        ]
        return validTypes.includes(file.type) || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
      })

      if (audioFiles.length > 0) {
        const file = audioFiles[0]
        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          console.error(`File "${file.name}" is too large. Max size is 50MB.`)
          return
        }
        // Load the first audio file
        await onLoadTrack(file, deck)
      }
    } catch (error) {
      console.error("Error loading track:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-xl backdrop-blur-xl border transition-all",
        "bg-slate-900/60 border-purple-500/30",
        deck === "A" ? "border-l-2 border-l-purple-500" : "border-r-2 border-r-cyan-500",
        isDragOver && (deck === "A" ? "border-purple-500 bg-purple-500/20" : "border-cyan-500 bg-cyan-500/20"),
        isLoading && "opacity-50 pointer-events-none",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Deck Label */}
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-bold tracking-wider", deck === "A" ? "text-purple-400" : "text-cyan-400")}>
          DECK {deck}
        </span>
        {track?.bpm && <span className="text-xs text-slate-400 font-mono">{track.bpm} BPM</span>}
      </div>

      {/* Track Info */}
      <div className="min-h-[40px]">
        {isDragOver ? (
          <div className="space-y-0.5">
            <p className={cn("text-sm font-medium truncate", deck === "A" ? "text-purple-400" : "text-cyan-400")}>
              Drop track here...
            </p>
            <p className="text-xs text-slate-400">Release to load</p>
          </div>
        ) : track ? (
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-white truncate">{track.title}</p>
            <p className="text-xs text-slate-400 truncate">{track.artist}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No track loaded • Drag & drop or click library buttons</p>
        )}
      </div>

      {/* Waveform / Progress */}
      <div className="flex flex-col gap-1">
        {/* Waveform container */}
        <div
          className="relative h-8 bg-slate-800/50 rounded-lg overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!track || !duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percent = x / rect.width
            onSeek(percent * duration)
          }}
        >
          {/* Progress Bar (highlighted portion) */}
          <div
            className={cn(
              "absolute inset-y-0 left-0",
              deck === "A" ? "bg-purple-500/30" : "bg-cyan-500/30",
            )}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />

          {/* Waveform visualization */}
          <div className="absolute inset-0 flex items-center justify-between">
            {waveformHeights.map((height, i) => {
              const barProgress = ((i + 0.5) / waveformHeights.length) * 100
              const isPast = barProgress < progress
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 mx-px rounded-full",
                    deck === "A" ? "bg-purple-400" : "bg-cyan-400",
                    isPast ? "opacity-70" : "opacity-30"
                  )}
                  style={{ height }}
                />
              )
            })}
          </div>

          {/* Playhead */}
          <div
            className={cn(
              "absolute top-0 bottom-0 w-0.5",
              deck === "A" ? "bg-purple-400" : "bg-cyan-400"
            )}
            style={{ left: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>

        {/* Time display - separate row */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
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
