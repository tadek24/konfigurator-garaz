"use client";

import { useMemo, useRef, useState, useEffect } from 'react';
import { GarageConfig, WallFace, GarageElement } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, useTexture } from '@react-three/drei';

interface GarageModelProps {
  config: GarageConfig;
  colors?: any[];
}

// RADAR KOLORÓW - Jeśli ktoś poda URL obrazka, to ZAWSZE traktujemy to jako drewno (niezależnie od nazwy kategorii!)
function resolveColor(colorId: string | undefined, colors: any[] = []): { hex: string; isWood: boolean; textureUrl: string } {
  if (!colorId) return { hex: '#d4d4d4', isWood: false, textureUrl: '' };
  
  let found = (colors || []).find((c: any) => c.id === colorId);
  
  // Bezpiecznik: jeśli w zamówieniu zapisało się stare ID (np. zloty-dab_45) szukaj samego zloty-dab
  if (!found && colorId.includes('_')) {
    const baseId = colorId.split('_')[0];
    found = (colors || []).find((c: any) => c.id === baseId || c.id.startsWith(baseId));
  }

  if (!found) return { hex: '#d4d4d4', isWood: false, textureUrl: '' };
  
  const hasTex = found.texture && found.texture.trim() !== '';
  const isDrewnoType = String(found.type).toLowerCase().includes('drewno') || String(found.label).toLowerCase().includes('dąb') || String(found.label).toLowerCase().includes('orzech');
  
  return {
    hex: found.hex || '#d4d4d4',
    isWood: hasTex || isDrewnoType, // ZAWSZE isWood jeśli podano obrazek!
    textureUrl: hasTex ? found.texture : '',
  };
}

const PANEL_COUNT = 5;

