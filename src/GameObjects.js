import Phaser from 'phaser';
import { ANIM_STATES } from './GameLogic.js';

// ── Pre-pass ──────────────────────────────────────────────────────────────────
export function prepassMagnetTags(levelData) {
    const magnetAnimTags  = {};
    const magnetRangeSize = {};
    for (const obj of levelData.objects) {
        if (obj.tag !== 'MAGNET_RANGE' || obj.name === 'range_hero') continue;
        const name = obj.name.replace('range_', '');
        magnetRangeSize[name] = (obj.size?.x || 62) / 2;
        if (obj.animation) magnetAnimTags[name] = obj.animation.split('_')[0];
    }
    return { magnetAnimTags, magnetRangeSize };
}

// ── Visual-only sprites (no physics) ─────────────────────────────────────────
export function spawnVisuals(scene, levelData, magnetAnimTags, magnetRangeSize) {
    const rangeImageByMagnet  = {};
    const visualImageByMagnet = {};

    for (const obj of levelData.objects) {
        if (!obj.position || !obj.sheet || !obj.frame) continue;
        if (obj.tag === 'HERO' || obj.name === 'range_hero') continue;
        if (['STAR','ROBOT_PIECE','ELASTIC','BLACK_HOLE','DIS_MAGNETIC','PORTAL','WIND_RANGE'].includes(obj.tag)) continue;

        let { x: fx, y: fy, w: fw, h: fh } = obj.frame;

        if (obj.tag === 'MAGNET_RANGE') {
            const tag    = magnetAnimTags[obj.name.replace('range_', '')] || 'BB';
            const state0 = ANIM_STATES[tag]?.[0] ?? -1;
            fx = state0 >= 0 ? 0 : 128;
            fy = 0; fw = 62; fh = 62;
        }

        const frameName = obj.name + '_frame';
        const tex = scene.textures.get(obj.sheet);
        if (tex && !tex.has(frameName)) tex.add(frameName, 0, fx, fy, fw, fh);

        const img = scene.add.image(obj.position.x, obj.position.y, obj.sheet, frameName)
            .setScale(obj.size.x / fw, obj.size.y / fh)
            .setAlpha(obj.tag === 'MAGNET_RANGE' ? 0.4 : 1)
            .setAngle(obj.angle || 0)
            .setDepth(obj.tag === 'MAGNET_RANGE' ? 5 : 10);

        if (obj.tag === 'MAGNET_RANGE') rangeImageByMagnet[obj.name.replace('range_', '')] = img;
        if (obj.tag === 'MAGNET')       visualImageByMagnet[obj.name] = img;
    }

    return { rangeImageByMagnet, visualImageByMagnet };
}

// ── Stars ─────────────────────────────────────────────────────────────────────
export function spawnStars(scene, levelData) {
    const stars = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'STAR') continue;
        const tex = scene.textures.get(obj.sheet);
        if (tex && !tex.has(obj.name)) tex.add(obj.name, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const s = scene.add.sprite(obj.position.x, obj.position.y, obj.sheet, obj.name)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h);
        if (scene.anims.exists('star_rotate')) s.play('star_rotate');
        stars.push({ rect: s, x: obj.position.x, y: obj.position.y, radius: (obj.size?.x || 30) / 2 });
    }
    return stars;
}

// ── Robot pieces ──────────────────────────────────────────────────────────────
export function spawnRobotPieces(scene, levelData) {
    const robotPieces = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'ROBOT_PIECE') continue;
        let glowSprite = null;
        const mTex = scene.textures.get('magnet_magnet_sheets.png');
        if (mTex) {
            if (!mTex.has('yellow_glow')) mTex.add('yellow_glow', 0, 194, 129, 55, 55);
            glowSprite = scene.add.sprite(obj.position.x, obj.position.y,
                'magnet_magnet_sheets.png', 'yellow_glow').setDepth(8);
        }
        const tex = scene.textures.get(obj.sheet);
        const fn  = obj.name + '_frame';
        if (tex && !tex.has(fn)) tex.add(fn, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const piece = scene.physics.add.sprite(obj.position.x, obj.position.y, obj.sheet, fn)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h).setDepth(9);
        piece.body.setAllowGravity(false);
        robotPieces.push({
            img: piece, glow: glowSprite,
            x: obj.position.x, y: obj.position.y,
            radius: (obj.size?.x || 40) / 2,
            collected: false, sheet: obj.sheet
        });
    }
    return robotPieces;
}

