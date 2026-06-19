"use client";

import { GarageConfig, RoofType, WallFace, GarageElement, GateType, RoofProfile, WallProfile, GateProfile, DoorProfile } from '@/types';
import { Home, Maximize, PaintBucket, Plus, Trash2, BoxSelect, Layers, ChevronDown } from 'lucide-react';
import { findValidPosition } from '@/lib/collision';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState, useRef } from 'react';

interface ConfigPanelProps {
  config: GarageConfig;
  setConfig: React.Dispatch<React.SetStateAction<GarageConfig>>;
  selectedWall: WallFace;
  setSelectedWall: (wall: WallFace) => void;
}

// ── Roof Type Icons (inline SVG) ──
function RoofIcon({ type }: { type: RoofType }) {
  const base = "stroke-current fill-none";
  switch (type) {
    case 'dual-slope':
      return (
        <svg width="44" height="30" viewBox="0 0 44 30" className={base}>
          <polygon points="4,26 22,4 40,26" strokeWidth="2" stroke="currentColor" fill="none" />
          <line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" />
        </svg>
      );
    case 'slope-front':
      return (
        <svg width="44" height="30" viewBox="0 0 44 30" className={base}>
          <polygon points="4,10 40,22 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" />
          <line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" />
        </svg>
      );
    case 'slope-back':
      return (
        <svg width="44" height="30" viewBox="0 0 44 30" className={base}>
          <polygon points="4,22 40,10 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" />
          <line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" />
        </svg>
      );
    case 'slope-left':
      return (
        <svg width="44" height="30" viewBox="0 0 44 30" className={base}>
          <polygon points="4,22 40,10 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" />
          <line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" />
          <text x="10" y="18" fontSize="7" fill="currentColor" stroke="none">L</text>
          <text x="32" y="18" fontSize="7" fill="currentColor" stroke="none">R</text>
        </svg>
      );
    case 'slope-right':
      return (
        <svg width="44" height="30" viewBox="0 0 44 30" className={base}>
          <polygon points="4,10 40,22 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" />
          <line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" />
          <text x="10" y="18" fontSize="7" fill="currentColor" stroke="none">L</text>
          <text x="32" y="18" fontSize="7" fill="currentColor" stroke="none">R</text>
        </svg>
      );
  }
}

const ROOF_TYPES: { type: RoofType; label: string }[] = [
  { type: 'dual-slope', label: 'Dwuspadowy' },
  { type: 'slope-front', label: 'Spad w przód' },
  { type: 'slope-back', label: 'Spad w tył' },
  { type: 'slope-left', label: 'Spad w lewo' },
  { type: 'slope-right', label: 'Spad w prawo' },
];

// Color palettes
const STANDARD_COLORS = ['#e3e3e3', '#3b3b3c', '#4a3028', '#f0f0f0', '#7a2222', '#2f4f4f'];
const WOOD_COLORS = [
  { color: '#4a3028', label: 'Orzech' },
  { color: '#6b4423', label: 'Złoty Dąb' },
  { color: '#8b5a2b', label: 'Winchester' },
  { color: '#3d2314', label: 'Mahoń' },
];
const TILE_COLORS = [
  { color: '#8b0000', label: 'Ceglasty' },
  { color: '#3b3b3c', label: 'Grafit' },
  { color: '#2d4a1e', label: 'Zielony' },
  { color: '#4a3028', label: 'Brąz' },
  { color: '#d4d4d4', label: 'Ocynk' },
];
const RAL_COLORS = [
  { color: '#ffffff', label: 'Biały' },
  { color: '#8b4513', label: 'Brąz' },
  { color: '#3b3b3c', label: 'Antracyt' },
  { color: '#000000', label: 'Czarny' },
  { color: '#d4d4d4', label: 'Szary' },
];

// Collapsible section helper
function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <h2 className="flex items-center gap-2 font-bold text-lg text-zinc-900">
          <span className="text-orange-600">{icon}</span>
          {title}
        </h2>
        <ChevronDown size={20} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-zinc-200 pt-4">{children}</div>}
    </section>
  );
}

