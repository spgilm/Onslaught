import Phaser from 'phaser';
import { WaveManager } from '../gameplay/WaveManager';
import { TowerManager } from '../gameplay/TowerManager';
import { Enemy } from '../gameplay/Enemy';
import { TOWER_TYPES, TowerTypeId, getTowerType } from '../config/towers';
import { applyCombos } from '../gameplay/Combos';
import { Tower } from '../gameplay/Tower';

// Main game scene.
// Features:
// - Grid-based tower placement (click to place towers on valid tiles)
// - Money and lives system with HUD
// - Multiple waves and a "Start Wave" button
// - Tower type selection bar (Gun, Slow, Splash, Chain)
// - Basic combo system applying small damage boosts when tower pairs are close
// - Simple tower upgrade UI when clicking a tower
// - Background image & button art pulled from decompiled SWF resources
// - Pause and 2x speed controls
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
  private isGameOver = false;
  private gameSpeed = 1; // 1x, 2x, etc.
  private isPaused = false;
  private difficulty: 'normal' | 'hard' = 'normal';
  private kills = 0;

  // UI
  private hudText!: Phaser.GameObjects.Text;
  private gameOverText?: Phaser.GameObjects.Text;
  private startWaveButton?: Phaser.GameObjects.Image;
  private startWaveLabel?: Phaser.GameObjects.Text;
  private pauseButton?: Phaser.GameObjects.Text;
  private speedButton?: Phaser.GameObjects.Text;

  // Tower selection
  private selectedTowerTypeId: TowerTypeId = 'gun';
  private towerButtons: { id: TowerTypeId; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];

  // Tower upgrades
  private selectedTower: Tower | null = null;
  private upgradePanel?: Phaser.GameObjects.Image;
  private upgradeText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: { difficulty?: 'normal' | 'hard' }): void {
    if (data && data.difficulty) {
      this.difficulty = data.difficulty;
    } else {
      this.difficulty = 'normal';
    }
  }

  preload(): void {
    // Background and buttons from decompiled SWF (served from public/assets).
    this.load.image('bg-onslaught', '/assets/onslaught/bg-1.png');
    this.load.image('btn_start_wave', '/assets/onslaught/btn_start_wave.png');
    this.load.image('btn_tower_panel', '/assets/onslaught/btn_tower_panel.png');
    this.load.image('btn_tower_bar', '/assets/onslaught/btn_tower_bar.png');

    // Tower sprites generated from original SWF vector shapes.
    this.load.image('tower_gun', '/assets/onslaught/towers/tower_gun.png');
    this.load.image('tower_slow', '/assets/onslaught/towers/tower_slow.png');
    this.load.image('tower_splash', '/assets/onslaught/towers/tower_splash.png');
    this.load.image('tower_chain', '/assets/onslaught/towers/tower_chain.png');
    this.load.image('tower_mod', '/assets/onslaught/towers/tower_mod.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // Set starting money/lives based on difficulty.
    if (this.difficulty === 'hard') {
      this.money = 60;
      this.lives = 10;
    } else {
      this.money = 100;
      this.lives = 20;
    }

    // Background
    const bg = this.add.image(width / 2, height / 2, 'bg-onslaught');
    bg.setDisplaySize(width, height);
    bg.setDepth(-2);

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

    // Compute blocked tiles for path.
    this.markPathBlockedTiles();

    // Draw path and grid.
    const graphics = this.add.graphics();
    graphics.lineStyle(8, 0x444444, 1);
    graphics.beginPath();
    graphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
    for (let i = 1; i < this.pathPoints.length; i++) {
      graphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }
    graphics.strokePath();
    this.drawGridOverlay();

    // HUD text
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
      'Click on empty tiles (not on the path) to place towers.\n' +
        'Use the tower bar at the bottom to select tower type.\n' +
        'Press "Start Wave" to send the next wave.',
      {
        fontSize: '14px',
        color: '#cccccc',
      }
    ).setDepth(10);

    // Create managers.
    this.waveManager = new WaveManager(this, this.pathPoints, {
      onEnemyLeak: () => this.handleEnemyLeak(),
      onEnemyKilled: (enemy: Enemy) => this.handleEnemyKilled(enemy),
      onWaveEnded: (waveIndex: number) => this.handleWaveEnded(waveIndex),
    });
    this.towerManager = new TowerManager(this);

    // Add one free starter tower near the path.
    const starterX = width * 0.5 + 80;
    const starterY = height * 0.55;
    this.addTowerAtWorldPosition(starterX, starterY, true);

    // Start the first wave automatically so there's action right away.
    this.waveManager.startNextWave();

    // Create tower selection bar.
    this.createTowerSelectionBar();

    // Create start wave button.
    this.createStartWaveButton();

    // Create pause / speed controls.
    this.createSpeedControls();

    // Input handler for tower placement & tower clicks.
    this.input.keyboard.on('keydown-S', () => {
      this.trySellSelectedTower();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    this.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
        const tower = (obj as any).getData && (obj as any).getData('tower');
        if (tower) {
          this.handleTowerClicked(tower as Tower);
        }
      }
    );
  }

  update(time: number, delta: number): void {
    if (this.isGameOver || this.isPaused) return;

    const dt = (delta / 1000) * this.gameSpeed;
    this.waveManager.update(dt);
    const enemies = this.waveManager.getEnemies();

    // Apply combos before towers fire to adjust multipliers.
    applyCombos(this.towerManager.getTowers());
    this.towerManager.update(dt, enemies);
  }

  // --- Path / grid helpers -------------------------------------------------

  private markPathBlockedTiles(): void {
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

    // Check tower selection UI first.
    if (this.tryHandleTowerButtonClick(pointer)) {
      return;
    }

    // Check start wave button.
    if (this.tryHandleStartWaveClick(pointer)) {
      return;
    }

    // Check pause/speed controls.
    if (this.tryHandleSpeedControlClick(pointer)) {
      return;
    }

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    const { width, height } = this.scale;
    if (worldX < 0 || worldX >= width || worldY < 0 || worldY >= height) {
      return;
    }

    const col = Math.floor(worldX / this.tileSize);
    const row = Math.floor(worldY / this.tileSize);

    if (!this.canPlaceTower(row, col)) {
      return;
    }

    const towerType = getTowerType(this.selectedTowerTypeId);
    if (this.money < towerType.cost) {
      return;
    }

    const centerX = col * this.tileSize + this.tileSize / 2;
    const centerY = row * this.tileSize + this.tileSize / 2;

    this.towerManager.addTower(centerX, centerY, {
      range: towerType.range,
      fireRate: towerType.fireRate,
      damage: towerType.damage,
      color: this.getTowerColor(towerType.id),
      name: towerType.name,
      behavior: towerType.behavior,
      slowFactor: towerType.slowFactor,
      slowDuration: towerType.slowDuration,
      splashRadius: towerType.splashRadius,
      chainMaxTargets: towerType.chainMaxTargets,
      chainFalloff: towerType.chainFalloff,
      towerTypeId: towerType.id,
      baseCost: towerType.cost,
    });
    this.occupiedTiles[row][col] = true;

    this.money -= towerType.cost;
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

    const baseType = getTowerType('gun');
    this.towerManager.addTower(centerX, centerY, {
      range: baseType.range,
      fireRate: baseType.fireRate,
      damage: baseType.damage,
      color: this.getTowerColor('gun'),
      name: baseType.name,
      behavior: baseType.behavior,
      slowFactor: baseType.slowFactor,
      slowDuration: baseType.slowDuration,
      splashRadius: baseType.splashRadius,
      chainMaxTargets: baseType.chainMaxTargets,
      chainFalloff: baseType.chainFalloff,
      towerTypeId: baseType.id,
      baseCost: baseType.cost,
    });
    this.occupiedTiles[row][col] = true;
  }

  // --- Economy / lives -----------------------------------------------------

  private handleEnemyKilled(enemy: Enemy): void {
    this.money += enemy.reward;
    this.kills += 1;
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

  private handleWaveEnded(waveIndex: number): void {
    // Basic wave clear reward + small interest on current money.
    const baseReward = 10 + waveIndex * 5;
    const interest = Math.floor(this.money * 0.05);
    this.money += baseReward + interest;
    this.updateHud();
  }

  private updateHud(): void {
    // waveManager may not be initialized yet during early create()
    if (!this.waveManager) {
      this.hudText.setText(`Money: ${this.money}   Lives: ${this.lives}`);
      return;
    }

    const waveIndex = this.waveManager.getCurrentWaveIndex();
    const waveText = this.waveManager.hasMoreWaves()
      ? `Wave: ${waveIndex + 1}`
      : `Wave: ${waveIndex} (no more waves)`;

    this.hudText.setText(`Money: ${this.money}   Lives: ${this.lives}   ${waveText}   Speed: ${this.gameSpeed}x`);
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

    const restartHint = this.add.text(
      width / 2,
      height / 2 + 60,
      'Click to restart or press R',
      {
        fontSize: '20px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    // Restart on pointer down anywhere.
    this.input.once('pointerdown', () => {
      this.scene.restart({ difficulty: this.difficulty });
    });

    // Restart on R key.
    this.input.keyboard.once('keydown-R', () => {
      this.scene.restart({ difficulty: this.difficulty });
    });
  }

  // --- Tower selection bar -------------------------------------------------

  private createTowerSelectionBar(): void {
    const { width, height } = this.scale;
    const barHeight = 60;
    const margin = 10;
    const totalWidth = Math.min(width - margin * 2, TOWER_TYPES.length * 140);
    const startX = (width - totalWidth) / 2;
    const y = height - barHeight - margin;

    // Background bar image (stretched a bit).
    const barBg = this.add.image(width / 2, y + barHeight / 2, 'btn_tower_bar');
    barBg.setDisplaySize(totalWidth + 40, barHeight + 20);
    barBg.setDepth(1);

    TOWER_TYPES.forEach((type, index) => {
      const x = startX + index * 140 + 70;

      const isSelected = type.id === this.selectedTowerTypeId;
      const color = this.getTowerColor(type.id);
      const rect = this.add.rectangle(x, y + barHeight / 2, 130, barHeight, 0x111111);
      rect.setStrokeStyle(isSelected ? 3 : 1, color);
      rect.setData('towerTypeId', type.id);
      rect.setDepth(2);

      const label = this.add.text(
        x,
        y + barHeight / 2,
        `${type.name}\n$${type.cost}`,
        {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
        }
      ).setOrigin(0.5);
      label.setDepth(3);

      this.towerButtons.push({ id: type.id, rect, label });
    });
  }

  private tryHandleTowerButtonClick(pointer: Phaser.Input.Pointer): boolean {
    const x = pointer.x;
    const y = pointer.y;

    let clicked = false;
    this.towerButtons.forEach(btn => {
      const rect = btn.rect.getBounds();
      if (rect.contains(x, y)) {
        this.selectedTowerTypeId = btn.id;
        clicked = true;
      }
    });

    if (clicked) {
      this.towerButtons.forEach(btn => {
        const color = this.getTowerColor(btn.id);
        const isSelected = btn.id === this.selectedTowerTypeId;
        btn.rect.setStrokeStyle(isSelected ? 3 : 1, color);
      });
    }

    return clicked;
  }

  private getTowerColor(id: TowerTypeId): number {
    switch (id) {
      case 'gun':
        return 0x2ecc71;
      case 'slow':
        return 0x3498db;
      case 'splash':
        return 0xe67e22;
      case 'chain':
        return 0x9b59b6;
      default:
        return 0x2ecc71;
    }
  }

  // --- Start wave button ---------------------------------------------------

  private createStartWaveButton(): void {
    const { width } = this.scale;
    const x = width - 90;
    const y = 80;

    const btn = this.add.image(x, y, 'btn_start_wave');
    btn.setDisplaySize(120, 40);
    btn.setInteractive({ useHandCursor: true });

    const label = this.add.text(
      x,
      y,
      'Start Wave',
      {
        fontSize: '14px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    this.startWaveButton = btn;
    this.startWaveLabel = label;
  }

  private tryHandleStartWaveClick(pointer: Phaser.Input.Pointer): boolean {
    if (!this.startWaveButton) return false;
    const rect = this.startWaveButton.getBounds();
    if (!rect.contains(pointer.x, pointer.y)) return false;

    if (!this.waveManager.isRunningWave() && this.waveManager.hasMoreWaves()) {
      this.waveManager.startNextWave();
      this.updateHud();
    }

    return true;
  }

  // --- Pause / speed controls ---------------------------------------------

  private createSpeedControls(): void {
    const { width } = this.scale;
    const baseX = width - 90;
    const baseY = 130;

    const pause = this.add.text(
      baseX - 40,
      baseY,
      '||',
      { fontSize: '18px', color: '#ffffff' }
    ).setOrigin(0.5);
    pause.setInteractive({ useHandCursor: true });

    const speed = this.add.text(
      baseX + 40,
      baseY,
      '2x',
      { fontSize: '18px', color: '#ffffff' }
    ).setOrigin(0.5);
    speed.setInteractive({ useHandCursor: true });

    this.pauseButton = pause;
    this.speedButton = speed;
  }

  private tryHandleSpeedControlClick(pointer: Phaser.Input.Pointer): boolean {
    let clicked = false;

    if (this.pauseButton) {
      const r = this.pauseButton.getBounds();
      if (r.contains(pointer.x, pointer.y)) {
        this.isPaused = !this.isPaused;
        this.pauseButton.setText(this.isPaused ? '▶' : '||');
        clicked = true;
      }
    }

    if (this.speedButton) {
      const r = this.speedButton.getBounds();
      if (r.contains(pointer.x, pointer.y)) {
        // Toggle between 1x and 2x for now.
        this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
        this.speedButton.setText(this.gameSpeed === 1 ? '2x' : '1x');
        this.updateHud();
        clicked = true;
      }
    }

    return clicked;
  }

  // --- Tower upgrade handling ---------------------------------------------

  private handleTowerClicked(tower: Tower): void {
    if (this.isGameOver) return;
    this.selectedTower = tower;
    this.showUpgradePanel(tower);
  }

  private showUpgradePanel(tower: Tower): void {
    if (this.upgradePanel) {
      this.upgradePanel.destroy();
      this.upgradePanel = undefined;
    }
    if (this.upgradeText) {
      this.upgradeText.destroy();
      this.upgradeText = undefined;
    }

    const x = tower.x + 70;
    const y = tower.y - 20;
    const w = 140;
    const h = 70;

    const img = this.add.image(x, y, 'btn_tower_panel');
    img.setDisplaySize(w, h);
    img.setDepth(20);
    img.setInteractive({ useHandCursor: true });
    img.on('pointerdown', () => {
      this.tryUpgradeSelectedTower();
    });

    const upgradeCost = this.getUpgradeCost(tower);
    const sellValue = tower.getSellValue();
    const text = this.add.text(
      x,
      y,
      `${tower.config.name ?? 'Tower'} L${tower.level}\n` +
        `DMG: ${tower.getEffectiveDamage().toFixed(1)}\n` +
        `Upgrade: $${upgradeCost}\n` +
        `Press S to sell for $${sellValue}`,
      {
        fontSize: '12px',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);
    text.setDepth(21);

    this.upgradePanel = img;
    this.upgradeText = text;
  }


  private trySellSelectedTower(): void {
    if (!this.selectedTower) return;

    const sellValue = this.selectedTower.getSellValue();
    this.money += sellValue;

    // Free the tile
    const col = Math.floor(this.selectedTower.x / this.tileSize);
    const row = Math.floor(this.selectedTower.y / this.tileSize);
    if (row >= 0 && col >= 0 && row < this.rows && col < this.cols) {
      this.occupiedTiles[row][col] = false;
    }

    // Remove tower from manager
    this.towerManager.removeTower(this.selectedTower);

    // Clear UI
    if (this.upgradePanel) {
      this.upgradePanel.destroy();
      this.upgradePanel = undefined;
    }
    if (this.upgradeText) {
      this.upgradeText.destroy();
      this.upgradeText = undefined;
    }
    this.selectedTower = null;
    this.updateHud();
  }

  private getUpgradeCost(tower: Tower): number {
    return 15 + tower.level * 10;
  }

  private tryUpgradeSelectedTower(): void {
    if (!this.selectedTower) return;

    const cost = this.getUpgradeCost(this.selectedTower);
    if (this.money < cost) return;

    this.money -= cost;
    this.selectedTower.upgrade();
    this.updateHud();

    // Refresh upgrade panel text.
    if (this.upgradeText) {
      this.upgradeText.setText(
        `${this.selectedTower.config.name ?? 'Tower'} L${this.selectedTower.level}\n` +
          `DMG: ${this.selectedTower.getEffectiveDamage().toFixed(1)}\n` +
          `Upgrade: $${this.getUpgradeCost(this.selectedTower)}\n` +
          `Press S to sell for $${this.selectedTower.getSellValue()}`
      );
    }
  }
}
