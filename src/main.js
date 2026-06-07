import Phaser from 'phaser';
import GameMainMenu  from './GameMainMenu.js';
import GameLevelPack from './GameLevelPack.js';
import GameMenu      from './GameMenu.js';
import GameScene     from './GameScene.js';
import GamePauseScene from './GamePauseScene.js';

const config = {
    type: Phaser.AUTO,
    width: 750,
    height: 320,
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 294 }, debug: false },
        matter:  { debug: false }
    },
    scene: [GameMainMenu, GameLevelPack, GameMenu, GameScene, GamePauseScene]
};

new Phaser.Game(config);
