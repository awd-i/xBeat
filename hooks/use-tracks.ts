"use client"

import useSWR from "swr"
import { upload } from "@vercel/blob/client"
import type { Track } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useTracks() {
  const { data, error, isLoading, mutate } = useSWR<{ tracks: Track[] }>("/api/tracks", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
  })

  const uploadTrack = async (file: File) => {
    try {
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        throw new Error("File too large. Maximum size is 50MB.")
      }

      console.log(`[v0] Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/tracks/upload",
      })

      console.log(`[v0] Upload complete: ${blob.url}`)

      await mutate()

      // Return a track object (the actual track is registered server-side in onUploadCompleted)
      return {
        id: blob.pathname.split("/").pop() || file.name,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        url: blob.url,
      }
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
