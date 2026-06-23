"use client";

/**
 * app/admin/page.tsx
 *
 * Panel administracyjny zarządzania cennikiem.
 * Zabezpieczony prostym hasłem (hardkodowanym teraz, z .env docelowo).
 *
 * Zmień ADMIN_PASSWORD poniżej lub dodaj do .env:
 *   NEXT_PUBLIC_ADMIN_PASSWORD=twoje_haslo
 * i odwołaj się przez: process.env.NEXT_PUBLIC_ADMIN_PASSWORD
 */

import { useState, useEffect, FormEvent } from 'react';
import { usePricing } from '@/context/PricingContext';
import { resetPrices } from '@/services/api';
import { PricingConfig, DEFAULT_PRICING } from '@/config/theme';

// ── Zmień to hasło lub wczytaj z .env ─────────────────────────────────────
const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'admin123';

// ── Typy opisów pól ────────────────────────────────────────────────────────
interface FieldMeta {
  key: keyof PricingConfig;
  label: string;
  unit: string;
  min: number;
  step: number;
}

const SECTIONS: { title: string; icon: string; fields: FieldMeta[] }[] = [
  {
    title: 'Gabaryty',
    icon: '📐',
    fields: [
      { key: 'basePrice',             label: 'Cena bazowa konstrukcji',              unit: 'PLN',    min: 0,    step: 100  },
      { key: 'pricePerSqmTrapez',     label: 'Cena za m² – blacha trapezowa',        unit: 'PLN/m²', min: 0,    step: 5    },
      { key: 'pricePerSqmWood',       label: 'Dopłata za m² – drewnopodobna',        unit: 'PLN/m²', min: 0,    step: 5    },
      { key: 'pricePerSqmTile',       label: 'Dopłata za m² – blachodachówka',       unit: 'PLN/m²', min: 0,    step: 5    },
      { key: 'pricePerSqmRabek',      label: 'Dopłata za m² – rąbek stojący',        unit: 'PLN/m²', min: 0,    step: 5    },
      { key: 'pricePerCmExtraHeight', label: 'Dopłata za cm wysokości > 220 cm',     unit: 'PLN/cm', min: 0,    step: 1    },
    ],
  },
  {
    title: 'Bramy',
    icon: '🚗',
    fields: [
      { key: 'gateUpAndOver', label: 'Brama uchylna',       unit: 'PLN/szt', min: 0, step: 50  },
      { key: 'gateSwing',     label: 'Brama dwuskrzydłowa', unit: 'PLN/szt', min: 0, step: 50  },
      { key: 'gateSectional', label: 'Brama segmentowa',    unit: 'PLN/szt', min: 0, step: 50  },
    ],
  },
  {
    title: 'Dodatki',
    icon: '🪟',
    fields: [
      { key: 'door',           label: 'Drzwi boczne',        unit: 'PLN/szt', min: 0, step: 25  },
      { key: 'window',         label: 'Okno standardowe',    unit: 'PLN/szt', min: 0, step: 25  },
      { key: 'pvcWindow',      label: 'Okno PCV',            unit: 'PLN/szt', min: 0, step: 25  },
      { key: 'skylight',       label: 'Świetlik dachowy',    unit: 'PLN/szt', min: 0, step: 25  },
      { key: 'gutterPerMeter', label: 'Rynna (za m biegu)',  unit: 'PLN/m',   min: 0, step: 5   },
    ],
  },
  {
    title: 'Zadaszenia boczne (wiaty)',
    icon: '🏠',
    fields: [
      { key: 'canopyOneSidedPerSqm', label: 'Wiata jednostronna', unit: 'PLN/m²', min: 0, step: 10 },
      { key: 'canopyTwoSidedPerSqm', label: 'Wiata dwustronna',   unit: 'PLN/m²', min: 0, step: 10 },
    ],
  },
];

