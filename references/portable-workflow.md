# Portable Motion workflow — source-preserving execution

This is the **operational bridge**, not a replacement for the unedited reference collection in `upstream/`. All twelve sources ship with the skill. Treat the originals as the design and review authority; execute this file whenever source prose calls for Anthropic's private Artifact/ArtifactData/`kit`/`window.CUT` APIs, `show_widget`, the player database, or the page's Export button. Use the coding agent's *real* local project files, browser and tools instead.

## 1. Intake: preserve the source's three creative choices

Read `upstream/questions.md` for the original options and palette mechanics. Collect **Style, Colors, Length**, skipping values the user already supplied. If a choice is essential and a user is available, ask once using the host's supported question mechanism or a concise text question; no private widget. Do not turn intake into an extended interview. For "just make it," pick and proceed.

- **Style:** Invent three or four markedly different looks grounded in this film's actual subject, not generic "Modern/Playful/Bold" labels. One- to three-word titles; concrete one-line treatments of material, shape, light, and movement. Choose the best one first. No imitation of a named studio's proprietary style.
- **Colors:** Honor the user's existing brand/design-system tokens first (read files if provided). Build up to four four-color palettes in original **ground/main/second/accent** order, with readable foreground on ground (normal body text at least 4.5:1). `main` establishes the feel and `accent` has one expressive task. Don't spill the film's accent into an accurately recreated product UI.
- **Length:** Usually 10/20/30 seconds; default 15–30 seconds as the source describes, and respect a specifically requested length. The source's film-player limit of 300 s does not impose a limit on another renderer, but say when local tooling has a practical limit. Capture aspect ratio and output venue in the brief; recompose each aspect ratio.

