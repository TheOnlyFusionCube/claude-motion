// Meridian — "See the morning before it happens."
// A 34 s launch-style film for a FICTIONAL bike-share ops tool (concept, invented data).
// Structure: title → the title becomes the question in the app → answer + chart builds →
// push into the dip → through the chart into a 3D city → comment on Harbor → replay with the fix → end card.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const { seg, lerp, clamp01, eo, eio, eob, eix, eoq, spring, keys, smoothstep, TextFx, rng } = kit;
const W = 1920, H = 1080;
const C = { paper: '#f3f1ec', ink: '#161b22', cobalt: '#3355ff', verm: '#ff5a36', muted: '#6b7280' };

// ───────── Timeline: one cascade of named beats. Retime one, everything after follows. ─────────
const TT = {};
TT.title = -0.6;                 // first words already up at frame 0 (thumbnail)
TT.handoff = 2.35;               // title travels into the composer
TT.win = TT.handoff + 0.1;       // window assembles around it
TT.ask = 4.55;                   // cursor clicks Ask
TT.reply = TT.ask + 0.55;        // reply streams
TT.pull = TT.ask + 0.45;         // camera pulls back to show the answer area
TT.chart = 5.9;                  // chart lines draw
TT.chartEnd = TT.chart + 3.1;
TT.push = 7.1;                  // push into the dip while it is still drawing
TT.circle = 8.95;                // hand-drawn circle on the dip
TT.callout = 9.25;
TT.mapBtn = 11.15;               // cursor clicks "Show on map"
TT.whip = 11.55;                 // push through the chart…
TT.city = 12.05;                 // …into the city
TT.run0 = 13.5; TT.run1 = 20.3;  // clock 6:00 → 8:40
TT.harbor = 19.1;                // camera settles on Harbor
TT.pin = 20.95;                  // click to comment
TT.type = 21.45;                 // typing starts (end set in init)
TT.rew = 23.75; TT.rew1 = 24.75; // rewind 8:40 → 6:30
TT.fwd0 = 24.95; TT.fwd1 = 28.15;// replay with the plan
TT.rise = 28.35;                 // camera rises, city dissolves
TT.logo = 29.3;                 // pin lands, becomes the mark
TT.end = 34.0;

// ───────── Data (invented): stations, bikes by hour. Chart and city read the SAME functions. ─────────
const R = rng(11);
const DIST = [
  { id: 'downtown', name: 'Downtown', c: [6, -20] },
  { id: 'oldtown', name: 'Old Town', c: [-66, -30] },
  { id: 'univ', name: 'University', c: [66, -50] },
  { id: 'river', name: 'Riverside', c: [-58, 22] },
  { id: 'harbor', name: 'Harbor', c: [54, 24] },
];
const nearInter = (cx, cz, n) => { const pts = []; for (let i = -12; i <= 12; i++) for (let j = -9; j <= 3; j++) pts.push([i * 12 + 6, j * 12 + 6]); return pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz)).slice(0, n); };
const STATIONS = [];
for (const d of DIST) {
  const pts = d.id === 'harbor' ? [[30, 18], [42, 18], [54, 18], [66, 18], [78, 18], [42, 30], [54, 30], [66, 30]] : nearInter(d.c[0], d.c[1], 7);
  pts.forEach((p, k) => STATIONS.push({ d: d.id, x: p[0], z: p[1], k, cap: 11 + R() * 8, empty: 7.95 + R() * 0.7, gift: 4 + R() * 2.5 }));
}
const totals = { downtown: h => 60 + 112 * smoothstep(6.8, 9.1, h), oldtown: h => 92 + 7 * Math.sin(h * 2.1), univ: h => 78 + 26 * smoothstep(7.4, 9.6, h), river: h => 74 - 14 * smoothstep(7, 8.6, h) };
// Bikes at one station at hour h; `fixed` = the plan (40 bikes moved to Harbor at 7:30).
function level(s, h, fixed) {
  if (s.d === 'harbor') {
    const drain = smoothstep(7.0 + s.k * 0.04, s.empty, h);
    let v = s.cap * (1 - drain) + 0.4 * smoothstep(9, 10, h) * s.cap * 0.2;
    if (fixed) v += s.gift * spring(seg(h, 7.45, 7.62), { damping: .35, freq: 1.6 });
    return Math.max(0, v);
  }
  const ds = STATIONS.filter(x => x.d === s.d), share = s.cap / ds.reduce((a, x) => a + x.cap, 0);
  return totals[s.d](h) * share;
}
const districtTotal = (id, h) => STATIONS.filter(s => s.d === id).reduce((a, s) => a + level(s, h, false), 0);
const emptyCount = (h, fixed) => STATIONS.filter(s => s.d === 'harbor' && level(s, h, fixed) < 0.8).length;

// Film time → city clock (hour) and whether we are replaying with the plan.
function clockAt(t) {
  if (t < TT.rew) return { h: lerp(6, 8 + 40 / 60, seg(t, TT.run0, TT.run1)), fixed: false };
  if (t < TT.fwd0) return { h: lerp(8 + 40 / 60, 6.5, eio(seg(t, TT.rew, TT.rew1))), fixed: false };
  return { h: lerp(6.5, 8 + 40 / 60, seg(t, TT.fwd0, TT.fwd1)), fixed: true };
}
const fmtClock = h => { const m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60; return [`${hh}:${String(mm).padStart(2, '0')}`, 'AM']; };

// ───────── state built in init ─────────
let world, cam, win, title, ph, q, reply, status, card, chartPaths = [], dip, callout, marks, curA, curB, typed;
let three, hud, clockV, clockBar, emptyEl, emptyV, tags = {}, bubble, bubbleTxt, pinEl, endc, wordmark, tagline, endMarks, logo, concept, chip;
const QUESTION = 'Where do the bikes go at 8 a.m.?';
const COMMENT = 'Move 40 bikes here by 7:30';
const REPLY = 'Harbor runs out of bikes by 8:40, while Downtown fills up.';
const CH = { x: 580, y: 446, w: 1000, h: 300 }; // chart box in scene space (window at 240, 90)
const chartX = h => CH.x + ((h - 6) / 4) * CH.w, chartY = v => CH.y + CH.h - (v / 200) * CH.h;

