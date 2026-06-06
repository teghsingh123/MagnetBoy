// LHSprite — a game object loaded from a LevelHelper plist.
// Wraps a Phaser image/sprite and its associated physics body data.

import { LHFixture } from './LevelHelper.Nodes.LHFixture.js';
import { LHAnimationNode } from './LevelHelper.Nodes.LHAnimationNode.js';

export const LH_BODY_TYPE = { STATIC: 0, KINEMATIC: 1, DYNAMIC: 2, NONE: 3 };

let _spriteCounter = 0;

export class LHSprite {
    constructor(scene, dict, parentBatch) {
        this.scene         = scene;
        this.lhNodeType    = 'LHSprite';
        this.lhUniqueName  = '';
        this.lhTag         = 0;
        this.lhZOrder      = 0;
        this.lhBodyType    = LH_BODY_TYPE.NONE;
        this.lhPosition    = { x: 0, y: 0 };
        this.lhSize        = { width: 0, height: 0 };
        this.lhRotation    = 0;
        this.lhAlpha       = 1;
        this.lhFlipX       = false;
        this.lhFlipY       = false;
        this.lhIsVisible   = true;
        this.lhImageFile   = '';
        this.lhFrameName   = '';
        this.lhShSceneName = '';
        this.lhShSheetName = '';
        this.lhFixtures    = [];
        this.lhAnimations  = {};
        this.lhCurrentAnim = null;
        this.lhPathName    = '';
        this.image         = null;
        this.body          = null;

        if (!dict) return;
        this.lhUniqueName = dict.stringForKey('UniqueName')
                          || ('UntitledSprite_' + (++_spriteCounter));
        this.lhTag        = dict.intForKey('tag');
        this.lhZOrder     = dict.intForKey('ZOrder');
        this.lhBodyType   = dict.intForKey('bodyType');
        this.lhPosition   = dict.pointForKey('Position');
        this.lhSize       = dict.sizeForKey('Size');
        this.lhRotation   = dict.floatForKey('rotation');
        this.lhAlpha      = dict.floatForKey('alpha');
        this.lhFlipX      = dict.boolForKey('flipX');
        this.lhFlipY      = dict.boolForKey('flipY');
        this.lhIsVisible  = dict.boolForKey('isVisible');
        this.lhPathName   = dict.stringForKey('pathUniqueName');

        // Texture info
        const texDict = dict.dictForKey('TextureProperties');
        if (texDict) {
            this.lhShSceneName = texDict.stringForKey('SHSceneName') || '';
            this.lhShSheetName = texDict.stringForKey('SHSheetName') || '';
            this.lhFrameName   = texDict.stringForKey('spriteframe')  || '';
            this.lhImageFile   = texDict.stringForKey('ImageFile')    || '';
        }

        // Fixtures
        const fixArr = dict.arrayForKey('Fixtures');
        if (fixArr) {
            for (const obj of fixArr.objects) {
                const fd = obj.m_object ?? obj;
                if (fd && typeof fd.floatForKey === 'function') {
                    this.lhFixtures.push(new LHFixture(fd, this.lhSize));
                }
            }
        }

        // Animations
        const animArr = dict.arrayForKey('Animations');
        if (animArr) {
            for (const obj of animArr.objects) {
                const ad = obj.m_object ?? obj;
                if (ad && typeof ad.stringForKey === 'function') {
                    const anim = new LHAnimationNode(ad);
                    this.lhAnimations[anim.lhUniqueName] = anim;
                }
            }
        }

        // Create Phaser image if scene is available.
        if (scene) this._createPhaserObject(scene, parentBatch);
    }

    _createPhaserObject(scene, parentBatch) {
        const key  = this.lhShSceneName || this.lhImageFile || '__missing__';
        const frame = this.lhFrameName || undefined;
        const x = this.lhPosition.x;
        const y = this.lhPosition.y;

        try {
            this.image = scene.add.image(x, y, key, frame);
            this.image.setAlpha(this.lhAlpha || 1);
            this.image.setAngle(this.lhRotation || 0);
            this.image.setFlip(this.lhFlipX, this.lhFlipY);
            this.image.setVisible(this.lhIsVisible !== false);
            if (this.lhSize.width)  this.image.setDisplaySize(this.lhSize.width, this.lhSize.height);
            this.image.lhSprite = this;
        } catch (e) {
            // Missing texture — create placeholder.
            this.image = scene.add.rectangle(x, y, this.lhSize.width || 32, this.lhSize.height || 32, 0xff00ff);
            this.image.lhSprite = this;
        }
    }

    uniqueName() { return this.lhUniqueName; }

    setPosition(x, y) {
        this.lhPosition = { x, y };
        if (this.image) { this.image.x = x; this.image.y = y; }
        if (this.body)  { this.body.setPosition?.(x, y); }
    }

    getPosition() {
        if (this.image) return { x: this.image.x, y: this.image.y };
        return { ...this.lhPosition };
    }

    removeSelf() {
        if (this.image) { this.image.destroy(); this.image = null; }
    }
}
