import Phaser from 'phaser';

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
    }

    preload() {
        this.load.image('dialog_bg', '/assets/ui/dialog_bg.png');
        for (let col = 1; col <= 5; col++) {
            for (let row = 1; row <= 2; row++) {
                this.load.image(`bg${col}_${row}`, `/assets/bg/${this.currentWorld}/bg-x25-${col}-${row}.png`);
            }
        }
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
            if (!obj.position || obj.tag === 'HERO') continue;

            let color = 0xffffff;
            if (obj.tag === 'STAR') color = 0xffff00;
            if (obj.tag === 'ROBOT_PIECE') color = 0x00ff00;
            if (obj.tag === 'MAGNET') color = magnetColors[obj.name] === 'red' ? 0xff0000 : 0x0000ff;
            if (obj.tag === 'MAGNET_RANGE') {
                const magnetName = obj.name.replace('range_', '');
                color = magnetColors[magnetName] === 'red' ? 0xff0000 : 0x0000ff;
            }

            this.add.rectangle(
                obj.position.x,
                320 - obj.position.y,
                obj.size?.x || 32,
                obj.size?.y || 32,
                color
            ).setAlpha(obj.tag === 'MAGNET_RANGE' ? 0.2 : 1);
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'STAR') continue;
            const star = this.add.rectangle(
                obj.position.x,
                320 - obj.position.y,
                obj.size?.x || 30,
                obj.size?.y || 30,
                0xffff00
            );
            star.collected = false;
            this.stars.push({ rect: star, x: obj.position.x, y: 320 - obj.position.y, size: obj.size?.x || 30 });
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'MAGNET') continue;
            const color = magnetColors[obj.name] === 'red' ? 0xff0000 : 0x0000ff;
            const magnet = this.physics.add.image(obj.position.x, 320 - obj.position.y, '__DEFAULT');
            magnet.setDisplaySize(obj.size?.x || 32, obj.size?.y || 32);
            magnet.setTint(color);
            magnet.setImmovable(true);
            magnet.body.setEnable(true);
            magnet.body.setAllowGravity(false);
            magnet.magnetColor = magnetColors[obj.name];
            magnet.rangeRadius = 62;
            this.magnets.push(magnet);
        }

        const heroObj = levelData.objects.find(o => o.tag === 'HERO');
        this.heroStart = { x: heroObj.position.x, y: 320 - heroObj.position.y };
        this.hero = this.physics.add.image(this.heroStart.x, this.heroStart.y, '__DEFAULT');
        this.hero.setDisplaySize(32, 32);
        this.hero.setTint(0x0000ff);
        this.hero.body.setEnable(false);

        this.heroRange = this.add.graphics();
        this.heroRange.fillStyle(0x0000ff, 0.3);
        this.heroRange.fillCircle(0, 0, 32);

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
                this.hero.setTint(this.heroColor === 'blue' ? 0x0000ff : 0xff0000);
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
        this.heroRange.setPosition(this.hero.x, this.hero.y);
        this.heroRange.clear();
        this.heroRange.fillStyle(this.heroColor === 'blue' ? 0x0000ff : 0xff0000, 0.3);
        this.heroRange.fillCircle(0, 0, 32);

        if (this.isAttached && this.attachedMagnet) {
            const dx = this.hero.x - this.attachedMagnet.x;
            const dy = this.hero.y - this.attachedMagnet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
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
            const vx = -dx * 3;
            const vy = -dy * 3;
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
                            this.jointLength = 40;
                            this.hero.body.setEnable(true);
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
                star.rect.setVisible(false);
                this.starCount++;
            }
        }

        if (this.starCount >= this.stars.length && this.stars.length > 0) {
            this.showWin();
        }

        if (this.hero.y > 350) {
            this.hero.setPosition(this.heroStart.x, this.heroStart.y);
            this.hero.body.setEnable(false);
            this.hero.setVelocity(0, 0);
            this.isAttached = false;
            this.attachedMagnet = null;
            this.hasLaunched = false;
            this.heroColor = 'blue';
            this.hero.setTint(0x0000ff);
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