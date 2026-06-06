// GameExitDialog.lua: singleton "quit game?" confirmation dialog.
// Shows a dim overlay, dialog_bg image, Mongolian "Гарах？" label, yes/no buttons.

const W = 240;
const H = 120;

let instance = null;

export function showExitDialog(scene) {
    if (instance) { instance.setVisible(true); return; }

    const cx = scene.cameras.main.width  / 2;
    const cy = scene.cameras.main.height / 2;

    const container = scene.add.container(0, 0).setDepth(100);

    // Full-screen dim overlay — blocks input beneath
    const overlay = scene.add.rectangle(cx, cy,
        scene.cameras.main.width, scene.cameras.main.height,
        0x000000, 100 / 255)
        .setInteractive();

    // Dialog background
    const bg = scene.add.image(cx, cy, 'dialog_bg')
        .setDisplaySize(W, H);

    // "Гарах？" — "Exit?" in Mongolian
    const msg = scene.add.text(cx - W / 2 + 30, cy - H / 2 + 20,
        'Гарах？', { fontSize: '16px', color: '#ffffff' });

    // Yes button
    const yesBtn = scene.add.image(cx - W / 2 + 50, cy + H / 2 - 30, 'buttons_sheet', 'quit_yes')
        .setDisplaySize(40, 40)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => { window.close(); });

    // No button
    const noBtn = scene.add.image(cx + W / 2 - 50, cy + H / 2 - 30, 'buttons_sheet', 'quit_no')
        .setDisplaySize(40, 40)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => hideExitDialog());

    container.add([overlay, bg, msg, yesBtn, noBtn]);
    instance = container;
}

export function hideExitDialog() {
    if (!instance) return;
    instance.destroy(true);
    instance = null;
}
