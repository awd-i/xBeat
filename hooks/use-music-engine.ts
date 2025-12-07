"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getMusicEngine, type MusicEngine } from "@/lib/music-engine"
import { type MusicObject, type TransitionPlan, defaultMusicObject } from "@/lib/types"

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

  const engineRef = useRef<MusicEngine | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    engineRef.current = getMusicEngine()

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

    // Start animation loop for analyser data and state sync
    let lastMusicObjectRef: MusicObject | null = null
    const updateLoop = () => {
      if (engineRef.current) {
        setAnalyserData(engineRef.current.getAnalyserData())
        setCurrentTimeA(engineRef.current.getCurrentTime("A"))
        setCurrentTimeB(engineRef.current.getCurrentTime("B"))
        setIsPlayingA(engineRef.current.isPlaying("A"))
        setIsPlayingB(engineRef.current.isPlaying("B"))
        
        // Sync musicObject from engine to reflect changes from transitions/voice commands
        // Only update if the reference changed (engine creates new object on updates)
        const engineMusicObject = engineRef.current.getMusicObject()
        if (engineMusicObject && engineMusicObject !== lastMusicObjectRef) {
          lastMusicObjectRef = engineMusicObject
          setMusicObject(engineMusicObject)
        }
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
    isPlayingA,
    isPlayingB,
    currentTimeA,
    currentTimeB,
    durationA,
    durationB,
    musicObject,
    analyserData,
    getAnalyserData,
    musicEngine: engineRef.current, // Expose the music engine instance
  }
}
