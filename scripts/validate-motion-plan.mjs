#!/usr/bin/env node
/** Continuous motion production-plan check; Node >=22, no dependencies.
 *  A plan proves intended coverage, NOT that rendered pixels truly move.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const KINDS = new Set(['camera', 'plate', 'object', 'shape', 'diagram', 'ui', 'type', 'mark', 'data', 'world']);
const HANDOFFS = new Set(['transform', 'follow', 'match-cut', 'rhythm-cut']);
const INVISIBLE_ONLY = /^(fade|opacity|blur|glow|flash|transition)$/i;
const EPS = 1e-3;

export function uncoveredSpans(tracks, start, end, minGap = .5) {
  const spans = tracks.map(x => [Math.max(start, x.start), Math.min(end, x.end)])
    .filter(([a,b]) => b > a).sort((a,b) => a[0]-b[0]);
  const gaps = [];
  let cursor = start;
  for (const [a,b] of spans) {
    if (a > cursor + minGap + EPS) gaps.push({start: +cursor.toFixed(3), end: +a.toFixed(3), seconds: +(a-cursor).toFixed(3)});
    cursor = Math.max(cursor,b);
  }
  if (end > cursor + minGap + EPS) gaps.push({start: +cursor.toFixed(3), end: +end.toFixed(3), seconds: +(end-cursor).toFixed(3)});
  return gaps;
}

export function evaluatePlan(plan, {strict = false, maxCarrierGap = .5, maxFocalGap = 9} = {}) {
  const errors = [], warnings = [];
  if (!plan || typeof plan !== 'object') return {pass:false, errors:['Plan must be a JSON object.'],warnings};
  const duration = plan.duration;
  if (plan.version !== 1 || !Number.isFinite(duration) || duration <= 0 || duration > 300) {
    errors.push('Expected version:1 and duration between 0 and 300 seconds.');
    return {pass:false, errors, warnings};
  }
  const shots = plan.shots, tracks = plan.tracks;
  if (!Array.isArray(shots) || shots.length < 1) errors.push('Provide one or more ordered shots.');
  if (!Array.isArray(tracks) || tracks.length < 1) errors.push('Provide visible time-bounded motion tracks.');
  if (errors.length) return {pass:false,errors,warnings};
  let cursor = 0;
  const ids = new Set();
  for (let i = 0; i < shots.length; i++) {
    const s=shots[i];
    if (!s || typeof s!=='object') {errors.push(`Shot ${i+1} must be an object.`);continue;}
    if (!/^[a-z][a-z0-9-]*$/.test(s.id || '') || ids.has(s.id)) errors.push(`Shot ${i+1}: use unique lowercase kebab-case id.`);
    ids.add(s.id);
    if (!Number.isFinite(s.start) || !Number.isFinite(s.end) || s.end - s.start < .2 || s.end > duration+EPS || s.start < -EPS) errors.push(`Shot ${s.id}: invalid time range.`);
    if (Math.abs((s.start ?? -1)-cursor) > .02) errors.push(`Shot ${s.id}: timeline gap or overlap near ${cursor}s.`);
    cursor=s.end;
    if (!s.subject || String(s.subject).trim().length < 5) errors.push(`Shot ${s.id}: name its focal subject.`);
    if (i < shots.length-1) {
      if (!s.handoff || !HANDOFFS.has(s.handoff.kind) || String(s.handoff.why || '').trim().length < 12) errors.push(`Shot ${s.id}: describe subject handoff to the next shot (transform/follow/match-cut/rhythm-cut).`);
      else if (s.handoff.kind==='rhythm-cut') warnings.push(`Shot ${s.id}: verify this hard cut advances action, not merely the next slide.`);
    }
  }
  if (Math.abs(cursor-duration)>.02) errors.push(`The final shot must end at duration ${duration}s (ends at ${cursor}s).`);
  const names = new Set();
  for (let i=0;i<tracks.length;i++) {
    const tr=tracks[i];
    if (!tr || typeof tr !== 'object') {errors.push(`Track ${i+1}: not an object.`);continue;}
    const id=tr.id || `track-${i+1}`;
    if (!/^[a-z][a-z0-9-]*$/.test(id)||names.has(id)) errors.push(`Track ${i+1}: use a unique lower-case id.`);
    names.add(id);
    if (tr.role!=='carrier' && tr.role!=='focal') errors.push(`Track ${id}: role must be carrier or focal.`);
    if (!KINDS.has(tr.kind)) errors.push(`Track ${id}: unsupported visible medium (camera/plate/object/shape/diagram/ui/type/mark/data/world).`);
    if (!Number.isFinite(tr.start)||!Number.isFinite(tr.end)||tr.end-tr.start<.08||tr.start<0||tr.end>duration+EPS) errors.push(`Track ${id}: invalid time range.`);
    if (typeof tr.movement!=='string'||tr.movement.trim().length<3||INVISIBLE_ONLY.test(tr.movement.trim())) errors.push(`Track ${id}: name visible spatial/content movement, not only a fade/opacity/flash.`);
    if (typeof tr.extent!=='string'||tr.extent.trim().length<4||/^0(\s|px|%|deg|$)/i.test(tr.extent.trim())) errors.push(`Track ${id}: record nonzero movement extent/direction (e.g. +20px pan or 2% push).`);
    if (typeof tr.actor!=='string'||tr.actor.trim().length<3) errors.push(`Track ${id}: identify the actual visible actor.`);
    if (typeof tr.why!=='string'||tr.why.trim().length<12) errors.push(`Track ${id}: describe its perceptual/story purpose, not just 'animation'.`);
  }
  if (errors.length) return {pass:false,errors,warnings};
  const carriers=tracks.filter(x=>x.role==='carrier');
  if(!carriers.length) errors.push('No actual carrier tracks were declared; focal actions do not replace continuous camera/plate movement.');
  const carrierGaps=uncoveredSpans(carriers,0,duration,maxCarrierGap);
  for (const g of carrierGaps) errors.push(`Dead-air motion gap ${g.start}-${g.end}s (${g.seconds}s): the frame has no declared visible motion carrier. Holds and end cards also require a subtle moving actor.`);
  const focal=tracks.filter(x=>x.role==='focal');
  for(const shot of shots) if (!focal.some(t=>Math.min(t.end,shot.end)-Math.max(t.start,shot.start)>.2)) errors.push(`Shot ${shot.id} has no meaningful focal action, only ambient/plate movement; this is a slideshow risk.`);
  const middleStart=Math.min(2.5,duration/4), middleEnd=Math.max(middleStart,duration-Math.min(3,duration/4));
  const focalGaps=uncoveredSpans(focal,middleStart,middleEnd,maxFocalGap);
  for(const g of focalGaps) errors.push(`No declared meaningful on-screen event between ${g.start}-${g.end}s; need a story action, not an ambient camera alone.`);
  const hardCuts=shots.slice(0,-1).filter(s=>s.handoff?.kind==='rhythm-cut').length;
  if(shots.length>=4 && hardCuts>Math.ceil((shots.length-1)/2)) warnings.push('Most handoffs are cuts; review for one-card-after-another structure.');
  if(strict&&warnings.length&&hardCuts>Math.ceil((shots.length-1)/2)) errors.push('Continuous-film mode requires meaningful transforming/following handoffs for most idea changes.');
  return {pass:errors.length===0,errors,warnings,shotCount:shots.length,trackCount:tracks.length,carrierGaps,focalGaps};
}

export function runCli(argv=process.argv.slice(2)){
 const args=argv.filter(a=>!a.startsWith('--'));const flags=argv.filter(a=>a.startsWith('--'));
 if(args.length!==1||flags.some(x=>!['--strict','--json'].includes(x)))throw Error('Usage: node scripts/validate-motion-plan.mjs motion-plan.json [--strict] [--json]');
 const report=evaluatePlan(JSON.parse(fs.readFileSync(args[0],'utf8')),{strict:flags.includes('--strict')});
 if(flags.includes('--json'))console.log(JSON.stringify(report,null,2));
 else {console.log(`${report.pass?'PASS':'NEEDS REVISION'}: ${args[0]} (${report.shotCount||0} shots, ${report.trackCount||0} motion tracks)`);for(const x of report.errors)console.log('ERROR: '+x);for(const x of report.warnings)console.log('REVIEW: '+x);}
 if(!report.pass)process.exitCode=1;
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{runCli()}catch(e){console.error(e.message);process.exitCode=2;}}
