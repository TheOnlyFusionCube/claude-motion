// Style presets: six ready-made looks that share one vocabulary of classes, so a film can switch
// look by changing one word. See references/styles.md for the local preset API.
//
//   import { useStyle, STYLES } from 'motion/styles/index.js';
//   const st = await useStyle(kit, 'editorial', { palette: 'cobalt', values: { stress: 'underline' }, root });
//   render: st.ground(t); st.stress(headEl, t, 1.2); st.rule(ruleEl, t, 0.8); st.lights('41,000', {...}) (midnight)
//
// Shared classes inside the root: .s-words (a flex column you place), .s-kicker, .s-head (wrap the stressed
// phrase in <em>), .s-sub, .s-stat, .s-label, .s-quote, .s-by, .s-card, .s-window (> .s-bar + .s-pane),
// .s-chip, .s-rule, .s-shape. Colours as CSS variables: --ground --main --ink --accent --muted --surface.

const P = (ground, main, ink, accent, surface) => ({ ground, main, ink, accent, surface });

export const STYLES = {
  sketch: {
    what: 'A designer at the whiteboard: black marker, one highlighter, arrows that point at what matters.',
    palettes: { marker: P('#fbfbf8', '#2b59c3', '#1d2125', '#ffe45c'), mint: P('#eaf6f0', '#1f8a5b', '#183a2f', '#ff9f6b'), night: P('#1c2230', '#7fb2ff', '#f2f0e8', '#ffd25a', '#262e3f') },
    values: { paper: 'dots', stress: 'highlight', wobble: 40, weight: 5 },
    options: { paper: ['plain', 'dots', 'squared', 'board'], stress: ['highlight', 'underline', 'circle'], wobble: '0–100', weight: '3–7 (px)' },
  },
  bubbles: {
    what: 'Big glowing glass spheres on a gradient you can turn. Deep and cinematic, or light and airy.',
    palettes: { ember: P('#1a0b12', '#ff6a3d', '#fff3ea', '#ffc36a'), lagoon: P('#04212b', '#19b6c9', '#eafbff', '#8cf0d2'), cobalt: P('#0a1440', '#3d6bff', '#eef2ff', '#9db4ff') },
    values: { angle: 200, ground: 'deep', count: 3, size: 100, fade: 60 },
    options: { angle: '0–360', ground: ['deep', 'light'], count: '1–5', size: '60–125', fade: '0–100' },
  },
  editorial: {
    what: 'A well-set annual report: big serif, italic stress, fine rules, covers in your colour.',
    palettes: { cobalt: P('#f6f3ec', '#2443b8', '#1b1e28', '#c7a24a'), evergreen: P('#f3f1ea', '#1f5b45', '#17231d', '#c9784a'), plum: P('#f7f2f0', '#6b2d5c', '#261a24', '#d99a3a'), night: P('#14161c', '#8fa8ff', '#ede8de', '#e3b860', '#1c1f27') },
    values: { cover: 'paper', stress: 'italic', rules: 'hair', size: 100 },
    options: { cover: ['paper', 'color', 'ink'], stress: ['italic', 'underline', 'marker'], rules: ['hair', 'double', 'bold'], size: '84–112 (%)' },
  },
  bold: {
    what: 'Swiss poster: huge tight type, flat colour, a strict grid and one shape.',
    palettes: { vermilion: P('#ff4b2b', '#ffe8d6', '#14213d', '#ffc93c'), night: P('#0e0f12', '#ff5a36', '#f4f1ea', '#ffd23f'), ultramarine: P('#1f2bd9', '#ff8a65', '#ffffff', '#ffe14d'), acid: P('#d7ff3a', '#2a2aff', '#121212', '#ff3ea5') },
    values: { shape: 'arcs', side: 'right', size: 85, grid: true },
    options: { shape: ['arcs', 'quarter', 'circle', 'bars'], side: ['right', 'left'], size: '70–100', grid: [true, false] },
  },
  midnight: {
    what: 'A dark room and a wall of tiny lamps: an aurora in dots, the big number in lights.',
    palettes: { aurora: P('#05070d', '#39e6b0', '#eaf2ff', '#8a7cff', '#0d1220'), ice: P('#060a12', '#7cc8ff', '#eef6ff', '#e6f3ff', '#0d1524'), sodium: P('#0b0705', '#ff9a2e', '#fff1e0', '#ffd27a', '#1a120c') },
    values: { light: 160, glow: 60, waves: 60, grid: 'dots' },
    options: { light: '0–360', glow: '20–100', waves: '0–100', grid: ['dots', 'pixels', 'plus'] },
  },
  showcase: {
    what: 'Calm and product-first: a soft tinted backdrop, white rounded cards, a big product window.',
    palettes: { lagoon: P('#eef6f7', '#1b9aaa', '#0f2a33', '#ffb347'), blossom: P('#fbf1f3', '#e0607e', '#2e1a22', '#6c63ff'), meadow: P('#f1f6ec', '#4e9f3d', '#1e2b1a', '#f2c14e'), apricot: P('#fff4ec', '#f28c38', '#2b1d14', '#3d5afe') },
    values: { backdrop: 'tint', fade: 140, corners: 28, shadow: 60, emphasis: 'chip' },
    options: { backdrop: ['plain', 'tint', 'color', 'dark'], fade: '0–360', corners: '0–48', shadow: '0–100', emphasis: ['chip', 'color', 'line'] },
  },
};

