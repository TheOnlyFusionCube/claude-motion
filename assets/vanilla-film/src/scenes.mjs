/** Production starter: one retained scene and a subject-led camera, not a slideshow.
 * Film is a pure function of seconds t. Edit WORLD, props and chapter action timings.
 * The three chapters are beats within the SAME spatial world, not full-screen slides.
 */
import {segment, lerp, inOut, out, clamp01, text, line, roundRect} from './motion.mjs';
import {createWorld} from './world.mjs';

export const FILM=Object.freeze({title:'Follow the signal',width:1920,height:1080,fps:30,duration:14,
  chapters:[{id:'request',t:0,label:'THE REQUEST'},{id:'memory',t:3.4,label:'INSIDE THE PROCESS'},{id:'recovery',t:9.6,label:'THE FIX'}]});

const EVENTS=Object.freeze([
  {id:'request-enters',start:0,end:3.4,kind:'transfer',actor:'signal'},
  {id:'heap-overflow',start:3.4,end:6.7,kind:'state-change',actor:'signal'},
  {id:'corruption-contained',start:6.7,end:9.6,kind:'repair',actor:'signal'},
  {id:'verified',start:9.6,end:14,kind:'result',actor:'signal'},
]);
export const WORLD=createWorld({width:FILM.width,height:FILM.height,
 actors:{signal:{ease:'linear',path:[{t:0,x:100,y:525},{t:3.4,x:1180,y:525},{t:6.7,x:2250,y:525},{t:9.6,x:3120,y:525},{t:14,x:3960,y:525}]}},
 camera:{follow:'signal',keys:[{t:0,offsetX:350,offsetY:-30,zoom:1.03},{t:2.4,offsetX:220,offsetY:-50,zoom:1.17},{t:4.2,offsetX:175,offsetY:-70,zoom:1.54},{t:6.4,offsetX:135,offsetY:-40,zoom:1.76},{t:8.8,offsetX:230,offsetY:-55,zoom:1.22},{t:11.2,offsetX:245,offsetY:-35,zoom:1.47},{t:14,offsetX:270,offsetY:-40,zoom:1.07}]},
 chapters:FILM.chapters,events:EVENTS});

const C={bg:'#0A1423',floor:'#132439',floorAlt:'#0E1D30',ink:'#F9F4E8',muted:'#9AABBE',cyan:'#6DE1DF',orange:'#F9B777',red:'#FF7B81',green:'#8FF1B0',rule:'#34506A'};
const ease=(t,a,b)=>inOut(segment(t,a,b));
const wave=(x)=>Math.sin(x);
const worldText=(g,s,x,y,size,color=C.ink,weight=600)=>text(g,s,x,y,size,color,weight);
const pill=(g,s,x,y,accent=C.cyan)=>{g.save();g.strokeStyle=accent;g.lineWidth=2;g.strokeRect(x-14,y-41,Math.max(125,s.length*18+25),56);worldText(g,s,x,y,25,accent,700);g.restore();};

