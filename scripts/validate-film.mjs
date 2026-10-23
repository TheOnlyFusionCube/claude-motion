#!/usr/bin/env node
/**
 * Check a portable scene manifest against the relevant Anthropic Motion scene rules.
 * Uses Node built-ins only. No private player, network, or package installation.
 * See references/upstream/rough-cut.md; this is not the proprietary player validator.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function contrastRatio(foreground, background) {
  const toLuminance = hex => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Invalid opaque hex color: ${String(hex)}`);
    const c = [1,3,5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r,g,b] = c.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const [a,b] = [toLuminance(foreground), toLuminance(background)].sort((a,b) => b-a);
  return (a + .05)/(b + .05);
}

export function validateFilm(film, {strictContrast = true} = {}) {
  const errors = [];
  const err = s => errors.push(s);
  if (!film || typeof film !== 'object' || Array.isArray(film)) return {ok: false, errors: ['Manifest must be a JSON object.'], duration: 0, starts: {}};
  if (film.v !== 1) err('v must be 1.');
  if (!['rough','final'].includes(film.stage)) err('stage must be "rough" or "final".');
  for (const key of ['width','height']) if (!Number.isInteger(film[key]) || film[key] < 1 || film[key] > 4096) err(`${key} must be an integer from 1 to 4096.`);
  if (![24,30,60].includes(film.fps)) err('fps must be 24, 30, or 60.');
  if (film.background !== 'transparent' && !/^#[0-9a-f]{6}$/i.test(film.background || '')) err('background must be an opaque #RRGGBB color or "transparent".');
  if (!Array.isArray(film.scenes) || film.scenes.length < 1 || film.scenes.length > 24) err('scenes must contain 1 to 24 entries.');
  const starts = {}, ids = new Set();
  let duration = 0;
  if (Array.isArray(film.scenes)) for (const [index,s] of film.scenes.entries()) {
    const label = `scene ${index + 1}`;
    if (!s || typeof s !== 'object') { err(`${label} must be an object.`); continue; }
    if (typeof s.id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(s.id)) err(`${label} id must match [a-z][a-z0-9-]{0,31}.`);
    else if (ids.has(s.id)) err(`${label}: duplicate id ${s.id}.`);
    else { ids.add(s.id); starts[s.id] = duration; }
    if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 48 || s.name.trim().split(/\s+/).length > 3) err(`${label}: name must have 1–3 words and max 48 characters.`);
    if (typeof s.desc !== 'string' || !s.desc.trim()) err(`${label}: desc must contain the action in plain language.`);
    if (typeof s.dur !== 'number' || !Number.isFinite(s.dur) || s.dur < 1) err(`${label}: dur must be a finite number >= 1 second.`);
    else duration += s.dur;
  }
  if (duration > 300) err('Duration exceeds the original player’s 300 s limit (adapt this if your renderer supports more).');
  if (film.stage === 'final' && Array.isArray(film.scenes) && film.scenes.length && film.scenes.at(-1)?.dur < 3) err('Final card should hold at least 3 seconds; change only when the user asks.');
  if (film.palettes !== undefined) {
    if (!Array.isArray(film.palettes) || film.palettes.length < 1 || film.palettes.length > 4) err('palettes should contain 1–4 color-role arrays.');
    else for (const [i,p] of film.palettes.entries()) {
      if (!Array.isArray(p) || p.length !== 4 || !p.every(x=>typeof x==='string' && /^#[0-9a-f]{6}$/i.test(x))) { err(`palette ${i+1} must contain four #RRGGBB values in [ground,main,second,accent] order.`); continue; }
      if (strictContrast && contrastRatio(p[2], p[0]) < 4.5) err(`palette ${i+1} second (ink) color must have >=4.5:1 contrast on ground; got ${contrastRatio(p[2],p[0]).toFixed(2)}:1.`);
    }
  }
  if (film.theirs !== undefined && (!Number.isInteger(film.theirs) || film.theirs < 0 || film.theirs > (film.palettes?.length ?? 0))) err('theirs must count the user-supplied palettes at the start of palettes.');
  return {ok: errors.length === 0, errors, duration, starts};
}

async function main(args) {
  if (args.length !== 1 || ['--help','-h'].includes(args[0])) {
    console.log('Usage: node scripts/validate-film.mjs /path/to/film/scenes.json');
    process.exitCode = args.length === 0 ? 2 : 0;
    return;
  }
  const file = path.resolve(args[0]);
  let f;
  try { f = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { console.error(`Could not read or parse ${file}: ${e.message}`); process.exitCode=1; return; }
  const verdict = validateFilm(f);
  if (!verdict.ok) { verdict.errors.forEach(x => console.error(`INVALID: ${x}`)); process.exitCode = 1; return; }
  console.log(`VALID: ${f.scenes.length} scenes, ${verdict.duration.toFixed(2)} s, ${f.width}x${f.height} @ ${f.fps} fps. Stage: ${f.stage}.`);
  console.log(`Starts: ${Object.entries(verdict.starts).map(([id,t])=>`${id}=${t.toFixed(2)}`).join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode=1; });
