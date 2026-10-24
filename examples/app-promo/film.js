// "Lumen": an 11.5 s app promo for a fictional assistant app. One object, the app's icon, carries the film:
//   the icon lands (with a soft echo) → flies into its slot on a store page → the Open button stretches into the
//   prompt field → a prompt is typed and sent → the field folds back into the icon on a home screen → a tap
//   floods the frame → glossy pills type what it does, with icons drifting round them → icon + wordmark.
import { useDevices, appIcon, storeListing, chatInput, homeScreen, pill, glyph } from 'motion/ui/devices.js';
const { seg, lerp, clamp01, eo, ei, eio, eob, eoq, eiq, mixColor, TextFx } = kit;
const W = 1920, H = 1080;

const TT = {};
TT.icon = -0.35;                       // the icon is already landing at frame 0
TT.black = 1.2; TT.slot = 1.75;        // to the store page; the icon in its slot
TT.tap = 2.25; TT.m0 = 2.3; TT.m1 = 2.75;   // Open is tapped and stretches into the field
TT.type = 2.95; TT.send = 4.05;        // a prompt, sent
TT.c0 = 4.25; TT.c1 = 4.75;            // the field folds into the icon on the home screen
TT.press = 4.95; TT.flood = 5.05;      // tap; the frame floods
TT.pills = [5.45, 6.55, 7.65];         // what it does
TT.end = 8.85;
const DUR = 12.6;
const S = 2.3;                         // store page scale
const LIST = { x: (W - 430 * S) / 2, y: -40 };
const INPUT = { w: 1240, h: 130 }; INPUT.x = (W - INPUT.w) / 2; INPUT.y = (H - INPUT.h) / 2;
const WORDS = [['Write', 'pencil', 'mail'], ['Plan', 'map', 'bell'], ['Solve', 'bolt', 'chart']];

