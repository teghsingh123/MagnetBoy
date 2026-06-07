# MagnetBoy

A web port of the 2012 mobile game MagnetBoy by Moco Games, rebuilt in Phaser 4 + Vite.

The original game was a Corona SDK / LevelHelper title for iOS and Android. This project decompiles the original assets and game logic into a browser-playable version.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

## Project structure

```
src/              Game source (Phaser scenes, logic, audio)
levels/           Level data parsed from original .plhs files (JSON)
public/assets/    Game assets (sprites, audio, fonts, backgrounds)
parser.js         Parses original LevelHelper .plhs level files into JSON
```

## How it works

The original game's `.plhs` level files (Apple plist XML) are parsed by `parser.js`, which extracts sprite positions, physics properties, bezier path animations, and object tags into `levels/*.json`. The Phaser scenes read these JSON files at runtime to reconstruct each level.

Key systems ported from the original Lua/Corona SDK:
- Magnet attract/repel physics with polarity cycling
- Slingshot mechanic (grab circle magnet, drag, release)
- Bezier path movement for moving magnets and stars
- Triangle hitbox approximation for angled wood/stone blocks
- Black holes, dismagnets, portals, wind fans, metal surfaces, elastic blocks
