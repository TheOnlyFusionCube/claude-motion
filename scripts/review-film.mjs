#!/usr/bin/env node
/** Editorial review evidence gate. Cannot judge visual taste; requires inspected frames and real-time notes. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function evaluateReview(review, {exists=fs.existsSync}={}){
 const errors=[];
 if(!review || review.version!==1 || !(review.duration>0))return {pass:false,errors:['Expected review version 1 and duration.']};
 if(review.watchedAtNormalSpeed!==true || typeof review.playbackNotes!=='string'||review.playbackNotes.trim().length<70)
  errors.push('Full film must be watched at normal speed and documented with actionable playback notes (>=70 chars).');
 const frames=review.frames;
 const min=review.duration>=90?12:review.duration>=30?8:5;
 if(!Array.isArray(frames)||frames.length<min)errors.push(`Provide at least ${min} inspected exact-video still frames.`);
 else{
  const lens=new Set();let prev=-1;
  for(const f of frames){
   if(!Number.isFinite(f.time)||f.time<=prev||f.time>review.duration)errors.push('Frames must be ordered by unique ascending seconds within film duration.');
   prev=f.time;
   if(!['wide','medium','close','macro'].includes(f.scale))errors.push(`Frame ${f.time}: name intended scale (wide/medium/close/macro).`);
   else lens.add(f.scale);
   if(typeof f.file!=='string'||!exists(f.file))errors.push(`Missing reviewed frame: ${f.file}`);
   if(typeof f.change!=='string'||f.change.trim().length<18)errors.push(`Frame ${f.time}: explain the visible story change (not only text).`);
  }
  if(lens.size<2)errors.push('At least two different focal/lens scales must be reviewed.');
 }
 if(!Array.isArray(review.sections)||review.sections.length<Math.ceil(review.duration/30))errors.push('One critical review section is required for each ~30s of film.');
 else for(const sec of review.sections){if(typeof sec.action!=='string'||sec.action.trim().length<20||typeof sec.risk!=='string'||sec.risk.trim().length<20)errors.push('Each section needs a substantial observed action and a specific remaining risk or verified fix.');}
 return {pass:errors.length===0,errors};
}
export function runCli(args=process.argv.slice(2)){
 const names=args.filter(x=>!x.startsWith('--')),flags=args.filter(x=>x.startsWith('--'));
 if(names.length!==1||flags.some(x=>!['--strict','--json'].includes(x)))throw Error('Usage: node scripts/review-film.mjs review.json [--strict] [--json]');
 const src=path.resolve(names[0]);const review=JSON.parse(fs.readFileSync(src,'utf8'));
 const relativeFile = f => fs.existsSync(path.isAbsolute(f)?f:path.resolve(path.dirname(src),f));
 const report=evaluateReview(review,{exists:relativeFile});
 if(flags.includes('--json'))console.log(JSON.stringify(report,null,2));else console.log(`${report.pass?'PASS':'NEEDS REVISION'}: editorial review evidence. ${report.errors.join(' | ')}`);
 if(flags.includes('--strict')&&!report.pass)process.exitCode=1;
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{runCli()}catch(e){console.error(e.message);process.exitCode=2;}}
