// Singleton settings object used by LevelHelper.
// levelDeviceWidth/Height = the resolution the level was authored at (480×320).
// convertRatio: in the original code this handled retina/SD detection;
// in the JS port we always use the authored coordinates, so ratio = 1.

let _instance = null;

export class LHSettings {
    constructor() {
        this.spritesEvents    = {};
        this.enableRetina     = true;
        this.levelDeviceWidth  = 480;
        this.levelDeviceHeight = 320;
        this.newSpriteCreated  = 0;
        this.batchNodesSizes   = {};
        this.allLHMainLayers   = [];
    }

    static sharedInstance() {
        if (!_instance) _instance = new LHSettings();
        return _instance;
    }

    static reset() { _instance = null; }

    addLHMainLayer(layer) { this.allLHMainLayers.push(layer); }

    removeLHMainLayer(layer) {
        const idx = this.allLHMainLayers.indexOf(layer);
        if (idx !== -1) this.allLHMainLayers.splice(idx, 1);
    }

    newSpriteNumber() { return ++this.newSpriteCreated; }

    // Returns {x:1, y:1} ratio (no scaling needed in JS port).
    convertRatio() { return { x: 1, y: 1 }; }

    // Returns the image filename unchanged (no retina suffix logic needed).
    correctedImageFileAndTextureRect(filename) { return { file: filename, ratio: 1 }; }
}

export function removeLHSettings() { _instance = null; }
