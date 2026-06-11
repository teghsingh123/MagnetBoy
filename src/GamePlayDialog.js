// Matches GamePlayDialog.lua: fail and win overlay dialogs with Frutti character animations
import { playSound } from './GameAudio.js';

// Frame ranges for each Frutti pack (1-3):
//   win = uugch celebration, idle = undaa intro, idleLoop = undaa_loop
const FRUTTA = {
    1: { winEnd: 86,  idleStart: 87, idleEnd: 90,  loopStart: 91, loopEnd: 101 },
    2: { winEnd: 33,  idleStart: 34, idleEnd: 37,  loopStart: 38, loopEnd: 48  },
    3: { winEnd: 60,  idleStart: 61, idleEnd: 64,  loopStart: 65, loopEnd: 75  },
};
const FRUTTA_FPS = 1000 / 12; // 12 fps → ms per frame

function fruttaKey(packStr, n) {
    return `frutta_${packStr}_${String(n).padStart(4, '0')}`;
}

// Step through frames [from..to] on `img`, call onDone when the last frame is shown.
function stepAnim(scene, img, packStr, from, to, onDone) {
    let f = from;
    function tick() {
        if (!img.active) return;
        img.setTexture(fruttaKey(packStr, f));
        if (f < to) {
            f++;
            scene.time.delayedCall(FRUTTA_FPS, tick);
        } else if (onDone) {
            scene.time.delayedCall(FRUTTA_FPS, onDone);
        }
    }
    tick();
}

// Plays undaa intro once, then loops undaa_loop every 2500 ms.
function startIdleAnim(scene, img, packStr, fd) {
    stepAnim(scene, img, packStr, fd.idleStart, fd.idleEnd, () => {
        function loopIdle() {
            stepAnim(scene, img, packStr, fd.loopStart, fd.loopEnd, () => {
                scene.time.delayedCall(2500, loopIdle);
            });
        }
        scene.time.delayedCall(300, loopIdle);
    });
}

// Add the colored hero-range sprite at dialog x+70 (right side), depth 102.
// Lua always uses "hero_red" regardless of hero's actual polarity (GamePlayDialog.lua:1035).
function addHeroRange(scene) {
    const tex = scene.textures.get('hero_hero_sheet.png');
    if (!tex?.has('hero_red')) return;
    scene.add.image(445, 150, 'hero_hero_sheet.png', 'hero_red')
        .setScrollFactor(0).setDepth(102);
}

// Add idle Frutti at dialog x-10 (center-left area).
// Appears after 1000 ms on both win and fail dialogs.
function addIdleFrutti(scene) {
    const pack    = scene.fruttaPack;
    const packStr = String(pack).padStart(2, '0');
    const fd      = FRUTTA[pack];

    const fruttaIdle = scene.add.image(365, 150, fruttaKey(packStr, fd.idleStart))
        .setDisplaySize(90, 90).setScrollFactor(0).setDepth(102).setVisible(false);

    scene.time.delayedCall(1000, () => {
        if (!fruttaIdle.active) return;
        fruttaIdle.setVisible(true);
        startIdleAnim(scene, fruttaIdle, packStr, fd);
    });
}

export function showFail(scene) {
    if (scene.failShown) return;
    scene.failShown      = true;
    scene.isLevelComplete = true;
    if (scene.hero?.body) {
        scene.hero.body.setVelocity(0, 0);
        scene.hero.body.setAllowGravity(false);
    }

    scene.add.rectangle(375, 160, 750, 320, 0x000000, 0.6).setScrollFactor(0).setDepth(100);
    scene.add.image(375, 160, 'dialog_bg').setDisplaySize(300, 180).setScrollFactor(0).setDepth(101);
    scene.add.text(310, 80, 'Try Again',
        { fontSize: '18px', color: '#ff4444', fontFamily: 'DomkratMon' })
        .setScrollFactor(0).setDepth(102);

    scene.add.image(375, 200, 'buttons_sheet', 'refresh')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => { playSound(scene, 'button'); scene.scene.restart(); });

    scene.add.image(415, 200, 'buttons_sheet', 'list')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => { playSound(scene, 'button'); scene.scene.start('WorldScene', { world: scene.currentWorld }); });

    addHeroRange(scene);
    addIdleFrutti(scene);
}

export function showWin(scene) {
    if (scene.wonAlready) return;
    scene.wonAlready = true;

    scene.add.rectangle(375, 160, 750, 320, 0x000000, 0.6).setScrollFactor(0).setDepth(100);
    scene.add.image(375, 160, 'dialog_bg').setDisplaySize(300, 180).setScrollFactor(0).setDepth(101);
    scene.add.text(251, 80, `${scene.currentWorld}-${scene.currentLevel} үе`,
        { fontSize: '14px', color: '#fff', fontFamily: 'DomkratMon' })
        .setScrollFactor(0).setDepth(102);

    const sf = `bigstar${Math.min(scene.starCount, 3)}`;
    scene.add.image(475, 88, 'buttons_sheet', sf)
        .setDisplaySize(54, 20).setScrollFactor(0).setDepth(102);

    scene.add.image(455, 220, 'buttons_sheet', 'refresh')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => { playSound(scene, 'button'); scene.scene.restart(); });

    scene.add.image(495, 220, 'buttons_sheet', 'next')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => {
            let nl = scene.currentLevel + 1, nw = scene.currentWorld;
            if (nl > 20) { nl = 1; nw++; }
            playSound(scene, 'button');
            scene.scene.start('GameScene', { world: nw, level: nl });
        });

    scene.add.image(415, 220, 'buttons_sheet', 'list')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => { playSound(scene, 'button'); scene.scene.start('WorldScene', { world: scene.currentWorld }); });

    addHeroRange(scene);

    // Win Frutti (uugch) at dialog x+70 = 445
    const pack    = scene.fruttaPack;
    const packStr = String(pack).padStart(2, '0');
    const fd      = FRUTTA[pack];

    const fruttaWin = scene.add.image(445, 150, fruttaKey(packStr, 0))
        .setDisplaySize(90, 90).setScrollFactor(0).setDepth(102);

    stepAnim(scene, fruttaWin, packStr, 0, fd.winEnd, () => {
        if (fruttaWin.active) fruttaWin.setVisible(false);
    });

    // Idle Frutti at dialog x-10 = 365, appears after 1000ms (same as fail/pause)
    addIdleFrutti(scene);
}
