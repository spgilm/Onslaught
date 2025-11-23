// src/gameplay/Enemy.ts
// Basic enemy entity that moves along a predefined path.
// This is intentionally simple so you can evolve it as you rebuild Onslaught 2.
import Phaser from 'phaser';

export interface EnemyConfig {
  maxHp: number;
  speed: number; // pixels per second
}

export class Enemy {
  public sprite: Phaser.GameObjects.Arc;
  public hp: number;
  public maxHp: number;
  public speed: number;

  private path: Phaser.Math.Vector2[];
  private pathProgress = 0; // 0..1

  constructor(
    private scene: Phaser.Scene,
    path: Phaser.Math.Vector2[],
    config: EnemyConfig
  ) {
    // Copy the path so we don't accidentally mutate the original.
    this.path = path.map(p => p.clone());
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.speed = config.speed;

    // Placeholder red circle – swap this for a sprite later.
    this.sprite = scene.add.circle(this.path[0].x, this.path[0].y, 15, 0xe74c3c);
  }

  update(dt: number): void {
    if (this.path.length < 2) return;

    const distanceToTravel = this.speed * dt;
    const totalPathLength = this.getTotalPathLength();

    if (totalPathLength <= 0) return;

    const progressDelta = distanceToTravel / totalPathLength;
    this.pathProgress += progressDelta;

    // Clamp at end for now. In a real game, you'd trigger "lives lost" here.
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
    // Later: add hit flash, death animation, etc.
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
          Phaser.Math.Linear(a.x, b.x, ratio),
          Phaser.Math.Linear(a.y, b.y, ratio),
        );
      }

      accumulated += segmentLength;
    }

    return this.path[this.path.length - 1].clone();
  }
}
