// ui.lua → ui.js
// Corona SDK widget replacement: newButton and newLabel for Phaser 3.
//
// newButton(scene, opts) → Phaser.GameObjects.Container
//   opts: { x, y, id,
//            defaultSrc, defaultX, defaultY,          -- normal-state texture key / size
//            overSrc, overX, overY, overAlpha, overScale,  -- hover-state
//            text, font, size, textColor, offset, emboss,  -- optional text label
//            onPress(event), onRelease(event), onEvent(event),
//            isActive }
//
// newLabel(scene, opts) → Phaser.GameObjects.Container
//   opts: { bounds:[xMin,yMin,w,h], text, font, size, textColor,
//            offset, align, onPress, onRelease, onEvent }

// ── newButton ─────────────────────────────────────────────────────────────────

export function newButton(scene, opts = {}) {
    const {
        x = 0, y = 0,
        defaultSrc = null, defaultX, defaultY,
        overSrc    = null, overX, overY, overAlpha, overScale,
        text       = null,
        font       = null,
        size       = 20,
        textColor  = [255, 255, 255, 255],
        offset     = 0,
        emboss     = false,
        onPress    = null,
        onRelease  = null,
        onEvent    = null,
        isActive   = true,
        id         = null,
    } = opts;

    const container = scene.add.container(x, y);
    container._id       = id;
    container._onPress  = typeof onPress   === 'function' ? onPress   : null;
    container._onRelease= typeof onRelease === 'function' ? onRelease : null;
    container._onEvent  = typeof onEvent   === 'function' ? onEvent   : null;
    container.isActive  = isActive;

    // -- default state image --
    let defImg = null;
    if (defaultSrc != null) {
        defImg = scene.add.image(0, 0, defaultSrc);
        if (defaultX && defaultY) defImg.setDisplaySize(defaultX, defaultY);
        container.add(defImg);
    }

    // -- over (hover) state image --
    let overImg = null;
    if (overSrc != null) {
        overImg = scene.add.image(0, 0, overSrc);
        if (overX && overY) overImg.setDisplaySize(overX, overY);
        if (overAlpha != null) overImg.setAlpha(overAlpha);
        if (overScale != null) overImg.setScale(overScale);
        overImg.setVisible(false);
        container.add(overImg);
    }

    // -- text label --
    if (text != null) {
        const cssColor = _colorToCss(textColor);
        const fontSize = `${size}px`;
        const style    = { fontSize, color: cssColor, fontFamily: font ?? 'bold sans-serif' };

        if (emboss) {
            const avg = (textColor[0] + textColor[1] + textColor[2]) / 3;
            const hlAlpha = avg > 127 ? 20 / 255 : 140 / 255;
            const shAlpha = avg > 127 ? 128 / 255 : 20  / 255;

            const highlight = scene.add.text(1.5, 1.5 + offset, text,
                { ...style, color: `rgba(255,255,255,${hlAlpha})` }).setOrigin(0.5);
            const shadow    = scene.add.text(-1,  -1  + offset, text,
                { ...style, color: `rgba(0,0,0,${shAlpha})` }).setOrigin(0.5);
            container.add([highlight, shadow]);
        }

        const lbl = scene.add.text(0, offset, text, style).setOrigin(0.5);
        container.add(lbl);
        container._textObj = lbl;
    }

    // -- hit area (sized to defaultSrc or 100×40 fallback) --
    const hitW = defaultX ?? (defImg?.displayWidth)  ?? 100;
    const hitH = defaultY ?? (defImg?.displayHeight) ?? 40;
    const hit  = scene.add.rectangle(0, 0, hitW, hitH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
    container.add(hit);

    // -- pointer events --
    hit.on('pointerdown', (ptr) => {
        if (!container.isActive) return;
        if (overImg) { defImg?.setVisible(false); overImg.setVisible(true); }
        if (container._onEvent) {
            container._onEvent({ phase: 'press', target: container, x: ptr.x, y: ptr.y, id });
        } else if (container._onPress) {
            container._onPress(ptr);
        }
    });

    hit.on('pointerup', (ptr) => {
        if (!container.isActive) return;
        if (overImg) { defImg?.setVisible(true); overImg.setVisible(false); }
        if (container._onEvent) {
            container._onEvent({ phase: 'release', target: container, x: ptr.x, y: ptr.y, id });
        } else if (container._onRelease) {
            container._onRelease(ptr);
        }
    });

    hit.on('pointerout', () => {
        if (overImg) { defImg?.setVisible(true); overImg.setVisible(false); }
    });

    // -- setText helper --
    container.setText = (newText) => {
        if (container._textObj) container._textObj.setText(newText);
    };

    return container;
}

// ── newLabel ──────────────────────────────────────────────────────────────────

export function newLabel(scene, opts = {}) {
    const {
        bounds     = [0, 0, 200, 40],  // [xMin, yMin, width, height]
        text       = '',
        font       = null,
        size       = 20,
        textColor  = [255, 255, 255, 255],
        offset     = 0,
        align      = 'center',
        onPress    = null,
        onRelease  = null,
        onEvent    = null,
    } = opts;

    const [xMin, yMin, w, h] = bounds;
    const container = scene.add.container(0, 0);

    const cssColor = _colorToCss(textColor);
    const style    = {
        fontSize: `${size}px`,
        color:    cssColor,
        fontFamily: font ?? 'bold sans-serif',
        fixedWidth:  w,
        align,
    };

    let tx = xMin + w / 2;
    if (align === 'left')  tx = xMin;
    if (align === 'right') tx = xMin + w;

    const lbl = scene.add.text(tx, yMin + h / 2 + offset, text, style)
        .setOrigin(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, 0.5);
    container.add(lbl);

    // -- optional interactivity --
    if (onPress || onRelease || onEvent) {
        const hit = scene.add.rectangle(xMin + w / 2, yMin + h / 2, w, h, 0, 0)
            .setInteractive({ useHandCursor: true });
        container.add(hit);

        if (onPress)   hit.on('pointerdown', onPress);
        if (onRelease) hit.on('pointerup',   onRelease);
        if (onEvent) {
            hit.on('pointerdown', (e) => onEvent({ phase: 'press',   x: e.x, y: e.y }));
            hit.on('pointerup',   (e) => onEvent({ phase: 'release', x: e.x, y: e.y }));
        }
    }

    container.setText = (newText) => {
        lbl.setText(newText);
        // reflow x for align
        let nx = xMin + w / 2;
        if (align === 'left')  nx = xMin + lbl.displayWidth / 2;
        if (align === 'right') nx = xMin + w - lbl.displayWidth / 2;
        lbl.x = nx;
    };

    container.setTextColor = (r, g, b, a = 255) => {
        lbl.setStyle({ color: `rgba(${r},${g},${b},${a / 255})` });
    };

    return container;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function _colorToCss([r = 255, g = 255, b = 255, a = 255]) {
    return `rgba(${r},${g},${b},${a / 255})`;
}
