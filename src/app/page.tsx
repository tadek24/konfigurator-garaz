"use client";

import { useState, UIEvent, useEffect } from 'react';
import { GarageConfig, WallFace } from '@/types';
import ConfigPanel from '@/components/ConfigPanel';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import { Eye } from 'lucide-react';

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
  applyColorToAll: false,
  removeFoil: false,
  roofColor: '#3b3b3c', roofProfile: 'pionowe-t14',
  wallColor: '#e3e3e3', wallProfile: 'pionowe-t7',
  gateColor: '#3b3b3c', gateProfile: 'pionowe-t7',
  doorColor: '#3b3b3c', doorProfile: 'pionowe-t7',
  cornerFlashingColor: '#3b3b3c',
  roofFlashingColor: '#3b3b3c',
  gutterColor: '#3b3b3c',
  windowColor: '#ffffff',
};

const FALLBACK_DATA = {
  storeUrl: "https://konfigurator.skillup-szkolenia.pl", themeColor: "#ea580c",
  baseConfig: { w: 300, l: 500, h: 210, p: 5000 },
  pricing: { sqm_t: 'fixed', sqm_v: 150, door_t: 'fixed', door_v: 500, window_t: 'fixed', window_v: 300, skylight_t: 'fixed', skylight_v: 150, wood_t: 'pct', wood_v: 15, gutter_t: 'fixed', gutter_v: 250, flash_corner_t: 'fixed', flash_corner_v: 100, flash_roof_t: 'fixed', flash_roof_v: 100 },
  addons: [], colors: []
};

export default function Home() {
  const [config, setConfig] = useState<GarageConfig>(INITIAL_CONFIG);
  const [appData, setAppData] = useState<any>(null);
  const [selectedWall, setSelectedWall] = useState<WallFace>('front');
  const [activeStep, setActiveStep] = useState(1);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeDimId, setActiveDimId] = useState<string | null>(null);
  const [wpAdminUrl, setWpAdminUrl] = useState("");

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const initDataRaw = params.get('init_data');
    const savedConfigBase64 = params.get('load_config');
    const storeUrl = params.get('store_url');

    if (storeUrl) setWpAdminUrl(`${decodeURIComponent(storeUrl).replace(/\/$/, "")}/wp-admin/admin.php?page=garage-orders`);

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

  if (isReadOnly) {
    return (
      <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50" style={{ '--theme': appData.themeColor } as React.CSSProperties}>
        <div className="w-full md:w-[65%] relative bg-zinc-900 h-full">
          <CanvasArea config={config} selectedWall={selectedWall} activeDimId={activeDimId} colors={appData?.colors || []} />
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

            <div>
              <h3 className="text-xs font-black text-[var(--theme)] uppercase tracking-widest mb-4">Materiały i Wykończenie</h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center bg-white border border-zinc-200 p-3 rounded-xl shadow-sm">
                  <span className="text-sm font-bold text-zinc-600">Poszycie Ścian</span>
                  <div className="flex items-center gap-2"><span className="font-bold text-zinc-900">{config.wallProfile}</span></div>
                </li>
                <li className="flex justify-between items-center bg-white border border-zinc-200 p-3 rounded-xl shadow-sm">
                  <span className="text-sm font-bold text-zinc-600">Rodzaj Dachu</span>
                  <div className="flex items-center gap-2"><span className="font-bold text-zinc-900">{config.roofProfile} ({config.roofType})</span></div>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-black text-[var(--theme)] uppercase tracking-widest mb-4">Rozkład Elementów</h3>
              {config.elements.length === 0 ? <p className="text-sm text-zinc-400 italic">Brak dodatkowych otworów.</p> : (
                <div className="space-y-3">
                  {config.elements.map((el) => {
                    const isActive = activeDimId === el.id;
                    return (
                      <button 
                        key={el.id} 
                        onClick={() => { setSelectedWall(el.wall); setActiveDimId(isActive ? null : el.id); }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${isActive ? 'bg-[var(--theme)] border-[var(--theme)] shadow-lg scale-[1.02]' : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
                      >
                        <div>
                          <div className={`font-black uppercase text-lg ${isActive ? 'text-white' : 'text-zinc-900'}`}>
                            {el.type === 'gate' ? 'Brama' : el.type === 'door' ? 'Drzwi B.' : el.type === 'skylight' ? 'Świetlik' : 'Okno'}
                          </div>
                          <div className={`text-sm font-medium mt-1 ${isActive ? 'text-white/80' : 'text-zinc-500'}`}>
                            Ściana: <span className="font-bold uppercase">{el.wall}</span>
                          </div>
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
          <div className="pt-4 border-t">
            <a href={wpAdminUrl || "#"} className="w-full flex justify-center items-center py-4 font-bold bg-zinc-950 text-white hover:bg-zinc-900 transition-colors">← Wróć do zamówień</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50" style={{ '--theme': appData.themeColor } as React.CSSProperties}>
      <div className="w-full h-[40vh] md:h-full md:w-[60%] relative bg-zinc-900 shadow-inner">
        <CanvasArea config={config} selectedWall={selectedWall} colors={appData?.colors || []} />
      </div>

      <div className="w-full h-[60vh] md:h-full md:w-[40%] flex flex-col bg-white border-l border-zinc-200 shadow-[-4px_0_25px_rgba(0,0,0,0.05)] relative z-10">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth" onScroll={handleScroll}>
          <ConfigPanel config={config} setConfig={setConfig} selectedWall={selectedWall} setSelectedWall={setSelectedWall} appData={appData} />
        </div>
      </div>
    </main>
  );
}