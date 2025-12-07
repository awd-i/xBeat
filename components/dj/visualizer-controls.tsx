"use client"

import type React from "react"

import type { MusicObject } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Waves, Sparkles, CircleDot, AudioWaveform } from "lucide-react"
import { cn } from "@/lib/utils"

interface VisualizerControlsProps {
  musicObject: MusicObject
  onModeChange: (mode: MusicObject["visualizerMode"]) => void
  onSensitivityChange: (value: number) => void
  onColorSchemeChange: (scheme: MusicObject["colorScheme"]) => void
}

export function VisualizerControls({
  musicObject,
  onModeChange,
  onSensitivityChange,
  onColorSchemeChange,
}: VisualizerControlsProps) {
  const modes: { value: MusicObject["visualizerMode"]; icon: React.ReactNode; label: string }[] = [
    { value: "particles", icon: <Sparkles className="h-3.5 w-3.5" />, label: "Particles" },
    { value: "cymatic", icon: <Waves className="h-3.5 w-3.5" />, label: "Cymatic" },
    { value: "tunnel", icon: <CircleDot className="h-3.5 w-3.5" />, label: "Tunnel" },
    { value: "waveform", icon: <AudioWaveform className="h-3.5 w-3.5" />, label: "Waveform" },
  ]

  const colorSchemes: { value: MusicObject["colorScheme"]; colors: string[] }[] = [
    { value: "cyberpunk", colors: ["#8b5cf6", "#06b6d4"] },
    { value: "neon", colors: ["#22c55e", "#eab308"] },
    { value: "monochrome", colors: ["#ffffff", "#6b7280"] },
    { value: "fire", colors: ["#f97316", "#ef4444"] },
  ]

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl backdrop-blur-xl bg-slate-900/60 border border-purple-500/30">
      {/* Mode Selection */}
      <div className="flex gap-1">
        {modes.map((mode) => (
          <Button
            key={mode.value}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2",
              musicObject.visualizerMode === mode.value
                ? "bg-purple-500/20 text-purple-300"
                : "text-slate-400 hover:text-white",
            )}
            onClick={() => onModeChange(mode.value)}
            title={mode.label}
          >
            {mode.icon}
          </Button>
        ))}
      </div>

      {/* Sensitivity */}
      <div className="flex items-center gap-2 flex-1 max-w-[150px]">
        <Label className="text-[10px] text-slate-400 whitespace-nowrap">Sensitivity</Label>
        <Slider
          value={[musicObject.visualSensitivity * 100]}
          onValueChange={([v]) => onSensitivityChange(v / 100)}
          max={100}
          step={1}
          className="flex-1"
        />
      </div>

      {/* Color Scheme */}
      <div className="flex gap-1">
        {colorSchemes.map((scheme) => (
          <button
            key={scheme.value}
            className={cn(
              "w-6 h-6 rounded-full overflow-hidden border-2 transition-all",
              musicObject.colorScheme === scheme.value
                ? "border-white scale-110"
                : "border-transparent opacity-60 hover:opacity-100",
            )}
            onClick={() => onColorSchemeChange(scheme.value)}
            title={scheme.value}
            style={{
              background: `linear-gradient(135deg, ${scheme.colors[0]}, ${scheme.colors[1]})`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
