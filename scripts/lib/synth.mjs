// Deterministic offline synth for film scores: pitched patches, a light kit, UI foley, reverb.
// Input: { duration, events, programs, master, tempo } recorded by the player's S API.
const SR = 48000;
const TAU = Math.PI * 2;

const NAMES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function midiOf(p) {
  if (typeof p === 'number') return p;
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(String(p).trim());
  if (!m) throw new Error('bad pitch: ' + p);
  return (+m[2] + 1) * 12 + NAMES[m[1]];
}
export const hz = p => 440 * 2 ** ((midiOf(p) - 69) / 12);

// Seeded noise by integer index (random-access, deterministic).
function h32(i, s) { let x = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((s | 0) + 1, 0xc2b2ae35); x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
const noise = (i, s) => h32(i, s) * 2 - 1;

// RBJ biquad (stateful), for filtering noise and synth voices.
class Biquad {
  constructor(type, f, q = 0.707) { this.type = type; this.q = q; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f); }
  set(f) {
    const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * this.q);
    let b0, b1, b2, a0, a1, a2;
    if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; } // band-pass (constant peak)
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}

const env = (s, a, d) => Math.min(1, s / a) * Math.exp(-s / d);
const relEnv = (s, dur, rel) => (s < dur ? 1 : Math.max(0, 1 - (s - dur) / rel));

