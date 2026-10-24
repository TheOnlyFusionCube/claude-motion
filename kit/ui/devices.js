// Device and UI pieces for app promos and product spots: phone, status bar, app icons, home screen,
// a store listing, a chat input, a browser window, glossy pills, and a small set of original glyphs.
//   import { useDevices, phone, appIcon, homeScreen, storeListing, chatInput, browser, pill, glyph } from 'motion/ui/devices.js';
//   await useDevices();   // in init, once (loads devices.css)
// Every builder returns a DOM element (or {el, …parts}) you place and animate yourself. Sizes are the
// device's own px (a phone screen is 430×932); scale the element or the camera for the shot.
// Use them for FICTIONAL apps. For a real product, rebuild its actual UI from its code (recreate-ui.md).

let loaded;
export function useDevices() {
  if (!loaded) loaded = new Promise((res, rej) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./devices.css', import.meta.url).href; l.onload = res; l.onerror = () => rej(new Error('devices.css failed to load')); document.head.append(l); });
  return loaded;
}

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Original line glyphs, 24×24, stroke = currentColor. glyph('spark', {size: 48, stroke: 2})
const G = {
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  wave: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>', bolt: '<path d="M13 2L5 13.5h6L10 22l8-11.5h-6z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', pencil: '<path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4"/>',
  plane: '<path d="M3 11l18-8-6 18-3-7z M12 14l9-11"/>', home: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>', bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z M10 20a2 2 0 004 0"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-1-1-5-1.5-5 1.2 0 2.6 5 1.4 5 4.2 0 2.6-4 2.3-5.4 1M12 6v2M12 16v2"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7"/>', music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>', map: '<path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z M9 4v14M15 6v14"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/>',
};
export const GLYPHS = Object.keys(G);
export function glyph(name, { size = 24, stroke = 2, color = 'currentColor', fill = 'none' } = {}) {
  return `<svg class="dv-glyph" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${G[name] || G.spark}</svg>`;
}

// A squircle app icon. bg: colour or CSS gradient; badge: a number in a red dot.
export function appIcon({ glyph: g = 'spark', bg = 'linear-gradient(160deg,#ffffff,#e9e7e2)', fg = '#111', size = 120, badge = null, label = null, mark = null } = {}) {
  const inner = mark || glyph(g, { size: size * .52, stroke: 1.8, color: fg });
  return h(`<div class="dv-app" style="--s:${size}px"><div class="dv-icon" style="background:${bg};color:${fg}">${inner}</div>${badge != null ? `<div class="dv-badge">${esc(badge)}</div>` : ''}${label ? `<div class="dv-label">${esc(label)}</div>` : ''}</div>`);
}

export function statusBar({ time = '9:41', dark = false } = {}) {
  return h(`<div class="dv-status ${dark ? 'dark' : ''}"><span class="dv-time">${esc(time)}</span><span class="dv-island"></span><span class="dv-sys"><i class="sig"></i><i class="wifi"></i><i class="bat"></i></span></div>`);
}

// A phone: {el, screen}. Put content in `screen` (430×932).
export function phone({ dark = false, status = true, time = '9:41', shadow = true } = {}) {
  const el = h(`<div class="dv-phone ${dark ? 'dark' : ''} ${shadow ? 'shadow' : ''}"><div class="dv-screen"></div></div>`);
  const screen = el.firstElementChild; if (status) screen.append(statusBar({ time, dark }));
  return { el, screen };
}

// A home screen grid: icons [{glyph, bg, fg, label, badge}], 4 columns, with a dock of the last 4.
export function homeScreen({ icons = [], wallpaper = 'linear-gradient(160deg,#d6e4ff,#f6d9c8 55%,#e9d6f6)', dock = 4, dark = false } = {}) {
  const el = h(`<div class="dv-home" style="background:${wallpaper}"><div class="dv-grid"></div><div class="dv-dock"></div></div>`);
  const grid = el.querySelector('.dv-grid'), dk = el.querySelector('.dv-dock'), apps = [];
  icons.forEach((o, i) => { const a = appIcon({ size: 82, ...o, label: i < icons.length - dock ? (o.label || '') : null }); (i < icons.length - dock ? grid : dk).append(a); apps.push(a); });
  if (dark) el.classList.add('dark');
  return { el, apps };
}

// A store listing page (dark or light): icon, name, maker, Get/Open button, a row of stats.
export function storeListing({ name = 'App', maker = 'Studio', icon = {}, button = 'Get', stats = [['4.8', '★★★★★', '210K ratings'], ['4+', 'Years old', 'Age'], ['#1', 'Productivity', 'Chart']], dark = true } = {}) {
  const el = h(`<div class="dv-store ${dark ? 'dark' : ''}"><div class="dv-back">‹ Search</div><div class="dv-head"></div><div class="dv-stats">${stats.map(([a, b, c]) => `<div><small>${esc(c)}</small><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join('')}</div><div class="dv-new"><b>What's New</b><small>Version 2.4 · Faster, calmer, smarter.</small></div></div>`);
  const head = el.querySelector('.dv-head'), ic = appIcon({ size: 128, ...icon });
  head.append(ic, h(`<div class="dv-title"><b>${esc(name)}</b><small>${esc(maker)}</small><span class="dv-get">${esc(button)}</span></div>`));
  return { el, icon: ic, button: el.querySelector('.dv-get') };
}

// A chat / prompt input: {el, field}. field.textContent = what's typed (use kit.typist).
export function chatInput({ placeholder = 'Ask anything', dark = true, width = 760 } = {}) {
  const el = h(`<div class="dv-input ${dark ? 'dark' : ''}" style="width:${width}px"><span class="dv-plus">${glyph('plus', { size: 26 })}</span><span class="dv-field" data-ph="${esc(placeholder)}"></span><span class="dv-mic">${glyph('mic', { size: 24 })}</span><span class="dv-go">${glyph('wave', { size: 24 })}</span></div>`);
  return { el, field: el.querySelector('.dv-field'), go: el.querySelector('.dv-go'), plus: el.querySelector('.dv-plus') };
}

// A browser window: {el, body, url}. Put a page in body.
export function browser({ url = 'example.com', width = 1440, height = 900, dark = false } = {}) {
  const el = h(`<div class="dv-browser ${dark ? 'dark' : ''}" style="width:${width}px;height:${height}px"><div class="dv-bar"><i></i><i></i><i></i><div class="dv-url">${glyph('lock', { size: 16 })}<span>${esc(url)}</span></div></div><div class="dv-body"></div></div>`);
  return { el, body: el.querySelector('.dv-body'), url: el.querySelector('.dv-url span') };
}

// A pill / chip / button. tone: 'glossy' (soft 3D white), 'accent', 'red', 'green', 'dark', 'glass'.
export function pill(text, { tone = 'glossy', icon = null, size = 1 } = {}) {
  return h(`<div class="dv-pill ${tone}" style="font-size:${30 * size}px">${icon ? `<span class="dv-pi">${glyph(icon, { size: 30 * size, stroke: 2.4 })}</span>` : ''}<span class="dv-pt">${esc(text)}</span></div>`);
}
