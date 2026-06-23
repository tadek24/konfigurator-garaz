"use client";

import { useMemo, useRef, ReactNode, useState, useEffect } from 'react';
import { GarageConfig, WallFace, GarageElement } from '@/types';
import * as THREE from 'three';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, useTexture } from '@react-three/drei';

interface GarageModelProps {
  config: GarageConfig;
  colors?: any[];
}

// ── Helper: tłumaczy ID koloru WP na dane materiału Three.js ──────────────────
// Zwraca hex (poprawny kolor CSS) i flagę isWood do doboru tekstury.
function resolveColor(colorId: string, colors: any[]): { hex: string; isWood: boolean; textureUrl: string } {
  // Wartości domyślne (INITIAL_CONFIG) zaczynają się od '#' – są już HEX-em
  if (colorId && colorId.startsWith('#')) {
    return { hex: colorId, isWood: false, textureUrl: '' };
  }
  // Szukamy koloru po ID w tablicy przekazanej z WordPress
  const found = colors.find((c: any) => c.id === colorId);
  if (!found) {
    // Fallback gdy baza nie załadowana lub ID nieznane w tej sesji
    return { hex: '#d4d4d4', isWood: false, textureUrl: '' };
  }
  return {
    hex: found.hex || '#d4d4d4',
    isWood: found.type === 'drewno',
    // URL tekstury z WP (dla kolorów drewnopodobnych zawiera ścieżkę do pliku JPG)
    textureUrl: found.texture || '',
  };
}

// ── Brama Segmentowa ───────────────────────
const PANEL_COUNT = 5;

