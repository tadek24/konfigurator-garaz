/**
 * config/theme.ts
 *
 * Domyślne wartości cennika (fallback).
 * Są używane gdy localStorage nie zawiera jeszcze zapisanego cennika.
 * Jutro możesz podmienić logikę w services/api.ts tak, żeby pobierała
 * te wartości z REST API (WordPress), a ten plik pozostanie jako fallback.
 */

export interface PricingConfig {
  // ── Gabaryty ──────────────────────────────────────────────────────
  /** Cena bazowa konstrukcji niezależna od powierzchni (PLN) */
  basePrice: number;
  /** Cena za m² blachy trapezowej na ściany (PLN/m²) */
  pricePerSqmTrapez: number;
  /** Cena za m² struktury drewnopodobnej (PLN/m²) */
  pricePerSqmWood: number;
  /** Cena za m² blachodachówki (PLN/m²) */
  pricePerSqmTile: number;
  /** Cena za m² rąbka stojącego (PLN/m²) */
  pricePerSqmRabek: number;
  /** Dopłata za każde 1 cm ponadgabarytowej wysokości > 220 cm (PLN/cm) */
  pricePerCmExtraHeight: number;

  // ── Bramy ─────────────────────────────────────────────────────────
  /** Cena bramy uchylnej (PLN/szt) */
  gateUpAndOver: number;
  /** Cena bramy dwuskrzydłowej (PLN/szt) */
  gateSwing: number;
  /** Cena bramy segmentowej (PLN/szt) */
  gateSectional: number;

  // ── Dodatki ───────────────────────────────────────────────────────
  /** Cena drzwi bocznych (PLN/szt) */
  door: number;
  /** Cena okna standardowego (PLN/szt) */
  window: number;
  /** Cena okna PCV (PLN/szt) */
  pvcWindow: number;
  /** Cena świetlika dachowego (PLN/szt) */
  skylight: number;
  /** Cena instalacji rynien (PLN/m biegu rynny) */
  gutterPerMeter: number;

  // ── Zadaszenia boczne (wiaty) ──────────────────────────────────────
  /** Cena wiaty jednostronnej za m² (PLN/m²) */
  canopyOneSidedPerSqm: number;
  /** Cena wiaty dwustronnej za m² (PLN/m²) */
  canopyTwoSidedPerSqm: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  // Gabaryty
  basePrice:               2500,
  pricePerSqmTrapez:        150,
  pricePerSqmWood:           80,
  pricePerSqmTile:           60,
  pricePerSqmRabek:          40,
  pricePerCmExtraHeight:     10,

  // Bramy
  gateUpAndOver:           1200,
  gateSwing:               1400,
  gateSectional:           2000,

  // Dodatki
  door:                     450,
  window:                   350,
  pvcWindow:                400,
  skylight:                 200,
  gutterPerMeter:            50,

  // Zadaszenia
  canopyOneSidedPerSqm:     200,
  canopyTwoSidedPerSqm:     320,
};
