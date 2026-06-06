import { LHDictionary } from './LevelHelper.Helpers.LHDictionary.js';
import { lh_pointFromString, lh_rectFromString } from './LevelHelper.Helpers.LHHelpers.js';

export const LHAnimationHasEndedGlobalNotification     = 'LHAnimationHasEndedGlobalNotification';
export const LHAnimationFrameGlobalNotification        = 'LHAnimationFrameGlobalNotification';
export const LHAnimationHasEndedPerSpriteNotification  = 'LHAnimationHasEndedPerSpriteNotification';
export const LHAnimationFramePerSpriteNotification     = 'LHAnimationFramePerSpriteNotification';

export class LHAnimationFrameInfo {
    constructor(dict) {
        if (!dict) { console.warn('LHAnimationFrameInfo: dict is nil'); return; }
        this.lhDelayPerUnit = dict.floatForKey('delayPerUnit');
        this.lhOffset       = dict.pointForKey('offset');
        this.lhNotifications = LHDictionary.initWithDictionary(dict.dictForKey('notifications') || new LHDictionary());
        this.lhFrameName    = dict.stringForKey('spriteframe');
        this.lhRect         = dict.rectForKey('Frame');
        this.lhFrameOffset  = dict.pointForKey('TextureOffset');
    }
}

export class LHAnimationNode {
    constructor(dict) {
        if (!dict) { console.warn('LHAnimationNode: dict is nil'); return; }
        this.lhUniqueName   = dict.stringForKey('UniqueName');
        this.lhLoopType     = dict.intForKey('LoopType');
        this.lhFrameRate    = dict.floatForKey('FrameRate') || 30;
        this.lhFrames       = [];

        const framesArr = dict.arrayForKey('Frames');
        if (framesArr) {
            for (const obj of framesArr.objects) {
                const fd = obj.m_object ?? obj;
                if (fd && typeof fd.floatForKey === 'function') {
                    this.lhFrames.push(new LHAnimationFrameInfo(fd));
                }
            }
        }
    }
}
