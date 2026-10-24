// "Make it move": a 12.5 s kinetic poster reel. Black, acid lime and chrome, cut hard to a 128 bpm groove.
// Every section hands off to the next:
//   a wall of scrolling type → its acid band swells into the next frame → a chrome knot beside slammed type →
//   the knot bursts into particles that swirl into a word → the word rains down onto a field of blocks the
//   camera tilts over, a chrome ball rolling through it → an acid wipe → a chrome star and the last words.
import * as THREE from 'three';
import { view3d, mat, shapes, textPoints, particles, field } from 'motion/three-kit.js';
const { seg, lerp, clamp01, eo, ei, eio, eob, eoq, eiq, eiox, keys, TextFx, rng } = kit;
const W = 1920, H = 1080;

const TT = {};
TT.swell0 = 1.95; TT.poster = 2.3;     // the band swells into the acid frame
TT.burst = 4.6; TT.word = 6.2;         // the knot bursts; the particles become a word
TT.rain = 6.85; TT.land = 7.45;        // the word rains down onto the field
TT.tilt1 = 8.5;                        // camera tilts over the field
TT.ball0 = 7.5; TT.ball1 = 9.0;        // a chrome ball rolls through it
TT.wipe0 = 8.95; TT.end = 9.3;         // acid wipe; the end poster
const DUR = 12.5;

let v, knot, star, ball, P, F, rows = [], wall, bandbg, ground, flood, ink, wipe, posterA, endP, hud, hudEls = {}, src = [], dst = [], rnd = [];
const knotRot = t => [0.35 + 0.25 * Math.sin(t * .7), t * 0.9, 0];

