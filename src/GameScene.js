import Phaser from 'phaser';

import allFrames from '../public/assets/all_frames.json';
import animations from '../public/assets/animations.json';

const levels = import.meta.glob('../levels/*.json', { eager: true });

function getLevel(world, level) {
    const key = `../levels/level_${world}_${level}.json`;
    return levels[key]?.default || levels[key];
}

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.currentWorld = data.world || 1;
        this.currentLevel = data.level || 1;
        this.hero = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.heroStart = { x: 0, y: 0 };
        this.trajectoryGraphics = null;
        this.heroRange = null;
        this.hasLaunched = false;
        this.magnets = [];
        this.heroColor = 'blue';
        this.isAttached = false;
        this.attachedMagnet = null;
        this.jointLength = 0;
        this.lastAttachedMagnet = null;
        this.stars = [];
        this.starCount = 0;
        this.wonAlready = false;
        this.robotPieces = [];
        this.robotPiecesCollected = 0;
    }

    preload() {
        this.load.image('dialog_bg', '/assets/ui/dialog_bg.png');


        for (let col = 1; col <= 5; col++) {
            for (let row = 1; row <= 2; row++) {
                this.load.image(`bg${col}_${row}`, `/assets/bg/${this.currentWorld}/bg-x25-${col}-${row}.png`);
            }
        }

        const sheets = new Set();
        for (const obj of getLevel(this.currentWorld, this.currentLevel).objects) {
            if (obj.sheet) sheets.add(obj.sheet);
        }
        for (const sheet of sheets) {
            this.load.image(sheet, `/assets/${sheet}`);
        }

        this.load.image('star_sheet', '/assets/star_sheet.png');

        this.load.image('robotpack1_robotpack1.png', '/assets/robotpack1_robotpack1.png');

    }

    create() {
        this.cameras.main.setBounds(0, 0, 960, 320);
        this.physics.world.setBounds(0, 0, 960, 320);

        const colWidths = [1024, 256, 512, 512, 96];
        const rowHeights = [512, 288];
        const scale = 0.4;

        let xPos = 0;
        for (let col = 0; col < 5; col++) {
            let yPos = 0;
            for (let row = 0; row < 2; row++) {
                const tile = this.add.image(xPos, yPos, `bg${col + 1}_${row + 1}`).setOrigin(0, 0);
                tile.setScale(scale);
                yPos += rowHeights[row] * scale;
            }
            xPos += colWidths[col] * scale;
        }


        // Register animations
        for (const [animName, animData] of Object.entries(animations)) {
            const frameConfig = animData.frames.map(frameName => {
                const f = allFrames[frameName];
                if (!f) return null;
                const texture = this.textures.get(animData.sheet);
                if (!texture.has(frameName)) {
                    texture.add(frameName, 0, f.x, f.y, f.w, f.h);
                }
                return { key: animData.sheet, frame: frameName };
            }).filter(Boolean);

            this.anims.create({
                key: animName,
                frames: frameConfig,
                frameRate: animData.frameRate,
                repeat: animData.loop ? -1 : 0
            });
        }


        const levelData = getLevel(this.currentWorld, this.currentLevel);

        const magnetColors = {};
        for (const obj of levelData.objects) {
            if (obj.tag === 'MAGNET_RANGE') {
                const anim = obj.animation || '';
                const color = anim.startsWith('RR') ? 'red' : 'blue';
                const magnetName = obj.name.replace('range_', '');
                magnetColors[magnetName] = color;
            }
        }

        for (const obj of levelData.objects) {
            if (!obj.position || obj.tag === 'HERO' || obj.name === 'range_hero') continue;
            if (!obj.sheet || !obj.frame) continue;
            if (obj.tag === 'STAR') continue; // skip - handled separately
            if (obj.tag === 'ROBOT_PIECE') continue; // skip - handled separately

            let frameX = obj.frame.x;
            let frameY = obj.frame.y;
            let frameW = obj.frame.w;
            let frameH = obj.frame.h;

            if (obj.tag === 'MAGNET_RANGE' && obj.name !== 'range_hero') {
                if (obj.animation?.startsWith('BB')) {
                    frameX = 128; // blue frame
                } else {
                    frameX = 0; // red frame
                }
                frameY = 0;
                frameW = 62;
                frameH = 62;
            }
            
            const frameName = obj.name + '_frame';
            const texture = this.textures.get(obj.sheet);
            if (!texture.has(frameName)) {
                texture.add(frameName, 0, frameX, frameY, frameW, frameH);
            }

            this.add.image(
                obj.position.x,
                320 - obj.position.y,
                obj.sheet,
                frameName
            )
            .setScale(obj.size.x / frameW, obj.size.y / frameH)
            .setAlpha(obj.tag === 'MAGNET_RANGE' ? 0.4 : 1)
            .setAngle(obj.angle || 0)
            .setDepth(obj.tag === 'MAGNET_RANGE' ? 5 : 10);
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'STAR') continue;
            
            const texture = this.textures.get(obj.sheet);
            if (!texture.has(obj.name)) {
                texture.add(obj.name, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
            }
            
            const star = this.add.sprite(
                obj.position.x,
                320 - obj.position.y,
                'star_sheet',
                'star_01'
            ).setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h);
            star.play('star_rotate');
            
            star.collected = false;
            this.stars.push({ rect: star, x: obj.position.x, y: 320 - obj.position.y, size: obj.size?.x || 30 });
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'ROBOT_PIECE') continue;
            const texture = this.textures.get(obj.sheet);
            const frameName = obj.name + '_frame';
            if (!texture.has(frameName)) {
                texture.add(frameName, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
            }
            const piece = this.add.sprite(obj.position.x, 320 - obj.position.y, obj.sheet, frameName)
                .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h);
            this.robotPieces.push({ img: piece, x: obj.position.x, y: 320 - obj.position.y, size: obj.size?.x || 40, collected: false });
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'MAGNET') continue;
            const color = magnetColors[obj.name] === 'red' ? 0xff0000 : 0x0000ff;
            const magnet = this.physics.add.image(obj.position.x, 320 - obj.position.y, '__DEFAULT');
            magnet.setDisplaySize(obj.size?.x || 32, obj.size?.y || 32);
            //magnet.setTint(color);
            magnet.setImmovable(true);
            magnet.body.setEnable(true);
            magnet.body.setAllowGravity(false);
            magnet.magnetColor = magnetColors[obj.name];
            magnet.rangeRadius = 62;
            magnet.setDepth(15);
            this.magnets.push(magnet);
        }

        const heroObj = levelData.objects.find(o => o.tag === 'HERO');
        this.heroStart = { x: heroObj.position.x, y: 320 - heroObj.position.y };
        this.hero = this.physics.add.image(this.heroStart.x, this.heroStart.y, '__DEFAULT');
        this.hero.setDisplaySize(32, 32);
        //this.hero.setTint(0x0000ff);
        this.hero.body.setEnable(false);
        this.hero.setDepth(10);


        const heroObj2 = levelData.objects.find(o => o.tag === 'HERO');
        console.log('heroObj2:', heroObj2);
        
        if (heroObj2?.sheet && heroObj2?.frame) {
            const texture = this.textures.get(heroObj2.sheet);
            if (!texture.has(heroObj2.name)) {
                texture.add(heroObj2.name, 0, heroObj2.frame.x, heroObj2.frame.y, heroObj2.frame.w, heroObj2.frame.h);
            }
            this.hero.setTexture(heroObj2.sheet, heroObj2.name);
            this.hero.setScale(heroObj2.size.x / heroObj2.frame.w, heroObj2.size.y / heroObj2.frame.h);
}

        const rangeObj = levelData.objects.find(o => o.name === 'range_hero');
        if (rangeObj?.sheet && rangeObj?.frame) {
            const texture = this.textures.get(rangeObj.sheet);
            if (!texture.has(rangeObj.name)) {
                texture.add(rangeObj.name, 0, rangeObj.frame.x, rangeObj.frame.y, rangeObj.frame.w, rangeObj.frame.h);
            }
            this.heroRange = this.add.image(this.heroStart.x, this.heroStart.y, rangeObj.sheet, rangeObj.name);
            this.heroRange.setScale(rangeObj.size.x / rangeObj.frame.w, rangeObj.size.y / rangeObj.frame.h);
            this.heroRange.setDepth(5);

            this.heroRangeBlueFrame = { x: 0, y: 206, w: 64, h: 64 };
            this.heroRangeRedFrame = { x: 0, y: 73, w: 64, h: 64 };
        }

        this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
        this.trajectoryGraphics = this.add.graphics();

        this.input.on('pointerdown', (pointer) => {
            this.isDragging = true;
            if (this.isAttached && this.attachedMagnet) {
                this.lastAttachedMagnet = this.attachedMagnet;
                this.isAttached = false;
                this.attachedMagnet = null;
            }
            this.dragStart = { x: pointer.x, y: pointer.y };
            this.hero.body.stop();
            this.hero.body.setAllowGravity(false);
        });

        this.input.on('pointerup', (pointer) => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const dx = pointer.x - this.dragStart.x;
            const dy = pointer.y - this.dragStart.y;

            this.hero.body.setEnable(true);
            this.hero.body.setAllowGravity(true);

            if (this.hasLaunched) {
                this.heroColor = this.heroColor === 'blue' ? 'red' : 'blue';
                //this.hero.setTint(this.heroColor === 'blue' ? 0x0000ff : 0xff0000);
            }
            this.hasLaunched = true;

            const maxDist = 750 / 2;
            const dragDist = Math.sqrt(dx * dx + dy * dy);
            const powerRatio = Math.min(dragDist, maxDist) / maxDist;
            this.hero.setVelocity(
                -dx / dragDist * powerRatio * 5.72 * maxDist,
                -dy / dragDist * powerRatio * 5.72 * maxDist
            );

            this.lastAttachedMagnet = null;
            this.trajectoryGraphics.clear();
        });
    }

    update() {
        const rangeFrame = this.heroColor === 'blue' ? this.heroRangeBlueFrame : this.heroRangeRedFrame;
        const heroRangeFrameName = `range_hero_${this.heroColor}`;
        const texture = this.textures.get('hero_hero_sheet.png');
        if (!texture.has(heroRangeFrameName)) {
            texture.add(heroRangeFrameName, 0, rangeFrame.x, rangeFrame.y, rangeFrame.w, rangeFrame.h);
        }
        this.heroRange.setTexture('hero_hero_sheet.png', heroRangeFrameName);
        this.heroRange.setPosition(this.hero.x, this.hero.y);

        if (this.isAttached && this.attachedMagnet) {
            const dx = this.hero.x - this.attachedMagnet.x;
            const dy = this.hero.y - this.attachedMagnet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Add damping to bleed energy
            this.hero.body.velocity.x *= 0.95;
            this.hero.body.velocity.y *= 0.95;

            // Prevent hero from going inside magnet
            const minDist = 18;
            if (dist < minDist && dist > 0) {
                const angle = Math.atan2(dy, dx);
                this.hero.x = this.attachedMagnet.x + Math.cos(angle) * minDist;
                this.hero.y = this.attachedMagnet.y + Math.sin(angle) * minDist;
}

            if (dist > this.jointLength) {
                const angle = Math.atan2(dy, dx);
                this.hero.x = this.attachedMagnet.x + Math.cos(angle) * this.jointLength;
                this.hero.y = this.attachedMagnet.y + Math.sin(angle) * this.jointLength;
                const nx = dx / dist;
                const ny = dy / dist;
                const dot = this.hero.body.velocity.x * nx + this.hero.body.velocity.y * ny;
                if (dot > 0) {
                    this.hero.body.velocity.x -= dot * nx;
                    this.hero.body.velocity.y -= dot * ny;
                }
            }
        }

        if (this.isDragging) {
            const dx = this.input.activePointer.x - this.dragStart.x;
            const dy = this.input.activePointer.y - this.dragStart.y;
            const angle = Math.atan2(dy, dx);

            if (this.lastAttachedMagnet) {
                const newX = this.lastAttachedMagnet.x - Math.cos(angle) * this.jointLength;
                const newY = this.lastAttachedMagnet.y - Math.sin(angle) * this.jointLength;
                const distMoved = Math.sqrt((newX - this.hero.x) ** 2 + (newY - this.hero.y) ** 2);
                if (distMoved > 20) {
                    this.hero.setPosition(newX, newY);
                } else {
                    this.hero.x += (newX - this.hero.x) * 0.3;
                    this.hero.y += (newY - this.hero.y) * 0.3;
                }
            }

            this.trajectoryGraphics.clear();

            // 1. MATCH THE EXACT VELOCITY MATH FROM pointerup
            const maxDist = 750 / 2;
            const dragDist = Math.sqrt(dx * dx + dy * dy);
            
            // Prevent division by zero if pointer hasn't moved
            const safeDragDist = dragDist > 0 ? dragDist : 1; 
            const powerRatio = Math.min(safeDragDist, maxDist) / maxDist;

            const vx = (-dx / safeDragDist) * powerRatio * 5.72 * maxDist;
            const vy = (-dy / safeDragDist) * powerRatio * 5.72 * maxDist;

            const g = 294;


            const nextColor = this.heroColor === 'blue' ? 0xff2600 : 0x0050ff;
            const sizes = [1, 2, 3, 4];
            let dotIndex = 0;


            for (let t = 0; t < 1.5; t += 0.08) {
                const px = this.hero.x + vx * t;
                const py = this.hero.y + vy * t + 0.5 * g * t * t;
                const radius = sizes[dotIndex % 3];
                this.trajectoryGraphics.fillStyle(nextColor, 0.8);
                this.trajectoryGraphics.fillCircle(px, py, radius);
                dotIndex++;
            }
            return;
        }

        if (!this.hero.body.enable) return;

        if (!this.isAttached && !this.attachedMagnet) {
            for (const magnet of this.magnets) {
                const dx = magnet.x - this.hero.x;
                const dy = magnet.y - this.hero.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (magnet.magnetColor === this.heroColor) {
                    if (dist < 40) {
                        const force = (40 * 40 + 40 * 40) / (dist * dist);
                        this.hero.body.velocity.x = this.hero.body.velocity.x / 1.05;
                        this.hero.body.velocity.y = this.hero.body.velocity.y / 1.05;
                        this.hero.setVelocity(
                            this.hero.body.velocity.x - dx * force,
                            this.hero.body.velocity.y - dy * force
                        );
                    }
                } else {
                    if (dist < 60) {
                        const force = (60 * 60 + 60 * 60) / (dist * dist);
                        this.hero.body.velocity.x = this.hero.body.velocity.x / 1.02;
                        this.hero.body.velocity.y = this.hero.body.velocity.y / 1.02;
                        this.hero.setVelocity(
                            this.hero.body.velocity.x + dx * force,
                            this.hero.body.velocity.y + dy * force
                        );
                        if (dist < 20 && !this.isAttached) {
                            this.isAttached = true;
                            this.attachedMagnet = magnet;
                            this.jointLength = Math.max(dist, 40); // minimum 40px so it doesn't go inside
                            this.hero.body.setEnable(true);

                            // Cap velocity on attachment
                            const speed = Math.sqrt(this.hero.body.velocity.x ** 2 + this.hero.body.velocity.y ** 2);
                            const maxSpeed = 150;
                            if (speed > maxSpeed) {
                                const ratio = maxSpeed / speed;
                                this.hero.body.velocity.x *= ratio;
                                this.hero.body.velocity.y *= ratio;
                            }
                        }
                    }
                }
            }
        }

        for (const star of this.stars) {
            if (star.collected) continue;
            const dx = this.hero.x - star.x;
            const dy = this.hero.y - star.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < star.size) {
                star.collected = true;
                star.rect.play('star_pick');
                star.rect.once('animationcomplete', () => {
                    star.rect.setVisible(false);
                });
                this.starCount++;
            }
        }

        //Incorrect win condition
        // if (this.starCount >= this.stars.length && this.stars.length > 0) {
        //     this.showWin();
        // }

        for (const piece of this.robotPieces) {
            if (piece.collected) continue;
            const dx = this.hero.x - piece.x;
            const dy = this.hero.y - piece.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < piece.size) {
                piece.collected = true;
                piece.img.setVisible(false);
                this.robotPiecesCollected++;
                if (this.robotPiecesCollected >= this.robotPieces.length) {
                    this.showWin();
                }
            }
        }

        if (this.hero.y > 350) {
            this.hero.setPosition(this.heroStart.x, this.heroStart.y);
            this.hero.body.setEnable(false);
            this.hero.setVelocity(0, 0);
            this.isAttached = false;
            this.attachedMagnet = null;
            this.hasLaunched = false;
            this.heroColor = 'blue';
            // this.hero.setTint(0x0000ff);
            this.starCount = 0;
            for (const star of this.stars) {
                star.collected = false;
                star.rect.setVisible(true);
            }
        }
    }

    showWin() {
        if (this.wonAlready) return;
        this.wonAlready = true;

        this.add.rectangle(375, 160, 750, 320, 0x000000, 0.6).setScrollFactor(0);
        const dialog = this.add.image(375, 160, 'dialog_bg').setScrollFactor(0);
        dialog.setDisplaySize(300, 200);

        this.add.text(375, 130, 'LEVEL COMPLETE!', {
            fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        this.add.text(375, 165, `Stars: ${this.starCount}/${this.stars.length}`, {
            fontSize: '18px', color: '#ffff00'
        }).setOrigin(0.5).setScrollFactor(0);

        const nextBtn = this.add.text(375, 210, '[ NEXT LEVEL ]', {
            fontSize: '20px', color: '#00ff00', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setInteractive();

        nextBtn.on('pointerdown', () => {
            let nextLevel = this.currentLevel + 1;
            let nextWorld = this.currentWorld;
            if (nextLevel > 20) { nextLevel = 1; nextWorld++; }
            this.scene.start('GameScene', { world: nextWorld, level: nextLevel });
        });
    }
}