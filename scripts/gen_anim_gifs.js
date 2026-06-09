// Generates animated GIFs for all hero animations defined in animations.json
// Output: anims_out/<animName>.gif
//
// Usage: node scripts/gen_anim_gifs.js

const sharp      = require('sharp');
const GifEncoder = require('gif-encoder-2');
const fs         = require('fs');
const path       = require('path');

const ANIMS_JSON  = path.join(__dirname, '../src/assets/animations.json');
const FRAMES_JSON = path.join(__dirname, '../src/assets/all_frames.json');
const SHEETS_DIR  = path.join(__dirname, '../public/assets/sprites');
const OUT_DIR     = path.join(__dirname, '../anims_out');

const SCALE = 3;   // upscale factor so frames aren't tiny
const DELAY = 100; // ms per frame default

const animations = JSON.parse(fs.readFileSync(ANIMS_JSON, 'utf8'));
const allFrames  = JSON.parse(fs.readFileSync(FRAMES_JSON, 'utf8'));

fs.mkdirSync(OUT_DIR, { recursive: true });

// Cache loaded sheet buffers
const sheetCache = {};
async function getSheet(sheetName) {
    if (!sheetCache[sheetName]) {
        const p = path.join(SHEETS_DIR, sheetName);
        sheetCache[sheetName] = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    }
    return sheetCache[sheetName];
}

async function extractFrame(frameName) {
    const fd = allFrames[frameName];
    if (!fd) throw new Error(`Unknown frame: ${frameName}`);
    const { data, info } = await getSheet(fd.sheet);
    const sx = Math.round(fd.x), sy = Math.round(fd.y);
    const sw = Math.round(fd.w), sh = Math.round(fd.h);
    // Extract region from raw RGBA buffer
    const out = Buffer.alloc(sw * sh * 4);
    for (let row = 0; row < sh; row++) {
        const srcRow = sy + row;
        if (srcRow >= info.height) break;
        for (let col = 0; col < sw; col++) {
            const srcCol = sx + col;
            if (srcCol >= info.width) break;
            const si = (srcRow * info.width + srcCol) * 4;
            const di = (row * sw + col) * 4;
            out[di]     = data[si];
            out[di + 1] = data[si + 1];
            out[di + 2] = data[si + 2];
            out[di + 3] = data[si + 3];
        }
    }
    return { data: out, width: sw, height: sh };
}

async function upscale(frameData, scale) {
    const { data, width, height } = frameData;
    const nw = width * scale, nh = height * scale;
    const out = Buffer.alloc(nw * nh * 4);
    for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
            const si = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4;
            const di = (y * nw + x) * 4;
            out.copy(out, di, di, di); // no-op placeholder
            out[di]     = data[si];
            out[di + 1] = data[si + 1];
            out[di + 2] = data[si + 2];
            out[di + 3] = data[si + 3];
        }
    }
    return { data: out, width: nw, height: nh };
}

async function genGif(animName, animDef) {
    const frameRate = animDef.frameRate || 10;
    const delayMs   = Math.round(1000 / frameRate);

    // Extract all frames
    const frames = [];
    for (const fn of animDef.frames) {
        const raw  = await extractFrame(fn);
        const up   = await upscale(raw, SCALE);
        frames.push(up);
    }
    if (frames.length === 0) return;

    const w = frames[0].width, h = frames[0].height;

    return new Promise((resolve, reject) => {
        const encoder = new GifEncoder(w, h, 'neuquant', true, frames.length);
        encoder.setDelay(delayMs);
        encoder.setRepeat(animDef.loop ? 0 : -1);  // 0=loop forever, -1=play once

        const outPath = path.join(OUT_DIR, `${animName}.gif`);
        const writeStream = fs.createWriteStream(outPath);
        encoder.createReadStream().pipe(writeStream);

        writeStream.on('finish', () => {
            console.log(`  ${animName}.gif  (${frames.length} frames @ ${frameRate}fps)`);
            resolve();
        });
        writeStream.on('error', reject);

        encoder.start();
        for (const { data } of frames) {
            encoder.addFrame(data);
        }
        encoder.finish();
    });
}

(async () => {
    // Only generate hero sheet animations (skip star, robot, rubber, etc.)
    const heroAnims = Object.entries(animations).filter(([, def]) =>
        def.sheet === 'hero_hero_sheet.png'
    );

    console.log(`Generating ${heroAnims.length} hero animations → ${OUT_DIR}\n`);
    for (const [name, def] of heroAnims) {
        try {
            await genGif(name, def);
        } catch (e) {
            console.error(`  FAILED ${name}: ${e.message}`);
        }
    }
    console.log('\nDone.');
})();