// ── Magnets ───────────────────────────────────────────────────────────────────
export function spawnMagnets(scene, levelData, magnetAnimTags, magnetRangeSize, rangeImageByMagnet, visualImageByMagnet) {
    const magnets = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'MAGNET') continue;
        const magnet = scene.physics.add.image(obj.position.x, obj.position.y, '__DEFAULT');
        magnet.setDisplaySize(obj.size?.x || 32, obj.size?.y || 32);
        magnet.setImmovable(true).setAlpha(0).setDepth(15);
        magnet.body.setAllowGravity(false);
        magnet.magnetName  = obj.name;
        magnet.rangeRadius = magnetRangeSize[obj.name] ?? 31;
        // Only CIRCLE suffix magnets are draggable (slingshot) — matches Lua setAnimTag
        const nameLo = (obj.name || '').toLowerCase();
        magnet.isCircle      = nameLo.includes('circle');
        magnet.draggable     = magnet.isCircle;
        magnet.rangeImage    = rangeImageByMagnet[obj.name]  || null;
        magnet.visualImage   = visualImageByMagnet[obj.name] || null;
        magnet.animTag       = magnetAnimTags[obj.name] ?? 'BB';
        magnet.animFrame     = 0;
        magnet.state         = ANIM_STATES[magnet.animTag]?.[0] ?? -1;
        magnet.isControlling = false;
        magnets.push(magnet);
    }
    return magnets;
}

// Magnet + hero polarity ticker — 250 ms, matches Corona animation system
export function startMagnetTicker(scene) {
    scene.time.addEvent({
        delay: 250, loop: true,
        callback: () => {
            for (const m of scene.magnets) {
                const states = ANIM_STATES[m.animTag];
                if (!states) continue;
                m.animFrame = (m.animFrame + 1) % states.length;
                m.state     = states[m.animFrame];
                if (!m.rangeImage) continue;
                const frameX = m.state >= 0 ? 0 : 128;
                const fn     = `range_${m.magnetName}_${m.state >= 0 ? 'red' : 'blue'}`;
                const tex    = m.rangeImage.texture;
                if (!tex.has(fn)) tex.add(fn, 0, frameX, 0, 62, 62);
                m.rangeImage.setTexture(tex.key, fn);
            }
        }
    });
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export function spawnHero(scene, levelData) {
    const heroObj   = levelData.objects.find(o => o.tag === 'HERO');
    scene.heroStart = { x: heroObj.position.x, y: heroObj.position.y };

    scene.hero = scene.physics.add.sprite(scene.heroStart.x, scene.heroStart.y, '__DEFAULT');
    scene.hero.setDisplaySize(32, 32);
    scene.hero.setCircle(16);
    scene.hero.body.setAllowGravity(false);
    scene.hero.body.setAllowRotation(true);
    scene.hero.body.setAngularDrag(150);
    scene.hero.body.setBounce(0.1, 0.1);
    scene.hero.body.setFriction(0.2, 0.2);
    scene.hero.setDepth(10);
    scene.hero.collided   = true;
    scene.hero.isThrowing = false;

    if (heroObj.sheet && heroObj.frame) {
        const tex = scene.textures.get(heroObj.sheet);
        if (tex) {
            if (!tex.has(heroObj.name))
                tex.add(heroObj.name, 0, heroObj.frame.x, heroObj.frame.y, heroObj.frame.w, heroObj.frame.h);
            scene.hero.setTexture(heroObj.sheet, heroObj.name);
            scene.hero.setScale(heroObj.size.x / heroObj.frame.w, heroObj.size.y / heroObj.frame.h);
        }
    }
    const startAnim = heroObj.animation || 'fly';
    if (scene.anims.exists(startAnim)) scene.hero.play(startAnim);

    // Hero range circle
    const rangeObj = levelData.objects.find(o => o.name === 'range_hero');
    scene.heroAnimTag    = rangeObj?.animation ? rangeObj.animation.split('_')[0] : 'BOR';
    scene.heroAnimFrame  = 0;
    scene.heroState      = ANIM_STATES[scene.heroAnimTag]?.[0] ?? -1;
    scene.heroColor      = scene.heroState === -1 ? 'blue' : scene.heroState === 1 ? 'red' : 'neutral';
    scene.heroRangeRadius = (rangeObj?.size?.x || 64) / 2;

    if (rangeObj?.sheet && rangeObj?.frame) {
        const tex = scene.textures.get(rangeObj.sheet);
        if (tex) {
            if (!tex.has(rangeObj.name))
                tex.add(rangeObj.name, 0, rangeObj.frame.x, rangeObj.frame.y, rangeObj.frame.w, rangeObj.frame.h);
            scene.heroRange = scene.add.image(scene.heroStart.x, scene.heroStart.y,
                rangeObj.sheet, rangeObj.name).setDepth(5);
            scene.heroRange.setScale(rangeObj.size.x / rangeObj.frame.w, rangeObj.size.y / rangeObj.frame.h);
        }
    }
}

// ── Metals ────────────────────────────────────────────────────────────────────
export function spawnMetals(scene, levelData) {
    const metals = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'METAL') continue;
        const isRot = obj.angle === 90 || obj.angle === -90 || obj.angle === 270;
        const w = isRot ? (obj.size?.y || 24.5) : (obj.size?.x || 49);
        const h = isRot ? (obj.size?.x || 49)   : (obj.size?.y || 24.5);
        const b = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT')
            .setAlpha(0).setDisplaySize(w, h);
        b.body.setSize(w, h).setOffset(0, 0);
        b.refreshBody();
        scene.physics.add.collider(scene.hero, b);
        metals.push({ x: obj.position.x, y: obj.position.y + 5, halfW: Math.max(w, h) / 2, collided: false, body: b });
    }
    return metals;
}

