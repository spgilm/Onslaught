// src/gameplay/WaveManager.ts
// Spawns enemies over time according to simple wave definitions
// and reports leaks/kills back to the game via callbacks.
import Phaser from 'phaser';
import { Enemy, EnemyConfig } from './Enemy';

export interface WaveDefinition {
  count: number;
  spawnInterval: number; // seconds between spawns
  enemyConfig: EnemyConfig;
}

export interface WaveCallbacks {
  onEnemyLeak?: () => void;
  onEnemyKilled?: (enemy: Enemy) => void;
}

export class WaveManager {
  private waves: WaveDefinition[] = [];
  private currentWaveIndex = 0;
  private spawnTimer = 0;
  private enemies: Enemy[] = [];
  private enemiesSpawnedThisWave = 0;
  private isWaveActive = false;

  private callbacks: WaveCallbacks;

  constructor(
    private scene: Phaser.Scene,
    private path: Phaser.Math.Vector2[],
    callbacks: WaveCallbacks = {}
  ) {
    this.callbacks = callbacks;

    // For now, define a single example wave.
    // Later, you can load this from JSON or generate procedurally.
    this.waves.push({
      count: 15,
      spawnInterval: 0.7,
      enemyConfig: {
        maxHp: 12,
        speed: 80,
        reward: 5,
      },
    });
  }

  startNextWave(): void {
    if (this.currentWaveIndex >= this.waves.length) {
      // TODO: loop waves or generate new ones.
      return;
    }

    this.isWaveActive = true;
    this.spawnTimer = 0;
    this.enemiesSpawnedThisWave = 0;
  }

  update(dt: number): void {
    if (!this.isWaveActive) {
      // Still update leftover enemies from the last wave.
      this.updateEnemies(dt);
      return;
    }

    const wave = this.waves[this.currentWaveIndex];
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.enemiesSpawnedThisWave < wave.count) {
      this.spawnEnemy(wave.enemyConfig);
      this.enemiesSpawnedThisWave++;
      this.spawnTimer = wave.spawnInterval;
    }

    this.updateEnemies(dt);

    // Wave finished?
    if (
      this.enemiesSpawnedThisWave >= wave.count &&
      this.enemies.length === 0
    ) {
      this.isWaveActive = false;
      this.currentWaveIndex++;
      // Later: you might auto-start the next wave after a delay
      // or wait for a "Start Wave" button.
    }
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  private spawnEnemy(config: EnemyConfig): void {
    const enemy = new Enemy(this.scene, this.path, config);
    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number): void {
    this.enemies.forEach(e => e.update(dt));

    // Remove enemies that are dead or have reached the end.
    this.enemies = this.enemies.filter(e => {
      if (e.hasReachedEnd()) {
        if (this.callbacks.onEnemyLeak) {
          this.callbacks.onEnemyLeak();
        }
        e.destroy();
        return false;
      }
      if (e.isDead()) {
        if (this.callbacks.onEnemyKilled) {
          this.callbacks.onEnemyKilled(e);
        }
        e.destroy();
        return false;
      }
      return true;
    });
  }
}
