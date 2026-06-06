// LevelHelperLoader — parses a .lhc plist file and builds the scene graph.
// The .lhc file must be pre-loaded as a Phaser text asset before calling init().

import { LHDictionary } from './LevelHelper.Helpers.LHDictionary.js';
import './LevelHelper.Helpers.LHArray.js'; // registers _LHArray ref in LHDictionary
import { LHLayer }      from './LevelHelper.Nodes.LHLayer.js';
import { LHBatch }      from './LevelHelper.Nodes.LHBatch.js';
import { LHSprite }     from './LevelHelper.Nodes.LHSprite.js';
import { LHBezier }     from './LevelHelper.Nodes.LHBezier.js';
import { LHJoint }      from './LevelHelper.Nodes.LHJoint.js';
import { LHParallaxNode } from './LevelHelper.Nodes.LHParallaxNode.js';
import { LHSettings }   from './LevelHelper.Nodes.LHSettings.js';
import { lh_rectFromString, lh_pointFromString } from './LevelHelper.Helpers.LHHelpers.js';

export const LevelHelper_TAG = {
    DEFAULT_TAG:   0,
    METAL:         1,
    MAGNET:        2,
    MAGNET_RANGE:  3,
    MAGNET_CONTROL:4,
    ENEMY:         5,
    WIND:          6,
    BLACK_HOLE:    7,
    PORTAL:        8,
    DIS_MAGNETIC:  9,
    HERO:          10,
    STAR:          11,
    ROBOT_PIECE:   12,
    ELASTIC:       13,
    NUMBER_OF_TAGS:14,
};

export const LHLevelLoadingNotification = 'LHLevelLoadingNotification';

export class LevelHelperLoader {
    constructor() {
        this.lhNodes       = null;
        this.mainLHLayer   = null;
        this.lhJoints      = null;
        this.loadedJoints  = [];
        this.lhParallaxes  = null;
        this.loadedParallaxes = [];
        this.lhWb          = null;
        this.lhSafeFrame   = null;
        this.lhGameWorldRect = null;
        this.lhBackgroundColor = null;
        this.loadedBackgroundObj = null;
        this.lhGravityInfo = null;
        this.beginOrEndCollisionMap = {};
        this.preCollisionMap  = {};
        this.postCollisionMap = {};
        // Flat lookup maps built during load:
        this._sprites  = {};
        this._layers   = {};
        this._batches  = {};
        this._beziers  = {};
        this._joints   = {};
    }

    // Main factory — pass the Phaser scene and the pre-loaded text key for the .lhc file.
    static init(scene, lhcTextKey) {
        const loader = new LevelHelperLoader();
        const xmlStr = scene.cache.text.get(lhcTextKey);
        if (!xmlStr) {
            console.error('LevelHelperLoader: text asset not found:', lhcTextKey);
            return loader;
        }
        loader._loadFromXml(scene, xmlStr);
        return loader;
    }

    _loadFromXml(scene, xmlStr) {
        const root = LHDictionary.fromPlistString(xmlStr);

        // World rect / safe frame
        this.lhGameWorldRect = root.rectForKey('GameWorldRect');
        this.lhSafeFrame     = root.rectForKey('SafeFrame');
        this.lhGravityInfo   = root.pointForKey('Gravity');
        this.lhBackgroundColor = root.pointForKey('BackgroundColor');

        // Build main layer
        this.mainLHLayer = new LHLayer(scene, null);
        this.mainLHLayer.lhIsMainLayer = true;
        this.mainLHLayer.lhUniqueName  = 'mainLayer';

        LHSettings.sharedInstance().addLHMainLayer(this.mainLHLayer);

        // Layers array
        const layersArr = root.arrayForKey('Layers');
        if (layersArr) {
            for (const obj of layersArr.objects) {
                const layerDict = obj.m_object ?? obj;
                if (!layerDict || typeof layerDict.stringForKey !== 'function') continue;
                this._buildLayer(scene, layerDict, this.mainLHLayer);
            }
        }

        // Joints
        const jointsArr = root.arrayForKey('Joints');
        if (jointsArr) {
            for (const obj of jointsArr.objects) {
                const jd = obj.m_object ?? obj;
                if (!jd || typeof jd.stringForKey !== 'function') continue;
                const joint = new LHJoint(jd);
                this.loadedJoints.push(joint);
                this._joints[joint.lhUniqueName] = joint;
            }
        }

        // Parallaxes
        const parallaxArr = root.arrayForKey('Parallaxes');
        if (parallaxArr) {
            for (const obj of parallaxArr.objects) {
                const pd = obj.m_object ?? obj;
                if (!pd || typeof pd.stringForKey !== 'function') continue;
                const px = new LHParallaxNode(pd);
                this.loadedParallaxes.push(px);
            }
        }

        // Resolve joints (connect spriteA/B by name)
        for (const joint of this.loadedJoints) {
            joint.spriteA = this.spriteWithUniqueName(joint.lhSpriteAName);
            joint.spriteB = this.spriteWithUniqueName(joint.lhSpriteBName);
        }
    }

