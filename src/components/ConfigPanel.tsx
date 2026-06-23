export type RoofType = 'dual-slope' | 'slope-front' | 'slope-back' | 'slope-left' | 'slope-right';
export type WallFace = 'front' | 'back' | 'left' | 'right';
export type GateType = 'up-and-over' | 'swing' | 'sectional';

// NOWE PROFILE BLACHY (T7, T14, T17 w pionie i poziomie)
export type SheetProfile = 'pionowe-t7' | 'poziome-t7' | 'pionowe-t14' | 'poziome-t14' | 'pionowe-t17' | 'poziome-t17';

export interface GarageElement {
  id: string;
  type: 'gate' | 'door' | 'window' | 'pvc-window' | 'skylight';
  wall: WallFace;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen?: boolean;
  hingeSide?: 'left' | 'right';
  gateType?: GateType;
  clearanceHeight?: number;
}

export interface GarageConfig {
  width: number;
  length: number;
  height: number;
  roofType: RoofType;
  gutters: boolean;
  elements: GarageElement[];
  
  // NOWY SYSTEM KOLORÓW I OBRÓBEK
  applyColorToAll: boolean; // Checkbox "Zastosuj do wszystkich"
  removeFoil: boolean; // Ściągnięcie folii
  
  wallProfile: SheetProfile;
  wallColor: string; // Zapisuje ID koloru z bazy WP
  
  roofProfile: SheetProfile;
  roofColor: string;
  
  gateProfile: SheetProfile;
  gateColor: string;
  
  doorProfile: SheetProfile;
  doorColor: string;
  
  cornerFlashingColor: string; // Obróbki narożne
  roofFlashingColor: string;   // Obróbki dachu
  
  windowColor: string;
}
