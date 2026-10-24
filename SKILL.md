---
name: claude-motion
description: Make polished, continuously moving short films in code (product launch films, UI walkthroughs, animated explainers, kinetic type, data stories, 3D scenes) and export frame-exact MP4 with an original score. Use when asked to make an animation, motion graphic, promo, teaser, launch video, demo video, explainer, showreel or animated chart, to edit one, or to critique one. Asks style, colours and length up front; offers six style presets. Built on a deterministic DOM + Three.js stage with camera, cursor, typing, hand-drawn marks and a synth, and a direction method that produces films rather than animated slideshows.
---

# Claude Motion

You are directing a short film, written in code. A film here is `film.js`: an `init` that builds a
stage once and a `render(t)` that sets everything on it as a pure function of time. The stage is
real DOM (crisp type, real UI), with Three.js when the subject needs depth. `scripts/` renders exact
stills, checks, scores and exports.

**The bar** is the kind of film a product team puts in a launch: a camera that travels through one
world, a subject that something happens to in every shot, transitions that carry the eye, type that
moves with meaning, and sound timed to the picture. The usual failure is an **animated slideshow**:
a title card, then a panel that fades in, then another panel, each with a little entrance animation.
It can have perfect type and still fail. This skill exists to prevent that.

> **The slideshow test.** Take a still every 2 s. If they look like different slides (new layout,
> new heading, same static framing), it's a slideshow. If they look like frames from one continuous
> camera move over one world, with the subject visibly changing state, it's a film.

## Read before your first film

1. `references/upstream/motion.md`: the original craft rules and the numbers that review taught.
   Read all of it. Skip what's specific to its private player (Artifact, `kit.module`, check.ts).
2. `examples/launch/film.js` + `film.css`: a complete 34 s launch film (title → app → question →
   chart → push into a 3D city → comment → replay with the fix → end card, with score). It's the
   reference for structure and finish. **Copy its techniques, never its look, story or words.**