    _buildLayer(scene, dict, parentLayer) {
        const layer = new LHLayer(scene, dict);
        parentLayer.addChild(layer);
        this._layers[layer.lhUniqueName] = layer;

        // Sub-layers
        const subLayersArr = dict.arrayForKey('Layers');
        if (subLayersArr) {
            for (const obj of subLayersArr.objects) {
                const ld = obj.m_object ?? obj;
                if (!ld || typeof ld.stringForKey !== 'function') continue;
                this._buildLayer(scene, ld, layer);
            }
        }

        // Batches in this layer
        const batchesArr = dict.arrayForKey('Batches');
        if (batchesArr) {
            for (const obj of batchesArr.objects) {
                const bd = obj.m_object ?? obj;
                if (!bd || typeof bd.stringForKey !== 'function') continue;
                this._buildBatch(scene, bd, layer);
            }
        }

        // Sprites directly in layer (not in a batch)
        const spritesArr = dict.arrayForKey('Sprites');
        if (spritesArr) {
            for (const obj of spritesArr.objects) {
                const sd = obj.m_object ?? obj;
                if (!sd || typeof sd.stringForKey !== 'function') continue;
                this._buildSprite(scene, sd, layer, null);
            }
        }

        // Beziers
        const beziersArr = dict.arrayForKey('Beziers');
        if (beziersArr) {
            for (const obj of beziersArr.objects) {
                const bzd = obj.m_object ?? obj;
                if (!bzd || typeof bzd.stringForKey !== 'function') continue;
                const bz = new LHBezier(bzd);
                bz.lhNodeType = 'LHBezier';
                layer.addChild(bz);
                this._beziers[bz.lhUniqueName] = bz;
            }
        }
    }

    _buildBatch(scene, dict, parentLayer) {
        const batch = new LHBatch(scene, dict);
        parentLayer.addChild(batch);
        this._batches[batch.lhUniqueName] = batch;

        const spritesArr = dict.arrayForKey('Sprites');
        if (spritesArr) {
            for (const obj of spritesArr.objects) {
                const sd = obj.m_object ?? obj;
                if (!sd || typeof sd.stringForKey !== 'function') continue;
                this._buildSprite(scene, sd, null, batch);
            }
        }
    }

    _buildSprite(scene, dict, parentLayer, parentBatch) {
        const sprite = new LHSprite(scene, dict, parentBatch);
        if (parentBatch) parentBatch.addChild(sprite);
        else if (parentLayer) parentLayer.addChild(sprite);
        this._sprites[sprite.lhUniqueName] = sprite;
    }

    // --- Public query API (mirrors Lua LevelHelperLoader) ---

    spriteWithUniqueName(name)  { return this._sprites[name]  ?? null; }
    layerWithUniqueName(name)   { return this._layers[name]   ?? null; }
    batchWithUniqueName(name)   { return this._batches[name]  ?? null; }
    bezierWithUniqueName(name)  { return this._beziers[name]  ?? null; }
    jointWithUniqueName(name)   { return this._joints[name]   ?? null; }

    spritesWithTag(tag) {
        return Object.values(this._sprites).filter(s => s.lhTag === tag);
    }

    layersWithTag(tag) {
        return Object.values(this._layers).filter(l => l.lhTag === tag);
    }

    allSprites()  { return Object.values(this._sprites); }
    allLayers()   { return Object.values(this._layers); }
    allBatches()  { return Object.values(this._batches); }
    allJoints()   { return this.loadedJoints; }
    allParallaxes() { return this.loadedParallaxes; }

    getGravity() { return this.lhGravityInfo ?? { x: 0, y: -9.8 }; }

    getGameWorldRect() { return this.lhGameWorldRect; }

    getSafeFrame() { return this.lhSafeFrame; }

    removeSelf() {
        if (this.mainLHLayer) {
            LHSettings.sharedInstance().removeLHMainLayer(this.mainLHLayer);
            this.mainLHLayer.removeSelf();
            this.mainLHLayer = null;
        }
        this._sprites = {}; this._layers = {}; this._batches = {};
        this._beziers = {}; this._joints = {};
        this.loadedJoints = []; this.loadedParallaxes = [];
    }
}
