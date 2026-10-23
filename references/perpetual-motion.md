# Perpetual motion: the original Motion default, made enforceable

**Read this for every finished film, not only motion-design showreels.** This is a faithful operational translation of `references/upstream/motion.md` sections 1-2: **"Everything is always in motion."** Do not replace that source page; consult it as the authoritative craft document. The local examples and lint rules below make the original's first principle hard to accidentally omit. Perpetual does *not* mean every object moves at once, an automatic camera spin, or added particles. The frame should feel alive **while the audience reads**, with the moving subject remaining the center of attention.

## Three nested motion systems

1. **Primary semantic action:** A visible subject **does** something that changes the meaning: a request packet crosses a server boundary, code arrives in a field, a count becomes a proportion, two competing fixes race, a vulnerable process becomes protected. Lead each section with a subject's journey rather than text, icons, and a background. A fading title and a line drawing under it are NOT a semantic action. The subject should carry into the next shot, sometimes by literally becoming the new surface.
2. **Camera / spatial progression:** Track that subject with a camera or stage move, change scale to inspect a consequence, then pull back to reveal the result. The first 2.5s is calm, with at most one gentle 1.2-1.5s push. Large moves last about 0.5-0.9s for reading sequences, and the viewer receives 0.6-1s to establish after a cut. **On a held image, do not stop moving:** use a monotonic, eased Ken Burns push/pan totaling 1-3% or 10-30px over the hold; held UI can drift 0.3-2%/second. Never bounce, oscillate, or reverse a held plate mid-hold. Frame the relevant word/row, not an entire unreadable window.
3. **Quiet hold motion:** A title creeps ~2px/s even after its reveal; a single supporting shape breathes +/-1-2% over ~3s; a drawn mark can boil through 3 seeded variants at 12fps; a legible end mark or UI remains subtly alive during a 3s+ hold. These mechanisms fill perceptual dead air **without introducing new content or stealing attention**. Prefer gentle movement on one relevant object rather than unrelated dust, grids, blinking neon, stock loops, or particles. No freeze frame unless the user intentionally asks for one.

**One moving subject at a time** is compatible with uninterrupted motion: semantic animation takes the focus; the camera/plate drifts unobtrusively during reading. Calm is slower motion, **not zero motion**. Static slide + fade-in + 10 seconds stationary + fade-out is never a finished Motion shot.

## Build a continuous film, not a slide deck

- In the storyboard write an **action verb** for every beat (follow, type, transform, count, reveal, resolve) and name the **object carried across the cut**. "Show security risks" has no motion logic. "Follow a request into PHP memory, then zoom into the corrupted pointer" does.
- For every shot record two simultaneous timelines: **(a) a foreground action** with cause and effect; **(b) a quieter carrier** with a specified movement, target, and duration, including titles and the last three seconds. Background ambience alone cannot fulfill (a).
- For scene changes, prefer **a subject-to-subject transformation**: request packet -> flowing arrow -> donut arc -> numeric count -> source code glyph -> fix timeline. Cut to a different idea only when a hard cut makes causal/rhythmic sense. Preserve motion direction and screen position of the continuing subject.
- A close-up lands **during** streaming/filling/morphing, not after the object finishes and freezes. When speech is slow, extend the *object's process* over the sentence (e.g. data routes through a pipeline) or add a slow following-camera move; do not insert a static caption slide.
- Time the hero action, a 0.6-1s establishment, and reading around voice. Do **not** simply speed all motion to hide static stretches. A legible end card held >=3s still creeps or breathes subtly. A long 90s explainer must still be authored as a continuous journey.
- Precompute all timing from **absolute `t`**, not `requestAnimationFrame` side effects, CSS transitions with untracked clocks, or previous frames. A slow camera pan is deterministic: `x = x0 + 18 * ease((t-start)/(end-start))`.

## A concrete 90-second PHP-security explainer (narrative structure, not new factual claims)

