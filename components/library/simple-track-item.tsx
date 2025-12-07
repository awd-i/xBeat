"use client"

import { Button } from "@/components/ui/button"
import type { Track } from "@/lib/types"

interface SimpleTrackItemProps {
  track: Track
  onLoadToDeck: (track: Track, deck: "A" | "B") => void
  onDelete?: (id: string) => void
}

export function SimpleTrackItem({ track, onLoadToDeck, onDelete }: SimpleTrackItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors border border-slate-700/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate font-medium">
          {track.title || "Unknown Title"}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {track.artist || "Unknown Artist"}
        </div>
        {track.genre && (
          <div className="text-xs text-purple-300 mt-1">
            {track.genre}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 ml-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLoadToDeck(track, "A")}
          className="h-6 w-8 text-xs bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30"
        >
          A
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLoadToDeck(track, "B")}
          className="h-6 w-8 text-xs bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30"
        >
          B
        </Button>
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(track.id)}
            className="h-6 w-6 text-xs bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  )
}