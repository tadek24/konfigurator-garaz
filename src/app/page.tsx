"use client";

import { useState, UIEvent, useEffect } from 'react';
import { GarageConfig, WallFace } from '@/types';
import ConfigPanel from '@/components/ConfigPanel';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

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

// Fallback dla wejść bez paczki danych
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
  const [wpAdminUrl, setWpAdminUrl] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const initDataRaw = params.get('init_data');
    const savedConfigBase64 = params.get('load_config');
    const storeUrl = params.get('store_url');

    if (storeUrl) setWpAdminUrl(`${decodeURIComponent(storeUrl).replace(/\/$/, "")}/wp-admin/admin.php?page=garage-orders`);

    // PANCERNY ODCZYT: Dekodowanie paczki z WP
    if (initDataRaw) {
      try {
        // Bezpieczne dekodowanie utf-8 w js
        const base64Decoded = atob(decodeURIComponent(initDataRaw));
        const utf8Decoded = new TextDecoder("utf-8").decode(Uint8Array.from(base64Decoded, c => c.charCodeAt(0)));
        const payload = JSON.parse(utf8Decoded);
        
        setAppData(payload);
        if (!savedConfigBase64) {
          setConfig(prev => ({ ...prev, width: payload.baseConfig.w, length: payload.baseConfig.l, height: payload.baseConfig.h }));
        }
      } catch (e: any) {
        console.error("Błąd dekodowania paczki:", e.message);
        setToastMessage("Błąd zapisu struktury z WordPress. Ładuję dane domyślne.");
        setAppData(FALLBACK_DATA);
      }
    } else if (!savedConfigBase64) {
      setToastMessage("Otwarto link bezpośredni bez parametrów WordPress. Tryb podglądu włączony.");
      setAppData(FALLBACK_DATA);
    }

    // Tryb odczytu Karty 360
    if (savedConfigBase64) {
      try {
        const decoded = atob(decodeURIComponent(savedConfigBase64));
        const utf8 = new TextDecoder("utf-8").decode(Uint8Array.from(decoded, c => c.charCodeAt(0)));
        setConfig(JSON.parse(utf8));
        setIsReadOnly(true);
        if (!appData) setAppData(FALLBACK_DATA);
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

  if (isReadOnly) {
    return (
      <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50" style={{ '--theme': appData.themeColor } as React.CSSProperties}>
        <div className="w-full md:w-[70%] relative bg-zinc-900 h-full">
          <CanvasArea config={config} selectedWall={selectedWall} />
          <div className="absolute top-4 left-4 pointer-events-none z-10 bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-[var(--theme)] shadow-xl">
            <h1 className="text-xl font-black text-white tracking-tight">Karta Zamówienia <span className="text-[var(--theme)]">360°</span></h1>
          </div>
        </div>
        <div className="w-full md:w-[30%] h-full bg-white border-l border-zinc-200 p-6 overflow-y-auto flex flex-col justify-between">
          <div><h2 className="text-2xl font-bold text-zinc-900 mb-6 border-b pb-3">Specyfikacja Garażu</h2></div>
          <div className="pt-4 border-t">
            <a href={wpAdminUrl || "#"} className="w-full flex justify-center items-center py-4 rounded-xl font-bold bg-zinc-950 text-white hover:bg-zinc-900 transition-colors shadow-md">← Wróć do zamówień</a>
          </div>
        </div>
      </main>
    );
  }

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

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-orange-500/50 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 text-sm animate-bounce-in">
          <span className="flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-full font-bold">i</span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage("")} className="ml-2 text-zinc-400 hover:text-white transition-colors">✕</button>
        </div>
      )}
    </main>
  );
}