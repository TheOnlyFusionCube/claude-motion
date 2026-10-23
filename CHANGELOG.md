# Changelog

## 1.5.0 - restore the original perpetual-motion contract

- Read the original Motion source's very first principle ("Everything is always in motion") before authoring **any** finished film; opening/title/close holds stay quietly alive and foreground motion must have a causal job.
- Add `references/perpetual-motion.md` with source-exact Ken Burns/held UI/shape breathing/type-creep measures, purpose-first motion layers, spatial handoffs, and a repair storyboard for the reported 90s PHP slideshow.
- Add a zero-dependency `validate-motion-plan.mjs` and example contract enforcing source-visible motion coverage across all shots, meaningful focal actions, non-fade motion and scene continuity.
- Upgrade encoded-video auditor to one 2fps decode and `--continuous` enforcement across the entire video; reject multi-second opening/end stills and films dominated by motionless frames. Existing explicit ambient mode remains supported; `--continuous` overrides its exemption.
- Add pure-time `heldPlate`, `uiHoldDrift`, `titleCreep` helpers; change the included Canvas end-card title to monotonic slow creep. Add a genuinely rendered, source-backed 18s moving-camera/request-travel proof (`examples/continuous-motion/build.py` + `demo.mp4`) so the skill has a runnable alternative to static slide cards.
- Add regression tests for opening/closing static holds, a barely moving frame, a freeze-heavy narrated film, and inaccurate motion plans. Preserve all 12 original source documents verbatim.

# Changelog

## 1.4.0 — Asset-led production and optimized studio lighting

- Added optional **Blender 4+ studio pipeline** in `examples/blender-studio/` with real authored GLB assets (arched transit hub, reservoir and courtyard), connected camera/lens/data state, area-light key/fill/rim rig, Eevee draft and Cycles final presets, instanced geometry and resumable PNG sequence workflow. This addresses the *lack of modeled assets and light direction* that hindered the earlier 3D demos.
- New `references/3d-asset-lighting.md`: hero-first shot review, material/lighting principles, curated districts, LOD/instancing, renderer and texture budgets, reference-friendly composition, and staged review to avoid expensive renders of poor-looking work.
- New **standard-library-only** `scripts/3d-preflight.py` scans GLB/glTF for geometry/material/draw-call/texture estimates, local path safety, source attribution and decoder requirements. A small generated GLB kit (about 63 KiB, 2,584 unique triangles and 6,172 instanced visible triangles) passes the strict web preset.
- New conservative `scripts/3d-optimize.py` wrapper for optional `gltfpack`, with explicit Meshopt/KTX2 compatibility warnings, protected original assets and background-only simplification.
- Tests added for package budget, source safety, generator, optimizer command and imported 3D asset. Original twelve upstream reference files remain byte-for-byte unchanged.
- **Honest verification limit:** GLB generation, preflight and real VTK GLB import passed; Blender is not installed in this authoring environment, so Cycles/Eevee visual output is not independently verified. The included asset kit is a faster and richer production foundation, not certified launch-film aesthetic parity.


## 1.2.0 — 3D data films and narrated launch workflows

The user-supplied reference was the Oct 2026 **82-second Claude Dashboards/Motion launch film**, which blends presenter/screen footage and a camera-driven 3D neighborhood data animation. The previous 2D showreel demonstration did not cover this demanding class of scene.

- New required `references/3d-data-films.md`: world coordinate systems, real 3D camera, data-state animation, object occlusion, status callouts, meaningful movement, independent seek and verification; Three.js/Blender routes and offline fallback.
- New required `references/launch-film.md`: time-coded analysis of the official hybrid launch video; narration, authentic product recordings, action/cause/effect, voice, score, captions and post-production editing.
- New runnable `examples/city-data-film/`: original 26s synthetic city network projected using a real 3D camera, world-anchored data hubs, animated supply depletion and replenishment, original audio and a 1080p/30fps MP4. No browser, WebGL service, video model, or upstream player required.
- New `scripts/assemble-film.mjs`: normalized-resolution multi-clip editor with optional mixed narration + instrumental score. Actual audio/video FFmpeg integration tested.
- Expanded `scripts/audit-video.mjs`: data-story and narrated-launch mode, optional strict audio requirement. Production acceptance still requires creative human review.
- Added `tests/data-film.test.mjs` for source consistency, camera/clock/quantity mapping, out-of-order frame determinism, assembly and QA regression.
- Preserved all 12 upstream source documents byte-for-byte, without claiming runtime/product/creative parity based on document hashes alone.


## 1.1.0 — Film-quality hardening

The source-first adaptation retained all original instruction bytes but did not sufficiently prevent slide-like outputs from passing as finished Motion films. This revision adds **product/skill showreel commissioning rules**, **visual acceptance gates**, and an executable **MP4 audit**. No original reference content was changed.

- New `references/showreel.md`: requires on-screen causal demonstration, distinct shot scales, actual interactions, object handoffs, and visible result rather than claims on static cards.
- New `references/quality-gates.md`: actual MP4/frame/audio review, phone-readable type, regression checks and candid limitations.
- New `scripts/audit-video.mjs`: Node + FFmpeg, detects sub-HD exports and >3s of nearly unchanged *mid-film* imagery; contact sheet and `--strict` mode. The check flags problems for creative review; it is not an aesthetic judge.
- Six regression tests added; a 24-second 910×512, mostly static promo scenario is expected to fail video QA. The user-provided MP4 is **not** bundled. A separate **original 20s/1080p concept example** is included as a hand-authored target, not a promise of automatically generated quality.
- Updated README and workflow references; fallback for browser-restricted environments.

The original 12 upstream documents remain byte-identical. Successful unit tests and source-hash parity **do not** by themselves establish equivalent image, timing, music or creative quality to Anthropic's private runtime.

## 1.3.0 — 3D art-direction correction

- Responded to repeated feedback that the technical city demo looked visually rudimentary.
- Demoted the Pillow polygon projection to a **legacy technical check**; it is not an acceptable default for premium 3D briefs.
- Added **`references/cinematic-3d.md`**, requiring material/shadow depth, model hierarchy, deliberate environment design, reference-matched shot scales and real output-still inspection.
- Added an optional, offline VTK EGL/OpenGL real-geometry `examples/studio-city-film/` production exercise with instanced solids, studio lighting, physical depot geometry, source-driven values, authored camera and original score.
- Preserved all 12 original upstream Markdown documents byte for byte. This release **does not claim studio aesthetic parity**: independent reference-level visual QA remains necessary.
