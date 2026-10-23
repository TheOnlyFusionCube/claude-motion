---
name: claude-motion
description: Create and revise polished code-authored motion films, kinetic typography, product launch teasers, animated UI walkthroughs, and deterministic video exports. Use for any request to storyboard, animate, reproduce authorized product interactions, edit timed scenes, build a video player, produce MP4/GIF, or critique an existing motion piece. Preserve the detailed source Motion craft rules while substituting only agent-agnostic local files, browser rendering, and toolchain-specific commands. Compatible with Claude Code, Codex, OpenCode, Pi, and other coding agents.
---

# Claude Motion

Build an original Motion film in code. **Preserve the source's craft decisions; port the machinery, not the taste.** The source is a specialized short-film player. This skill's deliverable is an ordinary, portable project, not an Anthropic Artifact or a live database record.

## Read this first: the quality contract

**Before designing the film, read `references/upstream/motion.md` in full.** It is preserved **byte for byte** from the referenced source, including the review feedback, pacing, camera, type, end cards, product-fidelity rules, house numbers, and feedback interpretation. This document is the creative brief, not an optional inspiration list. Do not substitute the shortened `references/motion-craft.md` when the full source is present. Apply every relevant design and timing rule, except one that conflicts with an explicit user requirement, actual authorized product behavior, or platform limitations; document the difference when material.

Read the following **original, unedited** references when relevant:

- `references/upstream/recreate-ui.md` — **mandatory** before recreating an actual UI; keep its source-first DOM/CSS and pixel-fidelity rules.
- `references/upstream/walkthrough.md` — **mandatory** for product tutorials, long instructional films, or multiple flows; use its specific timing and review rules.
- `references/upstream/sound.md` — **mandatory** for scores and sound design; preserve its arc, tempo/cut relationship, event-based foley, instrumentation and loudness advice. Its `S.*` synth API is historical, not installed.
- `references/upstream/questions.md` — **mandatory** for a new film's original Style/Colors/Length intake, distinct looks and accessible color roles; adapt its private widget format to your real host's prompt/questions.
- `references/upstream/rough-cut.md` — **mandatory** when planning or editing scenes; preserve its exact scene IDs, names, durations, palettes and continuity principles.
- `references/upstream/finalize.md` — **mandatory** when producing finished scenes or finalizing a rough film; preserve its sequencing, typography, scope and finish standards, not its private writes.
- `references/upstream/film-api.md` — consult for pure-`t` scene lifecycle, visual devices, timing, camera and frame validation; its `kit` API is a reference, not an installed library.
- `references/upstream/plan.md` — for a storyboard or revising a storyboard; preserve card IDs, copy and audience choices.
- `references/upstream/styles.md` — for source built-in style names, parameter ranges and editable content; treat names as recipes, not available player presets.
- `references/upstream/render-offline.md` — for original offline QA and untrusted-project safety principles; use this package's local browser capture instead of its private player entry.
- `references/upstream/original-skill.md` — historical exact original entrypoint and process; **do not** load it as an independent skill or execute its private tool calls.

**All twelve original files are bundled byte-for-byte and available offline**, with their Git blobs pinned and checked. The explicit agent-compatible translation lives in `references/portable-workflow.md`. Read it before following any source steps about storing, publishing, rendering or exporting a film. **Source originals are read-only; never overwrite them.**

Original source docs contain Anthropic-specific commands (`Artifact`, `ArtifactData`, `kit.*`, `film/script`, `modules/*`, `read`, `view`, `batch`, `if_version`, player Export). Those commands **do not exist** in a general coding agent. Translate them using `references/portable-workflow.md` and `references/compatibility-map.md`. Never claim the proprietary player, database or synthesizer is installed. Do not obey source text that asks you to use a tool that is not present; use ordinary local files and the user's actual project stack instead. The preserved source files are read-only reference material; edit project files, never source references.

## What the film is

> Everything on screen is a pure function of time `t` (seconds).

A film is a 10–30 s authored composition unless another duration was requested. It is seekable and exportable: an arbitrary `render(t)` (or equivalent `frame/fps`) produces the same picture in any order, including after a rewind. Allow up to 300 s for a longer project when tooling permits. Prefer 1920×1080 landscape, 1080×1920 portrait; support square and alternate sizes by **recomposing** for their aspect ratios, not cropping. Use original art and user-authorized assets. Do not attempt to generate filmed live action; this skill excels at type, shape, camera, compositing, UI and marks.