// ── Winds ─────────────────────────────────────────────────────────────────────
export function spawnWinds(scene, levelData) {
    const winds = [];
    const windRangeMap = {};
    for (const obj of levelData.objects) {
        if (obj.tag !== 'WIND_RANGE') continue;
        windRangeMap[obj.name.replace(/^range_/, '')] = obj;
    }
    for (const obj of levelData.objects) {
        if (obj.tag !== 'WIND') continue;
        const rangeObj = windRangeMap[obj.name] || windRangeMap[obj.name.replace(/_\d+$/, '')];
        let dirX = 0, dirY = -1;
        if (rangeObj) {
            const rdx = rangeObj.position.x - obj.position.x;
            const rdy = rangeObj.position.y - obj.position.y;
            const rdist = Math.sqrt(rdx*rdx + rdy*rdy) || 1;
            dirX = rdx / rdist;
            dirY = rdy / rdist;
        }
        winds.push({ x: obj.position.x, y: obj.position.y + 5, dirX, dirY, zoneLen: 240, zoneW: 22, collided: false });
    }
    return winds;
}

// ── Wood blocks ───────────────────────────────────────────────────────────────
export function spawnWoodBlocks(scene, levelData) {
    const woodBlocks = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'WOOD') continue;
        const isRot = obj.angle === 90 || obj.angle === -90 || obj.angle === 270;
        const w = isRot ? (obj.size?.y || 24.5) : (obj.size?.x || 49);
        const h = isRot ? (obj.size?.x || 49)   : (obj.size?.y || 24.5);
        const nl = (obj.name||'').toLowerCase(), sl = (obj.sprite||'').toLowerCase();
        const fl = (obj.frame?.name||'').toLowerCase();
        const isTri = nl.includes('_1_6') || sl.includes('_1_6') || fl.includes('_1_6');

        if (isTri) {
            const slices = 4, sw = w / slices;
            let inv = obj.angle === 270 || obj.angle === -90;
            if (obj.flipX) inv = !inv;
            for (let i = 0; i < slices; i++) {
                let sh = inv ? h*((i+1)/slices) : h*((slices-i)/slices);
                if (obj.flipY) sh = h - sh;
                const s = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
                s.body.setSize(sw, Math.max(2, sh));
                s.body.setOffset(i*sw, obj.flipY ? 0 : h-sh);
                s.setDisplaySize(w, h).refreshBody();
                scene.physics.add.collider(scene.hero, s, () => {
                    if (Math.abs(scene.hero.body.velocity.x) > 5)
                        scene.hero.setAngularVelocity(scene.hero.body.velocity.x * 2);
                });
                woodBlocks.push(s);
            }
        } else {
            const b = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
            b.body.setSize(w, h).setOffset(0, 0);
            b.setDisplaySize(w, h).refreshBody();
            scene.physics.add.collider(scene.hero, b, () => {
                if (Math.abs(scene.hero.body.velocity.x) > 5)
                    scene.hero.setAngularVelocity(scene.hero.body.velocity.x * 2);
            });
            woodBlocks.push(b);
        }
    }
    return woodBlocks;
}

