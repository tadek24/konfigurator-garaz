"use client";

import { useMemo, useRef, ReactNode } from 'react';
import { GarageConfig, WallFace, GarageElement } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';

interface GarageModelProps {
  config: GarageConfig;
}

// ── Procedural bump / normal map for PBR finishes ──────────────────────────
function createBumpMap(profile: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 512, 512);

    if (profile === 'trapez-t14') {
      // Wide trapezoid ribs
      for (let i = 0; i < 512; i += 36) {
        const g = ctx.createLinearGradient(i, 0, i + 36, 0);
        g.addColorStop(0,    '#555');
        g.addColorStop(0.25, '#fff');
        g.addColorStop(0.75, '#fff');
        g.addColorStop(1,    '#555');
        ctx.fillStyle = g;
        ctx.fillRect(i, 0, 36, 512);
      }
    } else if (profile === 'trapez-t7') {
      // Narrow trapezoid ribs
      for (let i = 0; i < 512; i += 22) {
        const g = ctx.createLinearGradient(i, 0, i + 22, 0);
        g.addColorStop(0,    '#555');
        g.addColorStop(0.3,  '#eee');
        g.addColorStop(0.7,  '#eee');
        g.addColorStop(1,    '#555');
        ctx.fillStyle = g;
        ctx.fillRect(i, 0, 22, 512);
      }
    } else if (profile === 'rabek') {
      // Standing seam — thin bright lines
      ctx.fillStyle = '#777';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 512; i += 64) {
        const g = ctx.createLinearGradient(i, 0, i + 8, 0);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.5, '#ccc');
        g.addColorStop(1, '#888');
        ctx.fillStyle = g;
        ctx.fillRect(i, 0, 8, 512);
      }
    } else if (profile === 'blachodachowka') {
      ctx.fillStyle = '#777';
      ctx.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 512; x += 64) {
        for (let y = 0; y < 512; y += 48) {
          const offsetX = (Math.floor(y / 48) % 2) * 32;
          ctx.fillStyle = '#bbb';
          ctx.beginPath();
          ctx.ellipse(x + offsetX + 32, y + 24, 26, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#999';
          ctx.beginPath();
          ctx.ellipse(x + offsetX + 32, y + 24, 18, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (profile === 'drewnopodobna') {
      // Wood grain
      for (let i = 0; i < 512; i += 2) {
        const lum = 100 + Math.random() * 60;
        ctx.fillStyle = `rgb(${lum},${lum * 0.6 | 0},${lum * 0.3 | 0})`;
        if (Math.random() > 0.3) ctx.fillRect(0, i, 512, 1 + Math.random() * 2);
      }
    } else if (profile === 'ocynk') {
      for (let x = 0; x < 512; x += 3) {
        for (let y = 0; y < 512; y += 3) {
          const lum = Math.floor(130 + Math.random() * 125);
          ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
          ctx.fillRect(x, y, 3, 3);
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

// ── Build a perfect mono-slope roof as a custom BufferGeometry ─────────────
// The 4 corners of the roof quad EXACTLY match the 4 wall-top corner positions.
// Corners in world space (before placing into <mesh>):
//   BL = (-rW/2,  hBL,  -rL/2)   BL = Back-Left
//   BR = ( rW/2,  hBR,  -rL/2)   BR = Back-Right
//   FL = (-rW/2,  hFL,   rL/2)   FL = Front-Left
//   FR = ( rW/2,  hFR,   rL/2)   FR = Front-Right
// We extrude the quad downward by thickness `t` so it's visible from below too.
function buildMonoSlopeRoofGeo(
  rW: number, rL: number, t: number,
  hFL: number, hFR: number, hBL: number, hBR: number
): THREE.BufferGeometry {
  // Top face vertices (z = front → +rL/2, z = back → -rL/2)
  // In local coords we just place the mesh at origin:
  //   BL = (-rW/2, hBL, -rL/2)  BR = (rW/2, hBR, -rL/2)
  //   FL = (-rW/2, hFL,  rL/2)  FR = (rW/2, hFR,  rL/2)
  const tFL = new THREE.Vector3(-rW / 2, hFL,  rL / 2);
  const tFR = new THREE.Vector3( rW / 2, hFR,  rL / 2);
  const tBL = new THREE.Vector3(-rW / 2, hBL, -rL / 2);
  const tBR = new THREE.Vector3( rW / 2, hBR, -rL / 2);

  // Bottom face (shift down by t along the local surface normal)
  const normal = new THREE.Vector3();
  {
    const ab = new THREE.Vector3().subVectors(tFR, tFL);
    const ac = new THREE.Vector3().subVectors(tBL, tFL);
    normal.crossVectors(ab, ac).normalize();
  }
  const offset = normal.clone().multiplyScalar(-t);
  const bFL = tFL.clone().add(offset);
  const bFR = tFR.clone().add(offset);
  const bBL = tBL.clone().add(offset);
  const bBR = tBR.clone().add(offset);

  // Build 6 faces × 2 triangles each = 12 triangles = 36 vertices
  const verts: number[] = [];
  const norms: number[] = [];
  const uvs: number[] = [];

  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const n = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
      .normalize();
    for (const v of [a, b, c]) {
      verts.push(v.x, v.y, v.z);
      norms.push(n.x, n.y, n.z);
      uvs.push(0, 0); // simplified UVs
    }
  };

  // Top face
  pushTri(tFL, tBL, tBR);
  pushTri(tFL, tBR, tFR);
  // Bottom face (reversed winding)
  pushTri(bFL, bBR, bBL);
  pushTri(bFL, bFR, bBR);
  // Front edge
  pushTri(tFL, tFR, bFR);
  pushTri(tFL, bFR, bFL);
  // Back edge
  pushTri(tBR, tBL, bBL);
  pushTri(tBR, bBL, bBR);
  // Left edge
  pushTri(tBL, tFL, bFL);
  pushTri(tBL, bFL, bBL);
  // Right edge
  pushTri(tFR, tBR, bBR);
  pushTri(tFR, bBR, bFR);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.setAttribute('normal',   new THREE.BufferAttribute(new Float32Array(norms), 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array(uvs),   2));
  return geo;
}

// ── Sectional gate with N independent panel segments ─────────────────────
const PANEL_COUNT = 5;

function SectionalGate({ el, gateMat, garageHeight }: { el: GarageElement; gateMat: ReactNode; garageHeight: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(el.isOpen ? 1 : 0);

  const elW = el.width  * 0.01;
  const elH = el.height * 0.01;
  const thick = 0.05;
  const panelH = elH / PANEL_COUNT;
  const ceilingH = garageHeight * 0.01;

  // Each panel: starts at Y = panelIndex * panelH (bottom = 0, top panel top = elH)
  // When fully open, all panels slide up and curve inward under the ceiling.

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = el.isOpen ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, delta * 3.0);

    const phase = progress.current;
    const panels = groupRef.current.children;

    for (let i = 0; i < PANEL_COUNT; i++) {
      const panel = panels[i] as THREE.Group;
      if (!panel) continue;

      // Stagger: bottom panels move first
      const staggerOffset = (i / PANEL_COUNT) * 0.15; // small stagger
      const p = Math.max(0, Math.min(1, (phase - staggerOffset) / (1 - staggerOffset)));

      // Rest position: panel i sits from (i * panelH) to ((i+1) * panelH) on the wall
      // The group pivot is at bottom of each panel in rest position.
      const restY = i * panelH + panelH / 2; // center of panel i at rest

      // Max Y the panel center can reach before hitting ceiling
      const maxY = ceilingH - panelH / 2 - 0.01;

      // Phase 0 → liftEnd: slide UP
      // Phase liftEnd → 1: rotate around its top edge and translate -Z
      const liftEnd = 0.55;
      const liftP = Math.min(1, p / liftEnd);
      const curveP = Math.max(0, (p - liftEnd) / (1 - liftEnd));

      // Vertical lift
      const liftedY = restY + liftP * (maxY - restY);
      const clampedY = Math.min(liftedY, maxY);

      // Curve: once at ceiling, rotate inward (X axis) and translate -Z
      // We pivot the panel around its top edge.
      // top edge is at clampedY + panelH/2
      // rotation angle goes from 0 to PI/2
      const theta = curveP * (Math.PI / 2);
      const pivotY = maxY + panelH / 2; // ceiling line
      // center of panel after rotation around pivotY
      const finalY = pivotY - (panelH / 2) * Math.cos(theta);
      const finalZ = -(panelH / 2) * Math.sin(theta);

      panel.rotation.x = -theta;
      panel.position.y = curveP > 0 ? Math.min(finalY, pivotY) : clampedY;
      panel.position.z = curveP > 0 ? finalZ : 0;
    }
  });

  return (
    <group ref={groupRef} position={[el.x * 0.01, el.y * 0.01, 0]}>
      {Array.from({ length: PANEL_COUNT }, (_, i) => (
        <group key={i} position={[0, i * panelH + panelH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[elW - 0.02, panelH - 0.005, thick]} />
            {gateMat}
          </mesh>
          {/* Section divider line */}
          <mesh position={[0, -panelH / 2 + 0.003, thick / 2 + 0.003]}>
            <boxGeometry args={[elW - 0.04, 0.012, 0.007]} />
            <meshStandardMaterial color="#111" opacity={0.3} transparent />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Generic animated gate ──────────────────────────────────────────────────
function AnimatedGate({ el, gateMat, garageHeight }: {
  el: GarageElement;
  gateMat: ReactNode;
  garageHeight: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const elW = el.width  * 0.01;
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
      if (pivot) pivot.rotation.x = -phase * (Math.PI / 2);
    } else if (el.gateType === 'swing') {
      const leftDoor  = ref.current.children[0];
      const rightDoor = ref.current.children[1];
      if (leftDoor)  leftDoor.rotation.y  =  phase * (Math.PI / 2);
      if (rightDoor) rightDoor.rotation.y = -phase * (Math.PI / 2);
    }
  });

  // Sectional handled separately
  if (el.gateType === 'sectional') {
    return <SectionalGate el={el} gateMat={gateMat} garageHeight={garageHeight} />;
  }

  if (el.gateType === 'swing') {
    return (
      <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
        {/* Left leaf – pivot at left edge */}
        <group position={[-elW / 2, 0, 0]}>
          <mesh position={[elW / 4, elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />
            {gateMat}
          </mesh>
          {/* Handle */}
          <mesh position={[elW / 2 - 0.1, elH / 2, thick / 2 + 0.03]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#888" roughness={0.2} metalness={0.95} />
          </mesh>
        </group>
        {/* Right leaf – pivot at right edge */}
        <group position={[elW / 2, 0, 0]}>
          <mesh position={[-elW / 4, elH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />
            {gateMat}
          </mesh>
          {/* Handle */}
          <mesh position={[-elW / 2 + 0.1, elH / 2, thick / 2 + 0.03]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#888" roughness={0.2} metalness={0.95} />
          </mesh>
        </group>
      </group>
    );
  }

  // Tilt (up-and-over) – pivot at top edge
  return (
    <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
      <group position={[0, elH, 0]}>
        <mesh position={[0, -elH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[elW - 0.02, elH - 0.02, thick]} />
          {gateMat}
        </mesh>
        {/* Handle */}
        <mesh position={[0, -elH + 0.25, thick / 2 + 0.03]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
          <meshStandardMaterial color="#888" roughness={0.2} metalness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

// ── Main garage model ──────────────────────────────────────────────────────
export default function GarageModel({ config }: GarageModelProps) {
  const w = config.width  * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
  const t = 0.05;     // wall thickness
  const slopeH = 0.4; // rise of mono-slope

  // Textures (memoised)
  const wallBump = useMemo(() => createBumpMap(config.wallProfile), [config.wallProfile]);
  const roofBump = useMemo(() => createBumpMap(config.roofProfile), [config.roofProfile]);
  const gateBump = useMemo(() => createBumpMap(config.gateProfile), [config.gateProfile]);
  const doorBump = useMemo(() => createBumpMap(config.doorProfile), [config.doorProfile]);

  const effWallColor = config.wallProfile === 'ocynk' ? '#d4d4d4' : config.wallColor;

  const wallMat = (
    <meshStandardMaterial
      color={effWallColor}
      roughness={0.18}
      metalness={0.88}
      bumpMap={wallBump}
      bumpScale={0.018}
      side={THREE.DoubleSide}
    />
  );
  const roofMat = (
    <meshStandardMaterial
      color={config.roofColor}
      roughness={0.15}
      metalness={0.9}
      bumpMap={roofBump}
      bumpScale={0.018}
      side={THREE.DoubleSide}
    />
  );
  const gateMat = (
    <meshStandardMaterial
      color={config.gateColor}
      roughness={0.18}
      metalness={0.88}
      bumpMap={gateBump}
      bumpScale={0.015}
    />
  );
  const doorMat = (
    <meshStandardMaterial
      color={config.doorColor}
      roughness={0.2}
      metalness={0.85}
      bumpMap={doorBump}
      bumpScale={0.015}
    />
  );

  // ── Corner heights ─────────────────────────────────────────────────────
  let hFL = h, hFR = h, hBL = h, hBR = h;
  let frontCenter: number | null = null;
  let backCenter:  number | null = null;

  switch (config.roofType) {
    case 'dual-slope':
      frontCenter = h + slopeH;
      backCenter  = h + slopeH;
      break;
    case 'slope-front':
      // Front SHORT, Back TALL
      hBL = h + slopeH;
      hBR = h + slopeH;
      break;
    case 'slope-back':
      // Front TALL, Back SHORT
      hFL = h + slopeH;
      hFR = h + slopeH;
      break;
    case 'slope-left':
      // Left SHORT, Right TALL
      hFR = h + slopeH;
      hBR = h + slopeH;
      break;
    case 'slope-right':
      // Left TALL, Right SHORT
      hFL = h + slopeH;
      hBL = h + slopeH;
      break;
  }

  // ── Wall shape builders ────────────────────────────────────────────────
  // Front / Back walls: drawn in XY plane, x runs from -w/2 to +w/2.
  // leftH  = height at left  edge of the wall face
  // rightH = height at right edge of the wall face
  // centerH = optional gable peak (dual-slope only)
  const createFBShape = (leftH: number, rightH: number, centerH: number | null) => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo( w / 2, 0);
    shape.lineTo( w / 2, rightH);
    if (centerH !== null) shape.lineTo(0, centerH);
    shape.lineTo(-w / 2, leftH);
    shape.closePath();
    return shape;
  };

  // Side walls: x runs along the garage length (0 = front, l = back)
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

  // Front wall:
  //   left edge  = world-left  (x = -w/2) → hFL
  //   right edge = world-right (x = +w/2) → hFR
  const frontShape = createFBShape(hFL, hFR, frontCenter);

  // Back wall is rendered rotated PI around Y, so "left" in the shape corresponds
  // to world-right when facing the back. Use hBR as "leftH" and hBL as "rightH".
  const backShape = createFBShape(hBR, hBL, backCenter);

  // Side walls
  const leftSideShape  = createSideShape(hFL, hBL);
  const rightSideShape = createSideShape(hFR, hBR);

  // ── CSG hole subtractions ──────────────────────────────────────────────
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

  // ── Element rendering (windows, doors, gates) ──────────────────────────
  const renderElements = (
    wall: WallFace,
    pos: [number, number, number],
    rotY: number,
    isSide = false,
    isLeft = false,
  ) => {
    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {config.elements.filter(e => e.wall === wall).map((el) => {
          const elW = el.width  * 0.01;
          const elH = el.height * 0.01;
          const elY = el.y      * 0.01;
          let xPos  = el.x      * 0.01;
          if (isSide) {
            xPos = isLeft ? (l / 2 - el.x * 0.01) : (l / 2 + el.x * 0.01);
          }

          if (el.type === 'window' || el.type === 'pvc-window' || el.type === 'skylight') {
            const fc = config.windowColor;
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                {/* Glass pane */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.06, elH - 0.06, t - 0.02]} />
                  <meshStandardMaterial
                    color={el.type === 'skylight' ? '#ddeeff' : '#1a2a3a'}
                    opacity={el.type === 'skylight' ? 0.85 : 0.55}
                    transparent
                    roughness={0.05}
                    metalness={0.95}
                    envMapIntensity={2}
                  />
                </mesh>
                {/* Horizontal frame bar */}
                <mesh>
                  <boxGeometry args={[elW, 0.04, t + 0.02]} />
                  <meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Vertical frame bar */}
                <mesh>
                  <boxGeometry args={[0.04, elH, t + 0.02]} />
                  <meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Outer surround */}
                <mesh>
                  <boxGeometry args={[elW + 0.03, elH + 0.03, 0.025]} />
                  <meshStandardMaterial color={fc} roughness={0.35} metalness={0.55} />
                </mesh>
              </group>
            );
          } else if (el.type === 'gate') {
            return (
              <AnimatedGate
                key={el.id}
                el={{ ...el, x: xPos * 100 }}
                gateMat={gateMat}
                garageHeight={config.height}
              />
            );
          } else {
            // Door
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, t + 0.01]} />
                  {doorMat}
                </mesh>
                {/* Handle – sphere knob + lever */}
                <group position={[elW / 2 - 0.1, 0, t / 2 + 0.025]}>
                  <mesh>
                    <sphereGeometry args={[0.028, 10, 10]} />
                    <meshStandardMaterial color="#aaa" roughness={0.15} metalness={0.95} />
                  </mesh>
                  <mesh position={[0, -0.07, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
                    <meshStandardMaterial color="#aaa" roughness={0.15} metalness={0.95} />
                  </mesh>
                </group>
              </group>
            );
          }
        })}
      </group>
    );
  };

  // ── Roof ───────────────────────────────────────────────────────────────
  const renderRoof = () => {
    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.6} metalness={0.55} />;
    const rL = l + 0.4; // length with overhangs
    const rW = w + 0.4; // width  with overhangs

    // Overhang corner heights match wall corners (same slopeH logic but on rW/rL footprint)
    // We compute using the same hFL/hFR/hBL/hBR — the wall top positions are correct.

    if (config.roofType === 'dual-slope') {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-rW / 2, 0);
      roofShape.lineTo(0,        slopeH);
      roofShape.lineTo( rW / 2, 0);
      roofShape.lineTo( rW / 2, t);
      roofShape.lineTo(0,        slopeH + t);
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
              <mesh position={[-rW / 2 + 0.1, t / 2, rL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}
              </mesh>
              <mesh position={[ rW / 2 - 0.1, t / 2, rL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}
              </mesh>
              <mesh position={[-rW / 2 + 0.1, -h / 2, 0]}>
                <cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}
              </mesh>
              <mesh position={[ rW / 2 - 0.1, -h / 2, 0]}>
                <cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}
              </mesh>
            </>
          )}
        </group>
      );
    }

    // ── Mono-slope: build a perfect quad matching the 4 wall-top corners ──
    // The corner heights on the OVERHANG footprint (rW × rL) are the same as the
    // wall corners, since the slope is determined purely by slopeH (not by the
    // overhang distance).  The walls stop at hFL/hFR/hBL/hBR at their outer edges.
    // We replicate those heights for the roof quad corners.
    const roofGeo = useMemo(
      () => buildMonoSlopeRoofGeo(rW, rL, t, hFL, hFR, hBL, hBR),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [rW, rL, t, hFL, hFR, hBL, hBR]
    );

    // Gutter on the LOW edge
    let gutterGroup: ReactNode = null;
    if (config.gutters) {
      const gels: ReactNode[] = [];
      if (config.roofType === 'slope-front') {
        gels.push(
          <mesh key="g" position={[0, h - 0.06, rL / 2 + 0.15]} castShadow>
            <boxGeometry args={[rW, 0.08, 0.08]} />{gutterMat}
          </mesh>,
          <mesh key="d" position={[rW / 2 - 0.1, h / 2 - 0.03, rL / 2 + 0.15]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}
          </mesh>
        );
      } else if (config.roofType === 'slope-back') {
        gels.push(
          <mesh key="g" position={[0, h - 0.06, -rL / 2 - 0.15]} castShadow>
            <boxGeometry args={[rW, 0.08, 0.08]} />{gutterMat}
          </mesh>,
          <mesh key="d" position={[-rW / 2 + 0.1, h / 2 - 0.03, -rL / 2 - 0.15]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}
          </mesh>
        );
      } else if (config.roofType === 'slope-left') {
        // Low side = left (-rW/2)
        gels.push(
          <mesh key="g" position={[-rW / 2 - 0.15, h - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}
          </mesh>,
          <mesh key="d" position={[-rW / 2 - 0.15, h / 2 - 0.03, -rL / 2]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}
          </mesh>
        );
      } else if (config.roofType === 'slope-right') {
        // Low side = right (+rW/2)
        gels.push(
          <mesh key="g" position={[rW / 2 + 0.15, h - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}
          </mesh>,
          <mesh key="d" position={[rW / 2 + 0.15, h / 2 - 0.03, rL / 2]}>
            <cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}
          </mesh>
        );
      }
      gutterGroup = <>{gels}</>;
    }

    return (
      <group>
        {/* Roof quad – position at world origin; corner heights are absolute */}
        <mesh geometry={roofGeo} castShadow receiveShadow>
          {roofMat}
        </mesh>
        {gutterGroup}
      </group>
    );
  };

  return (
    <group>
      {/* Front Wall */}
      <mesh position={[0, 0, l / 2 - t]} castShadow receiveShadow>
        <Geometry>
          <Base><extrudeGeometry args={[frontShape, wallExtrude]} /></Base>
          {getSubtractions('front')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('front', [0, 0, l / 2 - t], 0)}

      {/* Back Wall */}
      <mesh position={[0, 0, -l / 2]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <Geometry>
          <Base><extrudeGeometry args={[backShape, wallExtrude]} /></Base>
          {getSubtractions('back')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('back', [0, 0, -l / 2], Math.PI)}

      {/* Left Wall */}
      <mesh position={[-w / 2 - t, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base><extrudeGeometry args={[leftSideShape, wallExtrude]} /></Base>
          {getSubtractions('left', true, true)}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('left', [-w / 2 - t, 0, l / 2], Math.PI / 2, true, true)}

      {/* Right Wall */}
      <mesh position={[w / 2, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base><extrudeGeometry args={[rightSideShape, wallExtrude]} /></Base>
          {getSubtractions('right', true, false)}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('right', [w / 2, 0, l / 2], Math.PI / 2, true, false)}

      {renderRoof()}
    </group>
  );
}
