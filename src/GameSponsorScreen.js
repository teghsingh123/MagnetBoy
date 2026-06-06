// GameSponsorScreen.lua: draws BG variant 102, waits 4 s, transitions to MainScreen.

import Phaser from 'phaser';
import { createBackground } from './GameBG.js';

export default class GameSponsorScreen extends Phaser.Scene {
    constructor() { super({ key: 'SponsorScreen' }); }

    create() {
        createBackground(this);

        // after 4 000 ms move to main menu (mirrors timer.performWithDelay(4000, …))
        this.time.delayedCall(4000, () => {
            this.scene.start('MainScreen');
        });
    }
}
