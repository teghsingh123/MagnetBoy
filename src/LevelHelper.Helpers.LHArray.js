import { LHObject, LH_OBJECT_TYPE } from './LevelHelper.Helpers.LHObject.js';
import { LHDictionary, _wrapNode, _setLHArrayRef } from './LevelHelper.Helpers.LHDictionary.js';
import { lh_pointFromString } from './LevelHelper.Helpers.LHHelpers.js';

export class LHArray {
    constructor() { this.objects = []; }

    static fromDOMNode(arrayNode) {
        const a = new LHArray();
        const children = Array.from(arrayNode.childNodes).filter(n => n.nodeType === 1);
        for (const node of children) {
            a.objects.push(_wrapNode(node));
        }
        return a;
    }

    static emptyArray() { return new LHArray(); }

    static initWithArray(other) {
        const a = new LHArray();
        a.objects = [...other.objects];
        return a;
    }

    addObject(obj) { if (obj != null) this.objects.push(obj); }

    objectAtIndex(i) { return this.objects[i - 1] ?? null; } // 1-based (Lua convention)

    count() { return this.objects.length; }

    pointAtIndex(i) {
        const o = this.objects[i - 1];
        if (!o) return { x: 0, y: 0 };
        const s = o instanceof LHObject ? String(o.m_object) : String(o);
        return lh_pointFromString(s);
    }

    dictAtIndex(i) {
        const o = this.objects[i - 1];
        if (!o) return null;
        return o instanceof LHObject ? o.m_object : o;
    }

    arrayAtIndex(i) {
        const o = this.objects[i - 1];
        if (!o) return null;
        return o instanceof LHObject ? o.m_object : o;
    }

    tableWithObjects() {
        return this.objects.map(o => {
            if (!(o instanceof LHObject)) return o;
            const t = o.m_type;
            if (t === LH_OBJECT_TYPE.INT_TYPE || t === LH_OBJECT_TYPE.FLOAT_TYPE) return Number(o.m_object);
            if (t === LH_OBJECT_TYPE.BOOL_TYPE)   return Boolean(o.m_object);
            if (t === LH_OBJECT_TYPE.STRING_TYPE) return String(o.m_object);
            return o.m_object;
        });
    }

    insertObjectsInTable(tbl) {
        for (const o of this.objects) {
            if (!(o instanceof LHObject)) { tbl.push(o); continue; }
            const t = o.m_type;
            if (t === LH_OBJECT_TYPE.INT_TYPE || t === LH_OBJECT_TYPE.FLOAT_TYPE) tbl.push(Number(o.m_object));
            else if (t === LH_OBJECT_TYPE.BOOL_TYPE)   tbl.push(Boolean(o.m_object));
            else if (t === LH_OBJECT_TYPE.STRING_TYPE) tbl.push(String(o.m_object));
        }
    }

    removeSelf() { this.objects = null; }
}

// Register this class with LHDictionary so it can create LHArray for <array> nodes.
_setLHArrayRef(LHArray);
