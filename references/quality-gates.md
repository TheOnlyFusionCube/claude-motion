> **Asset-led cinematic 3D:** See `references/3d-asset-lighting.md`. Before rendering an entire 3D animation, pass a wide **and** close render with an actual authored hero GLB or equivalent licensed model, deliberate area/HDRI lighting, readable material response, intentional environment hierarchy, and source/texture/draw-call preflight. If Blender/Three.js cannot run in this environment, do not claim the result's premium look was verified.

# Finishing gates for delivered motion films

Read with `references/showreel.md` for promos/showreels or with `upstream/walkthrough.md` for product tutorials. Use the source Motion pages for actual style/timing; these gates stop a coding agent from equating a successful render with a successful film.

## Before the first line of drawing code

- Identify audience, exact promise, format, footage/UI assets, actual interaction, and emotional arc. The output should contain something that a screenshot or slide could not communicate.
- Choose a **subject**, not a theme: `"motion design"` is a theme; `"a tiny blue point traces a path, becomes a timeline playhead, and changes the composition"` is an animatable subject.
- Write **before → action → after** for the 2–4 principal visual beats. A sentence like `"show our features"` is not an animatable action.
- Make a distinct visual composition for each beat. Four matching cards with new headings do **not** constitute four scenes.
- List user-provided references / actual product UI. No access to real UI? Label illustrative film content explicitly.

## QA loop — do not skip for a file requested as final

1. Render the complete film with music and inspect **the resulting file**. Verify actual width, height, duration, frame rate, and audio stream using `ffprobe`; don't infer output size from your source canvas.
2. Generate or capture evenly spaced stills AND extra stills 0.2s before/after every cut, cursor interaction and major camera move. Inspect at least 8 distinct timestamps for a 15–30s film, ideally a contact sheet. Check first frame, end-card hold, subject continuity, and offscreen elements.
3. Check at two sizes: full rendered image and a 640px-wide/mobile-sized image. Critical UI copy should remain legible. As a practical 1080p target, information-bearing captions should generally appear ≥26px tall on the full frame after camera zoom; tiny top bars can be decorative only.
4. Watch the **silent** film. Every major section needs either a true change of state or a purposeful action, not merely a title on an unchanged layout. An unchanging section lasting ~3s is a serious issue **even in a title, establishing shot or closing hold**: the original source insists on subtle movement throughout. A deliberate freeze requires explicit user intent; an end card can stay readable while creeping.
5. Listen to the score and watch sync. Sync clicks/ticks to exact playhead times and differentiate intro / action / payoff / closing in dynamics. Simply having an AAC stream does not establish a good score.
6. Seek backward and forward for deterministic output; catch animation state that depends on previously rendered frames.
7. Run the automated check below. **Do not override a failure silently.** Revise or explicitly explain why the user requested that unusual aesthetic; only user preference should override the creative brief.

```sh
node <skill-folder>/scripts/validate-motion-plan.mjs ./motion-plan.json --strict
node <skill-folder>/scripts/audit-video.mjs ./output.mp4 --mode showreel --continuous --strict --sheet ./qa-contact-sheet.png
```

Flags: `<720`-pixel short-edge resolution, 3+ second almost-unchanged **anywhere** (including opening and end cards), near-solid frames around transitions, missing audio (advisory), and unusually low overall activity (a blocking problem in continuous mode). Use `--mode product`, `walkthrough`, or `ambient` for less kinetic intent. Read `references/perpetual-motion.md` for the original default of motion during all holds and for the distinction between quiet motion carriers and subject-driven visual storytelling. A motion plan alone is not enough: watch the exported movie from beginning to end. This lightweight pixel test does **not** establish artistic value: subtle transforms can be powerful and busy but meaningless movement can score high. It exists only to surface likely failures for a human/agent to review.

## Distinguish technical from creative tests

| Programmatic evidence | Still requires looking/listening |
| --- | --- |
| PNGs export, MP4 decodes, duration/fps/resolution are valid | Does the first frame command attention and the ending resolve? |
| Pure-time seeking, stable scene IDs | Is the interaction plausible and the UI truly faithful? |
| Detected changed pixel area and longer flat intervals | Is movement purposeful, paced, and visually differentiated? |
| AAC/WAV audio track exists | Does the score have an arc and precise action-level foley? |
| Source documents match hash | Does the film live up to the *creative* rules in those documents? |

Never report "quality verified" on the strength of source hashes, unit tests, export success, or audio presence alone. Describe **what was viewed** and **what remains unverified**. If browser QA is blocked, use the rendered MP4's decoded frames and the FFmpeg-based audit; if no export is possible, report that the output is unverified rather than claiming that it is ready.

## Release acceptance for a skill/self-demo video

A self-demo should show all of: (a) an action that changes content, (b) a visible UI/creative transformation, (c) at least two truly distinct shot scales or compositions, (d) a coherent sound/picture relationship unless mute was requested, and (e) a focused resolving end card. The above includes visual choices, so an agent must explicitly **look at evidence** before it checks those off. Tests are guardrails, not a creative director.

## 3D or narrated launch benchmark

If the reference has a 3D city/data segment or live narrated walkthrough, read **both** `references/3d-data-films.md` and `references/launch-film.md`. Verify a real yaw/pitch/orbit camera (two timestamped images with different visible building faces), 3D world-coordinate source mapping, and a value/label drawn from the *same data state*. For launch films also verify the source UI footage is real/authorized, narration is genuine or clearly an approved synthetic recording, captions match spoken content, edits land on speech/action beats, and `audit-video.mjs --mode launch --require-audio` passes. Never substitute a static chart, one-sided oblique backdrop or fake product screens for the requested proof.

## Cinematic 3D appearance gate — added after failed user review

A valid 3D camera and consistent data-linked labels are necessary but **nowhere near sufficient**. The previous Pillow-projected city had all of these and still looked basic. Read `references/cinematic-3d.md`. A *premium* 3D deliverable is rejected unless a reviewer can identify distinct geometry families and a hero silhouette, coherent set dressing (roads/plaza/landmarks, not regular blocks alone), visible surface/material and lighting/shadow depth, foreground/midground/background separation, and at least one legible macro shot with real physical action. Inspect source render frames before postprocessing; adding gradients, glow, or more small text cannot repair poor geometry. Look at the *actual* reference for craft standards and never claim parity based on a technical benchmark. If modeling assets or a renderer are unavailable, deliver an honest look-dev storyboard instead of a fake premium movie.
