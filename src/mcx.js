// mcx.lua → mcx.js
// MovieClipX v2013 (github.com/iGARET/MovieClipX) ported to Phaser 3.
//
// The Lua library flips frame visibility on Runtime enterFrame events.
// Here each clip drives itself via scene.time.addEvent.
//
// API mirrors the Lua globals:
//   sequence(opts)          → string[]   frame-name array
//   newTimeline()           → timeline   group animation controller
//   newMovieClip(scene, frames, w, h, opts) → clip
//   normalSpeed / halfSpeed / doubleSpeed / forward / backward  — constant factories

// ── speed / direction constants (Lua returned functions; we export plain values) ──

export const normalSpeed = 1;
export const halfSpeed   = 0.5;
export const doubleSpeed = 2;
export const forward     = 'forward';
export const backward    = 'backward';

// ── sequence ──────────────────────────────────────────────────────────────────
// sequence({ name, extension, startFrame, endFrame, zeros }) → string[]
// e.g. { name:'hero_run', extension:'png', startFrame:1, endFrame:8, zeros:2 }
// → ['hero_run01.png', …, 'hero_run08.png']

export function sequence(opts) {
    if (!opts) { console.warn('MCX SEQUENCE ERROR: Missing opts'); return false; }
    const { name, extension, endFrame } = opts;
    if (name == null)      { console.warn('MCX SEQUENCE ERROR: Missing name');      return false; }
    if (extension == null) { console.warn('MCX SEQUENCE ERROR: Missing extension'); return false; }
    if (endFrame == null)  { console.warn('MCX SEQUENCE ERROR: Missing endFrame');  return false; }

    const startFrame = opts.startFrame ?? 1;
    const zeros      = opts.zeros      ?? 0;
    const frames     = [];
    for (let i = startFrame; i <= endFrame; i++) {
        const count = zeros > 0 ? String(i).padStart(zeros, '0') : String(i);
        frames.push(`${name}${count}.${extension}`);
    }
    return frames;
}

// ── newMovieClip ──────────────────────────────────────────────────────────────
// newMovieClip(scene, frames, width, height, opts) → clip
//
// frames: string[] of texture keys (from sequence() or hand-written)
// opts: { speed, loops, direction:'forward'|'backward', remove, onComplete }
//
// clip properties / methods:
//   .play(opts)        start / restart playback
//   .pause()
//   .stop()
//   .setSpeed(anim, speed)   — ignored (speed is per-clip here)
//   .currentAnimation() → name (always the clip's own key)
//   .container         — the Phaser container holding all frame images

export function newMovieClip(scene, frames, width, height, opts = {}) {
    const speed     = opts.speed     ?? 5;    // frames per second
    const loops     = opts.loops     ?? 0;    // 0 = loop forever; N = play N times
    const direction = opts.direction ?? forward;
    const autoRemove= opts.remove    === true;
    const onComplete= opts.onComplete ?? null;

    const container = scene.add.container(0, 0);

    // build one image per frame, all hidden initially
    const images = frames.map((key) => {
        const img = scene.add.image(0, 0, key);
        if (width && height) img.setDisplaySize(width, height);
        img.setVisible(false);
        container.add(img);
        return img;
    });

    let currentFrame = direction === backward ? images.length - 1 : 0;
    let loopCount    = 0;
    let _timer       = null;
    let _paused      = false;

    function _showFrame(idx) {
        images.forEach((img, i) => img.setVisible(i === idx));
    }

    function _advance() {
        if (_paused) return;
        _showFrame(currentFrame);

        const isForward = direction !== backward;
        if (isForward) {
            currentFrame++;
            if (currentFrame >= images.length) {
                loopCount++;
                if (loops > 0 && loopCount >= loops) {
                    _finish();
                    return;
                }
                currentFrame = 0;
            }
        } else {
            currentFrame--;
            if (currentFrame < 0) {
                loopCount++;
                if (loops > 0 && loopCount >= loops) {
                    _finish();
                    return;
                }
                currentFrame = images.length - 1;
            }
        }
    }

    function _finish() {
        _stopTimer();
        onComplete?.();
        if (autoRemove) container.destroy(true);
    }

    function _stopTimer() {
        if (_timer) { _timer.remove(false); _timer = null; }
    }

    function _startTimer(fps) {
        _stopTimer();
        _timer = scene.time.addEvent({
            delay:    1000 / fps,
            callback: _advance,
            loop:     true,
        });
    }

    // show first frame immediately
    if (images.length > 0) _showFrame(currentFrame);

    const clip = {
        container,
        _frames:   images,

        play(playOpts = {}) {
            _paused = false;
            const startFrame = playOpts.startFrame ?? (direction === backward ? images.length - 1 : 0);
            const endFrame   = playOpts.endFrame   ?? (direction === backward ? 0 : images.length - 1);
            const fps        = playOpts.speed ?? speed;
            loopCount = 0;
            currentFrame = startFrame;
            _showFrame(currentFrame);
            _startTimer(fps);
        },

        pause() {
            _paused = true;
        },

        stop() {
            _paused = false;
            _stopTimer();
            currentFrame = direction === backward ? images.length - 1 : 0;
            _showFrame(currentFrame);
        },

        setSpeed(_anim, fps) {
            if (_timer) _startTimer(fps);
        },

        currentAnimation() {
            return frames[currentFrame] ?? null;
        },

        destroy() {
            _stopTimer();
            container.destroy(true);
        },
    };

    return clip;
}

// ── newTimeline ───────────────────────────────────────────────────────────────
// Groups multiple clips so play/pause/stop/alterTime apply to all.
// newTimeline() → timeline
//   timeline.addObject(clip)
//   timeline.play() / pause() / stop() / togglePause()
//   timeline.alterTime(_, fps)
//   timeline.getSpeed() → fps
//   timeline.speed  (settable)

export function newTimeline() {
    const clips  = [];
    let   _speed = normalSpeed;
    let   _paused= false;

    const timeline = {
        speed: _speed,

        addObject(clip) {
            clips.push(clip);
        },

        play() {
            _paused = false;
            clips.forEach(c => c.play?.());
        },

        pause() {
            _paused = true;
            clips.forEach(c => c.pause?.());
        },

        stop() {
            _paused = false;
            clips.forEach(c => c.stop?.());
        },

        togglePause() {
            if (_paused) {
                _paused = false;
                clips.forEach(c => c.play?.());
            } else {
                _paused = true;
                clips.forEach(c => c.pause?.());
            }
        },

        alterTime(_, fps) {
            timeline.speed = fps;
            clips.forEach(c => c.setSpeed?.(null, fps));
        },

        getSpeed() {
            return timeline.speed;
        },
    };

    return timeline;
}
