"use client";

import { useState } from 'react';
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
    {
      id: uuidv4(),
      type: 'gate',
      wall: 'front',
      x: 0,
      y: 0,
      width: 250,
      height: 200,
      clearanceHeight: 190,
      gateType: 'up-and-over',
    }
  ],

  // Independent surface config
  roofColor: '#3b3b3c',
  roofProfile: 'trapez-t14',

  wallColor: '#e3e3e3',
  wallProfile: 'trapez-t7',

  gateColor: '#3b3b3c',
  gateProfile: 'trapez-t7',

  doorColor: '#3b3b3c',
  doorProfile: 'trapez-t7',

  windowColor: '#ffffff',
};

// Definicja kroków dla progress trackera
const CONFIG_STEPS = [
  { id: 1, label: 'Wymiary' },
  { id: 2, label: 'Dach' },
  { id: 3, label: 'Bramy i Otoczenie' },
  { id: 4, label: 'Kolory' }
];

export default function Home() {
  const [config, setConfig] = useState<GarageConfig>(INITIAL_CONFIG);
  const [selectedWall, setSelectedWall] = useState<WallFace>('front');

  // Pricing Engine
  const calculatePrice = () => {
    let base = 2500;
    
    const area = (config.width / 100) * (config.length / 100);
    base += area * 150; 
    
    if (config.height > 220) {
      base += (config.height - 220) * 10;
    }

    if (config.wallProfile === 'drewnopodobna') base += area * 80;
    if (config.roofProfile === 'blachodachowka') base += area * 60;
    if (config.roofProfile === 'rabek') base += area * 40;

    config.elements.forEach((el) => {
      if (el.type === 'gate') {
        base += 1200;
        if (el.gateType === 'sectional') base += 800;
      }
      if (el.type === 'door') base += 450;
      if (el.type === 'window' || el.type === 'pvc-window') base += 350;
      if (el.type === 'skylight') base += 200;
    });

    if (config.gutters) {
      base += (config.length / 100) * 50 * 2; 
    }

    return base;
  };

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50">
      
      {/* ── Lewa strona (Płótno 3D) ── */}
      <div className="w-full h-[40vh] md:h-full md:w-[60%] relative bg-zinc-900 shadow-inner">
        <CanvasArea config={config} selectedWall={selectedWall} />
        
        {/* Poprawiona widoczność tytułu - Glassmorphism */}
        <div className="absolute top-4 left-4 pointer-events-none z-10 bg-zinc-900/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Konfigurator <span className="text-orange-500">3D Pro</span>
          </h1>
          <p className="text-zinc-300 text-xs mt-1 font-medium max-w-[250px]">
            Przeciągnij aby obracać. Zmiana parametrów centruje kamerę.
          </p>
        </div>
      </div>

      {/* ── Prawa strona (Panel konfiguracyjny) ── */}
      <div className="w-full h-[60vh] md:h-full md:w-[40%] flex flex-col bg-white border-l border-zinc-200">
        
        {/* Progress Tracker (Checklista) */}
        <div className="bg-white border-b border-zinc-200 px-6 py-4 shrink-0 z-10 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Etapy Konfiguracji</h3>
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-100 -z-10"></div>
            {CONFIG_STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center text-xs font-bold">
                  {step.id}
                </div>
                <span className="text-[10px] font-medium text-zinc-500 hidden sm:block bg-white px-1">
                  {step.label}
                </span>
              </div>
            ))}
            {/* Ostatni krok - Podsumowanie */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-400 border border-zinc-200 flex items-center justify-center text-xs font-bold">
                ✓
              </div>
              <span className="text-[10px] font-medium text-zinc-400 hidden sm:block bg-white px-1">
                Gotowe
              </span>
            </div>
          </div>
        </div>

        {/* Zawartość konfiguratora (Przewijana) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <ConfigPanel 
            config={config} 
            setConfig={setConfig} 
            selectedWall={selectedWall}
            setSelectedWall={setSelectedWall}
          />
        </div>
        
        {/* Dolna sekcja (Cena i przycisk) */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 md:p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-zinc-500 font-medium text-sm block mb-1">Cena konfiguracji:</span>
              <span className="text-3xl font-bold text-orange-600">
                {calculatePrice().toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}
              </span>
            </div>
            
            {/* Pełna lista województw */}
            <div className="text-right">
              <label className="text-xs text-zinc-500 block mb-1">Województwo</label>
              <select className="border border-zinc-300 rounded p-1 text-sm bg-zinc-50 focus:ring-orange-500 focus:border-orange-500 outline-none cursor-pointer">
                <option value="">Wybierz...</option>
                <option value="dolnoslaskie">Dolnośląskie</option>
                <option value="kujawsko-pomorskie">Kujawsko-pomorskie</option>
                <option value="lubelskie">Lubelskie</option>
                <option value="lubuskie">Lubuskie</option>
                <option value="lodzkie">Łódzkie</option>
                <option value="malopolskie">Małopolskie</option>
                <option value="mazowieckie">Mazowieckie</option>
                <option value="opolskie">Opolskie</option>
                <option value="podkarpackie">Podkarpackie</option>
                <option value="podlaskie">Podlaskie</option>
                <option value="pomorskie">Pomorskie</option>
                <option value="slaskie">Śląskie</option>
                <option value="swietokrzyskie">Świętokrzyskie</option>
                <option value="warminsko-mazurskie">Warmińsko-mazurskie</option>
                <option value="wielkopolskie">Wielkopolskie</option>
                <option value="zachodniopomorskie">Zachodniopomorskie</option>
              </select>
            </div>
          </div>
          
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2 text-lg uppercase tracking-wide">
            Kup teraz
          </button>
        </div>
      </div>
    </main>
  );
}