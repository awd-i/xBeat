import { streamText } from "ai"
import { xai } from "@ai-sdk/xai"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { command, audioSnapshot, currentTrackA, currentTrackB, musicObject, conversationHistory, availableTracks } =
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
      trackContext += `Deck A: "${currentTrackA.title}" (${currentTrackA.bpm}BPM, ${currentTrackA.key})\n`
    } else {
      trackContext += `Deck A: Empty\n`
    }
    if (currentTrackB) {
      trackContext += `Deck B: "${currentTrackB.title}" (${currentTrackB.bpm}BPM, ${currentTrackB.key})\n`
    } else {
      trackContext += `Deck B: Empty\n`
    }
    
    // Available tracks
    let libraryContext = ""
    if (availableTracks && availableTracks.length > 0) {
      libraryContext = `\nLibrary (${availableTracks.length} tracks):\n` + 
        availableTracks.slice(0, 10).map((t: any) => 
          `- "${t.title}" [ID: ${t.id}] (${t.bpm || '?'}BPM, ${t.key || '?'})`
        ).join('\n')
      if (availableTracks.length > 10) {
        libraryContext += `\n... and ${availableTracks.length - 10} more`
      }
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

    const systemPrompt = `You are GROK, an AI DJ co-pilot. Be EXTREMELY BRIEF - maximum 1 short sentence, then JSON.

You can: load tracks to decks, control mixer (crossfader, EQ, filters, effects).

Respond format: One sentence + JSON block.

Actions:
- mixer: Change settings
- loadTrack: Load track by ID to deck A or B
- play/pause: Control playback

Examples:
"Bass" → "Bass +4dB. \`\`\`json\n{"action":"mixer","settings":{"eq":{"low":4}}}\n\`\`\`"

"Load [track] to A" → "Loading. \`\`\`json\n{"action":"loadTrack","trackId":"[ID]","deck":"A"}\n\`\`\`"

"Play" → "Playing. \`\`\`json\n{"action":"play"}\n\`\`\`"

"Fade B" → "Fading. \`\`\`json\n{"action":"mixer","settings":{"crossfader":1}}\n\`\`\`"

${trackContext}${libraryContext}
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
