import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { originals, gitBlobSha } from '../scripts/sync-upstream.mjs';
import { reportParity } from '../scripts/parity.mjs';
import { validateFilm, contrastRatio } from '../scripts/validate-film.mjs';
import { frequency, renderScore, encodeWav, rmsLevels } from '../scripts/render-audio.mjs';
import { FILM, SCORE } from '../assets/vanilla-film/src/scenes.mjs';

const root = path.dirname(fileURLToPath(new URL('../SKILL.md', import.meta.url)));

for (const expected of originals) {
  test(`upstream ${expected.local} is bit-for-bit original`, async () => {
    const name = expected.local;
    assert.ok(expected);
    const bytes = await fs.readFile(path.join(root, 'references/upstream', name));
    assert.equal(gitBlobSha(bytes), expected.sha);
    assert.equal(bytes.length, expected.bytes);
  });
}

test('all 12 original documents are pinned to unique source blob checksums', () => {
  assert.equal(originals.length, 12);
  assert.equal(new Set(originals.map(x => x.remote)).size, originals.length);
  assert.ok(originals.every(x => /^[0-9a-f]{40}$/.test(x.sha)));
  assert.equal(originals.reduce((n,x) => n+x.bytes, 0), 159065);
});

test('the active skill points at original source and local portability adapter', async () => {
  const s = await fs.readFile(path.join(root, 'SKILL.md'), 'utf8');
  assert.match(s, /^---\nname: claude-motion\ndescription: /);
  assert.match(s, /read `references\/upstream\/motion\.md` in full/i);
  assert.match(s, /references\/compatibility-map\.md/);
  assert.match(s, /references\/portable-workflow\.md/);
  assert.match(s, /references\/upstream\/rough-cut\.md/);
  assert.match(s, /scripts\/sync-upstream\.mjs/);
});

test('all 159,065 pinned original bytes are packaged intact and offline', async () => {
  const report = await reportParity(path.join(root, 'references/upstream'));
  assert.equal(report.identicalFiles, 12);
  assert.equal(report.sourceByteParityPercent, 100);
  assert.equal(report.identicalSourceBytes, 159065);
  assert.equal(report.rows.find(r => r.file==='original-skill.md').status, 'identical');
  // No second SKILL.md entrypoint anywhere in the original references.
  const names = await fs.readdir(path.join(root, 'references/upstream'));
  assert.ok(!names.includes('SKILL.md'));
});

test('portable manifest reproduces the standalone sample’s exact timeline', async () => {
  const spec = JSON.parse(await fs.readFile(path.join(root, 'assets/vanilla-film/scenes.json'),'utf8'));
  const result = validateFilm(spec);
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(result.duration, FILM.duration);
  assert.equal(spec.width, FILM.width);
  assert.equal(spec.height, FILM.height);
  assert.equal(spec.fps, FILM.fps);
  assert.deepEqual(Object.values(result.starts), FILM.chapters.map(c => c.t));
  assert.ok(contrastRatio(spec.palettes[0][2],spec.palettes[0][0]) >= 4.5);
});

test('manifest validator rejects duplicate IDs, bad palette ink and short final holds', async () => {
  const spec = JSON.parse(await fs.readFile(path.join(root, 'assets/vanilla-film/scenes.json'),'utf8'));
  spec.stage = 'final';
  spec.scenes[1].id = spec.scenes[0].id;
  spec.scenes[2].dur = 2;
  spec.palettes[0][2] = spec.palettes[0][0];
  const r = validateFilm(spec);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(x => /duplicate id/i.test(x)));
  assert.ok(r.errors.some(x => /final card/i.test(x)));
  assert.ok(r.errors.some(x => /contrast/i.test(x)));
});

test('pitch converter accepts notes and rejects unknown pitches', () => {
  assert.equal(frequency('A4'), 440);
  assert.ok(Math.abs(frequency('D4') - 293.6647679174076) < 0.0001);
  assert.throws(() => frequency('J4'));
});

test('event-based original score is deterministic and stays within headroom', () => {
  assert.ok(SCORE.events.length > 15);
  assert.ok(SCORE.events.some(x => x.kind === 'fx' && Math.abs(x.t - 6.25) < .001));
  const length = 2;
  const events = SCORE.events.filter(x => x.t < length);
  const A = renderScore({duration: length, events}, 8000);
  const B = renderScore({duration: length, events}, 8000);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(A.buffer)).digest('hex'), crypto.createHash('sha256').update(Buffer.from(B.buffer)).digest('hex'));
  assert.ok(A.some(x => Math.abs(x) > .001));
  assert.ok(A.every(x => Math.abs(x) <= .9));
  assert.ok(rmsLevels(A, 8000).every(x => Number.isFinite(x)));
  const wav = encodeWav(A, 8000);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt32LE(40), A.length * 2);
});

test('scene and score timestamps fit the same film duration', () => {
  for (const e of SCORE.events) {
    assert.ok(e.t >= 0 && e.t < FILM.duration);
    assert.ok(e.dur > 0);
  }
});
