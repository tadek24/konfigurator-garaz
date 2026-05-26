"use client";

import { useMemo, useRef, ReactNode } from 'react';
import { GarageConfig, WallFace, GarageElement } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';

interface GarageModelProps {
  config: GarageConfig;
}

// Generates procedural bump map for PBR finishes
function createBumpMap(profile: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 512, 512);

    if (profile === 'trapez-t14') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 36) ctx.fillRect(i, 0, 18, 512);
    } else if (profile === 'trapez-t7') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 28) ctx.fillRect(i, 0, 14, 512);
    } else if (profile === 'rabek') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 64) ctx.fillRect(i, 0, 4, 512);
    } else if (profile === 'blachodachowka') {
      ctx.fillStyle = '#ffffff';
      for (let x = 0; x < 512; x += 64) {
        for (let y = 0; y < 512; y += 48) {
          ctx.beginPath();
          ctx.arc(x + 32, y + 24, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (profile === 'drewnopodobna') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 3) {
        if (Math.random() > 0.4) ctx.fillRect(0, i, 512, 1);
      }
    } else if (profile === 'ocynk') {
      for (let x = 0; x < 512; x += 4) {
        for (let y = 0; y < 512; y += 4) {
          const lum = Math.floor(120 + Math.random() * 135);
          ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function AnimatedGate({ el, gateMat, garageHeight }: { el: GarageElement; gateMat: ReactNode; garageHeight: number }) {
  const ref = useRef<THREE.Group>(null);
  
  const elW = el.width * 0.01;
  const elH = el.height * 0.01;
  const thick = 0.05;

  const animState = useRef({ progress: el.isOpen ? 1 : 0 });

  useFrame((_, delta) => {
    if (!ref.current) return;
    
    const target = el.isOpen ? 1 : 0;
    const speed = 1.5;
    if (animState.current.progress < target) {
      animState.current.progress = Math.min(target, animState.current.progress + delta * speed);
    } else if (animState.current.progress > target) {
      animState.current.progress = Math.max(target, animState.current.progress - delta * speed);
    }

    const phase = animState.current.progress;

    if (el.gateType === 'up-and-over') {
      // Tilt gate - pivot at top edge, swings inward
      const pivot = ref.current.children[0];
      if (pivot) {
        pivot.rotation.x = -phase * (Math.PI / 2);
      }
    } else if (el.gateType === 'sectional') {
      // Sectional gate - slides up then curves under ceiling
      const door = ref.current.children[0];
      if (door) {
        const ceilingH = garageHeight * 0.01;
        
        // Phase 0..0.5: slide up
        // Phase 0.5..1: curve inward (rotate + translate Z)
        const slidePhase = Math.min(1, phase * 2);
        const curvePhase = Math.max(0, (phase - 0.5) * 2);
        
        // Vertical slide: from elH/2 up to ceiling - elH/2
        const maxY = Math.min(ceilingH - 0.05, ceilingH);
        const slideY = elH / 2 + slidePhase * (maxY - elH / 2 - elH / 2);
        
        // Curve: rotate around top edge, translating Z inward
        const theta = curvePhase * (Math.PI / 2);
        
        let finalY = slideY;
        let finalZ = 0;
        
        if (curvePhase > 0) {
          // Pivot point is at top of the gate position
          const pivotY = maxY;
          const radius = elH / 2;
          finalY = pivotY - radius * (1 - Math.cos(theta));
          finalZ = -radius * Math.sin(theta);
        }
        
        // Clamp: never below floor, never above ceiling
        finalY = Math.max(elH / 2, Math.min(finalY, ceilingH));
        
        door.rotation.x = -theta;
        door.position.y = finalY;
        door.position.z = finalZ;
      }
    } else if (el.gateType === 'swing') {
      // Swing gate - two leaves
      const leftDoor = ref.current.children[0];
      const rightDoor = ref.current.children[1];
      if (leftDoor && rightDoor) {
        leftDoor.rotation.y = phase * (Math.PI / 2);
        rightDoor.rotation.y = -phase * (Math.PI / 2);
      }
    }
  });

  if (el.gateType === 'swing') {
    return (
      <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
        {/* Left Swing - pivot at left edge */}
        <group position={[-elW / 2, 0, 0]}>
          <mesh position={[elW / 4, elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />
            {gateMat}
          </mesh>
        </group>
        {/* Right Swing - pivot at right edge */}
        <group position={[elW / 2, 0, 0]}>
          <mesh position={[-elW / 4, elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />
            {gateMat}
          </mesh>
        </group>
      </group>
    );
  }

  // Tilt Gate - pivot at top horizontal edge
  if (el.gateType === 'up-and-over') {
    return (
      <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
        {/* Pivot group at the top edge of the door */}
        <group position={[0, elH, 0]}>
          <mesh position={[0, -elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW - 0.02, elH - 0.02, thick]} />
            {gateMat}
          </mesh>
        </group>
      </group>
    );
  }

  // Sectional Gate
  return (
    <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
      <mesh position={[0, elH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[elW - 0.02, elH - 0.02, thick]} />
        {gateMat}
        {/* Decorative horizontal section lines */}
        {[...Array(4)].map((_, i) => (
          <mesh key={i} position={[0, (elH / 5) * (i - 1.5), thick / 2 + 0.005]}>
            <boxGeometry args={[elW - 0.04, 0.015, 0.008]} />
            <meshStandardMaterial color="#000000" opacity={0.25} transparent />
          </mesh>
        ))}
      </mesh>
    </group>
  );
}

export default function GarageModel({ config }: GarageModelProps) {
  const w = config.width * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
  const t = 0.05; // wall thickness
  const slopeH = 0.4;

  // Textures
  const wallBump = useMemo(() => createBumpMap(config.wallProfile), [config.wallProfile]);
  const roofBump = useMemo(() => createBumpMap(config.roofProfile), [config.roofProfile]);
  const gateBump = useMemo(() => createBumpMap(config.gateProfile), [config.gateProfile]);
  const doorBump = useMemo(() => createBumpMap(config.doorProfile), [config.doorProfile]);

  // Effective colors (force silver for ocynk profile)
  const effWallColor = config.wallProfile === 'ocynk' ? '#d4d4d4' : config.wallColor;
  const effRoofColor = config.roofColor;
  const effGateColor = config.gateColor;
  const effDoorColor = config.doorColor;

  // Materials
  const wallMat = <meshStandardMaterial color={effWallColor} roughness={0.2} metalness={0.85} bumpMap={wallBump} bumpScale={0.015} side={THREE.DoubleSide} />;
  const roofMat = <meshStandardMaterial color={effRoofColor} roughness={0.2} metalness={0.85} bumpMap={roofBump} bumpScale={0.015} side={THREE.DoubleSide} />;
  const gateMat = <meshStandardMaterial color={effGateColor} roughness={0.2} metalness={0.85} bumpMap={gateBump} bumpScale={0.015} />;
  const doorMat = <meshStandardMaterial color={effDoorColor} roughness={0.2} metalness={0.85} bumpMap={doorBump} bumpScale={0.015} />;

  // ── Corner Heights ──
  // Corners: FL=FrontLeft, FR=FrontRight, BL=BackLeft, BR=BackRight
  let hFL = h, hFR = h, hBL = h, hBR = h;
  let frontCenter: number | null = null;
  let backCenter: number | null = null;

  switch (config.roofType) {
    case 'dual-slope':
      frontCenter = h + slopeH;
      backCenter = h + slopeH;
      break;
    case 'slope-front':
      // Front SHORT, Back TALL. Roof slopes from back(tall) to front(short).
      hBL = h + slopeH;
      hBR = h + slopeH;
      break;
    case 'slope-back':
      // Front TALL, Back SHORT. Roof slopes from front(tall) to back(short).
      hFL = h + slopeH;
      hFR = h + slopeH;
      break;
    case 'slope-left':
      // Left SHORT, Right TALL
      hFR = h + slopeH;
      hBR = h + slopeH;
      break;
    case 'slope-right':
      // Right SHORT, Left TALL
      hFL = h + slopeH;
      hBL = h + slopeH;
      break;
  }

  // ── Wall Shape Builders ──
  // Front/Back walls: shape in XY plane, centered at x=0
  const createFBShape = (leftH: number, rightH: number, centerH: number | null) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(w / 2, rightH);
    if (centerH !== null) shape.lineTo(0, centerH);
    shape.lineTo(-w / 2, leftH);
    shape.closePath();
    return shape;
  };

  // Side walls: shape in XY plane where X=0 is front edge, X=length is rear edge
  const createSideShape = (frontH: number, rearH: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(l, 0);
    shape.lineTo(l, rearH);
    shape.lineTo(0, frontH);
    shape.closePath();
    return shape;
  };

  const wallExtrude = { depth: t, bevelEnabled: false };

  // ── CSG Subtractions ──
  const getSubtractions = (wall: WallFace, isSide = false, isLeft = false) => {
    return config.elements.filter(e => e.wall === wall).map((el, i) => {
      let xShape = el.x * 0.01;
      if (isSide) {
        xShape = isLeft ? (l / 2 - el.x * 0.01) : (l / 2 + el.x * 0.01);
      }
      return (
        <Subtraction key={i} position={[xShape, el.y * 0.01 + (el.height * 0.01) / 2, t / 2]}>
          <boxGeometry args={[el.width * 0.01, el.height * 0.01, t * 4]} />
        </Subtraction>
      );
    });
  };

  // ── Element Rendering ──
  const renderElements = (wall: WallFace, pos: [number, number, number], rotY: number, isSide = false, isLeft = false) => {
    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {config.elements.filter(e => e.wall === wall).map((el) => {
          const elW = el.width * 0.01;
          const elH = el.height * 0.01;
          const elY = el.y * 0.01;
          
          let xPos = el.x * 0.01;
          if (isSide) {
            xPos = isLeft ? (l / 2 - el.x * 0.01) : (l / 2 + el.x * 0.01);
          }

          if (el.type === 'window' || el.type === 'pvc-window' || el.type === 'skylight') {
            const frameColor = config.windowColor;
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                {/* Glass */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.04, elH - 0.04, t - 0.02]} />
                  <meshStandardMaterial color={el.type === 'skylight' ? "#ddeeff" : "#1a2a3a"} opacity={el.type === 'skylight' ? 0.85 : 0.55} transparent roughness={0.05} metalness={0.95} />
                </mesh>
                {/* Horizontal frame */}
                <mesh>
                  <boxGeometry args={[elW, 0.04, t + 0.02]} />
                  <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Vertical frame */}
                <mesh>
                  <boxGeometry args={[0.04, elH, t + 0.02]} />
                  <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Outer frame */}
                <mesh>
                  <boxGeometry args={[elW + 0.02, elH + 0.02, 0.02]} />
                  <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.6} />
                </mesh>
              </group>
            );
          } else if (el.type === 'gate') {
            return <AnimatedGate key={el.id} el={{...el, x: xPos * 100}} gateMat={gateMat} garageHeight={config.height} />;
          } else {
            // Door
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, t + 0.01]} />
                  {doorMat}
                </mesh>
                {/* Door handle */}
                <mesh position={[elW / 2 - 0.08, 0, t / 2 + 0.02]}>
                  <boxGeometry args={[0.02, 0.12, 0.03]} />
                  <meshStandardMaterial color="#888" roughness={0.3} metalness={0.9} />
                </mesh>
              </group>
            );
          }
        })}
      </group>
    );
  };

  // ── Roof ──
  const renderRoof = () => {
    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.7} metalness={0.5} />;
    const rL = l + 0.4; // overhang length
    const rW = w + 0.4; // overhang width

    if (config.roofType === 'dual-slope') {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-rW / 2, 0);
      roofShape.lineTo(0, slopeH);
      roofShape.lineTo(rW / 2, 0);
      roofShape.lineTo(rW / 2, t);
      roofShape.lineTo(0, slopeH + t);
      roofShape.lineTo(-rW / 2, t);
      roofShape.closePath();
      
      return (
        <group position={[0, h, -rL / 2]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            {roofMat}
          </mesh>
          {config.gutters && (
            <>
              <mesh position={[-rW / 2 + 0.1, t / 2, rL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[rW / 2 - 0.1, t / 2, rL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[-rW / 2 + 0.1, -h / 2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
              <mesh position={[rW / 2 - 0.1, -h / 2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
            </>
          )}
        </group>
      );
    }

    // ── Mono-slope roofs ──
    let rotX = 0, rotZ = 0;

    // Side wall front/rear heights are used for slope angle
    const leftFrontH = hFL;
    const leftRearH = hBL;
    const rightFrontH = hFR;
    const rightRearH = hBR;

    if (config.roofType === 'slope-front' || config.roofType === 'slope-back') {
      const angleX = Math.atan((leftFrontH - leftRearH) / l);
      rotX = -angleX;
    } else if (config.roofType === 'slope-left' || config.roofType === 'slope-right') {
      const angleZ = Math.atan((hFL - hFR) / w);
      rotZ = angleZ;
    }

    // Y position: average of all 4 corners plus half-thickness offset
    const avgH = (hFL + hFR + hBL + hBR) / 4;
    const cosAngle = Math.max(Math.cos(rotX), Math.cos(rotZ));
    const yOffset = avgH + (t / 2) / (cosAngle || 1);

    // Determine gutter position
    let gutterGroup = null;
    if (config.gutters) {
      const gutterElements: ReactNode[] = [];
      
      if (config.roofType === 'slope-front') {
        // Gutter on FRONT (low side)
        gutterElements.push(
          <mesh key="g" position={[0, h - 0.05, l / 2 + 0.15]} rotation={[0, 0, 0]} castShadow>
            <boxGeometry args={[rW, 0.08, 0.08]} />
            {gutterMat}
          </mesh>,
          <mesh key="d1" position={[w / 2, h / 2 - 0.02, l / 2 + 0.15]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />
            {gutterMat}
          </mesh>
        );
      } else if (config.roofType === 'slope-back') {
        gutterElements.push(
          <mesh key="g" position={[0, h - 0.05, -l / 2 - 0.15]} castShadow>
            <boxGeometry args={[rW, 0.08, 0.08]} />
            {gutterMat}
          </mesh>,
          <mesh key="d1" position={[-w / 2, h / 2 - 0.02, -l / 2 - 0.15]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />
            {gutterMat}
          </mesh>
        );
      } else if (config.roofType === 'slope-left') {
        gutterElements.push(
          <mesh key="g" position={[-w / 2 - 0.15, h - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, rL]} />
            {gutterMat}
          </mesh>,
          <mesh key="d1" position={[-w / 2 - 0.15, h / 2 - 0.02, -l / 2]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />
            {gutterMat}
          </mesh>
        );
      } else if (config.roofType === 'slope-right') {
        gutterElements.push(
          <mesh key="g" position={[w / 2 + 0.15, h - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, rL]} />
            {gutterMat}
          </mesh>,
          <mesh key="d1" position={[w / 2 + 0.15, h / 2 - 0.02, l / 2]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />
            {gutterMat}
          </mesh>
        );
      }
      gutterGroup = <>{gutterElements}</>;
    }

    return (
      <group>
        <mesh position={[0, yOffset, 0]} rotation={[rotX, 0, rotZ]} castShadow receiveShadow>
          <boxGeometry args={[rW, t, rL]} />
          {roofMat}
        </mesh>
        {gutterGroup}
      </group>
    );
  };

  // ── Front wall shape ──
  const frontShape = createFBShape(hFL, hFR, frontCenter);
  // Back wall: when rotated PI, left becomes right visually
  const backShape = createFBShape(hBR, hBL, backCenter);
  // Side walls
  const leftSideShape = createSideShape(hFL, hBL);
  const rightSideShape = createSideShape(hFR, hBR);

  return (
    <group>
      
      {/* Front Wall */}
      <mesh position={[0, 0, l / 2 - t]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[frontShape, wallExtrude]} />
          </Base>
          {getSubtractions('front')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('front', [0, 0, l / 2 - t], 0)}

      {/* Back Wall */}
      <mesh position={[0, 0, -l / 2]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[backShape, wallExtrude]} />
          </Base>
          {getSubtractions('back')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('back', [0, 0, -l / 2], Math.PI)}

      {/* Left Wall */}
      <mesh position={[-w / 2 - t, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[leftSideShape, wallExtrude]} />
          </Base>
          {getSubtractions('left', true, true)}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('left', [-w / 2 - t, 0, l / 2], Math.PI / 2, true, true)}

      {/* Right Wall */}
      <mesh position={[w / 2, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[rightSideShape, wallExtrude]} />
          </Base>
          {getSubtractions('right', true, false)}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('right', [w / 2, 0, l / 2], Math.PI / 2, true, false)}

      {renderRoof()}
    </group>
  );
}
