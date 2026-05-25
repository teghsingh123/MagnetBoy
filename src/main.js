import Phaser from 'phaser';
import level1_1 from '../levels/level_1_1.json';

const config = {
    type: Phaser.AUTO,
    width: 750,
    height: 320,
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 294 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    }
};

const game = new Phaser.Game(config);

let hero;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let heroStart = { x: 0, y: 0 };
let trajectoryGraphics;
let heroRange;
let hasLaunched = false;

let magnets = [];
let heroColor = 'blue';
let isAttached = false;
let attachedMagnet = null;

let orbitAngle = 0;
let orbitSpeed = 3; // radians per second

let jointLength = 0;

let lastAttachedMagnet = null;

let stars = [];
let starCount = 0;



function preload() {
    this.load.image('dialog_bg', '/assets/ui/dialog_bg.png');

    for (let col = 1; col <= 5; col++) {
        for (let row = 1; row <= 2; row++) {
            this.load.image(`bg${col}_${row}`, `/assets/bg/1/bg-x25-${col}-${row}.png`);
        }
}
}

function create() {
    this.cameras.main.setBounds(0, 0, 960, 320);
    this.physics.world.setBounds(0, 0, 960, 320);


    const colWidths = [1024, 256, 512, 512, 96];
    const rowHeights = [512, 288];
    const scale = 0.4; // 1/2.5

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

    // Build color map from range objects
    const magnetColors = {};
    for (const obj of level1_1.objects) {
        if (obj.tag === 'MAGNET_RANGE') {
            const anim = obj.animation || '';
            const color = anim.startsWith('RR') ? 'red' : 'blue';
            const magnetName = obj.name.replace('range_', '');
            magnetColors[magnetName] = color;
        }
    }

    // Draw all level objects as rectangles
    for (const obj of level1_1.objects) {
        if (!obj.position || obj.tag === 'HERO') continue;

        let color = 0xffffff;

        if (obj.tag === 'STAR') color = 0xffff00;
        if (obj.tag === 'ROBOT_PIECE') color = 0x00ff00;

        if (obj.tag === 'MAGNET') {
            color = magnetColors[obj.name] === 'red' ? 0xff0000 : 0x0000ff;
        }

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

    for (const obj of level1_1.objects) {
        if (obj.tag !== 'STAR') continue;

        const star = this.add.rectangle(
            obj.position.x,
            320 - obj.position.y,
            obj.size?.x || 30,
            obj.size?.y || 30,
            0xffff00
        );
        star.collected = false;
        stars.push({ rect: star, x: obj.position.x, y: 320 - obj.position.y, size: obj.size?.x || 30 });
    }    

    // Create magnet physics bodies
    for (const obj of level1_1.objects) {
        if (obj.tag !== 'MAGNET') continue;
        
        const color = magnetColors[obj.name] === 'red' ? 0xff0000 : 0x0000ff;
        const magnet = this.physics.add.image(
            obj.position.x,
            320 - obj.position.y,
            '__DEFAULT'
        );
        magnet.setDisplaySize(obj.size?.x || 32, obj.size?.y || 32);
        magnet.setTint(color);
        magnet.setImmovable(true);
        magnet.body.setEnable(true);
        magnet.body.setAllowGravity(false);
        magnet.magnetColor = magnetColors[obj.name];
        magnet.rangeRadius = 62; // from level data

        magnets.push(magnet);
    }

    // Create hero as physics object
    const heroObj = level1_1.objects.find(o => o.tag === 'HERO');
    heroStart = { x: heroObj.position.x, y: 320 - heroObj.position.y };
    hero = this.physics.add.image(heroStart.x, heroStart.y, '__DEFAULT');
    hero.setDisplaySize(32, 32);
    hero.setTint(0x0000ff);
    hero.body.setEnable(false);

    heroRange = this.add.graphics();
    heroRange.fillStyle(0x0000ff, 0.3);
    heroRange.fillCircle(0, 0, 32);

    this.cameras.main.startFollow(hero, true, 0.1, 0.1);

    // Trajectory line
    trajectoryGraphics = this.add.graphics();

    // Input
    this.input.on('pointerdown', (pointer) => {
        isDragging = true;

        if (isAttached && attachedMagnet) {
            lastAttachedMagnet = attachedMagnet;
            isAttached = false;
            attachedMagnet = null;
        }

        dragStart = { x: pointer.x, y: pointer.y };
        hero.body.stop();
        hero.body.setAllowGravity(false);
    });

    this.input.on('pointerup', (pointer) => {
        if (!isDragging) return;
        isDragging = false;

        const dx = pointer.x - dragStart.x;
        const dy = pointer.y - dragStart.y;

        hero.body.setEnable(true);
        hero.body.setAllowGravity(true);

        if (hasLaunched) {
            heroColor = heroColor === 'blue' ? 'red' : 'blue';
            hero.setTint(heroColor === 'blue' ? 0x0000ff : 0xff0000);
            }
        hasLaunched = true;

        const maxDist = 750 / 2; // contentWidth / 2
        const dragDist = Math.sqrt(dx * dx + dy * dy);
        const powerRatio = Math.min(dragDist, maxDist) / maxDist;
        hero.setVelocity(-dx / dragDist * powerRatio * 5.72 * maxDist, -dy / dragDist * powerRatio * 5.72 * maxDist);

        lastAttachedMagnet = null;
        trajectoryGraphics.clear();
    });
}

function update() {
    heroRange.setPosition(hero.x, hero.y);
    heroRange.setPosition(hero.x, hero.y);
    heroRange.clear();
    heroRange.fillStyle(heroColor === 'blue' ? 0x0000ff : 0xff0000, 0.3);
    heroRange.fillCircle(0, 0, 32);

    if (isAttached && attachedMagnet) {
        const dx = hero.x - attachedMagnet.x;
        const dy = hero.y - attachedMagnet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Constrain to joint length
        if (dist > jointLength) {
            const angle = Math.atan2(dy, dx);
            hero.x = attachedMagnet.x + Math.cos(angle) * jointLength;
            hero.y = attachedMagnet.y + Math.sin(angle) * jointLength;
            
            // Remove velocity component pulling away from magnet
            const nx = dx / dist;
            const ny = dy / dist;
            const dot = hero.body.velocity.x * nx + hero.body.velocity.y * ny;
            if (dot > 0) {
                hero.body.velocity.x -= dot * nx;
                hero.body.velocity.y -= dot * ny;
            }
        }
    }
    
    if (isDragging) {
        const dx = this.input.activePointer.x - dragStart.x;
        const dy = this.input.activePointer.y - dragStart.y;
        const angle = Math.atan2(dy, dx);

        if (lastAttachedMagnet) {
            const newX = lastAttachedMagnet.x - Math.cos(angle) * jointLength;
            const newY = lastAttachedMagnet.y - Math.sin(angle) * jointLength;
            
            const distMoved = Math.sqrt((newX - hero.x) ** 2 + (newY - hero.y) ** 2);
            
            // If moving more than 10px per frame, teleport instead of animate
            if (distMoved > 20) {
                hero.setPosition(newX, newY);
            } else {
                hero.x += (newX - hero.x) * 0.3;
                hero.y += (newY - hero.y) * 0.3;
            }
        }

        trajectoryGraphics.clear();
        const vx = -dx * 3;
        const vy = -dy * 3;
        const g = 294;


        const blueColor = 0x0050ff;
        const redColor = 0xff2600;
        const nextColor = heroColor === 'blue' ? redColor : blueColor;


        const sizes = [1, 2, 3, 4];



        let dotIndex = 0;
        for (let t = 0; t < 1.5; t += 0.08) {
            const px = hero.x + vx * t;
            const py = hero.y + vy * t + 0.5 * g * t * t;
            const radius = sizes[dotIndex % 3];
            trajectoryGraphics.fillStyle(nextColor, 0.8);
            trajectoryGraphics.fillCircle(px, py, radius);
            dotIndex++;
        }
        return;
    }

    if (!hero.body.enable) return;

    // Check magnet interactions
    if (!isAttached && !attachedMagnet) {
        for (const magnet of magnets) {
            const dx = magnet.x - hero.x;
            const dy = magnet.y - hero.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (magnet.magnetColor === heroColor) {
                // Same color - repel, range 40, damping 1.05
                if (dist < 40) {
                    const force = (40 * 40 + 40 * 40) / (dist * dist);
                    hero.body.velocity.x = hero.body.velocity.x / 1.05;
                    hero.body.velocity.y = hero.body.velocity.y / 1.05;
                    hero.setVelocity(
                        hero.body.velocity.x - dx * force,
                        hero.body.velocity.y - dy * force
                    );
                }
            } else {
                // Opposite color - attract, range 60, damping 1.02
                if (dist < 60) {
                    const force = (60 * 60 + 60 * 60) / (dist * dist);
                    hero.body.velocity.x = hero.body.velocity.x / 1.02;
                    hero.body.velocity.y = hero.body.velocity.y / 1.02;
                    hero.setVelocity(
                        hero.body.velocity.x + dx * force,
                        hero.body.velocity.y + dy * force
                    );

                    if (dist < 20 && !isAttached) {
                        isAttached = true;
                        attachedMagnet = magnet;
                        jointLength = 40;
                        hero.body.setEnable(true);
                    }
                }
            }
        }
    }

    for (const star of stars) {
        if (star.collected) continue;
        const dx = hero.x - star.x;
        const dy = hero.y - star.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < star.size) {
            star.collected = true;
            star.rect.setVisible(false);
            starCount++;
            console.log('Stars collected:', starCount);
        }
    }

    // Check win condition
    if (starCount >= stars.length && stars.length > 0) {
        showWin(this);
    }

    // Check fail condition - hero fell off screen
    if (hero.y > 350) {
        hero.setPosition(heroStart.x, heroStart.y);
        hero.body.setEnable(false);
        hero.setVelocity(0, 0);
        isAttached = false;
        attachedMagnet = null;
        hasLaunched = false;
        heroColor = 'blue';
        hero.setTint(0x0000ff);
        starCount = 0;
        for (const star of stars) {
            star.collected = false;
            star.rect.setVisible(true);
        }
        console.log('FAILED - resetting');
    }
}

function showWin(scene) {
    // Prevent multiple calls
    if (scene.wonAlready) return;
    scene.wonAlready = true;

    // Dim the screen
    scene.add.rectangle(375, 160, 750, 320, 0x000000, 0.6);

    // Dialog background
    const dialog = scene.add.image(375, 160, 'dialog_bg');
    dialog.setDisplaySize(300, 200);

    // Win text
    scene.add.text(375, 130, 'LEVEL COMPLETE!', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    scene.add.text(375, 170, `Stars: ${starCount}/${stars.length}`, {
        fontSize: '18px',
        color: '#ffff00'
    }).setOrigin(0.5);
}