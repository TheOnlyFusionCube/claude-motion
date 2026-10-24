# Recipes

Working patterns for the moves that make a film read as one continuous piece rather than a run of
slides. Each is a fragment of `init`/`render`; all are pure in `t`. `examples/launch/film.js` uses
most of them in context. Take the technique, not the look.

## 1. The title becomes the first subject

The opening line doesn't fade out. It travels and shrinks into the place where it lives next: a
field, a heading, a label. The window or card assembles around it.

```js
// init: title in stage space, target in camera space
title = kit.h('<div class="title">Where do the bikes go at 8 a.m.?</div>'); kit.stage.append(title);
this.titleW = title.offsetWidth;
// render
const p = eio(seg(t, TT.hand, TT.hand + 0.75));
const from = [(W - this.titleW) / 2, 470 - 2 * Math.min(t, TT.hand)];        // centred, creeping up ~2 px/s
const to = cam.toStage([fieldX, fieldY], TT.hand + 0.75);                     // where its twin sits when it lands
const k = (24 * cam.at(TT.hand + 0.75).z) / 132;                              // its twin's font size on screen ÷ title size
title.style.transform = `translate(${lerp(from[0], to[0], p)}px,${lerp(from[1], to[1], p)}px) scale(${lerp(1, k, p)})`;
TextFx.rise(title, t, TT.title);                                              // TT.title = −0.6: readable at frame 0
title.style.opacity = 1 - seg(t, TT.hand + 0.55, TT.hand + 0.78);             // cross-fade into the real field text
field.style.opacity = seg(t, TT.hand + 0.6, TT.hand + 0.8);
win.style.transform = `scale(${lerp(.965, 1, eo(seg(t, TT.hand + .1, TT.hand + .7)))})`;
```

## 2. Cause → effect in software

Visible causality: the cursor travels on an arc, the button presses, the result builds, and the camera
arrives while it's still building.

```js
cur.keys = [{ t: 3.0, at: [1500, 1080] }, { t: TT.click - 0.1, from: 3.5, at: kit.center(btn), bow: .1 }];
cur.clicks = [TT.click];
btn.classList.toggle('pressed', t >= TT.click - 0.02 && t < TT.click + 0.2);
reply.textContent = kit.streamed(REPLY, t, TT.click + 0.6, 60, 5);           // answer streams
cam.set([ /* … */ { t: TT.click + 1.6, from: TT.click + 0.7, cx: resultX, cy: resultY, z: 2.2 } ]);  // lands mid-build
```

Typing: `const typed = kit.typist(TEXT, TT.type, 22)` in init → `field.textContent = typed.at(t)`,
caret `kit.caret(t)` once `typed.done(t)`, and `S.ticks(kit.typing.times)` in the score.

## 3. A chart that draws, with the camera arriving at the interesting part

```js
// init: one path per series, normalised length so dashoffset = 1 − progress
const p = kit.svg(`<path d="${d}" fill="none" stroke="${col}" stroke-width="4" pathLength="1" stroke-dasharray="1 1"/>`);
// render
p.setAttribute('stroke-dashoffset', 1 - eio(seg(t, TT.chart + i * .08, TT.chartEnd + i * .08)));
// the push starts BEFORE the line reaches the dip, so the close-up has motion in it
cam.set([ /* … */ { t: TT.push + .9, from: TT.push, cx: dip[0] - 70, cy: dip[1] - 70, z: 2.25, drift: [5, -1, .012] } ]);
marks.add({ kind: 'circle', x: dip[0] - 46, y: dip[1] - 34, w: 92, h: 60, t0: TT.circle, color: ink, width: 4 });
```

Bars: `transform: scaleY(lerp(base, v, eob(seg(t, t0 + i * .16, t0 + i * .16 + .55), 1.6)))` with
`transform-origin: 50% 100%`. Numbers: `TextFx.count(el, t, t0, t1, 3240)`.

## 4. Push through into the next world

From a 2D surface into 3D, or from one UI to the next: accelerate INTO the subject (`eix`), cross-fade
the next world in as you pass the point of no detail, and have the new camera DECELERATE out
(`eo`) from the matching spot, so the two moves read as one.

```js
cam.set([ /* … */ { t: TT.city + .45, from: TT.whip, cx: dip[0], cy: dip[1], z: 4.6, ease: kit.eix } ]);
world.style.opacity = 1 - seg(t, TT.city, TT.city + .3);
canvas3d.style.opacity = eo(seg(t, TT.city, TT.city + .35));
// 3D rig: start top-down and close over the matching spot, ease back and tilt to reveal depth
const rig = t => keys(t, [[TT.city - .3, [0, 89.5, 120, 40, -6]], [TT.city + 1.2, [0, 89.5, 178, 8, -6], eo], [TT.city + 3.6, [-26, 50, 205, 6, -4]]]);
// S.fx('whoosh', TT.whip, {dur: .9}) and a revswell into the new world
```

