"use client";

import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GarageConfig, WallFace } from '@/types';
import GarageModel from './GarageModel';
import { Suspense, useEffect, useRef } from 'react';

interface CanvasAreaProps {
  config: GarageConfig;
  selectedWall: WallFace;
}

function CameraRig({ selectedWall, config }: { selectedWall: WallFace; config: GarageConfig }) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    
    const w = config.width * 0.01;
    const l = config.length * 0.01;
    const h = config.height * 0.01;
    
    let targetX = 0;
    let targetZ = 0;
    
    let camX = 0;
    let camZ = 0;
    const dist = Math.max(w, l) + 4;

    switch (selectedWall) {
      case 'front':
        targetZ = l / 2;
        camZ = l / 2 + dist;
        break;
      case 'back':
        targetZ = -l / 2;
        camZ = -l / 2 - dist;
        break;
      case 'left':
        targetX = -w / 2;
        camX = -w / 2 - dist;
        break;
      case 'right':
        targetX = w / 2;
        camX = w / 2 + dist;
        break;
    }

    // Smoothly transition camera
    controlsRef.current.setLookAt(camX, h / 2 + 1, camZ, targetX, h / 2, targetZ, true);
    
  }, [selectedWall, config.width, config.length, config.height]);

  return (
    <CameraControls
      ref={controlsRef}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={3}
      maxDistance={25}
      makeDefault
    />
  );
}

export default function CanvasArea({ config, selectedWall }: CanvasAreaProps) {
  return (
    <Canvas
      camera={{ position: [5, 3, 7], fov: 50 }}
      shadows
      className="w-full h-full"
    >
      {/* Sky / Environment Sphere Backdrop */}
      <mesh>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial color="#1e1e24" side={THREE.BackSide} />
      </mesh>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      
      {/* Studio / City Environment for realistic metallic reflections */}
      <Environment preset="city" />

      <Suspense fallback={null}>
        <GarageModel config={config} />
      </Suspense>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.8}
        scale={40}
        blur={2}
        far={5}
      />
      
      {/* Concrete Driveway / Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} metalness={0.1} />
      </mesh>
      
      {/* Distant Ground Context */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1f1f22" roughness={1} />
      </mesh>

      <CameraRig selectedWall={selectedWall} config={config} />
    </Canvas>
  );
}
