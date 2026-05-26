import Phaser from 'phaser';
import MenuScene from './MenuScene.js';
import GameScene from './GameScene.js';

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
        arcade: {
            gravity: { y: 294 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene]
};

new Phaser.Game(config);