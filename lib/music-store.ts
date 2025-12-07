// In-memory store for tracks (persisted via Blob storage metadata)
import type { Track, Preset, DJCoachMessage } from "./types"

interface MusicStore {
  tracks: Track[]
  presets: Preset[]
  coachMessages: DJCoachMessage[]
}

const store: MusicStore = {
  tracks: [],
  presets: [],
  coachMessages: [],
}

export function getTracks(): Track[] {
  return store.tracks
}

export function addTrack(track: Track): void {
  store.tracks.push(track)
}

export function updateTrack(id: string, updates: Partial<Track>): void {
  const index = store.tracks.findIndex((t) => t.id === id)
  if (index !== -1) {
    store.tracks[index] = { ...store.tracks[index], ...updates }
  }
}

export function deleteTrack(id: string): void {
  store.tracks = store.tracks.filter((t) => t.id !== id)
}

export function getTrackById(id: string): Track | undefined {
  return store.tracks.find((t) => t.id === id)
}

export function setTracks(tracks: Track[]): void {
  store.tracks = tracks
}

export function getPresets(): Preset[] {
  return store.presets
}

export function addPreset(preset: Preset): void {
  store.presets.push(preset)
}

export function addCoachMessage(message: DJCoachMessage): void {
  store.coachMessages.push(message)
  // Keep only last 50 messages
  if (store.coachMessages.length > 50) {
    store.coachMessages = store.coachMessages.slice(-50)
  }
}

export function getCoachMessages(): DJCoachMessage[] {
  return store.coachMessages
}
