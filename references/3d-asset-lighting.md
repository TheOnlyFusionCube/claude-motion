# Asset-led 3D production — optimized modeling, materials, lighting and delivery

Use this document for requests like **"make it more cinematic"**, **"improve the 3D"**, **"add a proper asset and lighting pipeline"**, a product hero, a 3D city/data story, an architecture film, or a cinematic reference. Read alongside `references/cinematic-3d.md`, `references/3d-data-films.md` for data stories, and the unchanged original `references/upstream/motion.md` for pacing. **This is a real production route, not a promise that procedural primitives attain a studio's aesthetic quality.**

## Pick a renderer for the desired look, not just availability

| Work | Prefer | Fallback and caveat |
|---|---|---|
| Premium modeled city / product / architecture | **Blender** with PBR glTF/GLB assets, area lights, Cycles/Eevee, compositing and camera work | Three.js + HDRI, shadow maps and tone mapping when interactive output is required |
| Real-time explorable data world | **Three.js/WebGL** with `GLTFLoader`, `InstancedMesh`, environment and shadows | Blender pre-rendered passes for playback if interactive performance cannot hold |
| Pure deterministic/offline 3D without Blender | **VTK EGL/OpenGL** with imported authored meshes, lights and render-to-frames | Adequate technical validation; do not certify a commercial look solely from VTK test passes |
| Only 2.5D/Pillow available | Visual script/animatic or honest prototype | **Not** a premium cinematic deliverable |

Existing user project/engine takes precedence when it is already set up for quality and editable source. Never force Blender installation for a non-3D animation. Do not depend on Anthropic's Artifact player for assets or export.

## The least-work-first production loop

1. **Block one image.** Define an authored hero (one recognizable, shaped object), 2–3 supporting asset families, negative space for titles, a horizon/background, and two truly different shots. Render a **960px draft still** for the wide shot and a **1280px close still**. Reject a field of copied boxes before animating anything.
2. **Acquire/model only what camera sees.** Use the user's approved assets first. Imported kit: glTF/GLB with real geometry, principled/PBR materials, sane dimensions in meters, pivots at logical movement points and provenance/license records. Avoid downloading unreviewed remote assets. For background buildings, use a small curated family library rather than hundreds of unique meshes. For hero geometry, devote triangles to silhouette and close-up edges first.
3. **Light once, reuse rig.** Start with one large softbox key, softer fill and narrower rim/back light with a cool/neutral studio world. Set materials' base color, metalness, and roughness before glow. Adjust ratios to keep shape and surface legible; test shadow/contact response. Add licensed HDRI/environment only if physically and artistically useful. In Blender use **AgX/Filmic** view transform, not raw emission as fake lighting. Keep glow restrained and avoid heavy noise/SSAO hacks that hide missing geometry.
4. **Instance instead of duplicate.** Use linked meshes or Blender *collection instances* for repeating architecture; use Three.js `InstancedMesh` for interchangeable render materials. Author a few unique foreground hero assets; reuse environment meshes in different rotations/scales. Material count / shader variants / draw calls often matter more than triangle count. Batch low-value scenery by shared material; preserve named interactive parts separately.
5. **Model three budgets instead of rendering everything at final quality.** `draft`: 640–960px, Eevee fast lighting and tiny samples; `review`: 1280px + readable close; `final`: 1920×1080 (or requested target), higher sample count/denoise in Cycles when available. Do not jump to a 30-second 1080p final before the two stills pass art review. Render to image sequences for resumability and parallel shots; mux audio/video after. Color-manage, add motion blur/DOF only where they improve the story.
6. **Bind state to time.** `valueAt(t)` drives 3D height/material, text/HUD and route reveal. `cameraAt(t)` drives position, target and lens, not an uncontrolled orbital turntable. Seek out of order at 2–3 times to verify identical pictures. Preserve the same physical location when camera cuts from overview to detail.
7. **Inspect at the final size.** Verify the hero silhouette, physically credible contact shadows, glass/metal/stone differentiation, grounded scale, exposure, visual hierarchy, occlusion, text readability and dissimilar shot scales. Check actual encoded movie, including transitions and audio. A passed CLI preflight or 1080p MP4 only proves technology, not taste.

## Self-contained portable asset kit

