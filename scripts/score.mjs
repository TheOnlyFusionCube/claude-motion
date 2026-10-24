#!/usr/bin/env node
// Render a film's score(S, kit) to WAV (48 kHz stereo). The player records events; this synthesizes them.
//   node scripts/score.mjs <film-dir> [--out <film-dir>/score.wav] [--levels]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args, launch, openFilm } from './lib/browser.mjs';
import { synthesize, wav, levels } from './lib/synth.mjs';

export async function renderFilmScore(filmDir, out, { browser, quiet = false, showLevels = false } = {}) {
  const own = !browser; if (own) browser = await launch();
  try {
    const { page, ctx, info } = await openFilm(browser, filmDir);
    const score = await page.evaluate(() => __film.score());
    await ctx.close();
    if (!score.events.length) { if (!quiet) console.log('No score events (film has no score(S, kit)) — nothing written.'); return { events: 0 }; }
    const res = synthesize(score);
    fs.writeFileSync(out, wav(res));
    const lv = levels(res);
    const unknown = Object.entries(res.unknown);
    if (!quiet || unknown.length) {
      console.log(`score: ${score.events.length} events${score.tempo ? `, ${score.tempo.bpm} BPM` : ''} → ${out}  (peak ${(20 * Math.log10(res.peak + 1e-9)).toFixed(1)} dBFS)`);
      if (unknown.length) console.warn('  unknown (silent): ' + unknown.map(([k, v]) => `${k}×${v}`).join(', '));
    }
    if (showLevels) console.log('  RMS dBFS per second: ' + lv.map((v, i) => `${i}:${v.toFixed(0)}`).join('  '));
    return { events: score.events.length, levels: lv, info };
  } finally { if (own) await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args();
  if (!a._[0]) { console.log('usage: node scripts/score.mjs <film-dir> [--out score.wav] [--levels]'); process.exit(1); }
  const dir = path.resolve(a._[0]);
  await renderFilmScore(dir, path.resolve(a.out || path.join(dir, 'score.wav')), { showLevels: !!a.levels });
}
