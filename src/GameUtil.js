import allFrames from './assets/all_frames.json';

export { allFrames };

export function registerFrame(textures, sheet, name) {
    const f = allFrames[name];
    if (!f) return;
    const texture = textures.get(sheet);
    if (texture && !texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
}
