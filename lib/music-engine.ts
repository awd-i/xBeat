// Web Audio API based music engine
import type { MusicObject, TransitionPlan } from "./types"
import { BPMDetector } from "./bpm-detector"

export class MusicEngine {
  private audioContext: AudioContext | null = null
  private activeSources: { A: AudioBufferSourceNode | null; B: AudioBufferSourceNode | null } = { A: null, B: null }
  private deckA: {
    buffer: AudioBuffer | null
    gain: GainNode | null
    panNode: StereoPannerNode | null
    eqLow: BiquadFilterNode | null
    eqMid: BiquadFilterNode | null
    eqHigh: BiquadFilterNode | null
    bassIsolate: BiquadFilterNode | null
    voiceIsolate: BiquadFilterNode | null
    melodyIsolate: BiquadFilterNode | null
    bassIsolateGain: GainNode | null
    voiceIsolateGain: GainNode | null
    melodyIsolateGain: GainNode | null
    detectedBPM: number | null
    isPlaying: boolean
    startTime: number
    pauseTime: number
  } = {
    buffer: null,
    gain: null,
    panNode: null,
    eqLow: null,
    eqMid: null,
    eqHigh: null,
    bassIsolate: null,
    voiceIsolate: null,
    melodyIsolate: null,
    bassIsolateGain: null,
    voiceIsolateGain: null,
    melodyIsolateGain: null,
    detectedBPM: null,
    isPlaying: false,
    startTime: 0,
    pauseTime: 0,
  }
  private deckB: typeof this.deckA = {
    buffer: null,
    gain: null,
    panNode: null,
    eqLow: null,
    eqMid: null,
    eqHigh: null,
    bassIsolate: null,
    voiceIsolate: null,
    melodyIsolate: null,
    bassIsolateGain: null,
    voiceIsolateGain: null,
    melodyIsolateGain: null,
    detectedBPM: null,
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
  private playLock = { A: false, B: false }

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
    this.delayWet.gain.value = 0 // Start with delay disabled

    // Reverb (simple convolution)
    this.reverbNode = this.audioContext.createConvolver()
    this.reverbGain = this.audioContext.createGain()
    this.reverbGain.gain.value = 0
    this.dryGain = this.audioContext.createGain()
    this.dryGain.gain.value = 1

    // Create impulse response for reverb
    await this.createReverbImpulse()

    // Main signal path: filter → dryGain → masterGain
    this.filter.connect(this.dryGain)
    this.dryGain.connect(this.masterGain)

    // Reverb send: filter → reverb → reverbGain → masterGain
    this.filter.connect(this.reverbNode)
    this.reverbNode.connect(this.reverbGain)
    this.reverbGain.connect(this.masterGain)

    // Delay send: filter → delayWet → delayNode → (feedback loop) → masterGain
    this.filter.connect(this.delayWet)
    this.delayWet.connect(this.delayNode)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode) // Feedback loop
    this.delayNode.connect(this.masterGain)

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

    // Bass isolation (20Hz - 250Hz)
    deckObj.bassIsolate = this.audioContext.createBiquadFilter()
    deckObj.bassIsolate.type = "lowpass"
    deckObj.bassIsolate.frequency.value = 250
    deckObj.bassIsolate.Q.value = 1
    deckObj.bassIsolateGain = this.audioContext.createGain()
    deckObj.bassIsolateGain.gain.value = 0 // Off by default

    // Voice isolation (300Hz - 3.4kHz)
    deckObj.voiceIsolate = this.audioContext.createBiquadFilter()
    deckObj.voiceIsolate.type = "bandpass"
    deckObj.voiceIsolate.frequency.value = 1850 // Center of voice range
    deckObj.voiceIsolate.Q.value = 0.7
    deckObj.voiceIsolateGain = this.audioContext.createGain()
    deckObj.voiceIsolateGain.gain.value = 0 // Off by default

    // Melody isolation (1kHz - 8kHz)
    deckObj.melodyIsolate = this.audioContext.createBiquadFilter()
    deckObj.melodyIsolate.type = "highpass"
    deckObj.melodyIsolate.frequency.value = 1000
    deckObj.melodyIsolate.Q.value = 1
    deckObj.melodyIsolateGain = this.audioContext.createGain()
    deckObj.melodyIsolateGain.gain.value = 0 // Off by default

    // Connect deck chain with advanced filters
    deckObj.eqLow.connect(deckObj.eqMid)
    deckObj.eqMid.connect(deckObj.eqHigh)

    // Connect advanced filters in parallel
    deckObj.eqHigh.connect(deckObj.bassIsolate)
    deckObj.bassIsolate.connect(deckObj.bassIsolateGain)
    deckObj.bassIsolateGain.connect(deckObj.panNode)

    deckObj.eqHigh.connect(deckObj.voiceIsolate)
    deckObj.voiceIsolate.connect(deckObj.voiceIsolateGain)
    deckObj.voiceIsolateGain.connect(deckObj.panNode)

    deckObj.eqHigh.connect(deckObj.melodyIsolate)
    deckObj.melodyIsolate.connect(deckObj.melodyIsolateGain)
    deckObj.melodyIsolateGain.connect(deckObj.panNode)

