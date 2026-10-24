/* claude-motion kit — a small, deterministic film runtime.
 *
 * Everything on screen is a pure function of t (seconds). The player calls
 * CUT.render(t, kit) for any t, in any order, and expects the identical picture.
 *
 * API mirrors the original Motion `kit` (references/upstream/film-api.md) so the
 * craft docs apply directly. Classic script: defines window.kit before film.js runs.
 */
(function () {
  'use strict';
  const kit = {};
  window.kit = kit;

  // ───────────────────────── time & easing (all pure) ─────────────────────────
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const clamp01 = x => clamp(x, 0, 1);
  const lerp = (a, b, p) => a + (b - a) * p;
  const seg = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));
  const smoothstep = (a, b, x) => { const p = seg(x, a, b); return p * p * (3 - 2 * p); };
  const eo = x => 1 - Math.pow(1 - clamp01(x), 3);
  const ei = x => Math.pow(clamp01(x), 3);
  const eio = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eoq = x => 1 - Math.pow(1 - clamp01(x), 4);
  const eiq = x => Math.pow(clamp01(x), 4);
  const eox = x => { x = clamp01(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  const eix = x => { x = clamp01(x); return x === 0 ? 0 : Math.pow(2, 10 * x - 10); };
  const eiox = x => { x = clamp01(x); if (x === 0 || x === 1) return x; return x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
  const lin = x => clamp01(x);
  const eob = (x, s = 1.4) => { x = clamp01(x); if (x === 0 || x === 1) return x; const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
  const eib = (x, s = 1.4) => { x = clamp01(x); return (s + 1) * x * x * x - s * x * x; };
  // Damped spring 0→1. damping ~ 0.25 (bouncy) .. 0.9 (no bounce); freq = oscillations over the unit.
  const spring = (x, { damping = .42, freq = 2.2 } = {}) => {
    x = clamp01(x); if (x === 1) return 1;
    const w = 2 * Math.PI * freq;
    return 1 - Math.exp(-damping * w * x) * Math.cos(w * Math.sqrt(Math.max(0, 1 - damping * damping)) * x);
  };
  const step = (t, a) => (t >= a ? 1 : 0);
  const pulse = (t, a, b) => (t >= a && t < b ? 1 : 0);
  // Ramp up over [a, a+rise], hold, ramp down over [b-fall, b]. Great for opacity of a beat.
  const window_ = (t, a, b, rise = .3, fall = rise, ease = eio) => Math.min(ease(seg(t, a, a + rise)), 1 - ease(seg(t, b - fall, b)));
  // Deterministic PRNG (mulberry32).
  const rng = seed => { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hash = (n, seed = 0) => { let x = Math.imul((n | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 1, 0xc2b2ae35); x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  // Smooth 1D value noise, −1..1. vnoise(seed)(x).
  const vnoise = seed => x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1; };
  const breathe = (t, amt = .012, period = 3.2, phase = 0) => 1 + amt * Math.sin(2 * Math.PI * (t / period + phase));
  // Keyframes: keys(t, [[t0, v0], [t1, v1, ease?], ...]) — value or array; ease of a key shapes the move INTO it.
  const keys = (t, frames, defEase = eio) => {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      const [t1, v1, e] = frames[i];
      if (t < t1) {
        const [t0, v0] = frames[i - 1];
        const p = (e || defEase)(seg(t, t0, t1));
        return Array.isArray(v0) ? v0.map((v, k) => lerp(v, v1[k], p)) : lerp(v0, v1, p);
      }
    }
    return frames[frames.length - 1][1];
  };
  // Remap local time so a build's tail lands at a cut: t' = remap(t, a, b, a2, b2)
  const remap = (t, a, b, a2, b2) => lerp(a2, b2, (t - a) / (b - a));
  // Faked, deterministic motion blur: stretch factor along travel from speed in px/s.
  const smear = (speed, k = 0.00012, max = .6) => 1 + Math.min(max, Math.abs(speed) * k);
  const speedOf = (f, t, h = 1 / 120) => (f(t + h) - f(t - h)) / (2 * h);

  // Colours: '#rrggbb' mixing in sRGB.
  const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixColor = (a, b, p) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(p))).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  Object.assign(kit, { clamp, clamp01, lerp, seg, smoothstep, eo, ei, eio, eoq, eiq, eox, eix, eiox, lin, eob, eib, spring, step, pulse, window: window_, beat: window_, rng, hash, vnoise, breathe, keys, remap, smear, speedOf, mixColor, rgba, hex });

  // ───────────────────────── DOM helpers ─────────────────────────
  const SVGNS = 'http://www.w3.org/2000/svg';
  kit.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  kit.el = (tag, o = {}, children = []) => {
    const svg = ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'mask', 'use', 'tspan'].includes(tag);
    const n = svg ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
    if (o.class) n.setAttribute('class', o.class);
    if (o.style) n.setAttribute('style', o.style);
    if (o.text != null) n.textContent = o.text;
    if (o.html != null) n.innerHTML = o.html;
    for (const [k, v] of Object.entries(o.attrs || {})) n.setAttribute(k, v);
    for (const c of children) n.append(c);
    if (o.parent) o.parent.append(n);
    return n;
  };
  kit.h = html => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };
  kit.svg = html => { const d = document.createElementNS(SVGNS, 'svg'); d.innerHTML = html.trim(); return d.firstElementChild; };
  kit.$ = (sel, root) => (root || kit.stage).querySelector(sel);
  kit.$$ = (sel, root) => [...(root || kit.stage).querySelectorAll(sel)];
  kit.css = text => { const s = document.createElement('style'); s.textContent = text; kit.stage.append(s); return s; };
  // A full-stage absolutely-positioned div layer, appended in paint order.
  kit.layer = (cls = '', parent) => { const d = kit.el('div', { class: 'layer ' + cls, style: `width:${kit.W}px;height:${kit.H}px` }); (parent || kit.stage).append(d); return d; };
  kit.svgLayer = (parent, { w = kit.W, h = kit.H } = {}) => { const s = kit.el('svg', { class: 'kit-svg', attrs: { width: w, height: h, viewBox: `0 0 ${w} ${h}` } }); (parent || kit.stage).append(s); return s; };
  // Set styles only when they change (cheap renders even with big DOMs).
  kit.set = (node, props) => { const st = node.style || node; for (const k in props) { const v = String(props[k]); if (st[k] !== v) st[k] = v; } };
  kit.show = (node, t, tIn, tOut = Infinity, { dur = .35, dy = 12 } = {}) => {
    const p = Math.min(eo(seg(t, tIn, tIn + dur)), 1 - ei(seg(t, tOut, tOut + dur * .7)));
    node.style.opacity = p; node.style.transform = `translateY(${(1 - p) * dy}px)`; return p;
  };
  kit.tr = ({ x = 0, y = 0, s = 1, sx = s, sy = s, r = 0, z } = {}) => `translate3d(${x}px,${y}px,${z || 0}px) rotate(${r}deg) scale(${sx},${sy})`;

  // Geometry: stage rect of a node, and the same in the camera's un-zoomed scene space.
  kit.srect = node => { const s = kit.stage.getBoundingClientRect(), r = node.getBoundingClientRect(), k = kit._scale || 1; return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k }; };
  kit.camrect = (node, cam) => { const r = kit.srect(node); const st = cam ? cam.state : { cx: kit.W / 2, cy: kit.H / 2, z: 1, r: 0 }; const z = st.z; return { x: (r.x - kit.W / 2) / z + st.cx, y: (r.y - kit.H / 2) / z + st.cy, w: r.w / z, h: r.h / z }; };
  // Layout-space box of a node relative to an ancestor (default: the stage). Ignores transforms, so for
  // anything inside a camera layer this IS its scene position, whatever the camera is doing.
  kit.offset = (node, ancestor) => { ancestor = ancestor || kit.stage; let x = 0, y = 0, n = node; while (n && n !== ancestor && n !== document.body) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: node.offsetWidth, h: node.offsetHeight }; };
  // Centre of a node in layout/scene space → a () => [x, y] for cursor keys. Pure: never depends on camera state.
  kit.center = (node, dx = 0, dy = 0) => { let c; return () => { if (!c) { const r = kit.offset(node); c = [r.x + r.w / 2, r.y + r.h / 2]; } return [c[0] + dx, c[1] + dy]; }; };

  // ───────────────────────── Camera ─────────────────────────
  // keys: [{t, cx, cy, z, r?, ease?, cut?, from?, hold?, drift?:[dx/s, dy/s, dlogz/s]}]
  // (cx, cy) is the scene point placed at stage centre; z magnifies (log-space interpolation).
  class Camera {
    constructor(layer, keys = []) { this.layer = layer; this.keys = keys; this.state = { cx: kit.W / 2, cy: kit.H / 2, z: 1, r: 0 }; if (layer) layer.style.transformOrigin = '0 0'; }
    set(keys) { this.keys = keys.map(k => ({ r: 0, ...k })).sort((a, b) => a.t - b.t); return this; }
    _drifted(k, t) { const d = k.drift || [0, 0, 0], dt = Math.max(0, t - k.t); return { cx: k.cx + d[0] * dt, cy: k.cy + d[1] * dt, z: k.z * Math.exp((d[2] || 0) * dt), r: k.r || 0 }; }
    at(t) {
      const K = this.keys; if (!K.length) return { ...this.state };
      if (t <= K[0].t) return this._drifted(K[0], K[0].t);
      for (let i = 1; i < K.length; i++) {
        const A = K[i - 1], B = K[i];
        if (t < B.t) {
          if (B.cut) return this._drifted(A, t);
          const t0 = B.from ?? (A.t + (A.hold || 0));
          if (t <= t0) return this._drifted(A, t);
          const a = this._drifted(A, t0), p = (B.ease || eio)(seg(t, t0, B.t));
          return { cx: lerp(a.cx, B.cx, p), cy: lerp(a.cy, B.cy, p), z: Math.exp(lerp(Math.log(a.z), Math.log(B.z), p)), r: lerp(a.r, B.r || 0, p) };
        }
      }
      return this._drifted(K[K.length - 1], t);
    }
    css(s) { return `translate(${kit.W / 2}px,${kit.H / 2}px) scale(${s.z}) rotate(${s.r || 0}deg) translate(${-s.cx}px,${-s.cy}px)`; }
    apply(t) { this.state = this.at(t); if (this.layer) this.layer.style.transform = this.css(this.state); return this.state; }
    // Scene point → stage point under the camera at time t (or current state).
    toStage(p, t) { const s = t == null ? this.state : this.at(t); const a = (s.r || 0) * Math.PI / 180, dx = (p[0] - s.cx) * s.z, dy = (p[1] - s.cy) * s.z; return [kit.W / 2 + dx * Math.cos(a) - dy * Math.sin(a), kit.H / 2 + dx * Math.sin(a) + dy * Math.cos(a)]; }
    // A key that frames a scene rect: fit width (or height) with a margin.
    frame(r, { t, pad = 0.08, fit = 'contain', dx = 0, dy = 0, ...rest } = {}) {
      const zw = kit.W / (r.w * (1 + pad * 2)), zh = kit.H / (r.h * (1 + pad * 2));
      return { t, cx: r.x + r.w / 2 + dx, cy: r.y + r.h / 2 + dy, z: fit === 'cover' ? Math.max(zw, zh) : Math.min(zw, zh), ...rest };
    }
  }
  kit.Camera = Camera;

  // ───────────────────────── Typing & streaming ─────────────────────────
  kit.typing = { times: [] };
  kit.typist = (text, t0, cps = 22, seed = 7) => {
    const r = rng(seed), times = []; let t = t0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      let d = (1 / cps) * (0.55 + r() * 0.9);
      if (ch === ' ') d *= 1.25; if (',.;:!?'.includes(text[i - 1] || '')) d += 0.12 + r() * .08;
      t += d; times.push(t);
    }
    kit.typing.times.push(...times); kit.typing.times.sort((a, b) => a - b);
    const count = tt => { let lo = 0, hi = times.length; while (lo < hi) { const m = (lo + hi) >> 1; if (times[m] <= tt) lo = m + 1; else hi = m; } return lo; };
    return { text, times, t0, end: times.length ? times[times.length - 1] : t0, count, at: tt => text.slice(0, count(tt)), done: tt => count(tt) >= text.length };
  };
  kit.streamed = (text, t, t0, cps = 95, chunk = 7) => {
    if (t <= t0) return '';
    const n = Math.floor((t - t0) * cps); if (n >= text.length) return text;
    let i = Math.floor(n / chunk) * chunk; while (i < text.length && text[i] !== ' ' && i > 0) i++;
    return text.slice(0, Math.min(text.length, i));
  };
  kit.caret = (t, period = .53) => (Math.floor(t / period) % 2 === 0 ? 1 : 0);

  // ───────────────────────── Type in motion ─────────────────────────
  // Splits once into word spans (or chars), then sets per-unit opacity/offset/blur from t.
  // Splits once into word (or char) spans, keeping inline markup (<em>, <b>, <br>, spans) in place.
  const split = (el, mode = 'words') => {
    const k = el._kitSplit;
    if (k && k.mode === mode && k.src === el.textContent) return k.units;
    if (k && k.src === el.textContent) el.innerHTML = k.html;          // another mode: start from the original markup
    const html = el.innerHTML, src = el.textContent, units = [];
    const walk = node => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const parts = mode === 'chars' ? [...n.textContent] : n.textContent.split(/(\s+)/).filter(Boolean);
          const frag = document.createDocumentFragment();
          for (const p of parts) {
            if (/^\s+$/.test(p)) { frag.append(document.createTextNode(p)); continue; }
            const sp = kit.el('span', { class: 'kit-word', text: p }); frag.append(sp); units.push(sp);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && (n.tagName === 'IMG' || n.tagName === 'svg' || n.tagName === 'SVG' || n.classList.contains('kit-unit'))) {
          // an icon, chip or badge inside a sentence moves as one unit, like a word
          if (getComputedStyle(n).display === 'inline') n.style.display = 'inline-block';
          n.classList.add('kit-word'); units.push(n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('kit-word')) walk(n);
      }
    };
    walk(el);
    el._kitSplit = { mode, src, html, units };
    return units;
  };
  const DIRS = { right: [1, 0], left: [-1, 0], bottom: [0, 1], top: [0, -1], up: [0, 1], down: [0, -1] };
  const TextFx = {
    split,
    // General entrance. from: 'right'|'left'|'bottom'|'top'; d = drift px; blur = px at start; scale = start scale.
    in(el, t, t0, { from = 'right', d = 28, stagger = .11, dur = .5, ease = eo, blur = 0, scale = 1, mode = 'words', rot = 0 } = {}) {
      const units = split(el, mode), [ux, uy] = DIRS[from] || DIRS.right;
      units.forEach((u, i) => {
        const p = ease(seg(t, t0 + i * stagger, t0 + i * stagger + dur)), q = 1 - p;
        u.style.opacity = Math.min(1, p * 1.6);
        u.style.transform = `translate(${ux * d * q}px,${uy * d * q}px) scale(${lerp(scale, 1, p)}) rotate(${rot * q}deg)`;
        u.style.filter = blur && q > 0.001 ? `blur(${blur * q}px)` : '';
      });
      return t0 + (units.length - 1) * stagger + dur;
    },
    // Exit: quicker, the other way.
    out(el, t, t0, { to = 'left', d = 22, stagger = .05, dur = .3, ease = ei, blur = 0, mode = 'words' } = {}) {
      const units = split(el, mode), [ux, uy] = DIRS[to] || DIRS.left;
      units.forEach((u, i) => {
        const p = ease(seg(t, t0 + i * stagger, t0 + i * stagger + dur));
        if (p <= 0) return;
        u.style.opacity = Math.min(+u.style.opacity || 1, 1 - p);
        u.style.transform = `translate(${ux * d * p}px,${uy * d * p}px)`;
        if (blur) u.style.filter = `blur(${blur * p}px)`;
      });
      return t0 + (units.length - 1) * stagger + dur;
    },
    fadeFromRight(el, t, t0, { stagger = .11, dur = .5, dx = 26 } = {}) { return TextFx.in(el, t, t0, { from: 'right', d: dx, stagger, dur }); },
    rise(el, t, t0, o = {}) { return TextFx.in(el, t, t0, { from: 'bottom', d: 34, ...o }); },
    fadeOutLeft(el, t, t0, o = {}) { return TextFx.out(el, t, t0, { to: 'left', ...o }); },
    // Masked line reveal: each word slides up from behind its own baseline clip.
    mask(el, t, t0, { stagger = .08, dur = .6, ease = eoq } = {}) {
      const units = split(el, 'words');
      units.forEach((u, i) => {
        if (!u._mask) { const inner = kit.el('span', { text: u.textContent, style: 'display:inline-block' }); u.textContent = ''; u.append(inner); u.style.overflow = 'hidden'; u.style.verticalAlign = 'top'; u.style.paddingBottom = '0.12em'; u.style.marginBottom = '-0.12em'; u._mask = inner; }
        const p = ease(seg(t, t0 + i * stagger, t0 + i * stagger + dur));
        u._mask.style.transform = `translateY(${(1 - p) * 110}%)`;
      });
      return t0 + (units.length - 1) * stagger + dur;
    },
    // One element whose text flips at the midpoint of [t0, t0+dur].
    swap(el, t, t0, a, b, { dur = .4, dy = 10 } = {}) {
      const p = seg(t, t0, t0 + dur), txt = p < .5 ? a : b;
      if (el.textContent !== txt) el.textContent = txt;
      const k = Math.abs(p - .5) * 2; el.style.opacity = p <= 0 || p >= 1 ? 1 : k;
      el.style.transform = `translateY(${(p < .5 ? -1 : 1) * (1 - k) * dy * (p > 0 && p < 1 ? 1 : 0)}px)`;
    },
    // Count a number; starts near half its value so stills never read "0".
    count(el, t, t0, t1, to, { from = to * .5, format = v => Math.round(v).toLocaleString('en-US'), ease = eo } = {}) {
      const v = lerp(from, to, ease(seg(t, t0, t1))), s = format(v);
      if (el.textContent !== s) el.textContent = s; return v;
    },
  };
  kit.TextFx = TextFx;

  // ───────────────────────── Shapes ─────────────────────────
  kit.cutPaper = (seed, n = 7, irregularity = .28) => { const r = rng(seed), pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (r() - .5) * .5, rad = 1 - irregularity * r(); pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); } return pts; };
  kit.polyLerp = (A, B, p) => A.map((a, i) => [lerp(a[0], B[i % B.length][0], p), lerp(a[1], B[i % B.length][1], p)]);
  kit.polyStr = (pts, cx = 0, cy = 0, sx = 1, sy = sx, rot = 0) => { const c = Math.cos(rot), s = Math.sin(rot); return pts.map(([x, y]) => [cx + (x * c - y * s) * sx, cy + (x * s + y * c) * sy].map(v => v.toFixed(2)).join(',')).join(' '); };
  // Radial samples of a rounded rect (for rect ↔ blob morphs), unit space.
  kit.rectPoly = (n = 48, w = 1, h = 1, rad = .2) => { const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); const k = Math.min(w / Math.abs(dx || 1e-9), h / Math.abs(dy || 1e-9)); pts.push([dx * k, dy * k]); } return pts; };

  // ───────────────────────── Marks (hand-drawn, boiling) ─────────────────────────
  class Marks {
    constructor(svg) { this.svg = svg; this.list = []; }
    add(m) {
      const o = { dur: .45, outDur: .3, color: '#e5484d', width: 10, seed: this.list.length + 1, boil: true, ...m };
      o.g = kit.el('g', { attrs: { fill: 'none', stroke: o.color, 'stroke-width': o.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } });
      o.paths = []; this.svg.append(o.g); this.list.push(o); return o;
    }
    static jitter(pts, seed, amt) { const r = rng(seed); return pts.map(([x, y]) => [x + (r() - .5) * amt, y + (r() - .5) * amt]); }
    static d(pts) { if (pts.length < 3) return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'); let s = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`; for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; s += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`; } const L = pts[pts.length - 1]; return s + ` L${L[0].toFixed(1)} ${L[1].toFixed(1)}`; }
    static strokes(o) {
      const g = o.geom ? { ...o, ...o.geom() } : o, r = rng(o.seed * 31 + 7);
      switch (g.kind) {
        case 'circle': { const pad = g.pad ?? 14, cx = g.x + g.w / 2, cy = g.y + g.h / 2, rx = g.w / 2 + pad, ry = g.h / 2 + pad, tilt = g.tilt ?? -.06, pts = []; for (let i = 0; i <= 40; i++) { const a = -Math.PI * .6 + (i / 40) * Math.PI * 2.18, k = 1 + .05 * Math.sin(i * .7 + r() * 2); const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]); } return [pts]; }
        case 'underline': { const pts = [], wave = g.wave ?? 4; for (let i = 0; i <= 16; i++) { const p = i / 16; pts.push([g.x + g.w * p, g.y + Math.sin(p * Math.PI * 1.3 + r()) * wave + p * 3]); } return [pts]; }
        case 'arrow': { const [x0, y0] = g.from, [x1, y1] = g.to, bend = g.bend ?? .2, mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend, pts = []; for (let i = 0; i <= 20; i++) { const p = i / 20; pts.push([(1 - p) ** 2 * x0 + 2 * (1 - p) * p * mx + p * p * x1, (1 - p) ** 2 * y0 + 2 * (1 - p) * p * my + p * p * y1]); } const a = Math.atan2(y1 - my, x1 - mx), L = g.head ?? 30; return [pts, [[x1 - L * Math.cos(a - .5), y1 - L * Math.sin(a - .5)], [x1, y1]], [[x1 - L * Math.cos(a + .5), y1 - L * Math.sin(a + .5)], [x1, y1]]]; }
        case 'check': { const s = g.size ?? 60; return [[[g.x - s * .5, g.y], [g.x - s * .15, g.y + s * .38], [g.x + s * .55, g.y - s * .45]]]; }
        case 'cross': { const s = g.size ?? 50; return [[[g.x - s / 2, g.y - s / 2], [g.x + s / 2, g.y + s / 2]], [[g.x + s / 2, g.y - s / 2], [g.x - s / 2, g.y + s / 2]]]; }
        case 'bracket': { const d = g.side === 'right' ? -1 : 1, k = 22 * d; return [[[g.x + k, g.y], [g.x, g.y + 10], [g.x, g.y + g.h - 10], [g.x + k, g.y + g.h]]]; }
        case 'scribble': { const pts = []; for (let i = 0; i <= 14; i++) pts.push([g.x + (i % 2 ? g.w : 0) + (r() - .5) * 20, g.y + (i / 14) * g.h]); return [pts]; }
        case 'burst': { const n = g.n ?? 8, out = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([[g.x + Math.cos(a) * g.r, g.y + Math.sin(a) * g.r], [g.x + Math.cos(a) * g.r * 1.6, g.y + Math.sin(a) * g.r * 1.6]]); } return out; }
        case 'path': return [g.d];
        default: return [];
      }
    }
    render(t) {
      for (const o of this.list) {
        const p = eo(seg(t, o.t0, o.t0 + o.dur)), q = o.out != null ? eio(seg(t, o.out, o.out + o.outDur)) : 0;
        if (p <= 0 || q >= 1) { o.g.style.display = 'none'; continue; }
        o.g.style.display = '';
        const variant = o.boil ? Math.floor(t * 12) % 3 : 0;
        const strokes = Marks.strokes(o);
        while (o.paths.length < strokes.length) { const pth = kit.el('path', { attrs: { pathLength: 1 } }); o.g.append(pth); o.paths.push(pth); }
        strokes.forEach((pts, i) => {
          const pth = o.paths[i], seq = strokes.length > 1 ? seg(p, i / strokes.length * .7, .3 + (i + 1) / strokes.length * .7) : p;
          pth.setAttribute('d', Marks.d(Marks.jitter(pts, o.seed * 10 + variant, o.width * .35)));
          // draw on from the start; erase by undrawing from the start
          pth.setAttribute('stroke-dasharray', '1 1');
          pth.setAttribute('stroke-dashoffset', String(q > 0 ? -q : 1 - seq));
        });
      }
    }
  }
  kit.Marks = Marks;

  // ───────────────────────── Cursor ─────────────────────────
  const ARROW = '<svg width="34" height="40" viewBox="0 0 34 40" style="overflow:visible;filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))"><path d="M3 2 L3 31 L10.5 24 L15.6 36 L21 33.6 L15.9 22 L26 22 Z" fill="#111" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>';
  const IBEAM = '<svg width="20" height="38" viewBox="0 0 20 38" style="overflow:visible;transform:translate(-10px,-19px)"><path d="M4 3 Q10 3 10 8 V30 Q10 35 4 35 M16 3 Q10 3 10 8 M16 35 Q10 35 10 30 M6 19 H14" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M4 3 Q10 3 10 8 V30 Q10 35 4 35 M16 3 Q10 3 10 8 M16 35 Q10 35 10 30 M6 19 H14" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const HAND = '<svg width="34" height="38" viewBox="0 0 34 38" style="overflow:visible;transform:translate(-9px,-1px);filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))"><path d="M9 4 Q9 1.5 11.5 1.5 Q14 1.5 14 4 V16 L14 13 Q14 10.5 16.5 10.5 Q19 10.5 19 13 V16 Q19 13.5 21.5 13.5 Q24 13.5 24 16 V18 Q24 15.5 26.5 15.5 Q29 15.5 29 18 V27 Q29 36 20 36 H16 Q11 36 8 31 L3 22 Q1.6 19.4 4 18 Q6.4 16.8 8 19 L9 21 Z" fill="#fff" stroke="#111" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  kit.cursors = { arrow: ARROW, text: IBEAM, hand: HAND, pointer: HAND };
  kit.cursor = ({ cam = null, size = 1, parent, ring = '#1d1f22' } = {}) => {
    const el = kit.el('div', { class: 'kit-cursor', style: 'display:none' }); const gfx = kit.el('div', { class: 'kit-cursor-gfx', html: ARROW }); const rg = kit.el('div', { class: 'kit-ring', style: `color:${ring}` });
    el.append(rg, gfx); (parent || kit.stage).append(el);
    const cur = { el, gfx, ringEl: rg, cam, size, keys: [], clicks: [], holds: [], shapes: [], visible: () => 1, _shape: ARROW,
      pos(t) {
        const K = cur.keys; if (!K.length) return [0, 0];
        const P = k => (typeof k.at === 'function' ? k.at(t) : k.at);
        if (t <= K[0].t) return P(K[0]);
        for (let i = 1; i < K.length; i++) {
          const A = K[i - 1], B = K[i];
          if (t < B.t) {
            const t0 = B.from ?? (A.t + (A.hold || 0)); const a = P(A), b = P(B);
            if (t <= t0) return a;
            const raw = seg(t, t0, B.t), p = B.lin ? raw : eio(raw);
            const bow = B.bow ?? .12, dx = b[0] - a[0], dy = b[1] - a[1];
            return [a[0] + dx * p - dy * bow * Math.sin(Math.PI * p), a[1] + dy * p + dx * bow * Math.sin(Math.PI * p)];
          }
        }
        return P(K[K.length - 1]);
      },
      render(t) {
        let [x, y] = cur.pos(t);
        if (cur.cam) [x, y] = cur.cam.toStage([x, y], t);
        const op = cur.visible(t);
        el.style.opacity = op; el.style.display = op <= 0 ? 'none' : '';
        let press = 1, ringP = -1;
        for (const c of cur.clicks) { const d = t - c; if (d >= -.06 && d < .18) press = Math.min(press, 1 - .14 * Math.sin(Math.PI * clamp01((d + .06) / .24))); if (d >= 0 && d < .42) ringP = d / .42; }
        for (const [a, b] of cur.holds) if (t >= a && t <= b) press = Math.min(press, .88);
        let shape = ARROW; for (const s of cur.shapes) for (const [a, b] of s.spans) if (t >= a && t < b) shape = s.gfx;
        if (shape !== cur._shape) { gfx.innerHTML = shape; cur._shape = shape; }
        el.style.transform = `translate(${x}px,${y}px)`;
        gfx.style.transform = `scale(${cur.size * press})`;
        if (ringP >= 0) { rg.style.opacity = (1 - ringP) * .55; rg.style.transform = `scale(${.5 + eo(ringP) * 1.1})`; } else rg.style.opacity = 0;
      } };
    return cur;
  };

  // ───────────────────────── Caption chips & spotlight ─────────────────────────
  kit.chip = (text, { x = 0, y = 0, parent, style = '' } = {}) => { const c = kit.el('div', { class: 'kit-chip', text, style: `transform:translate(${x}px,${y}px);${style}` }); (parent || kit.stage).append(c); return c; };
  kit.spotlight = (rect, amount, { pad = 24, radius = 18, color = 'rgba(10,12,16,0.55)' } = {}) => {
    if (amount <= 0) return; const c = kit.fx; c.save(); c.fillStyle = color.replace(/[\d.]+\)$/, m => (parseFloat(m) * amount) + ')');
    c.beginPath(); c.rect(0, 0, kit.W, kit.H); const x = rect.x - pad, y = rect.y - pad, w = rect.w + pad * 2, h = rect.h + pad * 2;
    c.roundRect(x, y, w, h, radius); c.fill('evenodd'); c.restore();
  };

  // ───────────────────────── Video clips (muted) ─────────────────────────
  kit._videos = [];
  kit.video = (src, { start = 0, loop = false, class: cls = '', style = '' } = {}) => {
    const v = kit.el('video', { class: cls, style, attrs: { src, muted: '', playsinline: '', preload: 'auto' } }); v.muted = true;
    kit._videos.push({ v, start, loop }); return v;
  };
  kit.seek = (video, s) => { video._kitSeek = s; };
  kit._syncVideos = async (t, exact) => {
    const ps = [];
    for (const { v, start, loop } of kit._videos) {
      if (!v.duration) continue;
      let s = v._kitSeek ?? (t - start); v._kitSeek = undefined;
      s = loop ? ((s % v.duration) + v.duration) % v.duration : clamp(s, 0, v.duration - 1e-3);
      if (Math.abs(v.currentTime - s) > (exact ? 1e-3 : .25)) { v.currentTime = s; if (exact) ps.push(new Promise(r => v.addEventListener('seeked', r, { once: true }))); }
    }
    await Promise.all(ps);
  };

  // ───────────────────────── Scenes (optional composition) ─────────────────────────
  // kit.scenes([{id, name, dur, lead?, tail?, init(kit), render(t, kit)}], {width, height, fps, background})
  // Each scene gets its own box; t is local seconds. `lead`/`tail` let a scene render before/after
  // its slot (negative or > dur local t) so two scenes can overlap for a transform.
  kit.scenes = (list, opts = {}) => {
    let acc = 0; const T = {};
    const items = list.map(s => { const it = { ...s, start: acc, end: acc + s.dur }; T[s.id] = acc; acc += s.dur; return it; });
    T.END = acc;
    return {
      ...opts, duration: opts.duration ?? acc, T,
      chapters: opts.chapters ?? items.map(s => ({ t: s.start, label: s.name || s.id })),
      async init(k) {
        for (const s of items) {
          s.box = kit.el('div', { class: 'fill scene-' + s.id, style: 'display:none' }); k.stage.append(s.box);
          s.kit = Object.assign(Object.create(k), { stage: s.box, dur: s.dur, start: s.start, T });
          if (s.init) await s.init.call(s, s.kit);
        }
      },
      render(t, k) {
        for (const s of items) {
          const on = t >= s.start - (s.lead || 0) && (t < s.end + (s.tail || 0) || (s === items[items.length - 1] && t >= s.end));
          s.box.style.display = on ? '' : 'none';
          if (on) s.render.call(s, t - s.start, s.kit);
        }
      },
      score: opts.score ? (S, k) => opts.score(S, k, T) : undefined,
    };
  };

  // ───────────────────────── Motion-design toolkit ─────────────────────────
  // For reels and sizzles: weight, match cuts, extruded type, rolling numbers, grain.
  // Pair with the film's `motionBlur` (export averages sub-frames) for real smear on fast moves.

  // Squash & stretch: a ball dropped at t0 from height h (px above the ground), bouncing n times.
  // b = kit.bouncer({t0, h, n, fall, decay, x0, dx}); b.at(t) → {x, y, sx, sy, vy, k};
  // y is height above the ground: place the ball's bottom at groundY - y. b.contacts: hit times (for sound).
  kit.bouncer = ({ t0 = 0, h = 360, n = 4, fall = .5, decay = .5, x0 = 0, dx = 0, squash = .34, stretch = .26, contact = .085 } = {}) => {
    const g = 2 * h / (fall * fall), contacts = [t0 + fall], heights = [h];
    for (let k = 1; k <= n; k++) { const hk = h * Math.pow(decay, k); heights.push(hk); contacts.push(contacts[k - 1] + 2 * Math.sqrt(2 * hk / g)); }
    const end = contacts[contacts.length - 1], vmax = Math.sqrt(2 * g * h);
    const at = (t) => {
      const px = clamp01((t - t0) / (end - t0)); const x = x0 + dx * (1 - Math.pow(1 - px, 1.7));
      let y = 0, vy = 0, k = 0;
      if (t < t0) y = h;
      else if (t < contacts[0]) { const s = t - t0; y = h - .5 * g * s * s; vy = -g * s; }
      else if (t < end) { while (k < n && t >= contacts[k + 1]) k++; const v0 = Math.sqrt(2 * g * heights[k + 1]), s = t - contacts[k]; y = Math.max(0, v0 * s - .5 * g * s * s); vy = v0 - g * s; }
      // squash near a contact (scaled by that impact's speed), stretch along speed in flight
      let sx = 1, sy = 1, hit = -1;
      for (let i = 0; i < contacts.length; i++) if (Math.abs(t - contacts[i]) < contact) { hit = i; break; }
      if (hit >= 0) { const amt = squash * Math.sqrt(heights[hit] / h) * (1 - Math.abs(t - contacts[hit]) / contact); sy = 1 - amt; sx = 1 + amt * .9; y = 0; }
      else if (t >= t0 && t < end) { const st = stretch * Math.min(1, Math.abs(vy) / vmax); sy = 1 + st; sx = 1 - st * .55; }
      return { x, y, sx, sy, vy, k, hit };
    };
    return { at, contacts, end, g };
  };

  // Shape morph / match cut: interpolate a box between two states (stage px, top-left).
  // A, B: {x, y, w, h, r?, bg?, opacity?}. Use it to turn one thing into the next (a letter into a ball,
  // a ball into a toggle, a card into the full frame) instead of cutting between them.
  kit.morph = (el, A, B, p) => {
    const v = k => lerp(A[k] ?? B[k], B[k] ?? A[k], p);
    const st = { left: v('x') + 'px', top: v('y') + 'px', width: v('w') + 'px', height: v('h') + 'px' };
    if (A.r != null || B.r != null) st.borderRadius = v('r') + 'px';
    if (A.bg && B.bg) st.background = mixColor(A.bg, B.bg, p);
    if (A.opacity != null || B.opacity != null) st.opacity = v('opacity');
    kit.set(el, st); return el;
  };

  // Colour flood / iris: reveal `el` as a circle growing from (x, y). p 0..1 → covers the frame.
  kit.iris = (el, p, x = kit.W / 2, y = kit.H / 2) => {
    const R = Math.hypot(Math.max(x, kit.W - x), Math.max(y, kit.H - y));
    el.style.clipPath = p >= 1 ? 'none' : `circle(${(R * clamp01(p)).toFixed(1)}px at ${x}px ${y}px)`;
    el.style.visibility = p <= 0 ? 'hidden' : ''; return el;
  };

  // Depth of field: blur by distance from the focal plane. depth/focus in any unit; amount = px per unit.
  kit.focus = (el, depth, focus = 0, amount = 6, max = 24) => { const b = Math.min(max, Math.abs(depth - focus) * amount); el.style.filter = b > .05 ? `blur(${b.toFixed(2)}px)` : 'none'; return b; };

  // Motion trail: n samples of f(t) over the last `span` seconds, oldest first (dotted arcs, ghosting).
  kit.trail = (f, t, { span = .6, n = 12, t0 = -Infinity } = {}) => { const out = []; for (let i = 0; i < n; i++) { const s = t - span + span * i / (n - 1); if (s >= t0) out.push({ t: s, a: (i + 1) / n, p: f(s) }); } return out; };

  // Split text into one inline-block span per letter (for per-letter 3D, physics, staggered flips).
  kit.letters = (el) => { const txt = el.textContent; el.textContent = ''; return [...txt].map(ch => kit.el('span', { class: 'kit-letter', text: ch === ' ' ? ' ' : ch, style: 'display:inline-block;position:relative;transform-style:preserve-3d', parent: el })); };

  // Extruded 3D type (or any shape): stacks `layers` copies behind the face, darkening with depth.
  // Rotate the element (rotateX/rotateY) under a parent with `perspective` to see the sides.
  kit.extrude = (el, { depth = 40, layers = 16, side = '#8f8a82', dark = '#3a3733', face } = {}) => {
    const html = el.innerHTML; el.innerHTML = '';
    el.style.transformStyle = 'preserve-3d'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    for (let i = layers; i >= 1; i--) el.append(kit.el('span', { html, attrs: { 'aria-hidden': 'true' }, style: `position:absolute;left:0;top:0;width:100%;height:100%;white-space:inherit;color:${mixColor(side, dark, i / layers)};-webkit-text-fill-color:${mixColor(side, dark, i / layers)};background:none;transform:translateZ(${(-i * depth / layers).toFixed(2)}px);pointer-events:none` }));
    const f = kit.el('span', { html, style: `position:relative;display:inline-block;transform:translateZ(0.5px)${face ? ';color:' + face : ''}` }); el.append(f);
    return f;
  };

  // Rolling-digit counter (odometer). o = kit.odometer(el, {digits: 3}); o.set(value) every frame.
  // Columns roll continuously, carries roll the next column, leading zeros collapse. Fast rolls + motion blur read as a spin.
  kit.odometer = (el, { digits = 3, lead = 'collapse' } = {}) => {
    el.textContent = ''; el.style.display = 'inline-flex'; el.style.fontVariantNumeric = 'tabular-nums';
    const cols = [];
    for (let i = digits - 1; i >= 0; i--) {
      const col = kit.el('span', { class: 'kit-odo-col', style: 'display:inline-block;overflow:hidden;height:1em;line-height:1em;vertical-align:top', parent: el });
      const strip = kit.el('span', { style: 'display:block', html: '0123456789'.split('').concat('0').map(d => `<span style="display:block;height:1em">${d}</span>`).join(''), parent: col });
      cols.unshift({ col, strip, place: Math.pow(10, i) });
    }
    return { el, cols, set(v) {
      v = Math.max(0, v);
      for (const { col, strip, place } of cols) {
        const d = Math.floor(v / place) % 10, rem = v % place, roll = place === 1 ? v - Math.floor(v) : clamp01(rem - (place - 1));
        strip.style.transform = `translateY(${(-(d + roll)).toFixed(4)}em)`;
        if (place > 1 && lead === 'collapse') { const vis = clamp01(v - (place - 1)); col.style.maxWidth = (vis * 1).toFixed(3) + 'em'; col.style.opacity = vis.toFixed(3); }
      }
    } };
  };

  // Film grain: a deterministic noise overlay that changes `fps` times a second. g = kit.grain(parent); g.render(t).
  kit.grain = (parent, { opacity = .045, size = 220, frames = 6, fps = 12, blend = 'overlay', seed = 9 } = {}) => {
    const urls = [];
    for (let k = 0; k < frames; k++) {
      const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), im = x.createImageData(size, size), r = rng(seed * 101 + k);
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.floor(r() * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      x.putImageData(im, 0, 0); urls.push(`url(${c.toDataURL('image/png')})`);
    }
    const el = kit.el('div', { class: 'kit-grain', style: `position:absolute;left:0;top:0;width:${kit.W}px;height:${kit.H}px;pointer-events:none;z-index:50;mix-blend-mode:${blend};opacity:${opacity}`, parent: parent || kit.stage });
    let last = -1;
    return { el, render(t) { const k = Math.floor(Math.max(0, t) * fps); if (k === last) return; last = k; el.style.backgroundImage = urls[k % frames]; el.style.backgroundPosition = `${Math.floor(hash(k, 1) * size)}px ${Math.floor(hash(k, 2) * size)}px`; } };
  };

  // ───────────────────────── CSS 3D space (DOM planes under a perspective camera) ─────────────────────────
  // Crisp, real UI laid out in 3D: a desk of screens, a tilted dashboard, cards in depth, box characters.
  // const sp = kit.space(parent, {fov: 35}); sp.add(el, {x, y, z, rx, ry, rz, s}) (y is DOWN, the floor is y = 0,
  // "up" is −y); every frame: sp.camera([x, y, z], [tx, ty, tz], roll).  sp.project(p) → stage [x, y, scale];
  // sp.depth(p) → distance from the camera (for kit.focus). A floor: sp.add(el, {rx: 90}) lies in the x–z plane.
  // Note: a CSS filter (blur) flattens 3D children. Blur flat planes only, never a box.
  kit.space = (parent, { fov = 35, w = kit.W, h = kit.H } = {}) => {
    const f = (h / 2) / Math.tan(fov * Math.PI / 360);
    const view = kit.el('div', { class: 'kit-space', style: `position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:hidden;perspective:${f.toFixed(2)}px;perspective-origin:50% 50%`, parent: parent || kit.stage });
    const world = kit.el('div', { class: 'kit-space-world', style: `position:absolute;left:${w / 2}px;top:${h / 2}px;width:0;height:0;transform-style:preserve-3d;transform-origin:0 0`, parent: view });
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
    const sp = { view, world, f, fov, pos: [0, -400, 1200], target: [0, 0, 0], xc: [1, 0, 0], yc: [0, 1, 0], zc: [0, 0, 1],
      add(el, o = {}) { world.append(el); el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0'; el.style.transformOrigin = '0 0'; el.style.transformStyle = 'preserve-3d'; sp.place(el, o); return el; },
      // place by centre: translate to (x, y, z), rotate (Y, then X, then Z), scale, centre the element on that point
      place(el, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, center = true } = {}) {
        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${s})${center ? ' translate(-50%,-50%)' : ''}`; return el;
      },
      camera(pos, target, roll = 0) {
        sp.pos = pos; sp.target = target;
        const fwd = norm(sub(target, pos)), up = Math.abs(fwd[1]) > .999 ? [0, 0, -1] : [0, -1, 0];
        const xc = norm(cross(up, fwd)), zc = fwd.map(v => -v), yc = cross(zc, xc);
        Object.assign(sp, { xc, yc, zc });
        const tr = [-dot(xc, pos), -dot(yc, pos), -dot(zc, pos)];
        const m = [xc[0], yc[0], zc[0], 0, xc[1], yc[1], zc[1], 0, xc[2], yc[2], zc[2], 0, tr[0], tr[1], tr[2], 1].map(v => +v.toFixed(6));
        world.style.transform = `translateZ(${f.toFixed(2)}px) rotateZ(${roll}deg) matrix3d(${m.join(',')})`;
        return sp;
      },
      cam(p) { const d = sub(p, sp.pos); return [dot(sp.xc, d), dot(sp.yc, d), dot(sp.zc, d)]; },
      depth(p) { return -sp.cam(p)[2]; },
      project(p) { const c = sp.cam(p), s = f / Math.max(1e-3, -c[2]); return [w / 2 + c[0] * s, h / 2 + c[1] * s, s]; },
    };
    return sp;
  };

  // A box made of six DOM faces (characters, blocks, devices with thickness). Origin = the box centre.
  // faces: {front, back, left, right, top, bottom} → colour string or {bg, html}. Unlisted faces get `color`
  // shaded for a fixed light (top lighter, sides darker).
  kit.box3d = ({ w = 100, h = 100, d = 100, color = '#e8643a', faces = {}, radius = 0, parent } = {}) => {
    const box = kit.el('div', { class: 'kit-box', style: 'position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d' });
    const shade = { front: 0, back: -.18, left: -.14, right: -.22, top: .14, bottom: -.35 };
    const spec = { front: [w, h, `translateZ(${d / 2}px)`], back: [w, h, `rotateY(180deg) translateZ(${d / 2}px)`], right: [d, h, `rotateY(90deg) translateZ(${w / 2}px)`],
      left: [d, h, `rotateY(-90deg) translateZ(${w / 2}px)`], top: [w, d, `rotateX(90deg) translateZ(${h / 2}px)`], bottom: [w, d, `rotateX(-90deg) translateZ(${h / 2}px)`] };
    box.faces = {};
    for (const [k, [fw, fh, tr]] of Object.entries(spec)) {
      const o = typeof faces[k] === 'string' ? { bg: faces[k] } : (faces[k] || {});
      const s = shade[k], bg = o.bg || (s >= 0 ? mixColor(color, '#ffffff', s) : mixColor(color, '#000000', -s));
      const fe = kit.el('div', { class: 'kit-face kit-face-' + k, html: o.html || '', style: `position:absolute;left:${-fw / 2}px;top:${-fh / 2}px;width:${fw}px;height:${fh}px;background:${bg};transform:${tr};backface-visibility:hidden;border-radius:${radius}px;overflow:hidden`, parent: box });
      box.faces[k] = fe;
    }
    if (parent) parent.append(box);
    return box;
  };

  // Walk cycle, driven by DISTANCE travelled so feet never slide. kit.gait(dist, {stride, legs, lift, swing})
  // → {legs: [{swing (deg), lift (px)}], bob (px, ≤0 = up), sway (deg)}. Legs alternate (diagonal pairs for 4).
  kit.gait = (dist, { stride = 60, legs = 2, lift = 10, swing = 28, bob = 6 } = {}) => {
    const ph = 2 * Math.PI * dist / stride, L = [];
    for (let i = 0; i < legs; i++) { const p = ph + (legs === 4 ? ((i === 0 || i === 3) ? 0 : Math.PI) : i * Math.PI); L.push({ swing: swing * Math.sin(p), lift: lift * Math.max(0, Math.cos(p)) }); }
    return { legs: L, bob: -bob * Math.abs(Math.sin(ph)), sway: 3 * Math.sin(ph) };
  };

  // Endless rows of type (kinetic posters). Put the content in rowEl once; kit.marquee duplicates it and
  // render(t, extraPx) scrolls by speed px/s (negative = the other way) plus extraPx (for a whip-out). const m = kit.marquee(rowEl, {speed: 140}); m.render(t)
  kit.marquee = (rowEl, { speed = 120, offset = 0, copies = 3 } = {}) => {
    const inner = kit.el('div', { style: 'display:inline-flex;white-space:nowrap' });
    const unit = kit.el('div', { html: rowEl.innerHTML, style: 'display:inline-flex;white-space:nowrap;flex:none' });
    rowEl.innerHTML = ''; rowEl.style.overflow = 'hidden'; rowEl.style.whiteSpace = 'nowrap'; inner.append(unit); rowEl.append(inner);
    for (let i = 1; i < copies; i++) inner.append(unit.cloneNode(true));
    let uw = unit.offsetWidth;   // measured now (rowEl must be in the stage); re-tried if it was hidden
    return { el: rowEl, render(t, extra = 0) { if (!uw) uw = unit.offsetWidth; if (!uw) return; const x = (((t * speed + offset + extra) % uw) + uw) % uw; inner.style.transform = `translateX(${(-x).toFixed(2)}px)`; } };
  };

  kit.version = '2.5.0';
})();
