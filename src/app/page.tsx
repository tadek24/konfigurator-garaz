"use client";

import { GarageConfig, RoofType, WallFace, GarageElement, GateType, RoofProfile, WallProfile, GateProfile, DoorProfile } from '@/types';
import { Home, Maximize, PaintBucket, Plus, Trash2, BoxSelect, Layers, ChevronDown } from 'lucide-react';
import { findValidPosition } from '@/lib/collision';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState, useRef, useMemo, Dispatch, SetStateAction } from 'react';

interface ConfigPanelProps {
  config: GarageConfig;
  setConfig: Dispatch<SetStateAction<GarageConfig>>;
  selectedWall: WallFace;
  setSelectedWall: (wall: WallFace) => void;
}

const WOJEWODZTWA = ["Dolnośląskie", "Kujawsko-pomorskie", "Lubelskie", "Lubuskie", "Łódzkie", "Małopolskie", "Mazowieckie", "Opolskie", "Podkarpackie", "Podlaskie", "Pomorskie", "Śląskie", "Świętokrzyskie", "Warmińsko-mazurskie", "Wielkopolskie", "Zachodniopomorskie"];

function RoofIcon({ type }: { type: RoofType }) {
  const base = "stroke-current fill-none";
  switch (type) {
    case 'dual-slope': return (<svg width="44" height="30" viewBox="0 0 44 30" className={base}><polygon points="4,26 22,4 40,26" strokeWidth="2" stroke="currentColor" fill="none" /><line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" /></svg>);
    case 'slope-front': return (<svg width="44" height="30" viewBox="0 0 44 30" className={base}><polygon points="4,10 40,22 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" /><line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" /></svg>);
    case 'slope-back': return (<svg width="44" height="30" viewBox="0 0 44 30" className={base}><polygon points="4,22 40,10 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" /><line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" /></svg>);
    case 'slope-left': return (<svg width="44" height="30" viewBox="0 0 44 30" className={base}><polygon points="4,22 40,10 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" /><line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" /><text x="10" y="18" fontSize="7" fill="currentColor" stroke="none">L</text><text x="32" y="18" fontSize="7" fill="currentColor" stroke="none">R</text></svg>);
    case 'slope-right': return (<svg width="44" height="30" viewBox="0 0 44 30" className={base}><polygon points="4,10 40,22 40,26 4,26" strokeWidth="2" stroke="currentColor" fill="none" /><line x1="4" y1="26" x2="40" y2="26" strokeWidth="2" stroke="currentColor" /><text x="10" y="18" fontSize="7" fill="currentColor" stroke="none">L</text><text x="32" y="18" fontSize="7" fill="currentColor" stroke="none">R</text></svg>);
  }
}

const ROOF_TYPES: { type: RoofType; label: string }[] = [ { type: 'dual-slope', label: 'Dwuspadowy' }, { type: 'slope-front', label: 'Spad w przód' }, { type: 'slope-back', label: 'Spad w tył' }, { type: 'slope-left', label: 'Spad w lewo' }, { type: 'slope-right', label: 'Spad w prawo' } ];
const STANDARD_COLORS = ['#e3e3e3', '#3b3b3c', '#4a3028', '#f0f0f0', '#7a2222', '#2f4f4f'];
const WOOD_COLORS = [{ color: '#4a3028', label: 'Orzech' }, { color: '#6b4423', label: 'Złoty Dąb' }, { color: '#8b5a2b', label: 'Winchester' }, { color: '#3d2314', label: 'Mahoń' }];
const TILE_COLORS = [{ color: '#8b0000', label: 'Ceglasty' }, { color: '#3b3b3c', label: 'Grafit' }, { color: '#2d4a1e', label: 'Zielony' }, { color: '#4a3028', label: 'Brąz' }, { color: '#d4d4d4', label: 'Ocynk' }];
const RAL_COLORS = [{ color: '#ffffff', label: 'Biały' }, { color: '#8b4513', label: 'Brąz' }, { color: '#3b3b3c', label: 'Antracyt' }, { color: '#000000', label: 'Czarny' }, { color: '#d4d4d4', label: 'Szary' }];

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <h2 className="flex items-center gap-2 font-bold text-lg text-zinc-900"><span className="text-[var(--theme, #ea580c)]">{icon}</span>{title}</h2>
        <ChevronDown size={20} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-zinc-200 pt-4">{children}</div>}
    </section>
  );
}

function ColorPicker({ colors, value, onChange, labels }: { colors: string[]; value: string; onChange: (c: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map((color) => (
        <button key={color} onClick={() => onChange(color)} title={labels?.[color] || color} className={`w-8 h-8 rounded-full border-[3px] shadow-sm transition-transform ${value === color ? 'border-zinc-900 scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

function OrderButton({ config, totalPrice, targetStoreUrl, selectedAddonsText }: { config: GarageConfig; totalPrice: number; targetStoreUrl: string; selectedAddonsText: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputImgRef = useRef<HTMLInputElement>(null);
  const [region, setRegion] = useState("");

  const handleOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!region) return;
    const canvas = document.querySelector('canvas');
    if (canvas && inputImgRef.current && formRef.current) {
      try {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const scale = Math.min(800 / canvas.width, 1);
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
          inputImgRef.current.value = tempCanvas.toDataURL('image/jpeg', 0.7); 
          formRef.current.submit();
        }
      } catch (err) { alert("Błąd zdjęcia"); }
    } else { alert("Błąd 3D."); }
  };

  return (
    <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex flex-col gap-2 mb-4">
        <label className="text-sm font-semibold text-zinc-300">Województwo <span className="text-red-500">*</span></label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="p-3 rounded-lg text-zinc-900 bg-white border-none outline-none font-medium" style={{borderColor: region ? 'var(--theme, #ea580c)' : 'transparent', borderWidth: '2px'}} required >
          <option value="" disabled>Wybierz z listy...</option>
          {WOJEWODZTWA.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      <div className="flex justify-between items-end mb-6 pb-4 border-b border-zinc-700">
        <span className="text-zinc-400 font-medium">Cena całkowita:</span>
        <span className="text-3xl font-extrabold text-[var(--theme, #ea580c)]">{totalPrice} zł</span>
      </div>
      
      <form ref={formRef} method="POST" action={targetStoreUrl} target="_parent">
        <input type="hidden" name="custom_garage_checkout" value="1" />
        <input type="hidden" name="garage_price" value={totalPrice} />
        <input type="hidden" name="garage_wojewodztwo" value={region} />
        <input type="hidden" name="garage_config" value={JSON.stringify(config)} />
        <input type="hidden" name="garage_origin" value={targetStoreUrl} />
        <input type="hidden" name="garage_dynamic_addons" value={selectedAddonsText} />
        <input type="hidden" ref={inputImgRef} name="garage_image" value="" />
        
        <button onClick={handleOrder} disabled={!region} className="w-full font-bold py-4 px-6 rounded-xl text-lg uppercase transition-all shadow-md flex justify-center items-center gap-2 text-white" style={{ backgroundColor: region ? 'var(--theme, #ea580c)' : '#3f3f46', cursor: region ? 'pointer' : 'not-allowed' }}>
          {region ? 'Kupuję i płacę' : 'Wybierz województwo'}
        </button>
      </form>
    </div>
  );
}

export default function ConfigPanel({ config, setConfig, selectedWall, setSelectedWall }: ConfigPanelProps) {
  const [targetStoreUrl, setTargetStoreUrl] = useState("https://konfigurator.skillup-szkolenia.pl/");
  const [pricingParams, setPricingParams] = useState({ 
    base: 5000, sqmType: 'fixed', sqmVal: 150, doorType: 'fixed', doorVal: 500, 
    windowType: 'fixed', windowVal: 300, woodType: 'pct', woodVal: 15, gutterType: 'pct', gutterVal: 5 
  });
  const [customAddons, setCustomAddons] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const envWpUrl = process.env.NEXT_PUBLIC_WP_URL || "https://konfigurator.skillup-szkolenia.pl";
      const storeUrl = params.get('store_url') ? decodeURIComponent(params.get('store_url') as string) : envWpUrl;
      setTargetStoreUrl(storeUrl);

      if (params.has('base')) {
        setPricingParams({
          base: Number(params.get('base')),
          sqmType: params.get('sq_t') || 'fixed', sqmVal: Number(params.get('sq_v')) || 0,
          doorType: params.get('dr_t') || 'fixed', doorVal: Number(params.get('dr_v')) || 0,
          windowType: params.get('wn_t') || 'fixed', windowVal: Number(params.get('wn_v')) || 0,
          woodType: params.get('wd_t') || 'pct', woodVal: Number(params.get('wd_v')) || 0,
          gutterType: params.get('gt_t') || 'pct', gutterVal: Number(params.get('gt_v')) || 0,
        });
      }

      const addonsRaw = params.get('addns');
      if (addonsRaw) {
        try {
          setCustomAddons(JSON.parse(decodeURIComponent(addonsRaw)));
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  const calculatedPrice = useMemo(() => {
    let total = pricingParams.base;
    let percentMultiplier = 1;
    
    const area = (config.width / 100) * (config.length / 100);
    if (pricingParams.sqmType === 'fixed') total += (area * pricingParams.sqmVal);
    else percentMultiplier += (area * pricingParams.sqmVal / 100);

    const doorsCount = config.elements.filter(e => e.type === 'door').length;
    const windowsCount = config.elements.filter(e => e.type === 'window' || e.type === 'pvc-window').length;
    
    if (pricingParams.doorType === 'fixed') total += (doorsCount * pricingParams.doorVal);
    else percentMultiplier += (doorsCount * pricingParams.doorVal / 100);

    if (pricingParams.windowType === 'fixed') total += (windowsCount * pricingParams.windowVal);
    else percentMultiplier += (windowsCount * pricingParams.windowVal / 100);

    if (config.wallProfile === 'drewnopodobna' || config.gateProfile === 'drewnopodobna' || config.roofProfile === 'drewnopodobna' || config.doorProfile === 'drewnopodobna') {
      if (pricingParams.woodType === 'fixed') total += pricingParams.woodVal;
      else percentMultiplier += (pricingParams.woodVal / 100);
    }
    if (config.gutters) {
      if (pricingParams.gutterType === 'fixed') total += pricingParams.gutterVal;
      else percentMultiplier += (pricingParams.gutterVal / 100);
    }

    let customAddonTotal = 0;
    selectedAddons.forEach(addonId => {
      const addon = customAddons.find(a => a.id === addonId);
      if (addon) {
        if (addon.type === 'fixed') customAddonTotal += Number(addon.price);
        if (addon.type === 'pct') percentMultiplier += (Number(addon.price) / 100);
      }
    });

    return Math.round((total * percentMultiplier) + customAddonTotal);
  }, [config, pricingParams, selectedAddons, customAddons]);

  const handleAddonToggle = (addonId: string) => setSelectedAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]);
  const selectedAddonsText = selectedAddons.map(id => customAddons.find((a:any) => a.id === id)?.label).filter(Boolean).join(", ");

  const updateConfig = <K extends keyof GarageConfig>(key: K, value: GarageConfig[K]) => setConfig(prev => ({ ...prev, [key]: value }));

  const addElement = (type: GarageElement['type'], wall: WallFace = selectedWall) => {
    let width = 100, height = 200;
    if (type === 'gate') { width = 250; height = 200; }
    if (type === 'window' || type === 'pvc-window') { width = 100; height = 60; }
    if (type === 'skylight') { width = 100; height = 30; }

    const wallWidth = wall === 'front' || wall === 'back' ? config.width : config.length;
    const newElement: GarageElement = { id: uuidv4(), type, wall, x: 0, y: type === 'window' || type === 'pvc-window' ? 120 : (type === 'skylight' ? config.height - 40 : 0), width, height, gateType: type === 'gate' ? 'up-and-over' : undefined, clearanceHeight: type === 'gate' ? 190 : undefined, hingeSide: 'left' };

    const validPos = findValidPosition(newElement, config.elements, wallWidth, config.height);
    if (validPos) {
      newElement.x = validPos.x; newElement.y = validPos.y;
      setConfig(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
      setSelectedWall(wall);
    } else { alert("Brak miejsca na tej ścianie!"); }
  };

  const updateElement = (id: string, updates: Partial<GarageElement>) => {
    setConfig(prev => {
      const newElements = prev.elements.map(el => {
        if (el.id === id) {
          const updated = { ...el, ...updates };
          const wallWidth = updated.wall === 'front' || updated.wall === 'back' ? prev.width : prev.length;
          const pos = findValidPosition(updated, prev.elements, wallWidth, prev.height);
          if (!pos && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined || updates.height !== undefined)) return el; 
          if (pos && (updates.x !== undefined || updates.y !== undefined)) { if (pos.x !== updated.x || pos.y !== updated.y) return el; }
          return updated;
        }
        return el;
      });
      return { ...prev, elements: newElements };
    });
  };

  const removeElement = (id: string) => setConfig(prev => ({ ...prev, elements: prev.elements.filter(e => e.id !== id) }));
  const gates = config.elements.filter(e => e.type === 'gate');
  const maxGateHeight = config.roofType === 'slope-front' ? config.height - 30 : config.height;

  return (
    <div className="space-y-4 pb-12">
      <Section title="Typ Garażu (Dach)" icon={<Home size={20} />}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {ROOF_TYPES.map(rt => (
            <button key={rt.type} onClick={() => updateConfig('roofType', rt.type)} className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center text-center gap-2 ${config.roofType === rt.type ? 'border-[var(--theme, #ea580c)] bg-zinc-100 text-[var(--theme, #ea580c)] shadow-sm' : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'}`}>
              <RoofIcon type={rt.type} />{rt.label}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
          <span className="font-medium text-sm text-zinc-700">Rynny i Rury Spadowe</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.gutters} onChange={(e) => updateConfig('gutters', e.target.checked)} className="sr-only peer" />
            <div className={`w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${config.gutters ? 'bg-[var(--theme, #ea580c)]' : ''}`}></div>
          </label>
        </div>
      </Section>

      <Section title="Wymiary Główne" icon={<Maximize size={20} />}>
        <div className="space-y-6">
          {[{ label: 'Szerokość', key: 'width' as const, min: 200, max: 800, step: 10 }, { label: 'Długość', key: 'length' as const, min: 300, max: 1000, step: 10 }, { label: 'Wysokość', key: 'height' as const, min: 200, max: 350, step: 5 }].map(dim => (
            <div key={dim.key}>
              <div className="flex justify-between mb-2 text-sm font-semibold text-zinc-700"><label>{dim.label}</label><span className="bg-white px-2 py-1 rounded border border-zinc-200 text-[var(--theme, #ea580c)] font-bold">{config[dim.key]} cm</span></div>
              <input type="range" min={dim.min} max={dim.max} step={dim.step} value={config[dim.key]} onChange={(e) => updateConfig(dim.key, Number(e.target.value))} className="w-full" style={{accentColor: 'var(--theme, #ea580c)'}} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Parametry Bram" icon={<BoxSelect size={20} />}>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-zinc-700">Ilość bram (przód)</span>
            <div className="flex gap-2 bg-white rounded-lg border border-zinc-200 p-1">
              <button onClick={() => { if (gates.length === 2) removeElement(gates[1].id); if (gates.length === 0) addElement('gate', 'front'); }} className={`px-3 py-1 rounded-md text-sm ${gates.length === 1 ? 'bg-zinc-100 font-bold text-[var(--theme, #ea580c)]' : ''}`}>1</button>
              <button onClick={() => { if (gates.length < 2) addElement('gate', 'front'); }} className={`px-3 py-1 rounded-md text-sm ${gates.length === 2 ? 'bg-zinc-100 font-bold text-[var(--theme, #ea580c)]' : ''}`}>2</button>
            </div>
          </div>
        </div>
        {config.roofType === 'slope-front' && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">⚠️ Dach spadowy w przód — max. wysokość bramy ograniczona do <strong>{maxGateHeight} cm</strong>.</div>}

        {gates.map((gate, i) => (
          <div key={gate.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mb-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-zinc-800">Brama #{i+1}</h3>
              <select value={gate.gateType} onChange={(e) => { setSelectedWall('front'); updateElement(gate.id, { gateType: e.target.value as GateType, isOpen: false }); }} className="text-sm border-zinc-300 rounded-lg p-1 bg-zinc-50">
                <option value="up-and-over">Uchylna</option><option value="swing">Dwuskrzydłowa</option><option value="sectional">Segmentowa</option>
              </select>
            </div>
            <div className="mb-3"><button onClick={() => updateElement(gate.id, { isOpen: !gate.isOpen })} className={`w-full py-2 rounded-lg text-sm font-bold transition-colors border ${gate.isOpen ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'}`}>{gate.isOpen ? 'Zamknij Bramę' : 'Otwórz Bramę'}</button></div>
            {gate.gateType !== 'sectional' && gate.gateType !== 'swing' && (
              <div className="mb-3">
                <span className="text-xs text-zinc-500 block mb-2">Położenie klamki:</span>
                <div className="flex gap-2 bg-zinc-100 rounded-lg p-1 border">
                  <button onClick={() => updateElement(gate.id, { hingeSide: 'left' })} className={`flex-1 py-1 rounded text-xs ${gate.hingeSide === 'left' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Klamka z prawej</button>
                  <button onClick={() => updateElement(gate.id, { hingeSide: 'right' })} className={`flex-1 py-1 rounded text-xs ${gate.hingeSide === 'right' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Klamka z lewej</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><label className="text-xs text-zinc-500">Szerokość</label><input type="number" value={gate.width} onChange={(e) => updateElement(gate.id, { width: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" /></div>
              <div><label className="text-xs text-zinc-500">Wysokość</label><input type="number" value={gate.height} max={maxGateHeight} onChange={(e) => updateElement(gate.id, { height: Math.min(Number(e.target.value), maxGateHeight) })} className="w-full border p-1 rounded text-sm mt-1" /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>Pozycja X</span><span>{gate.x} cm</span></div>
              <input type="range" min={-(config.width / 2) + gate.width/2} max={(config.width / 2) - gate.width/2} step={5} value={gate.x} onChange={(e) => updateElement(gate.id, { x: Number(e.target.value) })} className="w-full" style={{accentColor: 'var(--theme, #ea580c)'}} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Drzwi i Okna" icon={<Layers size={20} />}>
        <div className="mb-4">
          <label className="text-sm font-medium text-zinc-700 block mb-2">Edytuj ścianę:</label>
          <div className="flex gap-2">
            {(['front', 'back', 'left', 'right'] as WallFace[]).map(wall => (
              <button key={wall} onClick={() => setSelectedWall(wall)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${selectedWall === wall ? 'bg-zinc-800 text-white' : 'bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-100'}`}>
                {wall === 'front' ? 'Przód' : wall === 'back' ? 'Tył' : wall === 'left' ? 'Lewa' : 'Prawa'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button onClick={() => addElement('door')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-zinc-400"><Plus size={16} /> Drzwi</button>
          <button onClick={() => addElement('window')} className="flex-none bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:border-zinc-400"><Plus size={16} /> Okno</button>
        </div>
        <div className="space-y-3">
          {config.elements.filter(e => e.wall === selectedWall && e.type !== 'gate').length === 0 ? (
            <div className="text-sm text-zinc-400 text-center py-4 bg-white border border-dashed rounded-lg">Brak elementów na tej ścianie.</div>
          ) : (
            config.elements.filter(e => e.wall === selectedWall && e.type !== 'gate').map((el, idx) => (
              <div key={el.id} className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm relative group">
                <button onClick={() => removeElement(el.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                <h3 className="font-semibold text-zinc-800 mb-3 capitalize">{el.type === 'door' ? 'Drzwi' : 'Okno'} #{idx + 1}</h3>
                <div className="space-y-3">
                  {el.type === 'door' && (
                    <div className="mb-3">
                      <span className="text-xs text-zinc-500 block mb-2">Położenie klamki:</span>
                      <div className="flex gap-2 bg-zinc-100 rounded-lg p-1 border">
                        <button onClick={() => updateElement(el.id, { hingeSide: 'left' })} className={`flex-1 py-1 rounded text-xs ${el.hingeSide === 'left' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Lewa</button>
                        <button onClick={() => updateElement(el.id, { hingeSide: 'right' })} className={`flex-1 py-1 rounded text-xs ${el.hingeSide === 'right' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Prawa</button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-zinc-500">Szerokość</label><input type="number" value={el.width} onChange={(e) => updateElement(el.id, { width: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" /></div>
                    <div><label className="text-xs text-zinc-500">Wysokość</label><input type="number" value={el.height} onChange={(e) => updateElement(el.id, { height: Number(e.target.value) })} className="w-full border p-1 rounded text-sm mt-1" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>Pozycja X</span><span>{el.x} cm</span></div>
                    <input type="range" min={-((selectedWall === 'front' || selectedWall === 'back' ? config.width : config.length) / 2) + el.width/2} max={((selectedWall === 'front' || selectedWall === 'back' ? config.width : config.length) / 2) - el.width/2} step={5} value={el.x} onChange={(e) => updateElement(el.id, { x: Number(e.target.value) })} className="w-full" style={{accentColor: 'var(--theme, #ea580c)'}} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Kolory i Przetłoczenia" icon={<PaintBucket size={20} />} defaultOpen={false}>
        <div className="mb-6"><h3 className="font-semibold text-zinc-800 mb-3 text-sm">🏠 Dach</h3>
          <div className="space-y-3">
            <div>
              <div className="flex gap-2">
                {([{ value: 'trapez-t14' as RoofProfile, label: 'Trapez T-14' }, { value: 'blachodachowka' as RoofProfile, label: 'Blacho-dach.' }]).map(p => (
                  <button key={p.value} onClick={() => {
                      const updates: Partial<GarageConfig> = { roofProfile: p.value };
                      if (p.value === 'blachodachowka' && !TILE_COLORS.map(c => c.color).includes(config.roofColor)) updates.roofColor = '#3b3b3c';
                      setConfig(prev => ({ ...prev, ...updates }));
                    }} className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${config.roofProfile === p.value ? 'border-[var(--theme, #ea580c)] bg-zinc-100 text-[var(--theme, #ea580c)]' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor dachu</span>
              {config.roofProfile === 'blachodachowka' ? <ColorPicker colors={TILE_COLORS.map(c=>c.color)} value={config.roofColor} onChange={(c) => updateConfig('roofColor', c)} labels={Object.fromEntries(TILE_COLORS.map(c => [c.color, c.label]))} /> : <ColorPicker colors={STANDARD_COLORS} value={config.roofColor} onChange={(c) => updateConfig('roofColor', c)} />}
            </div>
          </div>
        </div>
        <hr className="border-zinc-200 my-4" />
        <div className="mb-6"><h3 className="font-semibold text-zinc-800 mb-3 text-sm">🧱 Ściany</h3>
          <div className="space-y-3">
            <div>
              <div className="flex gap-2">
                {([{ value: 'trapez-t7' as WallProfile, label: 'Trapez T-7' }, { value: 'ocynk' as WallProfile, label: 'Ocynk' }, { value: 'drewnopodobna' as WallProfile, label: 'Drewnopodobna' }]).map(p => (
                  <button key={p.value} onClick={() => {
                      const updates: Partial<GarageConfig> = { wallProfile: p.value };
                      if (p.value === 'ocynk') updates.wallColor = '#d4d4d4';
                      setConfig(prev => ({ ...prev, ...updates }));
                    }} className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${config.wallProfile === p.value ? 'border-[var(--theme, #ea580c)] bg-zinc-100 text-[var(--theme, #ea580c)]' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {config.wallProfile !== 'ocynk' && (
              <div className="mb-3">
                <span className="text-xs text-zinc-500 block mb-2">Układ przetłoczeń:</span>
                <div className="flex gap-2 bg-zinc-100 rounded-lg p-1 border">
                  <button onClick={() => updateConfig('wallRibbing', 'vertical')} className={`flex-1 py-1 rounded text-xs ${config.wallRibbing === 'vertical' || !config.wallRibbing ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Pionowe</button>
                  <button onClick={() => updateConfig('wallRibbing', 'horizontal')} className={`flex-1 py-1 rounded text-xs ${config.wallRibbing === 'horizontal' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Poziome</button>
                </div>
              </div>
            )}
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor ścian</span>
              {config.wallProfile === 'ocynk' ? <p className="text-xs text-zinc-400 italic">Kolor ustalony automatycznie.</p> : config.wallProfile === 'drewnopodobna' ? <ColorPicker colors={WOOD_COLORS.map(c=>c.color)} value={config.wallColor} onChange={(c) => updateConfig('wallColor', c)} labels={Object.fromEntries(WOOD_COLORS.map(c => [c.color, c.label]))} /> : <ColorPicker colors={STANDARD_COLORS} value={config.wallColor} onChange={(c) => updateConfig('wallColor', c)} />}
            </div>
          </div>
        </div>
        <hr className="border-zinc-200 my-4" />
        <div className="mb-6"><h3 className="font-semibold text-zinc-800 mb-3 text-sm">🚪 Brama Główna</h3>
          <div className="space-y-3">
            <div>
              <div className="flex gap-2">
                {([{ value: 'trapez-t7' as GateProfile, label: 'Trapez T-7' }, { value: 'drewnopodobna' as GateProfile, label: 'Drewnopodobna' }]).map(p => (
                  <button key={p.value} onClick={() => updateConfig('gateProfile', p.value)} className={`flex-1 p-2 text-xs font-medium border rounded-lg transition-all ${config.gateProfile === p.value ? 'border-[var(--theme, #ea580c)] bg-zinc-100 text-[var(--theme, #ea580c)]' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>{p.label}</button>
                ))}
              </div>
            </div>
            {config.gateProfile !== 'ocynk' && gates[0]?.gateType !== 'sectional' && (
              <div className="mb-3">
                <span className="text-xs text-zinc-500 block mb-2">Układ przetłoczeń:</span>
                <div className="flex gap-2 bg-zinc-100 rounded-lg p-1 border">
                  <button onClick={() => updateConfig('gateRibbing', 'vertical')} className={`flex-1 py-1 rounded text-xs ${config.gateRibbing === 'vertical' || !config.gateRibbing ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Pionowe</button>
                  <button onClick={() => updateConfig('gateRibbing', 'horizontal')} className={`flex-1 py-1 rounded text-xs ${config.gateRibbing === 'horizontal' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Poziome</button>
                </div>
              </div>
            )}
            <div>
              <span className="text-xs text-zinc-500 block mb-2">Kolor bramy</span>
              {config.gateProfile === 'drewnopodobna' ? <ColorPicker colors={WOOD_COLORS.map(c=>c.color)} value={config.gateColor} onChange={(c) => updateConfig('gateColor', c)} labels={Object.fromEntries(WOOD_COLORS.map(c => [c.color, c.label]))} /> : <ColorPicker colors={STANDARD_COLORS} value={config.gateColor} onChange={(c) => updateConfig('gateColor', c)} />}
            </div>
          </div>
        </div>
      </Section>

      {customAddons.length > 0 && (
        <Section title="Opcje Dodatkowe" icon={<Plus size={20} />}>
          <div className="space-y-3">
            {customAddons.map((addon: any) => (
              <label key={addon.id} className="flex items-center justify-between p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedAddons.includes(addon.id)} onChange={() => handleAddonToggle(addon.id)} className="w-5 h-5 border-zinc-300 rounded" style={{accentColor: 'var(--theme, #ea580c)'}} />
                  <span className="text-sm font-medium text-zinc-700">{addon.label}</span>
                </div>
                <span className="text-sm font-bold text-zinc-900">+{addon.price}{addon.type === 'pct' ? '%' : ' zł'}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      <OrderButton config={config} totalPrice={calculatedPrice} targetStoreUrl={targetStoreUrl} selectedAddonsText={selectedAddonsText} />
    </div>
  );
}