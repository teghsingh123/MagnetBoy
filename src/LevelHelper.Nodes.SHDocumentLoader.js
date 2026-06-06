// SHDocumentLoader — loads a SpriteHelper .shl sprite-sheet document (.plist).
// In the Lua version this parsed a plist file from disk using LHDictionary.
// In the JS port the sprite sheet data is already embedded in the Images.*.js files,
// so this is a lightweight registry that maps sheet names to their frame dictionaries.

import { LHDictionary } from './LevelHelper.Helpers.LHDictionary.js';

const _cache = {};

export class SHDocumentLoader {
    // Register raw plist XML string under a sheet name.
    static registerPlist(sheetName, xmlStr) {
        _cache[sheetName] = LHDictionary.fromPlistString(xmlStr);
    }

    // Register a pre-parsed LHDictionary directly.
    static registerDict(sheetName, dict) {
        _cache[sheetName] = dict;
    }

    static documentWithFile(sheetName) {
        return _cache[sheetName] ?? null;
    }

    static removeAll() {
        for (const k in _cache) delete _cache[k];
    }
}

export function shDocumentWithFile(sheetName) {
    return SHDocumentLoader.documentWithFile(sheetName);
}
