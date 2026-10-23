# Proof-of-motion concept — 20 seconds

[Play the 1080p concept demo](demo.mp4)

This is a **hand-authored illustrative benchmark** for `claude-motion`'s visual quality gates. It is NOT a promised output from a one-line prompt, a reproduction of the proprietary Anthropic player, a copy of another company's UI, or a demonstration of shipped application features. The editor is explicitly labeled a **CONCEPT DEMO** in the picture.

The choreography deliberately corrects the common static-promo failure: an opening line follows a meaningful path, the graphic becomes an editor concept, a typing interaction and cursor scrub cause the preview to change from IDEA to MOTION, the animated result leaves the UI and becomes a full-screen film, and the closing mark resolves from the outgoing trajectory. A named timeline controls the 20-second score and visual interactions. It exports 1920×1080 at 30 fps with original synthesized music and UI foley.

## Render locally

Optional example tooling: Python 3.11+, Pillow, NumPy, OpenCV (`opencv-python-headless`), FFmpeg and an installed Inter Display font in `/usr/share/fonts/opentype/inter/`. The script uses these only when you explicitly run it. It has no network calls; **the core skill and its 34 automated tests do not require these Python dependencies**.

```sh
python3 -m pip install -r examples/showreel-proof/requirements.txt
python3 examples/showreel-proof/build.py
node scripts/audit-video.mjs examples/showreel-proof/demo.mp4 --mode showreel --strict --sheet ./qa.png
```

The script writes `demo.mp4` and `original-score.wav` beside itself by default. Set `CLAUDE_MOTION_OUTPUT_DIR` to choose another output folder, and `CLAUDE_MOTION_FONTDIR` to select locally installed Inter Display font files. Its main value is inspectable code and timed visual concepts; the pre-rendered MP4 is included so users can watch without rebuilding it. No third-party font files are redistributed.

**Creative verification:** The automated audit passes the included MP4 and flags the earlier 910×512 mostly-static film in a separate test. A passing audit is not proof that every viewer will like the design. Compare the shots and revise for the project's audience and brand, rather than copying this exact look into every user film.