## 5. A shape becomes a window (shared element)

Interpolate the box itself: position, size, radius, fill. Fade the content in only once the box has
nearly arrived.

```js
const p = eio(seg(t, a, b));
kit.set(box, { left: lerp(A.x, B.x, p) + 'px', top: lerp(A.y, B.y, p) + 'px', width: lerp(A.w, B.w, p) + 'px', height: lerp(A.h, B.h, p) + 'px',
  borderRadius: lerp(999, 18, p) + 'px', background: kit.mixColor(accent, '#ffffff', p) });
content.style.opacity = seg(t, b - .15, b + .2);
```

Rect ↔ blob: sample both as radial polygons (`kit.rectPoly`, `kit.cutPaper`) and `kit.polyLerp`.

## 6. Kinetic chapter lines

Short lines structure a film better than annotations: "You ask." / "It answers." Each enters from
one direction and leaves quicker the other way. The word that names the problem drifts off, and the
product name lands and stays.

```js
TextFx.in(lineA, t, TT.a, { from: 'bottom', d: 30, stagger: .1 });
TextFx.out(lineA, t, TT.a + 1.8, { to: 'top', d: 22 });
TextFx.mask(lineB, t, TT.a + 2.0);                                   // masked rise, words from behind a baseline
TextFx.swap(label, t, TT.flip, 'Before', 'After');
```

## 7. A run on the beat

For "look at all this", hard-cut between close-ups on the score's beat (0.6–0.7 s). Each cut lands
mid-action (a list filling, a number counting), and the motion keeps one direction across cuts.

```js
const B = 60 / 96, shots = [ /* {cx, cy, z} close-ups */ ];
cam.set(shots.map((s, i) => ({ t: TT.run + i * B, ...s, cut: true, drift: [-12, 0, .02] })));
// remap each subject's local time so the cut lands on the tail of its build:
const local = kit.remap(t, TT.run + i * B, TT.run + (i + 1) * B, 0.55, 1.0);
```

## 8. Landing on the end card

The last subject shrinks first, then travels on an arc and lands as the card appears, becoming part
of the mark. Then hold for 3 s or more, and keep the card moving.

```js
const leave = seg(t, TT.out, TT.end);
const [x, y] = [lerp(from[0], 960, eio(leave)), lerp(from[1], 330, eio(leave)) - Math.sin(Math.PI * leave) * 90];
dot.style.transform = `translate(${x}px,${y}px) scale(${lerp(1, .6, eo(seg(t, TT.out - .2, TT.out + .2)))})`;
const creep = Math.max(0, t - TT.end) * 2;                                         // ≈2 px/s
TextFx.rise(word, t, TT.end + .45, { stagger: .09, dur: .7, ease: kit.eoq });
word.style.transform = `translateY(${-creep}px)`;
marks.add({ kind: 'underline', …, t0: TT.end + 1.5, color: accent });              // the accent, once
// score: S.run(...) into TT.end, chord + kick ON TT.end, let it ring, fadeOut ~1.5 s
```

## 9. Holds that stay alive

- Image or UI plate: `cam` drift `[±3..8 px/s, …, .004..012 log-z/s]` on every held key.
- Ken Burns: 1–3 % scale or 10–30 px over the hold, eased, never reversing mid-hold.
- Shapes breathe: `scale(kit.breathe(t, .012, 3.2))`. Title creep ~2 px/s.
- Status dots: `opacity = .35 + .65 * max(0, sin(t*7 − i*.9))`.

## 10. Motion blur

**Real blur** (whips, flying letters, rolling digits, anything fast): declare it on the film, and the stills
and the export average sub-frames around each frame.

```js
export default { …, motionBlur: { samples: 8, shutter: 0.5, fast: [[8.3, 8.8, 32]] } }   // fast: [from, to, samples]
```

8 samples is enough for ordinary moves. A whip pan that crosses the frame in a few frames shows separate
ghost copies at 8, so list it in `fast` with 16–32. Render time scales with samples: `--draft` skips blur,
`--no-blur` / `--blur n` override.

**Cheap smear** for one element, with no render cost: stretch it along its travel.

```js
const x = f(t), v = kit.speedOf(f, t);
el.style.transform = `translateX(${x}px) scaleX(${kit.smear(v)})`;    // stretch along travel, pure in t
```

## 11. 3D that looks designed: clay, light, data

