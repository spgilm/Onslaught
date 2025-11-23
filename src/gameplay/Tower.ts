// src/gameplay/Tower.ts
// Basic tower that periodically fires at enemies within range.
// Uses simple "instant hit" damage for now (no separate projectile entity yet).
import Phaser from 'phaser';
import { Enemy } from './Enemy';

export interface TowerConfig {
  range: number;      // pixels
  fireRate: number;   // shots per second
  damage: number;     // damage per shot
  color?: number;     // optional color override
  name?: string;      // optional display name
}

export class Tower {
  public sprite: Phaser.GameObjects.Rectangle;
  public config: TowerConfig;

  private fireCooldown: number;
  private fireTimer = 0;

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    config: TowerConfig
  ) {
    this.config = config;
    this.fireCooldown = 1 / config.fireRate;

    const color = config.color ?? 0x2ecc71;

    // Placeholder square – later replace with sprites.
    this.sprite = scene.add.rectangle(x, y, 40, 40, color);
    this.sprite.setStrokeStyle(2, 0x000000);

    // Optional: draw range circle (debug)
    const rangeCircle = scene.add.circle(x, y, config.range, color, 0.08);
    rangeCircle.setStrokeStyle(1, color);
  }

  update(dt: number, enemies: Enemy[]): void {
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;

    const target = this.findTarget(enemies);
    if (!target) return;

    this.fireAt(target);
    this.fireTimer = this.fireCooldown;
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = this.config.range;

    enemies.forEach(enemy => {
      const dx = enemy.sprite.x - this.sprite.x;
      const dy = enemy.sprite.y - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.config.range && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    });

    return closest;
  }

  private fireAt(enemy: Enemy): void {
    // Simple instant-hit damage for now.
    enemy.takeDamage(this.config.damage);

    // Tiny visual cue: flash a line between tower and enemy.
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(this.sprite.x, this.sprite.y);
    g.lineTo(enemy.sprite.x, enemy.sprite.y);
    g.strokePath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 100,
      onComplete: () => g.destroy(),
    });
  }
}
