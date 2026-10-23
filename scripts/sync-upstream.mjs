#!/usr/bin/env node
/**
 * Verbatim-source integrity verifier and optional pinned-source repair.
 * Uses only Node built-ins, pins the git commit and checks every original git blob SHA-1.
 * Never executes the downloaded text. Does not modify SKILL.md or any user film.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const commit = '4ec8ef41a1e0ef32e6f0e9d20b0c18f7e028dc83';
const root = 'Anthropic/artifact-types/motion/';
export const originals = Object.freeze([
  { local: 'original-skill.md', bytes: 16064, remote: 'SKILL.md', sha: 'b3ddb733dcda89d071ccf3a914f62e01fda06a4f' },
  { local: 'motion.md', bytes: 16106, remote: 'artifact-type/reference/motion.md', sha: '7dd751cb8d54347a5ef8a34d7539d98d0942d784' },
  { local: 'film-api.md', bytes: 16029, remote: 'artifact-type/reference/film-api.md', sha: 'c048856dcc22c2676d4160ba46b28937d22fbcfc' },
  { local: 'rough-cut.md', bytes: 15991, remote: 'artifact-type/reference/rough-cut.md', sha: '61f329584dee6fcc829805d1c1e0651f9b43dd91' },
  { local: 'finalize.md', bytes: 15954, remote: 'artifact-type/reference/finalize.md', sha: '011913a3e33a24c68c5d74fd0cee25a35644886f' },
  { local: 'questions.md', bytes: 16008, remote: 'artifact-type/reference/questions.md', sha: 'fb51ba536de3c9120292c434a3e48d5ec2af8426' },
  { local: 'plan.md', bytes: 13861, remote: 'artifact-type/reference/plan.md', sha: '8ed904c5cdd018f0fcc8600f0a4d608d2bdc4925' },
  { local: 'recreate-ui.md', bytes: 8367, remote: 'artifact-type/reference/recreate-ui.md', sha: '4139f9a5c4009249e17ae8330a1d8b12bc1f4c4b' },
  { local: 'render-offline.md', bytes: 14363, remote: 'artifact-type/reference/render-offline.md', sha: 'da54524b9d9c010438a37c49427adc0e8383009f' },
  { local: 'sound.md', bytes: 6772, remote: 'artifact-type/reference/sound.md', sha: 'aacf37f4ddc3c19e8a84d60345d8e96336f5f649' },
  { local: 'styles.md', bytes: 14897, remote: 'artifact-type/reference/styles.md', sha: '60968424d08b3c0087119a0363e54e979aa44864' },
  { local: 'walkthrough.md', bytes: 4653, remote: 'artifact-type/reference/walkthrough.md', sha: '6499048be0e2ed73c8de6d35a69c13d3b8f95e23' },
]);

export function gitBlobSha(buffer) {
  return crypto.createHash('sha1').update(`blob ${buffer.byteLength}\0`).update(buffer).digest('hex');
}

async function main(argv) {
  const modes = new Set(argv);
  if (modes.has('--help') || modes.has('-h')) {
    console.log('Usage: node scripts/sync-upstream.mjs [--list | --verify | --all] [--force]');
    console.log('Without options, download only missing original refs; --all downloads missing docs too and verifies existing ones.');
    return;
  }
  if (argv.some(a => !['--list', '--verify', '--all', '--force'].includes(a))) throw new Error('Unknown argument. Use --help.');
  const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../references/upstream');
  if (modes.has('--list')) {
    for (const o of originals) console.log(`${o.local.padEnd(20)} ${o.sha} ${o.remote}`);
    return;
  }
  await fs.mkdir(target, {recursive: true});
  let verified = 0, downloaded = 0, missing = 0;
  for (const o of originals) {
    const dest = path.join(target, o.local);
    let bytes = null;
    try { bytes = await fs.readFile(dest); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (bytes && gitBlobSha(bytes) === o.sha) { verified++; console.log(`VERIFIED ${o.local}`); continue; }
    if (bytes && !modes.has('--force')) {
      throw new Error(`Local file differs from upstream blob: ${dest}. It was not overwritten (use --force to replace).`);
    }
    if (modes.has('--verify')) { missing++; console.log(`MISSING ${o.local}`); continue; }
    const url = `https://raw.githubusercontent.com/asgeirtj/system_prompts_leaks/${commit}/${root}${o.remote}`;
    let response;
    try { response = await fetch(url, {signal: AbortSignal.timeout(30000)}); }
    catch (error) { throw new Error(`Could not fetch ${o.remote}: ${error.message}. Offline use is supported with bundled refs.`); }
    if (!response.ok) throw new Error(`GET ${url} → HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    const actual = gitBlobSha(bytes);
    if (actual !== o.sha) throw new Error(`${o.remote}: expected git blob ${o.sha}, got ${actual}. Refusing altered bytes.`);
    await fs.writeFile(dest, bytes);
    console.log(`DOWNLOADED ${o.local} (${bytes.length} bytes)`);
    downloaded++;
  }
  console.log(`Original references: ${verified} verified, ${downloaded} downloaded, ${missing} missing. Pinned commit ${commit}.`);
  if (modes.has('--verify') && missing) {
    console.error('Source verification failed: bundled original references are missing. Run --all while online to restore exact pinned source files.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch(err => { console.error(err.message); process.exitCode = 1; });
}
