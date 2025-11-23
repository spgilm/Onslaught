// src/gameplay/Combos.ts
// Very simple combo system: if certain tower type pairs are close together,
// we apply small stat boosts to the involved towers.
//
// This is not the full Onslaught 2 combo system, but a framework in that spirit.
import { Tower } from './Tower';

export interface ComboDefinition {
  id: string;
  types: [string, string]; // towerTypeId pairs
  radius: number;
  damageBonus: number; // multiplier applied to both towers (additive on top of base 1.0)
}

export const COMBOS: ComboDefinition[] = [
  {
    id: 'gun+slow',
    types: ['gun', 'slow'],
    radius: 140,
    damageBonus: 0.15,
  },
  {
    id: 'gun+splash',
    types: ['gun', 'splash'],
    radius: 140,
    damageBonus: 0.1,
  },
  {
    id: 'slow+chain',
    types: ['slow', 'chain'],
    radius: 140,
    damageBonus: 0.1,
  },
];

export function applyCombos(towers: Tower[]): void {
  // Reset multipliers before applying combos each frame.
  towers.forEach(t => {
    t.damageMultiplier = 1.0 * Math.pow(1.25, t.level - 1); // maintain upgrade scaling
  });

  for (const combo of COMBOS) {
    const [typeA, typeB] = combo.types;

    for (let i = 0; i < towers.length; i++) {
      const a = towers[i];
      if (a.config.towerTypeId !== typeA && a.config.towerTypeId !== typeB) continue;

      for (let j = i + 1; j < towers.length; j++) {
        const b = towers[j];
        const pair = [a.config.towerTypeId, b.config.towerTypeId];
        if (!pair.includes(typeA) || !pair.includes(typeB)) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= combo.radius) {
          a.damageMultiplier *= 1 + combo.damageBonus;
          b.damageMultiplier *= 1 + combo.damageBonus;
        }
      }
    }
  }
}
