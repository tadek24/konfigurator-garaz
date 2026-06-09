/**
 * services/api.ts
 *
 * Warstwa abstrakcji dostępu do cennika.
 *
 * TERAZ:   Dane są przechowywane w localStorage (frontend mock).
 * JUTRO:   Podmień ciała funkcji fetchPrices() i updatePrices() na wywołania
 *          fetch() do Twojego REST API (np. WordPress WP-JSON):
 *
 *   export async function fetchPrices(): Promise<PricingConfig> {
 *     const res = await fetch('https://twoja-domena.pl/wp-json/garage/v1/pricing');
 *     if (!res.ok) return DEFAULT_PRICING;
 *     return res.json();
 *   }
 *
 *   export async function updatePrices(prices: PricingConfig): Promise<void> {
 *     await fetch('https://twoja-domena.pl/wp-json/garage/v1/pricing', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(prices),
 *     });
 *   }
 */

import { PricingConfig, DEFAULT_PRICING } from '@/config/theme';

const STORAGE_KEY = 'garage_pricing_v1';

/**
 * Pobiera cennik.
 * Teraz: z localStorage z fallbackiem na DEFAULT_PRICING.
 * Jutro: podmień na fetch() do REST API.
 */
export async function fetchPrices(): Promise<PricingConfig> {
  if (typeof window === 'undefined') {
    // SSR guard – zwróć domyślne
    return DEFAULT_PRICING;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRICING };
    const parsed = JSON.parse(raw) as Partial<PricingConfig>;
    // Merge z defaults na wypadek brakujących kluczy (np. po dodaniu nowych pól)
    return { ...DEFAULT_PRICING, ...parsed };
  } catch {
    return { ...DEFAULT_PRICING };
  }
}

/**
 * Zapisuje cennik.
 * Teraz: do localStorage.
 * Jutro: podmień na fetch() POST do REST API.
 */
export async function updatePrices(prices: PricingConfig): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
}

/**
 * Czyści zapisany cennik i przywraca wartości domyślne.
 */
export async function resetPrices(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