// ───────── pitched patches: (f, dur, vel, seed, bright) → Float32Array mono ─────────
const PATCHES = {
  marimba(f, dur, v, seed, br) {
    const len = Math.ceil(SR * Math.min(2.2, 0.5 + 900 / f)), o = new Float32Array(len), k = 2.4 + f / 500;
    const parts = [[1, 1, k], [3.98, 0.32 * br, k * 2.6], [10.7, 0.07 * br, k * 5]];
    for (let i = 0; i < len; i++) { const s = i / SR; let y = 0; for (const [r, a, d] of parts) if (f * r < SR / 2) y += a * Math.sin(TAU * f * r * s) * Math.exp(-d * s); y += noise(i, seed) * Math.exp(-s * 900) * 0.25; o[i] = y * Math.min(1, s / 0.0015); }
    return o;
  },
  vibes(f, dur, v, seed, br) {
    const len = Math.ceil(SR * (dur + 1.6)), o = new Float32Array(len);
    for (let i = 0; i < len; i++) { const s = i / SR, trem = 1 - 0.22 * (0.5 + 0.5 * Math.sin(TAU * 5.2 * s)); const y = Math.sin(TAU * f * s) * Math.exp(-0.9 * s) + 0.25 * br * Math.sin(TAU * f * 4 * s) * Math.exp(-3.5 * s) + 0.05 * Math.sin(TAU * f * 10 * s) * Math.exp(-8 * s); o[i] = y * trem * Math.min(1, s / 0.002) * relEnv(s, dur + 0.6, 1); }
    return o;
  },
  glock(f, dur, v, seed, br) {
    const len = Math.ceil(SR * 1.8), o = new Float32Array(len);
    const parts = [[1, 1, 1.6], [2.76, 0.4 * br, 3.2], [5.4, 0.2 * br, 6], [8.93, 0.08, 9]];
    for (let i = 0; i < len; i++) { const s = i / SR; let y = 0; for (const [r, a, d] of parts) if (f * r < SR / 2) y += a * Math.sin(TAU * f * r * s) * Math.exp(-d * s); o[i] = y * Math.min(1, s / 0.001) * 0.7; }
    return o;
  },
  ep(f, dur, v, seed, br) { // two-operator FM electric piano with a tine
    const len = Math.ceil(SR * (dur + 0.9)), o = new Float32Array(len), vel = v / 127;
    for (let i = 0; i < len; i++) {
      const s = i / SR, I = (0.6 + 1.6 * vel * br) * Math.exp(-2.6 * s) + 0.25;
      const mod = Math.sin(TAU * f * s) * I, tine = Math.sin(TAU * f * 14 * s) * 0.08 * Math.exp(-14 * s) * br;
      const y = Math.sin(TAU * f * s + mod) * 0.85 + tine;
      o[i] = y * Math.min(1, s / 0.003) * Math.exp(-s * (0.9 + f / 900)) * relEnv(s, dur, 0.25);
    }
    return o;
  },
  keys(f, dur, v, seed, br) {
    const len = Math.ceil(SR * (dur + 0.6)), o = new Float32Array(len), lp = new Biquad('lp', 1800 * br, 0.8); let p1 = 0, p2 = 0;
    for (let i = 0; i < len; i++) { const s = i / SR; p1 = (p1 + f * 1.003 / SR) % 1; p2 = (p2 + f * 0.997 / SR) % 1; const tri = (x) => 1 - 4 * Math.abs(x - 0.5); const y = tri(p1) * 0.5 + tri(p2) * 0.5 + (p1 * 2 - 1) * 0.12; lp.set(600 + 2400 * br * Math.exp(-3 * s)); o[i] = lp.run(y) * Math.min(1, s / 0.01) * (0.6 + 0.4 * Math.exp(-2 * s)) * relEnv(s, dur, 0.35); }
    return o;
  },
  pluck(f, dur, v, seed, br) { // Karplus–Strong, kalimba-ish
    const len = Math.ceil(SR * Math.min(2.5, dur + 1.2)), o = new Float32Array(len), N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N);
    for (let i = 0; i < N; i++) buf[i] = noise(i, seed) * 0.8 + Math.sin(TAU * i / N) * 0.6;
    let idx = 0; const loss = 0.4985 + 0.0013 * Math.min(1, 300 / f);
    for (let i = 0; i < len; i++) { const a = buf[idx], b = buf[(idx + 1) % N]; const y = (a + b) * loss; buf[idx] = y; idx = (idx + 1) % N; o[i] = a * Math.min(1, i / 40) * relEnv(i / SR, dur + 0.6, 0.5); }
    return o;
  },
  bass(f, dur, v, seed, br) {
    const len = Math.ceil(SR * (dur + 0.25)), o = new Float32Array(len), lp = new Biquad('lp', 700 * br + 200, 0.9);
    for (let i = 0; i < len; i++) { const s = i / SR; const y = Math.sin(TAU * f * s) + 0.35 * Math.sin(TAU * f * 2 * s) * Math.exp(-6 * s) + 0.25 * Math.sin(TAU * f * 3 * s) * Math.exp(-12 * s); o[i] = lp.run(Math.tanh(1.6 * y) * 0.8) * Math.min(1, s / 0.004) * (0.55 + 0.45 * Math.exp(-4 * s)) * relEnv(s, dur, 0.12); }
    return o;
  },
  pad(f, dur, v, seed, br) {
    const rel = 1.4, len = Math.ceil(SR * (dur + rel)), o = new Float32Array(len), lp = new Biquad('lp', 900, 0.6), det = [-0.11, -0.04, 0.03, 0.09], ph = det.map((_, k) => h32(k, seed));
    const att = Math.min(0.9, dur * 0.4);
    for (let i = 0; i < len; i++) {
      const s = i / SR; let y = 0;
      for (let k = 0; k < det.length; k++) { ph[k] = (ph[k] + f * 2 ** (det[k] / 12) / SR) % 1; y += ph[k] * 2 - 1; }
      if (i % 64 === 0) lp.set((700 + 900 * br) * (1 + 0.25 * Math.sin(TAU * 0.18 * s)));
      const a = Math.min(1, s / att) ** 2, r = s < dur ? 1 : Math.max(0, 1 - (s - dur) / rel) ** 2;
      o[i] = lp.run(y * 0.25) * a * r;
    }
    return o;
  },
};
PATCHES.kalimba = PATCHES.pluck; PATCHES.piano = PATCHES.ep; PATCHES.bell = PATCHES.glock;

