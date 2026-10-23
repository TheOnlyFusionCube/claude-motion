#!/usr/bin/env node
/** Scene-aware audit based on measurements from the exact renderer's storySample(t).
 * Prevents a moving tiny indicator or declared-but-unrendered camera from satisfying
 * the continuous-motion contract. Does not substitute for artistic visual review.
 */
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';

const hypot=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function intervals(chapters,duration){return chapters.map((x,i)=>({id:x.id,start:x.t,end:chapters[i+1]?.t??duration}));}
export function auditStage({duration,chapters,sample},{step=.25,minActor=85,minCamera=65,minLensRange=1.16}={}){
 const problems=[],warnings=[];
 if(!Number.isFinite(duration)||duration<=0||!Array.isArray(chapters)||chapters.length<2||typeof sample!=='function')
   return {pass:false,problems:['Expected multiple chapters, duration, and actual renderer sample(t).'],warnings};
 const shots=intervals(chapters,duration),records=[];
 const sampleTimes=Array.from({length:Math.ceil(duration/step)+1},(_,i)=>Math.min(duration,i*step));
 for(const t of sampleTimes){
  let r;try{r=sample(t)}catch(e){problems.push(`Renderer trace failed at ${t}: ${e.message}`);continue;}
  if(!r?.camera||!r?.actors||!Object.keys(r.actors).length) {problems.push(`Missing rendered actor/camera at ${t}s`);continue;}
  const c=r.camera;
  if(!Number.isFinite(c.cx)||!Number.isFinite(c.cy)||!(c.zoom>0)||!r.actors[c.follows])problems.push(`Camera is not attached to a rendered persistent actor at ${t}s`);
  if(Object.values(r.actors).some(x=>!Number.isFinite(x.x)||!Number.isFinite(x.y)))problems.push(`Invalid actor coordinates at ${t}s`);
  records.push(r);
 }
 if(problems.length) return {pass:false,problems,warnings};
 const names=Object.keys(records[0].actors);
 const shotStats=[];
 for(const shot of shots){
  const rows=records.filter(r=>r.t>=shot.start-1e-8&&r.t<=shot.end+1e-8);
  const id=rows[0]?.camera.follows;
  if(!id||!rows.every(r=>r.actors[id])){problems.push(`Shot ${shot.id} has no persistent hero`);continue;}
  const actorDistance=rows.slice(1).reduce((n,r,i)=>n+hypot(r.actors[id],rows[i].actors[id]),0);
  const cameraDistance=rows.slice(1).reduce((n,r,i)=>n+hypot({x:r.camera.cx,y:r.camera.cy},{x:rows[i].camera.cx,y:rows[i].camera.cy}),0);
  const activeEvents=new Set(rows.flatMap(r=>r.events??[]));
  if(actorDistance<minActor)problems.push(`Shot ${shot.id} contains little focal subject progress (${actorDistance.toFixed(0)} world px); a moving title is insufficient.`);
  if(cameraDistance<minCamera)problems.push(`Shot ${shot.id} has an effectively static camera (${cameraDistance.toFixed(0)} world px).`);
  if(!activeEvents.size)problems.push(`Shot ${shot.id} has no timed semantic action registered by the renderer.`);
  shotStats.push({id:shot.id,actorId:id,subjectProgress:+actorDistance.toFixed(1),cameraTravel:+cameraDistance.toFixed(1),events:[...activeEvents]});
 }
 const allZoom=records.map(r=>r.camera.zoom),ratio=Math.max(...allZoom)/Math.min(...allZoom);
 if(ratio<minLensRange)problems.push(`Camera maintains one nearly identical shot scale (lens range ${ratio.toFixed(2)}x), add justified wide/close/composition changes.`);
 for(let i=1;i<records.length;i++){
  const a=records[i-1],b=records[i];
  if(b.t-a.t<.001)continue;
  for(const id of names){
   if(!b.actors[id]){problems.push(`Subject ${id} disappears from the world graph at ${b.t}s`);continue;}
   const d=hypot(a.actors[id],b.actors[id]);
   if(d/(b.t-a.t)>1800)problems.push(`Subject ${id} teleports around ${b.t}s (${(d/(b.t-a.t)).toFixed(0)} world px/s).`);
  }
  const camRate=hypot({x:a.camera.cx,y:a.camera.cy},{x:b.camera.cx,y:b.camera.cy})/(b.t-a.t);
  if(camRate>2400)problems.push(`Camera jumps around ${b.t}s (${camRate.toFixed(0)} world px/s).`);
 }
 // Semantics alone cannot verify camera quality, actual visible subject legibility, or originality.
 warnings.push('Manual real-time playback and approved wide/close stills are still required; a valid spatial trace cannot establish film quality.');
 return {pass:problems.length===0,problems,warnings,stats:{shotStats,zoomRange:+ratio.toFixed(3),samples:records.length,persistentActors:names}};
}
export async function runCli(argv=process.argv.slice(2)){
 const flags=argv.filter(x=>x.startsWith('--')),args=argv.filter(x=>!x.startsWith('--'));
 if(args.length!==1||flags.some(x=>!['--strict','--json'].includes(x)))throw Error('Usage: node scripts/audit-stage.mjs ./assets/vanilla-film/src/scenes.mjs [--strict] [--json]');
 const mod=await import(pathToFileURL(path.resolve(args[0])).href);
 const report=auditStage({duration:mod.FILM?.duration,chapters:mod.FILM?.chapters,sample:mod.storySample});
 if(flags.includes('--json'))console.log(JSON.stringify(report,null,2));else {
  console.log(`${report.pass?'PASS':'NEEDS REVISION'}: renderer-linked stage audit, ${report.stats?.samples||0} frames`);
  for(const x of report.problems)console.log('ERROR: '+x);
  for(const x of report.warnings)console.log('REVIEW: '+x);
  for(const x of report.stats?.shotStats||[])console.log(`SHOT ${x.id}: actor ${x.actorId} ${x.subjectProgress} units, camera ${x.cameraTravel} units; ${x.events.join(', ')}`);
 }
 if(flags.includes('--strict')&&!report.pass)process.exitCode=1;
 return report;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))runCli().catch(e=>{console.error(e.message);process.exitCode=2;});
