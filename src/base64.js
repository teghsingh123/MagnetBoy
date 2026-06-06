// URL-safe base64 (RFC 4648 base64url): chars 62='-', 63='_', no '=' padding.
// Matches the alphabet used by base64.lua in the original game.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function encode(str) {
    let out = '';
    let i = 0;
    const len = str.length;
    while (i < len) {
        const b0 = str.charCodeAt(i++);
        const b1 = i < len ? str.charCodeAt(i++) : 0;
        const b2 = i < len ? str.charCodeAt(i++) : 0;
        out += CHARS[b0 >> 2];
        out += CHARS[((b0 & 3) << 4) | (b1 >> 4)];
        out += CHARS[((b1 & 15) << 2) | (b2 >> 6)];
        out += CHARS[b2 & 63];
    }
    // Trim padding chars that correspond to zero-padded bytes
    const pad = (3 - (len % 3)) % 3;
    return pad ? out.slice(0, -pad) : out;
}

export function decode(str) {
    const lookup = new Uint8Array(128);
    for (let i = 0; i < CHARS.length; i++) lookup[CHARS.charCodeAt(i)] = i;

    const len = str.length;
    const outLen = Math.floor(len * 3 / 4);
    let out = '';
    let i = 0;
    while (i < len) {
        const c0 = lookup[str.charCodeAt(i++)];
        const c1 = i < len ? lookup[str.charCodeAt(i++)] : 0;
        const c2 = i < len ? lookup[str.charCodeAt(i++)] : 0;
        const c3 = i < len ? lookup[str.charCodeAt(i++)] : 0;
        out += String.fromCharCode((c0 << 2) | (c1 >> 4));
        if (out.length < outLen) out += String.fromCharCode(((c1 & 15) << 4) | (c2 >> 2));
        if (out.length < outLen) out += String.fromCharCode(((c2 & 3) << 6) | c3);
    }
    return out;
}
