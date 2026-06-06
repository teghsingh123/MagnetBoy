// LHParallaxNode — a layer that scrolls at a fractional rate relative to the camera.

import { lh_pointFromString } from './LevelHelper.Helpers.LHHelpers.js';

export class LHParallaxNode {
    constructor(dict) {
        this.lhUniqueName  = '';
        this.lhZOrder      = 0;
        this.lhRatio       = { x: 1, y: 1 };
        this.lhSprites     = [];

        if (!dict) return;
        this.lhUniqueName = dict.stringForKey('UniqueName');
        this.lhZOrder     = dict.intForKey('ZOrder');
        this.lhRatio      = dict.pointForKey('scrollRatio');

        const spritesArr = dict.arrayForKey('Sprites');
        if (spritesArr) {
            for (const obj of spritesArr.objects) {
                const sd = obj.m_object ?? obj;
                if (sd && typeof sd.stringForKey === 'function') {
                    this.lhSprites.push({
                        uniqueName:  sd.stringForKey('UniqueName'),
                        imageName:   sd.stringForKey('ImageFile'),
                        position:    sd.pointForKey('Position'),
                        zOrder:      sd.intForKey('ZOrder'),
                        ratio:       sd.pointForKey('scrollRatio'),
                    });
                }
            }
        }
    }

    uniqueName() { return this.lhUniqueName; }
}
