import test from 'node:test';
import assert from 'node:assert/strict';
import { segment, out, inOut, random01, clamp } from '../assets/vanilla-film/src/motion.mjs';
import { FILM, drawFrame } from '../assets/vanilla-film/src/scenes.mjs';
import { parseOptions } from '../scripts/browser.mjs';

test('timeline progress clamps safely, including zero-length intervals', () => {
  assert.equal(segment(-5, 0, 1), 0);
  assert.equal(segment(0.5, 0, 1), 0.5);
  assert.equal(segment(10, 0, 1), 1);
  assert.equal(segment(1, 1, 1), 1);
  assert.equal(segment(0.9, 1, 1), 0);
  assert.equal(clamp(99, 0, 14), 14);
  assert.equal(out(0), 0);
  assert.equal(out(1), 1);
  assert.equal(inOut(0.5), 0.5);
});

test('seeded noise is deterministic and bounded', () => {
  for (let n = 0; n < 32; n++) {
    assert.equal(random01(n), random01(n));
    assert.ok(random01(n) >= 0 && random01(n) < 1);
  }
});

function fakeCanvas() {
  const operations = [];
  const methods = ['setTransform', 'clearRect', 'fillRect', 'beginPath', 'arc', 'fill', 'stroke', 'translate', 'scale', 'rotate', 'moveTo', 'lineTo', 'roundRect', 'fillText', 'save', 'restore', 'closePath'];
  const receiver = Object.fromEntries(methods.map(m => [m, (...values) => operations.push([m, ...values])]));
  receiver.measureText = v => ({ width: v.length * 14 });
  const context = new Proxy(receiver, {
    set(target, key, value) { operations.push(['set:' + String(key), value]); target[key] = value; return true; },
  });
  return { context, operations };
}

test("film duration and chapters are coherent", () => {
  assert.equal(FILM.width, 1920);
  assert.equal(FILM.height, 1080);
  assert.equal(FILM.duration, 14);
  assert.ok(FILM.chapters.every(x => x.t >= 0 && x.t < FILM.duration));
});

test('frames at each scene are addressable without prior frames', () => {
  for (const t of [0, 1.2, 3.4, 6.25, 9.6, 13.99, 14]) {
    const fake = fakeCanvas();
    drawFrame(fake.context, t);
    assert.ok(fake.operations.length > 30, `Too few draw operations at ${t}`);
  }
});

test('rendering a frame does not depend on previous rendered times', () => {
  const draw = t => { const fake = fakeCanvas(); drawFrame(fake.context, t); return fake.operations; };
  const original = draw(6.25);
  draw(12); draw(0);
  assert.deepEqual(draw(6.25), original);
});

test('script arguments reject unexpected and valueless flags', () => {
  assert.deepEqual(parseOptions(['./film', '--times', '0,1'], ['--times']), { _: ['./film'], times: '0,1' });
  assert.throws(() => parseOptions(['--unknown', 'x'], ['--times']), /Unknown/);
  assert.throws(() => parseOptions(['--times'], ['--times']), /Missing/);
});

import { cameraAt, typist, wordEntrance, cursorAt, breathe, boilVariant, paperPolygon, morphPolygon } from '../assets/vanilla-film/src/motion.mjs';

test('portable camera interpolates log zoom, drift, cuts and arbitrary seeks', () => {
  const keys = [
    {t:0,cx:0,cy:0,z:1,hold:1,drift:[10,2,0]},
    {t:3,cx:300,cy:180,z:4},
    {t:6,cx:600,cy:360,z:2,cut:true},
  ];
  assert.deepEqual(cameraAt(keys,0), {cx:0,cy:0,z:1});
  assert.deepEqual(cameraAt(keys,.5), {cx:5,cy:1,z:1});
  const midpoint = cameraAt(keys,2); // halfway between 1 and 3, eased
  assert.equal(midpoint.cx, 155);
  assert.ok(midpoint.z > 1 && midpoint.z < 4);
  assert.deepEqual(cameraAt(keys,5), {cx:300,cy:180,z:4});
  assert.deepEqual(cameraAt(keys,6), {cx:600,cy:360,z:2});
  const first = cameraAt(keys,2.4);
  cameraAt(keys,5); cameraAt(keys,0); cameraAt(keys,3.4);
  assert.deepEqual(cameraAt(keys,2.4), first);
});

test('source-style type, cursor and shape helpers are deterministic from t', () => {
  const type=typist('Hello world', 1,24,7);
  assert.equal(type.at(0), '');
  assert.equal(type.at(type.end+1), 'Hello world');
  assert.equal(type.times.length, 11);
  assert.deepEqual(type.times, typist('Hello world',1,24,7).times);
  const words=wordEntrance('One clear idea',1.3,.5);
  assert.equal(words.length,3);
  assert.ok(words[0].opacity >= words[1].opacity);
  const pointer=cursorAt([{t:0,x:0,y:0},{t:2,x:100,y:100}], [2], 1);
  assert.ok(pointer.x > 0 && pointer.x < 100);
  assert.ok(pointer.y !== pointer.x); // bowed arc
  assert.ok(cursorAt([{t:0,x:0,y:0}], [2], 2.06).click > 0);
  assert.equal(boilVariant(1.005),boilVariant(1.005));
  assert.equal(boilVariant(1.005,12,3),0);
  assert.ok(breathe(0.7)>0);
  const a=paperPolygon(7,7),b=paperPolygon(3,7);
  assert.deepEqual(paperPolygon(7,7),a);
  assert.deepEqual(morphPolygon(a,b,0),a);
  assert.deepEqual(morphPolygon(a,b,1),b);
  assert.throws(()=>morphPolygon(a,b.slice(1),.5));
});
