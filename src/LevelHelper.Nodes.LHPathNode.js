// LHPathNode — a waypoint path that sprites can follow.
// Parses point list from the plist dictionary.

import { lh_pointFromString } from './LevelHelper.Helpers.LHHelpers.js';

export class LHPathNode {
    constructor(dict) {
        this.lhUniqueName = '';
        this.lhPoints     = [];
        this.lhLoopType   = 0; // 0=none, 1=loop, 2=ping-pong
        this.lhPathType   = 0;

        if (!dict) return;
        this.lhUniqueName = dict.stringForKey('UniqueName');
        this.lhLoopType   = dict.intForKey('LoopType');
        this.lhPathType   = dict.intForKey('PathType');

        const ptsArr = dict.arrayForKey('Points');
        if (ptsArr) {
            for (const obj of ptsArr.objects) {
                const s = obj.m_object != null ? String(obj.m_object) : '';
                this.lhPoints.push(lh_pointFromString(s));
            }
        }
    }
}
