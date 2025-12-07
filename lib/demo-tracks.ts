import type { Track } from "./types"
import { useMusicStore } from "./stores/music-store"

// Demo tracks for testing the library functionality
export const demoTracks: Track[] = [
  {
    id: "demo-1",
    title: "sweet-life-luxury-chill-438146",
    artist: "Unknown Artist",
    genre: "Chill",
    bpm: 120,
    key: "C major",
    mood: "Relaxed",
    energy: 0.6,
    url: "https://example.com/demo1.mp3",
    createdAt: new Date(),
    analyzed: true,
  },
  {
    id: "demo-2", 
    title: "cascade-breathe-future-garage-412839",
    artist: "Unknown Artist",
    genre: "Future Garage",
    bpm: 140,
    key: "A minor",
    mood: "Atmospheric",
    energy: 0.7,
    url: "https://example.com/demo2.mp3",
    createdAt: new Date(),
    analyzed: true,
  }
]

export function addDemoTracks() {
  const store = useMusicStore.getState()
  demoTracks.forEach(track => {
    // Only add if not already exists
    const exists = store.tracks.find(t => t.id === track.id)
    if (!exists) {
      store.addTrack(track)
    }
  })
}