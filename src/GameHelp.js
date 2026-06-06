import * as GameSession from './GameSession.js';

// GameHelp.lua: tutorial overlay, shown only on world 1 level 1.
// helpCircle — animated how-to-play sequence (hand icon, text labels, help_bg).
// helpText   — inline labels near game objects.
// removeHelp — tears down all views.

// ---------- helpCircle -------------------------------------------------------

export function helpCircle(scene, magnet, star, hero, container) {
    if (GameSession.currentWorld !== 1 || GameSession.currentLevel !== 1) return null;

    const W = scene.cameras.main.width;
    const H = scene.cameras.main.height;

    const views = [];

    // dim overlay — blocks input, tap to dismiss
    const overlay = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 100 / 255)
        .setInteractive().setDepth(50);
    views.push(overlay); // [0]

    // centred help_bg image (400×221), tappable to dismiss
    const bg = scene.add.image(W / 2, H / 2, 'help_bg')
        .setDisplaySize(400, 221).setDepth(51).setAlpha(0)
        .setInteractive({ useHandCursor: true });
    views.push(bg); // [1]

    bg.on('pointerup', () => {
        overlay.setVisible(false);
        bg.setVisible(false);
    });

    // hand icon near magnet, rotated 45°
    const hx = magnet ? magnet.x : W / 2;
    const hy = magnet ? magnet.y + 24 : H / 2;
    const hand = scene.add.image(hx, hy, 'hand')
        .setDisplaySize(48, 48).setAngle(45).setDepth(52).setAlpha(0);
    views.push(hand); // [2]

    // text labels — "Дараад," / "Чирээд," / "Тавь!"
    const dragX = (magnet?.x ?? W / 2) + 30;
    const dragY = (magnet?.y ?? H / 2) - 60;

    const txtPress  = _label(scene, 'Дараад,',  dragX,      dragY,      container).setAlpha(0); views.push(txtPress);  // [3]
    const txtDrag   = _label(scene, 'Чирээд,',  dragX + 50, dragY,      container).setAlpha(0); views.push(txtDrag);   // [4]
    const txtRel    = _label(scene, 'Тавь!',    dragX + 120, dragY,     container).setAlpha(0); views.push(txtRel);    // [5]

    // star hint
    const starX = (star?.x ?? W / 2) + 60;
    const starY = (star?.y ?? H / 2) + 80;
    const txtStar = _label(scene, 'Ёл болоох одыг аваарай', starX, starY, container, 120, 50).setAlpha(0);
    views.push(txtStar); // [6]

    // robot hint
    const heroX = (hero?.x ?? W / 2) + 140;
    const heroY = (hero?.y ?? H / 2) - 100;
    const txtRobo = _label(scene, 'Роботын биений хэсгийг цуглуулаарай', heroX, heroY, container, 120, 80).setAlpha(0);
    views.push(txtRobo); // [7]

    // stick hint
    const txtStick = _label(scene,
        'Улаан болон хөх цэнхэр соронзон татагдсан хоорондоо тататтаг нааллдана.',
        dragX + 10, dragY + 50, container, 150, 60).setAlpha(0);
    views.push(txtStick); // [8]

    // ---- animated reveal sequence ----
    // step 1: fade in help_bg (view[1])
    scene.tweens.add({
        targets:  bg,
        alpha:    1,
        duration: 1000,
        onComplete: () => {
            // step 2: fade in hand (view[2])
            scene.tweens.add({
                targets: hand, alpha: 1, duration: 1000,
                onStart: () => { txtPress.setAlpha(1); txtDrag.setAlpha(1); },
                onComplete: () => {
                    // step 3: slide hand (swipe demo)
                    scene.tweens.add({
                        targets: hand, x: hand.x - 50, y: hand.y + 50,
                        delay: 2000, duration: 1500,
                        onStart: () => { txtRel.setAlpha(1); },
                        onComplete: () => {
                            // step 4: sequential star / robo / stick reveals
                            scene.tweens.add({ targets: txtStar,  alpha: 1, duration: 1000 });
                            scene.tweens.add({ targets: txtRobo,  alpha: 1, delay: 2000, duration: 2000 });
                            scene.tweens.add({ targets: txtStick, alpha: 1, delay: 4000, duration: 2000 });
                        },
                    });
                    // loop: repeat hand animation every 8 s
                    scene.time.addEvent({
                        delay: 8000, repeat: 99,
                        callback: () => _loopHand(scene, hand, hx, hy),
                    });
                },
            });
        },
    });

    const obj = { views, container };
    return obj;
}

function _loopHand(scene, hand, startX, startY) {
    hand.setPosition(startX, startY).setAlpha(1);
    scene.tweens.add({
        targets: hand, x: startX - 50, y: startY + 50,
        delay: 0, duration: 2500,
    });
}

// ---------- helpText ---------------------------------------------------------

export function helpText(scene, positions, texts, offsets, container) {
    if (!texts) return null;
    const views = [];
    for (let i = 0; i < texts.length; i++) {
        const x = (positions[i]?.x ?? 0) + (offsets[i]?.x ?? 0);
        const y = (positions[i]?.y ?? 0) + (offsets[i]?.y ?? 0);
        const t = _label(scene, texts[i], x, y, container, 180, 80).setAlpha(0);
        views.push(t);
    }
    // fade in first, then rest immediately after
    if (views.length > 0) {
        scene.tweens.add({
            targets:  views[0],
            alpha:    1,
            duration: 1000,
            onStart: () => { for (let i = 1; i < views.length; i++) views[i].setAlpha(1); },
        });
    }
    return { views };
}

// ---------- removeHelp -------------------------------------------------------

export function removeHelp(helpObj) {
    if (!helpObj) return;
    if (helpObj.views) {
        for (const v of helpObj.views) v?.destroy();
        helpObj.views = null;
    }
    if (helpObj.ptimer) { helpObj.ptimer.remove(); helpObj.ptimer = null; }
}

// ---------- internal ---------------------------------------------------------

function _label(scene, text, x, y, container, wordWrap = 180, height = 60) {
    const t = scene.add.text(x, y, text, {
        fontSize:    '13px',
        color:       '#ffffff',
        wordWrap:    { width: wordWrap },
        lineSpacing: 2,
    }).setDepth(52);
    if (container) container.add(t);
    return t;
}
