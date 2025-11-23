import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';

// Core Phaser game configuration.
// You can tweak width/height later to match your target aspect ratio.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#000000',
  parent: 'game-root',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [MenuScene, GameScene],
};

// Boot the game.
new Phaser.Game(config);
