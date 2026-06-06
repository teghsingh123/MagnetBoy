import { LevelHelperSettings } from './config.js';

// Level button positions for each pack (4 packs × 20 levels).
// Each entry: { index: levelNumber, x, y, star, alpha? }
// Mirrors the hardcoded position tables in GameLevel.lua.
export const LEVEL_POSITIONS = [
    // Pack 1
    [
        { index: 1,  x: -60, y: -10, star: 0 },
        { index: 2,  x: -20, y:   2, star: 0 },
        { index: 3,  x: -66, y:  41, star: 0 },
        { index: 17, x: -23, y:  50, star: 0 },
        { index: 5,  x: -19, y:  -9, star: 0 },
        { index: 6,  x: -42, y:  23, star: 0 },
        { index: 7,  x:  -2, y: -20, star: 0 },
        { index: 8,  x:  32, y: -18, star: 0 },
        { index: 9,  x:  53, y: -20, star: 0 },
        { index: 10, x:  72, y: -19, star: 0 },
        { index: 11, x:  73, y: -55, star: 0 },
        { index: 12, x:  45, y:  -5, star: 0 },
        { index: 13, x:  48, y:  17, star: 0 },
        { index: 14, x:  34, y:  45, star: 0 },
        { index: 15, x:  34, y:  44, star: 0 },
        { index: 16, x:  63, y:  47, star: 0 },
        { index: 4,  x: -24, y:  42, star: 0 },
        { index: 18, x:  12, y:  65, star: 0 },
        { index: 19, x:  13, y:  29, star: 0 },
        { index: 20, x:  71, y:  19, star: 0 },
    ],
    // Pack 2
    [
        { index: 1,  x:   0, y: -80, star: 0 },
        { index: 2,  x:   0, y: -66, star: 0 },
        { index: 4,  x:   5, y: -31, star: 0 },
        { index: 3,  x:  -2, y: -36, star: 0 },
        { index: 5,  x: -17, y: -23, star: 0 },
        { index: 6,  x:   5, y:   1, star: 0 },
        { index: 7,  x: -37, y: -34, star: 0 },
        { index: 8,  x:  41, y: -41, star: 0 },
        { index: 9,  x: -55, y:  -8, star: 0 },
        { index: 10, x:  73, y: -19, star: 0 },
        { index: 11, x: -62, y: -30, star: 0 },
        { index: 12, x:  70, y:   7, star: 0 },
        { index: 13, x:  13, y:  16, star: 0 },
        { index: 15, x: -30, y:  51, star: 0 },
        { index: 18, x: -28, y:  46, star: 0, alpha: 0.4 },
        { index: 14, x:  14, y:  31, star: 0 },
        { index: 16, x:  47, y:  67, star: 0 },
        { index: 17, x:  49, y:  63, star: 0, alpha: 0.4 },
        { index: 19, x: -56, y:  73, star: 0, alpha: 0.4 },
        { index: 20, x:  36, y:  93, star: 0, alpha: 0.4 },
    ],
    // Pack 3
    [
        { index: 1,  x: -60, y: -69, star: 0 },
        { index: 2,  x: -21, y: -62, star: 0 },
        { index: 3,  x: -46, y: -43, star: 0 },
        { index: 8,  x: -56, y:  30, star: 0 },
        { index: 4,  x: -48, y: -10, star: 0 },
        { index: 5,  x: -39, y:  -7, star: 0 },
        { index: 6,  x: -22, y:  11, star: 0 },
        { index: 7,  x:  33, y:   5, star: 0 },
        { index: 9,  x: -45, y:  62, star: 0 },
        { index: 10, x: -56, y:  81, star: 0 },
        { index: 11, x:   2, y:  28, star: 0 },
        { index: 12, x:   7, y:  66, star: 0 },
        { index: 13, x: -15, y:  92, star: 0 },
        { index: 14, x:  28, y:   0, star: 0, alpha: 0.4 },
        { index: 15, x:  34, y:  36, star: 0 },
        { index: 16, x:  35, y:  60, star: 0 },
        { index: 17, x:  53, y:   4, star: 0 },
        { index: 18, x:  74, y:  28, star: 0 },
        { index: 19, x:  82, y:  66, star: 0 },
        { index: 20, x:  47, y: -19, star: 0 },
    ],
    // Pack 4
    [
        { index: 1,  x: -80, y: -50, star: 0 },
        { index: 2,  x: -74, y: -74, star: 0 },
        { index: 4,  x: -88, y: -26, star: 0 },
        { index: 3,  x: -104, y: -37, star: 0 },
        { index: 17, x:   2, y:  47, star: 0 },
        { index: 18, x:  40, y:  59, star: 0 },
        { index: 16, x:  -9, y:  23, star: 0 },
        { index: 9,  x:  11, y: -13, star: 0 },
        { index: 10, x:  10, y:   3, star: 0 },
        { index: 7,  x:  27, y: -38, star: 0 },
        { index: 6,  x:  -8, y: -39, star: 0 },
        { index: 5,  x: -45, y: -26, star: 0 },
        { index: 8,  x:  84, y: -40, star: 0 },
        { index: 11, x:  87, y: -21, star: 0 },
        { index: 12, x: -39, y:  25, star: 0 },
        { index: 13, x: -20, y:  20, star: 0 },
        { index: 15, x:  26, y:  31, star: 0 },
        { index: 14, x:  32, y:   1, star: 0 },
        { index: 19, x: -20, y:  62, star: 0 },
        { index: 20, x:  17, y:  84, star: 0 },
    ],
];

// Returns a deep copy of button positions for the given pack (1-based),
// with star counts loaded from localStorage.
export function getLevelPositions(pack) {
    const positions = LEVEL_POSITIONS[pack - 1];
    if (!positions) return [];

    const raw = localStorage.getItem(`scores_pack_${pack}`);
    const scores = raw ? JSON.parse(raw) : {};

    return positions.map(p => ({
        ...p,
        star: scores[p.index] ?? 0,
    }));
}

// Saves a star score for a level. Keeps the highest score seen.
export function saveScore(pack, level, stars) {
    const key = `scores_pack_${pack}`;
    const raw = localStorage.getItem(key);
    const scores = raw ? JSON.parse(raw) : {};
    if ((scores[level] ?? 0) < stars) {
        scores[level] = stars;
        localStorage.setItem(key, JSON.stringify(scores));
    }
}

// Loads JSON physics level data (LHC-converted). Used by GameScene.
const levels = import.meta.glob('../levels/*.json', { eager: true });

export function getLevel(world, level) {
    const key = `../levels/level_${world}_${level}.json`;
    return levels[key]?.default || levels[key];
}