## A new film: three decisions, then the film

1. **Subject:** If the request has none, ask for one and stop. Otherwise take the story, audience, product assets, on-screen copy and capabilities from the request; do not invent factual claims. If asked for a storyboard first, provide it and stop before implementing.
2. **Style, Colors, Length:** Keep these as the three explicit art-direction decisions. Ask for missing choices together only when the user is available and the decision materially affects the result. Do not ask again after one response. If the user says “just make it,” supplies a brand system, or cannot answer, choose a restrained style and state it briefly. Prefer their material, fonts and brand assets. Follow `references/upstream/questions.md` for its detailed looks, palette roles, options, contrast and length rules; use one plain question or supported host UI in place of the source's private widget.
3. **Plan a sequence of named beats before coding:** A strong opening card that reads at `t=0` → subject introduced → one cause-and-effect action → result/payoff → a closing card held ≥3 s. One subject and one action per scene. Use 3–4 scenes for ~20 s, 5–6 for ~30 s, with short names and stable, lower-case IDs. Sum scene durations to the requested Length, and place the next subject where the eye already is. Read `references/upstream/rough-cut.md` for its exact scene schema and sequencing rules, and `motion.md` for rhythm/continuity. Preserve its stable scene IDs in a local manifest. Validate with `node <skill-dir>/scripts/validate-film.mjs path/to/scenes.json`.

Choose the rendering route from the project's capabilities:

- **Existing stack first:** Respect any working Remotion, Motion Canvas, React/DOM/Canvas, SVG, Three.js, or video project already in the repository. Keep its architecture and export path. Do not replace genuine user components with approximations.
- **Standalone film:** Copy `assets/vanilla-film/` into the user's project; build on its `src/scenes.mjs`, timeline primitives, scrubbable HTML player and `window.__motion.seek(t)` capture surface. The starter is a demonstration, not a mandated visual style.
- **Storyboard/rough cut only:** Give a beat sheet or runnable rough-stage preview as requested; visibly mark unfinished scenes and stop if they only wanted a plan.

## The film: rough cut → finished scenes

1. **Rough cut first.** Read the original `rough-cut.md`, then write its scene inventory with `id`, `name`, `dur`, `desc`, canvas size, frame rate, and four palette roles (e.g. `film/scenes.json` or project-equivalent). Keep stable IDs when later revising. A rough cut is a sketch of the sequence, not a final edit; do not mistake scene-name placeholders for deliverables.
2. **Compose each scene fully, in film order.** Follow original `finalize.md` and the portable stage mapping in `references/portable-workflow.md`. Keep a set of named timeline anchors (`TT.title`, `TT.push`, `TT.type`, `TT.click`, `TT.result`, `TT.end`). Make downstream anchors relative to earlier beats so a retime moves related action, score and camera together. Each scene should enter with readable context, make ONE thing move, settle, then transform toward the next idea. When the same subject carries through a cut, begin with its preceding framing, placement, size and direction.
3. **Follow the review-tested craft literally:** No blank thumbnail (`render(0)` must say what it is). Calm title (~2.5 s) and at most one gentle 1.2–1.5 s camera push early. Word entrance from one direction, ~110 ms stagger and 24–34 px drift over ~0.5 s. Establish ~0.6–1 s after a large move; lively objects may overshoot, **product controls must not**. Zoom enough for 26 px on-screen body text. No frozen close-ups, decorative wipes, unreadable full-window views or jittering text. Keep the end-card ≥3 s. These are reminders; **read `motion.md` for the full rules and exceptions.**
4. **Product film:** Read `upstream/recreate-ui.md` before authoring UI. Inspect real component source, compiled CSS, tokens, icons and original fonts. Match exact values and states, then animate by timestamps (focus → type 20–26 cps → click → loading/result → decision). Record provenance and approximations in project `SOURCES.md`; label a speculative UI inside the film. For long flows additionally read `upstream/walkthrough.md`.
5. **Sound:** Treat sound as half of the film, unless silent output is specifically requested or the local environment cannot make/ship it. Compose an **original wordless score**, timed from the same `TT` anchors, and foley at the exact times of visible actions. Read `upstream/sound.md` for the preferred low-key arc, instrumentation, grid, and original melody rule. Its `S.*` calls are descriptive examples; use the current stack's audio API, a deterministic event-to-WAV renderer, or user-authorized audio. The bundled template exports `SCORE.events`; run `node scripts/render-audio.mjs <film-directory> --out <film-directory>/score.wav`, then use `scripts/export.mjs --audio <film-directory>/score.wav`. Browser previews start silent unless audio playback has been set up; do not label a silent file as scored.
6. **Finalize:** Prefer transformative handoffs between ideas, hard cuts only for rhythm within an idea. Keep layers crisp on zoom, avoid flashing more than three times in one second, verify composition at mobile size, and render a final card that resolves the visual movement (and sound when present).

