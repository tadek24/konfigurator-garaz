"use client";

import { useMemo, useRef } from 'react';
import { GarageConfig, WallFace } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';

interface GarageModelProps {
  config: GarageConfig;
}

// Procedural texture generation for metal / wood
function createTexture(type: 'standard' | 'golden-oak'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (type === 'standard') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#f0f0f0';
      for (let i = 0; i < 512; i += 32) {
        ctx.fillRect(i, 0, 16, 512);
      }
    } else {
      // wood pattern
      ctx.fillStyle = '#d49a57';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#b67a3d';
      for (let i = 0; i < 512; i += 4) {
        if (Math.random() > 0.5) ctx.fillRect(0, i, 512, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export default function GarageModel({ config }: GarageModelProps) {
  const w = config.width * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
  const t = 0.05; // wall thickness

  // Materials
  const textures = useMemo(() => ({
    standard: createTexture('standard'),
    wood: createTexture('golden-oak'),
  }), []);

  const baseMaterialProps = {
    roughness: config.finish === 'golden-oak' ? 0.9 : 0.6,
    metalness: config.finish === 'golden-oak' ? 0.1 : 0.5,
    map: config.finish === 'golden-oak' ? textures.wood : textures.standard,
  };

  const wallMat = <meshStandardMaterial color={config.finish === 'golden-oak' ? '#ffffff' : config.wallColor} {...baseMaterialProps} />;
  const roofMat = <meshStandardMaterial color={config.finish === 'golden-oak' ? '#ffffff' : config.roofColor} {...baseMaterialProps} />;
  const doorMat = <meshStandardMaterial color={config.finish === 'golden-oak' ? '#ffffff' : config.doorColor} {...baseMaterialProps} />;

  // Helper to get element subtractions
  const getSubtractions = (wall: WallFace, offsetZ: number = 0) => {
    return config.elements.filter(e => e.wall === wall).map((el, i) => (
      <Subtraction key={i} position={[el.x * 0.01, el.y * 0.01 + (el.height * 0.01) / 2 - h / 2, offsetZ]}>
        <boxGeometry args={[el.width * 0.01, el.height * 0.01, t * 4]} />
      </Subtraction>
    ));
  };

  // Helper to render doors/windows meshes into the holes
  const renderElements = (wall: WallFace, wallGroupPos: [number, number, number], rotationY: number) => {
    return (
      <group position={wallGroupPos} rotation={[0, rotationY, 0]}>
        {config.elements.filter(e => e.wall === wall).map((el) => {
          const elW = el.width * 0.01;
          const elH = el.height * 0.01;
          const elY = el.y * 0.01 + elH / 2;

          if (el.type === 'window') {
            return (
              <group key={el.id} position={[el.x * 0.01, elY, 0]}>
                <mesh>
                  <boxGeometry args={[elW, elH, t - 0.01]} />
                  <meshStandardMaterial color="#222222" opacity={0.6} transparent roughness={0.1} metalness={0.9} />
                </mesh>
                {/* Window frame cross */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[elW, 0.02, t + 0.02]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.02, elH, t + 0.02]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
              </group>
            );
          } else {
            // Door or Gate
            return (
              <mesh key={el.id} position={[el.x * 0.01, elY, 0]}>
                <boxGeometry args={[elW, elH, t + 0.01]} />
                {doorMat}
              </mesh>
            );
          }
        })}
      </group>
    );
  };

  // Roof logic
  const renderRoof = () => {
    const slopeH = 0.4;
    const rT = config.roofType;

    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.8} />;
    
    // Default dual-slope
    if (rT === 'dual-slope') {
      return (
        <group position={[0, h, 0]}>
          <mesh position={[-w / 4, slopeH / 2, 0]} rotation={[0, 0, Math.atan((slopeH * 2) / w)]} castShadow receiveShadow>
            <boxGeometry args={[w / 2 + 0.2, t, l + 0.4]} />
            {roofMat}
          </mesh>
          <mesh position={[w / 4, slopeH / 2, 0]} rotation={[0, 0, -Math.atan((slopeH * 2) / w)]} castShadow receiveShadow>
            <boxGeometry args={[w / 2 + 0.2, t, l + 0.4]} />
            {roofMat}
          </mesh>
          {/* Gutters */}
          {config.gutters && (
            <>
              <mesh position={[-w / 2 - 0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, l + 0.4]} />{gutterMat}</mesh>
              <mesh position={[w / 2 + 0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, l + 0.4]} />{gutterMat}</mesh>
            </>
          )}
        </group>
      );
    }
    
    // slope-back
    if (rT === 'slope-back') {
      return (
        <group position={[0, h, 0]}>
          <mesh position={[0, slopeH / 2, 0]} rotation={[Math.atan(slopeH / l), 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.4, t, l + 0.2]} />
            {roofMat}
          </mesh>
          {config.gutters && <mesh position={[0, 0, -l / 2 - 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, w + 0.4]} />{gutterMat}</mesh>}
        </group>
      );
    }

    // slope-front
    if (rT === 'slope-front') {
      return (
        <group position={[0, h, 0]}>
          <mesh position={[0, slopeH / 2, 0]} rotation={[-Math.atan(slopeH / l), 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.4, t, l + 0.2]} />
            {roofMat}
          </mesh>
          {config.gutters && <mesh position={[0, 0, l / 2 + 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, w + 0.4]} />{gutterMat}</mesh>}
        </group>
      );
    }

    // slope-left
    if (rT === 'slope-left') {
      return (
        <group position={[0, h, 0]}>
          <mesh position={[0, slopeH / 2, 0]} rotation={[0, 0, Math.atan(slopeH / w)]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.2, t, l + 0.4]} />
            {roofMat}
          </mesh>
          {config.gutters && <mesh position={[-w / 2 - 0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, l + 0.4]} />{gutterMat}</mesh>}
        </group>
      );
    }

    // slope-right
    if (rT === 'slope-right') {
      return (
        <group position={[0, h, 0]}>
          <mesh position={[0, slopeH / 2, 0]} rotation={[0, 0, -Math.atan(slopeH / w)]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.2, t, l + 0.4]} />
            {roofMat}
          </mesh>
          {config.gutters && <mesh position={[w / 2 + 0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, l + 0.4]} />{gutterMat}</mesh>}
        </group>
      );
    }

    // front-dual-slope
    if (rT === 'front-dual-slope') {
      return (
        <group position={[0, h, 0]}>
          <mesh position={[0, slopeH / 2, -l / 4]} rotation={[Math.atan((slopeH * 2) / l), 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.4, t, l / 2 + 0.2]} />
            {roofMat}
          </mesh>
          <mesh position={[0, slopeH / 2, l / 4]} rotation={[-Math.atan((slopeH * 2) / l), 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[w + 0.4, t, l / 2 + 0.2]} />
            {roofMat}
          </mesh>
          {config.gutters && (
            <>
              <mesh position={[0, 0, -l / 2 - 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, w + 0.4]} />{gutterMat}</mesh>
              <mesh position={[0, 0, l / 2 + 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, w + 0.4]} />{gutterMat}</mesh>
            </>
          )}
        </group>
      );
    }
  };

  return (
    <group castShadow receiveShadow>
      
      {/* Front Wall with Cutouts */}
      <mesh position={[0, h / 2, l / 2]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <boxGeometry args={[w, h, t]} />
          </Base>
          {getSubtractions('front')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('front', [0, 0, l / 2], 0)}

      {/* Back Wall with Cutouts */}
      <mesh position={[0, h / 2, -l / 2]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <boxGeometry args={[w, h, t]} />
          </Base>
          {getSubtractions('back')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('back', [0, 0, -l / 2], Math.PI)}

      {/* Left Wall with Cutouts */}
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <boxGeometry args={[l, h, t]} />
          </Base>
          {getSubtractions('left')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('left', [-w / 2, 0, 0], -Math.PI / 2)}

      {/* Right Wall with Cutouts */}
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <boxGeometry args={[l, h, t]} />
          </Base>
          {getSubtractions('right')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('right', [w / 2, 0, 0], Math.PI / 2)}

      {/* Roof */}
      {renderRoof()}
      
    </group>
  );
}
