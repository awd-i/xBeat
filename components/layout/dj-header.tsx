"use client"

import type { MusicObject } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { VisualizerControls } from "@/components/dj/visualizer-controls"
import { Disc3, Mic } from "lucide-react"

interface DJHeaderProps {
  musicObject: MusicObject
  showLibrary: boolean
  showCopilot: boolean
  showVoiceControl: boolean
  onToggleLibrary: () => void
  onToggleCopilot: () => void
  onToggleVoiceControl: () => void
  onUpdateMusicObject: (updates: Partial<MusicObject>) => void
}

export function DJHeader({
  musicObject,
  showLibrary,
  showCopilot,
  showVoiceControl,
  onToggleLibrary,
  onToggleCopilot,
  onToggleVoiceControl,
  onUpdateMusicObject,
}: DJHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-950/80 backdrop-blur-sm border-b border-purple-500/20">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Disc3 className="h-6 w-6 text-purple-400 animate-[spin_3s_linear_infinite]" />
        </div>
        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          xBeat
        </h1>
      </div>

      <VisualizerControls
        musicObject={musicObject}
        onModeChange={(mode) => onUpdateMusicObject({ visualizerMode: mode })}
        onSensitivityChange={(value) => onUpdateMusicObject({ visualSensitivity: value })}
        onColorSchemeChange={(scheme) => onUpdateMusicObject({ colorScheme: scheme })}
      />

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLibrary}
          className={showLibrary ? "text-purple-400" : "text-slate-400"}
        >
          Library
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCopilot}
          className={showCopilot ? "text-cyan-400" : "text-slate-400"}
        >
          Grok
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVoiceControl}
          className={showVoiceControl ? "text-green-400" : "text-slate-400"}
        >
          <Mic className="h-4 w-4 mr-1" />
          Voice
        </Button>
      </div>
    </header>
  )
}