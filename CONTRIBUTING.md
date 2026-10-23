# Contributing to claude-motion

Contributions to the portable adapter, developer tooling and demo are welcome.

1. Make changes to `SKILL.md`, adapter `references/`, scripts, tests or example film.
2. Keep every file under `references/upstream/` byte-identical to its pinned source. Do not "fix" upstream wording in place; explain compatibility differences in the adapter instead.
3. Run `npm run check` before proposing changes. For edits affecting rendering, also inspect actual browser frames and export a short sample if you have Chromium and FFmpeg locally.
4. Do not introduce private API dependencies or require access to an Anthropic Artifact store.
5. Keep generated video/audio and credentials out of the repository.

Maintain accurate language about portability: documentation retention does not prove feature parity or visual equivalence. Before redistributing original reference documents, review `NOTICE.md`.
