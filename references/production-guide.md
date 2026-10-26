# Production guide for the local Claude Motion renderer

This is a working reference for **this repository's** stage, code, examples and command-line tools. It is written for the standalone implementation; no mirrored Motion artifact-type document, private player, hosted Artifact service or network request is needed to follow it. Use `SKILL.md` for the direction workflow, `references/kit-api.md` for exact function signatures and `references/recipes.md` for implementable camera and transition patterns.

## Prepare a film

1. Establish the subject, intended audience, output dimensions, source material and any claims that must be accurate. Use the style/colour/length questions in `references/intake.md` only when the brief leaves them open.
2. Choose one physical or visual thread that can be tracked throughout the film. For a feature demo, this might be the same input as it moves through an interface, chart and visualization; for an abstract piece, it could be a shape or sound cue that changes form.
3. Draft `BEATS.md` before editing `film.js`. Give each segment a time range, an observable change, the camera position, visible copy, transition hand-off and audio cue. An action should make something happen, not merely reveal the next panel.
4. Read the nearest local example's `BEATS.md` and `film.js`. The examples are executable demonstrations, not a requirement to imitate their visual identity.

| Film need | Local code to inspect |
| --- | --- |
| UI and camera choreography | `templates/starter/film.js`, `examples/launch/film.js` |
| Physical motion across large scale | `examples/journey/film.js` |
| High-energy transitions and motion blur | `examples/reel/film.js` |
| Graphic type | `examples/poster/film.js` |
| Device-like interfaces | `kit/ui/devices.js`, `examples/app-promo/film.js` |
| Spatial DOM and objects | `kit/three-kit.js`, `examples/tabletop/film.js` |
| Style presets | `kit/styles/index.js`, `references/styles.md` |

## Build against the shipped API

Create the working folder with `node scripts/new.mjs my-film` (optionally `--style editorial`, `--portrait` or `--square`). A film is a JavaScript module exporting `width`, `height`, `fps`, `duration`, optional `css` and `chapters`, and the functions `init(kit)`, `render(t, kit)` and `score(S, kit)`.

- `init` creates and measures the DOM and Three.js objects once. Load images and fonts here, before seeking. Build a world with enough area for the camera to travel through.
- `render` receives arbitrary timestamps in arbitrary order. Set positions, opacities, text, camera and visibility from `t`, not from the previous frame. The player may seek backward for inspection or render frames in parallel; incremental state, CSS animation and wall-clock timing do not survive that workflow.
- Keep a named timeline in one place (`const TT = { ... }`) and use it for visual effects and audio. Use `kit.seg`, `kit.keys` and the local easing helpers rather than timers. Seed any procedural detail with `kit.rng(seed)`.
- Use `kit.Camera` for DOM-world scale changes. Keep captions or overlays that should remain fixed in the stage layer, outside the camera world. Use `kit.space` for CSS 3D interfaces and `kit/three-kit.js` for actual 3D geometry. The renderer doesn't require third-party instruction files for either path.
- For complex artwork, add a `motionBlur` film setting and identify fast moments with `fast` spans. The preview and still renderer respect this setting; `--draft` export skips the expensive blur pass.

A retiming exercise should be simple: if a tap moves from 5.0 s to 5.6 s, its cursor landing, UI response, sound and camera arrival should all move from the same `TT` value. Verify a frame before and after the tap, not just the final state.

## Matching an existing interface

For an authorized product demo, inspect the user's supplied design tokens, CSS, components, imagery and typefaces; reuse their own files where the user has rights to do so. Recreate only the details required by the storyboard. Make interaction state visible (pointer down, typed character, loading completion, changed chart) so the film tells a story without narration.

When source files, access or permission to replicate a third-party interface are absent, use an original conceptual UI. Keep assertions factual and mark invented data or speculative product behavior. Do not import another company's brand materials on the assumption that public availability grants reuse rights.

## Compose a local score

`score(S, kit)` creates event data that `scripts/score.mjs` turns into a WAV. It is independent of the browser's playback timing. Select patches with `S.program`, place notes/chords with `S.note` and `S.chord`, and add percussion with `S.drum` or `S.drums`. For exact UI events, put `S.fx('click', TT.tap)` or another available foley name at the same timestamp as the visual change. `S.ticks(kit.typing.times)` can align typing sounds to a typist created by the kit. Details and supported sound names are in `references/kit-api.md` § Score; `templates/starter/film.js` demonstrates a full score.

Keep the opening quieter than the main action, separate simultaneous cues so they remain audible, and leave time for the final sound to decay. Use your own composition and recordings or assets you may license; do not assume a recognizable song is available for reuse. If the brief intentionally calls for silence, say so in the delivery.

## Check what the renderer produced

Run these commands from the repository root, replacing `my-film` with the film directory:

```sh
node scripts/doctor.mjs
node scripts/frames.mjs my-film --at 0,2,5,end --sheet --out /tmp/motion-stills
node scripts/check.mjs my-film
node scripts/score.mjs my-film --levels
node scripts/export.mjs my-film --draft --out /tmp/motion-draft.mp4
node scripts/review.mjs /tmp/motion-draft.mp4
node scripts/export.mjs my-film --out my-film/film.mp4
```

Review the contact sheet at a small viewing size and reopen full-resolution frames around the most important hand-offs. Check for text clipped by zoom, overlapping objects, a camera that never changes scale, or long intervals where only a heading changes. Re-render after fixing those issues. `check.mjs` flags deterministic rendering failures and some visual smells; it does not replace looking at frames. For an export, inspect several decoded MP4 frames and listen for missing or late sound cues. Report what actually rendered, and explain missing tools instead of claiming an unproduced video.

## Offline and distribution boundaries

The JavaScript player, presets, examples and templates operate without `references/upstream/`. Node, Chromium/Playwright and FFmpeg may need to be installed to render media, but no upstream-text download is part of installation or verification. `npm run verify-portable` checks the local skill files, stale links and known verbatim-source fingerprints without contacting a mirror. The source history and unresolved rights question are documented separately in `SOURCE.md` and `NOTICE.md`; neither file is an instruction to fetch source text.
