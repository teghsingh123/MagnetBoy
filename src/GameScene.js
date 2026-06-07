import Phaser from 'phaser';
import animations from './assets/animations.json';
import { allFrames } from './GameUtil.js';
import { getLevel } from './GameLevel.js';
import { ANIM_STATES, HERO_RANGE_FRAMES, applyMagnetForces, applyMetalForces, applyWindForces, updateCollisionFlags } from './GameLogic.js';
import { setupInput } from './GamePlay.js';
import { createBackground } from './GameBG.js';
import {
    prepassMagnetTags, spawnVisuals, spawnStars, spawnRobotPieces,
    spawnMagnets, startMagnetTicker, updateMagnetPaths, spawnHero, spawnMetals, spawnWinds,
    spawnWoodBlocks, spawnRockBlocks, spawnElastic,
    spawnBlackHoles, spawnDismagnets, spawnPortals, collectRobotPiece
} from './GameObjects.js';
import { createHUD } from './GameButtons.js';
import { showFail, showWin } from './GamePlayDialog.js';
import { preloadAudio, playGameBG, stopGameBG, playSound } from './GameAudio.js';
import { setupCamera, followHero } from './camera.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    init(data) {
        this.currentWorld = data.world || 1;
        this.currentLevel = data.level || 1;

        this.hero          = null;
        this.heroRange     = null;
        this.heroStart     = { x: 0, y: 0 };
        this.heroAnimTag   = 'BOR';
        this.heroAnimFrame = 0;
        this.heroState     = -1;
        this.heroColor     = 'blue';

        this.isDragging         = false;
        this.dragStart          = { x: 0, y: 0 };
        this.trajectoryGraphics = null;

        this.isAttached         = false;
        this.attachedMagnet     = null;
        this.lastAttachedMagnet = null;
        this.jointLength        = 0;
        this.isThrowing         = false;
        this.manuallyGrabbed    = false;

        this.lastActivityAt  = null;
        this.inactivityTimer = null;

        this.magnets       = [];
        this.metals        = [];
        this.winds         = [];
        this.stars         = [];
        this.starCount     = 0;
        this.robotPieces   = [];
        this.woodBlocks    = [];
        this.rockBlocks    = [];
        this.elasticBlocks = [];
        this.blackHoles    = [];
        this.dismagnets    = [];
        this.portals       = [];

        this.dismagneted         = false;
        this.dismagnedSavedFrame = 0;

        this.isLevelComplete = false;
        this.wonAlready      = false;
        this.failShown       = false;
        this.hasLaunched     = false;
    }

    // ── Preload ───────────────────────────────────────────────────────────────
    preload() {
        this.load.image('dialog_bg',     '/assets/ui/dialog_bg.png');
        this.load.image('buttons_sheet', '/assets/sprites/buttons_sheet.png');

        for (let col = 1; col <= 5; col++)
            for (let row = 1; row <= 2; row++)
                this.load.image(`bg${col}_${row}`, `/assets/bg/${this.currentWorld}/bg-x25-${col}-${row}.png`);

        const sheets = new Set();
        for (const obj of getLevel(this.currentWorld, this.currentLevel).objects)
            if (obj.sheet) sheets.add(obj.sheet);
        for (const sheet of sheets)
            this.load.image(sheet, `/assets/sprites/${sheet}`);

        [
            'robotpack1_robotpack1.png', 'robotpack2_robotpack2.png',
            'robotpack3_UntitledSheet.png', 'robotpack4_UntitledSheet.png',
            'blackhole_blackholesheet.png', 'dismagnet_dismagnet.png',
            'portal_portalgreen.png', 'portal_portalyellow.png', 'glass_glass.png',
            'rubber_rubber.png',
        ].forEach(s => { if (!sheets.has(s)) this.load.image(s, `/assets/sprites/${s}`); });

        preloadAudio(this);
    }

    // ── Create ────────────────────────────────────────────────────────────────
    create() {
        setupCamera(this, 960, 440);
        this.physics.world.setBounds(0, -60, 960, 440);

        createBackground(this);
        playGameBG(this);

        // Register Phaser animations from animations.json
        for (const [animName, animData] of Object.entries(animations)) {
            if (this.anims.exists(animName)) continue;
            const frameConfig = animData.frames.map(frameName => {
                const f = allFrames[frameName];
                if (!f) return null;
                const tex = this.textures.get(animData.sheet);
                if (!tex) return null;
                if (!tex.has(frameName)) tex.add(frameName, 0, f.x, f.y, f.w, f.h);
                return { key: animData.sheet, frame: frameName };
            }).filter(Boolean);
            if (frameConfig.length === 0) continue;
            this.anims.create({ key: animName, frames: frameConfig, frameRate: animData.frameRate, repeat: animData.loop ? -1 : 0 });
        }

        // Register hero range frames
        ['hero_blue', 'hero_zero', 'hero_red'].forEach(name => {
            const f = allFrames[name];
            if (!f) return;
            const tex = this.textures.get('hero_hero_sheet.png');
            if (tex && !tex.has(name)) tex.add(name, 0, f.x, f.y, f.w, f.h);
        });

        const levelData = getLevel(this.currentWorld, this.currentLevel);
        const { magnetAnimTags, magnetRangeSize } = prepassMagnetTags(levelData);
        const { rangeImageByMagnet, visualImageByMagnet } = spawnVisuals(this, levelData, magnetAnimTags, magnetRangeSize);

        this.stars       = spawnStars(this, levelData);
        this.robotPieces = spawnRobotPieces(this, levelData);
        this.magnets     = spawnMagnets(this, levelData, magnetAnimTags, magnetRangeSize, rangeImageByMagnet, visualImageByMagnet);
        startMagnetTicker(this);

        // Hero must exist before metals/wood/stone (they register colliders against it)
        spawnHero(this, levelData);

        this.metals        = spawnMetals(this, levelData);
        this.winds         = spawnWinds(this, levelData);
        this.woodBlocks    = spawnWoodBlocks(this, levelData);
        this.rockBlocks    = spawnRockBlocks(this, levelData);
        this.elasticBlocks = spawnElastic(this, levelData);
        this.blackHoles    = spawnBlackHoles(this, levelData);
        this.dismagnets    = spawnDismagnets(this, levelData);
        this.portals       = spawnPortals(this, levelData);

        this.physics.add.overlap(
            this.hero,
            this.robotPieces.map(p => p.img).filter(i => i?.active),
            (hero, sprite) => {
                const pd = this.robotPieces.find(p => p.img === sprite);
                if (pd && !pd.collected) collectRobotPiece(this, hero, pd);
            }, null, this
        );

        followHero(this, this.hero);
        this.trajectoryGraphics = this.add.graphics();
        createHUD(this);
        setupInput(this);
    }

    // ── Update ────────────────────────────────────────────────────────────────
    update() {
        if (this.isLevelComplete || !this.hero?.body) return;

        updateMagnetPaths(this, this.game.loop.delta);

        // Elastic bounce — proximity + angle-aware reflection
        for (const el of this.elasticBlocks) {
            const a    = Phaser.Math.DegToRad(el.angle);
            const dx   = this.hero.x - el.x, dy = this.hero.y - el.y;
            const along = dx*Math.cos(a) + dy*Math.sin(a);
            const perp  = dx*-Math.sin(a) + dy*Math.cos(a);
            if (Math.abs(along) < el.w/2 && Math.abs(perp) < 14 && !el.bouncing) {
                el.bouncing = true;
                playSound(this, 'elastic');
                if (this.anims.exists('rubber_bounce')) el.visual.play('rubber_bounce');
                const nx = -Math.sin(a), ny = Math.cos(a);
                const vx = this.hero.body.velocity.x, vy = this.hero.body.velocity.y;
                const dot = vx*nx + vy*ny;
                this.hero.body.velocity.x = (vx - 2*dot*nx) * 1.5;
                this.hero.body.velocity.y = (vy - 2*dot*ny) * 1.5;
                this.time.delayedCall(300, () => { el.bouncing = false; });
            }
        }

        // Hero range circle — track position and colour
        if (this.heroRange) {
            this.heroRange.setPosition(this.hero.x, this.hero.y);
            const frameName = HERO_RANGE_FRAMES[String(this.heroState)] || 'hero_blue';
            const tex = this.textures.get('hero_hero_sheet.png');
            if (tex?.has(frameName)) this.heroRange.setTexture('hero_hero_sheet.png', frameName);
        }

        // Constrain orbit while attached to a circle magnet
        if (this.isAttached && this.attachedMagnet) {
            const dx   = this.hero.x - this.attachedMagnet.x;
            const dy   = this.hero.y - this.attachedMagnet.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            this.hero.body.setVelocity(this.hero.body.velocity.x * 0.95, this.hero.body.velocity.y * 0.95);
            const targetAngle = Math.atan2(dy, dx);
            let lerpAngle = targetAngle;
            if (dist > this.jointLength) {
                const curAngle = Math.atan2(this.hero.y - this.attachedMagnet.y, this.hero.x - this.attachedMagnet.x);
                lerpAngle = Phaser.Math.Angle.RotateTo(curAngle, targetAngle, 0.25);
                this.hero.x = this.attachedMagnet.x + Math.cos(lerpAngle) * this.jointLength;
                this.hero.y = this.attachedMagnet.y + Math.sin(lerpAngle) * this.jointLength;
            }
            if (dist < 18 && dist > 0) {
                this.hero.x = this.attachedMagnet.x + Math.cos(lerpAngle) * 18;
                this.hero.y = this.attachedMagnet.y + Math.sin(lerpAngle) * 18;
            }
        }

        // Dragging: orbit + trajectory preview
        if (this.isDragging) {
            // First launch: hero stays frozen, show ballistic trajectory toward pointer
            if (!this.hasLaunched) {
                const wx = this.input.activePointer.x + this.cameras.main.scrollX;
                const wy = this.input.activePointer.y + this.cameras.main.scrollY;
                const dx = this.hero.x - wx, dy = this.hero.y - wy;
                const dist = Math.hypot(dx, dy);
                const pr = dist > 0 ? Math.min(dist, 150) / 150 : 0;
                const vx = dx * 5.72 * pr, vy = dy * 5.72 * pr;
                const dotColor = this.heroState === 1 ? 0xff2600 : 0x0050ff;
                const sizes = [1, 2, 3, 4];
                let di = 0;
                this.trajectoryGraphics.clear();
                for (let t = 0; t < 1.5; t += 0.08) {
                    this.trajectoryGraphics.fillStyle(dotColor, 0.8);
                    this.trajectoryGraphics.fillCircle(
                        this.hero.x + vx*t,
                        this.hero.y + vy*t + 0.5*294*t*t,
                        sizes[di++ % 4]
                    );
                }
                return;
            }

            if (this.isAttached && this.attachedMagnet) {
                const wx   = this.input.activePointer.x + this.cameras.main.scrollX;
                const wy   = this.input.activePointer.y + this.cameras.main.scrollY;
                const dist = Math.sqrt((wx - this.attachedMagnet.x)**2 + (wy - this.attachedMagnet.y)**2);
                const angle = Math.atan2(wy - this.attachedMagnet.y, wx - (this.attachedMagnet.x + dist)) * 2;
                this.hero.x = this.attachedMagnet.x + Math.cos(angle) * this.jointLength;
                this.hero.y = this.attachedMagnet.y + Math.sin(angle) * this.jointLength;

                if (wx > this.attachedMagnet.x) {
                    if (this.anims.exists('prepare_left') && this.hero.anims?.currentAnim?.key !== 'prepare_left')
                        this.hero.play('prepare_left');
                } else {
                    if (this.anims.exists('prepare_right') && this.hero.anims?.currentAnim?.key !== 'prepare_right')
                        this.hero.play('prepare_right');
                }
            }

            this.trajectoryGraphics.clear();
            if (this.isAttached && this.attachedMagnet) {
                const heroDx = this.hero.x - this.attachedMagnet.x;
                const heroDy = this.hero.y - this.attachedMagnet.y;
                const wx     = this.input.activePointer.x + this.cameras.main.scrollX;
                const wy     = this.input.activePointer.y + this.cameras.main.scrollY;
                const pDist  = Math.sqrt((wx-this.attachedMagnet.x)**2+(wy-this.attachedMagnet.y)**2);
                const pr     = Math.min(pDist, 80) / Math.max(this.attachedMagnet.rangeRadius, 1);
                const vx     = heroDx * 5.72 * pr;
                const vy     = heroDy * 5.72 * pr;
                // Show trajectory in NEXT hero polarity colour (after changePole fires on launch)
                const nextFrame = this.heroAnimFrame === 0 ? 2 : 0;
                const heroStates = ANIM_STATES[this.heroAnimTag];
                const nextState  = heroStates ? (heroStates[nextFrame] ?? -1) : -1;
                const dotColor   = nextState === 1 ? 0xff2600 : 0x0050ff;
                const sizes = [1, 2, 3, 4];
                let di = 0;
                for (let t = 0; t < 1.5; t += 0.08) {
                    this.trajectoryGraphics.fillStyle(dotColor, 0.8);
                    this.trajectoryGraphics.fillCircle(
                        this.hero.x + vx*t,
                        this.hero.y + vy*t + 0.5*294*t*t,
                        sizes[di++ % 4]
                    );
                }
            }
            return;
        }

        // Inactivity failsafe — Lua: after 5s still while collided → play "free" animation
        if (this.hero.collided) {
            const still = this.hero.body.velocity.x === 0 && this.hero.body.velocity.y === 0;
            if (still) {
                if (!this.inactivityTimer) this.inactivityTimer = this.time.now;
                else if (this.time.now - this.inactivityTimer > 5000) {
                    this.inactivityTimer = null;
                    playSound(this, 'yawn');
                    this.hero.setAngle(0).setAngularVelocity(0);
                    if (this.anims.exists('free')) this.hero.play('free');
                }
            } else { this.inactivityTimer = null; }
        }

        updateMagnetPaths(this, this.game.loop.delta);
        applyMetalForces(this);
        applyWindForces(this);

        // Sound on first frame of wind/metal contact
        const prevWindContact  = this._windContacted;
        const prevMetalContact = this._metalContacted;
        updateCollisionFlags(this);
        this._windContacted  = this.winds.some(w => w.collided);
        this._metalContacted = this.metals.some(m => m.collided);
        if (!prevWindContact  && this._windContacted)  playSound(this, 'wind');
        if (!prevMetalContact && this._metalContacted) playSound(this, 'metal');

        // Star collection
        for (const star of this.stars) {
            if (star.collected) continue;
            const dx = this.hero.x - star.x, dy = this.hero.y - star.y;
            if (Math.sqrt(dx*dx + dy*dy) < star.radius + 16) {
                star.collected = true;
                playSound(this, 'star');
                if (this.anims.exists('star_pick')) {
                    star.rect.play('star_pick');
                    star.rect.once('animationcomplete', () => star.rect.setVisible(false));
                } else { star.rect.setVisible(false); }
                this.starCount++;
                const sf = `bigstar${Math.min(this.starCount, 3)}`;
                if (this.hudStar && allFrames[sf]) this.hudStar.setTexture('buttons_sheet', sf);
            }
        }

        if (this.failShown || this.wonAlready) return;

        // Black holes — hero enters → suck in then fail
        for (const bh of this.blackHoles) {
            if (bh.triggered) continue;
            const dx = this.hero.x - bh.x, dy = this.hero.y - bh.y;
            if (Math.sqrt(dx*dx + dy*dy) < bh.radius + 14) {
                bh.triggered = true;
                this.isLevelComplete = true;
                playSound(this, 'blackhole');
                if (this.hero.body) this.hero.body.setVelocity(0, 0);
                this.tweens.add({ targets: this.hero, x: bh.x, y: bh.y, alpha: 0, duration: 500,
                    onComplete: () => this.showFail() });
                if (this.heroRange) this.heroRange.setVisible(false);
            }
        }

        // Dismagnets — force neutral state while in contact, restore after 1s
        if (!this.dismagneted) {
            for (const dm of this.dismagnets) {
                if (!dm.active) continue;
                const dx = this.hero.x - dm.x, dy = this.hero.y - dm.y;
                if (Math.sqrt(dx*dx + dy*dy) < dm.hw + 14) {
                    playSound(this, 'dismagnet');
                    this.dismagneted         = true;
                    this.dismagnedSavedFrame = this.heroAnimFrame;
                    this.heroAnimFrame       = 1;
                    this.heroState           = 0;
                    this.heroColor           = 'neutral';
                    this.time.delayedCall(1000, () => {
                        if (!this.dismagneted) return;
                        this.dismagneted   = false;
                        this.heroAnimFrame = this.dismagnedSavedFrame;
                        const hs = ANIM_STATES[this.heroAnimTag];
                        if (hs) this.heroState = hs[this.heroAnimFrame];
                        this.heroColor = this.heroState === -1 ? 'blue' : this.heroState === 1 ? 'red' : 'neutral';
                    });
                    break;
                }
            }
        }

        // Portals — teleport hero to paired portal with same velocity
        for (const portal of this.portals) {
            if (portal.cooldown || !portal.pair) continue;
            const dx = this.hero.x - portal.x, dy = this.hero.y - portal.y;
            if (Math.sqrt(dx*dx + dy*dy) < portal.radius + 14) {
                portal.cooldown = portal.pair.cooldown = true;
                playSound(this, 'portal');
                const vx = this.hero.body.velocity.x, vy = this.hero.body.velocity.y;
                this.hero.setVisible(false);
                if (this.heroRange) this.heroRange.setVisible(false);
                this.time.delayedCall(200, () => {
                    if (!this.hero?.active || !this.hero.body) return;
                    this.hero.x = portal.pair.x;
                    this.hero.y = portal.pair.y;
                    if (this.heroRange) {
                        this.heroRange.x = portal.pair.x;
                        this.heroRange.y = portal.pair.y;
                        this.heroRange.setVisible(true);
                    }
                    this.hero.setVisible(true);
                    this.hero.body.setVelocity(vx, vy);
                    this.time.delayedCall(500, () => { portal.cooldown = portal.pair.cooldown = false; });
                });
                break;
            }
        }

        // Out-of-bounds — Lua: y < -20 or y > contentHeight + 20 → fail()
        if ((this.hero.y > 380 || this.hero.y < -60) && !this.failShown) {
            this.isLevelComplete = true;
            this.showFail();
        }
    }

    showFail() { stopGameBG(this); playSound(this, 'fail'); showFail(this); }
    showWin()  { stopGameBG(this); playSound(this, 'win');  showWin(this);  }
}
