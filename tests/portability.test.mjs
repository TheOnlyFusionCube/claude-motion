import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditPortable, commit, gitBlobSha, originals, requiredPortableFiles } from '../scripts/sync-upstream.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(root, 'scripts/sync-upstream.mjs');

async function withFixture(run) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-motion-portable-'));
  try {
    for (const rel of requiredPortableFiles) {
      const abs = path.join(tmp, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, 'Original first-party placeholder\n');
    }
    await run(tmp);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

test('the checked-out skill verifies with no upstream documents', async () => {
  assert.deepEqual(await auditPortable(root), []);
  await assert.rejects(fs.access(path.join(root, 'references/upstream')), { code: 'ENOENT' });
});

test('missing independent references are a portability failure', async () => {
  await withFixture(async tmp => {
    assert.deepEqual(await auditPortable(tmp), []);
    await fs.unlink(path.join(tmp, 'references/production-guide.md'));
    assert.ok((await auditPortable(tmp)).some(x => x.includes('Missing portable skill dependency: references/production-guide.md')));
  });
});

test('verbatim directory and obsolete operational links are rejected', async () => {
  await withFixture(async tmp => {
    const old = path.join(tmp, 'references/upstream');
    await fs.mkdir(old);
    await fs.writeFile(path.join(old, 'motion.md'), 'placeholder');
    await fs.writeFile(path.join(tmp, 'SKILL.md'), 'Read references/upstream/motion.md before creating a film.');
    const issues = await auditPortable(tmp);
    assert.ok(issues.some(x => x.includes('Bundled upstream directory')));
    assert.ok(issues.some(x => x.includes('Obsolete upstream document link in SKILL.md')));
  });
});

test('a renamed exact source blob is rejected by its Git hash', async () => {
  await withFixture(async tmp => {
    const bytes = Buffer.from('synthetic source fixture\n');
    const renamed = path.join(tmp, 'references/renamed.md');
    await fs.writeFile(renamed, bytes);
    const hashes = new Map([[gitBlobSha(bytes), 'original.md']]);
    const issues = await auditPortable(tmp, { sourceHashes: hashes });
    assert.ok(issues.some(x => x.includes('Verbatim mirrored document at references/renamed.md')));
  });
});

test('historical manifest can be listed offline; downloads are disabled', () => {
  assert.equal(originals.length, 12);
  assert.equal(originals.reduce((n, o) => n + o.bytes, 0), 159065);
  const list = spawnSync(process.execPath, [cli, '--list'], { encoding: 'utf8' });
  assert.equal(list.status, 0, list.stderr);
  assert.ok(list.stdout.includes(commit));
  assert.ok(list.stdout.includes(originals[0].sha));
  for (const flag of ['--all', '--force']) {
    const run = spawnSync(process.execPath, [cli, flag], { encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /disabled/);
  }
});
