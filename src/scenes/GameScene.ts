import Phaser from 'phaser';
import { WaveManager } from '../gameplay/WaveManager';
import { TowerManager } from '../gameplay/TowerManager';

// Main game scene.
// Currently:
// - Defines a simple enemy path
// - Spawns a wave of enemies using WaveManager
// - Creates a basic tower that auto-targets enemies
export class GameScene extends Phaser.Scene {
  private pathPoints: Phaser.Math.Vector2[] = [];
  private waveManager!: WaveManager;
  private towerManager!: TowerManager;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // No assets yet – we’re drawing simple shapes.
  }

  create(): void {
    const { width, height } = this.scale;

    // Basic path from left to right with a vertical segment.
    this.pathPoints = [
      new Phaser.Math.Vector2(50, height * 0.8),
      new Phaser.Math.Vector2(width * 0.5, height * 0.8),
      new Phaser.Math.Vector2(width * 0.5, height * 0.3),
      new Phaser.Math.Vector2(width - 50, height * 0.3),
    ];

    // Draw path.
    const graphics = this.add.graphics();
    graphics.lineStyle(8, 0x444444, 1);
    graphics.beginPath();
    graphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
    for (let i = 1; i < this.pathPoints.length; i++) {
      graphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }
    graphics.strokePath();

    this.add.text(
      16,
      16,
      'Onslaught 2 Starter\n' +
        '- WaveManager spawns enemies along the path\n' +
        '- TowerManager runs a basic tower that auto-fires\n' +
        '- Next: multiple towers, placement UI, real stats',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    );

    // Create managers.
    this.waveManager = new WaveManager(this, this.pathPoints);
    this.towerManager = new TowerManager(this);

    // Create one placeholder tower near the path.
    const towerX = width * 0.5 + 80;
    const towerY = height * 0.55;
    this.towerManager.addTower(towerX, towerY, {
      range: 200,
      fireRate: 1.5,
      damage: 3,
    });

    // Start the first wave.
    this.waveManager.startNextWave();
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.waveManager.update(dt);
    this.towerManager.update(dt, this.waveManager.getEnemies());
  }
}
