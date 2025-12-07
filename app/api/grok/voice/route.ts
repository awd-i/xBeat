import { streamText } from "ai"
import { xai } from "@ai-sdk/xai"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { command, audioSnapshot, currentTrackA, currentTrackB, musicObject, conversationHistory } =
      await request.json()

    if (!command) {
      return new Response(JSON.stringify({ error: "Voice command is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build context about current audio state
    let audioContext = ""
    if (audioSnapshot) {
      audioContext = `
Current Audio State:
- Overall Energy: ${(audioSnapshot.energyLevel * 100).toFixed(0)}%
- Bass Energy: ${(audioSnapshot.bassEnergy * 100).toFixed(0)}%
- Mid Energy: ${(audioSnapshot.midEnergy * 100).toFixed(0)}%
- High Energy: ${(audioSnapshot.highEnergy * 100).toFixed(0)}%
- Beat Intensity: ${(audioSnapshot.beatIntensity * 100).toFixed(0)}%
- Tone: ${audioSnapshot.spectralCentroid > 0.5 ? "Bright" : "Warm/Dark"}
`
    }

    // Build track context
    let trackContext = ""
    if (currentTrackA) {
      trackContext += `
Deck A: "${currentTrackA.title}" by ${currentTrackA.artist}
  - Genre: ${currentTrackA.genre || "Unknown"}
  - BPM: ${currentTrackA.bpm || "Unknown"}
  - Key: ${currentTrackA.key || "Unknown"}
  - Energy: ${currentTrackA.energy ? (currentTrackA.energy * 100).toFixed(0) + "%" : "Unknown"}
`
    }
    if (currentTrackB) {
      trackContext += `
Deck B: "${currentTrackB.title}" by ${currentTrackB.artist}
  - Genre: ${currentTrackB.genre || "Unknown"}
  - BPM: ${currentTrackB.bpm || "Unknown"}
  - Key: ${currentTrackB.key || "Unknown"}
  - Energy: ${currentTrackB.energy ? (currentTrackB.energy * 100).toFixed(0) + "%" : "Unknown"}
`
    }

    // Build mixer state context
    let mixerContext = ""
    if (musicObject) {
      mixerContext = `
Current Mixer State:
- Crossfader: ${(musicObject.crossfader * 100).toFixed(0)}% (0=Deck A, 100=Deck B)
- Master Volume: ${(musicObject.masterGain * 100).toFixed(0)}%
- EQ Low: ${musicObject.eq?.low?.toFixed(1) || 0}dB
- EQ Mid: ${musicObject.eq?.mid?.toFixed(1) || 0}dB
- EQ High: ${musicObject.eq?.high?.toFixed(1) || 0}dB
- Filter: ${musicObject.filter?.type || "lowpass"} at ${musicObject.filter?.cutoff || 20000}Hz
- Reverb: ${((musicObject.reverbAmount || 0) * 100).toFixed(0)}%
- Delay: ${((musicObject.delayAmount || 0) * 100).toFixed(0)}%
`
    }

    const systemPrompt = `You are GROK, an advanced AI DJ co-pilot with real-time audio awareness. You can hear and analyze the music currently playing through frequency analysis.

Your capabilities:
1. Understand what's playing based on real-time audio analysis (energy, bass, mids, highs, beat intensity)
2. Control the DJ mixer: crossfader, EQ, filters, effects (reverb, delay)
3. Suggest transitions and mixing techniques
4. Answer questions about the current tracks and audio

When responding to commands:
- Be concise and DJ-focused
- If asked to change settings, respond with the action you would take AND include a JSON block with the settings to apply
- Use DJ terminology naturally
- Reference what you're "hearing" from the audio analysis

For mixer control commands, include a JSON block like this in your response:
\`\`\`json
{"action": "mixer", "settings": {"crossfader": 0.5, "eq": {"low": 0, "mid": 0, "high": 0}, "reverbAmount": 0.2, "delayAmount": 0.1, "filter": {"type": "lowpass", "cutoff": 20000}}}
\`\`\`

Available actions:
- "mixer" - Apply mixer settings
- "transition" - Start a transition (include "transitionType": "smooth" | "cut" | "filter" | "echo")
- "play" - Play deck ("deck": "A" | "B" | "both")
- "pause" - Pause deck ("deck": "A" | "B" | "both")
- "analyze" - Analyze current tracks

${audioContext}
${trackContext}
${mixerContext}
`

    const messages = [...(conversationHistory || []).slice(-10), { role: "user" as const, content: command }]

    const result = streamText({
      model: xai("grok-3-fast"),
      system: systemPrompt,
      messages,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("Voice command error:", error)
    return new Response(JSON.stringify({ error: "Failed to process voice command" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
