#!/usr/bin/env node
/** Offline render of the retained Canvas2D stage through a lightweight SVG recorder.
 * No Chrome or local HTTP server required. Supports only primitives used by this starter;
 * for general Canvas compositing, use scripts/export.mjs with Chromium instead.
 * Optional dependency: sharp (`npm install --no-save sharp`) and FFmpeg for MP4 output.
 */
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {FILM,drawFrame} from '../assets/vanilla-film/src/scenes.mjs';

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const mul=(a,b)=>[
 a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
 a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
 a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]
];
const fmt=n=>Number(n.toFixed(4));
const defaultState=()=>({transform:[1,0,0,1,0,0],fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalAlpha:1,font:'16px Arial',textAlign:'left',textBaseline:'alphabetic',shadowColor:'transparent',shadowBlur:0});

export class SvgContext {
  constructor(width,height){this.width=width;this.height=height;this.state=defaultState();this.stack=[];this.shapes=[];this.path='';}
  get fillStyle(){return this.state.fillStyle;}set fillStyle(v){this.state.fillStyle=v;}
  get strokeStyle(){return this.state.strokeStyle;}set strokeStyle(v){this.state.strokeStyle=v;}
  get lineWidth(){return this.state.lineWidth;}set lineWidth(v){this.state.lineWidth=v;}
  get globalAlpha(){return this.state.globalAlpha;}set globalAlpha(v){this.state.globalAlpha=v;}
  get font(){return this.state.font;}set font(v){this.state.font=v;}
  get textAlign(){return this.state.textAlign;}set textAlign(v){this.state.textAlign=v;}
  get textBaseline(){return this.state.textBaseline;}set textBaseline(v){this.state.textBaseline=v;}
  get globalCompositeOperation(){return this.state.globalCompositeOperation;}set globalCompositeOperation(v){this.state.globalCompositeOperation=v;}
  get shadowBlur(){return this.state.shadowBlur;}set shadowBlur(v){this.state.shadowBlur=v;}
  get shadowColor(){return this.state.shadowColor;}set shadowColor(v){this.state.shadowColor=v;}
  save(){this.stack.push({...this.state,transform:[...this.state.transform]});}
  restore(){if(!this.stack.length)throw Error('unmatched restore');this.state=this.stack.pop();}
  setTransform(a,b,c,d,e,f){this.state.transform=[a,b,c,d,e,f];}
  translate(x,y){this.state.transform=mul(this.state.transform,[1,0,0,1,x,y]);}
  scale(x,y=x){this.state.transform=mul(this.state.transform,[x,0,0,y,0,0]);}
  rotate(r){const c=Math.cos(r),s=Math.sin(r);this.state.transform=mul(this.state.transform,[c,s,-s,c,0,0]);}
  clearRect(){ /* Drawing starts with an empty SVG tree. */ }
  attrs(){return `transform="matrix(${this.state.transform.map(fmt).join(' ')})" opacity="${fmt(this.state.globalAlpha)}"`;}
  fillRect(x,y,w,h){if(w<=0||h<=0)return;this.shapes.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${esc(this.fillStyle)}" ${this.attrs()}/>`);}
  strokeRect(x,y,w,h){this.shapes.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="none" stroke="${esc(this.strokeStyle)}" stroke-width="${fmt(this.lineWidth)}" ${this.attrs()}/>`);}
  beginPath(){this.path='';}
  moveTo(x,y){this.path+=`M${fmt(x)} ${fmt(y)} `;}
  lineTo(x,y){this.path+=`L${fmt(x)} ${fmt(y)} `;}
  closePath(){this.path+='Z ';}
  arc(x,y,r,start,end,ccw=false){if(r<=0)return;const full=Math.abs(end-start)>=Math.PI*2-1e-6;const delta=full?(ccw?-Math.PI*2:Math.PI*2):(end-start);const n=Math.max(5,Math.ceil(Math.abs(delta)/(Math.PI/18)));for(let i=0;i<=n;i++){const a=start+delta*i/n;const pt=[fmt(x+r*Math.cos(a)),fmt(y+r*Math.sin(a))];this.path+=`${i===0?'M':'L'}${pt[0]} ${pt[1]} `;}if(full)this.closePath();}
  fill(){if(this.path)this.shapes.push(`<path d="${this.path}" fill="${esc(this.fillStyle)}" ${this.attrs()}/>`);}
  stroke(){if(this.path)this.shapes.push(`<path d="${this.path}" fill="none" stroke="${esc(this.strokeStyle)}" stroke-width="${fmt(this.lineWidth)}" stroke-linejoin="round" stroke-linecap="round" ${this.attrs()}/>`);}
  fillText(value,x,y){const m=String(this.font).match(/(?:(\d{3})\s+)?([\d.]+)px\s+(.+)/);const weight=m?.[1]||'400',size=m?.[2]||'16',family=(m?.[3]||'Arial').split(',')[0];const anchor=this.textAlign==='right'?'end':this.textAlign==='center'?'middle':'start';this.shapes.push(`<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" font-family="${esc(family)}" fill="${esc(this.fillStyle)}" ${this.attrs()}>${esc(value)}</text>`);}
  measureText(value){return {width:String(value).length*16};}
  svg(){if(this.stack.length)throw Error('Unbalanced Canvas save/restore');return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}"><g>${this.shapes.join('')}</g></svg>`;}
}

export function svgFrame(t){const ctx=new SvgContext(FILM.width,FILM.height);drawFrame(ctx,t);return ctx.svg();}
function sharpLib(){const require=createRequire(import.meta.url);for(const root of [process.cwd(),path.resolve(path.dirname(process.execPath),'../lib/node_modules')]){
 try{return require(require.resolve('sharp',{paths:[root]}));}catch{} }
 throw Error('Sharp not found: npm install --no-save sharp (for headless SVG→PNG offline render)');
}
function parse(args){const o={};for(let i=0;i<args.length;i++){
 const k=args[i];if(!['--out','--fps','--scale','--still','--end','--audio'].includes(k)||!args[i+1])throw Error('Usage: node scripts/render-stage.mjs --out output.png|film.mp4 [--still 6.0] [--fps 24] [--scale .5] [--end 14] [--audio soundtrack.wav]');o[k.slice(2)]=args[++i];}if(!o.out)throw Error('--out required');return o;}
async function main(){const o=parse(process.argv.slice(2)),sharp=sharpLib(),scale=Number(o.scale||.6),fps=Number(o.fps||24),end=Number(o.end||FILM.duration);
 if(!(scale>0&&scale<=2&&fps>=1&&fps<=60&&end>0&&end<=FILM.duration))throw Error('Invalid scale, fps or end');
 const width=2*Math.round(FILM.width*scale/2),height=2*Math.round(FILM.height*scale/2);
 const frame=async t=>sharp(Buffer.from(svgFrame(t))).resize(width,height,{fit:'fill'}).png().toBuffer();
 await fs.mkdir(path.dirname(path.resolve(o.out)),{recursive:true});
 if(o.still!==undefined){const png=await frame(Number(o.still));await fs.writeFile(o.out,png);console.log(`PNG ${o.out} ${width}x${height}`);return;}
 const total=Math.round(end*fps),argv=['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0'];
 if(o.audio)argv.push('-i',path.resolve(o.audio),'-map','0:v:0','-map','1:a:0','-c:a','aac','-b:a','160k','-shortest');
 argv.push('-frames:v',String(total),'-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',path.resolve(o.out));
 const child=spawn('ffmpeg',argv,{stdio:['pipe','ignore','pipe']});let err='';child.stderr.on('data',c=>err+=String(c));
 for(let i=0;i<total;i++){const png=await frame(i/fps);if(!child.stdin.write(png))await once(child.stdin,'drain');if(i%Math.max(1,Math.round(fps*2))===0)console.log(`Rendered ${i}/${total} frames`);}child.stdin.end();
 const [code]=await once(child,'close');if(code!==0)throw Error(`FFmpeg failed (${code}): ${err.slice(-1000)}`);
 console.log(`MP4 ${o.out} ${width}x${height}, ${fps}fps, ${total} frames`);
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error(e.message);process.exitCode=1;});
