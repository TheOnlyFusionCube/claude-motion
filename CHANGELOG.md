# Changelog

## Unreleased: portable standalone documentation

- Remove the twelve mirrored Motion artifact-type documents from the current tree; preserve their historical paths, commit and hashes in `SOURCE.md` for attribution and review.
- Add a self-contained production guide for the local player, and remove mandatory upstream-document reading and stale links in instructions, presets and kit comments.
- Replace automatic source downloads with an offline portability audit and regression tests; renderer, starter and examples remain unchanged.
- The legal status of redistribution from the public mirror remains unresolved; this change makes no finding of infringement or permission.

## 2.5.0: every genre

Asked for: four more kinds of film, a crypto-style brand promo, a 3D tabletop with a walking mascot, an
App Store promo, and a kinetic poster reel with chrome and particles.

- **CSS 3D space** (`kit.space`): real DOM UI on planes under a perspective camera (desks of screens,
  tilted dashboards), with `project` and `depth` for labels and depth of field. **Characters** from boxes
  (`kit.box3d`) with a walk cycle driven by distance (`kit.gait`).
- **`kit/three-kit.js`:** `view3d` (renderer, studio environment, camera, lights), materials (clay, plastic,
  chrome, glass), shapes (star, knot, ring, tube, coin with a face texture, rounded box), `textPoints` +
  `particles` (particles that form words), instanced `field`s, SVG and canvas textures.
- **`kit/ui/devices.js`:** phone, status bar, app icons, home screen, store listing, chat input, browser
  window, glossy/red/green pills and 26 original glyphs, for fictional apps.
- **Type:** `kit.marquee` (endless rows, with a whip-out), and `kit-unit` / inline `img`/`svg` inside text
  animate as one word (icons inside sentences).
- **Four examples**, each with a beat sheet: `examples/poster/`, `examples/tabletop/`, `examples/app-promo/`,
  `examples/brand-promo/`. SKILL.md now picks the reference film by genre, and recipes.md gains §14–18.

## 2.4.0: motion-design reels

Asked for: the fast, crafted "sizzle" style, where letters fly in as 3D type, the O becomes a bouncing
ball, a pull back reveals an editor, a toggle floods the frame, whip pans cross a grid, and a counter rolls.

- **Real motion blur.** A film sets `motionBlur: { samples, shutter, fast: [[from, to, samples]] }`. Stills
  (`frames.mjs`) and exports average sub-frames around each frame, with more samples on listed fast spans
  so whips smear instead of ghosting. `--draft` skips it; `--blur n` / `--no-blur` override.
- **Kit:** `kit.bouncer` (squash and stretch, contact times for sound), `kit.morph` (match cuts,
  object → UI), `kit.iris` (colour flood), `kit.letters` + `kit.extrude` (3D extruded type), `kit.odometer`
  (rolling digits), `kit.grain`, `kit.focus` (depth of field), `kit.trail` (dotted arcs).
- **Synth:** `impact` (a sub drop for the cut a move lands on) and `riser` (ends on its time).
- **`examples/reel/`:** a 13.6 s reel using all of it, with a beat sheet. SKILL.md gains "Reels and
  sizzles" (every move hands off, ~1–1.5 s per idea, weight everywhere, sound cut to picture), and
  recipes.md gains §13 "Reel moves".

## 2.3.0: beyond the animated deck

Tested with another model on "tell a story about being an LLM". Its films moved continuously and had a
recurring subject, but they read as presentations: a label, a headline in the same place, and a
centred diagram per beat, with header bars and counters on every frame, a camera that never changed
scale, and no sound.

- **SKILL.md "The deck trap":** names those signals and the fix. The beat sheet gains **framing** and
  **words on screen** columns, a word budget (one line at a time, ~40 words per 30 s), "cover the
  words: can you still follow it?", and framing that changes between neighbouring beats.
- **`scripts/review.mjs`:** reviews any video or film folder for sound and loudness, frozen time, and the
  animated-deck signals (how much the picture changes over 2 s, whether its weight ever leaves the
  centre line, repeated layouts), with a contact sheet. `check.mjs` runs the same deck and silence
  checks. Calibrated on films that read as films (14–30% change over 2 s) vs. animated decks (9–12%).