// ───────── drums and foley: (vel, seed, opts) → Float32Array mono ─────────
function render(len, fn) { const o = new Float32Array(Math.ceil(len * SR)); for (let i = 0; i < o.length; i++) o[i] = fn(i / SR, i); return o; }
function filtered(len, type, f, q, fn, seed) { const b = new Biquad(type, f, q); return render(len, (s, i) => b.run(noise(i, seed)) * fn(s)); }
function add(a, b, gb = 1, off = 0) { const o = new Float32Array(Math.max(a.length, b.length + off)); o.set(a); for (let i = 0; i < b.length; i++) o[i + off] += b[i] * gb; return o; }

const DRUMS = {
  kick: (s0) => render(0.45, (s, i) => Math.tanh(1.8 * Math.sin(TAU * (50 * s + (90 / 28) * (1 - Math.exp(-28 * s)))) * Math.exp(-6.5 * s)) + noise(i, s0) * Math.exp(-s * 400) * 0.2),
  snare: (s0) => add(render(0.25, s => Math.sin(TAU * 185 * s) * Math.exp(-20 * s) * 0.55), filtered(0.3, 'bp', 1900, 0.7, s => Math.exp(-15 * s), s0), 0.9),
  clap: (s0) => filtered(0.35, 'bp', 1250, 1.2, s => (s < 0.03 ? (Math.exp(-((s % 0.0105) * 250))) : Math.exp(-(s - 0.03) * 13)) * 1.2, s0),
  sidestick: (s0) => add(filtered(0.08, 'bp', 2100, 3, s => Math.exp(-75 * s) * 1.6, s0), render(0.06, s => Math.sin(TAU * 820 * s) * Math.exp(-70 * s) * 0.5)),
  hat: (s0) => filtered(0.08, 'hp', 7500, 0.7, s => Math.exp(-60 * s) * 0.8, s0),
  openhat: (s0) => filtered(0.5, 'hp', 7000, 0.7, s => Math.exp(-8 * s) * 0.6, s0),
  shaker: (s0) => filtered(0.12, 'hp', 5200, 0.8, s => Math.min(1, s / 0.018) * Math.exp(-28 * s) * 0.9, s0),
  tamb: (s0) => add(filtered(0.2, 'hp', 6000, 0.9, s => Math.exp(-18 * s) * 0.8, s0), render(0.2, s => (Math.sin(TAU * 6300 * s) + Math.sin(TAU * 7900 * s)) * 0.08 * Math.exp(-20 * s))),
  woodblock: () => render(0.12, s => (Math.sin(TAU * 880 * s) + 0.4 * Math.sin(TAU * 1720 * s)) * Math.exp(-45 * s)),
  cowbell: () => { const b = new Biquad('bp', 900, 1.5); return render(0.4, s => b.run((Math.sin(TAU * 540 * s) > 0 ? 1 : -1) * 0.5 + (Math.sin(TAU * 800 * s) > 0 ? 1 : -1) * 0.5) * Math.exp(-9 * s) * 1.2); },
  tom: () => render(0.5, s => Math.sin(TAU * (90 * s + (40 / 9) * (1 - Math.exp(-9 * s)))) * Math.exp(-7 * s)),
  crash: (s0) => filtered(2.4, 'hp', 4000, 0.6, s => Math.exp(-2.2 * s) * 0.6, s0),
  ride: (s0) => add(filtered(1.4, 'hp', 6500, 0.6, s => Math.exp(-3 * s) * 0.35, s0), render(1.2, s => (Math.sin(TAU * 3100 * s) + Math.sin(TAU * 4700 * s)) * 0.06 * Math.exp(-3 * s))),
};

function bell(f, len = 1.4, d = 1.6) { return render(len, s => (Math.sin(TAU * f * s) * Math.exp(-d * s) + 0.35 * Math.sin(TAU * f * 2.76 * s) * Math.exp(-d * 2.2 * s) + 0.12 * Math.sin(TAU * f * 5.4 * s) * Math.exp(-d * 4 * s)) * Math.min(1, s / 0.001)); }

