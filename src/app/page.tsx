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

const CONFIG_STEPS = [
  { id: 1, label: 'Dach' },
  { id: 2, label: 'Wymiary' },
  { id: 3, label: 'Bramy i Otoczenie' },
  { id: 4, label: 'Kolory' }
];

export default function Home() {
  const [config, setConfig] = useState<GarageConfig>(INITIAL_CONFIG);
  const [selectedWall, setSelectedWall] = useState<WallFace>('front');
  const [activeStep, setActiveStep] = useState(1);
  
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [wpAdminUrl, setWpAdminUrl] = useState("https://konfigurator.skillup-szkolenia.pl/wp-admin/admin.php?page=garage-orders");

  // Wykrywanie trybu 360° (z zamówień admina)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const savedConfigBase64 = params.get('load_config');
      
      const envWpUrl = process.env.NEXT_PUBLIC_WP_URL || "https://konfigurator.skillup-szkolenia.pl";
      const cleanWpUrl = envWpUrl.replace(/\/$/, "");
      setWpAdminUrl(`${cleanWpUrl}/wp-admin/admin.php?page=garage-orders`);

      if (savedConfigBase64) {
        try {
          const jsonStr = decodeURIComponent(escape(window.atob(savedConfigBase64)));
          setConfig(JSON.parse(jsonStr));
          setIsReadOnly(true); // Odpala tryb Karty Zamówienia 360
        } catch (e) {
          console.error("Błąd ładowania zapisanej konfiguracji.", e);
        }
      }
    }
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollableHeight = target.scrollHeight - target.clientHeight;
    if (scrollableHeight <= 0) return;
    const scrollPercentage = target.scrollTop / scrollableHeight;
    if (scrollPercentage < 0.20) setActiveStep(1);
    else if (scrollPercentage < 0.50) setActiveStep(2);
    else if (scrollPercentage < 0.80) setActiveStep(3);
    else if (scrollPercentage < 0.98) setActiveStep(4);
    else setActiveStep(5);
  };

  // ==============================================================
  // WIDOK 360 DLA ADMINA (Piękna Karta Zamówienia)
  // ==============================================================
  if (isReadOnly) {
    return (
      <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50">
        <div className="w-full md:w-[70%] relative bg-zinc-900 shadow-inner h-full">
          <CanvasArea config={config} selectedWall={selectedWall} />
          <div className="absolute top-4 left-4 pointer-events-none z-10 bg-zinc-900/80 backdrop-blur-md border border-orange-500/30 p-4 rounded-2xl shadow-xl">
            <h1 className="text-xl font-black text-white tracking-tight">Karta Zamówienia <span className="text-orange-500">360°</span></h1>
            <p className="text-zinc-300 text-xs mt-1 font-medium max-w-[250px]">Obracaj model, aby zweryfikować układ elementów.</p>
          </div>
        </div>

        <div className="w-full md:w-[30%] h-full bg-white border-l border-zinc-200 p-6 overflow-y-auto flex flex-col">
          <h2 className="text-2xl font-bold text-zinc-800 mb-6 border-b pb-4">Szczegóły Konstrukcji</h2>
          
          <div className="space-y-6 flex-1">
            <div>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2">Wymiary Główne</h3>
              <ul className="text-sm text-zinc-700 space-y-1">
                <li>Szerokość: <span className="font-bold">{config.width} cm</span></li>
                <li>Długość: <span className="font-bold">{config.length} cm</span></li>
                <li>Wysokość ściany: <span className="font-bold">{config.height} cm</span></li>
                <li>Typ Dachu: <span className="font-bold capitalize">{config.roofType.replace('-', ' ')}</span></li>
                <li>Orynnowanie: <span className="font-bold">{config.gutters ? 'TAK' : 'NIE'}</span></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2">Kolory i Poszycie</h3>
              <ul className="text-sm text-zinc-700 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-zinc-300" style={{backgroundColor: config.wallColor}}></div>
                  Ściany: <strong>{config.wallProfile}</strong>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-zinc-300" style={{backgroundColor: config.roofColor}}></div>
                  Dach: <strong>{config.roofProfile}</strong>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-zinc-300" style={{backgroundColor: config.gateColor}}></div>
                  Brama: <strong>{config.gateProfile}</strong>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2">Rozkład Elementów</h3>
              {config.elements.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">Brak dodatkowych elementów.</p>
              ) : (
                <ul className="text-sm text-zinc-700 space-y-3">
                  {config.elements.map((el) => (
                    <li key={el.id} className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                      <div className="font-bold text-zinc-800 mb-1">
                        {el.type === 'gate' ? 'Brama' : el.type === 'door' ? 'Drzwi' : 'Okno'} 
                        <span className="ml-1 uppercase text-orange-600">({el.wall})</span>
                      </div>
                      Wymiar: {el.width}x{el.height} cm<br/>
                      {el.type !== 'window' && el.type !== 'pvc-window' && el.type !== 'skylight' && (
                        <span>Klamka z: <strong>{el.hingeSide === 'left' ? 'Prawej strony' : 'Lewej strony'}</strong></span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-zinc-200 shrink-0">
            <a href={wpAdminUrl} className="w-full flex justify-center items-center py-4 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20">
              ← Wróć do zamówień
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ==============================================================
  // WIDOK DLA KLIENTA (ZWYKŁY KONFIGURATOR)
  // ==============================================================
  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50">
      <div className="w-full h-[40vh] md:h-full md:w-[60%] relative bg-zinc-900 shadow-inner">
        <CanvasArea config={config} selectedWall={selectedWall} />
        <div className="absolute top-4 left-4 pointer-events-none z-10 bg-zinc-900/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-black text-white tracking-tight">Konfigurator <span className="text-orange-500">3D Pro</span></h1>
          <p className="text-zinc-300 text-xs mt-1 font-medium max-w-[250px]">Przeciągnij aby obracać. Zmiana parametrów centruje kamerę.</p>
        </div>
      </div>

      <div className="w-full h-[60vh] md:h-full md:w-[40%] flex flex-col bg-white border-l border-zinc-200 shadow-[-4px_0_25px_rgba(0,0,0,0.05)] relative z-10">
        <div className="bg-white border-b border-zinc-200 px-6 py-4 shrink-0 z-10 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Etapy Konfiguracji</h3>
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-200 -z-20"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-orange-500 transition-all duration-500 ease-out -z-10" style={{ width: `${((Math.min(activeStep, 5) - 1) / 4) * 100}%` }}></div>
            
            {CONFIG_STEPS.map((step) => {
              const isCompleted = step.id < activeStep;
              const isActive = step.id === activeStep;
              return (
                <div key={step.id} className="flex flex-col items-center gap-1 z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isCompleted ? 'bg-orange-500 text-white border border-orange-500' : isActive ? 'bg-orange-50 text-orange-600 border-2 border-orange-500' : 'bg-white text-zinc-400 border border-zinc-300'}`}>
                    {isCompleted ? '✓' : step.id}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col items-center gap-1 z-10">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${activeStep === 5 ? 'bg-orange-500 text-white border border-orange-500' : 'bg-white text-zinc-400 border border-zinc-300'}`}>✓</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth" onScroll={handleScroll}>
          <ConfigPanel config={config} setConfig={setConfig} selectedWall={selectedWall} setSelectedWall={setSelectedWall} />
        </div>
      </div>
    </main>
  );
}