const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, p) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * p)); };
const lum = c => { const [r, g, b] = hex(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const isDark = c => lum(c) < 0.18;

// A palette object or id → full roles. `muted` is the ink pulled toward the ground while staying ≥ 4.5:1.
export function resolvePalette(style, palette) {
  const def = STYLES[style];
  let p = typeof palette === 'string' ? def.palettes[palette] : palette;
  if (!p) p = Object.values(def.palettes)[0];
  if (Array.isArray(p)) p = { ground: p[0], main: p[1], ink: p[2], accent: p[3] };
  const out = { ...p };
  out.surface = p.surface || (isDark(p.ground) ? mix(p.ground, p.ink, 0.07) : '#ffffff');
  let k = 0.34; while (k > 0 && contrast(mix(p.ink, p.ground, k), p.ground) < 4.5) k -= 0.04;
  out.muted = mix(p.ink, p.ground, Math.max(0, k));
  out.dark = isDark(p.ground);
  return out;
}

let cssLoaded = null;
function loadCss() {
  if (cssLoaded) return cssLoaded;
  const href = new URL('./styles.css', import.meta.url).href;
  cssLoaded = new Promise((res, rej) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; l.onerror = () => rej(new Error('styles.css failed to load')); document.head.append(l); });
  return cssLoaded;
}

export async function useStyle(kit, name, { palette, values = {}, root } = {}) {
  const def = STYLES[name];
  if (!def) throw new Error(`Unknown style "${name}". Styles: ${Object.keys(STYLES).join(', ')}`);
  await loadCss();
  root = root || kit.stage;
  const v = { ...def.values, ...values };
  let pal = resolvePalette(name, palette);
  // style-specific grounds that change the palette's roles
  if (name === 'editorial' && v.cover !== 'paper') pal = { ...pal, ground: v.cover === 'color' ? pal.main : pal.ink, ink: pal.ground, main: v.cover === 'color' ? pal.ground : pal.accent, surface: mix(v.cover === 'color' ? pal.main : pal.ink, pal.ground, 0.08) };
  if (name === 'bubbles' && v.ground === 'light') pal = { ...pal, ground: mix(pal.ground, '#ffffff', 0.9), ink: pal.ground, surface: 'rgba(255,255,255,.55)' };
  if (name === 'showcase' && v.backdrop === 'dark') pal = { ...pal, ground: mix(pal.ink, '#000000', 0.25), ink: '#f7f7f5', surface: mix(pal.ink, '#ffffff', 0.08) };
  if (name === 'showcase' && v.backdrop === 'color') pal = { ...pal, ground: pal.main, ink: isDark(pal.main) ? '#ffffff' : pal.ink };
  { let k = 0.34; while (k > 0 && contrast(mix(pal.ink, pal.ground, k), pal.ground) < 4.5) k -= 0.04; pal.muted = mix(pal.ink, pal.ground, Math.max(0, k)); }
  pal.dark = isDark(pal.ground);

  root.classList.add('s', 's-' + name);
  for (const [k, val] of Object.entries(v)) root.dataset[k] = String(val);
  const vars = { '--ground': pal.ground, '--main': pal.main, '--ink': pal.ink, '--accent': pal.accent, '--muted': pal.muted, '--surface': pal.surface };
  if (name === 'showcase') { vars['--corners'] = v.corners + 'px'; vars['--shadow'] = v.shadow / 100; }
  if (name === 'sketch') vars['--weight'] = v.weight + 'px';
  if (name === 'editorial') vars['--size'] = v.size / 100;
  if (name === 'bold') vars['--size'] = v.size / 100;
  for (const [k, val] of Object.entries(vars)) root.style.setProperty(k, val);
  root.style.background = pal.ground;

  const W = kit.W, H = kit.H;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; canvas.className = 's-ground';
  root.prepend(canvas);
  const g = canvas.getContext('2d');
  const { seg, eo, eio, eob, lerp, clamp01 } = kit;

  const st = {
    name, palette: pal, values: v, root, canvas,
    // Backdrop, pure in t. Call first in render.
    ground(t) { GROUNDS[name](g, t, pal, v, W, H, kit); },
    // Animate the <em> phrase(s) in el: 0 → 1 over [t0, t0 + dur]. The look is the style's (CSS reads --p).
    stress(el, t, t0, dur = 0.5) { const p = eo(seg(t, t0, t0 + dur)); for (const em of el.querySelectorAll('em')) em.style.setProperty('--p', p.toFixed(4)); return p; },
    // A rule that draws from the left.
    rule(el, t, t0, dur = 0.7) { el.style.transform = `scaleX(${eio(seg(t, t0, t0 + dur))})`; },
    // Sketch: hand-drawn wobble for a whole element (boils at 12 fps).
    boil(el, t, amt = v.wobble ?? 40) { const f = Math.floor(t * 12) % 3, a = (amt / 100) * 0.45; el.style.rotate = [a, -a * 0.6, a * 0.3][f] + 'deg'; },
    // Midnight: light the dots inside a line of text (the big number in lights).
    lights(text, { x = 160, y = 300, size = 360, t = 0, t0 = 0, dur = 1.2, font = '700 {S}px "Inter Tight"' } = {}) { if (name === 'midnight') lightText(g, text, x, y, size, seg(t, t0, t0 + dur), pal, v, font, t); },
  };
  return st;
}

// ───────── grounds ─────────
const GROUNDS = {
  sketch(g, t, pal, v, W, H) {
    g.clearRect(0, 0, W, H);
    if (v.paper === 'board') { g.fillStyle = pal.dark ? pal.ground : '#f4f5f3'; g.fillRect(0, 0, W, H); }
    const ink = pal.dark ? 'rgba(255,255,255,.11)' : 'rgba(29,33,37,.12)';
    if (v.paper === 'dots') { g.fillStyle = ink; for (let x = 24; x < W; x += 36) for (let y = 24; y < H; y += 36) { g.beginPath(); g.arc(x, y, 2, 0, 6.283); g.fill(); } }
    if (v.paper === 'squared') { g.strokeStyle = ink; g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x < W; x += 48) { g.moveTo(x + .5, 0); g.lineTo(x + .5, H); } for (let y = 0; y < H; y += 48) { g.moveTo(0, y + .5); g.lineTo(W, y + .5); } g.stroke(); }
    if (v.paper === 'board') { // marker smudges, faint
      g.fillStyle = pal.dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)';
      for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(200 + i * 260, 300 + (i % 3) * 230, 220, 60, -0.2, 0, 6.283); g.fill(); }
    }
  },
  bubbles(g, t, pal, v, W, H, kit) {
    const a = (v.angle * Math.PI) / 180, cx = W / 2, cy = H / 2, r = Math.hypot(W, H) / 2;
    const deep = v.ground !== 'light';
    const grd = g.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    grd.addColorStop(0, pal.ground); grd.addColorStop(1, deep ? mix(pal.ground, pal.main, 0.38) : mix(pal.ground, pal.main, 0.22));
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const n = Math.max(1, Math.min(5, v.count | 0)), base = (v.size / 100) * 320, fade = v.fade / 100;
    for (let i = 0; i < n; i++) {
      const ph = i * 2.399, R = base * (0.75 + 0.5 * ((i * 0.618) % 1));
      const x = W * (0.18 + 0.64 * ((i * 0.37 + 0.2) % 1)) + Math.sin(t * 0.21 + ph) * 60;
      const y = H * (0.3 + 0.45 * ((i * 0.53 + 0.1) % 1)) + Math.cos(t * 0.17 + ph) * 40;
      const col = i % 2 ? pal.accent : pal.main;
      const glow = g.createRadialGradient(x, y, R * 0.2, x, y, R * 1.9);
      glow.addColorStop(0, kit.rgba(col, (deep ? 0.32 : 0.22) * fade)); glow.addColorStop(1, kit.rgba(col, 0));
      g.fillStyle = glow; g.beginPath(); g.arc(x, y, R * 1.9, 0, 6.283); g.fill();
      const body = g.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.05, x, y, R);
      body.addColorStop(0, kit.rgba('#ffffff', deep ? 0.55 : 0.8)); body.addColorStop(0.25, kit.rgba(col, 0.55)); body.addColorStop(0.85, kit.rgba(mix(col, pal.ground, 0.5), 0.35)); body.addColorStop(1, kit.rgba(col, 0.75));
      g.fillStyle = body; g.beginPath(); g.arc(x, y, R, 0, 6.283); g.fill();
      g.strokeStyle = kit.rgba('#ffffff', 0.35); g.lineWidth = 2; g.beginPath(); g.arc(x, y, R - 1, Math.PI * 0.9, Math.PI * 1.6); g.stroke();
    }
  },
  editorial(g, t, pal, v, W, H) {
    g.fillStyle = pal.ground; g.fillRect(0, 0, W, H);
    g.fillStyle = pal.ink; g.globalAlpha = 0.85;
    const lw = v.rules === 'bold' ? 6 : v.rules === 'double' ? 1.5 : 1.5;
    g.fillRect(120, 96, W - 240, lw); if (v.rules === 'double') g.fillRect(120, 102, W - 240, lw);
    g.fillRect(120, H - 96, W - 240, lw);
    g.globalAlpha = 1;
  },
  bold(g, t, pal, v, W, H, kit) {
    g.fillStyle = pal.ground; g.fillRect(0, 0, W, H);
    if (v.grid === true || v.grid === 'true') { g.strokeStyle = kit.rgba(pal.ink, 0.1); g.lineWidth = 1.5; g.beginPath(); for (let i = 1; i < 12; i++) { const x = (W / 12) * i; g.moveTo(x + .5, 0); g.lineTo(x + .5, H); } for (let j = 1; j < 6; j++) { const y = (H / 6) * j; g.moveTo(0, y + .5); g.lineTo(W, y + .5); } g.stroke(); }
    const s = (v.size / 100) * H * 0.9, right = v.side !== 'left';
    const ox = right ? W - s * 0.4 : s * 0.4, oy = H * 0.55;
    const grow = kit.eob(kit.seg(t, 0.1, 1.1), 1.5), rot = t * 0.06;
    g.save(); g.translate(ox, oy); g.rotate(rot * (right ? 1 : -1)); g.scale(grow, grow);
    g.fillStyle = pal.main; g.strokeStyle = pal.main;
    if (v.shape === 'circle') { g.beginPath(); g.arc(0, 0, s / 2, 0, 6.283); g.fill(); }
    else if (v.shape === 'quarter') { g.beginPath(); g.moveTo(-s / 2, s / 2); g.arc(-s / 2, s / 2, s, -Math.PI / 2, 0); g.closePath(); g.fill(); }
    else if (v.shape === 'bars') { for (let i = 0; i < 5; i++) g.fillRect(-s / 2 + i * s / 5, -s / 2 + (i % 2) * s * 0.12, s / 10, s * (0.6 + 0.1 * i)); }
    else { g.lineWidth = s * 0.07; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, s * (0.18 + i * 0.11), -Math.PI * 0.95, Math.PI * 0.25); g.stroke(); } }
    g.fillStyle = pal.accent; g.beginPath(); g.arc(-s * 0.2, s * 0.18, s * 0.07, 0, 6.283); g.fill();
    g.restore();
  },
  midnight(g, t, pal, v, W, H, kit) {
    g.fillStyle = pal.ground; g.fillRect(0, 0, W, H);
    const step = 18, glow = v.glow / 100, waves = v.waves / 100, la = (v.light * Math.PI) / 180;
    const ca = kit.hex(pal.main), cb = kit.hex(pal.accent);
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
      const u = x / W, w = y / H;
      const band = Math.sin(u * 5.2 + t * 0.35 + Math.sin(u * 2.1 - t * 0.2) * 1.4) * 0.5 + 0.5;
      const yy = 0.32 + 0.16 * Math.sin(u * 3 + t * 0.25 + la) * waves;
      const b = Math.exp(-((w - yy) ** 2) / (0.012 + 0.03 * band)) * (0.35 + 0.65 * band) * (0.25 + 0.75 * waves);
      const k = Math.max(0.05, b);
      const m = (Math.sin(u * 4 + la + t * 0.1) + 1) / 2;
      const r = ca[0] + (cb[0] - ca[0]) * m, gg = ca[1] + (cb[1] - ca[1]) * m, bb = ca[2] + (cb[2] - ca[2]) * m;
      g.fillStyle = `rgba(${r | 0},${gg | 0},${bb | 0},${(0.08 + 0.85 * k * glow).toFixed(3)})`;
      dot(g, x, y, v.grid, 2.4 + 2.2 * k);
    }
  },
  showcase(g, t, pal, v, W, H, kit) {
    g.fillStyle = pal.ground; g.fillRect(0, 0, W, H);
    if (v.backdrop === 'plain') return;
    const a = (v.fade * Math.PI) / 180 + t * 0.03;
    const tint = v.backdrop === 'tint' ? 0.22 : 0.18;
    for (const [k, col] of [[0, pal.main], [1, pal.accent]]) {
      const x = W / 2 + Math.cos(a + k * 2.6) * W * 0.36, y = H / 2 + Math.sin(a + k * 2.6) * H * 0.4;
      const rg = g.createRadialGradient(x, y, 0, x, y, W * 0.55);
      rg.addColorStop(0, kit.rgba(col, k ? tint * 0.55 : tint)); rg.addColorStop(1, kit.rgba(col, 0));
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
  },
};

