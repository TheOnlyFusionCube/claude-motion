#!/usr/bin/env node
/** Make an original, event-timed wordless WAV from the standalone film's SCORE export. No deps. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseOptions } from './browser.mjs';

const HELP = 'Usage: node render-audio.mjs <film-directory> [--out film/score.wav] [--rate 48000] [--levels yes]';
const PITCH_NAMES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

export function frequency(pitch) {
  let midi = pitch;
  if (typeof pitch === 'string') {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(pitch);
    if (!m || !(m[1] in PITCH_NAMES)) throw new Error(`Invalid pitch ${pitch}`);
    midi = (Number(m[2]) + 1) * 12 + PITCH_NAMES[m[1]];
  }
  if (!Number.isFinite(midi) || midi < 0 || midi > 127) throw new Error(`MIDI pitch 0-127 required: ${pitch}`);
  return 440 * 2 ** ((midi - 69) / 12);
}

function noise(i, seed) {
  // Deterministic per absolute sample index; supports random-access audio synthesis.
  let x = (Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(seed + 1, 0x85ebca6b)) | 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x / 2147483648);
}

function toneAt(kind, phase, s, dur) {
  const attack = Math.min(1, s / 0.015);
  const tail = Math.min(1, Math.max(0, (dur - s) / 0.16));
  const dec = k => Math.exp(-k * s);
  const sin = n => Math.sin(2 * Math.PI * phase * n);
  switch (kind) {
    case 'pad': return sin(1) * attack * tail * (0.82 + 0.18 * Math.sin(2 * Math.PI * s / 2.8));
    case 'ep': return (0.81 * sin(1) + 0.12 * sin(2) + 0.07 * sin(3)) * attack * tail * dec(0.42);
    case 'bass': return (0.91 * sin(1) + 0.09 * sin(2)) * attack * tail * dec(0.5);
    case 'pluck': return (0.82 * sin(1) + 0.13 * sin(2) + 0.05 * sin(4)) * Math.min(1, s / 0.004) * dec(4.6);
    case 'mallet': return (0.9 * sin(1) + 0.07 * sin(3.01) + 0.03 * sin(4.1)) * Math.min(1, s / 0.003) * dec(4.0);
    default: throw new Error(`Unknown instrument ${kind}`);
  }
}

function fxAt(name, s, dur, i, seed) {
  const p = Math.min(1, Math.max(0, s / Math.max(0.001, dur)));
  const n = noise(i, seed);
  switch (name) {
    case 'click': return (0.68 * n + 0.32 * Math.sin(2 * Math.PI * 900 * s)) * Math.exp(-58 * s);
    case 'pop': return Math.sin(2 * Math.PI * (240 - 85 * p) * s) * Math.exp(-25 * s);
    case 'tick': return (n * 0.8 + Math.sin(2 * Math.PI * 1700 * s) * 0.2) * Math.exp(-95 * s);
    case 'whoosh': return n * (Math.sin(Math.PI * p) ** 1.6) * 0.75;
    case 'ding': return (Math.sin(2 * Math.PI * 950 * s) + 0.3 * Math.sin(2 * Math.PI * 1425 * s)) * Math.exp(-5 * s);
    default: throw new Error(`Unknown sound effect ${name}`);
  }
}

export function renderScore({duration, events}, sampleRate = 48000) {
  if (!(duration > 0 && duration <= 300)) throw new Error('duration must be 0-300 seconds');
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new Error('sample rate 8000-96000');
  if (!Array.isArray(events)) throw new Error('SCORE.events must be an array');
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  for (const [index, e] of events.entries()) {
    if (!e || !['note', 'fx'].includes(e.kind)) throw new Error(`Event ${index}: expected kind note|fx`);
    const { t, dur, vel = .1 } = e;
    if (!(Number.isFinite(t) && Number.isFinite(dur) && Number.isFinite(vel) && t >= 0 && dur > 0 && vel >= 0 && vel <= 1)) throw new Error(`Event ${index}: invalid t, dur or vel`);
    if (t >= duration) continue;
    const begin = Math.max(0, Math.ceil(t * sampleRate));
    const end = Math.min(samples.length, Math.floor((t + dur) * sampleRate));
    const hz = e.kind === 'note' ? frequency(e.pitch) : null;
    for (let i = begin; i < end; i++) {
      const s = i / sampleRate - t;
      const value = e.kind === 'note' ? toneAt(e.instrument || 'mallet', hz * s, s, dur) : fxAt(e.name, s, dur, i, index);
      samples[i] += vel * value;
    }
  }
  // Quiet bass/keys up front; one modest master limiter to avoid clipping in final WAV.
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const remain = duration - i / sampleRate;
    if (remain < .8) samples[i] *= Math.max(0, remain / .8);
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const gain = 0.64 * Math.min(1, 0.96 / Math.max(peak, 1e-9));
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

export function encodeWav(samples, sampleRate) {
  const buffer = Buffer.allocUnsafe(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s < 0 ? s * 32768 : s * 32767), 44 + i * 2);
  }
  return buffer;
}

export function rmsLevels(samples, rate) {
  const result = [];
  for (let start = 0; start < samples.length; start += rate) {
    let sum = 0, count = 0;
    for (let i = start; i < Math.min(samples.length, start + rate); i++) { sum += samples[i] ** 2; count++; }
    result.push(Math.max(-100, 20 * Math.log10(Math.sqrt(sum / count) || 1e-6)));
  }
  return result;
}

async function main() {
  if (process.argv.some(a => a === '--help' || a === '-h')) { console.log(HELP); return; }
  const args = parseOptions(process.argv.slice(2), ['--out', '--rate', '--levels']);
  if (args._.length !== 1) throw new Error(HELP);
  const filmDir = path.resolve(args._[0]);
  const source = path.join(filmDir, 'src/scenes.mjs');
  const {FILM, SCORE} = await import(pathToFileURL(source).href);
  if (!SCORE || !Array.isArray(SCORE.events)) throw new Error('Film has no SCORE.events; add it to src/scenes.mjs to produce a WAV.');
  const rate = Number(args.rate ?? 48000);
  const samples = renderScore({duration: FILM.duration, events: SCORE.events}, rate);
  const output = path.resolve(args.out ?? path.join(filmDir, 'score.wav'));
  await fs.mkdir(path.dirname(output), {recursive: true});
  const wav = encodeWav(samples, rate);
  await fs.writeFile(output, wav);
  console.log(`Wrote original event-based score to ${output} (${rate} Hz, ${FILM.duration} s, ${wav.length} bytes).`);
  if (args.levels === 'yes') console.log(rmsLevels(samples, rate).map((v, i) => `  ${String(i).padStart(2, '0')}s ${v.toFixed(1)} dBFS`).join('\n'));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
