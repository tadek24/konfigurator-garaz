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

function resolveColor(colorId: string, colors: any[]): { hex: string; isWood: boolean; textureUrl: string } {
  if (colorId && colorId.startsWith('#')) return { hex: colorId, isWood: false, textureUrl: '' };
  const found = colors.find((c: any) => c.id === colorId);
  if (!found) return { hex: '#d4d4d4', isWood: false, textureUrl: '' };
  return {
    hex: found.hex || '#d4d4d4',
    isWood: found.type === 'drewno',
    textureUrl: found.texture || '',
  };
}

const PANEL_COUNT = 5;

function SectionalGate({ el, woodColor, woodNormal, trapezTex, trapezTexHoriz, woodColorHoriz, woodNormalHoriz, config, colors, loadedTextures }: any) {
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

  const { hex: gateHex, isWood, textureUrl } = resolveColor(config.gateColor, colors);
  const isHorizontal = config.gateProfile.startsWith('poziome') || el.gateType === 'sectional';
  
  const baseWoodColor = loadedTextures[textureUrl] || woodColor;
  const baseWoodColorHoriz = loadedTextures[`${textureUrl}_horiz`] || woodColorHoriz;

  const activeColorMap = isWood ? (isHorizontal ? baseWoodColorHoriz : baseWoodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
  const activeNormalMap = isWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  return (
    <group ref={groupRef} position={[el.x * 0.01, el.y * 0.01, 0]}>
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

  const { hex: gateHex, isWood, textureUrl } = resolveColor(config.gateColor, colors);
  const isHorizontal = config.gateProfile.startsWith('poziome');
  
  const baseWoodColor = loadedTextures[textureUrl] || woodColor;
  const baseWoodColorHoriz = loadedTextures[`${textureUrl}_horiz`] || woodColorHoriz;

  const activeColorMap = isWood ? (isHorizontal ? baseWoodColorHoriz : baseWoodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
  const activeNormalMap = isWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  const gateMatComponent = (
    <meshStandardMaterial map={activeColorMap} normalMap={activeNormalMap} normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isWood ? '#ffffff' : gateHex} roughness={isWood ? 0.7 : 0.4} metalness={isWood ? 0.0 : 0.6} envMapIntensity={1.5} />
  );

  const isLeftHinged = el.hingeSide === 'left';
  const handleXOffset = isLeftHinged ? (elW / 2 - 0.1) : -(elW / 2 - 0.1);

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
        <group position={[handleXOffset, -elH + 0.25, thick / 2 + 0.025]}>
            <mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh>
            <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh>
        </group>
      </group>
    </group>
  );
}

export default function GarageModel({ config, colors = [] }: GarageModelProps) {
  const w = config.width * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
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

          setLoadedTextures(prev => ({
            ...prev,
            [url]: tex,
            [`${url}_horiz`]: horizTex
          }));
        }, undefined, () => {
          console.error("Blokada CORS na serwerze WordPress. Obrazek:", url);
        });
      }
    });
  }, [config.wallColor, config.roofColor, config.gateColor, config.doorColor, config.cornerFlashingColor, config.roofFlashingColor, config.gutterColor, colors, loadedTextures]);

  const customGutters = config.extraOptions?.some(id => id.toLowerCase().includes('rynn'));
  const showGutters = config.gutters || customGutters; 
  const showCornerFlashings = config.extraOptions?.includes('cornerFlashings');
  const showRoofFlashings = config.extraOptions?.includes('roofFlashings');

  const { trapezTexHoriz, woodColorHoriz, woodNormalHoriz } = useMemo(() => {
    trapezTex.wrapS = trapezTex.wrapT = THREE.RepeatWrapping;
    const profileRepeat = config.wallProfile.includes('t7') ? 6 : config.wallProfile.includes('t17') ? 2 : 4; 
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
  let frontCenter: number | null = null;
  let backCenter:  number | null = null;
  
  const rt = String(config.roofType || '').toLowerCase();
  
  const isDual = rt.includes('dual') || rt.includes('dwuspad');
  const isFront = rt.includes('front') || rt.includes('przód');
  const isBack = rt.includes('back') || rt.includes('tył');
  const isLeft = rt.includes('left') || rt.includes('lewo');
  const isRight = rt.includes('right') || rt.includes('prawo');

  if (isDual) { frontCenter = h + slopeH; backCenter = h + slopeH; } 
  else if (isFront) { hBL = h + slopeH; hBR = h + slopeH; } 
  else if (isBack) { hFL = h + slopeH; hFR = h + slopeH; } 
  else if (isLeft) { hFR = h + slopeH; hBR = h + slopeH; } 
  else if (isRight) { hFL = h + slopeH; hBL = h + slopeH; }

  const createFBShape = (leftH: number, rightH: number, centerH: number | null) => {
    const shape = new THREE.Shape();
    const halfW = w / 2; 
    shape.moveTo(-halfW, 0); 
    shape.lineTo( halfW, 0);
    shape.lineTo( halfW, rightH);
    if (centerH !== null) shape.lineTo(0, centerH);
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
  const frontShape = createFBShape(hFL, hFR, frontCenter);
  const backShape = createFBShape(hBR, hBL, backCenter);
  const leftSideShape  = createSideShape(hFL, hBL);
  const rightSideShape = createSideShape(hFR, hBR);

  const getSubtractions = (wall: WallFace, isSide = false, isLeft = false) => {
    return config.elements.filter(e => e.wall === wall).map((el, i) => {
      let xShape = el.x * 0.01;
      if (isSide) xShape = isLeft ? ((l - 2*t) / 2 - el.x * 0.01) : ((l - 2*t) / 2 + el.x * 0.01);
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
          if (isSide) xPos = isLeft ? ((l - 2*t) / 2 - el.x * 0.01) : ((l - 2*t) / 2 + el.x * 0.01);

          if (el.type === 'window' || el.type === 'pvc-window') {
            const { hex: windowHex } = resolveColor(config.windowColor, colors);
            const fc = windowHex && windowHex !== '#d4d4d4' ? windowHex : '#333';
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.06, elH - 0.06, t - 0.02]} />
                  <meshStandardMaterial color="#1a2a3a" opacity={0.55} transparent roughness={0.05} metalness={0.95} envMapIntensity={2.5} />
                </mesh>
                <mesh><boxGeometry args={[elW, 0.04, t + 0.02]} /><meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} /></mesh>
                <mesh><boxGeometry args={[0.04, elH, t + 0.02]} /><meshStandardMaterial color={fc} roughness={0.3} metalness={0.6} /></mesh>
              </group>
            );
          } else if (el.type === 'skylight') {
            // Cienka, przezroczysta pleksa "Lufcik"
            const { hex: windowHex } = resolveColor(config.windowColor, colors);
            const fc = windowHex && windowHex !== '#d4d4d4' ? windowHex : '#333';
            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow={false}>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, 0.02]} />
                  <meshStandardMaterial color="#e0f7fa" opacity={0.6} transparent roughness={0.1} metalness={0.2} side={THREE.DoubleSide} />
                </mesh>
                {/* Bardzo cienka rama okalająca */}
                <mesh position={[0, elH/2, 0]}><boxGeometry args={[elW, 0.02, t + 0.01]} /><meshStandardMaterial color={fc} roughness={0.5} /></mesh>
                <mesh position={[0, -elH/2, 0]}><boxGeometry args={[elW, 0.02, t + 0.01]} /><meshStandardMaterial color={fc} roughness={0.5} /></mesh>
                <mesh position={[elW/2, 0, 0]}><boxGeometry args={[0.02, elH, t + 0.01]} /><meshStandardMaterial color={fc} roughness={0.5} /></mesh>
                <mesh position={[-elW/2, 0, 0]}><boxGeometry args={[0.02, elH, t + 0.01]} /><meshStandardMaterial color={fc} roughness={0.5} /></mesh>
              </group>
            );
          } else if (el.type === 'gate') {
            return <AnimatedGate key={el.id} el={{ ...el, x: xPos * 100 }} woodColor={trapezTex} woodNormal={woodNormal} trapezTex={trapezTex} trapezTexHoriz={trapezTexHoriz} woodColorHoriz={woodColorHoriz} woodNormalHoriz={woodNormalHoriz} config={config} colors={colors} loadedTextures={loadedTextures} />;
          } else {
            const { hex: doorHex, isWood: isDoorWood, textureUrl: doorTexUrl } = resolveColor(config.doorColor, colors);
            const isHorizontal = config.doorProfile.startsWith('poziome');
            
            const baseDoorWood = loadedTextures[doorTexUrl] || trapezTex;
            const baseDoorWoodHoriz = loadedTextures[`${doorTexUrl}_horiz`] || woodColorHoriz;

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
                <group position={[handleXOffset, 0, t / 2 + 0.025]}>
                  <mesh><sphereGeometry args={[0.028, 16, 16]} /><meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} /></mesh>
                  <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /><meshStandardMaterial color="#333" roughness={0.5} /></mesh>
                </group>
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
    // Odczyt koloru rynien
    const { hex: gutterHex, isWood: isGutterWood, textureUrl: gutterTexUrl } = resolveColor(config.gutterColor, colors);
    const gutterMat = <meshStandardMaterial 
      color={isGutterWood ? '#ffffff' : gutterHex} 
      map={isGutterWood ? loadedTextures[gutterTexUrl] : undefined}
      roughness={0.6} metalness={0.5} 
    />;
    
    // Okapy dachowe (Podsufitka) - 15cm z każdej strony
    const oX = 0.15; 
    const oZ = 0.15;
    const rL = l + (oZ * 2); 
    const rW = w + (oX * 2); 

    const { hex: roofHex, isWood: isRoofWood, textureUrl: roofTexUrl } = resolveColor(config.roofColor, colors);
    const { hex: fasciaHex, isWood: isFasciaWood, textureUrl: fasciaTexUrl } = resolveColor(config.roofFlashingColor, colors);
    
    const baseRoofWood = loadedTextures[roofTexUrl] || trapezTex;
    const baseFasciaWood = loadedTextures[fasciaTexUrl];

    const roofFasciaMaterial = <meshStandardMaterial 
      color={isFasciaWood ? '#ffffff' : fasciaHex} 
      map={isFasciaWood ? baseFasciaWood : undefined}
      roughness={0.8} metalness={0.2} visible={!!showRoofFlashings} side={THREE.DoubleSide} 
    />;

    // Rynna okrągła (mała rura) z rurą spustową schodzącą do ziemi
    const renderGutterPipe = (gutterLength: number, side: 'left'|'right'|'front'|'back', position: [number, number, number], rot: [number, number, number], downspoutPos: [number, number, number]) => (
      <group position={position} rotation={rot}>
        <mesh castShadow><cylinderGeometry args={[0.03, 0.03, gutterLength]} />{gutterMat}</mesh>
        <mesh position={downspoutPos} rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, h]} />{gutterMat}</mesh>
      </group>
    );

    if (isDual) {
      const roofShape = new THREE.Shape();
      const slope = slopeH / (w / 2);
      const overhangY = slope * oX;
      
      const halfW = w / 2 + oX;
      const totalH = slopeH + overhangY;

      roofShape.moveTo(-halfW, -overhangY); 
      roofShape.lineTo(0, slopeH); 
      roofShape.lineTo(halfW, -overhangY);
      roofShape.lineTo(halfW, -overhangY + t); 
      roofShape.lineTo(0, slopeH + t); 
      roofShape.lineTo(-halfW, -overhangY + t);
      roofShape.closePath();

      return (
        <group position={[0, h, -l / 2 - oZ]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[roofShape, { depth: rL, bevelEnabled: false }]} />
            <primitive object={roofFasciaMaterial.props} attach="material-0" />
            <meshStandardMaterial attach="material-1" map={isRoofWood ? baseRoofWood : trapezTex} normalMap={isRoofWood ? woodNormal : undefined} normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isRoofWood ? '#ffffff' : roofHex} roughness={isRoofWood ? 0.7 : 0.4} metalness={isRoofWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
          </mesh>
          {showGutters && (
            <>
              {renderGutterPipe(rL, 'left', [-halfW, -overhangY + 0.02, rL / 2], [Math.PI / 2, Math.PI, 0], [0, 0, -rL/2 + 0.05])}
              {renderGutterPipe(rL, 'right', [ halfW, -overhangY + 0.02, rL / 2], [Math.PI / 2, 0, 0], [0, 0, rL/2 - 0.05])}
            </>
          )}
        </group>
      );
    }

    let roofRotX = 0, roofRotZ = 0;
    let gutterSystem = null;

    if (isFront) {
      roofRotX = Math.atan2(slopeH, l);
      gutterSystem = renderGutterPipe(rW, 'front', [0, -0.02, rL / 2], [0, Math.PI, Math.PI/2], [rW/2 - 0.05, 0, 0]);
    } else if (isBack) {
      roofRotX = -Math.atan2(slopeH, l);
      gutterSystem = renderGutterPipe(rW, 'back', [0, -0.02, -rL / 2], [0, 0, Math.PI/2], [-rW/2 + 0.05, 0, 0]);
    } else if (isLeft) {
      roofRotZ = Math.atan2(slopeH, w);
      gutterSystem = renderGutterPipe(rL, 'left', [-rW / 2, -0.02, 0], [Math.PI/2, Math.PI, 0], [0, 0, -rL/2 + 0.05]);
    } else if (isRight) {
      roofRotZ = -Math.atan2(slopeH, w);
      gutterSystem = renderGutterPipe(rL, 'right', [rW / 2, -0.02, 0], [Math.PI/2, 0, 0], [0, 0, rL/2 - 0.05]);
    }

    const zOffset = isFront ? -(t / 2) * Math.sin(roofRotX) : (isBack ? (t / 2) * Math.sin(Math.abs(roofRotX)) : 0);
    const xOffset = isLeft ? (t / 2) * Math.sin(roofRotZ) : (isRight ? -(t / 2) * Math.sin(Math.abs(roofRotZ)) : 0);

    return (
      <group>
        <mesh position={[xOffset, h + slopeH / 2 - 0.02, zOffset]} rotation={[roofRotX, 0, roofRotZ]} castShadow receiveShadow>
          <boxGeometry args={[rW, t, rL]} />
          <primitive object={roofFasciaMaterial.props} attach="material-0" />
          <primitive object={roofFasciaMaterial.props} attach="material-1" />
          <meshStandardMaterial attach="material-2" map={isRoofWood ? baseRoofWood : trapezTex} normalMap={isRoofWood ? woodNormal : undefined} normalScale={isRoofWood ? new THREE.Vector2(1.5, 1.5) : undefined} color={isRoofWood ? '#ffffff' : roofHex} roughness={isRoofWood ? 0.7 : 0.4} metalness={isRoofWood ? 0.0 : 0.6} envMapIntensity={1.5} side={THREE.DoubleSide} />
          <primitive object={roofFasciaMaterial.props} attach="material-3" />
          <primitive object={roofFasciaMaterial.props} attach="material-4" />
          <primitive object={roofFasciaMaterial.props} attach="material-5" />
          {showGutters && gutterSystem}
        </mesh>
      </group>
    );
  };

  const { hex: wallHex, isWood: isWallWood, textureUrl: wallTexUrl } = resolveColor(config.wallColor, colors);
  const isWallHorizontal = config.wallProfile.startsWith('poziome');
  const baseWallWood = loadedTextures[wallTexUrl] || trapezTex;
  const baseWallWoodHoriz = loadedTextures[`${wallTexUrl}_horiz`] || woodColorHoriz;
  const activeWallColorMap = isWallWood ? (isWallHorizontal ? baseWallWoodHoriz : baseWallWood) : (isWallHorizontal ? trapezTexHoriz : trapezTex);
  const activeWallNormalMap = isWallWood ? (isWallHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  const renderCornerTrim = (xPos: number, zPos: number, hTrim: number) => {
    const { hex: cornerHex, isWood: isCornerWood, textureUrl: cornerTexUrl } = resolveColor(config.cornerFlashingColor, colors);
    return (
      <mesh position={[xPos, hTrim / 2, zPos]} castShadow>
        <boxGeometry args={[t + 0.01, hTrim + 0.01, t + 0.01]} />
        <meshStandardMaterial 
          color={isCornerWood ? '#ffffff' : cornerHex} 
          map={isCornerWood ? loadedTextures[cornerTexUrl] : undefined}
          roughness={0.6} metalness={0.4} 
        />
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
    </>
  );
}