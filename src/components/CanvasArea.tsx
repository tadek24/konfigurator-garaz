"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { GarageConfig, WallFace } from '@/types';
import GarageModel from './GarageModel';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CanvasAreaProps {
  config: GarageConfig;
  selectedWall: WallFace;
}

function CameraRig({ selectedWall, config }: { selectedWall: WallFace; config: GarageConfig }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    
    const w = config.width * 0.01;
    const l = config.length * 0.01;
    const h = config.height * 0.01;
    
    // Determine target position (center of the wall)
    let targetX = 0;
    let targetZ = 0;
    
    // Determine camera position (in front of the wall)
    let camX = 0;
    let camZ = 0;
    const dist = Math.max(w, l) + 3;

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

    // Animate to new position
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(camX, h / 2 + 1, camZ);
    
    const startTarget = controlsRef.current.target.clone();
    const endTarget = new THREE.Vector3(targetX, h / 2, targetZ);

    let t = 0;
    const animate = () => {
      t += 0.05;
      if (t > 1) t = 1;
      
      // Easing function
      const ease = 1 - Math.pow(1 - t, 3);
      
      camera.position.lerpVectors(startPos, endPos, ease);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, ease);
      controlsRef.current.update();

      if (t < 1) requestAnimationFrame(animate);
    };
    
    animate();
    
  }, [selectedWall, config.width, config.length, config.height, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2 - 0.05}
      enablePan={true}
      minDistance={3}
      maxDistance={20}
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
      <color attach="background" args={['#18181b']} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <Environment preset="city" />

      <Suspense fallback={null}>
        <GarageModel config={config} />
      </Suspense>

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.7}
        scale={25}
        blur={2}
        far={5}
      />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#27272a" roughness={1} />
      </mesh>

      <CameraRig selectedWall={selectedWall} config={config} />
    </Canvas>
  );
}
