import Phaser from 'phaser';
import { playSound, pauseGameBG } from './GameAudio.js';

export default class GamePauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene', active: false });
    }

    create() {
        const W = 750, H = 320;

        // Dim overlay
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);

        // Dialog card
        this.add.image(W / 2, H / 2, 'dialog_bg').setDisplaySize(260, 160);

        this.add.text(W / 2, H / 2 - 50, 'Paused', {
            fontSize: '22px', color: '#ffffff', fontFamily: 'DomkratMon',
        }).setOrigin(0.5);

        // Resume button
        const resumeBtn = this.add.image(W / 2 - 30, H / 2 + 20, 'buttons_sheet', 'play')
            .setDisplaySize(44, 44).setInteractive();
        resumeBtn.on('pointerdown', () => this.resume());

        // Quit to level select
        const quitBtn = this.add.image(W / 2 + 30, H / 2 + 20, 'buttons_sheet', 'list')
            .setDisplaySize(44, 44).setInteractive();
        quitBtn.on('pointerdown', () => {
            playSound(this, 'button');
            const game = this.scene.get('GameScene');
            this.scene.stop('PauseScene');
            this.scene.stop('GameScene');
            this.scene.start('WorldScene', {
                world: game?.currentWorld ?? 1,
            });
        });
    }

    resume() {
        playSound(this, 'continue');
        this.scene.stop('PauseScene');
        this.scene.resume('GameScene');
        // GameScene handles its own audio in its 'resume' event
    }
}
