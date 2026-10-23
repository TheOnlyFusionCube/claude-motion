#!/usr/bin/env node
/**
 * Motion-showreel export audit. Node >=22 + FFmpeg/FFprobe; no npm dependencies.
 * This measures stagnation and output sanity, NOT artistic merit.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const SAMPLE_W = 160;
const SAMPLE_H = 90;
const PIXELS = SAMPLE_W * SAMPLE_H;
const DIFF_THRESHOLD = 18; // luma counts on a 0-255 scale; ignores encoder shimmer
const MEAN_QUIET_LIMIT = 0.18; // sensitivity to subtle whole-frame drift

function exec(tool, args, maxBuffer = 24 * 1024 * 1024) {
  const result = spawnSync(tool, args, { encoding: 'buffer', maxBuffer, timeout: 180000 });
  if (result.error) throw new Error(`${tool}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${tool} failed (${result.status}): ${String(result.stderr || '').slice(-1100)}`);
  return result.stdout;
}

function usage() {
  return 'Usage: node scripts/audit-video.mjs <film.mp4> [--mode showreel|product|walkthrough|ambient|data-story|launch] [--require-audio] [--continuous] [--strict] [--json] [--sheet sheet.png]\nRequires ffmpeg and ffprobe. A passing audit DOES NOT replace visual review.';
}

export function areaDelta(a, b, threshold = DIFF_THRESHOLD) {
  if (a.length !== b.length || a.length === 0) throw new Error('Frames must have equal, nonzero pixel counts.');
  let changed = 0;
  let lumaDelta = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = Math.abs(a[i] - b[i]);
    if (delta > threshold) changed++;
    lumaDelta += delta;
  }
  return { strongChangeFraction: changed / a.length, meanLumaDelta: lumaDelta / a.length };
}

/** Heuristic for a featureless frame, e.g. a completely blank transition. */
export function lumaStddev(frame) {
  if (!frame.length) throw new Error('Frame is empty.');
  let sum = 0, squared = 0;
  for (const c of frame) { sum += c; squared += c * c; }
  const mean = sum / frame.length;
  return Math.sqrt(Math.max(0, squared / frame.length - mean * mean));
}

/** Detect held imagery throughout the *entire* movie, including title/end cards.
 * Strong-pixel area AND mean luma change distinguish real quiet movement from
 * encoder shimmer. For very subtle title creep, review the flagged seconds
 * in playback; a numeric pixel flag is never final artistic judgment.
 */
export function stagnantRuns(intervals, { duration, mode = 'showreel', continuous = false, minSeconds = 3, cutoff = .008, meanCutoff = MEAN_QUIET_LIMIT } = {}) {
  if (mode === 'ambient' && !continuous) return [];
  const runs = [];
  let open = null;
  for (const row of intervals) {
    const quiet = row.strongChangeFraction < cutoff && (row.meanLumaDelta ?? 0) < meanCutoff;
    if (quiet) {
      if (open === null) open = row.start;
    } else if (open !== null) {
      if (row.start - open >= minSeconds - 1e-4) runs.push({ start: open, end: row.start, seconds: row.start - open });
      open = null;
    }
  }
  if (open !== null && intervals.length) {
    const end = Math.min(intervals.at(-1).end, duration);
    if (end - open >= minSeconds - 1e-4) runs.push({ start: open, end, seconds: end - open });
  }
  return runs;
}

export function auditMetrics({ width, height, duration, hasAudio, intervals, nearBlankFrames = [], mode = 'showreel', requireAudio = false, continuous = false }) {
  const problems = [];
  const warnings = [];
  const shortEdge = Math.min(width, height);
  if (shortEdge < 720) problems.push(`Low export resolution: ${width}×${height} (minimum 720px short edge for normal delivery; target 1080p).`);
  else if (shortEdge < 1080) warnings.push(`Resolution ${width}×${height}: usable HD, but review at 1920×1080 if the brief expects a high-end showreel.`);
  if (!hasAudio && requireAudio) problems.push('An audio track is required by this delivery brief (narration/score missing).');
  else if (!hasAudio && mode !== 'ambient') warnings.push('No audio track: confirm deliberate silence or add an original, synced score.');
  const runs = stagnantRuns(intervals, { duration, mode, continuous });
  if (mode !== 'ambient' && nearBlankFrames.length) problems.push(`Near-blank frame(s) detected around ${nearBlankFrames.map(r => `${r.time.toFixed(1)}s`).join(', ')}; check transitions for unintended empty screens.`);
  if (runs.length) problems.push(`Extended nearly unchanged imagery (including title/end holds) at ${runs.map(r => `${r.start}–${r.end}s`).join(', ')}; the original Motion brief requires quiet movement even during reading holds.`);
  const usable = intervals;
  const lowActivityFraction = usable.length ? usable.filter(r => r.strongChangeFraction < .008 && (r.meanLumaDelta ?? 0) < MEAN_QUIET_LIMIT).length / usable.length : null;
  if (lowActivityFraction !== null && lowActivityFraction > .65 && (continuous || mode === 'showreel')) {
    problems.push(`${Math.round(lowActivityFraction * 100)}% of sampled half-second intervals have no discernible movement; one card changing to another is not continuous film.`);
  } else if (lowActivityFraction !== null && lowActivityFraction > .5 && mode !== 'ambient') {
    warnings.push(`${Math.round(lowActivityFraction * 100)}% of sampled intervals appear quiet; visually check title, held UI, and end-card camera/shape drift.`);
  }
  // Still-image diffs cannot see visual hierarchy, text legibility, motion purpose,
  // click alignment, actual UI fidelity, original music, or meaningful narration.
  warnings.push('Manual review required: verify hero action, changing focal scale, UI causality, type size, pacing, crop, branding, and sound sync.');
  return { pass: problems.length === 0, problems, warnings, stagnantRuns: runs, lowActivityFraction };
}

