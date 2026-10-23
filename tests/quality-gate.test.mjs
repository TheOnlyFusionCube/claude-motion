import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { areaDelta, lumaStddev, stagnantRuns, auditMetrics } from '../scripts/audit-video.mjs';

test('areaDelta ignores small encoder shimmer but detects large visible movement', () => {
  const a = Uint8Array.from({ length: 100 }, () => 100);
  const b = Uint8Array.from({ length: 100 }, (_, i) => i < 20 ? 130 : 102);
  const delta = areaDelta(a, b);
  assert.equal(delta.strongChangeFraction, 0.2);
  assert.ok(delta.meanLumaDelta > 6);
});

test('stagnantRuns identifies prolonged static middle and exempts intentional opening and closing holds', () => {
  const intervals = Array.from({ length: 23 }, (_, i) => ({ start: i, end: i + 1, strongChangeFraction: 0.18 }));
  for (const i of [0, 1, 2, 10, 11, 12, 13, 14, 20, 21, 22]) intervals[i].strongChangeFraction = 0.002;
  assert.deepEqual(stagnantRuns(intervals, { duration: 24, mode: 'showreel' }), [{ start: 10, end: 15, seconds: 5 }]);
  assert.deepEqual(stagnantRuns(intervals, { duration: 24, mode: 'ambient' }), []);
});

test('showreel audit rejects undersized MP4 and still middle despite an audio track', () => {
  const intervals = Array.from({ length: 23 }, (_, i) => ({ start: i, end: i + 1, strongChangeFraction: i >= 10 && i < 15 ? 0 : 0.16 }));
  const result = auditMetrics({ width: 910, height: 512, duration: 24, hasAudio: true, intervals });
  assert.equal(result.pass, false);
  assert.equal(result.problems.length, 2);
  assert.match(result.problems.join(' '), /910×512/);
  assert.match(result.problems.join(' '), /10–15s/);
});

test('showreel audit accepts adequate dimensions and clear visual changes but still requires review', () => {
  const intervals = Array.from({ length: 17 }, (_, i) => ({ start: i, end: i + 1, strongChangeFraction: 0.12 }));
  const result = auditMetrics({ width: 1920, height: 1080, duration: 18, hasAudio: true, intervals });
  assert.equal(result.pass, true);
  assert.ok(result.warnings.some(s => /Manual review required/.test(s)));
});

test('active skill explicitly loads showreel creative brief and audit-video QA', () => {
  const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /references\/showreel\.md/);
  assert.match(skill, /scripts\/audit-video\.mjs/);
  assert.match(skill, /static slideshow/i);
});


test('empty transition frames are rejected even when the video shows motion elsewhere', () => {
  assert.equal(lumaStddev(new Uint8Array(50).fill(238)), 0);
  assert.ok(lumaStddev(Uint8Array.from([0, 255, 255, 0])) > 100);
  const intervals = Array.from({ length: 19 }, (_, i) => ({ start: i, end: i + 1, strongChangeFraction: 0.17 }));
  const result = auditMetrics({ width: 1920, height: 1080, duration: 20, hasAudio: true, intervals,
    nearBlankFrames: [{ time: 3, lumaStddev: 0.1 }] });
  assert.equal(result.pass, false);
  assert.match(result.problems.join(' '), /Near-blank frame/);
});