export default {
  title: 'Meridian — see the morning before it happens',
  width: W, height: H, fps: 30, duration: TT.end, background: C.paper,
  css: ['film.css'],
  chapters: [{ t: 0, label: 'The question' }, { t: TT.ask, label: 'The answer' }, { t: TT.city, label: 'The city at 8 a.m.' }, { t: TT.pin, label: 'A plan' }, { t: TT.rise, label: 'Meridian' }],

  async init(kit) {
    // Paint order: WebGL city → DOM world (app, under a camera) → HUD → title → end card → marks → cursors.
    three = buildCity(kit);
    world = kit.layer('world');
    cam = new kit.Camera(world);
    world.append(kit.h(`<div class="win">
      <div class="side">
        <div class="brand">${LOGO(26)}Meridian</div>
        <div class="nav"><div class="on">Ask</div><div>Live map</div><div>Stations</div><div>Rebalancing</div></div>
        <div class="navh">SAVED</div>
        <div class="nav"><div>Monday rush</div><div>Weekend parks</div><div>Rain days</div></div>
      </div>
      <div class="top"><h3>Morning operations</h3><span class="crumb">/ Tuesday</span>
        <span class="live"><i></i>Live · 214 stations</span>
        <div class="av" style="background:#8a6cf0">AK</div></div>
      <div class="main">
        <div class="answer"><div class="q"><div class="av" style="background:#8a6cf0">AK</div><span>${QUESTION}</span></div>
          <div class="status"><span class="dots"><i></i><i></i><i></i></span><span>Reading 214 stations, 6–10 a.m.</span></div>
          <div class="reply"></div></div>
        <div class="card"><div class="hd">Bikes docked, by district</div><div class="sub">Tuesday · 6–10 a.m.</div>
          <div class="btn">${PINSVG}Show on map</div>
          <svg class="chart" width="${CH.w}" height="${CH.h}" viewBox="0 0 ${CH.w} ${CH.h}"></svg>
          <div class="legend"><span><i style="background:${C.verm}"></i>Harbor</span><span><i style="background:${C.cobalt}"></i>Downtown</span><span><i style="background:#c9ccd2"></i>Other districts</span></div></div>
        <div class="empty-state"><div class="hi">Good morning, Aiko</div><div class="sug"><span>Which stations ran empty yesterday?</span><span>Compare with last Tuesday</span><span>Where should vans start?</span></div></div>
        <div class="composer"><span class="ph">${QUESTION}</span><div class="ask">Ask ${ARROW}</div></div>
      </div></div>`));
    win = kit.$('.win'); ph = kit.$('.ph'); q = kit.$('.q'); reply = kit.$('.reply'); status = kit.$('.status'); card = kit.$('.card');
    const svg = kit.$('.chart');
    // grid + hour labels
    for (let hr = 6; hr <= 10; hr++) { const x = chartX(hr) - CH.x; svg.append(kit.svg(`<line x1="${x}" x2="${x}" y1="0" y2="${CH.h}" stroke="#efece6" stroke-width="1.5"/>`)); svg.append(kit.svg(`<text x="${x}" y="${CH.h + 24}" text-anchor="middle">${hr} a.m.</text>`)); }
    const series = [['oldtown', '#c9ccd2', 3], ['univ', '#c9ccd2', 3], ['river', '#c9ccd2', 3], ['downtown', C.cobalt, 4], ['harbor', C.verm, 5]];
    for (const [id, col, w] of series) {
      let d = ''; for (let i = 0; i <= 160; i++) { const h = 6 + (i / 160) * 4; const v = id === 'harbor' ? districtTotal('harbor', h) : totals[id](h); d += (i ? 'L' : 'M') + (chartX(h) - CH.x).toFixed(1) + ' ' + (chartY(v) - CH.y).toFixed(1); }
      const p = kit.svg(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/>`);
      svg.append(p); chartPaths.push(p);
    }
    dip = kit.svg(`<circle r="9" fill="${C.verm}" stroke="#fff" stroke-width="4"/>`); svg.append(dip);
    const dipH = 8 + 40 / 60, dipP = [chartX(dipH), chartY(districtTotal('harbor', dipH))];
    this.dipP = dipP;
    dip.setAttribute('cx', dipP[0] - CH.x); dip.setAttribute('cy', dipP[1] - CH.y);
    callout = kit.h(`<div style="position:absolute;left:${dipP[0] + 30}px;top:${dipP[1] - 92}px;white-space:nowrap;padding:12px 18px;border-radius:12px;background:#fff;box-shadow:0 10px 26px -10px rgba(22,27,34,.35),0 0 0 1px rgba(22,27,34,.06);font:600 26px/1 var(--sans);letter-spacing:-0.015em;color:var(--ink)">Harbor is empty by 8:40</div>`);
    world.append(callout);
    marks = new kit.Marks(kit.svgLayer(world, { w: W, h: H }));
    marks.add({ kind: 'circle', x: dipP[0] - 46, y: dipP[1] - 34, w: 92, h: 60, pad: 10, t0: TT.circle, dur: .45, color: C.ink, width: 4, out: TT.whip - 0.1 });

    // Camera (DOM world). Keys in scene px; the window spans 240..1680 × 90..990.
    cam.set([
      { t: 0, cx: 1084, cy: 712, z: 1.62, drift: [-4, -3, .006] },
      { t: TT.pull + 1.0, from: TT.pull, cx: 1090, cy: 556, z: 1.13, drift: [0, -2, .004] },
      { t: TT.push + 0.9, from: TT.push, cx: dipP[0] - 70, cy: dipP[1] - 70, z: 2.25, drift: [5, -1, .012] },
      { t: TT.mapBtn - 0.15, from: TT.mapBtn - 0.95, cx: dipP[0] + 10, cy: dipP[1] - 150, z: 1.62, drift: [2, 0, .01] },
      { t: TT.city + 0.45, from: TT.whip, cx: dipP[0], cy: dipP[1] - 40, z: 4.6, ease: eix },
    ]);

    // Title (stage space) — becomes the question.
    title = kit.h(`<div class="title">${QUESTION}</div>`); kit.stage.append(title);
    this.titleW = title.offsetWidth;

    // Cursor A rides the DOM camera.
    curA = kit.cursor({ cam });
    const askC = kit.center(kit.$('.ask')), btnC = kit.center(kit.$('.card .btn'));
    curA.keys = [{ t: 3.0, at: [1500, 1080] }, { t: TT.ask - 0.12, from: 3.45, at: () => askC(), bow: .1 }, { t: TT.ask + 1.4, at: () => [askC()[0] - 60, askC()[1] + 30] },
      { t: TT.mapBtn - 0.1, from: TT.mapBtn - 0.95, at: () => btnC(), bow: -.12 }];
    curA.clicks = [TT.ask, TT.mapBtn];
    curA.visible = t => Math.min(eo(seg(t, 3.0, 3.4)), 1 - seg(t, TT.whip + .1, TT.whip + .4));

    // HUD over the city
    hud = kit.h(`<div class="hud">
      <div class="clock"><div class="k">TUESDAY</div><div class="v"><span>6:00</span><small>AM</small></div><div class="bar"><i></i></div></div>
      <div class="empty"><div class="k">EMPTY STATIONS</div><div class="v">0</div></div>
      <div class="chipr" style="position:absolute;left:0;width:1920px;bottom:64px;text-align:center"><span style="display:inline-block;padding:14px 22px;border-radius:999px;background:var(--ink);color:#fff;font:500 22px/1 var(--sans)">Replaying Tuesday with 40 bikes moved at 7:30</span></div>
    </div>`); kit.stage.append(hud);
    clockV = hud.querySelector('.clock .v span'); clockBar = hud.querySelector('.clock .bar i'); emptyEl = hud.querySelector('.empty'); emptyV = emptyEl.querySelector('.v'); chip = hud.querySelector('.chipr');
    for (const d of DIST) { const el = kit.h(`<div class="tag"><div class="p"><i></i>${d.name}</div>${d.id === 'harbor' ? '<div class="s">12 bikes</div>' : ''}</div>`); hud.append(el); tags[d.id] = el; }
    tags.harbor.querySelector('i').style.background = C.verm;
    bubble = kit.h(`<div class="bubble"><div class="who"><div class="av" style="background:#8a6cf0;width:28px;height:28px;font-size:11px">AK</div>Aiko <span>· now</span></div><div class="txt"><span></span><i class="caret"></i></div><div class="send">${ARROW}</div></div>`);
    hud.append(bubble); bubbleTxt = bubble.querySelector('.txt span');
    pinEl = kit.h(`<div style="display:none;position:absolute;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:#8a6cf0;border:4px solid #fff;box-sizing:border-box;box-shadow:0 6px 16px -4px rgba(22,27,34,.45);color:#fff;font:600 13px/36px var(--sans);text-align:center">AK</div>`);
    typed = kit.typist(COMMENT, TT.type, 21, 4);
    TT.send = typed.end + 0.4;

    // End card
    endc = kit.h(`<div class="endc"><div class="wordmark">Meridian</div><div class="tagline">See the morning before it happens.</div><div class="concept">Concept film · fictional product and data</div></div>`);
    kit.stage.append(endc);
    wordmark = endc.querySelector('.wordmark'); tagline = endc.querySelector('.tagline'); concept = endc.querySelector('.concept');
    logo = kit.h(`<svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080"><g class="lg"><circle cx="0" cy="0" r="48" fill="none" stroke="${C.ink}" stroke-width="7" pathLength="1" stroke-dasharray="1 1"/><path d="M0 -48 C 26 -20, 26 20, 0 48" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/></g><circle class="dot" r="13" fill="${C.cobalt}"/></svg>`);
    endc.append(logo);
    kit.stage.append(pinEl);
    endMarks = new kit.Marks(kit.svgLayer(endc));
    // underline "before" — measure the word inside the centred tagline
    const words = TextFx.split(tagline); const bw = words[3];
    const r = kit.offset(bw, endc);
    endMarks.add({ kind: 'underline', x: r.x - 4, y: r.y + r.h + 4, w: r.w + 8, wave: 3, t0: TT.logo + 1.55, dur: .4, color: C.cobalt, width: 7 });

    // Cursor B lives in stage space over the city.
    curB = kit.cursor();
    const harborAt = () => three.proj(54, 2, 24, three.camAt(TT.pin));
    curB.keys = [{ t: TT.pin - 0.85, at: [1500, 1040] }, { t: TT.pin - 0.08, at: () => harborAt(), bow: .14 },
      { t: TT.send - 0.05, from: TT.send - 0.6, at: () => { const a = harborAt(); return [a[0] + 380, a[1] - 46]; } }, { t: TT.send + 0.9, at: () => { const a = harborAt(); return [a[0] + 460, a[1] + 60]; } }];
    curB.clicks = [TT.pin, TT.send];
    curB.shapes = [{ spans: [[TT.pin + 0.2, TT.send - 0.6]], gfx: kit.cursors.text }];
    curB.visible = t => Math.min(eo(seg(t, TT.pin - 0.85, TT.pin - 0.5)), 1 - seg(t, TT.send + 0.4, TT.send + 0.8));
  },

  render(t, kit) {
    const s = cam.apply(t);

    // ── Title → question (0 – 3.1 s)
    {
      const p = eio(seg(t, TT.handoff, TT.handoff + 0.75));
      const ts = 1 - 0.0 * p; const start = [(W - this.titleW) / 2, 474];
      const tgt = cam.toStage([578, 919 - 15], TT.handoff + 0.75);
      const k = (24 * cam.at(TT.handoff + 0.75).z) / 132 * 1.06;
      const x = lerp(start[0], tgt[0], p), y = lerp(start[1], tgt[1], p) - 4 * Math.min(t, 2.4); // slow creep up on the hold
      title.style.transform = `translate(${x}px,${y + 8 * p}px) scale(${lerp(1, k, p) * ts})`;
      TextFx.rise(title, t, TT.title, { stagger: .07, dur: .55, d: 30 });
      title.style.opacity = 1 - seg(t, TT.handoff + 0.55, TT.handoff + 0.78);
      title.style.display = t > TT.handoff + 0.8 ? 'none' : '';
    }
    // ── The app window
    {
      const p = eo(seg(t, TT.win, TT.win + 0.6));
      world.style.opacity = Math.min(p, 1 - seg(t, TT.city, TT.city + 0.3));
      world.style.display = t > TT.city + 0.4 ? 'none' : '';
      win.style.transform = `scale(${lerp(0.965, 1, p)})`;
      ph.style.opacity = Math.min(seg(t, TT.handoff + 0.6, TT.handoff + 0.8), 1 - eo(seg(t, TT.ask + 0.05, TT.ask + 0.3)));
      kit.$('.ask').style.background = t >= TT.ask - 0.02 && t < TT.ask + 0.25 ? '#3a4150' : '';
      kit.show(q, t, TT.ask + 0.2, Infinity, { dur: .4, dy: 14 });
      { const es = kit.$('.empty-state'); const o = 1 - eio(seg(t, TT.ask + 0.02, TT.ask + 0.3)); es.style.opacity = o; es.style.display = o <= 0 ? 'none' : ''; es.style.transform = `translateY(${(1 - o) * -10}px)`; }
      const st = Math.min(eo(seg(t, TT.ask + 0.3, TT.ask + 0.6)), 1 - seg(t, TT.reply + 0.35, TT.reply + 0.6));
      status.style.opacity = st; status.style.display = st <= 0 ? 'none' : '';
      status.querySelectorAll('.dots i').forEach((d, i) => { d.style.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 7 - i * .9)); });
      reply.textContent = kit.streamed(REPLY, t, TT.reply + 0.5, 60, 5);
      // chart card + lines draw on (pathLength = 1)
      kit.show(card, t, TT.chart - 0.5, Infinity, { dur: .5, dy: 18 });
      chartPaths.forEach((p, i) => { const k = eio(seg(t, TT.chart + i * 0.08, TT.chartEnd + i * 0.08)); p.setAttribute('stroke-dashoffset', 1 - k); });
      const dk = eob(seg(t, TT.chart + (2.67 / 4) * 3.1 + 0.15, TT.chart + (2.67 / 4) * 3.1 + 0.55), 1.7);
      dip.setAttribute('r', 9 * dk * kit.breathe(t, .06, 1.2));
      dip.style.opacity = dk > 0 ? 1 : 0;
      TextFx.in(callout, t, TT.callout + 0.15, { from: 'right', d: 20, stagger: .08 });
      { const cp = eo(seg(t, TT.callout, TT.callout + 0.35)); callout.style.opacity = cp; callout.style.transform = `translate(${(1 - cp) * 14}px,0) scale(${lerp(.96, 1, cp)})`; }
      marks.render(t);
      curA.render(t);
    }

    // ── City (12 – 30.5 s)
    const { h, fixed } = clockAt(t);
    const cityOn = t > TT.city - 0.25;
    three.canvas.style.display = cityOn ? '' : 'none';
    if (cityOn) {
      three.canvas.style.opacity = eo(seg(t, TT.city, TT.city + 0.35));
      three.render(t, h, fixed);
    }
    // HUD
    hud.style.display = cityOn && t < TT.logo + 0.5 ? '' : 'none';
    if (cityOn) {
      const hudOut = 1 - eo(seg(t, TT.rise, TT.rise + 0.5));
      const clk = hud.querySelector('.clock');
      clk.style.opacity = Math.min(eo(seg(t, TT.city + 0.9, TT.city + 1.3)), hudOut); clk.style.transform = `translateY(${(1 - eo(seg(t, TT.city + 0.9, TT.city + 1.3))) * -14}px)`;
      const [hm, ap] = fmtClock(h); if (clockV.textContent !== hm) clockV.textContent = hm;
      clockBar.style.width = ((h - 6) / 4 * 100).toFixed(2) + '%';
      clockBar.style.background = fixed ? C.cobalt : C.ink;
      const ec = emptyCount(h, fixed), eIn = Math.min(eo(seg(t, TT.harbor - 1.4, TT.harbor - 1.0)), hudOut);
      emptyEl.style.opacity = eIn; emptyEl.style.transform = `translateY(${(1 - eIn) * -14}px)`;
      if (emptyV.textContent !== String(ec)) emptyV.textContent = String(ec);
      emptyV.style.color = ec > 0 ? C.verm : C.ink;
      chip.style.opacity = Math.min(eo(seg(t, TT.rew + 0.1, TT.rew + 0.5)), 1 - eo(seg(t, TT.fwd1 + 0.1, TT.fwd1 + 0.4)));
      chip.style.transform = `translateY(${(1 - eo(seg(t, TT.rew + 0.1, TT.rew + 0.5))) * 14}px)`;
      // District tags ride with the geometry (projected every frame).
      DIST.forEach((d, i) => {
        const el = tags[d.id], top = d.id === 'harbor' ? 10 : 14;
        const [x, y] = three.proj(d.c[0], top, d.c[1]);
        const a = Math.min(eo(seg(t, TT.city + 1.4 + i * 0.12, TT.city + 1.8 + i * 0.12)), d.id === 'harbor' ? 1 : 1 - seg(t, TT.harbor - 0.6, TT.harbor), 1 - seg(t, TT.rise, TT.rise + 0.4));
        const back = d.id !== 'harbor' ? eo(seg(t, TT.rew + 0.2, TT.rew + 0.6)) * (1 - seg(t, TT.rise, TT.rise + .4)) : 0;
        const op = Math.max(a, back * 0.95);
        el.style.opacity = op; el.style.display = op <= 0 ? 'none' : '';
        el.style.transform = `translate(${x - 20}px,${y - 60}px) scale(${lerp(0.94, 1, op)})`;
      });
      const hs = tags.harbor.querySelector('.s');
      const hb = Math.round(STATIONS.filter(x => x.d === 'harbor').reduce((a, x) => a + level(x, h, fixed), 0));
      const sub = fixed && h > 7.5 ? 'Restocked at 7:30 · ' + hb + ' bikes' : (hb < 1 ? 'Empty' : hb + ' bikes');
      if (hs.textContent !== sub) hs.textContent = sub;
      hs.style.color = !fixed && hb < 8 ? C.verm : C.muted;
      // Comment: bubble scale-fades from its anchor, text types, then folds into a pin.
      const anc = three.proj(54, 2, 24);
      const bIn = eo(seg(t, TT.pin + 0.1, TT.pin + 0.35)), bOut = eio(seg(t, TT.send + 0.15, TT.send + 0.5));
      bubble.style.display = bIn > 0 && bOut < 1 ? '' : 'none';
      bubble.style.opacity = Math.min(bIn, 1 - bOut);
      bubble.style.transform = `translate(${anc[0] + 26}px,${anc[1] - 160}px) scale(${lerp(0.96, 1, bIn) * lerp(1, 0.2, bOut)})`;
      const tx = typed.at(t); if (bubbleTxt.textContent !== tx) bubbleTxt.textContent = tx;
      bubble.querySelector('.caret').style.opacity = typed.done(t) ? kit.caret(t) : 1;
      bubble.querySelector('.send').style.opacity = 0.35 + 0.65 * (typed.done(t) ? 1 : 0);
      // Pin: appears as the bubble folds; at the end it shrinks, then travels and lands as the mark's dot.
      const pIn = eob(seg(t, TT.send + 0.3, TT.send + 0.6), 1.8);
      const leave = seg(t, TT.rise + 0.3, TT.logo);
      const pinS = lerp(1, 0.6, eo(seg(t, TT.rise + 0.2, TT.rise + 0.6)));
      const end = [960 + 0, 330 - 0];
      const [px, py] = [lerp(anc[0], end[0], eio(leave)), lerp(anc[1], end[1], eio(leave)) - Math.sin(Math.PI * leave) * 90];
      pinEl.style.display = pIn > 0 && t < TT.logo + 0.12 ? '' : 'none';
      pinEl.style.transform = `translate(${px}px,${py}px) scale(${pIn * pinS})`;
      pinEl.style.background = leave > 0.5 ? kit.mixColor('#8a6cf0', C.cobalt, seg(leave, .5, 1)) : '#8a6cf0';
      pinEl.style.color = leave > 0.4 ? 'transparent' : '#fff';
      curB.render(t);
    } else { curB.el.style.display = 'none'; pinEl.style.display = 'none'; }

    // ── End card (paper rises over the city; the pin becomes the mark's dot)
    const e = eio(seg(t, TT.rise + 0.6, TT.logo + 0.1));
    endc.style.display = e > 0 ? '' : 'none';
    if (e > 0) {
      endc.style.background = `rgba(243,241,236,${e})`;
      const lt = t - TT.logo, creep = Math.max(0, lt) * 2.2;
      const ring = eo(seg(lt, 0.05, 0.6)), arc = eo(seg(lt, 0.35, 0.8));
      const g = logo.querySelector('.lg'), dot = logo.querySelector('.dot');
      const mk = kit.breathe(t, .008, 3.4);
      g.setAttribute('transform', `translate(960 ${330 - creep * .5}) rotate(${lerp(-40, 0, ring)}) scale(${mk})`);
      g.children[0].setAttribute('stroke-dashoffset', 1 - ring); g.children[1].setAttribute('stroke-dashoffset', 1 - arc);
      // dot settles onto the ring at 45°
      const ang = -Math.PI / 4, ds = eob(seg(lt, 0.15, 0.6), 1.8);
      dot.setAttribute('cx', lerp(960, 960 + Math.cos(ang) * 48, ds)); dot.setAttribute('cy', lerp(330, 330 + Math.sin(ang) * 48, ds) - creep * .5);
      dot.setAttribute('r', lt < 0 ? 0 : 13 * (1 + 0.25 * Math.sin(Math.PI * seg(lt, 0, .3))));
      TextFx.rise(wordmark, t, TT.logo + 0.45, { stagger: .09, dur: .7, d: 36, ease: eoq });
      wordmark.style.transform = `translateY(${-creep}px)`;
      TextFx.in(tagline, t, TT.logo + 0.95, { from: 'bottom', d: 22, stagger: .07, dur: .55 });
      tagline.style.transform = `translateY(${-creep * 0.8}px)`;
      endMarks.svg.style.transform = `translateY(${-creep * 0.8}px)`;
      endMarks.render(t);
      concept.style.opacity = 0.9 * eo(seg(lt, 1.6, 2.2));
    }
  },

  score(S, kit) {
    const BPM = 96, B = 60 / BPM;
    S.tempo(BPM, { t0: TT.ask - 4 * 4 * B + 0 });          // bar line on the Ask click
    const bar = t => Math.round(S.toBeat(t));
    S.program('pad', 'pad', { rev: .6, gain: -4 });
    S.program('keys', 'ep', { rev: .3, gain: -3 });
    S.program('mal', 'marimba', { pan: -.2, gain: -2 });
    S.program('pl', 'pluck', { pan: .25, gain: -5 });
    S.program('bass', 'bass', { gain: -2 });
    S.program('gl', 'glock', { gain: -9, rev: .45 });
    // title: near-silent pad + one mallet note
    S.chord('pad', ['D3', 'A3', 'E4', 'F#4'], { t: 0, dur: TT.ask, vel: 46 });
    S.note('gl', 'A5', { t: 0.05, dur: 1.5, vel: 52 });
    // the question lands
    S.fx('whoosh', TT.handoff + 0.1, { dur: .6, vel: 55 });
    S.fx('click', TT.ask, { vel: 90 });
    // groove A: from Ask to the whip
    const a0 = bar(TT.ask), a1 = bar(TT.whip);
    const progA = [['D3', 'A3', 'C#4', 'F#4'], ['B2', 'F#3', 'A3', 'D4'], ['G2', 'D3', 'F#3', 'B3'], ['A2', 'E3', 'G3', 'C#4']];
    for (let b = a0, i = 0; b < a1 - 0.5; b += 4, i++) {      // last bar may be partial: it runs right up to the whip
      const ch = progA[i % 4];
      S.chord('keys', ch.slice(1), { beat: b, beats: Math.min(3.6, a1 - b), vel: 58 });
      S.note('bass', ch[0].replace(/\d/, m => +m - 1), { beat: b, beats: 1.4, vel: 82 }); S.note('bass', ch[0].replace(/\d/, m => +m - 1), { beat: b + 2.5, beats: .9, vel: 66 });
      S.pattern('mal', 'x.xx.x.x', { from: b, repeat: 1, pitch: [ch[3].replace(/\d/, m => +m + 1), ch[2].replace(/\d/, m => +m + 1), ch[1].replace(/\d/, m => +m + 2)], vel: 60 });
      if (b >= bar(TT.chart)) S.drums({ kick: 'x...x...', sidestick: '..x...x.', shaker: 'oxoxoxox' }, { from: b, vel: 78 });
    }
    S.fx('pop', TT.chart - 0.4, { vel: 60 });
    S.fx('ding', TT.circle + 0.1, { vel: 50, pitch: 'A5' });
    S.fx('click', TT.mapBtn, { vel: 85 });
    // whip through the chart: stop-time, whoosh, then the city opens on a low pad
    S.fx('whoosh', TT.whip, { dur: .9, vel: 95 });
    S.fx('revswell', TT.city + 0.3, { dur: 1.0, vel: 55 });
    S.chord('pad', ['B2', 'F#3', 'D4', 'A4'], { t: TT.city, dur: TT.run0 - TT.city + 2, vel: 54 });
    // groove B under the morning: plucks + bass, a little more tension as Harbor drains
    const b0 = bar(TT.run0), b1 = bar(TT.pin);
    const progB = [['B1', ['D4', 'F#4', 'B4']], ['G1', ['D4', 'G4', 'B4']], ['D2', ['D4', 'F#4', 'A4']], ['A1', ['C#4', 'E4', 'A4']]];
    for (let b = b0, i = 0; b + 4 <= b1 + 0.01; b += 4, i++) {
      const [bn, ch] = progB[i % 4];
      S.pattern('pl', 'x.x.x.xx', { from: b, pitch: [ch[0], ch[2], ch[1], ch[2]].map(p => p.replace(/\d/, m => +m + 1)), vel: 62 });
      S.note('bass', bn.replace(/\d/, m => +m + 1), { beat: b, beats: 2.8, vel: 74 });
      S.chord('pad', ch, { beat: b, beats: 4, vel: 40 });
      S.drums({ kick: 'x..x..x.', hat: '.x.x.x.x' }, { from: b, vel: 70 });
    }
    S.note('gl', 'F5', { t: TT.run1 - 0.1, dur: 1, vel: 58 }); S.note('gl', 'E5', { t: TT.run1 + 0.25, dur: 1.2, vel: 50 });
    // comment: soft pad, ticks per keystroke, send
    S.chord('pad', ['G2', 'D3', 'B3', 'E4'], { t: TT.pin - 0.3, dur: TT.rew - TT.pin + 0.4, vel: 44 });
    S.fx('click', TT.pin, { vel: 80 }); S.fx('pop', TT.pin + 0.12, { vel: 55 });
    S.ticks(kit.typing.times, { vel: 34 });
    S.fx('click', TT.send, { vel: 85 }); S.fx('pop', TT.send + 0.35, { vel: 60 });
    // rewind: reversed whoosh + roll, then the replay groove brightens
    S.fx('whoosh', TT.rew + 0.5, { dur: 1.0, vel: 70, into: 1 });
    S.fx('roll', TT.rew, { dur: TT.rew1 - TT.rew, vel: 52 });
    const c0 = bar(TT.fwd0), c1 = bar(TT.rise);
    const progC = [['D2', ['F#4', 'A4', 'D5']], ['A1', ['E4', 'A4', 'C#5']], ['B1', ['F#4', 'B4', 'D5']], ['G1', ['G4', 'B4', 'D5']]];
    for (let b = c0, i = 0; b + 2 <= c1 + 0.01; b += 2, i++) {
      const [bn, ch] = progC[Math.floor(i / 2) % 4];
      S.pattern('mal', 'x.xxx.x.', { from: b, step: .25, pitch: [ch[2], ch[0], ch[1], ch[2]], vel: 64 });
      if (i % 2 === 0) { S.note('bass', bn.replace(/\d/, m => +m + 1), { beat: b, beats: 1.6, vel: 80 }); S.chord('keys', ch, { beat: b, beats: 3.5, vel: 50 }); }
      S.drums({ kick: 'x...', sidestick: '..x.', shaker: 'oxox' }, { from: b, vel: 80 });
    }
    // the van lands at 7:30: chime
    const restock = TT.fwd0 + (7.47 - 6.5) / (8 + 40 / 60 - 6.5) * (TT.fwd1 - TT.fwd0);
    S.fx('chime', restock, { vel: 72, pitch: 'D6' });
    // build into the end card, last chord rings
    S.run('gl', ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'], { t: TT.logo - 0.66, step: .11, vel: 52, cresc: 6 });
    S.fx('revswell', TT.logo, { dur: 1.1, vel: 60 });
    S.chord('keys', ['D3', 'A3', 'E4', 'F#4', 'A4'], { t: TT.logo, dur: 3.6, vel: 70, spread: .02 });
    S.note('bass', 'D2', { t: TT.logo, dur: 3.5, vel: 84 });
    S.chord('pad', ['D3', 'A3', 'F#4', 'C#5'], { t: TT.logo, dur: TT.end - TT.logo, vel: 56 });
    S.drum('kick', { t: TT.logo, vel: 100 }); S.fx('sparkle', TT.logo + 0.1, { vel: 48 });
    S.note('gl', 'A5', { t: TT.logo + 1.55, dur: 2, vel: 46 });
    S.master({ gain: -3, fadeOut: 1.6 });
  },
};

// ───────── small inline graphics ─────────
function LOGO(s) { return `<svg width="${s}" height="${s}" viewBox="-60 -60 120 120"><circle r="48" fill="none" stroke="${C.ink}" stroke-width="10"/><path d="M0 -48 C 26 -20, 26 20, 0 48" fill="none" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/><circle cx="34" cy="-34" r="15" fill="${C.cobalt}"/></svg>`; }
const ARROW = '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5 14.5 9 10 13.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PINSVG = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="none" stroke="#161b22" stroke-width="1.6"/><circle cx="8" cy="6.5" r="1.8" fill="#161b22"/></svg>';

// ───────── The city: Three.js, clay look, everything a function of (t, hour) ─────────
function buildCity(kit) {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;display:none';
  kit.stage.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.paper);
  scene.fog = new THREE.Fog(C.paper, 300, 620);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const sun = new THREE.DirectionalLight('#fff6ea', 2.3); sun.position.set(-70, 130, 60); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 140, bottom: -140, near: 10, far: 400 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  scene.add(sun, new THREE.HemisphereLight('#ffffff', '#d9d2c4', 0.9));
  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 1200);

  const mat = (c, r = .85) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
  // water + land with a harbour bay
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat('#c3d3dc', .35)); water.rotation.x = -Math.PI / 2; water.position.y = -1.2; water.receiveShadow = true; scene.add(water);
  const shape = new THREE.Shape();
  shape.moveTo(-700, 700); shape.lineTo(-700, -36); shape.lineTo(-30, -36); shape.bezierCurveTo(-10, -36, 0, -40, 20, -40); shape.lineTo(96, -40); shape.bezierCurveTo(110, -40, 120, -30, 140, -30); shape.lineTo(700, -30); shape.lineTo(700, 700); shape.lineTo(-700, 700);
  const land = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelSize: .6, bevelThickness: .4, bevelSegments: 2, curveSegments: 24 }), mat('#ebe7de'));
  land.rotation.x = -Math.PI / 2; land.position.y = -1.6; land.receiveShadow = true; scene.add(land);
  // piers
  for (const x of [40, 64, 88]) { const p = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 26), mat('#e3ddd1')); p.position.set(x, -0.3, 52); p.castShadow = p.receiveShadow = true; scene.add(p); }

  // blocks: sidewalk plinths + buildings (instanced), parks with trees
  const r = rng(5), lots = [], parks = [], trees = [];
  for (let i = -12; i <= 12; i++) for (let j = -9; j <= 2; j++) {
    const x = i * 12, z = j * 12; if (z > 30 || (z > 26 && x > 14 && x < 100)) continue;
    const dD = Math.hypot(x - 6, z + 20), dist = DIST.reduce((b, d) => (Math.hypot(x - d.c[0], z - d.c[1]) < Math.hypot(x - b.c[0], z - b.c[1]) ? d : b));
    if ((i === -3 && j === -1) || (i === -4 && j === -1) || (i === 7 && j === -2) || (r() < .05 && dD > 30)) { parks.push([x, z]); for (let k = 0; k < 6; k++) trees.push([x - 3.5 + r() * 7, z - 3.5 + r() * 7, 1.1 + r() * .8]); continue; }
    const tall = Math.exp(-((dD / 34) ** 2));
    const harbor = dist.id === 'harbor';
    const n = harbor ? 1 + (r() < .4) : tall > .4 ? 1 + (r() < .5) : 2 + Math.floor(r() * 3);
    const split = r() < .5;
    for (let k = 0; k < n; k++) {
      const w = split ? 9 / n : 9, d = split ? 9 : 9 / n, ox = split ? -4.5 + w * (k + .5) : 0, oz = split ? 0 : -4.5 + d * (k + .5);
      const hgt = harbor ? 2.2 + r() * 2.5 : 2 + r() * 3.5 + tall * (8 + r() * 30) + (dist.id === 'univ' ? 3 : 0);
      lots.push([x + ox, z + oz, w - .9, d - .9, hgt]);
    }
  }
  const plin = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat('#f6f4ef'), 400);
  const bld = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, .06), mat('#fbfaf7', .9), lots.length);
  const m4 = new THREE.Matrix4(); let pi = 0;
  for (let i = -12; i <= 12; i++) for (let j = -9; j <= 2; j++) { const x = i * 12, z = j * 12; if (z > 30 || (z > 26 && x > 14 && x < 100)) continue; m4.compose(new THREE.Vector3(x, .15, z), new THREE.Quaternion(), new THREE.Vector3(10, .3, 10)); plin.setMatrixAt(pi++, m4); }
  plin.count = pi; plin.receiveShadow = true; scene.add(plin);
  lots.forEach((l, k) => { m4.compose(new THREE.Vector3(l[0], .3 + l[4] / 2, l[1]), new THREE.Quaternion(), new THREE.Vector3(l[2], l[4], l[3])); bld.setMatrixAt(k, m4); });
  bld.castShadow = bld.receiveShadow = true; scene.add(bld);
  const park = new THREE.InstancedMesh(new THREE.BoxGeometry(10, .5, 10), mat('#d5dfcc'), parks.length); parks.forEach((p, k) => { m4.makeTranslation(p[0], .25, p[1]); park.setMatrixAt(k, m4); }); park.receiveShadow = true; scene.add(park);
  const tree = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat('#a9bf9d'), trees.length); trees.forEach((p, k) => { m4.compose(new THREE.Vector3(p[0], .5 + p[2], p[1]), new THREE.Quaternion(), new THREE.Vector3(p[2], p[2], p[2])); tree.setMatrixAt(k, m4); }); tree.castShadow = true; scene.add(tree);

  // stations: a base disc + a pillar whose height is bikes docked
  const pillarG = new THREE.CylinderGeometry(1.15, 1.15, 1, 28); pillarG.translate(0, .5, 0);
  const baseG = new THREE.CylinderGeometry(2.1, 2.1, .25, 32);
  const glassG = new THREE.CylinderGeometry(1.5, 1.5, 1, 28, 1, true); glassG.translate(0, .5, 0);
  const glass = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .2, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false });
  const capG = new THREE.CylinderGeometry(1.5, 1.5, .01, 28);
  const st = STATIONS.map(s => {
    const m = new THREE.MeshStandardMaterial({ color: C.cobalt, roughness: .45 });
    const p = new THREE.Mesh(pillarG, m); p.position.set(s.x, .3, s.z); p.castShadow = true;
    const bm = mat('#ffffff', .6), b = new THREE.Mesh(baseG, bm); b.position.set(s.x, .32, s.z); b.receiveShadow = true;
    const g = new THREE.Mesh(glassG, glass); g.position.set(s.x, .3, s.z); g.scale.y = .3 + (s.cap / 20) * 11; g.renderOrder = 2;
    scene.add(p, b, g); return { s, p, m, b, bm };
  });
  const cobalt = new THREE.Color(C.cobalt), verm = new THREE.Color(C.verm);
  // bikes in transit: Harbor → Downtown arcs
  const harborS = STATIONS.filter(s => s.d === 'harbor'), downS = STATIONS.filter(s => s.d === 'downtown');
  const NF = 90, fr = rng(21), flows = Array.from({ length: NF }, (_, k) => ({ a: harborS[k % harborS.length], b: downS[(k * 3) % downS.length], h0: 7.0 + fr() * 1.6, len: .28 + fr() * .12, hgt: 7 + fr() * 9 }));
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.62, 14, 10), new THREE.MeshStandardMaterial({ color: '#2a3fd6', roughness: .5 }), NF); dots.castShadow = true; scene.add(dots);
  // the van
  const van = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(5.2, 2.6, 2.6, 2, .35), new THREE.MeshStandardMaterial({ color: C.cobalt, roughness: .4 })); body.position.y = 1.7; body.castShadow = true;
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.8, 2.0, 2.5, 2, .3), mat('#ffffff', .5)); cab.position.set(3.2, 1.4, 0); cab.castShadow = true;
  van.add(body, cab); scene.add(van);
  const route = [[-42, 6], [30, 6], [30, 30], [48, 30]];
  const routeLen = route.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]), 0);
  const along = u => { let d = u * routeLen; for (let i = 1; i < route.length; i++) { const a = route[i - 1], b = route[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= L || i === route.length - 1) { const p = Math.min(1, d / L); return [lerp(a[0], b[0], p), lerp(a[1], b[1], p), Math.atan2(-(b[1] - a[1]), b[0] - a[0])]; } d -= L; } };

  // camera rig: [azimuth°, elevation°, distance, target x, target z]
  const rig = t => keys(t, [
    [TT.city - 0.3, [0, 89.5, 120, 40, -6]],
    [TT.city + 1.2, [0, 89.5, 178, 8, -6], eo],
    [TT.city + 3.6, [-26, 50, 205, 6, -4]],
    [TT.harbor - 1.2, [-8, 44, 188, 10, 0], kit.lin],
    [TT.harbor + 0.3, [16, 33, 96, 46, 22]],
    [TT.rew, [22, 32, 90, 47, 23], kit.lin],
    [TT.fwd0 + 0.1, [6, 42, 150, 18, 10]],
    [TT.rise, [14, 40, 134, 24, 13], kit.lin],
    [TT.logo, [0, 89.5, 270, 10, -8], eio],
  ]);
  const place = ([az, el, dist, tx, tz], cam) => {
    const a = az * Math.PI / 180, e = el * Math.PI / 180;
    cam.position.set(tx + dist * Math.cos(e) * Math.sin(a), dist * Math.sin(e), tz + dist * Math.cos(e) * Math.cos(a));
    cam.up.set(0, 1, 0); if (el > 89) cam.up.set(0, 0, -1);
    cam.lookAt(tx, 0, tz); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  };
  const tmpCam = camera.clone();
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  return {
    canvas,
    camAt(t) { place(rig(t), tmpCam); return tmpCam; },
    proj(x, y, z, c = camera) { v.set(x, y, z).project(c); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; },
    render(t, h, fixed) {
      place(rig(t), camera);
      for (const o of st) {
        const lv = level(o.s, h, fixed), f = lv / 20;
        o.p.scale.set(1, Math.max(.05, .3 + f * 11), 1);
        const red = o.s.d === 'harbor' ? 1 - clamp01((lv - .6) / 1.2) : 0;
        o.m.color.copy(cobalt).lerp(verm, red);
        o.bm.color.set('#ffffff').lerp(verm, red);
        o.p.visible = lv > 0.15;
      }
      flows.forEach((fl, k) => {
        const p = (h - fl.h0) / fl.len;
        if (p <= 0 || p >= 1) { m4.makeScale(0, 0, 0); dots.setMatrixAt(k, m4); return; }
        const x = lerp(fl.a.x, fl.b.x, p), z = lerp(fl.a.z, fl.b.z, p), y = 1.5 + Math.sin(Math.PI * p) * fl.hgt;
        const s = Math.min(1, Math.sin(Math.PI * p) * 4);
        m4.compose(v.set(x, y, z), q.identity(), sc.set(s, s, s)); dots.setMatrixAt(k, m4);
      });
      dots.instanceMatrix.needsUpdate = true;
      // van: parked at the depot, drives 7:00 → 7:27, unloads, leaves at 7:40
      const show = fixed ? 1 : 0;
      van.visible = !!show;
      if (show) {
        const go = eio(seg(h, 7.0, 7.45)), back = eio(seg(h, 7.65, 8.15));
        const [x, z, a] = back > 0 ? along(1 - back) : along(go);
        van.position.set(x, .3, z); van.rotation.y = back > 0 ? a + Math.PI : a;
      }
      renderer.render(scene, camera);
    },
  };
}
