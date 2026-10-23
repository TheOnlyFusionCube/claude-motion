# Portable Motion rendering primitives (standalone reference)

The bundled `assets/vanilla-film/src/motion.mjs` exports **pure, local** functions derived from the behavioral intent of `upstream/film-api.md`. They have different names and no private dependency; they are **not** API-identical to the Anthropic `kit` runtime. Use them as building blocks when the user's project has no preexisting motion library.

| Local function | Purpose (original source concept) |
| --- | --- |
| `segment(t,a,b)`, `lerp(a,b,p)`, `out`, `easeIn`, `inOut`, `backOut`, `expoOut` | Segment timing/easings (`seg`, `lerp`, `eo`, `ei`, `eio`, `eob`, `eox`) |
| `cameraAt(keys,t)` | Camera keys `{t,cx,cy,z,hold,from,cut,drift}`; log-space zoom, easing and time-based drift (`kit.Camera`) |
| `typist(text,t0,cps,seed)` | Deterministic `times`, `count(t)`, `at(t)` for typing and aligned Foley (`kit.typist`) |
| `wordEntrance(line,t,t0,opts)` | One-direction, staggered word opacity and dx (`kit.TextFx`) |
| `cursorAt(keys,clicks,t)` | Time-indexed arced cursor plus precisely timed click progress (`kit.cursor`) |
| `heldPlate(t,{start,end,panX,panY,zoomPct})` | Smooth monotonic push/pan during a held image (source 1-3% zoom or 10-30px pan over hold) |
| `uiHoldDrift(t,{start,end,dxPerSecond,dyPerSecond,zoomPerSecond})` | Quiet UI-camera progression (source 0.3-2%/s) |
| `titleCreep(t,{start,end,pxPerSecond})` | Readable title gently creeps at about 2px/s for a hold |
| `breathe(t,amount,period)` | Subtle pure sinusoidal hold movement (`kit.breathe`) |
| `boilVariant(t,rate,count)` | Frozen seeded hand-drawn jitter variants by absolute frame time (marks) |
| `paperPolygon(seed,n,roughness)` + `morphPolygon(a,b,p)` | Cut-paper polygons and equal-vertex morphing (`kit.cutPaper`, `kit.polyLerp`) |
| `random01(seed)` | Repeatable seeded randomness, independent of render history |

Example, evaluated at **any arbitrary** time without previous frames:

```js
import {cameraAt, typist, wordEntrance, cursorAt, breathe} from './motion.mjs';
const cameraKeys = [
  {t:0,cx:960,cy:540,z:1,hold:2.5,drift:[0,0,.004]},
  {t:4,cx:1240,cy:640,z:2.1},
];
const typed = typist('A single useful action',4.4,23);
const pointerKeys = [
  {t:4.5,x:800,y:380},
  {t:5.2,x:1040,y:580,bow:.12},
];
export function sceneAt(t) {
  return {
    camera:cameraAt(cameraKeys,t),
    title:wordEntrance('See the result',t,-.5),
    typed:typed.at(t),
    pointer:cursorAt(pointerKeys,[5.45],t),
    floatingScale:breathe(t,.012,3.2),
  };
}
```

The host's Canvas/SVG/DOM render must *apply* that returned state to every relevant element on every frame. A `cameraAt` transform is not a fully rendered screenshot; `typist` does not create DOM nodes; `paperPolygon` yields numerical vertices. Existing frameworks may already implement these concepts better—prefer the project's native components when present.

Run `node --test tests/*.test.mjs` from the skill's directory for deterministic primitives and original-source checksum tests.
