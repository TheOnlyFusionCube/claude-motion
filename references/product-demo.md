# Product demos and UI walkthroughs

Read when a film animates an existing application, a user journey, or product interaction.

## Fidelity before movement

1. Find the actual screen in the user's repository, Storybook, design file, or authorized running app. Search visible labels through source files to locate components.
2. Trace the real component structure, CSS variables, fonts, spacing, border radii, button states, icon sources, and text. Keep an asset/source inventory.
3. Prefer lifting static DOM and styles for visible portions of the screen. Strip unrelated JavaScript/event handlers, access to external accounts, analytics, and third-party scripts from a standalone film copy.
4. Turn hover, focus, pressed, loading, typing, and result states into explicit classes or data attributes controlled by film time. Preserve the product palette independently from cinematic framing.
5. Inspect a still next to the authorized app's screenshot and correct concrete deviations before moving the camera.

If source is unavailable, build an *original concept* UI. Put 'Concept demonstration' or equivalent disclosure in the video when viewers might mistake mock content for released functionality.

## Narrate by action, not captions

A typical flow is:

- Establish the relevant screen and target in 0.6-1.2s.
- Pointer approaches a real target with an eased path; hover state tracks it.
- Press or focus happens at a precisely authored timestamp. A caret or click ring acknowledges the action.
- Input appears at approximately 20-26 characters per second. Never fake an action by editing an unrelated label.
- The application reacts (loading, menu, result build). Show state transition and allow the final value to settle before the next camera move.
- A decision or completion state is visibly reached. If the result is hypothetical, mark it as a concept.

Keep the pointer about 20-32 screen pixels wide; counter-scale it on zoom if necessary. Use text caret and resize cursor shapes where appropriate. Restrict annotations to a few hand-drawn marks and use motion, crop, and contrast as the primary guide.

## Walkthrough-specific pacing

For a 35-60s instructional flow, use 4-8 beats with one interaction and one point of interest per beat. Camera moves often need 0.55-1.2s, followed by 1.4-2.2s for reading. Caption chips should be short, often four words or less, and stay on long enough to read. A 1.6-2.4x crop can make an otherwise tiny control readable, but avoid cutting off the causal next action.

Use a clear chapter structure ('Choose a workspace', 'Add a task', 'Share it') rather than generic numbered chapters. Avoid showing a lengthy idle animation for every click. During revisions, preserve stable source geometry so existing timing comments still point to the correct element.
