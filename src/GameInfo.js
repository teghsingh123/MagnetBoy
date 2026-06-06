// GameInfo.lua: singleton "About / Credits" overlay.
// Stacked Mongolian text labels; orange headers, blue sub-headers, white body.

const ORANGE = '#AC4100';  // rgb(172,65,0)
const BLUE   = '#0E9CF7';  // rgb(14,156,247)
const WHITE  = '#ffffff';

let instance = null;

export function showInfo(scene) {
    if (instance) { instance.setVisible(true); return; }

    const W  = scene.cameras.main.width;
    const H  = scene.cameras.main.height;
    const cx = W / 2;
    const cy = H / 2;

    const container = scene.add.container(0, 0).setDepth(100);

    // dim overlay — blocks input
    const overlay = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.7)
        .setInteractive();
    container.add(overlay);

    // scrollable credits panel
    const panelW = Math.min(W - 40, 320);
    const panelH = H - 40;
    const px = (W - panelW) / 2;
    const py = 20;

    const panel = scene.add.graphics();
    panel.fillStyle(0x111122, 0.95);
    panel.fillRoundedRect(px, py, panelW, panelH, 8);
    container.add(panel);

    let y = py + 10;
    const lx = px + 17;

    const entries = [
        { text: 'Соронзон хүү',                               color: ORANGE, size: 20 },
        { text: 'Монгол Дэнтент ХХК 2012.',                   color: WHITE,  size: 15 },
        { text: 'Бүх эрх хуулиар хамгаалагдсан.',             color: WHITE,  size: 15 },
        { gap: 10 },
        { text: 'Тэглийн зүйлхүүд',                           color: ORANGE, size: 20 },
        { text: 'Б.Алтанзаяа — ахлах зураач',                 color: BLUE,   size: 15 },
        { text: 'Б.Алтанзаяа — ахлах найруулагч',             color: WHITE,  size: 15 },
        { gap: 10 },
        { text: 'Багийн ахлагч',                               color: ORANGE, size: 20 },
        { text: 'С.Дэлгэрдалай — найруулагч',                 color: BLUE,   size: 15 },
        { text: 'З.Жавзмаа — Тэрбол',                         color: WHITE,  size: 15 },
        { text: 'Г.Ганцэцэг — тэрбол',                        color: WHITE,  size: 15 },
        { gap: 10 },
        { text: 'Багийн гишүүд',                               color: ORANGE, size: 20 },
        { text: 'Б.Мөнхбаяр — хөгжим',                        color: BLUE,   size: 15 },
        { text: 'Б.Мөнхбаяр — шалгагч',                       color: WHITE,  size: 15 },
        { text: 'Ж.Тэрболд',                                   color: WHITE,  size: 15 },
        { text: 'З.Тэрболд',                                   color: WHITE,  size: 15 },
        { gap: 10 },
        { text: 'mn.moco.game.magnetboy.mgl',                  color: BLUE,   size: 13 },
        { text: 'v1.3.3',                                      color: WHITE,  size: 13 },
    ];

    for (const entry of entries) {
        if (entry.gap) { y += entry.gap; continue; }
        const t = scene.add.text(lx, y, entry.text, {
            fontSize:    `${entry.size}px`,
            color:       entry.color,
            wordWrap:    { width: panelW - 34 },
        });
        container.add(t);
        y += t.height + 2;
        if (y > py + panelH - 20) break;
    }

    // close button
    const close = scene.add.text(px + panelW - 30, py + 6, '✕', {
        fontSize: '16px', color: WHITE,
    }).setInteractive({ useHandCursor: true })
        .on('pointerup', () => removeInfo());
    container.add(close);

    instance = container;
}

export function removeInfo() {
    if (!instance) return;
    instance.destroy(true);
    instance = null;
}
