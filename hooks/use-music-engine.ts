"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getMusicEngine, type MusicEngine, type TransitionState } from "@/lib/music-engine"
import { type MusicObject, type TransitionPlan, defaultMusicObject } from "@/lib/types"

const defaultTransitionState: TransitionState = {
  isActive: false,
  progress: 0,
  startTime: 0,
  duration: 0,
  currentValues: {
    crossfader: 0.5,
    filterCutoff: 20000,
    reverb: 0,
    delay: 0,
  },
}

export function useMusicEngine() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlayingA, setIsPlayingA] = useState(false)
  const [isPlayingB, setIsPlayingB] = useState(false)
  const [currentTimeA, setCurrentTimeA] = useState(0)
  const [currentTimeB, setCurrentTimeB] = useState(0)
  const [durationA, setDurationA] = useState(0)
  const [durationB, setDurationB] = useState(0)
  const [musicObject, setMusicObject] = useState<MusicObject>(defaultMusicObject)
  const [analyserData, setAnalyserData] = useState<{ frequency: Uint8Array; timeDomain: Uint8Array }>({
    frequency: new Uint8Array(1024),
    timeDomain: new Uint8Array(1024),
  })
  const [transitionState, setTransitionState] = useState<TransitionState>(defaultTransitionState)

  const engineRef = useRef<MusicEngine | null>(null)
  const animationRef = useRef<number | null>(null)
  const transitionUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    engineRef.current = getMusicEngine()

    // Subscribe to transition updates
    transitionUnsubRef.current = engineRef.current.onTransitionUpdate((state) => {
      setTransitionState(state)
      // Sync musicObject with transition values when transition is active
      if (state.isActive) {
        setMusicObject((prev) => ({
          ...prev,
          crossfader: state.currentValues.crossfader,
          filter: {
            ...prev.filter,
            cutoff: state.currentValues.filterCutoff,
          },
          reverbAmount: state.currentValues.reverb,
          delayAmount: state.currentValues.delay,
        }))
      }
    })

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (transitionUnsubRef.current) {
        transitionUnsubRef.current()
      }
    }
  }, [])

  const initialize = useCallback(async () => {
    if (!engineRef.current) return

    await engineRef.current.initialize()
    setIsInitialized(true)

    // Start animation loop for analyser data
    const updateLoop = () => {
      if (engineRef.current) {
        setAnalyserData(engineRef.current.getAnalyserData())
        setCurrentTimeA(engineRef.current.getCurrentTime("A"))
        setCurrentTimeB(engineRef.current.getCurrentTime("B"))
        setIsPlayingA(engineRef.current.isPlaying("A"))
        setIsPlayingB(engineRef.current.isPlaying("B"))
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

  const play = useCallback((deck?: "A" | "B") => {
    if (!engineRef.current) return
    engineRef.current.play(deck)
  }, [])

  const pause = useCallback((deck?: "A" | "B") => {
    if (!engineRef.current) return
    engineRef.current.pause(deck)
  }, [])

  const seek = useCallback((deck: "A" | "B", time: number) => {
    if (!engineRef.current) return
    engineRef.current.seek(deck, time)
  }, [])

  const setCrossfade = useCallback((value: number) => {
    if (!engineRef.current) return
    engineRef.current.setCrossfade(value)
    setMusicObject((prev) => ({ ...prev, crossfader: value }))
  }, [])

  const updateMusicObject = useCallback((updates: Partial<MusicObject>) => {
    if (!engineRef.current) return
    engineRef.current.updateMusicObject(updates)
    setMusicObject((prev) => ({ ...prev, ...updates }))
  }, [])

  const applyTransitionPlan = useCallback((plan: TransitionPlan) => {
    if (!engineRef.current) return
    engineRef.current.applyTransitionPlan(plan)
  }, [])

  const cancelTransition = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.cancelTransition()
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
    cancelTransition,
    hasTrack,
    isPlayingA,
    isPlayingB,
    currentTimeA,
    currentTimeB,
    durationA,
    durationB,
    musicObject,
    analyserData,
    getAnalyserData,
    transitionState,
    musicEngine: engineRef.current, // Expose the music engine instance
  }
}
