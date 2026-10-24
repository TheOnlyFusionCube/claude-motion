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
