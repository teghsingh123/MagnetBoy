// parallax.lua → parallax.js
// Multi-layer parallax background system with seamless tile recycling.
//
// Usage:
//   const sys = newScene(scene, { width, height, left, top, bottom, repeated });
//   const layer = sys.newLayer({ image, width, height, speed, repeated, top, bottom, left });
//   sys.move(dx, dy);   // call each frame with world-space delta

export function newScene(scene, opts = {}) {
    const viewW = scene.cameras.main.width;
    const viewH = scene.cameras.main.height;

    const worldW    = opts.width   ?? viewW;
    const worldH    = opts.height  ?? viewH;
    const worldTop  = opts.top     ?? 0;
    const worldBot  = opts.bottom  ?? worldH;
    const worldLeft = opts.left    ?? 0;

    // mirrors L13_2 bounds object
    const bounds = {
        XMin: worldLeft,
        YMin: worldTop,
        XMax: worldLeft + worldW,
        YMax: worldTop  + worldH,
    };

    const container = scene.add.container(0, 0);
    const layers    = [];   // array of layer state objects

    // ── L1_1: clamp base-layer scroll position to world bounds ──────────
    function _clamp(layer) {
        if (layer.x > bounds.XMax) layer.x = bounds.XMax;
        if (layer.x < bounds.XMin) layer.x = bounds.XMin;
        if (layer.y > bounds.YMax) layer.y = bounds.YMax;
        if (layer.y < bounds.YMin) layer.y = bounds.YMin;
        layer._group.x = layer.x;
        layer._group.y = layer.y;
    }

    // ── L2_1: advance pointer circularly through a flat tile array ───────
    function _nextInArr(arr, tile, forward) {
        const i = arr.indexOf(tile);
        if (i === -1) return tile;
        return forward
            ? arr[(i + 1) % arr.length]
            : arr[(i - 1 + arr.length) % arr.length];
    }

    // ── L3_1: recycle off-screen tiles to the opposite edge ─────────────
    function _recycle(layer) {
        const gx = layer._group.x;
        const gy = layer._group.y;

        if (layer.repeated === 'horizontal' || layer.repeated === 'both') {
            const flatX = layer.repeated === 'both' ? layer.bgY.map(col => col[0]) : layer.bgX;
            const tw    = layer.bgX[0].displayWidth;

            // left tile scrolled off the right side of the viewport
            if (layer.leftMost.x + gx > viewW + tw) {
                const moved = layer.leftMost;
                moved.x = layer.rightMost.x + tw;
                layer.rightMost = moved;
                layer.leftMost  = _nextInArr(flatX, moved, true);
                // sync matching rows in "both" mode
                if (layer.repeated === 'both') _syncBothCols(layer);
            }
            // right tile scrolled off the left side of the viewport
            if (layer.rightMost.x + gx < -tw) {
                const moved = layer.rightMost;
                moved.x = layer.leftMost.x - tw;
                layer.leftMost  = moved;
                layer.rightMost = _nextInArr(flatX, moved, false);
                if (layer.repeated === 'both') _syncBothCols(layer);
            }
        }

        if (layer.repeated === 'vertical' || layer.repeated === 'both') {
            const flatY = layer.repeated === 'both' ? layer.bgY[0] : layer.bgY;
            const th    = layer.bgX[0].displayHeight;

            // top tile scrolled below the viewport
            if (layer.topMost.y + gy > viewH + th) {
                const moved = layer.topMost;
                moved.y = layer.bottomMost.y + th;
                layer.bottomMost = moved;
                layer.topMost    = _nextInArr(flatY, moved, true);
                if (layer.repeated === 'both') _syncBothRows(layer);
            }
            // bottom tile scrolled above the viewport
            if (layer.bottomMost.y + gy < -th) {
                const moved = layer.bottomMost;
                moved.y = layer.topMost.y - th;
                layer.topMost    = moved;
                layer.bottomMost = _nextInArr(flatY, moved, false);
                if (layer.repeated === 'both') _syncBothRows(layer);
            }
        }
    }

    // keep all rows in a column at the same x when recycling horizontally
    function _syncBothCols(layer) {
        for (let ci = 0; ci < layer.bgY.length; ci++) {
            const col = layer.bgY[ci];
            const refX = col[0].x;
            for (let ri = 1; ri < col.length; ri++) col[ri].x = refX;
        }
    }

    // keep all tiles in a row at the same y when recycling vertically
    function _syncBothRows(layer) {
        for (let ci = 0; ci < layer.bgY.length; ci++) {
            const col = layer.bgY[ci];
            for (let ri = 0; ri < col.length; ri++) {
                col[ri].y = layer.bgY[0][ri].y;
            }
        }
    }

    // ── L4_1: create extra tile copies for seamless looping ──────────────
    function _initTiles(layer) {
        const { repeated, speed } = layer;
        if (!repeated) return;

        const seed = layer.bgX[0];
        const tw   = seed.displayWidth;
        const th   = seed.displayHeight;

        if (repeated === 'horizontal' || repeated === 'both') {
            // enough extra tiles to cover the parallax travel range
            const extra = Math.ceil((viewW * (1 - (speed ?? 1))) / tw) + 2;
            for (let i = 1; i <= extra; i++) {
                const t = scene.add.image(seed.x + tw * i, seed.y, seed.texture.key);
                t.setDisplaySize(tw, th).setOrigin(0, 0);
                layer._group.add(t);
                layer.bgX.push(t);
            }
            layer.leftMost  = layer.bgX[0];
            layer.rightMost = layer.bgX[layer.bgX.length - 1];
        }

        if (repeated === 'vertical' || repeated === 'both') {
            const vExtra = Math.ceil((viewH * (1 - (speed ?? 1))) / th) + 2;

            if (repeated === 'both') {
                // bgY is a 2D array: bgY[col][row]
                layer.bgY = [];
                for (let ci = 0; ci < layer.bgX.length; ci++) {
                    const col = [layer.bgX[ci]];
                    layer.bgY.push(col);
                    for (let ri = 1; ri <= vExtra; ri++) {
                        const t = scene.add.image(layer.bgX[ci].x,
                                                  layer.bgX[ci].y + th * ri,
                                                  seed.texture.key);
                        t.setDisplaySize(tw, th).setOrigin(0, 0);
                        layer._group.add(t);
                        col.push(t);
                    }
                }
                layer.bottomMost = layer.bgY[0][0];
                layer.topMost    = layer.bgY[0][layer.bgY[0].length - 1];
            } else {
                // vertical-only: flat bgY array
                layer.bgY = [seed];
                for (let i = 1; i <= vExtra; i++) {
                    const t = scene.add.image(seed.x, seed.y + th * i, seed.texture.key);
                    t.setDisplaySize(tw, th).setOrigin(0, 0);
                    layer._group.add(t);
                    layer.bgY.push(t);
                }
                layer.bottomMost = layer.bgY[0];
                layer.topMost    = layer.bgY[layer.bgY.length - 1];
            }
        }
    }

    // ── public: newLayer ─────────────────────────────────────────────────
    // opts: { image, width, height, speed, repeated, top, bottom, left, view, id }
    // Returns the layer state object.
    function newLayer(layerOpts = {}) {
        const {
            image,
            width:  tw,
            height: th,
            speed       = null,
            repeated    = false,
            top         = null,
            bottom      = null,
            left        = bounds.XMin,
            view        = null,
        } = layerOpts;

        const group = scene.add.container(0, 0);
        container.add(group);

        const layer = {
            _group:     group,
            image,
            speed,
            repeated,
            top,
            bottom,
            left,
            bgX:        [],
            bgY:        [],
            leftMost:   null,
            rightMost:  null,
            topMost:    null,
            bottomMost: null,
            x: 0,
            y: 0,
            index: layers.length + 1,
        };

        // create or adopt the seed tile (bgX[0])
        let seed;
        if (image != null) {
            seed = scene.add.image(left, 0, image);
            seed.setDisplaySize(tw, th).setOrigin(0, 0);
            group.add(seed);
        } else if (view != null) {
            seed = view;
            group.add(seed);
        } else {
            layers.push(layer);
            return layer;
        }

        // vertical anchor — mirrors top/bottom reference-point logic
        if (top != null) {
            seed.y = top;
        } else if (bottom != null) {
            seed.y = bottom - (th ?? seed.displayHeight);
        }

        layer.bgX = [seed];
        layer.bgY = [seed];

        if (repeated) _initTiles(layer);

        layers.push(layer);
        return layer;
    }

    // ── public: insertObj ────────────────────────────────────────────────
    // Inserts an existing Phaser object into a layer group.
    // opts: { index }  (1-based layer index, default 1)
    function insertObj(obj, objOpts = {}) {
        const idx   = (objOpts.index ?? 1) - 1;
        const layer = layers[idx];
        if (!layer) return;
        layer._group.add(obj);
    }

    // ── public: move ─────────────────────────────────────────────────────
    // Call each frame with the world-space scroll delta (dx, dy).
    // Base layer (index 0) moves by (dx, dy) and is clamped.
    // Parallax layers mirror: pos = base.pos * speed.
    function move(dx, dy) {
        if (layers.length === 0) return;
        const base = layers[0];

        // base layer: translate then clamp (mirrors L14_2 i==1 branch)
        base.x += dx;
        base.y += dy;
        _clamp(base);

        // parallax layers (mirrors L14_2 else branch)
        for (let i = 1; i < layers.length; i++) {
            const layer = layers[i];
            if (layer.speed == null) continue;

            layer.x = base.x * layer.speed;
            layer.y = base.y * layer.speed;
            layer._group.x = layer.x;
            layer._group.y = layer.y;

            // recycle tiles if the base layer is set to looping
            if (base.repeated) _recycle(layer);
        }
    }

    return { container, newLayer, insertObj, move, layers, bounds };
}
