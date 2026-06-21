"use client";

import { useState, UIEvent, useEffect } from 'react';
import { GarageConfig, WallFace } from '@/types';
import CanvasArea from '@/components/CanvasArea';
import ConfigPanel from '@/components/ConfigPanel';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_CONFIG: GarageConfig = {
  width: 400,
  length: 600,
  height: 220,
  roofType: 'dual-slope',
  gutters: true,
  elements: [
    { id: uuidv4(), type: 'gate', wall: 'front', x: 0, y: 0, width: 250, height: 200, clearanceHeight: 190, gateType: 'up-and-over', hingeSide: 'left' }
  ],
  roofColor: '#3b3b3c', roofProfile: 'trapez-t14',
  wallColor: '#e3e3e3', wallProfile: 'trapez-t7',
  gateColor: '#3b3b3c', gateProfile: 'trapez-t7',
  doorColor: '#3b3b3c', doorProfile: 'trapez-t7',
  windowColor: '#ffffff',
};

export default function Home() {
  const [config, setConfig] = useState<GarageConfig>(INITIAL_CONFIG);
  const [selectedWall, setSelectedWall] = useState<WallFace>('front');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [wpAdminUrl, setWpAdminUrl] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const savedConfigBase64 = params.get('load_config');
      const storeUrl = params.get('store_url');

      if (storeUrl) {
        const cleanWp = decodeURIComponent(storeUrl);
        setWpAdminUrl(`${cleanWp}/wp-admin/admin.php?page=garage-orders`);
      }

      if (savedConfigBase64) {
        try {
          const jsonStr = decodeURIComponent(escape(window.atob(savedConfigBase64)));
          setConfig(JSON.parse(jsonStr));
          setIsReadOnly(true); // Włączenie trybu podglądu dla Admina
        } catch (e) {
          console.error("Błąd ładowania konfiguracji 360", e);
        }
      }
    }
  }, []);

  // === WIDOK KARTY ZAMÓWIENIA 360° (DLA ADMINA) ===
  if (isReadOnly) {
    return (
      <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50">
        {/* Model 3D */}
        <div className="w-full md:w-[70%] relative bg-zinc-900 h-full">
          <CanvasArea config={config} selectedWall={selectedWall} />
          <div className="absolute top-4 left-4 pointer-events-none z-10 bg-zinc-900/80 backdrop-blur-md border border-orange-500/30 p-4 rounded-2xl shadow-xl">
            <h1 className="text-xl font-black text-white tracking-tight">Karta Zamówienia Podgląd <span className="text-orange-500">360°</span></h1>
            <p className="text-zinc-300 text-xs mt-1 font-medium">Model można swobodnie obracać myszką.</p>
          </div>
        </div>

        {/* Specyfikacja techniczna zamiast formularza edycji */}
        <div className="w-full md:w-[30%] h-full bg-white border-l border-zinc-200 p-6 overflow-y-auto flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 border-b pb-3">Specyfikacja Garażu</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Wymiary Bryły</h3>
                <ul className="text-sm text-zinc-700 space-y-1">
                  <li>Szerokość: <strong>{config.width} cm</strong></li>
                  <li>Długość: <strong>{config.length} cm</strong></li>
                  <li>Wysokość ścian: <strong>{config.height} cm</strong></li>
                  <li>Konstrukcja dachu: <strong className="capitalize">{config.roofType.replace('-', ' ')}</strong></li>
                  <li>Orynnowanie: <strong>{config.gutters ? 'Tak' : 'Nie'}</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Materiały i Kolorystyka</h3>
                <ul className="text-sm text-zinc-700 space-y-2">
                  <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border" style={{backgroundColor: config.wallColor}}></div> Ściany: <strong>{config.wallProfile}</strong></li>
                  <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border" style={{backgroundColor: config.roofColor}}></div> Dach: <strong>{config.roofProfile}</strong></li>
                  <li className="flex items-center gap-2"><div className="w-4 h-4 rounded border" style={{backgroundColor: config.gateColor}}></div> Brama: <strong>{config.gateProfile}</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Rozkład Elementów</h3>
                {config.elements.length === 0 ? <p className="text-sm text-zinc-400 italic">Brak dodatkowych otworów.</p> : (
                  <ul className="text-sm text-zinc-700 space-y-2">
                    {config.elements.map((el, index) => (
                      <li key={index} className="bg-zinc-50 p-2 rounded border border-zinc-200">
                        <span className="font-bold capitalize text-zinc-800">{el.type === 'gate' ? 'Brama' : el.type === 'door' ? 'Drzwi' : 'Okno'}</span> na ścianie: <span className="uppercase text-orange-600 font-bold">{el.wall}</span> ({el.width}x{el.height} cm)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <a href={wpAdminUrl || "#"} className="w-full flex justify-center items-center py-4 rounded-xl font-bold bg-zinc-950 text-white hover:bg-zinc-900 transition-colors shadow-md">
              ← Wróć do kokpitu WordPress
            </a>
          </div>
        </div>
      </main>
    );
  }

  // === WIDOK DLA KLIENTA (ZWYKŁY KONFIGURATOR) ===
  return (
    <main className="flex h-screen w-full bg-zinc-100 overflow-hidden">
      <div className="w-full lg:w-2/3 h-full relative">
        <CanvasArea config={config} selectedWall={selectedWall} />
      </div>
      <div className="w-full lg:w-1/3 h-full overflow-y-auto bg-white p-6 shadow-[-4px_0_25px_rgba(0,0,0,0.05)] relative z-10">
        <ConfigPanel config={config} setConfig={setConfig} selectedWall={selectedWall} setSelectedWall={setSelectedWall} />
      </div>
    </main>
  );
}