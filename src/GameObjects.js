import Phaser from 'phaser';
import { ANIM_STATES } from './GameLogic.js';
import { playSound } from './GameAudio.js';

function playCollide(scene) {
    if (!scene.anims.exists('collide')) return;
    if (scene.hero.anims?.currentAnim?.key === 'collide') return;
    scene.hero.play('collide');
    scene.hero.once('animationcomplete', () => {
        if (scene.hasLaunched && scene.anims.exists('fly')) scene.hero.play('fly');
    });
}

// ── Triangle staircase hitbox helper ─────────────────────────────────────────
// Approximates a right-triangle shape using N stacked axis-aligned rectangles.
// Handles all 4 standard rotations (0/90/180/270) and flipX/flipY correctly.
function spawnTriangleHitbox(scene, obj, slices, outArray, soundKey = 'stone') {
    const aDeg   = ((obj.angle % 360) + 360) % 360;
    const isRot  = (aDeg >= 45 && aDeg < 135) || (aDeg >= 225 && aDeg < 315);
    const w      = isRot ? (obj.size?.y || 24.5) : (obj.size?.x || 24.5);
    const h      = isRot ? (obj.size?.x || 24.5) : (obj.size?.y || 24.5);
    const sw     = w / slices;
    // 180° and 270° need inv (short→tall L→R); 0° and 90° are tall→short L→R
    const wantInv  = (aDeg >= 135 && aDeg < 315);
    const inv      = wantInv !== !!(obj.flipX);
    // 90° and 180° align steps to the top; 0° and 270° align to the bottom
    const wantTop  = (aDeg >= 45 && aDeg < 225);
    const alignTop = wantTop !== !!(obj.flipY);

    for (let i = 0; i < slices; i++) {
        const sh      = inv ? h * ((i + 1) / slices) : h * ((slices - i) / slices);
        const offsetY = alignTop ? 0 : Math.max(0, h - sh);
        const s = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
        s.setDisplaySize(w, h);
        s.refreshBody();
        s.body.setSize(sw, Math.max(2, sh));
        s.body.setOffset(i * sw, offsetY);
        scene.physics.add.collider(scene.hero, s, () => {
            if (scene._preStepSpeed > 100) { playSound(scene, soundKey); playCollide(scene); }
        });
        outArray.push(s);
    }
}

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

// ── Bezier path builder ───────────────────────────────────────────────────────
function buildPhaserPath(pathData) {
    if (!pathData?.curves?.length) return null;
    const p = new Phaser.Curves.Path(pathData.curves[0].startPoint.x, pathData.curves[0].startPoint.y);
    for (const c of pathData.curves) {
        if (pathData.isSimpleLine) {
            p.lineTo(c.endPoint.x, c.endPoint.y);
        } else {
            p.cubicBezierTo(
                c.endPoint.x,          c.endPoint.y,
                c.startControlPoint.x, c.startControlPoint.y,
                c.endControlPoint.x,   c.endControlPoint.y,
            );
        }
    }
    return p;
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

        magnet.isPentagon = nameLo.includes('five');
        magnet.isTriangle = nameLo.includes('tra') || nameLo.includes('tri') || nameLo.includes('three');
        magnet.isSolid    = magnet.isPentagon || magnet.isTriangle;

        if (obj.path?.curves?.length) {
            magnet.pathCurve   = buildPhaserPath(obj.path);
            magnet.pathT       = 0;
            magnet.pathDir     = 1;
            magnet.pathSpeed   = obj.path.speed ?? 1;
            magnet.pathCyclic  = obj.path.isCyclic ?? false;
            magnet.pathPingPong = !obj.path.isClosed; // open paths always ping-pong
        }

        magnets.push(magnet);
    }
    return magnets;
}

