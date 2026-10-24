#!/usr/bin/env node
// Scaffold a new film folder from the starter:  node scripts/new.mjs <dir> [--title "Name"] [--portrait | --square]
import fs from 'node:fs';
import path from 'node:path';
import { args, SKILL_DIR } from './lib/browser.mjs';
const a = args();
const dir = a._[0];
if (!dir) { console.log('usage: node scripts/new.mjs <dir> [--title "Name"] [--portrait | --square]'); process.exit(1); }
const out = path.resolve(dir);
if (fs.existsSync(path.join(out, 'film.js'))) { console.error(`${out}/film.js already exists — not overwriting.`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const src = path.join(SKILL_DIR, 'templates', 'starter');
for (const f of fs.readdirSync(src)) {
  let s = fs.readFileSync(path.join(src, f), 'utf8');
  if (f === 'film.js') {
    if (a.title) s = s.replace("title: 'Untitled film'", `title: ${JSON.stringify(a.title)}`);
    if (a.portrait) s = s.replace('width: 1920, height: 1080', 'width: 1080, height: 1920');
    if (a.square) s = s.replace('width: 1920, height: 1080', 'width: 1080, height: 1080');
  }
  fs.writeFileSync(path.join(out, f), s);
}
console.log(`New film in ${out}\n  preview: node ${path.relative(process.cwd(), path.join(SKILL_DIR, 'scripts/preview.mjs'))} ${dir}`);
