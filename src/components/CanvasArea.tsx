"use client";

import { Canvas } from '@react-three/fiber';
import { CameraControls, ContactShadows, Environment } from '@react-three/drei';
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

// export default function CanvasArea({ config, selectedWall }: CanvasAreaProps) {
//   return (
//     <Canvas
//       camera={{ position: [5, 3, 7], fov: 50 }}
//       shadows
//       className="w-full h-full"
//     >

export default function CanvasArea({ config, selectedWall }: CanvasAreaProps) {
  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true }} // <--- TO POZWOLI ZROBIĆ ZDJĘCIE DO KOSZYKA
      camera={{ position: [5, 3, 7], fov: 50 }}
      shadows
      className="w-full h-full"
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.8}
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
      
      {/* HDRI TYLKO jako źródło refleksów (bez parametru background!) */}
      <Environment preset="city" />

      <Suspense fallback={null}>
        <GarageModel config={config} />
      </Suspense>

      {/* Contact shadows under the garage */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.65}
        scale={40}
        blur={2.5}
        far={6}
      />
      
      {/* Concrete driveway / floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#9a9488" roughness={0.92} metalness={0.02} />
      </mesh>

      <CameraRig selectedWall={selectedWall} config={config} />
    </Canvas>
  );
}
