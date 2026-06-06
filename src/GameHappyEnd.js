import Phaser from 'phaser';
import { createBackground } from './GameBG.js';

// GameHappyEnd.lua: end-game credits screen shown after completing all levels.
// Renders BG #101, Mongolian congratulations text with 1px drop-shadow pairs.

const SHADOW = '#000000';
const BLUE   = '#43CAF3';  // rgb(67,202,243)

const STYLE = (color, wordWrap) => ({
    fontSize:       '14px',
    color,
    wordWrap:       { width: wordWrap },
    lineSpacing:    2,
});

export default class GameHappyEnd extends Phaser.Scene {
    constructor() { super({ key: 'HappyEndScene' }); }

    create() {
        createBackground(this, 101);

        const h = this.cameras.main.height;
        const baseY = h - 60;

        this._addLine('Баяр хүргэе!!!',                                     10,  baseY,      180);
        this._addLine('Та бүх үений амжилттай давснаар',                     134, baseY,      200);
        this._addLine('Профессор алдагдсан роботуудаа цуглуулж',             160, baseY + 18, 200);
        this._addLine('дахин суралцан роботуудаа цуглуулаа.',                190, baseY + 36, 130);

        // Back button — returns to world/menu screen
        const back = this.add.text(20, 20, '← Буцах', {
            fontSize: '14px', color: '#ffffff', backgroundColor: '#00000066',
            padding: { x: 6, y: 4 },
        }).setInteractive({ useHandCursor: true });
        back.on('pointerup', () => this.scene.start('WorldScene'));
    }

    _addLine(text, x, y, wrap) {
        // shadow
        this.add.text(x + 1, y + 1, text, STYLE(SHADOW, wrap)).setAlpha(150 / 255);
        // main
        this.add.text(x, y, text, STYLE(BLUE, wrap));
    }
}