function grid(g,t){
  g.fillStyle=C.bg;g.fillRect(-1300,-1300,7600,3700);
  g.lineWidth=1.3;g.strokeStyle='#23374C';
  for(let x=-1000;x<6400;x+=145){g.beginPath();g.moveTo(x,110);g.lineTo(x,1020);g.stroke();}
  for(let y=160;y<1000;y+=105){g.beginPath();g.moveTo(-1200,y);g.lineTo(6100,y);g.stroke();}
  // A world anchored backbone—the *same route* throughout the journey.
  g.strokeStyle='#355975';g.lineWidth=8;g.beginPath();g.moveTo(-500,525);g.lineTo(4700,525);g.stroke();
  g.strokeStyle=C.cyan;g.lineWidth=2;
  const front=t*340;
  for(let k=-1;k<26;k++){
    let x=(front+k*240)%5550;
    if(x<0)x+=5550;
    g.beginPath();g.moveTo(x-54,525);g.lineTo(x+35,525);g.stroke();
  }
}
function facility(g,x,y,type,t){
  g.save();g.translate(x,y);
  const glow=type==='heap'?(t>=5.8&&t<8.8?C.red:C.orange):type==='patch'?C.green:C.cyan;
  if(type==='browser'){
    // A browser *portal*, drawn as staggered sheets of folded glass.
    for(let j=2;j>=0;j--){
      const xx=-140+j*28,yy=-180+j*16;
      g.fillStyle=j===0?'#152D44':'#102137';
      g.strokeStyle=j===0?C.cyan:'#2E5866';g.lineWidth=j===0?5:2;
      g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+260,yy);g.lineTo(xx+260,yy+340);g.lineTo(xx,yy+340);g.closePath();g.fill();g.stroke();
      g.fillStyle='#315C66';g.fillRect(xx+20,yy+26,130,4);
      g.fillStyle='#8ADBD3';for(let q=0;q<3;q++){g.beginPath();g.arc(xx+23+q*26,yy+15,5,0,6.284);g.fill();}
    }
    g.strokeStyle=C.cyan;g.lineWidth=8;g.beginPath();g.moveTo(-60,70);g.lineTo(10,70);g.lineTo(36,44);g.stroke();
    g.beginPath();g.moveTo(10,42);g.lineTo(38,42);g.lineTo(38,70);g.stroke();
  } else if(type==='engine'){
    // Kinetic turbine: counter-rotating arcs and a real center that the signal traverses.
    for(let i=5;i>=0;i--){const r=74+i*30;
      arc(g,0,0,r,-2.8+t*.10+i*.42,1.3+t*.10+i*.42,i%2?C.cyan:'#42758C',i%2?8:4);
      arc(g,0,0,r,2.0-t*.15+i*.22,3.5-t*.15+i*.22,'#A6D6E0',i%2?2:5);
    }
    g.fillStyle='#12293E';g.beginPath();g.arc(0,0,100,0,Math.PI*2);g.fill();
    g.strokeStyle=C.cyan;g.lineWidth=8;g.beginPath();g.arc(0,0,100,0,Math.PI*2);g.stroke();
    for(let j=0;j<8;j++){const a=j*Math.PI/4+t*.25;g.fillStyle=j%2?C.orange:C.cyan;g.fillRect(Math.cos(a)*74-5,Math.sin(a)*74-5,10,10);}
  } else if(type==='heap'){
    // Layered physical memory columns. Failure travels through *those same cells*.
    for(let i=0;i<14;i++){
      const c=i<9?'#31576B':(t>=6.1&&t<9.7?C.red:C.orange);
      const yy=(i%3)*13;
      g.fillStyle='#142A3D';g.strokeStyle=c;g.lineWidth=3;
      g.fillRect(-215+i*31,-200+yy,23,348-yy);
      g.strokeRect(-215+i*31,-200+yy,23,348-yy);
      g.fillStyle=c;g.fillRect(-212+i*31,-196+yy,17,10+Math.max(0,Math.sin(t*2+i))*.5*100);
    }
    g.strokeStyle=C.red;g.lineWidth=7;
    const p=segment(t,6.2,8.2);
    if(p>0&&p<1){g.beginPath();g.moveTo(-108,-242);g.lineTo(-108+p*250,-242);g.lineTo(-108+p*250,-170);g.stroke();}
    g.fillStyle=t>9.7?C.green:C.orange;g.fillRect(-228,182,470,8);
  } else if(type==='patch'){
    // Not another panel: a wide concentric verifier and convergence aperture.
    for(let i=0;i<4;i++){
      const r=98+i*45;g.strokeStyle=i===0?C.green:'#3C806E';g.lineWidth=12-i*2;
      arc(g,0,0,r,-Math.PI*.79+i*.11,Math.PI*.8+i*.13,g.strokeStyle,g.lineWidth);
    }
    g.fillStyle='#12352D';g.beginPath();g.arc(0,0,92,0,Math.PI*2);g.fill();
    g.strokeStyle=C.green;g.lineWidth=15;g.beginPath();g.moveTo(-52,-4);g.lineTo(-15,36);g.lineTo(67,-45);g.stroke();
    const p=segment(t,11.1,13.9);
    for(let i=0;i<9;i++){let a=i*6.28/9;const x=Math.cos(a)*(160+65*p),yy=Math.sin(a)*(160+65*p);g.fillStyle=C.green;g.globalAlpha=.18+.5*p;g.fillRect(x-4,yy-4,8,8);}g.globalAlpha=1;
  }
  g.restore();
  const titles={browser:['01 / SEND','BROWSER → NETWORK'],engine:['02 / EXECUTE','PHP WORKER / RUNTIME'],heap:['03 / TRACE','ADDRESS SPACE / HEAP'],patch:['04 / RECOVER','PATCH + VERIFY']};
  const [headline,detail]=titles[type];
  worldText(g,headline,x-166,y-298,37,C.ink,700);
  g.strokeStyle=glow;g.lineWidth=4;g.beginPath();g.moveTo(x-164,y-275);g.lineTo(x+150,y-275);g.stroke();
  worldText(g,detail,x-164,y+327,25,C.muted,500);
}
function flowNodes(g,t){
  // Object relationships are spatial. The camera flies through them, never cuts to a new panel.
  facility(g,420,550,'browser',t);
  facility(g,1530,550,'engine',t);
  facility(g,2560,550,'heap',t);
  facility(g,3700,550,'patch',t);
  for (const [x,label,color] of [[930,'INPUT BUFFER',C.cyan],[2050,'ADDRESS SPACE',C.orange],[3150,'PATCH BOUNDARY',C.green]]){
    g.strokeStyle='#49677B';g.lineWidth=2;g.beginPath();g.moveTo(x,430);g.lineTo(x,195);g.stroke();
    g.fillStyle=color;g.fillRect(x-10,185,20,20);worldText(g,label,x+28,201,25,C.muted,500);
  }
  // Memory cells: an *actual* altered state (one becomes compromised and is repaired).
  const reveal=segment(t,4.0,5.1),alert=segment(t,6.1,7.4),restore=segment(t,9.6,11.0);
  for(let i=0;i<17;i++){
    const x=2320+i*28,y=910+Math.sin(i*.4)*15;
    if(t<3.5||x>4000)continue;
    let col='#355872';
    if(i<=Math.floor(16*reveal))col=i<9?C.cyan:C.orange;
    if(i>=9&&i<=12&&alert>.45&&restore<.8)col=C.red;
    if(restore>.8)col=C.green;
    g.fillStyle=col;g.fillRect(x,y,18,65+(i%4)*20);
  }
}
function arc(g,x,y,r,start,end,color,width=3){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.arc(x,y,r,start,end);g.stroke();}
function subject(g,t){
  const p=WORLD.actorAt('signal',t),scale=1+.08*Math.sin(t*4.7);
  const alert=segment(t,5.7,6.6)*(1-segment(t,9.35,10.2));
  const glow=alert>.6?C.red:t>11?C.green:C.cyan;
  g.save();g.translate(p.x,p.y);g.scale(scale,scale);
  g.shadowColor=glow;g.shadowBlur=65;g.fillStyle=glow;
  g.beginPath();g.arc(0,0,33,0,Math.PI*2);g.fill();g.shadowBlur=0;
  g.strokeStyle=C.bg;g.lineWidth=7;g.beginPath();g.arc(0,0,15,-2.5,1.8);g.stroke();
  g.strokeStyle=glow;
  for(let i=0;i<3;i++)arc(g,0,0,50+i*20,Math.PI*segment(t*2.1+i,0,2),Math.PI*(segment(t*2.1+i,0,2)+.4),glow,3);
  g.restore();
  // The kinetic subject is the meaning; the caption follows its real world anchor.
  const label=t<3.4?'REQUEST':t<5.8?'EXECUTING':t<9.6?'TRACE':t<11.5?'PATCHING':'VERIFIED';
  worldText(g,label,p.x+62,p.y-46,24,glow,700);
}
function drawNarrativeHUD(g,t){
  const chapter=FILM.chapters.filter(x=>x.t<=t).at(-1);
  g.fillStyle='#091421';g.fillRect(0,0,1920,106);g.fillRect(0,990,1920,90);
  text(g,'SIGNAL  /  A MOTION STUDY',110,69,28,C.ink,700);
  text(g,'ONE REQUEST. ONE CONTINUOUS WORLD.',1808,69,22,C.muted,600,'right');
  line(g,110,92,1810,92,C.rule,2);
  const name=t<3.4?'THE REQUEST':t<9.6?'INSIDE THE PROCESS':'THE RECOVERY';
  text(g,chapter.id.toUpperCase()+'  /  '+name,110,1046,28,C.ink,600);
  text(g,'CHAPTER '+String(FILM.chapters.indexOf(chapter)+1).padStart(2,'0')+'   •   '+t.toFixed(1)+'s',1810,1046,23,C.muted,600,'right');
  g.fillStyle=C.cyan;g.fillRect(0,1076,1920*clamp01(t/FILM.duration),4);
}
export function storySample(t){return WORLD.trace(t);}
const scoreEvents=[
  {kind:'note',t:0,dur:6,pitch:'D3',instrument:'pad',vel:.07},
  {kind:'note',t:3.4,dur:5,pitch:'A3',instrument:'pad',vel:.06},
  {kind:'note',t:9.6,dur:4.4,pitch:'G3',instrument:'pad',vel:.07},
  {kind:'fx',t:3.4,dur:.18,name:'whoosh',vel:.11},
  {kind:'fx',t:6.25,dur:.16,name:'click',vel:.13},
  {kind:'fx',t:9.6,dur:.18,name:'pop',vel:.13},
  {kind:'fx',t:13.5,dur:.6,name:'ding',vel:.07},
 ];
const notes=['D5','F5','A5','G5','E5','D5','C5'];
for(let i=0;i<16;i++)scoreEvents.push({kind:'note',t:.42+i*.81,dur:.38,pitch:notes[i%notes.length],instrument:'mallet',vel:i%4===0?.08:.044});
export const SCORE=Object.freeze({title:'Original soft cinematic pulse',events:Object.freeze(scoreEvents)});
export function drawFrame(g,t){
  const s=Math.max(0,Math.min(FILM.duration,t));
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  g.clearRect(0,0,FILM.width,FILM.height);
  // A single persistent world survives the whole timeline. No scene switching.
  WORLD.withCamera(g,s,ctx=>{grid(ctx,s);flowNodes(ctx,s);subject(ctx,s);});
  drawNarrativeHUD(g,s);
}
