import { clamp, clamp01, segment, lerp, out, inOut, backOut, motion, roundRect, text, line } from './motion.mjs';

/** Replace film content and drawing below; keep drawFrame(ctx,t) pure in t. */
export const FILM = Object.freeze({
  title: 'Make ideas move',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 14,
  chapters: [
    { t: 0, label: 'The idea' },
    { t: 3.4, label: 'Make the cut' },
    { t: 9.6, label: 'The end card' },
  ],
});

const C = Object.freeze({
  bg: '#142236',
  bgDeep: '#101a2b',
  ink: '#f5f2e9',
  muted: '#acc0cd',
  accent: '#f9b45d',
  accentPale: '#ffdb9e',
  rule: '#3d5367',
  ui: '#f3f1eb',
  uiInk: '#21344b',
  uiMuted: '#738295',
});
const T = Object.freeze({ intro: 0, work: 3.4, click: 6.25, result: 7.1, close: 9.6, end: 14 });

// Original wordless score; shared anchors keep notes, foley, and screen events in sync.
// The audio renderer turns these absolute-time events into a deterministic WAV.
const scoreEvents = [
  {kind: 'note', t: 0, dur: 3.6, pitch: 'D3', instrument: 'pad', vel: .065},
  {kind: 'note', t: 0, dur: 3.6, pitch: 'A3', instrument: 'pad', vel: .028},
  {kind: 'note', t: 0.15, dur: .9, pitch: 'D5', instrument: 'mallet', vel: .074},
  {kind: 'note', t: T.work, dur: 4.0, pitch: 'G3', instrument: 'pad', vel: .065},
  {kind: 'note', t: T.work, dur: 1.5, pitch: 'D4', instrument: 'ep', vel: .075},
  {kind: 'note', t: T.work, dur: 1.5, pitch: 'G4', instrument: 'ep', vel: .055},
  {kind: 'note', t: T.work + 2, dur: 1.3, pitch: 'A3', instrument: 'bass', vel: .095},
  {kind: 'fx', t: T.click, dur: .12, name: 'click', vel: .12},
  {kind: 'fx', t: T.result, dur: .16, name: 'pop', vel: .10},
  {kind: 'note', t: T.result, dur: 2.5, pitch: 'A3', instrument: 'pad', vel: .075},
  {kind: 'note', t: T.result, dur: 1.6, pitch: 'C#5', instrument: 'ep', vel: .055},
  {kind: 'note', t: T.close, dur: 3.6, pitch: 'D3', instrument: 'pad', vel: .065},
  {kind: 'note', t: T.close, dur: 3.6, pitch: 'F#4', instrument: 'ep', vel: .055},
  {kind: 'note', t: T.close, dur: 3.6, pitch: 'A4', instrument: 'ep', vel: .050},
  {kind: 'fx', t: T.close, dur: .7, name: 'ding', vel: .065},
];
const notes = ['G5', 'A5', 'B5', 'D6', 'B5', 'A5'];
for (let i = 0; i < 9; i++) {
  const beatAt = T.work + .35 + i * .63;
  if (beatAt < T.close) scoreEvents.push({kind: 'note', t: beatAt, dur: .38, pitch: notes[i % notes.length], instrument: 'mallet', vel: i % 4 === 0 ? .075 : .045});
}
scoreEvents.push({kind: 'fx', t: T.close - .42, dur: .42, name: 'whoosh', vel: .085});
export const SCORE = Object.freeze({title: 'Original warm mallet and electric piano score', events: Object.freeze(scoreEvents)});


function backdrop(g, t) {
  g.fillStyle = C.bg;
  g.fillRect(0, 0, FILM.width, FILM.height);
  // Calm geometric detail; derived from absolute time, not previous frames.
  g.save();
  g.translate(1600, 485);
  g.rotate(Math.sin(t / 5) * 0.014);
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = i === 3 ? '#436174' : '#2f465a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 250 + i * 99 + Math.sin(t * 0.7) * 5, 0, 2 * Math.PI);
    g.stroke();
  }
  g.restore();
}

function topLabel(g, title, right = 'A FILM FROM CODE') {
  text(g, title, 126, 112, 25, C.muted, 700);
  text(g, right, 1790, 112, 23, C.muted, 500, 'right');
  line(g, 126, 141, 1794, 141, C.rule, 2);
}

