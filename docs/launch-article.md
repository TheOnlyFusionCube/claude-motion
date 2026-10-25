---
title: "Deterministic 60 FPS Motion Graphics with Code: Introducing claude-motion"
published: true
description: "How to generate frame-perfect 2D/3D motion graphics, kinetic typography, and physics simulations using Three.js, Canvas, and Claude Code."
tags: webdev, javascript, threejs, animation
canonical_url: https://theonlyfusioncube.github.io/claude-motion/
cover_image: https://raw.githubusercontent.com/TheOnlyFusionCube/claude-motion/main/assets/social-preview.jpg
---

Rendering smooth, production-grade motion graphics in code has historically meant wrestling with browser timing drift, dropped frames, non-deterministic physics, and painful rendering pipelines.

Today, we are open-sourcing [**claude-motion**](https://github.com/TheOnlyFusionCube/claude-motion) (live docs: [theonlyfusioncube.github.io/claude-motion](https://theonlyfusioncube.github.io/claude-motion/)), an open-source motion graphics runtime and agent skill designed for deterministic 60 FPS 2D/3D video rendering, generative kinetic typography, and physics simulations.

---

## The Problem: Why Browser Animations Stumble on Video Export

Traditional web animations rely on `requestAnimationFrame` and `performance.now()`. When exporting a 30-second 4K video:
- CPU or GPU throttling causes delta time (`dt`) spikes.
- Physics engines (Verlet, Euler, spring solvers) drift non-linearly across runs.
- WebGL contexts can hitch during heavy shader compiles, ruining video continuity.

To produce frame-perfect MP4/WebM video from code, you cannot rely on wall-clock time. Every frame must advance by a fixed mathematical step:
$$\Delta t = \frac{1}{\text{FPS}}$$

---

## What is `claude-motion`?

`claude-motion` bridges the gap between creative coding (Three.js, 2D HTML5 Canvas) and automated video production:

1. **Deterministic Tick Engine**: Time is decoupling from system load. Whether a frame takes 5ms or 500ms to render, physics compute at exact increments.
2. **Headless Playwright Recording**: Frame-by-frame snapshot capture at true 60 FPS with zero dropped frames.
3. **Hardware-Accelerated Encoding**: Direct pipeline to FFmpeg with ProRes or H.264 / AAC encoding presets.
4. **Claude Code & Agent Integration**: Pre-configured tools and skills allowing AI agents to generate, preview, and refine animations autonomously.

---

## Quick Example: 60 FPS Kinetic Typography

Here is how simple it is to build a deterministic scene with text animation and particle trails:

```javascript
import { Stage, KineticText, SpringSolver } from 'claude-motion';

const stage = new Stage({
  width: 1920,
  height: 1080,
  fps: 60,
  duration: 5.0 // seconds
});

const title = new KineticText({
  text: "DETERMINISTIC MOTION",
  font: "900 84px Inter",
  fill: "#ffffff",
  tracking: 4
});

const spring = new SpringSolver({ stiffness: 120, damping: 14 });

stage.onUpdate((frame, totalFrames, time) => {
  const progress = frame / totalFrames;
  title.opacity = spring.evaluate(progress);
  title.scale = 0.95 + 0.05 * spring.evaluate(progress);
});

stage.render();
```

---

## Performance & Benchmark Comparison

| Feature / Metric | Remotion | Motion Canvas | claude-motion |
| :--- | :--- | :--- | :--- |
| **Primary Domain** | React UI / Web Components | TypeScript Canvas Presentations | 2D/3D WebGL, Three.js & Physics |
| **Physics Determinism** | Variable (Library dependent) | Basic Springs | Fixed-step Runge-Kutta & Verlet |
| **Headless Capture** | Chromium / Puppeteer | Vite dev server | Playwright + FFmpeg pipe |
| **Agent Skill Native** | No | No | Yes (Claude Code native) |
| **Export Formats** | MP4, WebM | WebM, MP4, PNG sequence | ProRes, MP4, WebM, GIF, PNG |

---

## Live Demo & Getting Started

- **Documentation & Showcase**: [https://theonlyfusioncube.github.io/claude-motion/](https://theonlyfusioncube.github.io/claude-motion/)
- **GitHub Repository**: [https://github.com/TheOnlyFusionCube/claude-motion](https://github.com/TheOnlyFusionCube/claude-motion)
- **Install via Claude Code**:
  ```bash
  claude skill install TheOnlyFusionCube/claude-motion
  ```

If you're building generative video, creative coding tools, or automated agent pipelines, check out the repo, star the project on GitHub, and try rendering your first deterministic scene!
