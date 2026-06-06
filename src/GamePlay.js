import { ANIM_STATES } from './GameLogic.js';
import { changePole }  from './GameLogic.js';

// ── First launch: direct aim-and-shoot from hero's spawn position ─────────────

function launchDirect(scene, pointer) {
    const wx = pointer.x + scene.cameras.main.scrollX;
    const wy = pointer.y + scene.cameras.main.scrollY;
    // Drag back = launch in opposite direction (slingshot: hero goes away from pointer)
    const dx = scene.hero.x - wx;
    const dy = scene.hero.y - wy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const pr = Math.min(dist, 150) / 150;
    scene.hero.body.setVelocity(dx * 5.72 * pr, dy * 5.72 * pr);
    scene.hero.body.setAllowGravity(true);
    scene.hasLaunched = true;
    scene.isThrowing  = true;
    scene.time.delayedCall(500, () => { scene.isThrowing = false; });
}

// ── Magnet slingshot launch ───────────────────────────────────────────────────

function launchFromMagnet(scene, pointer) {
    const heroDx = scene.hero.x - scene.lastAttachedMagnet.x;
    const heroDy = scene.hero.y - scene.lastAttachedMagnet.y;
    const wx     = pointer.x + scene.cameras.main.scrollX;
    const wy     = pointer.y + scene.cameras.main.scrollY;
    const pDist  = Math.sqrt((wx - scene.lastAttachedMagnet.x)**2 + (wy - scene.lastAttachedMagnet.y)**2);
    const pr     = Math.min(pDist, 80) / Math.max(scene.lastAttachedMagnet.rangeRadius, 1);

    scene.hero.body.setVelocity(heroDx * 5.72 * pr, heroDy * 5.72 * pr);
    scene.hero.body.setAllowGravity(true);
    scene.hasLaunched = true;

    // isThrowing cooldown — matches Lua: timer.performWithDelay(300/power_ratio, ...)
    scene.isThrowing = true;
    const delay = pr > 0 ? Math.min(300 / pr, 3000) : 3000;
    scene.time.delayedCall(delay, () => { scene.isThrowing = false; });

    const launched = scene.lastAttachedMagnet;
    launched.isControlling = true;
    scene.time.delayedCall(3000, () => { launched.isControlling = false; });
}

// ── Release handler ───────────────────────────────────────────────────────────

function handleRelease(scene, pointer) {
    scene.isDragging = false;
    scene.trajectoryGraphics.clear();

    const dragDist = Math.sqrt(
        (pointer.x - scene.dragStart.x)**2 + (pointer.y - scene.dragStart.y)**2
    );

    // Short tap = polarity change only when attached to a magnet (not mid-air, not first launch)
    if (dragDist < 5) {
        const wasAttached    = scene.isAttached;
        scene.isAttached     = false;
        scene.attachedMagnet = null;
        if (scene.hasLaunched && wasAttached) changePole(scene);
        return;
    }

    const wasFirstLaunch = !scene.hasLaunched;

    if (wasFirstLaunch) {
        // First launch: drag back = shoot in opposite direction (slingshot feel)
        launchDirect(scene, pointer);
    } else if (scene.lastAttachedMagnet) {
        launchFromMagnet(scene, pointer);
    }

    scene.isAttached         = false;
    scene.attachedMagnet     = null;
    scene.lastAttachedMagnet = null;
    if (!wasFirstLaunch) changePole(scene);
}

// ── Input setup ───────────────────────────────────────────────────────────────

export function setupInput(scene) {
    scene.input.on('pointerdown', (pointer) => {
        if (scene.isLevelComplete) return;
        scene.isDragging = true;
        scene.dragStart  = { x: pointer.x, y: pointer.y };

        // First launch: hero stays frozen, no magnet needed — just start aiming
        if (!scene.hasLaunched) return;

        const wx = pointer.x + scene.cameras.main.scrollX;
        const wy = pointer.y + scene.cameras.main.scrollY;

        // If already attached (auto-attached by magnetic force), freeze and hold
        if (scene.isAttached && scene.attachedMagnet) {
            scene.lastAttachedMagnet = scene.attachedMagnet;
            scene.hero.body.setVelocity(0, 0);
            scene.hero.body.setAllowGravity(false);
            return;
        }

        // Find the nearest draggable magnet whose range circle contains the pointer
        // AND the hero is physically within attraction range of.
        let bestMagnet = null, bestDist = Infinity;
        for (const m of scene.magnets) {
            if (!m.draggable || m.isControlling) continue;
            const mx = wx - m.x, my = wy - m.y;
            const pDist = Math.sqrt(mx*mx + my*my);
            if (pDist > scene.heroRangeRadius + m.rangeRadius) continue;
            const hx = scene.hero.x - m.x, hy = scene.hero.y - m.y;
            if (Math.sqrt(hx*hx + hy*hy) > scene.heroRangeRadius + m.rangeRadius) continue;
            if (pDist < bestDist) { bestDist = pDist; bestMagnet = m; }
        }
        if (bestMagnet) {
            const hx = scene.hero.x - bestMagnet.x, hy = scene.hero.y - bestMagnet.y;
            scene.isAttached         = true;
            scene.attachedMagnet     = bestMagnet;
            scene.lastAttachedMagnet = bestMagnet;
            scene.jointLength        = Math.max(Math.sqrt(hx*hx + hy*hy), 5);
            scene.hero.collided      = true;
            scene.hero.body.setVelocity(0, 0);
            scene.hero.body.setAllowGravity(false);
        }
    });

    scene.input.on('pointerup',        (p) => { if (scene.isDragging) handleRelease(scene, p); });
    scene.input.on('pointerupoutside', (p) => { if (scene.isDragging) handleRelease(scene, p); });
}
