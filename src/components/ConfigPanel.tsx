"use client";

import { GarageConfig, RoofType, WallFace, GarageElement, TextureFinish, CorrugationPattern, GateType } from '@/types';
import { Home, Maximize, PaintBucket, Plus, Trash2, BoxSelect, Layers } from 'lucide-react';
import { findValidPosition } from '@/lib/collision';
import { v4 as uuidv4 } from 'uuid';

interface ConfigPanelProps {
  config: GarageConfig;
  setConfig: React.Dispatch<React.SetStateAction<GarageConfig>>;
  selectedWall: WallFace;
  setSelectedWall: (wall: WallFace) => void;
}

const ROOF_TYPES: { type: RoofType; label: string }[] = [
  { type: 'dual-slope', label: 'Dwuspadowy' },
  { type: 'slope-front', label: 'Spad w przód' },
  { type: 'slope-back', label: 'Spad w tył' },
  { type: 'slope-left', label: 'Spad w lewo' },
  { type: 'slope-right', label: 'Spad w prawo' },
];

const CORRUGATION_PATTERNS: { type: CorrugationPattern; label: string }[] = [
  { type: 'vertical-t7', label: 'Pionowe T-7' },
  { type: 'horizontal-t7', label: 'Poziome T-7' },
  { type: 'vertical-t14', label: 'Pionowe T-14' },
  { type: 'horizontal-t14', label: 'Poziome T-14' },
];

