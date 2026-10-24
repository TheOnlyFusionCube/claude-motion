import test from 'node:test';
import assert from 'node:assert/strict';
import { blurSetting, blurTimes } from '../scripts/lib/browser.mjs';

test('motion blur: film setting, CLI overrides, fast spans', () => {
  const info = { fps: 30, duration: 10, motionBlur: { samples: 8, shutter: 0.5, fast: [[2, 3, 32]] } };
  const mb = blurSetting(info);
  assert.equal(mb.samples, 8);
  assert.equal(blurSetting(info, false), null);
  assert.equal(blurSetting(info, 'off'), null);
  assert.equal(blurSetting({ fps: 30 }), null, 'no blur unless the film asks');
  assert.equal(blurSetting({ fps: 30 }, '4').samples, 4);
  assert.deepEqual(blurSetting(info, '4').fast, [], 'a forced count applies everywhere');
  const ts = blurTimes(1, 30, mb, 10);
  assert.equal(ts.length, 8);
  assert.ok(Math.abs(ts[0] - (1 - 0.25 / 30)) < 1e-9 && Math.abs(ts[7] - (1 + 0.25 / 30)) < 1e-9, 'centred on t, shutter wide');
  assert.equal(blurTimes(2.5, 30, mb, 10).length, 32, 'fast span');
  assert.ok(blurTimes(0, 30, mb, 10).every(x => x >= 0), 'clamped at 0');
  assert.deepEqual(blurTimes(1, 30, null), [1]);
});
