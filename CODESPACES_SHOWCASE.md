# Claude Motion: Full Capability Showcase in GitHub Codespaces

This Codespaces environment is set up for the features not shown in the first CSS-3D-only demo: actual WebGL and Three.js, physically based chrome/glass materials, instanced meshes, particles, camera depth, device interfaces, audio synthesis, motion blur and deterministic frame export.

## Open Codespaces
Visit **https://codespaces.new/TheOnlyFusionCube/claude-motion/tree/feat/codespaces-full-showcase** or open the repo's **Code → Codespaces → Create codespace** menu and choose the showcase branch.

## Render it

```bash
MOTION_GL=software node scripts/doctor.mjs
DRAFT=1 bash scripts/codespaces-showcase.sh  # fast proof of concept
bash scripts/codespaces-showcase.sh          # full-quality, slower
```

Output: MP4 files for each of the eight independently directed example films, plus a WebGL stills sheet in `showcase-output/`. The examples demonstrate the diverse abilities of the underlying animation system, rather than falsely claiming one existing short film covers them all.

## Notes
- GPU availability is *not guaranteed* by Codespaces; Chromium can use software WebGL (SwiftShader) when supported.
- Rendering the WebGL-heavy examples at 1080p with blur requires memory/CPU headroom; try a larger Codespace or DRAFT=1 if constrained.
- The connector in ChatGPT can edit repository files but **cannot create or operate Codespaces instances, forward a Codespaces port or capture a recording from a running Codespace**. The Codespace must be started by the user.
- The earlier standalone 35.5 s H.264 demo is separate from this repository branch.
