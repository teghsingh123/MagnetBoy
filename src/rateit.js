// rateit.lua → rateit.js
// App-store rating redirector. In a browser we open the store URL directly.
// Call setiTunesURL / setAndroidURL once at startup, then openURL() on a "Rate" button tap.

let _iosUrl     = null;
let _androidUrl = null;

// setiTunesURL(appId) — builds the iTunes review URL (mirrors Lua L3_1)
export function setiTunesURL(appId) {
    _iosUrl = 'itms-apps://ax.itunes.apple.com/WebObjects/MZStore.woa'
            + '/wa/viewContentsUserReviews?type=Purple+Software&id='
            + appId;
}

// setAndroidURL(appId) — builds the Google Play URL (mirrors Lua L4_1)
export function setAndroidURL(appId) {
    _androidUrl = 'market://details?id=' + appId;
}

// openURL() — opens the appropriate store URL in a new tab.
// On a real mobile device served via a webview the itms-apps / market schemes
// are intercepted by the OS; on desktop they fall back gracefully.
export function openURL() {
    const url = _iosUrl ?? _androidUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
