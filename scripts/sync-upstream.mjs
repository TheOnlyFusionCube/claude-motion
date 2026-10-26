#!/usr/bin/env node
/**
 * Historical entry point, now a read-only portability audit.
 * No network access, synchronization, downloading, or source repair is performed.
 * The metadata below is an audit trail, not a grant of redistribution rights.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const commit = '4ec8ef41a1e0ef32e6f0e9d20b0c18f7e028dc83';
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

// These files make a usable installed skill, without any third-party reference text.
export const requiredPortableFiles = Object.freeze([
  'SKILL.md', 'references/production-guide.md', 'references/intake.md',
  'references/kit-api.md', 'references/recipes.md', 'references/styles.md',
  'templates/starter/film.js', 'kit/motion-kit.js',
  'scripts/check.mjs', 'scripts/score.mjs', 'scripts/export.mjs',
  'SOURCE.md', 'NOTICE.md',
]);

// Check published instructions and executable entry points for broken source-document links.
export const operationalFiles = Object.freeze([
  'SKILL.md', 'README.md', 'CONTRIBUTING.md',
  'references/production-guide.md', 'references/intake.md',
  'references/kit-api.md', 'references/recipes.md', 'references/styles.md',
  'kit/motion-kit.js', 'kit/styles/index.js',
  'templates/starter/film.js', 'templates/preset/film.js',
  'package.json', '.github/workflows/validate.yml',
]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'frames', '.agents', '.next']);
const knownSourceHashes = new Map(originals.map(o => [o.sha, o.local]));
const staleLink = /(?:references\/)?upstream\/[\w.-]+\.md/gi;

export function gitBlobSha(bytes) {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

async function markdownFiles(dir, relative = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const rel = path.posix.join(relative, entry.name);
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...await markdownFiles(absolute, rel));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({ rel, absolute });
    }
  }
  return files;
}

export async function auditPortable(repoRoot = root, { sourceHashes = knownSourceHashes } = {}) {
  const issues = [];
  for (const rel of requiredPortableFiles) {
    try {
      if (!(await fs.stat(path.join(repoRoot, rel))).isFile()) issues.push(`Not a file: ${rel}`);
    } catch (err) {
      if (err.code === 'ENOENT') issues.push(`Missing portable skill dependency: ${rel}`);
      else throw err;
    }
  }

  const oldDirectory = path.join(repoRoot, 'references/upstream');
  try {
    const files = await fs.readdir(oldDirectory);
    if (files.length) issues.push(`Bundled upstream directory is not portable: references/upstream/ (${files.length} entries)`);
  } catch (err) { if (err.code !== 'ENOENT') throw err; }

  for (const rel of operationalFiles) {
    let source;
    try { source = await fs.readFile(path.join(repoRoot, rel), 'utf8'); }
    catch (err) { if (err.code === 'ENOENT') continue; throw err; }
    for (const match of source.matchAll(staleLink)) {
      const line = source.slice(0, match.index).split('\n').length;
      issues.push(`Obsolete upstream document link in ${rel}:${line}: ${match[0]}`);
    }
  }

  // Catch renamed exact copies, not merely copies kept at the former path.
  for (const { rel, absolute } of await markdownFiles(repoRoot)) {
    const hash = gitBlobSha(await fs.readFile(absolute));
    if (sourceHashes.has(hash)) {
      issues.push(`Verbatim mirrored document at ${rel} (historical ${sourceHashes.get(hash)} blob)`);
    }
  }
  return issues;
}

async function main(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/sync-upstream.mjs --verify | --list');
    console.log('Legacy filename retained for compatibility. This command never downloads or restores source documents.');
    return;
  }
  if (argv.length !== 1) throw new Error('Choose exactly one option: --verify or --list.');
  if (argv[0] === '--list') {
    console.log(`Historical source manifest (metadata only), pinned to ${commit}:`);
    for (const o of originals) console.log(`${o.local.padEnd(20)} ${o.bytes} bytes ${o.sha} ${o.remote}`);
    return;
  }
  if (argv[0] === '--verify') {
    const issues = await auditPortable();
    if (issues.length) {
      for (const issue of issues) console.error(`FAIL ${issue}`);
      process.exitCode = 1;
    } else {
      console.log('Portable skill verified: local instructions and runtime present; no known verbatim upstream copies or operational source-document links.');
    }
    return;
  }
  if (argv[0] === '--all' || argv[0] === '--force') {
    throw new Error('Upstream downloading and repair are disabled. See SOURCE.md and NOTICE.md; this skill does not require mirrored documents.');
  }
  throw new Error(`Unknown argument: ${argv[0]}. Use --help.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch(err => { console.error(err.message); process.exitCode = 1; });
}
