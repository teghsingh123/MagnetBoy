// GameOptions.lua: singleton music/sound toggle overlay.
// Settings persisted in localStorage (replaces SQLite db).
// Labels are Mongolian: index 0 = "turn on" label, index 1 = "turn off" label.

import { playIntro, stopIntro, playGameBG, pauseGameBG } from './GameAudio.js';

const LABELS = {
    music: ['Хөгжим нээх', 'Хөгжим хааx'],  // [shown when off, shown when on]
    sound: ['Дуу чимээ нээх', 'Дуу чимээ хааx'],
};

const BTN_X      = 100;
const BTN_W      = 130;
const BTN_H      = 36;
const START_Y    = 35;
const STEP_Y     = 42;
const FONT_SIZE  = '14px';
const COLOR_DEFAULT = 0x000000;
const COLOR_OVER    = 0x0000ff;

let instance = null;

// --- settings persistence (replaces SQLite) ---

function loadSettings() {
    try {
        return JSON.parse(localStorage.getItem('magnetboy_settings') ?? '{}');
    } catch { return {}; }
}

function saveSetting(key, value) {
    const s = loadSettings();
    s[key] = value;
    localStorage.setItem('magnetboy_settings', JSON.stringify(s));
}

export function getSetting(key, defaultVal = 1) {
    return loadSettings()[key] ?? defaultVal;
}

// --- overlay ---

export function showOptions(scene) {
    if (instance) { instance.container.setVisible(true); return; }

    const W  = scene.cameras.main.width;
    const H  = scene.cameras.main.height;
    const cx = W / 2;
    const cy = H / 2;

    const container = scene.add.container(0, 0).setDepth(100);

    // dim overlay — blocks input
    const overlay = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.6)
        .setInteractive();
    container.add(overlay);

    // panel background
    const panelW = 220;
    const panelH = 130;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;
    const panel = scene.add.graphics();
    panel.fillStyle(0x111122, 0.95);
    panel.fillRoundedRect(px, py, panelW, panelH, 8);
    container.add(panel);

    // close button
    const close = scene.add.text(px + panelW - 24, py + 6, '✕', {
        fontSize: '14px', color: '#ffffff',
    }).setInteractive({ useHandCursor: true })
        .on('pointerup', () => removeOptions());
    container.add(close);

    const settings = loadSettings();
    const buttons  = [];
    let   startY   = START_Y;

    for (const key of ['music', 'sound']) {
        const on  = settings[key] ?? 1;
        const btn = _makeButton(scene, container, key, on, px + BTN_X - BTN_W / 2, py + startY);
        buttons.push(btn);
        startY += STEP_Y;
    }

    instance = { container, buttons, scene };
}

export function removeOptions() {
    if (!instance) return;
    instance.container.destroy(true);
    instance = null;
}

// --- internal button factory ---

function _makeButton(scene, container, key, initialOn, x, y) {
    const state = { on: initialOn };

    // background rect (drawn via graphics so we can recolour on hover)
    const gfx = scene.add.graphics();
    _drawBtnBg(gfx, x, y, COLOR_DEFAULT);
    container.add(gfx);

    // shadow text (+1,+1)
    const shadow = scene.add.text(x + BTN_W / 2 + 1, y + BTN_H / 2 + 1,
        LABELS[key][state.on], {
            fontSize: FONT_SIZE, color: '#000000', align: 'center',
        }).setOrigin(0.5);
    container.add(shadow);

    // main label
    const label = scene.add.text(x + BTN_W / 2, y + BTN_H / 2,
        LABELS[key][state.on], {
            fontSize: FONT_SIZE, color: '#ffffff', align: 'center',
        }).setOrigin(0.5);
    container.add(label);

    // invisible hit area
    const hit = scene.add.rectangle(x + BTN_W / 2, y + BTN_H / 2, BTN_W, BTN_H, 0, 0)
        .setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on('pointerover',  () => _drawBtnBg(gfx, x, y, COLOR_OVER));
    hit.on('pointerout',   () => _drawBtnBg(gfx, x, y, COLOR_DEFAULT));
    hit.on('pointerup', () => {
        state.on = Math.abs(state.on - 1);   // toggle 0↔1
        const txt = LABELS[key][state.on];
        label.setText(txt);
        shadow.setText(txt);
        saveSetting(key, state.on);
        _applyAudio(scene, key, state.on);
    });

    return { gfx, label, shadow, hit };
}

function _drawBtnBg(gfx, x, y, color) {
    gfx.clear();
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x, y, BTN_W, BTN_H, 4);
}

function _applyAudio(scene, key, on) {
    if (key === 'music') {
        if (on === 1) playIntro(scene);
        else          stopIntro(scene);
    } else {
        // sound toggle: GameAudio.prepareButton equivalent —
        // simply gate SFX via a global flag read by playSound
        window._mbSoundEnabled = (on === 1);
    }
}