// ── Komponent ──────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { pricing, loading, savePricing, refreshPricing } = usePricing();

  // Auth state
  const [authed,       setAuthed]       = useState(false);
  const [password,     setPassword]     = useState('');
  const [authError,    setAuthError]    = useState('');

  // Form state — lokalna kopia edytowanych cen
  const [form,         setForm]         = useState<PricingConfig>(DEFAULT_PRICING);
  const [saving,       setSaving]       = useState(false);
  const [saveMessage,  setSaveMessage]  = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Synchronizuj formularz gdy cennik się załaduje
  useEffect(() => {
    if (!loading) setForm(pricing);
  }, [pricing, loading]);

  // ── Auth ────────────────────────────────────────────────────────────────
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Błędne hasło. Spróbuj ponownie.');
    }
  };

  // ── Zapis cennika ───────────────────────────────────────────────────────
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      await savePricing(form);
      setSaveMessage({ type: 'ok', text: '✅ Cennik zapisany pomyślnie!' });
    } catch {
      setSaveMessage({ type: 'err', text: '❌ Błąd zapisu. Spróbuj ponownie.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Reset do domyślnych ─────────────────────────────────────────────────
  const handleReset = async () => {
    if (!confirm('Przywrócić domyślne wartości cennika?')) return;
    await resetPrices();
    await refreshPricing();
    setSaveMessage({ type: 'ok', text: '🔄 Cennik przywrócony do wartości domyślnych.' });
  };

  // ── Aktualizacja pola formularza ────────────────────────────────────────
  const updateField = (key: keyof PricingConfig, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ── Widok logowania ─────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white text-xl font-black">G</div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">Konfigurator Garaży</h1>
              <p className="text-zinc-500 text-xs mt-0.5">Panel Administracyjny</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-2 font-medium">Hasło dostępu</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
              {authError && (
                <p className="text-red-400 text-xs mt-2">{authError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Zaloguj się
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Widok panelu ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Topbar */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center font-black text-sm">G</div>
            <div>
              <span className="font-bold text-sm">Konfigurator Garaży 3D</span>
              <span className="text-zinc-500 text-xs ml-2">/ Panel Admina</span>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
            >
              ← Konfigurator
            </a>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-800 rounded-lg transition-colors"
            >
              Resetuj ceny
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Zarządzanie Cennikiem</h1>
          <p className="text-zinc-400 text-sm">
            Zmiany zapisywane są lokalnie (localStorage) i natychmiast widoczne w konfiguratorze.
            Jutro podłącz <code className="text-orange-400 bg-zinc-900 px-1 rounded">api.ts</code> pod REST API (WordPress), aby synchronizować z serwerem.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500">
            <div className="inline-block w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p>Ładowanie cennika…</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {SECTIONS.map(section => (
              <section
                key={section.title}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                {/* Section header */}
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-800/50 flex items-center gap-2">
                  <span className="text-lg">{section.icon}</span>
                  <h2 className="font-bold text-white">{section.title}</h2>
                  <span className="ml-auto text-xs text-zinc-500">{section.fields.length} pozycji</span>
                </div>

                {/* Fields grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.fields.map(field => (
                    <div key={field.key} className="group">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 group-focus-within:text-orange-400 transition-colors">
                        {field.label}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={field.min}
                          step={field.step}
                          value={form[field.key]}
                          onChange={e => updateField(field.key, Number(e.target.value))}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 pr-16 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-3 text-xs text-zinc-500 pointer-events-none font-mono">
                          {field.unit}
                        </span>
                      </div>
                      {/* Show diff from default */}
                      {form[field.key] !== DEFAULT_PRICING[field.key] && (
                        <p className="text-[10px] text-orange-400 mt-1">
                          Domyślnie: {DEFAULT_PRICING[field.key]} {field.unit}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Save bar */}
            <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 -mx-6 px-6 py-4 flex items-center gap-4">
              {saveMessage && (
                <span className={`text-sm font-medium flex-1 ${saveMessage.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {saveMessage.text}
                </span>
              )}
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(pricing)}
                  className="px-5 py-2.5 text-sm border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-xl transition-colors"
                >
                  Anuluj zmiany
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Zapisuję…
                    </>
                  ) : 'Zapisz cennik'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
