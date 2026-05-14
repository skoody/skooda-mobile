const UI = {};

export function getCached(id) {
    if (UI[id] === undefined) UI[id] = document.getElementById(id);
    return UI[id];
}

export const getEl = (id) => document.getElementById(id);

export function setText(id, text) {
    const el = getCached(id);
    if (el && el.innerText !== String(text)) el.innerText = text;
}

export function setWidth(id, pct) {
    const el = getCached(id);
    if (el) {
        const val = pct + '%';
        if (el.style.width !== val) el.style.width = val;
    }
}

export function setBg(id, color) {
    const el = getCached(id);
    if (el && el.style.background !== color) el.style.background = color;
}

export function setHTML(id, html) {
    const el = getCached(id);
    if (el && el.innerHTML !== html) el.innerHTML = html;
}

export function setPos(id, x, y) {
    const el = getCached(id);
    if (el) {
        const left = x + '%';
        const top = y + '%';
        if (el.style.left !== left) el.style.left = left;
        if (el.style.top !== top) el.style.top = top;
    }
}
