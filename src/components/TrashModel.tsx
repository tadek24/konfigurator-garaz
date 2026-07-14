"use client";

import { useMemo, useState, useEffect } from 'react';
import { GarageConfig, GarageElement } from '@/types';
import * as THREE from 'three';
import { Environment, ContactShadows, useTexture } from '@react-three/drei';

interface TrashModelProps {
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

export default function TrashModel({ config, colors = [] }: TrashModelProps) {
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

  // --- LOGIKA DACHU ---
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
          <mesh castShadow receiveShadow frustumCulled={false}>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            <meshStandardMaterial attach="material-0" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} shadowSide={THREE.DoubleSide} />
            <meshStandardMaterial attach="material-1"
              map={isRoofWood ? woodColor : trapezTex}
              normalMap={isRoofWood ? woodNormal : undefined}
              normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined}
              color={isRoofWood ? '#ffffff' : roofFasciaColor}
              roughness={isRoofWood ? 0.7 : 0.4}
              metalness={isRoofWood ? 0.0 : 0.6}
              envMapIntensity={1.5}
              side={THREE.DoubleSide}
              shadowSide={THREE.DoubleSide}
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
        <mesh position={[xOffset, h + slopeH / 2 + t / 2, zOffset]} rotation={[roofRotX, 0, roofRotZ]} castShadow receiveShadow frustumCulled={false}>
          <boxGeometry args={[rW, t, rL]} />
          <meshStandardMaterial attach="material-0" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} shadowSide={THREE.DoubleSide} />
          <meshStandardMaterial attach="material-1" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} shadowSide={THREE.DoubleSide} />
          <meshStandardMaterial attach="material-2" 
            map={isRoofWood ? woodColor : trapezTex}
            normalMap={isRoofWood ? woodNormal : undefined}
            normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isRoofWood ? '#ffffff' : roofFasciaColor}
            roughness={isRoofWood ? 0.7 : 0.4}
            metalness={isRoofWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
            shadowSide={THREE.DoubleSide}
          />
          <meshStandardMaterial attach="material-3" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} shadowSide={THREE.DoubleSide} />
          <meshStandardMaterial attach="material-4" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} shadowSide={THREE.DoubleSide} />
          <meshStandardMaterial attach="material-5" color={roofFasciaColor} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} shadowSide={THREE.DoubleSide} />
          {showGutters && gutterMesh}
        </mesh>
      </group>
    );
  };

  // --- LOGIKA AŻUROWYCH ŚCIAN (LAMEL) ---
  const { hex: wallHex, isWood: isWallWood } = resolveColor(config.wallColor, colors);
  const wallMat = <meshStandardMaterial 
    color={isWallWood ? '#ffffff' : wallHex} 
    map={isWallWood ? woodColor : undefined}
    roughness={0.8} 
    metalness={isWallWood ? 0.0 : 0.2} 
  />;

  const lamellaH = 0.10; // 10 cm wysokości
  const lamellaGap = 0.03; // 3 cm szpary
  const lamellaStep = lamellaH + lamellaGap;
  const lamellaDepth = 0.02; // 2 cm grubości listwy

  const renderWallLouvers = (wallType: 'front' | 'back' | 'left' | 'right') => {
    let wallWidth = wallType === 'front' || wallType === 'back' ? w : l;
    let elements = config.elements.filter(e => e.wall === wallType);
    let yMax = h;
    
    // Obliczanie wyższych ścian dla spadu dachu
    if (isDual) {
      if (wallType === 'front' || wallType === 'back') yMax = h + slopeH;
    } else if (isFront) {
      if (wallType === 'front') yMax = h + slopeH;
      else if (wallType === 'left' || wallType === 'right') yMax = h + slopeH;
    } else if (isBack) {
      if (wallType === 'back') yMax = h + slopeH;
      else if (wallType === 'left' || wallType === 'right') yMax = h + slopeH;
    } else if (isLeft) {
      if (wallType === 'left') yMax = h + slopeH;
      else if (wallType === 'front' || wallType === 'back') yMax = h + slopeH;
    } else if (isRight) {
      if (wallType === 'right') yMax = h + slopeH;
      else if (wallType === 'front' || wallType === 'back') yMax = h + slopeH;
    }

    const louvers = [];
    
    for (let y = 0.05; y < yMax; y += lamellaStep) {
      // Dla ścian bocznych przy spadach jednostronnych musimy przyciąć lamellę jeśli wystaje poza trójkąt spadu.
      // Dla uproszczenia, obetniemy lamellę lub zmniejszymy jej szerokość,
      // ale najprościej wyrenderować ją prosto z odpowiednim docięciem - lub olać ścisłe docięcie,
      // ponieważ lamelki schowają się pod dachem (lub delikatnie wystąpią co można ukryć).
      // Zróbmy prosty podział:

      let segments = [{ start: -wallWidth / 2, end: wallWidth / 2 }];
      
      // Wycinanie otworów na bramy/drzwi
      for (const el of elements) {
        const elW = el.width / 100;
        const elH = el.height / 100;
        const elX = el.x / 100;
        const elY = el.y / 100;
        
        // Czy lamella przecina ten element w osi Y?
        if (y + lamellaH/2 > elY && y - lamellaH/2 < elY + elH) {
          // Lamella przecina otwór - musimy ją przeciąć
          const elStart = elX - elW / 2;
          const elEnd = elX + elW / 2;
          
          const newSegments = [];
          for (const seg of segments) {
            if (elStart > seg.start && elEnd < seg.end) {
              // Element w środku segmentu - dzielimy na dwa
              newSegments.push({ start: seg.start, end: elStart });
              newSegments.push({ start: elEnd, end: seg.end });
            } else if (elStart <= seg.start && elEnd >= seg.end) {
              // Element przykrywa cały segment - usuwamy
            } else if (elStart <= seg.start && elEnd > seg.start && elEnd < seg.end) {
              // Element ucina lewą stronę segmentu
              newSegments.push({ start: elEnd, end: seg.end });
            } else if (elStart > seg.start && elStart < seg.end && elEnd >= seg.end) {
              // Element ucina prawą stronę segmentu
              newSegments.push({ start: seg.start, end: elStart });
            } else {
              // Element nie przecina segmentu
              newSegments.push(seg);
            }
          }
          segments = newSegments;
        }
      }

      // Docinanie skosów (bardzo proste przybliżenie by nie wystawały ponad dach)
      let effectiveY = y + lamellaH/2;
      let renderSegments = segments;

      // Generowanie meshy dla obliczonych segmentów
      for (let i = 0; i < renderSegments.length; i++) {
        const seg = renderSegments[i];
        const segW = seg.end - seg.start;
        if (segW > 0.01) {
          const segX = seg.start + segW / 2;
          
          // Wyliczamy pozycje i rotacje dla poszczególnych ścian
          let pos: [number, number, number] = [0, 0, 0];
          let rot: [number, number, number] = [0, 0, 0];
          
          if (wallType === 'front') { pos = [segX, y, l/2]; }
          if (wallType === 'back') { pos = [-segX, y, -l/2]; rot = [0, Math.PI, 0]; }
          if (wallType === 'left') { pos = [-w/2, y, -segX]; rot = [0, -Math.PI/2, 0]; }
          if (wallType === 'right') { pos = [w/2, y, segX]; rot = [0, Math.PI/2, 0]; }

          // Jeśli to skos dachu, ukrywamy lamellę jeśli jej środek wystaje ponad dach 
          // (lub skalujemy ją, ale ukrycie jest prostsze i daje kaskadowy efekt schodków).
          let isOverRoof = false;
          if (isDual) {
             if (wallType === 'front' || wallType === 'back') {
                const distFromCenter = Math.abs(segX);
                const roofHAtX = h + slopeH - (distFromCenter / (w/2)) * slopeH;
                if (effectiveY > roofHAtX) isOverRoof = true;
             }
          } else if (isFront) {
             if (wallType === 'left' || wallType === 'right') {
                const zNorm = wallType === 'left' ? (-segX + l/2)/l : (segX + l/2)/l;
                const roofHAtZ = h + zNorm * slopeH;
                if (effectiveY > roofHAtZ) isOverRoof = true;
             } else if (wallType === 'front') {
                if (effectiveY > h + slopeH) isOverRoof = true;
             }
          } else if (isBack) {
             if (wallType === 'left' || wallType === 'right') {
                const zNorm = wallType === 'left' ? (-segX + l/2)/l : (segX + l/2)/l;
                const roofHAtZ = h + (1 - zNorm) * slopeH;
                if (effectiveY > roofHAtZ) isOverRoof = true;
             } else if (wallType === 'back') {
                if (effectiveY > h + slopeH) isOverRoof = true;
             }
          } else if (isLeft) {
             if (wallType === 'front' || wallType === 'back') {
                const xNorm = wallType === 'front' ? (segX + w/2)/w : (-segX + w/2)/w;
                const roofHAtX = h + (1 - xNorm) * slopeH;
                if (effectiveY > roofHAtX) isOverRoof = true;
             } else if (wallType === 'left') {
                if (effectiveY > h + slopeH) isOverRoof = true;
             }
          } else if (isRight) {
             if (wallType === 'front' || wallType === 'back') {
                const xNorm = wallType === 'front' ? (segX + w/2)/w : (-segX + w/2)/w;
                const roofHAtX = h + xNorm * slopeH;
                if (effectiveY > roofHAtX) isOverRoof = true;
             } else if (wallType === 'right') {
                if (effectiveY > h + slopeH) isOverRoof = true;
             }
          }

          if (!isOverRoof) {
            louvers.push(
              <mesh key={`louver-${wallType}-${y}-${i}`} position={pos} rotation={rot} castShadow receiveShadow>
                <boxGeometry args={[segW, lamellaH, lamellaDepth]} />
                {wallMat}
              </mesh>
            );
          }
        }
      }
    }
    
    return <group key={`wall-${wallType}`}>{louvers}</group>;
  };
  
  // Renderujemy również podstawowe słupy nośne w narożnikach
  const renderCornerPillars = () => {
     const pillarSize = 0.08; // 8x8 cm
     const pH = h;
     return (
       <group>
         <mesh position={[-w/2 + pillarSize/2, pH/2, l/2 - pillarSize/2]} castShadow receiveShadow><boxGeometry args={[pillarSize, pH, pillarSize]}/>{wallMat}</mesh>
         <mesh position={[w/2 - pillarSize/2, pH/2, l/2 - pillarSize/2]} castShadow receiveShadow><boxGeometry args={[pillarSize, pH, pillarSize]}/>{wallMat}</mesh>
         <mesh position={[-w/2 + pillarSize/2, pH/2, -l/2 + pillarSize/2]} castShadow receiveShadow><boxGeometry args={[pillarSize, pH, pillarSize]}/>{wallMat}</mesh>
         <mesh position={[w/2 - pillarSize/2, pH/2, -l/2 + pillarSize/2]} castShadow receiveShadow><boxGeometry args={[pillarSize, pH, pillarSize]}/>{wallMat}</mesh>
       </group>
     )
  }

  // --- ELEMENTY (BRAMY, DRZWI) ---
  const renderElements = () => {
    return config.elements.map(el => {
      const elW = el.width / 100;
      const elH = el.height / 100;
      const elX = el.x / 100;
      const elY = el.y / 100;
      
      let pos: [number, number, number] = [0, 0, 0];
      let rot: [number, number, number] = [0, 0, 0];
      
      if (el.wall === 'front') { pos = [elX, elY + elH/2, l/2]; }
      if (el.wall === 'back') { pos = [-elX, elY + elH/2, -l/2]; rot = [0, Math.PI, 0]; }
      if (el.wall === 'left') { pos = [-w/2, elY + elH/2, -elX]; rot = [0, -Math.PI/2, 0]; }
      if (el.wall === 'right') { pos = [w/2, elY + elH/2, elX]; rot = [0, Math.PI/2, 0]; }

      // Prosta reprezentacja bramy/drzwi w wiacie śmietnikowej
      const { hex: gateHex, isWood: isGateWood } = resolveColor(el.type === 'gate' ? config.gateColor : config.doorColor, colors);
      const elMat = <meshStandardMaterial 
        color={isGateWood ? '#ffffff' : gateHex} 
        map={isGateWood ? woodColor : undefined}
        roughness={0.7} 
      />;

      return (
        <group key={el.id} position={pos} rotation={rot}>
           <mesh castShadow receiveShadow>
              <boxGeometry args={[elW, elH, 0.04]} />
              {elMat}
           </mesh>
           {/* Ramka */}
           <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[elW + 0.04, elH + 0.04, 0.05]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
           </mesh>
        </group>
      )
    });
  }

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
        {renderCornerPillars()}
        {renderWallLouvers('front')}
        {renderWallLouvers('back')}
        {renderWallLouvers('left')}
        {renderWallLouvers('right')}
        
        {renderElements()}
        {renderRoof()}
      </group>
    </>
  );
}
