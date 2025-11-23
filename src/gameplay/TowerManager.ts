// src/gameplay/TowerManager.ts
// Keeps track of all towers and updates them each frame.
import Phaser from 'phaser';
import { Tower, TowerConfig } from './Tower';
import { Enemy } from './Enemy';

export class TowerManager {
  private towers: Tower[] = [];

  constructor(private scene: Phaser.Scene) {}

  addTower(x: number, y: number, config: TowerConfig): Tower {
    const tower = new Tower(this.scene, x, y, config);
    this.towers.push(tower);
    return tower;
  }

  getTowers(): Tower[] {
    return this.towers;
  }

  update(dt: number, enemies: Enemy[]): void {
    this.towers.forEach(tower => tower.update(dt, enemies));
  }
}
