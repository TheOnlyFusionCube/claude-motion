// "Everything moves": a 13 s motion-design reel. Not a story and not a demo: a run of craft moves,
// each one HANDING OFF to the next instead of cutting:
//   3D letters fly in → the O becomes a ball → it bounces (squash & stretch) → the camera pulls back:
//   it was a preview in an editor → a dragged curve changes how the ball moves → the ball becomes a
//   toggle's knob → the click floods the frame blue → the blue is one tile of a grid; whip pans →
//   the tiles fall away → a rolling count lands the end card.
// Fast moves are smeared by real motion blur (motionBlur below: the export averages sub-frames).
const { seg, lerp, clamp01, eo, ei, eio, eob, eoq, eiq, eiox, spring, mixColor, TextFx, vnoise } = kit;
const W = 1920, H = 1080;
const C = { blue: '#2f54ff', cream: '#f4f1ea', ink: '#16171a', track: '#cfcac2', paper: '#ece8e1' };

// ───────── Beats (one cascade: retime one, everything after follows) ─────────
const TT = {};
TT.letters = -0.25;          // first letter already in flight at frame 0 (the thumbnail is not blank)
TT.exit = 1.5;               // the other letters leave
TT.ball = TT.exit + 0.1;     // the O becomes the ball
TT.drop = TT.ball + 0.45;    // and drops
TT.pull0 = 4.45; TT.pull1 = TT.pull0 + 0.8;      // pull back: it was a preview
TT.drag0 = 5.45; TT.drag1 = TT.drag0 + 0.5;      // the easing curve is dragged
TT.zip0 = TT.drag1 + 0.05; TT.zip1 = TT.zip0 + 0.8; // the ball runs the new curve
TT.push0 = 6.8; TT.push1 = TT.push0 + 0.4;       // push into the ball
TT.knob = 6.95;              // ball → knob, track grows
TT.click = 7.35;             // toggle on
TT.flood0 = 7.5; TT.grid = 7.95;                 // blue floods the frame, and is a tile of the grid
TT.out = 10.35;              // tiles fall away
TT.count0 = 10.8; TT.count1 = 12.0;              // the count
const DUR = 13.6;
const FRAMES = Math.round(DUR * 30);

const GROUND = 860, H0 = 380, X0 = 620;
const bnc = kit.bouncer({ t0: TT.drop, h: H0, n: 4, fall: 0.48, decay: 0.5, x0: X0, dx: 700 });
const X1 = X0 + 700;
const PILL = { x: X0 - 68, y: GROUND - 128, w: 270, h: 136, r: 68 };
const curveAt = (q) => (x) => lerp(eio(x), spring(x, { damping: .36, freq: 1.5 }), q);

let camA, camB, studio, flood, grid, endc, cur, grain;
let letters = [], wordEl, oRect, ball, track, shadow, groundLine, dots = [], cap1, cap2, viewEdge;
let curvePath, handle, handleLine, playhead, playDot, valEl, tiles = {}, typeW, sdots = [], cube, stripes, bars = [], pathEl, pathDot, odo, w1, w2, row;

// panel graph space (panel-local px) → world
const PANEL = { x: 0, y: 1130 }, G = { x0: 200, x1: 1720, y0: 400, y1: 140 };
const gpt = (u, v) => [G.x0 + (G.x1 - G.x0) * u, G.y0 + (G.y1 - G.y0) * v];
const handleUV = q => [lerp(.62, .2, q), lerp(.02, 1.3, q)];
const handleWorld = q => { const [x, y] = gpt(...handleUV(q)); return [PANEL.x + x, PANEL.y + y]; };

