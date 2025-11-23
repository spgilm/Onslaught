// src/config/towers.ts
// Central place to define tower types and their stats.
// These are placeholder values that you can later tune to match Onslaught 2.
export type TowerTypeId = 'gun' | 'slow' | 'splash';

export interface TowerType {
  id: TowerTypeId;
  name: string;
  cost: number;
  range: number;
  fireRate: number; // shots per second
  damage: number;
}

export const TOWER_TYPES: TowerType[] = [
  {
    id: 'gun',
    name: 'Gun',
    cost: 20,
    range: 200,
    fireRate: 1.5,
    damage: 3,
  },
  {
    id: 'slow',
    name: 'Slow',
    cost: 25,
    range: 180,
    fireRate: 1.0,
    damage: 2,
  },
  {
    id: 'splash',
    name: 'Splash',
    cost: 35,
    range: 190,
    fireRate: 0.7,
    damage: 4,
  },
];

export function getTowerType(id: TowerTypeId): TowerType {
  const found = TOWER_TYPES.find(t => t.id === id);
  if (!found) {
    // Fallback to first type.
    return TOWER_TYPES[0];
  }
  return found;
}
