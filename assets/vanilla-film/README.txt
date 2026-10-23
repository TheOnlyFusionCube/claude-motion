CLAUDE MOTION - STANDALONE EXAMPLE

Serve this directory locally with `python3 -m http.server 8080`, then open
http://127.0.0.1:8080/ in a browser. Everything in the example is original.
Edit src/scenes.mjs, src/world.mjs, and style.css. Chapters are beats in one retained spatial world, not slide render branches. No package installation is required.

For deterministic programmatic frames, this page exposes:
  window.__motion.config            {width,height,fps,duration,...}
  window.__motion.seek(seconds)      render frame at absolute film time
  window.__motion.render(seconds)    alias for seek

Pass ?capture=1 in the URL for a frameless film output viewport.
Use the skill's optional scripts to capture stills or encode MP4 offline.

Original wordless soundtrack: SCORE.events is exported alongside FILM from src/scenes.mjs.
Render it with node /path/to/claude-motion/scripts/render-audio.mjs <film-dir> --out <film-dir>/score.wav.
It is not mixed into the browser preview automatically; MP4 export accepts --audio <film-dir>/score.wav.

The example also includes scenes.json, a PORTABLE scene manifest in the original
rough-cut shape (with stage "rough" because this is an editable starter). Keep its
scene IDs, durations and colors in sync with src/scenes.mjs when revising.
Validate with node /path/to/claude-motion/scripts/validate-film.mjs ./scenes.json.


NEW in v1.6: src/world.mjs creates named persistent actors, a following camera,
world-to-screen anchors, time-coded events, and renderer-backed trace(t).
The player also exposes window.__motion.trace(t); the same trace is used in
node /path/to/skill/scripts/audit-stage.mjs src/scenes.mjs --strict.
When Chromium blocks local HTTP, render the SAME stage through the limited
SVG recorder with node scripts/render-stage.mjs --out demo.mp4 --scale .667
--fps 24 --audio score.wav (requires sharp and FFmpeg).
Watch the full movie at playback speed; tests and contact sheets alone cannot
certify polished art direction. See references/retained-stage.md.
