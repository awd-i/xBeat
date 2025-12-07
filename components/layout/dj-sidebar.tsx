"use client"

import type { Track, MusicObject } from "@/lib/types"
import { MusicLibrary } from "@/components/library/music-library-simple"
import { GrokCopilot } from "@/components/grok/grok-copilot"
import { VoiceControl } from "@/components/grok/voice-control"

interface DJSidebarProps {
  showLibrary: boolean
  showCopilot: boolean
  showVoiceControl: boolean
  trackA: Track | null
  trackB: Track | null
  tracks: Track[]
  musicObject: MusicObject
  onLoadToDeck: (track: Track, deck: "A" | "B") => void
  onApplyTransition: (plan: any) => void
  onApplyPreset: (preset: Partial<MusicObject>) => void
  onVoiceAction: (action: string, params?: Record<string, unknown>) => void
  getAnalyserData: () => { frequency: Uint8Array; timeDomain: Uint8Array }
}

export function DJSidebar({
  showLibrary,
  showCopilot,
  showVoiceControl,
  trackA,
  trackB,
  tracks,
  musicObject,
  onLoadToDeck,
  onApplyTransition,
  onApplyPreset,
  onVoiceAction,
  getAnalyserData,
}: DJSidebarProps) {
  if (showLibrary) {
    return (
      <div className="w-72 p-3 overflow-hidden">
        <MusicLibrary onLoadToDeck={onLoadToDeck} />
      </div>
    )
  }

  if (showVoiceControl) {
    return (
      <div className="w-80 p-3 overflow-hidden">
        <VoiceControl
          trackA={trackA}
          trackB={trackB}
          musicObject={musicObject}
          getAnalyserData={getAnalyserData}
          onApplySettings={onApplyPreset}
          onAction={onVoiceAction}
        />
      </div>
    )
  }

  if (showCopilot) {
    return (
      <div className="w-80 p-3 overflow-hidden">
        <GrokCopilot
          trackA={trackA}
          trackB={trackB}
          musicObject={musicObject}
          tracks={tracks}
          onApplyTransition={onApplyTransition}
          onApplyPreset={onApplyPreset}
          onLoadTrack={onLoadToDeck}
        />
      </div>
    )
  }

  return null
}