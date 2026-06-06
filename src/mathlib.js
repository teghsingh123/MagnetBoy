// mathlib.lua: 2D geometry / math utility library.
// All functions are pure (no Phaser/DOM dependencies) except polygonFill (stubbed).

const _DEG = 180 / Math.PI;  // mirrors: L2_1 = 180 / (4*atan(1))

// distance between two {x,y} points
export function lengthOf(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function convertDegreesToRadians(deg) { return deg * (Math.PI / 180); }
export function convertRadiansToDegrees(rad) { return rad * _DEG; }

// rotate {x,y} around the origin by `angle` degrees
export function rotatePoint(point, angle) {
    const r = convertDegreesToRadians(angle);
    return {
        x: point.x * Math.cos(r) - point.y * Math.sin(r),
        y: point.x * Math.sin(r) + point.y * Math.cos(r),
    };
}

// rotate `point` around `pivot` by `angle` degrees; rounds coords if round=true
export function rotateAboutPoint(point, pivot, angle, round) {
    const local = { x: point.x - pivot.x, y: point.y - pivot.y };
    const rot   = rotatePoint(local, angle);
    let rx = rot.x + pivot.x;
    let ry = rot.y + pivot.y;
    if (round) { rx = Math.round(rx); ry = Math.round(ry); }
    return { x: rx, y: ry };
}

// angle (degrees, 0-360) of vector from origin to {x,y}
export function angleOfPoint(point) {
    let deg = Math.atan2(point.y, point.x) * _DEG;
    if (deg < 0) deg += 360;
    return deg;
}

// angle (degrees, 0-360) from point a to point b
export function angleBetweenPoints(a, b) {
    return angleOfPoint({ x: b.x - a.x, y: b.y - a.y });
}

// signed angle (degrees, -180..180) from a to b — raw atan2
export function angleOf(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * _DEG;
}

// point at distance `len` from a towards b.
// if maxLen supplied: clamp the chosen distance to [len, maxLen] relative to dist(a,b)
export function extrudeToLen(a, b, len, maxLen) {
    const dist = lengthOf(a, b);
    let desired = len;
    if (maxLen !== undefined && maxLen !== null) {
        if (len > dist)      desired = len;
        else if (maxLen < dist) desired = maxLen;
        else                 return b.x, b.y;   // b already inside range
    }
    const t = desired / dist;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// shortest angular difference, wrapped to (-180, 180]
export function smallestAngleDiff(a, b) {
    let d = a - b;
    if (d >  180) d -= 360;
    if (d < -180) d += 360;
    return d;
}

// angle (degrees) at vertex b in triangle a-b-c (law of cosines)
// angle (degrees) at vertex a in triangle a-b-c (matches Lua: numerator = AB²+AC²-BC²)
export function angleAt(a, b, c) {
    const ab = lengthOf(a, b);
    const bc = lengthOf(b, c);
    const ac = lengthOf(a, c);
    const cosA = (ab * ab + ac * ac - bc * bc) / (2 * ab * ac);
    return Math.acos(cosA) * _DEG;
}

// true if angle at origin (p0) ≥ sum of angles formed by p1 and p2
// mirrors: isPointInAngle(p0, p1, p2, p3) — angleAt(p0,p1,p2) >= angleAt(p0,p1,p3)+angleAt(p0,p2,p3)
export function isPointInAngle(p0, p1, p2, p3) {
    const a  = angleAt(p0, p1, p2);
    const b  = angleAt(p0, p1, p3);
    const c  = angleAt(p0, p2, p3);
    return Math.round(a) >= Math.round(b + c);
}

export function fractionOf(total, part)    { return part / total; }
export function percentageOf(total, part)  { return (part / total) * 100; }

// centroid of an array of {x,y} points (also accepts Corona-style group with numChildren)
export function midPoint(points) {
    let n = points.length;
    if (points.numChildren && points.numChildren > 0) n = points.numChildren;
    let sx = 0, sy = 0;
    for (let i = 0; i < n; i++) { sx += points[i].x; sy += points[i].y; }
    return { x: sx / n, y: sy / n };
}

// signed cross product / right-side test: is c to the right of line a→b?
// returns [bool, crossValue]
export function isOnRight(a, b, c) {
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return [cross > 0, cross];
}

// reflect point c across line a→b
export function reflect(a, b, c) {
    const dy =  b.y - a.y;
    const ndx = a.x - b.x;   // left-normal x = -dx
    const t   = ((c.x - a.x) * dy + (c.y - a.y) * ndx) / (dy * dy + ndx * ndx);
    return { x: c.x - 2 * dy * t, y: c.y - 2 * ndx * t };
}

// intersection of segment p1→p2 with segment p3→p4.
// clamp=true clamps t to [0,1] before returning.
// returns {x,y} intersection point.
export function doLinesIntersect(p1, p2, p3, p4, clamp) {
    const d  = { x: p3.x - p1.x, y: p3.y - p1.y };
    const e  = { x: p2.x - p1.x, y: p2.y - p1.y };
    const ex2 = e.x * e.x + e.y * e.y;
    const dot  = d.x * e.x + d.y * e.y;
    let t = dot / ex2;
    if (!clamp) { /* no clamp */ }
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return { x: p1.x + e.x * t, y: p1.y + e.y * t };
}

// point-in-polygon test (ray casting, variant used for GetClosestPoint in Lua)
export function GetClosestPoint(polygon, point) {
    const n = polygon.length;
    let inside = false;
    let prev = n - 1;
    for (let i = 0; i < n; i++) {
        const vi = polygon[i], vp = polygon[prev];
        if ((vi.y < point.y && vp.y >= point.y) ||
            (vp.y < point.y && vi.y >= point.y)) {
            const xi = vi.x + (point.y - vi.y) / (vp.y - vi.y) * (vp.x - vi.x);
            if (xi < point.x) inside = !inside;
        }
        prev = i;
    }
    return inside;
}

// point-in-polygon test (ray casting, Lua's second variant)
export function pointInPolygon(polygon, point) {
    const n = polygon.length;
    let inside = false;
    let prev = n - 1;
    for (let i = 0; i < n; i++) {
        const vi = polygon[i], vp = polygon[prev];
        if ((vi.y < point.y) !== (vp.y < point.y)) {
            const xi = vi.x + (point.y - vi.y) * (vp.x - vi.x) / (vp.y - vi.y);
            if (xi < point.x) inside = !inside;
        }
        prev = i;
    }
    return inside;
}

// shoelace formula sign — true if polygon vertices are clockwise
export function isPolyClockwise(polygon) {
    let sum = 0;
    const n = polygon.length - 1;
    for (let i = 1; i < n; i++) {
        const v  = { x: polygon[i].x - polygon[0].x,   y: polygon[i].y - polygon[0].y };
        const vn = { x: polygon[i+1].x - polygon[0].x, y: polygon[i+1].y - polygon[0].y };
        sum += v.x * (-vn.y) - vn.x * (-v.y);
    }
    return sum < 0;
}

// polygonFill — scan-line polygon renderer.
// In Corona this drew display.newRect objects; in Phaser pass a Phaser.GameObjects.Graphics.
// graphics.fillStyle / fillRect must be configured by the caller before invoking.
export function polygonFill(polygon, graphics, fillStep = 1, lineHeight = 1, color = null) {
    if (!graphics) return null;   // no-op if no render context supplied
    // stub: a full scan-line rasteriser is rarely needed outside debug/editor tools
    return null;
}
