import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { Track, MusicObject } from "@/lib/types"

const transitionPlanSchema = z.object({
  startDelay: z
    .number()
    .min(0)
    .max(60)
    .describe("Seconds to wait before starting transition (to align with phrase boundaries or avoid bad timing)"),
  durationSeconds: z.number().min(8).max(120).describe("Duration of the transition in seconds (typically 16-32 bars)"),
  technique: z
    .enum([
      "bass_swap",
      "eq_blend",
      "filter_sweep",
      "echo_out",
      "quick_cut",
      "long_blend",
      "energy_drop",
      "build_up",
    ])
    .describe("Primary DJ technique to use"),
  crossfadeAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1).describe("Time position (0-1)"),
        value: z.number().min(0).max(1).describe("Crossfader position (0=A, 1=B)"),
      }),
    )
    .min(3)
    .describe("Smooth crossfader automation - avoid abrupt jumps"),
  deckAEqAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        low: z.number().min(-12).max(12).describe("Bass/sub frequencies"),
        mid: z.number().min(-12).max(12).describe("Vocal/melody frequencies"),
        high: z.number().min(-12).max(12).describe("Treble/hi-hats"),
      }),
    )
    .min(2)
    .describe("EQ automation for deck A - use for bass swapping and smooth EQ blending"),
  deckBEqAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        low: z.number().min(-12).max(12),
        mid: z.number().min(-12).max(12),
        high: z.number().min(-12).max(12),
      }),
    )
    .min(2)
    .describe("EQ automation for deck B - gradually bring in elements"),
  deckATempoAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        playbackRate: z.number().min(0.95).max(1.05).describe("Subtle tempo adjust for beatmatching (±5%)"),
      }),
    )
    .optional()
    .describe("Fine tempo adjustments for perfect beatmatching"),
  deckBTempoAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        playbackRate: z.number().min(0.95).max(1.05).describe("Subtle tempo adjust for beatmatching (±5%)"),
      }),
    )
    .optional()
    .describe("Fine tempo adjustments for perfect beatmatching"),
  filterAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        cutoff: z.number().min(20).max(20000),
        q: z.number().min(0.1).max(20),
      }),
    )
    .min(2)
    .describe("Creative filter sweeps - use highpass to remove bass, lowpass to remove highs"),
  fxAutomation: z
    .array(
      z.object({
        t: z.number().min(0).max(1),
        reverb: z.number().min(0).max(1).describe("Reverb for transitions/echoes"),
        delay: z.number().min(0).max(1).describe("Delay/echo effects for creative transitions"),
      }),
    )
    .min(2)
    .describe("FX automation - use delay for echo-out effects, reverb for atmosphere"),
  visualizerMode: z.enum(["cymatic", "particles", "tunnel", "waveform"]).optional(),
  phaseAlignment: z
    .enum(["phrase_start", "drop", "breakdown", "buildup", "outro"])
    .describe("Where in the phrase structure to start the transition"),
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

    const bpmA = trackA.bpm || 128
    const bpmB = trackB.bpm || 128
    const bpmDiff = Math.abs(bpmA - bpmB)
    const bpmRatio = bpmB / bpmA

    const { object: plan } = await generateObject({
      model: xai("grok-3"),
      schema: transitionPlanSchema,
      prompt: `You are DJing a set. Analyze these tracks and create a PROFESSIONAL transition plan using ADVANCED DJ TECHNIQUES.

═══════════════════════════════════════════════════════════════
TRACK A (CURRENTLY PLAYING - OUTGOING TRACK):
═══════════════════════════════════════════════════════════════
Title: ${trackA.title}
Artist: ${trackA.artist}
Genre: ${trackA.genre || "Unknown"}
BPM: ${bpmA}
Key: ${trackA.key || "Unknown"}
Energy: ${((trackA.energy || 0.5) * 100).toFixed(0)}%
Mood: ${trackA.mood || "Unknown"}

═══════════════════════════════════════════════════════════════
TRACK B (INCOMING - NEW TRACK):
═══════════════════════════════════════════════════════════════
Title: ${trackB.title}
Artist: ${trackB.artist}
Genre: ${trackB.genre || "Unknown"}
BPM: ${bpmB}
Key: ${trackB.key || "Unknown"}
Energy: ${((trackB.energy || 0.5) * 100).toFixed(0)}%
Mood: ${trackB.mood || "Unknown"}

BPM Analysis: ${bpmDiff < 5 ? "✓ BPMs are close - perfect for beatmatching" : `⚠ ${bpmDiff} BPM difference - use subtle tempo adjustment (${bpmRatio.toFixed(3)}x)`}

${userPrompt ? `\n🎧 DJ Request: ${userPrompt}\n` : ""}

═══════════════════════════════════════════════════════════════
CRITICAL DJ REQUIREMENTS:
═══════════════════════════════════════════════════════════════

1. ⏱️ TIMING & PHRASING:
   - Set startDelay to align with phrase boundaries (8, 16, or 32 bar phrases)
   - NEVER transition during a build-up or right before a drop
   - Wait for a breakdown, outro, or after a drop/chorus
   - Consider the track's energy curve

2. 🎚️ BEATMATCHING:
   - If BPM difference < 6: Use minimal tempo automation (stay within ±2%)
   - If BPM difference > 6: Use tempo automation to gradually match BPMs
   - Keep playbackRate between 0.95-1.05 for natural sound
   - Beatmatch BEFORE bringing in the new track significantly

3. 🔊 EQ/BASS SWAPPING (CRITICAL):
   - START with Track B bass at -12dB (completely cut)
   - GRADUALLY swap bass frequencies between tracks:
     * As Track A bass reduces (-12dB), Track B bass increases (0dB)
   - Keep mids/highs present on both tracks initially
   - This prevents muddy low-end and maintains energy

4. 🎛️ TECHNIQUE SELECTION:
   - bass_swap: Classic technique, swap low frequencies smoothly
   - eq_blend: Gradually blend all EQ bands
   - filter_sweep: Use dramatic filter sweeps (highpass/lowpass)
   - echo_out: Echo/delay on outgoing track while bringing in new track
   - quick_cut: Fast transition (8-16 bars) for similar energy tracks
   - long_blend: Extended blend (32+ bars) for atmospheric transitions
   - energy_drop: Cut bass/filter down, then bring in new track fresh
   - build_up: Use reverb/delay to build tension before transition

5. 🎨 CREATIVE ELEMENTS:
   - Use filter sweeps to create tension (highpass sweep = builds energy)
   - Add echo/delay to outgoing track for "echo out" effect
   - Use reverb sparingly for atmosphere during breakdowns
   - Consider visualizer mode changes at key moments

6. ⏳ DURATION:
   - Quick transitions: 16-24 seconds (fast energy maintenance)
   - Standard: 24-48 seconds (most common)
   - Long blends: 48-90 seconds (atmospheric, progressive)
   - Match duration to energy difference and genre

═══════════════════════════════════════════════════════════════
EXAMPLE BASS SWAP TECHNIQUE:
═══════════════════════════════════════════════════════════════
t=0.0:   Deck A: low=0,  Deck B: low=-12  (B bass cut completely)
t=0.3:   Deck A: low=0,  Deck B: low=-12  (wait for phrase)
t=0.5:   Deck A: low=-6, Deck B: low=-6   (swap bass midpoint)
t=0.7:   Deck A: low=-12, Deck B: low=0   (B takes over bass)
t=1.0:   Deck A: low=-12, Deck B: low=0   (A bass cut completely)

Crossfader moves gradually from 0 to 1 while bass swaps happen.

═══════════════════════════════════════════════════════════════

Generate a professional, creative transition plan. Be bold with EQ, filters, and FX!`,
      system: `You are a WORLD-CLASS professional DJ with 20+ years of experience. You understand:
- Phrasing (8/16/32 bar structures in electronic music)
- Beatmatching and harmonic mixing
- EQ technique and frequency management (bass swapping is ESSENTIAL)
- Creative FX use (echo out, filter sweeps, reverb throws)
- Energy flow and crowd dynamics
- Genre-specific mixing techniques

RULES:
1. ALWAYS use proper bass swapping - never have both tracks at full bass simultaneously
2. ALWAYS consider timing - don't transition at bad moments
3. Use tempo automation ONLY for beatmatching (±5% max for natural sound)
4. Create SMOOTH automation curves (at least 3-5 points per parameter)
5. Match technique to the energy difference and genres
6. Be CREATIVE with filters and FX

Your transitions should sound professional and maintain dancefloor energy.`,
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