function SectionalGate({ el, woodColor, woodNormal, trapezTex, trapezTexHoriz, woodColorHoriz, woodNormalHoriz, config, colors }: { 
  el: GarageElement; 
  woodColor: THREE.Texture; 
  woodNormal: THREE.Texture; 
  trapezTex: THREE.Texture;
  trapezTexHoriz: THREE.Texture;
  woodColorHoriz: THREE.Texture;
  woodNormalHoriz: THREE.Texture;
  config: GarageConfig;
  colors: any[];
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

  // Tłumaczenie ID koloru bramy na HEX i flagę drewna (na podstawie typu koloru z WP)
  const { hex: gateHex, isWood } = resolveColor(config.gateColor, colors);
  // Brama segmentowa domyślnie wygląda najlepiej z poziomymi przetłoczeniami, 
  // ale respektujemy też ustawienie z konfiguratora jeśli istnieje.
  const isHorizontal = config.gateProfile.startsWith('poziome') || el.gateType === 'sectional';
  
  const activeColorMap = isWood ? (isHorizontal ? woodColorHoriz : woodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
  const activeNormalMap = isWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  return (
    <group ref={groupRef} position={[el.x * 0.01, el.y * 0.01, 0]}>
      {Array.from({ length: PANEL_COUNT }, (_, i) => (
        <group key={i} position={[0, i * panelH + panelH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[elW - 0.02, panelH - 0.005, thick]} />
            <meshStandardMaterial
              map={activeColorMap}
              normalMap={activeNormalMap}
              normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined}
              color={isWood ? '#ffffff' : gateHex}
              roughness={isWood ? 0.7 : 0.4}
              metalness={isWood ? 0.0 : 0.6}
              envMapIntensity={1.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Brama Uchylna i Dwuskrzydłowa ───────────────────────────────
function AnimatedGate({ el, woodColor, woodNormal, trapezTex, trapezTexHoriz, woodColorHoriz, woodNormalHoriz, config, colors }: { 
  el: GarageElement; 
  woodColor: THREE.Texture; 
  woodNormal: THREE.Texture; 
  trapezTex: THREE.Texture;
  trapezTexHoriz: THREE.Texture;
  woodColorHoriz: THREE.Texture;
  woodNormalHoriz: THREE.Texture;
  config: GarageConfig;
  colors: any[];
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
      // Obrót na zewnątrz: uj. obrót osi X wysuwa dół panelu do przodu (w kierunku widza)
      if (pivot) pivot.rotation.x = -phase * (Math.PI / 2); 
    } else if (el.gateType === 'swing') {
      const leftDoor  = ref.current.children[0];
      const rightDoor = ref.current.children[1];
      // Skrzydła otwierają się na zewnątrz garażu (odwrócone znaki rotacji)
      if (leftDoor)  leftDoor.rotation.y  = -phase * (Math.PI / 2);
      if (rightDoor) rightDoor.rotation.y =  phase * (Math.PI / 2);
    }
  });

  if (el.gateType === 'sectional') {
    return <SectionalGate el={el} woodColor={woodColor} woodNormal={woodNormal} trapezTex={trapezTex} trapezTexHoriz={trapezTexHoriz} woodColorHoriz={woodColorHoriz} woodNormalHoriz={woodNormalHoriz} config={config} colors={colors} />;
  }

  // Tłumaczenie ID koloru bramy na HEX i flagę drewna
  const { hex: gateHex, isWood } = resolveColor(config.gateColor, colors);
  const isHorizontal = config.gateProfile.startsWith('poziome');
  
  const activeColorMap = isWood ? (isHorizontal ? woodColorHoriz : woodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
  const activeNormalMap = isWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;

  const gateMatComponent = (
    <meshStandardMaterial
      map={activeColorMap}
      normalMap={activeNormalMap}
      normalScale={isWood ? new THREE.Vector2(1.5, 1.5) : undefined}
      color={isWood ? '#ffffff' : gateHex}
      roughness={isWood ? 0.7 : 0.4}
      metalness={isWood ? 0.0 : 0.6}
      envMapIntensity={1.5}
    />
  );

  // Zabezpieczenie domyślnej klamki, gdy panel UI jeszcze jej nie wysyła
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

// ── Główny model Garażu ──────────────────────────────────────────────────────
export default function GarageModel({ config, colors = [] }: GarageModelProps) {
  const w = config.width * 0.01;
  const l = config.length * 0.01;
  const h = config.height * 0.01;
  const t = 0.05;     
  const slopeH = 0.4; 

  // Tekstura przetłoczeń trapezowych – metalowa blacha falista (ładowana raz, repeat per profil)
  const [trapezTex] = useTexture(['/textures/trapez.jpg']);
  const [woodNormal] = useTexture(['/textures/drewno-normal.jpg']);

  const [dynamicWoodColor, setDynamicWoodColor] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    // Szukamy koloru dla ściany, by poprawnie wczytać teksturę drewna
    const wallColorData = colors.find((c: any) => c.id === config.wallColor);
    
    if (wallColorData && wallColorData.type === 'drewno' && wallColorData.texture) {
      console.log('Ładuję teksturę:', wallColorData.texture);
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
  const showCornerFlashings = config.extraOptions?.includes('cornerFlashings');
  const showRoofFlashings = config.extraOptions?.includes('roofFlashings');

  const woodColor = dynamicWoodColor || trapezTex;

  // Generowanie poziomych tekstur w locie (żeby paski leciały na boki)
  const { trapezTexHoriz, woodColorHoriz, woodNormalHoriz } = useMemo(() => {
    // Repeat przetłoczeń zależny od wybranego profilu:
    // T7 = 6 (gęste, wąskie żebra), T14 = 4 (standard), T17 = 2 (szerokie rzadkie)
    trapezTex.wrapS = trapezTex.wrapT = THREE.RepeatWrapping;
    const profileRepeat = config.wallProfile.includes('t7')  ? 6
                        : config.wallProfile.includes('t17') ? 2
                        : 4; // t14 = wartość domyślna
    trapezTex.repeat.set(profileRepeat, profileRepeat);

    woodNormal.wrapS = woodNormal.wrapT = THREE.RepeatWrapping;
    woodNormal.repeat.set(2, 2);

    const rotateTexture = (tex: THREE.Texture) => {
      const clone = tex.clone();
      clone.rotation = Math.PI / 2;
      clone.center.set(0.5, 0.5);
      clone.needsUpdate = true;
      return clone;
    };

    return {
      trapezTexHoriz: rotateTexture(trapezTex),
      woodColorHoriz: dynamicWoodColor ? rotateTexture(dynamicWoodColor) : rotateTexture(trapezTex),
      woodNormalHoriz: rotateTexture(woodNormal),
    };
  }, [trapezTex, dynamicWoodColor, woodNormal, config.wallProfile]);

  let hFL = h, hFR = h, hBL = h, hBR = h;
  let frontCenter: number | null = null;
  let backCenter:  number | null = null;
  
  const rt = String(config.roofType || '').toLowerCase();
  
  const isDual = rt.includes('dwuspadowy') || rt.includes('dual');
  const isFront = rt.includes('przód') || rt.includes('przod') || rt.includes('front');
  const isBack = rt.includes('tył') || rt.includes('tyl') || rt.includes('back') || rt.includes('rear');
  const isLeft = rt.includes('lewo') || rt.includes('left');
  const isRight = rt.includes('prawo') || rt.includes('right');

  if (isDual) { frontCenter = h + slopeH; backCenter = h + slopeH; } 
  else if (isFront) { hBL = h + slopeH; hBR = h + slopeH; } 
  else if (isBack) { hFL = h + slopeH; hFR = h + slopeH; } 
  else if (isLeft) { hFR = h + slopeH; hBR = h + slopeH; } 
  else if (isRight) { hFL = h + slopeH; hBL = h + slopeH; }

  // 1. ZOPTYMALIZOWANA MATEMATYKA BRYŁY (Idealne przyleganie na rogach)
  const createFBShape = (leftH: number, rightH: number, centerH: number | null) => {
    const shape = new THREE.Shape();
    const halfW = w / 2 - t; // Węższa ściana o grubości bocznych
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
    const slope = (rearH - frontH) / l;
    shape.moveTo(0, 0);
    shape.lineTo(l, 0);
    shape.lineTo(l, rearH);
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
      if (isSide) xShape = isLeft ? (l / 2 - el.x * 0.01) : (l / 2 + el.x * 0.01);
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
          if (isSide) xPos = isLeft ? (l / 2 - el.x * 0.01) : (l / 2 + el.x * 0.01);

          if (el.type === 'window' || el.type === 'pvc-window' || el.type === 'skylight') {
            const { hex: windowHex } = resolveColor(config.windowColor, colors);
            const fc = windowHex && windowHex !== '#d4d4d4' ? windowHex : '#333';
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
            return <AnimatedGate key={el.id} el={{ ...el, x: xPos * 100 }} woodColor={woodColor} woodNormal={woodNormal} trapezTex={trapezTex} trapezTexHoriz={trapezTexHoriz} woodColorHoriz={woodColorHoriz} woodNormalHoriz={woodNormalHoriz} config={config} colors={colors} />;
          } else {
            // Tłumaczenie ID koloru drzwi na HEX i flagę drewna
            const { hex: doorHex, isWood: isDoorWood } = resolveColor(config.doorColor, colors);
            const isHorizontal = config.doorProfile.startsWith('poziome');
            
            const activeColorMap = isDoorWood ? (isHorizontal ? woodColorHoriz : woodColor) : (isHorizontal ? trapezTexHoriz : trapezTex);
            const activeNormalMap = isDoorWood ? (isHorizontal ? woodNormalHoriz : woodNormal) : undefined;
            
            const isLeftHinged = el.hingeSide === 'left';
            const handleXOffset = isLeftHinged ? (elW / 2 - 0.1) : -(elW / 2 - 0.1);
            const hingeXOffset = isLeftHinged ? -(elW / 2 - 0.02) : (elW / 2 - 0.02);

            return (
              <group key={el.id} position={[xPos, elY + elH / 2, t / 2]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[elW - 0.02, elH - 0.02, t + 0.01]} />
                  <meshStandardMaterial
                    map={activeColorMap}
                    normalMap={activeNormalMap}
                    normalScale={isDoorWood ? new THREE.Vector2(1.5, 1.5) : undefined}
                    color={isDoorWood ? '#ffffff' : doorHex}
                    roughness={isDoorWood ? 0.7 : 0.4}
                    metalness={isDoorWood ? 0.0 : 0.6}
                    envMapIntensity={1.5}
                  />
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
    const gutterMat = <meshStandardMaterial color="#3b3b3c" roughness={0.6} metalness={0.55} />;
    const rL = l + 0.4; 
    const rW = w + 0.4; 

    // Tłumaczenie ID koloru dachu na HEX i flagę drewna
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
    let gutterMesh = null, downspouts = null;

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

  // Tłumaczenie ID koloru ścian na HEX i flagę drewna
  const { hex: wallHex, isWood: isWallWood } = resolveColor(config.wallColor, colors);
  const isWallHorizontal = config.wallProfile.startsWith('poziome');
  const activeWallColorMap = isWallWood ? (isWallHorizontal ? woodColorHoriz : woodColor) : (isWallHorizontal ? trapezTexHoriz : trapezTex);
  const activeWallNormalMap = isWallWood ? (isWallHorizontal ? woodNormalHoriz : woodNormal) : undefined;
  const wallBaseColor = wallHex;

  // Słupki narożnikowe maskujące ewentualne cięcia
  const renderCornerTrim = (xPos: number, zPos: number, hTrim: number) => {
    return (
      <mesh position={[xPos, hTrim / 2, zPos]} castShadow>
        <boxGeometry args={[t + 0.002, hTrim + 0.01, t + 0.002]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.6} metalness={0.4} />
      </mesh>
    );
  };

  return (
    <>
      {/* ── GIGANTYCZNA KULA MASKUJĄCA TŁO MIASTA (Definitywne rozwiązanie) ── */}
      <Environment preset="city" />
      <mesh scale={100}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#d1d5db" side={THREE.BackSide} />
      </mesh>
      
      {/* Podłoże */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[150, 150, '#3a3a3a', '#555555']} position={[0, -0.02, 0]} />

      <ContactShadows resolution={1024} scale={25} blur={2.5} opacity={0.7} far={10} color="#000000" position={[0, 0, 0]} />
      
      {/* Narożniki (Kątowniki obróbki blacharskiej) */}
      {showCornerFlashings && (
        <>
          {renderCornerTrim(-w/2 + t/2, l/2 - t/2, hFL)}
          {renderCornerTrim(w/2 - t/2, l/2 - t/2, hFR)}
          {renderCornerTrim(-w/2 + t/2, -l/2 + t/2, hBL)}
          {renderCornerTrim(w/2 - t/2, -l/2 + t/2, hBR)}
        </>
      )}

      <group>
        {/* ŚCIANA FRONTOWA */}
        <mesh position={[0, 0, l / 2 - t / 2]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[frontShape, wallExtrude]} /></Base>
            {getSubtractions('front')}
          </Geometry>
          <meshStandardMaterial
            map={activeWallColorMap}
            normalMap={activeWallNormalMap}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {renderElements('front', [0, 0, l / 2 - t], 0)}

        {/* ŚCIANA TYLNA */}
        <mesh position={[0, 0, -l / 2 + t / 2]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[backShape, wallExtrude]} /></Base>
            {getSubtractions('back')}
          </Geometry>
          <meshStandardMaterial
            map={activeWallColorMap}
            normalMap={activeWallNormalMap}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {renderElements('back', [0, 0, -l / 2 + t], Math.PI)}

        {/* ŚCIANA LEWA */}
        <mesh position={[-w / 2 + t / 2, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[leftSideShape, wallExtrude]} /></Base>
            {getSubtractions('left', true, true)}
          </Geometry>
          <meshStandardMaterial
            map={activeWallColorMap}
            normalMap={activeWallNormalMap}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {renderElements('left', [-w / 2 + t, 0, l / 2], Math.PI / 2, true, true)}

        {/* ŚCIANA PRAWA */}
        <mesh position={[w / 2 - t / 2, 0, l / 2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <Geometry>
            <Base><extrudeGeometry args={[rightSideShape, wallExtrude]} /></Base>
            {getSubtractions('right', true, false)}
          </Geometry>
          <meshStandardMaterial
            map={activeWallColorMap}
            normalMap={activeWallNormalMap}
            normalScale={isWallWood ? new THREE.Vector2(1.5, 1.5) : undefined}
            color={isWallWood ? '#ffffff' : wallBaseColor}
            roughness={isWallWood ? 0.7 : 0.4}
            metalness={isWallWood ? 0.0 : 0.6}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {renderElements('right', [w / 2 - t, 0, l / 2], Math.PI / 2, true, false)}

        {renderRoof()}
      </group>
    </>
  );
}