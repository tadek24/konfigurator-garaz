export type RoofType = 
  | 'dual-slope'
  | 'slope-front'
  | 'slope-back'
  | 'slope-left'
  | 'slope-right';

export type WallFace = 'front' | 'back' | 'left' | 'right';
export type ElementType = 'gate' | 'door' | 'window' | 'pvc-window' | 'skylight';
export type TextureFinish = 'standard' | 'golden-oak';
export type CorrugationPattern = 'vertical-t7' | 'horizontal-t7' | 'vertical-t14' | 'horizontal-t14';
export type GateType = 'swing' | 'up-and-over' | 'sectional';

export interface GarageElement {
  id: string;
  type: ElementType;
  wall: WallFace;
  x: number; // Center X position on the wall (0 is center of wall) in cm
  y: number; // Bottom Y position from the ground in cm
  width: number; // in cm
  height: number; // in cm
  // Specifics
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
  roofColor: string;
  wallColor: string;
  doorColor: string;
  finish: TextureFinish;
  corrugationPattern: CorrugationPattern;
  gutters: boolean;
  elements: GarageElement[];
}
