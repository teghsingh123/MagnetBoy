import Phaser from 'phaser';

import allFrames from './assets/all_frames.json';

export default class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectScene');
    }

    init(data) {
        this.currentWorld = data.world || 1;
        this.selectedWorld = this.currentWorld;
    }

    preload() {
        this.load.image('buttons_sheet', '/assets/buttons_sheet.png');
        for (let w = 1; w <= 4; w++) {
            this.load.image(`pack_bg_${w}`, `/assets/pack/${w}/bg-x25-1-1.png`);
        }
    }

    registerFrame(sheet, name) {
        const f = allFrames[name];
        if (!f) return;
        const texture = this.textures.get(sheet);
        if (!texture.has(name)) {
            texture.add(name, 0, f.x, f.y, f.w, f.h);
        }
    }

    create() {
        console.log('LevelSelectScene create running');

        // Register button frames
        ['ind_act', 'ind_inact', 'level_btn_orange', 'back'].forEach(name => {
            this.registerFrame('buttons_sheet', name);
        });

        console.log(this.textures.get('buttons_sheet').has('ind_act'));
        console.log(this.textures.get('buttons_sheet').has('ind_inact'));

        // World backgrounds
        this.worldBgs = [];
        for (let w = 1; w <= 4; w++) {
            const bg = this.add.image(375, 160, `pack_bg_${w}`)
                .setDisplaySize(750, 320)
                .setVisible(w === 1);
            this.worldBgs.push(bg);
        }

        // Dot indicators
        this.dots = [];
        for (let i = 0; i < 4; i++) {
            const frameName = i === 0 ? 'ind_act' : 'ind_inact';
            const dot = this.add.image(280 + i * 60, 300, 'buttons_sheet', frameName).setDepth(2);
            this.dots.push(dot);
        }

        // Back button
        const back = this.add.image(40, 30, 'buttons_sheet', 'back').setInteractive().setDepth(2);
        back.on('pointerdown', () => this.scene.start('MenuScene'));


        // Swipe/click navigation
        this.input.on('pointerdown', (p) => { this.dragStartX = p.x; });
        this.input.on('pointerup', (p) => {
            const diff = this.dragStartX - p.x;
            if (diff > 50 && this.selectedWorld < 4) this.goToWorld(this.selectedWorld + 1);
            else if (diff < -50 && this.selectedWorld > 1) this.goToWorld(this.selectedWorld - 1);
        });
    }

    goToWorld(world) {
        const direction = world > this.selectedWorld ? 1 : -1;
        const newBg = this.worldBgs[world - 1];
        const oldBg = this.worldBgs[this.selectedWorld - 1];

        // Reset depths
        oldBg.setDepth(0);
        newBg.setDepth(1);

        newBg.x = 375 + direction * 750;
        newBg.y = 160;
        newBg.setVisible(true);

        this.tweens.killTweensOf(newBg);

        this.tweens.add({
            targets: newBg,
            x: 375,
            duration: 300,
            ease: 'Power2',
            onComplete: () => oldBg.setVisible(false)
        });

        this.selectedWorld = world;
        this.dots.forEach((dot, i) => {
            dot.setTexture('buttons_sheet', i === world - 1 ? 'ind_act' : 'ind_inact');
        });
    }
}