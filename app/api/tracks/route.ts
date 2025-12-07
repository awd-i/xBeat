import { list, del } from "@vercel/blob"
import { NextResponse } from "next/server"
import { getTracks, setTracks, deleteTrack, addTrack } from "@/lib/music-store"
import type { Track } from "@/lib/types"

export async function GET() {
  try {
    const { blobs } = await list()

    // Filter for audio files only
    const audioBlobs = blobs.filter(
      (blob) =>
        blob.pathname.endsWith(".mp3") ||
        blob.pathname.endsWith(".wav") ||
        blob.pathname.endsWith(".ogg") ||
        blob.pathname.endsWith(".m4a"),
    )

    // Get existing tracks from store
    const existingTracks = getTracks()
    const existingUrls = new Set(existingTracks.map((t) => t.url))

    // Add new blobs as tracks
    for (const blob of audioBlobs) {
      if (!existingUrls.has(blob.url)) {
        const filename = blob.pathname.split("/").pop() || "Unknown"
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")

        const newTrack: Track = {
          id: crypto.randomUUID(),
          title: nameWithoutExt,
          artist: "Unknown Artist",
          url: blob.url,
          createdAt: new Date(blob.uploadedAt),
          analyzed: false,
        }
        existingTracks.push(newTrack)
      }
    }

    // Remove tracks whose blobs no longer exist
    const blobUrls = new Set(audioBlobs.map((b) => b.url))
    const validTracks = existingTracks.filter((t) => blobUrls.has(t.url))
    setTracks(validTracks)

    return NextResponse.json({ tracks: validTracks })
  } catch (error) {
    console.error("Error listing tracks:", error)
    return NextResponse.json({ error: "Failed to list tracks" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { title, artist, url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const track: Track = {
      id: crypto.randomUUID(),
      title: title || "Unknown Track",
      artist: artist || "Unknown Artist",
      url,
      createdAt: new Date(),
      analyzed: false,
    }

    addTrack(track)

    return NextResponse.json({ track })
  } catch (error) {
    console.error("Error creating track:", error)
    return NextResponse.json({ error: "Failed to create track" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, url } = await request.json()

    if (url) {
      await del(url)
    }

    if (id) {
      deleteTrack(id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting track:", error)
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 })
  }
}
