// Web Audio API based music engine
import type { MusicObject, TransitionPlan } from "./types"

export class MusicEngine {
  private audioContext: AudioContext | null = null
  private deckA: {
    source: AudioBufferSourceNode | null
    buffer: AudioBuffer | null
    gain: GainNode | null
    panNode: StereoPannerNode | null
    eqLow: BiquadFilterNode | null
    eqMid: BiquadFilterNode | null
    eqHigh: BiquadFilterNode | null
    isPlaying: boolean
    startTime: number
    pauseTime: number
  } = {
    source: null,
    buffer: null,
    gain: null,
    panNode: null,
    eqLow: null,
    eqMid: null,
    eqHigh: null,
    isPlaying: false,
    startTime: 0,
    pauseTime: 0,
  }
  private deckB: typeof this.deckA = {
    source: null,
    buffer: null,
    gain: null,
    panNode: null,
    eqLow: null,
    eqMid: null,
    eqHigh: null,
    isPlaying: false,
    startTime: 0,
    pauseTime: 0,
  }

  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private filter: BiquadFilterNode | null = null
  private delayNode: DelayNode | null = null
  private delayFeedback: GainNode | null = null
  private delayWet: GainNode | null = null
  private reverbNode: ConvolverNode | null = null
  private reverbGain: GainNode | null = null
  private dryGain: GainNode | null = null

  private musicObject: MusicObject | null = null
  private transitionInterval: NodeJS.Timeout | null = null
  // Simple counter to track which source is current - only the latest source ID should be playing
  private sourceIds: { A: number; B: number } = { A: 0, B: 0 }

