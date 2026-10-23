# Storyboarding and scene planning

Read this when creating a film from a prompt, or when the user explicitly requests a storyboard or visual plan.

## Convert intent into beats

Write down subject, audience, the single takeaway, required text/assets, distribution format, duration, and whether the work is illustrative or a genuine product recording. Prefer existing user assets to generic imagery. For missing style specifics, default to spare layout, limited palette, and one expressive accent.

A 20-second teaser might allocate:

| Beat | Time | One thing to notice | Motion purpose |
| --- | --- | --- | --- |
| Opening | 0-2.8s | Title and identifying visual | Hold a readable first frame, gentle push |
| Establish | 2.8-6.0s | The problem/setting | Lead focus from title to subject |
| Action | 6.0-12.5s | The interaction or transformation | Show cause before result |
| Payoff | 12.5-16.5s | One useful change | Let the outcome settle |
| Close | 16.5-20.0s | Name and a short line | Arrival timed to score, readable hold |

Use the table as a starting point, not a fixed formula. A walkthrough needs slower beats; a rhythmic showcase may intercut several sub-second details while retaining one idea per passage. Do not have individual high-information scenes disappear before the viewer can read them.

## Beat-sheet format

For each numbered beat, capture:

- `id`, short `name`, `start`, `end`, and `duration`.
- On-screen copy and source for claims, images, UI, and music.
- Staging: focal point, background and foreground, camera crop, type size.
- Action: what changes, why it changes, where the eye goes next.
- Transition: visual handoff to the next beat; avoid decorative wipes.
- Sound cue at an exact time if needed.

Express beats as data that survives edits:

```js
const T = {
  title: 0,
  app: 2.8,
  action: 6.0,
  payoff: 12.5,
  outro: 16.5,
  end: 20.0,
};
```

Use computed offsets (`T.type = T.action + 0.4`) for coupled cues such as click, caret, and result. Keep scene IDs stable when revising so timing notes remain meaningful.

## Aspect ratio and hierarchy

- Landscape (16:9): build intentional horizontal relationships and controlled camera travel.
- Portrait (9:16): stack what was side-by-side, enlarge copy, reframe crop, and reserve room for app controls near edges.
- Square (1:1): prioritize centered subjects; reduce simultaneous text and UI complexity.
- Check title and action-safe areas against the destination platform, which can change.

## User reviews

If user gives a time marker (e.g., `0:12`) identify the beat containing that moment; a span affects every overlapping beat. Convert positions expressed as percentages into stage coordinates (`x = xPct * width / 100`). Make the least disruptive change, then recheck cut boundaries and the closing card.

If only a storyboard was requested, stop after delivering it. Do not imply that the video is rendered.
