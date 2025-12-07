// Re-export from the new store for backward compatibility
export {
  getTracks,
  addTrack,
  updateTrack,
  deleteTrack,
  getTrackById,
  setTracks,
  getPresets,
  addPreset,
  addCoachMessage,
  getCoachMessages,
} from './stores/music-store'