`examples/blender-studio/` contains an **original, procedural GLB kit** (arched-roof transit hub, sculpted reservoir, mixed-use courtyard), and a Blender studio script with a key/fill/rim area-light rig, color-managed output and absolute-time camera keys. It uses **no remote assets, no texture downloads**, and has a small immutable reference manifest with licenses and named roles. Only Python + `trimesh` and `numpy` are needed to *regenerate* the GLBs. **Generating them and inspecting GLB structure does not require Blender**; rendering with Blender does.

From repository root:

```sh
# Basic asset validation, built-in Python only. Prints models, material counts,
# loaded triangles, estimated draw calls, texture pixels and provenance issues.
python3 scripts/3d-preflight.py examples/blender-studio/asset-manifest.json --budget web --strict

# Optional, only when changing procedural asset kit (requires trimesh + numpy).
python3 examples/blender-studio/build_assets.py

# Blender 4+ required for this actual material/lighting shot. Not necessary for 2D.
blender --background --python examples/blender-studio/stage.py -- --quality draft --width 960 --time 1.25 --out ./wide.png
blender --background --python examples/blender-studio/stage.py -- --quality review --width 1280 --time 9.3 --out ./detail.png
blender --background --python examples/blender-studio/stage.py -- --quality final --width 1920 --time 9.3 --out ./final.png

# Save an editable Blender project (source is still ordinary Python + GLB).
blender --background --python examples/blender-studio/stage.py -- --quality review --no-render --save-blend ./studio-city.blend

# After approving the stills, render resumable 24-fps PNG sequence.
blender --background --python examples/blender-studio/stage.py -- --animation --quality review --width 1920 --fps 24 --duration 18 --out ./frames
ffmpeg -framerate 24 -i ./frames/frame_%06d.png -c:v libx264 -crf 17 -pix_fmt yuv420p ./movie.mp4
```

When Blender isn't installed, **don't claim the Blender final was tested**. Use the small GLB models in another compatible real renderer, test the PBR appearance and lighting in that engine, and disclose exact limitations. In a GPU-less system, the Blender Eevee backend may not support background rendering; test a single still and fall back to Cycles CPU if available. Remember to merge the sound and narration only after the shot is visually approved.

## Optional GLB optimization and viewer compatibility

The kit is already small, so blindly decimating it reduces its design disproportionately. Optimization is for **real assets that exceed budgets**, not a compulsory filter.

```sh
# View exact proposed invocation; no external optimizer required.
python3 scripts/3d-optimize.py examples/blender-studio/assets/transit-hub.glb --out ./hub-opt.glb --dry-run

# If gltfpack is installed from a trusted source, preserve names/materials/extras.
# Only use Meshopt when your runtime explicitly loads EXT_meshopt_compression.
python3 scripts/3d-optimize.py big-environment.glb --out ./environment-opt.glb --instancing --meshopt

# Decimation belongs on distant background LODs, not the hero.
python3 scripts/3d-optimize.py background.glb --out ./background-lod.glb --simplify 0.6
```

`-cc` needs a Meshopt decoder; KTX2 needs a BasisU-compatible KTX2 decoder; glTF output may use required extensions. Test compressed asset loading **before** deleting uncompressed copies. Preserve geometry node names for animation targets. Test original vs optimized mesh at **the same camera/light**. For web media use texture atlasing/KTX2 only when it saves material switches and decoded GPU memory, and transcode colors correctly (sRGB color maps, linear normal/roughness maps). Cache repeated meshes/textures and pre-load assets before playback. A 4K albedo map on a distant 30px prop is almost always waste.

**Budget heuristics** in `scripts/3d-preflight.py` (`web`, `desktop`, `film`) are adjustable prompts to review, not absolute performance guarantees. Use the profiler of the *actual target* to establish frame time, VRAM and draw calls. The reports intentionally separate authored triangles from visible triangles after instancing.

## Delivery checklist

- `asset-manifest.json` lists every source GLB and its rights. Original source assets remain intact; optimized outputs are separate.
- Wide and close renders use visibly different angles and a deliberate lens. Hero model is legible without labels.
- A 3-light or HDRI-backed rig produces distinct highlights, credible shadows and material differentiation without hiding the form.
- Model reuse/LOD/material count is intentional and within a measured render budget.
- Camera and all important data-dependent geometry are seekable from absolute time.
- Native image sequence, contact sheet, final MP4 and audio are inspected. The final answer **names engine and unverified limitations**; do not sell engineering validation as reference-quality art.
