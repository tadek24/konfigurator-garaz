export type RoofType = 
  | 'dual-slope'
  | 'slope-front'
  | 'slope-back'
  | 'slope-left'
  | 'slope-right'
  | 'front-dual-slope';

export type WallFace = 'front' | 'back' | 'left' | 'right';
export type ElementType = 'gate' | 'door' | 'window';
export type TextureFinish = 'standard' | 'golden-oak';

export interface GarageElement {
  id: string;
  type: ElementType;
  wall: WallFace;
  x: number; // Center X position on the wall (0 is center of wall) in cm
  y: number; // Bottom Y position from the ground in cm
  width: number; // in cm
  height: number; // in cm
  // Specifics
  gateType?: 'swing' | 'up-and-over';
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
  gutters: boolean;
  elements: GarageElement[];
}
