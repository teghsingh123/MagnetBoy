// In Corona SDK, camera.lua created a display group used as a scene camera.
// In Phaser, the camera is scene.cameras.main — this module exposes helpers for it.

export function setupCamera(scene, worldWidth = 960, worldHeight = 440) {
    // Camera clamped to the background area (960×320); hero can still leave this area to trigger fail
    scene.cameras.main.setBounds(0, 0, 960, 320);
}

export function followHero(scene, hero) {
    scene.cameras.main.startFollow(hero, true, 0.1, 0.1);
}
