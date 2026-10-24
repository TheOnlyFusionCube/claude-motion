// STARTER — a 14 s film that shows the grammar, not a look to keep.
// Replace the words, palette, faces, subject and action with THIS film's. Keep the habits:
//   · one cascade of named beats (TT) so a retime moves everything after it
//   · frame 0 already readable (title starts at −0.6)
//   · the title hands off into the first subject instead of cutting away
//   · one subject, one action per beat: a click CAUSES the result, the camera arrives while it builds
//   · every hold drifts; the end card lands on the downbeat and keeps creeping for ≥3 s
//   · sound from the same TT: pad → groove when the action starts → hit on the end card
const { seg, lerp, eo, eio, eob, eoq, TextFx } = kit;
const W = 1920, H = 1080;

const TT = {};
TT.title = -0.6;
TT.hand = 2.5;                  // title travels and becomes the card's heading
TT.card = TT.hand + 0.1;
TT.click = 5.0;                 // cause
TT.grow = TT.click + 0.25;      // effect builds
TT.push = TT.click + 0.6;       // camera arrives while it is still building
TT.out = 9.6;                   // the card shrinks to a dot, travels, becomes the mark
TT.end = 10.4;                  // end card lands (≥3 s hold after this)
const DURATION = 14;

let cam, world, title, card, head, bars = [], btn, total, cur, marks, endc, word, line, dot;
const VALUES = [42, 58, 51, 77, 96];

