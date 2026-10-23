# Blender-first asset and studio-lighting starter

This is a **compact, original 3D production kit**, not a copy of a branded video or a claim of professional commercial parity. Assets are source-available, re-generable and no network assets are loaded.

| File | What it provides |
| --- | --- |
| `assets/transit-hub.glb` | 1,284-unique-triangle (3,216 visible) original arched roof hall with glazing, supports and beacon, authored for close-up |
| `assets/reservoir.glb` | 1,164-unique-triangle (2,736 visible) storage/telemetry sculpture |
| `assets/courtyard.glb` | 136-unique-triangle (220 visible) mixed-use low-rise courtyard |
| `asset-manifest.json` | Local asset paths, provenance, authoring license and role |
| `build_assets.py` | Rebuilds these GLBs from local `trimesh` and NumPy (optional dependency) |
| `stage.py` | Blender 4+ *production template*: GLB imports, linked instances, plaza/urban detail, 3-point area lights, PBR, color grade, data-driven telemetry, animated 3D route, lens/camera keys |

## Three speed/quality tiers

**Quality order matters:** wide-frame draft → close-up review → final shot → full video. Do not render 432 high-sample 1080p frames before you approve the model and lighting stills.

```sh
# No dependencies beyond Python standard library to inspect bundled GLBs.
python3 scripts/3d-preflight.py examples/blender-studio/asset-manifest.json --budget web --strict

# Blender (if installed): render actual stills, compare at phone and full size.
blender --background --python examples/blender-studio/stage.py -- --quality draft --width 960 --time 1.25 --out ./shot-wide.png
blender --background --python examples/blender-studio/stage.py -- --quality review --width 1280 --time 9.3 --out ./shot-close.png

# Optional editable .blend and full 24fps PNG sequence, only after look approval.
blender --background --python examples/blender-studio/stage.py -- --no-render --save-blend ./studio.blend
blender --background --python examples/blender-studio/stage.py -- --animation --quality review --width 1920 --fps 24 --duration 18 --out ./frames
ffmpeg -framerate 24 -i ./frames/frame_%06d.png -pix_fmt yuv420p -c:v libx264 -crf 17 ./film.mp4
```

`--quality final` uses Cycles sampling/denoising; `draft`/`review` favor Eevee, if available. `--engine cycles` forces Cycles even at draft. To parallelize, use `--start-frame N --end-frame M` with separate output directories and combine frame sequences later. Image sequences support interruption and resume. A failed offline Eevee context or missing Blender should be reported honestly, not replaced silently with Pillow.

**Optimization facts:** Bundled GLBs total approximately 63 KiB, with 2,584 source triangles and 6,172 rendered triangles, zero external texture files and 72 estimated GLB-level draw calls before repeated scene instances. Collection instancing avoids duplicating source geometry when staging the city. This is a tractable visual baseline and is not a substitute for camera-side art review. Use `scripts/3d-optimize.py` only for large licensed assets that genuinely need mesh/texture reduction; it does not run on this baseline by default.

## Known limits

- This environment may not have `blender` installed; the `stage.py` source is statically validated and the GLB assets are validated/import-tested through an available glTF reader, **not rendered through Blender** here. Thus lighting/visual parity cannot be certified from these tests.
- Materials are compact base-color/metallic/roughness PBR; real hero texture painting/normal maps and bespoke site assets can improve the look significantly, but must be licensed/approved and reviewed shot by shot.
- Synthetic telemetry is illustrative, not real operational data. Do not claim real-world performance, live inventory, or factual product features based on it.