const FX = {
  tick: (e, s0) => { const f = 1900 + 900 * h32(e.i || 0, 3); return render(0.05, (s, i) => (Math.sin(TAU * f * s) * 0.5 + noise(i, s0) * 0.35) * Math.exp(-140 * s)); },
  click: (e, s0) => add(filtered(0.06, 'bp', 3200, 2.5, s => Math.exp(-90 * s) * 1.4, s0), render(0.08, s => Math.sin(TAU * 160 * s) * Math.exp(-45 * s) * 0.6)),
  doubleclick: (e, s0) => { const c = FX.click(e, s0); return add(c, c, 0.85, Math.round(0.09 * SR)); },
  pop: () => render(0.12, s => Math.sin(TAU * (380 * s + 3200 * s * s)) * Math.exp(-38 * s)),
  ding: (e) => { const f = e.pitch ? hz(e.pitch) : 1318.5; return add(bell(f), bell(f * 1.5), 0.7, Math.round(0.11 * SR)); },
  chime: (e) => { const f = e.pitch ? hz(e.pitch) : 1046.5; let o = new Float32Array(1); [1, 1.25, 1.5, 2].forEach((r, k) => { o = add(o, bell(f * r, 1.6, 1.8), 0.75, Math.round(k * 0.075 * SR)); }); return o; },
  sparkle: (e, s0) => { let o = new Float32Array(1); for (let k = 0; k < 7; k++) o = add(o, bell(2000 + 2400 * h32(k, s0), 0.6, 4), 0.35, Math.round(k * 0.055 * SR)); return o; },
  whoosh: (e, s0) => { const d = e.dur || 0.5, b = new Biquad('bp', 400, 0.9); return render(d + 0.05, (s, i) => { const p = Math.min(1, s / d), q = e.into ? 1 - p : p; if (i % 32 === 0) b.set(300 + 3200 * Math.sin(Math.PI * q * 0.5) ** 2); return b.run(noise(i, s0)) * Math.sin(Math.PI * p) ** 1.5 * 1.8; }); },
  revswell: (e, s0) => { const d = e.dur || 1.2, b = new Biquad('lp', 400, 0.7); return render(d, (s, i) => { const p = s / d; if (i % 32 === 0) b.set(300 + 5000 * p * p); return (b.run(noise(i, s0)) * 0.8 + Math.sin(TAU * 220 * s) * 0.1) * p ** 3; }); },
  roll: (e, s0) => { const d = e.dur || 1; let o = new Float32Array(Math.ceil((d + 1.5) * SR)); let t = 0, k = 0; while (t < d) { const tk = FX.tick({ i: k }, s0 + k); o = add(o, tk, 0.6 + 0.4 * (t / d), Math.round(t * SR)); t += 0.11 * Math.pow(1 - t / d, 1.2) + 0.022; k++; } return add(o, FX.ding({}), 0.8, Math.round(d * SR)); },
  boing: () => render(0.6, s => Math.sin(TAU * (190 * s + 14 * Math.sin(TAU * 9 * s) * Math.exp(-5 * s))) * Math.exp(-6 * s)),
  thud: (e, s0) => add(render(0.4, s => Math.sin(TAU * (60 * s + (40 / 18) * (1 - Math.exp(-18 * s)))) * Math.exp(-11 * s)), filtered(0.15, 'lp', 600, 0.7, s => Math.exp(-30 * s) * 0.6, s0)),
  swipe: (e, s0) => FX.whoosh({ dur: e.dur || 0.28 }, s0),
  // Reel hits: a sub drop with a noise transient (lands a cut), and a rising noise sweep into a cut (ends at t + dur).
  impact: (e, s0) => add(render(1.1, s => Math.tanh(2.2 * Math.sin(TAU * (38 * s + (120 / 9) * (1 - Math.exp(-9 * s))))) * Math.exp(-3.2 * s) * 0.9), filtered(0.5, 'lp', 2600, 0.8, s => Math.exp(-14 * s), s0), 0.7),
  riser: (e, s0) => { const d = e.dur || 0.8, b = new Biquad('bp', 400, 1.4); return render(d + 0.02, (s, i) => { const p = Math.min(1, s / d); if (i % 32 === 0) b.set(250 + 6000 * p * p); return (b.run(noise(i, s0)) * 1.4 + Math.sin(TAU * (180 * s + 260 * s * p)) * 0.12) * p ** 2.2; }); },
};

