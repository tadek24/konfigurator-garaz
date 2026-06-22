"use client";

import { useState, UIEvent, useEffect } from 'react';
import { GarageConfig, WallFace } from '@/types';
import ConfigPanel from '@/components/ConfigPanel';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import { Eye } from 'lucide-react'; // Ikonka do przycisku podglądu

const CanvasArea = dynamic(() => import('@/components/CanvasArea'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-900 text-orange-500">
      <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Wczytywanie środowiska 3D...</p>
    </div>
  )
});

const INITIAL_CONFIG: GarageConfig = {
  width: 300, length: 500, height: 210,
  roofType: 'dual-slope', gutters: false,
  elements: [{ id: uuidv4(), type: 'gate', wall: 'front', x: 0, y: 0, width: 250, height: 200, clearanceHeight: 190, gateType: 'up-and-over', hingeSide: 'left' }],
  roofColor: '#3b3b3c', roofProfile: 'trapez-t14', wallColor: '#e3e3e3', wallProfile: 'trapez-t7', gateColor: '#3b3b3c', gateProfile: 'trapez-t7', doorColor: '#3b3b3c', doorProfile: 'trapez-t7', windowColor: '#ffffff',
};

const CONFIG_STEPS = [{ id: 1, label: 'Dach' }, { id: 2, label: 'Wymiary' }, { id: 3, label: 'Bramy i Otoczenie' }, { id: 4, label: 'Kolory' }];

const FALLBACK_DATA = {
  storeUrl: "https://konfigurator.skillup-szkolenia.pl", themeColor: "#ea580c",
  baseConfig: { w: 300, l: 500, h: 210, p: 5000 },
  pricing: { sqm_t: 'fixed', sqm_v: 150, door_t: 'fixed', door_v: 500, window_t: 'fixed', window_v: 300, wood_t: 'pct', wood_v: 15, gutter_t: 'pct', gutter_v: 5 },
  addons: []
};

