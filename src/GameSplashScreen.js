// GameSplashScreen.lua: draws BG variant 100, waits 3 s, transitions to SponsorScreen.

import Phaser from 'phaser';
import { createBackground } from './GameBG.js';

export default class GameSplashScreen extends Phaser.Scene {
    constructor() { super({ key: 'SplashScreen' }); }

    create() {
        createBackground(this);

        // after 3 000 ms move to sponsor screen (mirrors timer.performWithDelay(3000, …))
        this.time.delayedCall(3000, () => {
            this.scene.start('SponsorScreen');
        });
    }
}
