// src/gameplay/Tower.ts
// Basic tower that periodically fires at enemies within range.
// Supports different behaviors: single, slow, splash, chain.
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { TowerBehavior, TowerTypeId } from '../config/towers';

export interface TowerConfig {
  range: number;      // pixels
  fireRate: number;   // shots per second
  damage: number;     // base damage per shot
  color?: number;     // optional color override
  name?: string;      // optional display name
  behavior: TowerBehavior;
  slowFactor?: number;
  slowDuration?: number;
  splashRadius?: number;
  chainMaxTargets?: number;
  chainFalloff?: number;
  towerTypeId: TowerTypeId;
}

export class Tower {
  public sprite: Phaser.GameObjects.Rectangle;
  public config: TowerConfig;
  public level = 1;
  public damageMultiplier = 1.0;
  public rangeMultiplier = 1.0;

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
    this.sprite.setData('tower', this);
    this.sprite.setInteractive({ useHandCursor: true });

    // Optional: draw range circle (debug)
    const rangeCircle = scene.add.circle(x, y, this.getEffectiveRange(), color, 0.08);
    rangeCircle.setStrokeStyle(1, color);
    rangeCircle.setDepth(-0.5);
  }

  update(dt: number, enemies: Enemy[]): void {
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;

    const target = this.findTarget(enemies);
    if (!target) return;

    this.fireAt(target, enemies);
    this.fireTimer = this.fireCooldown;
  }

  getEffectiveRange(): number {
    return this.config.range * this.rangeMultiplier;
  }

  getEffectiveDamage(): number {
    return this.config.damage * this.damageMultiplier;
  }

  upgrade(): void {
    this.level += 1;
    // Simple upgrade logic: slightly increase damage & range.
    this.damageMultiplier *= 1.25;
    this.rangeMultiplier *= 1.1;
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = this.getEffectiveRange();

    enemies.forEach(enemy => {
      const dx = enemy.sprite.x - this.sprite.x;
      const dy = enemy.sprite.y - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.getEffectiveRange() && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    });

    return closest;
  }

  private fireAt(target: Enemy, enemies: Enemy[]): void {
    const baseDamage = this.getEffectiveDamage();

    switch (this.config.behavior) {
      case 'single':
        this.applyDamage(target, baseDamage);
        this.drawShotLine(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y);
        break;

      case 'slow': {
        this.applyDamage(target, baseDamage);
        const factor = this.config.slowFactor ?? 0.5;
        const duration = this.config.slowDuration ?? 2.0;
        target.applySlow(factor, duration);
        this.drawShotLine(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y);
        break;
      }

      case 'splash': {
        const radius = this.config.splashRadius ?? 80;
        // Damage main target plus others in radius.
        enemies.forEach(e => {
          const dx = e.sprite.x - target.sprite.x;
          const dy = e.sprite.y - target.sprite.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= radius) {
            this.applyDamage(e, baseDamage);
          }
        });
        this.drawShotCircle(target.sprite.x, target.sprite.y, radius);
        break;
      }

      case 'chain': {
        const maxTargets = this.config.chainMaxTargets ?? 4;
        const falloff = this.config.chainFalloff ?? 0.7;
        const visited: Enemy[] = [];
        let current = target;
        let damage = baseDamage;

        for (let i = 0; i < maxTargets; i++) {
          if (!current) break;
          this.applyDamage(current, damage);
          visited.push(current);
          damage *= falloff;

          // Find next closest enemy not yet hit within range/2.
          let next: Enemy | null = null;
          let bestDist = this.getEffectiveRange() * 0.75;
          enemies.forEach(e => {
            if (visited.includes(e)) return;
            const dx = e.sprite.x - current!.sprite.x;
            const dy = e.sprite.y - current!.sprite.y;
            const dist = Math.hypot(dx, dy);
            if (dist < bestDist) {
              bestDist = dist;
              next = e;
            }
          });
          if (!next) break;

          // Draw link between current and next.
          this.drawShotLine(current.sprite.x, current.sprite.y, next.sprite.x, next.sprite.y);
          current = next;
        }

        // Draw initial bolt from tower to first target.
        this.drawShotLine(this.sprite.x, this.sprite.y, target.sprite.x, target.sprite.y);
        break;
      }
    }
  }

  private applyDamage(enemy: Enemy, amount: number): void {
    enemy.takeDamage(amount);
  }

  private drawShotLine(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 120,
      onComplete: () => g.destroy(),
    });
  }

  private drawShotCircle(x: number, y: number, radius: number): void {
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(x, y, radius);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 150,
      onComplete: () => g.destroy(),
    });
  }
}
