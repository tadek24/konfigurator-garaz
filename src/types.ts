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
}

export interface GarageConfig {
  width: number;  // in cm
  length: number; // in cm
  height: number; // in cm
  roofType: RoofType;
  gutters: boolean;
  elements: GarageElement[];

  // Independent surface customization
  roofColor: string;
  roofProfile: RoofProfile;

  wallColor: string;
  wallProfile: WallProfile;

  gateColor: string;
  gateProfile: GateProfile;

  doorColor: string;
  doorProfile: DoorProfile;

  windowColor: string; // RAL color for window frames
}

// Legacy compatibility aliases - keep these so old references don't break
export type TextureFinish = 'trapezowa' | 'drewnopodobna' | 'rabek' | 'blachodachowka' | 'ocynk';
export type CorrugationPattern = 'vertical-t7' | 'horizontal-t7' | 'vertical-t14' | 'horizontal-t14';