export default {
  title: 'Untitled film',
  width: 1920, height: 1080, fps: 30, duration: DURATION, background: '#f2f0eb',
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Title' }, { t: TT.click, label: 'The change' }, { t: TT.end, label: 'End' }],

  init(kit) {
    world = kit.layer('world');
    cam = new kit.Camera(world);
    world.append(kit.h(`<div class="card">
      <div class="head">Weekly signups</div>
      <div class="bars">${VALUES.map(() => '<div class="bar"><i></i></div>').join('')}</div>
      <div class="foot"><div class="total">0</div><div class="btn">Launch</div></div></div>`));
    card = kit.$('.card'); head = kit.$('.card .head'); btn = kit.$('.btn'); total = kit.$('.total');
    bars = kit.$$('.bar i');
    // Measure once, at identity camera. Card is 900×600 at (510, 240).
    const btnC = kit.center(btn);
    cam.set([
      { t: 0, cx: 960, cy: 540, z: 1.0, drift: [0, -2, .004] },
      { t: TT.card + 0.9, from: TT.card, cx: 960, cy: 560, z: 1.25, drift: [0, 0, .006] },
      { t: TT.push + 0.8, from: TT.push, cx: 900, cy: 520, z: 1.7, drift: [3, -1, .01] },
      { t: TT.out + 0.5, from: TT.out - 0.2, cx: 960, cy: 540, z: 1.0, ease: eio },
    ]);
    title = kit.h('<div class="title">Weekly signups</div>'); kit.stage.append(title);
    this.titleW = title.offsetWidth;

    cur = kit.cursor({ cam });
    cur.keys = [{ t: 3.3, at: [1500, 1020] }, { t: TT.click - 0.1, from: 3.9, at: () => btnC(), bow: .12 }, { t: TT.click + 1.3, at: () => [btnC()[0] + 70, btnC()[1] + 50] }];
    cur.clicks = [TT.click];
    cur.visible = t => Math.min(eo(seg(t, 3.3, 3.6)), 1 - seg(t, TT.out - 0.4, TT.out));

    marks = new kit.Marks(kit.svgLayer(world));
    marks.add({ kind: 'underline', x: 566, y: 800, w: 236, t0: TT.grow + 1.6, color: '#e2553d', width: 7, out: TT.out - 0.3 });

    endc = kit.h('<div class="endc"><div class="words"><div class="word">Acme</div><div class="line">Watch it grow.</div></div></div>');
    kit.stage.append(endc);
    word = endc.querySelector('.word'); line = endc.querySelector('.line');
    dot = kit.h('<div class="dot"></div>'); kit.stage.append(dot);
  },

  render(t, kit) {
    cam.apply(t);
    // Title: words rise (already up at 0), creep, then travel into the card heading.
    const hp = eio(seg(t, TT.hand, TT.hand + 0.7));
    const from = [(W - this.titleW) / 2, 470 - 2 * Math.min(t, TT.hand)];
    const to = cam.toStage([510 + 56, 240 + 48], TT.hand + 0.7);
    const k = (40 * cam.at(TT.hand + 0.7).z) / 120;
    title.style.transform = `translate(${lerp(from[0], to[0], hp)}px,${lerp(from[1], to[1], hp)}px) scale(${lerp(1, k, hp)})`;
    TextFx.rise(title, t, TT.title, { stagger: .09, dur: .6 });
    title.style.opacity = 1 - seg(t, TT.hand + 0.6, TT.hand + 0.75);
    head.style.opacity = seg(t, TT.hand + 0.6, TT.hand + 0.75);

    // The card assembles around its heading.
    const c = eo(seg(t, TT.card, TT.card + 0.6));
    const shrink = eio(seg(t, TT.out - 0.2, TT.out + 0.4));
    card.style.opacity = Math.min(c, 1 - seg(t, TT.out + 0.2, TT.out + 0.45));
    card.style.transform = `scale(${lerp(.96, 1, c) * lerp(1, .25, shrink)})`;

    // Cause → effect: the click lights the button, bars spring up in sequence, the total counts.
    btn.classList.toggle('on', t >= TT.click);
    bars.forEach((b, i) => {
      const p = eob(seg(t, TT.grow + i * 0.16, TT.grow + i * 0.16 + 0.55), 1.6);
      const base = 0.18 + i * 0.03;
      b.style.transform = `scaleY(${lerp(base, VALUES[i] / 100, p)})`;
    });
    TextFx.count(total, t, TT.grow, TT.grow + 1.3, 3240, { format: v => Math.round(v).toLocaleString('en-US') + ' new' });
    marks.render(t);
    cur.render(t);

    // A dot leaves the shrinking card, travels on an arc and lands as the end card appears.
    const tr = eio(seg(t, TT.out + 0.1, TT.end));
    const d0 = cam.toStage([960, 540], TT.out + 0.1);
    dot.style.display = t > TT.out && t < TT.end + 0.35 ? '' : 'none';
    dot.style.transform = `translate(${lerp(d0[0], 960, tr)}px,${lerp(d0[1], 420, tr) - Math.sin(Math.PI * tr) * 120}px) scale(${1 - .4 * seg(t, TT.end, TT.end + .35)})`;

    // End card: lands, then keeps a slow creep for the rest of the film.
    const e = seg(t, TT.end - 0.2, TT.end);
    endc.style.display = e > 0 ? '' : 'none';
    if (e > 0) {
      const creep = Math.max(0, t - TT.end) * 2;
      TextFx.rise(word, t, TT.end, { stagger: .08, dur: .7, ease: eoq });
      TextFx.in(line, t, TT.end + 0.5, { from: 'bottom', d: 20, stagger: .07 });
      endc.querySelector('.words').style.transform = `translateY(${-creep}px) scale(${kit.breathe(t, .004, 4)})`;
    }
  },

  score(S, kit) {
    const BPM = 100, B = 60 / BPM;
    S.tempo(BPM, { t0: TT.click - 8 * B });               // a bar line lands on the click
    S.program('pad', 'pad'); S.program('keys', 'ep'); S.program('mal', 'marimba'); S.program('bass', 'bass');
    S.chord('pad', ['C3', 'G3', 'D4', 'E4'], { t: 0, dur: TT.click, vel: 46 });
    S.note('mal', 'G5', { t: 0.02, dur: 1, vel: 50 });
    S.fx('whoosh', TT.hand, { dur: .6, vel: 50 });
    S.fx('click', TT.click);
    const b0 = Math.round(S.toBeat(TT.click)), b1 = Math.round(S.toBeat(TT.out));
    const prog = [['A2', ['C4', 'E4', 'G4']], ['F2', ['C4', 'F4', 'A4']], ['C2', ['E4', 'G4', 'C5']], ['G2', ['D4', 'G4', 'B4']]];
    for (let b = b0, i = 0; b + 4 <= b1 + .01; b += 4, i++) {
      const [bn, ch] = prog[i % 4];
      S.chord('keys', ch, { beat: b, beats: 3.5, vel: 56 });
      S.note('bass', bn, { beat: b, beats: 1.5, vel: 80 });
      S.pattern('mal', 'x.xx.x.x', { from: b, pitch: [ch[2], ch[1], ch[0]].map(p => p.replace(/\d/, m => +m + 1)), vel: 58 });
      S.drums({ kick: 'x...x...', sidestick: '..x...x.', shaker: 'oxoxoxox' }, { from: b });
    }
    VALUES.forEach((_, i) => S.fx('pop', TT.grow + i * 0.16 + 0.2, { vel: 50 }));
    S.fx('whoosh', TT.out + 0.1, { dur: TT.end - TT.out, vel: 55 });
    S.run('mal', ['C5', 'D5', 'E5', 'G5', 'A5'], { t: TT.end - 0.55, step: .11, vel: 50, cresc: 6 });
    S.chord('keys', ['C3', 'G3', 'E4', 'G4', 'D5'], { t: TT.end, dur: 3.4, vel: 70 });
    S.note('bass', 'C2', { t: TT.end, dur: 3.2, vel: 84 }); S.drum('kick', { t: TT.end, vel: 100 });
    S.chord('pad', ['C3', 'G3', 'E4', 'B4'], { t: TT.end, dur: DURATION - TT.end, vel: 52 });
    S.master({ fadeOut: 1.4 });
  },
};
