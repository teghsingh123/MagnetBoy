import Phaser from 'phaser';
import { registerFrame } from './GameUtil.js';

export default class GameLevelPack extends Phaser.Scene {
    constructor() {
        super('LevelSelectScene');
    }

    init(data) {
        this.currentWorld  = data.world || 1;
        this.selectedWorld = this.currentWorld;
    }

    preload() {
        this.load.image('buttons_sheet', '/assets/sprites/buttons_sheet.png');
        for (let w = 1; w <= 4; w++)
            this.load.image(`pack_bg_${w}`, `/assets/pack/${w}/bg-x25-1-1.png`);
    }

    create() {
        ['ind_act', 'ind_inact', 'level_btn_orange', 'back', 'play'].forEach(name => {
            registerFrame(this.textures, 'buttons_sheet', name);
        });

        this.worldBgs = [];
        for (let w = 1; w <= 4; w++) {
            const bg = this.add.image(375, 160, `pack_bg_${w}`).setDisplaySize(750, 320).setVisible(w === 1);
            this.worldBgs.push(bg);
        }

        this.dots = [];
        for (let i = 0; i < 4; i++) {
            const dot = this.add.image(280 + i*60, 300, 'buttons_sheet', i === 0 ? 'ind_act' : 'ind_inact').setDepth(2);
            this.dots.push(dot);
        }

        this.playBtn = this.add.image(283, 300, 'buttons_sheet', 'play')
            .setDepth(3).setScale(0.8).setInteractive();
        this.playBtn.on('pointerdown', () => this.scene.start('WorldScene', { world: this.selectedWorld }));

        this.add.image(730, 20, 'buttons_sheet', 'back').setInteractive().setDepth(2)
            .on('pointerdown', () => this.scene.start('MenuScene'));

        this.input.on('pointerdown', (p) => { this.dragStartX = p.x; });
        this.input.on('pointerup', (p) => {
            const diff = this.dragStartX - p.x;
            if (diff > 50 && this.selectedWorld < 4)  this.goToWorld(this.selectedWorld + 1);
            else if (diff < -50 && this.selectedWorld > 1) this.goToWorld(this.selectedWorld - 1);
        });
    }

    goToWorld(world) {
        const direction = world > this.selectedWorld ? 1 : -1;
        const newBg = this.worldBgs[world - 1];
        const oldBg = this.worldBgs[this.selectedWorld - 1];

        oldBg.setDepth(0);
        newBg.setDepth(1);
        newBg.x = 375 + direction * 750;
        newBg.y = 160;
        newBg.setVisible(true);
        this.tweens.killTweensOf(newBg);
        this.tweens.add({ targets: newBg, x: 375, duration: 300, ease: 'Power2',
            onComplete: () => oldBg.setVisible(false) });

        this.selectedWorld = world;
        this.dots.forEach((dot, i) => {
            dot.setTexture('buttons_sheet', i === world - 1 ? 'ind_act' : 'ind_inact');
        });
        this.playBtn.setPosition(283 + (world - 1) * 60, 300);
    }
}
