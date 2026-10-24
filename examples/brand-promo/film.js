// "Sprout": a 14 s brand promo for a fictional savings app. Dark ground, one green, glossy 3D coins.
// The green coin is the subject: it bursts out with the others around a line of copy (icons inside the words),
// becomes the logo in front of turning rays, shrinks to the centre of an orbit of features, and the orbit gives
// way to a tilted dashboard where the rate flips up. Red "no" pills, one green "yes", a URL typed, the logo.
import * as THREE from 'three';
import { view3d, mat, shapes, svgTexture } from 'motion/three-kit.js';
import { useDevices, pill, glyph } from 'motion/ui/devices.js';
const { seg, lerp, clamp01, eo, ei, eio, eob, eoq, eiq, keys, TextFx } = kit;
const W = 1920, H = 1080;

const TT = {};
TT.burst = -0.2;                  // the coins are already bursting at frame 0
TT.line = 0.35;                   // the line, word by word (icons too)
TT.logo0 = 2.1; TT.logo1 = 2.7;   // the others fly off; the green coin comes forward as the logo
TT.orbit0 = 3.9; TT.orbit1 = 4.5; // the logo shrinks to the centre of an orbit
TT.dash0 = 6.2; TT.dash1 = 7.0;   // the dashboard swings in
TT.rate = 7.45;                   // the rate flips up
TT.no = 8.6;                      // "no" pills
TT.yes = 9.45;                    // the one "yes"
TT.url = 10.35;                   // the URL, typed
TT.end = 11.95;                   // the logo between two half-moons
const DUR = 14.2;

const COINS = [['leaf', '#2fbf5d', '#062010'], ['coin', '#f5c542', '#3d2a00'], ['chart', '#3b82f6', '#ffffff'], ['star', '#eef3ee', '#14301e'], ['bolt', '#121614', '#4be37a'], ['heart', '#9cf0b8', '#0b3a1b']];
let v, coins = [], ground, glow, rays, line, brand, orbitsSvg, rings = [], planets = [], labels = [], sp, dash, bars = [], bal, rate, pills, pillEls = [], url, urlTxt, typ, halves = [], endt;

