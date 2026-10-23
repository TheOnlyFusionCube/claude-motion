/** Retained world-space camera/actor runtime.
 * Portable Canvas2D equivalent of selected original Motion kit concepts (NOT kit API).
 * All positions, visibility and camera state are derived from absolute t; no mutable frame state.
 */
import {clamp, segment, lerp, inOut} from './motion.mjs';

const finite = x => typeof x === 'number' && Number.isFinite(x);
const copy = o => JSON.parse(JSON.stringify(o));

export function keyed(keys, t, names, {ease = true} = {}) {
  if (!Array.isArray(keys) || keys.length < 2 || keys.some(k => !finite(k.t)) || keys.some((k,i)=>i>0 && k.t<=keys[i-1].t))
    throw Error('At least two time-sorted, distinct keyframes are required.');
  const tt=clamp(t, keys[0].t, keys.at(-1).t);
  let j=1;
  while (j < keys.length-1 && tt > keys[j].t) j++;
  const a=keys[j-1], b=keys[j];
  const raw=segment(tt,a.t,b.t),p=ease?inOut(raw):raw;
  return Object.fromEntries(names.map(n=>{
    if(!finite(a[n])||!finite(b[n]))throw Error(`Bad keyframe component ${n}`);
    return [n, lerp(a[n],b[n],p)];
  }));
}

/** Create an authored, persistent scene and camera that survives shot/scene boundaries.
 * Actor path is world-space. Camera follows one declared actor; offsets and lens have their own keys.
 * Draw the entire world once per time, not one unrelated picture per chapter.
 */
export function createWorld({width,height,actors,camera,chapters=[],events=[]}){
  if(!finite(width)||!finite(height)||width<=0||height<=0)throw Error('Invalid stage dimensions');
  if(!actors||typeof actors!=='object'||Object.keys(actors).length<1)throw Error('Need named retained actors');
  if(!camera||!actors[camera.follow])throw Error('Camera must follow a real persistent actor ID');
  for(const [id,a] of Object.entries(actors)){
    if(!/^[a-z][a-z0-9-]*$/.test(id)||!Array.isArray(a.path))throw Error('Actor requires kebab-case id and path');
    keyed(a.path,a.path[0].t,['x','y']);
  }
  keyed(camera.keys,camera.keys[0].t,['offsetX','offsetY','zoom']);
  if(camera.keys.some(k=>!(k.zoom>0)))throw Error('Camera zoom must be positive');
  const names=Object.keys(actors),source={width,height,actors:copy(actors),camera:copy(camera),chapters:copy(chapters),events:copy(events)};
  const actorAt=(id,t)=>{
    if(!source.actors[id])throw Error(`Unknown actor ${id}`);
    const a=source.actors[id];
    const p=keyed(a.path,t,['x','y'],{ease:a.ease!=='linear'});
    return {id,...p,visible:t>=a.path[0].t&&t<=a.path.at(-1).t, state:typeof a.state==='string'?a.state:'live'};
  };
  const cameraAtTime=t=>{
    const target=actorAt(source.camera.follow,t);
    const k=keyed(source.camera.keys,t,['offsetX','offsetY','zoom']);
    return {cx:target.x+k.offsetX, cy:target.y+k.offsetY, zoom:k.zoom, follows:source.camera.follow};
  };
  const toScreen=(x,y,t)=>{const c=cameraAtTime(t);return {x:(x-c.cx)*c.zoom+width/2,y:(y-c.cy)*c.zoom+height/2};};
  const visible=(x,y,t,padding=200)=>{const p=toScreen(x,y,t);return p.x>-padding&&p.x<width+padding&&p.y>-padding&&p.y<height+padding;};
  const trace=t=>({t:+t.toFixed(5),camera:cameraAtTime(t),actors:Object.fromEntries(names.map(id=>[id,actorAt(id,t)])),chapter:source.chapters.filter(c=>c.t<=t).at(-1)?.id??null, events:source.events.filter(e=>e.start<=t&&e.end>=t).map(e=>e.id)});
  const withCamera=(ctx,t,draw)=>{
    const c=cameraAtTime(t);
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(c.zoom,c.zoom);ctx.translate(-c.cx,-c.cy);
    draw(ctx,c);
    ctx.restore();
  };
  return Object.freeze({actorAt,cameraAt:cameraAtTime,toScreen,visible,trace,withCamera,source:Object.freeze(source)});
}
