# Contributing

1. Runtime changes (`kit/`) must keep `render(t)` pure: run `npm test` and `node scripts/check.mjs examples/launch`.
2. If you change the example or the starter, render stills (`scripts/frames.mjs … --sheet`) and look at them before proposing the change.
3. Do not vendor third-party instruction mirrors. Write working instructions against local code and examples; run `npm run verify-portable` to catch stale links or known verbatim copies. Keep accurate attribution in `SOURCE.md` and `NOTICE.md`.
4. Don't commit rendered media other than the small poster image, and never commit credentials.
