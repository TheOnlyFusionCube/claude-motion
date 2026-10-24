// Style preset gallery: one short scene per preset, each in a different layout
// (statement, stat, quote, poster, stat-in-lights, product screen). Fictional product "Fieldnote".
// Render a contact sheet: node scripts/frames.mjs examples/styles --count 12 --sheet
import { useStyle } from 'motion/styles/index.js';
const { seg, eo, eio, lerp, TextFx } = kit;

const words = (st, html, { x = 160, y = 300, w = 1200 } = {}) => {
  const el = kit.h(`<div class="s-words" style="left:${x}px;top:${y}px;width:${w}px">${html}</div>`);
  st.root.append(el); return el;
};
const creep = (el, t) => { el.style.transform = `translateY(${-2 * t}px)`; };

export default kit.scenes([
  { id: 'sketch', name: 'Sketch', dur: 4,
    async init(k) {
      this.st = await useStyle(k, 'sketch', { palette: 'marker', root: k.stage });
      this.w = words(this.st, '<div class="s-kicker">Fieldnote</div><div class="s-head">Notes that <em>find you</em></div><div class="s-sub">Write it once. It shows up where the work is.</div>', { y: 330 });
      this.head = this.w.querySelector('.s-head'); this.sub = this.w.querySelector('.s-sub');
      this.marks = new k.Marks(k.svgLayer(k.stage)); this.marks.add({ kind: 'arrow', from: [1500, 760], to: [1260, 520], bend: -.25, t0: 2.0, color: '#1d2125', width: 7 });
    },
    render(t) { this.st.ground(t); TextFx.in(this.head, t, -0.5, { from: 'bottom', d: 26 }); this.st.stress(this.head, t, 1.1); this.sub.style.opacity = eo(seg(t, 1.3, 1.8)); this.st.boil(this.head, t); creep(this.w, t); this.marks.render(t); } },

  { id: 'bubbles', name: 'Bubbles', dur: 4,
    async init(k) {
      this.st = await useStyle(k, 'bubbles', { palette: 'cobalt', values: { count: 4 }, root: k.stage });
      this.w = words(this.st, '<div class="s-kicker">This year</div><div class="s-stat">0</div><div class="s-label">teams writing <em>together</em></div>', { y: 300 });
      this.stat = this.w.querySelector('.s-stat'); this.label = this.w.querySelector('.s-label');
    },
    render(t) { this.st.ground(t); this.w.style.opacity = eo(seg(t, 0, .4)); TextFx.count(this.stat, t, 0.2, 1.8, 12400); TextFx.in(this.label, t, 1.0); this.st.stress(this.label, t, 1.8); creep(this.w, t); } },

  { id: 'editorial', name: 'Editorial', dur: 4,
    async init(k) {
      this.st = await useStyle(k, 'editorial', { palette: 'evergreen', root: k.stage });
      this.w = words(this.st, '<div class="s-kicker">From the field</div><div class="s-rule" style="width:180px"></div><div class="s-quote">“We stopped losing decisions in chat. <em>Now they have an address.</em>”</div><div class="s-by">Priya Anand · Head of Operations, Lowmoor Rail</div>', { y: 340, w: 1500 });
      this.q = this.w.querySelector('.s-quote'); this.rule = this.w.querySelector('.s-rule'); this.by = this.w.querySelector('.s-by');
    },
    render(t) { this.st.ground(t); this.st.rule(this.rule, t, 0.1); TextFx.in(this.q, t, 0.2, { from: 'right', d: 24, stagger: .06 }); this.st.stress(this.q, t, 1.6, .6); this.by.style.opacity = eo(seg(t, 2.0, 2.5)); creep(this.w, t); } },

  { id: 'bold', name: 'Bold', dur: 4,
    async init(k) {
      this.st = await useStyle(k, 'bold', { palette: 'ultramarine', values: { shape: 'arcs' }, root: k.stage });
      this.w = words(this.st, '<div class="s-kicker">Fieldnote 3</div><div class="s-head">Write once.<br><em>Share</em> anywhere.</div>', { x: 140, y: 360, w: 1000 });
      this.head = this.w.querySelector('.s-head');
    },
    render(t) { this.st.ground(t); TextFx.mask(this.head, t, 0.1); this.st.stress(this.head, t, 1.2, .35); creep(this.w, t); } },

  { id: 'midnight', name: 'Midnight', dur: 4,
    async init(k) {
      this.st = await useStyle(k, 'midnight', { palette: 'aurora', root: k.stage });
      this.w = words(this.st, '<div class="s-kicker">Uptime, last 12 months</div><div style="height:330px"></div><div class="s-label">of notes synced in <em>under a second</em></div>', { y: 260 });
      this.label = this.w.querySelector('.s-label');
    },
    render(t) { this.st.ground(t); this.st.lights('99.98%', { x: 160, y: 320 - 2 * t, size: 300, t, t0: 0.2, dur: 1.4 }); TextFx.in(this.label, t, 1.2); this.st.stress(this.label, t, 2.0); creep(this.w, t); } },

  { id: 'showcase', name: 'Showcase', dur: 5,
    async init(k) {
      this.st = await useStyle(k, 'showcase', { palette: 'lagoon', root: k.stage });
      this.w = words(this.st, '<div class="s-kicker">Fieldnote</div><div class="s-head">Every decision,<br><em>one place</em></div>', { x: 130, y: 360, w: 760 });
      this.head = this.w.querySelector('.s-head');
      this.win = kit.h(`<div class="s-window" style="left:900px;top:190px;width:900px;height:700px"><div class="s-bar"><i></i><i></i><i></i></div><div class="s-pane" style="padding:36px 40px;font:500 26px/1 Inter">
        ${['Ship date moved to May 12', 'Vendor shortlist: 3 left', 'Design review notes', 'Hiring plan, Q3'].map((s, i) => `<div class="row" style="display:flex;align-items:center;gap:16px;padding:22px 0;border-bottom:1px solid rgba(15,42,51,.08)"><i style="width:14px;height:14px;border-radius:50%;background:${i ? '#c9d6da' : 'var(--main)'}"></i>${s}</div>`).join('')}</div></div>`);
      this.st.root.append(this.win); this.rows = [...this.win.querySelectorAll('.row')];
      this.chip = kit.h('<div class="s-chip" style="position:absolute;left:1360px;top:820px">Decided · 2 min ago</div>'); this.st.root.append(this.chip);
    },
    render(t) {
      this.st.ground(t); TextFx.in(this.head, t, -0.2); this.st.stress(this.head, t, 1.0);
      const p = eo(seg(t, 0.2, 0.9)); this.win.style.opacity = p; this.win.style.transform = `translateY(${(1 - p) * 30}px) scale(${lerp(.97, 1, p) * (1 + 0.006 * t)})`;
      this.rows.forEach((r, i) => { const q = eo(seg(t, 0.7 + i * .15, 1.1 + i * .15)); r.style.opacity = q; r.style.transform = `translateY(${(1 - q) * 12}px)`; });
      const c = eo(seg(t, 2.0, 2.4)); this.chip.style.opacity = c; this.chip.style.transform = `translateY(${(1 - c) * 16}px) scale(${lerp(.96, 1, c)})`;
      creep(this.w, t);
    } },
], {
  title: 'Style presets', width: 1920, height: 1080, fps: 30, background: '#ffffff',
  score(S, k, T) {
    S.tempo(100); S.program('pad', 'pad'); S.program('m', 'marimba');
    S.chord('pad', ['D3', 'A3', 'E4', 'F#4'], { t: 0, dur: T.END, vel: 42 });
    Object.values(T).filter(v => v < T.END).forEach((t0, i) => { S.fx('swipe', t0 + 0.02, { vel: 50 }); S.note('m', ['A5', 'F#5', 'D5', 'E5', 'B4', 'A5'][i % 6], { t: t0 + 0.15, dur: .6, vel: 58 }); });
    S.master({ fadeOut: 1 });
  },
});
