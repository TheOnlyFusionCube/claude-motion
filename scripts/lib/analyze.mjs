// Picture heuristics shared by check.mjs and review.mjs. Input: samples [{t, px}] where px is RGB
// bytes of a 192×108 thumbnail taken every `step` seconds. These are smells, not taste:
// each one points at a span to go and look at.
export const SW = 192, SH = 108;

// Pixels that differ from the frame's dominant colour (its ground).
function inkMask(px) {
  const hist = new Map();
  for (let i = 0; i < px.length; i += 3) { const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4); hist.set(k, (hist.get(k) || 0) + 1); }
  let best = 0, key = 0; for (const [k, v] of hist) if (v > best) { best = v; key = k; }
  const bg = [((key >> 8) & 15) * 16 + 8, ((key >> 4) & 15) * 16 + 8, (key & 15) * 16 + 8];
  const m = new Uint8Array(px.length / 3);
  for (let i = 0, j = 0; i < px.length; i += 3, j++) m[j] = Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) > 54 ? 1 : 0;
  return m;
}

// Where the picture's weight sits: ink share, centroid and spread (all 0..1 of the frame).
export function composition(px) {
  const m = inkMask(px); let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (m[y * SW + x]) { n++; sx += x; sy += y; sxx += x * x; syy += y * y; }
  if (!n) return { ink: 0, cx: .5, cy: .5, wx: 0, wy: 0 };
  const cx = sx / n, cy = sy / n;
  return { ink: n / (SW * SH), cx: cx / SW, cy: cy / SH, wx: Math.sqrt(Math.max(0, sxx / n - cx * cx)) / SW, wy: Math.sqrt(Math.max(0, syy / n - cy * cy)) / SH };
}

export const diff = (A, B) => { let c = 0; for (let i = 0; i < A.length; i += 3) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) c++; return c / (A.length / 3); };

export function analyze(samples, step) {
  const D = samples.length * step;
  const d = samples.slice(1).map((s, i) => diff(samples[i].px, s.px));
  // frozen runs
  const still = []; let run = 0, start = 0;
  d.forEach((v, i) => { if (v < 0.0015) { if (!run) start = samples[i].t; run += step; } else { if (run >= 1.5) still.push([start, start + run]); run = 0; } });
  if (run >= 1.5) still.push([start, start + run]);
  const frozen = still.reduce((a, [s, e]) => a + e - s, 0) / D;
  // how much of the time the WHOLE picture is moving (camera travel, world motion), vs. a small local change
  const wide = d.filter(v => v > 0.35).length / Math.max(1, d.length);
  const local = d.filter(v => v > 0.004 && v <= 0.35).length / Math.max(1, d.length);
  // composition sameness: share of frames whose weight sits in the same place, at the same spread, as the film's typical frame
  const comp = samples.map(s => composition(s.px));
  const med = k => { const a = comp.map(c => c[k]).sort((x, y) => x - y); return a[a.length >> 1]; };
  const M = { cx: med('cx'), cy: med('cy'), wx: med('wx'), wy: med('wy'), ink: med('ink') };
  const same = comp.filter(c => Math.abs(c.cx - M.cx) < .06 && Math.abs(c.cy - M.cy) < .06 && Math.abs(c.wx - M.wx) < .05 && Math.abs(c.wy - M.wy) < .05).length / comp.length;
  const centred = comp.filter(c => Math.abs(c.cx - .5) < .08 && Math.abs(c.cy - .5) < .1 && c.ink < .3 && c.wx < .26).length / comp.length;
  const sparse = comp.filter(c => c.ink < .06).length / comp.length;      // mostly empty ground
  const big = comp.filter(c => c.ink > .35 || c.wx > .3).length / comp.length; // full-bleed or wide-spread pictures
  // how much the picture becomes something else over 2 s (films: ~0.18–0.30; animated decks: ~0.09–0.12)
  const lag = Math.max(1, Math.round(2 / step)), d2 = samples.slice(lag).map((s, i) => diff(samples[i].px, s.px)).sort((x, y) => x - y);
  const change2s = d2.length ? d2[d2.length >> 1] : 1;
  // does the picture's weight ever leave the centre line?
  const cxSd = Math.sqrt(comp.reduce((acc, c) => acc + (c.cx - .5) ** 2, 0) / comp.length);
  return { duration: D, still, frozen, wide, local, same, centred, sparse, big, change2s, cxSd, comp };
}

// Turn the numbers into findings. Thresholds calibrated on films that read as films vs. as decks.
export function findings(a) {
  const warn = [], note = [];
  note.push(`motion: whole-picture movement ${(a.wide * 100).toFixed(0)}% of steps, local-only ${(a.local * 100).toFixed(0)}%, frozen ${(a.frozen * 100).toFixed(0)}%`);
  note.push(`composition: same layout ${(a.same * 100).toFixed(0)}% of frames, centred-and-small ${(a.centred * 100).toFixed(0)}%, mostly-empty ${(a.sparse * 100).toFixed(0)}%, big/full-bleed ${(a.big * 100).toFixed(0)}%, picture changed over 2 s ${(a.change2s * 100).toFixed(0)}% (median), centre-line spread ${a.cxSd.toFixed(3)}`);
  for (const [s, e] of a.still) (e - s >= 2.5 ? warn : note).push(`${e - s >= 2.5 ? 'frozen' : 'near-still'} ${s.toFixed(1)}–${e.toFixed(1)}s (${(e - s).toFixed(1)}s): nothing moves`);
  if (a.frozen > .25) warn.push(`${Math.round(a.frozen * 100)}% of the film is frozen: this measures like a slideshow`);
  const deck = [];
  if (a.change2s < .14) deck.push(`over any 2 s only ~${(a.change2s * 100).toFixed(0)}% of the picture changes: small things move inside a layout that stays put (films travel: ~18–30%)`);
  if (a.cxSd < .04) deck.push('the picture\'s weight never leaves the centre line: every shot is composed the same way');
  if (a.same > .45) deck.push(`${(a.same * 100).toFixed(0)}% of frames share one layout`);
  if (deck.length >= 2) warn.push('this measures like an animated deck:\n      - ' + deck.join('\n      - ') + '\n      Fix: one world the camera travels through, three or more shot scales, subjects that fill the frame in close-ups, and words that come and go instead of a headline per beat (SKILL.md "The deck trap").');
  else for (const x of deck) note.push(x);
  return { warn, note };
}
