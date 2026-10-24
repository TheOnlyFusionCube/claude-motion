#!/usr/bin/env node
// Export a film to MP4 (H.264 + AAC), frame-exact, in parallel browser workers.
//   node scripts/export.mjs <film-dir> [--out film.mp4] [--fps 30] [--from 0] [--to end]
//        [--jobs 4] [--audio score.wav | --no-audio] [--crf 16] [--gif out.gif]
//        [--scale 0.5] [--draft]   (--draft = half size, 24 fps, quick encode, no motion blur: for checking timing, not delivery)
//        [--blur n | --no-blur]    (motion blur: defaults to the film's `motionBlur`; n sub-frames per frame)
// The score is rendered first (scripts/score.mjs) unless --no-audio or --audio is given.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { args, launch, openFilm, snapFrame, ffmpegPath, blurSetting, makeBlender } from './lib/browser.mjs';
import { renderFilmScore } from './score.mjs';

const a = args();
if (a.draft) { a.scale ??= 0.5; a.fps ??= 24; a.crf ??= 23; a.preset ??= 'veryfast'; }
const scale = +(a.scale || 1);
const film = a._[0];
if (!film) { console.log('usage: node scripts/export.mjs <film-dir> [--out film.mp4] [--fps n] [--from s] [--to s] [--jobs n] [--audio wav | --no-audio]'); process.exit(1); }
const filmDir = path.resolve(film);
const out = path.resolve(a.out || path.join(filmDir, 'film.mp4'));
const ffmpeg = ffmpegPath();
const browser = await launch();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
try {
  const first = await openFilm(browser, filmDir, { scale });
  const info = first.info; await first.ctx.close();
  const fps = +(a.fps || info.fps);
  const from = +(a.from || 0), to = a.to && a.to !== 'end' ? +a.to : info.duration;
  const N = Math.round((to - from) * fps);
  const jobs = Math.max(1, Math.min(+(a.jobs || Math.min(6, os.cpus().length)), N));
  const mb = blurSetting(info, a['no-blur'] ? false : (a.draft && a.blur == null ? false : a.blur));
  console.log(`${info.title}: ${Math.round(info.width * scale)}×${Math.round(info.height * scale)} @ ${fps}fps, ${(to - from).toFixed(2)}s = ${N} frames, ${jobs} workers${mb ? `, motion blur ×${mb.samples}${mb.fast.length ? ' (more on fast spans)' : ''}` : info.motionBlur ? ' (motion blur off)' : ''}`);
  const started = Date.now(); let done = 0;
  const worker = async (w) => {
    const logs = [];
    const { page, ctx } = await openFilm(browser, filmDir, { logs, scale });
    const blender = mb ? await makeBlender(browser) : null;
    const lo = Math.floor((w * N) / jobs), hi = Math.floor(((w + 1) * N) / jobs);
    for (let i = lo; i < hi; i++) {
      const buf = await snapFrame(page, from + i / fps, { ...info, fps }, mb, blender, 'jpeg', 94);
      fs.writeFileSync(path.join(tmp, `f${String(i).padStart(6, '0')}.jpg`), buf);
      if (++done % 30 === 0 || done === N) process.stdout.write(`\r  frames ${done}/${N}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    const errs = await page.evaluate(() => __film.errors);
    await ctx.close();
    return [...errs, ...logs];
  };
  const errs = (await Promise.all(Array.from({ length: jobs }, (_, w) => worker(w)))).flat();
  process.stdout.write('\n');
  if (errs.length) console.warn('Console errors during export:\n  ' + [...new Set(errs)].join('\n  '));

  let audio = a.audio ? path.resolve(a.audio) : null;
  if (!audio && !a['no-audio']) {
    const wav = path.join(filmDir, 'score.wav');
    const r = await renderFilmScore(filmDir, wav, { browser, quiet: true });
    if (r && r.events > 0) audio = wav;
    else console.warn('\n  ⚠ SILENT EXPORT: this film has no score(S, kit). Sound is half the film; add one unless silence was asked for.\n');
  }
  const ff = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%06d.jpg')];
  if (audio) ff.push('-ss', String(from), '-t', String(to - from), '-i', audio);
  ff.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', a.preset || 'slow', '-crf', String(a.crf || 16), '-pix_fmt', 'yuv420p', '-tune', 'animation', '-movflags', '+faststart');
  if (audio) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push(out);
  const r = spawnSync(ffmpeg, ff, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  if (a.gif) {
    const gif = path.resolve(a.gif);
    spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', out, '-vf', `fps=${Math.min(fps, 24)},scale=${Math.min(960, info.width)}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a`, gif], { stdio: 'inherit' });
    console.log('→ ' + gif);
  }
  console.log(`→ ${out}  (${(fs.statSync(out).size / 1e6).toFixed(1)} MB${audio ? ', with audio' : ', silent'}, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
