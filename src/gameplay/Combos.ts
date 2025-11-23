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
// Reset multipliers before applying combos/modifiers each frame.
towers.forEach(t => {
  const damageLevelBonus = Math.pow(1.25, t.level - 1);
  const rangeLevelBonus = Math.pow(1.08, t.level - 1);
  t.damageMultiplier = damageLevelBonus;
  t.rangeMultiplier = rangeLevelBonus;
  t.fireRateMultiplier = 1.0;
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

  // After processing basic pair-combos, apply modifier turret auras.
  // These are inspired by the official Onslaught 2 modifier turrets.
  for (const source of towers) {
    const typeId = source.config.towerTypeId;
    const isModifier = typeId === 'modDamage' ||
      typeId === 'modRange' ||
      typeId === 'modFire' ||
      typeId === 'modXDamage' ||
      typeId === 'modXRange';

    if (!isModifier) continue;

    const auraRadius = source.getEffectiveRange();

    for (const target of towers) {
      if (target === source) continue;
      if (target.config.behavior === 'modifier') continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.hypot(dx, dy);
      if (dist > auraRadius) continue;

      // Apply effects based on modifier type.
      switch (typeId) {
        case 'modDamage':
          // Plain damage booster: +40% damage.
          target.damageMultiplier *= 1.4;
          break;
        case 'modRange':
          // Plain range booster: roughly +50% range.
          target.rangeMultiplier *= 1.5;
          break;
        case 'modFire':
          // Rate-of-fire booster: approx +120% rate (2.2x shots/sec).
          target.fireRateMultiplier *= 2.2;
          break;
        case 'modXDamage':
          // Exchange turret: +100% damage, -30% range, -30% fire rate.
          target.damageMultiplier *= 2.0;
          target.rangeMultiplier *= 0.7;
          target.fireRateMultiplier *= 0.7;
          break;
        case 'modXRange':
          // Exchange turret: strong range boost but slower rate of fire.
          target.rangeMultiplier *= 1.5;
          target.fireRateMultiplier *= 0.75;
          break;
      }
    }
  }
}