// ── Magnet path movement (call each frame with delta ms) ──────────────────────
export function updateMagnetPaths(scene, delta) {
    for (const magnet of scene.magnets) {
        if (!magnet.pathCurve) continue;
        // Stop moving only while hero is physically attached to this magnet
        if (scene.isAttached && scene.attachedMagnet === magnet) continue;

        const totalLen = magnet.pathCurve.getLength();
        if (totalLen < 1) continue;

        // speed is pixels/frame at 60 fps; normalize to actual delta
        const advance = magnet.pathSpeed * (delta / 16.667);
        magnet.pathT += (advance / totalLen) * magnet.pathDir;

        if (magnet.pathT >= 1) {
            if (magnet.pathPingPong) {
                magnet.pathT  = 2 - magnet.pathT;
                magnet.pathDir = -1;
            } else {
                magnet.pathT -= 1; // loop
            }
        } else if (magnet.pathT <= 0) {
            if (magnet.pathPingPong) {
                magnet.pathT  = -magnet.pathT;
                magnet.pathDir = 1;
            } else {
                magnet.pathT += 1;
            }
        }
        magnet.pathT = Phaser.Math.Clamp(magnet.pathT, 0, 1);

        const pt = magnet.pathCurve.getPoint(magnet.pathT);
        if (!pt) continue;

        if (magnet.body.enable) magnet.body.reset(pt.x, pt.y);
        else { magnet.x = pt.x; magnet.y = pt.y; }
        if (magnet.rangeImage)  magnet.rangeImage.setPosition(pt.x, pt.y);
        if (magnet.visualImage) magnet.visualImage.setPosition(pt.x, pt.y);
    }
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
    scene.hero.body.setBounce(0.2, 0.2);
    scene.hero.body.setFriction(0.45, 0.45);
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
        let dirX = 0, dirY = -1, zoneLen = 140;
        if (rangeObj) {
            const rdx = rangeObj.position.x - obj.position.x;
            const rdy = rangeObj.position.y - obj.position.y;
            const rdist = Math.sqrt(rdx*rdx + rdy*rdy) || 1;
            dirX = rdx / rdist;
            dirY = rdy / rdist;
            zoneLen = rdist;
        }
        const zoneW = (rangeObj?.size?.x ?? 44) / 2;
        const gfx = scene.add.graphics().setDepth(5);
        const phaseOffset = Math.random() * 1000;

        // Fan base is a static solid body in the original (LevelHelper bodyType=static)
        const bw = obj.size?.x ?? 44, bh = obj.size?.y ?? 44;
        const body = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
        body.setBodySize(bw, bh);
        body.refreshBody();
        scene.physics.add.collider(scene.hero, body);

        winds.push({
            x: obj.position.x, y: obj.position.y,
            dirX, dirY, zoneLen, zoneW,
            collided: false,
            gfx, phaseOffset,
        });
    }
    return winds;
}

