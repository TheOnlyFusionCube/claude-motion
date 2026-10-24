#!/usr/bin/env node
// Serve the player for a film folder:  node scripts/preview.mjs <film-dir> [--port 5173]
// Open the printed URL. Space plays, ←/→ step a frame (shift: 1s), L loops, M mutes.
// Sound plays if <film-dir>/score.wav exists (node scripts/score.mjs <film-dir>).
import path from 'node:path';
import fs from 'node:fs';
import { args, serve } from './lib/browser.mjs';
const a = args();
const dir = path.resolve(a._[0] || '.');
if (!fs.existsSync(path.join(dir, 'film.js'))) { console.error(`No film.js in ${dir}`); process.exit(1); }
const { url } = await serve(dir, +(a.port || 5173));
console.log(`Playing ${dir}\n→ ${url}kit/player.html?film=/film/\n(Ctrl+C to stop)`);