function dot(g, x, y, kind, r) {
  if (kind === 'pixels') { g.fillRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); return; }
  if (kind === 'plus') { g.fillRect(x - r, y - r * 0.3, r * 2, r * 0.6); g.fillRect(x - r * 0.3, y - r, r * 0.6, r * 2); return; }
  g.beginPath(); g.arc(x, y, r * 0.8, 0, 6.283); g.fill();
}

const masks = new Map();
function lightText(g, text, x, y, size, p, pal, v, font, t) {
  const key = text + '|' + size + '|' + font;
  let m = masks.get(key);
  if (!m) {
    const c = document.createElement('canvas'); const cx = c.getContext('2d');
    const f = font.replace('{S}', size); cx.font = f; const w = Math.ceil(cx.measureText(text).width) + 20;
    c.width = w; c.height = Math.ceil(size * 1.1); cx.font = f; cx.fillStyle = '#fff'; cx.textBaseline = 'top'; cx.fillText(text, 0, size * 0.05);
    m = { w, h: c.height, data: cx.getImageData(0, 0, w, c.height).data }; masks.set(key, m);
  }
  const step = 18, x0 = Math.ceil(x / step) * step + step / 2 - step, y0 = Math.ceil(y / step) * step + step / 2 - step;
  const lit = mix(pal.accent, '#ffffff', 0.35); g.fillStyle = lit; g.shadowColor = pal.accent; g.shadowBlur = 14 * (v.glow / 100);
  for (let yy = y0; yy < y + m.h; yy += step) for (let xx = x0; xx < x + m.w; xx += step) {
    const px = Math.round(xx - x), py = Math.round(yy - y); if (px < 0 || py < 0 || px >= m.w || py >= m.h) continue;
    if (m.data[(py * m.w + px) * 4 + 3] < 128) continue;
    const on = Math.max(0, Math.min(1, p * 1.6 - (px / m.w) * 0.6));
    if (on <= 0) continue;
    g.globalAlpha = on * (0.85 + 0.15 * Math.sin(t * 3 + xx * 0.05));
    dot(g, xx, yy, v.grid, 4.6);
  }
  g.globalAlpha = 1; g.shadowBlur = 0;
}
