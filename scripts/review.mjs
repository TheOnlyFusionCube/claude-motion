#!/usr/bin/env node
// Review a finished film, from this kit or from anywhere: an MP4/MOV/WebM, or a film folder.
//   node scripts/review.mjs <video.mp4 | film-dir> [--sheet out.jpg] [--step 0.5]
// Reports: length/size/fps, sound (present? loudness), frozen spans, how much the whole picture
// moves vs. small local changes, and whether the shots all share one layout (the "animated deck").
// It can't judge taste; it tells you where to look.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { args, ffmpegPath, launch, openFilm, snap } from './lib/browser.mjs';
import { analyze, findings, SW, SH } from './lib/analyze.mjs';

const a = args();
const target = a._[0];
if (!target) { console.log('usage: node scripts/review.mjs <video.mp4 | film-dir> [--sheet out.jpg] [--step 0.5]'); process.exit(1); }
const step = +(a.step || 0.5);
const warn = [], note = [];
let samples = [], title = path.basename(target);

if (fs.statSync(target).isDirectory()) {
  const browser = await launch();
  try {
    const { page, info } = await openFilm(browser, target);
    title = info.title;
    note.push(`${info.width}×${info.height}, ${info.fps} fps, ${info.duration}s (film folder)`);
    const score = await page.evaluate(() => __film.score());
    if (!score.events.length) warn.push('silent: the film has no score(S, kit). Sound is half the film unless silence was asked for (SKILL.md §5)');
    else note.push(`score: ${score.events.length} events`);
    const ana = await browser.newPage(); await ana.setContent(`<canvas id=c width=${SW} height=${SH}></canvas>`);
    for (let t = 0; t < info.duration - 1e-6; t += step) {
      const buf = await snap(page, +t.toFixed(3), 'jpeg', 70);
      samples.push({ t, px: Buffer.from(await ana.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); const c = document.getElementById('c').getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, c.canvas.width, c.canvas.height); return Array.from(c.getImageData(0, 0, c.canvas.width, c.canvas.height).data.filter((_, i) => i % 4 !== 3)); }, buf.toString('base64'))) });
    }
    if (a.sheet) {
      const { contactSheet } = await import('./lib/sheet.mjs');
      const shots = []; for (let t = 0; t < info.duration; t += Math.max(1, info.duration / 24)) shots.push({ buf: await snap(page, +t.toFixed(2), 'jpeg', 80), type: 'jpeg', label: t.toFixed(1) + 's', w: info.width, h: info.height });
      fs.writeFileSync(a.sheet, await contactSheet(browser, shots, { cols: 6, cellW: 320, title }));
    }
  } finally { await browser.close(); }
} else {
  const ff = ffmpegPath(), probe = ff.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
  let meta = {};
  try { meta = JSON.parse(execFileSync(probe, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,width,height,r_frame_rate', '-of', 'json', target]).toString()); } catch { warn.push('ffprobe not found next to ffmpeg; skipping stream info'); }
  const v = (meta.streams || []).find(s => s.codec_type === 'video'), au = (meta.streams || []).find(s => s.codec_type === 'audio');
  if (v) { const [n, dn] = v.r_frame_rate.split('/'); note.push(`${v.width}×${v.height}, ${(n / dn).toFixed(0)} fps, ${(+meta.format.duration).toFixed(1)}s, ${(meta.format.size / 1e6).toFixed(1)} MB`); if (v.height < 720 && v.width < 720) warn.push(`low resolution (${v.width}×${v.height})`); }
  if (!au && meta.streams) warn.push('silent: no audio track. Sound is half the film unless silence was asked for');
  if (au) {
    const r = spawnSync(ff, ['-nostats', '-i', target, '-map', '0:a', '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.stderr.split('Summary:').pop() || '');
    if (m) { const lufs = +m[1]; note.push(`loudness ${lufs} LUFS`); if (lufs < -24) warn.push(`quiet: ${lufs} LUFS (web video sits around −16)`); }
  }
  const raw = execFileSync(ff, ['-v', 'error', '-i', target, '-vf', `fps=${1 / step},scale=${SW}:${SH}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
  const fs_ = SW * SH * 3;
  for (let i = 0; i * fs_ < raw.length; i++) samples.push({ t: i * step, px: raw.subarray(i * fs_, (i + 1) * fs_) });
  if (a.sheet) {
    const dur = +(meta.format?.duration || samples.length * step), every = Math.max(1, dur / 24);
    execFileSync(ff, ['-v', 'error', '-y', '-i', target, '-vf', `fps=1/${every},scale=320:-1,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x4:padding=4:color=0x111111`, '-frames:v', '1', a.sheet]);
  }
}

if (samples.length) {
  const first = samples[0].px; let inkN = 0; for (let i = 0; i < first.length; i += 3) if (Math.abs(first[i] - first[0]) + Math.abs(first[i + 1] - first[1]) + Math.abs(first[i + 2] - first[2]) > 60) inkN++;
  if (inkN / (first.length / 3) < 0.002) warn.push('the first frame is nearly blank (it is the thumbnail)');
  const r = findings(analyze(samples, step));
  warn.push(...r.warn); note.push(...r.note);
}
console.log(`${title}`);
for (const n of note) console.log('  · ' + n);
for (const w of warn) console.log('  ! ' + w);
if (a.sheet) console.log(`  contact sheet → ${a.sheet}`);
console.log(warn.length ? `\n${warn.length} thing(s) to look at. These are smells, not verdicts: watch those spans.` : '\nNothing flagged. Now watch it: this script cannot judge the film.');
