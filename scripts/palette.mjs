#!/usr/bin/env node
// Check palettes before offering them: ink must read on ground (≥ 4.5:1), main must show on ground.
//   node scripts/palette.mjs "#10201D,#3E8F84,#C9E4DC,#D98A3D" "#F4F7FB,#12355B,#0B1B2B,#E8A33D"
// Roles in order: ground, main, ink (the "second" colour: words), accent.
const hex = c => { c = c.trim().replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); if (!/^[0-9a-f]{6}$/i.test(c)) throw new Error('bad colour ' + c); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = c => { const [r, g, b] = hex(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
const args = process.argv.slice(2);
if (!args.length) { console.log('usage: node scripts/palette.mjs "#ground,#main,#ink,#accent" [...more palettes]'); process.exit(1); }
let bad = 0;
for (const p of args) {
  const [ground, main, ink, accent] = p.split(',');
  const r = { ink: ratio(ink, ground), main: ratio(main, ground), accent: ratio(accent, ground) };
  const dark = lum(ground) < .18;
  const issues = [];
  if (r.ink < 4.5) issues.push(`ink on ground ${r.ink.toFixed(2)}:1 (needs ≥ 4.5)`);
  if (r.main < 1.8) issues.push(`main barely shows on ground (${r.main.toFixed(2)}:1)`);
  if (r.accent < 1.5) issues.push(`accent barely shows on ground (${r.accent.toFixed(2)}:1)`);
  const l = lum(ground); if (l > .08 && l < .3) issues.push('ground is mid-tone: neither dark nor light ink reads well');
  bad += issues.length ? 1 : 0;
  console.log(`${issues.length ? '✗' : '✓'} ${p}  (${dark ? 'dark' : 'light'} ground; ink ${r.ink.toFixed(1)}:1, main ${r.main.toFixed(1)}:1, accent ${r.accent.toFixed(1)}:1)${issues.length ? '\n    ' + issues.join('\n    ') : ''}`);
}
process.exit(bad ? 1 : 0);
