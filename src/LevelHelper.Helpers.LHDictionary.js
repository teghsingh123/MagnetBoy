import { LHObject, LH_OBJECT_TYPE } from './LevelHelper.Helpers.LHObject.js';
import { lh_pointFromString, lh_sizeFromString, lh_rectFromString } from './LevelHelper.Helpers.LHHelpers.js';

// LHArray is imported lazily (only used inside functions) to break the circular dep.
// Both LHDictionary and LHArray reference each other when parsing nested plist nodes.
let _LHArray = null;
export function _setLHArrayRef(ref) { _LHArray = ref; }

export class LHDictionary {
    constructor() { this.objects = {}; }

    static fromDOMNode(dictNode) {
        const d = new LHDictionary();
        const children = Array.from(dictNode.childNodes).filter(n => n.nodeType === 1);
        let i = 0;
        while (i < children.length) {
            const node = children[i];
            if (node.tagName === 'key') {
                const key = node.textContent.trim();
                i++;
                if (i < children.length) {
                    d.objects[key] = _wrapNode(children[i]);
                    i++;
                }
            } else { i++; }
        }
        return d;
    }

    static fromPlistString(xmlStr) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, 'text/xml');
        const dictNode = doc.querySelector('plist > dict');
        return dictNode ? LHDictionary.fromDOMNode(dictNode) : new LHDictionary();
    }

    static emptyDictionary() { return new LHDictionary(); }

    static initWithDictionary(other) {
        const d = new LHDictionary();
        d.objects = Object.assign({}, other.objects);
        return d;
    }

    setObjectForKey(obj, key) { if (obj != null) this.objects[key] = obj; }

    objectForKey(key) { return this.objects[key] ?? null; }

    stringForKey(key) {
        const o = this.objects[key];
        if (o == null) return '';
        return o instanceof LHObject ? String(o.m_object) : String(o);
    }

    floatForKey(key) {
        const o = this.objects[key];
        if (o == null) return 0;
        return o instanceof LHObject ? Number(o.m_object) : Number(o);
    }

    intForKey(key) { return this.floatForKey(key); }

    boolForKey(key) {
        const o = this.objects[key];
        if (o == null) return false;
        return o instanceof LHObject ? Boolean(o.m_object) : Boolean(o);
    }

    pointForKey(key) {
        const o = this.objects[key];
        if (o == null) return { x: 0, y: 0 };
        const s = o instanceof LHObject ? String(o.m_object) : String(o);
        return lh_pointFromString(s);
    }

    sizeForKey(key) {
        const o = this.objects[key];
        if (o == null) return { width: 0, height: 0 };
        const s = o instanceof LHObject ? String(o.m_object) : String(o);
        return lh_sizeFromString(s);
    }

    rectForKey(key) {
        const o = this.objects[key];
        if (o == null) return { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } };
        const s = o instanceof LHObject ? String(o.m_object) : String(o);
        return lh_rectFromString(s);
    }

    dictForKey(key) {
        const o = this.objects[key];
        if (o == null) return null;
        return o instanceof LHObject ? o.m_object : o;
    }

    arrayForKey(key) {
        const o = this.objects[key];
        if (o == null) return null;
        return o instanceof LHObject ? o.m_object : o;
    }

    allKeys() { return Object.keys(this.objects); }

    isEmpty() { return Object.keys(this.objects).length === 0; }

    tableWithKeysAndObjects() {
        const out = {};
        for (const [k, v] of Object.entries(this.objects)) {
            if (v instanceof LHObject) {
                const t = v.m_type;
                if (t === LH_OBJECT_TYPE.INT_TYPE || t === LH_OBJECT_TYPE.FLOAT_TYPE)
                    out[k] = Number(v.m_object);
                else if (t === LH_OBJECT_TYPE.BOOL_TYPE)
                    out[k] = Boolean(v.m_object);
                else if (t === LH_OBJECT_TYPE.STRING_TYPE)
                    out[k] = String(v.m_object);
                else
                    out[k] = v.m_object;
            } else { out[k] = v; }
        }
        return out;
    }

    removeObjectForKey(key) { delete this.objects[key]; }
    removeAllObjects() { this.objects = {}; }
    removeSelf() { this.removeAllObjects(); }
}

function _wrapNode(node) {
    const tag = node.tagName;
    if (tag === 'string')  return LHObject.init(node.textContent, LH_OBJECT_TYPE.STRING_TYPE);
    if (tag === 'real')    return LHObject.init(node.textContent, LH_OBJECT_TYPE.FLOAT_TYPE);
    if (tag === 'integer') return LHObject.init(node.textContent, LH_OBJECT_TYPE.INT_TYPE);
    if (tag === 'true')    return LHObject.init(true,  LH_OBJECT_TYPE.BOOL_TYPE);
    if (tag === 'false')   return LHObject.init(false, LH_OBJECT_TYPE.BOOL_TYPE);
    if (tag === 'dict')    return LHObject.init(LHDictionary.fromDOMNode(node),   LH_OBJECT_TYPE.LH_DICT_TYPE);
    if (tag === 'array')   return LHObject.init(_LHArray.fromDOMNode(node),       LH_OBJECT_TYPE.LH_ARRAY_TYPE);
    return LHObject.init(node.textContent, LH_OBJECT_TYPE.STRING_TYPE);
}

export { _wrapNode };
