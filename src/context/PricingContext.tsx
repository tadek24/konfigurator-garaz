"use client";

/**
 * context/PricingContext.tsx
 *
 * Globalny kontekst cennika.
 * Owijasz nim aplikację raz (w layout.tsx lub page.tsx), a potem czytasz
 * ceny z dowolnego komponentu przez hook `usePricing()`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { PricingConfig, DEFAULT_PRICING } from '@/config/theme';
import { fetchPrices, updatePrices } from '@/services/api';

// ── Kształt kontekstu ──────────────────────────────────────────────────────
interface PricingContextValue {
  /** Aktualny cennik (zawsze zainicjalizowany DEFAULT_PRICING) */
  pricing: PricingConfig;
  /** True podczas ładowania z API/localStorage */
  loading: boolean;
  /** Zapisuje nowy cennik przez warstwę API */
  savePricing: (next: PricingConfig) => Promise<void>;
  /** Odświeża cennik z API/localStorage */
  refreshPricing: () => Promise<void>;
}

const PricingContext = createContext<PricingContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────
export function PricingProvider({ children }: { children: ReactNode }) {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [loading, setLoading]  = useState(true);

  const refreshPricing = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPrices();
      setPricing(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePricing = useCallback(async (next: PricingConfig) => {
    await updatePrices(next);
    setPricing(next);
  }, []);

  // Załaduj przy montowaniu
  useEffect(() => {
    refreshPricing();
  }, [refreshPricing]);

  return (
    <PricingContext.Provider value={{ pricing, loading, savePricing, refreshPricing }}>
      {children}
    </PricingContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function usePricing(): PricingContextValue {
  const ctx = useContext(PricingContext);
  if (!ctx) {
    throw new Error('usePricing() musi być użyte wewnątrz <PricingProvider>');
  }
  return ctx;
}
