> **Premium visual briefs:** Follow `references/3d-asset-lighting.md` for an asset-led Blender/Three.js production route with original glTF model kit, PBR studio lights and performance budgets. This document defines **data/space correctness**, not a finished image style. The legacy Pillow render remains a math-only proof.

# Camera-driven 3D data films — data becomes a world

**Read `references/cinematic-3d.md` alongside this page whenever visual quality matters.** The original Pillow example was useful for proof of camera mathematics but failed visual-quality review. **Never offer it as a premium 3D deliverable.**

**Read this before creating a 3D explainer, a camera flyover, a data map, a network animation, or an example similar to the 3D neighborhood sequence in the October 2026 Claude Motion launch film.** Also read `upstream/motion.md` for composition/pacing, `upstream/sound.md` for scoring, and `references/quality-gates.md`. This is an **additional portable capability**, not a claim that the original private `kit` runtime or 3D engine ships with this skill.

## Define the actual promise

The audience must be able to see **why the data matters** without listening to the soundtrack. Transform a concrete data source into a location, system or physical process, show a *change over time*, follow its consequence, reveal a decision, and end on the result. An orbiting skyline alone does not tell a story. A generic 3D mock city, fake numeric labels, or decorative glowing points without relationships to source data is not a successful data film.

Use a succinct film contract:

```json
{
  "question": "Where does demand exceed supply in the morning?",
  "source": "my-export.csv | analytics query | synthetic",
  "metric": "available_items",
  "keys": ["station_id", "x", "y", "time", "available_items"],
  "criticalEvent": {"station_id":"N-07","t":"08:10","threshold":2},
  "insight": "A cluster depletes before others do",
  "action": "move supply earlier",
  "narrative": ["context", "transformation", "temporal_change", "close_up", "response", "resolution"]
}
```

Real-world location? Use authorized actual geography and a valid coordinate system. A demo without user data must mark **synthetic data visibly in the frames**; do not quietly invent metrics that resemble factual reporting. Keep exact numeric sources, units, data provenance, filters and assumptions in `film/SOURCES.md`. Never animate a metric independently of the value the on-screen numeric label uses.

## Choose an actual 3D route (don't substitute static slides)

- **Project already uses Three.js / React Three Fiber / Babylon / Blender / Godot / Motion Canvas:** stay in its stack and drive camera, objects, materials, lights and data states from a seekable absolute-time timeline. Three.js + Remotion can render Chromium frames when the project already supports them. Blender's Python API with keyframes tied to exact times is suitable for cinematic depth, lighting, shadows and geometry nodes. Do not install packages silently into an untrusted source repository.
- **Browser WebGL available:** construct instanced extruded city blocks, real camera view/projection matrices, roads and ring markers; record fixed positions and resources in `init`, set `camera.position`, object transform/material, chart state and label data from `t` in `render`. Use an explicit deterministic render surface accessible to frame export (e.g., `window.__motion.seek(t)`). For `three`, consider a controlled render loop (call `renderer.render(scene,camera)` after each `seek`) instead of independent animation clocks.
- **No WebGL / browser blocked, but VTK is available:** use `examples/studio-city-film/` with VTK offscreen EGL/OpenGL. This is a real scene with geometry, material, lights and a view camera, although still a *technical direction exercise*, not photoreal work. When even VTK is not available, use Blender or another installed real engine and document the setup.
- **Only Pillow and FFmpeg available:** `examples/city-data-film/build.py` can verify world/data/projection math, but it is a **2.5D technical fallback**. It is not an acceptable cinematic/showreel deliverable. Do not claim real-time 3D shading or production-level 3D from this route.
- **Simple brand shapes only:** DOM/SVG/Canvas 2D remains an excellent option, but it does NOT satisfy a brief explicitly requiring a navigable 3D city, elevation occlusion or true orbital camera.

Avoid creating a fake "3D" film by scaling a screenshot or tilting a 2D image. A 3D benchmark must visibly change camera azimuth or elevation and expose the correct side/depth relationships between buildings, roads and points.

## Convert data into space, then into time

