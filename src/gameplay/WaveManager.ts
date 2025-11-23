// src/gameplay/WaveManager.ts
// Spawns enemies over time according to simple wave definitions.
import Phaser from 'phaser';
import { Enemy, EnemyConfig } from './Enemy';

export interface WaveDefinition {
  count: number;
  spawnInterval: number; // seconds between spawns
  enemyConfig: EnemyConfig;
}

export class WaveManager {
  private waves: WaveDefinition[] = [];
  private currentWaveIndex = 0;
  private spawnTimer = 0;
  private enemies: Enemy[] = [];
  private enemiesSpawnedThisWave = 0;
  private isWaveActive = false;

  constructor(
    private scene: Phaser.Scene,
    private path: Phaser.Math.Vector2[]
  ) {
    // For now, define a single example wave.
    // Later, you can load this from JSON or generate procedurally.
    this.waves.push({
      count: 10,
      spawnInterval: 0.8,
      enemyConfig: {
        maxHp: 10,
        speed: 80,
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
    if (!this.isWaveActive) return;

    const wave = this.waves[this.currentWaveIndex];
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0 && this.enemiesSpawnedThisWave < wave.count) {
      this.spawnEnemy(wave.enemyConfig);
      this.enemiesSpawnedThisWave++;
      this.spawnTimer = wave.spawnInterval;
    }

    // Update all enemies.
    this.enemies.forEach(e => e.update(dt));

    // Remove enemies that are dead or have reached the end.
    this.enemies = this.enemies.filter(e => {
      if (e.hasReachedEnd() || e.isDead()) {
        // TODO: if reached end, decrement player lives here.
        e.destroy();
        return false;
      }
      return true;
    });

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
}
