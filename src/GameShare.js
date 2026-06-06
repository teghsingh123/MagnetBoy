// GameShare.lua: singleton Twitter / Facebook share overlay.
// Lua used socket.http + system.openURL; in the browser we use window.open.

const BTN_X   = 100;
const BTN_W   = 110;
const BTN_H   = 36;
const START_Y = 35;
const STEP_Y  = 42;

// Share URL templates — mirrors application.Share config table
const SHARE_URLS = {
    twitter:  'https://twitter.com/intent/tweet?text=',
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=',
};

const DEFAULT_SHARE_TEXT = "I'm playing Magnet Boy! Can you beat my score?";
const DEFAULT_SHARE_URL  = 'https://magnetboy.mn';

// Button colours: Twitter blue (matches Lua's [0,50,155] / [0,150,155])
const COLOR_DEFAULT = 0x00329b;
const COLOR_OVER    = 0x00969b;

let instance = null;

export function showShare(scene) {
    if (instance) { instance.setVisible(true); return; }

    const W  = scene.cameras.main.width;
    const H  = scene.cameras.main.height;
    const cx = W / 2;
    const cy = H / 2;

    const container = scene.add.container(0, 0).setDepth(100);

    // dim overlay
    const overlay = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.6)
        .setInteractive();
    container.add(overlay);

    // panel
    const panelW = 200;
    const panelH = 120;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;
    const panel = scene.add.graphics();
    panel.fillStyle(0x111122, 0.95);
    panel.fillRoundedRect(px, py, panelW, panelH, 8);
    container.add(panel);

    // close
    const close = scene.add.text(px + panelW - 24, py + 6, '✕', {
        fontSize: '14px', color: '#ffffff',
    }).setInteractive({ useHandCursor: true })
        .on('pointerup', () => removeShare());
    container.add(close);

    const defs = [
        { label: 'Twitter',  key: 'twitter'  },
        { label: 'Facebook', key: 'facebook' },
    ];

    let startY = START_Y;
    for (const def of defs) {
        _makeButton(scene, container, px + BTN_X - BTN_W / 2, py + startY, def.label, def.key);
        startY += STEP_Y;
    }

    instance = container;
}

export function removeShare() {
    if (!instance) return;
    instance.destroy(true);
    instance = null;
}

// --- internal ---

function _makeButton(scene, container, x, y, label, key) {
    const gfx = scene.add.graphics();
    _drawBg(gfx, x, y, COLOR_DEFAULT);
    container.add(gfx);

    // shadow
    const shadow = scene.add.text(x + BTN_W / 2 + 1, y + BTN_H / 2 + 1, label, {
        fontSize: '14px', color: '#000000', align: 'center',
    }).setOrigin(0.5);
    container.add(shadow);

    // label
    const lbl = scene.add.text(x + BTN_W / 2, y + BTN_H / 2, label, {
        fontSize: '14px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    container.add(lbl);

    // hit area
    const hit = scene.add.rectangle(x + BTN_W / 2, y + BTN_H / 2, BTN_W, BTN_H, 0, 0)
        .setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on('pointerover', () => _drawBg(gfx, x, y, COLOR_OVER));
    hit.on('pointerout',  () => _drawBg(gfx, x, y, COLOR_DEFAULT));
    hit.on('pointerup',   () => _doShare(key));
}

function _drawBg(gfx, x, y, color) {
    gfx.clear();
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x, y, BTN_W, BTN_H, 4);
}

function _doShare(key) {
    const base = SHARE_URLS[key];
    if (!base) return;

    let url;
    if (key === 'twitter') {
        url = base + encodeURIComponent(DEFAULT_SHARE_TEXT + ' ' + DEFAULT_SHARE_URL);
    } else {
        url = base + encodeURIComponent(DEFAULT_SHARE_URL);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}