export default function Home() {
  const [config, setConfig] = useState<GarageConfig>(INITIAL_CONFIG);
  const [appData, setAppData] = useState<any>(null);
  const [selectedWall, setSelectedWall] = useState<WallFace>('front');
  const [activeStep, setActiveStep] = useState(1);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // NOWOŚĆ: Śledzimy w co kliknął admin w panelu bocznym
  const [activeDimId, setActiveDimId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const initDataRaw = params.get('init_data');
    const savedConfigBase64 = params.get('load_config');

    if (initDataRaw) {
      try {
        const decodedJson = decodeURIComponent(escape(window.atob(decodeURIComponent(initDataRaw))));
        const payload = JSON.parse(decodedJson);
        setAppData(payload);
        if (!savedConfigBase64) setConfig(prev => ({ ...prev, width: payload.baseConfig.w, length: payload.baseConfig.l, height: payload.baseConfig.h }));
      } catch (e: any) { setAppData(FALLBACK_DATA); }
    } else if (!savedConfigBase64) {
      setAppData(FALLBACK_DATA);
    }

    if (savedConfigBase64) {
      try {
        const decoded = atob(decodeURIComponent(savedConfigBase64));
        const utf8 = new TextDecoder("utf-8").decode(Uint8Array.from(decoded, c => c.charCodeAt(0)));
        setConfig(JSON.parse(utf8));
        setIsReadOnly(true);
        if (!appData) setAppData({ themeColor: "#ea580c" });
      } catch (e) { console.error(e); }
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

  if (!appData) return <div className="flex h-screen items-center justify-center bg-zinc-900"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;

  // ==========================================================
  // PROFESJONALNA KARTA ZAMÓWIENIA DLA PRODUKCJI
  // ==========================================================
  if (isReadOnly) {
    return (
      <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50" style={{ '--theme': appData.themeColor } as React.CSSProperties}>
        <div className="w-full md:w-[65%] relative bg-zinc-900 h-full">
          {/* Przekazujemy activeDimId żeby model podświetlił wybrany element! */}
          <CanvasArea config={config} selectedWall={selectedWall} activeDimId={activeDimId} />
          
          <div className="absolute top-6 left-6 pointer-events-none z-10">
            <div className="bg-zinc-900/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-zinc-800 shadow-2xl">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">Podgląd Produkcyjny <span className="text-[var(--theme)]">3D</span></h1>
              <p className="text-zinc-400 text-sm mt-1">Kliknij element w panelu obok, aby zlokalizować go na bryle.</p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-[35%] h-full bg-white border-l border-zinc-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-10">
          <div className="p-6 bg-zinc-50 border-b border-zinc-200">
             <h2 className="text-xl font-bold text-zinc-900">Specyfikacja Konstrukcji</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* WYMIARY BRYŁY */}
            <div>
              <h3 className="text-xs font-black text-[var(--theme)] uppercase tracking-widest mb-4">Wymiary Główne Rzutu</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                  <span className="block text-xs text-zinc-500 font-bold mb-1">SZEROKOŚĆ</span>
                  <span className="text-xl font-black text-zinc-900">{config.width} cm</span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                  <span className="block text-xs text-zinc-500 font-bold mb-1">DŁUGOŚĆ</span>
                  <span className="text-xl font-black text-zinc-900">{config.length} cm</span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                  <span className="block text-xs text-zinc-500 font-bold mb-1">WYSOKOŚĆ</span>
                  <span className="text-xl font-black text-zinc-900">{config.height} cm</span>
                </div>
              </div>
            </div>

            {/* MATERIAŁY */}
            <div>
              <h3 className="text-xs font-black text-[var(--theme)] uppercase tracking-widest mb-4">Materiały i Wykończenie</h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center bg-white border border-zinc-200 p-3 rounded-xl shadow-sm">
                  <span className="text-sm font-bold text-zinc-600">Poszycie Ścian</span>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full shadow-inner border border-zinc-300" style={{backgroundColor: config.wallColor}}></div> <span className="font-bold text-zinc-900">{config.wallProfile}</span></div>
                </li>
                <li className="flex justify-between items-center bg-white border border-zinc-200 p-3 rounded-xl shadow-sm">
                  <span className="text-sm font-bold text-zinc-600">Rodzaj Dachu</span>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full shadow-inner border border-zinc-300" style={{backgroundColor: config.roofColor}}></div> <span className="font-bold text-zinc-900">{config.roofProfile} ({config.roofType})</span></div>
                </li>
                {config.gutters && (
                  <li className="flex justify-between items-center bg-orange-50 border border-orange-200 p-3 rounded-xl shadow-sm text-orange-800">
                    <span className="text-sm font-bold">Orynnowanie</span>
                    <span className="font-black uppercase">Dodano</span>
                  </li>
                )}
              </ul>
            </div>

            {/* ELEMENTY - INTERAKTYWNE Z MODELM 3D */}
            <div>
              <h3 className="text-xs font-black text-[var(--theme)] uppercase tracking-widest mb-4">Rozkład Elementów (Otwory)</h3>
              {config.elements.length === 0 ? <p className="text-sm text-zinc-400 italic">Brak dodatkowych otworów.</p> : (
                <div className="space-y-3">
                  {config.elements.map((el) => {
                    const isActive = activeDimId === el.id;
                    return (
                      <button 
                        key={el.id} 
                        onClick={() => {
                          setSelectedWall(el.wall); // Obraca model na właściwą ścianę
                          setActiveDimId(isActive ? null : el.id); // Włącza linie wymiarowania
                        }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${isActive ? 'bg-[var(--theme)] border-[var(--theme)] shadow-lg scale-[1.02]' : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
                      >
                        <div>
                          <div className={`font-black uppercase text-lg ${isActive ? 'text-white' : 'text-zinc-900'}`}>
                            {el.type === 'gate' ? 'Brama' : el.type === 'door' ? 'Drzwi B.' : 'Okno'}
                          </div>
                          <div className={`text-sm font-medium mt-1 ${isActive ? 'text-white/80' : 'text-zinc-500'}`}>
                            Ściana: <span className="font-bold uppercase">{el.wall}</span>
                          </div>
                          {el.type !== 'window' && el.type !== 'pvc-window' && (
                            <div className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-zinc-400'}`}>Klamka z: {el.hingeSide === 'left' ? 'Prawej' : 'Lewej'}</div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-lg text-sm font-black ${isActive ? 'bg-white text-[var(--theme)]' : 'bg-zinc-100 text-zinc-900'}`}>
                            {el.width} x {el.height}
                          </span>
                          <Eye size={20} className={`${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-[var(--theme)]'}`} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // WIDOK KONFIGURATORA DLA KLIENTA (Bez zmian)
  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50" style={{ '--theme': appData.themeColor } as React.CSSProperties}>
      <div className="w-full h-[40vh] md:h-full md:w-[60%] relative bg-zinc-900 shadow-inner">
        <CanvasArea config={config} selectedWall={selectedWall} />
      </div>

      <div className="w-full h-[60vh] md:h-full md:w-[40%] flex flex-col bg-white border-l border-zinc-200 shadow-[-4px_0_25px_rgba(0,0,0,0.05)] relative z-10">
        <div className="bg-white border-b border-zinc-200 px-6 py-4 shrink-0 z-10 shadow-sm">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-200 -z-20"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--theme)] transition-all duration-500 -z-10" style={{ width: `${((Math.min(activeStep, 5) - 1) / 4) * 100}%` }}></div>
            {CONFIG_STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center gap-1 z-10">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step.id <= activeStep ? 'bg-[var(--theme)] text-white' : 'bg-white text-zinc-400 border border-zinc-300'}`}>{step.id < activeStep ? '✓' : step.id}</div>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1 z-10"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${activeStep === 5 ? 'bg-[var(--theme)] text-white' : 'bg-white text-zinc-400 border border-zinc-300'}`}>✓</div></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth" onScroll={handleScroll}>
          <ConfigPanel config={config} setConfig={setConfig} selectedWall={selectedWall} setSelectedWall={setSelectedWall} appData={appData} />
        </div>
      </div>
    </main>
  );
}