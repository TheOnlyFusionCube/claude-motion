import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, findings, SW, SH } from '../scripts/lib/analyze.mjs';

// Synthetic films: a "deck" (the same centred block, a small part changing) and a "travelling" film
// (a large pattern that shifts across the frame).
const frame = (draw) => { const px = new Uint8Array(SW * SH * 3).fill(20); for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (draw(x, y)) { const i = (y * SW + x) * 3; px[i] = px[i + 1] = px[i + 2] = 230; } return px; };
const deck = Array.from({ length: 40 }, (_, k) => ({ t: k * .5, px: frame((x, y) => x > 70 && x < 122 && y > 40 && y < 68 && !(x > 110 && y > 60 && (k % 2))) }));
const travel = Array.from({ length: 40 }, (_, k) => ({ t: k * .5, px: frame((x, y) => ((x + k * 9) % 48 < 20) && ((y + k * 3) % 36 < 22)) }));

test('flags an animated deck', () => {
  const a = analyze(deck, .5);
  assert.ok(a.change2s < .14 && a.cxSd < .04);
  assert.ok(findings(a).warn.some(w => /animated deck/.test(w)));
});

test('does not flag a picture that travels', () => {
  const a = analyze(travel, .5);
  assert.ok(a.change2s > .14, 'travelling pattern changes a lot over 2 s');
  assert.ok(!findings(a).warn.some(w => /animated deck/.test(w)));
});
