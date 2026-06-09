// Matches GameBG.lua: tiled background from world-specific image strips
export function createBackground(scene) {
    const colWidths  = [1024, 256, 512, 512, 96];
    const rowHeights = [512, 288];
    const scale = 0.4;
    let xPos = 0;
    for (let col = 0; col < 5; col++) {
        let yPos = 0;
        for (let row = 0; row < 2; row++) {
            scene.add.image(xPos, yPos, `bg_w${scene.currentWorld}_${col+1}_${row+1}`).setOrigin(0, 0).setScale(scale);
            yPos += rowHeights[row] * scale;
        }
        xPos += colWidths[col] * scale;
    }
}