function drawIntro(g, t) {
  topLabel(g, 'CLAUDE MOTION   /   001');
  const drift = Math.sin(t / 3.2) * 13;
  const a = motion(t, -0.65, 0.42);
  g.save();
  g.globalAlpha = 0.64 + 0.36 * a;
  g.translate(-20 * (1 - a), drift);
  text(g, 'Make ideas', 122, 515, 169, C.ink, 700);
  text(g, 'move.', 122, 696, 169, C.ink, 700);
  g.restore();
  const lineP = out(segment(t, 0.2, 1.45));
  roundRect(g, 130, 738, Math.max(4, 540 * lineP), 12, 6, C.accent);
  text(g, 'ANIMATION   /   DESIGN   /   CODE', 130, 843 + Math.sin(t / 3) * 5, 31, C.muted, 500);
  // A moving punctuation mark gently leads the viewer toward the next composition.
  const cx = 1470 + Math.sin(t * 0.67) * 17;
  const cy = 420 + Math.cos(t * 0.67) * 17;
  g.beginPath(); g.arc(cx, cy, 88, 0, 2 * Math.PI); g.fillStyle = C.accent; g.fill();
  g.fillStyle = C.bg; g.beginPath(); g.arc(cx, cy, 20, 0, 2 * Math.PI); g.fill();
  const outP = segment(t, 2.95, T.work);
  if (outP > 0) { g.fillStyle = C.bgDeep; g.globalAlpha = outP; g.fillRect(0, 0, 1920, 1080); g.globalAlpha = 1; }
}

