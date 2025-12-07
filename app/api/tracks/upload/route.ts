import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { addTrack } from "@/lib/music-store"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/flac"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload audio files only." }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    })

    // Register track in our system
    const track = addTrack({
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Unknown Artist",
      url: blob.url,
    })

    return NextResponse.json({ track })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
