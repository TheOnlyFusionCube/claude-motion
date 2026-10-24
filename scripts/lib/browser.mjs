// Shared: find Playwright + Chromium, serve kit/ and the film folder, open the player.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT_DIR = path.join(SKILL_DIR, 'kit');

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const k = a.slice(2);
    if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[k] = argv[++i]; else out[k] = true;
  }
  return out;
}

async function loadPlaywright() {
  const tries = [() => import('playwright'), () => import('playwright-core')];
  for (const base of [process.cwd(), SKILL_DIR]) {
    const req = createRequire(path.join(base, 'noop.js'));
    tries.push(() => req('playwright'), () => req('playwright-core'));
  }
  try { const g = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); const req = createRequire(path.join(g, 'noop.js')); tries.push(() => req('playwright'), () => req('playwright-core')); } catch {}
  for (const f of tries) { try { const m = await f(); const pw = m.chromium ? m : m.default; if (pw && pw.chromium) return pw; } catch {} }
  throw new Error('Playwright not found. Install it once: `npm i -D playwright && npx playwright install chromium` (or set CHROMIUM_PATH with playwright-core).');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.txt': 'text/plain' };

// Map /kit/* → skill kit, /film/* → the film folder. Returns a file path or null.
export function resolveUrl(pathname, filmDir) {
  const p = decodeURIComponent(pathname);
  let root, rel;
  if (p.startsWith('/kit/')) { root = KIT_DIR; rel = p.slice(5); }
  else if (p.startsWith('/film/')) { root = filmDir; rel = p.slice(6); }
  else return null;
  const file = path.resolve(root, rel || 'index.html');
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

export function serve(filmDir, port = 0) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/') { res.writeHead(302, { Location: '/kit/player.html?film=/film/' }); return res.end(); }
    const file = resolveUrl(u.pathname, filmDir);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  // Fall back to a free port if the requested one is taken.
  return new Promise((resolve, reject) => {
    const go = p => { server.once('error', e => (e.code === 'EADDRINUSE' && p !== 0 ? go(0) : reject(e))); server.listen(p, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })); };
    go(port);
  });
}

export async function launch() {
  const pw = await loadPlaywright();
  // WebGL: use the GPU when there is one; fall back to SwiftShader (software) when there isn't.
  // MOTION_GL=software forces SwiftShader (identical pixels across machines, slower 3D).
  const gl = process.env.MOTION_GL === 'software' ? ['--use-angle=swiftshader'] : [];
  const opts = { args: [...gl, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars', '--mute-audio'] };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  try { return await pw.chromium.launch(opts); }
  catch (e) {
    for (const p of ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) { try { return await pw.chromium.launch({ ...opts, executablePath: p }); } catch {} }
    }
    throw e;
  }
}

// Opens the film in capture mode on a fresh page; routes files directly (no server, no network).
export async function openFilm(browser, filmDir, { scale = 1, logs = [] } = {}) {
  filmDir = path.resolve(filmDir);
  if (!fs.existsSync(path.join(filmDir, 'film.js'))) throw new Error(`No film.js in ${filmDir}`);
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.route('http://motion.local/**', async route => {
    const u = new URL(route.request().url());
    const file = resolveUrl(u.pathname, filmDir);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  });
  await page.route(/^(?!http:\/\/motion\.local\/|data:|blob:|about:)/, route => { logs.push(`blocked network request: ${route.request().url()}`); route.abort(); });
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`));
  await page.goto('http://motion.local/kit/player.html?film=/film/&capture=1');
  const ok = await page.evaluate(() => window.__film.ready);
  const info = await page.evaluate(() => ({ width: __film.width, height: __film.height, fps: __film.fps, duration: __film.duration, chapters: __film.chapters, errors: __film.errors, title: __film.title }));
  if (!ok) throw new Error('Film failed to load:\n' + info.errors.join('\n') + (logs.length ? '\n' + logs.join('\n') : ''));
  await page.setViewportSize({ width: info.width, height: info.height });
  return { page, ctx, info };
}

// Accepts 0, 2.5, 2.5s, 1:02.5, 50%, end, c2 (chapter 2), c2+1.0
export function parseTimes(spec, info) {
  return String(spec).split(',').map(s => s.trim()).filter(Boolean).map(s => {
    let m;
    if (s === 'end') return Math.max(0, info.duration - 1 / info.fps);
    if ((m = /^(\d+(?:\.\d+)?)%$/.exec(s))) return Math.min(info.duration - 1 / info.fps, info.duration * m[1] / 100);
    if ((m = /^c(\d+)([+-]\d+(?:\.\d+)?)?$/.exec(s))) { const c = info.chapters[+m[1] - 1]; if (!c) throw new Error('no chapter ' + m[1]); return c.t + (m[2] ? +m[2] : 0); }
    if ((m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(s))) return +m[1] * 60 + +m[2];
    return parseFloat(s);
  });
}

export async function snap(page, t, type = 'png', quality) {
  await page.evaluate(tt => __film.seekExact(tt), t);
  return page.screenshot({ type, quality, animations: 'disabled', caret: 'initial' });
}

export function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return 'ffmpeg'; } catch {}
  for (const p of ['/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux']) if (fs.existsSync(p)) return p;
  throw new Error('FFmpeg not found. Install it (brew install ffmpeg / apt install ffmpeg) or set FFMPEG_PATH.');
}
