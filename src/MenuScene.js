import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('mainmenu_bg', '/assets/ui/mainmenu_bg.png');
    }

    create() {
        this.add.image(375, 160, 'mainmenu_bg').setDisplaySize(750, 320);

        this.add.text(375, 120, 'MAGNET BOY', {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const playBtn = this.add.text(375, 220, '[ PLAY ]', {
            fontSize: '28px',
            color: '#00ff00',
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive();

        playBtn.on('pointerover', () => playBtn.setColor('#ffff00'));
        playBtn.on('pointerout', () => playBtn.setColor('#00ff00'));
        playBtn.on('pointerdown', () => {
            this.scene.start('GameScene', { world: 1, level: 1 });
        });
    }
}