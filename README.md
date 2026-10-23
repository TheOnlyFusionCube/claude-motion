<p align="center">
  <img src="assets/cover.svg" alt="claude-motion — portable, deterministic motion films for coding agents" width="900" />
</p>

<h1 align="center">claude-motion</h1>

<p align="center">
  <strong>Motion direction for coding agents, with the original craft guidance preserved.</strong><br/>
  An unofficial, standalone Agent Skill for Claude Code, Codex, OpenCode, Pi and other skill-aware agents.
</p>

<p align="center">
  <a href="#install">Install</a> · <a href="#what-it-makes">Examples</a> · <a href="#how-it-works">How it works</a> · <a href="#source-fidelity">Source fidelity</a> · <a href="#development">Development</a>
</p>

---

## What it does

Give your coding agent a brief, a product screen, or an existing animation. `claude-motion` teaches it to make a considered film, not a collection of generic UI effects:

- **Direct attention** with disciplined pacing, camera moves, subject handoffs, and kinetic typography.
- **Show real product behavior** using source-first UI reproduction, meaningful cursor movement, and readable close-ups.
- **Build deterministic timelines** so a frame at time `t` looks the same no matter how the playhead got there.
- **Synchronize an original score** and UI foley to exact visual events.
- **Review the actual frames** before calling a film finished; revise targeted beats without gratuitous redesigns.

This is an **independent coding-agent adaptation**, not Anthropic's Motion player. Documentation parity and the feature/visual parity of a proprietary runtime are different claims.

## Install

From a terminal with a skill installer:

```bash
npx skills add TheOnlyFusionCube/claude-motion
```

Or clone the repository and copy the whole directory into the skills location for your agent:

| Agent | Project location | User location |
| --- | --- | --- |
| **Claude Code** | `.claude/skills/claude-motion/` | `~/.claude/skills/claude-motion/` |
| **Codex** | `.agents/skills/claude-motion/` | `~/.agents/skills/claude-motion/` |
| **OpenCode** | `.agents/skills/claude-motion/` or `.opencode/skills/claude-motion/` | `~/.config/opencode/skills/claude-motion/` |
| **Pi** | `.agents/skills/claude-motion/` or `.pi/skills/claude-motion/` | `~/.pi/agent/skills/claude-motion/` |

**Example:** from the parent directory of a cloned `claude-motion` repo:

```bash
mkdir -p ./my-project/.agents/skills
cp -R ./claude-motion ./my-project/.agents/skills/
```

If several agents use your project, use each agent's supported discovery path; don't assume all four read the same folder. The repository root contains the active `SKILL.md` and is the skill folder. No account, Anthropic Artifact API, package install, or network fetch is necessary to read the skill.

## What it makes

Ask your coding agent:

> Use claude-motion to make a 20-second product teaser from the components in this repo. Keep the UI faithful, use gentle camera pushes, and export MP4.

> Storyboard a 30-second vertical launch film with three different visual directions. Wait for my approval before implementation.

> Rework the button click at 12 seconds without moving any other elements. Verify the before and after frames.

> Review this animation against the original Motion craft rules: pacing, camera, readability, cursor path, first frame, and closing hold.

The skill prioritizes the stack your project already uses (for example, Canvas, SVG/DOM, Motion, GSAP, Remotion, or FFmpeg). It also ships an **original, dependency-free browser-film example** for projects without an animation stack.

## Try the included demo

No `npm install` is needed for the browser demo:

```bash
python3 -m http.server 8080 --directory assets/vanilla-film
# Open http://127.0.0.1:8080/
```

A seekable example exposes `window.__motion.seek(seconds)`. The optional local media tools use **Node 22+, Chromium, and FFmpeg** (MP4 only):

```bash
node scripts/inspect.mjs assets/vanilla-film --times 0,3.4,6.25,9.6,13.9 --out ./frames
node scripts/render-audio.mjs assets/vanilla-film --out ./score.wav --levels yes
node scripts/export.mjs assets/vanilla-film --out ./demo.mp4 --audio ./score.wav
```

Visual export depends on a locally available Chromium and FFmpeg. The browser preview is not a replacement for the private Motion player or its audio transport.

## How it works

```text
SKILL.md                     Portable instructions and source-reading rules
references/upstream/         All 12 original Motion Markdown documents, unchanged
references/portable-*.md     Coding-agent adapter and reusable motion primitives
references/compatibility-map.md
assets/vanilla-film/         Original deterministic Canvas-based film example
scripts/                     Parity, scene validation, frame inspection, audio, export
agents/openai.yaml           Optional ChatGPT skill metadata
tests/                       Determinism, audio, manifest and source-integrity tests
.github/workflows/           CI validation
```

The active skill reads the original creative instructions when appropriate. The adapter deliberately **does not execute historical directions** to call Anthropic-only `ArtifactData`, `show_widget`, `_blob` endpoints, or a proprietary `kit` runtime. Instead it maps the intent to standard files and host-supported tools. See [the portability map](references/compatibility-map.md) and [workflow](references/portable-workflow.md).

## Source fidelity

**100% original-document retention:** 12 of 12 original Markdown files, **159,065 of 159,065 bytes**, verified against pinned upstream Git blob SHA-1 values.

```bash
node scripts/parity.mjs
node scripts/sync-upstream.mjs --verify   # offline verification
```

Source: [public Motion instruction mirror](https://github.com/asgeirtj/system_prompts_leaks/tree/main/Anthropic/artifact-types/motion), pinned to `4ec8ef41a1e0ef32e6f0e9d20b0c18f7e028dc83`. The original entrypoint is archived at `references/upstream/original-skill.md`; the active entrypoint remains this repo's root `SKILL.md`. See [SOURCE.md](SOURCE.md) for the complete hash table and provenance details.

**Important:** "100%" applies to **verbatim source documentation**, not Anthropic's proprietary player, rendering API, editor, UI, sound engine, or measured film quality. There is no claim of affiliation with or endorsement by Anthropic. The mirror's CC0 label does not establish permission from the original rights holder to redistribute its text. Please review the [third-party notice](NOTICE.md) before publishing.

## Development

The skill and its tests need no third-party Node dependencies:

```bash
npm test           # automated tests
npm run parity     # original-file SHA check
npm run check      # parity, manifest validation and tests
```

Avoid modifying `references/upstream/`: the pinned original references must remain byte-identical. Put portability work in `SKILL.md`, `references/portable-*.md`, `scripts/`, or the demo. Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).

## License and credits

- New adapter code, test code and documentation authored for this repo: **MIT**, see [LICENSE](LICENSE).
- Verbatim third-party material under `references/upstream/`: **not covered by that MIT grant**. See [NOTICE.md](NOTICE.md) and [SOURCE.md](SOURCE.md).
- Inspired by the publicly mirrored Motion instructions; comparison repo: [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill). This skill is separate from both projects.
