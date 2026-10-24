# Contributing

1. Runtime changes (`kit/`) must keep `render(t)` pure: run `npm test` and `node scripts/check.mjs examples/launch`.
2. If you change the example or the starter, render stills (`scripts/frames.mjs … --sheet`) and look at them before proposing the change.
3. Keep `references/upstream/` byte-identical (`npm run verify-upstream`). Put adaptations in `SKILL.md` or `references/*.md`.
4. Don't commit rendered media other than the small poster image, and never commit credentials.