The supplied *PHP Crisis* example spends long intervals on static infographic panels. Retain its verified copy only; replace the *visual mechanics* with these representative beats:

| Section | Continuous subject and motion, not a slide | Live motion during explanation |
|---|---|---|
| What PHP does | A request token travels from click -> PHP server -> rendered page. Camera follows the token; a row of UI tiles is not sufficient. | Server surface pans/zooms a few percent while data visibly flows. |
| Adoption / scale | The moving token expands into a chart arc that draws to a source-backed percentage; the camera tracks the growing data shape. | The arc or camera continues a slow monotonic move once the number becomes readable. |
| Vulnerabilities | The data arc resolves into memory cells; a corrupt pointer misroutes through the cells while a second trail holds state. | Focus slowly advances along the pointer path. Do not leave two text boxes stationary for 10s. |
| Patching | That same trail becomes a timeline that runs through successive patch milestones and versions. | A sweep/playhead advances with the narration, rather than a fixed timeline with only labels. |
| Discovery / response | The timeline turns into an input-to-review-to-remediation pipeline with one observable response to an input. | Camera follows an identifiable signal through the pipeline. |
| What to do / close | The signal reaches a checked/secured state that becomes a compact resolving mark. | The final mark/title creeps through the full closing hold, then sound resolves. |

These are art-direction examples, not claims about PHP, dates, affected versions, or new security advisories. Do not invent statistics or CVE details.

## Pre-export contracts (mandatory when writing a 15s+ finished film)

1. Author `motion-plan.json` with `duration`, ordered shots, handoffs, and time-bounded **visible** tracks for both *carrier* and *focal* animation. Use `examples/continuous-motion/motion-plan.json` as the schema example. Include a meaningful "why" on each track. Validate:

   `node <skill-dir>/scripts/validate-motion-plan.mjs <film-dir>/motion-plan.json --strict`

2. Render the whole encoded MP4; run `node <skill-dir>/scripts/audit-video.mjs film.mp4 --mode launch --continuous --strict --sheet qa.png` (or showreel/walkthrough/data-story as appropriate). Unlike the previous audit, **opening and closing holds are scanned**: the original source requires motion there too. A half-second sampling window and quiet-run report indicate dead spots; the threshold is only a diagnostic, not proof of artistic quality.
3. For any flagged interval, watch **that segment at full size and at phone width**. Locate which scene should have the carrier/subject moving. Fix the render or report a user-requested deliberate still; don't suppress checks by inserting useless animation. Return both the static contact sheet AND a brief real-time playback review. A contact sheet alone cannot prove continuous movement.
4. Verify a true causal visual event for every 8-12 seconds of a long film, and preserve intentional rest around the action. Smooth background motion must not be counted as a narrative event. Avoid continuous text jitter, camera seasickness, or movement of real UI controls under the pointer.

## Pure-t starter recipes

Use the helpers in `assets/vanilla-film/src/motion.mjs` (or translate to Remotion/Three.js/Blender frame time):

```js
// Smooth monotonic movement through the entire hold; no wall-clock state.
const plate = heldPlate(t, {start:2, end:8, panX:22, panY:-8, zoomPct:.025});
// Hold UI 0.3-2%/s (example 0.6%/s). Apply to camera/plate, not input controls mid-click.
const ui = uiHoldDrift(t, {start:10, end:18, dxPerSecond:3, zoomPerSecond:.006});
// At a title hold 2px/s is enough; do not turn the words into a bouncing sign.
const x = titleCreep(t, {start:0, end:3, pxPerSecond:2});
const s = breathe(t,.012,3.0); // a support shape, not all text
```

A held image's eased camera push has zero instantaneous velocity at its endpoints; this is not a frozen multi-second mid-shot. For consecutive shots, connect the last coordinate/scale of the departing subject to the incoming subject; never reset to default framing merely because a scene ID changed.
