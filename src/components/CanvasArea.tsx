"use client";

import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { GarageConfig } from '@/types';
import GarageModel from './GarageModel';
import { Suspense } from 'react';

interface CanvasAreaProps {
  config: GarageConfig;
}

export default function CanvasArea({ config }: CanvasAreaProps) {
  return (
    <Canvas
      camera={{ position: [5, 3, 7], fov: 50 }}
      shadows
      className="w-full h-full"
    >
      <color attach="background" args={['#18181b']} /> {/* zinc-900 */}
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Environment preset="city" />

      {/* 3D Model */}
      <Suspense fallback={null}>
        <GarageModel config={config} />
      </Suspense>

      {/* Shadows and Ground */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.6}
        scale={20}
        blur={2}
        far={4.5}
      />
      
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#27272a" /> {/* zinc-800 */}
      </mesh>

      <OrbitControls
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enablePan={false}
        minDistance={3}
        maxDistance={15}
      />
    </Canvas>
  );
}
