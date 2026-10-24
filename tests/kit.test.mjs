import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, document: undefined, Math, console };
vm.runInNewContext(fs.readFileSync(new URL('../kit/motion-kit.js', import.meta.url), 'utf8'), ctx);
const kit = ctx.window.kit;
kit.W = 1920; kit.H = 1080;

test('eases hit their endpoints exactly', () => {
  for (const k of ['eo', 'ei', 'eio', 'eoq', 'eiq', 'eox', 'eix', 'eiox', 'eob', 'eib', 'spring', 'lin']) {
    assert.equal(kit[k](0), 0, k + '(0)'); assert.equal(kit[k](1), 1, k + '(1)');
    assert.equal(kit[k](-5), 0, k + '(<0)'); assert.equal(kit[k](5), 1, k + '(>1)');
  }
  assert.ok(kit.eob(0.7, 1.7) > 1, 'back-out overshoots');
});

test('seg / keys / window', () => {
  assert.equal(kit.seg(5, 4, 6), 0.5); assert.equal(kit.seg(1, 4, 6), 0); assert.equal(kit.seg(9, 4, 6), 1);
  assert.deepEqual(Array.from(kit.keys(0, [[1, [0, 0]], [2, [10, 20]]])), [0, 0]);
  assert.deepEqual(Array.from(kit.keys(3, [[1, [0, 0]], [2, [10, 20]]])), [10, 20]);
  assert.equal(kit.keys(1.5, [[1, 0], [2, 10, kit.lin]]), 5);
  assert.equal(kit.window(0, 1, 3), 0); assert.equal(kit.window(2, 1, 3), 1); assert.equal(kit.window(3, 1, 3), 0);
});

test('camera: drift carries into the next move without a pop, zoom in log space', () => {
  const cam = new kit.Camera(null).set([{ t: 0, cx: 100, cy: 100, z: 1, drift: [10, 0, 0] }, { t: 4, from: 2, cx: 500, cy: 100, z: 4 }]);
  const a = cam.at(2), b = cam.at(2.0001);
  assert.ok(Math.abs(a.cx - 120) < 1e-6 && Math.abs(b.cx - a.cx) < 0.1, 'continuous at move start');
  assert.ok(Math.abs(cam.at(3).z - 2) < 1e-9, 'geometric midpoint of 1→4 is 2');
  assert.equal(cam.at(9).cx, 500);
  const p = cam.toStage([500, 100], 4); assert.deepEqual(Array.from(p, Math.round), [960, 540]);
});

test('typist is deterministic and monotonic', () => {
  kit.typing.times.length = 0;
  const a = kit.typist('Hello, world', 1, 20, 3), b = kit.typist('Hello, world', 1, 20, 3);
  assert.deepEqual(a.times, b.times);
  assert.ok(a.times.every((x, i) => i === 0 || x > a.times[i - 1]));
  assert.equal(a.at(0.5), ''); assert.equal(a.at(99), 'Hello, world');
  assert.equal(kit.typing.times.length, 24);
});

test('streamed reveals whole words and finishes', () => {
  assert.equal(kit.streamed('one two three', 0, 1), '');
  assert.equal(kit.streamed('one two three', 10, 1), 'one two three');
  const mid = kit.streamed('one two three four five', 1.1, 1, 95, 5);
  assert.ok(mid === '' || /\S$/.test(mid));
});

test('rng / noise are deterministic', () => {
  const r1 = kit.rng(7), r2 = kit.rng(7);
  for (let i = 0; i < 5; i++) assert.equal(r1(), r2());
  const n = kit.vnoise(3); assert.equal(n(1.5), n(1.5)); assert.ok(Math.abs(n(2.3)) <= 1);
  assert.equal(kit.mixColor('#000000', '#ffffff', 0.5), '#808080');
});