let gid = 0;
const mark = (size) => { const id = 'lg' + (gid++); return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7aa7ff"/><stop offset="1" stop-color="#2f4dff"/></linearGradient></defs><circle cx="50" cy="50" r="31" fill="none" stroke="url(#${id})" stroke-width="12"/><path d="M50 30 L55 45 L70 50 L55 55 L50 70 L45 55 L30 50 L45 45 Z" fill="url(#${id})"/></svg>`; };
const ICON_BG = 'linear-gradient(160deg,#ffffff,#e8ebf2)';

let ground, echo, hero, heroWrap, listing, listWrap, blob, input, homeWrap, home, tap, flood, pillEls = [], chips = [], endRow, endIcon, word, tag, typ;
let slot, btn, homeIcon, HS;

export default {
  title: 'Lumen',
  width: W, height: H, fps: 30, duration: DUR, background: '#ffffff',
  motionBlur: { samples: 6, shutter: 0.5, fast: [[TT.black - .05, TT.slot, 12], [TT.c0, TT.c1, 12]] },
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Icon' }, { t: TT.black, label: 'Store' }, { t: TT.type, label: 'Ask' }, { t: TT.c0, label: 'Home' }, { t: TT.pills[0], label: 'Pills' }, { t: TT.end, label: 'Logo' }],

  async init(kit) {
    await useDevices();
    ground = kit.el('div', { class: 'ground', parent: kit.stage });
    echo = kit.h(`<div class="echo">${mark(900)}</div>`); kit.stage.append(echo);

    // the store page (its own icon stays hidden: the hero icon flies into that slot)
    listWrap = kit.el('div', { class: 'listing', parent: kit.stage });
    listing = storeListing({ name: 'Lumen', maker: 'Lumen Labs', icon: { mark: mark(68), bg: ICON_BG }, button: 'Open', dark: true, stats: [['4.9', '★★★★★', '86K ratings'], ['4+', 'Years old', 'Age'], ['#2', 'Productivity', 'Chart']] });
    listWrap.append(listing.el); listing.icon.style.visibility = 'hidden';
    const so = kit.offset(listing.icon.querySelector('.dv-icon'), listWrap), bo = kit.offset(listing.button, listWrap);
    slot = { x: LIST.x + (so.x + so.w / 2) * S, y: LIST.y + (so.y + so.h / 2) * S, size: so.w * S };
    btn = { x: LIST.x + bo.x * S, y: LIST.y + bo.y * S, w: bo.w * S, h: bo.h * S };

    blob = kit.el('div', { class: 'blob', parent: kit.stage, style: 'z-index:5' });
    input = chatInput({ placeholder: 'Ask anything', dark: true, width: INPUT.w }); input.el.style.position = 'absolute'; input.el.style.left = INPUT.x + 'px'; input.el.style.top = INPUT.y + 'px'; kit.stage.append(input.el);
    typ = kit.typist('Plan my week around the gym', TT.type, 19, 4);

    // the home screen, zoomed onto the app
    homeWrap = kit.el('div', { class: 'homewrap', parent: kit.stage });
    const icons = ['camera', 'map', 'mail', 'music', 'heart', null, 'chart', 'gear', 'leaf', 'bell', 'star', 'search', 'chat', 'globe', 'home', 'plane', 'chat', 'mail', 'music', 'camera'].map((g, i) => g
      ? { glyph: g, bg: ['linear-gradient(160deg,#ffcf6b,#ff9b3d)', 'linear-gradient(160deg,#7ddc8c,#2fb45a)', 'linear-gradient(160deg,#79b4ff,#2f6bff)', 'linear-gradient(160deg,#ff8a9a,#ff3b5c)', 'linear-gradient(160deg,#ffffff,#e6e6ea)'][i % 5], fg: i % 5 === 4 ? '#333' : '#fff', label: ['Camera', 'Maps', 'Mail', 'Music', 'Health', '', 'Stocks', 'Settings', 'Garden', 'Alerts', 'Stars', 'Search', 'Chat', 'Globe', 'Home', 'Travel'][i] || '' }
      : { mark: mark(46), bg: ICON_BG, badge: 3, label: 'Lumen' });
    home = homeScreen({ icons, wallpaper: 'linear-gradient(165deg,#3a63ff 0%,#8fb0ff 40%,#f2c7a8 75%,#f7e6d3 100%)' });
    homeWrap.append(home.el);
    const lum = home.apps[5].querySelector('.dv-icon'), lo = kit.offset(lum, homeWrap);
    HS = { cx: lo.x + lo.w / 2, cy: lo.y + lo.h / 2, w: lo.w }; homeIcon = home.apps[5];
    tap = kit.el('div', { class: 'tap', parent: kit.stage });
    flood = kit.el('div', { class: 'whiteflood', parent: kit.stage });

    // the hero icon (the film's subject)
    heroWrap = kit.el('div', { class: 'mark-wrap', parent: kit.stage });
    hero = appIcon({ size: 200, mark: mark(104), bg: ICON_BG }); heroWrap.append(hero);   // drawn at 200, scaled per frame

    // pills and their drifting chips
    WORDS.forEach(([w, g1, g2], i) => {
      const wrap = kit.el('div', { class: 'pillwrap', parent: kit.stage }); const p = pill(w, { tone: 'glossy', size: 2.4 }); wrap.append(p);
      pillEls.push({ wrap, txt: p.querySelector('.dv-pt') });
      [g1, g2].forEach((g, k) => chips.push({ el: kit.h(`<div class="chip">${glyph(g, { size: 76, stroke: 2.2 })}</div>`), i, k }));
    });
    chips.forEach(c => kit.stage.append(c.el));

    endRow = kit.h(`<div class="endrow"><div class="endicon"></div><div class="word">Lumen</div><div class="tag">Think out loud.</div></div>`); kit.stage.append(endRow);
    endIcon = appIcon({ size: 170, mark: mark(88), bg: ICON_BG }); endRow.querySelector('.endicon').append(endIcon);
    word = endRow.querySelector('.word'); tag = endRow.querySelector('.tag');
  },

  render(t, kit) {
    // ── ground: white → black → sky (flood) → soft grey
    const toBlack = eio(seg(t, TT.black - .05, TT.black + .25));
    ground.style.background = t < TT.end ? mixColor('#ffffff', '#000000', toBlack) : 'linear-gradient(180deg,#f4f5f8,#e4e6ec)';
    echo.style.display = t < TT.black + .2 ? '' : 'none';
    echo.style.transform = `scale(${(1.25 + .2 * eo(seg(t, TT.icon, TT.icon + 1.2))).toFixed(3)})`; echo.style.opacity = (.1 * (1 - toBlack)).toFixed(3);

    // ── the hero icon: lands, then flies to its slot on the store page
    const land = eob(seg(t, TT.icon, TT.icon + .7), 1.6), fly = eio(seg(t, TT.black, TT.slot));
    const sz = lerp(300 * lerp(.4, 1, land), slot.size, fly), cx = lerp(W / 2, slot.x, fly), cy = lerp(H / 2, slot.y, fly);
    heroWrap.style.display = t < TT.m0 + .3 ? '' : 'none';
    heroWrap.style.transform = `translate(${(cx - sz / 2).toFixed(1)}px,${(cy - sz / 2).toFixed(1)}px) scale(${(sz / 200).toFixed(4)})`;
    heroWrap.style.opacity = (Math.min(seg(t, TT.icon, TT.icon + .25), 1 - seg(t, TT.m0, TT.m0 + .25))).toFixed(3);

    // ── the store page builds around it, then gives way
    const lp = eo(seg(t, TT.black + .1, TT.slot + .1)), lout = seg(t, TT.m0, TT.m0 + .3);
    listWrap.style.display = t >= TT.black && t < TT.m1 ? '' : 'none';
    listWrap.style.transform = `translate(${LIST.x}px,${(LIST.y + 40 * (1 - lp)).toFixed(1)}px) scale(${S})`;
    listWrap.style.opacity = (lp * (1 - lout)).toFixed(3);
    const press = Math.sin(Math.PI * seg(t, TT.tap - .05, TT.tap + .12));
    listing.button.style.transform = `scale(${(1 - .08 * press).toFixed(3)})`;

    // ── Open → the field (a blob morphs between them), and the field → the home icon
    let showBlob = false;
    if (t >= TT.m0 && t < TT.m1 + .05) {
      showBlob = true; const p = eio(seg(t, TT.m0, TT.m1));
      kit.morph(blob, { x: btn.x, y: btn.y, w: btn.w, h: btn.h, r: btn.h / 2, bg: '#2f6bff' }, { x: INPUT.x, y: INPUT.y, w: INPUT.w, h: INPUT.h, r: 65, bg: '#1c1c1f' }, p);
    }
    const hp = eio(seg(t, TT.c0, TT.c1));
    const hs = lerp(3.4, 2.5, eo(seg(t, TT.c0, TT.c1 + .3)));   // home zoom
    const hx = W / 2 - HS.cx * hs, hy = H / 2 - HS.cy * hs;
    if (t >= TT.c0 && t < TT.c1 + .02) {
      showBlob = true; const iw = HS.w * hs;
      kit.morph(blob, { x: INPUT.x, y: INPUT.y, w: INPUT.w, h: INPUT.h, r: 65, bg: '#1c1c1f' }, { x: W / 2 - iw / 2, y: H / 2 - iw / 2, w: iw, h: iw, r: iw * .235, bg: '#f1f2f6' }, hp);
    }
    blob.style.display = showBlob ? '' : 'none';
    input.el.style.display = t >= TT.m1 && t < TT.c0 ? '' : 'none';
    input.field.textContent = typ.at(t);
    const sendP = Math.sin(Math.PI * seg(t, TT.send - .05, TT.send + .2));
    input.go.style.transform = `scale(${(1 - .15 * sendP).toFixed(3)})`;

    // ── home screen; tap; flood
    homeWrap.style.display = t >= TT.c0 + .05 && t < TT.flood + .4 ? '' : 'none';
    homeWrap.style.transform = `translate(${hx.toFixed(1)}px,${hy.toFixed(1)}px) scale(${hs.toFixed(4)})`;
    homeWrap.style.opacity = seg(t, TT.c0 + .05, TT.c0 + .3).toFixed(3);
    homeIcon.style.visibility = t < TT.c1 ? 'hidden' : '';
    const pr = Math.sin(Math.PI * seg(t, TT.press - .05, TT.press + .15));
    homeIcon.style.transform = `scale(${(1 - .12 * pr).toFixed(3)})`;
    const tp = seg(t, TT.press - .02, TT.press + .35);
    tap.style.display = tp > 0 && tp < 1 ? '' : 'none'; tap.style.left = W / 2 + 'px'; tap.style.top = H / 2 + 'px';
    tap.style.transform = `scale(${(.3 + 1.2 * eo(tp)).toFixed(3)})`; tap.style.opacity = (1 - tp).toFixed(3);
    const fp = eiq(seg(t, TT.flood, TT.flood + .35));
    flood.style.display = t >= TT.flood && t < TT.end + .5 ? '' : 'none';
    kit.iris(flood, t >= TT.flood + .35 ? 1 : fp, W / 2, H / 2);
    flood.style.opacity = 1 - seg(t, TT.end, TT.end + .4);

    // ── pills: each enters, types itself with a pop, then drops back into the stack as the next arrives
    pillEls.forEach(({ wrap, txt }, i) => {
      const a = TT.pills[i], b = TT.pills[i + 1] ?? TT.end;
      const pin = eob(seg(t, a, a + .45), 1.5), pout = eio(seg(t, b, b + .45)), gone = seg(t, b + .25, b + .7);
      const last = i === pillEls.length - 1;
      const y = lerp(260, 0, pin) + (last ? -180 * ei(seg(t, b, b + .4)) : 200 * pout);
      wrap.style.display = t >= a && t < b + .75 ? '' : 'none';
      wrap.style.transform = `translate(0,${y.toFixed(1)}px) scale(${(lerp(.85, 1, pin) * (1 - .22 * pout)).toFixed(3)})`;
      wrap.style.opacity = (Math.min(seg(t, a, a + .15), 1 - (last ? seg(t, b, b + .35) : gone)) * (1 - .45 * pout)).toFixed(3);
      wrap.style.zIndex = 10 - i;
      TextFx.in(txt, t, a + .12, { mode: 'chars', from: 'bottom', d: 36, stagger: .07, dur: .32, ease: x => eob(x, 1.8) });
    });
    chips.forEach(({ el, i, k }) => {
      const a = TT.pills[i] + .15, b = TT.pills[i + 1] ?? TT.end, side = k ? 1 : -1;
      const pin = eob(seg(t, a + k * .12, a + k * .12 + .55), 1.4), pout = ei(seg(t, b - .1, b + .35));
      const x = W / 2 + side * lerp(900, 470 + 30 * i, pin) + side * 500 * pout, y = H / 2 + (k ? 150 : -170) + 14 * Math.sin(t * 2 + i + k) - 200 * pout;
      el.style.display = t >= a && t < b + .4 ? '' : 'none';
      el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
      el.style.transform = `perspective(600px) rotateY(${(side * 25 * Math.sin(t * 1.4 + k)).toFixed(2)}deg) rotateZ(${(side * (12 - 20 * pin) + 6 * Math.sin(t * 1.7 + i)).toFixed(2)}deg) scale(${(.6 + .4 * pin).toFixed(3)})`;
    });

    // ── end: the icon lands, slides aside for the wordmark
    endRow.style.display = t >= TT.end ? '' : 'none';
    const ei2 = eob(seg(t, TT.end, TT.end + .55), 1.6), slide = eio(seg(t, TT.end + .55, TT.end + 1.05));
    if (!this.ww) this.ww = word.offsetWidth;
    endIcon.style.transform = `translateX(${(lerp((this.ww + 34) / 2, 0, slide)).toFixed(1)}px) scale(${Math.max(.01, ei2).toFixed(3)}) rotate(${(-25 * (1 - ei2)).toFixed(2)}deg)`;
    word.style.transform = `translateX(${(lerp(60, 0, slide)).toFixed(1)}px)`;
    TextFx.in(word, t, TT.end + .9, { mode: 'chars', from: 'bottom', d: 40, stagger: .055, dur: .35, ease: x => eob(x, 1.6) });
    TextFx.rise(tag, t, TT.end + 1.15, { dur: .5 });
    endRow.style.transform = `scale(${(1 + .02 * seg(t, TT.end + 1, DUR)).toFixed(4)})`;
  },

  score(S, kit) {
    const BPM = 116; S.tempo(BPM, { t0: TT.pills[0] - 4 * 60 / BPM });
    S.program('keys', 'ep', { gain: -2 }); S.program('pad', 'pad', { rev: .6 }); S.program('bell', 'bell', { gain: -8 }); S.program('bass', 'bass'); S.program('mar', 'marimba');
    S.fx('pop', 0.05, { vel: 70 }); S.note('bell', 'E6', { t: .05, dur: 1.2, vel: 60 }); S.chord('pad', ['C3', 'G3', 'D4', 'E4'], { t: 0, dur: TT.black + .4, vel: 40 });
    S.fx('whoosh', TT.black, { dur: .5, vel: 55 }); S.chord('pad', ['A2', 'E3', 'B3', 'C4'], { t: TT.black, dur: TT.flood - TT.black, vel: 38 });
    S.fx('click', TT.tap, { vel: 80 }); S.fx('swipe', TT.m0, { dur: .4, vel: 50 });
    S.ticks(kit.typing.times, { vel: 26 });
    S.fx('pop', TT.send, { vel: 70 }); S.fx('whoosh', TT.c0, { dur: .5, vel: 50, into: true });
    S.fx('click', TT.press, { vel: 85 }); S.fx('riser', TT.flood + .35, { dur: .5, vel: 60 }); S.fx('impact', TT.pills[0], { vel: 75 });
    const b0 = S.toBeat(TT.pills[0]), b1 = S.toBeat(TT.end);
    S.drums({ kick: 'x.......x.......', clap: '....x.......x...', hat: '..x...x...x...x.', shaker: 'xoxoxoxoxoxoxoxo' }, { from: b0, step: .25, repeat: Math.ceil((b1 - b0) / 4) });
    ['C2', 'C2', 'A1', 'A1', 'F1', 'F1', 'G1', 'G1', 'C2'].forEach((n, i) => S.note('bass', n, { beat: b0 + i, beats: .7, vel: 74 }));
    TT.pills.forEach((p, i) => { WORDS[i][0].split('').forEach((_, k) => S.fx('tick', p + .12 + k * .07 + .1, { vel: 34 })); S.chord('keys', [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4']][i], { t: p, dur: .9, vel: 60 }); S.fx('pop', p + .15, { vel: 45 }); });
    S.fx('whoosh', TT.end - .2, { dur: .3, vel: 50 }); S.drum('kick', { t: TT.end, vel: 96 }); S.fx('pop', TT.end + .05, { vel: 70 });
    S.chord('keys', ['C3', 'G3', 'D4', 'E4', 'B4'], { t: TT.end + .6, dur: DUR - TT.end - .6, vel: 66, spread: .02 }); S.note('bass', 'C2', { t: TT.end + .6, dur: 2.5, vel: 80 });
    S.run('mar', ['G5', 'C6', 'E6', 'G6'], { t: TT.end + .6, step: .055, vel: 55 }); S.fx('sparkle', TT.end + 1.2, { vel: 45 });
    S.master({ fadeOut: 1.4 });
  },
};
