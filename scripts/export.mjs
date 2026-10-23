#!/usr/bin/env node
/** Export frame-seekable local browser films via PNG pipe and FFmpeg. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { openFilm, parseOptions } from './browser.mjs';

const HELP = `Usage: node export.mjs <film-directory> --out film.mp4 [--fps 30] [--scale 1] [--start 0] [--end 14] [--audio authorized.wav]\nNeeds Node >=22, Chromium (or CHROMIUM_PATH), and ffmpeg on PATH. Output MP4/H.264 is opaque.`;

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(HELP); return; }
  const args = parseOptions(process.argv.slice(2), ['--out', '--fps', '--scale', '--start', '--end', '--audio']);
  if (args._.length !== 1 || !args.out) throw new Error(HELP);
  if (!args.out.toLowerCase().endsWith('.mp4')) throw new Error('Exporter writes H.264 MP4. Use an .mp4 output filename.');
  const film = await openFilm(args._[0]);
  let encoder = null;
  try {
    const fps = Number(args.fps ?? film.config.fps);
    const scale = Number(args.scale ?? 1);
    const start = Number(args.start ?? 0);
    const end = Number(args.end ?? film.config.duration);
    if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new Error('--fps must be 1..120');
    if (!Number.isFinite(scale) || scale <= 0 || scale > 2) throw new Error('--scale must be >0 and <=2');
    if (!(start >= 0 && end > start && end <= film.config.duration)) throw new Error('--start/--end must define a valid film interval');
    const total = Math.round((end - start) * fps);
    if (total < 1) throw new Error('Requested interval contains zero frames');
    const output = path.resolve(args.out);
    await fs.mkdir(path.dirname(output), { recursive: true });
    const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0'];
    if (args.audio) {
      await fs.access(args.audio);
      if (start > 0) ffArgs.push('-ss', String(start));
      ffArgs.push('-i', path.resolve(args.audio), '-map', '0:v:0', '-map', '1:a:0', '-shortest', '-c:a', 'aac', '-b:a', '160k');
    }
    ffArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium', '-movflags', '+faststart', '-frames:v', String(total), output);
    encoder = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffErrors = '';
    encoder.stderr.on('data', chunk => { ffErrors += String(chunk); });
    encoder.on('error', error => { ffErrors += String(error); });
    for (let i = 0; i < total; i++) {
      const t = start + i / fps;
      const png = await film.frame(t, scale);
      if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
      if (i === 0 || (i + 1) % Math.max(1, Math.floor(fps * 2)) === 0 || i === total - 1) {
        console.log(`Encoded input frame ${i + 1}/${total} at t=${t.toFixed(3)}s`);
      }
    }
    encoder.stdin.end();
    const [code] = await once(encoder, 'close');
    if (code !== 0) throw new Error(`FFmpeg exited ${code}: ${ffErrors}`);
    if (film.errors.length) throw new Error('Browser reported errors: ' + film.errors.join('; '));
    const stat = await fs.stat(output);
    console.log(`Wrote ${output} (${stat.size} bytes, ${total} frames, ${fps} fps)`);
  } finally {
    if (encoder && encoder.exitCode === null) encoder.kill('SIGTERM');
    await film.close();
  }
}
main().catch(err => { console.error('Export failed:', err.message); process.exitCode = 1; });
