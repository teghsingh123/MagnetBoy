import Phaser from 'phaser';
import { allFrames, registerFrame } from './GameUtil.js';
import { showOptions, removeOptions } from './GameOptions.js';
import { showInfo, removeInfo } from './GameInfo.js';
import { showShare, removeShare } from './GameShare.js';
import { removeBubble } from './GameBubble.js';

const ITUNES_URL = 'https://apps.apple.com/app/id651994480';

export default class GameMainMenu extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('mainmenu_bg',   '/assets/ui/mainmenu_bg.png');
        this.load.image('buttons_sheet', '/assets/sprites/buttons_sheet.png');
        for (let col = 1; col <= 2; col++)
            for (let row = 1; row <= 2; row++)
                this.load.image(`menu_bg_${col}_${row}`, `/assets/pack/0/bg-x25-${col}-${row}.png`);
        this.load.font('DomkratMon', '/assets/fonts/DomkratMon.ttf');
    }

    create() {
        ['btn_bg', 'button_shadow', 'play', 'settings', 'info', 'share', 'list'].forEach(name => {
            registerFrame(this.textures, 'buttons_sheet', name);
        });

        // Background grid
        const colWidths = [1024, 256], rowHeights = [512, 288];
        let xPos = 240;
        for (let col = 0; col < 2; col++) {
            let yPos = 0;
            for (let row = 0; row < 2; row++) {
                this.add.image(xPos, yPos, `menu_bg_${col+1}_${row+1}`).setOrigin(0, 0).setScale(0.4);
                yPos += rowHeights[row] * 0.4;
            }
            xPos += colWidths[col] * 0.4;
        }

        this.add.image(670, 160, 'mainmenu_bg').setDisplaySize(200, 256);

        const buttons = [
            { label: 'Тоглох',    icon: 'play',     action: () => this._onPlay() },
            { label: 'Тохиргоо', icon: 'settings', action: () => this._onSettings() },
            { label: 'Тухай',    icon: 'info',     action: () => this._onInfo() },
            { label: 'Хуваалцах', icon: 'share',   action: () => this._onShare() },
            { label: 'Үнэлэх',   icon: 'list',     action: () => this._onRate() },
        ];

        let startY = 62;
        for (const btn of buttons) {
            this.add.rectangle(670, startY, 120, 37, 0x4a7fb5);
            this.add.image(675, startY + 5, 'buttons_sheet', 'button_shadow').setScale(120/129, 36.75/42);
            const bg = this.add.image(670, startY, 'buttons_sheet', 'btn_bg').setInteractive();
            this.add.image(625, startY, 'buttons_sheet', btn.icon).setScale(0.7);
            this.add.text(655, startY, btn.label, { fontSize: '14px', color: '#ffffff', fontFamily: 'DomkratMon' }).setOrigin(0, 0.5);
            bg.on('pointerdown', btn.action);
            startY += 48;
        }
    }

    // --- Mirrors GameMainMenu.hideBubble(): tear down any open overlay before showing another ---
    _hideBubble() {
        removeOptions();
        removeInfo();
        removeShare();
        removeBubble(this);
    }

    _onPlay() {
        this._hideBubble();
        this.scene.start('LevelSelectScene', { world: 1 });
    }

    _onSettings() {
        this._hideBubble();
        showOptions(this);
    }

    _onInfo() {
        this._hideBubble();
        showInfo(this);
    }

    _onShare() {
        this._hideBubble();
        showShare(this);
    }

    _onRate() {
        this._hideBubble();
        window.open(ITUNES_URL, '_blank');
    }
}
