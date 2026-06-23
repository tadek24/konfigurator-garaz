"use client";

import { GarageConfig, RoofType, WallFace, GarageElement, GateType, SheetProfile } from '@/types';
import { Home, Maximize, PaintBucket, Plus, Trash2, BoxSelect, Layers, ChevronDown, Edit2, Check } from 'lucide-react';
import { findValidPosition } from '@/lib/collision';
import { v4 as uuidv4 } from 'uuid';
import { useMemo, useState, useRef, Dispatch, SetStateAction, useEffect } from 'react';

interface ConfigPanelProps {
  config: GarageConfig;
  setConfig: Dispatch<SetStateAction<GarageConfig>>;
  selectedWall: WallFace;
  setSelectedWall: Dispatch<SetStateAction<WallFace>>;
  appData: any;
}

const WOJEWODZTWA = ["Dolnośląskie", "Kujawsko-pomorskie", "Lubelskie", "Lubuskie", "Łódzkie", "Małopolskie", "Mazowieckie", "Opolskie", "Podkarpackie", "Podlaskie", "Pomorskie", "Śląskie", "Świętokrzyskie", "Warmińsko-mazurskie", "Wielkopolskie", "Zachodniopomorskie"];

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-zinc-100">
        <h2 className="flex items-center gap-2 font-bold text-lg text-zinc-900"><span className="text-[var(--theme)]">{icon}</span>{title}</h2>
        <ChevronDown size={20} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-zinc-200 pt-4">{children}</div>}
    </section>
  );
}

