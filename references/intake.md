# Intake: three questions before a new film

Style, colours and length decide more of the result than anything else, and they are the things
people most regret not specifying. So for a **new film**, ask them **once, together, before the beat
sheet**. Adapted from the original Motion intake (`upstream/questions.md`).

## When

- **Ask** for every new film, unless the request already answers all three.
- **Leave out a row the request already answers**: "in our brand colours", "about 20 seconds", "Swiss poster
  style". If all three are answered, don't ask.
- **Never ask about the story.** Subject, product and copy come from the request. If there is no subject at
  all, ask for that alone and stop.
- **Don't ask when nobody can answer** (an autonomous run, CI, or "just make it, don't ask me"). Take the first
  option of each row and say what you chose in one line.
- **Ask once.** Never a second round. Edits to an existing film don't get the questions again.

## A refusal comes first

Before the questions, if needed:

- **Another company's distinctive UI, logo or branded visuals:** if they don't say they work there, ask
  "Do you work at Acme? If not, I can't recreate its screens or logo, but I can design original ones."
  Then continue with the questions.
- **A look that would be offensive or controversial beyond what the subject needs** (political, religious,
  propaganda): decline in a sentence, without judging the topic, and offer a different style.

## How to ask

Use the host's question tool, with one call holding all three questions, single choice each, and your
pick first in every row:

- **Claude Code:** `AskUserQuestion`. At most 4 questions and 4 options each, every option with a
  description. It adds its own "Other" box, so don't include one.
- **Other agents:** their equivalent structured-question tool, if there is one.
- **No such tool:** one short message with the three questions as numbered options. Say they can answer like
  "1b, 2a, 3: 25 s" or "just pick". Then **end your turn and wait**.

Example for "a 20-second teaser for Sprout, our plant-watering app":

```json
{"questions": [
  {"question": "Which style should it have? Pick one, or describe your own under Other.", "header": "Style", "multiSelect": false, "options": [
    {"label": "Window sill", "description": "Pots on a sunny sill; light crawls across as leaves unfurl"},
    {"label": "Root map", "description": "A soil cross-section; roots draw themselves toward each drop"},
    {"label": "Watering diary", "description": "Pencil notes and stamps fill a notebook, day by day"},
    {"label": "Showcase (preset)", "description": "Soft tinted backdrop, white cards, the app window up front"}]},
  {"question": "Which colours?", "header": "Colours", "multiSelect": false, "options": [
    {"label": "Your brand", "description": "From your app's theme: off-white, leaf green, ink, coral (#F7F8F3 #2F9E5B #14261B #FF7A59)"},
    {"label": "Greenhouse", "description": "Deep pine, fern, pale mint, sunflower (#0F2A22 #3FA66B #DDF3E6 #F2C14E)"},
    {"label": "Clay pot", "description": "Bright apricot, brick, dark cocoa, sky (#FFC9A3 #B5482B #2B1A12 #4F8FE6)"}]},
  {"question": "How long should it run?", "header": "Length", "multiSelect": false, "options": [
    {"label": "20 seconds", "description": "Three or four beats: the problem, the app, the result"},
    {"label": "15 seconds", "description": "One idea, one action"},
    {"label": "30 seconds", "description": "Room for a short story"}]}]}
```

The Sprout looks and palettes are an example. Never reuse them, as written or reworded, for another film.

## Style: three or four looks, made up for this film

Each look has a **name** of one to three words and **one line** of at most 12 words that anyone can
picture: what's on screen, what it's made of or lit by, how it moves.

- **Derive them from this film's subject, audience and the words of the request.** No stock list
  ("Modern", "Playful", "Bold"), no design jargon, and no look that would suit any other film just as well
  (generic cut paper, index cards, a whiteboard, typed lines).
- **Make them distinct directions**, not versions of one idea: a material, a place, a way of moving, a way of
  drawing, a scale, a point of view. No two of one kind.
- **The first is the one you'd make unasked**, the look that best suits this audience.
- **No colour names and no dark or light ground.** The Colours question covers that.
- **If the film shows their product, screenshots or logo, every look frames them** and none restyles them.
- **Name no studio, artist or brand.**
- **Only what this stack does well:** composition, camera, type, UI, marks, flat or clay shapes, light. 3D
  is fine where depth carries the idea (a city of data, an object). Nothing photo-real, no acted characters.
- **A preset may take the last slot.** Pick the one of the six in `references/styles.md` that best fits,
  labelled with "(preset)" and described by its own line. If they type a preset's name under Other, use it.

## Colours: up to four palettes, theirs first

Each palette is four colours in role order: **ground** (behind everything), **main** (the chief colour for
shapes, plain to see on the ground), **ink** (words, ≥ 4.5:1 on the ground) and **accent** (a touch here and
there). Give each a name and, in the description, the colours in plain words plus the hexes.

1. **Theirs first, if you can find any.** Look in the request and earlier conversation, in files they gave
   (logo, screenshots), and in the codebase: CSS custom properties, Tailwind theme, design-token files,
   theme objects, brand guidelines. Make one tile, "Your brand" (or the brand's name). If they have fewer than four
   colours, their main brand colour is `main`, and you fill the rest with their neutrals and tints.
   A brand you refused to recreate gets no tile.
2. **Then your own, few and good:** two beside a tile of theirs, three if there is none. Each must suit this
   film and be told from every other tile at a glance.
   - **Grounds:** at most one near-black and one near-white in the row (cream, sand and pastels count as
     near-white; navy-black and green-black count as near-black). Any other ground is plainly a colour:
     deep (wine, pine, cobalt, plum, petrol) for pale ink, or bright like a sticky note (lemon, sky, rose,
     mint, apricot) for dark ink. **Never a mid-tone ground** (terracotta, olive, mid grey), where no ink reads.
   - **A dark ground and a light one in the row.** Beside a near-white of theirs, yours are dark. If they
     asked for dark, all are dark. If they asked for light, one is near-white and the rest bright.
   - **Mains from different families** (red, orange, yellow, green, blue, violet, pink, grey). At most one
     dark main and one greyed main in the row.
   - **Never a palette of only black, red and white or cream**, unless they asked for it or gave it.
3. **Check them before showing:** `node <skill>/scripts/palette.mjs "#ground,#main,#ink,#accent" …`.
   Fix or drop any that fails.

If they named a design system or said "these colours and no others", skip the question and use those.

## Length: three that suit this film

Short labels ("20 seconds") with a one-line description. By default none over 30 s. A launch film,
walkthrough or tutorial may offer 45–90 s. If they type more, use that many, up to 300 s.

## What an answer means

| In the answer | The film |
|---|---|
| a Style option | that look, as its line says: material, light, how it moves. Colours come from the Colours answer |
| a preset ("Editorial (preset)") | `useStyle(kit, 'editorial', { palette })`, with the picked palette as `{ground, main, ink, accent}`, or the preset's own palette if Colours was skipped |
| Style typed under Other | a look of your own from their words (or that preset, if they named one) |
| a palette | its four colours, as CSS variables in `film.css` |
| Colours typed under Other | a palette of your own fitting their words, checked with `palette.mjs` |
| a Length | that many seconds; build the beat sheet to it |
| a row unanswered, or "you pick" / skipped | that row's first option |

Then write the beat sheet (SKILL.md §2). Say in one line which look, palette and length you went with if
any came from defaults.

## Fit for work

Every look, typeface, palette and name you offer or choose must be clean, professional, and fine to show a
diverse audience of every age, race, faith, gender and sexual orientation. Beyond what the subject needs, nothing
that could read as political, religious or propaganda imagery (`upstream/motion.md` §1 has the full list).
