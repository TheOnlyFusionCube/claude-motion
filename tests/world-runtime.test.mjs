import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,keyed} from '../assets/vanilla-film/src/world.mjs';
import {FILM,WORLD,storySample,drawFrame} from '../assets/vanilla-film/src/scenes.mjs';
import {auditStage} from '../scripts/audit-stage.mjs';
import {SvgContext,svgFrame} from '../scripts/render-stage.mjs';
import {evaluatePlan} from '../scripts/validate-motion-plan.mjs';
import {auditMetrics} from '../scripts/audit-video.mjs';
import {readFileSync} from 'node:fs';

test('retained world has one persistent signal ID across all chapters and no teleport',()=>{
 const at=[0,3.4,6.7,9.6,14].map(t=>storySample(t));
 for(const t of at){assert.deepEqual(Object.keys(t.actors),['signal']);assert.equal(t.camera.follows,'signal');}
 assert.ok(at[0].actors.signal.x<at[1].actors.signal.x&&at[1].actors.signal.x<at[2].actors.signal.x);
 assert.ok(at.at(-1).camera.cx>at[0].camera.cx+3000);
 const p=storySample(6.5);storySample(14);storySample(0);assert.deepEqual(storySample(6.5),p);
 const left=WORLD.toScreen(420,550,1.2),right=WORLD.toScreen(420,550,7.0);
 assert.ok(left.x>right.x,'world anchored points remain in one coordinate system');
});

test('scene-aware trace accepts actual moving camera and subject with timed semantic states',()=>{
 const r=auditStage({duration:FILM.duration,chapters:FILM.chapters,sample:storySample});
 assert.equal(r.pass,true,r.problems.join('\n'));
 assert.ok(r.stats.shotStats.every(s=>s.cameraTravel>65&&s.subjectProgress>85));
 assert.ok(r.stats.zoomRange>1.16);
});

test('stationary diagram with tiny decorative tick is rejected even if a motion plan claims otherwise',()=>{
 const p={duration:14,chapters:[{id:'one',t:0},{id:'two',t:7}],sample:t=>({t,actors:{tick:{id:'tick',x:10+t%2,y:20}},camera:{cx:100,cy:100,zoom:1,follows:'tick'},events:['animated-border']})};
 const r=auditStage(p);
 assert.equal(r.pass,false);
 assert.match(r.problems.join(' '),/static camera|focal subject progress|shot scale/);
});

test('focal-only plan cannot masquerade as an unbroken motion carrier',()=>{
 const p=JSON.parse(readFileSync(new URL('../examples/continuous-motion/motion-plan.json',import.meta.url),'utf8'));
 p.tracks=p.tracks.filter(x=>x.role==='focal');
 const r=evaluatePlan(p,{strict:true});assert.equal(r.pass,false);
 assert.match(r.errors.join(' '),/No actual carrier|Dead-air/);
});

test('encoded motion concentrated in only 2% of the frame fails a 120s explainer release',()=>{
 const intervals=Array.from({length:247},(_,i)=>({start:i*.5,end:(i+1)*.5,strongChangeFraction:i%7===0?.058:.019,meanLumaDelta:1}));
 const r=auditMetrics({width:1920,height:1080,duration:124,hasAudio:true,intervals,mode:'launch',continuous:true});
 assert.equal(r.pass,false);
 assert.match(r.problems.join(' '),/fewer than 3% of pixels/);
});

test('SVG and Canvas output use the SAME deterministic stage renderer',()=>{
 const s=svgFrame(6.25);
 assert.match(s,/\<svg/);assert.match(s,/SIGNAL/);assert.match(s,/03 \/ TRACE/);
 const svg=new SvgContext(1920,1080);drawFrame(svg,6.25);
 assert.equal(svg.svg(),s);
 assert.equal(svgFrame(6.25),s);
 assert.notEqual(svgFrame(9.4),s);
});

test('camera/actor paths validate sorted keys and reject missing follow subject',()=>{
 assert.throws(()=>keyed([{t:2,x:3},{t:1,x:5}],1,['x']),/time-sorted/);
 assert.throws(()=>createWorld({width:100,height:100,actors:{p:{path:[{t:0,x:1,y:2},{t:1,x:3,y:4}]}},camera:{follow:'missing',keys:[]}}),/follow/);
});
