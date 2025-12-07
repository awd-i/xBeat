"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getMusicEngine, type MusicEngine } from "@/lib/music-engine"
import { type MusicObject, type TransitionPlan, defaultMusicObject } from "@/lib/types"
import { logError } from "@/lib/logger"

interface EngineState {
  isPlayingA: boolean
  isPlayingB: boolean
  currentTimeA: number
  currentTimeB: number
  analyserData: { frequency: Uint8Array; timeDomain: Uint8Array }
}

export function useMusicEngine() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [durationA, setDurationA] = useState(0)
  const [durationB, setDurationB] = useState(0)
  const [musicObject, setMusicObject] = useState<MusicObject>(defaultMusicObject)
  const [engineState, setEngineState] = useState<EngineState>({
    isPlayingA: false,
    isPlayingB: false,
    currentTimeA: 0,
    currentTimeB: 0,
    analyserData: {
      frequency: new Uint8Array(1024),
      timeDomain: new Uint8Array(1024),
    },
  })

  const engineRef = useRef<MusicEngine | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    engineRef.current = getMusicEngine()
    // Initialize with the engine's music object
    if (engineRef.current) {
      setMusicObject(engineRef.current.getMusicObject())
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const initialize = useCallback(async () => {
    if (!engineRef.current) return

    await engineRef.current.initialize()
    setIsInitialized(true)

    // Start animation loop for real-time updates
    const updateLoop = () => {
      if (engineRef.current) {
        // Batch all state updates together
        setEngineState({
          isPlayingA: engineRef.current.isPlaying("A"),
          isPlayingB: engineRef.current.isPlaying("B"),
          currentTimeA: engineRef.current.getCurrentTime("A"),
          currentTimeB: engineRef.current.getCurrentTime("B"),
          analyserData: engineRef.current.getAnalyserData(),
        })
      }
      animationRef.current = requestAnimationFrame(updateLoop)
    }
    animationRef.current = requestAnimationFrame(updateLoop)
  }, [])

  const loadTrack = useCallback(
    async (deck: "A" | "B", url: string) => {
      if (!engineRef.current) return

      if (!isInitialized) {
        await initialize()
      }

      await engineRef.current.loadTrack(deck, url)

      if (deck === "A") {
        setDurationA(engineRef.current.getDuration("A"))
      } else {
        setDurationB(engineRef.current.getDuration("B"))
      }
    },
    [isInitialized, initialize],
  )

  const play = useCallback(async (deck?: "A" | "B") => {
    if (!engineRef.current) return
    try {
      await engineRef.current.play(deck)
    } catch (error) {
      logError('Failed to play deck', error, { deck })
    }
  }, [])

  const pause = useCallback((deck?: "A" | "B") => {
    if (!engineRef.current) return
    try {
      engineRef.current.pause(deck)
    } catch (error) {
      logError('Failed to pause deck', error, { deck })
    }
  }, [])

  const seek = useCallback(async (deck: "A" | "B", time: number) => {
    if (!engineRef.current) return
    try {
      await engineRef.current.seek(deck, time)
    } catch (error) {
      logError('Failed to seek deck', error, { deck, time })
    }
  }, [])

  const setCrossfade = useCallback((value: number) => {
    if (!engineRef.current) return
    engineRef.current.setCrossfade(value)
    setMusicObject(engineRef.current.getMusicObject())
  }, [])

  const updateMusicObject = useCallback((updates: Partial<MusicObject>) => {
    if (!engineRef.current) return
    engineRef.current.updateMusicObject(updates)
    setMusicObject(engineRef.current.getMusicObject())
  }, [])

  const applyTransitionPlan = useCallback((plan: TransitionPlan) => {
    if (!engineRef.current) return
    engineRef.current.applyTransitionPlan(plan)
  }, [])

  const hasTrack = useCallback((deck: "A" | "B") => {
    if (!engineRef.current) return false
    return engineRef.current.hasTrack(deck)
  }, [])

  const getAnalyserData = useCallback(() => {
    if (!engineRef.current) {
      return {
        frequency: new Uint8Array(1024),
        timeDomain: new Uint8Array(1024),
      }
    }
    return engineRef.current.getAnalyserData()
  }, [])

  return {
    isInitialized,
    initialize,
    loadTrack,
    play,
    pause,
    seek,
    setCrossfade,
    updateMusicObject,
    applyTransitionPlan,
    hasTrack,
    isPlayingA: engineState.isPlayingA,
    isPlayingB: engineState.isPlayingB,
    currentTimeA: engineState.currentTimeA,
    currentTimeB: engineState.currentTimeB,
    durationA,
    durationB,
    musicObject,
    analyserData: engineState.analyserData,
    getAnalyserData,
  }
}