    // Also connect direct path (when all isolations are off)
    deckObj.eqHigh.connect(deckObj.panNode)

    deckObj.panNode.connect(deckObj.gain)
    deckObj.gain.connect(this.filter)
  }

  async loadTrack(deck: "A" | "B", url: string): Promise<void> {
    if (!this.audioContext) await this.initialize()
    if (!this.audioContext) throw new Error("Audio context not initialized")

    const deckObj = deck === "A" ? this.deckA : this.deckB

    this.stopDeck(deck)

    // Fetch and decode audio
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    deckObj.buffer = await this.audioContext.decodeAudioData(arrayBuffer)
    deckObj.pauseTime = 0

    this.detectBPM(deck, deckObj.buffer)
  }

  private async detectBPM(deck: "A" | "B", buffer: AudioBuffer): Promise<void> {
    const deckObj = deck === "A" ? this.deckA : this.deckB

    try {
      const detector = new BPMDetector(buffer.sampleRate)
      const bpm = await detector.detectBPM(buffer)
      deckObj.detectedBPM = bpm
    } catch (error) {
      console.error(`BPM detection failed for deck ${deck}:`, error)
      deckObj.detectedBPM = null
    }
  }

  getBPM(deck: "A" | "B"): number | null {
    const deckObj = deck === "A" ? this.deckA : this.deckB
    return deckObj.detectedBPM
  }

  private stopDeck(deck: "A" | "B"): void {
    const deckObj = deck === "A" ? this.deckA : this.deckB
    const activeSource = this.activeSources[deck]

    if (activeSource) {
      try {
        activeSource.onended = null
        activeSource.stop()
        activeSource.disconnect()
      } catch (e) {
        // Source may already be stopped
      }
      this.activeSources[deck] = null
    }

    deckObj.isPlaying = false
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
      if (this.playLock[d]) {
        continue
      }

      const deckObj = d === "A" ? this.deckA : this.deckB

      if (!deckObj.buffer || !deckObj.eqLow) {
        continue
      }

      if (deckObj.isPlaying) {
        continue
      }

      if (this.activeSources[d]) {
        this.stopDeck(d)
      }

      this.playLock[d] = true
      deckObj.isPlaying = true

      try {
        const source = this.audioContext.createBufferSource()
        source.buffer = deckObj.buffer
        source.connect(deckObj.eqLow)

        const trackSettings = this.musicObject?.tracks?.[d]
        if (trackSettings?.playbackRate) {
          source.playbackRate.value = trackSettings.playbackRate
        }

        this.activeSources[d] = source

        source.start(0, deckObj.pauseTime)
        deckObj.startTime = this.audioContext.currentTime - deckObj.pauseTime

        const currentSource = source
        source.onended = () => {
          if (this.activeSources[d] === currentSource) {
            deckObj.isPlaying = false
            deckObj.pauseTime = 0
            this.activeSources[d] = null
            this.playLock[d] = false
          }
        }
      } finally {
        this.playLock[d] = false
      }
    }
  }

  pause(deck?: "A" | "B"): void {
    if (!this.audioContext) return

    const decks = deck ? [deck] : (["A", "B"] as const)

    for (const d of decks) {
      const deckObj = d === "A" ? this.deckA : this.deckB
      const activeSource = this.activeSources[d]

      if (!deckObj.isPlaying || !activeSource) continue

      // Save the pause time first (calculate before stopping)
      deckObj.pauseTime = this.audioContext.currentTime - deckObj.startTime

      try {
        activeSource.onended = null
        activeSource.stop()
        activeSource.disconnect()
      } catch (e) {
        // Source may already be stopped
      }

      this.activeSources[d] = null
      deckObj.isPlaying = false
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
      this.delayFeedback.gain.value = obj.delayAmount * 0.6
      this.delayWet.gain.value = obj.delayAmount // Update delay wet gain
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
          if (settings.playbackRate !== undefined && this.activeSources[deckKey]) {
            this.activeSources[deckKey].playbackRate.value = settings.playbackRate
          }

          if ((settings as any).bassIsolation !== undefined && deck.bassIsolateGain) {
            deck.bassIsolateGain.gain.value = (settings as any).bassIsolation
          }
          if ((settings as any).voiceIsolation !== undefined && deck.voiceIsolateGain) {
            deck.voiceIsolateGain.gain.value = (settings as any).voiceIsolation
          }
          if ((settings as any).melodyIsolation !== undefined && deck.melodyIsolateGain) {
            deck.melodyIsolateGain.gain.value = (settings as any).melodyIsolation
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
    console.log("[v0] MusicEngine: Starting transition plan execution", {
      duration: plan.durationSeconds,
      crossfadePoints: plan.crossfadeAutomation.length,
      hasFilterAutomation: !!plan.filterAutomation,
      hasFxAutomation: !!plan.fxAutomation,
    })

    if (this.transitionInterval) {
      console.log("[v0] MusicEngine: Clearing existing transition")
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
        if (this.delayFeedback) this.delayFeedback.gain.value = delay * 0.6
        if (this.delayWet) this.delayWet.gain.value = delay // Update delay wet gain
      }

      if (progress >= 1) {
        console.log("[v0] MusicEngine: Transition completed")
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

    this.stopDeck("A")
    this.stopDeck("B")

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
