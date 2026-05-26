import Phaser from 'phaser';
import allFrames from './assets/all_frames.json';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('mainmenu_bg', '/assets/ui/mainmenu_bg.png');
        this.load.image('buttons_sheet', '/assets/buttons_sheet.png');
        // pack/0 background grid
        for (let col = 1; col <= 2; col++) {
            for (let row = 1; row <= 2; row++) {
                this.load.image(`menu_bg_${col}_${row}`, `/assets/pack/0/bg-x25-${col}-${row}.png`);
            }
        }

        this.load.font('DomkratMon', '/assets/DomkratMon.ttf');
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
        // Register button frames
        ['btn_bg', 'button_shadow', 'play', 'settings', 'info', 'share', 'list'].forEach(name => {
            this.registerFrame('buttons_sheet', name);
        });

        // Background grid
        const scaleX = 0.4;
        const scaleY = 0.4;

        const colWidths = [1024, 256];
        const rowHeights = [512, 288];
        let xPos = 240;
        for (let col = 0; col < 2; col++) {
            let yPos = 0;
            for (let row = 0; row < 2; row++) {
                const tile = this.add.image(xPos, yPos, `menu_bg_${col + 1}_${row + 1}`).setOrigin(0, 0);
                tile.setScale(scaleX, scaleY);
                yPos += rowHeights[row] * scaleY;
            }
            xPos += colWidths[col] * scaleX;
        }

        // Main menu panel on right side
        // Main menu panel flush right
        this.add.image(670, 160, 'mainmenu_bg').setDisplaySize(200, 256);

        // Buttons stacked vertically
        // Buttons inside the panel
        const btnX = 670;
        const buttons = [
            { label: 'Тоглох', icon: 'play', action: () => this.scene.start('LevelSelectScene', { world: 1 }) },
            { label: 'Тохиргоо', icon: 'settings', action: () => console.log('settings') },
            { label: 'Тухай', icon: 'info', action: () => console.log('info') },
            { label: 'Хуваалцах', icon: 'share', action: () => console.log('share') },
            { label: 'Үнэлэх', icon: 'list', action: () => console.log('rate') },
        ];

        const panelX = 670;
        let startY = 62;

        for (const btn of buttons) {
            console.log('creating button:', btn.label);

            // Blue fill
            this.add.rectangle(panelX, startY, 120, 37, 0x4a7fb5);

            // Shadow
            this.add.image(panelX + 5, startY + 5, 'buttons_sheet', 'button_shadow')
                .setScale(120 / 129, 36.75 / 42);

            // Button background
            const bg = this.add.image(panelX, startY, 'buttons_sheet', 'btn_bg')
                .setInteractive();

            // Icon
            this.add.image(panelX - 45, startY, 'buttons_sheet', btn.icon).setScale(0.7);

            // Text
            this.add.text(panelX - 15, startY, btn.label, {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'DomkratMon',
            }).setOrigin(0, 0.5);

            bg.on('pointerdown', btn.action);
            startY += 48;
        }
    }
}