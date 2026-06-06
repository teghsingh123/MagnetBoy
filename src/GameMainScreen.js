// GameMainScreen.lua: Corona scene shell for the main menu.
// Draws BG variant 0, initialises GameMainMenu, wires global-touch → hideBubble,
// and plays intro music.  In Phaser this is the authoritative main-menu Scene;
// GameMainMenu.js was an earlier standalone scene and can be retired in favour of this.

import Phaser from 'phaser';
import { createBackground } from './GameBG.js';
import { playIntro }        from './GameAudio.js';
import { removeBubble }     from './GameBubble.js';
import { allFrames, registerFrame } from './GameUtil.js';
import { showInfo }         from './GameInfo.js';
import { showExitDialog }   from './GameExitDialog.js';

const MENU_BUTTONS = [
    { label: 'Тоглох',    icon: 'play',     key: 'play'     },
    { label: 'Тохиргоо', icon: 'settings', key: 'settings' },
    { label: 'Тухай',    icon: 'info',     key: 'info'     },
    { label: 'Хуваалцах', icon: 'share',   key: 'share'    },
    { label: 'Үнэлэх',   icon: 'list',     key: 'rate'     },
];

export default class GameMainScreen extends Phaser.Scene {
    constructor() { super({ key: 'MainScreen' }); }

    create() {
        // BG variant 0
        createBackground(this);

        // register button frames
        ['btn_bg', 'button_shadow', 'play', 'settings', 'info', 'share', 'list'].forEach(n => {
            registerFrame(this.textures, 'buttons_sheet', n);
        });

        // hero image (top-right)
        this.add.image(670, 160, 'mainmenu_bg').setDisplaySize(200, 256);

        // menu buttons
        let startY = 62;
        for (const def of MENU_BUTTONS) {
            this.add.image(670, startY, 'buttons_sheet', 'btn_bg')
                .setInteractive({ useHandCursor: true })
                .on('pointerup', () => this._onButton(def.key));
            this.add.image(625, startY, 'buttons_sheet', def.icon).setScale(0.7);
            this.add.text(655, startY, def.label, {
                fontSize: '14px', color: '#ffffff', fontFamily: 'DomkratMon',
            }).setOrigin(0, 0.5);
            startY += 48;
        }

        // global touch: dismiss any open bubble (mirrors the BG touch listener in the Lua)
        this.input.on('pointerup', () => removeBubble(this));

        // transparent hit-area at bottom-left (x=65, y=H-55) — mirrors Lua's invisible button
        const H = this.cameras.main.height;
        this.add.rectangle(65, H - 55, 50, 50, 0x000000, 0)
            .setInteractive();   // catches taps, no action

        // play intro music
        playIntro(this);
    }

    _onButton(key) {
        switch (key) {
            case 'play':
                this.scene.start('LevelSelectScene', { world: 1 });
                break;
            case 'info':
                showInfo(this);
                break;
            case 'share':
                // GameShare: open share dialog (stub)
                break;
            case 'settings':
                this.scene.launch('OptionsScene');
                break;
            case 'rate':
                // rateMe: platform store rating (no-op in browser)
                break;
        }
    }

    // clean() — called by director before scene transition
    clean() {
        removeBubble(this);
    }
}
