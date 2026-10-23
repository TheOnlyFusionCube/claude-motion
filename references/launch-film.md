# Narrated product launch + 3D explainer films

**Mandatory when the brief references a filmed product announcement, a narrated 60–120 second launch movie, real product screen recording, or the Oct 2026 video “Introducing Claude Dashboards and Claude Motion”** (YouTube ID `en0GuyhieQk`). Also read `references/3d-data-films.md` if the feature includes 3D and `upstream/recreate-ui.md` if a UI is shown.

## The benchmark: what that reference actually contains

The official 82-second launch film is a **hybrid production**, not an 82-second animation that a graphics renderer can produce from a slogan alone. Based on the published video breakdown and an independently documented scene log:

| Approximate time | Production device | What the viewer learns |
| --- | --- | --- |
| 0:00–0:06 | Compelling moving 3D city/data hook | Data can become a scene |
| 0:06–0:23 | Human presenter / narration and designed title | Why the feature exists |
| 0:23–0:27 | Branded integrations and handoff to product UI | Where the source data comes from |
| 0:27–0:39 | Real interactive dashboard captured at readable scale | How a concrete data question turns into a result |
| 0:39–0:44 | Select a chart and prompt the next action | Causal bridge from dashboard to video |
| 0:44–0:56 | Data-driven 3D city, moving camera, state changes | Animation explains the operational pattern |
| 0:56–1:03 | Comment pin and resulting video revision | Steering changes an existing film |
| 1:03–1:22 | Collaborative editor/export and concise branded finish | Handoff and use beyond the demo |

The reference demonstrates a real human-paced product workflow *and* a code-rendered 3D explainer. **Treat the two as different craft layers**: screen capture/presenter footage are media inputs; the 3D city is an authored motion scene. Do not falsely claim the latter can generate live-action presenter footage, real integration UIs, or real-time private product functionality without source media and authorization.

This breakdown is a workflow analysis, not permission to duplicate the video's scene designs, text, logos, narrator, sound, graphics or visual assets. Make an original film with the same professional production **qualities**: authored hook, human-paced explanation, authentic demonstrated action, visual proof, a revision, and a resolving close.

## Full production workflow (not a text-card alternative)

1. **Ingest and classify.** Identify whether the brief calls for an animated explainer, documentary-style launch video, or hybrid. Ask for the actual product URL/code, approved screenshot/recording, data, brand system, narration/voice option, resolution and destination only when essential. An absent feature, voice recording or branding asset is a limitation to disclose — not something to fake.
2. **Script with claims tied to visuals.** Write voiceover lines whose duration fits speech (roughly 130–165 spoken words per minute plus breathing/holds). Every spoken claim is supported by a visible UI result, 3D data state or authorized source. For 82 seconds, allocate roughly 155–185 words depending on pace. If not supplied, create a narration *script* but do not claim an AI actor's recorded voice exists.
3. **Shot list with absolute in/out points.** Use at least 4 shot scales across 8–15 meaningful beats in an ~80s piece: hero detail, contextual room/full-window, cropped interaction, aerial 3D, critical close-up, resolving wide. Each shot records `source`, `start`, `duration`, `action`, `visible result`, `spoken phrase`, and audio cues. Resolve screen action before the voice explains its implication.
4. **Acquire *authorized* footage.** Record the actual working product in its real states, or use provided approved media. If UI source is accessible, use source-first DOM/CSS as in `upstream/recreate-ui.md`; do not invent supposedly shipped controls or capabilities. Never log into an unapproved account or capture personal/sensitive details; populate safe demo data. If no source exists, an **in-video `CONCEPT DEMO` label** is required and the script must frame the sequence as a scenario.
5. **Author the 3D data proof.** Parse source export, map station IDs to world coordinates, extrude city geometry, camera-orbit from overview to single station, animate inventory/flow from the same timestamps, display consequential metric, and demonstrate a response. See `references/3d-data-films.md` and `examples/city-data-film/` for a fully runnable fallback.
6. **Produce audio intentionally.** Record user-supplied narration or use an available authorized TTS/voice workflow. Always preserve voice intelligibility: instrumental bed below speech, duck score 12–18 dB under voice where appropriate, time impacts to actions, avoid accent hits under dense speaking. Use original or licensed music; don't synthesize a celebrity/presenter's voice without authorization. Add captions (SRT or burned-in) for social/muted viewing.
7. **Edit and mix.** Keep authored scene files and screen-recorded clips separate. Align all shot in/out times to source footage, and render deterministic graphics against an absolute-timeline edit decision list. Use `scripts/assemble-film.mjs plan.json --out launch.mp4` to concatenate video clips with normalized 1080p composition and mix an optional `voice.wav` + `score.wav` track. If the user needs soft overlaps/motion-matched transitions, use a proper NLE or build `xfade` intentionally rather than sprinkling default dissolves.
8. **Review on the final MP4.** Listen to the voice, inspect each click against the VO and 3D state, inspect native frames at cuts, check UI fidelity, sharpness, phone-scale labels, original assets and correct audio levels. Run `scripts/audit-video.mjs launch.mp4 --mode launch --strict --require-audio --sheet qa.png`, and provide at least one editable project/source artifact alongside the movie.

## Example edit plan

Save `edit.json` next to your authorized clips, with the voiceover and score aligned from t=0:

```json
{
  "width":1920, "height":1080, "fps":30,
  "shots":[
    {"id":"hook", "file":"clips/3d-hook.mp4", "duration":6},
    {"id":"intro", "file":"clips/narrated-intro.mp4", "duration":17},
    {"id":"workflow", "file":"clips/authorized-screen-capture.mp4", "duration":20},
    {"id":"explain", "file":"clips/3d-data-story.mp4", "duration":20},
    {"id":"result", "file":"clips/real-feedback-and-export.mp4", "duration":13},
    {"id":"outro", "file":"clips/outro.mp4", "duration":6}
  ],
  "audio":{"voice":"audio/voice.wav", "score":"audio/score.wav", "voiceGain":1, "scoreGain":0.19}
}
```

`node scripts/assemble-film.mjs edit.json --out release.mp4`. Both audio inputs should span the assembled film; the tool intentionally cuts picture at shot boundaries rather than inventing continuity. This script is a **post-production joiner**, not a real UI recorder or a generator of presenter footage. For user-provided text with no narration file, deliver an honest text-only/captioned variant; do not misrepresent it as identical to the reference.

## Reference audit before acceptance

Check all six independent dimensions. Do not combine them into a single unearned “100% parity” claim:

- **Documentation:** unchanged original 12-file craft corpus verified by source hashes.
- **Geometry:** genuine 3D projection/orbit/extrusions and stable data-to-marker mapping, not 2D screenshot tricks.
- **Story:** a real challenge, a source-backed visible data change and payoff.
- **Film:** varied framing, excellent continuity, voice/cut rhythm, readable captions, multi-beat sequencing.
- **Product:** only authorized real product behavior is shown as fact; speculative work is labeled.
- **Export:** final 1080p MP4 (or requested size), sound/captions when specified, frame-by-frame QA and honest limitations.

Passing hash tests, exporting an MP4, or watching a stylized low-poly city from one angle does **not** establish studio-production equivalence. Mark automated evidence separately from human qualitative review.
