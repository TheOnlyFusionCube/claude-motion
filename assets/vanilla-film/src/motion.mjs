/** Pure timeline helpers. No hidden mutable clock. */
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const clamp01 = x => clamp(x, 0, 1);
export const segment = (t, a, b) => b <= a ? Number(t >= b) : clamp01((t - a) / (b - a));
export const lerp = (a, b, p) => a + (b - a) * p;
export const out = p => 1 - (1 - clamp01(p)) ** 3;
export const inOut = p => { const x = clamp01(p); return x * x * (3 - 2 * x); };
export const backOut = (p, s = 1.55) => { const x = clamp01(p) - 1; return 1 + (s + 1) * x ** 3 + s * x ** 2; };
export const motion = (t, a, b) => out(segment(t, a, b));

/** Repeatable, frame-independent number in [0,1). */
export function random01(seed) {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function roundRect(c, x, y, w, h, r, fill) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

export function text(c, value, x, y, size, color, weight = 600, align = 'left') {
  c.save();
  c.fillStyle = color;
  c.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillText(value, x, y);
  c.restore();
}

export function line(c, x1, y1, x2, y2, color, w = 2) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = color; c.lineWidth = w; c.stroke();
}

/** Additional pure counterparts to the Motion reference's common kit helpers.
 *  Names are deliberately not kit.*: that private runtime is not included.
 */
export const easeIn = p => clamp01(p) ** 3;
export const expoOut = p => { const x = clamp01(p); return x === 1 ? 1 : 1 - 2 ** (-10*x); };
export const breathe = (t, amount = .012, period = 3.2) => 1 + amount * Math.sin(2 * Math.PI * t / period);
export const boilVariant = (t, rate = 12, count = 3) => ((Math.floor(Math.max(0,t) * rate) % count) + count) % count;

/** Pure camera keyframe evaluator (source `kit.Camera`-inspired, not API-identical).
 *  Keys: {t,cx,cy,z,hold?,from?,cut?,drift?: [dxPerSecond,dyPerSecond,dLogZoomPerSecond]}
 *  Interpolate zoom logarithmically; slow drifts continue during holds.
 */
export function cameraAt(keys, t) {
  if (!Array.isArray(keys) || !keys.length) throw new Error('cameraAt needs one or more camera keys.');
  if (keys.some(k => !(k.z > 0))) throw new Error('Camera zoom z must be positive.');
  const drifting = (k, seconds) => {
    const [dx,dy,dz] = k.drift || [0,0,0];
    const dt = Math.max(0, seconds);
    return {cx:k.cx+dx*dt, cy:k.cy+dy*dt, z:k.z*Math.exp(dz*dt)};
  };
  if (t <= keys[0].t) return {cx:keys[0].cx,cy:keys[0].cy,z:keys[0].z};
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i-1], b = keys[i];
    if (t >= b.t) continue;
    const from = b.from ?? a.t + (a.hold ?? 0);
    if (b.cut || t < from) return drifting(a,t-a.t);
    const p = inOut(segment(t, from, b.t));
    const start = drifting(a,from-a.t);
    return {cx:lerp(start.cx,b.cx,p),cy:lerp(start.cy,b.cy,p),z:Math.exp(lerp(Math.log(start.z),Math.log(b.z),p))};
  }
  const last = keys.at(-1);
  return drifting(last,t-last.t);
}

/** Time-only typist: stable jittered character reveal independent of seek order. */
export function typist(value, start, cps = 24, seed = 7) {
  if (!(cps > 0) || !Number.isFinite(start)) throw new Error('typist needs a start time and positive cps.');
  const string = String(value);
  const times = [];
  let at = start;
  for (let i = 0; i < string.length; i++) {
    at += (1 + (random01(seed + i*17) -.5)*.30) / cps;
    times.push(at);
  }
  const count = t => {
    let lo=0, hi=times.length;
    while (lo < hi) { const mid = (lo+hi)>>1; if (times[mid] <= t) lo=mid+1; else hi=mid; }
    return lo;
  };
  return {times, end: at, count, at: t => string.slice(0,count(t))};
}

/** Word-by-word entrance from a single side, inspired by source TextFx. */
export function wordEntrance(line, t, t0, {stagger = .11, dur = .5, dx = 26} = {}) {
  return String(line).split(/\s+/).filter(Boolean).map((word,i) => {
    const p = out(segment(t, t0 + i*stagger, t0 + i*stagger + dur));
    return {word, opacity:p, dx:(1-p)*dx};
  });
}

/** Camera-space cursor follows an eased arc; click halo uses absolute timestamps. */
export function cursorAt(keys, clicks, t, clickDuration = .12) {
  if (!Array.isArray(keys) || !keys.length) return {x:0,y:0,visible:false,click:0};
  let x=keys[0].x, y=keys[0].y;
  for (let i = 1; i < keys.length; i++) {
    const a=keys[i-1], b=keys[i];
    if (t < a.t) break;
    if (t >= b.t) {x=b.x; y=b.y; continue;}
    const p=inOut(segment(t,a.t,b.t));
    const dx=b.x-a.x,dy=b.y-a.y;
    const bow=(b.bow ?? .12)*Math.hypot(dx,dy)*Math.sin(Math.PI*p);
    const d=Math.hypot(dx,dy)||1;
    x=lerp(a.x,b.x,p)-dy/d*bow;
    y=lerp(a.y,b.y,p)+dx/d*bow;
    break;
  }
  const times=clicks||[];
  const active=times.find(c=>t>=c && t<c+clickDuration);
  return {x,y,visible:t>=keys[0].t,click: active===undefined ? 0 : segment(t,active,active+clickDuration)};
}

/** Deterministic 5–7 point cut-paper shape and equal-vertex morph. */
export function paperPolygon(seed, vertices=7, irregularity=.28) {
  if (!Number.isInteger(vertices) || vertices<3 || vertices>32) throw new Error('paperPolygon requires 3–32 vertices.');
  return Array.from({length:vertices},(_,i)=>{
    const theta=2*Math.PI*(i/vertices)-Math.PI/2;
    const r=1+(random01(seed+i*71)-.5)*2*irregularity;
    return [Math.cos(theta)*r,Math.sin(theta)*r];
  });
}
export function morphPolygon(from,to,p) {
  if (from.length!==to.length) throw new Error('To morph paper shapes, use an equal number of vertices.');
  return from.map((pt,i)=>[lerp(pt[0],to[i][0],clamp01(p)),lerp(pt[1],to[i][1],clamp01(p))]);
}
