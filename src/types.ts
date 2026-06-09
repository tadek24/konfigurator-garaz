export type RoofType =
  | 'dual-slope'
  | 'slope-front'
  | 'slope-back'
  | 'slope-left'
  | 'slope-right';

export type WallFace = 'front' | 'back' | 'left' | 'right';
export type ElementType = 'gate' | 'door' | 'window' | 'pvc-window' | 'skylight';

// Profiles per surface
export type RoofProfile = 'trapez-t14' | 'rabek' | 'blachodachowka';
export type WallProfile = 'trapez-t7' | 'ocynk' | 'drewnopodobna';
export type GateProfile = 'trapez-t7' | 'drewnopodobna';
export type DoorProfile = 'trapez-t7' | 'drewnopodobna';

export type GateType = 'swing' | 'up-and-over' | 'sectional';

export interface GarageElement {
  id: string;
  type: ElementType;
  wall: WallFace;
  x: number; // Center X position on the wall (0 is center of wall) in cm
  y: number; // Bottom Y position from the ground in cm
  width: number; // in cm
  height: number; // in cm
  // Gate specifics
  gateType?: GateType;
  clearanceHeight?: number; // for gates
  isOpen?: boolean; // gate open/close state
  paneCount?: number; // for windows

  // ── DODANE: Strona zawiasów dla drzwi i bram ──
  hingeSide?: 'left' | 'right';
}

export interface GarageConfig {
  width: number;
  length: number;
  height: number;
  roofType: string;
  gutters: boolean;
  elements: GarageElement[];

  // ── Nowe, wymagane pola dla kolorów i struktur ──
  roofColor: string;
  roofProfile: string;

  wallColor: string;
  wallProfile: string;

  gateColor: string;
  gateProfile: string;

  doorColor: string;
  doorProfile: string;

  windowColor: string;

  // ── DODANE: Kierunek przetłoczeń blachy ──
  wallRibbing?: 'vertical' | 'horizontal';
  gateRibbing?: 'vertical' | 'horizontal';
  doorRibbing?: 'vertical' | 'horizontal';
}

// Legacy compatibility aliases - keep these so old references don't break
export type TextureFinish = 'trapezowa' | 'drewnopodobna' | 'rabek' | 'blachodachowka' | 'ocynk';
export type CorrugationPattern = 'vertical-t7' | 'horizontal-t7' | 'vertical-t14' | 'horizontal-t14';