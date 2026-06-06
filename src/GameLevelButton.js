// GameLevelButton.lua: level-select button grid.
// 5-column grid of 40×40 buttons with mini-star earned indicators.
// buildButtons positions them relative to screen centre matching Corona layout.

import * as GameSession from './GameSession.js';

const BTN  = 40;   // button size
const HGAP = 40;   // horizontal gap between button centres = BTN + HGAP = 80px step
const VGAP = 25;   // vertical gap between rows
const COLS = 5;

// init() → state object (mirrors Lua's metatable instance)
export function init() {
    return { buttons: [], stars: [] };
}

// buildButtons(self, group, levelsInPack, levelNumber, starsData, scene)
//   group       — Phaser container/group to insert into
//   levelsInPack — total levels to show
//   levelNumber  — currently selected / active level (highlight)
//   starsData    — map  "ministar<n>" → 0|1|2|3
//   scene        — Phaser scene
export function buildButtons(self, group, levelsInPack, levelNumber, starsData, scene) {
    const W  = scene.cameras.main.width;
    const H  = scene.cameras.main.height;

    // mirrors: cx = contentWidth/2 - 160 + screenOriginX
    //          cy = contentHeight/2 - 90  + screenOriginY
    const originX = W / 2 - 160;
    let   cy      = H / 2 - 90;
    let   col     = 0;

    for (let i = 1; i <= levelsInPack; i++) {
        const bx = originX + col * (BTN + HGAP);
        const by = cy - 13;

        // highlight rounded-rect for current level
        if (i === levelNumber) {
            const hl = scene.add.graphics();
            hl.fillStyle(0xffffff, 60 / 255);
            hl.fillRoundedRect(
                bx - (BTN + 10) / 2,
                by - (BTN + 10) / 2,
                BTN + 10, BTN + 10, 6
            );
            group.add(hl);
            self.buttons.push(hl);
        }

        // button background
        const isActive = (i === levelNumber);
        const labelCol = isActive ? '#33FF00' : '#ffffff';

        const btn = scene.add.graphics();
        btn.fillStyle(isActive ? 0x336600 : 0x224488, 0.85);
        btn.fillRoundedRect(bx - BTN / 2, by - BTN / 2, BTN, BTN, 5);
        btn.setInteractive(
            new Phaser.Geom.Rectangle(bx - BTN / 2, by - BTN / 2, BTN, BTN),
            Phaser.Geom.Rectangle.Contains
        );
        group.add(btn);
        self.buttons.push(btn);

        // level number label
        const lbl = scene.add.text(bx, by - 3, String(i), {
            fontSize: '16px',
            color:    labelCol,
            align:    'center',
        }).setOrigin(0.5);
        group.add(lbl);
        self.buttons.push(lbl);

        // click handler
        const levelNum = i;
        btn.on('pointerup', () => _onLevelTap(scene, levelNum));

        // mini star indicator — "ministar<i>" key from starsData → frame name ministar0..3
        const earned     = starsData[`ministar${i}`] ?? 0;
        const starFrame  = `ministar${earned}`;
        const star = scene.add.image(bx, cy - 1, 'buttons_sheet', starFrame)
            .setDisplaySize(27, 11)
            .setOrigin(0.5);
        group.add(star);
        self.stars.push(star);

        // advance grid position
        col++;
        if (col === COLS) {
            col = 0;
            cy += BTN + VGAP;
        }
    }
}

function _onLevelTap(scene, levelNum) {
    GameSession.setLevel(GameSession.currentWorld, levelNum);
    scene.scene.start('GamePlay');
}

// removeSelf(self) — destroys all buttons and star indicators
export function removeSelf(self) {
    for (const b of self.buttons) b?.destroy();
    for (const s of self.stars)   s?.destroy();
    self.buttons = [];
    self.stars   = [];
}
