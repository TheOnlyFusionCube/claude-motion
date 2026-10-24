# Kit API

The runtime is `kit/motion-kit.js` (a global `kit`) plus `kit/player.html`. It mirrors the
original Motion `kit` (`upstream/film-api.md`), so the craft docs' code applies almost as is.
Everything is pure in `t`: no timers, no CSS transitions (the stage disables them), no
accumulation between frames. `Math.random` and `Date.now` are seeded/frozen per frame anyway.

## The film folder

```
my-film/
  film.js      ES module: export default { width, height, fps, duration, background, css, chapters, init, render, score }
  film.css     the look (listed in `css`)
  assets/      images, fonts, clips, models you load (kit.url('assets/x.png'))
  score.wav    written by scripts/score.mjs (the player plays it if present)
```

```js
import * as THREE from 'three';                 // optional; the player maps 'three' and 'three/addons/*'
const { seg, lerp, eo, eio, eob, TextFx } = kit; // destructure what you use, at top level

const TT = {}; TT.title = -0.6; TT.click = 4.2; TT.result = TT.click + 0.3;   // a cascade of named beats

export default {
  title: 'Harbor — notes that stay put',
  width: 1920, height: 1080, fps: 30, duration: 24, background: '#f3f1ec',
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Title' }, { t: 4.2, label: 'Make a note' }],
  async init(kit) { /* build DOM/3D ONCE; measure; load assets. The only async place. */ },
  render(t, kit) { /* SYNCHRONOUS. Set every varying property from t alone. */ },
  score(S, kit) { /* optional: music + foley as data, from the same TT */ },
};
```

Sizes: 1920×1080 landscape, 1080×1920 vertical, 1080×1080 square, 1080×1350 4:5. One film has
one size — a second aspect ratio is a recomposed copy, never a crop.

## Time and easing (pure)

| | |
|---|---|
| `seg(t, a, b)` | 0→1 progress of t across [a, b], clamped. The workhorse. |
| `lerp(a, b, p)`, `clamp(x, a, b)`, `clamp01`, `smoothstep(a, b, x)`, `remap(t, a, b, a2, b2)` | |
| `eo` `ei` `eio` | cubic out / in / in-out — arrivals ease out, exits ease in, repositioning in-out |
| `eoq` `eiq` | quartic — softer landings |
| `eox` `eix` `eiox` | expo — whips and pushes-through |
| `eob(x, s = 1.4)`, `eib` | back (overshoot); 1.6–1.9 for shape arrivals; never on product UI |
| `spring(x, {damping = .42, freq = 2.2})` | damped spring 0→1 (wobble that decays) |
| `kit.window(t, a, b, rise = .3, fall = rise)` | ramps up at a, down to 0 at b — a beat's opacity |
| `keys(t, [[t0, v0], [t1, v1, ease?], …])` | keyframes for numbers or arrays (`[x, y, z]`); ease on a key shapes the move into it |
| `breathe(t, amt = .012, period = 3.2)` | scale for holds |
| `rng(seed)` → `() => 0..1`, `hash(n, seed)`, `vnoise(seed)` → `x => −1..1` | deterministic randomness, smooth noise for boil/drift |
| `smear(speedPxPerS)`, `speedOf(f, t)` | fake motion blur: stretch along travel by speed |
| `mixColor('#a', '#b', p)`, `rgba('#a', alpha)` | colour helpers |
| `step(t, a)`, `pulse(t, a, b)`, `kit.caret(t)` | |

## DOM

- `kit.stage` — the W×H stage. `kit.W`, `kit.H`.
- `kit.layer(cls?, parent?)` → a full-stage div, appended in paint order (add camera layers first, HUD/cards after).
- `kit.h('<div>…</div>')` → element; `kit.svg('<path…/>')` → SVG element; `kit.el(tag, {class, style, text, html, attrs, parent}, children)`.
- `kit.$(sel)`, `kit.$$(sel)`; `kit.css(text)` adds a style tag.
- `kit.set(node, {opacity: .5, transform: '…'})` writes only changed styles.
- `kit.show(node, t, tIn, tOut?, {dur = .35, dy = 12})` — fade/raise in, fade out.
- `kit.tr({x, y, s, sx, sy, r})` → transform string.
- `kit.svgLayer(parent?, {w, h})` → full-size SVG (for marks, charts).
- Measure in `init`, at identity camera: `kit.offset(node, ancestor)` (layout box, ignores transforms),
  `kit.srect(node)` (on-stage box, camera included), `kit.camrect(node, cam)`, `kit.center(node, dx, dy)` → lazy `() => [x, y]` of the layout centre (scene coords inside a camera layer; independent of the camera).
