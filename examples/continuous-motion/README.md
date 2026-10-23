# Continuous camera/subject motion: 18s working proof

Source: `build.py`. The optional [720p concept sample](demo.mp4) is bundled in the installable skill ZIP, but the source-only GitHub checkout does not commit generated MP4s; use the commands below to regenerate it. `motion-plan.json` is its illustrative timing/story contract. The film shows one request token carried continuously from a browser through PHP execution and memory to a final check. There are **no new static cards** between chapters; the camera follows the same subject across the same world. This is a simple 2D technical/creative mechanism demo, **not** a studio-grade PHP security documentary, factual advisory, proprietary player, or proof of 3D visual quality. Verify PHP claims against independent sources before making a factual film.

Requirements: Python 3.10+, Pillow and NumPy, and FFmpeg to export MP4. No network connection or paid asset. The render is a pure function of time; all geometric positions, camera drift, processing rings, data cells, and final mark derive from absolute `t`.

```bash
python3 -m pip install pillow numpy
node scripts/validate-motion-plan.mjs examples/continuous-motion/motion-plan.json --strict
python3 examples/continuous-motion/build.py --still 6.5 --out /tmp/php-frame.png
python3 examples/continuous-motion/build.py --out /tmp/php-continuous.mp4 --fps 24 --width 1280 --height 720
node scripts/audit-video.mjs /tmp/php-continuous.mp4 --mode showreel --continuous --strict --sheet /tmp/php-motion-contact.png
```

This sample passes the continuous MP4 audit at **1280x720, 24fps, 18 seconds with its own short wordless audio score**, with no frozen 3+ second interval at 2fps. It is a **proof of uninterrupted movement, not a film-quality parity claim**. Analyze it at playback speed and then build original, brand-appropriate shots. The contact sheet alone cannot show continuity. If the user requests a literal freeze or reduced-motion presentation, obey that instead of forcing ambient movement.
