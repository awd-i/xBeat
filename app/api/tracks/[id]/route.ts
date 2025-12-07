import { type NextRequest, NextResponse } from "next/server"
import { getTrackById, updateTrack } from "@/lib/music-store"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const track = getTrackById(id)

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 })
  }

  return NextResponse.json({ track })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const updates = await request.json()

  updateTrack(id, updates)
  const track = getTrackById(id)

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 })
  }

  return NextResponse.json({ track })
}
