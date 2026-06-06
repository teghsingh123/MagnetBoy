// Images.hero_hero_sheet.lua → Images.hero_hero_sheet.js
// Sprite-sheet atlas data for hero_hero_sheet.png (130×130)

export function getSpriteSheetData() {
    return {
        sheetContentWidth:  130,
        sheetContentHeight: 130,
        frames: [
            { x:  0, y:  0, width: 64, height: 64 },
            { x: 65, y:  0, width: 64, height: 64 },
            { x:  0, y: 65, width: 64, height: 64 },
            { x: 65, y: 65, width: 32, height: 32 },
        ],
    };
}