3. `references/intake.md` (the opening questions), `references/recipes.md` (the specific moves you'll use),
   `references/kit-api.md` (the API) and, if a preset is picked, `references/styles.md`.

## Workflow

### 0. Tools

`<skill>` below means this file's folder. Run `node <skill>/scripts/doctor.mjs` once: it checks Node ≥ 22,
Playwright + Chromium, WebGL and FFmpeg, and prints the exact fix for anything missing (usually
`npm i -D playwright && npx playwright install chromium`, plus FFmpeg). Without a browser you can still write
the film, but say you couldn't look at it.

### 1. Ask the three questions: style, colours, length

Take the story, product, copy and facts from the request and the user's material. Never invent claims
about a real product. If the subject is missing, ask for it and stop.

Then, for a **new film**, ask **Style, Colours and Length once, together, before the beat sheet**. These
are the choices people most regret leaving vague. Follow `references/intake.md`:

- **Use the host's question tool** (`AskUserQuestion` in Claude Code), all three in one call, your pick first
  in each row. Without such a tool, send one short message with numbered options and wait.
- **Style:** three looks invented for this film (a name plus one line you can picture), optionally with the
  best-fitting **preset** (`references/styles.md`: sketch, bubbles, editorial, bold, midnight, showcase) as the
  last option.
- **Colours:** their brand first if you can find it (request, files, the codebase's theme or tokens), then
  two or three palettes of your own, checked with `scripts/palette.mjs`.
- **Length:** three that suit the film.
- **Skip any row the request already answers.** Skip all three for edits, or when nobody can answer
  ("just make it", autonomous runs): take the first options and say what you chose in a line.

Whatever look you end up with:

- **Colour:** a ground, an ink, a muted grey and **one accent doing one job** (a second colour only if data
  needs it). Flat colour, soft real shadows, no gradient soup, glows, lens flares or emoji. A preset
  brings its own treatment.
- **Faces:** pick for this film rather than by habit. Bundled (no network needed): `Inter`, `Inter Tight`,
  `Fraunces` (+italic), `Instrument Serif` (+italic), `Space Grotesk`, `Manrope`, `Bricolage Grotesque`,
  `Shantell Sans` (hand-drawn), `JetBrains Mono`, `DM Mono`. Usually a display face over a text face that
  differs in kind. Their own font files go in `assets/` with an `@font-face`.
- **A preset is a look, not a film.** It still needs the beat sheet, the camera, actions and transitions.

### 2. Write the beat sheet before any code

This is where films are won. Write it as a table and keep it in `BEATS.md` beside the film:

| t | subject | action (a verb that changes it) | camera | carries into next by | sound |
|---|---|---|---|---|---|
| 0–2.4 | the question | words rise, creep | still, wide | the line shrinks into the app's field | pad, one mallet note |
| 2.4–5 | composer | cursor arrives, clicks Ask | 1.6× on the field, drifting | answer streams where the eye is | click; groove starts on the bar |
| … | | | | | |

Rules for the sheet:

- **Every beat has a subject and a verb that changes its state**: types, fills, drains, counts,
  travels, splits, morphs, lands. "Appears" and "fades in" are not actions. A beat whose only motion
  is an entrance animation is a slide.
- **One world, one spine.** Pick the thing the camera travels over (an app, a desk of cards, a
  map, a 3D city, a single object) and a subject that carries through. New ideas arrive in the same
  world, or by a transform out of the old subject. A cut to a fresh layout is the exception.
- **Every transition says how the subject carries**: the title becomes the field; the chart's dip is
  where we push into the map; the last subject shrinks into the logo's dot. No wipes, no stock
  dissolves between ideas. Hard cuts only for rhythm within one idea.
- **Show the cause, then the effect, on screen.** The cursor clicks, then the result builds.
  The data changes, then the consequence is visible. The viewer should be able to retell it.
- **At least three shot scales** in 30 s: wide/establishing, working (1.3–1.7×), and a close-up
  (2–3×) that arrives while something is still building.
- **Count it:** ~4–6 beats per 20 s, a meaningful change every 2–4 s, open calm (title ~2.5 s, at most
  one measured push early), end card held ≥ 3 s.

If they asked for a storyboard first, deliver the sheet (and a few key stills, if you've built them) and stop.

### 3. Build

`node <skill>/scripts/new.mjs <film-dir>` scaffolds the starter (`templates/starter`, a 14 s film
showing the grammar). Add `--style <preset> [--palette <id>]` to start on a preset (`templates/preset`), and
`--portrait` or `--square` for other sizes. Or start from a copy of the example. Then:

- **One `TT` cascade** of named times (`TT.click = 4.5; TT.result = TT.click + .3`). A retime moves
  everything after it, and the score reads the same constants.
- **Layers in paint order**: 3D canvas, then the camera world (DOM UI, cards, camera-space marks),
  then stage-space HUD and labels, then title/end cards, then cursors. One `Camera` on the world layer,
  `cam.apply(t)` first in `render`.
- **Build the world larger than the frame** so the camera has somewhere to go. Make mock UI dense
  (~1440×900 on a 1920 stage) and zoom 1.6–2.5× to work in it. Body text must be ≥ 26 px on screen.
  Never sit on a whole window for more than ~1.2 s.
- **`init` builds and measures once; `render` only sets.** Everything from `t`: no
  `requestAnimationFrame`, timers, CSS transitions/animations, accumulated state or `Math.random`
  (use `kit.rng(seed)`). `render(t)` must give the same picture whatever order it's called in.
- **`render` sets every element, every frame, including hiding what isn't in this beat.** An element
  you only touch inside an `if (inThisBeat)` keeps whatever state the last visited beat left it in,
  so a scrub or a parallel export shows stray things. `check.mjs` catches this as non-determinism.
- **Frame 0 is the thumbnail**: the title is already readable (`TT.title = -0.6`).
- **Every hold moves**: camera drift on every key, breathing shapes, title creep. Calm, but
  never frozen.
- **Motion has physics**: arrivals ease out, exits ease in, moves ease in-out; shapes and marks
  overshoot (`eob` 1.6–1.9) or spring. Product UI only eases and never bounces. Things travel on arcs.
  Type enters word by word from ONE direction (~110 ms stagger, 24–34 px), and exits quicker the other way.
- **Product UI** (theirs): read the real components/CSS and match exact values
  (`upstream/recreate-ui.md`). Use fictional names and data. Label anything speculative ("Concept film ·
  fictional data") on the end card.
- **3D**, when depth carries the idea (a city of data, a product object, a space to fly through):
  the clay-and-light recipe in `recipes.md` §11. Project DOM labels from 3D anchors. Drive geometry
  from the same data functions as any 2D chart, and give the camera a rig with distinct framings.

### 4. Look at it, and fix what you see (the step that makes it good)

```
node <skill>/scripts/frames.mjs <film-dir> --at 0,<every beat start>,<every beat +0.8>,end --sheet --out <dir>
node <skill>/scripts/check.mjs <film-dir>
```

Open the contact sheet and the full-size stills you're unsure of, and actually look. For each frame ask:

- Is there one clear subject, and is it big enough to read on a phone (640 px wide)?
- Does the composition look intended: margins, alignment, no awkward empty half-frame, nothing cropped by accident?
- Does anything overlap, collide, clip, or sit on top of text?
- Across the sheet: does it pass the slideshow test? Do the transitions read in the in-between stills
  (check stills mid-transition, not just at rest)?
- Would a designer ship this frame?

`check.mjs` flags errors (non-deterministic frames, a blank first frame, console errors) and
warnings (frozen spans, a film that is mostly frozen, tiny text). It can't judge taste. Fix, re-render
the stills you changed, and look again. **Do at least two look-fix passes before exporting.** The first
render always has problems.

### 5. Sound

Sound is half the film, unless they asked for silence. Write `score(S, kit)` from the same `TT`
(`upstream/sound.md` has the method): pick a tempo so bar lines land on the big moments. Start with a
near-silent pad under the title, bring the groove in when the action starts, put foley on the exact
frames of visible events (clicks, keystrokes via `S.ticks(kit.typing.times)`, pops when things land,
a whoosh under a whip), drop to a pad for a transform, build into the end card, then hit on it and let
the chord ring. Write your own melody (no recognisable songs). Then
`node <skill>/scripts/score.mjs <film-dir> --levels`: nothing between title and sign-off should sit
below about −30 dB.

### 6. Export and check the file

`node <skill>/scripts/export.mjs <film-dir> --out <film-dir>/film.mp4` (renders the score, encodes
H.264 + AAC; `--fps 60` for the smoothest UI, `--gif` too if asked; `--draft` makes a quick half-size cut for
checking timing). DOM frames take ~0.05 s each; 3D frames
~1–2 s each without a GPU, so a 34 s film with 18 s of 3D takes about 15 minutes. Run it in the background. Then pull a few stills from the MP4
itself (`ffmpeg -ss 12 -i film.mp4 -frames:v 1 x.png`) and look. Report truthfully: what you made, its
length and size, the look you chose, and anything you couldn't do.

## Feedback and edits

A note pinned to a moment ("0:12, the button") is about that moment. Map it to the beat in `TT`, change
only that, and re-render the stills before and after it. Keep everything else exactly as it is unless
they ask for a redesign. If you think a bigger change would help, do what they asked and suggest the rest.

## Don'ts (each one was shipped once and sent back)

- Static panels that fade in and out with a title each: the slideshow.
- Motion as garnish: particles, a wiggling underline or a pulsing glow around a still layout.
- Wide shots of whole UIs with unreadable text, or long holds on a finished result. Cut in while it builds.
- Fast camera in the first five seconds. Multiple entrance directions in one line. Bouncy product UI.
- Everything entering at once. Stagger 200–400 ms and sequence the eye.
- Generic AI look: purple gradients, glassmorphism, emoji, a rounded card with a coloured left border, grey default 3D cubes.
- Claiming a file, sound or check exists that you didn't produce and look at.

## Files

`kit/` runtime (`motion-kit.js`, `player.html`, `kit.css`, bundled fonts, Three.js) · `scripts/`
(`new`, `preview`, `frames`, `check`, `score`, `export`) · `templates/starter/` · `examples/launch/` ·
`references/intake.md`, `references/styles.md` (+ `kit/styles/`, `examples/styles/`), `references/kit-api.md`,
`references/recipes.md`, `scripts/palette.mjs` · `references/upstream/` (the original Motion
reference set, verbatim and read-only; its private-player commands don't exist here. Use this kit's
equivalents in `kit-api.md`).