function drawPointer(g, x, y, click) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#132033'; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 49); g.lineTo(13, 37); g.lineTo(24, 67); g.lineTo(37, 60); g.lineTo(24, 31); g.lineTo(45, 29); g.closePath(); g.fill(); g.stroke();
  if (click > 0 && click < 1) { g.strokeStyle = `rgba(249,180,93,${1 - click})`; g.lineWidth = 6; g.beginPath(); g.arc(4, 6, 22 + 33 * click, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}

function drawWorkbench(g, t) {
  topLabel(g, '02   /   COMPOSE WITH TIME', 'THE TIMELINE IS THE SOURCE OF TRUTH');
  const entered = backOut(segment(t, T.work, T.work + 0.84), 0.95);
  const scale = 0.93 + entered * 0.07;
  const subtlePush = inOut(segment(t, T.work + 1.3, T.work + 5.2)) * 0.018;
  const x = 218, y = 184, w = 1484, h = 738;
  g.save();
  g.translate(x + w / 2, y + h / 2);
  g.scale(scale + subtlePush, scale + subtlePush);
  g.translate(-w / 2, -h / 2);
  roundRect(g, 5, 12, w, h, 35, '#0c1827');
  roundRect(g, 0, 0, w, h, 30, C.ui);
  roundRect(g, 0, 0, w, 96, [30, 30, 0, 0], '#e5e9e7');
  for (let i = 0; i < 3; i++) { g.fillStyle = ['#dfa7a0', '#e9bd82', '#95bba5'][i]; g.beginPath(); g.arc(43 + i * 37, 49, 11, 0, 2 * Math.PI); g.fill(); }
  text(g, 'Untitled motion', 160, 60, 27, C.uiInk, 700);
  text(g, 'LOCAL PREVIEW', 1404, 59, 18, C.uiMuted, 600, 'right');
  line(g, 0, 96, w, 96, '#cdd7d4', 2);
  // A preview pane, explicitly drawn with absolute time.
  roundRect(g, 59, 149, 875, 385, 22, C.bg);
  text(g, 'A better way to', 107, 303, 70, C.ink, 700);
  text(g, 'show the story.', 107, 386, 70, C.ink, 700);
  const underline = motion(t, 4.1, 5.3);
  roundRect(g, 110, 420, 500 * underline, 8, 4, C.accent);
  text(g, 'FRAME  /  TIME', 74, 613, 18, C.uiMuted, 700);
  line(g, 74, 633, 1418, 633, '#cfd6d6', 2);
  const blockLabels = ['Open', 'Action', 'Payoff', 'Close'];
  const xPos = [74, 420, 768, 1116];
  for (let i = 0; i < 4; i++) {
    const highlight = t >= (T.result + 0.2) && i === 2;
    roundRect(g, xPos[i], 662, 300, 58, 12, highlight ? C.accent : '#dce4e1');
    text(g, blockLabels[i], xPos[i] + 20, 701, 24, C.uiInk, 700);
  }
  // Editor panel and deterministic typewriter.
  text(g, 'EDIT THE SHOT', 1030, 186, 24, C.uiInk, 700);
  line(g, 1030, 210, 1414, 210, '#d1d9d8', 2);
  text(g, 'On-screen copy', 1030, 266, 23, C.uiMuted, 500);
  roundRect(g, 1026, 288, 396, 93, 12, '#ffffff');
  const sentence = 'Every frame is intentional.';
  const count = Math.min(sentence.length, Math.max(0, Math.floor((t - 4.45) * 23)));
  text(g, sentence.slice(0, count), 1044, 341, 25, C.uiInk, 600);
  if (t < 4.45 + sentence.length / 23 + 0.3 && (Math.floor(t / 0.5) % 2 === 0)) {
    g.save(); g.font = '600 25px Arial, Helvetica, sans-serif';
    const contentWidth = g.measureText(sentence.slice(0, count)).width; g.restore();
    roundRect(g, 1044 + contentWidth + 2, 313, 3, 37, 0, C.uiInk);
  }
  roundRect(g, 1030, 425, 385, 61, 12, t >= T.click ? '#e9ad60' : C.accent);
  text(g, 'Render the moment', 1221, 465, 25, C.uiInk, 700, 'center');
  if (t > T.result) {
    const p = motion(t, T.result, T.result + 0.52);
    g.globalAlpha = p;
    roundRect(g, 1030, 527 + 16 * (1-p), 390, 72, 11, '#e4f0ed');
    text(g, 'READY  /  30 FPS', 1053, 574 + 16 * (1-p), 22, '#317766', 700);
    g.globalAlpha = 1;
  }
  g.restore();
  // The mouse is above the window, and deliberately reads as a separate pointer.
  const approach = inOut(segment(t, 5.28, T.click));
  const px = lerp(1108, 1450, approach);
  const py = lerp(485, 668, approach) - 58 * Math.sin(approach * Math.PI);
  const clickPulse = segment(t, T.click, T.click + 0.23);
  if (t >= 5.1 && t <= 8.3) drawPointer(g, px, py, clickPulse);
  const fade = segment(t, T.close - 0.33, T.close);
  if (fade > 0) { g.fillStyle = C.bgDeep; g.globalAlpha = fade; g.fillRect(0, 0, 1920, 1080); g.globalAlpha = 1; }
}

function drawClose(g, t) {
  topLabel(g, '03   /   THE FINISHED CUT', 'CLAUDE MOTION');
  const enter = backOut(segment(t, T.close, T.close + 1.1), 0.8);
  const rise = 70 * (1 - enter);
  const breathe = Math.sin((t - T.close) * 1.13) * 6;
  g.save();
  g.translate(0, rise + breathe);
  text(g, 'Every frame', 950, 492, 164, C.ink, 700, 'center');
  text(g, 'on purpose.', 950, 682, 164, C.ink, 700, 'center');
  g.restore();
  const rule = out(segment(t, T.close + 0.25, T.close + 1.4));
  roundRect(g, 637, 745, 614 * rule, 12, 6, C.accent);
  text(g, 'MAKE   /   PLAY   /   REFINE', 960, 848, 31, C.muted, 500, 'center');
  const a = motion(t, T.close + 0.25, T.close + 1.1);
  g.save(); g.globalAlpha = a;
  g.beginPath(); g.arc(960, 267, 27 + 8 * Math.sin(t - T.close), 0, Math.PI * 2); g.fillStyle = C.accent; g.fill();
  g.restore();
}

/** Draw a complete frame from scratch. No state carried from the previous frame. */
export function drawFrame(g, rawTime) {
  const t = clamp(rawTime, 0, FILM.duration);
  const { width: W, height: H } = FILM;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  backdrop(g, t);
  if (t < T.work) drawIntro(g, t);
  else if (t < T.close) drawWorkbench(g, t);
  else drawClose(g, t);
  g.globalAlpha = 1;
}
