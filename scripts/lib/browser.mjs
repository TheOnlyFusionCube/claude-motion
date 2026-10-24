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
  const info = await page.evaluate(() => ({ width: __film.width, height: __film.height, fps: __film.fps, duration: __film.duration, chapters: __film.chapters, errors: __film.errors, title: __film.title, motionBlur: __film.motionBlur }));
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

// Motion blur. A film opts in with `motionBlur: { samples: 8, shutter: 0.5, fast: [[from, to, samples], …] }`.
// shutter = share of the frame interval the "camera" is open (0.5 = 180°). Each output frame averages
// sub-frames centred on t; `fast` spans (whip pans, smash moves) take more samples so the smear is smooth, not ghosted.
// `opt` is a CLI value: undefined → the film's setting, false/'off' → none, a number → that many samples everywhere.
export function blurSetting(info, opt) {
  if (opt === false || opt === 'off' || opt === '0' || opt === 0) return null;
  const mb = info.motionBlur || {};
  const forced = opt != null && opt !== true ? +opt : null;
  const samples = forced || mb.samples || (opt === true ? 8 : 0);
  if (!(samples > 1)) return null;
  return { samples: Math.round(samples), shutter: Math.min(1, Math.max(0.05, +(mb.shutter ?? 0.5))), fast: forced ? [] : (mb.fast || []) };
}
export function blurTimes(t, fps, mb, duration = Infinity) {
  if (!mb) return [t];
  const f = mb.fast.find(([a, b]) => t >= a && t < b), n = Math.max(2, Math.round(f ? f[2] : mb.samples));
  return Array.from({ length: n }, (_, k) => Math.min(Math.max(0, t + (k / (n - 1) - 0.5) * mb.shutter / fps), duration - 1e-4));
}
// Average sub-frames in a helper page (float accumulation, no banding). Returns a PNG or JPEG buffer.
export async function makeBlender(browser) {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.setContent('<canvas id=c></canvas>');
  const blend = async (bufs, type = 'png', quality = 92) => Buffer.from(await page.evaluate(async ({ list, type, quality }) => {
    const ims = await Promise.all(list.map(async b64 => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); return im; }));
    const c = document.getElementById('c'); c.width = ims[0].naturalWidth; c.height = ims[0].naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); let acc = null;
    for (const im of ims) { x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; if (!acc) acc = new Float32Array(d.length); for (let i = 0; i < d.length; i++) acc[i] += d[i]; }
    const out = x.createImageData(c.width, c.height), n = ims.length; for (let i = 0; i < acc.length; i++) out.data[i] = acc[i] / n;
    x.putImageData(out, 0, 0); return c.toDataURL(type === 'jpeg' ? 'image/jpeg' : 'image/png', quality / 100).split(',')[1];
  }, { list: bufs.map(b => b.toString('base64')), type, quality }), 'base64');
  // Share of pixels that differ visibly between two frames (to skip blur where nothing moves).
  blend.moved = async (a, b) => page.evaluate(async ([a, b]) => {
    const load = async b64 => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); return im; };
    const [A, B] = await Promise.all([load(a), load(b)]); const w = 480, h = Math.round(480 * A.naturalHeight / A.naturalWidth);
    const c = document.getElementById('c'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(A, 0, 0, w, h); const da = x.getImageData(0, 0, w, h).data; x.drawImage(B, 0, 0, w, h); const db = x.getImageData(0, 0, w, h).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 18) n++;
    return n / (w * h);
  }, [a.toString('base64'), b.toString('base64')]);
  return blend;
}
// A frame exactly as the export shows it: a plain snap, or the average of the motion-blur sub-frames.
export async function snapFrame(page, t, info, mb, blender, type = 'png', quality) {
  if (!mb || !blender) return snap(page, t, type, quality);
  const ts = blurTimes(t, info.fps, mb, info.duration);
  // Shutter open and close look the same: nothing is moving fast, so no blur to add.
  const first = await snap(page, ts[0], 'jpeg', 95), last = await snap(page, ts[ts.length - 1], 'jpeg', 95);
  if (await blender.moved(first, last) < 0.0005) return snap(page, t, type, quality);
  const bufs = [first]; for (const s of ts.slice(1, -1)) bufs.push(await snap(page, s, 'jpeg', 95)); bufs.push(last);
  return blender(bufs, type, quality ?? 94);
}

export function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return 'ffmpeg'; } catch {}
  for (const p of ['/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux']) if (fs.existsSync(p)) return p;
  throw new Error('FFmpeg not found. Install it (brew install ffmpeg / apt install ffmpeg) or set FFMPEG_PATH.');
}
