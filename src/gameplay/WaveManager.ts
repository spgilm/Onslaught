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
  onWaveEnded?: (waveIndex: number) => void;
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

    // Define a small set of placeholder waves.
    this.waves = [
      {
        count: 10,
        spawnInterval: 0.8,
        enemyConfig: { maxHp: 8, speed: 70, reward: 4 },
      },
      {
        count: 12,
        spawnInterval: 0.7,
        enemyConfig: { maxHp: 12, speed: 80, reward: 5 },
      },
      {
        count: 14,
        spawnInterval: 0.65,
        enemyConfig: { maxHp: 16, speed: 85, reward: 6 },
      },
      {
        count: 16,
        spawnInterval: 0.6,
        enemyConfig: { maxHp: 20, speed: 90, reward: 7 },
      },
      {
        count: 18,
        spawnInterval: 0.55,
        enemyConfig: { maxHp: 24, speed: 95, reward: 8 },
      },
    ];
  }

  startNextWave(): void {
    if (this.currentWaveIndex >= this.waves.length) {
      return;
    }

    this.isWaveActive = true;
    this.spawnTimer = 0;
    this.enemiesSpawnedThisWave = 0;
  }

  update(dt: number): void {
    // Always update existing enemies.
    this.updateEnemies(dt);

    if (!this.isWaveActive) {
      return;
    }

    const wave = this.waves[this.currentWaveIndex];
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.enemiesSpawnedThisWave < wave.count) {
      this.spawnEnemy(wave.enemyConfig);
      this.enemiesSpawnedThisWave++;
      this.spawnTimer = wave.spawnInterval;
    }

    // Wave finished when we've spawned them all and none remain.
    if (
      this.enemiesSpawnedThisWave >= wave.count &&
      this.enemies.length === 0
    ) {
      this.isWaveActive = false;
      const endedWave = this.currentWaveIndex;
      this.currentWaveIndex++;
      if (this.callbacks.onWaveEnded) {
        this.callbacks.onWaveEnded(endedWave);
      }
    }
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getCurrentWaveIndex(): number {
    return this.currentWaveIndex;
  }

  isRunningWave(): boolean {
    return this.isWaveActive;
  }

  hasMoreWaves(): boolean {
    return this.currentWaveIndex < this.waves.length;
  }

  private spawnEnemy(config: EnemyConfig): void {
    const enemy = new Enemy(this.scene, this.path, config);
    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number): void {
    this.enemies.forEach(e => e.update(dt));

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
