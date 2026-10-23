import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePlan, ffmpegArgs } from '../scripts/assemble-film.mjs';
import { auditMetrics } from '../scripts/audit-video.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sample = path.join(root,'examples/city-data-film');
const data = JSON.parse(fs.readFileSync(path.join(sample,'data/network.json'),'utf8'));

function pythonHasPillow(){
  const r=spawnSync('python3',['-c','from PIL import Image, ImageDraw, ImageFont'],{timeout:10000});
  return r.status===0;
}

test('3D sample is synthetic, has stable unique source keys and source-linked logistics route',()=>{
  assert.match(data.disclaimer,/SYNTHETIC/i);
  assert.ok(data.hubs.length>=6);
  const ids=data.hubs.map(h=>h.id);assert.equal(new Set(ids).size,ids.length);
  for(const h of data.hubs){
    assert.ok(Number.isFinite(h.x)&&Number.isFinite(h.y));
    for(const x of ['start','trough','end']) assert.ok(Number.isFinite(h[x])&&h[x]>=0);
  }
  assert.ok(ids.includes(data.replenish.from)&&ids.includes(data.replenish.to));
  assert.ok(data.hubs.some(h=>h.trough===0&&h.critical));
});

test('Data-linked camera, clock, depletion and refill are seekable, numeric and synchronized', {skip:!pythonHasPillow()},()=>{
  const cmd=`import sys, json;sys.path.insert(0,${JSON.stringify(sample)});import build as x;hub=x.HUB_BY_ID['N-07'];c=x.Camera(3,640,360);d=x.Camera(14,640,360);print(json.dumps({'stock':[x.hub_availability(hub,t) for t in [3,14,21]],'clock':[x.clock_at(t) for t in [5,14,21]],'cam':[c.p(0,0,0),d.p(0,0,0)],'geo':[c.p(0,0,0),c.p(0,0,3)]}))`;
  const r=spawnSync('python3',['-c',cmd],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);
  const o=JSON.parse(r.stdout.trim());
  assert.deepEqual(o.stock,[18,0,12]);
  assert.deepEqual(o.clock,[360,490,540]);
  assert.notDeepEqual(o.cam[0],o.cam[1]);
  assert.notDeepEqual(o.geo[0],o.geo[1]);
});

test('Same timestamp renders byte-identical PNG in different seek order', {skip:!pythonHasPillow()},()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'city-frames-'));
  try{
    const render=times=>spawnSync('python3',[path.join(sample,'build.py'),'--stills',out,'--width','640','--times',times],{encoding:'utf8',timeout:45000});
    let r=render('3.5,12.5,18.5');assert.equal(r.status,0,r.stderr);
    const one=fs.readFileSync(path.join(out,'frame_01_12.50.png'));
    const other=fs.readFileSync(path.join(out,'frame_02_18.50.png'));
    assert.notDeepEqual(one,other);
    r=render('18.5,3.5,12.5');assert.equal(r.status,0,r.stderr);
    assert.deepEqual(one,fs.readFileSync(path.join(out,'frame_02_12.50.png')));
  } finally {fs.rmSync(out,{recursive:true,force:true});}
});

test('Hybrid film edit plan rejects invalid frames, volume gains and missing inputs',()=>{
  const plan={width:1920,height:1080,fps:30,shots:[{file:'a.mp4',duration:5},{file:'b.mp4',duration:4}]};
  assert.equal(validatePlan(plan).duration,9);
  assert.throws(()=>validatePlan({...plan,shots:[]}),/1–40/);
  assert.throws(()=>validatePlan({...plan,width:1919}),/resolution/);
  assert.throws(()=>validatePlan({...plan,audio:{scoreGain:4}}),/gain/);
  assert.throws(()=>ffmpegArgs('/tmp/nonexistent/edit.json','/tmp/output.mp4',plan),/Input file not found/);
});

test('Hybrid assembler emits a single, cut-edited video and synchronized mixed audio graph',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'launch-edl-'));
  try{
    for(const f of ['hook.mp4','ui.mp4','narration.wav','score.wav'])fs.writeFileSync(path.join(dir,f),'dummy');
    const plan={width:1920,height:1080,fps:30,
      shots:[{file:'hook.mp4',duration:4.5},{file:'ui.mp4',duration:8.25,start:1}],
      audio:{voice:'narration.wav',score:'score.wav',scoreGain:.18}};
    const o=ffmpegArgs(path.join(dir,'edit.json'),path.join(dir,'film.mp4'),plan);
    assert.equal(o.duration,12.75);
    assert.equal(o.hasVoice,true);
    assert.equal(o.hasScore,true);
    const graph=o.args[o.args.indexOf('-filter_complex')+1];
    assert.match(graph,/concat=n=2:v=1:a=0/);
    assert.match(graph,/amix=inputs=2/);
    assert.match(graph,/trim=start=1:duration=8.25/);
    assert.match(graph,/volume=0.18/);
    assert.match(o.args.join(' '),/1920:1080/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('Strict launch delivery can require audio independently from imagery',()=>{
  const intervals=Array.from({length:11},(_,i)=>({start:i,end:i+1,strongChangeFraction:0.1}));
  const noAudio=auditMetrics({width:1920,height:1080,duration:12,hasAudio:false,intervals,mode:'launch',requireAudio:true});
  assert.equal(noAudio.pass,false);
  assert.match(noAudio.problems.join(' '),/audio track is required/);
  const withAudio=auditMetrics({width:1920,height:1080,duration:12,hasAudio:true,intervals,mode:'data-story',requireAudio:true});
  assert.equal(withAudio.pass,true);
});

test('SKILL makes 3D data route and hybrid launch editing mandatory for reference-style tasks',()=>{
  const skill=fs.readFileSync(path.join(root,'SKILL.md'),'utf8');
  assert.match(skill,/3d-data-films\.md/);
  assert.match(skill,/launch-film\.md/);
  assert.match(skill,/assemble-film\.mjs/);
  assert.match(skill,/examples\/city-data-film/);
});

test('FFmpeg integration joins two real clips and mixes two genuine audio inputs', {skip:spawnSync('ffmpeg',['-version'],{timeout:3000}).status!==0},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'launch-mux-'));
  function run(args){const r=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args],{timeout:30000,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  try{
    run(['-f','lavfi','-i','color=c=0x345678:s=320x240:d=1:r=24','-frames:v','24',path.join(dir,'a.mp4')]);
    run(['-f','lavfi','-i','color=c=0x506079:s=320x240:d=1:r=24','-frames:v','24',path.join(dir,'b.mp4')]);
    run(['-f','lavfi','-i','sine=frequency=440:duration=2',path.join(dir,'voice.wav')]);
    run(['-f','lavfi','-i','sine=frequency=110:duration=2',path.join(dir,'score.wav')]);
    const edit={width:320,height:240,fps:24,shots:[{file:'a.mp4',duration:1},{file:'b.mp4',duration:1}],audio:{voice:'voice.wav',score:'score.wav',scoreGain:.18}};
    fs.writeFileSync(path.join(dir,'edit.json'),JSON.stringify(edit));
    const r=spawnSync('node',[path.join(root,'scripts/assemble-film.mjs'),path.join(dir,'edit.json'),'--out',path.join(dir,'out.mp4')],{timeout:60000,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);
    const p=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',path.join(dir,'out.mp4')],{timeout:8000,encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);
    const j=JSON.parse(p.stdout);
    assert.deepEqual(j.streams.map(s=>s.codec_type),['video','audio']);
    assert.ok(Math.abs(Number(j.format.duration)-2)<.15);
  } finally{fs.rmSync(dir,{recursive:true,force:true});}
});
