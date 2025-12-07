// Core data types for the DJ system

export interface Track {
  id: string
  title: string
  artist: string
  genre?: string
  bpm?: number
  key?: string
  mood?: string
  energy?: number
  tags?: string[]
  description?: string
  url: string
  duration?: number
  waveformData?: number[]
  createdAt: Date
  analyzed: boolean
}

export interface TrackSettings {
  id: string
  url: string
  title: string
  artist: string
  gain: number
  pan: number
  playbackRate: number
  enabled: boolean
}

export interface EQSettings {
  low: number
  mid: number
  high: number
}

export interface FilterSettings {
  type: "lowpass" | "highpass" | "bandpass"
  cutoff: number
  q: number
}

export interface MusicObject {
  tempo: number
  key: string
  energy: number
  masterGain: number
  crossfader: number

  tracks: {
    A: TrackSettings | null
    B: TrackSettings | null
  }

  reverbAmount: number
  delayAmount: number
  delayFeedback: number

  eq: EQSettings

  filter: FilterSettings

  visualizerMode: "cymatic" | "particles" | "tunnel" | "waveform"
  visualSensitivity: number
  colorScheme: "cyberpunk" | "neon" | "monochrome" | "fire"
}

export interface TransitionPlan {
  durationSeconds: number
  crossfadeAutomation: { t: number; value: number }[]
  deckAEqAutomation?: { t: number; low: number; mid: number; high: number }[]
  deckBEqAutomation?: { t: number; low: number; mid: number; high: number }[]
  filterAutomation?: { t: number; cutoff: number; q: number }[]
  fxAutomation?: { t: number; reverb: number; delay: number }[]
  visualizerConfig?: Partial<MusicObject>
  explanation: string
}

export interface TrackAnalysis {
  genre: string
  mood: string
  energy: number
  bpm: number
  key: string
  description: string
  tags: string[]
}

export interface Preset {
  id: string
  name: string
  description: string
  musicObject: Partial<MusicObject>
  createdAt: Date
}

export interface DJCoachMessage {
  id: string
  message: string
  type: "info" | "tip" | "action" | "analysis"
  timestamp: Date
}

export interface TrackRecommendation {
  trackId: string
  reason: string
  compatibilityScore: number
  suggestedTransition?: string
}

export const defaultMusicObject: MusicObject = {
  tempo: 120,
  key: "C",
  energy: 0.5,
  masterGain: 0.8,
  crossfader: 0.5,

  tracks: {
    A: null,
    B: null,
  },

  reverbAmount: 0,
  delayAmount: 0,
  delayFeedback: 0.3,

  eq: {
    low: 0,
    mid: 0,
    high: 0,
  },

  filter: {
    type: "lowpass",
    cutoff: 20000,
    q: 1,
  },

  visualizerMode: "particles",
  visualSensitivity: 0.7,
  colorScheme: "cyberpunk",
}
