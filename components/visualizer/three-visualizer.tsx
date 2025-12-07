"use client"

import { useRef, useMemo, memo } from "react"
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"
import type { MusicObject } from "@/lib/types"

interface VisualizerProps {
  analyserData: {
    frequency: Uint8Array
    timeDomain: Uint8Array
  }
  musicObject: MusicObject
}

const ParticleVisualizer = memo(function ParticleVisualizer({
  analyserData,
  sensitivity,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const particleCount = 800

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 3 + Math.random() * 2
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  const colors = useMemo(() => {
    const cols = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount
      cols[i * 3] = 0.6 + t * 0.2
      cols[i * 3 + 1] = 0.1 + t * 0.5
      cols[i * 3 + 2] = 0.9
    }
    return cols
  }, [])

  const frameCount = useRef(0)
  useFrame(({ clock }) => {
    frameCount.current++
    if (frameCount.current % 2 !== 0) return
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    const time = clock.getElapsedTime()

    for (let i = 0; i < particleCount; i++) {
      const freqIndex = Math.floor((i / particleCount) * analyserData.frequency.length)
      const freqValue = (analyserData.frequency[freqIndex] || 0) / 255

      const theta = (i / particleCount) * Math.PI * 2 + time * 0.2
      const phi = ((i % 100) / 100) * Math.PI
      const baseR = 3 + ((i % 50) / 50) * 2
      const r = baseR + freqValue * sensitivity * 3

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + Math.sin(time + i * 0.01) * 0.3
      positions[i * 3 + 2] = r * Math.cos(phi)
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.rotation.y = time * 0.1
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </points>
  )
})

const CymaticVisualizer = memo(function CymaticVisualizer({
  analyserData,
  sensitivity,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const frameCount = useRef(0)
  useFrame(({ clock }) => {
    frameCount.current++
    if (frameCount.current % 2 !== 0) return
    if (!meshRef.current) return

    const geometry = meshRef.current.geometry as THREE.PlaneGeometry
    const positions = geometry.attributes.position.array as Float32Array
    const time = clock.getElapsedTime()

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const dist = Math.sqrt(x * x + y * y)
      const freqIndex = Math.floor((dist / 7) * analyserData.frequency.length)
      const freqValue = (analyserData.frequency[freqIndex] || 0) / 255

      positions[i + 2] = Math.sin(dist * 2 - time * 3) * freqValue * sensitivity * 2
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
    meshRef.current.rotation.z = time * 0.1
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[10, 10, 32, 32]} />
      <meshStandardMaterial
        color="#8b5cf6"
        emissive="#4c1d95"
        emissiveIntensity={0.5}
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  )
})

const TunnelVisualizer = memo(function TunnelVisualizer({
  analyserData,
  sensitivity,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const ringCount = 12

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const time = clock.getElapsedTime()

    groupRef.current.children.forEach((ring: THREE.Object3D, i: number) => {
      const freqIndex = Math.floor((i / ringCount) * analyserData.frequency.length)
      const freqValue = (analyserData.frequency[freqIndex] || 0) / 255

      const scale = 1 + freqValue * sensitivity * 0.5
      ring.scale.set(scale, scale, 1)
      ring.position.z = -i * 0.8 + ((time * 2) % (ringCount * 0.8))
      ring.rotation.z = time * 0.5 + i * 0.1

      if (ring.position.z > 2) {
        ring.position.z -= ringCount * 0.8
      }
    })
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: ringCount }).map((_, i) => (
        <mesh key={i} position={[0, 0, -i * 0.8]}>
          <torusGeometry args={[2 + i * 0.1, 0.02, 8, 32]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#8b5cf6" : "#06b6d4"} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
})

const WaveformVisualizer = memo(function WaveformVisualizer({
  analyserData,
  sensitivity,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number }) {
  const lineRef = useRef<THREE.Line>(null)
  const pointCount = 128

  const positions = useMemo(() => new Float32Array(pointCount * 3), [])

  useFrame(() => {
    if (!lineRef.current) return

    for (let i = 0; i < pointCount; i++) {
      const x = (i / pointCount) * 10 - 5
      const waveIndex = Math.floor((i / pointCount) * analyserData.timeDomain.length)
      const waveValue = ((analyserData.timeDomain[waveIndex] || 128) - 128) / 128

      positions[i * 3] = x
      positions[i * 3 + 1] = waveValue * sensitivity * 3
      positions[i * 3 + 2] = 0
    }

    lineRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <line ref={lineRef as any}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={pointCount} array={positions} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#06b6d4" linewidth={2} />
    </line>
  )
})

const Scene = memo(function Scene({ analyserData, musicObject }: VisualizerProps) {
  const sensitivity = musicObject.visualSensitivity

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#8b5cf6" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />

      {musicObject.visualizerMode === "particles" && (
        <ParticleVisualizer analyserData={analyserData} sensitivity={sensitivity} />
      )}
      {musicObject.visualizerMode === "cymatic" && (
        <CymaticVisualizer analyserData={analyserData} sensitivity={sensitivity} />
      )}
      {musicObject.visualizerMode === "tunnel" && (
        <TunnelVisualizer analyserData={analyserData} sensitivity={sensitivity} />
      )}
      {musicObject.visualizerMode === "waveform" && (
        <WaveformVisualizer analyserData={analyserData} sensitivity={sensitivity} />
      )}
    </>
  )
})

export function ThreeVisualizer({ analyserData, musicObject }: VisualizerProps) {
  const [isInteracting, setIsInteracting] = useState(false)

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Canvas dpr={[1, 1.5]} performance={{ min: 0.5 }} style={{ touchAction: "none" }}>
        <PerspectiveCamera makeDefault position={[0, 3, 8]} />
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          autoRotate={false}
          minDistance={2}
          maxDistance={50}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={1.0}
          zoomSpeed={1.2}
          panSpeed={0.8}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          onStart={() => setIsInteracting(true)}
          onEnd={() => setIsInteracting(false)}
        />
        <Scene analyserData={analyserData} musicObject={musicObject} />
        <Grid
          position={[0, -3, 0]}
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1e1b4b"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#4c1d95"
          fadeDistance={40}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
        <fog attach="fog" args={["#0f0f23", 10, 60]} />
      </Canvas>
      {!isInteracting && (
        <div className="absolute bottom-4 left-4 text-xs text-white/40 pointer-events-none space-y-1">
          <p>Drag to rotate</p>
          <p>Scroll to zoom</p>
          <p>Right-drag to pan</p>
        </div>
      )}
    </div>
  )
}
