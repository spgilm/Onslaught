import Phaser from 'phaser';
import { WaveManager } from '../gameplay/WaveManager';
import { TowerManager } from '../gameplay/TowerManager';
import { Enemy } from '../gameplay/Enemy';

// Main game scene.
// Now includes:
// - Simple grid-based tower placement (click to place towers on valid tiles)
// - Money and lives system
// - Towers auto-target enemies; killing enemies grants money
// - Enemies reaching the end remove lives; when lives hit 0, game over
export class GameScene extends Phaser.Scene {
  private pathPoints: Phaser.Math.Vector2[] = [];
  private waveManager!: WaveManager;
  private towerManager!: TowerManager;

  // Grid config
  private tileSize = 40;
  private cols = 0;
  private rows = 0;
  private blockedTiles: boolean[][] = [];
  private occupiedTiles: boolean[][] = [];

  // Economy / player state
  private money = 100;
  private lives = 20;
  private towerCost = 20;
  private isGameOver = false;

  // UI
  private hudText!: Phaser.GameObjects.Text;
  private gameOverText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // No assets yet – we’re drawing simple shapes.
  }

  create(): void {
    const { width, height } = this.scale;

    // Compute grid size.
    this.cols = Math.floor(width / this.tileSize);
    this.rows = Math.floor(height / this.tileSize);
    this.blockedTiles = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(false)
    );
    this.occupiedTiles = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(false)
    );

    // Define a basic path from left to right with a vertical segment.
    this.pathPoints = [
      new Phaser.Math.Vector2(50, height * 0.8),
      new Phaser.Math.Vector2(width * 0.5, height * 0.8),
      new Phaser.Math.Vector2(width * 0.5, height * 0.3),
      new Phaser.Math.Vector2(width - 50, height * 0.3),
    ];

    // Precompute which tiles are "blocked" by the path so we can't place towers on it.
    this.markPathBlockedTiles();

    // Draw path.
    const graphics = this.add.graphics();
    graphics.lineStyle(8, 0x444444, 1);
    graphics.beginPath();
    graphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
    for (let i = 1; i < this.pathPoints.length; i++) {
      graphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }
    graphics.strokePath();

    // Draw a faint grid overlay (optional but helpful).
    this.drawGridOverlay();

    // UI text
    this.hudText = this.add.text(
      16,
      16,
      '',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    ).setDepth(10);
    this.updateHud();

    this.add.text(
      16,
      40,
      'Click on empty tiles (not on the path) to place towers.
' +
        `Tower cost: ${this.towerCost}`,
      {
        fontSize: '14px',
        color: '#cccccc',
      }
    ).setDepth(10);

    // Create managers.
    this.waveManager = new WaveManager(this, this.pathPoints, {
      onEnemyLeak: () => this.handleEnemyLeak(),
      onEnemyKilled: (enemy: Enemy) => this.handleEnemyKilled(enemy),
    });
    this.towerManager = new TowerManager(this);

    // Add one starter tower near the path so something happens immediately.
    const starterX = width * 0.5 + 80;
    const starterY = height * 0.55;
    this.addTowerAtWorldPosition(starterX, starterY, true);

    // Start the first wave.
    this.waveManager.startNextWave();

    // Enable input for tower placement.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;
    this.waveManager.update(dt);
    this.towerManager.update(dt, this.waveManager.getEnemies());
  }

  // --- Path / grid helpers -------------------------------------------------

  private markPathBlockedTiles(): void {
    // For each tile center, check distance to the path polyline.
    // If it's within a threshold, mark it as blocked.
    const threshold = this.tileSize * 0.6;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cx = col * this.tileSize + this.tileSize / 2;
        const cy = row * this.tileSize + this.tileSize / 2;
        const p = new Phaser.Math.Vector2(cx, cy);
        const dist = this.distanceToPolyline(p, this.pathPoints);
        if (dist <= threshold) {
          this.blockedTiles[row][col] = true;
        }
      }
    }
  }

  private distanceToPolyline(
    point: Phaser.Math.Vector2,
    polyline: Phaser.Math.Vector2[]
  ): number {
    let minDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < polyline.length - 1; i++) {
      const a = polyline[i];
      const b = polyline[i + 1];
      const dist = Phaser.Math.Distance.BetweenPoints(
        this.closestPointOnSegment(point, a, b),
        point
      );
      if (dist < minDist) {
        minDist = dist;
      }
    }
    return minDist;
  }

  private closestPointOnSegment(
    p: Phaser.Math.Vector2,
    a: Phaser.Math.Vector2,
    b: Phaser.Math.Vector2
  ): Phaser.Math.Vector2 {
    const ab = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y);
    const t = Phaser.Math.Clamp(
      ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / ab.lengthSq(),
      0,
      1
    );
    return new Phaser.Math.Vector2(
      a.x + ab.x * t,
      a.y + ab.y * t
    );
  }

  private drawGridOverlay(): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x222222, 0.6);

    const { width, height } = this.scale;
    for (let x = 0; x <= width; x += this.tileSize) {
      g.moveTo(x, 0);
      g.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += this.tileSize) {
      g.moveTo(0, y);
      g.lineTo(width, y);
    }
    g.strokePath();
  }

  // --- Tower placement -----------------------------------------------------

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver) return;

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Ignore clicks outside the canvas.
    const { width, height } = this.scale;
    if (worldX < 0 || worldX >= width || worldY < 0 || worldY >= height) {
      return;
    }

    const col = Math.floor(worldX / this.tileSize);
    const row = Math.floor(worldY / this.tileSize);

    // Starter tower uses a free placement (already placed). Normal towers cost money.
    if (!this.canPlaceTower(row, col)) {
      return;
    }

    if (this.money < this.towerCost) {
      // Not enough money – could add a "Not enough money" flash here later.
      return;
    }

    const centerX = col * this.tileSize + this.tileSize / 2;
    const centerY = row * this.tileSize + this.tileSize / 2;

    this.towerManager.addTower(centerX, centerY, {
      range: 200,
      fireRate: 1.5,
      damage: 3,
    });
    this.occupiedTiles[row][col] = true;

    this.money -= this.towerCost;
    this.updateHud();
  }

  private canPlaceTower(row: number, col: number): boolean {
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) {
      return false;
    }
    if (this.blockedTiles[row][col]) return false;
    if (this.occupiedTiles[row][col]) return false;
    return true;
  }

  // Place initial tower without cost, snapping to nearest tile.
  private addTowerAtWorldPosition(x: number, y: number, free: boolean): void {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return;

    if (!this.canPlaceTower(row, col) && !free) return;

    const centerX = col * this.tileSize + this.tileSize / 2;
    const centerY = row * this.tileSize + this.tileSize / 2;

    this.towerManager.addTower(centerX, centerY, {
      range: 200,
      fireRate: 1.5,
      damage: 3,
    });
    this.occupiedTiles[row][col] = true;
  }

  // --- Economy / lives -----------------------------------------------------

  private handleEnemyKilled(enemy: Enemy): void {
    this.money += enemy.reward;
    this.updateHud();
  }

  private handleEnemyLeak(): void {
    this.lives -= 1;
    this.updateHud();

    if (this.lives <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.showGameOver();
    }
  }

  private updateHud(): void {
    this.hudText.setText(`Money: ${this.money}   Lives: ${this.lives}`);
  }

  private showGameOver(): void {
    const { width, height } = this.scale;
    this.gameOverText = this.add.text(
      width / 2,
      height / 2,
      'GAME OVER',
      {
        fontSize: '48px',
        color: '#ff5555',
      }
    ).setOrigin(0.5);
  }
}
