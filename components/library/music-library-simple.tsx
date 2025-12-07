"use client"

import { useState, useRef } from "react"
import type { Track } from "@/lib/types"
import { useTracks } from "@/hooks/use-tracks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SimpleTrackItem } from "./simple-track-item"
import { Upload, Search, Music, Loader2 } from "lucide-react"
import { logError } from "@/lib/logger"
import { addDemoTracks } from "@/lib/demo-tracks"

interface MusicLibraryProps {
  onLoadToDeck: (track: Track, deck: "A" | "B") => void
}

export function MusicLibrary({ onLoadToDeck }: MusicLibraryProps) {
  const { tracks, isLoading, uploadTrack, deleteTrack, error } = useTracks()
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Simple filtering
  const filteredTracks = tracks.filter((track) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      track.title?.toLowerCase().includes(searchLower) ||
      track.artist?.toLowerCase().includes(searchLower) ||
      track.genre?.toLowerCase().includes(searchLower)
    )
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Simple size check
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File too large: ${file.name}`)
        }
        await uploadTrack(file)
      }
    } catch (error) {
      logError("Upload failed", error)
    } finally {
      setUploading(false)
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-xl rounded-xl border border-purple-500/30">
      {/* Simple Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Music className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Library ({tracks.length})</span>
        </div>

        {/* Simple Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks..."
            className="pl-8 h-8 text-xs bg-slate-800/50 border-slate-600"
          />
        </div>

        {/* Simple Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-2" />
                Upload
              </>
            )}
          </Button>
          
          {tracks.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-purple-400 hover:text-purple-300"
              onClick={() => {
                addDemoTracks()
                window.location.reload() // Simple refresh
              }}
            >
              Demo
            </Button>
          )}
        </div>
      </div>

      {/* Simple Track List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          )}
          
          {error && (
            <div className="text-red-400 text-xs text-center py-4">
              Error loading tracks: {error.message}
            </div>
          )}

          {!isLoading && !error && filteredTracks.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              {search ? "No matching tracks found" : "No tracks yet. Upload some music!"}
            </div>
          )}

          {!isLoading && !error && filteredTracks.length > 0 && 
            filteredTracks.map((track) => (
              <SimpleTrackItem
                key={track.id}
                track={track}
                onLoadToDeck={onLoadToDeck}
                onDelete={deleteTrack}
              />
            ))
          }
        </div>
      </ScrollArea>
    </div>
  )
}