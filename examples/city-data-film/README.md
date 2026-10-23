# Northline — a camera-driven 3D data film (original technical example)

A **26-second original data-story proof** inspired by the *production discipline* of narrated dashboard-to-3D explainers, not copied from the Claude launch commercial. All network data, depots, routes, appearance and narration text here are **fictional and synthetic**, visibly labelled in the film.

The project demonstrates real 3D orthographic projection of extruded city blocks, yaw/pitch/target camera keyframes, depth-sorted geometry, hub coordinates tracked through camera changes, temporal interpolation of inventory, depletion, a connected decision, physical route arcs, original synthesized sound and a reviewable 1080p MP4.

## Run offline

Requires Python 3.9+, [`Pillow`](https://pypi.org/project/Pillow/) and FFmpeg (`ffmpeg`, `ffprobe`). No internet, browser, proprietary runtime or GPU.

```sh
python3 -m pip install Pillow  # only if not already installed; use a clean virtualenv
python3 examples/city-data-film/build.py --stills ./qa-stills --width 1280
python3 examples/city-data-film/build.py --out ./city-story.mp4 --width 1920 --fps 30
node scripts/audit-video.mjs ./city-story.mp4 --mode data-story --strict --sheet ./qa-contact.png
```

For a faster exploratory render, use `--width 960 --fps 24` **but do not submit that reduced export as a full-quality 1080p master**. Default output is 1920×1080, 30fps with an original 44.1-kHz synthesizer score muxed to AAC. The full export automatically renders independent 10s windows and joins them, to minimize resource pressure and preserve deterministic timestamps in restricted coding sandboxes. To sample shots without exporting, `--stills` renders exact time-indexed frames.

### Edit for another story

- Edit `data/network.json` to change the fictional hub IDs, locations and inventories. Values use deterministic interpolation; the world-space markers and top-right stock indicator derive from **the same source values**.
- Edit `DURATION`, `camera_at`, `hub_availability`, `render_routes` and the shot descriptions in `build.py` to reflect a new data narrative. This is a standalone demonstration renderer, not a generic GIS import utility.
- Replace the synthetic data with verified authorized real source fields and record provenance/coordinate assumptions in your film's `SOURCES.md`. Never claim the hard-coded example's logistics and stock counts are real.
- For photoreal 3D environments, geospatial GIS maps, complex lighting and 3D assets, use Blender or Three.js and retain the timeline/data conventions from `references/3d-data-films.md`.

## The shot map

| Interval | Film proof |
| --- | --- |
| 0–4.3s | Metric context, city already visible from frame zero |
| 4.3–10s | The world physically rotates and rises out of the data context |
| 10–16.5s | A tracked north depot depletes; highlighted source-backed value changes |
| 16.5–21.2s | A different spatial route replenishes the critical depot |
| 21.2–26s | Spatial graphic resolves into a clear closing hold |

This is intentionally not an 82-second filmed launch commercial: it proves the **code-rendered 3D data-scene capability**; external product captures, professional VO and editing are separate inputs supported by `references/launch-film.md` and `scripts/assemble-film.mjs`.

### Resource-limited machines

When your sandbox interrupts long renders, the script can export absolute-time windows, which are joinable without changing scene state:

```sh
python3 examples/city-data-film/build.py --out part-0.mp4 --start 0 --limit 10 --width 1920 --fps 30 --single-pass
python3 examples/city-data-film/build.py --out part-1.mp4 --start 10 --limit 10 --width 1920 --fps 30 --single-pass
python3 examples/city-data-film/build.py --out part-2.mp4 --start 20 --limit 6 --width 1920 --fps 30 --single-pass
# Use ffmpeg's concat demuxer over an ordered file list, then reencode H.264 as desired.
```

These chunks and the combined master have been encoded at 1080p/30fps and inspected. A full one-process export can be interrupted on CPU-constrained machines; do not claim the export succeeded until `ffprobe` and decoded stills confirm it.
