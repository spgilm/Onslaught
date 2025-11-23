import Phaser from 'phaser';
import { WaveManager } from '../gameplay/WaveManager';

// Main game scene.
// Currently:
// - Defines a simple enemy path
// - Spawns a wave of enemies using WaveManager
// - Shows a placeholder tower
export class GameScene extends Phaser.Scene {
  private pathPoints: Phaser.Math.Vector2[] = [];
  private waveManager!: WaveManager;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // No assets yet – we’re drawing simple shapes.
  }

  create(): void {
    const { width, height } = this.scale;

    // Basic path from left to right with a vertical segment –
    // replace this later with the real Onslaught 2 path.
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

    // Placeholder tower.
    const towerX = width * 0.5 + 80;
    const towerY = height * 0.55;
    const tower = this.add.rectangle(towerX, towerY, 40, 40, 0x2ecc71);
    tower.setStrokeStyle(2, 0x000000);
    this.add.text(towerX, towerY - 35, 'Tower', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(
      16,
      16,
      'Onslaught 2 Starter\n' +
        '- WaveManager spawns enemies along the path\n' +
        '- Next step: add a real Tower class that targets enemies',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    );

    // Create and start the first wave.
    this.waveManager = new WaveManager(this, this.pathPoints);
    this.waveManager.startNextWave();
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.waveManager.update(dt);
  }
}
