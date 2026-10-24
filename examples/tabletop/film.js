// "Build": an 11 s tabletop film. Real UI lies on a desk as flat plates in CSS 3D (crisp at any angle);
// a box character, drawn flat on a design canvas, pops up into 3D, walks across the desk, hops on the Build
// button, and the phone it built stands up. Camera: top-down → low and close → follow → front-on.
// Depth of field blurs the plates by their distance from the character.
import { useDevices, phone, glyph } from 'motion/ui/devices.js';
const { seg, lerp, clamp01, eo, eio, eob, eoq, keys, TextFx } = kit;
const W = 1920, H = 1080;

// ───────── Beats ─────────
const TT = {};
TT.pop = 0.55;               // the flat drawing pops up into a 3D character
TT.tilt0 = 1.25; TT.tilt1 = 2.5;   // camera drops from top-down to low and close
TT.hop1 = 1.7;               // a happy hop
TT.walk0 = 2.35;             // walks across the desk
TT.jump = 5.45;              // jumps onto the Build button
TT.press = TT.jump + 0.42;   // lands: the button presses
TT.trace = TT.press + 0.08;  // a line runs to the phone
TT.light = TT.trace + 0.55;  // the phone lights up
TT.stand0 = 7.05; TT.stand1 = 8.1;  // the phone stands up
TT.walk2 = 7.0;              // the character walks to its side
TT.turn = 8.35;              // turns to camera
TT.hop2 = 8.7;               // and hops
const DUR = 11;

// ───────── The desk (world px; y is DOWN, the desk is y = 0) ─────────
const BODY = { w: 120, h: 84, d: 84 }, LEG = 26, FEET = BODY.h / 2 + LEG;
const P = { canvas: [-700, 210], toolbar: [-170, 430], button: [250, 250], panel: [80, -380], phone: [650, 0] };
const PH = { x: 650, H2: 484, zh: 484 };   // phone plate: hinge at its near edge
// walking path [t, x, z] (straight legs, eased); the distance along it drives the gait
const PATH = [[TT.walk0, -700, 210], [4.3, -260, 420], [5.35, 150, 330]];
const PATH2 = [[TT.walk2, 250, 250], [8.2, 290, 560]];

let sp, desk, plates = {}, charG, body, hips = [], shadow, tracePath, burstArt, made, phoneP, flatSticker;

function along(path, t) {
  if (t <= path[0][0]) return { x: path[0][1], z: path[0][2], dist: 0, dir: [path[1][1] - path[0][1], path[1][2] - path[0][2]], moving: false };
  let dist = 0;
  for (let i = 1; i < path.length; i++) {
    const [t0, x0, z0] = path[i - 1], [t1, x1, z1] = path[i], L = Math.hypot(x1 - x0, z1 - z0);
    if (t < t1) { const p = eio(seg(t, t0, t1)); return { x: lerp(x0, x1, p), z: lerp(z0, z1, p), dist: dist + L * p, dir: [x1 - x0, z1 - z0], moving: true }; }
    dist += L;
  }
  const a = path[path.length - 2], b = path[path.length - 1];
  return { x: b[1], z: b[2], dist, dir: [b[1] - a[1], b[2] - a[2]], moving: false };
}
// where the character is, and how it's posed
function pose(t) {
  let x, z, dist = 0, dir = [1, 0], lift = 0, squash = 1, walking = false;
  if (t < TT.jump) { const a = along(PATH, t); x = a.x; z = a.z; dist = a.dist; dir = a.dir; walking = a.moving; }
  else if (t < TT.walk2) {
    const p = seg(t, TT.jump, TT.press), a = along(PATH, 99);
    x = lerp(a.x, P.button[0], eio(p)); z = lerp(a.z, P.button[1], eio(p)); dir = [P.button[0] - a.x, P.button[1] - a.z];
    lift = 150 * Math.sin(Math.PI * p) * (p < 1 ? 1 : 0) - (t >= TT.press ? 10 * (1 - seg(t, TT.press, TT.press + .25)) : 0);  // lands on the button, which sinks
    dist = 1000;
  } else { const a = along(PATH2, t); x = a.x; z = a.z; dist = 2000 + a.dist; dir = a.dir; walking = a.moving; }
  // hops in place
  for (const h0 of [TT.hop1, TT.hop2]) { const p = seg(t, h0, h0 + .42); if (p > 0 && p < 1) lift = Math.max(lift, 90 * Math.sin(Math.PI * p)); }
  // squash on take-off and landing
  for (const e of [TT.hop1, TT.hop1 + .42, TT.jump, TT.press, TT.hop2, TT.hop2 + .42]) { const d = Math.abs(t - e); if (d < .1) squash = Math.min(squash, 1 - .22 * (1 - d / .1)); }
  let heading = Math.atan2(dir[0], dir[1]) * 180 / Math.PI;
  const turn = eio(seg(t, TT.turn, TT.turn + .45)); heading = lerp(heading, 0, turn);
  if (t < TT.walk0) heading = lerp(0, heading, eio(seg(t, TT.walk0 - .5, TT.walk0)));   // faces the camera until it sets off
  const grow = t < TT.pop ? 0.03 : eob(seg(t, TT.pop, TT.pop + .55), 1.8);
  return { x, z, dist, heading, lift, squash, grow, walking };
}

