# Benchmark coverage — Anthropic's 82-second Dashboards/Motion launch reference

Reference: https://youtu.be/en0GuyhieQk (official launch film; published scene log analyzed). The film has **two production layers**: (1) live/replayed product walkthrough with a presenter/voice and (2) a code-rendered city data explainer inside that walkthrough. Do not score the two as a single unsupported "parity %".

| Benchmark capability | Portable route | Evidence in this repository | Honest boundary |
| --- | --- | --- | --- |
| Original source creative guidance | Verbatim 12 original docs | `node scripts/parity.mjs` / 159,065 bytes | Does not transfer Anthropic's private player |
| Data records placed in a 3D neighborhood | Blender / imported GLBs or Three.js; VTK fallback | `examples/blender-studio/`, `examples/studio-city-film/` and synthetic data scene | User's GIS / authentic geo-assets are not bundled |
| Shot-directed camera and lens | Deterministic 3D camera eye/target and field of view | 7 authored poses in Blender starter, tested math in VTK exercise | Blender's look-development render not yet validated here |
| Station values and arc motion tied to actual time | Single source `hub_availability(h,t)`, `clock_at(t)` | Critical station 18→0→12, route arcs, test assertions | Use real time-stamped data for a factual film |
| 1080p H.264 motion export with sound | Blender image sequence + FFmpeg or existing VTK exporter | Existing VTK 18s 1080p demo audited; Blender still-to-sequence code added | Blender visual output remains unverified; examples are not the 82s movie |
| Authored 3D asset/pipeline optimization | Offline GLB generator, Blender studio lights, collection instances, safe gltfpack wrapper | 3 GLBs totaling about 69 KiB / 6,172 source triangles; preflight and VTK GLB import pass | Real Blender Cycles/Eevee visuals and professional art-direction parity not demonstrated |
| Authentic product screen capture | User-approved recording / project's existing testing stack | Source-first UI guidance; `references/launch-film.md` | No user's product was available; no authentic UI captured |
| Narration and score mixed with picture | FFmpeg assembler with separate voice + score tracks | `scripts/assemble-film.mjs`, live FFmpeg integration test | Does not synthesize or supply a presenter's voice |
| Long multi-shot hybrid launch structure | Timestamped shot list and edit decision list | `references/launch-film.md` + assembler | Need actual product footage, script approval and/or voice inputs |
| In-player comment pin and revisions | Edit project / captured actual product UX | Workflow and source Motion references | Does not implement the proprietary collaboration UI |
| Full optical/commercial equivalence | Not automatically provable | Human creative QA checklist | No reproducible studio-equivalence score established |

## Review standard

Any claim of *making a film like this* should demonstrate at least **one real data-driven 3D motion sequence**, **one genuine product/UI action sequence if source provided**, **a usable narrator/caption path**, **a coherent cut**, and an **inspected final MP4**. Missing footage or credentials must be disclosed, never synthesized into misleading "real" UI. The included data-city benchmark verifies the technically hardest motion mechanism separately so you can audit it, adapt it to another stack, and replace synthetic numbers with a real dataset.
