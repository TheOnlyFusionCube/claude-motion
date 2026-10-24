#!/usr/bin/env node
// Check everything claude-motion needs, and print the exact fix for anything missing.
//   node scripts/doctor.mjs            (add --json for machine-readable output)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SKILL_DIR, launch, ffmpegPath } from './lib/browser.mjs';

const json = process.argv.includes('--json');
const results = [];
const add = (name, ok, detail, fix) => results.push({ name, ok, detail, fix });
const plat = process.platform; // darwin | linux | win32

// Node
const major = +process.versions.node.split('.')[0];
add('Node.js ≥ 22', major >= 22, `v${process.versions.node}`, 'Install Node 22 or newer: https://nodejs.org (or `nvm install 22`).');

// Skill files
const need = ['kit/motion-kit.js', 'kit/player.html', 'kit/vendor/three.module.min.js', 'kit/styles/index.js'];
const missing = need.filter(f => !fs.existsSync(path.join(SKILL_DIR, f)));
add('Skill files', !missing.length, missing.length ? `missing: ${missing.join(', ')}` : SKILL_DIR, 'Re-copy the whole claude-motion folder (kit/ is required).');

// Playwright + Chromium + WebGL
let browser, gl = null, pwErr = null;
try {
  browser = await launch();
  const page = await browser.newPage();
  gl = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return null; const ext = g.getExtension('WEBGL_debug_renderer_info'); return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'available'; });
  add('Playwright + Chromium', true, browser.version(), '');
} catch (e) {
  pwErr = e.message.split('\n')[0];
  add('Playwright + Chromium', false, pwErr,
    /Playwright not found/.test(pwErr) ? 'In the skill folder (or your project): `npm i -D playwright && npx playwright install chromium`.'
      : 'Install the browser: `npx playwright install chromium` (Linux may also need `npx playwright install-deps chromium`), or point CHROMIUM_PATH at a Chrome/Chromium binary.');
} finally { if (browser) await browser.close(); }
if (!pwErr) {
  const software = gl && /swiftshader|llvmpipe|software/i.test(gl);
  add('WebGL (3D scenes)', !!gl, gl ? `${gl}${software ? ' — software rendering: 3D exports run ~1–2 s/frame' : ''}` : 'unavailable', 'WebGL is off in this browser. 2D films still work; for 3D try MOTION_GL=software, or run headed Chrome with a GPU.');
}

// FFmpeg
try { const ff = ffmpegPath(); const v = execSync(`"${ff}" -version`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')[0]; add('FFmpeg (MP4 export)', true, v.replace(/ Copyright.*/, ''), ''); }
catch { add('FFmpeg (MP4 export)', false, 'not found', plat === 'darwin' ? '`brew install ffmpeg`' : plat === 'win32' ? '`winget install ffmpeg` (or choco install ffmpeg), then reopen the terminal.' : '`sudo apt install ffmpeg` (or your distro\'s package), or set FFMPEG_PATH.'); }

// Disk space in the temp dir (exports stage frames there)
try { const st = fs.statfsSync(os.tmpdir()); const gb = (st.bavail * st.bsize) / 1e9; add('Temp disk space', gb > 1, `${gb.toFixed(1)} GB free in ${os.tmpdir()}`, 'Free some space: a 60 s 1080p export stages ~0.5 GB of frames.'); } catch {}

const ok = results.every(r => r.ok);
if (json) { console.log(JSON.stringify({ ok, results }, null, 2)); process.exit(ok ? 0 : 1); }
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(24)} ${r.detail}${!r.ok && r.fix ? `\n    fix: ${r.fix}` : ''}`);
console.log(ok ? '\nReady. Try: node scripts/preview.mjs examples/launch' : '\nFix the ✗ items above, then run this again.');
process.exit(ok ? 0 : 1);