// Freeverb-style stereo reverb.
function reverb(L, R, { room = 0.84, damp = 0.28, width = 1 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => Math.round(n * SR / 44100));
  const aps = [556, 441, 341, 225].map(n => Math.round(n * SR / 44100));
  const run = (inp, spread) => {
    const out = new Float32Array(inp.length);
    const cs = combs.map(n => ({ b: new Float32Array(n + spread), i: 0, f: 0 }));
    const as = aps.map(n => ({ b: new Float32Array(n + spread), i: 0 }));
    for (let i = 0; i < inp.length; i++) {
      const x = inp[i] * 0.015; let y = 0;
      for (const c of cs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; y += o; }
      for (const a of as) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y; }
      out[i] = y;
    }
    return out;
  };
  const wl = run(L, 0), wr = run(R, 23);
  if (width < 1) for (let i = 0; i < wl.length; i++) { const m = (wl[i] + wr[i]) / 2; wl[i] = m + (wl[i] - m) * width; wr[i] = m + (wr[i] - m) * width; }
  return [wl, wr];
}

const DEFAULTS = { marimba: { rev: 0.25 }, vibes: { rev: 0.35 }, glock: { rev: 0.35, gain: -6 }, ep: { rev: 0.25 }, keys: { rev: 0.3 }, pluck: { rev: 0.3 }, bass: { rev: 0.04, gain: -1 }, pad: { rev: 0.55, gain: -5 } };
const DRUM_GAIN = { kick: 0, snare: -6, clap: -6, sidestick: -9, hat: -14, openhat: -14, shaker: -16, tamb: -15, woodblock: -10, cowbell: -12, tom: -6, crash: -14, ride: -16 };
const FX_GAIN = { tick: -16, click: -8, doubleclick: -8, pop: -9, ding: -12, chime: -12, sparkle: -16, whoosh: -12, revswell: -12, roll: -12, boing: -10, thud: -6, swipe: -12, impact: -4, riser: -12 };

