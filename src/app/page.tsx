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
    { id: uuidv4(), type: 'gate', wall: 'front', x: 0, y: 0, width: 250, height: 200, clearanceHeight: 190, gateType: 'up-and-over' }
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

  // Wykrywanie trybu 360° (z zamówień admina)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const savedConfigBase64 = params.get('load_config');
      if (savedConfigBase64) {
        try {
          const jsonStr = decodeURIComponent(escape(window.atob(savedConfigBase64)));
          setConfig(JSON.parse(jsonStr));
          setIsReadOnly(true); 
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

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50">
      
      {/* ── Model 3D (Rozszerza się na 100% ekranu w trybie odczytu) ── */}
      <div className={`w-full relative bg-zinc-900 shadow-inner transition-all duration-700 ease-in-out ${isReadOnly ? 'h-screen md:w-full' : 'h-[40vh] md:h-full md:w-[60%]'}`}>
        <CanvasArea config={config} selectedWall={selectedWall} />
        
        <div className="absolute top-4 left-4 pointer-events-none z-10 bg-zinc-900/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isReadOnly ? 'Podgląd 360°' : <>Konfigurator <span className="text-orange-500">3D Pro</span></>}
          </h1>
          <p className="text-zinc-300 text-xs mt-1 font-medium max-w-[250px]">
            {isReadOnly ? 'Możesz swobodnie obracać zapisaną bryłę klienta.' : 'Przeciągnij aby obracać. Zmiana parametrów centruje kamerę.'}
          </p>
        </div>
      </div>

      {/* ── Prawy Panel (Ukryty w trybie odczytu 360°) ── */}
      {!isReadOnly && (
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
            {/* Przekazujemy sterowanie cennikiem do ConfigPanel! */}
            <ConfigPanel config={config} setConfig={setConfig} selectedWall={selectedWall} setSelectedWall={setSelectedWall} />
          </div>

        </div>
      )}
    </main>
  );
}