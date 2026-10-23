# Review: Studio city v1 (renderer exercise)

- **Renderer:** VTK 9.6.2, headless EGL/OpenGL, instanced solid geometry with per-point colors, three studio lights and perspective camera; PBR property controls. CPU offscreen, not a path-traced commercial render. VTK FXAA disabled due solid-black headless bug. SSAO is disabled by default in the executable for reliable cross-headless support; shadows are off, so the scene has limited contact shading.
- **Geometry:** Three depot sculptures with supply heights connected to `data_at(t)`, 100+ instanced background buildings, roof details, ground plate, two elevated supply routes. It still has too many simple box forms to qualify as polished reference-level architecture.
- **Camera:** Authored keys at 0, 2.7, 4.4, 5.8, 8.7, 10.4, 12, 14.3 and 17.9s, moving both eye and focal target. Look at 1.25s and 9.3s for scale/perspective difference.
- **Data proof:** `data_at(5.0)['north'] = 24`, `data_at(10.3)['north'] = 0`, `data_at(15.2)['north'] = 16`; the same values power the physical depot status and fixed readable number.
- **Motion:** Timed building extrusions, an approach/retargeting camera, depot depletion and recovery, route reveal and world-space packets, closing wide view.
- **Artistic limitation:** This is substantially better as an actual 3D mechanism than the old Pillow projection, but an art-directed launch film should use richer buildings, roads, landscaping, materials, environmental lighting/shadows, and source-verified product interaction. Do not call this 'reference-grade' on its own.

## Encoded sample inspected

The 18.0s MP4 was decoded and audited: 1920×1080 H.264, 24 fps and AAC audio. The final contact sheet includes first frame, building extrusion, camera approach, value at 00, world-space routing and the resolving pullback. Its repeated box-shaped architecture is still **below the bar** for the official commercial reference, and the demo must never be used as proof of art-direction parity.
