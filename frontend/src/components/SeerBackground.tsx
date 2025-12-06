'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

function ParticleField() {
  const ref = useRef<THREE.Points>(null)
  const particleCount = 4000
  
  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 20 + Math.random() * 30 // Radius
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    return positions
  }, [particleCount])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.05
      ref.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1
    }
  })

  return (
    <Points key={particleCount} ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#f2c35c"
        size={0.2}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  )
}

function InnerSphere() {
  const ref = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = -state.clock.getElapsedTime() * 0.1
      ref.current.rotation.z = state.clock.getElapsedTime() * 0.05
    }
  })

  return (
    <mesh ref={ref} scale={[15, 15, 15]}>
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial 
        color="#7fd8ff" 
        wireframe 
        transparent 
        opacity={0.15} 
      />
    </mesh>
  )
}

export function SeerBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-canvas">
      <Canvas camera={{ position: [0, 0, 40], fov: 60 }}>
        <color attach="background" args={['#050507']} />
        <fog attach="fog" args={['#050507', 20, 60]} />
        <ParticleField />
        <InnerSphere />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-canvas via-transparent to-canvas opacity-40" />
    </div>
  )
}



