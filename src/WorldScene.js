import Phaser from 'phaser';
import allFrames from './assets/all_frames.json';

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    init(data) {
        this.currentWorld = data.world || 1;
    }

    preload() {
        this.load.image('buttons_sheet', '/assets/buttons_sheet.png');
        // Load world background
        for (let col = 1; col <= 2; col++) {
            for (let row = 1; row <= 2; row++) {
                this.load.image(`world_bg_${col}_${row}`, `/assets/pack/${this.currentWorld}/bg-x25-${col}-${row}.png`);
            }
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
        // Register frames
        ['level_btn_orange', 'ministar0', 'ministar1', 'ministar2', 'ministar3', 'back'].forEach(name => {
            this.registerFrame('buttons_sheet', name);
        });

        // Background
        const scaleX = 750 / 1280;
        const scaleY = 320 / 800;
        const colWidths = [1024, 256];
        const rowHeights = [512, 288];
        let xPos = 0;
        for (let col = 0; col < 2; col++) {
            let yPos = 0;
            for (let row = 0; row < 2; row++) {
                this.add.image(xPos, yPos, `world_bg_${col + 1}_${row + 1}`)
                    .setOrigin(0, 0)
                    .setScale(scaleX, scaleY);
                yPos += rowHeights[row] * scaleY;
            }
            xPos += colWidths[col] * scaleX;
        }

        // Back button
        this.add.image(710, 30, 'buttons_sheet', 'back').setDepth(2).setInteractive()
            .on('pointerdown', () => this.scene.start('LevelSelectScene', { world: this.currentWorld }));

        // 5x4 grid of level buttons
        const cols = 5;
        const rows = 4;
        const btnW = 100;
        const btnH = 50;
        const startX = (750 - cols * btnW) / 2 + btnW / 2;
        const startY = 50;
        const spacingX = btnW + 10;
        const spacingY = btnH + 20;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const level = row * cols + col + 1;
                const x = startX + col * spacingX;
                const y = startY + row * spacingY;

                // Button background
                const btn = this.add.image(x, y, 'buttons_sheet', 'level_btn_orange')
                    .setScale(btnW / 32, btnH / 32)
                    .setInteractive()
                    .setDepth(1);

                // Level number
                this.add.text(x, y - 5, `${level}`, {
                    fontSize: '16px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                }).setOrigin(0.5).setDepth(2);

                // Stars (0 for now)
                this.add.image(x, y + 15, 'buttons_sheet', 'ministar0')
                    .setScale(0.8).setDepth(2);

                btn.on('pointerdown', () => {
                    this.scene.start('GameScene', { world: this.currentWorld, level });
                });
            }
        }
    }
}