// src/scenes/MenuScene.ts
// Simple main menu scene with a title and buttons to start the GameScene
// in different difficulty modes.
import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload(): void {
    // Reuse the same background and button art as the game scene.
    this.load.image('bg-onslaught', '/assets/onslaught/bg-1.png');
    this.load.image('btn_start_wave', '/assets/onslaught/btn_start_wave.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'bg-onslaught');
    bg.setDisplaySize(width, height);
    bg.setDepth(-2);

    // Title text
    this.add.text(
      width / 2,
      height * 0.22,
      'Onslaught 2 Web Remake',
      {
        fontSize: '40px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    // Subtitle / instructions
    this.add.text(
      width / 2,
      height * 0.32,
      'Fan-made Phaser prototype\nChoose a difficulty to begin',
      {
        fontSize: '18px',
        color: '#dddddd',
        align: 'center',
      }
    ).setOrigin(0.5);

    // Normal mode button
    const normalBtn = this.add.image(width / 2 - 120, height * 0.55, 'btn_start_wave');
    normalBtn.setDisplaySize(180, 60);
    normalBtn.setInteractive({ useHandCursor: true });

    const normalLabel = this.add.text(
      normalBtn.x,
      normalBtn.y,
      'Normal',
      {
        fontSize: '22px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    normalBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { difficulty: 'normal' });
    });

    // Hard mode button
    const hardBtn = this.add.image(width / 2 + 120, height * 0.55, 'btn_start_wave');
    hardBtn.setDisplaySize(180, 60);
    hardBtn.setInteractive({ useHandCursor: true });

    const hardLabel = this.add.text(
      hardBtn.x,
      hardBtn.y,
      'Hard',
      {
        fontSize: '22px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    hardBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { difficulty: 'hard' });
    });

    // Also allow pressing ENTER to start Normal mode quickly.
    this.input.keyboard.on('keydown-ENTER', () => {
      this.scene.start('GameScene', { difficulty: 'normal' });
    });
  }
}
