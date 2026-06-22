"use client";

import { Canvas } from '@react-three/fiber';
import { CameraControls, ContactShadows, Edges, Html } from '@react-three/drei';
import { GarageConfig, WallFace } from '@/types';
import GarageModel from './GarageModel';
import { Suspense, useEffect, useRef } from 'react';

interface CanvasAreaProps {
  config: GarageConfig;
  selectedWall: WallFace;
  activeDimId?: string | null; // NOWOŚĆ: Odbiera ID klikniętego elementu z panelu
}

function CameraRig({ selectedWall, config, activeDimId }: { selectedWall: WallFace; config: GarageConfig, activeDimId?: string | null }) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const w = config.width * 0.01; const l = config.length * 0.01; const h = config.height * 0.01;
    let targetX = 0; let targetZ = 0; let camX = 0; let camZ = 0;
    const dist = Math.max(w, l) + 4;

    // Jeśli kliknięto w wymiarowanie, centrujemy się mocniej
    const zoomMultiplier = activeDimId ? 0.6 : 1; 

    switch (selectedWall) {
      case 'front': targetZ = l / 2; camZ = l / 2 + dist * zoomMultiplier; break;
      case 'back': targetZ = -l / 2; camZ = -l / 2 - dist * zoomMultiplier; break;
      case 'left': targetX = -w / 2; camX = -w / 2 - dist * zoomMultiplier; break;
      case 'right': targetX = w / 2; camX = w / 2 + dist * zoomMultiplier; break;
    }
    controlsRef.current.setLookAt(camX, h / 2 + 1, camZ, targetX, h / 2, targetZ, true);
  }, [selectedWall, config.width, config.length, config.height, activeDimId]);

  return <CameraControls ref={controlsRef} minPolarAngle={Math.PI / 8} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={3} maxDistance={25} makeDefault />;
}

// === KOMPONENT NARYSOWANIA WYMIARÓW NA ŻYWO (BIM VIEWER) ===
function DimensionsOverlay({ config, activeId }: { config: GarageConfig, activeId: string }) {
  const el = config.elements.find(e => e.id === activeId);
  if (!el) return null;

  const w = config.width / 100;
  const l = config.length / 100;
  
  const elW = el.width / 100;
  const elH = el.height / 100;
  const elX = el.x / 100;
  const elY = el.y / 100;

  let pos: [number, number, number] = [0, 0, 0];
  let rot: [number, number, number] = [0, 0, 0];

  // Matematyka umieszczania ramki idealnie na ścianie
  const offset = 0.05; // Wysunięcie przed ścianę, żeby nie mrugało
  if (el.wall === 'front') { pos = [elX, elY + elH/2, l/2 + offset]; }
  else if (el.wall === 'back') { pos = [-elX, elY + elH/2, -l/2 - offset]; rot = [0, Math.PI, 0]; }
  else if (el.wall === 'left') { pos = [-w/2 - offset, elY + elH/2, -elX]; rot = [0, -Math.PI/2, 0]; }
  else if (el.wall === 'right') { pos = [w/2 + offset, elY + elH/2, elX]; rot = [0, Math.PI/2, 0]; }

  return (
    <group position={pos} rotation={rot}>
      {/* Kolorowe prześwietlenie elementu */}
      <mesh>
        <planeGeometry args={[elW + 0.1, elH + 0.1]} />
        <meshBasicMaterial color="#ea580c" transparent opacity={0.3} depthTest={false} />
        <Edges color="white" scale={1.05} />
      </mesh>
      
      {/* Etykieta HTML unosząca się nad elementem */}
      <Html center position={[0, elH/2 + 0.3, 0]} zIndexRange={[100, 0]}>
        <div className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg border-2 border-orange-500 shadow-2xl flex flex-col items-center pointer-events-none whitespace-nowrap animate-bounce-in">
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Wymiary Otworu</span>
          <span className="text-lg font-black">{el.width} x {el.height} cm</span>
        </div>
      </Html>
    </group>
  );
}

export default function CanvasArea({ config, selectedWall, activeDimId }: CanvasAreaProps) {
  return (
    <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [5, 3, 7], fov: 50 }} shadows className="w-full h-full">
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0005} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />

      <Suspense fallback={null}>
        <GarageModel config={config} />
        {/* Odpalenie magicznych wymiarów jeśli przekazano ID z panelu! */}
        {activeDimId && <DimensionsOverlay config={config} activeId={activeDimId} />}
      </Suspense>

      <ContactShadows position={[0, -0.01, 0]} opacity={0.65} scale={40} blur={2.5} far={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#9a9488" roughness={0.92} metalness={0.02} />
      </mesh>

      <CameraRig selectedWall={selectedWall} config={config} activeDimId={activeDimId} />
    </Canvas>
  );
}