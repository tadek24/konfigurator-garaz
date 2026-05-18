"use client";

import { useState } from 'react';
import { GarageConfig } from '@/types';
import CanvasArea from '@/components/CanvasArea';
import ConfigPanel from '@/components/ConfigPanel';

const INITIAL_CONFIG: GarageConfig = {
  width: 400,
  length: 600,
  height: 220,
  roofType: 'slope-back',
  roofColor: '#7a7a7a', // default Ocynk / Grey
  wallColor: '#e3e3e3', // lighter grey / galvanized
  doorColor: '#7a7a7a',
  doorType: 'swing',
};

export default function Home() {
  const [config, setConfig] = useState<GarageConfig>(INITIAL_CONFIG);

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-zinc-50">
      {/* 3D Canvas Area - 60% Desktop, Top half Mobile */}
      <div className="w-full h-[50vh] md:h-full md:w-[60%] relative bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-200 shadow-inner">
        <CanvasArea config={config} />
        <div className="absolute top-4 left-4 pointer-events-none z-10">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Konfigurator Garaży 3D</h1>
          <p className="text-zinc-300 text-sm">W pełni interaktywny model z React Three Fiber</p>
        </div>
      </div>

      {/* Configuration Panel - 40% Desktop, Bottom half Mobile */}
      <div className="w-full h-[50vh] md:h-full md:w-[40%] overflow-y-auto bg-white flex flex-col">
        <div className="flex-1 p-6">
          <ConfigPanel config={config} setConfig={setConfig} />
        </div>
        
        {/* Sticky Checkout Summary at the bottom */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-500 font-medium">Całkowity koszt:</span>
            <span className="text-3xl font-bold text-zinc-900">
              {((config.width / 100) * (config.length / 100) * 1500 + 2000).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </span>
          </div>
          <button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-4 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2">
            Kup teraz
          </button>
        </div>
      </div>
    </main>
  );
}
