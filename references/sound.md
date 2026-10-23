# Original sound design

Read only if adding music, sound effects, narration timing, or a sound-aware export.

## Model audio as timeline data

Tie the audio to the same authored timestamps as the visual beats. A score can be represented as `{time, duration, pitch, velocity, instrument}` notes plus `{time, kind, gain}` effects. For a fully deterministic file render, synthesize those events directly against samples of the audio timeline rather than recording realtime microphone or Web Audio playback.

```js
const audioEvents = [
  { time: 0, kind: 'note', pitch: 57, duration: 0.35, velocity: 0.17 },
  { time: 2.8, kind: 'note', pitch: 64, duration: 0.2, velocity: 0.24 },
  { time: 6.4, kind: 'click', duration: 0.08, velocity: 0.12 },
  { time: 16.5, kind: 'note', pitch: 69, duration: 0.7, velocity: 0.2 },
];
```

The bundled example is silent by default. To add sound to an exported MP4, generate an original WAV or use user-authorized audio and mux with FFmpeg. Do not claim silent output contains music.

## Timing and taste

- Align harmonic arrivals with major transitions, especially the end-card entrance. Choose tempo to support the cut rather than mechanically cutting every beat to the same grid.
- Keep most accompaniment low, leave breathing room during reading, grow energy around interaction and payoff, and resolve on the final card.
- Prefer a small palette of gentle percussive and sustained instruments; avoid distracting melodies and loud hits.
- Add click/typing/selection foley only where a visible action occurs; foley should match exact event times, not broad musical beats.
- Do not reproduce, approximate closely, or claim the rights to an existing song, theme, or brand jingle. Use an original score or clearly authorized assets.

## Live playback and export

Browsers usually require a user gesture to start Web Audio. Keep the visuals usable muted and expose an explicit sound toggle if audio exists. A deterministic offline mixdown at 48 kHz can be generated once and muxed into the video; its timestamps must match the frame timeline and it must be tested for clipping and sync. For authored narration, treat transcript claims as screen content requiring the same factual checks.
