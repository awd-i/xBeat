import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { Track } from "@/lib/types"

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      trackId: z.string().describe("ID of the recommended track"),
      reason: z.string().describe("Why this track is recommended"),
      compatibilityScore: z.number().min(0).max(1).describe("How well it matches"),
      suggestedTransition: z.string().describe("Suggested transition style"),
    }),
  ),
  explanation: z.string().describe("Overall recommendation strategy"),
})

export async function POST(request: NextRequest) {
  try {
    const { currentTrack, library, userPrompt } = (await request.json()) as {
      currentTrack: Track
      library: Track[]
      userPrompt?: string
    }

    if (!currentTrack || !library?.length) {
      return NextResponse.json({ error: "Current track and library are required" }, { status: 400 })
    }

    // Filter out current track from library
    const availableTracks = library.filter((t) => t.id !== currentTrack.id)

    if (availableTracks.length === 0) {
      return NextResponse.json({
        recommendations: [],
        explanation: "No other tracks in library to recommend",
      })
    }

    const libraryDescription = availableTracks
      .map(
        (t) =>
          `ID: ${t.id}, Title: "${t.title}", Artist: "${t.artist}", Genre: ${t.genre || "Unknown"}, BPM: ${t.bpm || "Unknown"}, Key: ${t.key || "Unknown"}, Energy: ${t.energy || 0.5}, Mood: ${t.mood || "Unknown"}`,
      )
      .join("\n")

    const { object: recommendations } = await generateObject({
      model: xai("grok-3"),
      schema: recommendationSchema,
      prompt: `Recommend the next tracks to play after this current track:

CURRENTLY PLAYING:
- Title: ${currentTrack.title}
- Artist: ${currentTrack.artist}
- Genre: ${currentTrack.genre || "Unknown"}
- BPM: ${currentTrack.bpm || "Unknown"}
- Key: ${currentTrack.key || "Unknown"}
- Energy: ${currentTrack.energy || 0.5}
- Mood: ${currentTrack.mood || "Unknown"}

AVAILABLE TRACKS IN LIBRARY:
${libraryDescription}

${userPrompt ? `User preference: ${userPrompt}` : "Recommend tracks for a smooth DJ set flow."}

Select up to 5 tracks that would work well as the next track. Consider BPM compatibility, key harmony, energy progression, and genre blending.`,
      system: `You are an expert DJ with deep knowledge of music theory and mixing. Recommend tracks that create great DJ set flow. Consider harmonic mixing (Camelot wheel), energy curves, and genre transitions. Only recommend tracks from the provided library using their exact IDs.`,
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("Recommendation error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
