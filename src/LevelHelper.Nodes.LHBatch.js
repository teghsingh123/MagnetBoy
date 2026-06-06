// LHBatch — a display group (Phaser container) that holds sprites sharing a texture atlas.

let _batchCounter = 0;

export class LHBatch {
    constructor(scene, dict) {
        this.lhNodeType    = 'LHBatch';
        this.lhImagePath   = '';
        this.lhZOrder      = 0;
        this.lhUniqueName  = '';
        this.lhSHFile      = null;
        this.lhSprites     = [];
        this.lhParentLoader = null;
        this.container     = null;

        if (!dict) return;
        this.lhImagePath  = dict.stringForKey('SheetImage');
        this.lhZOrder     = dict.intForKey('ZOrder');
        this.lhUniqueName = dict.stringForKey('UniqueName')
                         || dict.stringForKey('SheetName')
                         || ('UntitledBatch_' + (++_batchCounter));

        if (scene) {
            this.container = scene.add.container(0, 0);
            this.container.lhNodeType    = 'LHBatch';
            this.container.lhUniqueName  = this.lhUniqueName;
            this.container.lhZOrder      = this.lhZOrder;
            this.container.lhParentBatch = this;
        }
    }

    uniqueName() { return this.lhUniqueName; }

    addChild(child) {
        this.lhSprites.push(child);
        if (this.container) this.container.add(child.image || child);
    }

    spriteWithUniqueName(name) {
        return this.lhSprites.find(s => s.lhUniqueName === name) ?? null;
    }

    spritesWithTag(tag) {
        return this.lhSprites.filter(s => s.lhTag === tag);
    }

    removeSelf() {
        if (this.container) { this.container.destroy(); this.container = null; }
        this.lhSprites = [];
    }
}