export default {
  title: 'Make it move',
  width: W, height: H, fps: 30, duration: DUR, background: '#0b0b0c',
  motionBlur: { samples: 6, shutter: 0.5, fast: [[1.85, 2.35, 16], [4.55, 5.2, 12], [8.9, 9.35, 16]] },
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Wall' }, { t: TT.poster, label: 'Form' }, { t: TT.burst, label: 'Burst' }, { t: TT.rain, label: 'Field' }, { t: TT.end, label: 'End' }],

  async init(kit) {
    ground = kit.el('div', { class: 'ground', parent: kit.stage });
    flood = kit.el('div', { class: 'flood', parent: kit.stage });
    ink = kit.el('div', { class: 'ink', parent: kit.stage });

    // the wall of type
    wall = kit.el('div', { class: 'wall', parent: kit.stage });
    bandbg = kit.el('div', { class: 'bandbg', parent: wall });
    const words = ['TYPE IN MOTION', 'EVERY FRAME', 'MAKE IT MOVE', 'LOUD ON PURPOSE', 'MAKE IT MOVE', 'NO STILL FRAMES', 'MAKE IT MOVE', 'EVERY FRAME', 'TYPE IN MOTION'];
    words.forEach((w, i) => {
      const kind = i === 4 ? 'band' : i % 2 ? 'out' : 'solid';
      const row = kit.el('div', { class: 'row ' + kind, html: Array(3).fill(`<span>${w} ·</span>`).join(''), parent: wall });
      rows.push({ m: kit.marquee(row, { speed: (i % 2 ? -1 : 1) * (150 + 40 * (i % 3)), offset: i * 210 }), dir: i % 2 ? -1 : 1, band: kind === 'band', el: row });
    });

    // 3D: one view for the knot, particles, the field, the ball and the star
    v = view3d(kit, { fov: 30, env: 1, exposure: 1.15, z: 1 });
    v.light('#ffffff', 1.6, [4, 6, 6]); v.light('#c6ff2e', 1.2, [-6, -2, 3]);
    knot = new THREE.Mesh(shapes.knot({ p: 2, q: 3, radius: 1.05, tube: .34 }), mat.chrome('#ecffd0'));
    knot.position.set(1.85, 0, 0); v.scene.add(knot);

    // particles: from the knot's surface (as it is at the burst) to the word
    const N = 5200;
    P = particles(N, { size: .046, colors: ['#c6ff2e', '#ffffff', '#ffffff'] }); P.points.material.toneMapped = false; v.scene.add(P.points);
    const pos = knot.geometry.attributes.position, m = new THREE.Matrix4().compose(knot.position, new THREE.Quaternion().setFromEuler(new THREE.Euler(...knotRot(TT.burst))), new THREE.Vector3(1, 1, 1)), vv = new THREE.Vector3(), r = rng(5);
    for (let i = 0; i < N; i++) { vv.fromBufferAttribute(pos, Math.floor(r() * pos.count)).applyMatrix4(m); src.push([vv.x, vv.y, vv.z]); rnd.push([r(), r(), r()]); }
    dst = textPoints('MOVE', { font: '900 300px "Inter Tight"', n: N, scale: 225, w: 1800, h: 420 }).map(([x, y]) => [x, y + .1, 0]);

    // the field (sits below the word; the camera follows the rain down to it)
    F = field(new THREE.BoxGeometry(.2, 1, .2), mat.clay('#ecece6', { roughness: .55 }), 30, 18, { gap: .26 });
    F.mesh.position.y = -2.2; v.scene.add(F.mesh);
    ball = new THREE.Mesh(new THREE.SphereGeometry(.32, 64, 32), mat.chrome('#ffffff')); v.scene.add(ball);

    star = new THREE.Mesh(shapes.star({ points: 5, outer: 1.25, inner: .58, depth: .45, bevel: .22, round: .16 }), mat.chrome('#f2ffe0'));
    v.scene.add(star);

    // posters (DOM over the 3D canvas)
    posterA = kit.h(`<div class="poster" style="z-index:2"><div class="big">FORM.</div><div class="sub">WITHOUT<br><em>LIMITS.</em></div><div class="note">chrome · light · depth</div></div>`); kit.stage.append(posterA);
    endP = kit.h(`<div class="poster end" style="z-index:2"><div class="big">STAY</div><div class="sub" style="top:520px;font-size:250px;line-height:.86">LOUD.</div><div class="note" style="top:820px">make it move — 2026</div></div>`); kit.stage.append(endP);
    wipe = kit.el('div', { class: 'flood', parent: kit.stage, style: 'z-index:3' });
    hud = kit.h(`<div class="hud" style="z-index:4"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><div class="tl">MAKE IT MOVE</div><div class="tr">REEL / 01</div><div class="bl">128 BPM</div><div class="br">F 000</div></div>`); kit.stage.append(hud);
    hudEls.f = hud.querySelector('.br'); hudEls.tr = hud.querySelector('.tr');
    this.big = posterA.querySelector('.big'); this.sub = posterA.querySelector('.sub'); this.note = posterA.querySelector('.note');
    this.ebig = endP.querySelector('.big'); this.esub = endP.querySelector('.sub'); this.enote = endP.querySelector('.note');
  },

  render(t, kit) {
    // ── 1. the wall
    const wallOn = t < TT.poster + .05;
    wall.style.display = wallOn ? '' : 'none';
    if (wallOn) {
      wall.style.transform = `rotate(${(-7 + 1.5 * t).toFixed(2)}deg) scale(${(1.02 + .05 * t).toFixed(4)})`;
      const out = ei(seg(t, TT.swell0 - .1, TT.poster));
      rows.forEach(r => { r.m.render(t, r.band ? 0 : r.dir * 2800 * out); r.el.style.opacity = r.band ? 1 - seg(t, TT.swell0, TT.swell0 + .15) : 1; });
      bandbg.style.height = (150 + 1700 * eiq(seg(t, TT.swell0, TT.poster))).toFixed(1) + 'px';
      bandbg.style.marginTop = -(75 + 850 * eiq(seg(t, TT.swell0, TT.poster))).toFixed(1) + 'px';
    }
    // grounds: acid from the swell until the burst's black iris; black until the end wipe; acid at the end
    flood.style.display = t >= TT.poster && t < TT.burst + .4 || t >= TT.end ? '' : 'none';
    const ir = eiq(seg(t, TT.burst, TT.burst + .35));
    ink.style.display = t >= TT.burst && t < TT.end ? '' : 'none';
    if (t < TT.burst + .35) { const [x, y] = v.project([1.85, 0, 0]); kit.iris(ink, ir, x, y); } else ink.style.clipPath = 'none';
    const wp = eiox(seg(t, TT.wipe0, TT.end));
    wipe.style.display = wp > 0 && t < TT.end + .02 ? '' : 'none';
    wipe.style.clipPath = `inset(${((1 - wp) * 100).toFixed(2)}% 0 0 0)`;

    // ── 2. the knot poster
    const kOn = t >= TT.poster && t < TT.burst + .02;
    knot.visible = kOn;
    if (kOn) { knot.rotation.set(...knotRot(t)); knot.scale.setScalar(Math.max(.001, eob(seg(t, TT.poster + .05, TT.poster + .6), 1.6))); }
    posterA.style.display = t >= TT.poster && t < TT.burst + .5 ? '' : 'none';
    TextFx.in(this.big, t, TT.poster + .08, { mode: 'chars', from: 'bottom', d: 160, stagger: .045, dur: .38, ease: x => eob(x, 1.5) });
    TextFx.in(this.sub, t, TT.poster + .45, { mode: 'words', from: 'bottom', d: 70, stagger: .09, dur: .4, ease: x => eob(x, 1.4) });
    TextFx.in(this.note, t, TT.poster + .9, { from: 'bottom', d: 20, dur: .4 });
    TextFx.out(this.big, t, TT.burst - .12, { to: 'top', d: 140, stagger: .03, dur: .28, mode: 'chars' });
    TextFx.out(this.sub, t, TT.burst - .05, { to: 'top', d: 120, stagger: .05, dur: .28 });
    TextFx.out(this.note, t, TT.burst - .05, { to: 'top', d: 40, dur: .25 });

    // ── 3. particles: burst → swirl → word → rain
    const pOn = t >= TT.burst && t < TT.land + .1;
    P.points.visible = pOn;
    if (pOn) {
      const u = eio(seg(t, TT.burst, TT.word)), sw = Math.sin(Math.PI * u);
      P.set(i => {
        const a = src[i], b = dst[i], q = rnd[i];
        let x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), z = lerp(a[2], b[2], u);
        const ang = sw * (2.2 + 2.5 * q[0]), c = Math.cos(ang), s = Math.sin(ang);
        [x, z] = [x * c - z * s, x * s + z * c];
        const push = sw * (0.5 + 1.4 * q[1]); x += Math.sign(x || 1) * push * .3; y += (q[2] - .5) * push; z += push * .8;
        if (t > TT.word) { y += .005 * Math.sin(t * 3 + i); }
        if (t > TT.rain) { const d = Math.max(0, t - TT.rain - q[0] * .2); y -= 9 * d * d; }
        return [x, Math.max(y, -2.2), z];
      });
      P.points.material.opacity = 1 - seg(t, TT.land - .15, TT.land + .1); P.points.material.transparent = true;
    }

    // ── 4. the field and the ball
    const fOn = t >= TT.rain && t < TT.end + .02;
    F.mesh.visible = ball.visible = fOn;
    const bx = lerp(-4.6, 4.6, eio(seg(t, TT.ball0, TT.ball1))), bz = .35;
    if (fOn) {
      F.set((i, j, x, z, o) => {
        const d = Math.hypot(x, z), g = eob(seg(t, TT.land - .3 + d * .07, TT.land + .15 + d * .07), 1.6);
        const wave = Math.max(0, Math.sin(3.4 * d - 9 * (t - TT.land))) * Math.exp(-.22 * d) * seg(t, TT.land, TT.land + .3);
        const db = Math.hypot(x - bx, z - bz), press = Math.exp(-db * db / .09);
        o.sy = Math.max(.02, g * (.12 + .55 * wave) * (1 - .8 * press)); o.y = o.sy / 2;
        o.color = wave > .55 ? '#c6ff2e' : press > .3 ? '#ffffff' : '#ecece6';
      });
      ball.position.set(bx, -2.2 + .32 + .05, bz); ball.rotation.z = -bx / .32;
    }

    // ── 5. the end
    const eOn = t >= TT.end;
    star.visible = eOn;
    if (eOn) { const p = seg(t, TT.end, TT.end + .7); star.position.set(1.9, lerp(2.6, 0, eob(p, 1.4)), 0); star.rotation.set(.18 * Math.sin(t * 1.1), .55 * Math.sin(1.1 * (t - TT.end)) - .25 + 6.28 * (1 - eo(p)), .15); }
    endP.style.display = eOn ? '' : 'none';
    TextFx.in(this.ebig, t, TT.end + .05, { mode: 'chars', from: 'bottom', d: 160, stagger: .05, dur: .38, ease: x => eob(x, 1.5) });
    TextFx.in(this.esub, t, TT.end + .35, { mode: 'chars', from: 'bottom', d: 160, stagger: .05, dur: .38, ease: x => eob(x, 1.5) });
    TextFx.in(this.enote, t, TT.end + .9, { from: 'bottom', d: 20, dur: .4 });

    // ── camera: front for the knot and the word, follows the rain down, tilts over the field, front again
    let pos = [0, 0, 8], tgt = [0, 0, 0];
    if (t >= TT.rain && t < TT.end) {
      const a = eio(seg(t, TT.rain, TT.land + .1)), b = eio(seg(t, TT.land + .1, TT.tilt1));
      pos = [0, lerp(lerp(0, 7.2, a), 1.6, b), lerp(lerp(8, .8, a), 5.6, b)];
      tgt = [0, lerp(lerp(0, -2.2, a), -2.35, b), 0];
      pos[0] += .3 * Math.sin(t * .8);
    }
    if (t >= TT.burst && t < TT.rain) { pos = [lerp(.6, 0, eo(seg(t, TT.burst, TT.word))), 0, lerp(8.6, 7.4, eio(seg(t, TT.burst, TT.rain)))]; }
    if (t >= TT.end) pos = [0, 0, 8 - .25 * (t - TT.end)];
    v.look(pos, tgt).render();

    // ── HUD: dark on acid, light on black
    const onAcid = (t >= TT.poster && t < TT.burst + .2) || t >= TT.end - .05;
    hud.style.color = onAcid ? '#0b0b0c' : '#f3f3ef';
    const f = String(Math.floor(t * 30)).padStart(3, '0'); if (hudEls.f.textContent !== 'F ' + f) hudEls.f.textContent = 'F ' + f;
    const sec = t < TT.poster ? 'REEL / 01' : t < TT.burst ? 'FORM / 02' : t < TT.rain ? 'BURST / 03' : t < TT.end ? 'FIELD / 04' : 'END / 05';
    if (hudEls.tr.textContent !== sec) hudEls.tr.textContent = sec;
  },

  score(S, kit) {
    const BPM = 128, B = 60 / BPM; S.tempo(BPM, { t0: TT.poster - 8 * B });
    S.program('bass', 'bass'); S.program('keys', 'ep', { gain: -4 }); S.program('pad', 'pad', { rev: .5 }); S.program('pl', 'pluck', { gain: -4 }); S.program('gl', 'glock', { gain: -8 });
    const bar = n => S.toBeat(TT.poster) + n * 4;
    // the wall: hats and a muted pulse; the swell is a riser into the first hit
    S.drums({ hat: 'x.x.x.x.x.x.x.x.', kick: 'x...x...x...x...' }, { from: S.toBeat(0), step: .25, repeat: 1 });
    S.chord('pad', ['E3', 'B3', 'D4', 'G4'], { t: 0, dur: TT.poster, vel: 40 });
    S.fx('riser', TT.poster, { dur: .9, vel: 80 }); S.fx('whoosh', TT.swell0, { dur: .35, vel: 70 });
    S.fx('impact', TT.poster, { vel: 100 }); S.drum('crash', { t: TT.poster, vel: 70 });
    // the knot: the groove
    S.drums({ kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', openhat: '......x.......x.' }, { from: bar(0), step: .25, repeat: 4 });
    ['E1', 'E1', 'G1', 'A1', 'E1', 'E1', 'D2', 'B1'].forEach((n, i) => S.note('bass', n, { beat: bar(0) + i * 2, beats: 1.6, vel: 82 }));
    for (let i = 0; i < 4; i++) S.fx('thud', TT.poster + .08 + i * .045 + .2, { vel: 50 });
    S.fx('riser', TT.burst, { dur: .6, vel: 60 }); S.fx('impact', TT.burst, { vel: 90 }); S.fx('sparkle', TT.burst + .1, { vel: 60 });
    S.fx('revswell', TT.word, { dur: 1.2, vel: 45 }); S.chord('keys', ['E3', 'B3', 'D4', 'F#4'], { t: TT.word, dur: 1, vel: 66 });
    S.fx('whoosh', TT.rain, { dur: .6, vel: 60, into: true });
    S.run('pl', ['B5', 'G5', 'E5', 'D5', 'B4', 'G4'], { t: TT.rain + .1, step: .07, vel: 55 });
    S.fx('thud', TT.land, { vel: 90 }); S.fx('roll', TT.ball0, { dur: TT.ball1 - TT.ball0, vel: 30 });
    S.fx('riser', TT.end, { dur: .4, vel: 75 }); S.fx('swipe', TT.wipe0, { dur: .3, vel: 70 });
    S.fx('impact', TT.end, { vel: 100 }); S.drum('crash', { t: TT.end, vel: 80 });
    S.chord('keys', ['E3', 'B3', 'D4', 'G4', 'B4'], { t: TT.end, dur: DUR - TT.end, vel: 70, spread: .015 }); S.note('bass', 'E1', { t: TT.end, dur: 2.5, vel: 90 });
    for (let i = 0; i < 4; i++) S.fx('thud', TT.end + .05 + i * .05 + .2, { vel: 45 });
    S.drums({ kick: 'x...x...x...x...', hat: '..x...x...x...x.' }, { from: S.toBeat(TT.end) , step: .25, repeat: 2, vel: 70 });
    S.master({ fadeOut: 1.2 });
  },
};
