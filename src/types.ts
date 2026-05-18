export type RoofType = 'slope-back' | 'dual-slope';
export type DoorType = 'swing' | 'up-and-over';

export interface GarageConfig {
  width: number;  // Szerokość in cm
  length: number; // Długość in cm
  height: number; // Wysokość in cm
  roofType: RoofType;
  roofColor: string;
  wallColor: string;
  doorColor: string;
  doorType: DoorType;
}
