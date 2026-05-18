"use client";

import { useRef } from 'react';
import { GarageConfig } from '@/types';
import * as THREE from 'three';

interface GarageModelProps {
  config: GarageConfig;
}

export default function GarageModel({ config }: GarageModelProps) {
  const w = config.width * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
  const t = 0.05; // wall thickness

  const slopeHeight = 0.3; // Height difference for slope back roof
  const dualSlopeHeight = 0.5; // Peak height for dual slope

  // Door calculations
  const doorW = Math.min(w * 0.8, 2.5);
  const doorH = Math.min(h * 0.85, 2.2);

  // Group reference for animation if needed later
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} castShadow receiveShadow>
      {/* LEFT WALL */}
      <mesh position={[-w / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, l]} />
        <meshStandardMaterial color={config.wallColor} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* RIGHT WALL */}
      <mesh position={[w / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, l]} />
        <meshStandardMaterial color={config.wallColor} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* BACK WALL */}
      <mesh position={[0, h / 2, -l / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={config.wallColor} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* FRONT WALL - composed of 3 parts around the door to make it hollow, or a full box if simple overlay. Let's do full box and overlay door. */}
      <mesh position={[0, h / 2, l / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={config.wallColor} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* DOOR OVERLAY */}
      <group position={[0, doorH / 2, l / 2 + t / 2 + 0.01]}>
        {config.doorType === 'swing' ? (
          <>
            {/* Left Door */}
            <mesh position={[-doorW / 4, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[doorW / 2 - 0.02, doorH, 0.04]} />
              <meshStandardMaterial color={config.doorColor} roughness={0.7} metalness={0.3} />
            </mesh>
            {/* Right Door */}
            <mesh position={[doorW / 4, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[doorW / 2 - 0.02, doorH, 0.04]} />
              <meshStandardMaterial color={config.doorColor} roughness={0.7} metalness={0.3} />
            </mesh>
          </>
        ) : (
          /* Up-and-over door */
          <mesh castShadow receiveShadow>
            <boxGeometry args={[doorW, doorH, 0.04]} />
            <meshStandardMaterial color={config.doorColor} roughness={0.7} metalness={0.3} />
            {/* Add some horizontal grooves for realism */}
            {[...Array(5)].map((_, i) => (
              <mesh key={i} position={[0, (doorH / 6) * (i - 2), 0.02]}>
                <boxGeometry args={[doorW, 0.02, 0.01]} />
                <meshStandardMaterial color="#000000" opacity={0.2} transparent />
              </mesh>
            ))}
          </mesh>
        )}
      </group>

      {/* ROOF */}
      {config.roofType === 'slope-back' ? (
        <group position={[0, h, 0]}>
          <mesh position={[0, 0, 0]} rotation={[Math.atan(slopeHeight / l), 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.2, t * 2, l + 0.4]} />
            <meshStandardMaterial color={config.roofColor} roughness={0.6} metalness={0.4} />
          </mesh>
          {/* Fills the side triangles manually or ignore for a stylized look. We'll leave as simple planes. */}
        </group>
      ) : (
        <group position={[0, h, 0]}>
          {/* Left Slope */}
          <mesh position={[-w / 4, dualSlopeHeight / 2, 0]} rotation={[0, 0, Math.atan((dualSlopeHeight * 2) / w)]} castShadow receiveShadow>
            <boxGeometry args={[w / 2 + 0.2, t * 2, l + 0.4]} />
            <meshStandardMaterial color={config.roofColor} roughness={0.6} metalness={0.4} />
          </mesh>
          {/* Right Slope */}
          <mesh position={[w / 4, dualSlopeHeight / 2, 0]} rotation={[0, 0, -Math.atan((dualSlopeHeight * 2) / w)]} castShadow receiveShadow>
            <boxGeometry args={[w / 2 + 0.2, t * 2, l + 0.4]} />
            <meshStandardMaterial color={config.roofColor} roughness={0.6} metalness={0.4} />
          </mesh>
          {/* Front Triangle Fill */}
          <mesh position={[0, dualSlopeHeight / 2, l / 2]} castShadow receiveShadow>
            {/* A simple plane or box scaled down, for now use a scaled box */}
            <boxGeometry args={[w, dualSlopeHeight, t]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.8} metalness={0.2} />
          </mesh>
          {/* Back Triangle Fill */}
          <mesh position={[0, dualSlopeHeight / 2, -l / 2]} castShadow receiveShadow>
            <boxGeometry args={[w, dualSlopeHeight, t]} />
            <meshStandardMaterial color={config.wallColor} roughness={0.8} metalness={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}
