// three-kit: Three.js building blocks for films, so 3D looks designed with a few lines.
//   import * as THREE from 'three';
//   import { view3d, mat, shapes, textPoints, particles, field, canvasTexture } from 'motion/three-kit.js';
// Everything here is built once in init; in render(t) you set transforms from t and call v.render().
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

// A renderer + scene + camera on its own canvas, under (or over) the DOM layers.
// v = view3d(kit, {parent, fov, background: '#111' | null (transparent), exposure, env: 0..1, shadows})
// v.look([x, y, z], [tx, ty, tz]) each frame, then v.render().
export function view3d(kit, { parent, fov = 30, background = null, exposure = 1.0, env = 1, shadows = false, near = 0.1, far = 2000, z = 0 } = {}) {
  const canvas = kit.el('canvas', { class: 'kit-3d', style: `position:absolute;left:0;top:0;width:${kit.W}px;height:${kit.H}px;z-index:${z}` });
  (parent || kit.stage).append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: background == null, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(kit.W, kit.H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  const scene = new THREE.Scene();
  if (background != null) scene.background = new THREE.Color(background);
  if (env > 0) { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = env; }
  const camera = new THREE.PerspectiveCamera(fov, kit.W / kit.H, near, far);
  const v = { THREE, renderer, scene, camera, canvas,
    look(pos, target = [0, 0, 0], roll = 0) { camera.position.set(...pos); camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(...target); return v; },
    // project a 3D point to stage px (for DOM labels pinned to 3D things)
    project(p) { const q = new THREE.Vector3(...p).project(camera); return [(q.x + 1) / 2 * kit.W, (1 - q.y) / 2 * kit.H, q.z]; },
    light(color = '#ffffff', intensity = 2, pos = [3, 6, 4]) { const l = new THREE.DirectionalLight(color, intensity); l.position.set(...pos); if (shadows) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); } scene.add(l); return l; },
    render() { renderer.render(scene, camera); },
  };
  return v;
}

// Materials that read well on camera. Physical materials need an environment (view3d's env does that).
export const mat = {
  clay: (color = '#f2efe8', o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...o }),
  plastic: (color = '#ff5a36', o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .32, metalness: 0, clearcoat: 1, clearcoatRoughness: .18, ...o }),
  chrome: (tint = '#ffffff', o = {}) => new THREE.MeshPhysicalMaterial({ color: tint, roughness: .06, metalness: 1, ...o }),
  // Glass: transmission is slow in software rendering; `cheap` fakes it with a clear, shiny, see-through coat.
  glass: (tint = '#ffffff', { cheap = false, ...o } = {}) => cheap
    ? new THREE.MeshPhysicalMaterial({ color: tint, roughness: .05, metalness: .1, transparent: true, opacity: .35, clearcoat: 1, envMapIntensity: 2, ...o })
    : new THREE.MeshPhysicalMaterial({ color: tint, roughness: .04, metalness: 0, transmission: 1, thickness: .6, ior: 1.45, clearcoat: 1, ...o }),
  glow: (color = '#b6ff3a', o = {}) => new THREE.MeshBasicMaterial({ color, ...o }),
  toon: (color = '#ff5a36', o = {}) => new THREE.MeshToonMaterial({ color, ...o }),
};

