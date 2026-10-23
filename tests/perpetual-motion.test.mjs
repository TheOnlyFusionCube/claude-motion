import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {heldPlate, uiHoldDrift, titleCreep, breathe} from '../assets/vanilla-film/src/motion.mjs';
import {evaluatePlan, uncoveredSpans} from '../scripts/validate-motion-plan.mjs';

const source = () => JSON.parse(readFileSync(new URL('../examples/continuous-motion/motion-plan.json', import.meta.url),'utf8'));

test('original source is explicit that everything is always in motion',()=>{
 const original=readFileSync(new URL('../references/upstream/motion.md', import.meta.url),'utf8');
 assert.match(original,/\*\*Everything is always in motion\.\*\*/);
 assert.match(original,/1.?3 % scale or 10.?30 px/);
 const active=readFileSync(new URL('../SKILL.md', import.meta.url),'utf8');
 assert.match(active,/references\/perpetual-motion\.md/);
 assert.match(active,/validate-motion-plan\.mjs/);
});

test('held camera plate progresses monotonically over the full hold, not oscillating',()=>{
 const first=heldPlate(0,{start:0,end:6,panX:24,panY:-6,zoomPct:.03});
 const last=heldPlate(6,{start:0,end:6,panX:24,panY:-6,zoomPct:.03});
 assert.deepEqual(first,{x:0,y:-0,scale:1});
 assert.ok(Math.abs(last.x-24)<1e-9);
 assert.equal(last.y,-6);
 assert.equal(last.scale,1.03);
 let prev=-1;
 for(let t=0;t<=6;t+=.125){const x=heldPlate(t,{start:0,end:6,panX:24,panY:-6,zoomPct:.03}).x;assert.ok(x>=prev-1e-8);prev=x;}
 assert.deepEqual(heldPlate(3,{start:0,end:6}),heldPlate(3,{start:0,end:6}));
});

test('title creep and ui drift are pure functions of absolute time',()=>{
 const a=titleCreep(2.5,{start:0,end:3});
 assert.equal(a,5);
 assert.equal(titleCreep(3.5,{start:0,end:3}),6);
 const x=uiHoldDrift(3,{start:2,end:6,dxPerSecond:6,zoomPerSecond:.006});
 assert.ok(x.scale>1&&x.x===6);
 uiHoldDrift(5,{start:2,end:6});uiHoldDrift(2,{start:2,end:6});
 assert.deepEqual(uiHoldDrift(3,{start:2,end:6,dxPerSecond:6,zoomPerSecond:.006}),x);
 assert.ok(Math.abs(breathe(2,.012,3)-1)>0);
 assert.throws(()=>heldPlate(3,{start:5,end:5}));
});

test('valid continuous-motion example has covered shots and a meaningful handoff',()=>{
 const r=evaluatePlan(source(),{strict:true});
 assert.equal(r.pass,true,r.errors.join('\n'));
 assert.equal(r.carrierGaps.length,0);
 assert.equal(r.focalGaps.length,0);
});

test('a slideshow plan with isolated entrances and no held motion is rejected',()=>{
 const p=source();
 p.tracks=p.tracks.filter(t=>t.role==='focal');
 p.tracks[0].end=1;
 p.tracks[1].start=6;p.tracks[1].end=6.6;
 p.tracks[2].start=13;p.tracks[2].end=13.4;
 const r=evaluatePlan(p,{strict:true});
 assert.equal(r.pass,false);
 assert.ok(r.errors.some(x=>x.includes('Dead-air')));
});

test('fade-only decoration and zero movement are not qualifying motion tracks',()=>{
 const p=source();p.tracks[0].movement='opacity';p.tracks[1].extent='0px';
 const r=evaluatePlan(p,{strict:true});
 assert.equal(r.pass,false);
 assert.match(r.errors.join(' '),/fade|opacity/);
 assert.match(r.errors.join(' '),/nonzero/);
});

test('semantic events cannot disappear for most of the film under a camera loop',()=>{
 const p=source();p.tracks=p.tracks.filter(t=>t.role==='carrier');
 const r=evaluatePlan(p,{strict:true});assert.equal(r.pass,false);
 assert.match(r.errors.join(' '),/focal action/);
});

test('time-interval coverage allows small cinematic holds but catches long gaps',()=>{
 assert.deepEqual(uncoveredSpans([{start:0,end:2},{start:2.3,end:3}],0,3,.5),[]);
 assert.deepEqual(uncoveredSpans([{start:0,end:1},{start:2,end:3}],0,3,.5),[{start:1,end:2,seconds:1}]);
});

// Integrated executable proof: the shipped MP4 must survive the same strict
// uninterrupted-motion audit as user films (when ffmpeg is available).
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ffmpegAvailable = spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status===0 && spawnSync('ffprobe',['-version'],{encoding:'utf8'}).status===0;
test('encoded continuity proof has audio, active images, and no 3s freeze', {skip:!ffmpegAvailable || !existsSync(new URL('../examples/continuous-motion/demo.mp4',import.meta.url))}, () => {
  const script=fileURLToPath(new URL('../scripts/audit-video.mjs',import.meta.url));
  const video=fileURLToPath(new URL('../examples/continuous-motion/demo.mp4',import.meta.url));
  const run=spawnSync(process.execPath,[script,video,'--mode','showreel','--continuous','--strict','--require-audio'],{encoding:'utf8',timeout:120000});
  assert.equal(run.status,0,run.stderr + '\n' + run.stdout);
  assert.match(run.stdout,/PASS:/);
});
