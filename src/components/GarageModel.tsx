"use client";

import { useMemo, useRef, ReactNode } from 'react';
import { GarageConfig, WallFace, GarageElement } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, useTexture } from '@react-three/drei';

interface GarageModelProps {
  config: GarageConfig;
}

// ── Brama Segmentowa ───────────────────────
const PANEL_COUNT = 5;

function SectionalGate({ el, woodColor, woodNormal, trapezTex, config }: { 
  el: GarageElement; 
  woodColor: THREE.Texture; 
  woodNormal: THREE.Texture; 
  trapezTex: THREE.Texture;
  config: GarageConfig;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(el.isOpen ? 1 : 0);

  const elW = el.width * 0.01;
  const elH = el.height * 0.01;
  const thick = 0.05;
  const panelH = elH / PANEL_COUNT;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = el.isOpen ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, delta * 3.0);
    const p = progress.current;

    const panels = groupRef.current.children;
    for (let i = 0; i < PANEL_COUNT; i++) {
      const panel = panels[i] as THREE.Group;
      if (!panel) continue;

      const startY = i * panelH + panelH / 2;
      const totalTravel = elH + 0.1; 
      const currentS = startY + p * totalTravel;
      const maxY = elH - panelH / 2;

      if (currentS <= maxY + 0.005) {
        panel.position.set(0, currentS, 0);
        panel.rotation.x = 0;
      } else {
        const overflow = currentS - maxY;
        panel.position.set(0, maxY, -overflow);
        panel.rotation.x = -Math.PI / 2;
        panel.position.y = elH - thick / 2;
      }
    }
  });

  const isWood = config.gateProfile === 'drewnopodobna';

  return (
    <group ref={groupRef} position={[el.x * 0.01, el.y * 0.01, 0]}>
      {Array.from({ length: PANEL_COUNT }, (_, i) => (
        <group key={i} position={[0, i * panelH + panelH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[elW - 0.02, panelH - 0.005, thick]} />
            <meshStandardMaterial
              map={isWood ? woodColor : trapezTex}
              normalMap={isWood ? woodNormal : undefined}
              normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined}
              color={isWood ? '#ffffff' : (config.gateProfile === 'ocynk' ? '#d4d4d4' : config.gateColor)}
              roughness={isWood ? 0.7 : 0.4}
              metalness={isWood ? 0.0 : 0.6}
              envMapIntensity={1.5}
            />
          </mesh>
          <mesh position={[0, -panelH / 2 + 0.003, thick / 2 + 0.003]}>
            <boxGeometry args={[elW - 0.04, 0.012, 0.007]} />
            <meshStandardMaterial color="#111" opacity={0.3} transparent />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Brama Uchylna i Dwuskrzydłowa ───────────────────────────────
function AnimatedGate({ el, woodColor, woodNormal, trapezTex, config }: { 
  el: GarageElement; 
  woodColor: THREE.Texture; 
  woodNormal: THREE.Texture; 
  trapezTex: THREE.Texture;
  config: GarageConfig;
}) {
  const ref = useRef<THREE.Group>(null);
  const elW = el.width * 0.01;
  const elH = el.height * 0.01;
  const thick = 0.05;
  const animState = useRef({ progress: el.isOpen ? 1 : 0 });

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = el.isOpen ? 1 : 0;
    animState.current.progress += (target - animState.current.progress) * Math.min(1, delta * 2.5);
    const phase = animState.current.progress;

    if (el.gateType === 'up-and-over') {
      const pivot = ref.current.children[0];
      if (pivot) pivot.rotation.x = phase * (Math.PI / 2); 
    } else if (el.gateType === 'swing') {
      const leftDoor  = ref.current.children[0];
      const rightDoor = ref.current.children[1];
      if (leftDoor)  leftDoor.rotation.y  =  phase * (Math.PI / 2);
      if (rightDoor) rightDoor.rotation.y = -phase * (Math.PI / 2);
    }
  });

  if (el.gateType === 'sectional') {
    return <SectionalGate el={el} woodColor={woodColor} woodNormal={woodNormal} trapezTex={trapezTex} config={config} />;
  }

  const isWood = config.gateProfile === 'drewnopodobna';

  const gateMatComponent = (
    <meshStandardMaterial
      map={isWood ? woodColor : trapezTex}
      normalMap={isWood ? woodNormal : undefined}
      normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined}
      color={isWood ? '#ffffff' : (config.gateProfile === 'ocynk' ? '#d4d4d4' : config.gateColor)}
      roughness={isWood ? 0.7 : 0.4}
      metalness={isWood ? 0.0 : 0.6}
      envMapIntensity={1.5}
    />
  );

  if (el.gateType === 'swing') {
    return (
      <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
        <group position={[-elW / 2, 0, 0]}>
          <mesh position={[elW / 4, elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />
            {gateMatComponent}
          </mesh>
          <group position={[elW / 2 - 0.1, elH / 2, thick / 2 + 0.025]}>
            <mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh>
            <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh>
          </group>
        </group>
        <group position={[elW / 2, 0, 0]}>
          <mesh position={[-elW / 4, elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />
            {gateMatComponent}
          </mesh>
          <group position={[-elW / 2 + 0.1, elH / 2, thick / 2 + 0.025]}>
            <mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh>
            <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh>
          </group>
        </group>
      </group>
    );
  }

  return (
    <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
      <group position={[0, elH, 0]}>
        <mesh position={[0, -elH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[elW - 0.02, elH - 0.02, thick]} />
          {gateMatComponent}
        </mesh>
        <group position={[0, -elH + 0.25, thick / 2 + 0.025]}>
            <mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh>
            <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh>
        </group>
      </group>
    </group>
  );
}

// ── Główny model Garażu ──────────────────────────────────────────────────────
export default function GarageModel({ config }: GarageModelProps) {
  const w = config.width * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
  const t = 0.05;     
  const slopeH = 0.4; 

  const [trapezTex, woodColor, woodNormal] = useTexture([
    '/textures/trapez.jpg',
    '/textures/drewno-color.jpg',
    '/textures/drewno-normal.jpg'
  ]);

  useMemo(() => {
    trapezTex.wrapS = trapezTex.wrapT = THREE.RepeatWrapping;
    trapezTex.repeat.set(4, 4);

    woodColor.wrapS = woodColor.wrapT = THREE.RepeatWrapping;
    woodNormal.wrapS = woodNormal.wrapT = THREE.RepeatWrapping;
    woodColor.repeat.set(2, 2);
    woodNormal.repeat.set(2, 2);
  }, [trapezTex, woodColor, woodNormal]);

  let hFL = h, hFR = h, hBL = h, hBR = h;
  let frontCenter: number | null = null;
  let backCenter:  number | null = null;
  
  const rt = String(config.roofType || '').toLowerCase();
  
  const isDual = rt.includes('dwuspadowy') || rt.includes('dual');
  const isFront = rt.includes('przód') || rt.includes('przod') || rt.includes('front');
  const isBack = rt.includes('tył') || rt.includes('tyl') || rt.includes('back') || rt.includes('rear');
  const isLeft = rt.includes('lewo') || rt.includes('left');
  const isRight = rt.includes('prawo') || rt.includes('right');

  if (isDual) {
    frontCenter = h + slopeH; backCenter = h + slopeH;
  } else if (isFront) {
    hBL = h + slopeH; hBR = h + slopeH;
  } else if (isBack) {
    hFL = h + slopeH; hFR = h + slopeH;
  } else if (isLeft) {
    hFR = h + slopeH; hBR = h + slopeH;
  } else if (isRight) {
    hFL = h + slopeH; hBL = h + slopeH;
  }

  const createFBShape = (leftH: number, rightH: number, centerH: number | null) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - t, 0); 
    shape.lineTo( w / 2 + t, 0);
    shape.lineTo( w / 2 + t, rightH);
    if (centerH !== null) shape.lineTo(0, centerH);
    shape.lineTo(-w / 2 - t, leftH);
    shape.closePath();
    return shape;
  };

  const createSideShape = (frontH: number, rearH: number) => {
    const shape = new THREE.Shape();
    const slope = (rearH - frontH) / l;
    const hF = frontH + slope * t;
    const hR = rearH - slope * t;

    shape.moveTo(0, 0);
    shape.lineTo(l - 2 * t, 0);
    shape.lineTo(l - 2 * t, hR);
    shape.lineTo(0, hF);
    shape.closePath();
    return shape;
  };

  const wallExtrude = { depth: t, bevelEnabled: false };

  const frontShape = createFBShape(hFL, hFR, frontCenter);
  const backShape = createFBShape(hBR, hBL, backCenter);
  const leftSideShape  = createSideShape(hFL, hBL);
  const rightSideShape = createSideShape(hFR, hBR);

  const getSubtractions = (wall: WallFace, isSide = false, isLeft = false) => {
    return config.elements.filter(e => e.wall === wall).map((el, i) => {
      let xShape = el.x * 0.01;
      if (isSide) xShape = isLeft ? (l / 2 - t - el.x * 0.01) : (l / 2 - t + el.x * 0.01);
      return (
        <Subtraction key={i} position={[xShape, el.y * 0.01 + (el.height * 0.01) / 2, t / 2]}>
          <boxGeometry args={[el.width * 0.01, el.height * 0.01, t * 4]} />
        </Subtraction>
      );
    });
  };

  const renderElements = (wall: WallFace, pos: [number, number, number], rotY: number, isSide = false, isLeft = false) => {
    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {config.elements.filter(e => e.wall === wall).map((el) => {
          const elW = el.width * 0.01; const elH = el.height * 0.01; const elY = el.y * 0.01;
          let xPos = el.x * 0.01;
          if (isSide) xPos = isLeft ? (l / 2 - t - el.x * 0.01) : (l / 2 - t + el.x * 0.01);

          if (el.type === 'window' || el.type === 'pvc-window' || el.type === 'skylight') {
            const fc = config.windowColor || '#333';
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.06, elH - 0.06, t - 0.02]} />
                  <meshStandardMaterial color={el.type === 'skylight' ? '#ddeeff' : '#1a2a3a'} opacity={el.type === 'skylight' ? 0.85 : 0.55} transparent roughness={0.05} metalness={0.95} envMapIntensity={2.5} />
                </mesh>
                <mesh><boxGeometry args={[elW, 0.04, t + 0.02]} /><meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} /></mesh>
                <mesh><boxGeometry args={[0.04, elH, t + 0.02]} /><meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} /></mesh>
                <mesh><boxGeometry args={[elW + 0.03, elH + 0.03, 0.025]} /><meshStandardMaterial color={fc} roughness={0.35} metalness={0.55} /></mesh>
              </group>
            );
          } else if (el.type === 'gate') {
            return <AnimatedGate key={el.id} el={{ ...el, x: xPos * 100 }} woodColor={woodColor} woodNormal={woodNormal} trapezTex={trapezTex} config={config} />;
          } else {
            const isDoorWood = config.doorProfile === 'drewnopodobna';
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, t + 0.01]} />
                  <meshStandardMaterial
                    map={isDoorWood ? woodColor : trapezTex}
                    normalMap={isDoorWood ? woodNormal : undefined}
                    normalScale={isDoorWood ? new THREE.Vector2(1.5, 1.5) : undefined}
                    color={isDoorWood ? '#ffffff' : (config.doorProfile === 'ocynk' ? '#d4d4d4' : config.doorColor)}
                    roughness={isDoorWood ? 0.7 : 0.4}
                    metalness={isDoorWood ? 0.0 : 0.6}
                    envMapIntensity={1.5}
                  />
                </mesh>
                <group position={[elW / 2 - 0.1, 0, t / 2 + 0.025]}>
                  <mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh>
                  <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh>
                </group>
              </group>
            );
          }
        })}
      </group>
    );
  };

  const renderRoof = () => {
    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.6} metalness={0.55} />;
    const rL = l + 0.4; 
    const rW = w + 0.4; 

    const isRoofWood = config.roofProfile === 'drewnopodobna';
    const roofFasciaColor = config.roofProfile === 'ocynk' ? '#d4d4d4' : config.roofColor;

    if (isDual) {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-rW / 2, 0); roofShape.lineTo(0, slopeH); roofShape.lineTo( rW / 2, 0);
      roofShape.lineTo( rW / 2, t); roofShape.lineTo(0, slopeH + t); roofShape.lineTo(-rW / 2, t);
      roofShape.closePath();
      return (
        <group position={[0, h, -rL / 2]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            
            {/* Obróbka blacharska frontu/tyłu (Gładka) */}
            <meshStandardMaterial attach="material-0" color={roofFasciaColor} roughness={0.8} metalness={0.2} />
            
            {/* Tekstura na połaciach dachu */}
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
          {config.gutters && (
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
    let gutterMesh = null, downspouts = null;

    if (isFront) {
      roofRotX = Math.atan2(slopeH, l);
      gutterMesh = <mesh position={[0, -0.02, rL / 2]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.06, 0.06, rW]} />{gutterMat}</mesh>;
      downspouts = <><mesh position={[-w/2 + 0.1, h/2, l/2 + 0.15]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh><mesh position={[w/2 - 0.1, h/2, l/2 + 0.15]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh></>;
    } else if (isBack) {
      roofRotX = -Math.atan2(slopeH, l);
      gutterMesh = <mesh position={[0, -0.02, -rL / 2]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.06, 0.06, rW]} />{gutterMat}</mesh>;
      downspouts = <><mesh position={[-w/2 + 0.1, h/2, -l/2 - 0.15]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh><mesh position={[w/2 - 0.1, h/2, -l/2 - 0.15]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh></>;
    } else if (isLeft) {
      roofRotZ = Math.atan2(slopeH, w);
      gutterMesh = <mesh position={[-rW / 2, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, rL]} />{gutterMat}</mesh>;
      downspouts = <><mesh position={[-w/2 - 0.15, h/2, l/2 - 0.1]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh><mesh position={[-w/2 - 0.15, h/2, -l/2 + 0.1]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh></>;
    } else if (isRight) {
      roofRotZ = -Math.atan2(slopeH, w);
      gutterMesh = <mesh position={[rW / 2, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, rL]} />{gutterMat}</mesh>;
      downspouts = <><mesh position={[w/2 + 0.15, h/2, l/2 - 0.1]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh><mesh position={[w/2 + 0.15, h/2, -l/2 + 0.1]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh></>;
    }

    const zOffset = isFront ? -(t / 2) * Math.sin(roofRotX) : (isBack ? (t / 2) * Math.sin(Math.abs(roofRotX)) : 0);
    const xOffset = isLeft ? (t / 2) * Math.sin(roofRotZ) : (isRight ? -(t / 2) * Math.sin(Math.abs(roofRotZ)) : 0);

    return (
      <group>
        <mesh position={[xOffset, h + slopeH / 2 + t / 2, zOffset]} rotation={[roofRotX, 0, roofRotZ]} castShadow receiveShadow>
          <boxGeometry args={[rW, t, rL]} />
          
          {/* BoxGeometry ma 6 ścian. Tylko góra (index 2) dostaje teksturę. Reszta to obróbka blacharska. */}
          <meshStandardMaterial attach="material-0" color={roofFasciaColor} roughness={0.8} metalness={0.2} />
          <meshStandardMaterial attach="material-1" color={roofFasciaColor} roughness={0.8} metalness={0.2} />
          <meshStandardMaterial attach="material-2" 
            map={isRoofWood ? woodColor : trapezTex}
            normalMap={isRoofWood ? woodNormal : undefined}
            normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isRoofWood ? '#ffffff' : roofFasciaColor}
            roughness={isRoofWood ? 0.7 : 0.4}
            metalness={isRoofWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
          />
          <meshStandardMaterial attach="material-3" color={roofFasciaColor} roughness={0.8} metalness={0.2} />
          <meshStandardMaterial attach="material-4" color={roofFasciaColor} roughness={0.8} metalness={0.2} />
          <meshStandardMaterial attach="material-5" color={roofFasciaColor} roughness={0.8} metalness={0.2} />

          {config.gutters && gutterMesh}
        </mesh>
        {config.gutters && downspouts}
      </group>
    );
  };

  const isWallWood = config.wallProfile === 'drewnopodobna';
  const wallBaseColor = config.wallProfile === 'ocynk' ? '#d4d4d4' : config.wallColor;

  return (
    <>
      <Environment preset="city" background blur={0.1} />
      
      {/* Ciemniejsze, kontrastowe tło bez migania (Z-fighting naprawiony) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[150, 150, '#3a3a3a', '#555555']} position={[0, -0.02, 0]} />

      <ContactShadows resolution={1024} scale={25} blur={2.5} opacity={0.7} far={10} color="#000000" position={[0, 0, 0]} />
      
      <group>
        <mesh position={[0, 0, l / 2 - t]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[frontShape, wallExtrude]} /></Base>
            {getSubtractions('front')}
          </Geometry>
          {/* Przód ściany tekstura, kąty/rogi garażu płaska blacha */}
          <meshStandardMaterial attach="material-0"
            map={isWallWood ? woodColor : trapezTex}
            normalMap={isWallWood ? woodNormal : undefined}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
          <meshStandardMaterial attach="material-1" color={wallBaseColor} roughness={0.6} metalness={0.4} />
        </mesh>
        {renderElements('front', [0, 0, l / 2 - t], 0)}

        <mesh position={[0, 0, -l / 2 + t]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[backShape, wallExtrude]} /></Base>
            {getSubtractions('back')}
          </Geometry>
          <meshStandardMaterial attach="material-0"
            map={isWallWood ? woodColor : trapezTex}
            normalMap={isWallWood ? woodNormal : undefined}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
          <meshStandardMaterial attach="material-1" color={wallBaseColor} roughness={0.6} metalness={0.4} />
        </mesh>
        {renderElements('back', [0, 0, -l / 2 + t], Math.PI)}

        <mesh position={[-w / 2 - t, 0, l / 2 - t]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[leftSideShape, wallExtrude]} /></Base>
            {getSubtractions('left', true, true)}
          </Geometry>
          <meshStandardMaterial attach="material-0"
            map={isWallWood ? woodColor : trapezTex}
            normalMap={isWallWood ? woodNormal : undefined}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
          <meshStandardMaterial attach="material-1" color={wallBaseColor} roughness={0.6} metalness={0.4} />
        </mesh>
        {renderElements('left', [-w / 2 - t, 0, l / 2 - t], Math.PI / 2, true, true)}

        <mesh position={[w / 2, 0, l / 2 - t]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[rightSideShape, wallExtrude]} /></Base>
            {getSubtractions('right', true, false)}
          </Geometry>
          <meshStandardMaterial attach="material-0"
            map={isWallWood ? woodColor : trapezTex}
            normalMap={isWallWood ? woodNormal : undefined}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
          <meshStandardMaterial attach="material-1" color={wallBaseColor} roughness={0.6} metalness={0.4} />
        </mesh>
        {renderElements('right', [w / 2, 0, l / 2 - t], Math.PI / 2, true, false)}

        {renderRoof()}
      </group>
    </>
  );
}