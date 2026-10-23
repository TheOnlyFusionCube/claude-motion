# Product and skill showreels: prove capability on screen

Read for **"make a demo video," "promote this skill," "launch teaser," "show what this tool does,"** and any film whose subject is software, developer tooling, or motion design itself. Read the original `upstream/motion.md` and `upstream/sound.md` first; this is an additional commissioning brief, not a substitute.

## The key distinction

A demo is not a title treatment, a slide deck, or a claims reel. In a *demo*, the viewer **sees a system or design principle work**: an action changes an object, a camera isolates why it matters, the result looks measurably different. A promo may be more abstract but must still embody the claimed craft. A motion-design promo that only says "deliberate motion" while its cards stay static contradicts its own message.

### Prioritize evidence over adjectives

- **Proof shot:** at least one viewer-readable before → interaction → after sequence. In software, use a genuinely recreated and authorized UI when source is provided; when none exists, make a clearly identified **concept demo**, not a purported screenshot or real feature claim.
- **Visible choreography:** at least two *different* kinetic devices, such as spatial morph / object-to-UI transformation; camera follow / subject tracking; word-by-word kinetic type; cursor with hover/settle/click; data or layout transformation driven by a real timestamp. **A title fading in, line sweeping across, or card scaling 1% doesn't alone count as a proof shot.**
- **Meaningful handoffs:** at least two transitions where the outgoing focal subject creates or becomes the incoming subject. A hard cut can punctuate action, but four unrelated near-identical cards are not a cinematic sequence.
- **Readability over ornamental information:** default to one headline (≤7 words) and one short supporting line per composition. Remove tiny fake log lines, decorative tickers, filler UI chrome, surplus counters, and repeated claims. If labels must be read, show them large enough at the exported physical size and at 640-pixel-wide viewing.
- **Distinct shot scales:** alternate hero, interaction close-up, payoff wide or detail, resolving end card. Reusing the same x/y/title/subtitle layout for the full film is not a camera plan.
- **No false fidelity:** if the code or UI assets aren't available, label the mock `CONCEPT DEMO` inside the film and make the concept unmistakably illustrative. Never present imagined behavior as a shipped feature.

## Suggested 20–24 second self-demo (NOT a layout template)

**Adapt the narrative and appearance to the product. Do not copy these words or UI as a generic default.** Every shot must have one visual transformation with a beginning and end.

| Time | Meaning | What actually happens on screen | Sound anchor |
| --- | --- | --- | --- |
| 0.0–2.4 | Hook | Start with a finished, legible idea. A thick stroke or shape starts evolving into the subject **before** the title finishes; no blank frame. | Restrained pad / one pluck. |
| 2.4–5.9 | Make the idea concrete | The stroke becomes a stage/timeline/editor. Camera follows its end into a genuinely designed working surface; one useful control comes into focus. | Pulse enters as the stage forms. |
| 5.9–9.6 | Human intent | A pointer arcs toward one control, settles 0.2–0.3s, types or drags. The actual source-preview changes visibly. The camera stays with the cursor target. | Distinct ticks / click at exact events. |
| 9.6–13.4 | Proof of motion | A scrub changes an object, a text phrase, and a mark from the SAME `t`. Jump the playhead backward and forward, showing identical states. The viewer sees why determinism matters. | Music hit tied to the scrub landing. |
| 13.4–17.4 | Payoff | The edited object exits the UI and fills the whole screen as a composed moving film. New scene scale and material, no static graph about "motion." | Musical lift + controlled whoosh. |
| 17.4–end | Branded resolve | The outgoing movement becomes the brand mark or clear single-line CTA. Finish in a stable, legible 3+ second hold; sound resolves and fades. | Resolving chord and fade. |

Every few seconds the visual question should change: *What is it? What did the human do? What changed? What did that enable?* The words can be minimal because the picture proves the point.

**For a demo of a coding-agent skill itself:** Show an input → an agent/coder action → a preview changing → an edited/exported result, instead of listing agent names in four boxes. Mention Claude Code, Codex, OpenCode, and Pi only if they serve the story and can be read. Avoid asserting the skill has UI or runtime features it doesn't provide.

## Shot-by-shot self-review

1. At `t=0`, the first frame is already a compelling composition, not merely a dark technical template.
2. For each beat, write two sentences: **"Before, the viewer sees ___." "After, the viewer sees ___ because ___."** If only the headline changed or a line filled, invent a real visual action and recompose.
3. Mark the actual hero's coordinate and camera scale at each 0.5–1s interval. A title at exactly the same coordinate and scale for six consecutive seconds is a warning for a showreel.
4. Watch once with sound **off**: does the action make sense? Watch once looking only at compositional change, not the text. Watch again with sound on: do hits align with exactly visible events?
5. Downscale to the actual delivered dimensions and a mobile 640px-wide preview. Remove text that cannot be read there, or zoom the camera.
6. Inspect the final MP4, not merely the live HTML preview. Call `node scripts/audit-video.mjs output.mp4 --mode showreel --strict --sheet qa.png`. Treat every flagged mid-film stagnation as a request to review and either revise or give a deliberate reason for an intentional hold.
7. Do not submit a technically valid but artistically unreviewed MP4 as "finished."

## Anti-example: motion-themed slides

A common failure: a 24s film opens on a static headline, advances to a static prompt/card, advances to a code snippet on another card, shows an agent-logo grid, and ends on another card. Minor orange underlines draw on, yet the film never demonstrates the claimed capability. **This is a slide presentation with fades, not a Motion film.** Fix the story at the storyboard level before polishing fonts or easing.
