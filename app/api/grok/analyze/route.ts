import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { updateTrack, getTrackById } from "@/lib/music-store"

const trackAnalysisSchema = z.object({
  genre: z.string().describe("The primary genre of the track"),
  mood: z.string().describe("The overall mood/feeling of the track"),
  energy: z.number().min(0).max(1).describe("Energy level from 0 (calm) to 1 (intense)"),
  bpm: z.number().min(60).max(200).describe("Estimated BPM"),
  key: z.string().describe('Musical key (e.g., "C major", "A minor")'),
  description: z.string().describe("A short vibe description of the track"),
  tags: z.array(z.string()).describe("Relevant tags for the track"),
})

export async function POST(request: NextRequest) {
  try {
    const { trackId, title, artist, filename } = await request.json()

    if (!trackId) {
      return NextResponse.json({ error: "Track ID is required" }, { status: 400 })
    }

    const { object: analysis } = await generateObject({
      model: xai("grok-3", { apiKey: process.env.XAI_API_KEY }),
      schema: trackAnalysisSchema,
      prompt: `Analyze this music track based on its metadata and provide a detailed analysis:

Title: ${title || "Unknown"}
Artist: ${artist || "Unknown"}
Filename: ${filename || "Unknown"}

Based on the title, artist name, and filename patterns, estimate the following musical properties. Be creative but realistic with your analysis. Consider common naming conventions in electronic/DJ music.`,
      system: `You are an expert DJ and music analyst. You analyze tracks to help DJs mix and blend music seamlessly. Provide accurate, helpful analysis based on available metadata. Always respond with valid JSON matching the schema.`,
    })

    // Update the track in store
    updateTrack(trackId, {
      genre: analysis.genre,
      mood: analysis.mood,
      energy: analysis.energy,
      bpm: analysis.bpm,
      key: analysis.key,
      description: analysis.description,
      tags: analysis.tags,
      analyzed: true,
    })

    const updatedTrack = getTrackById(trackId)

    return NextResponse.json({
      analysis,
      track: updatedTrack,
      explanation: `Analyzed "${title}" - ${analysis.genre} track with ${analysis.mood} mood at ~${analysis.bpm} BPM`,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze track" }, { status: 500 })
  }
}
