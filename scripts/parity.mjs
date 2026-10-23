#!/usr/bin/env node
/** Audit the installed package's ORIGINAL source retention, byte-for-byte. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commit, originals, gitBlobSha } from './sync-upstream.mjs';

export async function reportParity(upstreamDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../references/upstream')) {
  const rows = [];
  let verified = 0, includedBytes = 0;
  const totalBytes = originals.reduce((sum, o) => sum + o.bytes, 0);
  for (const o of originals) {
    let data;
    try { data = await fs.readFile(path.join(upstreamDir, o.local)); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    const actual = data && gitBlobSha(data);
    const ok = Boolean(data && actual === o.sha && data.length === o.bytes);
    if (ok) { verified++; includedBytes += o.bytes; }
    rows.push({file: o.local, expectedBytes: o.bytes, status: ok?'identical':data?'modified':'missing', expectedGitBlob: o.sha});
  }
  const fraction = totalBytes ? 100 * includedBytes / totalBytes : 0;
  return {commit, sourceFiles: originals.length, identicalFiles: verified, totalSourceBytes: totalBytes, identicalSourceBytes: includedBytes, sourceFileParityPercent: 100 * verified/originals.length, sourceByteParityPercent: fraction, rows};
}

async function main(argv) {
  if (argv.some(x => !['--json','--help','-h'].includes(x))) { console.error('Unknown argument. Usage: node scripts/parity.mjs [--json]'); process.exitCode=2; return; }
  if (argv.includes('--help') || argv.includes('-h')) { console.log('Usage: node scripts/parity.mjs [--json]'); return; }
  const result = await reportParity();
  if (argv.includes('--json')) console.log(JSON.stringify(result,null,2));
  else {
    console.log(`Source files: ${result.identicalFiles}/${result.sourceFiles} identical (${result.sourceFileParityPercent.toFixed(1)}%)`);
    console.log(`Source bytes: ${result.identicalSourceBytes.toLocaleString()}/${result.totalSourceBytes.toLocaleString()} identical (${result.sourceByteParityPercent.toFixed(1)}%)`);
    console.log(`Pinned upstream commit: ${result.commit}`);
    for (const row of result.rows) console.log(`  ${row.status.padEnd(10)} ${row.file} (${row.expectedBytes} bytes)`);
    console.log('Note: These are documentation retention metrics, NOT proprietary player/API parity or measured visual quality.');
  }
  if (result.identicalFiles !== result.sourceFiles) process.exitCode=1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode=1; });