export default function ConfigPanel({ config, setConfig, selectedWall, setSelectedWall, appData }: ConfigPanelProps) {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [activeColorEdit, setActiveColorEdit] = useState<string | null>(null);
  
  const pricing = appData.pricing || {};
  const customAddons = appData.addons || [];
  const dbColors = appData.colors || [];

  const matColors = dbColors.filter((c: any) => c.type === 'mat');
  const gladkieColors = dbColors.filter((c: any) => c.type === 'gladkie');
  const drewnoColors = dbColors.filter((c: any) => c.type === 'drewno');

  const getColorData = (id: string) => dbColors.find((c: any) => c.id === id) || { hex: '#d4d4d4', label: 'Wybierz', texture: '' };

  const calculatedPrice = useMemo(() => {
    let total = Number(appData.baseConfig?.p) || 0; 
    let percentMultiplier = 1;
    
    const baseArea = (Number(appData.baseConfig?.w) / 100) * (Number(appData.baseConfig?.l) / 100);
    const currentArea = (Number(config.width) / 100) * (Number(config.length) / 100);
    const extraArea = Math.max(0, currentArea - baseArea); 
    
    if (extraArea > 0 && pricing.sqm_v) {
      if (pricing.sqm_t === 'fixed') total += (extraArea * Number(pricing.sqm_v));
      else percentMultiplier += (extraArea * Number(pricing.sqm_v) / 100);
    }

    let customAddonTotal = 0;
    selectedAddons.forEach(addonId => {
      const addon = customAddons.find((a: any) => a.id === addonId);
      if (addon) {
        if (addon.type === 'fixed') customAddonTotal += Number(addon.price);
        if (addon.type === 'pct') percentMultiplier += (Number(addon.price) / 100);
      }
    });

    const activeColors = [config.wallColor, config.roofColor, config.gateColor, config.cornerFlashingColor, config.roofFlashingColor];
    const uniquePremiumColors = Array.from(new Set(activeColors));
    uniquePremiumColors.forEach(cId => {
       const c = dbColors.find((col: any) => col.id === cId);
       if (c && Number(c.price) > 0) total += Number(c.price);
    });

    return Math.round((total * percentMultiplier) + customAddonTotal);
  }, [config, pricing, selectedAddons, customAddons, appData, dbColors]);

  const updateConfig = <K extends keyof GarageConfig>(key: K, value: GarageConfig[K]) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'applyColorToAll' && value === true) {
        next.roofColor = prev.wallColor;
        next.gateColor = prev.wallColor;
        next.cornerFlashingColor = prev.wallColor;
        next.roofFlashingColor = prev.wallColor;
      }
      return next;
    });
  };

  const handleColorSelect = (colorId: string) => {
    if (!activeColorEdit) return;
    
    if (config.applyColorToAll) {
      setConfig(prev => ({
        ...prev,
        wallColor: colorId, roofColor: colorId, gateColor: colorId, cornerFlashingColor: colorId, roofFlashingColor: colorId
      }));
    } else {
      updateConfig(activeColorEdit as keyof GarageConfig, colorId as any);
    }
    setActiveColorEdit(null);
  };

  const ColorSelectionModal = () => (
    <div className="mt-4 p-4 bg-white border-2 border-zinc-200 rounded-xl shadow-inner">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h4 className="font-bold text-zinc-900">Wybierz kolor</h4>
        <button onClick={() => setActiveColorEdit(null)} className="text-zinc-400 hover:text-red-500 font-bold">✕ Zamknij</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h5 className="font-bold text-sm mb-3">Matowe:</h5>
          <div className="space-y-2">
            {matColors.map((c: any) => (
              <button key={c.id} onClick={() => handleColorSelect(c.id)} className="w-full flex items-center gap-3 p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded border shadow-sm" style={{backgroundColor: c.hex}}></div>
                <span className="text-xs font-medium text-left">{c.label} {c.price > 0 ? `(+${c.price}zł)` : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h5 className="font-bold text-sm mb-3">Gładkie:</h5>
          <div className="space-y-2">
            {gladkieColors.map((c: any) => (
              <button key={c.id} onClick={() => handleColorSelect(c.id)} className="w-full flex items-center gap-3 p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded border shadow-sm" style={{backgroundColor: c.hex}}></div>
                <span className="text-xs font-medium text-left">{c.label} {c.price > 0 ? `(+${c.price}zł)` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {drewnoColors.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h5 className="font-bold text-sm mb-3">Drewnopodobne:</h5>
          <div className="grid grid-cols-2 gap-2">
            {drewnoColors.map((c: any) => (
              <button key={c.id} onClick={() => handleColorSelect(c.id)} className="flex items-center gap-3 p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                {c.texture ? (
                  <div className="w-8 h-8 rounded border shadow-sm bg-cover bg-center" style={{backgroundImage: `url(${c.texture})`}}></div>
                ) : (
                  <div className="w-8 h-8 rounded border shadow-sm" style={{backgroundColor: c.hex}}></div>
                )}
                <span className="text-xs font-medium text-left">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-12">
      <Section title="Wymiary Główne" icon={<Maximize size={20} />}>
        <div className="space-y-6">
          {[{ label: 'Szerokość', key: 'width' as const, min: 200, max: 800, step: 10 }, { label: 'Długość', key: 'length' as const, min: 300, max: 1000, step: 10 }, { label: 'Wysokość', key: 'height' as const, min: 200, max: 350, step: 5 }].map(dim => (
            <div key={dim.key}>
              <div className="flex justify-between mb-2 text-sm font-semibold text-zinc-700"><label>{dim.label}</label><span className="bg-white px-2 py-1 rounded border text-[var(--theme)] font-bold">{config[dim.key]} cm</span></div>
              <input type="range" min={dim.min} max={dim.max} step={dim.step} value={config[dim.key]} onChange={(e) => updateConfig(dim.key, Number(e.target.value))} className="w-full" style={{accentColor: 'var(--theme)'}} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kolory Garażu i Przetłoczenia" icon={<PaintBucket size={20} />}>
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-3 uppercase tracking-wider text-zinc-500">Wzór Przetłoczenia Ścian</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'pionowe-t7', label: 'Pionowe T-7', lines: '|||||||||||' },
              { id: 'poziome-t7', label: 'Poziome T-7', lines: '========' },
              { id: 'pionowe-t14', label: 'Pionowe T-14', lines: '| | | | |' },
              { id: 'poziome-t14', label: 'Poziome T-14', lines: '= = = =' },
              { id: 'pionowe-t17', label: 'Pionowe T-17 (mini rąbek)', lines: '|  |  |  |' },
              { id: 'poziome-t17', label: 'Poziome T-17', lines: '=  =  =  =' },
            ].map(prof => (
              <button 
                key={prof.id} 
                onClick={() => updateConfig('wallProfile', prof.id as SheetProfile)}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${config.wallProfile === prof.id ? 'border-[var(--theme)] bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}
              >
                <div className="w-12 h-10 border-t-2 border-l-2 border-r-2 border-zinc-800 flex items-center justify-center overflow-hidden relative bg-white">
                  <div className="absolute inset-0 opacity-20 text-[8px] font-mono flex items-center justify-center tracking-tighter">
                    {prof.lines}
                  </div>
                </div>
                <span className="text-xs font-semibold text-zinc-700">{prof.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 text-white rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 flex items-center justify-between border-b border-zinc-800">
            <h3 className="font-bold tracking-widest flex items-center gap-2"><PaintBucket size={16}/> KOLORY GARAŻU</h3>
          </div>
          <div className="p-2 space-y-1">
            {[
              { label: 'Kolor ścian', key: 'wallColor' },
              { label: 'Brama', key: 'gateColor' },
              { label: 'Kolor dachu', key: 'roofColor' },
              { label: 'Obróbki narożne', key: 'cornerFlashingColor' },
              { label: 'Obróbki dachu', key: 'roofFlashingColor' },
            ].map((item) => {
              const colorData = getColorData(config[item.key as keyof GarageConfig] as string);
              return (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors">
                  <span className="text-sm font-medium text-zinc-300">{item.label}:</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {colorData.texture ? (
                        <div className="w-8 h-8 rounded bg-cover bg-center border border-zinc-600 shadow-md" style={{backgroundImage: `url(${colorData.texture})`}}></div>
                      ) : (
                        <div className="w-8 h-8 rounded border border-zinc-600 shadow-md" style={{backgroundColor: colorData.hex}}></div>
                      )}
                      <span className="text-xs font-bold w-24 leading-tight">{colorData.label}</span>
                    </div>
                    <button 
                      onClick={() => setActiveColorEdit(activeColorEdit === item.key ? null : item.key)}
                      className={`p-2 rounded bg-zinc-800 border transition-colors ${activeColorEdit === item.key ? 'border-[var(--theme)] text-[var(--theme)]' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors border-t border-zinc-800 mt-2">
              <span className="text-sm font-medium text-zinc-300">Ściągnięcie folii:</span>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold w-24 text-right text-zinc-400">{config.removeFoil ? 'Tak' : 'Nie'}</span>
                <button onClick={() => updateConfig('removeFoil', !config.removeFoil)} className="p-2 rounded bg-zinc-800 border border-zinc-700 hover:border-[var(--theme)] hover:text-[var(--theme)] transition-colors"><Edit2 size={14} /></button>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-zinc-800 bg-zinc-950">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={config.applyColorToAll} onChange={(e) => updateConfig('applyColorToAll', e.target.checked)} className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-[var(--theme)]" />
              <span className="text-sm font-medium text-zinc-300">Użyj koloru dla wszystkich elementów garażu</span>
            </label>
          </div>
        </div>

        {activeColorEdit && <ColorSelectionModal />}
      </Section>
      
      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col gap-2 mb-4">
          <label className="text-sm font-semibold text-zinc-300">Województwo <span className="text-red-500">*</span></label>
          <select className="p-3 rounded-lg text-zinc-900 bg-white border-none outline-none font-medium focus:ring-2" style={{accentColor: 'var(--theme)'}} required >
            <option value="" disabled selected>Wybierz z listy...</option>
            {WOJEWODZTWA.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="flex justify-between items-end mb-6 pb-4 border-b border-zinc-700">
          <span className="text-zinc-400 font-medium">Cena całkowita:</span>
          <span className="text-3xl font-extrabold text-[var(--theme)]">{calculatedPrice} zł</span>
        </div>
        <button className="w-full font-bold py-4 px-6 rounded-xl text-lg uppercase transition-all shadow-md bg-[var(--theme)] hover:opacity-90 text-white cursor-pointer">
          Kupuję i płacę
        </button>
      </div>
    </div>
  );
}