A white-clay world with one or two data colours, soft shadows, a paper-coloured fog and crisp DOM
labels projected from 3D reads as premium. Grey cubes under default lights look cheap.

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
scene.background = new THREE.Color(paper); scene.fog = new THREE.Fog(paper, 300, 620);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
const sun = new THREE.DirectionalLight('#fff6ea', 2.3); sun.position.set(-70, 130, 60); sun.castShadow = true;  // low-ish, warm, one side
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 140, bottom: -140 });
scene.add(sun, new THREE.HemisphereLight('#ffffff', '#d9d2c4', .9));
```

- Geometry: `RoundedBoxGeometry` (soft edges catch light), `InstancedMesh` for hundreds of buildings,
  varied heights from a seeded `rng`, a non-repeating plan (parks, a waterline, piers, a plinth under
  each block). Materials `roughness .85`, near-white with a warm cast; water a desaturated blue.
- Data → geometry: heights, colours and flows read from the SAME functions the 2D charts use, driven
  by a clock derived from `t` (`h = lerp(6, 8.67, seg(t, run0, run1))`). An empty state still needs to
  show something, e.g. a glass "capacity" tube with a red base.
- Camera: one rig function `keys(t, [[t, [azimuth, elevation, distance, tx, tz]], …])`, at least
  three distinct framings (overview, tilt reveal, low close-up on the consequence). Never orbit aimlessly.
- Labels: DOM pills projected each frame from 3D anchors stay crisp at any zoom.
- Particles and vehicles: closed-form positions (`p = (h − h0) / len`, a sine arc for height), never
  integrated.
- Speed: SwiftShader renders roughly 1–3 s per 1080p frame with shadows. Keep the mesh count down with
  instancing, and render 3D only while it's on screen.

## 12. Vertical (1080×1920)

Recompose rather than crop: stack what sat side by side, display type 90–170 px, keep words clear of
the top 250 px, bottom 420 px and right 120 px (platform UI), and zoom further into the UI.

## 13. Reel moves (motion design)

All in `examples/reel/film.js`. Each one is a way for one thing to **become** the next.

**Letters from depth, extruded.** Under a parent with `perspective: 1500px`:

```js
letters = kit.letters(wordEl).map(el => ({ el, face: kit.extrude(el, { depth: 46, layers: 18, side: '#a9a39a', dark: '#4a4640' }) }));
// render: each letter i lands at ta = T + i*.085 over .62 s (eoq), from z −1700, rotateY −70°+26°·i, rotateX 35°
el.style.transform = `translate3d(${x*q}px,${y*q}px,${-1700*q}px) rotateY(${ry*q}deg) rotateX(${35*q}deg)`;  // q = 1 − p
```

Swing the whole word a few degrees on Y while it holds so the extruded sides show.

**Match cut: a letter becomes an object.** Measure the letter in `init` (`kit.offset(face, world)`), fade it
out over 0.12 s and morph a new element out of its box:

```js
kit.morph(ball, { x: o.x, y: o.y, w: o.w, h: o.h, r: o.w / 2, bg: CREAM }, { x: X0 - 60, y: TOP, w: 120, h: 120, r: 60, bg: BLUE }, eio(p));
```

**Squash and stretch.** One call describes the whole bounce; contacts drive the sound.

```js
const b = kit.bouncer({ t0: TT.drop, h: 380, n: 4, fall: .48, decay: .5, x0: 620, dx: 700 });
const s = b.at(t);   // {x, y (height above ground), sx, sy}
kit.set(ball, { left: s.x - 60 + 'px', top: GROUND - s.y - 120 + 'px', transform: `scale(${s.sx},${s.sy})` });  // transform-origin: 50% 100%
// score: b.contacts.forEach((c, i) => S.fx('thud', c, { vel: 100 - i * 14 }));
```

A dotted trail of where it has been: `kit.trail(s => b.at(s), t, { span: 1.3, n: 26, t0: TT.drop })`.

**Pull back to reveal the tool.** Build the editor chrome around the first shot's frame (window, toolbar,
a curve panel below it) in the same world. At z = 1 it's off screen, then a camera key to z ≈ .56 reveals that
the first shot was a preview. Then *use* the tool: drag a handle and the subject moves differently.

**Object → UI.** The ball becomes a toggle's knob (colour to white), and a track morphs out of it
(`kit.morph` from the ball's box to the pill). The cursor clicks, the knob slides (`eob`), and the track fills.

**Colour flood into the next world.** `kit.iris(floodEl, eiq(p), x, y)` from the knob's stage position
(`cam.toStage(...)`). Open the next world with the camera so close that one tile in the flood's colour
fills the frame, then whip pan. The flood was that tile all along.

**Whip pans.** Camera keys 0.3 s apart with `ease: kit.eiox`, each landing on a subject that's already moving.
Put a `swipe` on each, and add the span to `motionBlur.fast`.

**Rolling count.** `const o = kit.odometer(el, { digits: 3 })`, then `o.set(N * eoq(seg(t, a, b)))`. Under
motion blur the units column spins into a blur. Colour the last column with `.kit-odo-col:last-child`.

**Texture.** One soft radial glow in the accent under the subject, a studio gradient ground, and grain on top
(`g = kit.grain(kit.stage, { opacity: .045, fps: 12 })` in init, `g.render(t)` last in render). Keep grain
subtle and slow: noise that changes every frame can multiply the MP4's size several times. Depth of field:
`kit.focus(el, depth, focusDepth, 6)`.
