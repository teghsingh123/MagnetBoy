// LHLayer — a named display container that can hold sprites, batches, and sub-layers.

export class LHLayer {
    constructor(scene, dict) {
        this.lhNodeType     = 'LHLayer';
        this.lhIsMainLayer  = false;
        this.lhUniqueName   = '';
        this.lhZOrder       = 0;
        this.lhTag          = 0;
        this.lhParentLoader = null;
        this.lhSprites      = [];
        this.lhBatches      = [];
        this.lhSubLayers    = [];
        this.lhBeziers      = [];
        this.container      = null;

        if (!dict) return;
        this.lhUniqueName = dict.stringForKey('UniqueName');
        this.lhZOrder     = dict.intForKey('ZOrder');
        this.lhTag        = dict.intForKey('tag');

        if (scene) {
            this.container = scene.add.container(0, 0);
            this.container.lhNodeType   = 'LHLayer';
            this.container.lhUniqueName = this.lhUniqueName;
            this.container.lhLayer      = this;
        }
    }

    isMainLayer() { return this.lhIsMainLayer; }

    uniqueName() { return this.lhUniqueName; }

    addChild(child) {
        const type = child.lhNodeType || '';
        if (type === 'LHSprite')      this.lhSprites.push(child);
        else if (type === 'LHBatch')  this.lhBatches.push(child);
        else if (type === 'LHLayer')  this.lhSubLayers.push(child);
        else if (type === 'LHBezier') this.lhBeziers.push(child);
        if (this.container) {
            const displayObj = child.container || child.image || child;
            if (displayObj && displayObj !== this.container) this.container.add(displayObj);
        }
    }

    spriteWithUniqueName(name) {
        for (const s of this.lhSprites) if (s.lhUniqueName === name) return s;
        for (const b of this.lhBatches) { const s = b.spriteWithUniqueName(name); if (s) return s; }
        for (const l of this.lhSubLayers) { const s = l.spriteWithUniqueName(name); if (s) return s; }
        return null;
    }

    layerWithUniqueName(name) {
        if (this.lhUniqueName === name) return this;
        for (const l of this.lhSubLayers) { const f = l.layerWithUniqueName(name); if (f) return f; }
        return null;
    }

    batchWithUniqueName(name) {
        for (const b of this.lhBatches) if (b.lhUniqueName === name) return b;
        for (const l of this.lhSubLayers) { const b = l.batchWithUniqueName(name); if (b) return b; }
        return null;
    }

    bezierWithUniqueName(name) {
        for (const b of this.lhBeziers) if (b.lhUniqueName === name) return b;
        for (const l of this.lhSubLayers) { const f = l.bezierWithUniqueName(name); if (f) return f; }
        return null;
    }

    spritesWithTag(tag) {
        let out = this.lhSprites.filter(s => s.lhTag === tag);
        for (const b of this.lhBatches) out = out.concat(b.spritesWithTag(tag));
        for (const l of this.lhSubLayers) out = out.concat(l.spritesWithTag(tag));
        return out;
    }

    allSprites() {
        let out = [...this.lhSprites];
        for (const b of this.lhBatches) out = out.concat(b.lhSprites);
        for (const l of this.lhSubLayers) out = out.concat(l.allSprites());
        return out;
    }

    allLayers() {
        let out = [this];
        for (const l of this.lhSubLayers) out = out.concat(l.allLayers());
        return out;
    }

    allBatches() {
        let out = [...this.lhBatches];
        for (const l of this.lhSubLayers) out = out.concat(l.allBatches());
        return out;
    }

    allBeziers() {
        let out = [...this.lhBeziers];
        for (const l of this.lhSubLayers) out = out.concat(l.allBeziers());
        return out;
    }

    removeSelf() {
        if (this.container) { this.container.destroy(); this.container = null; }
        for (const s of this.lhSprites) s.removeSelf?.();
        for (const b of this.lhBatches) b.removeSelf?.();
        for (const l of this.lhSubLayers) l.removeSelf?.();
        this.lhSprites = []; this.lhBatches = []; this.lhSubLayers = []; this.lhBeziers = [];
    }
}
