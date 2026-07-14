"use client";

import { useMemo, useState, useEffect } from 'react';
import { GarageConfig } from '@/types';
import * as THREE from 'three';
import { Environment, ContactShadows, useTexture } from '@react-three/drei';

interface CarportModelProps {
  config: GarageConfig;
  colors?: any[];
}

function resolveColor(colorId: string | undefined, colors: any[] = []): { hex: string; isWood: boolean; textureUrl: string } {
  if (!colorId) return { hex: '#d4d4d4', isWood: false, textureUrl: '' };
  if (colorId.startsWith('#')) return { hex: colorId, isWood: false, textureUrl: '' };
  const found = (colors || []).find((c: any) => c.id === colorId);
  if (!found) return { hex: '#d4d4d4', isWood: false, textureUrl: '' };
  return {
    hex: found.hex || '#d4d4d4',
    isWood: found.type === 'drewno',
    textureUrl: found.texture || '',
  };
}

export default function CarportModel({ config, colors = [] }: CarportModelProps) {
  // Wymiary w metrach
  const w = config.width / 100;
  const l = config.length / 100;
  const h = config.height / 100;

  const t = 0.05; // grubość dachu
  const slopeH = 0.4; // wysokość spadu dachu

  const [trapezTex] = useTexture(['/textures/trapez.jpg']);
  const [woodNormal] = useTexture(['/textures/drewno-normal.jpg']);

  const [dynamicWoodColor, setDynamicWoodColor] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const wallColorData = colors.find((c: any) => c.id === config.wallColor);
    if (wallColorData && wallColorData.type === 'drewno' && wallColorData.texture) {
      const loader = new THREE.TextureLoader();
      loader.load(wallColorData.texture, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(2, 2);
        setDynamicWoodColor(tex);
      });
    } else {
      setDynamicWoodColor(null);
    }
  }, [colors, config.wallColor]);

  const showGutters = config.extraOptions?.includes('gutters') ?? config.gutters;
  const showRoofFlashings = config.extraOptions?.includes('roofFlashings');

  const woodColor = dynamicWoodColor || trapezTex;

  // --- LOGIKA DACHU (skopiowana i uproszczona z GarageModel) ---
  const isDual = config.roofType === 'dual-slope';
  const isFront = config.roofType === 'slope-front';
  const isBack = config.roofType === 'slope-back';
  const isLeft = config.roofType === 'slope-left';
  const isRight = config.roofType === 'slope-right';

  const renderRoof = () => {
    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.6} metalness={0.55} />;
    const rL = l + 0.4; 
    const rW = w + 0.4; 

    const { hex: roofHex, isWood: isRoofWood } = resolveColor(config.roofColor, colors);
    const roofFasciaColor = roofHex;

    if (isDual) {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-rW / 2, 0); roofShape.lineTo(0, slopeH); roofShape.lineTo( rW / 2, 0);
      roofShape.lineTo( rW / 2, t); roofShape.lineTo(0, slopeH + t); roofShape.lineTo(-rW / 2, t);
      roofShape.closePath();
      return (
        <group position={[0, h, -rL / 2]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            <meshStandardMaterial attach="material-0" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} />
            <meshStandardMaterial attach="material-1"
              map={isRoofWood ? woodColor : trapezTex}
              normalMap={isRoofWood ? woodNormal : undefined}
              normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined}
              color={isRoofWood ? '#ffffff' : roofFasciaColor}
              roughness={isRoofWood ? 0.7 : 0.4}
              metalness={isRoofWood ? 0.0 : 0.6}
              envMapIntensity={1.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {showGutters && (
            <>
              <mesh position={[-rW / 2 + 0.1, t / 2, rL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[ rW / 2 - 0.1, t / 2, rL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[-rW / 2 + 0.1, -h / 2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
              <mesh position={[ rW / 2 - 0.1, -h / 2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
            </>
          )}
        </group>
      );
    }

    let roofRotX = 0, roofRotZ = 0;
    let gutterMesh = null;

    if (isFront) {
      roofRotX = Math.atan2(slopeH, l);
      gutterMesh = <mesh position={[0, -0.02, rL / 2]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.06, 0.06, rW]} />{gutterMat}</mesh>;
    } else if (isBack) {
      roofRotX = -Math.atan2(slopeH, l);
      gutterMesh = <mesh position={[0, -0.02, -rL / 2]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.06, 0.06, rW]} />{gutterMat}</mesh>;
    } else if (isLeft) {
      roofRotZ = Math.atan2(slopeH, w);
      gutterMesh = <mesh position={[-rW / 2, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, rL]} />{gutterMat}</mesh>;
    } else if (isRight) {
      roofRotZ = -Math.atan2(slopeH, w);
      gutterMesh = <mesh position={[rW / 2, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, rL]} />{gutterMat}</mesh>;
    }

    const zOffset = isFront ? -(t / 2) * Math.sin(roofRotX) : (isBack ? (t / 2) * Math.sin(Math.abs(roofRotX)) : 0);
    const xOffset = isLeft ? (t / 2) * Math.sin(roofRotZ) : (isRight ? -(t / 2) * Math.sin(Math.abs(roofRotZ)) : 0);

    return (
      <group>
        <mesh position={[xOffset, h + slopeH / 2 + t / 2, zOffset]} rotation={[roofRotX, 0, roofRotZ]} castShadow receiveShadow>
          <boxGeometry args={[rW, t, rL]} />
          <meshStandardMaterial attach="material-0" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} />
          <meshStandardMaterial attach="material-1" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} />
          <meshStandardMaterial attach="material-2" 
            map={isRoofWood ? woodColor : trapezTex}
            normalMap={isRoofWood ? woodNormal : undefined}
            normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isRoofWood ? '#ffffff' : roofFasciaColor}
            roughness={isRoofWood ? 0.7 : 0.4}
            metalness={isRoofWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
          />
          <meshStandardMaterial attach="material-3" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} />
          <meshStandardMaterial attach="material-4" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} />
          <meshStandardMaterial attach="material-5" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} />
          {showGutters && gutterMesh}
        </mesh>
      </group>
    );
  };

  // --- LOGIKA SŁUPÓW (Rozstawione co 1.5m) ---
  const { hex: wallHex, isWood: isWallWood } = resolveColor(config.wallColor, colors);
  const pillarMat = <meshStandardMaterial 
    color={isWallWood ? '#ffffff' : wallHex} 
    map={isWallWood ? woodColor : undefined}
    roughness={0.7} 
    metalness={isWallWood ? 0.0 : 0.4} 
  />;

  const pillarSize = 0.1; // 10x10 cm
  const pillarCount = Math.max(2, Math.ceil(l / 1.5) + 1);
  const zPositions = Array.from({ length: pillarCount }).map((_, i) => (l / 2) - i * (l / (pillarCount - 1)));

  // Wysokość słupów zależna od dachu (by dociąć do spadu)
  // W uproszczeniu, zróbmy słupy dochodzące do podstawy dachu (h) i dodajmy ew. skos
  const renderPillar = (x: number, z: number) => {
    // Oblicz wysokość w danym punkcie z w zależności od spadu
    let pillarH = h;
    if (isFront) {
      // przód wyżej, tył niżej?
      // w GarageModel slopeH to dodatek do tyłu/przodu.
      // u nas h to podstawa, a dach idzie od h do h+slopeH
      const progressZ = (z + l/2) / l; // od 0 do 1
      pillarH = h + progressZ * slopeH;
    } else if (isBack) {
      const progressZ = 1 - (z + l/2) / l; 
      pillarH = h + progressZ * slopeH;
    } else if (isLeft) {
      const progressX = (x + w/2) / w; 
      pillarH = h + progressX * slopeH;
    } else if (isRight) {
      const progressX = 1 - (x + w/2) / w; 
      pillarH = h + progressX * slopeH;
    } else if (isDual) {
      // na krawędziach bocznych (gdzie są słupy, wysokość to po prostu h)
      pillarH = h;
    }
    
    return (
      <mesh key={`pillar-${x}-${z}`} position={[x, pillarH / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[pillarSize, pillarH, pillarSize]} />
        {pillarMat}
      </mesh>
    );
  };

  return (
    <>
      <Environment preset="city" />
      <mesh scale={100}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#d1d5db" side={THREE.BackSide} />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[150, 150, '#3a3a3a', '#555555']} position={[0, -0.02, 0]} />

      <ContactShadows resolution={1024} scale={25} blur={2.5} opacity={0.7} far={10} color="#000000" position={[0, 0, 0]} />
      
      <group>
        {/* Generowanie słupów po lewej i prawej stronie */}
        {zPositions.map(z => (
          <group key={`pillars-z-${z}`}>
            {renderPillar(-w/2 + pillarSize/2, z)}
            {renderPillar(w/2 - pillarSize/2, z)}
          </group>
        ))}

        {renderRoof()}
      </group>
    </>
  );
}
