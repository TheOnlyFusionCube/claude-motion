# Source provenance and standalone distribution

Claude Motion is an **unofficial**, independently maintained coding-agent skill and browser renderer informed by the Motion artifact-type materials made public in the mirror:

https://github.com/asgeirtj/system_prompts_leaks/tree/main/Anthropic/artifact-types/motion

**Pinned historical source revision:** `4ec8ef41a1e0ef32e6f0e9d20b0c18f7e028dc83`. The mirror marks its repository CC0-1.0, but that repository-level label does **not** establish redistribution permission from the original rights holder. Permission is unresolved; neither authorization nor infringement is asserted here.

## Historical inventory (metadata, not bundled contents)

Earlier repository commits included the following 12 unmodified Markdown files (159,065 bytes) in `references/upstream/`. This table preserves their paths, sizes and Git blob hashes for identification and attribution. **The files listed below are no longer part of the current source tree.** The former root `SKILL.md` had been renamed to `original-skill.md` to avoid conflicting with this project's entrypoint.

| Previously bundled under `references/upstream/` | Original Git path suffix | Bytes | Git blob SHA-1 |
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

## Standalone operation

The current `SKILL.md` uses `references/production-guide.md`, `references/kit-api.md`, `references/recipes.md`, `references/intake.md` and `references/styles.md`, plus local runnable starter and example films. Those are the installation's working instructions. The renderer in `kit/` and export scripts are this project's independent implementation, **not** the private Motion player; matching the private product or acquiring its source is not required.

Use `npm run verify-portable` or `node scripts/sync-upstream.mjs --verify` to check required local files, stale document links and known exact-copy Git hashes. The retained `sync-upstream.mjs` filename is historical: `--list` displays this metadata; `--all` and `--force` no longer fetch, restore or modify external text. Verification needs no network.

## Distribution boundaries

This change removes the verbatim reference files from the current checkout, package and new Git archives built from this revision. It **does not erase earlier commits, tags, forks or downloaded archives** that may contain them; historical Git objects remain reachable unless separately addressed. The change also does not establish a legal opinion on the authorship or licensing of any earlier adaptations. Keep attribution, obtain permission where needed, and review rights before independently redistributing the original documents. See `NOTICE.md`.