export function synthesize(score, { sampleRate = SR } = {}) {
  if (sampleRate !== SR) throw new Error('only 48000 Hz');
  const { duration, events = [], programs = {}, master = {} } = score;
  const n = Math.ceil(duration * SR);
  const L = new Float32Array(n), R = new Float32Array(n), RL = new Float32Array(n), RR = new Float32Array(n);
  const unknown = {};
  const db = g => 10 ** ((g || 0) / 20);
  const place = (buf, t, gain, pan = 0, rev = 0) => {
    const off = Math.round(t * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    for (let i = 0; i < buf.length; i++) { const j = off + i; if (j < 0) continue; if (j >= n) break; const x = buf[i]; L[j] += x * gl; R[j] += x * gr; if (rev) { RL[j] += x * gl * rev; RR[j] += x * gr * rev; } }
  };
  const seed = score.seed || 1;
  events.forEach((e, k) => {
    if (!(e.t < duration)) return;
    const hum = (h32(k, seed + 11) - 0.5) * 0.008, velJ = 1 + (h32(k, seed + 12) - 0.5) * 0.08;
    if (e.kind === 'note') {
      const prog = programs[e.track] || { patch: 'marimba' };
      const patch = PATCHES[prog.patch] ? prog.patch : (unknown['patch:' + prog.patch] = (unknown['patch:' + prog.patch] || 0) + 1, 'marimba');
      const d = { ...DEFAULTS[patch], ...prog };
      const buf = PATCHES[patch](hz(e.pitch), Math.max(0.05, e.dur), e.vel, k + seed, d.bright ?? 1);
      place(buf, Math.max(0, e.t + hum), (e.vel / 127) ** 1.4 * velJ * db(d.gain) * 0.32, d.pan || 0, d.rev ?? 0.2);
    } else if (e.kind === 'drum') {
      const f = DRUMS[e.name]; if (!f) { unknown['drum:' + e.name] = (unknown['drum:' + e.name] || 0) + 1; return; }
      const prog = programs[e.name] || programs.drums || {};
      place(f(k + seed), Math.max(0, e.t + hum * 0.5), (e.vel / 127) ** 1.3 * velJ * db(DRUM_GAIN[e.name] + (prog.gain || 0)) * 0.5, prog.pan ?? (e.name.includes('hat') || e.name === 'shaker' ? 0.25 : 0), prog.rev ?? 0.08);
    } else if (e.kind === 'fx') {
      const f = FX[e.name]; if (!f) { unknown['fx:' + e.name] = (unknown['fx:' + e.name] || 0) + 1; return; }
      const buf = f(e, k + seed * 7);
      const t0 = e.name === 'revswell' || e.name === 'riser' ? e.t - (e.dur || (e.name === 'riser' ? 0.8 : 1.2)) : e.t;
      place(buf, Math.max(0, t0), (e.vel / 127) ** 1.2 * db(FX_GAIN[e.name]) * 0.9, e.pan || 0, 0.18);
    }
  });
  const [wl, wr] = reverb(RL, RR, master.reverb || {});
  const g = db(master.gain ?? -3), fadeOut = master.fadeOut ?? 1, fadeIn = master.fadeIn ?? 0.004;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR, f = Math.min(1, s / fadeIn, (duration - s) / fadeOut);
    L[i] = (L[i] + wl[i] * 0.9) * g * Math.max(0, f); R[i] = (R[i] + wr[i] * 0.9) * g * Math.max(0, f);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  // Loudness: bring the gated RMS to a target (≈ −16 LUFS for web video), then a look-ahead peak limiter at −1 dBFS.
  const target = master.loudness ?? -16;
  if (target !== false) {
    const blk = SR * 0.4; let sum = 0, cnt = 0;
    for (let b0 = 0; b0 < n; b0 += blk) { let e = 0; const b1 = Math.min(n, b0 + blk); for (let i = b0; i < b1; i++) e += L[i] * L[i] + R[i] * R[i]; e /= 2 * (b1 - b0); if (e > 1e-6) { sum += e; cnt++; } }
    if (cnt) { const rms = 10 * Math.log10(sum / cnt), gain = 10 ** ((target - 2.5 - rms) / 20); for (let i = 0; i < n; i++) { L[i] *= gain; R[i] *= gain; } }
  }
  const ceil = 0.89, look = Math.round(SR * 0.002), rel = Math.exp(-1 / (SR * 0.08));
  const peakAt = new Float32Array(n); for (let i = 0; i < n; i++) peakAt[i] = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  // running max over the look-ahead window (monotonic deque)
  const need = new Float32Array(n), dq = new Int32Array(n); let h = 0, tl = 0;
  for (let i = n - 1; i >= 0; i--) { while (tl > h && peakAt[dq[tl - 1]] <= peakAt[i]) tl--; dq[tl++] = i; while (dq[h] > i + look) h++; need[i] = peakAt[dq[h]]; }
  let lg = 1, peak2 = 0;
  for (let i = 0; i < n; i++) { const want = need[i] > ceil ? ceil / need[i] : 1; lg = want < lg ? want : want + (lg - want) * rel; L[i] *= lg; R[i] *= lg; peak2 = Math.max(peak2, Math.abs(L[i]), Math.abs(R[i])); }
  const lim = 1;
  return { L, R, sampleRate: SR, unknown, peak: peak2 * lim };
}

export function wav({ L, R, sampleRate }) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  return buf;
}

export function levels({ L, R }) {
  const out = [];
  for (let s = 0; s * SR < L.length; s++) {
    let sum = 0, c = 0; for (let i = s * SR; i < Math.min(L.length, (s + 1) * SR); i++) { sum += L[i] * L[i] + R[i] * R[i]; c += 2; }
    out.push(c ? 10 * Math.log10(sum / c + 1e-12) : -120);
  }
  return out;
}
export const KNOWN = { patches: Object.keys(PATCHES), drums: Object.keys(DRUMS), fx: Object.keys(FX) };
