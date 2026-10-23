# Local preview, validation, and export

The skill itself is tool-neutral. These optional scripts use only Node 22+, a local Chromium/Chrome executable, and FFmpeg for video. No API keys, proprietary Motion player, Playwright download, online render farm, or network access is required.

## Use the standalone example

```sh
cp -R /path/to/claude-motion/assets/vanilla-film ./my-film
cd my-film
python3 -m http.server 8080
# Open http://127.0.0.1:8080 in a browser.
```

The URL supports `?t=6.5` to seek on initial load. The page exposes `window.__motion.seek(seconds)`, `window.__motion.config`, and `window.__motion.render(seconds)` for generic browser automation. Custom project films can expose the same API to use the scripts.

## Validate the scene contract

For projects using a `scenes.json` manifest, run:

```sh
node /path/to/claude-motion/scripts/validate-film.mjs ./my-film/scenes.json
```

This checks the original rough-cut conventions (stable IDs, 1–24 scenes, 24/30/60 fps, duration, readable four-color palette, canvas bounds, and rough/final stage). The example's `src/scenes.mjs` is the render source of truth: keep its `FILM` timing/dimensions consistent with the JSON after edits. The validator is not a visual renderer.

## Inspect stills and seek behavior

```sh
node /path/to/claude-motion/scripts/inspect.mjs ./my-film --times 0,3,6.5,12,14 --out ./frames
```

The inspector creates `frame_*.png` images and checks that a repeated timestamp captures identical bytes after visiting another timestamp. It reports errors and returns nonzero on a failed check. Review the images yourself, especially frame 0, the ending, and scene boundaries. Chromium needs to be installed and locatable on PATH or in `CHROMIUM_PATH`.

## Export MP4

```sh
node /path/to/claude-motion/scripts/export.mjs ./my-film --out ./my-film.mp4
```

The exporter captures deterministic PNG frames and pipes them to FFmpeg, usually at the video's configured resolution and fps. Use `--fps 30`, `--scale 0.5`, or `--start 2 --end 6` for requested variations. `--audio ./authorized.wav` can attach a user-provided or independently synthesized soundtrack; the source video has no audio otherwise. `--help` lists current arguments.

For GIF, export to MP4 first and use FFmpeg palette generation if a GIF is actually requested; a video usually delivers better quality and smaller files. When transparency is requested, discuss WebM with alpha or an image sequence, because standard H.264 MP4 does not carry transparent pixels. MOV transparency requires an appropriate alpha-capable codec, not just changing the extension.

## QA before reporting success

- Open actual film or representative stills; inspect first and last frame, all scene boundaries, missing glyphs, overflows, and mobile legibility.
- Check a scrambled revisit of identical timestamps for deterministic output.
- Run `ffprobe` or equivalent on the media file for codec, width, height, fps, and duration; listen to audio if present.
- Never suggest an MP4/GIF has been rendered unless it exists and was inspected.

## Toolchain caveats

- Scripts export a self-contained, locally served browser page. They do not execute project build commands; build your app first when needed, or point the scripts at an output directory with `index.html`.
- Browser-only players that update state based on CSS transitions or timers cannot be captured deterministically without adaptation.
- The CLI binds to loopback only and serves only the supplied directory; still review unfamiliar film code before executing it, as you would any third-party application.
- `CHROMIUM_PATH` can point to Chrome/Chromium when it is not discoverable. When running as root in a container, Chromium usually needs `--no-sandbox`; the script adds that flag only in that case.

## Event-based wordless soundtrack (bundled standalone film)

The starter exports a `SCORE.events` sequence from the same `T` anchor object as its visuals. Generate the original WAV with `node /path/to/claude-motion/scripts/render-audio.mjs ./my-film --out ./my-film/score.wav --levels yes`; export it with `node /path/to/claude-motion/scripts/export.mjs ./my-film --out film.mp4 --audio ./my-film/score.wav`. The audio synth is a small portable illustration, **not** the original `S.*` Anthropic player synth. The HTML preview is silent unless you add an audio transport.

## Mandatory final-video audit for promos and demos

For finished MP4s, run the **export** through the QA script, not the source preview:

```sh
node /path/to/claude-motion/scripts/audit-video.mjs ./my-film.mp4 --mode showreel --strict --sheet ./qa-contact-sheet.png
```

The script flags low-resolution output and long almost-static mid-film intervals, and writes a 12-still contact sheet. Use the modes `showreel`, `product`, `walkthrough`, or `ambient` to match intent. Read `references/quality-gates.md` and `references/showreel.md` for the manual inspection criteria; passing a pixel-change score is **not** artistic validation. Deliberate opening/closing holds are exempted from the automated stagnation gate.

**If the local Chromium/localhost preview is blocked by browser policy**, do not silently deliver a low-resolution or slideshow substitute. Export via the user's existing rendering stack or a deterministic local alternative (for example, SVG/Canvas frames composed by code and encoded with FFmpeg), then review decoded MP4 frames with this audit. Report the unavailable browser QA and any unverified features. The inability to run the original player is a tooling limitation, not a reason to discard the original filmmaking brief.
