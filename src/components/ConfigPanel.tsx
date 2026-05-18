"use client";

import { GarageConfig, RoofType, DoorType } from '@/types';
import { Settings, Home, PaintBucket, DoorClosed, Maximize } from 'lucide-react';

interface ConfigPanelProps {
  config: GarageConfig;
  setConfig: React.Dispatch<React.SetStateAction<GarageConfig>>;
}

const COLORS = [
  { name: 'Ocynk', hex: '#e3e3e3' },
  { name: 'Antracyt (RAL 7016)', hex: '#3b3b3c' },
  { name: 'Brąz (RAL 8017)', hex: '#4a3028' },
  { name: 'Biel (RAL 9010)', hex: '#f0f0f0' },
  { name: 'Czerwień (RAL 3011)', hex: '#7a2222' },
];

export default function ConfigPanel({ config, setConfig }: ConfigPanelProps) {
  const updateConfig = (key: keyof GarageConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Roof Type Section */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-zinc-800">
          <Home size={20} />
          <h2 className="text-lg font-semibold">Typ Garażu (Dach)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateConfig('roofType', 'slope-back')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
              config.roofType === 'slope-back' 
                ? 'border-zinc-900 bg-zinc-50 shadow-md' 
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="w-12 h-10 border-t-4 border-r-4 border-l-4 border-zinc-400 bg-zinc-200" style={{ clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0% 100%)' }} />
            <span className="font-medium text-sm">Spad w tył</span>
          </button>
          <button
            onClick={() => updateConfig('roofType', 'dual-slope')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
              config.roofType === 'dual-slope' 
                ? 'border-zinc-900 bg-zinc-50 shadow-md' 
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="w-12 h-10 bg-zinc-200" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            <span className="font-medium text-sm">Dwuspadowy</span>
          </button>
        </div>
      </section>

      {/* Dimensions Section */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-zinc-800">
          <Maximize size={20} />
          <h2 className="text-lg font-semibold">Wymiary</h2>
        </div>
        <div className="space-y-5 bg-zinc-50 p-5 rounded-xl border border-zinc-100">
          {/* Width */}
          <div>
            <div className="flex justify-between mb-1 text-sm font-medium text-zinc-700">
              <label>Szerokość</label>
              <span>{config.width} cm</span>
            </div>
            <input
              type="range"
              min={300}
              max={600}
              step={10}
              value={config.width}
              onChange={(e) => updateConfig('width', Number(e.target.value))}
              className="w-full accent-zinc-900"
            />
          </div>
          {/* Length */}
          <div>
            <div className="flex justify-between mb-1 text-sm font-medium text-zinc-700">
              <label>Długość</label>
              <span>{config.length} cm</span>
            </div>
            <input
              type="range"
              min={500}
              max={800}
              step={10}
              value={config.length}
              onChange={(e) => updateConfig('length', Number(e.target.value))}
              className="w-full accent-zinc-900"
            />
          </div>
          {/* Height */}
          <div>
            <div className="flex justify-between mb-1 text-sm font-medium text-zinc-700">
              <label>Wysokość ściany bocznej</label>
              <span>{config.height} cm</span>
            </div>
            <input
              type="range"
              min={200}
              max={300}
              step={5}
              value={config.height}
              onChange={(e) => updateConfig('height', Number(e.target.value))}
              className="w-full accent-zinc-900"
            />
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-zinc-800">
          <PaintBucket size={20} />
          <h2 className="text-lg font-semibold">Kolory</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-zinc-700 mb-2 block">Kolor Dachu</span>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={`roof-${color.hex}`}
                  onClick={() => updateConfig('roofColor', color.hex)}
                  className={`w-10 h-10 rounded-full transition-all border-[3px] shadow-sm ${
                    config.roofColor === color.hex ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-700 mb-2 block">Kolor Ścian</span>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={`wall-${color.hex}`}
                  onClick={() => updateConfig('wallColor', color.hex)}
                  className={`w-10 h-10 rounded-full transition-all border-[3px] shadow-sm ${
                    config.wallColor === color.hex ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-700 mb-2 block">Kolor Bramy</span>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={`door-${color.hex}`}
                  onClick={() => updateConfig('doorColor', color.hex)}
                  className={`w-10 h-10 rounded-full transition-all border-[3px] shadow-sm ${
                    config.doorColor === color.hex ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Doors Section */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-zinc-800">
          <DoorClosed size={20} />
          <h2 className="text-lg font-semibold">Brama</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateConfig('doorType', 'swing')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
              config.doorType === 'swing' 
                ? 'border-zinc-900 bg-zinc-50 shadow-md' 
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="w-16 h-12 flex border border-zinc-400 gap-[1px] bg-zinc-200">
               <div className="flex-1 bg-zinc-300 border border-zinc-400"></div>
               <div className="flex-1 bg-zinc-300 border border-zinc-400"></div>
            </div>
            <span className="font-medium text-sm">Dwuskrzydłowa</span>
          </button>
          <button
            onClick={() => updateConfig('doorType', 'up-and-over')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
              config.doorType === 'up-and-over' 
                ? 'border-zinc-900 bg-zinc-50 shadow-md' 
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="w-16 h-12 bg-zinc-300 border border-zinc-400 flex flex-col gap-1 p-1">
               <div className="h-1 w-full bg-zinc-400/30 rounded-sm"></div>
               <div className="h-1 w-full bg-zinc-400/30 rounded-sm"></div>
               <div className="h-1 w-full bg-zinc-400/30 rounded-sm"></div>
            </div>
            <span className="font-medium text-sm">Uchylna</span>
          </button>
        </div>
      </section>

    </div>
  );
}