Keep these decisions in a normal file (`film/scenes.json`, `film/brief.md`, or the framework's native configuration) so revisions do not silently change them. For storyboarding-only requests, consult `upstream/plan.md`: 3–8 ordered cards, one sentence about what happens per card, visually distinct frame sketches, and a storyboard deliverable **without** treating it as a finished film.

## 2. Match original rough-cut scene semantics

Read `upstream/rough-cut.md` *before* constructing a new scene inventory, and `upstream/finalize.md` when turning rough work into completed scenes. The local manifest can use the **same portable subset** of the original `modules/scenes.json` values, but it is stored as an actual file rather than a remote record. Example:

```json
{
  "v": 1,
  "stage": "rough",
  "look": "Cast paper: wide type and paper shapes assembling carefully",
  "palettes": [["#152B39", "#EAB65B", "#F5F0E5", "#659CB1"]],
  "theirs": 0,
  "width": 1920,
  "height": 1080,
  "fps": 60,
  "background": "#152B39",
  "scenes": [
    {"id": "open", "name": "The idea", "dur": 3, "desc": "The title becomes the hero object."},
    {"id": "action", "name": "One action", "dur": 12.5, "desc": "The hero object becomes the interface and shows one real interaction."},
    {"id": "close", "name": "The close", "dur": 4.5, "desc": "The result folds into the closing mark."}
  ]
}
```

Keep original `scenes` fields `id` (stable `[a-z][a-z0-9-]{0,31}`), `name` (1–3 words), `dur` (>0), and `desc` (one plain action). No more than 24 scenes; each >=1 second; end card >=3 seconds. Compute cumulative starts from durations; use ID-based names for reviewer anchors, not list positions. Keep `stage: rough` until delivery is demonstrably final. The bundled validator checks these rules:

```sh
node /path/to/claude-motion/scripts/validate-film.mjs film/scenes.json
```

**Important**: The source's instruction to write the rough record and immediately finish scenes one by one is about showing progress in its live player. Here, create a file-based rough manifest, write real scene modules incrementally, and preview them locally. Never use `ArtifactData` records, `set`/`batch`, `if_version`, `type_url`, `_blob` references, or expect scene-placeholder cards from a private player.

## 3. Finish a scene according to original craft

Read `upstream/motion.md` in full. Read `upstream/film-api.md` for the deterministic functional model and motion devices, not for library imports. The source's `window.CUT = kit.scenes()` and `kit.scene()` are **descriptive of its proprietary runtime**. Instead use the chosen project stack's normal scene components (Remotion, Motion Canvas, CSS/SVG/Canvas2D, etc.). The bundled `assets/vanilla-film/` is an executable no-framework example.

For each scene:

1. Begin with a readable frame at `t=0` for the whole film. A title first appears already legible—pre-roll entrance timing if needed.
2. Build one focal subject and one complete action. If a moving character/object continues across a cut, match its outgoing x/y/scale/pose/velocity at the next scene's first frame.
3. Keep every visible, dynamic property a deterministic function of `t`, including keyboard caret and individual typed characters, camera push, shadows, mark jitter, and cursor paths. `init()` may preload/measure; `render(t)` resets **all** dynamic state, irrespective of prior seeks.
4. Follow the **actual** camera/type/cut/hold numbers in `upstream/motion.md`, not a generic animation preset. Transform ideas instead of using wipes. Use the film's chosen palette with clear type, avoiding gratuitous gradients, particles, 3D or stock motion. In a UI, no squash/bounce/blur.
5. Only finish the whole film after last scene, original wordless score (unless deliberately silent), still inspection, deterministic seek tests, and requested file exports.

## 4. Product UI fidelity and walkthroughs

Read `upstream/recreate-ui.md` for a film showing the user's actual product; use **its component tree, compiled CSS, actual tokens, icon paths, fonts, copy, states and precise dimensions**. Browser-snapshot the real component or rebuild from its source, not from memory. Record files, line numbers, approximations, image/font ownership and concept-only elements in `SOURCES.md`. Give speculative visuals a visible, quiet in-film label.

Read `upstream/walkthrough.md` for a 35–50 s one-flow or 3–4 minute multi-flow tutorial. Port its 0.55–1.2 s camera moves; 1.4–2.2 s region holds; 1.6–2.4× zoom; 0.5–0.9 s arced cursor movement followed by a 200–300 ms settle; anchored six-word-or-less caption chips; spotlight masking; honest UI causality. `kit.chip`, `kit.spotlight`, `kit.cursor`, and `kit.Camera` must be reimplemented or mapped to real framework effects. **Do not call them unless the running project defines them.**

## 5. Styles and art-direction controls

`upstream/styles.md` describes six built-in styles of the source **player** (`sketch`, `bubbles`, `editorial`, `bold`, `midnight`, `showcase`) including their palettes and adjustable parameters. This package preserves all those definitions unchanged. In a portable runtime, the names and values are **design recipes, not installed presets**. To support "sketch, marker + mint" or "editorial, evergreen" in local files:

1. Read the source's exact description and permitted values; resolve role colors and typography.
2. Author ordinary CSS/SVG/Canvas assets with an explicit `look` configuration. Bind *all* on-screen copy to content data, not scattered string literals, when runtime style switching or revision is requested.
3. Implement and test the chosen style's transitions locally; do not falsely promise the proprietary player's live style-switching or in-place text editing.

Source `upstream/plan.md` and `upstream/styles.md` require persistent user edits in private `edits.json`/`tweaks.json`. In a local project, treat `plan.json`/`look.json`/content data as **user-owned state**: read first, preserve unchanged IDs/text, and never wipe user edits during a remake.

## 6. Musical and graphical fidelity

Read `upstream/sound.md`. Choose the musical beat by the cut, with Foley at the exact seconds of keystrokes, clicks, result appearances and resolved UI states. A warm, original, wordless score with a distinct intro → groove → result → outro arc is the default. Use licensed/user-owned material or synthesize original notes. The bundled starter's `SCORE.events` plus `scripts/render-audio.mjs` create deterministic WAV data. `S.tempo()`, `S.program()` and `S.fx()` as written in upstream only exist inside the original player: **map the event data**, do not execute the API call. Export MP4 plus WAV via the user's framework or the bundled FFmpeg pipeline when asked. Make sure the finished file contains audio if you claim it does.

For stills: `upstream/render-offline.md` documents the source's security-minded inspection procedure, but its headless `window.__animation` belongs to the original player. The bundled example exposes `window.__motion.seek(t)` instead. Do not copy binaries, packages or executables out of untrusted film folders; isolate render processes and guard network/file access when evaluating unknown code.

## 7. Revision, QA, and handoff

User requests override aesthetic defaults, not the need for truthful display. For a review pin, map `Location: M:SS` and `Anchor detail` percentages to `scene.start <= t < scene.end` and `x = percent * width / 100`. Stable scene IDs and scoped styles mean **targeted changes stay targeted**.

Render and *visually inspect* first frame, all cut boundaries, UI click frames, typography at phone scale, and close. Capture contact sheet; verify forward-then-back seek equality; verify audio start/end and cue sync; verify last card holds >=3 seconds. Run the scene manifest validator, any unit tests, and export tooling. A successful ZIP build or test pass is **not** proof of visual parity; report unrun browser tests plainly. Mark `stage: final` only when actually deliverable.

End with a link to project files and any requested video; say what is approximate or unverified. Preserve the exact upstream docs **unaltered** in `references/upstream/`; coding-agent compatibility belongs in this adapter and the active `SKILL.md`.

## 8. A demo/showreel must meet the original film's visual promise

Read `references/showreel.md` before making a skill/tool promo or any "demo video" brief, even when no real product UI is supplied. Write evidence shots (input/action/output, UI cause/effect, intentional camera or morph) before laying out static titles or brand cards. At least two different kinetic devices must be visible. A row of labeled coding-agent names is not evidence of cross-agent compatibility.

After exporting, inspect the **actual encoded frames** and call `node scripts/audit-video.mjs <mp4> --mode showreel --strict --sheet <sheet.png>`. The audit catches prolonged mid-film stagnation and low pixel resolution. Inspect the sheet, sound and readable mobile sizing manually. An error requires revision before claiming a finished promo unless the user explicitly requested that static visual treatment. Never equate 100% verbatim documentation parity to 100% visual or product-quality parity.
