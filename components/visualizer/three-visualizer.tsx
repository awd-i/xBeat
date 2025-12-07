"use client"

import { useRef, useMemo, memo, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Grid, Stars } from "@react-three/drei"
import * as THREE from "three"
import type { MusicObject } from "@/lib/types"

interface VisualizerProps {
  analyserData: {
    frequency: Uint8Array
    timeDomain: Uint8Array
  }
  musicObject: MusicObject
}

// Color scheme definitions
const colorSchemes = {
  cyberpunk: { primary: "#8b5cf6", secondary: "#06b6d4", primaryRGB: [0.545, 0.361, 0.965], secondaryRGB: [0.024, 0.714, 0.831] },
  neon: { primary: "#22c55e", secondary: "#eab308", primaryRGB: [0.133, 0.773, 0.369], secondaryRGB: [0.918, 0.702, 0.031] },
  monochrome: { primary: "#ffffff", secondary: "#6b7280", primaryRGB: [1, 1, 1], secondaryRGB: [0.420, 0.447, 0.502] },
  fire: { primary: "#f97316", secondary: "#ef4444", primaryRGB: [0.976, 0.451, 0.086], secondaryRGB: [0.937, 0.267, 0.267] },
}

const ParticleVisualizer = memo(function ParticleVisualizer({
  analyserData,
  sensitivity,
  colorScheme,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number; colorScheme: MusicObject["colorScheme"] }) {
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
    const scheme = colorSchemes[colorScheme]
    const cols = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount
      cols[i * 3] = scheme.primaryRGB[0] * (1 - t) + scheme.secondaryRGB[0] * t
      cols[i * 3 + 1] = scheme.primaryRGB[1] * (1 - t) + scheme.secondaryRGB[1] * t
      cols[i * 3 + 2] = scheme.primaryRGB[2] * (1 - t) + scheme.secondaryRGB[2] * t
    }
    return cols
  }, [colorScheme])

  const frameCount = useRef(0)
  const prevColorScheme = useRef(colorScheme)
  
  useFrame(({ clock }) => {
    frameCount.current++
    if (frameCount.current % 2 !== 0) return
    if (!pointsRef.current) return

    // Update colors if scheme changed
    if (prevColorScheme.current !== colorScheme) {
      const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute
      colorAttr.array = colors
      colorAttr.needsUpdate = true
      prevColorScheme.current = colorScheme
    }

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
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.1} vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </points>
  )
})

