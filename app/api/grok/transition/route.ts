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
  explanation: z.string().describe("DJ coach explanation of the transition strategy"),
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

    if (!process.env.XAI_API_KEY) {
      return NextResponse.json({ error: "XAI API key not configured" }, { status: 500 })
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
- Crossfader: ${currentMusicObject.crossfader}
- Master Gain: ${currentMusicObject.masterGain}
- EQ: Low ${currentMusicObject.eq.low}, Mid ${currentMusicObject.eq.mid}, High ${currentMusicObject.eq.high}

${userPrompt ? `User request: ${userPrompt}` : "Create a smooth, professional transition."}

Generate a transition plan with automation curves for crossfader, EQ, and effects. The transition should maintain energy and musical flow.`,
      system: `You are an expert DJ transition planner. Create professional, musically coherent transitions. Consider BPM matching, key compatibility, energy flow, and genre blending. Provide detailed automation curves and a helpful explanation of your strategy.`,
    })

    return NextResponse.json({
      plan,
      message: "Transition plan generated successfully",
    })
  } catch (error) {
    console.error("Transition planning error:", error)
    return NextResponse.json({ error: "Failed to plan transition" }, { status: 500 })
  }
}