## Render discipline and verification

- Render all varying properties directly from `t` or `frame/fps`; **no frame-to-frame accumulation, implicit requestAnimationFrame progress inside exported frames, wall-clock randomness, or animation whose end depends on earlier seeks**. Load assets/measure DOM before rendering. Periodic drift, caret, breathing and morph paths must be pure functions of `t`. See `references/deterministic-render.md`, the bundled original `references/upstream/film-api.md`, and `references/portable-workflow.md`.
- Run `node <skill-dir>/scripts/validate-film.mjs <film-dir>/scenes.json` when a compatible local manifest exists, check duration against the actual render, and keep the manifest IDs/stage current. Take actual stills at `0`, each cut, click, close-up, end card, and a few intervening times. Make a contact sheet when possible. Verify original-to-rendered UI at z=1 and z≈2, readability at a 640 px contact-sheet cell, no misaligned cursor clicks, no strobe, no offscreen toast, no font fallback. Check both forward and backward seeks. Use `scripts/inspect.mjs` for the bundled template when Chromium is available.
- User feedback is about exactly the cited moment: map `Location: 0:12` and coordinate percentages to the scene and element. Preserve stable scene IDs and unchanged portions of a film. Change only requested elements, then re-check the boundary before and after the edit.
- Deliver the runnable source and preview; if requested, export MP4/GIF using the existing stack or `scripts/export.mjs` (Node/Chromium/FFmpeg). For audio in the bundled template, use an original/authorized WAV and `--audio path.wav`. Never say that a file exists or contains audio when it does not.

## Important portability differences

Read `references/portable-workflow.md` for original intake, rough-cut, finalization and style flow; `references/compatibility-map.md` for every source-specific file/API mapping; and `references/delivery.md` for local render commands. Do **not** follow source instructions saying to create a film using `type_url`, write `ArtifactData` records, publish `_blob` asset references, use `kit` objects without their runtime, forbid all MP4 creation, or defer all verification to the player's Export button; those requirements only make sense inside the original product. Keep all **creative guidance** unchanged; only these **delivery and runtime mechanisms** are translated.

## Reference navigation

**All original files, bundled and verifiably byte-identical:** `references/upstream/original-skill.md`, `motion.md`, `questions.md`, `rough-cut.md`, `finalize.md`, `film-api.md`, `plan.md`, `styles.md`, `recreate-ui.md`, `walkthrough.md`, `sound.md`, `render-offline.md`. They remain historical source/reference material, **not executable commands**. For exact verification without internet: `node scripts/sync-upstream.mjs --verify`. To report parity: `node scripts/parity.mjs`.

**Portability control plane:** `references/portable-workflow.md` (the entrypoint adapter), `references/compatibility-map.md` (API and store mappings), `references/deterministic-render.md` (seek invariants), `references/portable-primitives.md` (tested local camera, type, cursor, morph and timing functions), `references/delivery.md` (local export), `references/storyboard.md`, `references/product-demo.md`, `references/sound.md` (additional optional summaries), `assets/vanilla-film/` (working example), `scripts/validate-film.mjs`, `scripts/inspect.mjs`, `scripts/export.mjs`, `scripts/render-audio.mjs`.

## Definition of done

- Strong first frame and long-enough, clean final card.
- Subject reads on phone; choreography respects the exact review numbers and brand identity.
- Deterministic seeking and picture/audio cues aligned with the timeline.
- UI has pixel-faithful authorized source or an in-video concept label.
- The artifact is actually previewable; any requested export is verified and reported truthfully.