1. **Data ingest:** Parse source table/JSON; validate unique IDs, monotonic timestamps, missing values, units, categories, bounds and mapping. Keep a stable map from each source row to a 3D marker/geometry. If source is only a dashboard image, say inferred coordinates are approximate.
2. **World coordinates:** Establish a consistent metric system: station `(x,y)` or geospatial coordinates projected into a local tangent plane; elevations/heights occupy `z`. Center and fit bounds once; do not move stations to suit a camera shot without documenting an illustrative displacement. Preserve relative separation and direction.
3. **Geometry:** Use a coherent city/material system (roads, low-poly buildings or actual GIS extrusions, controlled palette, roof/side shading and environmental light). Three.js route: share geometries/materials and use instancing; Python route: extruded box faces sorted from camera depth. Use original/user-licensed maps, not unlicensed map-tile screenshots.
4. **Data encodings:** Choose **one principal signal per scene** (ring progress for inventory; height for activity; flowing particles for trips; color for a threshold). Use a consistent legend and scale, never arbitrary rainbow. Warm accent for highlight; warning only when threshold crossed, and not color alone.
5. **Absolute-time function:** Maintain `dataAt(t)` and `cameraAt(t)` as pure functions. Labels, ring occupancy, camera crop, journey paths, audio cues and clock MUST use the same values and named events. Interpolate from actual snapshots, hold missing intervals rather than fabricating a smooth reading unless labeled modeled, and test reversed-seek output.
6. **Camera grammar:** Intro wide (establish geography) → tilt/rotate/flyover (teach the physical model) → follow a meaningful flow (lead the eye) → close on the consequential station or object **with a readable value** → widen to reveal response. Moves typically 0.6–1.3 s, with explicit holds for comprehension; match `upstream/motion.md` and `upstream/walkthrough.md` where applicable. Large camera move? Hold ~0.6–1.0 s before exposing a new insight.
7. **Legibility:** 3D data labels must face camera / live in a tracked screen-space overlay, be visible on 640px-wide preview, avoid roof occlusion and competing label clutter, and stay inside safe margins. Fade distant labels by relevance rather than drawing 80 overlapping markers. Numeric claims and alerts remain fixed long enough to read.
8. **Cause and response:** Do not end on "demand rises". Show the point going empty, its impact on traffic or customers, an evidence-backed recommendation, then visually connect an intervention to a changed outcome. Mark hypothetical scenarios as forecast or illustration on screen.

## Deterministic camera and occlusion

For a 3D point `P`, render its image with a consistent view/projection: `screen(P,t) = viewport(project(V(cameraAt(t)) * P))`. For 2.5D low-poly scenes, a proper yaw/pitch orthographic camera with roof/wall polygon depth sorting is acceptable; merely changing a CSS perspective string on a 2D screenshot is not. Use world-space y or z elevation consistently and assert the sign in tests. Render markers at their corresponding projected source location, not hand-tuned per-frame xy coordinates.

A camera movement can introduce accidental inverted wall faces, rising rooftops, labels jumping through buildings, or point markers occluded by an arbitrary painter's order. Check at each camera key and between keys; view the scene near **both ends of every transition**. Dynamic callouts: leader line follows projected 3D location every frame, text panel holds still in screen coordinates.

## Quality standard for this class of film

- An actual 3D camera changes its position/orientation, and the world responds as a 3D space. Provide two inspected frames with different perspective, not just different titles.
- At least one important data entity changes state **because of source data** and is explicitly connected to a takeaway; different timestamps and a continuous or deliberately stepped clock are readable.
- Multiple view scales: bird's-eye, operation close-up, decision wide. No "all shots from one static oblique angle" shortcut.
- No unsupported statements about what a proprietary Claude artifact or data connector did. If the project is an illustrative concept, keep the in-film concept label.
- A meaningful sound or narration plan; hard cuts and transitions aligned to the score/voice pauses, not arbitrary motion.
- At least 8 contact-sheet images at native export resolution and a 640px review; actual MP4 decoded and `audit-video.mjs --mode data-story --strict`; spot-check source-value ↔ label ↔ projected marker at multiple `t`.

## Offline working benchmark

This repository retains a **legacy technical smoke test**, a *26-second synthetic parcel-network data story* with an orbital isometric camera, independently positioned 3D building extrusions, seven data-driven hubs, moving route arcs, one depleted depot and a recovery intervention. Requires `python3` + Pillow and `ffmpeg` — no network, browser, private player, three.js download or video generation model.

```sh
python3 examples/city-data-film/build.py --stills ./qa-stills --width 1280
python3 examples/city-data-film/build.py --out ./city-story.mp4 --width 1920 --fps 30
node scripts/audit-video.mjs ./city-story.mp4 --mode data-story --strict --sheet ./qa.png
```

The script is a **technical capability proof only**, not a reference for premium visual quality. For proper rendering see `examples/studio-city-film/` and the mandatory studio visual gates in `references/cinematic-3d.md`. Even that example does **not** establish a studio-quality output on its own. For a reference combining live product UI and voice, also read `references/launch-film.md`.
