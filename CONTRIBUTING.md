# Contributing to claude-motion

Contributions to the portable adapter, developer tooling and demo are welcome.

1. Make changes to `SKILL.md`, adapter `references/`, scripts, tests or example film.
2. Keep every file under `references/upstream/` byte-identical to its pinned source. Do not "fix" upstream wording in place; explain compatibility differences in the adapter instead.
3. Run `npm run check` before proposing changes. For edits affecting rendering, also inspect actual browser frames and export a short sample if you have Chromium and FFmpeg locally.
4. Do not introduce private API dependencies or require access to an Anthropic Artifact store.
5. Keep generated video/audio and credentials out of the repository.

Maintain accurate language about portability: documentation retention does not prove feature parity or visual equivalence. Before redistributing original reference documents, review `NOTICE.md`.

## 3D data-film sample

The example under `examples/city-data-film` is Python + Pillow and system FFmpeg, independent of the browser demo. Update `data/network.json` and the deterministic `build.py` together; add/adjust `tests/data-film.test.mjs` when timing, geometry, or audio changes. Keep every screenshot, numeric claim, and source record honest and label all synthetic examples visibly. Do not commit downloaded copyrighted videos or proprietary customer recordings.
