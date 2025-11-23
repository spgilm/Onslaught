// src/gameplay/Enemy.ts
// Basic enemy entity that moves along a predefined path.
// Extended with a simple reward value and slow debuff support.
import Phaser from 'phaser';

export interface EnemyConfig {
  maxHp: number;
  speed: number;   // base pixels per second
  reward: number;  // money granted when killed
}

export class Enemy {
  public sprite: Phaser.GameObjects.Arc;
  public hp: number;
  public maxHp: number;
  public baseSpeed: number;
  public reward: number;

  private path: Phaser.Math.Vector2[];
  private pathProgress = 0; // 0..1

  // Slow debuff
  private slowMultiplier = 1.0;
  private slowTimer = 0; // seconds

  constructor(
    private scene: Phaser.Scene,
    path: Phaser.Math.Vector2[],
    config: EnemyConfig
  ) {
    // Copy the path so we don't accidentally mutate the original.
    this.path = path.map(p => p.clone());
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.baseSpeed = config.speed;
    this.reward = config.reward;

    // Placeholder red circle – swap this for a sprite later.
    this.sprite = scene.add.circle(this.path[0].x, this.path[0].y, 15, 0xe74c3c);
  }

  update(dt: number): void {
    if (this.path.length < 2) return;

    // Tick slow timer & reset if expired.
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowMultiplier = 1.0;
      }
    }

    const effectiveSpeed = this.baseSpeed * this.slowMultiplier;
    const distanceToTravel = effectiveSpeed * dt;
    const totalPathLength = this.getTotalPathLength();

    if (totalPathLength <= 0) return;

    const progressDelta = distanceToTravel / totalPathLength;
    this.pathProgress += progressDelta;

    // Clamp at end for now.
    if (this.pathProgress >= 1) {
      this.pathProgress = 1;
    }

    const pos = this.getPointOnPath(this.pathProgress);
    this.sprite.setPosition(pos.x, pos.y);
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  hasReachedEnd(): boolean {
    return this.pathProgress >= 1;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
  }

  // Apply a slow debuff; if multiple slows hit, we keep the stronger one and longer duration.
  applySlow(multiplier: number, duration: number): void {
    if (multiplier < this.slowMultiplier || this.slowTimer <= 0) {
      this.slowMultiplier = multiplier;
    }
    if (duration > this.slowTimer) {
      this.slowTimer = duration;
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }

  // --- Path helper methods ---

  private getTotalPathLength(): number {
    let length = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      length += Phaser.Math.Distance.BetweenPoints(this.path[i], this.path[i + 1]);
    }
    return length;
  }

  private getPointOnPath(t: number): Phaser.Math.Vector2 {
    const totalLength = this.getTotalPathLength();
    if (totalLength <= 0) {
      return this.path[this.path.length - 1].clone();
    }

    let targetDistance = t * totalLength;
    let accumulated = 0;

    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.path[i];
      const b = this.path[i + 1];
      const segmentLength = Phaser.Math.Distance.BetweenPoints(a, b);

      if (accumulated + segmentLength >= targetDistance) {
        const remaining = targetDistance - accumulated;
        const ratio = remaining / segmentLength;
        return new Phaser.Math.Vector2(
          a.x + (b.x - a.x) * ratio,
          a.y + (b.y - a.y) * ratio,
        );
      }

      accumulated += segmentLength;
    }

    return this.path[this.path.length - 1].clone();
  }
}
