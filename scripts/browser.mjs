/** Local-only, dependency-free Chromium DevTools driver for seekable film pages. */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export function parseOptions(argv, allowed) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) { out._.push(key); continue; }
    if (!allowed.includes(key)) throw new Error(`Unknown option: ${key}`);
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${key}`);
    out[key.slice(2)] = argv[++i];
  }
  return out;
}

function mime(filename) {
  return ({
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2',
    '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav',
  })[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

async function serve(root) {
  const rootReal = await fs.realpath(root);
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
      const url = new URL(req.url, 'http://127.0.0.1');
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const p = path.resolve(rootReal, relative);
      if (p !== rootReal && !p.startsWith(rootReal + path.sep)) { res.writeHead(403); res.end(); return; }
      let target = p;
      let stat = await fs.stat(target);
      if (stat.isDirectory()) { target = path.join(target, 'index.html'); stat = await fs.stat(target); }
      const realFile = await fs.realpath(target);
      if (!realFile.startsWith(rootReal + path.sep) || !stat.isFile()) { res.writeHead(403); res.end(); return; }
      res.writeHead(200, { 'Content-Type': mime(target), 'Cache-Control': 'no-store' });
      fsSync.createReadStream(realFile).pipe(res);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const executable of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome']) {
    try { return execFileSync('which', [executable], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { /* Try next executable. */ }
  }
  throw new Error('Chromium/Chrome not found. Install it or set CHROMIUM_PATH to its executable.');
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.count = 1;
    this.pending = new Map();
    this.errors = [];
    socket.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const item = this.pending.get(msg.id);
        if (!item) return;
        this.pending.delete(msg.id);
        if (msg.error) item.reject(new Error(`${item.method}: ${msg.error.message}`));
        else item.resolve(msg.result || {});
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push(msg.params.args.map(a => a.value || a.description || '').join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params.exceptionDetails.text || 'Browser exception');
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.errors.push(msg.params.entry.text || 'Browser log error');
      }
    });
    socket.addEventListener('close', () => {
      for (const p of this.pending.values()) p.reject(new Error('Browser connection closed'));
      this.pending.clear();
    });
  }
  call(method, params = {}) {
    const id = this.count++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('Page evaluation failed: ' + (r.exceptionDetails.text || expression));
    return r.result?.value;
  }
  async png() {
    const r = await this.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    return Buffer.from(r.data, 'base64');
  }
  close() { this.socket.close(); }
}

async function startChrome() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-motion-'));
  const executable = findChromium();
  const args = [
    '--headless=new', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--window-size=1280,800', '--no-proxy-server',
    '--force-device-scale-factor=1', '--disable-extensions', 'about:blank',
  ];
  if (process.getuid?.() === 0) args.unshift('--no-sandbox');
  const child = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-5000); });
  const portFile = path.join(dir, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) break;
    try { port = Number((await fs.readFile(portFile, 'utf8')).split('\n')[0]); if (port) break; } catch { /* Starting */ }
    await delay(80);
  }
  if (!port) { child.kill('SIGKILL'); await fs.rm(dir, { recursive: true, force: true }); throw new Error('Chromium failed to start. ' + stderr); }
  let page;
  for (let i = 0; i < 75; i++) {
    try {
      const json = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      page = json.find(x => x.type === 'page' && x.webSocketDebuggerUrl);
      if (page) break;
    } catch { /* Starting */ }
    await delay(80);
  }
  if (!page) { child.kill('SIGKILL'); await fs.rm(dir, { recursive: true, force: true }); throw new Error('Chromium has no available page target.'); }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(socket);
  return { cdp, child, dir };
}

/** Start a local browser and return a time-seekable viewport capture driver. */
export async function openFilm(root) {
  const absolute = path.resolve(root);
  await fs.access(path.join(absolute, 'index.html'));
  const host = await serve(absolute);
  let chrome;
  try {
    chrome = await startChrome();
    const { cdp } = chrome;
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    await cdp.call('Log.enable');
    const nav = await cdp.call('Page.navigate', { url: host.url + '?capture=1' });
    if (nav.errorText) throw new Error('Chromium could not load the local film (' + nav.errorText + '). Check browser policies / localhost access.');
    let ready = false;
    for (let i = 0; i < 125; i++) {
      try { ready = !!(await cdp.eval('document.readyState === "complete" && !!window.__motion && !!window.__motion.config')); }
      catch { /* Navigation swaps the JS context. */ }
      if (ready) break;
      await delay(80);
    }
    if (!ready) throw new Error('Film did not expose window.__motion.config. Browser errors: ' + cdp.errors.join('; '));
    await cdp.eval('document.fonts.ready.then(() => true)');
    const config = await cdp.eval('window.__motion.config');
    for (const field of ['width', 'height', 'fps', 'duration']) {
      if (!(Number.isFinite(config[field]) && config[field] > 0)) throw new Error(`Invalid film config.${field}`);
    }
    const frame = async (t, scale = 1) => {
      const width = 2 * Math.round(config.width * scale / 2);
      const height = 2 * Math.round(config.height * scale / 2);
      if (width < 2 || height < 2 || width > 8192 || height > 8192) throw new Error('Unsupported capture dimensions.');
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await cdp.eval(`window.__motion.seek(${JSON.stringify(t)})`);
      return cdp.png();
    };
    const close = async () => {
      cdp.close();
      chrome.child.kill('SIGKILL');
      await fs.rm(chrome.dir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
      await new Promise(resolve => host.server.close(resolve));
    };
    return { config, frame, errors: cdp.errors, close };
  } catch (error) {
    if (chrome) {
      chrome.cdp.close(); chrome.child.kill('SIGKILL');
      await fs.rm(chrome.dir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }).catch(() => {});
    }
    await new Promise(resolve => host.server.close(resolve));
    throw error;
  }
}
