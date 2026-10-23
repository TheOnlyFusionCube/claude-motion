#!/usr/bin/env node
/** Render sample stills and verify out-of-order seek determinism. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { openFilm, parseOptions } from './browser.mjs';

const HELP = `Usage: node inspect.mjs <film-directory> [--times 0,2.5,8,end] [--out ./frames] [--scale 0.5]\nNeeds Node >=22 and Chromium (or CHROMIUM_PATH).`;

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(HELP); return; }
  const args = parseOptions(process.argv.slice(2), ['--times', '--out', '--scale']);
  if (args._.length !== 1) throw new Error(HELP);
  const scale = Number(args.scale ?? 0.5);
  if (!(scale > 0 && scale <= 2)) throw new Error('--scale must be >0 and <=2');
  const dir = path.resolve(args.out ?? './frames');
  const film = await openFilm(args._[0]);
  try {
    const times = (args.times ?? `0,${(film.config.duration / 4).toFixed(2)},${(film.config.duration / 2).toFixed(2)},${(film.config.duration * .75).toFixed(2)},end`)
      .split(',').map(s => s.trim() === 'end' ? film.config.duration : Number(s.trim()));
    if (times.some(t => !Number.isFinite(t) || t < 0 || t > film.config.duration)) throw new Error('All --times values must lie inside the film duration.');
    await fs.mkdir(dir, { recursive: true });
    let first = null;
    for (const [i, t] of times.entries()) {
      const png = await film.frame(t, scale);
      if (i === 0) first = png;
      const filename = `frame_${String(i + 1).padStart(2, '0')}_${t.toFixed(3).replace('.', 'p')}.png`;
      await fs.writeFile(path.join(dir, filename), png);
      console.log(`${filename} (${png.length} bytes)`);
    }
    await film.frame(Math.min(film.config.duration, (times[0] + film.config.duration) / 2), scale);
    const second = await film.frame(times[0], scale);
    const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
    if (sha(first) !== sha(second)) throw new Error('Frame changed after out-of-order seek: animation is not deterministic.');
    if (film.errors.length) throw new Error('Browser errors: ' + film.errors.join('; '));
    console.log(`PASS: deterministic seek, ${times.length} stills in ${dir}`);
  } finally { await film.close(); }
}
main().catch(err => { console.error('Inspect failed:', err.message); process.exitCode = 1; });
