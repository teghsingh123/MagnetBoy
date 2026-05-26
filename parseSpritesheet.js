const fs = require('fs');
const path = require('path');
const { default: plist } = require('@expo/plist');

function parseSpritesheet(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = plist.parse(raw);
    const frames = {};
    const sheets = data.SHEETS_INFO;
    for (const sheet of sheets) {
        const sheetImage = sheet.SheetImage;
        const spritesInfo = sheet.Sheet_Sprites_Info;
        for (const [spriteName, spriteData] of Object.entries(spritesInfo)) {
            const tex = spriteData.TextureProperties;
            if (!tex?.Frame) continue;
            const nums = tex.Frame.match(/-?\d+(\.\d+)?/g);
            if (!nums || nums.length < 4) continue;
            frames[spriteName] = {
                sheet: sheetImage,
                x: parseFloat(nums[0]),
                y: parseFloat(nums[1]),
                w: parseFloat(nums[2]),
                h: parseFloat(nums[3]),
            };
        }
    }
    return frames;
}

const assetsDir = './public/assets';
const allFrames = {};

const psFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.pshs'));
for (const file of psFiles) {
    const frames = parseSpritesheet(path.join(assetsDir, file));
    Object.assign(allFrames, frames);
    console.log(`${file}: ${Object.keys(frames).length} frames`);
}

fs.writeFileSync('./public/assets/all_frames.json', JSON.stringify(allFrames, null, 2));
console.log('Total frames:', Object.keys(allFrames).length);