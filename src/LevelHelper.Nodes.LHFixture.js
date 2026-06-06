// LHFixture — describes a Box2D/Matter.js physics fixture attached to a sprite.
// Parses fixture data from the plist dictionary and exposes it for use by LHSprite.

import { lh_pointFromString, lh_polygonPointsFromStrings } from './LevelHelper.Helpers.LHHelpers.js';

export class LHFixture {
    constructor(dict, spriteSize) {
        if (!dict) return;
        this.lhDensity    = dict.floatForKey('density');
        this.lhFriction   = dict.floatForKey('friction');
        this.lhRestitution = dict.floatForKey('restitution');
        this.lhIsSensor   = dict.boolForKey('isSensor');
        this.lhFixtureType = dict.intForKey('fixtureType'); // 0=circle, 1=box, 2=polygon, 3=chain
        this.lhRadius     = dict.floatForKey('radius');
        this.lhCollisionGroup = dict.intForKey('collisionGroup');
        this.lhCategoryBits  = dict.intForKey('categoryBits');
        this.lhMaskBits      = dict.intForKey('maskBits');
        this.lhTag           = dict.intForKey('tag');

        this.lhShapes = [];
        const polygonsArr = dict.arrayForKey('polygons');
        if (polygonsArr) {
            for (const obj of polygonsArr.objects) {
                const pointsStr = obj.m_object != null ? String(obj.m_object) : '';
                const pts = lh_polygonPointsFromStrings(pointsStr, '|');
                const verts = pts.map(p => lh_pointFromString(p));
                this.lhShapes.push(verts);
            }
        }

        // Scale verts to sprite size if provided.
        if (spriteSize && this.lhShapes.length) {
            for (const shape of this.lhShapes) {
                for (const v of shape) {
                    v.x *= spriteSize.width;
                    v.y *= spriteSize.height;
                }
            }
        }
    }

    // Build a Matter.js body options object for use with Phaser's Matter integration.
    toMatterOptions() {
        return {
            density:     this.lhDensity    || 1,
            friction:    this.lhFriction   || 0.1,
            restitution: this.lhRestitution || 0,
            isSensor:    this.lhIsSensor   || false,
            collisionFilter: {
                group:    this.lhCollisionGroup || 0,
                category: this.lhCategoryBits   || 0x0001,
                mask:     this.lhMaskBits        || 0xFFFF,
            },
        };
    }
}