- `kit.url(name)` resolves a path in the film folder; `kit.assets.image(name)` → Promise<HTMLImageElement>; `.text`, `.json`.
- `kit.video(src, {start, loop})` → muted `<video>` shown at film time `t − start` (frame-exact in export); `kit.seek(video, s)` inside render to hold/offset.
- `kit.fx` — a 2D canvas context ABOVE everything, cleared before each render. `kit.spotlight(rect, amount, {pad, radius})` dims outside a rect.

## Camera

```js
const world = kit.layer('world');
const cam = new kit.Camera(world).set([
  { t: 0,   cx: 960,  cy: 540, z: 1.0, drift: [0, -3, .006] },          // drift: [px/s, px/s, log-zoom/s] while held
  { t: 3.4, from: 2.6, cx: 1310, cy: 742, z: 2.1 },                      // eased move over [from, t]
  { t: 6.0, cx: 400, cy: 300, z: 1.4, cut: true },                       // hard cut at t
  { t: 9.2, from: 8.6, cx: 960, cy: 540, z: 4.5, ease: kit.eix },        // whip / push-through
]);
// render: cam.apply(t) FIRST.
```

(cx, cy) is the scene point at the stage centre; z magnifies (interpolated in log space, so zooms
feel even). A move starts from where the previous key's drift has carried the view — no pops.
`cam.at(t)` → `{cx, cy, z, r}`; `cam.toStage([x, y], t?)` maps a scene point to stage pixels (pin
stage-space things to camera-space things); `cam.frame(rect, {t, pad})` → a key framing a rect.
Optional `r` (degrees) rolls the camera.

## Type

`TextFx` splits an element's text into word spans once, keeping inline markup (`<em>`, `<b>`, `<br>`) in place,
then sets each word from t. Keep a line as ONE element.

- `TextFx.in(el, t, t0, {from: 'right'|'left'|'bottom'|'top', d = 28, stagger = .11, dur = .5, ease = eo, blur = 0, scale = 1, mode: 'words'|'chars'})` → end time
- `TextFx.rise(el, t, t0, opts)` (from bottom, 34 px), `TextFx.fadeFromRight(el, t, t0, {stagger, dur, dx})`
- `TextFx.out(el, t, t0, {to = 'left', d, stagger = .05, dur = .3})` — exits quicker, the other way
- `TextFx.mask(el, t, t0, {stagger = .08, dur = .6})` — each word slides up from behind its baseline
- `TextFx.swap(el, t, t0, a, b, {dur = .4})` — one element whose text flips at the midpoint
- `TextFx.count(el, t, t0, t1, to, {from = to/2, format})` — counting number (starts near half so stills never read 0)
- `kit.typist(text, t0, cps = 22, seed)` → `{at(t), count(t), done(t), times, end}` (times also land in `kit.typing.times` for the score)
- `kit.streamed(text, t, t0, cps = 95, chunk = 7)` → revealed prefix (AI-answer streaming)

## Cursor

```js
const cur = kit.cursor({ cam });                      // with cam: keys are scene coords, cursor stays ~30 px
cur.keys = [{ t: 3.0, at: [1500, 1080] }, { t: 4.1, from: 3.3, at: kit.center(btn), bow: .12 }];
cur.clicks = [4.2];                                   // ring + press dip
cur.holds = [[5, 6.2]];                               // pressed (drag)
cur.shapes = [{ spans: [[4.4, 6]], gfx: kit.cursors.text }];   // arrow | text | hand
cur.visible = t => kit.seg(t, 2.9, 3.2);
// render: cur.render(t)
```

## Marks (hand-drawn, boiling at 12 fps)

```js
const marks = new kit.Marks(kit.svgLayer(world));     // in the camera layer → rides with the camera
marks.add({ kind: 'circle', x, y, w, h, t0: 6.2, dur: .45, color: '#e5484d', width: 9, out: 8.5 });
// kinds: circle {x,y,w,h,pad,tilt} · underline {x,y,w,wave} · arrow {from,to,bend,head} · check {x,y,size}
//        cross · bracket {x,y,h,side} · scribble {x,y,w,h} · burst {x,y,r,n} · path {d:[[x,y],…]}
//        geom: () => ({…}) for moving targets
// render: marks.render(t)
```

