import { allFrames } from './GameUtil.js';
import { playSound, pauseGameBG } from './GameAudio.js';

// Button name → frame index (matches GameButtons.lua's index table, 1-based)
export const BUTTON_INDEX = {
    back:               1,
    bigstar0:           2,
    bigstar1:           3,
    bigstar2:           4,
    bigstar3:           5,
    btn_bg:             6,
    button_shadow:      7,
    facebook:           8,
    full_version:       9,
    ind_act:            10,
    ind_inact:          11,
    info:               12,
    level:              13,
    list:               14,
    mail:               15,
    ministar0:          16,
    ministar1:          17,
    ministar2:          18,
    ministar3:          19,
    next:               20,
    pause:              21,
    play:               22,
    quit_no:            23,
    quit_yes:           24,
    refresh:            25,
    settings:           26,
    share:              27,
    twitter:            28,
    full_version_lock:  29,
    rate:               30,
    sound:              31,
    music:              32,
    inactive:           33,
    active:             34,
    sina:               35,
    tencent:            36,
};

export function getButtonIndex(name) {
    return BUTTON_INDEX[name] ?? 0;
}

// Returns the Phaser texture key for the buttons sheet (no sheet object in Phaser)
export function getImageSheet() {
    return 'buttons_sheet';
}

// Mirrors GameButtons.getButtonImage(parent, name, width, height)
// Creates a Phaser image on the scene, optionally sized, optionally added to a container.
export function getButtonImage(scene, parent, name, width, height) {
    const img = scene.add.image(0, 0, 'buttons_sheet', name);
    if (width && height) img.setDisplaySize(width, height);
    if (parent && typeof parent.add === 'function') parent.add(img);
    return img;
}

export function createHUD(scene) {
    ['bigstar0','bigstar1','bigstar2','bigstar3','pause','back','next','refresh','list'].forEach(n => {
        const f = allFrames[n];
        if (!f) return;
        const t = scene.textures.get('buttons_sheet');
        if (t && !t.has(n)) t.add(n, 0, f.x, f.y, f.w, f.h);
    });

    scene.add.text(5, 5, `${scene.currentWorld}-${scene.currentLevel} үе`,
        { fontSize: '18px', color: '#fff', fontFamily: 'DomkratMon' })
        .setScrollFactor(0).setDepth(20);

    scene.hudStar = scene.add.image(114, 18, 'buttons_sheet', 'bigstar0')
        .setDisplaySize(54, 20).setScrollFactor(0).setDepth(20);

    const pauseBtn = scene.add.image(730, 20, 'buttons_sheet', 'pause')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(20).setInteractive();
    pauseBtn.on('pointerdown', () => {
        playSound(scene, 'pause');
        pauseGameBG(scene);
        scene.scene.pause('GameScene');
        scene.scene.launch('PauseScene');
    });
}
