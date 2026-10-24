#!/usr/bin/env node
// Render stills of a film exactly as the export sees them, plus an optional contact sheet.
//   node scripts/frames.mjs <film-dir> [--at 0,2.5,c2,c3+0.5,50%,end] [--every 1] [--count 12]
//                                      [--out dir] [--sheet] [--scale 1] [--cols 4]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { args, launch, openFilm, parseTimes, snap } from './lib/browser.mjs';
import { contactSheet } from './lib/sheet.mjs';

const a = args();
const film = a._[0];
if (!film) { console.log('usage: node scripts/frames.mjs <film-dir> [--at times] [--every s] [--count n] [--out dir] [--sheet] [--scale 1]'); process.exit(1); }
const browser = await launch();
const logs = [];
try {
  const { page, info } = await openFilm(browser, film, { scale: +(a.scale || 1), logs });
  let times;
  if (a.at) times = parseTimes(a.at, info);
  else if (a.every) { times = []; for (let t = 0; t < info.duration; t += +a.every) times.push(+t.toFixed(3)); times.push(Math.max(0, info.duration - 1 / info.fps)); }
  else { const n = +(a.count || 12); times = Array.from({ length: n }, (_, i) => +(i * (info.duration - 1 / info.fps) / (n - 1)).toFixed(3)); for (const c of info.chapters) times.push(+(c.t + 0.8).toFixed(3)); times = [...new Set(times)].sort((x, y) => x - y); }
  const out = a.out || fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  fs.mkdirSync(out, { recursive: true });
  const shots = [];
  for (const t of times) {
    const buf = await snap(page, t);
    const name = `t_${t.toFixed(3).padStart(7, '0')}.png`;
    fs.writeFileSync(path.join(out, name), buf);
    shots.push({ buf, label: `${t.toFixed(2)}s`, w: info.width, h: info.height });
  }
  if (a.sheet) {
    const sheet = await contactSheet(browser, shots, { cols: +(a.cols || 4), title: `${info.title} · ${info.width}×${info.height} · ${info.duration}s` });
    fs.writeFileSync(path.join(out, 'sheet.jpg'), sheet);
  }
  const errs = [...info.errors, ...logs, ...(await page.evaluate(() => __film.errors))];
  console.log(`${shots.length} stills → ${out}${a.sheet ? '  (+ sheet.jpg)' : ''}`);
  if (errs.length) { console.log('\nConsole errors/warnings:\n  ' + [...new Set(errs)].join('\n  ')); process.exitCode = 1; }
} finally { await browser.close(); }
