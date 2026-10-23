# 3D art / production check — Studio City kit

**Status:** engineering kit verified; studio appearance **not yet visually approved**.

- **Assets:** Three original locally generated GLBs, no network downloads. Hub has a curved roof and visible support/mullion detail; support sculptures and courtyards provide contrasting massing.
- **Rendering:** Blender 4+ starter scene with 3-point area lighting, PBR materials, AgX/Filmic and Eevee preview/Cycles final presets. Blender executable was unavailable in the authoring environment, so **actual Blender light/shadow output remains unverified**.
- **Geometry inspection:** GLBs passed `3d-preflight.py --budget web --strict`. A real VTK glTF importer rendered the arched-roof asset independently, confirming file geometry is readable, but it does **not** confirm Blender's composition or material appearance.
- **Optimizations:** Source geometry is shared through linked collection instances, no remote textures, no blanket decimation; 2,584 unique triangles (6,172 per-instance visible triangles) across three independent GLBs. Estimated 72 draw calls for one of each asset (not a runtime benchmark with all scene instances).
- **Camera/data:** 7 time-based lens/eye/target poses. `data_at(t)` drives both logical values and the visible depot column; 3D route reveal derives from `t`.
- **What must be reviewed next:** Render wide and close stills in Blender on target hardware, inspect at 1920 and 640 pixels, adjust color/contrast and real material response, then run a 2-second draft segment before the full animation. Do not claim this matches the original reference film's asset quality.
- **Stylistic limitations:** No photoreal facade textures, scanned assets, vegetation libraries, or authored city geography. Model kit is an extensible beginning, **not a finished production city**.
