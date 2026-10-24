// Renders real films in Chromium. Skips (doesn't fail) where Playwright/Chromium aren't installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, openFilm, snap, SKILL_DIR } from '../scripts/lib/browser.mjs';
const at = p => path.join(SKILL_DIR, p);

let browser = null;
try { browser = await launch(); } catch { /* no browser here */ }
const skip = browser ? false : 'Playwright/Chromium not installed';
test.after(async () => { if (browser) await browser.close(); });

test('starter film renders the same frame whatever the seek history', { skip }, async () => {
  const { page, ctx } = await openFilm(browser, at('templates/starter'));
  const a = await snap(page, 6.2); await snap(page, 13); await snap(page, 0.5);
  const b = await snap(page, 6.2);
  assert.ok(a.equals(b), 'render(6.2) changed after seeking elsewhere');
  assert.deepEqual(await page.evaluate(() => __film.errors), []);
  await ctx.close();
});

test('TextFx keeps inline markup (<em>, <br>) when splitting words', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-test-'));
  fs.writeFileSync(path.join(dir, 'film.js'), `let el; export default { width: 640, height: 360, duration: 2,
    init(kit) { el = kit.h('<div id="h">Plans that <em>keep up</em><br>today</div>'); kit.stage.append(el); },
    render(t, kit) { kit.TextFx.in(el, t, 0); } };`);
  const { page, ctx } = await openFilm(browser, dir);
  await page.evaluate(() => __film.seek(1));
  const r = await page.evaluate(() => { const h = document.getElementById('h'); return { em: h.querySelector('em')?.textContent, br: !!h.querySelector('br'), words: h.querySelectorAll('.kit-word').length, text: h.textContent }; });
  assert.deepEqual(r, { em: 'keep up', br: true, words: 5, text: 'Plans that keep uptoday' });
  await ctx.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('all six style presets load and render without errors', { skip }, async () => {
  const logs = [];
  const { page, ctx, info } = await openFilm(browser, at('examples/styles'), { logs });
  assert.equal(info.chapters.length, 6);
  for (const c of info.chapters) await snap(page, c.t + 1.5, 'jpeg', 60);
  assert.deepEqual([...(await page.evaluate(() => __film.errors)), ...logs], []);
  await ctx.close();
});

test('score records events from the film timeline', { skip }, async () => {
  const { page, ctx } = await openFilm(browser, at('templates/starter'));
  const s = await page.evaluate(() => __film.score());
  assert.ok(s.events.length > 30 && s.events.every(e => e.t >= 0 && e.t < s.duration + 1));
  await ctx.close();
});
