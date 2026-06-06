// Utility functions matching the LHHelpers.lua global helpers.
// In the browser we have no filesystem check, so lh_fileExists always returns false.

export function lh_fileExists(/*filename*/) { return false; }

export function imageFileWithFolder(filename) { return filename; }

export function lh_addToDirectorGroup(/*obj*/) {}

// Extract text between XML tags: ">value</"
export function lh_valueForField(line) {
    const m = line.match(/>([^<]*)<\//);
    return m ? m[1] : null;
}

export function lh_numberValue(str) { return Number(str); }

// Parse "{x, y}" point string
export function lh_pointFromString(str) {
    if (!str) return { x: 0, y: 0 };
    const m = str.match(/\{([^,]+),\s*([^}]+)\}/);
    if (!m) return { x: 0, y: 0 };
    return { x: Number(m[1]), y: Number(m[2]) };
}

// Parse "{w, h}" size string
export function lh_sizeFromString(str) {
    if (!str) return { width: 0, height: 0 };
    const m = str.match(/\{([^,]+),\s*([^}]+)\}/);
    if (!m) return { width: 0, height: 0 };
    return { width: Number(m[1]), height: Number(m[2]) };
}

// Parse "{{x, y}, {w, h}}" rect string
export function lh_rectFromString(str) {
    if (!str) return { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } };
    const m = str.match(/\{\{([^,]+),\s*([^}]+)\},\s*\{([^,]+),\s*([^}]+)\}\}/);
    if (!m) return { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } };
    return {
        origin: { x: Number(m[1]), y: Number(m[2]) },
        size:   { width: Number(m[3]), height: Number(m[4]) },
    };
}

export function lh_quadFromSize(w, h) {
    return [
        -w / 2,  h / 2,
        -w / 2, -h / 2,
         w / 2, -h / 2,
         w / 2,  h / 2,
    ];
}

export function lh_polygonPointsFromStrings(str, separator) {
    return str.split(separator).filter(s => s !== '');
}

export function lh_splitString(str, sep) {
    return str.split(sep);
}

export function lh_deepcopy(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(lh_deepcopy);
    const out = {};
    for (const k in obj) out[k] = lh_deepcopy(obj[k]);
    return out;
}

export function lh_toInt(n) { return n > 0 ? Math.floor(n) : Math.ceil(n); }

export function lh_PointEqualToPoint(a, b) { return a.x === b.x && a.y === b.y; }

export function lh_Sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }

export function lh_LengthSQ(v) { return v.x * v.x + v.y * v.y; }

export function lh_Length(v) { return Math.sqrt(lh_LengthSQ(v)); }

export function lh_Distance(a, b) { return lh_Length(lh_Sub(a, b)); }

export function lh_Dot(a, b) { return a.x * b.x + a.y * b.y; }

export function lh_printSize(/*s*/) {}
export function lh_printRect(/*r*/) {}
