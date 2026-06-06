// Magnet / hero polarity state sequences — matches GameLogic.lua L25_1 table exactly
export const ANIM_STATES = {
    BB:  [-1, -1],
    RR:  [1, 1],
    BR:  [-1, 1, 1, 1, 1, 1, -1, -1, -1, -1],
    RB:  [1, -1, -1, -1, -1, -1, 1, 1, 1, 1],
    BZ:  [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0],
    RZ:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    ROB: [1, 0, -1],
    BOR: [-1, 0, 1],
};

export const HERO_RANGE_FRAMES = {
    '-1': 'hero_blue',
     '0': 'hero_zero',
     '1': 'hero_red',
};

export function applyMagnetForces(scene) {
    if (scene.isThrowing || scene.isAttached || scene.heroState === 0) return;
    for (const magnet of scene.magnets) {
        if (magnet.isControlling || magnet.state === 0) continue;
        const dx   = magnet.x - scene.hero.x;
        const dy   = magnet.y - scene.hero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > scene.heroRangeRadius + magnet.rangeRadius) continue;
        const interaction = scene.heroState * magnet.state;
        if (interaction === 0) continue;
        let fx = dx, fy = dy, force;
        if (interaction > 0) {
            // Repel — reverse direction; coeff=60 → force=7200/dist²
            fx = -dx; fy = -dy;
            force = 7200 / (dist * dist);
        } else {
            // Attract; coeff=40 → force=3200/dist²
            force = 3200 / (dist * dist);
            if (!scene.hero.collided) {
                scene.hero.collided  = true;
                scene.lastActivityAt = scene.time.now;
            }
            if (magnet.draggable && !scene.isAttached && dist < scene.heroRangeRadius + magnet.rangeRadius) {
                scene.isAttached         = true;
                scene.attachedMagnet     = magnet;
                scene.lastAttachedMagnet = magnet;
                scene.jointLength        = dist;
                if (scene.anims.exists('normal')) scene.hero.play('normal');
            }
        }
        // Lua: setLinearVelocity(vx/1.02) then applyForce (force applied directly, not as acceleration)
        scene.hero.body.velocity.x = scene.hero.body.velocity.x / 1.02 + fx * force;
        scene.hero.body.velocity.y = scene.hero.body.velocity.y / 1.02 + fy * force;
    }
}

export function applyMetalForces(scene) {
    // Lua: always attract hero regardless of polarity; different damping (/1.1 x, /1.01 y)
    for (const metal of scene.metals) {
        if (!metal.collided) continue;
        const dx   = metal.x - scene.hero.x;
        const dy   = metal.y - scene.hero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 1) continue;
        const force = 3200 / (dist * dist);
        scene.hero.body.velocity.x = scene.hero.body.velocity.x / 1.1  + dx * force * (1/60);
        scene.hero.body.velocity.y = scene.hero.body.velocity.y / 1.01 + dy * force * (1/60);
    }
}

export function applyWindForces(scene) {
    // Lua: pushes hero AWAY from fan position; coeff=20 → force=800/dist²
    for (const wind of scene.winds) {
        if (!wind.collided) continue;
        const dx   = scene.hero.x - wind.x;
        const dy   = scene.hero.y - wind.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 1) continue;
        const force = 800 / (dist * dist);
        scene.hero.body.velocity.x += dx * force * (1/60);
        scene.hero.body.velocity.y += dy * force * (1/60);
    }
}

export function updateCollisionFlags(scene) {
    for (const wind of scene.winds) {
        const hx    = scene.hero.x - wind.x, hy = scene.hero.y - wind.y;
        const along = hx * wind.dirX + hy * wind.dirY;
        const perp  = Math.abs(hx * wind.dirY - hy * wind.dirX);
        wind.collided = along >= -10 && along <= wind.zoneLen && perp <= wind.zoneW + scene.heroRangeRadius;
    }
    for (const metal of scene.metals) {
        const dx = metal.x - scene.hero.x, dy = metal.y - scene.hero.y;
        metal.collided = Math.sqrt(dx*dx + dy*dy) < metal.halfW + scene.heroRangeRadius;
    }
}

export function changePole(scene) {
    if (scene.dismagneted) return;
    // Lua: frame 1 (0-indexed: 0) blue → go to frame 3 (0-indexed: 2) red, and vice versa
    scene.heroAnimFrame = scene.heroAnimFrame === 0 ? 2 : 0;
    const states = ANIM_STATES[scene.heroAnimTag];
    scene.heroState = states ? states[scene.heroAnimFrame] : -1;
    scene.heroColor = scene.heroState === -1 ? 'blue' : scene.heroState === 1 ? 'red' : 'neutral';
}