  async initialize(): Promise<void> {
    if (this.audioContext) return

    this.audioContext = new AudioContext()

    // Create master chain
    this.masterGain = this.audioContext.createGain()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.8

    // Filter
    this.filter = this.audioContext.createBiquadFilter()
    this.filter.type = "lowpass"
    this.filter.frequency.value = 20000
    this.filter.Q.value = 1

    // Delay
    this.delayNode = this.audioContext.createDelay(2)
    this.delayNode.delayTime.value = 0.3
    this.delayFeedback = this.audioContext.createGain()
    this.delayFeedback.gain.value = 0
    this.delayWet = this.audioContext.createGain()
    this.delayWet.gain.value = 0 // Delay effect OFF by default

    // Reverb (simple convolution)
    this.reverbNode = this.audioContext.createConvolver()
    this.reverbGain = this.audioContext.createGain()
    this.reverbGain.gain.value = 0
    this.dryGain = this.audioContext.createGain()
    this.dryGain.gain.value = 1

    // Create impulse response for reverb
    await this.createReverbImpulse()

    // Connect master chain
    this.filter.connect(this.dryGain)
    this.filter.connect(this.reverbNode)
    this.reverbNode.connect(this.reverbGain)
    this.dryGain.connect(this.masterGain)
    this.reverbGain.connect(this.masterGain)

    // Delay routing (with wet/dry control)
    this.filter.connect(this.delayNode)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode)
    this.delayNode.connect(this.delayWet)
    this.delayWet.connect(this.masterGain) // Only wet signal goes to master when delayWet > 0

    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)

    // Initialize deck chains
    this.initializeDeck("A")
    this.initializeDeck("B")
  }

  private async createReverbImpulse(): Promise<void> {
    if (!this.audioContext || !this.reverbNode) return

    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * 2 // 2 seconds
    const impulse = this.audioContext.createBuffer(2, length, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }

    this.reverbNode.buffer = impulse
  }

  private initializeDeck(deck: "A" | "B"): void {
    if (!this.audioContext || !this.filter) return

    const deckObj = deck === "A" ? this.deckA : this.deckB

    deckObj.gain = this.audioContext.createGain()
    deckObj.panNode = this.audioContext.createStereoPanner()
    deckObj.eqLow = this.audioContext.createBiquadFilter()
    deckObj.eqMid = this.audioContext.createBiquadFilter()
    deckObj.eqHigh = this.audioContext.createBiquadFilter()

    // EQ setup
    deckObj.eqLow.type = "lowshelf"
    deckObj.eqLow.frequency.value = 320
    deckObj.eqLow.gain.value = 0

    deckObj.eqMid.type = "peaking"
    deckObj.eqMid.frequency.value = 1000
    deckObj.eqMid.Q.value = 0.5
    deckObj.eqMid.gain.value = 0

    deckObj.eqHigh.type = "highshelf"
    deckObj.eqHigh.frequency.value = 3200
    deckObj.eqHigh.gain.value = 0

    // Connect deck chain
    deckObj.eqLow.connect(deckObj.eqMid)
    deckObj.eqMid.connect(deckObj.eqHigh)
    deckObj.eqHigh.connect(deckObj.panNode)
    deckObj.panNode.connect(deckObj.gain)
    deckObj.gain.connect(this.filter)
  }

  async loadTrack(deck: "A" | "B", url: string): Promise<void> {
    if (!this.audioContext) await this.initialize()
    if (!this.audioContext) throw new Error("Audio context not initialized")

    const deckObj = deck === "A" ? this.deckA : this.deckB

    // Stop any existing source before loading new track
    this.stopSource(deck)

    // Fetch and decode audio
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    deckObj.buffer = await this.audioContext.decodeAudioData(arrayBuffer)
    deckObj.pauseTime = 0
  }

  private stopSource(deck: "A" | "B"): void {
    const deckObj = deck === "A" ? this.deckA : this.deckB

    // Increment source ID to invalidate any existing sources
    this.sourceIds[deck]++

    // Clean up the current source
    if (deckObj.source) {
      try {
        deckObj.source.onended = null
        deckObj.source.stop()
      } catch (e) {
        // Source may already be stopped
      }
      try {
        deckObj.source.disconnect()
      } catch (e) {
        // Source may already be disconnected
      }
      deckObj.source = null
    }

    deckObj.isPlaying = false
  }

  play(deck?: "A" | "B"): void {
    if (!this.audioContext) return

    const decks = deck ? [deck] : (["A", "B"] as const)

    for (const d of decks) {
      const deckObj = d === "A" ? this.deckA : this.deckB
      
      // Skip if already playing
      if (deckObj.isPlaying) continue
      
      // Don't play if no buffer or no EQ chain
      if (!deckObj.buffer || !deckObj.eqLow) continue

      // Stop any existing source first
      this.stopSource(d)

      // Capture the source ID for this play operation
      const mySourceId = this.sourceIds[d]

      try {
        // Create new source
        const newSource = this.audioContext.createBufferSource()
        newSource.buffer = deckObj.buffer
        
        // Connect to audio graph
        newSource.connect(deckObj.eqLow)

        // Apply playback rate if set
        if (this.musicObject?.tracks?.[d]?.playbackRate) {
          newSource.playbackRate.value = this.musicObject.tracks[d]!.playbackRate
        }

        // Store the source and mark as playing
        deckObj.source = newSource
        deckObj.isPlaying = true

        // Start playback from pause position
        newSource.start(0, deckObj.pauseTime)
        deckObj.startTime = this.audioContext.currentTime - deckObj.pauseTime

        // Clean up when playback ends naturally
        newSource.onended = () => {
          // Only clean up if this is still the current source (same ID)
          if (this.sourceIds[d] === mySourceId && deckObj.source === newSource) {
            deckObj.isPlaying = false
            deckObj.pauseTime = 0
            try {
              newSource.disconnect()
            } catch (e) {
              // Ignore disconnect errors
            }
            deckObj.source = null
          }
        }
      } catch (e) {
        console.error("Failed to start audio:", e)
        deckObj.isPlaying = false
        deckObj.source = null
      }
    }
  }

  pause(deck?: "A" | "B"): void {
    if (!this.audioContext) return

    const decks = deck ? [deck] : (["A", "B"] as const)

    for (const d of decks) {
      const deckObj = d === "A" ? this.deckA : this.deckB
      
      if (!deckObj.source || !deckObj.isPlaying) continue

      // Save the pause time first (calculate before stopping)
      deckObj.pauseTime = this.audioContext.currentTime - deckObj.startTime
      
      // Stop the source
      this.stopSource(d)
    }
  }

  setCrossfade(value: number): void {
    if (!this.deckA.gain || !this.deckB.gain) return

    // Equal power crossfade
    const gainA = Math.cos((value * Math.PI) / 2)
    const gainB = Math.sin((value * Math.PI) / 2)

    this.deckA.gain.gain.value = gainA
    this.deckB.gain.gain.value = gainB
  }

  updateMusicObject(obj: Partial<MusicObject>): void {
    if (!this.audioContext) return

    this.musicObject = { ...this.musicObject, ...obj } as MusicObject

    // Master gain
    if (obj.masterGain !== undefined && this.masterGain) {
      this.masterGain.gain.value = obj.masterGain
    }

    // Crossfader
    if (obj.crossfader !== undefined) {
      this.setCrossfade(obj.crossfader)
    }

    // EQ (master)
    if (obj.eq) {
      // Apply to both decks
      for (const deck of [this.deckA, this.deckB]) {
        if (deck.eqLow) deck.eqLow.gain.value = obj.eq.low
        if (deck.eqMid) deck.eqMid.gain.value = obj.eq.mid
        if (deck.eqHigh) deck.eqHigh.gain.value = obj.eq.high
      }
    }

    // Filter
    if (obj.filter && this.filter) {
      this.filter.type = obj.filter.type
      this.filter.frequency.value = obj.filter.cutoff
      this.filter.Q.value = obj.filter.q
    }

    // Reverb
    if (obj.reverbAmount !== undefined && this.reverbGain && this.dryGain) {
      this.reverbGain.gain.value = obj.reverbAmount
      this.dryGain.gain.value = 1 - obj.reverbAmount * 0.5
    }

    // Delay
    if (obj.delayAmount !== undefined && this.delayFeedback && this.delayWet) {
      this.delayFeedback.gain.value = obj.delayAmount * 0.6 // Feedback amount
      this.delayWet.gain.value = obj.delayAmount // Wet signal amount
    }

    // Track settings
    if (obj.tracks) {
      for (const deckKey of ["A", "B"] as const) {
        const settings = obj.tracks[deckKey]
        const deck = deckKey === "A" ? this.deckA : this.deckB

        if (settings) {
          if (settings.gain !== undefined && deck.gain) {
            // This is individual deck gain, crossfade handles mix
          }
          if (settings.pan !== undefined && deck.panNode) {
            deck.panNode.pan.value = settings.pan
          }
          if (settings.playbackRate !== undefined && deck.source) {
            deck.source.playbackRate.value = settings.playbackRate
          }
        }
      }
    }
  }

  private interpolateEQAutomation(
    points: { t: number; low: number; mid: number; high: number }[],
    progress: number,
  ): { low: number; mid: number; high: number } {
    if (points.length === 0) return { low: 0, mid: 0, high: 0 }
    if (points.length === 1) return points[0]

    // Find surrounding points
    let before = points[0]
    let after = points[points.length - 1]

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].t <= progress && points[i + 1].t >= progress) {
        before = points[i]
        after = points[i + 1]
        break
      }
    }

    if (before.t === after.t) return before

    // Linear interpolation for each EQ band
    const ratio = (progress - before.t) / (after.t - before.t)
    return {
      low: before.low + (after.low - before.low) * ratio,
      mid: before.mid + (after.mid - before.mid) * ratio,
      high: before.high + (after.high - before.high) * ratio,
    }
  }

  applyTransitionPlan(plan: TransitionPlan): void {
    if (!this.audioContext) {
      console.error("Cannot apply transition plan: audio context not initialized")
      return
    }

    // Clear any existing transition
    if (this.transitionInterval) {
      clearInterval(this.transitionInterval)
      this.transitionInterval = null
    }

    const startTime = Date.now()
    const duration = plan.durationSeconds * 1000

    console.log(`[TRANSITION] Starting transition plan: ${plan.durationSeconds}s`)

    this.transitionInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Interpolate crossfade
      const crossfadeValue = this.interpolateAutomation(plan.crossfadeAutomation, progress)
      this.setCrossfade(crossfadeValue)

      // Interpolate Deck A EQ if present
      if (plan.deckAEqAutomation?.length && this.deckA.eqLow && this.deckA.eqMid && this.deckA.eqHigh) {
        const eq = this.interpolateEQAutomation(plan.deckAEqAutomation, progress)
        this.deckA.eqLow.gain.value = eq.low
        this.deckA.eqMid.gain.value = eq.mid
        this.deckA.eqHigh.gain.value = eq.high
      }

      // Interpolate Deck B EQ if present
      if (plan.deckBEqAutomation?.length && this.deckB.eqLow && this.deckB.eqMid && this.deckB.eqHigh) {
        const eq = this.interpolateEQAutomation(plan.deckBEqAutomation, progress)
        this.deckB.eqLow.gain.value = eq.low
        this.deckB.eqMid.gain.value = eq.mid
        this.deckB.eqHigh.gain.value = eq.high
      }

      // Interpolate filter if present
      if (plan.filterAutomation?.length) {
        const cutoff = this.interpolateAutomation(
          plan.filterAutomation.map((p) => ({ t: p.t, value: p.cutoff })),
          progress,
        )
        if (this.filter) {
          this.filter.frequency.value = cutoff
        }
      }

      // Interpolate FX if present
      if (plan.fxAutomation?.length) {
        const reverb = this.interpolateAutomation(
          plan.fxAutomation.map((p) => ({ t: p.t, value: p.reverb })),
          progress,
        )
        const delay = this.interpolateAutomation(
          plan.fxAutomation.map((p) => ({ t: p.t, value: p.delay })),
          progress,
        )
        if (this.reverbGain) this.reverbGain.gain.value = reverb
        if (this.delayFeedback && this.delayWet) {
          this.delayFeedback.gain.value = delay * 0.6
          this.delayWet.gain.value = delay
        }
      }

      if (progress >= 1) {
        console.log(`[TRANSITION] Transition plan completed`)
        clearInterval(this.transitionInterval!)
        this.transitionInterval = null
      }
    }, 50) // 20fps update rate
  }

  private interpolateAutomation(points: { t: number; value: number }[], progress: number): number {
    if (points.length === 0) return 0
    if (points.length === 1) return points[0].value

    // Find surrounding points
    let before = points[0]
    let after = points[points.length - 1]

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].t <= progress && points[i + 1].t >= progress) {
        before = points[i]
        after = points[i + 1]
        break
      }
    }

    if (before.t === after.t) return before.value

    // Linear interpolation
    const ratio = (progress - before.t) / (after.t - before.t)
    return before.value + (after.value - before.value) * ratio
  }

  getAnalyserData(): { frequency: Uint8Array; timeDomain: Uint8Array } {
    if (!this.analyser) {
      return {
        frequency: new Uint8Array(1024),
        timeDomain: new Uint8Array(1024),
      }
    }

    const frequency = new Uint8Array(this.analyser.frequencyBinCount)
    const timeDomain = new Uint8Array(this.analyser.frequencyBinCount)

    this.analyser.getByteFrequencyData(frequency)
    this.analyser.getByteTimeDomainData(timeDomain)

    return { frequency, timeDomain }
  }

  getCurrentTime(deck: "A" | "B"): number {
    if (!this.audioContext) return 0

    const deckObj = deck === "A" ? this.deckA : this.deckB

    if (deckObj.isPlaying) {
      return this.audioContext.currentTime - deckObj.startTime
    }
    return deckObj.pauseTime
  }

  getDuration(deck: "A" | "B"): number {
    const deckObj = deck === "A" ? this.deckA : this.deckB
    return deckObj.buffer?.duration || 0
  }

  isPlaying(deck: "A" | "B"): boolean {
    const deckObj = deck === "A" ? this.deckA : this.deckB
    return deckObj.isPlaying
  }

  hasTrack(deck: "A" | "B"): boolean {
    const deckObj = deck === "A" ? this.deckA : this.deckB
    return deckObj.buffer !== null
  }

  seek(deck: "A" | "B", time: number): void {
    const deckObj = deck === "A" ? this.deckA : this.deckB
    const wasPlaying = deckObj.isPlaying

    // Stop the current source before seeking
    this.stopSource(deck)

    // Update pause time to the seek position
    deckObj.pauseTime = Math.max(0, Math.min(time, deckObj.buffer?.duration || 0))

    // Resume playback if it was playing
    if (wasPlaying) {
      this.play(deck)
    }
  }

  dispose(): void {
    if (this.transitionInterval) {
      clearInterval(this.transitionInterval)
    }

    this.pause()

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Singleton instance
let engineInstance: MusicEngine | null = null

export function getMusicEngine(): MusicEngine {
  if (!engineInstance) {
    engineInstance = new MusicEngine()
  }
  return engineInstance
}
