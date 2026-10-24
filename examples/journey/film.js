// "Delivered": the journey of one message. An abstract idea (how a message crosses the world) told
// with ONE subject in ONE world: typed on a phone, split into words, carried across an ocean,
// reassembled on another phone. The camera follows it from finger-scale to map-scale and back.
// Words on screen: the message itself, a millisecond counter, the reply and the end card. No headings.
const { seg, lerp, clamp01, eo, ei, eio, eob, eoq, keys, TextFx, rng } = kit;
const W = 1920, H = 1080;
const C = { night: '#0b1422', amber: '#ffb547', paper: '#f4f1ea', cable: '#1f3554' };

// ───────── Beats (one cascade) ─────────
const TT = {};
TT.type = -1.1;                 // "See you" already typed at frame 0 (thumbnail)
TT.send = 2.9;                  // tap send
TT.split = TT.send + 0.65;      // the bubble comes apart into words
TT.lift = TT.split + 0.45;      // words leave the phone
TT.out0 = 4.7; TT.out1 = 7.5;   // pull out to the map
TT.cross1 = 11.3;               // crossing done for the fast words
TT.in0 = 11.2; TT.in1 = 13.4;   // push in to the other phone
TT.late = 15.0;                 // the late word lands
TT.read = TT.late + 0.45;        // the bubble is whole
TT.reply = 16.0;                // reply typed
TT.end = 18.3;                  // end card lands
const DUR = 22.5;

// ───────── The world (scene px): two continents, an ocean, cables ─────────
const A = { x: 3600, y: 4300 }, B = { x: 12400, y: 4600 };      // phone centres
const L1 = [5250, 4200], L2 = [10800, 4480];                    // cable landing stations
const MSG = 'See you at 8?', REPLY = 'Yes!';

function catmull(pts, n = 24) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function track(pts) {   // arc-length parametrised polyline
  const P = catmull(pts), L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1];
  return {
    P, total,
    at(u) { const d = clamp01(u) * total; let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < d) lo = m; else hi = m; } const f = (d - L[lo]) / (L[hi] - L[lo] || 1); return [lerp(P[lo][0], P[hi][0], f), lerp(P[lo][1], P[hi][1], f)]; },
    upto(u0, u1) { const a = clamp01(u0) * total, b = clamp01(u1) * total, out = []; for (let i = 0; i < P.length; i++) if (L[i] >= a && L[i] <= b) out.push(P[i]); return out; },
  };
}
const blob = (cx, cy, rx, ry, seed, n = 18) => { const r = rng(seed), pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.78 + r() * 0.34; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } const P = catmull([...pts, pts[0], pts[1]].slice(0), 8).slice(8); return 'M' + P.map(p => p.map(v => v.toFixed(0)).join(' ')).join(' L') + ' Z'; };

let cam, world, cables, trailsG, phoneA, phoneB, fieldA, caretA, sendA, tapA, bubA, bubB, fieldB, caretB, sendB, replyB, tiles = [], tracks = [], ms, endc, w1, w2, endMarks, typedA, typedB;

