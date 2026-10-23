#!/usr/bin/env node
/** Join real screen captures + authored video shots and optionally mix narration and score.
 * Requires only Node 22+, ffmpeg/ffprobe. Film plan uses paths relative to itself.
 * Cut-based editing preserves each source's duration and avoids mysterious scene fades.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const USAGE = 'Usage: node scripts/assemble-film.mjs path/to/plan.json --out ./movie.mp4 [--dry-run]\nPlan: {"fps":30,"width":1920,"height":1080,"shots":[{"file":"clips/intro.mp4","duration":4,"start":0}],"audio":{"voice":"voice.wav","score":"score.wav","voiceGain":1,"scoreGain":0.23}}';

function positive(n, min=0) {return typeof n==='number'&&Number.isFinite(n)&&n>min;}
function escapeFilterPath(p) {return p.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/,/g,'\\,');}

export function validatePlan(plan) {
  if (!plan || typeof plan!=='object')throw new Error('Plan must be an object.');
  const {fps=30,width=1920,height=1080,shots,audio={}}=plan;
  if (!Number.isInteger(fps)||fps<12||fps>60)throw new Error('FPS must be 12–60.');
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<320||height<240||width%2||height%2||width>4096||height>4096)throw new Error('Invalid even output resolution.');
  if (!Array.isArray(shots)||shots.length<1||shots.length>40)throw new Error('Provide 1–40 shots.');
  let total=0;
  for(let i=0;i<shots.length;i++) {
    const shot=shots[i];
    if(!shot||typeof shot.file!=='string'||!shot.file||!positive(shot.duration)||shot.duration>300|| (shot.start!==undefined&&(!Number.isFinite(shot.start)||shot.start<0)))throw new Error(`Invalid shot ${i+1}; file, duration >0 and nonnegative start required.`);
    if(shot.id!==undefined&&typeof shot.id!=='string')throw new Error(`Invalid shot id ${i+1}`);
    total+=shot.duration;
  }
  if(total>3600)throw new Error('Output may not exceed one hour.');
  if(audio!==null){
    if(typeof audio!=='object')throw new Error('audio must be an object');
    for(const k of ['voice','score'])if(audio[k]!==undefined&&typeof audio[k]!=='string')throw new Error(`audio.${k} must be a path`);
    for(const k of ['voiceGain','scoreGain'])if(audio[k]!==undefined&&(!Number.isFinite(audio[k])||audio[k]<0||audio[k]>3))throw new Error(`audio.${k} gain must be between 0 and 3`);
  }
  return {fps,width,height,shots,audio:audio||{},duration:total};
}

function inputFile(base,filename) {
  const resolved=path.resolve(base,filename);
  if(!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())throw new Error(`Input file not found: ${resolved}`);
  return resolved;
}

export function ffmpegArgs(planPath,output,plan) {
  const p=validatePlan(plan);
  const base=path.dirname(path.resolve(planPath));
  const files=p.shots.map(x=>inputFile(base,x.file));
  const voice=p.audio.voice?inputFile(base,p.audio.voice):null;
  const score=p.audio.score?inputFile(base,p.audio.score):null;
  const inputs=files.map(f=>['-i',f]).flat();
  if(voice)inputs.push('-i',voice);
  if(score)inputs.push('-i',score);
  const fc=[];
  for(let i=0;i<p.shots.length;i++){
    const s=p.shots[i];
    fc.push(`[${i}:v]trim=start=${s.start??0}:duration=${s.duration},setpts=PTS-STARTPTS,fps=${p.fps},scale=${p.width}:${p.height}:force_original_aspect_ratio=decrease,pad=${p.width}:${p.height}:(ow-iw)/2:(oh-ih)/2:color=0x071120,setsar=1,format=yuv420p[v${i}]`);
  }
  fc.push(`${p.shots.map((_,i)=>`[v${i}]`).join('')}concat=n=${p.shots.length}:v=1:a=0[vout]`);
  const trackLabels=[];
  if(voice){
    fc.push(`[${files.length}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${p.audio.voiceGain??1}[voice]`);
    trackLabels.push('[voice]');
  }
  if(score){
    const index=files.length+(voice?1:0);
    fc.push(`[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${p.audio.scoreGain??0.22}[score]`);
    trackLabels.push('[score]');
  }
  if(trackLabels.length===1)fc.push(`${trackLabels[0]}atrim=0:${p.duration},asetpts=PTS-STARTPTS[aout]`);
  if(trackLabels.length===2)fc.push(`${trackLabels.join('')}amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,atrim=0:${p.duration},asetpts=PTS-STARTPTS[aout]`);
  const args=['-hide_banner','-y','-loglevel','error',...inputs,'-filter_complex',fc.join(';'),'-map','[vout]'];
  if(trackLabels.length)args.push('-map','[aout]','-c:a','aac','-b:a','192k');
  args.push('-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','18','-movflags','+faststart','-t',String(p.duration),path.resolve(output));
  return {args,duration:p.duration,sources:files,hasVoice:!!voice,hasScore:!!score};
}

function cli(argv){
  if(argv.includes('--help')||argv.includes('-h')){console.log(USAGE);return;}
  if(!argv.length)throw new Error(USAGE);
  const planPath=path.resolve(argv[0]);
  let out, dry=false;
  for(let i=1;i<argv.length;i++){
    if(argv[i]==='--out'){if(!argv[i+1])throw new Error('Missing --out file');out=argv[++i];}
    else if(argv[i]==='--dry-run')dry=true;
    else throw new Error('Unknown option '+argv[i]);
  }
  if(!out&&!dry)throw new Error('--out is required.');
  const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
  const job=ffmpegArgs(planPath,out||'dry-run.mp4',plan);
  console.log(`${dry?'Planned':'Assembling'} ${job.sources.length} shots, ${job.duration}s, voice ${job.hasVoice}, score ${job.hasScore}`);
  if(dry){console.log(JSON.stringify(job.args,null,2));return;}
  fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
  const p=spawnSync('ffmpeg',job.args,{encoding:'utf8',timeout:300000,maxBuffer:1024*1024});
  if(p.error)throw p.error;
  if(p.status!==0)throw new Error(`FFmpeg failed (${p.status}): ${p.stderr?.slice(-1300)}`);
  console.log('Wrote '+path.resolve(out));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{cli(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
