// src/config/towers.ts
// Central place to define tower types and their stats / behavior.
// These are placeholder values that you can later tune to match Onslaught 2.
export type TowerTypeId =
  | 'gun'
  | 'slow'
  | 'splash'
  | 'chain'
  | 'modDamage'
  | 'modRange'
  | 'modFire'
  | 'modXDamage'
  | 'modXRange';

export type TowerBehavior = 'single' | 'slow' | 'splash' | 'chain' | 'modifier';

export interface TowerType {
  id: TowerTypeId;
  name: string;
  cost: number;
  range: number;
  fireRate: number; // shots per second
  damage: number;
  behavior: TowerBehavior;
  // Behavior specific extras
  slowFactor?: number;    // for slow towers (0.5 = 50% speed)
  slowDuration?: number;  // seconds
  splashRadius?: number;  // for splash towers
  chainMaxTargets?: number; // for chain towers
  chainFalloff?: number;    // damage multiplier per jump
}

export const TOWER_TYPES: TowerType[] = [
  {
    id: 'gun',
    textureKey: 'tower_gun',
    name: 'Gun',
    cost: 20,
    range: 200,
    fireRate: 1.5,
    damage: 3,
    behavior: 'single',
  },
  {
    id: 'slow',
    textureKey: 'tower_slow',
    name: 'Slow',
    cost: 25,
    range: 180,
    fireRate: 1.0,
    damage: 2,
    behavior: 'slow',
    slowFactor: 0.5,
    slowDuration: 2.0,
  },
  {
    id: 'splash',
    textureKey: 'tower_splash',
    name: 'Splash',
    cost: 35,
    range: 190,
    fireRate: 0.7,
    damage: 4,
    behavior: 'splash',
    splashRadius: 80,
  },
  {
    id: 'chain',
    textureKey: 'tower_chain',
    name: 'Chain',
    cost: 40,
    range: 210,
    fireRate: 1.2,
    damage: 3,
    behavior: 'chain',
    chainMaxTargets: 4,
    chainFalloff: 0.7,
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