function SectionalGate({ el, woodColor, woodNormal, trapezTex, trapezTexHoriz, woodColorHoriz, woodNormalHoriz, config, colors, loadedTextures }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(el.isOpen ? 1 : 0);

  const elW = (el.width || 0) * 0.01;
  const elH = (el.height || 0) * 0.01;
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

  const { hex: gateHex, isWood, textureUrl } = resolveColor(config?.gateColor, colors);
  const isHorizontal = config?.gateProfile?.startsWith('poziome') || el.gateType === 'sectional';
  const baseWoodColor = textureUrl && loadedTextures[textureUrl] ? loadedTextures[textureUrl] : woodColor;
  const baseWoodColorHoriz = textureUrl && loadedTextures[`${textureUrl}_horiz`] ? loadedTextures[`${textureUrl}_horiz`] : woodColorHoriz;

  const activeColorMap = isWood ? (isHorizontal ? baseWoodColorHoriz : baseWoodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
  const activeNormalMap = isWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  return (
    <group ref={groupRef} position={[(el.x || 0) * 0.01, (el.y || 0) * 0.01, 0]}>
      {Array.from({ length: PANEL_COUNT }, (_, i) => (
        <group key={i} position={[0, i * panelH + panelH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[elW - 0.02, panelH - 0.005, thick]} />
            <meshStandardMaterial map={activeColorMap} normalMap={activeNormalMap} normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWood ? '#ffffff' : gateHex} roughness={isWood ? 0.7 : 0.4} metalness={isWood ? 0.0 : 0.6} envMapIntensity={1.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AnimatedGate({ el, woodColor, woodNormal, trapezTex, trapezTexHoriz, woodColorHoriz, woodNormalHoriz, config, colors, loadedTextures }: any) {
  const ref = useRef<THREE.Group>(null);
  const elW = (el.width || 0) * 0.01;
  const elH = (el.height || 0) * 0.01;
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
      if (leftDoor)  leftDoor.rotation.y  = -phase * (Math.PI / 2);
      if (rightDoor) rightDoor.rotation.y =  phase * (Math.PI / 2);
    }
  });

  if (el.gateType === 'sectional') {
    return <SectionalGate el={el} woodColor={woodColor} woodNormal={woodNormal} trapezTex={trapezTex} trapezTexHoriz={trapezTexHoriz} woodColorHoriz={woodColorHoriz} woodNormalHoriz={woodNormalHoriz} config={config} colors={colors} loadedTextures={loadedTextures} />;
  }

  const { hex: gateHex, isWood, textureUrl } = resolveColor(config?.gateColor, colors);
  const isHorizontal = config?.gateProfile?.startsWith('poziome');
  const baseWoodColor = textureUrl && loadedTextures[textureUrl] ? loadedTextures[textureUrl] : woodColor;
  const baseWoodColorHoriz = textureUrl && loadedTextures[`${textureUrl}_horiz`] ? loadedTextures[`${textureUrl}_horiz`] : woodColorHoriz;

  const activeColorMap = isWood ? (isHorizontal ? baseWoodColorHoriz : baseWoodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
  const activeNormalMap = isWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  const gateMatComponent = (
    <meshStandardMaterial map={activeColorMap} normalMap={activeNormalMap} normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWood ? '#ffffff' : gateHex} roughness={isWood ? 0.7 : 0.4} metalness={isWood ? 0.0 : 0.6} envMapIntensity={1.5} />
  );

  const isLeftHinged = el.hingeSide === 'left';
  const handleXOffset = isLeftHinged ? (elW / 2 - 0.1) : -(elW / 2 - 0.1);

  if (el.gateType === 'swing') {
    return (
      <group ref={ref} position={[(el.x || 0) * 0.01, (el.y || 0) * 0.01, 0]}>
        <group position={[-elW / 2, 0, 0]}>
          <mesh position={[elW / 4, elH / 2, 0]} castShadow receiveShadow><boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />{gateMatComponent}</mesh>
          <group position={[elW / 2 - 0.1, elH / 2, thick / 2 + 0.025]}><mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh><mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh></group>
        </group>
        <group position={[elW / 2, 0, 0]}>
          <mesh position={[-elW / 4, elH / 2, 0]} castShadow receiveShadow><boxGeometry args={[elW / 2 - 0.01, elH - 0.02, thick]} />{gateMatComponent}</mesh>
          <group position={[-elW / 2 + 0.1, elH / 2, thick / 2 + 0.025]}><mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh><mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh></group>
        </group>
      </group>
    );
  }

  return (
    <group ref={ref} position={[(el.x || 0) * 0.01, (el.y || 0) * 0.01, 0]}>
      <group position={[0, elH, 0]}>
        <mesh position={[0, -elH / 2, 0]} castShadow receiveShadow><boxGeometry args={[elW - 0.02, elH - 0.02, thick]} />{gateMatComponent}</mesh>
        <group position={[handleXOffset, -elH + 0.25, thick / 2 + 0.025]}><mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh><mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh></group>
      </group>
    </group>
  );
}

export default function GarageModel({ config, colors = [] }: GarageModelProps) {
  if (!config) return null;

  const w = (config.width || 300) * 0.01;
  const l = (config.length || 500) * 0.01;
  const h = (config.height || 210) * 0.01;
  const t = 0.05;     
  const slopeH = 0.4; 

  const [trapezTex] = useTexture(['/textures/trapez.jpg']);
  const [woodNormal] = useTexture(['/textures/drewno-normal.jpg']);

  const [loadedTextures, setLoadedTextures] = useState<Record<string, THREE.Texture>>({});

  useEffect(() => {
    const urlsToLoad = Array.from(new Set([
      resolveColor(config.wallColor, colors).textureUrl,
      resolveColor(config.roofColor, colors).textureUrl,
      resolveColor(config.gateColor, colors).textureUrl,
      resolveColor(config.doorColor, colors).textureUrl,
      resolveColor(config.cornerFlashingColor, colors).textureUrl,
      resolveColor(config.roofFlashingColor, colors).textureUrl,
      resolveColor(config.gutterColor, colors).textureUrl,
    ].filter(url => url !== '')));

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    urlsToLoad.forEach(url => {
      if (!loadedTextures[url]) {
        loader.load(url, (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.repeat.set(1, 1);

          const horizTex = tex.clone();
          horizTex.rotation = Math.PI / 2;
          horizTex.center.set(0.5, 0.5);
          horizTex.needsUpdate = true;

          setLoadedTextures(prev => ({ ...prev, [url]: tex, [`${url}_horiz`]: horizTex }));
        }, undefined, () => {
          console.warn("Blokada CORS na serwerze WordPress. Obrazek:", url);
        });
      }
    });
  }, [config.wallColor, config.roofColor, config.gateColor, config.doorColor, config.cornerFlashingColor, config.roofFlashingColor, config.gutterColor, colors, loadedTextures]);

  const customGutters = (config.extraOptions || []).some(id => id.toLowerCase().includes('rynn'));
  const showGutters = config.gutters || customGutters; 
  const showCornerFlashings = (config.extraOptions || []).includes('cornerFlashings');
  const showRoofFlashings = (config.extraOptions || []).includes('roofFlashings');

  const { trapezTexHoriz, woodColorHoriz, woodNormalHoriz } = useMemo(() => {
    trapezTex.wrapS = trapezTex.wrapT = THREE.RepeatWrapping;
    const profileRepeat = config.wallProfile?.includes('t7') ? 6 : config.wallProfile?.includes('t17') ? 2 : 4; 
    trapezTex.repeat.set(profileRepeat, profileRepeat);
    woodNormal.wrapS = woodNormal.wrapT = THREE.RepeatWrapping;
    woodNormal.repeat.set(1, 1);

    const rotateTexture = (tex: THREE.Texture) => {
      const clone = tex.clone();
      clone.rotation = Math.PI / 2;
      clone.center.set(0.5, 0.5);
      clone.needsUpdate = true;
      return clone;
    };

    return { trapezTexHoriz: rotateTexture(trapezTex), woodColorHoriz: rotateTexture(trapezTex), woodNormalHoriz: rotateTexture(woodNormal) };
  }, [trapezTex, woodNormal, config.wallProfile]);

  let hFL = h, hFR = h, hBL = h, hBR = h;
  const rt = String(config.roofType || '').toLowerCase();
  
  const isDual = rt.includes('dual') || rt.includes('dwuspad');
  const isFront = rt.includes('front') || rt.includes('przód');
  const isBack = rt.includes('back') || rt.includes('tył');
  const isLeft = rt.includes('left') || rt.includes('lewo');
  const isRight = rt.includes('right') || rt.includes('prawo');

  if (isDual) { hFL = h; hFR = h; hBL = h; hBR = h; } 
  else if (isFront) { hBL = h + slopeH; hBR = h + slopeH; } 
  else if (isBack) { hFL = h + slopeH; hFR = h + slopeH; } 
  else if (isLeft) { hFR = h + slopeH; hBR = h + slopeH; } 
  else if (isRight) { hFL = h + slopeH; hBL = h + slopeH; }

  const createFBShape = (leftH: number, rightH: number, isTri = false) => {
    const shape = new THREE.Shape();
    const halfW = w / 2; 
    shape.moveTo(-halfW, 0); 
    shape.lineTo( halfW, 0);
    shape.lineTo( halfW, rightH);
    if (isTri) shape.lineTo(0, rightH + slopeH);
    shape.lineTo(-halfW, leftH);
    shape.closePath();
    return shape;
  };

  const createSideShape = (frontH: number, rearH: number) => {
    const shape = new THREE.Shape();
    const sideL = l - 2 * t;
    shape.moveTo(0, 0);
    shape.lineTo(sideL, 0);
    shape.lineTo(sideL, rearH);
    shape.lineTo(0, frontH);
    shape.closePath();
    return shape;
  };

  const wallExtrude = { depth: t, bevelEnabled: false };
  const frontShape = createFBShape(hFL, hFR, isDual);
  const backShape = createFBShape(hBR, hBL, isDual);
  const leftSideShape  = createSideShape(hFL, hBL);
  const rightSideShape = createSideShape(hFR, hBR);

  const getSubtractions = (wall: WallFace, isSide = false, isLeft = false) => {
    return (config.elements || []).filter(e => e.wall === wall).map((el, i) => {
      let xShape = (el.x || 0) * 0.01;
      if (isSide) xShape = isLeft ? ((l - 2*t) / 2 - (el.x || 0) * 0.01) : ((l - 2*t) / 2 + (el.x || 0) * 0.01);
      return (
        <Subtraction key={i} position={[xShape, (el.y || 0) * 0.01 + ((el.height || 0) * 0.01) / 2, t / 2]}>
          <boxGeometry args={[(el.width || 0) * 0.01, (el.height || 0) * 0.01, t * 4]} />
        </Subtraction>
      );
    });
  };

  const renderElements = (wall: WallFace, pos: [number, number, number], rotY: number, isSide = false, isLeft = false) => {
    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {(config.elements || []).filter(e => e.wall === wall).map((el) => {
          const elW = (el.width || 0) * 0.01; const elH = (el.height || 0) * 0.01; const elY = (el.y || 0) * 0.01;
          let xPos = (el.x || 0) * 0.01;
          if (isSide) xPos = isLeft ? ((l - 2*t) / 2 - (el.x || 0) * 0.01) : ((l - 2*t) / 2 + (el.x || 0) * 0.01);

          if (el.type === 'window' || el.type === 'pvc-window') {
            const { hex: windowHex } = resolveColor(config.windowColor, colors);
            const fc = windowHex && windowHex !== '#d4d4d4' ? windowHex : '#333';
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow><boxGeometry args={[elW - 0.06, elH - 0.06, t - 0.02]} /><meshStandardMaterial color="#1a2a3a" opacity={0.55} transparent roughness={0.05} metalness={0.95} envMapIntensity={2.5} /></mesh>
                <mesh><boxGeometry args={[elW, 0.04, t + 0.02]} /><meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} /></mesh>
                <mesh><boxGeometry args={[0.04, elH, t + 0.02]} /><meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} /></mesh>
              </group>
            );
          } else if (el.type === 'skylight') {
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow={false}>
                  <boxGeometry args={[elW, elH, 0.01]} />
                  <meshStandardMaterial color="#e0f7fa" opacity={0.4} transparent roughness={0.05} metalness={0.6} side={THREE.DoubleSide} />
                </mesh>
              </group>
            );
          } else if (el.type === 'gate') {
            return <AnimatedGate key={el.id} el={{ ...el, x: xPos * 100 }} woodColor={trapezTex} woodNormal={woodNormal} trapezTex={trapezTex} trapezTexHoriz={trapezTexHoriz} woodColorHoriz={trapezTexHoriz} woodNormalHoriz={woodNormalHoriz} config={config} colors={colors} loadedTextures={loadedTextures} />;
          } else {
            const { hex: doorHex, isWood: isDoorWood, textureUrl: doorTexUrl } = resolveColor(config.doorColor, colors);
            const isHorizontal = config.doorProfile?.startsWith('poziome');
            
            const baseDoorWood = doorTexUrl && loadedTextures[doorTexUrl] ? loadedTextures[doorTexUrl] : trapezTex;
            const baseDoorWoodHoriz = doorTexUrl && loadedTextures[`${doorTexUrl}_horiz`] ? loadedTextures[`${doorTexUrl}_horiz`] : trapezTexHoriz;

            const activeColorMap = isDoorWood ? (isHorizontal ? baseDoorWoodHoriz : baseDoorWood) : (isHorizontal ? trapezTexHoriz : trapezTex);
            const activeNormalMap = isDoorWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;
            
            const isLeftHinged = el.hingeSide === 'left';
            const handleXOffset = isLeftHinged ? (elW / 2 - 0.1) : -(elW / 2 - 0.1);
            const hingeXOffset = isLeftHinged ? -(elW / 2 - 0.02) : (elW / 2 - 0.02);

            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, t + 0.01]} />
                  <meshStandardMaterial map={activeColorMap} normalMap={activeNormalMap} normalScale={isDoorWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isDoorWood ? '#ffffff' : doorHex} roughness={isDoorWood ? 0.7 : 0.4} metalness={isDoorWood ? 0.0 : 0.6} envMapIntensity={1.5} />
                </mesh>
                <group position={[handleXOffset, 0, t / 2 + 0.025]}><mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh><mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh></group>
                <mesh position={[hingeXOffset, elH / 3, t / 2 + 0.01]}><boxGeometry args={[0.02, 0.08, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
                <mesh position={[hingeXOffset, -elH / 3, t / 2 + 0.01]}><boxGeometry args={[0.02, 0.08, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
              </group>
            );
          }
        })}
      </group>
    );
  };

  const renderRoof = () => {
    const { hex: gutterHex, isWood: isGutterWood, textureUrl: gutterTexUrl } = resolveColor(config.gutterColor, colors);
    const gutterMatProps = { color: isGutterWood ? '#ffffff' : gutterHex, map: isGutterWood && gutterTexUrl && loadedTextures[gutterTexUrl] ? loadedTextures[gutterTexUrl] : undefined, roughness: 0.6, metalness: 0.5 };
    
    const oX = 0.15; const oZ = 0.15; 
    const rL = l + (oZ * 2); const rW = w + (oX * 2); 

    const { hex: roofHex, isWood: isRoofWood, textureUrl: roofTexUrl } = resolveColor(config.roofColor, colors);
    const { hex: fasciaHex, isWood: isFasciaWood, textureUrl: fasciaTexUrl } = resolveColor(config.roofFlashingColor, colors);
    
    const baseRoofWood = roofTexUrl && loadedTextures[roofTexUrl] ? loadedTextures[roofTexUrl] : trapezTex;
    const baseFasciaWood = fasciaTexUrl && loadedTextures[fasciaTexUrl] ? loadedTextures[fasciaTexUrl] : undefined;

    const renderFasciaMat = (attachName: string) => (
      <meshStandardMaterial attach={attachName} color={isFasciaWood ? '#ffffff' : fasciaHex} map={isFasciaWood && baseFasciaWood ? baseFasciaWood : undefined} roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} />
    );

    const renderMainRoofMat = (attachName: string) => (
      <meshStandardMaterial attach={attachName} color={isRoofWood ? '#ffffff' : roofHex} map={isRoofWood ? baseRoofWood : trapezTex} normalMap={isRoofWood ? woodNormal : undefined} normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined} roughness={isRoofWood ? 0.7 : 0.4} metalness={isRoofWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
    );

    const gutterR = 0.035; const pipeR = 0.025;

    const renderGutterPipe = (length: number, rot: [number, number, number], posGutter: [number, number, number], posPipe: [number, number, number], pipeHeight: number) => (
      <group>
        <mesh position={posGutter} rotation={rot} castShadow><cylinderGeometry args={[gutterR, gutterR, length, 16]} /><meshStandardMaterial {...gutterMatProps} /></mesh>
        <mesh position={[posPipe[0], pipeHeight/2, posPipe[2]]} castShadow><cylinderGeometry args={[pipeR, pipeR, pipeHeight, 16]} /><meshStandardMaterial {...gutterMatProps} /></mesh>
      </group>
    );

    if (isDual) {
      const roofTheta = Math.atan2(slopeH, w/2);
      const halfRoofW = w/2 + oX;
      const overlap = 0.08; 
      const paneLen = halfRoofW / Math.cos(roofTheta) + overlap;
      
      const liftY = (t/2) / Math.cos(roofTheta); 
      const ridgeY = h + slopeH + liftY; 
      const eavesY = h + liftY - Math.tan(roofTheta)*oX;

      return (
        <group>
          <group position={[0, ridgeY, 0]} rotation={[0, 0, roofTheta]}>
            <mesh position={[-(paneLen/2 - overlap/2), 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[paneLen, t, rL]} />
              {renderFasciaMat("material-0")}
              {renderFasciaMat("material-1")}
              {renderMainRoofMat("material-2")}
              {renderFasciaMat("material-3")}
              {renderFasciaMat("material-4")}
              {renderFasciaMat("material-5")}
            </mesh>
          </group>
          <group position={[0, ridgeY, 0]} rotation={[0, 0, -roofTheta]}>
            <mesh position={[(paneLen/2 - overlap/2), 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[paneLen, t, rL]} />
              {renderFasciaMat("material-0")}
              {renderFasciaMat("material-1")}
              {renderMainRoofMat("material-2")}
              {renderFasciaMat("material-3")}
              {renderFasciaMat("material-4")}
              {renderFasciaMat("material-5")}
            </mesh>
          </group>
          {showGutters && (
            <>
              {renderGutterPipe(rL, [Math.PI/2, 0, 0], [-w/2 - oX, eavesY - 0.01, 0], [-w/2 - oX + 0.035, 0, -l/2 - oZ + 0.05], eavesY)}
              {renderGutterPipe(rL, [Math.PI/2, 0, 0], [ w/2 + oX, eavesY - 0.01, 0], [ w/2 + oX - 0.035, 0, -l/2 - oZ + 0.05], eavesY)}
            </>
          )}
        </group>
      );
    }

    let roofRotX = 0, roofRotZ = 0;
    let gutterSystem = null;
    let paneLenX = rW, paneLenZ = rL;
    let liftY = 0;
    let eavesY = h;

    if (isFront) {
      roofRotX = Math.atan2(slopeH, l);
      liftY = (t/2)/Math.cos(roofRotX);
      eavesY = h + liftY - Math.tan(roofRotX)*oZ;
      paneLenZ = (l + oZ*2) / Math.cos(roofRotX);
      gutterSystem = renderGutterPipe(rW, [0, 0, Math.PI/2], [0, eavesY - 0.01, l/2 + oZ], [w/2 + oX - 0.05, 0, l/2 + oZ - 0.035], eavesY);
    } else if (isBack) {
      roofRotX = -Math.atan2(slopeH, l);
      liftY = (t/2)/Math.cos(Math.abs(roofRotX));
      eavesY = h + liftY - Math.tan(Math.abs(roofRotX))*oZ;
      paneLenZ = (l + oZ*2) / Math.cos(Math.abs(roofRotX));
      gutterSystem = renderGutterPipe(rW, [0, 0, Math.PI/2], [0, eavesY - 0.01, -l/2 - oZ], [w/2 + oX - 0.05, 0, -l/2 - oZ + 0.035], eavesY);
    } else if (isLeft) {
      roofRotZ = Math.atan2(slopeH, w);
      liftY = (t/2)/Math.cos(roofRotZ);
      eavesY = h + liftY - Math.tan(roofRotZ)*oX;
      paneLenX = (w + oX*2) / Math.cos(roofRotZ);
      gutterSystem = renderGutterPipe(rL, [Math.PI/2, Math.PI, 0], [-w/2 - oX, eavesY - 0.01, 0], [-w/2 - oX + 0.035, 0, -l/2 - oZ + 0.05], eavesY);
    } else if (isRight) {
      roofRotZ = -Math.atan2(slopeH, w);
      liftY = (t/2)/Math.cos(Math.abs(roofRotZ));
      eavesY = h + liftY - Math.tan(Math.abs(roofRotZ))*oX;
      paneLenX = (w + oX*2) / Math.cos(Math.abs(roofRotZ));
      gutterSystem = renderGutterPipe(rL, [Math.PI/2, 0, 0], [w/2 + oX, eavesY - 0.01, 0], [w/2 + oX - 0.035, 0, -l/2 - oZ + 0.05], eavesY);
    }

    const ridgeZ = isFront ? -l/2 - oZ : (isBack ? l/2 + oZ : 0);
    const ridgeX = isLeft ? w/2 + oX : (isRight ? -w/2 - oX : 0);
    const ridgeY = h + slopeH + liftY;

    const zShift = isFront ? paneLenZ/2 : (isBack ? -paneLenZ/2 : 0);
    const xShift = isLeft ? -paneLenX/2 : (isRight ? paneLenX/2 : 0);

    return (
      <group>
        <group position={[ridgeX, ridgeY, ridgeZ]} rotation={[roofRotX, 0, roofRotZ]}>
          <mesh position={[xShift, 0, zShift]} castShadow receiveShadow>
            <boxGeometry args={[paneLenX, t, paneLenZ]} />
            {renderFasciaMat("material-0")}
            {renderFasciaMat("material-1")}
            {renderMainRoofMat("material-2")}
            {renderFasciaMat("material-3")}
            {renderFasciaMat("material-4")}
            {renderFasciaMat("material-5")}
          </mesh>
        </group>
        {showGutters && gutterSystem}
      </group>
    );
  };

  const { hex: wallHex, isWood: isWallWood, textureUrl: wallTexUrl } = resolveColor(config?.wallColor, colors);
  const isWallHorizontal = config?.wallProfile?.startsWith('poziome');
  const baseWallWood = wallTexUrl && loadedTextures[wallTexUrl] ? loadedTextures[wallTexUrl] : trapezTex;
  const baseWallWoodHoriz = wallTexUrl && loadedTextures[`${wallTexUrl}_horiz`] ? loadedTextures[`${wallTexUrl}_horiz`] : trapezTexHoriz;
  const activeWallColorMap = isWallWood ? (isWallHorizontal ? baseWallWoodHoriz : baseWallWood) : (isWallHorizontal ? trapezTexHoriz : trapezTex);
  const activeWallNormalMap = isWallWood ? (isWallHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  const renderCornerTrim = (xPos: number, zPos: number, hTrim: number) => {
    const { hex: cornerHex, isWood: isCornerWood, textureUrl: cornerTexUrl } = resolveColor(config?.cornerFlashingColor, colors);
    return (
      <mesh position={[xPos, hTrim / 2, zPos]} castShadow>
        <boxGeometry args={[t + 0.01, hTrim + 0.01, t + 0.01]} />
        <meshStandardMaterial color={isCornerWood ? '#ffffff' : cornerHex} map={isCornerWood && cornerTexUrl && loadedTextures[cornerTexUrl] ? loadedTextures[cornerTexUrl] : undefined} roughness={0.6} metalness={0.4} />
      </mesh>
    );
  };

  return (
    <>
      <Environment preset="city" />
      <mesh scale={100}><sphereGeometry args={[1, 32, 32]} /><meshBasicMaterial color="#d1d5db" side={THREE.BackSide} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow><planeGeometry args={[150, 150]} /><meshStandardMaterial color="#4a4a4a" roughness={0.9} metalness={0.1} /></mesh>
      <gridHelper args={[150, 150, '#3a3a3a', '#555555']} position={[0, -0.02, 0]} />
      <ContactShadows resolution={1024} scale={25} blur={2.5} opacity={0.7} far={10} color="#000000" position={[0, 0, 0]} />
      
      <group name="garageModelGroup">
        {showCornerFlashings && (
          <>
            {renderCornerTrim(-w/2 + t/2, l/2 - t/2, hFL)}
            {renderCornerTrim(w/2 - t/2, l/2 - t/2, hFR)}
            {renderCornerTrim(-w/2 + t/2, -l/2 + t/2, hBL)}
            {renderCornerTrim(w/2 - t/2, -l/2 + t/2, hBR)}
          </>
        )}

        <group>
          <mesh position={[0, 0, l / 2 - t]} castShadow receiveShadow>
            <Geometry><Base><extrudeGeometry args={[frontShape, wallExtrude]} /></Base>{getSubtractions('front')}</Geometry>
            <meshStandardMaterial map={activeWallColorMap} normalMap={activeWallNormalMap} normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWallWood ? '#ffffff' : wallHex} roughness={isWallWood ? 0.7 : 0.4} metalness={isWallWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
          </mesh>
          {renderElements('front', [0, 0, l / 2 - t], 0)}

          <mesh position={[0, 0, -l / 2 + t]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
            <Geometry><Base><extrudeGeometry args={[backShape, wallExtrude]} /></Base>{getSubtractions('back')}</Geometry>
            <meshStandardMaterial map={activeWallColorMap} normalMap={activeWallNormalMap} normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWallWood ? '#ffffff' : wallHex} roughness={isWallWood ? 0.7 : 0.4} metalness={isWallWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
          </mesh>
          {renderElements('back', [0, 0, -l / 2 + t], Math.PI)}

          <mesh position={[-w / 2, 0, l / 2 - t]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
            <Geometry><Base><extrudeGeometry args={[leftSideShape, wallExtrude]} /></Base>{getSubtractions('left', true, true)}</Geometry>
            <meshStandardMaterial map={activeWallColorMap} normalMap={activeWallNormalMap} normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWallWood ? '#ffffff' : wallHex} roughness={isWallWood ? 0.7 : 0.4} metalness={isWallWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
          </mesh>
          {renderElements('left', [-w / 2, 0, l / 2 - t], Math.PI / 2, true, true)}

          <mesh position={[w / 2 - t, 0, l / 2 - t]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
            <Geometry><Base><extrudeGeometry args={[rightSideShape, wallExtrude]} /></Base>{getSubtractions('right', true, false)}</Geometry>
            <meshStandardMaterial map={activeWallColorMap} normalMap={activeWallNormalMap} normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWallWood ? '#ffffff' : wallHex} roughness={isWallWood ? 0.7 : 0.4} metalness={isWallWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
          </mesh>
          {renderElements('right', [w / 2 - t, 0, l / 2 - t], Math.PI / 2, true, false)}

          {renderRoof()}
        </group>
      </group>
    </>
  );
}
