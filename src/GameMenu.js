import Phaser from 'phaser';
import { registerFrame } from './GameUtil.js';

// ── WorldScene: level-select grid (replaces GameLevelPack's per-world view) ──

export default class GameMenu extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    init(data) {
        this.currentWorld = data.world || 1;
    }

    preload() {
        this.load.image('buttons_sheet', '/assets/buttons_sheet.png');
        for (let col = 1; col <= 2; col++)
            for (let row = 1; row <= 2; row++)
                this.load.image(`world_bg_${col}_${row}`, `/assets/pack/${this.currentWorld}/bg-x25-${col}-${row}.png`);
    }

    create() {
        ['level_btn_orange', 'ministar0', 'ministar1', 'ministar2', 'ministar3', 'back'].forEach(name => {
            registerFrame(this.textures, 'buttons_sheet', name);
        });

        const scaleX = 750 / 1280, scaleY = 320 / 800;
        const colWidths = [1024, 256], rowHeights = [512, 288];
        let xPos = 0;
        for (let col = 0; col < 2; col++) {
            let yPos = 0;
            for (let row = 0; row < 2; row++) {
                this.add.image(xPos, yPos, `world_bg_${col+1}_${row+1}`).setOrigin(0, 0).setScale(scaleX, scaleY);
                yPos += rowHeights[row] * scaleY;
            }
            xPos += colWidths[col] * scaleX;
        }

        this.add.image(710, 30, 'buttons_sheet', 'back').setDepth(2).setInteractive()
            .on('pointerdown', () => this.scene.start('LevelSelectScene', { world: this.currentWorld }));

        const cols = 5, rows = 4, btnW = 100, btnH = 50;
        const startX = (750 - cols * btnW) / 2 + btnW / 2;
        const startY = 50;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const level = row * cols + col + 1;
                const x = startX + col * (btnW + 10);
                const y = startY + row * (btnH + 20);

                this.add.image(x, y, 'buttons_sheet', 'level_btn_orange')
                    .setScale(btnW/32, btnH/32).setInteractive().setDepth(1)
                    .on('pointerdown', () => this.scene.start('GameScene', { world: this.currentWorld, level }));

                this.add.text(x, y - 5, `${level}`,
                    { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2);

                this.add.image(x, y + 15, 'buttons_sheet', 'ministar0').setScale(0.8).setDepth(2);
            }
        }
    }
}

// ── In-game HUD API (mirrors GameMenu.lua singleton methods) ─────────────────
// GameScene calls these to manage the HUD overlay during gameplay.
// State is stored on the scene object itself (scene.hudStar, scene.hudStarCount, etc.)
// so no separate singleton is needed in Phaser.

export function showGamePlayMenu(scene, pack, level, pauseCallback) {
    if (scene.hudVisible) return;
    scene.hudVisible = true;
    scene.hudStarCount = -1;
    incStar(scene);

    // Level title text
    if (scene.hudLevelTitle) scene.hudLevelTitle.destroy();
    scene.hudLevelTitle = scene.add.text(5, 5, `${pack}-${level} үе`, {
        fontSize: '18px', color: '#fff', fontFamily: 'DomkratMon',
    }).setScrollFactor(0).setDepth(20);

    // Pause button
    if (!scene.hudPauseBtn) {
        scene.hudPauseBtn = scene.add.image(730, 20, 'buttons_sheet', 'pause')
            .setDisplaySize(40, 40).setScrollFactor(0).setDepth(20).setInteractive();
    }
    scene.hudPauseBtn.setVisible(true);
    scene.hudPauseBtn.off('pointerdown');
    if (pauseCallback) scene.hudPauseBtn.on('pointerdown', pauseCallback);
}

export function hideGamePlayMenu(scene) {
    scene.hudVisible = false;
    if (scene.hudPauseBtn)   scene.hudPauseBtn.setVisible(false);
    if (scene.hudStar)       scene.hudStar.setVisible(false);
    if (scene.hudLevelTitle) { scene.hudLevelTitle.destroy(); scene.hudLevelTitle = null; }
    if (scene.hudPauseBtn)   scene.hudPauseBtn.off('pointerdown');
}

export function showBack(scene, show) {
    if (show) {
        if (!scene.hudBackBtn) {
            scene.hudBackBtn = scene.add.image(730, 20, 'buttons_sheet', 'back')
                .setDisplaySize(40, 40).setScrollFactor(0).setDepth(20).setInteractive();
            scene.hudBackBtn.on('pointerdown', () => scene.scene.start('MenuScene'));
        }
        scene.hudBackBtn.setVisible(true);
    } else {
        if (scene.hudBackBtn) scene.hudBackBtn.setVisible(false);
    }
}

// Increments star counter and updates the HUD star image (bigstar0 → bigstar3).
// Mirrors GameMenu.incStar().
export function incStar(scene) {
    scene.hudStarCount = (scene.hudStarCount ?? -1) + 1;
    const frame = `bigstar${scene.hudStarCount}`;
    if (scene.hudStar) {
        scene.hudStar.setFrame(frame);
        scene.hudStar.setVisible(true);
    }
}

export function removeHUD(scene) {
    if (scene.hudPauseBtn)   { scene.hudPauseBtn.destroy();   scene.hudPauseBtn = null; }
    if (scene.hudBackBtn)    { scene.hudBackBtn.destroy();    scene.hudBackBtn = null; }
    if (scene.hudStar)       { scene.hudStar.destroy();       scene.hudStar = null; }
    if (scene.hudLevelTitle) { scene.hudLevelTitle.destroy(); scene.hudLevelTitle = null; }
    scene.hudVisible = false;
}
