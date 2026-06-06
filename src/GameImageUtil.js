import { allFrames } from './GameUtil.js';

// GameImageUtil.lua: mapped sheet names → Corona ImageSheet + frame options.
// In Phaser, all_frames.json already holds every frame's x/y/w/h/sheet.
// This module replicates the same init/getImage/removeSelf API.

// Known sheet texture keys, matching what Phaser loads in preload.
const SHEET_MAP = {
    'hero_hero_sheet.png':       'hero_hero_sheet',
    'magnet_magnet_sheets.png':  'magnet_magnet_sheets',
    'robots/robo_1':             'robo_1',
    'robots/robo_2':             'robo_2',
    'robots/robo_3':             'robo_3',
    'robots/robo_4':             'robo_4',
};

// init(sheetName, variant) → imageUtil object
export function init(sheetName, variant) {
    const textureKey = SHEET_MAP[sheetName] ?? sheetName;
    return { textureKey, sheetName, variant };
}

// getImage(util, scene, frameName, w?, h?) → Phaser.GameObjects.Image
// If w/h supplied uses them; otherwise reads dimensions from allFrames.
export function getImage(util, scene, frameName, w, h) {
    const frame = allFrames[frameName];
    const fw = w ?? frame?.w;
    const fh = h ?? frame?.h;
    const img = scene.add.image(0, 0, util.textureKey, frameName);
    if (fw && fh) img.setDisplaySize(fw, fh);
    if (frame?.rotation) img.setAngle(frame.rotation);
    return img;
}

export function removeSelf(util) {
    if (util) util.textureKey = null;
}
