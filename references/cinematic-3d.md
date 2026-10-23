# Cinematic 3D — the production bar, not a technical checkbox

**Mandatory for a reference-style 3D film, product launch, architecture/data-city flyover, or any request where the user says the existing 3D looks weak.** Read `references/upstream/motion.md` for timing, `references/3d-data-films.md` for data/space invariants, and this page for visual direction. The original source explicitly says 3D is difficult and often looks bad. Respect that warning: do not sell code with simple projected blocks as studio 3D.

For a reusable small asset library, a real three-light studio rig, strict import budgets and Blender look-development commands, also **read `3d-asset-lighting.md`**. It is the *production implementation* of this visual bar; the older VTK reference below remains a constrained technical fallback.

## Choose the pipeline based on the required appearance

| Requested look | Production route | What is **not** enough |
| --- | --- | --- |
| Premium / cinematic city, product hero, architectural miniatures, glass/metal, depth of field | Blender (Cycles/Eevee), Three.js with authored lights/shadows/PBR/postprocessing, Houdini, or a genuinely rendering-capable local engine such as VTK with lighting/materials | Pillow polygons, one orthographic box mesh repeated 100 times, perspective transform of a screenshot |
| Schematic data explainer, fast technical prototype | WebGL/VTK true geometry; a 2.5D projection may be used **for testing data correctness only**, visibly identified as a technical sketch | Calling a flat technical visualization a cinematic film |
| Photoreal environment | Licensable/referenced geometry, textures/HDRI, lights, shadows, material roughness and test frames; real 3D engine and appropriate rendering budget | Procedural grey cubes and an invented success claim |
| Hybrid reference film | 3D sequence above **plus** actual authorized screen captures, narration, compositing and edit | One city with changing headings masquerading as the whole launch film |

If a real renderer is unavailable, do not silently lower the look to Pillow. Report the blocker, produce a strong storyboard/look-development still or an explicitly labeled *technical* visualization, and give the exact requirements for the requested standard. Never assert parity from MP4 resolution or an automated motion score.

## Direct a 3D sequence before writing geometry

1. **Extract reference visual DNA.** Describe lens and shot scale, world shape, visual/material hierarchy, lighting direction/contrast, palette and grade, physical camera path, depth behavior and film edit. Do not recreate an unauthorized company's proprietary assets. Choose an original design with the same level of visual ambition.
2. **Art-direct one hero frame at output size.** Create a studio still showing the main subject at the correct final shot scale. Ask: could this frame sit in a commercial *with no labels*? If it looks like a raw engine viewport, stop and improve it before rendering a second of video. Two stills, wide and close, must look purposefully different—not the same uniform cube field larger.
3. **Build a scene with hierarchy.** A hero landmark occupies a substantial fraction of the useful frame; foreground/middle/background have different scales, material families and contrast. Leave negative space where typography will actually go. City geometry must show plausible districts, streets/plazas, special sites and variation. A rigid grid of identical blocks with different heights is a **rejected placeholder**, not a finished environment.
4. **Light and shade deliberately.** Set an identifiable key light, controlled fill, rim/back light, believable cast/contact shadows or AO, material roughness/metalness, restrained emission, atmosphere/fog where motivated, anti-aliased edges and intentional color grade. In an engine supporting depth passes, use them for distant haze and carefully limited depth of field. Refrain from post effects that hide model quality.
5. **Animate meaningful mechanisms in world space.** A camera orbit alone is wallpaper. Make the world respond (buildings grow, supply marker falls, route activates, particles travel, decision transforms). Data and in-world geometry share the same pure `dataAt(t)`. Do not animate values by hand separately from their labels.
6. **Use lens/shot grammar.** Establishing (35–50 mm equivalent) → approach/tilt → detail or macro → consequence → wider resolution. A close-up needs the subject and an action *large enough to read*. A moving camera should have an explicit start/end pose, target, eased speed and stable held value. Avoid a single orthographic oblique angle for the entire film.
7. **Design the edit around the sound.** Camera arrivals, route activations and value changes should coincide with the musical/foley phrasing and the narration if used. Do not call a WAV stream a finished soundtrack without listening.
8. **Quality review at the output.** Render two actual frames from the engine at widest and closest shots; examine both at 1920 and 640 px, then render the final encoded movie. Check whether hero geometry is obscured by buildings, captions overlap silhouettes, projected labels point to the right physical object, AO breaks, or shadows become black patches. Fix before delivery.

## A passing shot review is qualitative *and* technical

Record a short `3D-REVIEW.md` with honest answers to:

- **Design:** Which object is the hero? How do its silhouette, detail, material and color differ from supporting geometry? Could the environment be mistaken for a grid of default cubes?
- **Framing:** Which two inspected stills show visibly different *camera angles and shot scales*? Are labels and callouts clear at 640px?
- **Data:** Which exact source row is embodied by the hero? Show two timestamps where its shape, numeric label and colored condition agree.
- **Motion:** What changes besides camera position? Point to a before, action and after.
- **Rendering:** What engine, actual native render resolution, shading model, light setup, anti-aliasing, and shadow/occlusion system was used? State any limitations.
- **Editorial:** What was done about action/sound alignment, pacing and visual variety? Inspect first, midpoint, worst transition and end frame.
- **Not verified:** Do not claim reference-level artistic quality without independent comparison and user approval.

No metric can replace the act of looking at the actual movie. It is acceptable—and expected—to reject a technically functioning film because the 3D still looks rudimentary. Raise asset/model quality before piling on post effects.

## Portable engine example

For a more asset-led production project, use `examples/blender-studio/`: compact authored GLBs, Blender 4+ area lights, PBR materials, shared collection instances, deterministic camera/data and draft/review/final stills. It is a self-contained *starting point* but its Blender appearance must be rendered and reviewed on target hardware. Run `python3 scripts/3d-preflight.py examples/blender-studio/asset-manifest.json --budget web --strict` before importing files. See `3d-asset-lighting.md` for commands.

`examples/studio-city-film/render.py` provides a small **real VTK/OpenGL 3D** step up from the archived Pillow example, with physically projected solids, studio lights, a scene camera, material groups, instanced buildings, animated extrusion, world-space routes and source-linked depot status. It's an original synthetic dataset, not proprietary product footage. The example is a *renderer and direction exercise*, **not certified parity with a major studio's art direction**. It is optional and depends on `vtk`, `numpy`, `Pillow`, `ffmpeg`:

```sh
python3 -m pip install -r examples/studio-city-film/requirements.txt
python3 examples/studio-city-film/render.py --still 9.3 --width 1280 --out /tmp/studio-detail.png
python3 examples/studio-city-film/score.py --out /tmp/studio-score.wav
python3 examples/studio-city-film/render.py --width 1920 --fps 24 --out /tmp/studio-picture.mp4
ffmpeg -y -i /tmp/studio-picture.mp4 -i /tmp/studio-score.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest /tmp/studio-film.mp4
```

Rendering at 1080p with CPU OpenGL may be slow. If a machine has Blender/Three.js with appropriate asset pipeline, prefer that for polished commercial output. For a faster correctness smoke test, use `--still` at 960 or 1280 wide and check data changes before encoding the full film. Do not treat installing VTK as mandatory for other non-3D uses of the skill.
