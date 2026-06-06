// Corona SDK's director.lua was a scene manager: changeScene, prev/curr/next slots, transitions.
// In Phaser, scene.scene.* handles all of this natively.

let fxTime    = 200;
let safeDelay = 50;

export function changeFxTime(ms)    { fxTime    = ms; }
export function changeSafeDelay(ms) { safeDelay = ms; }

export function changeScene(scene, key, params) {
    scene.time.delayedCall(safeDelay, () => {
        scene.scene.start(key, params);
    });
}

export function launchPopup(scene, key, params) {
    scene.scene.launch(key, params);
}

export function stopPopup(scene, key) {
    scene.scene.stop(key);
}

export function getCurrScene(scene) {
    return scene.scene.key;
}
