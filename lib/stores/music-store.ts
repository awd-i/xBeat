// Improved state management for music tracks
import { create } from 'zustand'
import type { Track, Preset, DJCoachMessage } from '../types'

interface MusicStoreState {
  tracks: Track[]
  presets: Preset[]
  coachMessages: DJCoachMessage[]
  isLoading: boolean
  error: string | null
}

interface MusicStoreActions {
  // Track actions
  addTrack: (track: Track) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  deleteTrack: (id: string) => void
  setTracks: (tracks: Track[]) => void
  getTrackById: (id: string) => Track | undefined
  
  // Preset actions  
  addPreset: (preset: Preset) => void
  
  // Coach message actions
  addCoachMessage: (message: DJCoachMessage) => void
  
  // UI state
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

type MusicStore = MusicStoreState & MusicStoreActions

// For environments where zustand is not available, use simple state
const createSimpleStore = () => {
  let state: MusicStoreState = {
    tracks: [],
    presets: [],
    coachMessages: [],
    isLoading: false,
    error: null,
  }

  const listeners = new Set<() => void>()

  const setState = (updates: Partial<MusicStoreState>) => {
    state = { ...state, ...updates }
    listeners.forEach(listener => listener())
  }

  const getState = () => state

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    getState,
    setState,
    subscribe,
    // Actions
    addTrack: (track: Track) => {
      setState({ tracks: [...state.tracks, track] })
    },
    updateTrack: (id: string, updates: Partial<Track>) => {
      const tracks = state.tracks.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
      setState({ tracks })
    },
    deleteTrack: (id: string) => {
      setState({ tracks: state.tracks.filter(t => t.id !== id) })
    },
    setTracks: (tracks: Track[]) => {
      setState({ tracks })
    },
    getTrackById: (id: string) => {
      return state.tracks.find(t => t.id === id)
    },
    addPreset: (preset: Preset) => {
      setState({ presets: [...state.presets, preset] })
    },
    addCoachMessage: (message: DJCoachMessage) => {
      const newMessages = [...state.coachMessages, message]
      // Keep only last 50 messages
      if (newMessages.length > 50) {
        newMessages.splice(0, newMessages.length - 50)
      }
      setState({ coachMessages: newMessages })
    },
    setLoading: (isLoading: boolean) => {
      setState({ isLoading })
    },
    setError: (error: string | null) => {
      setState({ error })
    },
  }
}

// Try to use zustand, fall back to simple store
let useMusicStore: () => MusicStore

try {
  useMusicStore = create<MusicStore>((set, get) => ({
    // Initial state
    tracks: [],
    presets: [],
    coachMessages: [],
    isLoading: false,
    error: null,

    // Track actions
    addTrack: (track) => 
      set((state) => ({ tracks: [...state.tracks, track] })),
    
    updateTrack: (id, updates) =>
      set((state) => ({
        tracks: state.tracks.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      })),
    
    deleteTrack: (id) =>
      set((state) => ({
        tracks: state.tracks.filter(t => t.id !== id)
      })),
    
    setTracks: (tracks) => set({ tracks }),
    
    getTrackById: (id) => {
      return get().tracks.find(t => t.id === id)
    },

    // Preset actions
    addPreset: (preset) =>
      set((state) => ({ presets: [...state.presets, preset] })),

    // Coach message actions  
    addCoachMessage: (message) =>
      set((state) => {
        const newMessages = [...state.coachMessages, message]
        // Keep only last 50 messages
        if (newMessages.length > 50) {
          newMessages.splice(0, newMessages.length - 50)
        }
        return { coachMessages: newMessages }
      }),

    // UI state
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
} catch {
  // Fallback to simple store
  const simpleStore = createSimpleStore()
  useMusicStore = () => simpleStore as any
}

export { useMusicStore }

// Legacy exports for backward compatibility  
export const getTracks = () => useMusicStore.getState().tracks
export const addTrack = (track: Track) => useMusicStore.getState().addTrack(track)
export const updateTrack = (id: string, updates: Partial<Track>) => 
  useMusicStore.getState().updateTrack(id, updates)
export const deleteTrack = (id: string) => useMusicStore.getState().deleteTrack(id)
export const getTrackById = (id: string) => useMusicStore.getState().getTrackById(id)
export const setTracks = (tracks: Track[]) => useMusicStore.getState().setTracks(tracks)
export const getPresets = () => useMusicStore.getState().presets
export const addPreset = (preset: Preset) => useMusicStore.getState().addPreset(preset)
export const addCoachMessage = (message: DJCoachMessage) => 
  useMusicStore.getState().addCoachMessage(message)
export const getCoachMessages = () => useMusicStore.getState().coachMessages