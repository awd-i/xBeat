"use client"

import { useEffect, useState } from "react"
import type { MusicObject } from "@/lib/types"
import { ThreeVisualizer } from "./three-visualizer"

interface ClientOnlyVisualizerProps {
  analyserData: { frequency: Uint8Array; timeDomain: Uint8Array }
  musicObject: MusicObject
}

export function ClientOnlyVisualizer({ analyserData, musicObject }: ClientOnlyVisualizerProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    // Show a simple background during SSR
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-cyan-950/20" />
    )
  }

  return <ThreeVisualizer analyserData={analyserData} musicObject={musicObject} />
}