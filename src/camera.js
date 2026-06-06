// In Corona SDK, camera.lua created a display group used as a scene camera.
// In Phaser, the camera is scene.cameras.main — this module exposes helpers for it.

export function setupCamera(scene, worldWidth = 960, worldHeight = 440) {
    scene.cameras.main.setBounds(0, -60, worldWidth, worldHeight);
}

export function followHero(scene, hero) {
    scene.cameras.main.startFollow(hero, true, 0.1, 0.1);
}