// ── Rock / stone blocks ───────────────────────────────────────────────────────
export function spawnRockBlocks(scene, levelData) {
    const rockBlocks = [];
    for (const obj of levelData.objects) {
        const nl = (obj.name||'').toLowerCase(), sl = (obj.sprite||'').toLowerCase();
        const sh = (obj.sheet||'').toLowerCase(), tl = (obj.tag||'').toLowerCase();
        const isRock = tl === 'stone' || obj.lhTag === 16 ||
            nl.includes('stone') || sl.includes('stone') || sh.includes('rock');
        if (!isRock) continue;
        const isRot = obj.angle === 90 || obj.angle === -90 || obj.angle === 270;
        const w = isRot ? (obj.size?.y||24.5) : (obj.size?.x||24.5);
        const h = isRot ? (obj.size?.x||24.5) : (obj.size?.y||24.5);
        const fl = (obj.frame?.name||'').toLowerCase();
        const isTri = nl.includes('_1_6')||sl.includes('_1_6')||fl.includes('_1_6')||
                      nl.includes('tri')||sl.includes('tri');

        if (isTri) {
            const slices = 6, sw = w / slices;
            let inv = obj.angle === 270 || obj.angle === -90;
            if (obj.flipX) inv = !inv;
            for (let i = 0; i < slices; i++) {
                let stepH = inv ? h*((i+1)/slices) : h*((slices-i)/slices);
                if (obj.flipY) stepH = h - stepH;
                const s = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
                s.body.setSize(sw, Math.max(2, stepH));
                s.body.setOffset(i*sw, obj.flipY ? 0 : h-stepH);
                s.setDisplaySize(w, h).refreshBody();
                scene.physics.add.collider(scene.hero, s, () => {
                    if (Math.abs(scene.hero.body.velocity.x) > 5)
                        scene.hero.setAngularVelocity(scene.hero.body.velocity.x * 2.5);
                });
                rockBlocks.push(s);
            }
        } else {
            const b = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
            b.body.setSize(w, h).setOffset(0, 0);
            b.setDisplaySize(w, h).refreshBody();
            scene.physics.add.collider(scene.hero, b, () => {
                if (Math.abs(scene.hero.body.velocity.x) > 5)
                    scene.hero.setAngularVelocity(scene.hero.body.velocity.x * 2);
            });
            rockBlocks.push(b);
        }
    }
    return rockBlocks;
}

// ── Elastic / rubber ──────────────────────────────────────────────────────────
export function spawnElastic(scene, levelData) {
    const elasticBlocks = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'ELASTIC') continue;
        const visual = scene.add.sprite(obj.position.x, obj.position.y, 'rubber_rubber.png', '01')
            .setScale(obj.size.x / 64, obj.size.y / 7.5)
            .setAngle(obj.angle || 0).setDepth(10);
        const mb = scene.matter.add.image(obj.position.x, obj.position.y, '__DEFAULT');
        mb.setDisplaySize(obj.size.x, obj.size.y).setAngle(obj.angle || 0);
        mb.setStatic(true).setAlpha(0).setFriction(0).setBounce(1.5);
        elasticBlocks.push({ matterBody: mb, visual, angle: obj.angle || 0 });
    }
    return elasticBlocks;
}

