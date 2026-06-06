// GameBubble.lua was a singleton tooltip bubble: rounded rect, semi-transparent black fill,
// white stroke, pops in from scale 0 → 1 over 500ms, anchored near a target object.

let bubble = null;

export function showBubble(scene, target, width, height, contentGroup) {
    removeBubble(scene);

    const worldH = scene.cameras.main.height;
    const halfH  = height / 2;

    // Vertical offset: clamp so bubble stays on screen
    let offsetY = 0;
    const spaceBelow = worldH - target.y;
    if (halfH > spaceBelow) {
        offsetY = halfH - spaceBelow + 10;
    } else if (target.y < halfH) {
        offsetY = target.y - halfH - 1;
    }

    const rx = target.x - target.displayWidth / 2 - 15 - width;
    const ry = target.y - halfH - offsetY;

    const rect = scene.add.graphics();
    rect.fillStyle(0x000000, 200 / 255);
    rect.strokeRoundedRect(0, 0, width, height, 10);
    rect.fillRoundedRect(0, 0, width, height, 10);
    rect.lineStyle(3, 0xffffff, 200 / 255);
    rect.strokeRoundedRect(0, 0, width, height, 10);
    rect.setPosition(rx, ry);

    if (contentGroup) {
        contentGroup.setPosition(rx, ry);
    }

    // Pop-in: scale from ~0 to 1
    rect.setScale(0.01);
    scene.tweens.add({
        targets:  rect,
        scaleX:   1,
        scaleY:   1,
        alpha:    1,
        duration: 500,
        ease:     'Back.Out',
    });

    bubble = { rect, contentGroup };
}

export function removeBubble(scene) {
    if (!bubble) return;
    bubble.rect?.destroy();
    bubble.contentGroup?.destroy();
    bubble = null;
}
