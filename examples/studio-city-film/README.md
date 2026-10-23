# Studio city: real 3D, not orthographic Pillow blocks

An **original, explicitly synthetic** 18-second engineering/art-direction exercise. A fictional city physically extrudes from a table-like stage; a depot loses units, a camera pushes closer, and supply moves along 3D routes before recovery. The visible depot number and its 3D pillar use `data_at(t)` as their single source of truth.

Uses VTK's EGL/OpenGL renderer, instanced building geometry, PBR material settings, studio lights, perspective camera and Pillow typography. It is **not** a photoreal city, an official Claude product demo or a reproduction of the reference film. The earlier `examples/city-data-film/` is a **2.5D technical test**, not a cinematic-quality reference; this route adds a proper rendering stage, but professional films still require bespoke modeled assets and senior-level review.

## Run

```bash
python3 -m pip install -r examples/studio-city-film/requirements.txt
python3 examples/studio-city-film/render.py --still 9.3 --width 1280 --out ./shot.png
python3 examples/studio-city-film/score.py --out ./music.wav
python3 examples/studio-city-film/render.py --width 1920 --fps 24 --out ./picture.mp4
ffmpeg -y -i ./picture.mp4 -i ./music.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest ./movie.mp4
```

Native 1080p CPU rendering may take multiple minutes. VTK's FXAA stage is intentionally disabled because on the tested headless EGL backend it produced **solid black frames**. Do not turn it on without a rendered regression test. If the machine lacks a working VTK/OpenGL backend, use Blender, Three.js, or another real 3D renderer instead—**do not silently substitute the old 2.5D proof for this quality tier**.

## Production limitations

- Simple procedural architecture still lacks the rich modeled props/textures of a commercial; it is a better *technology exercise*, not proof of studio production parity.
- Uses synthetic, fictional information. Do not relabel it as real transit or logistics reporting.
- Uses a custom deterministic score, not any source video music.
- Consult `references/cinematic-3d.md` before treating a 3D shot as finished.