function parseArguments(argv) {
  const positional = [];
  const out = { mode: 'showreel', strict: false, json: false, sheet: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--strict', '--json', '--require-audio', '--continuous'].includes(arg)) out[arg.slice(2)] = true;
    else if (['--mode', '--sheet'].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value after ${arg}`);
      out[arg.slice(2)] = argv[++i];
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1 || !['showreel', 'product', 'walkthrough', 'ambient', 'data-story', 'launch'].includes(out.mode)) throw new Error(usage());
  out.input = positional[0];
  return out;
}

function durationMeta(file) {
  const json = JSON.parse(exec('ffprobe', ['-hide_banner', '-loglevel', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', file]).toString('utf8'));
  const video = json.streams.find(s => s.codec_type === 'video');
  if (!video) throw new Error('Missing video stream.');
  const duration = Number(json.format.duration);
  if (!(duration > 0) || duration > 3600) throw new Error('Invalid duration or film > 1 hour.');
  return { width: video.width, height: video.height, duration, hasAudio: json.streams.some(s => s.codec_type === 'audio') };
}

/** One 2fps FFmpeg decode supplies both the stillness test and blank-frame QA. */
function sampledVideo(file, seconds) {
  const sampleRate = 2;
  const raw = exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file,
    '-vf', `fps=${sampleRate},scale=${SAMPLE_W}:${SAMPLE_H}:flags=bilinear,format=gray`,
    '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']);
  const count = Math.floor(raw.length / PIXELS);
  if (count < 2) throw new Error('Could not decode enough video frames.');
  const intervals = [], nearBlankFrames = [];
  for (let i = 0; i < count; i++) {
    const after = raw.subarray(i * PIXELS, (i + 1) * PIXELS);
    const stdev = lumaStddev(after);
    if (stdev < 4 && i/sampleRate < seconds) nearBlankFrames.push({time:i/sampleRate,lumaStddev:+stdev.toFixed(2)});
    if (i > 0) {
      const before = raw.subarray((i-1)*PIXELS, i*PIXELS);
      intervals.push({start:(i-1)/sampleRate,end:i/sampleRate,...areaDelta(before, after)});
    }
  }
  return {intervals,nearBlankFrames};
}

function contactSheet(file, out, duration) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', file,
    '-vf', `fps=${(12 / duration).toFixed(5)},scale=480:270:flags=lanczos,tile=4x3:padding=10:margin=10:color=0x16202c`,
    '-frames:v', '1', out], 3 * 1024 * 1024);
}

export function runCli(argv = process.argv.slice(2)) {
  const opts = parseArguments(argv);
  const meta = durationMeta(opts.input);
  const {intervals, nearBlankFrames} = sampledVideo(opts.input, meta.duration);
  const evaluation = auditMetrics({ ...meta, intervals, nearBlankFrames, mode: opts.mode, requireAudio: opts['require-audio'], continuous: opts.continuous });
  if (opts.sheet) contactSheet(opts.input, opts.sheet, meta.duration);
  const report = { input: opts.input, mode: opts.mode, ...meta, ...evaluation,
    nearBlankFrames, sampleSeconds: intervals.length / 2, samples: intervals.map(r => ({ start: r.start, end: r.end, strongChangePercent: +(r.strongChangeFraction * 100).toFixed(2) })) };
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${evaluation.pass ? 'PASS' : 'NEEDS REVISION'}: ${opts.input} (${meta.width}×${meta.height}, ${meta.duration.toFixed(1)}s, audio ${meta.hasAudio ? 'yes' : 'no'})`);
    for (const x of evaluation.problems) console.log('ISSUE: ' + x);
    for (const x of evaluation.warnings) console.log('CHECK: ' + x);
    if (opts.sheet) console.log('Contact sheet: ' + opts.sheet);
  }
  if (opts.strict && !evaluation.pass) process.exitCode = 1;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { runCli(); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
