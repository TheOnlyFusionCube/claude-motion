import { FILM, drawFrame, storySample } from './scenes.mjs';
import { clamp } from './motion.mjs';

const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d', { alpha: false });
const button = document.getElementById('toggle');
const seek = document.getElementById('seek');
const clock = document.getElementById('clock');
canvas.width = FILM.width;
canvas.height = FILM.height;
seek.max = String(FILM.duration);
let currentTime = 0;
let playing = false;
let playOrigin = 0;
let timeOrigin = 0;
let animationRequest = null;

function show(t) {
  currentTime = clamp(Number.isFinite(t) ? t : 0, 0, FILM.duration);
  drawFrame(ctx, currentTime);
  seek.value = String(currentTime);
  clock.textContent = `${stamp(currentTime)} / ${stamp(FILM.duration)}`;
  return currentTime;
}
function stamp(time) {
  const n = Math.floor(time);
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function pause() {
  playing = false;
  if (animationRequest !== null) cancelAnimationFrame(animationRequest);
  animationRequest = null;
  button.textContent = 'Play';
  button.setAttribute('aria-label', 'Play film');
}
function tick(now) {
  if (!playing) return;
  const t = timeOrigin + (now - playOrigin) / 1000;
  show(t);
  if (t >= FILM.duration) { pause(); return; }
  animationRequest = requestAnimationFrame(tick);
}
function play() {
  if (playing) return;
  if (currentTime >= FILM.duration) show(0);
  playing = true;
  timeOrigin = currentTime;
  playOrigin = performance.now();
  button.textContent = 'Pause';
  button.setAttribute('aria-label', 'Pause film');
  animationRequest = requestAnimationFrame(tick);
}
function go(t) { pause(); return show(t); }
button.addEventListener('click', () => playing ? pause() : play());
seek.addEventListener('input', () => go(Number(seek.value)));
window.addEventListener('keydown', event => {
  if (event.target === seek || event.target === button) return;
  if (event.code === 'Space' && !event.repeat) { event.preventDefault(); playing ? pause() : play(); }
});

// Stable integration surface for any coding agent's render or test tool.
window.__motion = Object.freeze({
  config: FILM,
  seek: go,
  render: go,
  trace: storySample, // same world/camera functions used by pixel renderer
  play,
  pause,
  get time() { return currentTime; },
});
const initial = Number(new URLSearchParams(location.search).get('t'));
show(Number.isFinite(initial) ? initial : 0);
