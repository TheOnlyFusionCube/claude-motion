# Changelog

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
