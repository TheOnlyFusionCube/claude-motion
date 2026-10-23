# Retained-world film grammar (v1.6)

Read this before any new short film, explainer, or software walkthrough. Read `upstream/motion.md`, `upstream/film-api.md`, and for longer clips `upstream/walkthrough.md` too. The source's private `kit` cannot be ported by copying prose: this package ships a smaller, **executable**, deterministic Canvas2D stage built for portable coding agents.

## A film is not a stack of independent render branches

**Default source:** `assets/vanilla-film/src/world.mjs`, `scenes.mjs`, and `main.mjs`. **Avoid** time switches such as `if (t<5) drawSlideA(); else drawSlideB();`. Keep a single world containing the subjects and objects needed across beats; `FILM.chapters` changes narration/meaning and camera scale, not the entire picture or the world coordinate frame. Each shot follows an **actor ID** across location and state changes. Keyframes are functions of absolute `t`, not frame accumulation. The camera transform is applied to the *whole world*; target labels, typed text and pointers are anchored to the same world coordinates. A cursor must move towards actual controls, not an unrelated screen-space overlay.

In the default 14-second proof:

- One actor, `signal`, keeps its ID and forward world position through request → PHP engine → changed heap state → recovery, with a camera that follows it without jumping.
- Four different physical/stylistic world mechanisms replace recurring identical panels: browser sheets, processing turbine, corruptible physical memory columns, and verification aperture. They remain at fixed world positions while the camera moves.
- Each time-coded event is represented in the **same renderer trace** as `drawFrame(t)`; `world.actorAt(id,t)`, `world.cameraAt(t)`, `world.toScreen(x,y,t)` and `world.trace(t)` are safe to seek in any order.
- The browser player exposes both `window.__motion.seek(t)` and `window.__motion.trace(t)`. `scripts/audit-stage.mjs` imports the same `storySample()` used by the picture renderer, checks actor/camera travel, persistent IDs, no teleport, three shot scales, and named causal events.

This is a minimal 2D **technical/creative mechanism reference**, not a recreation of the original proprietary Motion player or an advanced art-directed launch. For actual film-quality assets, design your own visual world, typography, physically different focal compositions, transitions, score and camera beats.

## Required hard-shot workflow for films over 30 seconds

1. **Define a visible story action** from the input facts. A question, claim or text card is not itself an action. For a PHP security explainer: show real request → unsafe boundary → state consequence → patch → verified state, not five annotated title panels. Do not invent security claims; distinguish conceptual diagrams from actual measurements.
2. **Write a numbered 1-second-per-frame storyboard** for the first difficult 10-15 seconds. Choose an authored look based on the subject, not a default teal grid or generic panel. Identify the persistent actor, actual state mutation, camera lens, narration and sound cue on shared `TT.*` anchors.
3. **Render two or more wide/macro proof stills plus a rough moving sequence.** Camera motion should reframe a changing process in world space. Require the actual subject to progress even when titles are readable. Do not confuse a faint moving accent with the story action. Show someone real output frames before spending time on a two-minute export when collaboration is possible.
4. **Expand to long-form chapters** in 4-8 beats each, with a new meaningful *action* approximately every 2-6 seconds. A 120-second film needs substantially more than four static backdrops. Repeat the same actor/symbol across chapters; do not just swap paragraphs.
5. **Sample renderer-state evidence:** `node scripts/audit-stage.mjs assets/vanilla-film/src/scenes.mjs --strict`. For a different stack, provide an equivalent importable `storySample(t)` from the actual rendering implementation; do not submit an independently fabricated motion-plan log. Declared action tracks and actual camera coordinates are separate evidence.
6. **Encode and watch everything at normal playback speed**, not solely a contact sheet. Run `node scripts/audit-video.mjs output.mp4 --mode launch --continuous --strict --sheet qa.png`, inspect shot boundaries, and use `scripts/review-film.mjs` to record timestamped human/agent review notes and frame evidence. A green trace/pixel report is not visual approval.

## Browser restrictions and offline rendering

The player is HTML/Canvas2D. If Chromium cannot open localhost or the user's environment lacks CDP, render the SAME `scenes.mjs` source with:

```
node scripts/audit-stage.mjs assets/vanilla-film/src/scenes.mjs --strict
node scripts/render-stage.mjs --out scene.png --still 6.5 --scale .67
node scripts/render-audio.mjs assets/vanilla-film --out score.wav
node scripts/render-stage.mjs --out scene.mp4 --scale .667 --fps 24 --audio score.wav
```

The offline SVG recorder handles only the primitives used in the starter and requires `sharp` + `ffmpeg`; it is not a substitute for general Canvas filters, gradients, video layers, browser fonts, real DOM or WebGL. For projects with native Remotion/Motion Canvas/Three.js, use their renderer and instrumentation instead of shoehorning into this limited starter.

## Acceptance distinctions

- **Machine-verifiable:** a subject persists; its world position changes; the camera is genuinely moving and framing at varied scales; the frame renderer is deterministic; a long mostly static infographic fails the supplementary pixel-coverage diagnostic.
- **Human/art-directed:** each shot is actually interesting, typography remains readable, camera framing is motivated, transitions carry the eye, UI interactions are faithful, and the score fits the story. No test currently proves this automatically.
- **Release evidence:** save exact frames, full MP4, motion-plan, source SHA, `audit-stage` output, `audit-video` output, and a critical timestamped review. If the evidence is missing, do not claim studio-quality output or an approved film.
