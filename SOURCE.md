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

Verify with Node built-ins only:

```sh
node scripts/sync-upstream.mjs --verify   # fails nonzero for a missing or changed original
```

`node scripts/sync-upstream.mjs --all` re-fetches the originals at the pinned revision (optional, needs network).

## How the skill uses them

`SKILL.md`, `kit/`, `scripts/`, `templates/` and `examples/` are new code written for this project. The runtime
re-implements the *documented* `kit` API (`film-api.md`) as an ordinary browser script, so the craft rules and
code fragments in the originals apply to films made here. It is not the original player, and neither its
pixels nor its sound are claimed to match. The originals' private-product commands (Artifact, ArtifactData,
`kit.module`, `frames.ts`/`check.ts`, the Export button) do not exist here; `references/kit-api.md` lists the
local equivalents.
