#!/usr/bin/env node
// Technical check of a film. Errors fail (exit 1); warnings are things to go and LOOK at.
//   node scripts/check.mjs <film-dir> [--step 0.25]
// Checks: loads cleanly, no console errors, deterministic seeking (forward vs backward),
// a readable first frame, dead-air spans where nothing moves, tiny on-screen text, end-card hold.
// It cannot judge taste. Passing this is the floor, not the bar — see SKILL.md "Look at it".
import { args, launch, openFilm, snap } from './lib/browser.mjs';

const a = args();
const film = a._[0];
if (!film) { console.log('usage: node scripts/check.mjs <film-dir> [--step 0.25]'); process.exit(1); }
const errors = [], warns = [], notes = [];
const browser = await launch();
const logs = [];
try {
  const { page, info } = await openFilm(browser, film, { logs });
  const D = info.duration, step = +(a.step || 0.25);
  notes.push(`${info.title}: ${info.width}×${info.height}, ${info.fps} fps, ${D}s, ${info.chapters.length} chapters`);

  // 1. determinism: same t, different seek history → identical pixels
  const probe = [0.37 * D, 0.71 * D, 0.13 * D].map(t => +t.toFixed(3));
  const fwd = []; for (const t of probe) fwd.push(await snap(page, t));
  await snap(page, D - 0.01); await snap(page, 0);
  for (let i = probe.length - 1; i >= 0; i--) { const b = await snap(page, probe[i]); if (!b.equals(fwd[i])) errors.push(`render(${probe[i]}) differs depending on seek history — state is leaking between frames (accumulation, timers, Math.random, CSS transitions, or a video clip)`); }

  // 2. sample the film small and measure motion between samples (in a scratch page)
  const ana = await browser.newPage();
  await ana.setContent('<canvas id=c width=192 height=108></canvas>');
  const samples = [];
  for (let t = 0; t <= D - 1 / info.fps + 1e-9; t += step) {
    const buf = await snap(page, +t.toFixed(3), 'jpeg', 70);
    samples.push({ t: +t.toFixed(3), px: await ana.evaluate(async (b64) => {
      const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode();
      const c = document.getElementById('c').getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, 192, 108);
      return Array.from(c.getImageData(0, 0, 192, 108).data.filter((_, i) => i % 4 !== 3));
    }, buf.toString('base64')) });
  }
  const lum0 = px => { let s = 0, s2 = 0; const n = px.length / 3; for (let i = 0; i < px.length; i += 3) { const l = .2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2]; s += l; s2 += l * l; } const m = s / n; return { mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)) }; };
  const diff = (A, B) => { let c = 0; for (let i = 0; i < A.length; i += 3) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) c++; return c / (A.length / 3); };

  // first frame must already say what the film is
  // blank = almost every pixel matches the background colour (sampled at the corners)
  const inked = px => { const c = [0, 191 * 3, 107 * 192 * 3, (107 * 192 + 191) * 3].map(i => [px[i], px[i + 1], px[i + 2]]); const bg = c[0]; let n = 0; for (let i = 0; i < px.length; i += 3) if (Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) > 60) n++; return n / (px.length / 3); };
  const f0 = { ink: inked(samples[0].px) };
  if (f0.ink < 0.002) errors.push(`frame 0 is nearly blank (${(f0.ink * 100).toFixed(2)}% of pixels differ from the background) — it is the thumbnail and the MP4's first frame; start the title entrance before 0 (e.g. TT.title = -0.6)`);

  // dead air: runs where < 0.15% of pixels change between samples
  const d = samples.slice(1).map((s, i) => diff(samples[i].px, s.px));
  let run = 0, runStart = 0; const still = [];
  d.forEach((v, i) => { if (v < 0.0015) { if (!run) runStart = samples[i].t; run += step; } else { if (run >= 1.5) still.push([runStart, runStart + run]); run = 0; } });
  if (run >= 1.5) still.push([runStart, runStart + run]);
  for (const [s, e] of still) (e - s >= 2.5 ? warns : notes).push(`${e - s >= 2.5 ? 'frozen' : 'near-still'} ${s.toFixed(2)}–${e.toFixed(2)}s (${(e - s).toFixed(1)}s): nothing moves. Holds still drift/breathe/creep (motion.md §1); if this is a reading hold, keep a slow camera drift on it.`);
  const frozen = still.reduce((a, [s0, e0]) => a + (e0 - s0), 0);
  if (frozen / D > 0.25) warns.push(`${Math.round(frozen / D * 100)}% of the film is frozen — this measures like a slideshow. Every beat needs an action and every hold a drift (SKILL.md §2).`);
  const moving = d.filter(v => v > 0.004).length / d.length;
  notes.push(`motion: ${(moving * 100).toFixed(0)}% of ${step}s steps change >0.4% of the frame; biggest change ${(Math.max(...d) * 100).toFixed(0)}% at ${samples[d.indexOf(Math.max(...d)) + 1].t}s`);
  // slideshow smell: most of the change happens in a few big jumps (cuts/fades) with flat holds between
  const big = d.filter(v => v > 0.25).length, mid = d.filter(v => v > 0.004 && v <= 0.25).length;
  if (D > 12 && mid < big * 4) warns.push(`motion is mostly jumps (${big} big changes vs ${mid} continuous ones) — this is how an animated slideshow measures. Carry subjects between shots with camera moves and transforms instead of fades/cuts.`);

  // end card hold: last 2.5s should be calm but not frozen
  const tail = d.slice(-Math.round(2.5 / step));
  if (tail.length && tail.every(v => v < 0.0005)) warns.push('the last 2.5s are frozen — let the end card creep/breathe (≈2 px/s) rather than stop dead');
  if (tail.some(v => v > 0.3)) warns.push('a big change happens in the last 2.5s — the end card should land and hold ≥3s');

  // 3. tiny text: visible words smaller than 20px on a 1080p frame
  const small = new Map();
  for (let t = 0.25; t < D; t += 0.5) {
    await page.evaluate(tt => __film.seek(tt), t);
    const found = await page.evaluate((H) => {
      const out = [], k = H / 1080, st = document.getElementById('stage'), sr = st.getBoundingClientRect();
      const walker = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode, txt = n.textContent.trim(); if (txt.length < 3) continue;
        const el = n.parentElement; if (!el) continue;
        const range = document.createRange(); range.selectNodeContents(n); const r = range.getBoundingClientRect();
        if (r.width < 2 || r.bottom < sr.top || r.top > sr.bottom || r.right < sr.left || r.left > sr.right) continue;
        let o = 1, e = el; while (e && e !== st) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { o = 0; break; } o *= +cs.opacity; e = e.parentElement; }
        if (o < 0.5) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize), eb = el.getBoundingClientRect();
        const scale = el.offsetHeight > 0 ? eb.height / el.offsetHeight : (el.getBBox ? 1 : 1);
        const onScreen = fs * scale / k;
        if (onScreen < 20) out.push([txt.slice(0, 40), Math.round(onScreen)]);
      }
      return out;
    }, info.height);
    for (const [txt, px] of found) { const s = small.get(txt) || { px, from: t, to: t }; s.to = t; s.px = Math.min(s.px, px); small.set(txt, s); }
  }
  const longSmall = [...small.entries()].filter(([, s]) => s.to - s.from >= 1);
  if (longSmall.length) warns.push(`text under ~20px on screen for ≥1s (unreadable on a phone; zoom the camera in or set it larger):\n      ` + longSmall.slice(0, 8).map(([t, s]) => `"${t}" ~${s.px}px, ${s.from.toFixed(1)}–${s.to.toFixed(1)}s`).join('\n      ') + (longSmall.length > 8 ? `\n      …and ${longSmall.length - 8} more` : ''));

  const errs = [...(await page.evaluate(() => __film.errors)), ...logs];
  for (const e of new Set(errs)) errors.push(e);
} catch (e) { errors.push(e.message); }
finally { await browser.close(); }

for (const n of notes) console.log('  · ' + n);
for (const w of warns) console.log('  ! ' + w);
for (const e of errors) console.log('  ✗ ' + e);
console.log(errors.length ? `\nFAIL — ${errors.length} error(s), ${warns.length} warning(s)` : `\nOK — ${warns.length} warning(s). Now watch it and look at the stills; this script cannot judge the film.`);
process.exit(errors.length ? 1 : 0);