// ── Wind visual animation (call each frame with scene.time.now ms) ────────────
export function updateWindVisuals(scene, now) {
    for (const wind of scene.winds) {
        const { gfx, x, y, dirX, dirY, zoneLen, zoneW, phaseOffset } = wind;
        gfx.clear();

        const px = -dirY, py = dirX; // perpendicular direction

        // Gradient column: layered alpha rects stepping along the wind axis
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const t0 = (i / steps) * zoneLen;
            const t1 = ((i + 1) / steps) * zoneLen;
            const alpha = 0.35 * (1 - i / steps);
            gfx.fillStyle(0x60b4db, alpha);
            const ax = x + dirX * t0 + px * zoneW, ay = y + dirY * t0 + py * zoneW;
            const bx = x + dirX * t0 - px * zoneW, by = y + dirY * t0 - py * zoneW;
            const cx = x + dirX * t1 - px * zoneW, cy = y + dirY * t1 - py * zoneW;
            const dx2 = x + dirX * t1 + px * zoneW, dy2 = y + dirY * t1 + py * zoneW;
            gfx.fillTriangle(ax, ay, bx, by, cx, cy);
            gfx.fillTriangle(ax, ay, cx, cy, dx2, dy2);
        }

        // Animated dashes scrolling from fan toward range
        const period = 800;
        const phase  = ((now + phaseOffset) % period) / period;
        for (let i = 0; i < 5; i++) {
            const t = ((phase + i / 5) % 1) * zoneLen;
            const lineAlpha = 0.55 * Math.sin(Math.PI * ((phase + i / 5) % 1));
            gfx.lineStyle(1.5, 0xffffff, lineAlpha);
            const pOff = (i - 2) * (zoneW * 0.35);
            const x0 = x + dirX * t      + px * pOff, y0 = y + dirY * t      + py * pOff;
            const x1 = x + dirX * (t+12) + px * pOff, y1 = y + dirY * (t+12) + py * pOff;
            gfx.beginPath();
            gfx.moveTo(x0, y0);
            gfx.lineTo(x1, y1);
            gfx.strokePath();
        }
    }
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
            spawnTriangleHitbox(scene, obj, 6, woodBlocks, 'wood');
        } else {
            const b = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
            b.setDisplaySize(w, h);
            b.refreshBody();
            scene.physics.add.collider(scene.hero, b, () => {
                if (scene._preStepSpeed > 100) {
                    playSound(scene, 'wood');
                    playCollide(scene);
                }
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
            spawnTriangleHitbox(scene, obj, 6, rockBlocks);
        } else {
            const b = scene.physics.add.staticImage(obj.position.x, obj.position.y, '__DEFAULT').setAlpha(0);
            b.setDisplaySize(w, h);
            b.refreshBody();
            scene.physics.add.collider(scene.hero, b, () => {
                if (scene._preStepSpeed > 100) {
                    playSound(scene, 'stone');
                    playCollide(scene);
                }
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
        const w = obj.size?.x || 64, h = obj.size?.y || 8;
        const angle = obj.angle || 0;

        const visual = scene.add.sprite(obj.position.x, obj.position.y, 'rubber_rubber.png')
            .setDisplaySize(w, h).setAngle(angle).setDepth(10);

        elasticBlocks.push({ visual, angle, x: obj.position.x, y: obj.position.y, w, h });
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

// ── Glass pipes ───────────────────────────────────────────────────────────────
// Physics derived from glass.pshs fixture data:
//   gol   – straight pipe, walls at y = ±(H/2 - 3) in local space (open at ends)
//   bulan – quarter-circle corner pipe, two outer wall strips + inner corner block
//   amsar – thin connector, visual only (end-cap fixtures are negligibly small)
export function spawnGlass(scene, levelData) {
    const visuals = [];
    const corners = []; // bulan curved-corner circles for manual scooping collision

    function addWall(cx, cy, w, h) {
        const b = scene.physics.add.staticImage(cx, cy, '__DEFAULT').setAlpha(0);
        b.setDisplaySize(w, h);
        b.refreshBody();
        scene.physics.add.collider(scene.hero, b, () => {
            if (scene._preStepSpeed > 100) { playSound(scene, 'glass'); playCollide(scene); }
        });
    }

    for (const obj of levelData.objects) {
        if (obj.tag !== 'GLASS') continue;
        const tex = scene.textures.get(obj.sheet);
        if (!tex) continue;
        const fn = obj.name + '_gf';
        if (!tex.has(fn)) tex.add(fn, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const spr = scene.add.sprite(obj.position.x, obj.position.y, obj.sheet, fn)
            .setAngle(obj.angle || 0)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h)
            .setDepth(5);
        if (obj.flipX) spr.setFlipX(true);
        if (obj.flipY) spr.setFlipY(true);
        visuals.push(spr);

        const x = obj.position.x, y = obj.position.y;
        const aDeg = ((obj.angle || 0) % 360 + 360) % 360;
        const a = Phaser.Math.DegToRad(aDeg);
        const ca = Math.cos(a), sa = Math.sin(a);
        const isRot = aDeg === 90 || aDeg === 270;
        const tw = (lx, ly) => ({ x: x + lx * ca - ly * sa, y: y + lx * sa + ly * ca });
        const wall = (lx, ly, lw, lh) => {
            const p = tw(lx, ly);
            addWall(p.x, p.y, isRot ? lh : lw, isRot ? lw : lh);
        };

        const spriteName = (obj.sprite || '').toLowerCase();

        if (spriteName === 'gol') {
            // Walls sit on the outer edge of the sprite, leaving the full interior clear
            const WALL_T = 4;
            const halfH = obj.size.y / 2;
            wall(0, -(halfH + WALL_T / 2), obj.size.x, WALL_T);
            wall(0, +(halfH + WALL_T / 2), obj.size.x, WALL_T);

        } else if (spriteName === 'bulan') {
            // Outer wall strips on sprite edges
            const SIZE = 48, WALL_T = 4, HALF = SIZE / 2 + WALL_T / 2;
            wall(+HALF, 0,    WALL_T, SIZE);
            wall(0,    -HALF, SIZE, WALL_T);
            // Arc guide: the inner corner of the tube channel is where the two inner wall
            // planes meet, at local (SIZE/2, -SIZE/2). The hero's path follows a quarter-
            // circle of midR ~24 around this point. update() steers them tangentially (scoop).
            const arcC = tw(SIZE / 2, -SIZE / 2);
            corners.push({ cx: arcC.x, cy: arcC.y, innerR: 4, outerR: 28 });
        }
        // amsar: visual only
    }

    return { visuals, corners };
}

// ── Portals ───────────────────────────────────────────────────────────────────
export function spawnPortals(scene, levelData) {
    const portalMap = {};

    function spawnPortalSprite(obj) {
        const tex = scene.textures.get(obj.sheet);
        const fn  = obj.name + '_pframe';
        if (tex && !tex.has(fn)) tex.add(fn, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
        const spr = scene.add.sprite(obj.position.x, obj.position.y, obj.sheet, fn)
            .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h).setDepth(12);
        if (obj.animation && scene.anims.exists(obj.animation)) spr.play(obj.animation);
        return { sprite: spr, radius: (obj.size?.x || 48) / 2, cooldown: false, pair: null };
    }

    // Spawn PORTAL-tagged entries (the "in" portals)
    for (const obj of levelData.objects.filter(o => o.tag === 'PORTAL')) {
        const entry = spawnPortalSprite(obj);
        portalMap[obj.name] = entry;
    }

    // Spawn matching "_out" portals (may be tagged DEFAULT in the level data)
    for (const baseName of Object.keys(portalMap)) {
        const outName = baseName + '_out';
        const outObj  = levelData.objects.find(o => o.name === outName);
        if (!outObj) continue;
        const outEntry = spawnPortalSprite(outObj);
        portalMap[outName] = outEntry;
        portalMap[baseName].pair = outEntry;
        outEntry.pair = portalMap[baseName];
    }

    return Object.values(portalMap);
}

// ── Robot piece collection ────────────────────────────────────────────────────
export function collectRobotPiece(scene, player, pd) {
    if (scene.isLevelComplete || pd.collected) return;
    pd.collected = true;
    playSound(scene, 'star');
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
