import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { Track, MusicObject } from "@/lib/types"

const transitionPlanSchema = z.object({
  durationSeconds: z.number().min(4).max(120).describe("Duration of the transition in seconds"),
  crossfadeAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1).describe("Time position (0-1)"),
        value: z.number().min(0).max(1).describe("Crossfader position (0=A, 1=B)"),
      }),
    )
    .describe("Crossfader automation points"),
  deckAEqAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        low: z.number().min(-12).max(12),
        mid: z.number().min(-12).max(12),
        high: z.number().min(-12).max(12),
      }),
    )
    .optional(),
  deckBEqAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        low: z.number().min(-12).max(12),
        mid: z.number().min(-12).max(12),
        high: z.number().min(-12).max(12),
      }),
    )
    .optional(),
  deckATempoAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1).describe("Time position (0-1)"),
        playbackRate: z.number().min(0.2).max(1.8).describe("Playback rate (0.2-1.8, 1.0 = normal speed)"),
      }),
    )
    .optional()
    .describe("Tempo automation for deck A - useful for BPM matching"),
  deckBTempoAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1).describe("Time position (0-1)"),
        playbackRate: z.number().min(0.2).max(1.8).describe("Playback rate (0.2-1.8, 1.0 = normal speed)"),
      }),
    )
    .optional()
    .describe("Tempo automation for deck B - useful for BPM matching"),
  filterAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        cutoff: z.number().min(20).max(20000),
        q: z.number().min(0.1).max(20),
      }),
    )
    .optional(),
  fxAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        reverb: z.number().min(0).max(1),
        delay: z.number().min(0).max(1),
      }),
    )
    .optional(),
  visualizerMode: z.enum(["cymatic", "particles", "tunnel", "waveform"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { trackA, trackB, currentMusicObject, userPrompt } = (await request.json()) as {
      trackA: Track
      trackB: Track
      currentMusicObject: MusicObject
      userPrompt?: string
    }

    if (!trackA || !trackB) {
      return NextResponse.json({ error: "Both tracks are required" }, { status: 400 })
    }

    const { object: plan } = await generateObject({
      model: xai("grok-3"),
      schema: transitionPlanSchema,
      prompt: `Create a professional DJ transition plan between these two tracks:

TRACK A (currently playing):
- Title: ${trackA.title}
- Artist: ${trackA.artist}
- Genre: ${trackA.genre || "Unknown"}
- BPM: ${trackA.bpm || "Unknown"}
- Key: ${trackA.key || "Unknown"}
- Energy: ${trackA.energy || 0.5}
- Mood: ${trackA.mood || "Unknown"}

TRACK B (incoming):
- Title: ${trackB.title}
- Artist: ${trackB.artist}
- Genre: ${trackB.genre || "Unknown"}
- BPM: ${trackB.bpm || "Unknown"}
- Key: ${trackB.key || "Unknown"}
- Energy: ${trackB.energy || 0.5}
- Mood: ${trackB.mood || "Unknown"}

Current mixer state:
- Crossfader: ${currentMusicObject.crossfader ?? 0.5}
- Master Gain: ${currentMusicObject.masterGain ?? 0.8}
- EQ: Low ${currentMusicObject.eq?.low ?? 0}, Mid ${currentMusicObject.eq?.mid ?? 0}, High ${currentMusicObject.eq?.high ?? 0}

${userPrompt ? `User request: ${userPrompt}` : "Create a smooth, professional transition."}

Generate a transition plan with automation curves for crossfader, EQ, tempo, and effects. Use tempo automation (playback rate 0.2-1.8, range ±80%) to match BPMs or create dramatic effects. The transition should maintain energy and musical flow.`,
      system: `You are an expert DJ transition planner. Create professional, musically coherent transitions. Consider BPM matching (use tempo automation when BPMs differ - range is 0.2x to 1.8x speed for creative effects), key compatibility, energy flow, and genre blending. Provide detailed automation curves.`,
    })

    return NextResponse.json({
      plan,
      message: "Transition plan generated successfully",
    })
  } catch (error) {
    console.error("Transition planning error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to plan transition"
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error("Error details:", errorDetails)
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? errorDetails : undefined 
    }, { status: 500 })
  }
}
