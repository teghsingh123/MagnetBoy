// LHBezier — a static bezier-chain physics body (e.g. terrain outline).

import { lh_pointFromString } from './LevelHelper.Helpers.LHHelpers.js';

export class LHBezier {
    constructor(dict) {
        this.lhUniqueName = '';
        this.lhTag        = 0;
        this.lhZOrder     = 0;
        this.lhPoints     = [];
        this.lhIsClosed   = false;
        this.lhDensity    = 0;
        this.lhFriction   = 0.1;
        this.lhRestitution = 0;
        this.lhCategoryBits = 0x0001;
        this.lhMaskBits     = 0xFFFF;
        this.lhGroup        = 0;

        if (!dict) return;
        this.lhUniqueName   = dict.stringForKey('UniqueName');
        this.lhTag          = dict.intForKey('tag');
        this.lhZOrder       = dict.intForKey('ZOrder');
        this.lhIsClosed     = dict.boolForKey('closed');
        this.lhDensity      = dict.floatForKey('density');
        this.lhFriction     = dict.floatForKey('friction');
        this.lhRestitution  = dict.floatForKey('restitution');
        this.lhCategoryBits = dict.intForKey('categoryBits') || 0x0001;
        this.lhMaskBits     = dict.intForKey('maskBits')     || 0xFFFF;
        this.lhGroup        = dict.intForKey('collisionGroup');

        const ptsArr = dict.arrayForKey('Points');
        if (ptsArr) {
            for (const obj of ptsArr.objects) {
                const s = obj.m_object != null ? String(obj.m_object) : '';
                this.lhPoints.push(lh_pointFromString(s));
            }
        }
    }

    // Build an array of {x,y} vertices in Phaser world space.
    getWorldPoints(offsetX = 0, offsetY = 0) {
        return this.lhPoints.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
    }
}
