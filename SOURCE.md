# Original Motion source, integrity and portability

`claude-motion` is an **unofficial** standalone Agent Skill adapted from the Motion artifact-type instructions in the public mirror:

https://github.com/asgeirtj/system_prompts_leaks/tree/main/Anthropic/artifact-types/motion

It is not an official Anthropic product or a copy of Anthropic's private player, Artifact store, stylesheet bundle, runtime synthesizer, or live design interface. The mirror labels its repository CC0-1.0; that label does not establish a license from the original rights holder. Review provenance and applicable permissions before redistributing source text.

**Pinned source revision:** `4ec8ef41a1e0ef32e6f0e9d20b0c18f7e028dc83`.

## Exact contents: 100% verbatim source documentation

All original files are **included offline**, unmodified, and checked against the Git blob SHA-1 hashes that identify their exact upstream content. The source root `SKILL.md` has only been **renamed** to `references/upstream/original-skill.md` to keep the portable skill's root `SKILL.md` as the sole entrypoint; its byte contents are unchanged.

| Local `references/upstream/` file | Original Git path suffix | Bytes | Git blob SHA-1 |
| --- | --- | ---: | --- |
| `original-skill.md` | `SKILL.md` | 16,064 | `b3ddb733dcda89d071ccf3a914f62e01fda06a4f` |
| `motion.md` | `artifact-type/reference/motion.md` | 16,106 | `7dd751cb8d54347a5ef8a34d7539d98d0942d784` |
| `film-api.md` | `artifact-type/reference/film-api.md` | 16,029 | `c048856dcc22c2676d4160ba46b28937d22fbcfc` |
| `rough-cut.md` | `artifact-type/reference/rough-cut.md` | 15,991 | `61f329584dee6fcc829805d1c1e0651f9b43dd91` |
| `finalize.md` | `artifact-type/reference/finalize.md` | 15,954 | `011913a3e33a24c68c5d74fd0cee25a35644886f` |
| `questions.md` | `artifact-type/reference/questions.md` | 16,008 | `fb51ba536de3c9120292c434a3e48d5ec2af8426` |
| `plan.md` | `artifact-type/reference/plan.md` | 13,861 | `8ed904c5cdd018f0fcc8600f0a4d608d2bdc4925` |
| `recreate-ui.md` | `artifact-type/reference/recreate-ui.md` | 8,367 | `4139f9a5c4009249e17ae8330a1d8b12bc1f4c4b` |
| `render-offline.md` | `artifact-type/reference/render-offline.md` | 14,363 | `da54524b9d9c010438a37c49427adc0e8383009f` |
| `sound.md` | `artifact-type/reference/sound.md` | 6,772 | `aacf37f4ddc3c19e8a84d60345d8e96336f5f649` |
| `styles.md` | `artifact-type/reference/styles.md` | 14,897 | `60968424d08b3c0087119a0363e54e979aa44864` |
| `walkthrough.md` | `artifact-type/reference/walkthrough.md` | 4,653 | `6499048be0e2ed73c8de6d35a69c13d3b8f95e23` |
| **Total** | **12 original documents** | **159,065** | **12 verified Git blobs** |

Verify 100% exactly, using only bundled bytes and Node built-ins:

```sh
node scripts/parity.mjs                 # 12/12, 159,065/159,065: 100.0%
node scripts/parity.mjs --json          # machine-readable per-file report
node scripts/sync-upstream.mjs --verify # also fails nonzero for missing/mismatched originals
```

`node scripts/sync-upstream.mjs --all` is an **optional** network repair command pinned to the same revision and original hashes. It is never required to activate the skill. It refuses mismatched data or local edits except with an explicit `--force`. Avoid editing originals; implement adaptations elsewhere.

## Coding-agent compatibility: what is adapted

The active `SKILL.md`, `references/portable-workflow.md`, `references/compatibility-map.md`, and all scripts/assets are **new adapter code**, not copies of a proprietary Motion runtime. Source-specific directives such as Artifact creation, ArtifactData `batch`/`set`, `kit.stage`/`kit.scenes()`/`S.program`, `show_widget`, `_blob` URLs and the player-only Export UI cannot run unmodified on Claude Code, Codex, OpenCode or Pi. They are documented historically verbatim in `references/upstream/` and **mapped**, never silently rewritten, to local project files, time-indexed drawing, host-supported questions, original WAV generation and browser/FFmpeg export.

A local `scenes.json` manifest follows the original scene data conventions; `scripts/validate-film.mjs` checks basic invariants, stable IDs, palette contrast, dimensions and durations without private tools. Scene rendering and the soundtrack in `assets/vanilla-film/` are original standalone demonstrations. Agents should prefer an existing user video/animation stack when available.

## What 100% does and does not mean

**Document-level retention parity = 100%:** Exact pinned upstream Markdown bytes are bundled and verified.

**Original API/runtime parity = not claimed:** This package does not include the source player's custom scene engine, built-in style system, editor, database, score synthesizer, or Export UI. The portable template provides substitute behavior with different implementation and rendering characteristics.

**Visual/audio quality parity = not measured:** Equal creative instructions are not proof of equal output quality. Testing representative compositions and comparing frame captures, text fidelity, camera movement, exact sounds, and exports against original Motion artifacts would be required for a defensible percentage. Our generic tests verify deterministic code, manifests and source integrity, not human visual equivalence.