export default {
  title: 'Sprout',
  width: W, height: H, fps: 30, duration: DUR, background: '#07110b',
  motionBlur: { samples: 6, shutter: 0.5, fast: [[TT.logo0, TT.logo1, 12], [TT.dash0, TT.dash1, 12]] },
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Coins' }, { t: TT.logo0, label: 'Logo' }, { t: TT.orbit0, label: 'Orbit' }, { t: TT.dash0, label: 'Dashboard' }, { t: TT.no, label: 'No / yes' }, { t: TT.url, label: 'URL' }, { t: TT.end, label: 'End' }],

  async init(kit) {
    await useDevices();
    ground = kit.el('div', { class: 'ground', parent: kit.stage });
    glow = kit.el('div', { class: 'glow', parent: kit.stage, style: 'left:960px;top:540px' });
    rays = kit.el('div', { class: 'rays', parent: kit.stage });

    v = view3d(kit, { fov: 30, env: .6, exposure: .9, z: 1 });
    v.light('#ffffff', 2.2, [3, 4, 6]); v.light('#4be37a', 1.4, [-5, -2, 2]);
    for (const [g, bg, fg] of COINS) {
      const face = await svgTexture(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><radialGradient id="r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".6" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="512" height="512" fill="${bg}"/><circle cx="256" cy="256" r="214" fill="none" stroke="${fg}" stroke-opacity=".18" stroke-width="10"/><g transform="translate(136 136) scale(10)" fill="none" stroke="${fg}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${glyph(g).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g><rect width="512" height="512" fill="url(#r)"/></svg>`);
      const c = shapes.coin({ radius: .62, thickness: .16, face, edge: bg }); v.scene.add(c); coins.push(c);
    }

    line = kit.h(`<div class="line" style="top:478px;z-index:2">Grow <span class="ico kit-unit">${glyph('leaf', { size: 54, stroke: 2.4 })}</span> what you <em>save</em> <span class="ico kit-unit">${glyph('coin', { size: 54, stroke: 2.4 })}</span></div>`); kit.stage.append(line);
    brand = kit.h('<div class="brand" style="z-index:2"><div class="name">Sprout</div><div class="sub">Savings that grow on their own.</div></div>'); kit.stage.append(brand);
    this.bname = brand.querySelector('.name'); this.bsub = brand.querySelector('.sub');

    // the orbit (DOM SVG, so the rings stay razor sharp)
    orbitsSvg = kit.svgLayer(kit.stage); orbitsSvg.classList.add('orbits'); orbitsSvg.style.zIndex = 2;
    [[330, .36], [560, .36], [800, .36]].forEach(([rx, k], i) => {
      const e = kit.svg(`<ellipse cx="960" cy="540" rx="${rx}" ry="${rx * k}" fill="none" stroke="${i === 1 ? '#4be37a' : '#2f6b45'}" stroke-width="3" pathLength="1" stroke-dasharray="1 1"/>`); orbitsSvg.append(e); rings.push({ e, rx, ry: rx * k });
      const p = kit.svg(`<circle r="${[22, 28, 20][i]}" fill="${['#f5c542', '#4be37a', '#9cf0b8'][i]}" style="filter:drop-shadow(0 0 14px ${['#f5c542', '#4be37a', '#9cf0b8'][i]})"/>`); orbitsSvg.append(p); planets.push(p);
      const l = kit.h(`<div class="plabel" style="z-index:3"><i></i>${['Round-ups', 'Goals', 'Rewards'][i]}</div>`); kit.stage.append(l); labels.push(l);
    });

    // the dashboard, tilted in CSS 3D
    sp = kit.space(kit.stage, { fov: 30 }); sp.view.style.zIndex = 2;
    dash = sp.add(kit.h(`<div class="dash"><div class="hd"><span>Total saved</span><span>This year</span></div><div class="bal">$0</div><div class="bars">${Array.from({ length: 14 }, () => '<i></i>').join('')}</div></div>`), {});
    bars = [...dash.querySelectorAll('.bars i')]; bal = dash.querySelector('.bal');
    rate = kit.h('<div class="rate" style="z-index:3;left:520px;top:780px"><span class="old">4.1%</span><span class="new">5.6%</span></div>'); kit.stage.append(rate);

    pills = kit.el('div', { class: 'pills', parent: kit.stage, style: 'z-index:3' });
    [['No hidden fees', 'red', 'x'], ['No lock-ins', 'red', 'x'], ['Just growth.', 'green', 'check']].forEach(([t, tone, ic]) => { const p = pill(t, { tone, icon: ic, size: 2.5 }); pills.append(p); pillEls.push(p); });

    url = kit.h(`<div class="url" style="z-index:3"><span class="gl">${glyph('globe', { size: 84, stroke: 2 })}</span><span class="txt"></span></div>`); kit.stage.append(url);
    urlTxt = url.querySelector('.txt'); typ = kit.typist('sprout.money', TT.url + .35, 13, 2);
    for (const side of [-1, 1]) { const hm = kit.el('div', { class: 'half', parent: kit.stage, style: 'z-index:2' }); halves.push({ hm, side }); }
    endt = kit.h('<div class="endt" style="z-index:3"><div class="name">Sprout</div><div class="sub">Start growing today.</div></div>'); kit.stage.append(endt);
    this.ename = endt.querySelector('.name'); this.esub = endt.querySelector('.sub');
  },

  render(t, kit) {
    // ── coins: burst out to a ring round the line; the others leave; the green one becomes the logo
    const away = eiq(seg(t, TT.logo0, TT.logo0 + .5));
    coins.forEach((c, i) => {
      const a = (i * 60 + 30) * Math.PI / 180, d0 = TT.burst + i * .07, p = eoq(seg(t, d0, d0 + .9));
      let x = 3.75 * Math.cos(a) * p, y = 1.95 * Math.sin(a) * p, z = lerp(-8, 0, p) + .3 * Math.sin(t * 1.3 + i);
      let rx = (1 - p) * 4 + .25 * Math.sin(t * .9 + i), ry = (1 - p) * 6 + .5 * Math.sin(t * .7 + i * 2), s = 1;
      if (i === 0) {
        const L = eio(seg(t, TT.logo0, TT.logo1)), O = eio(seg(t, TT.orbit0, TT.orbit1));
        x = lerp(lerp(x, -2.15, L), 0, O); y = lerp(lerp(y, .02, L), 0, O); z = lerp(lerp(z, 2.2, L), 0, O);
        ry = lerp(ry, 6.283 + .35 * Math.sin(t * 1.1), L); rx = lerp(rx, .12 * Math.sin(t), L);
        s = lerp(1, .55, O) * (1 - eiq(seg(t, TT.dash0 - .2, TT.dash0 + .2)));
      } else { z -= 14 * away; x *= 1 + away; y *= 1 + away; }
      c.position.set(x, y, z); c.rotation.set(rx, ry, 0); c.scale.setScalar(Math.max(.001, s));
      c.visible = i === 0 ? t < TT.dash0 + .25 : t < TT.logo0 + .55;
    });
    v.look([0, 0, 10 - .15 * t], [0, 0, 0]).render();

    // ── the line, with its icons as words
    TextFx.in(line, t, TT.line, { from: 'bottom', d: 40, stagger: .1, dur: .45, ease: x => eob(x, 1.5) });
    TextFx.out(line, t, TT.logo0 - .15, { to: 'top', d: 40, stagger: .04, dur: .3 });
    line.style.display = t < TT.logo0 + .5 ? '' : 'none';

    // ── the logo: rays turn behind the coin, the name slams in
    const [lx, ly] = v.project([coins[0].position.x, coins[0].position.y, coins[0].position.z]);
    const rayOn = Math.min(eo(seg(t, TT.logo0 + .2, TT.logo1 + .2)), 1 - eio(seg(t, TT.orbit0 - .1, TT.orbit0 + .3)));
    rays.style.left = lx + 'px'; rays.style.top = ly + 'px'; rays.style.opacity = (rayOn * .55).toFixed(3);
    rays.style.transform = `rotate(${(t * 14).toFixed(2)}deg) scale(${(.6 + .4 * rayOn).toFixed(3)})`; rays.style.display = rayOn > 0 ? '' : 'none';
    glow.style.left = lx + 'px'; glow.style.top = ly + 'px';
    brand.style.display = t >= TT.logo0 && t < TT.orbit0 + .4 ? '' : 'none';
    TextFx.in(this.bname, t, TT.logo1 - .1, { mode: 'chars', from: 'bottom', d: 90, stagger: .04, dur: .4, ease: x => eob(x, 1.7) });
    TextFx.in(this.bsub, t, TT.logo1 + .35, { from: 'bottom', d: 24, dur: .45 });
    TextFx.out(this.bname, t, TT.orbit0 - .1, { to: 'right', d: 60, stagger: .02, dur: .25, mode: 'chars' });
    TextFx.out(this.bsub, t, TT.orbit0 - .1, { to: 'right', d: 40, dur: .25 });

    // ── the orbit: rings draw, planets travel, labels ride along
    const oOn = t >= TT.orbit0 && t < TT.dash0 + .35, oOut = eiq(seg(t, TT.dash0 - .2, TT.dash0 + .3));
    orbitsSvg.style.display = oOn ? '' : 'none';
    orbitsSvg.style.transform = `scale(${(1 + .6 * oOut).toFixed(3)})`; orbitsSvg.style.transformOrigin = '960px 540px'; orbitsSvg.style.opacity = (1 - oOut).toFixed(3);
    rings.forEach(({ e, rx, ry }, i) => {
      e.setAttribute('stroke-dashoffset', String(1 - eio(seg(t, TT.orbit0 + .3 + i * .12, TT.orbit1 + .5 + i * .12))));
      const ang = -Math.PI / 2 + i * 2.1 + (t - TT.orbit0) * (.9 - i * .2), px = 960 + rx * Math.cos(ang), py = 540 + ry * Math.sin(ang), pin = eob(seg(t, TT.orbit1 + i * .2, TT.orbit1 + .45 + i * .2), 1.8);
      planets[i].setAttribute('cx', px.toFixed(1)); planets[i].setAttribute('cy', py.toFixed(1)); planets[i].style.transform = `scale(${pin.toFixed(3)})`; planets[i].style.transformOrigin = `${px.toFixed(1)}px ${py.toFixed(1)}px`;
      labels[i].style.display = oOn ? '' : 'none';
      labels[i].style.transform = `translate(${(px + 34).toFixed(1)}px,${(py - 15).toFixed(1)}px)`; labels[i].style.opacity = (seg(t, TT.orbit1 + .25 + i * .2, TT.orbit1 + .55 + i * .2) * (1 - oOut)).toFixed(3);
    });

    // ── the dashboard swings in, tilted, while it fills; the rate flips up in front of it
    const dIn = eoq(seg(t, TT.dash0, TT.dash1)), dOut = eiq(seg(t, TT.no - .3, TT.no + .2));
    sp.view.style.display = t >= TT.dash0 && t < TT.no + .25 ? '' : 'none';
    sp.camera([lerp(-500, -260, dIn) + 40 * Math.sin(t * .5), lerp(-900, -380, dIn), 1900 - 120 * seg(t, TT.dash0, TT.no)], [0, 40, 0]);
    sp.place(dash, { x: 0, y: lerp(400, 0, dIn) + 900 * dOut, z: 0, rx: lerp(70, 22, dIn) + 30 * dOut, ry: lerp(-35, -14, dIn), rz: 0 });
    bars.forEach((b, i) => { b.style.height = (eob(seg(t, TT.dash0 + .3 + i * .04, TT.dash0 + .8 + i * .04), 1.4) * (25 + 5 * i + 8 * Math.sin(i * 1.7))).toFixed(1) + '%'; });
    TextFx.count(bal, t, TT.dash0 + .3, TT.dash1 + .6, 12480, { from: 0, format: v => '$' + Math.round(v).toLocaleString('en-US') });
    const rIn = eob(seg(t, TT.rate, TT.rate + .45), 1.7);
    rate.style.display = t >= TT.rate - .1 && t < TT.no + .25 ? '' : 'none';
    rate.style.transform = `translateY(${(60 * (1 - rIn) + 700 * dOut).toFixed(1)}px) scale(${Math.max(.01, rIn).toFixed(3)})`; rate.style.transformOrigin = '30% 50%';
    rate.querySelector('.new').style.transform = `rotateX(${(90 * (1 - eob(seg(t, TT.rate + .2, TT.rate + .6), 1.5))).toFixed(2)}deg)`;

    // ── no, no, yes
    pills.style.display = t >= TT.no && t < TT.url + .3 ? '' : 'none';
    pillEls.forEach((p, i) => {
      const a = i < 2 ? TT.no + i * .32 : TT.yes, pin = eob(seg(t, a, a + .38), 1.8), shake = i < 2 ? Math.sin(seg(t, a + .25, a + .65) * Math.PI * 4) * 10 * (1 - seg(t, a + .25, a + .65)) : 0;
      const dim = i < 2 ? .45 * seg(t, TT.yes, TT.yes + .3) : 0, fold = eiq(seg(t, TT.url - .1, TT.url + .25));
      p.style.transform = `translate(${shake.toFixed(1)}px,${(lerp(30, 0, pin) + (i - 1) * -132 * fold).toFixed(1)}px) scale(${(Math.max(.01, pin) * (1 - .3 * fold)).toFixed(3)})`;
      p.style.opacity = (Math.min(1, pin * 2) * (1 - dim) * (1 - fold)).toFixed(3);
    });

    // ── the URL, typed in a glowing field
    const uIn = eob(seg(t, TT.url, TT.url + .4), 1.6), uOut = eiq(seg(t, TT.end - .3, TT.end + .1));
    url.style.display = t >= TT.url && t < TT.end + .15 ? '' : 'none';
    url.style.transform = `scale(${Math.max(.01, uIn * (1 - .5 * uOut)).toFixed(3)}) translateY(${(-500 * uOut).toFixed(1)}px)`;
    url.style.opacity = (1 - uOut).toFixed(3);
    const ut = typ.at(t); if (urlTxt.textContent !== ut) urlTxt.textContent = ut;

    // ── end: two half-moons slide in from the edges, the name lands between them
    halves.forEach(({ hm, side }) => {
      const p = eoq(seg(t, TT.end - .1, TT.end + .55));
      hm.style.display = t >= TT.end - .1 ? '' : 'none';
      hm.style.transform = `translate(${(960 - 260 + side * lerp(1500, 1020, p) + side * 6 * Math.sin(t)).toFixed(1)}px,${(540 - 260).toFixed(1)}px)`;
    });
    endt.style.display = t >= TT.end ? '' : 'none';
    TextFx.in(this.ename, t, TT.end + .25, { mode: 'chars', from: 'bottom', d: 70, stagger: .045, dur: .4, ease: x => eob(x, 1.7) });
    TextFx.in(this.esub, t, TT.end + .75, { from: 'bottom', d: 24, dur: .45 });
    endt.style.transform = `scale(${(1 + .03 * seg(t, TT.end, DUR)).toFixed(4)})`;
    glow.style.opacity = t >= TT.end ? .6 : 1;
  },

  score(S, kit) {
    const BPM = 122; S.tempo(BPM, { t0: TT.logo1 - 8 * 60 / BPM });
    S.program('pad', 'pad', { rev: .6 }); S.program('keys', 'ep', { gain: -3 }); S.program('bass', 'bass'); S.program('pl', 'pluck', { gain: -4 }); S.program('bell', 'bell', { gain: -9 });
    S.fx('whoosh', 0, { dur: .6, vel: 60 }); COINS.forEach((_, i) => S.fx('pop', TT.burst + i * .07 + .55, { vel: 40 + i * 4 }));
    S.chord('pad', ['A2', 'E3', 'B3', 'C#4'], { t: 0, dur: TT.logo1, vel: 40 });
    S.fx('riser', TT.logo1, { dur: .6, vel: 60 }); S.fx('impact', TT.logo1, { vel: 90 }); S.fx('sparkle', TT.logo1 + .1, { vel: 50 });
    const b0 = S.toBeat(TT.logo1), b1 = S.toBeat(TT.end);
    S.drums({ kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', shaker: 'xoxoxoxoxoxoxoxo' }, { from: b0, step: .25, repeat: Math.ceil((b1 - b0) / 4) });
    for (let b = b0, i = 0; b < b1; b += 2, i++) S.note('bass', ['A1', 'A1', 'F#1', 'D2', 'E1', 'E1'][i % 6], { beat: b, beats: 1.7, vel: 78 });
    for (let b = b0, i = 0; b < b1; b += 4, i++) S.chord('keys', [['A3', 'C#4', 'E4'], ['F#3', 'A3', 'C#4'], ['D3', 'F#3', 'A3'], ['E3', 'G#3', 'B3']][i % 4], { beat: b, beats: 3.5, vel: 52 });
    S.fx('whoosh', TT.orbit0, { dur: .5, vel: 50, into: true }); [0, 1, 2].forEach(i => S.fx('pop', TT.orbit1 + i * .2, { vel: 50 }));
    S.fx('swipe', TT.dash0, { dur: .5, vel: 60 }); S.fx('roll', TT.dash0 + .3, { dur: TT.dash1 + .3 - TT.dash0, vel: 35 });
    S.fx('ding', TT.rate + .3, { vel: 70, pitch: 'E6' });
    S.fx('thud', TT.no, { vel: 80 }); S.fx('thud', TT.no + .32, { vel: 80 }); S.fx('boing', TT.no + .3, { vel: 30 });
    S.fx('chime', TT.yes, { vel: 70, pitch: 'A5' });
    S.fx('swipe', TT.url, { dur: .3, vel: 55 }); S.ticks(kit.typing.times, { vel: 30 });
    S.fx('riser', TT.end, { dur: .5, vel: 60 }); S.fx('impact', TT.end, { vel: 95 }); S.drum('crash', { t: TT.end, vel: 60 });
    S.chord('keys', ['A2', 'E3', 'B3', 'C#4', 'E4'], { t: TT.end, dur: DUR - TT.end, vel: 66, spread: .02 }); S.note('bass', 'A1', { t: TT.end, dur: 2.5, vel: 85 });
    S.run('bell', ['E5', 'A5', 'C#6', 'E6'], { t: TT.end + .25, step: .08, vel: 50 });
    S.master({ fadeOut: 1.4 });
  },
};
