import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesize, wav, levels, hz, KNOWN } from '../scripts/lib/synth.mjs';

test('pitch names', () => { assert.equal(Math.round(hz('A4')), 440); assert.equal(Math.round(hz('C4')), 262); assert.equal(Math.round(hz(69)), 440); });

test('every patch, drum and foley renders, deterministically, without clipping', () => {
  const events = [];
  KNOWN.patches.forEach((p, i) => events.push({ kind: 'note', track: p, pitch: 'C4', t: i * 0.3, dur: 0.4, vel: 90 }));
  KNOWN.drums.forEach((d, i) => events.push({ kind: 'drum', name: d, t: 0.1 + i * 0.25, vel: 100 }));
  KNOWN.fx.forEach((f, i) => events.push({ kind: 'fx', name: f, t: 0.2 + i * 0.3, vel: 100, dur: 0.4 }));
  const programs = Object.fromEntries(KNOWN.patches.map(p => [p, { patch: p }]));
  const score = { duration: 6, events, programs, master: {} };
  const a = synthesize(score), b = synthesize(score);
  assert.deepEqual(a.unknown, {});
  assert.ok(a.peak > 0.05 && a.peak <= 0.9);
  assert.equal(a.L.length, 6 * 48000);
  for (let i = 0; i < a.L.length; i += 997) assert.equal(a.L[i], b.L[i]);
  const w = wav(a); assert.equal(w.toString('ascii', 0, 4), 'RIFF'); assert.equal(w.length, 44 + a.L.length * 4);
  assert.equal(levels(a).length, 6);
});

test('unknown names are reported, not thrown', () => {
  const r = synthesize({ duration: 1, events: [{ kind: 'fx', name: 'kazoo', t: 0, vel: 80 }], programs: {}, master: {} });
  assert.deepEqual(r.unknown, { 'fx:kazoo': 1 });
});
