import Phaser from 'phaser';

import allFrames from './assets/all_frames.json';
import animations from './assets/animations.json';

const levels = import.meta.glob('../levels/*.json', { eager: true });

const ANIM_STATES = {
    BB:  [-1, -1],
    RR:  [1, 1],
    BR:  [-1, 1, 1, 1, 1, 1, -1, -1, -1, -1],
    RB:  [1, -1, -1, -1, -1, -1, 1, 1, 1, 1],
    BZ:  [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0],
    RZ:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    ROB: [1, 0, -1],
    BOR: [-1, 0, 1],
};

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

        this.heroAnimTag = 'BOR'; // default, will be set from level data
        this.heroFrame = 0;
        this.heroState = -1; // starts blue = -1


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

        this.woodBlocks = []
        this.isLevelComplete = false;
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

        this.load.spritesheet('magnet_sheets', 'assets/magnet_magnet_sheets.png', {
            frameWidth: 62,
            frameHeight: 62
        });

        this.textures.get('magnet_sheets').add('yellow_glow', 0, 194, 129, 55, 55);

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

            if (!this.anims.exists(animName)){    
                this.anims.create({
                    key: animName,
                    frames: frameConfig,
                    frameRate: animData.frameRate,
                    repeat: animData.loop ? -1 : 0
                });
            }
        }


        const levelData = getLevel(this.currentWorld, this.currentLevel);

        const magnetColors = {};
        for (const obj of levelData.objects) {
            if (obj.tag === 'MAGNET_RANGE') {
                const anim = obj.animation || '';
                const color = anim.startsWith('RR') ? 'red' : 'blue';
                const magnetName = obj.name.replace('range_', '');
                // Removed the broken lines here
                magnetColors[magnetName] = color;
            }
        }

        // Keep track of range images to link up later with physics instances
        const rangeImagesByMagnetName = {};
        const visualImagesByMagnetName = {};


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

            const img = this.add.image(
                obj.position.x,
                obj.position.y,
                obj.sheet,
                frameName
            )
            .setScale(obj.size.x / frameW, obj.size.y / frameH)
            .setAlpha(obj.tag === 'MAGNET_RANGE' ? 0.4 : 1)
            .setAngle(obj.angle || 0)
            .setDepth(obj.tag === 'MAGNET_RANGE' ? 5 : 10);

            if (obj.tag === 'MAGNET_RANGE') {
                const magnetName = obj.name.replace('range_', '');
                rangeImagesByMagnetName[magnetName] = img;
            }

            if (obj.tag === 'MAGNET') {
                visualImagesByMagnetName[obj.name] = img;
            }
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'STAR') continue;
            
            const texture = this.textures.get(obj.sheet);
            if (texture && !texture.has(obj.name)) {
                texture.add(obj.name, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
            }
            
            const star = this.add.sprite(
                obj.position.x,
                obj.position.y,
                obj.sheet,
                obj.name
            ).setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h);
            star.play('star_rotate');
            
            star.collected = false;
            this.stars.push({ rect: star, x: obj.position.x, y: obj.position.y, size: obj.size?.x || 30 });
        }




        for (const obj of levelData.objects) {
            if (obj.tag !== 'ROBOT_PIECE') continue;

            // ========================================================
            // 1. ADD THE NATIVE UN-SCALED YELLOW GLOW BACKDROP
            // ========================================================
            const magnetTextureKey = 'magnet_magnet_sheets.png'; 
            const glowFrameName = 'yellow_glow_frame';

            if (this.textures.exists(magnetTextureKey)) {
                const magnetTexture = this.textures.get(magnetTextureKey);
                
                // Define the frame block using the exact coordinates from the Lua sheet
                if (!magnetTexture.has(glowFrameName)) {
                    magnetTexture.add(glowFrameName, 0, 194, 129, 55, 55);
                }

                // Spawn the glow at a flat 1:1 pixel scale so it stays a perfect native circle
                const glow = this.add.sprite(obj.position.x, obj.position.y, magnetTextureKey, glowFrameName);
                glow.setAlpha(1.0); // Keeps it nice and vibrant without a tween override

                // Attach reference for cleanup
                obj.glowGraphic = glow;
            }
            // ========================================================

            // 2. CREATE THE ROBOT PIECE (Your original code)
            const texture = this.textures.get(obj.sheet);
            const frameName = obj.name + '_frame';
            if (!texture.has(frameName)) {
                texture.add(frameName, 0, obj.frame.x, obj.frame.y, obj.frame.w, obj.frame.h);
            }

            const piece = this.physics.add.sprite(obj.position.x, obj.position.y, obj.sheet, frameName)
                .setScale(obj.size.x / obj.frame.w, obj.size.y / obj.frame.h);

            // CRITICAL: Prevent the piece from falling due to gravity
            piece.body.setAllowGravity(false);

            // Store the tracking structure
            this.robotPieces.push({ 
                img: piece, 
                glow: obj.glowGraphic || null, 
                x: obj.position.x, 
                y: obj.position.y, 
                size: obj.size?.x || 40, 
                collected: false 
            });
        }

        for (const obj of levelData.objects) {
            if (obj.tag !== 'MAGNET') continue;
            const color = magnetColors[obj.name] === 'red' ? 0xff0000 : 0x0000ff;
            const magnet = this.physics.add.image(obj.position.x, obj.position.y, '__DEFAULT');
            magnet.setDisplaySize(obj.size?.x || 32, obj.size?.y || 32);
            //magnet.setTint(color);
            magnet.setImmovable(true);
            magnet.body.enable = true;
            magnet.body.setAllowGravity(false);
            magnet.magnetColor = magnetColors[obj.name];
            magnet.rangeRadius = 62;

            magnet.magnetName = obj.name;

            // Map the range image reference accurately now that processing data loops exist
            magnet.rangeImage = rangeImagesByMagnetName[obj.name] || null;
            magnet.visualImage = visualImagesByMagnetName[obj.name] || null;


            magnet.animTag = magnetColors[obj.name] === 'red' ? 'RR' : 'BB'; // fallback
            // Get actual animTag from range object
            const rangeObj2 = levelData.objects.find(o => o.name === 'range_' + obj.name);
            if (rangeObj2?.animation) {
                magnet.animTag = rangeObj2.animation.split('_')[0]; // get 'BB', 'RR', 'BR' etc
            }
            magnet.animFrame = 0;
            magnet.state = ANIM_STATES[magnet.animTag]?.[0] ?? 1;
            console.log(obj.name, 'animTag:', magnet.animTag, 'state:', magnet.state);


            magnet.setDepth(15);
            this.magnets.push(magnet);
        }

        this.time.addEvent({
            delay: 250, // advance frame every 250ms
            loop: true,
            callback: () => {
                for (const magnet of this.magnets) {
                    const states = ANIM_STATES[magnet.animTag];
                    if (!states) continue;
                    magnet.animFrame = (magnet.animFrame + 1) % states.length;
                    magnet.state = states[magnet.animFrame];
                    
                    // Update visual
                    if (magnet.rangeImage) {
                        const frameName = magnet.state >= 0 ? 
                            `range_${magnet.magnetName}_red` : 
                            `range_${magnet.magnetName}_blue`;
                        // use x=0 for red, x=128 for blue
                        const frameX = magnet.state >= 0 ? 0 : 128;
                        const texture = magnet.rangeImage.texture;
                        if (!texture.has(frameName)) {
                            texture.add(frameName, 0, frameX, 0, 62, 62);
                        }
                        magnet.rangeImage.setTexture(texture.key, frameName);
                    }
                }
            }
        });

        const heroObj = levelData.objects.find(o => o.tag === 'HERO');
        this.heroStart = { x: heroObj.position.x, y: heroObj.position.y };
        this.hero = this.physics.add.image(this.heroStart.x, this.heroStart.y, '__DEFAULT');
        this.hero.setDisplaySize(32, 32);
        //this.hero.setTint(0x0000ff);


        // --- ADD THE ROTATION INITIALIZATION HERE ---
        this.hero.body.setAllowRotation(true);
        this.hero.body.setAngularDrag(150); // Keeps tumbles smooth and controlled

        // If you want a round physics shape for perfect wheel-like rolling over corners:
        this.hero.setCircle(this.hero.width / 2);

        this.hero.body.enable = false;
        this.hero.setDepth(10);

        this.hero.body.setBounce(0.1, 0.1);   // Gives the hero a slight bounce on X and Y axes
        this.hero.body.setFriction(0.2, 0.2); // Allows the hero to experience drag sliding over surfaces

        // Safely map only active images
        // In create(), instead of just map, filter first:
        this.physics.add.overlap(
            this.hero, 
            this.robotPieces.map(p => p.img).filter(img => img.active), 
            (hero, sprite) => {
                const pieceData = this.robotPieces.find(p => p.img === sprite);
                if (pieceData && !pieceData.collected) {
                    this.collectRobotPiece(hero, pieceData);
                }
            }, 
            null, 
            this
        );


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

        // FIX: Added animation property character splitting to parse values correctly
        const heroAnimTag = rangeObj?.animation ? rangeObj.animation.split('_')[0] : 'BOR';
        this.heroState = ANIM_STATES[heroAnimTag]?.[0] ?? -1;
        this.heroColor = this.heroState === -1 ? 'blue' : 'red';

        this.defaultHeroState = this.heroState;
        this.defaultHeroColor = this.heroColor;

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

        // Create wood physics bodies
        for (const obj of levelData.objects) {
            if (obj.tag !== 'WOOD') continue;
            
            const w = obj.angle === 90 || obj.angle === -90 ? obj.size?.y || 24.5 : obj.size?.x || 49;
            const h = obj.angle === 90 || obj.angle === -90 ? obj.size?.x || 49 : obj.size?.y || 24.5;

            // Calculate the true center coordinate from the top-left data position
            const centerX = obj.position.x;
            const centerY = obj.position.y;

            // 1. Create the physics body using the calculated center position
            const wood = this.physics.add.staticImage(
                centerX,
                centerY,
                '__DEFAULT'
            );
            
            // 2. Map the physical bounding box dimensions explicitly
            wood.setDisplaySize(w, h);
            wood.body.setSize(w, h);
            wood.body.setOffset(0, 0);
            
            wood.setAlpha(0); // Keeps the layout collider invisible
            wood.refreshBody(); // Locks the structural changes into the physics grid

            // 3. Dynamic collision handler
            this.physics.add.collider(this.hero, wood, () => {
                if (this.hero.body && Math.abs(this.hero.body.velocity.x) > 5) {
                    this.hero.setAngularVelocity(this.hero.body.velocity.x * 2);
                }
            });

            this.woodBlocks.push(wood);
        }




        this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
        this.trajectoryGraphics = this.add.graphics();

        this.input.on('pointerdown', (pointer) => {

            if (this.isLevelComplete) return;

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
            const dragDist = Math.sqrt(dx * dx + dy * dy);

            // 1. CLICK GUARD: If the drag distance is tiny, cancel the launch entirely
            if (dragDist < 5) {
                this.hero.body.enable = true;
                if (!this.isAttached) {
                    this.hero.body.setAllowGravity(true);
                }
                this.lastAttachedMagnet = null;
                this.trajectoryGraphics.clear();
                return; 
            }

            this.hero.body.enable = true;
            this.hero.body.setAllowGravity(true);

            if (this.hasLaunched) {
                this.heroState = this.heroState === -1 ? 1 : -1;
                this.heroColor = this.heroState === -1 ? 'blue' : 'red';
            }
            this.hasLaunched = true;

            const maxDist = 750 / 2;
            
            // ========================================================
            // SAFE KINEMATICS MULTIPLIER (Matches your update() loop!)
            // ========================================================
            const safeDragDist = dragDist > 0 ? dragDist : 1; 
            const powerRatio = Math.min(safeDragDist, maxDist) / maxDist;

            const vx = (-dx / safeDragDist) * powerRatio * 5.72 * maxDist;
            const vy = (-dy / safeDragDist) * powerRatio * 5.72 * maxDist;

            this.hero.setVelocity(vx, vy);
            // ========================================================

            this.isAttached = false;
            this.attachedMagnet = null;
            this.lastAttachedMagnet = null;
            this.trajectoryGraphics.clear();
                });

        // SAFETY NET: Treat a release outside the window exactly like a normal release
        this.input.on('pointerupoutside', (pointer) => {
            if (!this.isDragging) return;
            this.isDragging = false;

            this.hero.body.enable = true;
            this.hero.body.setAllowGravity(true);

            if (this.hasLaunched) {
                this.heroState = this.heroState === -1 ? 1 : -1;
                this.heroColor = this.heroState === -1 ? 'blue' : 'red';
            }
            this.hasLaunched = true;

            // Give it a safe default launch vector since the pointer went out of bounds
            const dx = pointer.x - this.dragStart.x;
            const dy = pointer.y - this.dragStart.y;
            const maxDist = 750 / 2;
            const dragDist = Math.sqrt(dx * dx + dy * dy);
            const safeDragDist = dragDist > 0 ? dragDist : 1;
            const powerRatio = Math.min(safeDragDist, maxDist) / maxDist;

            this.hero.setVelocity(
                -dx / safeDragDist * powerRatio * 5.72 * maxDist,
                -dy / safeDragDist * powerRatio * 5.72 * maxDist
            );

            this.lastAttachedMagnet = null;
            this.trajectoryGraphics.clear(); // Safely clear graphics layer so nothing stays broken!
        });
    }

    update() {

        if (this.isLevelComplete) return;


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

                const interaction = this.heroState * magnet.state;
                if (interaction === 0) continue;

                // Establish the baseline distance coefficient from GameLogic.lua (L8_2 = 20)
                const baseCoeff = 20;
                // L9_2 = L8_2 * L8_2 + L10_2 * L10_2 (which translates to 2 * (20 * 20) = 800)
                const forceNumerator = 2 * (baseCoeff * baseCoeff); 
                const forceDenominator = dist * dist;
                const force = forceNumerator / (forceDenominator > 0 ? forceDenominator : 1);



                if (interaction > 0) {
                    // Repel
                    if (dist < magnet.rangeRadius) { 
                        this.hero.body.velocity.x /= 1.05;
                        this.hero.body.velocity.y /= 1.05;
                        this.hero.setVelocity(
                            this.hero.body.velocity.x - dx * force,
                            this.hero.body.velocity.y - dy * force
                        );
                    }
                } else {
                    // Attract
                    if (dist < magnet.rangeRadius) { 
                        this.hero.body.velocity.x /= 1.02;
                        this.hero.body.velocity.y /= 1.02;
                        this.hero.setVelocity(
                            this.hero.body.velocity.x + dx * force,
                            this.hero.body.velocity.y + dy * force
                        );


                        // Snap attraction/joint point zone 
                        if (dist < 20 && !this.isAttached) {
                            this.isAttached = true;
                            this.attachedMagnet = magnet;
                            this.jointLength = Math.max(dist, 40);
                            this.hero.body.enable = true;

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

        if (this.hero.y > 350) {
            this.hero.setPosition(this.heroStart.x, this.heroStart.y);
            this.hero.body.enable = false;
            this.hero.setVelocity(0, 0);
            this.isAttached = false;
            this.attachedMagnet = null;
            this.hasLaunched = false;
            this.heroColor = this.defaultHeroColor
            this.heroState = this.defaultHeroState;

            // this.hero.setTint(0x0000ff);
            this.starCount = 0;
            for (const star of this.stars) {
                star.collected = false;
                star.rect.setVisible(true);
            }
        }

        //failsafe
        if (this.hero.body.velocity.x === 0 && this.hero.body.velocity.y === 0) {
            if (!this.inactivityTimer) {
                this.inactivityTimer = this.time.now;
            } else if (this.time.now - this.inactivityTimer > 5000) {
                // Match the Lua file exactly after 5 seconds of total stillness:
                this.hero.setAngle(0);
                this.hero.setAngularVelocity(0);
                // Play the "free" idle animation here if needed!
            }
        } else {
            this.inactivityTimer = null; // Reset timer if he moves
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

    // Call this when MagnetBoy overlaps a robot piece / star pickup
    collectRobotPiece(player, pieceData) {
        // Prevent processing if level is already won or piece is already taken
        if (this.isLevelComplete || pieceData.collected) return;
        
        pieceData.collected = true;
        this.robotPiecesCollected++;

        // 1. Safely disable physics and hide the sprite simultaneously 
        if (pieceData.img) {
            pieceData.img.disableBody(true, true); 
        }

        // 2. Destroy the static glow asset
        if (pieceData.glow) {
            pieceData.glow.destroy();
        }

        // 3. Play Star Burst Animation (With exact positions, rotations, and 1.5x scale from Lua)
        const xOffsets = [-10, 10, -20]; 
        const yOffsets = [-20, 0, 20];   
        const rotations = [0, 45, -45]; 

        for (let i = 0; i < 3; i++) {
            const spawnX = pieceData.x + xOffsets[i];
            const spawnY = pieceData.y + yOffsets[i];

            // Use the sheet associated with the level data object
            const sheetKey = pieceData.sheet || 'star_sheet';
            const burstSprite = this.add.sprite(spawnX, spawnY, sheetKey);
            
            burstSprite.setScale(1.5);
            burstSprite.setBlendMode(Phaser.BlendModes.ADD);
            burstSprite.setAngle(rotations[i]);
            
            if (this.anims.exists('star_burst')) {
                burstSprite.play('star_burst');
            } else if (this.anims.exists('star_pick')) {
                burstSprite.play('star_pick');
            } else {
                // Safe fallback: use the specific object frame name instead of a hardcoded string
                if (pieceData.name && this.textures.get(sheetKey).has(pieceData.name)) {
                    burstSprite.setFrame(pieceData.name);
                }
            }
            
            burstSprite.once('animationcomplete', () => {
                burstSprite.destroy();
            });
        }

        // 4. Remove from your tracking array
        const remainingPieces = this.robotPieces.filter(p => !p.collected);

        if (remainingPieces.length === 0) {
            // Lock down level control state completely
            this.isLevelComplete = true;

            // Freeze the player (Arcade Physics equivalent to Lua's bodyType = "static")
            if (player.body) {
                player.body.setVelocity(0, 0);
                if (typeof player.body.setAllowGravity === 'function') {
                    player.body.setAllowGravity(false);
                }
                // Optional: completely halt all other physics interactions on the player body
                // player.body.enable = false;
            }

            // 5. Delay the Win Screen overlay by exactly 1 second (Matches Lua: performWithDelay 1000)
            // Wait 1 second for star animations, then clear the field
            this.time.delayedCall(1000, () => {
                
                // 1. Destroy Hero & Hero Range
                if (this.hero) this.hero.destroy();
                if (this.heroRange) this.heroRange.destroy(); 

                // 2. Destroy Magnets, Magnet Ranges, and Magnet Artwork
                if (this.magnets && Array.isArray(this.magnets)) {
                    this.magnets.forEach(magnet => {
                        // Destroy the background range graphic circle
                        if (magnet.rangeImage && magnet.rangeImage.destroy) {
                            magnet.rangeImage.destroy();
                        }
                        // Destroy the actual visible magnet sprite artwork
                        if (magnet.visualImage && magnet.visualImage.destroy) {
                            magnet.visualImage.destroy();
                        }
                        // Destroy the interactive physics engine body
                        if (magnet.destroy) {
                            magnet.destroy();
                        }
                    });
                    this.magnets = [];
                }

                // 3. Destroy Wood Blocks
                if (this.woodBlocks && Array.isArray(this.woodBlocks)) {
                    this.woodBlocks.forEach(block => {
                        if (block && block.destroy) {
                            block.destroy();
                        }
                    });
                    this.woodBlocks = [];
                }

                // 4. Clean up any leftover level stars
                if (this.stars && Array.isArray(this.stars)) {
                    this.stars.forEach(s => { 
                        if (s.rect && s.rect.destroy) s.rect.destroy(); 
                    });
                    this.stars = [];
                }

                // 5. Bring up the crisp Win Menu on a perfectly empty board
                this.showWin();
            });
        }
    }
}