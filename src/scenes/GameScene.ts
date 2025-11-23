import Phaser from 'phaser';

// This is a super-minimal placeholder scene.
// It draws a simple path, a "tower", and a moving "enemy" circle.
// The idea is to give you a clean place to start building Onslaught 2 logic.
export class GameScene extends Phaser.Scene {
  private enemy!: Phaser.GameObjects.Arc;
  private enemySpeed = 80; // pixels per second
  private pathPoints: Phaser.Math.Vector2[] = [];
  private pathProgress = 0; // 0..1

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // No assets yet – we’re just using basic shapes.
    // Later, you’ll load sprites for towers, enemies, projectiles, etc.
  }

  create(): void {
    const { width, height } = this.scale;

    // Define a super simple "path" that an enemy will follow.
    this.pathPoints = [
      new Phaser.Math.Vector2(50, height * 0.8),
      new Phaser.Math.Vector2(width * 0.5, height * 0.8),
      new Phaser.Math.Vector2(width * 0.5, height * 0.3),
      new Phaser.Math.Vector2(width - 50, height * 0.3),
    ];

    // Draw the path as a thick line so you can see what’s going on.
    const graphics = this.add.graphics();
    graphics.lineStyle(8, 0x444444, 1);
    graphics.beginPath();
    graphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
    for (let i = 1; i < this.pathPoints.length; i++) {
      graphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }
    graphics.strokePath();

    // Add a placeholder "tower" rectangle near the center.
    const towerX = width * 0.5 + 80;
    const towerY = height * 0.55;
    const tower = this.add.rectangle(towerX, towerY, 40, 40, 0x2ecc71);
    tower.setStrokeStyle(2, 0x000000);
    this.add.text(towerX, towerY - 35, 'Tower', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Add a placeholder enemy as a red circle.
    this.enemy = this.add.circle(this.pathPoints[0].x, this.pathPoints[0].y, 15, 0xe74c3c);
    this.enemy.setData('hp', 10);

    // Add simple debug text.
    this.add.text(16, 16,
      'Onslaught 2 Starter\n' +
      '- Enemy follows a simple path\n' +
      '- Green square = placeholder tower\n' +
      '- Start replacing this scene with real game logic',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    );
  }

  update(time: number, delta: number): void {
    // Move the enemy along the path at a fixed speed.
    if (this.pathPoints.length < 2) return;

    const distanceToTravel = (this.enemySpeed * delta) / 1000;
    const totalPathLength = this.getTotalPathLength();

    // Convert speed to progress in [0, 1].
    const progressDelta = distanceToTravel / totalPathLength;
    this.pathProgress += progressDelta;

    if (this.pathProgress >= 1) {
      this.pathProgress = 0; // loop for now
    }

    const pos = this.getPointOnPath(this.pathProgress);
    this.enemy.setPosition(pos.x, pos.y);
  }

  // Compute total path length by summing segment lengths.
  private getTotalPathLength(): number {
    let length = 0;
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      length += Phaser.Math.Distance.BetweenPoints(this.pathPoints[i], this.pathPoints[i + 1]);
    }
    return length;
  }

  // Get position at t in [0, 1] along the polyline path.
  private getPointOnPath(t: number): Phaser.Math.Vector2 {
    const totalLength = this.getTotalPathLength();
    let targetDistance = t * totalLength;
    let accumulated = 0;

    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const a = this.pathPoints[i];
      const b = this.pathPoints[i + 1];
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

    // Fallback – should only happen due to floating point rounding.
    return this.pathPoints[this.pathPoints.length - 1].clone();
  }
}
