// GameSwipe.lua: horizontal swipe detector for paginated views.
// init() returns a swiper state object; attach swipe_callback before use.
// The caller must set swiper.swiping = false once the page-turn animation ends.

const SWIPE_RANGE = 50;   // pixels — mirrors application.GameSettings.swipeRange

// init(scene, totalPages, currentPage) → swiper
export function init(scene, totalPages, currentPage) {
    const swiper = {
        swiping:      false,
        total_page:   totalPages,
        current_page: currentPage,
        dir:          0,
        swipe_callback: null,
        _xStart:      null,
        _focused:     false,
    };

    swiper._onDown = (ptr) => {
        if (swiper.swiping) return;
        swiper._xStart  = ptr.x;
        swiper._focused = true;
    };

    swiper._onMove = (ptr) => {
        if (swiper.swiping || !swiper._focused) return;

        const dragDistance = swiper._xStart - ptr.x;
        if (dragDistance === 0) return;

        // block swipe right when already on last page
        if (dragDistance > 0 && swiper.current_page === swiper.total_page) return;
        // block swipe left when already on page 1
        if (dragDistance < 0 && swiper.current_page === 1) return;

        if (Math.abs(dragDistance) > SWIPE_RANGE) {
            swiper.dir          = dragDistance > 0 ? 1 : -1;
            swiper.current_page = swiper.current_page + swiper.dir;
            swiper.swipe_callback?.(swiper.current_page);
            swiper.swiping  = true;
            swiper._focused = false;
        }
    };

    swiper._onUp = () => {
        swiper._focused = false;
    };

    scene.input.on('pointerdown', swiper._onDown);
    scene.input.on('pointermove', swiper._onMove);
    scene.input.on('pointerup',   swiper._onUp);
    scene.input.on('pointerout',  swiper._onUp);

    swiper._scene = scene;
    return swiper;
}

// removeSelf(swiper) — detaches all listeners and clears callback
export function removeSelf(swiper) {
    if (!swiper?._scene) return;
    const input = swiper._scene.input;
    input.off('pointerdown', swiper._onDown);
    input.off('pointermove', swiper._onMove);
    input.off('pointerup',   swiper._onUp);
    input.off('pointerout',  swiper._onUp);
    swiper.swipe_callback = null;
    swiper._scene         = null;
}
