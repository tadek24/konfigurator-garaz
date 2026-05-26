"use client";

import { useMemo, useRef, ReactNode, useEffect } from 'react';
import { GarageConfig, WallFace, GarageElement, TextureFinish } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';

interface GarageModelProps {
  config: GarageConfig;
}

// Generates procedural bump map for PBR finishes
function createPBRMap(finish: TextureFinish): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#888888'; // base neutral grey
    ctx.fillRect(0, 0, 512, 512);

    if (finish === 'trapezowa') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 32) ctx.fillRect(i, 0, 16, 512);
    } else if (finish === 'rabek') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 64) ctx.fillRect(i, 0, 4, 512);
    } else if (finish === 'blachodachowka') {
      // grid of overlapping tiles
      ctx.fillStyle = '#ffffff';
      for (let x = 0; x < 512; x += 64) {
        for (let y = 0; y < 512; y += 64) {
          ctx.beginPath();
          ctx.arc(x + 32, y + 32, 28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (finish === 'drewnopodobna') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 512; i += 4) {
        if (Math.random() > 0.5) ctx.fillRect(0, i, 512, 2);
      }
    } else if (finish === 'ocynk') {
      for (let x = 0; x < 512; x += 4) {
        for (let y = 0; y < 512; y += 4) {
          const lum = Math.floor(Math.random() * 255);
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

function AnimatedGate({ el, config, doorMat, garageHeight }: { el: GarageElement, config: GarageConfig, doorMat: ReactNode, garageHeight: number }) {
  const ref = useRef<THREE.Group>(null);
  
  const elW = el.width * 0.01;
  const elH = el.height * 0.01;
  const t = 0.05;

  const animState = useRef({ progress: el.isOpen ? 1 : 0 });

  useFrame((_, delta) => {
    if (!ref.current) return;
    
    // Interpolate towards target
    const target = el.isOpen ? 1 : 0;
    if (animState.current.progress < target) {
      animState.current.progress += delta * 1.5;
      if (animState.current.progress > target) animState.current.progress = target;
    } else if (animState.current.progress > target) {
      animState.current.progress -= delta * 1.5;
      if (animState.current.progress < target) animState.current.progress = target;
    }

    const phase = animState.current.progress;

    if (el.gateType === 'up-and-over') {
      const pivot = ref.current.children[0];
      if (pivot) {
        // Top hinge pivot, swinging INWARDS
        pivot.rotation.x = -phase * (Math.PI / 2.2);
      }
    } else if (el.gateType === 'sectional') {
      const door = ref.current.children[0];
      if (door) {
        const h = garageHeight * 0.01;
        const elY = el.y * 0.01;
        
        // Ceiling clearance
        const maxV = Math.max(elH, h - elY - 0.10);
        
        // Slide UP first (phase 0 to 0.5), then curve INWARDS (phase 0.5 to 1.0)
        let theta = 0;
        let y_c = elH / 2;
        let z_c = 0;

        const slidePhase = Math.min(1, phase * 2);
        const maxVerticalY_c = maxV - elH / 2;
        y_c = (elH / 2) + slidePhase * (maxVerticalY_c - elH / 2);

        if (phase > 0.5) {
          const curvePhase = (phase - 0.5) * 2;
          theta = curvePhase * (Math.PI / 2);
          
          z_c = - (elH / 2) * Math.sin(theta);
          y_c = maxV - (elH / 2) * Math.cos(theta);
        }

        door.rotation.x = -theta;
        door.position.y = y_c;
        door.position.z = z_c;
      }
    } else if (el.gateType === 'swing') {
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

  // Tilt Gate
  if (el.gateType === 'up-and-over') {
    return (
      <group ref={ref} position={[el.x * 0.01, el.y * 0.01, 0]}>
        {/* Pivot group at the very top of the door */}
        <group position={[0, elH, 0]}>
          <mesh position={[0, -elH / 2, 0]}>
            <boxGeometry args={[elW - 0.02, elH - 0.02, t]} />
            {doorMat}
          </mesh>
        </group>
      </group>
    );
  }

  // Sectional
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

  const wallTexture = useMemo(() => createPBRMap(config.finish), [config.finish]);
  const roofTexture = useMemo(() => createPBRMap(config.finish), [config.finish]);

  // If ocynk, force silver color
  const effectiveWallColor = config.finish === 'ocynk' ? '#d4d4d4' : config.wallColor;
  const effectiveRoofColor = config.finish === 'ocynk' ? '#d4d4d4' : config.roofColor;
  const effectiveDoorColor = config.finish === 'ocynk' ? '#d4d4d4' : config.doorColor;

  const wallMat = <meshStandardMaterial color={effectiveWallColor} roughness={0.2} metalness={0.85} bumpMap={wallTexture} bumpScale={0.015} side={THREE.DoubleSide} />;
  const roofMat = <meshStandardMaterial color={effectiveRoofColor} roughness={0.2} metalness={0.85} bumpMap={roofTexture} bumpScale={0.015} side={THREE.DoubleSide} />;
  const doorMat = <meshStandardMaterial color={effectiveDoorColor} roughness={0.2} metalness={0.85} bumpMap={wallTexture} bumpScale={0.015} />;

  // Heights logic for the roofs
  let frontL = h, frontC: number | null = null, frontR = h;
  let backL = h, backC: number | null = null, backR = h;
  
  let leftFrontH = h, leftRearH = h;
  let rightFrontH = h, rightRearH = h;

  if (config.roofType === 'dual-slope') {
    frontC = h + slopeH; backC = h + slopeH;
  } else if (config.roofType === 'slope-back') {
    frontL = frontC = frontR = h + slopeH;
    leftFrontH = rightFrontH = h + slopeH;
    leftRearH = rightRearH = h;
  } else if (config.roofType === 'slope-front') {
    backL = backC = backR = h + slopeH;
    leftFrontH = rightFrontH = h;
    leftRearH = rightRearH = h + slopeH;
  } else if (config.roofType === 'slope-left') {
    frontR = backR = h + slopeH;
    rightFrontH = rightRearH = h + slopeH;
  } else if (config.roofType === 'slope-right') {
    frontL = backL = h + slopeH;
    leftFrontH = leftRearH = h + slopeH;
  }

  // Front and Back walls use centered origin
  const createFrontBackWallShape = (width: number, lH: number, cH: number | null, rH: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, rH);
    if (cH !== null) shape.lineTo(0, cH);
    shape.lineTo(-width / 2, lH);
    shape.lineTo(-width / 2, 0);
    return shape;
  };

  // Left and Right walls use procedural trapezoids starting at Bottom Front (0,0) going to Bottom Rear (Length, 0)
  const createSideWallShape = (length: number, frontHeight: number, rearHeight: number) => {
    const shape = new THREE.Shape();
    // Vertex 1: Bottom Front
    shape.moveTo(0, 0);
    // Vertex 2: Bottom Rear
    shape.lineTo(length, 0);
    // Vertex 3: Top Rear
    shape.lineTo(length, rearHeight);
    // Vertex 4: Top Front
    shape.lineTo(0, frontHeight);
    shape.lineTo(0, 0);
    return shape;
  };

  const wallExtrudeSettings = { depth: t, bevelEnabled: false };

  const getSubtractions = (wall: WallFace, isSide: boolean = false, isLeft: boolean = false) => {
    return config.elements.filter(e => e.wall === wall).map((el, i) => {
      let xShape = el.x * 0.01;
      if (isSide) {
        // For side walls, Shape X=0 is Front, X=l is Rear. Center is at l/2.
        // For Left Wall, positive el.x (right from outside) goes towards Front -> X decreases
        // For Right Wall, positive el.x (right from outside) goes towards Rear -> X increases
        xShape = isLeft ? (l / 2 - el.x * 0.01) : (l / 2 + el.x * 0.01);
      }
      return (
        <Subtraction key={i} position={[xShape, el.y * 0.01 + (el.height * 0.01) / 2, t / 2]}>
          <boxGeometry args={[el.width * 0.01, el.height * 0.01, t * 4]} />
        </Subtraction>
      );
    });
  };

  const renderElements = (wall: WallFace, pos: [number, number, number], rotY: number, isSide: boolean = false, isLeft: boolean = false) => {
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
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
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
            const modifiedEl = { ...el, x: xPos * 100 };
            return <AnimatedGate key={el.id} el={modifiedEl} config={config} doorMat={doorMat} garageHeight={config.height} />;
          } else {
            return (
              <mesh key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
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

    if (rT === 'dual-slope') {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-rW / 2, 0); 
      roofShape.lineTo(0, slopeH);
      roofShape.lineTo(rW / 2, 0);
      roofShape.lineTo(rW / 2, t);
      roofShape.lineTo(0, slopeH + t);
      roofShape.lineTo(-rW / 2, t);
      roofShape.lineTo(-rW / 2, 0);
      
      return (
        <group position={[0, h, -rL / 2]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            {roofMat}
          </mesh>
          {config.gutters && (
            <>
              <mesh position={[-rW / 2 + 0.1, t/2, rL/2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[rW / 2 - 0.1, t/2, rL/2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, rL]} />{gutterMat}</mesh>
              <mesh position={[-rW / 2 + 0.1, -h/2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
              <mesh position={[rW / 2 - 0.1, -h/2, 0]}><cylinderGeometry args={[0.04, 0.04, h]} />{gutterMat}</mesh>
            </>
          )}
        </group>
      );
    }
    
    // Sloped flat roofs
    let rotX = 0, rotZ = 0;
    let gutterLine = null;
    let downspouts = [];
    let yOffset = h + slopeH / 2;
    
    // Calculate the exact angle using Math.atan((frontHeight - rearHeight) / garageLength)
    const exactAngleX = Math.atan((leftFrontH - leftRearH) / l);

    if (rT === 'slope-back' || rT === 'slope-front') {
      // Apply it to the roof's X-axis rotation. Negative sign because in Three.js right-handed system,
      // negative X-rotation lifts the front (+Z) up.
      rotX = -exactAngleX;
      // Calculate exact Y offset so the roof bottom sits perfectly flush with the slanted wall top
      yOffset = (leftFrontH + leftRearH) / 2 + (t / 2) / Math.cos(rotX);
    }

    if (rT === 'slope-back') {
      if (config.gutters) {
        gutterLine = [0, h - 0.05, -l/2 - 0.1, 0, Math.PI/2, rW];
        downspouts.push([-w/2, h/2, -l/2 - 0.1, h]);
      }
    } else if (rT === 'slope-front') {
      if (config.gutters) {
        gutterLine = [0, h - 0.05, l/2 + 0.1, 0, Math.PI/2, rW];
        downspouts.push([w/2, h/2, l/2 + 0.1, h]);
      }
    } else if (rT === 'slope-left') {
      rotZ = Math.atan(slopeH / w);
      yOffset += (t/2) / Math.cos(rotZ);
      if (config.gutters) {
        gutterLine = [-w/2 - 0.1, h - 0.05, 0, Math.PI/2, 0, rL];
        downspouts.push([-w/2 - 0.1, h/2, -l/2, h]);
      }
    } else if (rT === 'slope-right') {
      rotZ = -Math.atan(slopeH / w);
      yOffset += (t/2) / Math.cos(rotZ);
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
            <extrudeGeometry args={[createFrontBackWallShape(w, frontL, frontC, frontR), wallExtrudeSettings]} />
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
            <extrudeGeometry args={[createFrontBackWallShape(w, backR, backC, backL), wallExtrudeSettings]} />
          </Base>
          {getSubtractions('back')}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('back', [0, 0, -l / 2], Math.PI)}

      {/* Left Wall - rotated by +90deg so Shape X points to Rear (-Z), placed at Front Z=l/2 */}
      <mesh position={[-w / 2 - t, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[createSideWallShape(l, leftFrontH, leftRearH), wallExtrudeSettings]} />
          </Base>
          {getSubtractions('left', true, true)}
        </Geometry>
        {wallMat}
      </mesh>
      {renderElements('left', [-w / 2 - t, 0, l / 2], Math.PI / 2, true, true)}

      {/* Right Wall - rotated by +90deg so Shape X points to Rear (-Z), placed at Front Z=l/2 */}
      <mesh position={[w / 2, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Geometry>
          <Base>
            <extrudeGeometry args={[createSideWallShape(l, rightFrontH, rightRearH), wallExtrudeSettings]} />
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
