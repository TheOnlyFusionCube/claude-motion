# Claude Motion: Full Capability Showcase in GitHub Codespaces

This Codespaces environment is set up for the features not shown in the first CSS-3D-only demo: actual WebGL and Three.js, physically based chrome/glass materials, instanced meshes, particles, camera depth, device interfaces, audio synthesis, motion blur and deterministic frame export.

## Open Codespaces
Visit **https://codespaces.new/TheOnlyFusionCube/claude-motion/tree/feat/codespaces-full-showcase** or open the repo's **Code → Codespaces → Create codespace** menu and choose the showcase branch.

## Render it

```bash
MOTION_GL=software node scripts/doctor.mjs
DRAFT=1 bash scripts/codespaces-showcase.sh reel poster  # first test: two draft clips
FORCE=1 bash scripts/codespaces-showcase.sh          # all films, full-quality; replaces drafts
```

Output: MP4 files for each of the eight independently directed example films, plus a WebGL stills sheet in `showcase-output/`. The examples demonstrate the diverse abilities of the underlying animation system, rather than falsely claiming one existing short film covers them all.

## Notes
- GPU availability is *not guaranteed* by Codespaces; Chromium can use software WebGL (SwiftShader) when supported.
- Rendering the WebGL-heavy examples at 1080p with blur requires memory/CPU headroom; try a larger Codespace or DRAFT=1 if constrained.
- The connector in ChatGPT can edit repository files but **cannot create or operate Codespaces instances, forward a Codespaces port or capture a recording from a running Codespace**. The Codespace must be started by the user.
- The earlier standalone 35.5 s H.264 demo is separate from this repository branch.

## If the strict checker stops at render(1.768)

The first version ran quality checks before exporting and used `set -e`; a seek-history difference therefore prevented every MP4 from being created. **Fixed on this branch**: checks run after rendering, save logs and do not abort exports. They must still be reviewed before saying the film passed validation. A PNG byte-level mismatch can be genuine state leakage or Chromium/SwiftShader raster differences; neither cause can be conclusively established from the original error alone.

Update the Codespace branch and test just the first two clips:

```bash
git pull --ff-only
DRAFT=1 bash scripts/codespaces-showcase.sh reel poster
ls -lh showcase-output/*.mp4
```

The script resumes by skipping existing nonempty MP4s; use `FORCE=1` for replacements. After draft review, use `FORCE=1 bash scripts/codespaces-showcase.sh` to render all eight at full resolution with film-defined motion blur. Software WebGL renders may take a long time.

Set `CHECKS=0` to skip optional QA during a rapid export test, and `STILLS=0` to skip the WebGL stills contact sheet. If one example fails to export, later films are still attempted and the script reports failure at the end. Successful clips remain in `showcase-output/`. Logs are in `showcase-output/*-export.log` and `showcase-output/*-check.log`.

Download `claude-motion-renders.zip` after running:

```bash
zip -r claude-motion-renders.zip showcase-output/
```

## Automated software-WebGL export smoke test

The separate **Draft WebGL MP4 export (poster / software)** GitHub Actions job
uses the actual Codespaces showcase script with `MOTION_GL=software`, `DRAFT=1`,
one export worker and motion blur disabled. It renders **only 2.5–3.5 seconds**
of the WebGL chrome-knot scene in `poster`, keeping CPU and artifact size bounded.
The optional `SHOWCASE_FROM` and `SHOWCASE_TO` environment variables select a
short clip; omit both to export entire films.

The job requires a reported SwiftShader/llvmpipe software-WebGL renderer,
uses FFmpeg to write an MP4, verifies H.264 at 960×540/24 fps with 24 decodable
frames using ffprobe, and decodes the video again with FFmpeg. It uploads the
draft MP4, a representative JPEG frame, probe metadata, and rendering logs
as the `poster-software-webgl-draft` Actions artifact (retained seven days).
A failed renderer, export, or validation step fails the job; logs remain
available for diagnosis.

**Passing GitHub Actions validates a software-WebGL export on the GitHub-hosted
Ubuntu runner, not inside GitHub Codespaces.** It also does not establish that
all eight full-length films, motion blur, or 1080p exports work. A Codespace
must still be launched on the showcase branch and separately tested and
inspected with the full `DRAFT=1 bash scripts/codespaces-showcase.sh poster`
(or all-eight) command before claiming Codespaces validation.
