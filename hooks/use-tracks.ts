"use client"

import useSWR from "swr"
import type { Track } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useTracks() {
  const { data, error, isLoading, mutate } = useSWR<{ tracks: Track[] }>("/api/tracks", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  })

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
      await mutate()
      return result.track as Track
    } catch (err) {
      console.error("[v0] Upload error:", err)
      throw err
    }
  }

  const deleteTrack = async (id: string, url: string) => {
    const response = await fetch("/api/tracks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, url }),
    })

    if (!response.ok) {
      throw new Error("Delete failed")
    }

    await mutate()
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
    await mutate()
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

    await mutate()
  }

  return {
    tracks: data?.tracks || [],
    isLoading,
    error,
    uploadTrack,
    deleteTrack,
    analyzeTrack,
    updateTrack,
    refresh: mutate,
  }
}