const CymaticVisualizer = memo(function CymaticVisualizer({
  analyserData,
  sensitivity,
  colorScheme,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number; colorScheme: MusicObject["colorScheme"] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const scheme = colorSchemes[colorScheme]

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
        color={scheme.primary}
        emissive={scheme.primary}
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
  colorScheme,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number; colorScheme: MusicObject["colorScheme"] }) {
  const scheme = colorSchemes[colorScheme]
  const groupRef = useRef<THREE.Group>(null)
  const ringCount = 12

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const time = clock.getElapsedTime()

    groupRef.current.children.forEach((ring, i) => {
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
          <meshBasicMaterial color={i % 2 === 0 ? scheme.primary : scheme.secondary} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
})

const WaveformVisualizer = memo(function WaveformVisualizer({
  analyserData,
  sensitivity,
  colorScheme,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number; colorScheme: MusicObject["colorScheme"] }) {
  const scheme = colorSchemes[colorScheme]
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
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={pointCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={scheme.secondary} linewidth={2} />
    </line>
  )
})

const GrokLogoVisualizer = memo(function GrokLogoVisualizer({
  analyserData,
  sensitivity,
  colorScheme,
}: { analyserData: VisualizerProps["analyserData"]; sensitivity: number; colorScheme: MusicObject["colorScheme"] }) {
  const groupRef = useRef<THREE.Group>(null)
  const ringsRef = useRef<THREE.Group>(null)
  const gLetterRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const scheme = colorSchemes[colorScheme]

  // Create orbital particles for ring systems
  const particleCount = 300
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const ringIndex = i % 3
      const radius = 3.5 + ringIndex * 0.8 + Math.random() * 0.3
      const height = (Math.random() - 0.5) * 0.2
      
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.3 // Flatten to match tilted perspective
    }
    return positions
  }, [])

  const particleColors = useMemo(() => {
    const colors = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const t = (i % 100) / 100
      colors[i * 3] = scheme.primaryRGB[0] * (1 - t) + scheme.secondaryRGB[0] * t
      colors[i * 3 + 1] = scheme.primaryRGB[1] * (1 - t) + scheme.secondaryRGB[1] * t
      colors[i * 3 + 2] = scheme.primaryRGB[2] * (1 - t) + scheme.secondaryRGB[2] * t
    }
    return colors
  }, [scheme])

  useFrame(({ clock }) => {
    if (!groupRef.current || !ringsRef.current || !gLetterRef.current || !particlesRef.current) return

    const time = clock.getElapsedTime()
    
    // Calculate frequency bands
    const bassFreq = analyserData.frequency.slice(0, 32).reduce((sum, val) => sum + val, 0) / 32 / 255
    const midFreq = analyserData.frequency.slice(32, 96).reduce((sum, val) => sum + val, 0) / 64 / 255
    const highFreq = analyserData.frequency.slice(96).reduce((sum, val) => sum + val, 0) / 64 / 255

    // Animate rings with different frequencies
    ringsRef.current.children.forEach((ring, i) => {
      const freqInfluence = i === 0 ? bassFreq : i === 1 ? midFreq : highFreq
      const scale = 1 + freqInfluence * sensitivity * 0.2
      ring.scale.setScalar(scale)
      ring.rotation.z = time * (0.3 + freqInfluence * 1.5) * (i % 2 === 0 ? 1 : -1)
    })

    // G letter glow and scale
    const gScale = 1 + bassFreq * sensitivity * 0.15
    gLetterRef.current.scale.setScalar(gScale)
    
    gLetterRef.current.children.forEach((part) => {
      if (part.material && 'emissiveIntensity' in part.material) {
        (part.material as any).emissiveIntensity = 0.4 + highFreq * sensitivity * 0.6
      }
    })

    // Update orbital particles
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < particleCount; i++) {
      const baseAngle = (i / particleCount) * Math.PI * 2
      const ringIndex = i % 3
      const freqMod = ringIndex === 0 ? bassFreq : ringIndex === 1 ? midFreq : highFreq
      
      const angle = baseAngle + time * (0.4 + freqMod) * (ringIndex % 2 === 0 ? 1 : -1)
      const radius = 3.5 + ringIndex * 0.8 + Math.sin(time * 2 + i * 0.1) * 0.2 + freqMod * 0.5
      const height = Math.sin(time + i * 0.05) * 0.1 + freqMod * 0.3
      
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.3
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true

    // Overall rotation and tilt to match image perspective
    groupRef.current.rotation.y = time * 0.1
    groupRef.current.rotation.x = Math.PI * 0.15 + Math.sin(time * 0.5) * 0.1
  })

  return (
    <group ref={groupRef}>
      {/* Multiple Saturn-like Rings */}
      <group ref={ringsRef} rotation={[Math.PI * 0.15, 0, 0]}>
        {/* Outer ring - largest */}
        <mesh>
          <torusGeometry args={[4.2, 0.08, 12, 64]} />
          <meshStandardMaterial 
            color={scheme.primary}
            emissive={scheme.primary}
            emissiveIntensity={0.2}
            transparent
            opacity={0.6}
          />
        </mesh>
        
        {/* Middle ring */}
        <mesh>
          <torusGeometry args={[3.6, 0.12, 16, 64]} />
          <meshStandardMaterial 
            color={scheme.secondary}
            emissive={scheme.secondary}
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {/* Inner ring */}
        <mesh>
          <torusGeometry args={[3.0, 0.15, 16, 64]} />
          <meshStandardMaterial 
            color={scheme.primary}
            emissive={scheme.primary}
            emissiveIntensity={0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>

      {/* Grok Logo - Circle with diagonal slash */}
      <group ref={gLetterRef}>
        {/* Main circle ring */}
        <mesh>
          <torusGeometry args={[1.8, 0.25, 16, 64]} />
          <meshStandardMaterial 
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.95}
          />
        </mesh>
        
      </group>

      {/* Orbital Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={particlePositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={particleCount} array={particleColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.03} 
          vertexColors 
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Central dark sphere - black hole effect */}
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial 
          color="#000000"
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[1.1, 16, 16]} />
        <meshBasicMaterial 
          color={scheme.primary}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
})

const Scene = memo(function Scene({ analyserData, musicObject }: VisualizerProps) {
  const sensitivity = musicObject.visualSensitivity ?? 1
  const mode = musicObject.visualizerMode ?? "particles"
  const colorScheme = musicObject.colorScheme ?? "cyberpunk"
  const scheme = colorSchemes[colorScheme]

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color={scheme.primary} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={scheme.secondary} />

      {mode === "particles" && <ParticleVisualizer analyserData={analyserData} sensitivity={sensitivity} colorScheme={colorScheme} />}
      {mode === "cymatic" && <CymaticVisualizer analyserData={analyserData} sensitivity={sensitivity} colorScheme={colorScheme} />}
      {mode === "tunnel" && <TunnelVisualizer analyserData={analyserData} sensitivity={sensitivity} colorScheme={colorScheme} />}
      {mode === "waveform" && <WaveformVisualizer analyserData={analyserData} sensitivity={sensitivity} colorScheme={colorScheme} />}
      {mode === "grok" && <GrokLogoVisualizer analyserData={analyserData} sensitivity={sensitivity} colorScheme={colorScheme} />}
    </>
  )
})

export function ThreeVisualizer({ analyserData, musicObject }: VisualizerProps) {
  const [isInteracting, setIsInteracting] = useState(false)

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Canvas dpr={[1, 1.5]} performance={{ min: 0.5 }} style={{ touchAction: "none" }}>
        <PerspectiveCamera makeDefault position={[0, 5, 12]} />
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