export default function ConfigPanel({ config, setConfig, selectedWall, setSelectedWall }: ConfigPanelProps) {
  
  const updateConfig = (key: keyof GarageConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addElement = (type: GarageElement['type'], wall: WallFace = selectedWall) => {
    let width = 100;
    let height = 200;
    if (type === 'gate') { width = 250; height = 200; }
    if (type === 'window' || type === 'pvc-window') { width = 100; height = 60; }
    if (type === 'skylight') { width = 100; height = 30; }

    const wallWidth = wall === 'front' || wall === 'back' ? config.width : config.length;

    const newElement: GarageElement = {
      id: uuidv4(),
      type,
      wall,
      x: 0,
      y: type === 'window' || type === 'pvc-window' ? 120 : (type === 'skylight' ? config.height - 40 : 0),
      width,
      height,
      gateType: type === 'gate' ? 'up-and-over' : undefined,
      clearanceHeight: type === 'gate' ? 190 : undefined,
    };

    const validPos = findValidPosition(newElement, config.elements, wallWidth, config.height);
    
    if (validPos) {
      newElement.x = validPos.x;
      newElement.y = validPos.y;
      setConfig(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
      setSelectedWall(wall); // switch to the wall where element was added
    } else {
      alert("Brak miejsca na tej ścianie na nowy element!");
    }
  };

  const updateElement = (id: string, updates: Partial<GarageElement>) => {
    setConfig(prev => {
      const newElements = prev.elements.map(el => {
        if (el.id === id) {
          const updated = { ...el, ...updates };
          const wallWidth = updated.wall === 'front' || updated.wall === 'back' ? prev.width : prev.length;
          const pos = findValidPosition(updated, prev.elements, wallWidth, prev.height);
          
          if (!pos && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined)) {
            return el; 
          }
          if (pos && (updates.x !== undefined || updates.y !== undefined)) {
             if (pos.x !== updated.x || pos.y !== updated.y) {
               return el; 
             }
          }
          return updated;
        }
        return el;
      });
      return { ...prev, elements: newElements };
    });
  };

  const removeElement = (id: string) => {
    setConfig(prev => ({ ...prev, elements: prev.elements.filter(e => e.id !== id) }));
  };

  const gates = config.elements.filter(e => e.type === 'gate');

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. TYP GARAŻU */}
      <section className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg mb-4 text-zinc-900 border-b border-zinc-200 pb-2">
          <Home size={20} className="text-red-600" />
          Typ Garażu (Dach)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {ROOF_TYPES.map(rt => (
            <button
              key={rt.type}
              onClick={() => updateConfig('roofType', rt.type)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center text-center gap-2 ${
                config.roofType === rt.type 
                  ? 'border-red-600 bg-red-50 text-red-700 shadow-sm' 
                  : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
          <span className="font-medium text-sm text-zinc-700">Rynny i Rury Spadowe</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.gutters} onChange={(e) => updateConfig('gutters', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </section>

      {/* 2. WYMIARY */}
      <section className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg mb-4 text-zinc-900 border-b border-zinc-200 pb-2">
          <Maximize size={20} className="text-red-600" />
          Wymiary Główne
        </h2>
        <div className="space-y-6">
          {[
            { label: 'Szerokość', key: 'width', min: 200, max: 800, step: 10 },
            { label: 'Długość', key: 'length', min: 300, max: 1000, step: 10 },
            { label: 'Wysokość (ściana)', key: 'height', min: 200, max: 350, step: 5 },
          ].map(dim => (
            <div key={dim.key}>
              <div className="flex justify-between mb-2 text-sm font-semibold text-zinc-700">
                <label>{dim.label}</label>
                <span className="bg-white px-2 py-1 rounded border border-zinc-200">{String(config[dim.key as keyof GarageConfig])} cm</span>
              </div>
              <input
                type="range"
                min={dim.min}
                max={dim.max}
                step={dim.step}
                value={config[dim.key as keyof GarageConfig] as number}
                onChange={(e) => updateConfig(dim.key as keyof GarageConfig, Number(e.target.value))}
                className="w-full accent-red-600"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 3. PARAMETRY BRAM */}
      <section className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg mb-4 text-zinc-900 border-b border-zinc-200 pb-2">
          <BoxSelect size={20} className="text-red-600" />
          Parametry Bram
        </h2>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-zinc-700">Ilość bram (przód)</span>
            <div className="flex gap-2 bg-white rounded-lg border border-zinc-200 p-1">
              <button onClick={() => { if (gates.length === 2) removeElement(gates[1].id); if (gates.length === 0) addElement('gate', 'front'); }} className={`px-3 py-1 rounded-md text-sm ${gates.length === 1 ? 'bg-zinc-100 font-bold' : ''}`}>1</button>
              <button onClick={() => { if (gates.length < 2) addElement('gate', 'front'); }} className={`px-3 py-1 rounded-md text-sm ${gates.length === 2 ? 'bg-zinc-100 font-bold' : ''}`}>2</button>
            </div>
          </div>
        </div>

        {gates.map((gate, i) => (
          <div key={gate.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mb-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-zinc-800">Brama #{i+1}</h3>
              <select 
                value={gate.gateType} 
                onChange={(e) => {
                  setSelectedWall('front'); // Focus camera
                  updateElement(gate.id, { gateType: e.target.value as GateType })
                }}
                className="text-sm border-zinc-300 rounded-lg p-1 bg-zinc-50"
              >
                <option value="up-and-over">Uchylna</option>
                <option value="swing">Dwuskrzydłowa</option>
                <option value="sectional">Segmentowa</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-zinc-500">Szerokość</label>
                <input type="number" value={gate.width} onChange={(e) => updateElement(gate.id, { width: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Światło wjazdu (Wys)</label>
                <input type="number" value={gate.clearanceHeight} onChange={(e) => updateElement(gate.id, { clearanceHeight: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Pozycja X</span>
                <span>{gate.x} cm</span>
              </div>
              <input 
                type="range" 
                min={-(config.width / 2) + gate.width/2} 
                max={(config.width / 2) - gate.width/2} 
                step={5} 
                value={gate.x} 
                onChange={(e) => updateElement(gate.id, { x: Number(e.target.value) })}
                className="w-full accent-zinc-800" 
              />
            </div>
          </div>
        ))}
      </section>

      {/* 4. DODATKI KONSTRUKCYJNE */}
      <section className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg mb-4 text-zinc-900 border-b border-zinc-200 pb-2">
          <Layers size={20} className="text-red-600" />
          Dodatki Konstrukcyjne
        </h2>
        
        <div className="mb-4">
          <label className="text-sm font-medium text-zinc-700 block mb-2">Edytuj ścianę:</label>
          <div className="flex gap-2">
            {(['front', 'back', 'left', 'right'] as WallFace[]).map(wall => (
              <button
                key={wall}
                onClick={() => setSelectedWall(wall)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${
                  selectedWall === wall ? 'bg-zinc-800 text-white' : 'bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {wall === 'front' ? 'Przód' : wall === 'back' ? 'Tył' : wall === 'left' ? 'Lewa' : 'Prawa'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          <button onClick={() => addElement('door')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-red-600 hover:text-red-600">
            <Plus size={16} /> Drzwi
          </button>
          <button onClick={() => addElement('window')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-red-600 hover:text-red-600">
            <Plus size={16} /> Okno Std
          </button>
          <button onClick={() => addElement('pvc-window')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-red-600 hover:text-red-600">
            <Plus size={16} /> Okno PCV
          </button>
        </div>

        <div className="space-y-3">
          {config.elements.filter(e => e.wall === selectedWall && e.type !== 'gate').length === 0 ? (
            <div className="text-sm text-zinc-400 text-center py-4 bg-white border border-dashed rounded-lg">
              Brak dodatków na tej ścianie.
            </div>
          ) : (
            config.elements.filter(e => e.wall === selectedWall && e.type !== 'gate').map((el, idx) => (
              <div key={el.id} className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm relative group">
                <button onClick={() => removeElement(el.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
                <h3 className="font-semibold text-zinc-800 mb-3 capitalize">
                  {el.type === 'door' ? 'Drzwi' : el.type === 'window' ? 'Okno Std' : 'Okno PCV'} #{idx + 1}
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>Pozycja X</span>
                      <span>{el.x} cm</span>
                    </div>
                    <input 
                      type="range" 
                      min={-((selectedWall === 'front' || selectedWall === 'back' ? config.width : config.length) / 2) + el.width/2} 
                      max={((selectedWall === 'front' || selectedWall === 'back' ? config.width : config.length) / 2) - el.width/2} 
                      step={5} 
                      value={el.x} 
                      onChange={(e) => updateElement(el.id, { x: Number(e.target.value) })}
                      className="w-full accent-zinc-800" 
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. PRZETŁOCZENIA I KOLORY */}
      <section className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg mb-4 text-zinc-900 border-b border-zinc-200 pb-2">
          <PaintBucket size={20} className="text-red-600" />
          Wykończenie i Przetłoczenia
        </h2>

        <div className="mb-5">
          <span className="text-sm font-medium text-zinc-700 mb-2 block">Rodzaj przetłoczeń blachy</span>
          <div className="grid grid-cols-2 gap-2">
            {CORRUGATION_PATTERNS.map(pattern => (
              <button
                key={pattern.type}
                onClick={() => updateConfig('corrugationPattern', pattern.type)}
                className={`p-2 text-xs font-medium border rounded-lg transition-all ${
                  config.corrugationPattern === pattern.type ? 'border-red-600 bg-red-50 text-red-700' : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                {pattern.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <span className="text-sm font-medium text-zinc-700 mb-2 block">Rodzaj Poszycia</span>
          <div className="flex gap-3">
            <button 
              onClick={() => updateConfig('finish', 'standard')}
              className={`flex-1 p-2 border rounded-xl font-medium text-xs transition-all ${config.finish === 'standard' ? 'border-red-600 bg-red-50 text-red-700' : 'border-zinc-200 bg-white'}`}
            >
              Blacha standardowa
            </button>
            <button 
              onClick={() => updateConfig('finish', 'golden-oak')}
              className={`flex-1 p-2 border rounded-xl font-medium text-xs transition-all ${config.finish === 'golden-oak' ? 'border-red-600 bg-red-50 text-red-700' : 'border-zinc-200 bg-white'}`}
            >
              Złoty dąb (Premium)
            </button>
          </div>
        </div>

        {config.finish === 'standard' && (
          <div className="space-y-4">
            {['roofColor', 'wallColor', 'doorColor'].map((key) => (
              <div key={key}>
                <span className="text-sm font-medium text-zinc-700 mb-2 block">
                  Kolor {key === 'roofColor' ? 'Dachu' : key === 'wallColor' ? 'Ścian' : 'Bram/Drzwi'}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {['#e3e3e3', '#3b3b3c', '#4a3028', '#f0f0f0', '#7a2222', '#2f4f4f'].map((color) => (
                    <button
                      key={color}
                      onClick={() => updateConfig(key as keyof GarageConfig, color)}
                      className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
                        config[key as keyof GarageConfig] === color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
