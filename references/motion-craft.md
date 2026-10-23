# Motion craft and art direction

Use this guide to direct attention and improve short, code-authored films. Numbers are practical defaults for a 1080p output, not mandatory rules.

## Establish visual hierarchy

- Show one main subject at a time. Let each new movement carry the viewer toward the next item to read.
- Give a new shot a short establishment interval (roughly 0.6-1s) before small text or a new interaction needs attention.
- Keep held content quietly alive: a tiny camera push (about 1-3% over a hold), gentle 10-30px translation, or low-amplitude breathing, rather than introducing new facts during the hold.
- Open on a nonempty, well-composed thumbnail. Hold the end frame for approximately 3 seconds when the duration permits.
- Use negative space intentionally. Avoid gratuitous labels, badges, arrows, fake metrics, and invented supporting text.

## Motion principles

- Use an ease-out for entrances; an ease-in for departures; ease-in-out for camera repositioning. Consider 120ms of anticipation and modest overshoot on expressive *artwork*, not on a real product control.
- Stage related entrances with roughly 0.2-0.4s offsets. Let a previous subject transform or pass its visual role to the next; only cut hard when rhythm or causality benefits.
- Word-by-word type entrances often read well around 0.1s apart over 0.4-0.6s; bring text from one consistent direction within a phrase. Prefer short display copy to paragraph animation.
- Keep cursor clicks crisp (a ring or press change around 0.12s); menu arrivals can ease over 0.16-0.2s.
- Faster motion can have 2-3 translucent earlier-position echoes calculated analytically from `t`. Do not incrementally accumulate trails in a canvas.
- Avoid repeated high-contrast flashing. If a timed blink is needed, keep its frequency below 3 Hz and avoid full-screen flashes.

## Camera and scale

- Frame what matters, not a whole busy application. Start wide only long enough to establish context, then move toward a row, text field, chart result, or control.
- Typical emphasis move: ~0.5-1.2s. Opening camera moves should be gentler, perhaps 1.2-1.5s, especially when narration or type appears.
- Recreate editable UI as DOM when feasible so typography stays sharp under zoom. Canvas is well suited to geometric and illustrative films; use high resolution when rendering text-heavy compositions.
- Maintain readable UI text at the *final displayed size*, not just inside a huge source window. Validate against a phone-scale still.

## Palette and typography

- Favor a grounded background and neutral ink with one accent that communicates one purpose. Adapt to the user's brand, which takes precedence.
- Avoid decorative effects such as particles, glow, 3D extrusion, or gradients unless they are part of the design system or clearly serve the brief.
- Use user-provided typefaces where licensed; bundle font files for reproducible local rendering when possible. Check glyph coverage.
- Respect UI chrome separately from the film palette: do not recolor genuine product controls to make the film more dramatic.

## Review at three scales

1. **Contact sheet:** does each beat have a distinct composition and a coherent direction of travel?
2. **Phone thumbnail:** is the headline or interaction still legible?
3. **Full frame:** are spacing, kerning, positioning, shadows, and microstates believable?

Rework any portion that resembles a static slideshow unintentionally: give its close-up a meaningful ongoing action, not merely more camera movement.
