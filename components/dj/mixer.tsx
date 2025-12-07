"use client"

import type { MusicObject } from "@/lib/types"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MixerProps {
  musicObject: MusicObject
  onCrossfadeChange: (value: number) => void
  onEQChange: (band: "low" | "mid" | "high", value: number) => void
  onFilterChange: (cutoff: number) => void
  onReverbChange: (value: number) => void
  onDelayChange: (value: number) => void
  onIsolationChange?: (deck: "A" | "B", type: "bass" | "voice" | "melody", value: number) => void
  bpmA?: number | null
  bpmB?: number | null
}

export function Mixer({
  musicObject,
  onCrossfadeChange,
  onEQChange,
  onFilterChange,
  onReverbChange,
  onDelayChange,
  onIsolationChange,
  bpmA,
  bpmB,
}: MixerProps) {
  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl backdrop-blur-xl bg-slate-900/60 border border-purple-500/30">
      <div className="flex justify-between items-center text-[10px] pb-2 border-b border-slate-700/50">
        <div className="text-purple-400">
          <span className="text-slate-500">A BPM:</span> {bpmA ? bpmA : "—"}
        </div>
        <div className="text-cyan-400">
          <span className="text-slate-500">B BPM:</span> {bpmB ? bpmB : "—"}
        </div>
      </div>

      {/* Crossfader */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs text-purple-400">A</Label>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Crossfader</span>
          <Label className="text-xs text-cyan-400">B</Label>
        </div>
        <div className="relative">
          <Slider
            value={[(musicObject.crossfader ?? 0.5) * 100]}
            onValueChange={([v]) => onCrossfadeChange(v / 100)}
            max={100}
            step={1}
            className="[&_[data-slot=thumb]]:bg-gradient-to-r [&_[data-slot=thumb]]:from-purple-500 [&_[data-slot=thumb]]:to-cyan-500"
          />
        </div>
      </div>

      <Tabs defaultValue="eq" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-7">
          <TabsTrigger value="eq" className="text-[10px]">
            EQ
          </TabsTrigger>
          <TabsTrigger value="fx" className="text-[10px]">
            FX
          </TabsTrigger>
          <TabsTrigger value="isolate" className="text-[10px]">
            Isolate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eq" className="space-y-3 mt-3">
          {/* EQ Section */}
          <div className="grid grid-cols-3 gap-3">
            {(["high", "mid", "low"] as const).map((band) => {
              const eqValue = musicObject.eq?.[band] ?? 0
              return (
                <div key={band} className="flex flex-col items-center gap-3">
                  <Label className="text-[10px] text-slate-400 uppercase">{band}</Label>
                  <div className="h-28 flex items-center overflow-hidden">
                    <Slider
                      orientation="vertical"
                      value={[eqValue + 12]}
                      onValueChange={([v]) => onEQChange(band, v - 12)}
                      max={24}
                      step={0.5}
                      className="h-full !min-h-0"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {eqValue > 0 ? "+" : ""}
                    {eqValue.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Filter */}
          <div className="space-y-2 pt-2">
            <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Filter</Label>
            <Slider
              value={[(Math.log10(musicObject.filter?.cutoff ?? 20000) / Math.log10(20000)) * 100]}
              onValueChange={([v]) => onFilterChange(Math.pow(10, (v / 100) * Math.log10(20000)))}
              max={100}
              step={1}
            />
            <span className="text-[10px] font-mono text-slate-500 block text-center">
              {(musicObject.filter?.cutoff ?? 20000).toFixed(0)} Hz
            </span>
          </div>
        </TabsContent>

        <TabsContent value="fx" className="space-y-3 mt-3">
          {/* FX */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Reverb</Label>
              <Slider
                value={[(musicObject.reverbAmount ?? 0) * 100]}
                onValueChange={([v]) => onReverbChange(v / 100)}
                max={100}
                step={1}
              />
              <span className="text-[10px] font-mono text-slate-500 block text-center">
                {((musicObject.reverbAmount ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Delay</Label>
              <Slider
                value={[(musicObject.delayAmount ?? 0) * 100]}
                onValueChange={([v]) => onDelayChange(v / 100)}
                max={100}
                step={1}
              />
              <span className="text-[10px] font-mono text-slate-500 block text-center">
                {((musicObject.delayAmount ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="isolate" className="space-y-3 mt-3">
          {onIsolationChange && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 uppercase">Bass Isolation</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[9px] text-purple-400">Deck A</div>
                    <Slider
                      value={[((musicObject.tracks?.A as any)?.bassIsolation ?? 0) * 100]}
                      onValueChange={([v]) => onIsolationChange("A", "bass", v / 100)}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] text-cyan-400">Deck B</div>
                    <Slider
                      value={[((musicObject.tracks?.B as any)?.bassIsolation ?? 0) * 100]}
                      onValueChange={([v]) => onIsolationChange("B", "bass", v / 100)}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 uppercase">Voice Isolation</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[9px] text-purple-400">Deck A</div>
                    <Slider
                      value={[((musicObject.tracks?.A as any)?.voiceIsolation ?? 0) * 100]}
                      onValueChange={([v]) => onIsolationChange("A", "voice", v / 100)}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] text-cyan-400">Deck B</div>
                    <Slider
                      value={[((musicObject.tracks?.B as any)?.voiceIsolation ?? 0) * 100]}
                      onValueChange={([v]) => onIsolationChange("B", "voice", v / 100)}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 uppercase">Melody Isolation</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[9px] text-purple-400">Deck A</div>
                    <Slider
                      value={[((musicObject.tracks?.A as any)?.melodyIsolation ?? 0) * 100]}
                      onValueChange={([v]) => onIsolationChange("A", "melody", v / 100)}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] text-cyan-400">Deck B</div>
                    <Slider
                      value={[((musicObject.tracks?.B as any)?.melodyIsolation ?? 0) * 100]}
                      onValueChange={([v]) => onIsolationChange("B", "melody", v / 100)}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-500 text-center pt-2 border-t border-slate-700/50">
                Isolation filters extract specific frequency ranges
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Master */}
      <div className="space-y-2 pt-2 border-t border-slate-700/50">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] text-slate-400 uppercase tracking-wider">Master</Label>
          <span className="text-[10px] font-mono text-slate-500">{Math.round((musicObject.masterGain ?? 0.8) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ width: `${(musicObject.masterGain ?? 0.8) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