// ── Black holes ───────────────────────────────────────────────────────────────
export function spawnBlackHoles(scene, levelData) {
    const blackHoles = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'BLACK_HOLE') continue;
        const tex = scene.textures.get(obj.sheet);
        const fn  = obj.name + '_bhframe';
        if (tex && !tex.has(fn)) tex.add(fn, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const spr = scene.add.sprite(obj.position.x, obj.position.y, obj.sheet, fn)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h).setDepth(12);
        if (obj.animation && scene.anims.exists(obj.animation)) spr.play(obj.animation);
        blackHoles.push({ x: obj.position.x, y: obj.position.y, radius: (obj.size?.x || 62) / 2, sprite: spr, triggered: false });
    }
    return blackHoles;
}

// ── Dismagnets ────────────────────────────────────────────────────────────────
export function spawnDismagnets(scene, levelData) {
    const dismagnets = [];
    for (const obj of levelData.objects) {
        if (obj.tag !== 'DIS_MAGNETIC') continue;
        const tex = scene.textures.get(obj.sheet);
        const fn  = obj.name + '_dmframe';
        if (tex && !tex.has(fn)) tex.add(fn, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const spr = scene.add.sprite(obj.position.x, obj.position.y, obj.sheet, fn)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h)
            .setAngle(obj.angle || 0).setDepth(12);
        if (obj.animation && scene.anims.exists(obj.animation)) spr.play(obj.animation);
        const hw = Math.max(obj.size?.x || 19, obj.size?.y || 83) / 2;
        dismagnets.push({ x: obj.position.x, y: obj.position.y, hw, sprite: spr, active: true });
    }
    return dismagnets;
}

// ── Portals ───────────────────────────────────────────────────────────────────
export function spawnPortals(scene, levelData) {
    const portals = [];
    for (const obj of levelData.objects.filter(o => o.tag === 'PORTAL')) {
        const tex = scene.textures.get(obj.sheet);
        const fn  = obj.name + '_pframe';
        if (tex && !tex.has(fn)) tex.add(fn, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const spr = scene.add.sprite(obj.position.x, obj.position.y, obj.sheet, fn)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h).setDepth(12);
        if (obj.animation && scene.anims.exists(obj.animation)) spr.play(obj.animation);
        portals.push({ x: obj.position.x, y: obj.position.y, radius: (obj.size?.x || 48) / 2, sprite: spr, cooldown: false });
    }
    for (let i = 0; i < portals.length; i++)
        portals[i].pair = portals.length > 1 ? portals[(i + 1) % portals.length] : null;
    return portals;
}

// ── Robot piece collection ────────────────────────────────────────────────────
export function collectRobotPiece(scene, player, pd) {
    if (scene.isLevelComplete || pd.collected) return;
    pd.collected = true;
    if (pd.img)  pd.img.disableBody(true, true);
    if (pd.glow) pd.glow.destroy();

    const xOff = [-10, 10, -20], yOff = [-20, 0, 20], rot = [0, 45, -45];
    for (let i = 0; i < 3; i++) {
        const bs = scene.add.sprite(pd.x + xOff[i], pd.y + yOff[i], pd.sheet)
            .setScale(1.5).setBlendMode(Phaser.BlendModes.ADD)
            .setAngle(rot[i]).setDepth(50);
        const ak = scene.anims.exists('star_burst') ? 'star_burst'
                 : scene.anims.exists('star_pick')  ? 'star_pick' : null;
        if (ak) { bs.play(ak); bs.once('animationcomplete', () => bs.destroy()); }
        else scene.time.delayedCall(500, () => bs.destroy());
    }

    if (scene.robotPieces.filter(p => !p.collected).length === 0) {
        scene.isLevelComplete = true;
        if (player.body) {
            player.body.setVelocity(0, 0);
            if (typeof player.body.setAllowGravity === 'function')
                player.body.setAllowGravity(false);
        }
        scene.time.delayedCall(1000, () => {
            scene.hero?.destroy();
            scene.heroRange?.destroy();
            scene.magnets.forEach(m => { m.rangeImage?.destroy(); m.visualImage?.destroy(); m.destroy(); });
            scene.magnets = [];
            scene.woodBlocks.forEach(b => b?.destroy()); scene.woodBlocks = [];
            scene.rockBlocks.forEach(b => b?.destroy()); scene.rockBlocks = [];
            scene.stars.forEach(s => s.rect?.destroy());  scene.stars = [];
            scene.showWin();
        });
    }
}
