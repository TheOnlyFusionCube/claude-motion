# Deterministic timelines and rendering

Read when implementing a browser timeline, integrating with a video framework, or debugging an animation that fails on seek/export.

## Frame contract

For timestamp `t` in `[0, duration]`, drawing depends only on `t`, fixed configuration, and already-loaded assets. Calling `render(4.1)`, then `render(0.4)`, then `render(4.1)` produces pixel-identical results for 4.1s.

Set up fonts, images, geometry measurements, and elements before frame rendering. Do not fetch, parse large data, set intervals, await, use unseeded randomness, or rely on CSS transition progress *inside* `render(t)`. `requestAnimationFrame` may advance the playback clock; it is not the visual-state source of truth.

Sample helpers:

```js
const clamp01 = x => Math.min(1, Math.max(0, x));
const segment = (t, start, end) => clamp01((t - start) / (end - start));
const easeOut = p => 1 - (1 - p) ** 3;
const easeInOut = p => p * p * (3 - 2 * p);
const lerp = (a, b, p) => a + (b - a) * p;

function stateAt(t) {
  const enter = easeOut(segment(t, 1.2, 2.0));
  const cameraX = lerp(0, 140, easeInOut(segment(t, 4, 5.2)));
  const typed = 'Describe the change'.slice(0, Math.floor(Math.max(0, t - 6) * 24));
  return { enter, cameraX, typed };
}
```

Handle a `start === end` interval as a step in production helpers to avoid `0 / 0`. Use exact timestamps for event cues; do not infer actions from a prior rendered frame.

## Architecture

1. Define size, frames per second, duration, safe margins, palette, text, and scene boundaries as data.
2. `init()` loads resources and sets up DOM/canvas layers.
3. `render(t)` clamps `t`, computes derived state, clears/reset the canvas or fully assigns DOM styles/text, and paints the entire shot.
4. Playback calls `render(t)` based on elapsed monotonic time. Pausing and seeking call the *same* `render(t)`.
5. Offline export calls `render(i / fps)` in ascending frame order; a deterministic test also seeks frames in a scrambled order.

When capturing browser content, freeze dynamic app behavior that is unrelated to the film. Do not rely on live network requests, timers, stock widgets, user accounts, or random input during export.

## Framework translation

| Stack | Implementation |
| --- | --- |
| Vanilla Canvas | `drawFrame(ctx, seconds)` paints from scratch after resetting state and clearing canvas. |
| Vanilla DOM/SVG | `render(seconds)` assigns *every* animated style/attribute from derived state. |
| React / Remotion | Use `useCurrentFrame()` (or `frame` prop) and calculate `t = frame / fps`; avoid nonseekable effects. |
| Motion Canvas | Build composition in its scene system; use its frame-accurate renderer and verify exported frames, maintaining declarative cue times. |
| CSS / Web Animations | Only use seekable animations whose currentTime is explicitly set during frame capture. Avoid uncontrolled wall-clock animation. |

## Camera mathematics

Represent camera as `(cx, cy, zoom)` where `(cx,cy)` is the world point placed at screen center. For stage `(W,H)` and a world coordinate `(x,y)`:

```js
screenX = W / 2 + (x - cx) * zoom;
screenY = H / 2 + (y - cy) * zoom;
```

Interpolate camera translation with ease-in-out. Interpolate zoom in log space to avoid visual acceleration (`zoom = exp(lerp(log(z0), log(z1), p))`). Keep a cursor's apparent size steady under a camera zoom by applying reciprocal zoom when drawing it inside the camera space.

## Data and randomness

For jittered type strokes or hand-drawn marks, precompute seeded variants and index with `Math.floor(t * 12) % variantCount`. For typewriter effects compute visible character count from absolute elapsed time, rather than append each frame. For animated noise, sample a deterministic analytic noise function with a fixed seed.

## Verification

- Seek `t=0`, halfway into each scene, immediately before/after cuts, and the exact end.
- Save an image at time `t`, seek to another time, seek back, and compare the captured PNG or raw pixels.
- Inspect the first frame for a meaningful visible title/subject.
- Confirm no `NaN`, layout clipping, missing fonts, stale styling, asset-loading races, or async errors.
- For exports, verify codec, pixel dimensions, frame rate, and duration using `ffprobe` when available.
