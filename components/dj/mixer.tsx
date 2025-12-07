"use client"

import type { MusicObject } from "@/lib/types"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface MixerProps {
  musicObject: MusicObject
  onCrossfadeChange: (value: number) => void
  onEQChange: (band: "low" | "mid" | "high", value: number) => void
  onFilterChange: (cutoff: number) => void
  onReverbChange: (value: number) => void
  onDelayChange: (value: number) => void
}

export function Mixer({
  musicObject,
  onCrossfadeChange,
  onEQChange,
  onFilterChange,
  onReverbChange,
  onDelayChange,
}: MixerProps) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl backdrop-blur-xl bg-slate-900/60 border border-purple-500/30">
      {/* Crossfader */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs text-purple-400">A</Label>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Crossfader</span>
          <Label className="text-xs text-cyan-400">B</Label>
        </div>
        <div className="relative">
          <Slider
            value={[musicObject.crossfader * 100]}
            onValueChange={([v]) => onCrossfadeChange(v / 100)}
            max={100}
            step={1}
            className="[&_[data-slot=thumb]]:bg-gradient-to-r [&_[data-slot=thumb]]:from-purple-500 [&_[data-slot=thumb]]:to-cyan-500"
          />
        </div>
      </div>

      {/* EQ Section */}
      <div className="grid grid-cols-3 gap-3">
        {(["high", "mid", "low"] as const).map((band) => (
          <div key={band} className="flex flex-col items-center gap-2">
            <Label className="text-[10px] text-slate-400 uppercase">{band}</Label>
            <div className="h-24 flex items-center">
              <Slider
                orientation="vertical"
                value={[musicObject.eq[band] + 12]}
                onValueChange={([v]) => onEQChange(band, v - 12)}
                max={24}
                step={0.5}
                className="h-full"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {musicObject.eq[band] > 0 ? "+" : ""}
              {musicObject.eq[band].toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="space-y-2">
        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Filter</Label>
        <Slider
          value={[(Math.log10(musicObject.filter.cutoff) / Math.log10(20000)) * 100]}
          onValueChange={([v]) => onFilterChange(Math.pow(10, (v / 100) * Math.log10(20000)))}
          max={100}
          step={1}
        />
        <span className="text-[10px] font-mono text-slate-500 block text-center">
          {musicObject.filter.cutoff.toFixed(0)} Hz
        </span>
      </div>

      {/* FX */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Reverb</Label>
          <Slider
            value={[musicObject.reverbAmount * 100]}
            onValueChange={([v]) => onReverbChange(v / 100)}
            max={100}
            step={1}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Delay</Label>
          <Slider
            value={[musicObject.delayAmount * 100]}
            onValueChange={([v]) => onDelayChange(v / 100)}
            max={100}
            step={1}
          />
        </div>
      </div>

      {/* Master */}
      <div className="space-y-2 pt-2 border-t border-slate-700/50">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Master</Label>
          <span className="text-[10px] font-mono text-slate-500">{Math.round(musicObject.masterGain * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ width: `${musicObject.masterGain * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