export default {
  title: 'Delivered — the journey of one message',
  width: W, height: H, fps: 30, duration: DUR, background: C.night,
  css: ['film.css'],
  chapters: [{ t: 0, label: 'A message' }, { t: TT.split, label: 'Into words' }, { t: TT.out0, label: 'Across the ocean' }, { t: TT.in0, label: 'Arrival' }, { t: TT.end, label: 'Delivered' }],

  init(kit) {
    world = kit.layer('world');
    cam = new kit.Camera(world);
    // map: land as a dot matrix over a slightly lighter ground, coastlines, city lights, cables
    const lands = [blob(2300, 4300, 3300, 2700, 3), blob(13800, 4600, 3200, 2900, 8), blob(7600, 7400, 700, 420, 5, 10), blob(8900, 1900, 900, 520, 9, 10)];
    const r = rng(17); let lights = '';
    for (let i = 0; i < 70; i++) { const left = i % 2 === 0, x = left ? 900 + r() * 4300 : 11000 + r() * 4300, y = 2200 + r() * 4600; lights += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(10 + r() * 16).toFixed(0)}" fill="#ffd89a" opacity="${(0.25 + r() * 0.45).toFixed(2)}"/>`; }
    const cableRoutes = [[L1, [7000, 3500], [9200, 3700], L2], [L1, [7200, 4500], [9100, 4700], L2], [[5100, 3300], [7500, 2600], [9800, 2900], [11000, 3500]], [[5300, 5100], [7400, 5900], [9500, 5800], [10900, 5300]], [L1, [6800, 6100], [9200, 6600], L2]];
    world.append(kit.h(`<svg width="16000" height="9000" viewBox="0 0 16000 9000" style="position:absolute;left:0;top:0;overflow:visible">
      <defs><pattern id="dots" width="90" height="90" patternUnits="userSpaceOnUse"><circle cx="45" cy="45" r="11" fill="#263753"/></pattern></defs>
      ${lands.map(d => `<path d="${d}" fill="#121d30"/>`).join('')}<g class="dotsl">${lands.map(d => `<path d="${d}" fill="url(#dots)"/>`).join('')}</g>${lands.map(d => `<path d="${d}" fill="none" stroke="#22324c" stroke-width="10"/>`).join('')}
      <g class="lights">${lights}</g>
      <g class="cables" fill="none" stroke="${C.cable}" stroke-linecap="round">${cableRoutes.map(rt => `<path d="M${catmull(rt).map(p => p.map(v => v.toFixed(0)).join(' ')).join(' L')}"/>`).join('')}</g>
      <g class="stations" fill="#2f4a70">${[L1, L2].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="40"/>`).join('')}</g>
      <g class="trails" fill="none" stroke="${C.amber}" stroke-linecap="round" stroke-linejoin="round"></g></svg>`));
    cables = world.querySelector('.cables'); trailsG = world.querySelector('.trails'); this.lights = world.querySelector('.lights'); this.dots = world.querySelector('.dotsl');

    const phone = (P, name, color, msgs) => {
      const el = kit.h(`<div class="phone" style="left:${P.x - 260}px;top:${P.y - 530}px"><div class="screen">
        <div class="bar"><div class="av" style="background:${color}">${name[0]}</div><div class="nm">${name}</div></div>
        <div class="msgs">${msgs}</div>
        <div class="composer"><span class="field"></span><i class="caret"></i><div class="send"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 18V5M5 10.5 11 4.5l6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
        <div class="tap"></div></div><div class="island"></div></div>`);
      world.append(el); return el;
    };
    phoneA = phone(A, 'Leo', '#4f7cff', `<div class="b in">Dinner tomorrow?</div><div class="b out sent">${MSG}</div>`);
    phoneB = phone(B, 'Maya', '#e0607e', `<div class="b out">Dinner tomorrow?</div><div class="b in got">${MSG}</div><div class="b out rep">${REPLY}</div>`);
    fieldA = phoneA.querySelector('.field'); caretA = phoneA.querySelector('.caret'); sendA = phoneA.querySelector('.send'); tapA = phoneA.querySelector('.tap'); bubA = phoneA.querySelector('.sent');
    fieldB = phoneB.querySelector('.field'); caretB = phoneB.querySelector('.caret'); sendB = phoneB.querySelector('.send'); bubB = phoneB.querySelector('.got'); replyB = phoneB.querySelector('.rep');
    typedA = kit.typist(MSG, TT.type, 6.2, 3);
    typedB = kit.typist(REPLY, TT.reply - 0.7, 7, 5);

    // Word tiles: measured where each word sits in the sent bubble (A) and in the received bubble (B).
    const wa = TextFx.split(bubA), wb = TextFx.split(bubB);
    const centre = el => { const o = kit.offset(el, world); return [o.x + o.w / 2, o.y + o.h / 2, o.w]; };
    wa.forEach((w, i) => {
      const a = centre(w), b = centre(wb[i]);
      const late = i === 2;                                   // "at" takes the long way round
      const sea = late ? [[6600, 6900], [8600, 7900], [10200, 6500]] : [[7000, 3900 + i * 140], [9100, 4100 + i * 140]];
      const pts = [[a[0], a[1]], [A.x + 170 + (i - 1.5) * 40, A.y - 120], [A.x + 60 + (i - 1.5) * 90, A.y - 700],   // up the right side, clear of the older bubble
         [A.x + 900, A.y - 450], L1, ...sea, L2, [B.x - 1000, b[1] - 60], ...(late ? [[b[0] - 240, b[1] + 300], [b[0] + 60, b[1] + 90]] : [[b[0] - 420, b[1]]]), [b[0], b[1]]];   // fast words slide in along the row; the late one rises into its gap from the empty space below
      tracks.push(track(pts));
      const tile = kit.h(`<div class="tile">${w.textContent}</div>`); world.append(tile);
      tiles.push({ el: tile, i, late, w: a[2] + 32, start: a, end: b, d: TT.lift + i * 0.1 });
    });
    ms = kit.h('<div class="ms"><span>0 ms</span></div>'); kit.stage.append(ms);
    endc = kit.h('<div class="endc"><div class="words"><div class="w1">Delivered.</div><div class="w2">Across an ocean in 48 milliseconds.</div></div><div class="concept">Concept film · simplified network, not to scale</div></div>');
    kit.stage.append(endc); w1 = endc.querySelector('.w1'); w2 = endc.querySelector('.w2');
    endMarks = new kit.Marks(kit.svgLayer(endc));
    endMarks.add({ kind: 'check', x: 1410, y: 470, size: 70, t0: TT.end + 0.9, dur: .4, color: C.amber, width: 9 });

    cam.set([
      { t: 0, cx: A.x, cy: A.y + 250, z: 1.45, drift: [0, -4, .006] },                       // close on the composer
      { t: TT.send + 0.6, from: TT.send - 0.1, cx: A.x, cy: A.y + 120, z: 1.2 },            // see the bubble land
      { t: TT.lift + 0.9, from: TT.lift - 0.1, cx: A.x, cy: A.y - 160, z: 0.95, ease: eio }, // follow the words up
      { t: TT.out1, from: TT.out0, cx: 8100, cy: 4700, z: 0.112, ease: eio, drift: [40, 0, .006] }, // powers of ten
      { t: TT.in1, from: TT.in0, cx: B.x, cy: B.y + 150, z: 1.22, ease: eio, drift: [0, -3, .005] },
      { t: TT.end + 0.4, from: TT.end - 0.9, cx: B.x, cy: B.y + 100, z: 0.55, ease: eio },
    ]);
  },

  render(t, kit) {
    const s = cam.apply(t), z = s.z;
    cables.setAttribute('stroke-width', (2.4 / z).toFixed(1));
    this.lights.setAttribute('opacity', clamp01((0.7 - z) / 0.4).toFixed(2));          // city lights belong to the map scale
    this.dots.setAttribute('opacity', (0.3 + 0.7 * clamp01((0.9 - z) / 0.6)).toFixed(2));

    // ── Phone A: typing, tap, the bubble lands, then comes apart
    const txt = typedA.at(t);
    fieldA.textContent = t < TT.send ? txt : '';
    caretA.style.opacity = t < TT.send ? (typedA.done(t) ? kit.caret(t) : 1) : kit.caret(t) * 0.6;
    sendA.classList.toggle('on', t < TT.send + 0.2 && txt.length > 0);
    const tp = seg(t, TT.send - 0.05, TT.send + 0.35);
    tapA.style.opacity = tp > 0 && tp < 1 ? (1 - tp) * 0.9 : 0; tapA.style.transform = `translate(${A.x - 260 + 0}px,0) scale(${0.6 + tp * 0.8})`;
    tapA.style.left = '446px'; tapA.style.top = '958px';
    const land = eo(seg(t, TT.send, TT.send + 0.35));
    bubA.style.opacity = t < TT.send ? 0 : (t < TT.split ? land : 0);
    bubA.style.transform = `translateY(${(1 - land) * 40}px) scale(${lerp(.9, 1, land)})`;

    // ── The words: chips that leave phone A, cross the ocean, land in phone B
    let trailD = '';
    for (const tl of tiles) {
      const tr = tracks[tl.i];
      const fast = [[tl.d, 0], [tl.d + 1.1, 0.07, eio], [TT.out1, 0.22], [TT.cross1, 0.86, kit.lin], [TT.in1 - 0.2 + (3 - tl.i) * 0.1, 0.985, eio], [TT.in1 + 0.35 + (3 - tl.i) * 0.14, 1, eo]];   // rightmost lands first, so no word slides over another
      const slow = [[tl.d, 0], [tl.d + 1.1, 0.07, eio], [TT.out1, 0.2], [TT.cross1, 0.66, kit.lin], [TT.in1 + 0.5, 0.93, eio], [TT.late, 1, eo]];
      const u = keys(t, tl.late ? slow : fast);
      const split = eo(seg(t, TT.split, TT.split + 0.4));
      let [x, y] = u > 0 ? tr.at(u) : tl.start;
      if (u <= 0) x += (tl.i - 1.5) * 40 * split;                                            // the bubble comes apart
      const vis = t >= TT.split && t < TT.read + 0.25;
      tl.el.style.display = vis ? '' : 'none';
      if (!vis) continue;
      const arrivedSoon = u >= 1 ? 1 : seg(u, 0.97, 1);
      x += tl.i * 36 * arrivedSoon * (1 - (u >= 1 ? eo(seg(t, TT.late + 0.05, TT.read)) : 0));   // chips wait spread apart, then close up into one line
      const k = Math.max(1, 20 / (60 * z));                                                  // never smaller than ~20 px on screen
      const arrived = u >= 1, white = arrived ? eo(seg(t, TT.late + 0.1, TT.read)) : 0;
      tl.el.style.transform = `translate(${x - tl.w / 2}px,${y - 30}px) scale(${k * (arrived ? 1 : 1 + 0.06 * Math.sin(t * 9 + tl.i))})`;
      tl.el.style.width = tl.w + 'px'; tl.el.style.padding = '0'; tl.el.style.boxSizing = 'border-box'; tl.el.style.textAlign = 'center';
      tl.el.style.color = `rgba(18,24,33,${(clamp01((z - 0.25) / 0.35) * (1 - white)).toFixed(3)})`;
      tl.el.style.background = `rgba(255,181,71,${(1 - white).toFixed(3)})`;   // the chip melts into the real bubble
      tl.el.style.boxShadow = z < 0.5 ? `0 0 ${(18 / z).toFixed(0)}px ${(6 / z).toFixed(0)}px rgba(255,181,71,.55)` : 'none';

      // a short glowing trail behind each word while it travels
      if (u > 0.02 && u < 0.995) { const pts = tr.upto(u - (tl.late ? 0.12 : 0.16), u); if (pts.length > 1) trailD += 'M' + pts.map(p => p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join(' L') + ' '; }
    }
    if (trailsG._d !== trailD) { trailsG.innerHTML = trailD ? `<path d="${trailD}"/>` : ''; trailsG._d = trailD; }
    trailsG.setAttribute('stroke-width', (5 / z).toFixed(1)); trailsG.setAttribute('opacity', (0.85 * clamp01((0.6 - z) / 0.3)).toFixed(2));

    // ── Phone B: the bubble is whole once the late word lands; then the reply
    bubB.style.opacity = seg(t, TT.late + 0.1, TT.read);
    const rt = typedB.at(t);
    fieldB.textContent = t < TT.reply ? rt : '';
    caretB.style.opacity = t > TT.read && t < TT.reply ? (typedB.done(t) ? kit.caret(t) : 1) : 0;
    sendB.classList.toggle('on', rt.length > 0 && t < TT.reply + 0.2);
    const rp = eo(seg(t, TT.reply, TT.reply + 0.35));
    replyB.style.opacity = t < TT.reply ? 0 : rp;
    replyB.style.transform = `translateY(${(1 - rp) * 40}px) scale(${lerp(.9, 1, rp)})`;

    // ── The clock: from the tap to the last word landing
    const msv = Math.round(48 * clamp01((t - TT.send) / (TT.late - TT.send)));
    const msIn = Math.min(eo(seg(t, TT.out0 + 0.4, TT.out0 + 0.8)), 1 - seg(t, TT.read + 0.4, TT.read + 0.8));
    ms.style.opacity = msIn; ms.style.transform = `translateY(${(1 - msIn) * 16}px)`;
    const label = msv + ' ms'; if (ms.firstChild.textContent !== label) ms.firstChild.textContent = label;
    ms.firstChild.style.boxShadow = t > TT.late && t < TT.late + 0.6 ? '0 0 0 2px #ffb547' : '0 0 0 1px #2b3954';

    // ── End card: night closes in, the word lands, a check draws, and the card keeps creeping
    const e = eio(seg(t, TT.end - 0.6, TT.end + 0.2));
    endc.style.display = e > 0 ? '' : 'none';
    world.style.display = e >= 0.999 ? 'none' : '';
    if (e > 0) {
      endc.style.background = `rgba(11,20,34,${0.92 * e})`;
      TextFx.rise(w1, t, TT.end, { stagger: .1, dur: .7, ease: eoq });
      TextFx.in(w2, t, TT.end + 0.5, { from: 'bottom', d: 20, stagger: .06 });
      const creep = Math.max(0, t - TT.end) * 2;
      endc.querySelector('.words').style.transform = `translateY(${-creep}px)`;
      endMarks.svg.style.transform = `translateY(${-creep}px)`;
      endMarks.render(t);
      endc.querySelector('.concept').style.opacity = 0.9 * eo(seg(t, TT.end + 1.6, TT.end + 2.2));
    }
  },

  score(S, kit) {
    const BPM = 88, B = 60 / BPM;
    S.tempo(BPM, { t0: TT.out0 - 8 * B });
    S.program('pad', 'pad', { rev: .7 }); S.program('pl', 'pluck', { pan: .2 }); S.program('gl', 'glock', { gain: -8 }); S.program('bass', 'bass'); S.program('keys', 'ep', { gain: -3 });
    S.chord('pad', ['A2', 'E3', 'B3', 'C#4'], { t: 0, dur: TT.out0 + 1, vel: 42 });
    S.ticks(kit.typing.times.filter(x => x < TT.send), { vel: 30 });
    S.fx('click', TT.send, { vel: 70 }); S.fx('pop', TT.send + 0.1, { vel: 60 });
    [0, 1, 2, 3].forEach(i => S.fx('pop', TT.split + 0.05 + i * 0.07, { vel: 40 + i * 4 }));
    S.fx('whoosh', TT.out0 + 0.2, { dur: TT.out1 - TT.out0, vel: 60 });
    // the crossing: a pulse that travels, pad opens
    S.chord('pad', ['F#2', 'C#3', 'A3', 'E4'], { t: TT.out0 + 0.8, dur: TT.in1 - TT.out0, vel: 50 });
    const b0 = Math.round(S.toBeat(TT.out1 - 0.3)), b1 = Math.round(S.toBeat(TT.in1));
    const notes = ['C#5', 'E5', 'A5', 'B5', 'E5', 'G#5', 'B5', 'C#6'];
    for (let b = b0, i = 0; b < b1; b += 1, i++) { S.note('pl', notes[i % 8], { beat: b, beats: .9, vel: 52 + (i % 4) * 4 }); if (i % 4 === 0) S.note('bass', ['F#1', 'D2', 'A1', 'E2'][(i / 4) % 4], { beat: b, beats: 3.6, vel: 70 }); if (i % 2 === 0) S.drum('shaker', { beat: b + .5, vel: 50 }); }
    // arrivals: a note per word landing, the late one last
    [0, 1, 3].forEach((i, k) => S.note('gl', ['E5', 'G#5', 'B5'][k], { t: TT.in1 + 0.35 + i * 0.12, dur: .8, vel: 55 }));
    S.chord('pad', ['A2', 'E3', 'B3', 'C#4'], { t: TT.in1 - 0.2, dur: TT.end - TT.in1 + 0.2, vel: 40 });
    S.fx('whoosh', TT.late - 0.45, { dur: 0.45, vel: 45 }); S.fx('chime', TT.late, { vel: 70, pitch: 'E6' });
    S.ticks(kit.typing.times.filter(x => x > TT.read), { vel: 30 });
    S.fx('click', TT.reply, { vel: 70 }); S.fx('pop', TT.reply + 0.1, { vel: 60 });
    S.run('gl', ['A4', 'C#5', 'E5', 'A5'], { t: TT.end - 0.45, step: .11, vel: 48, cresc: 6 });
    S.chord('keys', ['A2', 'E3', 'C#4', 'E4', 'B4'], { t: TT.end, dur: 3.6, vel: 68, spread: .02 }); S.note('bass', 'A1', { t: TT.end, dur: 3.4, vel: 82 });
    S.chord('pad', ['A2', 'E3', 'C#4', 'G#4'], { t: TT.end, dur: DUR - TT.end, vel: 50 });
    S.drum('kick', { t: TT.end, vel: 96 }); S.fx('sparkle', TT.end + 0.9, { vel: 45 });
    S.master({ fadeOut: 1.6 });
  },
};
