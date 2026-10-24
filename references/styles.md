# Style presets

Six ready-made looks, ported from the original Motion built-in styles (`upstream/styles.md`). A preset
gives you the ground, typefaces, surfaces, the emphasis animation and named palettes. **It doesn't make
the film.** The beat sheet, the camera, the actions and the transitions are still yours, and every rule in
SKILL.md holds. A preset with five fading cards is still a slideshow.

Use one when the user picks it (it can be the last Style option in the intake) or names it. Otherwise
design a look of your own for the film. See them all: `node scripts/frames.mjs examples/styles --count 12 --sheet`.

| preset | what it is | palettes | values (default first) |
|---|---|---|---|
| `sketch` | A designer at the whiteboard: black marker, one highlighter, arrows that point at what matters. | `marker`, `mint`, `night` | `paper` dots, plain, squared, board · `stress` highlight, underline, circle · `wobble` 0–100 (40) · `weight` 3–7 px (5) |
| `bubbles` | Big glowing glass spheres on a gradient you can turn. Deep and cinematic, or light and airy. | `ember`, `lagoon`, `cobalt` | `angle` 0–360 (200) · `ground` deep, light · `count` 1–5 (3) · `size` 60–125 (100) · `fade` 0–100 (60) |
| `editorial` | A well-set annual report: big serif, italic stress, fine rules, covers in your colour. | `cobalt`, `evergreen`, `plum`, `night` | `cover` paper, color, ink · `stress` italic, underline, marker · `rules` hair, double, bold · `size` 84–112 (100) |
| `bold` | Swiss poster: huge tight type, flat colour, a strict grid and one shape. | `vermilion`, `night`, `ultramarine`, `acid` | `shape` arcs, quarter, circle, bars · `side` right, left · `size` 70–100 (85) · `grid` true, false |
| `midnight` | A dark room and a wall of tiny lamps: an aurora in dots, the big number in lights. | `aurora`, `ice`, `sodium` | `light` 0–360 (160) · `glow` 20–100 (60) · `waves` 0–100 (60) · `grid` dots, pixels, plus |
| `showcase` | Calm and product-first: a soft tinted backdrop, white rounded cards, a big product window. | `lagoon`, `blossom`, `meadow`, `apricot` | `backdrop` tint, plain, color, dark · `fade` 0–360 (140) · `corners` 0–48 (28) · `shadow` 0–100 (60) · `emphasis` chip, color, line |

## Using one

```js
import { useStyle } from 'motion/styles/index.js';
let st, head;
export default {
  width: 1920, height: 1080, fps: 30, duration: 20,
  async init(kit) {
    st = await useStyle(kit, 'editorial', { palette: 'evergreen', values: { stress: 'underline' } });
    // or the intake's palette: { palette: { ground: '#0F2A22', main: '#3FA66B', ink: '#DDF3E6', accent: '#F2C14E' } }
    const w = kit.h('<div class="s-words" style="left:160px;top:330px;width:1400px">' +
      '<div class="s-kicker">Annual report</div><div class="s-head">Twice the riders, <em>half the waiting</em></div></div>');
    st.root.append(w); head = w.querySelector('.s-head');
  },
  render(t, kit) {
    st.ground(t);                                   // the preset's backdrop, first
    kit.TextFx.in(head, t, -0.5, { from: 'bottom' }); // your motion, as usual
    st.stress(head, t, 1.4);                        // the preset's emphasis on <em>, 0 → 1 from t0
  },
};
```

- `useStyle(kit, name, { palette, values, root })` makes the root (default: the stage, or a scene's box) a
  styled surface. It sets the colour variables `--ground --main --ink --accent --muted --surface` and adds a
  backdrop canvas as its first child. It returns `st` with `palette` (resolved hexes), `values`, `root`,
  and these methods:
  - `st.ground(t)` draws the backdrop. It's pure in t (bubbles drift, the bold shape grows then turns, the
    midnight aurora flows, the showcase tint rotates). Call it every frame.
  - `st.stress(el, t, t0, dur = .5)` animates every `<em>` inside `el` in the preset's way (highlighter
    sweep, underline, circle, italic colour, accent block, glow, chip).
  - `st.rule(el, t, t0)` draws a `.s-rule` from the left.
  - `st.boil(el, t)` (sketch) gives a hand-drawn wobble at 12 fps.
  - `st.lights(text, { x, y, size, t, t0, dur })` (midnight) lights the lamps inside a number or word.
- **Shared classes** (place them yourself; the preset only styles them): `.s-words` (a flex column),
  `.s-kicker`, `.s-head` (wrap the stressed phrase in `<em>`), `.s-sub`, `.s-stat`, `.s-label`, `.s-quote`,
  `.s-by`, `.s-card`, `.s-window` (with `.s-bar` and `.s-pane`), `.s-chip`, `.s-rule`, `.s-shape`.
  Because every preset styles the same classes, changing the look is a one-word change.
- **Their product UI keeps its own CSS.** Put it inside a `.s-window`, and the preset frames it without
  restyling it.
- **Several presets in one film** (a gallery, a "before/after") is fine: give each its own root, e.g. one per
  `kit.scenes` box, as `examples/styles/film.js` does.
- Presets work at any size. For vertical, place `.s-words` for the frame and scale the heads down
  (90–170 px display type on a 1080-wide stage).
