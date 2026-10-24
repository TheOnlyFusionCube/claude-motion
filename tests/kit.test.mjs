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

test('bouncer: falls, squashes on contact, loses height, comes to rest', () => {
  const b = kit.bouncer({ t0: 1, h: 400, n: 3, fall: .5, decay: .5, x0: 0, dx: 300 });
  assert.equal(b.contacts.length, 4);
  assert.ok(Math.abs(b.contacts[0] - 1.5) < 1e-9);
  assert.equal(b.at(0.5).y, 400);
  const hit = b.at(b.contacts[0]); assert.equal(hit.y, 0); assert.ok(hit.sy < 1 && hit.sx > 1, 'squash');
  const fall = b.at(1.4); assert.ok(fall.sy > 1 && fall.sx < 1, 'stretch while falling fast');
  const apex1 = b.at((b.contacts[0] + b.contacts[1]) / 2); assert.ok(Math.abs(apex1.y - 200) < 1, 'second arc reaches h·decay');
  const rest = b.at(b.end + 1); assert.equal(rest.y, 0); assert.equal(rest.x, 300); assert.equal(rest.sx, 1);
  assert.equal(JSON.stringify(b.at(1.234)), JSON.stringify(b.at(1.234)));
});

test('trail samples the past in order', () => {
  const tr = kit.trail(s => s * 2, 5, { span: 1, n: 5 });
  assert.deepEqual(Array.from(tr, o => o.p), [8, 8.5, 9, 9.5, 10]);
  assert.equal(kit.trail(s => s, 5, { span: 1, n: 5, t0: 4.6 }).length, 2);
});

test('gait: legs alternate, driven by distance, feet planted when lifted', () => {
  const g0 = kit.gait(0, { stride: 60, legs: 2 }), gq = kit.gait(15, { stride: 60, legs: 2 });
  assert.equal(g0.legs.length, 2);
  assert.ok(Math.abs(gq.legs[0].swing + gq.legs[1].swing) < 1e-9, 'two legs swing opposite');
  const g4 = kit.gait(15, { stride: 60, legs: 4 });
  assert.ok(Math.abs(g4.legs[0].swing - g4.legs[3].swing) < 1e-9 && Math.abs(g4.legs[0].swing + g4.legs[1].swing) < 1e-9, 'diagonal pairs');
  assert.equal(JSON.stringify(kit.gait(37, {})), JSON.stringify(kit.gait(37, {})));
  assert.ok(kit.gait(60, { stride: 60 }).bob > -1e-9, 'one full stride returns to rest');
});