export default {
  title: 'Build',
  width: W, height: H, fps: 30, duration: DUR, background: '#1d140f',
  motionBlur: { samples: 6, shutter: 0.5 },
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Pop' }, { t: TT.walk0, label: 'Walk' }, { t: TT.jump, label: 'Build' }, { t: TT.stand0, label: 'Stand' }],

  async init(kit) {
    await useDevices();
    kit.stage.append(kit.h('<div class="room"></div>'));
    sp = kit.space(kit.stage, { fov: 32 });
    desk = sp.add(kit.h('<div class="desk"></div>'), { rx: 90 });

    const canvas = kit.h(`<div class="plate canvas"><div class="sticker"></div><div class="sel"><i style="left:-9px;top:-9px"></i><i style="right:-9px;top:-9px"></i><i style="left:-9px;bottom:-9px"></i><i style="right:-9px;bottom:-9px"></i></div><div class="size">120 × 84</div><div class="name">◇ Buddy</div></div>`);
    plates.canvas = sp.add(canvas, { x: P.canvas[0], y: -1, z: P.canvas[1], rx: 90 });
    flatSticker = canvas.querySelector('.sticker');
    plates.toolbar = sp.add(kit.h(`<div class="plate toolbar">${['arrow', 'plus', 'pencil', 'chat', 'star', 'gear'].map((g, i) => i === 1 ? `<span class="on">${glyph(g, { size: 30, stroke: 2.4 })}</span>` : glyph(g, { size: 30, stroke: 2.2 })).join('')}</div>`), { x: P.toolbar[0], y: -1, z: P.toolbar[1], rx: 90 });
    plates.panel = sp.add(kit.h(`<div class="plate panel"><b>Buddy</b>${[['Width', '120'], ['Height', '84'], ['Legs', '4'], ['Mood', 'Keen'], ['Colour', '#EE5F2F'], ['Export', 'iOS']].map(([a, b]) => `<div class="row"><span>${a}</span><span>${b}</span></div>`).join('')}</div>`), { x: P.panel[0], y: -1, z: P.panel[1], rx: 90 });
    plates.button = sp.add(kit.h(`<div class="plate button">Build ${glyph('arrow', { size: 34, stroke: 3 })}</div>`), { x: P.button[0], y: -2, z: P.button[1], rx: 90 });

    // the phone it builds: lies on the desk, dark, then lights up and stands
    phoneP = phone({ dark: true, time: '9:41' });
    const art = kit.h(`<div class="screen-art"><svg class="burst" viewBox="-100 -100 200 200">${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = i % 2 ? 62 : 92; return `<line x1="0" y1="0" x2="${(Math.cos(a) * r).toFixed(1)}" y2="${(Math.sin(a) * r).toFixed(1)}" stroke="#ee5f2f" stroke-width="13" stroke-linecap="round"/>`; }).join('')}</svg><div class="made">MADE<br>WITH <em>KIT</em></div></div>`);
    phoneP.screen.append(art); burstArt = art.querySelector('.burst'); made = art.querySelector('.made');
    plates.phone = sp.add(phoneP.el, {});
    this.art = art;

    // the trace: an SVG lying on the desk (local px → world: x − 1000, z = y − 700)
    const tr = kit.svg(`<svg class="trace" width="2000" height="1400" viewBox="0 0 2000 1400"><path d="M ${1000 + 250} ${700 + 250 + 40} C ${1000 + 360} ${700 + 420}, ${1000 + 470} ${700 + 520}, ${1000 + 650 - 90} ${700 + 484 + 10}" fill="none" stroke="#2f6bff" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/></svg>`);
    sp.add(tr, { y: -1.5, rx: 90 }); tracePath = tr.querySelector('path');

    // the character: a group whose origin is the point between its feet
    shadow = sp.add(kit.h('<div class="shadowc"></div>'), { y: -1.2, rx: 90 });
    charG = kit.el('div', { style: 'position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d' });
    sp.world.append(charG);
    body = kit.box3d({ ...BODY, color: '#ee5f2f', faces: { front: { html: '<i class="eye" style="left:34px"></i><i class="eye" style="right:34px"></i>' } } });
    body.style.transform = `translate3d(0,${-FEET}px,0)`; charG.append(body);
    for (const [hx, hz] of [[-40, 26], [40, -26], [40, 26], [-40, -26]]) {
      const hip = kit.el('div', { style: 'position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d', parent: charG });
      const leg = kit.box3d({ w: 20, h: LEG, d: 20, color: '#d9532a' }); leg.style.transform = `translate3d(0,${LEG / 2}px,0)`; hip.append(leg);
      hips.push({ hip, hx, hz });
    }
  },

  render(t, kit) {
    const ps = pose(t);
    // ── camera: top-down on the canvas → low and close → follow → pull up for the trace → front-on
    const k = [
      [0, [-700, -1150, 520, -700, 0, 210]],
      [TT.tilt0, [-700, -1080, 500, -700, 0, 210]],
      [TT.tilt1, [-420, -240, 860, -660, -60, 240]],
    ];
    let cam = keys(t, k);
    const fol = [ps.x + 380, -250, ps.z + 720, ps.x - 20, -60, ps.z];
    const wf = Math.min(eio(seg(t, TT.tilt1 - .3, TT.tilt1 + .4)), 1 - eio(seg(t, TT.press - .2, TT.press + .5)));
    cam = cam.map((v, i) => lerp(v, fol[i], wf));
    const up = [380, -760, 1500, 430, 0, 330], fin = [430, -330, 2050, 500, -390, 380];
    const wu = eio(seg(t, TT.press - .2, TT.press + .5)) * (1 - eio(seg(t, TT.stand0 - .1, TT.stand1 + .2)));
    const wn = eio(seg(t, TT.stand0 - .1, TT.stand1 + .2));
    cam = cam.map((v, i) => v * (1 - wu - wn) + up[i] * wu + fin[i] * wn);
    const drift = [Math.sin(t * .4) * 18, 0, -t * 6];
    sp.camera([cam[0] + drift[0], cam[1], cam[2] + drift[2]], [cam[3], cam[4], cam[5]]);

    // ── the character
    const g = kit.gait(ps.dist, { stride: 64, legs: 4, lift: 9, swing: 30, bob: 5 });
    const bob = ps.walking ? g.bob : 0;
    charG.style.transform = `translate3d(${ps.x.toFixed(1)}px,${(-ps.lift + bob - (t > TT.press && t < TT.walk2 ? 10 : 0) * (t < TT.press + .25 ? seg(t, TT.press, TT.press + .25) : 1)).toFixed(1)}px,${ps.z.toFixed(1)}px) rotateY(${ps.heading.toFixed(2)}deg) rotateZ(${(ps.walking ? g.sway : 0).toFixed(2)}deg) scale3d(${(1 + (1 - ps.squash) * .6).toFixed(3)},${(ps.grow * ps.squash).toFixed(3)},${(1 + (1 - ps.squash) * .6).toFixed(3)})`;
    hips.forEach(({ hip, hx, hz }, i) => { const L = g.legs[i]; hip.style.transform = `translate3d(${hx}px,${-LEG}px,${hz}px) rotateX(${(ps.walking ? L.swing : 0).toFixed(2)}deg) translateY(${(ps.walking ? -L.lift : 0).toFixed(1)}px)`; });
    // the flat drawing is the character's top before it pops up
    flatSticker.style.opacity = t < TT.pop + 0.05 ? 1 : 0;
    charG.style.visibility = t < TT.pop ? 'hidden' : '';
    sp.place(shadow, { x: ps.x, y: -1.2, z: ps.z, rx: 90, s: (1 - ps.lift / 260) * Math.min(1, ps.grow * 1.4) });

    // ── the button sinks when it's landed on; the trace runs; the phone lights and stands
    const press = seg(t, TT.press, TT.press + .08) * (1 - seg(t, TT.press + .35, TT.press + .6));
    plates.button.firstChild && (plates.button.style.boxShadow = `0 ${10 - 8 * press}px 0 #b8431c`);
    sp.place(plates.button, { x: P.button[0], y: -2, z: P.button[1] + 0, rx: 90, s: 1 - .04 * press });
    tracePath.setAttribute('stroke-dashoffset', String(1 - eio(seg(t, TT.trace, TT.light))));
    tracePath.style.opacity = 1 - seg(t, TT.stand0, TT.stand0 + .4);
    const lit = eo(seg(t, TT.light, TT.light + .5));
    this.art.style.opacity = lit.toFixed(3);
    burstArt.style.transform = `rotate(${(t * 22).toFixed(1)}deg) scale(${eob(seg(t, TT.light, TT.light + .6), 1.8).toFixed(3)})`;
    TextFx.rise(made, t, TT.light + .25, { dur: .5, stagger: .12 });
    const a = 90 * (1 - eob(seg(t, TT.stand0, TT.stand1), 1.3)), ar = a * Math.PI / 180;
    sp.place(plates.phone, { x: PH.x, y: -1 - PH.H2 * Math.cos(ar), z: PH.zh - PH.H2 * Math.sin(ar), rx: a });

    // ── depth of field: plates blur by distance from what the camera follows
    const focus = sp.depth([ps.x, -50, ps.z]);
    for (const [id, p] of Object.entries({ canvas: P.canvas, toolbar: P.toolbar, panel: P.panel, button: P.button })) kit.focus(plates[id], sp.depth([p[0], 0, p[1]]), focus, .011, 9);
  },

  score(S, kit) {
    const BPM = 104; S.tempo(BPM, { t0: TT.walk0 });
    S.program('pad', 'pad', { rev: .6 }); S.program('mar', 'marimba'); S.program('bass', 'bass'); S.program('keys', 'ep', { gain: -3 }); S.program('gl', 'glock', { gain: -8 });
    S.chord('pad', ['F3', 'C4', 'E4', 'A4'], { t: 0, dur: TT.walk0 + .5, vel: 38 });
    S.fx('pop', TT.pop, { vel: 75 }); S.fx('boing', TT.pop + .05, { vel: 40 });
    S.fx('pop', TT.hop1, { vel: 50 }); S.fx('thud', TT.hop1 + .42, { vel: 50 });
    // footsteps: one tick per foot-fall, read from the same gait
    let last = 0; for (let t = TT.walk0; t < TT.jump; t += .005) { const d = pose(t).dist, n = Math.floor(d / 32); if (n > last) { S.fx('tick', t, { vel: 22 + (n % 2) * 8 }); last = n; } }
    last = 0; for (let t = TT.walk2; t < 8.25; t += .005) { const d = pose(t).dist - 2000, n = Math.floor(d / 32); if (n > last) { S.fx('tick', t, { vel: 22 + (n % 2) * 8 }); last = n; } }
    const b0 = S.toBeat(TT.walk0), b1 = S.toBeat(TT.jump);
    S.drums({ kick: 'x.......x.......', hat: '..x...x...x...x.', shaker: 'x.x.x.x.x.x.x.x.' }, { from: b0, step: .25, repeat: Math.ceil((b1 - b0) / 4) });
    ['F2', 'F2', 'A1', 'C2', 'D2', 'D2'].forEach((n, i) => S.note('bass', n, { beat: b0 + i, beats: .8, vel: 70 }));
    S.fx('whoosh', TT.jump, { dur: .4, vel: 50 }); S.fx('click', TT.press, { vel: 95 }); S.drum('kick', { t: TT.press, vel: 90 });
    S.fx('roll', TT.trace, { dur: TT.light - TT.trace, vel: 45 });
    S.fx('chime', TT.light, { vel: 70, pitch: 'C6' });
    S.chord('pad', ['D3', 'A3', 'C4', 'F4'], { t: TT.press, dur: DUR - TT.press, vel: 42 });
    S.fx('revswell', TT.stand1, { dur: TT.stand1 - TT.stand0, vel: 55 }); S.drum('kick', { t: TT.stand1, vel: 96 });
    S.chord('keys', ['F3', 'C4', 'E4', 'A4', 'C5'], { t: TT.stand1, dur: DUR - TT.stand1, vel: 66, spread: .02 }); S.note('bass', 'F1', { t: TT.stand1, dur: 3, vel: 80 });
    S.fx('pop', TT.hop2, { vel: 55 }); S.fx('thud', TT.hop2 + .42, { vel: 50 }); S.run('gl', ['C6', 'E6', 'G6'], { t: TT.hop2 + .1, step: .09, vel: 45 });
    S.master({ fadeOut: 1.2 });
  },
};
