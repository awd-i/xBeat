"use client"

import type React from "react"

import { useState, useRef } from "react"
import type { Track } from "@/lib/types"
import { useTracks } from "@/hooks/use-tracks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Search, Music, Loader2, Sparkles, Trash2 } from "lucide-react"

interface MusicLibraryProps {
  onLoadToDeck: (track: Track, deck: "A" | "B") => void
}

export function MusicLibrary({ onLoadToDeck }: MusicLibraryProps) {
  const { tracks, isLoading, uploadTrack, deleteTrack, analyzeTrack } = useTracks()
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredTracks = tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(search.toLowerCase()) ||
      track.artist.toLowerCase().includes(search.toLowerCase()) ||
      track.genre?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    setUploadError(null)

    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Max size is 50MB.`)
        }
        await uploadTrack(file)
      }
    } catch (error) {
      console.error("Upload failed:", error)
      setUploadError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleAnalyze = async (track: Track) => {
    setAnalyzingId(track.id)
    try {
      await analyzeTrack(track)
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setAnalyzingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-xl rounded-xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Music className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Library</h2>
          <span className="text-xs text-slate-500">({tracks.length})</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks..."
            className="pl-8 h-8 text-xs bg-slate-800/50 border-slate-700"
          />
        </div>
      </div>

      {/* Upload */}
      <div className="p-3 border-b border-slate-700/50">
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-dashed border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10 bg-transparent"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
          {uploading ? "Uploading..." : "Upload Tracks"}
        </Button>
        {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
      </div>

      {/* Track List */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-purple-500/50 hover:scrollbar-thumb-purple-500/70"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(168, 85, 247, 0.5) rgba(30, 41, 59, 1)",
        }}
      >
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {search ? "No matching tracks" : "No tracks yet. Upload some music!"}
            </div>
          ) : (
            filteredTracks.map((track) => (
              <div key={track.id} className="group p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{track.title}</p>
                    <p className="text-xs text-slate-400 truncate">{track.artist}</p>

                    {track.analyzed && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {track.genre && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-500/20 text-purple-300">
                            {track.genre}
                          </span>
                        )}
                        {track.bpm && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-cyan-500/20 text-cyan-300">
                            {track.bpm} BPM
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                      onClick={() => onLoadToDeck(track, "A")}
                      title="Load to Deck A"
                    >
                      <span className="text-[10px] font-bold">A</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20"
                      onClick={() => onLoadToDeck(track, "B")}
                      title="Load to Deck B"
                    >
                      <span className="text-[10px] font-bold">B</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
                      onClick={() => handleAnalyze(track)}
                      disabled={analyzingId === track.id}
                      title="Analyze with Grok"
                    >
                      {analyzingId === track.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => deleteTrack(track.id, track.url)}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
