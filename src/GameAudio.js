// Mirrors GameAudio.lua: background music (intro, gameplay) + one-shot SFX.
// Uses Phaser's sound manager. All play calls are no-ops if the key isn't loaded.

const SFX_KEYS = [
    'star', 'magnet_pull', 'magnet_push', 'stone', 'elastic', 'wood',
    'pause', 'continue', 'win', 'fail', 'yawn', 'projectile',
    'portal', 'blackhole', 'metal', 'dismagnet', 'glass', 'wind',
];

export function preloadAudio(scene) {
    scene.load.audio('intro',    'assets/Audio/intro.wav');
    scene.load.audio('gameplay', 'assets/Audio/gameplay.wav');
    for (const key of SFX_KEYS) {
        scene.load.audio(key, `assets/Audio/${key}.wav`);
    }
}

function play(scene, key, config = {}) {
    if (!scene.sound.get(key) && !scene.cache.audio.has(key)) return;
    scene.sound.play(key, config);
}

export function playIntro(scene) {
    if (scene.sound.get('intro')?.isPlaying) return;
    play(scene, 'intro', { loop: true, volume: 1 });
}

export function stopIntro(scene) {
    scene.sound.get('intro')?.stop();
}

export function playGameBG(scene) {
    const bg = scene.sound.get('gameplay');
    if (bg?.isPaused) { bg.resume(); return; }
    if (bg?.isPlaying) return;
    play(scene, 'gameplay', { loop: true, volume: 0.5 });
}

export function pauseGameBG(scene) {
    scene.sound.get('gameplay')?.pause();
}

export function stopGameBG(scene) {
    scene.sound.get('gameplay')?.stop();
}

export function playButton(scene) {
    play(scene, 'button', { volume: 0.5 });
}

export function playSound(scene, key) {
    play(scene, key, { volume: 1 });
}

export function stopSound(scene, key) {
    scene.sound.get(key)?.stop();
}

export function stopAllSounds(scene) {
    scene.sound.stopAll();
}

export function disposeGamePlay(scene) {
    stopAllSounds(scene);
}