## Shapes

`kit.cutPaper(seed, n = 7, irregularity)` → unit polygon; `kit.rectPoly(n, w, h)`; `kit.polyLerp(A, B, p)`
(morph, point for point); `kit.polyStr(pts, cx, cy, sx, sy, rot)` → SVG `points`.

## Motion design (reels)

| | |
|---|---|
| `kit.bouncer({t0, h, n, fall, decay, x0, dx, squash, stretch, contact})` | a dropped object bouncing n times: `.at(t)` → `{x, y, sx, sy, vy}` (y above ground), `.contacts` (hit times), `.end` |
| `kit.morph(el, A, B, p)` | box A → B (`{x, y, w, h, r?, bg?, opacity?}`, stage px): match cuts, object → UI |
| `kit.iris(el, p, x, y)` | circular reveal of `el` from (x, y); p = 1 covers the frame (colour flood) |
| `kit.letters(el)` | split text into one inline-block span per letter → array |
| `kit.extrude(el, {depth, layers, side, dark, face})` | 3D extrusion by stacked layers; rotate under `perspective` → returns the face |
| `kit.odometer(el, {digits, lead: 'collapse'})` | rolling-digit counter: `.set(value)` every frame |
| `kit.grain(parent, {opacity, fps, blend})` | deterministic film grain: `.render(t)` |
| `kit.focus(el, depth, focus, amount, max)` | depth-of-field blur by distance from the focal plane |
| `kit.trail(f, t, {span, n, t0})` | n past samples of f (dotted arcs, ghosting) → `[{t, a, p}]` |
| `motionBlur: {samples, shutter, fast: [[from, to, samples]]}` | film field: real motion blur in stills and export |

## CSS 3D, characters, type walls

| | |
|---|---|
| `kit.space(parent, {fov})` | DOM in 3D under a perspective camera: `.add(el, {x, y, z, rx, ry, rz, s})`, `.place(el, …)`, `.camera(pos, target, roll)` each frame, `.project(p)` → `[x, y, scale]`, `.depth(p)`, `.world` (y is down; `rx: 90` lays a plane flat) |
| `kit.box3d({w, h, d, color, faces, radius, parent})` | a box of six DOM faces (characters, blocks); faces: colour or `{bg, html}`; `.faces.front` etc. |
| `kit.gait(dist, {stride, legs, lift, swing, bob})` | walk cycle from distance travelled → `{legs: [{swing, lift}], bob, sway}` |
| `kit.marquee(rowEl, {speed, offset})` | endless scrolling row: `.render(t, extraPx)` |
| `<span class="kit-unit">` | inside text animated by TextFx: moves as one word (icons, chips); inline `img`/`svg` too |

## Three.js helpers — `motion/three-kit.js`

`view3d(kit, {parent, fov, background, exposure, env, shadows, z})` → `{THREE, scene, camera, renderer, look(pos, target), light(color, intensity, pos), project(p), render()}` ·
`mat.clay|plastic|chrome|glass(tint, {cheap})|glow|toon` · `shapes.star|knot|ring|tube(points)|coin({face})|roundedBox` ·
`canvasTexture(size, draw)` · `await svgTexture(svg)` · `textPoints(text, {font, n, scale})` · `particles(n, {size, colors})` → `.set(i => [x, y, z])` ·
`field(geo, material, cols, rows, {gap})` → `.set((i, j, x, z, o) => { o.sy, o.y, o.s, o.color })`.

## Device UI — `motion/ui/devices.js`

`await useDevices()` · `phone({dark})` → `{el, screen}` · `statusBar()` · `appIcon({glyph | mark, bg, fg, size, badge, label})` ·
`homeScreen({icons, wallpaper})` → `{el, apps}` · `storeListing({name, maker, icon, button, stats, dark})` → `{el, icon, button}` ·
`chatInput({placeholder, dark, width})` → `{el, field, go}` · `browser({url, width, height, dark})` → `{el, body}` ·
`pill(text, {tone: glossy|accent|red|green|dark|glass, icon, size})` · `glyph(name, {size, stroke})` (`GLYPHS` lists them). For fictional apps;
rebuild a real product's UI from its code.

## Style presets

`import { useStyle } from 'motion/styles/index.js'` → `await useStyle(kit, 'editorial', { palette, values, root })`.
Six looks (sketch, bubbles, editorial, bold, midnight, showcase) sharing one set of classes. See `references/styles.md`.

