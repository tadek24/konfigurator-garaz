"use client";

import { useMemo, useRef, ReactNode } from 'react';
import { GarageConfig, WallFace, GarageElement } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';

interface GarageModelProps {
  config: GarageConfig;
}

// Generates procedural bump map for corrugated metal
function createBumpMap(pattern: GarageConfig['corrugationPattern']): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#888888'; // base neutral grey
    ctx.fillRect(0, 0, 512, 512);
    
    // T-7 narrow (approx 16px), T-14 wide (approx 32px)
    const spacing = pattern.includes('t7') ? 16 : 32;
    const isVertical = pattern.includes('vertical');

    ctx.fillStyle = '#ffffff'; // ridges (high points)
    if (isVertical) {
      for (let i = 0; i < 512; i += spacing * 2) {
        ctx.fillRect(i, 0, spacing, 512);
      }
    } else {
      for (let i = 0; i < 512; i += spacing * 2) {
        ctx.fillRect(0, i, 512, spacing);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d49a57';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#b67a3d';
    for (let i = 0; i < 512; i += 4) {
      if (Math.random() > 0.5) ctx.fillRect(0, i, 512, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function AnimatedGate({ el, config, doorMat }: { el: GarageElement, config: GarageConfig, doorMat: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  
  const elW = el.width * 0.01;
  const elH = el.height * 0.01;
  const t = 0.05;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = clock.getElapsedTime();
    // A simple looping open/close animation over 4 seconds for preview
    const phase = (Math.sin(time * 1.5) + 1) / 2; // 0 to 1

    if (el.gateType === 'swing') {
      const leftDoor = ref.current.children[0];
      const rightDoor = ref.current.children[1];
      if (leftDoor && rightDoor) {
        leftDoor.rotation.y = phase * (Math.PI / 2);
        rightDoor.rotation.y = -phase * (Math.PI / 2);
      }
    } else if (el.gateType === 'up-and-over') {
      const door = ref.current.children[0];
      if (door) {
        // Rotate up and slide back slightly
        door.rotation.x = -phase * (Math.PI / 2 - 0.1);
        door.position.y = phase * (elH / 4);
        door.position.z = -phase * (elH / 2);
      }
    } else if (el.gateType === 'sectional') {
      // Simplification: slide up
      const door = ref.current.children[0];
      if (door) {
        door.position.y = phase * elH;
      }
    }
  });

  if (el.gateType === 'swing') {
    return (
      <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
        {/* Left Swing */}
        <group position={[-elW / 2, 0, 0]}>
          <mesh position={[elW / 4, elH / 2, 0]}>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, t]} />
            {doorMat}
          </mesh>
        </group>
        {/* Right Swing */}
        <group position={[elW / 2, 0, 0]}>
          <mesh position={[-elW / 4, elH / 2, 0]}>
            <boxGeometry args={[elW / 2 - 0.01, elH - 0.02, t]} />
            {doorMat}
          </mesh>
        </group>
      </group>
    );
  }

  // Tilt and Sectional
  return (
    <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
      <mesh position={[0, elH / 2, 0]}>
        <boxGeometry args={[elW - 0.02, elH - 0.02, t]} />
        {doorMat}
        {/* Decorative horizontal lines to indicate sections */}
        {[...Array(4)].map((_, i) => (
          <mesh key={i} position={[0, (elH / 5) * (i - 1.5), t / 2 + 0.01]}>
            <boxGeometry args={[elW - 0.04, 0.02, 0.01]} />
            <meshStandardMaterial color="#000000" opacity={0.3} transparent />
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

  const bumpMap = useMemo(() => createBumpMap(config.corrugationPattern), [config.corrugationPattern]);
  const woodTex = useMemo(() => createWoodTexture(), []);

  const baseMaterialProps = {
    roughness: config.finish === 'golden-oak' ? 0.7 : 0.4,
    metalness: config.finish === 'golden-oak' ? 0.1 : 0.8,
    map: config.finish === 'golden-oak' ? woodTex : null,
    bumpMap: config.finish === 'standard' ? bumpMap : null,
    bumpScale: 0.015,
  };

  const wallMat = <meshStandardMaterial color={config.finish === 'golden-oak' ? '#ffffff' : config.wallColor} {...baseMaterialProps} />;
  const roofMat = <meshStandardMaterial color={config.finish === 'golden-oak' ? '#ffffff' : config.roofColor} {...baseMaterialProps} />;
  const doorMat = <meshStandardMaterial color={config.finish === 'golden-oak' ? '#ffffff' : config.doorColor} {...baseMaterialProps} />;

  // Heights logic for the 5 roof types
  let frontL = h, frontC: number | null = null, frontR = h;
  let backL = h, backC: number | null = null, backR = h;
  let leftL = h, leftR = h;
  let rightL = h, rightR = h;

  if (config.roofType === 'dual-slope') {
    frontC = h + slopeH; backC = h + slopeH;
  } else if (config.roofType === 'slope-back') {
    frontL = h + slopeH; frontR = h + slopeH;
    leftR = h + slopeH; rightL = h + slopeH;
  } else if (config.roofType === 'slope-front') {
    backL = h + slopeH; backR = h + slopeH;
    leftL = h + slopeH; rightR = h + slopeH;
  } else if (config.roofType === 'slope-left') {
    frontR = h + slopeH; backL = h + slopeH;
    rightL = h + slopeH; rightR = h + slopeH;
  } else if (config.roofType === 'slope-right') {
    frontL = h + slopeH; backR = h + slopeH;
    leftL = h + slopeH; leftR = h + slopeH;
  }

  const createWallShape = (width: number, lH: number, cH: number | null, rH: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, rH);
    if (cH !== null) shape.lineTo(0, cH);
    shape.lineTo(-width / 2, lH);
    shape.lineTo(-width / 2, 0);
    return shape;
  };

  const wallExtrudeSettings = { depth: t, bevelEnabled: false };

  const getSubtractions = (wall: WallFace) => {
    return config.elements.filter(e => e.wall === wall).map((el, i) => (
      // ExtrudeGeometry grows from z=0 to z=t. Subtraction center at z=t/2 to cut perfectly.
      <Subtraction key={i} position={[el.x * 0.01, el.y * 0.01 + (el.height * 0.01) / 2, t / 2]}>
        <boxGeometry args={[el.width * 0.01, el.height * 0.01, t * 4]} />
      </Subtraction>
    ));
  };

  const renderElements = (wall: WallFace, pos: [number, number, number], rotY: number) => {
    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {config.elements.filter(e => e.wall === wall).map((el) => {
          const elW = el.width * 0.01;
          const elH = el.height * 0.01;
          const elY = el.y * 0.01;

          if (el.type === 'window' || el.type === 'pvc-window' || el.type === 'skylight') {
            return (
              <group key={el.id} position={[el.x * 0.01, elY + elH / 2, t / 2]}>
                <mesh>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, t - 0.01]} />
                  <meshStandardMaterial color={el.type === 'skylight' ? "#eeeeee" : "#222222"} opacity={el.type === 'skylight' ? 0.9 : 0.6} transparent roughness={0.1} metalness={0.9} />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[elW, 0.04, t + 0.02]} />
                  <meshStandardMaterial color={el.type === 'pvc-window' ? "#ffffff" : "#444444"} />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.04, elH, t + 0.02]} />
                  <meshStandardMaterial color={el.type === 'pvc-window' ? "#ffffff" : "#444444"} />
                </mesh>
              </group>
            );
          } else if (el.type === 'gate') {
            return <AnimatedGate key={el.id} el={el} config={config} doorMat={doorMat} />;
          } else {
            return (
              <mesh key={el.id} position={[el.x * 0.01, elY + elH / 2, t / 2]}>
                <boxGeometry args={[elW - 0.02, elH - 0.02, t + 0.01]} />
                {doorMat}
              </mesh>
            );
          }
        })}
      </group>
    );
  };

  // ROOF GENERATION
  const renderRoof = () => {
    const rT = config.roofType;
    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.8} />;
    const rL = l + 0.4;
    const rW = w + 0.4;

    const roofGroup = new THREE.Group();

    if (rT === 'dual-slope') {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-rW / 2, 0);
      roofShape.lineTo(0, slopeH + 0.02);
      roofShape.lineTo(rW / 2, 0);
      roofShape.lineTo(rW / 2, -t);
      roofShape.lineTo(0, slopeH - t);
      roofShape.lineTo(-rW / 2, -t);
      roofShape.lineTo(-rW / 2, 0);
      
      return (
        <group position={[0, h, -rL / 2]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            {roofMat}
          </mesh>
          {config.gutters && (
            <>
              {/* Horizontals */}
              <mesh position={[-rW / 2 + 0.1, -t/2, rL/2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[rW / 2 - 0.1, -t/2, rL/2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              {/* Verticals (Downspouts) at back corners */}
              <mesh position={[-rW / 2 + 0.1, -h/2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
              <mesh position={[rW / 2 - 0.1, -h/2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
            </>
          )}
        </group>
      );
    }
    
    // Sloped flat roofs
    let rotX = 0, rotZ = 0, yOffset = h;
    let gutterLine = null; // [x, y, z, rotX, rotZ, length]
    let downspouts = []; // [x, y, z, height]

    if (rT === 'slope-back') {
      rotX = Math.atan(slopeH / l);
      yOffset = h + slopeH / 2;
      if (config.gutters) {
        gutterLine = [0, h - 0.05, -l/2 - 0.1, 0, Math.PI/2, rW];
        downspouts.push([-w/2, h/2, -l/2 - 0.1, h]);
      }
    } else if (rT === 'slope-front') {
      rotX = -Math.atan(slopeH / l);
      yOffset = h + slopeH / 2;
      if (config.gutters) {
        gutterLine = [0, h - 0.05, l/2 + 0.1, 0, Math.PI/2, rW];
        downspouts.push([w/2, h/2, l/2 + 0.1, h]);
      }
    } else if (rT === 'slope-left') {
      rotZ = Math.atan(slopeH / w);
      yOffset = h + slopeH / 2;
      if (config.gutters) {
        gutterLine = [-w/2 - 0.1, h - 0.05, 0, Math.PI/2, 0, rL];
        downspouts.push([-w/2 - 0.1, h/2, -l/2, h]);
      }
    } else if (rT === 'slope-right') {
      rotZ = -Math.atan(slopeH / w);
      yOffset = h + slopeH / 2;
      if (config.gutters) {
        gutterLine = [w/2 + 0.1, h - 0.05, 0, Math.PI/2, 0, rL];
        downspouts.push([w/2 + 0.1, h/2, l/2, h]);
      }
    }

    return (
      <group position={[0, yOffset, 0]}>
        <mesh rotation={[rotX, 0, rotZ]} castShadow receiveShadow>
          <boxGeometry args={[rW, t, rL]} />
          {roofMat}
        </mesh>
        {gutterLine && (
          <mesh position={[gutterLine[0]-0, gutterLine[1]-yOffset, gutterLine[2]-0]} rotation={[gutterLine[3], 0, gutterLine[4]]}>
            <cylinderGeometry args={[0.05, 0.05, gutterLine[5]]} />
            {gutterMat}
          </mesh>
        )}
        {downspouts.map((ds, i) => (
          <mesh key={i} position={[ds[0], ds[1]-yOffset, ds[2]]}>
             <cylinderGeometry args={[0.04, 0.04, ds[3]]} />
             {gutterMat}
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group castShadow receiveShadow>
      
      {/* Front Wall */}
      <mesh position={[0, 0, l / 2 - t]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[createWallShape(w, frontL, frontC, frontR), wallExtrudeSettings]} />
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
            <extrudeGeometry args={[createWallShape(w, backR, backC, backL), wallExtrudeSettings]} />
          </Base>
          {getSubtractions('back')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('back', [0, 0, -l / 2], Math.PI)}

      {/* Left Wall */}
      <mesh position={[-w / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[createWallShape(l, leftR, null, leftL), wallExtrudeSettings]} />
          </Base>
          {getSubtractions('left')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('left', [-w / 2, 0, 0], -Math.PI / 2)}

      {/* Right Wall */}
      <mesh position={[w / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[createWallShape(l, rightL, null, rightR), wallExtrudeSettings]} />
          </Base>
          {getSubtractions('right')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('right', [w / 2, 0, 0], Math.PI / 2)}

      {renderRoof()}
    </group>
  );
}
