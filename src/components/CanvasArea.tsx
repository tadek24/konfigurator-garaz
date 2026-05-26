"use client";

import { Canvas } from '@react-three/fiber';
import { CameraControls, ContactShadows, Environment, Sky } from '@react-three/drei';
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

// Simple procedural trees for outdoor scenery
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.7, 12, 12]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#3a6b2a" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Bush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshStandardMaterial color="#3a6b2a" roughness={0.85} />
      </mesh>
      <mesh position={[0.25, 0.2, 0.1]} castShadow>
        <sphereGeometry args={[0.25, 10, 10]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.85} />
      </mesh>
    </group>
  );
}

export default function CanvasArea({ config, selectedWall }: CanvasAreaProps) {
  return (
    <Canvas
      camera={{ position: [5, 3, 7], fov: 50 }}
      shadows
      className="w-full h-full"
    >
      {/* Sky backdrop */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.52}
        azimuth={0.25}
        rayleigh={0.5}
      />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />
      
      {/* HDRI Environment for metallic reflections */}
      <Environment preset="park" />

      <Suspense fallback={null}>
        <GarageModel config={config} />
      </Suspense>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.6}
        scale={40}
        blur={2.5}
        far={6}
      />
      
      {/* Concrete Driveway / Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#b0a89a" roughness={0.85} metalness={0.05} />
      </mesh>
      
      {/* Grass field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.04, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#4a7a3a" roughness={0.95} />
      </mesh>

      {/* Outdoor scenery - trees */}
      <Tree position={[-8, 0, -5]} />
      <Tree position={[-10, 0, 2]} />
      <Tree position={[9, 0, -3]} />
      <Tree position={[7, 0, 6]} />
      <Tree position={[-6, 0, 8]} />
      <Tree position={[12, 0, -7]} />
      <Tree position={[-12, 0, -8]} />

      {/* Bushes */}
      <Bush position={[-4, 0, -6]} />
      <Bush position={[5, 0, -5]} />
      <Bush position={[-7, 0, 4]} />
      <Bush position={[8, 0, 3]} />

      <CameraRig selectedWall={selectedWall} config={config} />
    </Canvas>
  );
}