export default {
  title: 'Everything moves',
  width: W, height: H, fps: 30, duration: DUR, background: '#1d1e22',
  // fast spans (the whips, the smash moves) take more sub-frames so the smear is continuous, not ghosted
  motionBlur: { samples: 8, shutter: 0.5, fast: [[1.45, 2.0, 16], [6.8, 7.25, 16], [8.3, 8.8, 32], [8.95, 9.45, 32], [9.45, 10.0, 16], [10.35, 11.05, 16]] },
  css: ['film.css'],
  chapters: [{ t: 0, label: 'Letters' }, { t: TT.drop, label: 'Bounce' }, { t: TT.pull0, label: 'Editor' }, { t: TT.push0, label: 'Toggle' }, { t: TT.grid, label: 'Grid' }, { t: TT.out, label: 'Count' }],

  init(kit) {
    // ── Studio world ──
    studio = kit.layer('studio');
    studio.append(kit.h(`<div class="window"><div class="bar"><i></i><i></i><i></i><span>bounce.film.js — preview</span><b>Export</b></div></div>`));
    studio.append(kit.h(`<div class="backdrop"><div class="glow"></div></div>`));
    studio.append(kit.h(`<div class="panel"><div class="lab">Easing</div><div class="val">ease-in-out</div></div>`));
    valEl = kit.$('.panel .val');
    const psvg = kit.svgLayer(kit.$('.panel'), { w: 1920, h: 450 });
    for (let i = 0; i <= 8; i++) { const [x] = gpt(i / 8, 0); psvg.append(kit.svg(`<line x1="${x}" y1="110" x2="${x}" y2="${G.y0 + 20}" stroke="#2a2c32" stroke-width="2"/>`)); }
    for (const v of [0, .5, 1]) { const [, y] = gpt(0, v); psvg.append(kit.svg(`<line x1="${G.x0 - 20}" y1="${y}" x2="${G.x1 + 20}" y2="${y}" stroke="#2a2c32" stroke-width="2"/>`)); }
    handleLine = kit.svg('<line stroke="#7f9bff" stroke-width="3" stroke-dasharray="8 8"/>'); psvg.append(handleLine);
    curvePath = kit.svg('<path fill="none" stroke="#f4f1ea" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'); psvg.append(curvePath);
    playhead = kit.svg(`<line y1="110" y2="${G.y0 + 20}" stroke="#2f54ff" stroke-width="4"/>`); psvg.append(playhead);
    for (const [u, v] of [[0, 0], [1, 1]]) { const [x, y] = gpt(u, v); psvg.append(kit.svg(`<circle cx="${x}" cy="${y}" r="12" fill="#f4f1ea"/>`)); }
    playDot = kit.svg('<circle r="16" fill="#2f54ff" stroke="#f4f1ea" stroke-width="4"/>'); psvg.append(playDot);
    handle = kit.svg('<circle r="18" fill="#1b1c20" stroke="#7f9bff" stroke-width="6"/>'); psvg.append(handle);

    const gsvg = kit.svgLayer(studio); gsvg.classList.add('ground');
    groundLine = kit.svg(`<line x1="180" y1="${GROUND}" x2="1740" y2="${GROUND}" stroke="#f4f1ea" stroke-width="4" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>`); gsvg.append(groundLine);
    for (let i = 0; i < 26; i++) { const d = kit.svg('<circle r="6" fill="#2f54ff"/>'); gsvg.append(d); dots.push(d); }

    const tw = kit.h('<div class="title3d"><div class="word">BOUNCE</div></div>'); studio.append(tw);
    wordEl = tw.firstElementChild;
    letters = kit.letters(wordEl).map(l => ({ el: l, face: kit.extrude(l, { depth: 46, layers: 18, side: '#a9a39a', dark: '#4a4640' }) }));
    oRect = kit.offset(letters[1].face, studio);

    shadow = kit.el('div', { class: 'shadow', parent: studio });
    track = kit.el('div', { class: 'track', parent: studio });
    ball = kit.el('div', { class: 'ball', parent: studio });
    cap1 = kit.h('<div class="caption">Weight.</div>'); studio.append(cap1);
    cap2 = kit.h('<div class="caption">Timing.</div>'); studio.append(cap2);
    viewEdge = kit.el('div', { class: 'view-edge', parent: studio });

    camA = new kit.Camera(studio).set([
      { t: 0, cx: 960, cy: 500, z: 1.1, drift: [0, 5, -.035] },
      { t: 2.3, from: 1.4, cx: 960, cy: 540, z: 1.0, drift: [3, 0, .004] },
      { t: TT.pull1, from: TT.pull0, cx: 960, cy: 720, z: .56, drift: [0, 0, .012] },
      { t: TT.push1, from: TT.push0, cx: PILL.x + PILL.w / 2, cy: PILL.y + PILL.h / 2, z: 2.2, ease: eiox, drift: [0, 0, .05] },
    ]);

    // ── Flood ──
    flood = kit.el('div', { class: 'flood', parent: kit.stage });

    // ── Grid world ──
    grid = kit.layer('gridw');
    grid.append(kit.h('<div class="floor"></div>'));
    const spec = [['type', 0, 0, 'Kinetic type'], ['springs', 1, 0, 'Springs'], ['cube', 2, 0, '3D'], ['stripes', 0, 1, 'Texture'], ['bars', 1, 1, 'Data'], ['path', 2, 1, 'Paths']];
    for (const [id, c, r, lab] of spec) {
      const el = kit.h(`<div class="tile ${id === 'springs' ? 'blue' : ''}" style="left:${140 + c * 560}px;top:${190 + r * 370}px"><div class="lab">${lab}</div></div>`);
      grid.append(el); tiles[id] = { el, c, r };
    }
    typeW = kit.h('<div class="typew">Type</div>'); tiles.type.el.append(typeW);
    for (let i = 0; i < 3; i++) { const d = kit.el('div', { class: 'dot3', parent: tiles.springs.el }); sdots.push(d); }
    tiles.cube.el.append(kit.h('<div class="scene3d"><div class="cube"><i style="transform:translateZ(70px)"></i><i style="transform:rotateY(180deg) translateZ(70px)"></i><i style="transform:rotateY(90deg) translateZ(70px)"></i><i style="transform:rotateY(-90deg) translateZ(70px)"></i><i class="top" style="transform:rotateX(90deg) translateZ(70px)"></i><i style="transform:rotateX(-90deg) translateZ(70px)"></i></div></div>'));
    cube = kit.$('.tile .cube');
    stripes = kit.el('div', { class: 'stripes', parent: tiles.stripes.el, style: 'background:repeating-linear-gradient(45deg,#2f54ff 0 22px,#f4f1ea 22px 44px,#16171a 44px 66px,#f4f1ea 66px 88px)' });
    const barsEl = kit.el('div', { class: 'bars', parent: tiles.bars.el });
    for (let i = 0; i < 11; i++) bars.push(kit.el('i', { class: i === 10 ? 'hi' : '', parent: barsEl }));
    const ps = kit.svgLayer(tiles.path.el, { w: 520, h: 330 });
    pathEl = kit.svg('<path d="M50 250 C 140 250, 150 110, 250 140 S 380 270, 470 90" fill="none" stroke="#16171a" stroke-width="7" stroke-linecap="round"/>'); ps.append(pathEl);
    pathDot = kit.svg('<circle r="14" fill="#2f54ff"/>'); ps.append(pathDot);
    this.pathLen = pathEl.getTotalLength();

    const TC = (c, r) => [140 + c * 560 + 260, 190 + r * 370 + 165];
    camB = new kit.Camera(grid).set([
      { t: TT.grid, cx: TC(1, 0)[0], cy: TC(1, 0)[1], z: 4.4, drift: [0, 0, -.14] },
      { t: 8.7, from: 8.38, cx: TC(0, 0)[0], cy: TC(0, 0)[1], z: 2.3, ease: eiox, drift: [-6, 0, .02] },
      { t: 9.32, from: 9.0, cx: TC(2, 0)[0], cy: TC(2, 0)[1], z: 2.3, ease: eiox, drift: [6, 0, .02] },
      { t: 10.05, from: 9.45, cx: 960, cy: 540, z: 1.0, ease: eio, drift: [0, 0, .012] },
    ]);

    // ── End: the count ──
    endc = kit.h('<div class="endc"><div class="row"><div class="num"></div><div class="side"><div class="w1">frames.</div><div class="w2">One film.js.</div></div></div></div>');
    kit.stage.append(endc);
    row = kit.$('.endc .row'); w1 = kit.$('.endc .w1'); w2 = kit.$('.endc .w2');
    odo = kit.odometer(kit.$('.endc .num'), { digits: 3 });

    // ── Cursor (world coords of the studio) ──
    cur = kit.cursor({ cam: camA });
    cur.keys = [
      { t: 4.95, at: [1620, 1620] },
      { t: TT.drag0 - 0.05, from: 5.0, at: handleWorld(0), bow: .1 },
      { t: TT.drag1, from: TT.drag0, at: handleWorld(1), bow: 0 },
      { t: TT.click - 0.06, from: 6.35, at: [PILL.x + 64, PILL.y + 70], bow: .14 },
      { t: TT.click + 0.5, at: [PILL.x + 230, PILL.y + 150] },
    ];
    cur.holds = [[TT.drag0, TT.drag1]];
    cur.clicks = [TT.click];
    cur.visible = t => Math.min(eo(seg(t, 4.95, 5.2)), 1 - seg(t, TT.flood0 + 0.1, TT.flood0 + 0.3));

    grain = kit.grain(kit.stage, { opacity: .045, fps: 12 });   // subtle: grain is expensive to encode
  },

  render(t, kit) {
    const studioOn = t < TT.grid + 0.02, gridOn = t >= TT.grid - 0.02, endOn = t >= TT.out;
    studio.style.display = studioOn ? '' : 'none';
    grid.style.display = gridOn ? '' : 'none';
    endc.style.display = endOn ? '' : 'none';
    if (studioOn) this.studio(t);
    kit.iris(flood, t >= TT.grid ? 0 : eiq(seg(t, TT.flood0, TT.grid)), ...camA.toStage([ballX(t) , PILL.y + PILL.h / 2], t));
    if (gridOn) this.grid(t);
    if (endOn) this.end(t);
    cur.render(t);
    grain.render(t);
  },

  studio(t) {
    camA.apply(t);
    // Letters: fly in from depth, swing, then all but the O leave.
    const swing = lerp(-16, 8, eio(seg(t, 0, 1.3))) * (1 - eio(seg(t, TT.exit - 0.3, TT.exit + 0.1)));
    wordEl.style.transform = `rotateY(${swing}deg) rotateX(${8 * (1 - seg(t, TT.exit - .3, TT.exit + .1))}deg)`;
    letters.forEach(({ el }, i) => {
      const ta = TT.letters + i * 0.085, p = eoq(seg(t, ta, ta + 0.62)), q = 1 - p;
      const side = i < 1.5 ? -1 : 1;
      let x = (i - 2.5) * 220 * q, y = (-140 + 60 * (i % 2)) * q, z = -1700 * q, ry = (-70 + 26 * i) * q, rx = 35 * q, op = clamp01(seg(t, ta, ta + 0.12));
      if (i !== 1) {
        const te = TT.exit + Math.abs(i - 1) * 0.035, e = ei(seg(t, te, te + 0.42));
        x += side * (500 + 120 * Math.abs(i - 1)) * e; y += -180 * e; z += 1100 * e; ry += side * 70 * e; op *= 1 - seg(e, .55, 1);
      } else op *= 1 - seg(t, TT.ball, TT.ball + 0.12);
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op <= 0.001 ? 'hidden' : '';
    });

    // The ball: born from the O, bounces, runs the dragged curve, becomes the knob.
    const showBall = t >= TT.ball;
    ball.style.display = showBall ? '' : 'none';
    const BW = 120;
    if (showBall) {
      if (t < TT.drop) {
        const p = eio(seg(t, TT.ball, TT.drop - 0.05));
        kit.morph(ball, { x: oRect.x, y: oRect.y + oRect.h * .12, w: oRect.w, h: oRect.h * .76, r: oRect.w / 2, bg: C.cream }, { x: X0 - BW / 2, y: GROUND - H0 - BW, w: BW, h: BW, r: BW / 2, bg: C.blue }, p);
        ball.style.transform = 'none';
      } else {
        let x, y = 0, sx = 1, sy = 1;
        if (t < TT.zip0) { const b = bnc.at(t); x = b.x; y = b.y; sx = b.sx; sy = b.sy; }
        else { x = ballX(t); const v = kit.speedOf(ballX, t); sx = kit.smear(v, .00016, .5); sy = 1 / sx; }
        const kn = eio(seg(t, TT.knob, TT.knob + 0.3));
        const size = lerp(BW, 120, kn);
        kit.set(ball, { left: (x - size / 2).toFixed(1) + 'px', top: (GROUND - y - size).toFixed(1) + 'px', width: size + 'px', height: size + 'px', borderRadius: size / 2 + 'px',
          background: mixColor(C.blue, '#ffffff', kn), transform: `scale(${sx.toFixed(3)},${sy.toFixed(3)})` });
        ball.className = kn > .5 ? 'ball knob' : 'ball';
      }
    }
    // track grows out of the ball, then fills on the click
    const kn = eio(seg(t, TT.knob, TT.knob + 0.3));
    track.style.display = kn > 0 ? '' : 'none';
    if (kn > 0) {
      const on = eo(seg(t, TT.click + 0.03, TT.click + 0.22));
      kit.morph(track, { x: X0 - 60, y: GROUND - 120, w: 120, h: 120, r: 60, bg: C.blue }, { ...PILL, bg: C.track }, kn);
      if (on > 0) track.style.background = mixColor(C.track, C.blue, on);
    }
    // shadow
    const by = t >= TT.drop && t < TT.zip0 ? bnc.at(t).y : 0;
    shadow.style.opacity = (seg(t, TT.drop - 0.2, TT.drop + 0.2) * (1 - seg(t, TT.knob, TT.knob + 0.2)) * (0.15 + 0.5 * (1 - by / H0))).toFixed(3);
    shadow.style.transform = `translate(${(ballX(t) - 80).toFixed(1)}px,${GROUND - 10}px) scale(${(0.5 + 0.5 * (1 - by / H0)).toFixed(3)})`;

    // ground line draws on as the ball drops; trail of where it has been
    groundLine.setAttribute('stroke-dashoffset', String(1 - eio(seg(t, TT.drop - 0.35, TT.drop + 0.25))));
    groundLine.style.opacity = 1 - seg(t, TT.knob - 0.2, TT.knob + 0.1);
    const fade = 1 - seg(t, 4.3, 4.8);
    const tr = kit.trail(s => bnc.at(s), Math.min(t, bnc.end), { span: 1.3, n: dots.length, t0: TT.drop });
    dots.forEach((d, i) => {
      const s = tr[i];
      if (!s || fade <= 0 || i > tr.length - 3) { d.style.display = 'none'; return; }
      d.style.display = ''; d.setAttribute('cx', s.p.x.toFixed(1)); d.setAttribute('cy', (GROUND - s.p.y - 60).toFixed(1)); d.style.opacity = (s.a * .8 * fade).toFixed(3);
    });

    // one word at a time
    TextFx.in(cap1, t, TT.drop + 0.7, { from: 'bottom', d: 40, dur: .5 }); TextFx.out(cap1, t, TT.drag0 - 0.15, { to: 'top', d: 30 });
    TextFx.in(cap2, t, TT.drag0 + 0.2, { from: 'bottom', d: 40, dur: .5 }); TextFx.out(cap2, t, TT.push0, { to: 'top', d: 30 });

    // the editor reveal: the preview gets an edge, the curve is dragged, the ball runs it
    viewEdge.style.boxShadow = `0 0 0 ${6}px rgba(47,84,255,${(.9 * seg(t, TT.pull0 + 0.3, TT.pull1) * (1 - seg(t, TT.push0, TT.push0 + .2))).toFixed(3)})`;
    const q = eio(seg(t, TT.drag0, TT.drag1)), f = curveAt(q);
    let d = ''; for (let i = 0; i <= 80; i++) { const u = i / 80, [x, y] = gpt(u, f(u)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    curvePath.setAttribute('d', d);
    const [hx, hy] = gpt(...handleUV(q)), [sx0, sy0] = gpt(0, 0);
    handle.setAttribute('cx', hx); handle.setAttribute('cy', hy);
    handleLine.setAttribute('x1', sx0); handleLine.setAttribute('y1', sy0); handleLine.setAttribute('x2', hx); handleLine.setAttribute('y2', hy);
    const val = q > .5 ? 'spring(<em>0.36</em>)' : 'ease-in-out'; if (valEl._v !== val) { valEl.innerHTML = val; valEl._v = val; }
    const zp = seg(t, TT.zip0, TT.zip1), ph = zp > 0 && zp < 1;
    playhead.style.display = playDot.style.display = ph ? '' : 'none';
    if (ph) { const [px, py] = gpt(zp, f(zp)); playhead.setAttribute('x1', px); playhead.setAttribute('x2', px); playDot.setAttribute('cx', px); playDot.setAttribute('cy', py); }
  },

  grid(t) {
    camB.apply(t);
    // springs: three dots hop and land with a spring
    sdots.forEach((d, i) => {
      const u = (((t - TT.grid - i * 0.12) % 0.9) + 0.9) % 0.9 / 0.9;
      const up = u < .3 ? eo(u / .3) : 1 - spring((u - .3) / .7, { damping: .3, freq: 2.2 });
      const s = eob(seg(t, TT.grid + 0.05 + i * 0.06, TT.grid + 0.4 + i * 0.06));
      d.style.transform = `translate(${150 + i * 90}px,${190 - 90 * up}px) scale(${s.toFixed(3)})`;
    });
    // kinetic type: the weight breathes
    typeW.style.fontWeight = Math.round(500 + 400 * Math.sin(2 * Math.PI * (t - TT.grid) / 1.4));
    typeW.style.letterSpacing = (-0.04 + 0.03 * Math.sin(2 * Math.PI * (t - TT.grid) / 1.4 + 1)).toFixed(3) + 'em';
    cube.style.transform = `rotateX(${(-24 + 8 * Math.sin(t * 1.3)).toFixed(2)}deg) rotateY(${(t * 95).toFixed(2)}deg)`;
    stripes.style.transform = `translateX(${(((t * 160) % 124.45)).toFixed(2)}px)`;
    const nz = vnoise(4);
    bars.forEach((b, i) => { const g = eob(seg(t, TT.grid + i * 0.05, TT.grid + 0.5 + i * 0.05)); b.style.height = (g * (40 + 12 * i + 14 * nz(t * 1.6 + i * 3))).toFixed(1) + '%'; });
    const dp = eio(seg(((t - TT.grid) % 1.6), 0, 1.2)), len = this.pathLen * dp, pt = pathEl.getPointAtLength(len);
    pathEl.setAttribute('stroke-dasharray', `${len.toFixed(1)} 9999`);
    pathDot.setAttribute('cx', pt.x.toFixed(1)); pathDot.setAttribute('cy', pt.y.toFixed(1));
    // the grid falls away, staggered from the left
    for (const id of ['type', 'stripes', 'springs', 'bars', 'cube', 'path']) {
      const tl = tiles[id], d0 = TT.out + (tl.c * 0.07 + tl.r * 0.04), e = eiq(seg(t, d0, d0 + 0.55));
      tl.el.style.transform = e > 0 ? `translateY(${(1400 * e).toFixed(1)}px) rotate(${((tl.c - 1) * 12 * e).toFixed(2)}deg)` : '';
    }
  },

  end(t) {
    const a = eoq(seg(t, TT.count0 - 0.15, TT.count0 + 0.4));
    row.style.transform = `translateY(${(80 * (1 - a)).toFixed(1)}px) scale(${(1 + 0.025 * seg(t, TT.count1, DUR)).toFixed(4)})`;
    row.style.opacity = a.toFixed(3);
    odo.set(FRAMES * eoq(seg(t, TT.count0, TT.count1)));
    TextFx.rise(w1, t, TT.count1 - 0.25, { dur: .45 });
    TextFx.rise(w2, t, TT.count1 + 0.1, { dur: .45 });
  },

  score(S, kit) {
    const BPM = 120;
    S.tempo(BPM, { t0: TT.grid - 4 * 0.5 * 2 });
    S.program('pad', 'pad', { rev: .6 }); S.program('mar', 'marimba', { pan: -.15 }); S.program('bass', 'bass'); S.program('keys', 'ep', { gain: -3 }); S.program('gl', 'glock', { gain: -8 });
    // letters: a riser into the first, a knock per landing
    S.fx('whoosh', 0, { dur: .7, vel: 55 });
    letters.forEach((_, i) => S.drum('sidestick', { t: TT.letters + i * 0.085 + 0.42, vel: 60 + i * 5 }));
    S.drum('kick', { t: TT.letters + 5 * 0.085 + 0.5, vel: 90 });
    S.chord('pad', ['D3', 'A3', 'E4', 'F#4'], { t: 0, dur: TT.pull0 + 0.5, vel: 40 });
    S.fx('swipe', TT.exit, { dur: .35, vel: 70 }); S.fx('pop', TT.drop - 0.05, { vel: 55 });
    // the bounce: a thud and a note per contact, lower and softer as it settles
    bnc.contacts.forEach((c, i) => { S.fx('thud', c, { vel: 100 - i * 14 }); S.note('mar', ['A5', 'F#5', 'D5', 'A4', 'F#4'][i], { t: c, dur: .5, vel: 80 - i * 10 }); });
    // the editor
    S.fx('whoosh', TT.pull0, { dur: .8, vel: 50 });
    S.chord('pad', ['B2', 'F#3', 'D4', 'A4'], { t: TT.pull0, dur: TT.grid - TT.pull0, vel: 44 });
    S.fx('click', TT.drag0, { vel: 50 }); S.ticks([0, .08, .16, .24, .32, .4].map(x => TT.drag0 + 0.05 + x), { vel: 26 }); S.fx('click', TT.drag1, { vel: 45 });
    S.fx('swipe', TT.zip0, { dur: .3, vel: 60 }); S.fx('boing', TT.zip0 + 0.35, { vel: 34 });
    // toggle → flood
    S.fx('riser', TT.click + 0.15, { dur: 0.75, vel: 70 });
    S.fx('click', TT.click, { vel: 85 }); S.fx('pop', TT.click + 0.1, { vel: 60 });
    S.fx('impact', TT.grid, { vel: 100 }); S.drum('crash', { t: TT.grid, vel: 60 });
    // the grid: a groove, whips on the pans
    const b0 = S.toBeat(TT.grid), b1 = S.toBeat(TT.out);
    S.drums({ kick: 'x...x...x...x...', hat: '..x...x...x...x.', clap: '....x.......x...', shaker: 'xoxoxoxoxoxoxoxo' }, { from: b0, step: .25, repeat: Math.round((b1 - b0) / 4) });
    ['D2', 'D2', 'F#2', 'A1', 'B1', 'B1', 'G1', 'A1', 'D2', 'D2'].forEach((n, i) => S.note('bass', n, { beat: b0 + i * .5, beats: .4, vel: 80 }));
    [0, 1, 2, 3, 4].forEach(i => S.chord('keys', [['D4', 'F#4', 'A4'], ['B3', 'D4', 'F#4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4'], ['D4', 'F#4', 'A4']][i], { beat: b0 + i, beats: .45, vel: 58 }));
    S.fx('swipe', 8.38, { dur: .3, vel: 70 }); S.fx('swipe', 9.0, { dur: .3, vel: 70 }); S.fx('whoosh', 9.45, { dur: .6, vel: 55 });
    // fall away, the count, the landing
    S.fx('whoosh', TT.out, { dur: .5, vel: 60, into: true });
    S.fx('roll', TT.count0, { dur: TT.count1 - TT.count0, vel: 70 });
    S.chord('keys', ['D3', 'A3', 'D4', 'F#4', 'E5'], { t: TT.count1, dur: DUR - TT.count1, vel: 70, spread: .02 }); S.note('bass', 'D1', { t: TT.count1, dur: 3, vel: 85 });
    S.drum('kick', { t: TT.count1, vel: 100 }); S.fx('sparkle', TT.count1 + 0.35, { vel: 45 });
    S.chord('pad', ['D3', 'A3', 'E4', 'F#4'], { t: TT.out, dur: DUR - TT.out, vel: 42 });
    S.master({ fadeOut: 0.8 });
  },
};

// x of the ball at any t (bounce, then the dragged curve back to X0)
function ballX(t) {
  if (t < TT.zip0) return Math.min(X1, bnc.at(Math.max(t, TT.drop)).x);
  const slide = eob(seg(t, TT.click + 0.03, TT.click + 0.27)) * (PILL.w - 16 - 120);   // the knob, once it is one
  return lerp(X1, X0, curveAt(1)(seg(t, TT.zip0, TT.zip1))) + slide;
}