- **`examples/journey/`:** a 22 s abstract story told without slides. One message is typed, split into
  words, carried across an ocean (one word takes the long way) and reassembled; the camera goes from
  finger scale to map scale and back.
- Silent exports are called out (`export.mjs` warns; SKILL.md treats a film without a score as unfinished).
- The tiny-text check counts continuous stretches and ignores scenery-sized text; the starter's close-up
  now fills the frame.

## 2.2.0: finishing touches

- **Claude Code plugin:** `/plugin install motion-films --marketplace TheOnlyFusionCube/claude-motion`
  (`.claude-plugin/plugin.json`, `marketplace.json` and icon; passes `claude plugin validate`).
- **`scripts/doctor.mjs`:** checks Node, Playwright, Chromium, WebGL and FFmpeg, and prints the exact fix
  for each problem (`--json` for agents).
- **`new.mjs --style <preset> [--palette <id>]`:** scaffolds a film on a style preset (`templates/preset`).
- **`export.mjs --draft` / `--scale`:** quick half-size cuts for checking timing.
- `preview.mjs` falls back to a free port when the default one is taken; the player shows keyboard hints.
- **In-browser tests** (`tests/render.test.mjs`): determinism, markup-preserving word splits, every preset, and
  score recording. They skip cleanly where no browser is installed.
- **README** rebuilt with an animated hero clip from the example film, install paths, a pipeline diagram,
  the preset gallery and a FAQ.

## 2.1.0: opening questions and style presets

- **Intake** (`references/intake.md`): for a new film the agent asks Style, Colours and Length once,
  together, before the beat sheet, using the host's question tool (`AskUserQuestion`) or one plain
  message. Ported from the original Motion intake: looks invented for the film, the brand palette first
  (found in the codebase if possible), palette rules, and what each answer means.
- **Style presets** (`kit/styles/`, `references/styles.md`): sketch, bubbles, editorial, bold, midnight
  and showcase, ported from the original built-in styles. Each has named palettes, values, an animated
  backdrop and an emphasis animation, all on one shared class vocabulary. `examples/styles/` is a
  gallery film.
- `scripts/palette.mjs`: contrast check for palettes before they are offered.
- `TextFx` keeps inline markup (`<em>`, `<b>`, `<br>`) when splitting words.
- Bundled Shantell Sans (hand-drawn, OFL) for the sketch preset.

## 2.0.0: a runtime, an example and a method, instead of more rules

1.x produced animated slideshows even when every validator passed. 2.0 is a rebuild.

**Added**
- `kit/`: a deterministic film runtime mirroring the original Motion `kit` API. It has a DOM stage, a
  Camera (keys, drift, log-zoom, cuts, `toStage`), cursor (arcs, clicks, holds, shapes), typist,
  streamed text, TextFx (in/out/rise/mask/swap/count), hand-drawn boiling Marks, keyframes, springs,
  shapes, clips and optional scenes. Three.js 0.180 and addons are bundled behind an import map, along
  with nine OFL font families. The player has scrubbing, frame stepping, chapters and score playback.
- `scripts/`: `new` (scaffold), `preview`, `frames` (exact stills + contact sheet), `check`
  (determinism, blank first frame, frozen spans, frozen share of the film, tiny text), `score` (offline
  synth: 8 patches, 13 drums, 13 foley, reverb, limiter) and `export` (parallel frame-exact MP4 + AAC, GIF).
- `examples/launch/`: a 34 s launch film (app UI → chart → push-through into a 3D city → comment →
  replay → end card) with a beat sheet and score.
- `templates/starter/`: a 14 s film showing the grammar.
- `references/kit-api.md`, `references/recipes.md`.

**Changed**
- `SKILL.md` was rewritten from ~33 KB of stacked warnings into a short, ordered method: decide, beat
  sheet, build, look and fix (at least twice), sound, export.

**Removed**
- The Canvas2D "retained world" starter, the motion-plan / stage / video auditors, review-JSON
  validators, the VTK, Blender, Pillow and continuous-motion examples, the GLB kit, and ~20 adapter
  reference docs. The verbatim upstream references stay in `references/upstream/`.
