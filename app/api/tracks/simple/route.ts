import { NextResponse } from "next/server"
import { useMusicStore } from "@/lib/stores/music-store"
import type { Track } from "@/lib/types"
import { logError } from "@/lib/logger"

export async function GET() {
  try {
    const store = useMusicStore.getState()
    return NextResponse.json({ 
      tracks: store.tracks || [],
      success: true 
    })
  } catch (error) {
    logError("Failed to get tracks", error)
    return NextResponse.json({ 
      tracks: [],
      error: "Failed to get tracks" 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { track }: { track: Track } = await request.json()
    
    if (!track || !track.url) {
      return NextResponse.json({ 
        error: "Valid track with URL required" 
      }, { status: 400 })
    }

    const store = useMusicStore.getState()
    store.addTrack(track)

    return NextResponse.json({ 
      track,
      success: true 
    })
  } catch (error) {
    logError("Failed to add track", error)
    return NextResponse.json({ 
      error: "Failed to add track" 
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json({ 
        error: "Track ID required" 
      }, { status: 400 })
    }

    const store = useMusicStore.getState()
    store.deleteTrack(id)

    return NextResponse.json({ 
      success: true 
    })
  } catch (error) {
    logError("Failed to delete track", error)
    return NextResponse.json({ 
      error: "Failed to delete track" 
    }, { status: 500 })
  }
}