// Color swatch picker
function ColorPicker({ colors, value, onChange, labels }: { colors: string[]; value: string; onChange: (c: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          title={labels?.[color] || color}
          className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
            value === color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ── KOMPONENT KOSZYKA Z API WOOCOMMERCE ──
function OrderButton({ config, totalPrice }: { config: GarageConfig; totalPrice: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);

  const handleOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 1. Szukamy elementu Canvas na stronie
    const canvas = document.querySelector('canvas');
    
    if (canvas && inputImgRef.current && formRef.current) {
      // 2. Robimy zdjęcie garażu
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // 3. Pakujemy zdjęcie do ukrytego pola
      inputImgRef.current.value = imageBase64;
      
      // 4. Odpalamy formularz do WordPressa
      formRef.current.submit();
    } else {
      alert("Chwilowy błąd pobierania widoku 3D. Upewnij się, że wizualizacja wczytała się poprawnie.");
    }
  };

  return (
    <div className="mt-8 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-end mb-4">
        <span className="text-zinc-500 font-medium">Cena konfiguracji:</span>
        <span className="text-3xl font-extrabold text-zinc-900">{totalPrice} zł</span>
      </div>
      
      <form ref={formRef} method="POST" action="https://konfigurator.skillup-szkolenia.pl/?add-garage-to-cart=1">
        <input type="hidden" name="garage_order" value="1" />
        <input type="hidden" name="garage_price" value={totalPrice} />
        <input type="hidden" name="garage_config" value={JSON.stringify(config)} />
        <input type="hidden" ref={inputImgRef} name="garage_image" value="" />
        
        <button 
          onClick={handleOrder} 
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl text-lg uppercase transition-colors shadow-md hover:shadow-lg flex justify-center items-center gap-2"
        >
          Kupuję i płacę
        </button>
      </form>
    </div>
  );
}

// ── GŁÓWNY PANEL KONFIGURACYJNY ──
export default function ConfigPanel({ config, setConfig, selectedWall, setSelectedWall }: ConfigPanelProps) {
  
  // Gate height enforcement for slope-front
  useEffect(() => {
    if (config.roofType === 'slope-front') {
      const maxH = config.height - 30;
      let changed = false;
      const newElements = config.elements.map(el => {
        if (el.wall === 'front' && el.type === 'gate') {
          const updated = { ...el };
          if (updated.height > maxH) { updated.height = maxH; changed = true; }
          if (updated.clearanceHeight && updated.clearanceHeight > maxH) { updated.clearanceHeight = maxH; changed = true; }
          return updated;
        }
        return el;
      });
      if (changed) {
        setConfig(prev => ({ ...prev, elements: newElements }));
      }
    }
  }, [config.roofType, config.height, config.elements, setConfig]);

  const updateConfig = <K extends keyof GarageConfig>(key: K, value: GarageConfig[K]) => {
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
      setSelectedWall(wall);
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
          
          if (!pos && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined || updates.height !== undefined)) {
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
  const maxGateHeight = config.roofType === 'slope-front' ? config.height - 30 : config.height;

  // TUTAJ JEST TWOJA TYMCZASOWA CENA - DO PODMIANY GDY BĘDZIESZ MIAŁ ALGORYTM
  const currentPrice = 7900; 

  return (
    <div className="space-y-4 pb-12">
      
      {/* ═══ 1. TYP GARAŻU ═══ */}
      <Section title="Typ Garażu (Dach)" icon={<Home size={20} />}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {ROOF_TYPES.map(rt => (
            <button
              key={rt.type}
              onClick={() => updateConfig('roofType', rt.type)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center text-center gap-2 ${
                config.roofType === rt.type 
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' 
                  : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
              }`}
            >
              <RoofIcon type={rt.type} />
              {rt.label}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
          <span className="font-medium text-sm text-zinc-700">Rynny i Rury Spadowe</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.gutters} onChange={(e) => updateConfig('gutters', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>
      </Section>

      {/* ═══ 2. WYMIARY ═══ */}
      <Section title="Wymiary Główne" icon={<Maximize size={20} />}>
        <div className="space-y-6">
          {[
            { label: 'Szerokość', key: 'width' as const, min: 200, max: 800, step: 10 },
            { label: 'Długość', key: 'length' as const, min: 300, max: 1000, step: 10 },
            { label: 'Wysokość (ściana)', key: 'height' as const, min: 200, max: 350, step: 5 },
          ].map(dim => (
            <div key={dim.key}>
              <div className="flex justify-between mb-2 text-sm font-semibold text-zinc-700">
                <label>{dim.label}</label>
                <span className="bg-white px-2 py-1 rounded border border-zinc-200">{config[dim.key]} cm</span>
              </div>
              <input
                type="range"
                min={dim.min}
                max={dim.max}
                step={dim.step}
                value={config[dim.key]}
                onChange={(e) => updateConfig(dim.key, Number(e.target.value))}
                className="w-full accent-orange-600"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 3. PARAMETRY BRAM ═══ */}
      <Section title="Parametry Bram" icon={<BoxSelect size={20} />}>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-zinc-700">Ilość bram (przód)</span>
            <div className="flex gap-2 bg-white rounded-lg border border-zinc-200 p-1">
              <button onClick={() => { if (gates.length === 2) removeElement(gates[1].id); if (gates.length === 0) addElement('gate', 'front'); }} className={`px-3 py-1 rounded-md text-sm ${gates.length === 1 ? 'bg-orange-100 font-bold text-orange-700' : ''}`}>1</button>
              <button onClick={() => { if (gates.length < 2) addElement('gate', 'front'); }} className={`px-3 py-1 rounded-md text-sm ${gates.length === 2 ? 'bg-orange-100 font-bold text-orange-700' : ''}`}>2</button>
            </div>
          </div>
        </div>

        {config.roofType === 'slope-front' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ⚠️ Dach spadowy w przód — max. wysokość bramy ograniczona do <strong>{maxGateHeight} cm</strong> (bufor na rynnę).
          </div>
        )}

        {gates.map((gate, i) => (
          <div key={gate.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mb-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-zinc-800">Brama #{i+1}</h3>
              <select 
                value={gate.gateType} 
                onChange={(e) => {
                  setSelectedWall('front');
                  updateElement(gate.id, { gateType: e.target.value as GateType, isOpen: false });
                }}
                className="text-sm border-zinc-300 rounded-lg p-1 bg-zinc-50"
              >
                <option value="up-and-over">Uchylna</option>
                <option value="swing">Dwuskrzydłowa</option>
                <option value="sectional">Segmentowa</option>
              </select>
            </div>

            <div className="mb-3">
              <button 
                onClick={() => updateElement(gate.id, { isOpen: !gate.isOpen })}
                className={`w-full py-2 rounded-lg text-sm font-bold transition-colors border ${
                  gate.isOpen ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {gate.isOpen ? 'Zamknij Bramę' : 'Otwórz Bramę'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-zinc-500">Szerokość</label>
                <input type="number" value={gate.width} onChange={(e) => updateElement(gate.id, { width: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Wysokość</label>
                <input 
                  type="number" 
                  value={gate.height} 
                  max={maxGateHeight}
                  onChange={(e) => {
                    const val = Math.min(Number(e.target.value), maxGateHeight);
                    updateElement(gate.id, { height: val });
                  }} 
                  className="w-full border p-1 rounded text-sm mt-1" 
                />
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
      </Section>

      {/* ═══ 4. DODATKI KONSTRUKCYJNE ═══ */}
      <Section title="Dodatki Konstrukcyjne" icon={<Layers size={20} />}>
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

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button onClick={() => addElement('door')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-orange-500 hover:text-orange-600">
            <Plus size={16} /> Drzwi
          </button>
          <button onClick={() => addElement('window')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-orange-500 hover:text-orange-600">
            <Plus size={16} /> Okno Std
          </button>
          <button onClick={() => addElement('pvc-window')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-orange-500 hover:text-orange-600">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500">Szerokość</label>
                      <input type="number" value={el.width} onChange={(e) => updateElement(el.id, { width: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Wysokość</label>
                      <input type="number" value={el.height} onChange={(e) => updateElement(el.id, { height: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" />
                    </div>
                  </div>
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
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>Pozycja Y (od ziemi)</span>
                      <span>{el.y} cm</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={config.height - el.height} 
                      step={5} 
                      value={el.y} 
                      onChange={(e) => updateElement(el.id, { y: Number(e.target.value) })}
                      className="w-full accent-zinc-800" 
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* ═══ 5. KOLORY I PRZETŁOCZENIA ═══ */}
      <Section title="Kolory i Przetłoczenia" icon={<PaintBucket size={20} />} defaultOpen={false}>
        
        {/* 5a. DACH */}
        <div className="mb-6">
          <h3 className="font-semibold text-zinc-800 mb-3 text-sm">🏠 Dach</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Profil dachu</span>
              <div className="flex gap-2">
                {([
                  { value: 'trapez-t14' as RoofProfile, label: 'Trapez T-14' },
                  { value: 'rabek' as RoofProfile, label: 'Rąbek stojący' },
                  { value: 'blachodachowka' as RoofProfile, label: 'Blachodachówka' },
                ] as const).map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      const updates: Partial<GarageConfig> = { roofProfile: p.value };
                      if (p.value === 'blachodachowka') {
                        const tileColorValues = TILE_COLORS.map(c => c.color);
                        if (!tileColorValues.includes(config.roofColor)) {
                          updates.roofColor = '#3b3b3c';
                        }
                      }
                      setConfig(prev => ({ ...prev, ...updates }));
                    }}
                    className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${
                      config.roofProfile === p.value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor dachu</span>
              {config.roofProfile === 'blachodachowka' ? (
                <div className="flex gap-2 flex-wrap">
                  {TILE_COLORS.map(c => (
                    <button
                      key={c.color}
                      onClick={() => updateConfig('roofColor', c.color)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
                        config.roofColor === c.color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              ) : (
                <ColorPicker colors={STANDARD_COLORS} value={config.roofColor} onChange={(c) => updateConfig('roofColor', c)} />
              )}
            </div>
          </div>
        </div>

        <hr className="border-zinc-200 my-4" />

        {/* 5b. ŚCIANY */}
        <div className="mb-6">
          <h3 className="font-semibold text-zinc-800 mb-3 text-sm">🧱 Ściany</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Profil ścian</span>
              <div className="flex gap-2">
                {([
                  { value: 'trapez-t7' as WallProfile, label: 'Trapez T-7' },
                  { value: 'ocynk' as WallProfile, label: 'Ocynk' },
                  { value: 'drewnopodobna' as WallProfile, label: 'Drewnopodobna' },
                ] as const).map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      const updates: Partial<GarageConfig> = { wallProfile: p.value };
                      if (p.value === 'ocynk') updates.wallColor = '#d4d4d4';
                      setConfig(prev => ({ ...prev, ...updates }));
                    }}
                    className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${
                      config.wallProfile === p.value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor ścian</span>
              {config.wallProfile === 'ocynk' ? (
                <p className="text-xs text-zinc-400 italic">Kolor ustalony automatycznie (ocynk).</p>
              ) : config.wallProfile === 'drewnopodobna' ? (
                <div className="flex gap-2 flex-wrap">
                  {WOOD_COLORS.map(c => (
                    <button
                      key={c.color}
                      onClick={() => updateConfig('wallColor', c.color)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
                        config.wallColor === c.color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              ) : (
                <ColorPicker colors={STANDARD_COLORS} value={config.wallColor} onChange={(c) => updateConfig('wallColor', c)} />
              )}
            </div>
          </div>
        </div>

        <hr className="border-zinc-200 my-4" />

        {/* 5c. BRAMA GŁÓWNA */}
        <div className="mb-6">
          <h3 className="font-semibold text-zinc-800 mb-3 text-sm">🚪 Brama Główna</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Profil bramy</span>
              <div className="flex gap-2">
                {([
                  { value: 'trapez-t7' as GateProfile, label: 'Trapez T-7' },
                  { value: 'drewnopodobna' as GateProfile, label: 'Drewnopodobna' },
                ] as const).map(p => (
                  <button
                    key={p.value}
                    onClick={() => updateConfig('gateProfile', p.value)}
                    className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${
                      config.gateProfile === p.value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor bramy</span>
              {config.gateProfile === 'drewnopodobna' ? (
                <div className="flex gap-2 flex-wrap">
                  {WOOD_COLORS.map(c => (
                    <button
                      key={c.color}
                      onClick={() => updateConfig('gateColor', c.color)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
                        config.gateColor === c.color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              ) : (
                <ColorPicker colors={STANDARD_COLORS} value={config.gateColor} onChange={(c) => updateConfig('gateColor', c)} />
              )}
            </div>
          </div>
        </div>

        <hr className="border-zinc-200 my-4" />

        {/* 5d. DRZWI BOCZNE */}
        <div className="mb-6">
          <h3 className="font-semibold text-zinc-800 mb-3 text-sm">🚪 Drzwi Boczne</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Profil drzwi</span>
              <div className="flex gap-2">
                {([
                  { value: 'trapez-t7' as DoorProfile, label: 'Trapez T-7' },
                  { value: 'drewnopodobna' as DoorProfile, label: 'Drewnopodobna' },
                ] as const).map(p => (
                  <button
                    key={p.value}
                    onClick={() => updateConfig('doorProfile', p.value)}
                    className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${
                      config.doorProfile === p.value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor drzwi</span>
              {config.doorProfile === 'drewnopodobna' ? (
                <div className="flex gap-2 flex-wrap">
                  {WOOD_COLORS.map(c => (
                    <button
                      key={c.color}
                      onClick={() => updateConfig('doorColor', c.color)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
                        config.doorColor === c.color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              ) : (
                <ColorPicker colors={STANDARD_COLORS} value={config.doorColor} onChange={(c) => updateConfig('doorColor', c)} />
              )}
            </div>
          </div>
        </div>

        <hr className="border-zinc-200 my-4" />

        {/* 5e. RAMY OKIEN */}
        <div>
          <h3 className="font-semibold text-zinc-800 mb-3 text-sm">🪟 Ramy Okien (RAL)</h3>
          <div className="flex gap-2 flex-wrap">
            {RAL_COLORS.map(c => (
              <button
                key={c.color}
                onClick={() => updateConfig('windowColor', c.color)}
                title={c.label}
                className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${
                  config.windowColor === c.color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>
        </div>

      </Section>

      {/* ── KOSZYK I ZAMÓWIENIE ── */}
      <OrderButton config={config} totalPrice={currentPrice} />

    </div>
  );
}