## Scenes (optional)

For films that are genuinely separate set-ups, `export default kit.scenes([{id, name, dur, lead?, tail?, init(kit), render(t, kit)}], {width, height, fps, background, css, score(S, kit, T)})`.
Each scene gets its own box and local t; `lead`/`tail` let two overlap for a transform. Prefer ONE
continuous `render` with a camera when subjects carry across beats — that is what reads as a film.

## 3D (Three.js)

`import * as THREE from 'three'` and addons from `'three/addons/…'` (bundled: `RoomEnvironment.js`,
`RoundedBoxGeometry.js`, `BufferGeometryUtils.js`; add others to `kit/vendor/addons/`). Create the
renderer in `init` on your own canvas with `preserveDrawingBuffer: true`, and call
`renderer.render(scene, camera)` inside `render(t)` after setting every object and the camera from t.
Project 3D points to stage pixels for DOM labels: `v.set(x, y, z).project(camera)` → `((v.x+1)/2*W, (1-v.y)/2*H)`.
See `references/recipes.md` § 3D and `examples/launch/film.js` `buildCity`.

## Score — `score(S, kit)`

Recorded as data in the browser, synthesized by `scripts/score.mjs` (48 kHz stereo WAV, reverb, soft limiter).

- `S.tempo(bpm, {t0})` grid; `S.beat(n)` → seconds; `S.toBeat(t)`. Every call takes `{beat, beats}` or `{t, dur}`.
- `S.program(track, patch, {pan, gain dB, rev 0..1, bright 0..2})` — patches: `marimba vibes glock ep keys pluck bass pad` (aliases `kalimba piano bell`).
- `S.note(track, 'F#4'|midi, {…, vel})`, `S.chord(track, [..], {…, spread})`, `S.pattern(track, 'x.X.o', {from, step = .5, repeat, pitch: [cycle], vel})`, `S.run(track, [..], {t, step, vel, cresc})`
- Drums: `S.drum(name, {beat|t, vel})`, `S.drums({kick: 'x...', hat: '.x.x'}, {from, step, repeat})` — `kick snare clap sidestick hat openhat shaker tamb woodblock cowbell tom crash ride`. `X` accent, `o` ghost.
- Foley at exact seconds: `S.fx(name, t, {dur, vel, pitch, pan, into})` — `tick click doubleclick pop ding chime sparkle whoosh revswell roll boing thud swipe impact riser` (`riser` ends at t); `S.ticks(kit.typing.times, {vel})`.
- `S.master({gain = -3, fadeOut = 1, reverb: {room, damp}})`.

Unknown names are silent and reported by `score.mjs`. `--levels` prints RMS per second
(−60 silent, −30 bed, −20 groove, −12 hit).

## Scripts

| | |
|---|---|
| `node scripts/doctor.mjs` | check Node, Playwright, Chromium, WebGL, FFmpeg; prints fixes |
| `node scripts/new.mjs <dir> [--portrait\|--square] [--style <preset> [--palette <id>]]` | scaffold from `templates/starter` (or `templates/preset`) |
| `node scripts/preview.mjs <dir>` | serve the player (scrub, space, ←/→, L, M) |
| `node scripts/frames.mjs <dir> --at 0,2.5,c2+0.5,50%,end --sheet` | exact stills + contact sheet (also `--every 1`, `--count 16`; motion blur included, `--no-blur` to skip) |
| `node scripts/review.mjs <film.mp4 \| dir> [--sheet x.jpg]` | review any video: sound and loudness, frozen time, animated-deck signals, contact sheet |
| `node scripts/check.mjs <dir>` | errors, determinism, blank first frame, frozen spans, slideshow smell, tiny text |
| `node scripts/score.mjs <dir> [--levels]` | render `score.wav` |
| `node scripts/palette.mjs "#g,#m,#i,#a" …` | check palettes (ink ≥ 4.5:1 on ground, no mid-tone grounds) |
| `node scripts/export.mjs <dir> --out film.mp4 [--fps 60] [--gif x.gif] [--draft \| --scale .5] [--blur n \| --no-blur]` | frame-exact MP4 with the score and motion blur; parallel workers |

Requirements: Node ≥ 22, Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`,
or `CHROMIUM_PATH`), FFmpeg for MP4 (`FFMPEG_PATH`). WebGL renders headless via SwiftShader (slower; fine).
