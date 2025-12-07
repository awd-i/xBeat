"use client"

import { useState, useEffect, useCallback } from "react"
import type { Track } from "@/lib/types"
import { logError } from "@/lib/logger"

export function useTracks() {
  const [data, setData] = useState<{ tracks: Track[] } | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTracks = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/tracks/simple")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      logError('Failed to fetch tracks', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  const uploadTrack = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/tracks/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const result = await uploadResponse.json()
      await fetchTracks() // Refresh tracks after upload
      return result.track as Track
    } catch (err) {
      logError('Track upload failed', err, { fileName: file.name })
      throw err
    }
  }

  const deleteTrack = async (id: string) => {
    const response = await fetch("/api/tracks/simple", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      throw new Error("Delete failed")
    }

    await fetchTracks() // Refresh tracks after delete
  }

  const analyzeTrack = async (track: Track) => {
    const response = await fetch("/api/grok/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        filename: track.url.split("/").pop(),
      }),
    })

    if (!response.ok) {
      throw new Error("Analysis failed")
    }

    const result = await response.json()
    await fetchTracks() // Refresh tracks after analysis
    return result
  }

  const updateTrack = async (id: string, updates: Partial<Track>) => {
    const response = await fetch(`/api/tracks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Update failed")
    }

    await fetchTracks() // Refresh tracks after update
  }

  return {
    tracks: data?.tracks || [],
    isLoading,
    error,
    uploadTrack,
    deleteTrack,
    analyzeTrack,
    updateTrack,
    refresh: fetchTracks,
  }
}