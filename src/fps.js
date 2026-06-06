// Corona SDK's fps.lua was a PerformanceOutput debug overlay: FPS counter, color bar, memory text.
// In Phaser, scene.game.loop.actualFps gives the live FPS; we add a DOM overlay to match.

let overlay = null;

export function showFPS(scene) {
    if (overlay) return;

    overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position:   'fixed',
        top:        '4px',
        right:      '4px',
        color:      '#fff',
        fontFamily: 'Helvetica, sans-serif',
        fontSize:   '12px',
        background: 'rgba(0,0,0,0.4)',
        padding:    '2px 6px',
        borderRadius: '3px',
        pointerEvents: 'none',
        zIndex:     '9999',
    });
    document.body.appendChild(overlay);

    scene.events.on('postupdate', () => {
        const fps = Math.floor(scene.game.loop.actualFps);
        const r   = Math.floor((60 - Math.min(fps, 60)) * 4.2);
        const g   = Math.floor(Math.min(fps, 60) * 4.2);
        overlay.style.color = `rgb(${r},${g},0)`;
        overlay.textContent = `FPS: ${fps}`;
    });
}

export function hideFPS(scene) {
    if (!overlay) return;
    scene.events.off('postupdate');
    overlay.remove();
    overlay = null;
}
