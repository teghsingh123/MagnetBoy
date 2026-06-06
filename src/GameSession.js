import { LevelHelperSettings } from './config.js';
import { saveScore } from './GameLevel.js';

// Mirrors GameSession.lua: tracks levels played during a single app session.
// Used to animate the robot trail on the level-select map after finishing a level.

export class GameSession {
    constructor() {
        this.prev_scores  = null;
        this.played_levels = null;
    }

    // Mirrors GameSession.addPlayedLevel(self).
    // Records the current level's star result. If the level was already played
    // this session, updates the star count if the new score is higher.
    // starCount: number of stars earned (from the HUD, 0–3).
    addPlayedLevel(pack, levelIndex, starCount) {
        if (!this.played_levels) this.played_levels = [];

        for (const entry of this.played_levels) {
            if (entry.index === levelIndex) {
                if (starCount > entry.star) entry.star = starCount;
                saveScore(pack, levelIndex, entry.star);
                return;
            }
        }

        // Random offset so the robot appears near the level button but not exactly on it.
        const dx = (Math.random() < 0.5 ? 1 : -1) * (160 + Math.floor(Math.random() * 50));
        const dy = (Math.random() < 0.5 ? 1 : -1) * (240 + Math.floor(Math.random() * 50));

        this.played_levels.push({ index: levelIndex, star: starCount, x: dx, y: dy });
        saveScore(pack, levelIndex, starCount);
    }
}

// Module-level singleton, created fresh each app launch (no persistence needed).
let instance = null;

export function getSession() {
    if (!instance) instance = new GameSession();
    return instance;
}

export function resetSession() {
    instance = new GameSession();
    return instance;
}

// Convenience exports kept for backward-compat with existing callers.
export function setLevel(world, level) {
    LevelHelperSettings.levelPack   = world;
    LevelHelperSettings.levelNumber = level;
}
