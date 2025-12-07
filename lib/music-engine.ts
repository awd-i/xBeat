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
  private reverbNode: ConvolverNode | null = null
  private reverbGain: GainNode | null = null
  private dryGain: GainNode | null = null

  private musicObject: MusicObject | null = null
  private transitionInterval: NodeJS.Timeout | null = null

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

    // Delay routing
    this.filter.connect(this.delayNode)
    this.delayNode.connect(this.delayFeedback)
    this.delayFeedback.connect(this.delayNode)
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

    // Stop current playback
    if (deckObj.source && deckObj.isPlaying) {
      deckObj.source.stop()
      deckObj.isPlaying = false
    }

    // Fetch and decode audio
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    deckObj.buffer = await this.audioContext.decodeAudioData(arrayBuffer)
    deckObj.pauseTime = 0
  }

  play(deck?: "A" | "B"): void {
    if (!this.audioContext) return

    const decks = deck ? [deck] : (["A", "B"] as const)

    for (const d of decks) {
      const deckObj = d === "A" ? this.deckA : this.deckB
      if (!deckObj.buffer || !deckObj.eqLow || deckObj.isPlaying) continue

      deckObj.source = this.audioContext.createBufferSource()
      deckObj.source.buffer = deckObj.buffer
      deckObj.source.connect(deckObj.eqLow)

      // Apply playback rate if set
      if (this.musicObject?.tracks[d]?.playbackRate) {
        deckObj.source.playbackRate.value = this.musicObject.tracks[d]!.playbackRate
      }

      deckObj.source.start(0, deckObj.pauseTime)
      deckObj.startTime = this.audioContext.currentTime - deckObj.pauseTime
      deckObj.isPlaying = true

      deckObj.source.onended = () => {
        deckObj.isPlaying = false
        deckObj.pauseTime = 0
      }
    }
  }

  pause(deck?: "A" | "B"): void {
    if (!this.audioContext) return

    const decks = deck ? [deck] : (["A", "B"] as const)

    for (const d of decks) {
      const deckObj = d === "A" ? this.deckA : this.deckB
      if (!deckObj.source || !deckObj.isPlaying) continue

      deckObj.pauseTime = this.audioContext.currentTime - deckObj.startTime
      deckObj.source.stop()
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
    if (obj.delayAmount !== undefined && this.delayFeedback) {
      this.delayFeedback.gain.value = obj.delayAmount * 0.6
    }
    if (obj.delayFeedback !== undefined && this.delayFeedback) {
      // Already handled above in delayAmount
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

  applyTransitionPlan(plan: TransitionPlan): void {
    if (this.transitionInterval) {
      clearInterval(this.transitionInterval)
    }

    const startTime = Date.now()
    const duration = plan.durationSeconds * 1000

    this.transitionInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Interpolate crossfade
      const crossfadeValue = this.interpolateAutomation(plan.crossfadeAutomation, progress)
      this.setCrossfade(crossfadeValue)

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
      }

      if (progress >= 1) {
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

    if (wasPlaying) {
      this.pause(deck)
    }

    deckObj.pauseTime = Math.max(0, Math.min(time, deckObj.buffer?.duration || 0))

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