// Shapes that motion design keeps reaching for.
export const shapes = {
  // A puffy star: extruded, with a round bevel.
  star({ points = 5, outer = 1, inner = .48, depth = .35, bevel = .16, round = .12 } = {}) {
    const s = new THREE.Shape();
    for (let i = 0; i <= points * 2; i++) {
      const a = Math.PI / 2 + i * Math.PI / points, r = i % 2 ? inner : outer, x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: round, bevelSegments: 8, curveSegments: 6 });
    g.center(); g.computeVertexNormals(); return g;
  },
  // A knot or loop as a smooth tube: knot({p: 2, q: 3}) is the classic; ring() a flat ribbon loop.
  knot({ p = 2, q = 3, radius = 1, tube = .28, segs = 300 } = {}) { return new THREE.TorusKnotGeometry(radius, tube, segs, 48, p, q); },
  ring({ radius = 1, tube = .22, arc = Math.PI * 2 } = {}) { return new THREE.TorusGeometry(radius, tube, 48, 160, arc); },
  // A tube along any points: tube([[x,y,z], …], {radius, closed})
  tube(points, { radius = .15, closed = false, segs = 200 } = {}) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed), segs, radius, 24, closed); },
  // A coin / token / badge: a bevelled disc with a face texture (canvasTexture) on the front, `edge` colour round the rim.
  coin({ radius = 1, thickness = .16, face = null, back = null, color = '#f4c430', edge = null } = {}) {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 96, 1, true), mat.plastic(edge || color, { roughness: .25 }));
    rim.rotation.x = Math.PI / 2; g.add(rim);
    for (const [side, tex] of [[1, face], [-1, back || face]]) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), tex ? new THREE.MeshPhysicalMaterial({ map: tex, roughness: .3, clearcoat: 1, clearcoatRoughness: .15 }) : mat.plastic(color));
      m.position.z = side * thickness / 2; if (side < 0) m.rotation.y = Math.PI; g.add(m);
    }
    return g;
  },
  roundedBox(w = 1, h = 1, d = 1, r = .12) { const g = new THREE.BoxGeometry(w, h, d, 6, 6, 6); const p = g.attributes.position, v = new THREE.Vector3(); const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = new THREE.Vector3(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z))); const n = v.clone().sub(c); if (n.lengthSq() > 0) { n.setLength(r); v.copy(c).add(n); } p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g; },
};

// A texture drawn on a 2D canvas: canvasTexture(512, ctx => { ... }) — logos, coin faces, labels, UI.
export function canvasTexture(size, draw, { h = size } = {}) {
  const c = document.createElement('canvas'); c.width = size; c.height = h;
  draw(c.getContext('2d'), size, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// An SVG string as a texture (async: await it in init).
export async function svgTexture(svg, size = 512) {
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
  return canvasTexture(size, (x, w, h) => x.drawImage(img, 0, 0, w, h));
}

// Points inside the shape of some text (for particles that form words): [[x, y], …] centred, in units of `scale` px.
export function textPoints(text, { font = '800 220px "Inter Tight"', n = 3000, scale = 100, seed = 1, w = 1600, h = 400 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.fillText(text, w / 2, h / 2);
  const d = x.getImageData(0, 0, w, h).data, hits = [];
  for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) if (d[(yy * w + xx) * 4 + 3] > 128) hits.push([xx, yy]);
  const r = kitRng(seed), out = [];
  for (let i = 0; i < n && hits.length; i++) { const p = hits[Math.floor(r() * hits.length)]; out.push([(p[0] - w / 2 + r() * 2) / scale, -(p[1] - h / 2 + r() * 2) / scale]); }
  return out;
}
const kitRng = seed => { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// Particles you position every frame: p = particles(n, {size, colors}); p.set(i => [x, y, z]); add p.points to the scene.
export function particles(n, { size = .03, colors = ['#ffffff'], opacity = 1, seed = 3 } = {}) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = kitRng(seed), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) { tmp.set(colors[Math.floor(r() * colors.length)]); col.set([tmp.r, tmp.g, tmp.b], i * 3); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, transparent: opacity < 1, opacity, sizeAttenuation: true }));
  return { points, n, set(fn) { for (let i = 0; i < n; i++) { const p = fn(i); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; } geo.attributes.position.needsUpdate = true; } };
}

// A field of instanced things (blocks, pegs, dots): f = field(geo, material, cols, rows, {gap}); f.set((i, j, x, z, m) => {...})
// where you write m.y, m.sy (height), m.s (scale), m.color (optional, '#hex') per instance each frame.
export function field(geo, material, cols, rows, { gap = 1 } = {}) {
  const mesh = new THREE.InstancedMesh(geo, material, cols * rows), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cols * rows * 3).fill(1), 3);
  return { mesh, set(fn) {
    let k = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++, k++) {
      const x = (i - (cols - 1) / 2) * gap, z = (j - (rows - 1) / 2) * gap, o = { y: 0, sy: 1, s: 1, color: null }; fn(i, j, x, z, o);
      v.set(x, o.y, z); s.set(o.s, o.s * o.sy, o.s); m4.compose(v, q, s); mesh.setMatrixAt(k, m4);
      if (o.color) { c.set(o.color); mesh.setColorAt(k, c); }
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  } };
}
