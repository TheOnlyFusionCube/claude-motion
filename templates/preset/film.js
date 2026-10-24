// PRESET STARTER: a 14 s film on a style preset. Change STYLE / PALETTE, then replace the words and
// beats with THIS film's. The preset gives the look; the beats, camera and actions are still yours.
// Presets: sketch, bubbles, editorial, bold, midnight, showcase (references/styles.md).
import { useStyle } from 'motion/styles/index.js';
const { seg, lerp, eo, eio, TextFx } = kit;

const STYLE = 'editorial';
const PALETTE = undefined;            // a preset palette id, or { ground, main, ink, accent } from the intake
const VALUES = {};                    // e.g. { stress: 'underline' }

const TT = {};
TT.title = -0.5;                      // readable at frame 0
TT.stress = 1.3;                      // the stressed phrase lands
TT.card = 3.4;                        // camera moves onto the card as it fills
TT.stat = TT.card + 0.8;
TT.end = 9.6;                         // the end card lands; holds ≥ 3 s
const DURATION = 14;

let st, world, cam, words, head, sub, card, stat, label, endw, endHead, endLine;

export default {
  title: 'Untitled film', width: 1920, height: 1080, fps: 30, duration: DURATION,
  async init(kit) {
    st = await useStyle(kit, STYLE, { palette: PALETTE, values: VALUES });   // the whole stage takes the look
    world = kit.layer('world');                                                // the camera moves this; the preset's ground stays put
    cam = new kit.Camera(world).set([
      { t: 0, cx: 960, cy: 540, z: 1, drift: [0, -2, .004] },
      { t: TT.card + 0.9, from: TT.card, cx: 1330, cy: 560, z: 1.45, drift: [3, 0, .008] },
      { t: TT.end, from: TT.end - 0.8, cx: 960, cy: 540, z: 1 },
    ]);
    words = kit.h('<div class="s-words" style="left:160px;top:330px;width:1000px"><div class="s-kicker">Acme · Spring update</div><div class="s-head">Plans that <em>keep up</em></div><div class="s-sub">Change one date; everything downstream moves with it.</div></div>');
    world.append(words); head = words.querySelector('.s-head'); sub = words.querySelector('.s-sub');
    card = kit.h('<div class="s-card" style="left:1060px;top:300px;width:600px;height:520px"><div class="s-kicker">Moved automatically</div><div class="s-stat" style="margin-top:40px">0</div><div class="s-label" style="margin-top:20px">tasks, in 0.4 seconds</div></div>');
    world.append(card); stat = card.querySelector('.s-stat'); label = card.querySelector('.s-label');
    endw = kit.h('<div class="s-words" style="left:0;right:0;top:420px;align-items:center;text-align:center"><div class="s-head">Acme</div><div class="s-sub">Plans that <em>keep up</em>.</div></div>');
    kit.stage.append(endw);
    endHead = endw.querySelector('.s-head'); endLine = endw.querySelector('.s-sub');
  },
  render(t, kit) {
    cam.apply(t);
    st.ground(t);
    // Beat 1: the claim, with the preset's emphasis landing on the stressed phrase.
    TextFx.in(head, t, TT.title, { from: 'bottom', d: 30 });
    st.stress(head, t, TT.stress);
    if (STYLE === 'sketch') st.boil(head, t);
    sub.style.opacity = eo(seg(t, TT.stress + 0.3, TT.stress + 0.8));
    // Beat 2: the card arrives and fills while the camera moves onto it.
    const c = eo(seg(t, TT.card - 0.4, TT.card + 0.3));
    card.style.opacity = c; card.style.transform = `translateY(${(1 - c) * 30}px) scale(${lerp(.96, 1, c)})`;
    TextFx.count(stat, t, TT.stat, TT.stat + 1.4, 128);
    // Beat 3: everything clears; the end card lands and keeps creeping.
    const out = eio(seg(t, TT.end - 0.9, TT.end - 0.2));
    card.style.opacity = Math.min(c, 1 - out);
    const away = eio(seg(t, TT.card - 0.3, TT.card + 0.5));               // one subject per shot: the claim recedes
    words.style.opacity = (1 - 0.85 * away) * (1 - out);
    words.style.transform = `translateX(${-60 * away}px)`;
    const e = t >= TT.end - 0.3;
    endw.style.display = e ? '' : 'none';
    if (e) {
      TextFx.in(endHead, t, TT.end, { from: 'bottom', d: 30 });
      TextFx.in(endLine, t, TT.end + 0.4, { from: 'bottom', d: 20, stagger: .07 });
      st.stress(endLine, t, TT.end + 1.2);
      endw.style.transform = `translateY(${-2 * Math.max(0, t - TT.end)}px)`;
    }
  },
  score(S) {
    S.tempo(96, { t0: TT.card - 8 * 60 / 96 });
    S.program('pad', 'pad'); S.program('keys', 'ep'); S.program('m', 'marimba'); S.program('bass', 'bass');
    S.chord('pad', ['D3', 'A3', 'E4', 'F#4'], { t: 0, dur: DURATION, vel: 44 });
    S.note('m', 'A5', { t: TT.stress, dur: .8, vel: 56 });
    const b0 = Math.round(S.toBeat(TT.card)), b1 = Math.round(S.toBeat(TT.end - 0.6));
    for (let b = b0, i = 0; b < b1; b += 4, i++) {
      S.chord('keys', [['F#3', 'A3', 'D4'], ['E3', 'G3', 'B3']][i % 2], { beat: b, beats: Math.min(3.6, b1 - b), vel: 54 });
      S.note('bass', ['D2', 'G1'][i % 2], { beat: b, beats: 1.5, vel: 78 });
      S.drums({ kick: 'x...x...', sidestick: '..x...x.', shaker: 'oxoxoxox' }, { from: b });
    }
    S.fx('pop', TT.card, { vel: 55 }); S.fx('roll', TT.stat, { dur: 1.4, vel: 45 });
    S.fx('whoosh', TT.end - 0.8, { dur: .7, vel: 50 });
    S.chord('keys', ['D3', 'A3', 'E4', 'F#4', 'A4'], { t: TT.end, dur: 3.4, vel: 68 }); S.drum('kick', { t: TT.end, vel: 100 });
    S.master({ fadeOut: 1.4 });
  },
};
