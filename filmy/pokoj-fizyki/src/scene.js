// „TEN POKÓJ ŁAMIE PRAWA FIZYKI!” – scena 3D (three.js). Każda klatka jest funkcją czasu t (deterministycznie).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as TX from './textures.js';

export const W = 1080, H = 1920, FPS = 30, DURATION = 25;

// ───────────────────────── narzędzia ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const ramp = (t, a, b) => smoother((t - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Interpolacja Hermite'a po kluczach {t, v:[...]} – gładka prędkość (C1)
function sampleKeys(keys, t) {
  if (t <= keys[0].t) return keys[0].v.slice();
  const n = keys.length;
  if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
  let i = 0;
  while (t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const h = k1.t - k0.t, u = (t - k0.t) / h;
  const tang = (j) => {
    if (j <= 0 || j >= n - 1) return keys[j].v.map(() => 0);
    const a = keys[j - 1], b = keys[j + 1];
    return keys[j].v.map((_, d) => (b.v[d] - a.v[d]) / (b.t - a.t));
  };
  const m0 = tang(i), m1 = tang(i + 1);
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return k0.v.map((_, d) => h00 * k0.v[d] + h10 * h * m0[d] + h01 * k1.v[d] + h11 * h * m1[d]);
}

// klucze kamery: pozycja + cel -> [x,y,z,yaw,pitch] z „rozwiniętym” yaw
function cameraKeys(list) {
  const out = [];
  let prevYaw = null;
  for (const [t, p, tg] of list) {
    const d = [tg[0] - p[0], tg[1] - p[1], tg[2] - p[2]];
    let yaw = Math.atan2(d[0], d[2]);
    const pitch = Math.atan2(d[1], Math.hypot(d[0], d[2]));
    if (prevYaw !== null) {
      while (yaw - prevYaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw - prevYaw < -Math.PI) yaw += Math.PI * 2;
    }
    prevYaw = yaw;
    out.push({ t, v: [p[0], p[1], p[2], yaw, pitch] });
  }
  return out;
}

function applyCamera(cam, v, roll = 0) {
  cam.position.set(v[0], v[1], v[2]);
  const cp = Math.cos(v[4]);
  cam.up.set(0, 1, 0);
  cam.lookAt(v[0] + Math.sin(v[3]) * cp, v[1] + Math.sin(v[4]), v[2] + Math.cos(v[3]) * cp);
  if (roll) cam.rotateZ(roll);
}

// UV w metrach (ściany) – tapeta nie jest rozciągana
function worldUV(geo, offset, axisU, flipV = false) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset.x, y = pos.getY(i) + offset.y, z = pos.getZ(i) + offset.z;
    uv.setXY(i, axisU === 'x' ? x : z, flipV ? (3 - y) / 3 : y / 3);
  }
  uv.needsUpdate = true;
}

function mesh(geo, mat, { cast = true, receive = true, name } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

function limb(a, b, r, mat) {
  const len = a.distanceTo(b);
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 20), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

// ───────────────────────── materiały ─────────────────────────
function makeMaterials() {
  const floor = TX.woodFloor();
  const woodMap = floor.map.clone();
  woodMap.repeat.set(1, 1);
  woodMap.needsUpdate = true;
  const M = {
    floor: new THREE.MeshStandardMaterial({ map: floor.map, roughnessMap: floor.roughnessMap, roughness: 1, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ map: TX.wallpaper(), roughness: 0.92 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f3f0e8', roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ map: woodMap, color: '#9b7556', roughness: 0.55 }),
    darkWood: new THREE.MeshStandardMaterial({ map: woodMap, color: '#5a3c28', roughness: 0.38 }),
    paint: new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c99d4a', metalness: 1, roughness: 0.28 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#8a3a3c', roughness: 0.92, side: THREE.DoubleSide }),
    shade: new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: 0.8, side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.12 }),
    bulb: new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffd7a0', emissiveIntensity: 6 }),
    rug: new THREE.MeshStandardMaterial({ map: TX.rug(), roughness: 1 }),
    winGlass: new THREE.MeshStandardMaterial({ color: '#dfefff', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#f4fffb', transmission: 1, roughness: 0.04, thickness: 0.035, ior: 1.52, metalness: 0, specularIntensity: 1, envMapIntensity: 2.6, clearcoat: 1, clearcoatRoughness: 0.02, attenuationColor: new THREE.Color('#cfeee4'), attenuationDistance: 0.25 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#eefaff', transmission: 1, roughness: 0.02, thickness: 0.08, ior: 1.33, attenuationColor: new THREE.Color('#62c0ff'), attenuationDistance: 0.3, envMapIntensity: 2.2, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    clockFace: new THREE.MeshStandardMaterial({ map: TX.clockFace(), roughness: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.4, metalness: 0.3 }),
    ball: new THREE.MeshPhysicalMaterial({ map: TX.ballTex(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
    painting: new THREE.MeshStandardMaterial({ map: TX.painting(), roughness: 0.7 }),
    pot: new THREE.MeshStandardMaterial({ color: '#b5603c', roughness: 0.85 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3f7a3a', roughness: 0.6, side: THREE.DoubleSide }),
    soil: new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 }),
    books: ['#7a2b2b', '#2b4a7a', '#2f6a4a', '#c9a24a', '#6a3b7a', '#d9d2c0', '#a5452f', '#1f2b3a'].map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, map: TX.bookSpines() })),
  };
  return M;
}

// ───────────────────────── pokój ─────────────────────────
// Pokój o wnętrzu x∈[x0,x0+6], z∈[-3,3], y∈[0,3]. Ściany jako bryły z otworami.
const ROOM_H = 3, T = 0.15;

function wallPieces(M, { axis, fixed, a0, a1, hole, inner, flipV = false }) {
  // axis 'x': ściana biegnie wzdłuż x w z=fixed (grubość w kierunku z), 'z': wzdłuż z w x=fixed
  const g = new THREE.Group();
  const rects = [];
  if (!hole) rects.push([a0, a1, 0, ROOM_H]);
  else {
    rects.push([a0, hole.u0, 0, ROOM_H], [hole.u1, a1, 0, ROOM_H]);
    if (hole.v0 > 0) rects.push([hole.u0, hole.u1, 0, hole.v0]);
    rects.push([hole.u0, hole.u1, hole.v1, ROOM_H]);
  }
  for (const [u0, u1, v0, v1] of rects) {
    if (u1 - u0 < 1e-3 || v1 - v0 < 1e-3) continue;
    const w = u1 - u0, h = v1 - v0;
    const geo = axis === 'x' ? new THREE.BoxGeometry(w, h, T) : new THREE.BoxGeometry(T, h, w);
    const c = axis === 'x' ? V((u0 + u1) / 2, (v0 + v1) / 2, fixed) : V(fixed, (v0 + v1) / 2, (u0 + u1) / 2);
    worldUV(geo, c, axis, flipV);
    const m = mesh(geo, M.wall, { name: inner });
    m.position.copy(c);
    g.add(m);
  }
  return g;
}

function baseboard(M, axis, fixed, a0, a1, gaps = []) {
  const g = new THREE.Group();
  let segs = [[a0, a1]];
  for (const [g0, g1] of gaps) segs = segs.flatMap(([s0, s1]) => (g1 <= s0 || g0 >= s1 ? [[s0, s1]] : [[s0, g0], [g1, s1]].filter(([p, q]) => q - p > 0.01)));
  for (const [s0, s1] of segs) {
    for (const [h, y, d] of [[0.12, 0.06, 0.02], [0.035, 0.9, 0.025], [0.08, 2.96, 0.05]]) {
      const geo = axis === 'x' ? new THREE.BoxGeometry(s1 - s0, h, d) : new THREE.BoxGeometry(d, h, s1 - s0);
      const m = mesh(geo, M.paint, { cast: false });
      if (axis === 'x') m.position.set((s0 + s1) / 2, y, fixed);
      else m.position.set(fixed, y, (s0 + s1) / 2);
      g.add(m);
    }
  }
  return g;
}

function windowFrame(M, cx, y0, y1, w, zFace, curtains = true) {
  // okno na ścianie z=zFace (wnętrze po stronie +z)
  const g = new THREE.Group();
  const f = 0.07, d = 0.16;
  const add = (sx, sy, sz, x, y, z, mat = M.paint) => {
    const m = mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    g.add(m);
  };
  const zc = zFace - T / 2;
  add(w + f * 2, f, d, cx, y1 + f / 2, zc);
  add(w + f * 2, f, d, cx, y0 - f / 2, zc);
  add(f, y1 - y0, d, cx - w / 2 - f / 2, (y0 + y1) / 2, zc);
  add(f, y1 - y0, d, cx + w / 2 + f / 2, (y0 + y1) / 2, zc);
  add(0.04, y1 - y0, 0.05, cx, (y0 + y1) / 2, zc);
  add(w, 0.04, 0.05, cx, y0 + (y1 - y0) * 0.62, zc);
  add(w + 0.3, 0.04, 0.24, cx, y0 - 0.06, zFace + 0.06); // parapet
  const gl = mesh(new THREE.PlaneGeometry(w, y1 - y0), M.winGlass, { cast: false, receive: false });
  gl.position.set(cx, (y0 + y1) / 2, zc);
  g.add(gl);
  if (curtains) {
    const rod = mesh(new THREE.CylinderGeometry(0.018, 0.018, w + 1.1, 12), M.brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(cx, y1 + 0.17, zFace + 0.14);
    g.add(rod);
    for (const s of [-1, 1]) {
      const cw = 0.42, chh = y1 + 0.17 - 0.1;
      const geo = new THREE.PlaneGeometry(cw, chh, 24, 30);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const gather = 1 - ((y + chh / 2) / chh) * 0.25;
        p.setZ(i, Math.sin((x / cw) * Math.PI * 7) * 0.035 * (0.6 + 0.4 * gather));
        p.setX(i, x * gather);
      }
      geo.computeVertexNormals();
      const c = mesh(geo, M.curtain);
      c.position.set(cx + s * (w / 2 + 0.22), 0.1 + chh / 2, zFace + 0.12);
      g.add(c);
    }
  }
  return g;
}

function buildTable(M) {
  const g = new THREE.Group();
  const top = mesh(new THREE.CylinderGeometry(0.56, 0.55, 0.045, 72), M.wood);
  top.position.y = 0.73;
  g.add(top);
  const apron = mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.07, 48, 1, true), M.darkWood);
  apron.position.y = 0.675;
  g.add(apron);
  const prof = [[0.0, 0.0], [0.24, 0.0], [0.24, 0.03], [0.12, 0.06], [0.06, 0.14], [0.05, 0.4], [0.065, 0.55], [0.05, 0.62], [0.09, 0.65], [0.0, 0.66]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const ped = mesh(new THREE.LatheGeometry(prof, 48), M.darkWood);
  g.add(ped);
  return g;
}

function buildChair(M) {
  // krzesło przodem do +z
  const g = new THREE.Group();
  const seat = mesh(new RoundedBoxGeometry(0.46, 0.045, 0.44, 3, 0.012), M.wood);
  seat.position.y = 0.46;
  g.add(seat);
  for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) {
    const leg = mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.44, 12), M.darkWood);
    leg.position.set(x, 0.22, z);
    g.add(leg);
  }
  for (const x of [-0.2, 0.2]) {
    const post = mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.52, 12), M.darkWood);
    post.position.set(x, 0.73, -0.2);
    g.add(post);
  }
  const rail = mesh(new RoundedBoxGeometry(0.46, 0.08, 0.03, 3, 0.01), M.wood);
  rail.position.set(0, 0.98, -0.2);
  g.add(rail);
  for (const x of [-0.1, 0, 0.1]) {
    const sl = mesh(new THREE.BoxGeometry(0.03, 0.4, 0.015), M.wood);
    sl.position.set(x, 0.74, -0.2);
    g.add(sl);
  }
  const st = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8), M.darkWood);
  st.rotation.z = Math.PI / 2;
  st.position.set(0, 0.16, 0.19);
  g.add(st);
  return g;
}

function buildGlass(M) {
  const g = new THREE.Group();
  g.name = 'glassRig';
  const outer = [[0.0, 0.0], [0.031, 0.0], [0.034, 0.004], [0.036, 0.04], [0.042, 0.125], [0.0395, 0.125], [0.0335, 0.04], [0.031, 0.012], [0.0, 0.012]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const gm = mesh(new THREE.LatheGeometry(outer, 48), M.glass, { cast: true });
  g.add(gm);
  const water = mesh(new THREE.CylinderGeometry(0.037, 0.0328, 0.07, 40), M.water, { cast: false });
  water.name = 'waterIn';
  water.position.y = 0.012 + 0.035;
  g.add(water);
  return g;
}

function buildClock(M) {
  const g = new THREE.Group();
  g.name = 'clock';
  const body = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 64), M.darkWood);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const ring = mesh(new THREE.TorusGeometry(0.215, 0.018, 12, 64), M.brass);
  ring.position.z = 0.027;
  g.add(ring);
  const face = mesh(new THREE.CircleGeometry(0.2, 64), M.clockFace, { cast: false });
  face.position.z = 0.026;
  g.add(face);
  const mk = (len, w, name, z) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    const hand = mesh(new THREE.BoxGeometry(w, len, 0.006), M.black, { cast: false });
    hand.position.y = len / 2 - 0.02;
    pivot.add(hand);
    pivot.position.z = z;
    g.add(pivot);
  };
  mk(0.11, 0.014, 'hourHand', 0.031);
  mk(0.165, 0.009, 'minHand', 0.036);
  mk(0.175, 0.003, 'secHand', 0.04);
  const cap = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 16), M.brass);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.042;
  g.add(cap);
  return g;
}

function buildLamp(M, y0 = ROOM_H) {
  const g = new THREE.Group();
  const cord = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.58, 8), M.black);
  cord.position.y = y0 - 0.29;
  g.add(cord);
  const prof = [[0.03, 0.0], [0.06, -0.02], [0.17, -0.18], [0.2, -0.24], [0.205, -0.25]].map(([r, y]) => new THREE.Vector2(r, y));
  const shade = mesh(new THREE.LatheGeometry(prof, 48), M.shade, { cast: true });
  shade.position.y = y0 - 0.58;
  g.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(0.045, 24, 16), M.bulb, { cast: false });
  bulb.position.y = y0 - 0.58 - 0.12;
  g.add(bulb);
  const rose = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), M.paint);
  rose.position.y = y0 - 0.015;
  g.add(rose);
  return g;
}

function buildShelf(M, seed = 1) {
  // regał przy ścianie, przodem do +x
  const g = new THREE.Group();
  const R = TX.rng(seed);
  const w = 1.1, h = 1.85, d = 0.32;
  const add = (sx, sy, sz, x, y, z) => {
    const m = mesh(new THREE.BoxGeometry(sx, sy, sz), M.darkWood);
    m.position.set(x, y, z);
    g.add(m);
  };
  add(d, h, 0.03, d / 2, h / 2, -w / 2);
  add(d, h, 0.03, d / 2, h / 2, w / 2);
  add(0.02, h, w, 0.01, h / 2, 0);
  const levels = [0.05, 0.5, 0.95, 1.4, 1.83];
  for (const y of levels) add(d, 0.03, w, d / 2, y, 0);
  for (let L = 0; L < 4; L++) {
    let z = -w / 2 + 0.04;
    while (z < w / 2 - 0.08) {
      const bw = 0.025 + R() * 0.035, bh = 0.24 + R() * 0.13, bd = 0.2 + R() * 0.06;
      const b = mesh(new THREE.BoxGeometry(bd, bh, bw), M.books[Math.floor(R() * M.books.length)]);
      const tilt = R() < 0.1 ? 0.2 : 0;
      b.position.set(0.03 + bd / 2, levels[L] + 0.015 + bh / 2, z + bw / 2);
      b.rotation.x = tilt;
      g.add(b);
      z += bw + 0.004 + (tilt ? 0.04 : 0);
      if (R() < 0.06) z += 0.08;
    }
  }
  return g;
}

function buildPlant(M, seed = 2) {
  const g = new THREE.Group();
  const R = TX.rng(seed);
  const pot = mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 32), M.pot);
  pot.position.y = 0.18;
  g.add(pot);
  const soil = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.02, 24), M.soil);
  soil.position.y = 0.34;
  g.add(soil);
  for (let i = 0; i < 16; i++) {
    const a = R() * Math.PI * 2, lean = 0.3 + R() * 0.6, len = 0.45 + R() * 0.5;
    const leafGeo = new THREE.SphereGeometry(1, 12, 8);
    leafGeo.scale(0.07, len / 2, 0.015);
    const leaf = mesh(leafGeo, M.leaf);
    leaf.position.set(Math.sin(a) * lean * len * 0.45, 0.35 + Math.cos(lean) * len * 0.5, Math.cos(a) * lean * len * 0.45);
    leaf.rotation.set(Math.cos(a) * lean, a, -Math.sin(a) * lean * 0.2);
    g.add(leaf);
  }
  return g;
}

function buildPainting(M) {
  const g = new THREE.Group();
  const fr = mesh(new THREE.BoxGeometry(0.86, 0.66, 0.04), M.brass);
  g.add(fr);
  const p = mesh(new THREE.PlaneGeometry(0.76, 0.56), M.painting, { cast: false });
  p.position.z = 0.021;
  g.add(p);
  return g;
}

function buildCabinet(M) {
  const g = new THREE.Group();
  const b = mesh(new RoundedBoxGeometry(1.0, 0.78, 0.42, 3, 0.015), M.wood);
  b.position.y = 0.42;
  g.add(b);
  for (const x of [-0.25, 0.25]) {
    const d = mesh(new THREE.BoxGeometry(0.46, 0.6, 0.02), M.darkWood);
    d.position.set(x, 0.42, 0.215);
    g.add(d);
    const k = mesh(new THREE.SphereGeometry(0.018, 12, 8), M.brass);
    k.position.set(x + (x < 0 ? 0.17 : -0.17), 0.45, 0.235);
    g.add(k);
  }
  for (const [x, z] of [[-0.45, -0.17], [0.45, -0.17], [-0.45, 0.17], [0.45, 0.17]]) {
    const l = mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.05, 8), M.darkWood);
    l.position.set(x, 0.025, z);
    g.add(l);
  }
  // wazon i książki na komodzie
  const vase = mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.08, 0.08], [0.04, 0.2], [0.05, 0.24], [0.045, 0.245]].map(([r, y]) => new THREE.Vector2(r, y)), 32),
    new THREE.MeshPhysicalMaterial({ color: '#2f5f7a', roughness: 0.15, clearcoat: 1 }));
  vase.position.set(-0.3, 0.81, 0);
  g.add(vase);
  for (let i = 0; i < 3; i++) {
    const bk = mesh(new THREE.BoxGeometry(0.3, 0.04, 0.22), M.books[i + 2]);
    bk.position.set(0.22, 0.83 + i * 0.042, 0);
    bk.rotation.y = i * 0.15;
    g.add(bk);
  }
  return g;
}

// Pierwszy pokój (A): x∈[-3,3]
function buildRoomA(M) {
  const g = new THREE.Group();
  g.name = 'roomA';
  const floor = mesh(new THREE.PlaneGeometry(6, 6), M.floor, { cast: false, name: 'floor' });
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(6, 6), M.ceiling, { cast: false, name: 'ceiling' });
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM_H;
  g.add(ceil);
  const win = { u0: -1.9, u1: -0.5, v0: 0.95, v1: 2.3 };
  const back = wallPieces(M, { axis: 'x', fixed: -3 - T / 2, a0: -3 - T, a1: 3, hole: win });
  back.name = 'wallBack';
  g.add(back);
  const front = wallPieces(M, { axis: 'x', fixed: 3 + T / 2, a0: -3 - T, a1: 3 });
  front.name = 'wallFront';
  g.add(front);
  const left = wallPieces(M, { axis: 'z', fixed: -3 - T / 2, a0: -3, a1: 3 });
  left.name = 'wallLeft';
  g.add(left);
  const trims = new THREE.Group();
  trims.add(baseboard(M, 'x', -2.99, -3, 3));
  trims.add(baseboard(M, 'z', -2.99, -3, 3));
  g.add(trims);
  const trimsFront = baseboard(M, 'x', 2.99, -3, 3);
  trimsFront.name = 'trimFront';
  g.add(trimsFront);
  const trimsRight = baseboard(M, 'z', 2.99, -3, 3, [[-0.28, 0.88]]);
  trimsRight.name = 'trimRight';
  g.add(trimsRight);
  g.add(windowFrame(M, -1.2, win.v0, win.v1, 1.4, -3));

  const rug = mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.012, 72), M.rug, { cast: false });
  rug.position.set(0, 0.006, -0.6);
  g.add(rug);
  const table = buildTable(M);
  table.position.set(0, 0.012, -0.6);
  g.add(table);
  const chairRig = new THREE.Group();
  chairRig.name = 'chairRig';
  const chair = buildChair(M);
  chair.position.y = 0.012;
  chairRig.add(chair);
  chairRig.position.set(-0.95, 0, -0.45);
  chairRig.rotation.y = Math.PI / 2;
  g.add(chairRig);
  const chair2 = buildChair(M);
  chair2.position.set(0.75, 0.012, -1.25);
  chair2.rotation.y = -Math.PI / 2 - 0.5;
  g.add(chair2);
  const glass = buildGlass(M);
  glass.position.set(0.08, 0.7545, -0.55);
  g.add(glass);
  // kolumna wody i krople
  const col = new THREE.Mesh(waterColumnGeo(), M.water);
  col.name = 'waterColumn';
  col.frustumCulled = false;
  col.castShadow = true;
  g.add(col);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), M.water, 30);
  drops.name = 'drops';
  drops.frustumCulled = false;
  drops.castShadow = true;
  g.add(drops);

  const clock = buildClock(M);
  clock.position.set(0.35, 2.05, -2.97);
  g.add(clock);
  const painting = buildPainting(M);
  painting.position.set(1.85, 1.62, -2.98);
  g.add(painting);
  const cab = buildCabinet(M);
  cab.position.set(1.85, 0, -2.75);
  g.add(cab);
  const plant = buildPlant(M, 4);
  plant.position.set(2.5, 0, -2.45);
  g.add(plant);
  const shelf = buildShelf(M, 6);
  shelf.position.set(-2.99, 0, 1.0);
  g.add(shelf);
  const plant2 = buildPlant(M, 8);
  plant2.position.set(-2.55, 0, -0.7);
  plant2.scale.setScalar(0.85);
  g.add(plant2);
  const lamp = buildLamp(M);
  lamp.position.set(0, 0, -0.6);
  g.add(lamp);
  const ball = mesh(new THREE.SphereGeometry(BALL_R, 48, 32), M.ball, { name: 'ball' });
  ball.position.set(...BALL_A);
  g.add(ball);
  return g;
}

// Drugi pokój (B): x∈[3.15, 9.15] – meble na suficie (grupa odbita w pionie)
function buildRoomB(M, spaceTex) {
  const g = new THREE.Group();
  g.name = 'roomB';
  const x0 = 3 + T, cx = x0 + 3;
  const floor = mesh(new THREE.PlaneGeometry(6, 6), M.floor, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.x = cx;
  g.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(6, 6), M.ceiling, { cast: false });
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, ROOM_H, 0);
  g.add(ceil);
  const win = { u0: cx - 0.8 + 0.25, u1: cx + 0.8 + 0.25, v0: 0.7, v1: 2.05 };
  g.add(wallPieces(M, { axis: 'x', fixed: -3 - T / 2, a0: x0, a1: x0 + 6 + T, hole: win, flipV: true }));
  g.add(wallPieces(M, { axis: 'x', fixed: 3 + T / 2, a0: x0, a1: x0 + 6 + T, flipV: true }));
  g.add(wallPieces(M, { axis: 'z', fixed: x0 + 6 + T / 2, a0: -3 - T, a1: 3 + T, flipV: true }));

  // wszystko „do góry nogami”: y -> 3 - y
  const inv = new THREE.Group();
  inv.position.y = ROOM_H;
  inv.scale.y = -1;
  g.add(inv);
  inv.add(baseboard(M, 'x', -2.99, x0, x0 + 6));
  inv.add(baseboard(M, 'x', 2.99, x0, x0 + 6));
  inv.add(baseboard(M, 'z', x0 + 5.99, -3, 3));
  inv.add(baseboard(M, 'z', x0 + 0.01, -3, 3, [[-0.28, 0.88]]));
  inv.add(windowFrame(M, win.u0 + 0.8, ROOM_H - win.v1, ROOM_H - win.v0, 1.6, -3));
  const rug = mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.012, 72), M.rug, { cast: false });
  rug.position.set(cx - 0.2, 0.006, -0.3);
  inv.add(rug);
  const table = buildTable(M);
  table.position.set(cx - 0.2, 0.012, -0.3);
  inv.add(table);
  const ch = buildChair(M);
  ch.position.set(cx - 1.15, 0.012, -0.15);
  ch.rotation.y = Math.PI / 2 + 0.2;
  inv.add(ch);
  const ch2 = buildChair(M);
  ch2.position.set(cx + 0.7, 0.012, -0.9);
  ch2.rotation.y = -Math.PI / 2 - 0.4;
  inv.add(ch2);
  const glass = buildGlass(M);
  glass.position.set(cx - 0.1, 0.7545, -0.25);
  inv.add(glass);
  const shelf = buildShelf(M, 9);
  shelf.rotation.y = Math.PI;
  shelf.position.set(x0 + 5.99, 0, -1.2);
  inv.add(shelf);
  const cab = buildCabinet(M);
  cab.rotation.y = -Math.PI / 2;
  cab.position.set(x0 + 5.75, 0, 1.4);
  inv.add(cab);
  const p = buildPainting(M);
  p.rotation.y = -Math.PI / 2;
  p.position.set(x0 + 5.98, 1.65, 1.4);
  inv.add(p);
  const plant = buildPlant(M, 12);
  plant.position.set(x0 + 0.45, 0, -2.5);
  inv.add(plant);
  const lamp = buildLamp(M);
  lamp.position.set(cx - 0.2, 0, -0.3);
  inv.add(lamp);
  const clock = buildClock(M);
  clock.position.set(cx - 1.4, 2.05, -2.97);
  inv.add(clock);

  // lustro na ścianie z=+3 (zwrócone do wnętrza)
  const mirror = new THREE.Group();
  mirror.position.set(cx + 0.25, ROOM_H - 1.5, 2.97);
  mirror.rotation.y = Math.PI;
  const frame = mesh(new THREE.TorusGeometry(1, 0.06, 16, 96), M.brass);
  frame.scale.set(0.5, 0.75, 0.6);
  mirror.add(frame);
  const back = mesh(new THREE.CircleGeometry(1, 96), M.darkWood);
  back.scale.set(0.5, 0.75, 1);
  back.position.z = -0.01;
  mirror.add(back);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: '#cfd8e0' }));
  surf.name = 'mirrorSurface';
  surf.scale.set(0.47, 0.72, 1);
  surf.position.z = 0.005;
  mirror.add(surf);
  inv.add(mirror);
  return { group: g, mirrorSurface: surf, cx };
}

// ───────────────────────── fizyka obiektów (funkcje czasu) ─────────────────────────
const BALL_R = 0.11;
const BALL_A = [-1.55, BALL_R + 0.0, -1.55];
const WALL_Z = -3 + BALL_R;
const LOOP_C = [-2.45, 1.62], LOOP_R = 0.38;
const BALL_B = [-2.45, BALL_R, WALL_Z];
const SEG1 = Math.hypot(BALL_B[0] - BALL_A[0], BALL_B[2] - BALL_A[2]);
const SEG2 = LOOP_C[1] - LOOP_R - BALL_R;

function ballDist(t) {
  // przyspieszenie przez 0.45 s, potem stała prędkość
  const t0 = 5.0, a = 2.4 / 0.45;
  if (t <= t0) return 0;
  const dt = t - t0;
  if (dt < 0.45) return 0.5 * a * dt * dt;
  const s1 = 0.5 * a * 0.45 * 0.45;
  return s1 + 2.4 * (dt - 0.45);
}

function ballAt(s) {
  // zwraca [pozycja, normalna podłoża]
  if (s <= SEG1) {
    const u = s / SEG1;
    return [V(BALL_A[0] + (BALL_B[0] - BALL_A[0]) * u, BALL_R, BALL_A[2] + (BALL_B[2] - BALL_A[2]) * u), V(0, 1, 0)];
  }
  s -= SEG1;
  if (s <= SEG2) return [V(BALL_B[0], BALL_R + s, WALL_Z), V(0, 0, 1)];
  s -= SEG2;
  const ang = -Math.PI / 2 + s / LOOP_R; // pętla przeciwnie do zegara
  return [V(LOOP_C[0] + Math.cos(ang) * LOOP_R, LOOP_C[1] + Math.sin(ang) * LOOP_R, WALL_Z), V(0, 0, 1)];
}

const _q = new THREE.Quaternion(), _ax = new THREE.Vector3();
function ballState(t) {
  const sEnd = ballDist(t);
  const q = new THREE.Quaternion();
  const steps = Math.ceil(sEnd / 0.01);
  let [prev] = ballAt(0);
  for (let i = 1; i <= steps; i++) {
    const [p, n] = ballAt((sEnd * i) / steps);
    const d = p.clone().sub(prev);
    const len = d.length();
    if (len > 1e-6) {
      _ax.crossVectors(n, d).normalize();
      _q.setFromAxisAngle(_ax, len / BALL_R);
      q.premultiply(_q);
    }
    prev = p;
  }
  const [pos] = ballAt(sEnd);
  return { pos, q };
}

export function glassHover(t) {
  // t może być ujemne (zapętlenie końca z początkiem)
  const lift = smooth((t + 1.2) / 3.4);
  return 0.012 + 0.27 * lift + 0.018 * Math.sin(t * 2.2) * lift;
}
const streamAmt = (t) => smooth((t + 0.9) / 2.6);

function waterColumnGeo() {
  const geo = new THREE.BufferGeometry();
  const M = 56, Rn = 16;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((M + 1) * Rn * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((M + 1) * Rn * 3), 3));
  const idx = [];
  for (let i = 0; i < M; i++)
    for (let j = 0; j < Rn; j++) {
      const a = i * Rn + j, b = i * Rn + ((j + 1) % Rn), c = (i + 1) * Rn + j, d = (i + 1) * Rn + ((j + 1) % Rn);
      idx.push(a, c, b, b, c, d);
    }
  geo.setIndex(idx);
  geo.userData = { M, Rn };
  return geo;
}

function updateWater(col, drops, glassRig, t) {
  const amt = streamAmt(t);
  const base = glassRig.position.clone().add(V(0, 0.07, 0));
  const geo = col.geometry, { M, Rn } = geo.userData;
  const pos = geo.attributes.position;
  const L = 0.06 + 0.95 * amt;
  for (let i = 0; i <= M; i++) {
    const s = i / M;
    const cx = base.x + Math.sin(s * 7 - t * 4.2) * 0.03 * s + Math.sin(s * 13 + t * 2) * 0.008 * s;
    const cz = base.z + Math.cos(s * 5.5 - t * 3.4) * 0.03 * s;
    const cy = base.y + s * L;
    let r = (0.019 * Math.pow(1 - s, 0.7) + 0.0035) * (1 + 0.18 * Math.sin(s * 26 - t * 9));
    if (i === M) r = 0.0005;
    if (i === 0) r = 0.03;
    if (i === 1) r = 0.022;
    for (let j = 0; j < Rn; j++) {
      const a = (j / Rn) * Math.PI * 2;
      pos.setXYZ(i * Rn + j, cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const m = new THREE.Matrix4();
  const top = base.y + L;
  for (let k = 0; k < drops.count; k++) {
    const ph = (k * 0.618034) % 1;
    const u = (t * 0.32 + ph) % 1;
    const life = Math.sin(Math.PI * u);
    const rad = (0.008 + 0.02 * ((k * 0.37) % 1)) * life * amt;
    const ang = t * (1.2 + (k % 3) * 0.3) + ph * Math.PI * 2;
    const sp = 0.05 + 0.32 * u;
    const y = top - 0.25 + u * (2.85 - top + 0.25);
    const sq = 1 + 0.25 * Math.sin(t * 7 + k);
    m.compose(V(base.x + Math.cos(ang) * sp, y, base.z + Math.sin(ang) * sp), new THREE.Quaternion(),
      V(rad * sq, rad / sq, rad * sq));
    drops.setMatrixAt(k, m);
  }
  drops.instanceMatrix.needsUpdate = true;
  const wi = glassRig.getObjectByName('waterIn');
  const lvl = 1 - 0.35 * amt;
  wi.scale.y = lvl;
  wi.position.y = 0.012 + 0.035 * lvl;
}

function clockAngles(t) {
  // 10:10:00 o t=0, normalny bieg do 4.2 s, potem coraz szybciej wstecz
  const t0 = 4.2;
  let sec = Math.floor(Math.max(t, -2));
  let back = 0;
  if (t > t0) {
    const dt = t - t0;
    back = dt < 1.2 ? 4 * dt * dt : 5.76 + 9.6 * (dt - 1.2); // obroty wskazówki minutowej w rad
    sec = Math.floor(t0);
  }
  const min = (10 / 60) * Math.PI * 2 - back;
  return { sec: (sec / 60) * Math.PI * 2 - back * 12, min, hour: ((10 + 10 / 60) / 12) * Math.PI * 2 - back / 12 };
}

function applyRoomState(room, t) {
  const glassRig = room.getObjectByName('glassRig');
  const h = glassHover(t);
  glassRig.position.y = 0.7545 + h;
  glassRig.rotation.set(Math.sin(t * 1.3) * 0.12 * smooth(h * 6), t * 0.4, Math.cos(t * 1.1) * 0.1 * smooth(h * 6));
  updateWater(room.getObjectByName('waterColumn'), room.getObjectByName('drops'), glassRig, t);

  const chair = room.getObjectByName('chairRig');
  const lift = ramp(t, 3.0, 4.6);
  chair.position.y = 0.88 * lift + 0.05 * Math.sin(t * 2.1) * lift;
  chair.rotation.set(0.2 * lift * Math.sin(t * 1.1), Math.PI / 2 + 0.7 * lift + 0.12 * Math.sin(t * 1.3) * lift, 0.14 * lift * Math.cos(t * 0.9));

  const ca = clockAngles(t);
  room.getObjectByName('hourHand').rotation.z = -ca.hour;
  room.getObjectByName('minHand').rotation.z = -ca.min;
  room.getObjectByName('secHand').rotation.z = -ca.sec;

  const ball = room.getObjectByName('ball');
  const bs = ballState(t);
  ball.position.copy(bs.pos);
  ball.quaternion.copy(bs.q);
}

// ───────────────────────── kosmos: planeta i latające wyspy ─────────────────────────
function planetMaterial(tex, lightDir) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, ldir: { value: lightDir.clone().normalize() } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.);
      vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 ldir; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 c=texture2D(map,vUv).rgb; c=pow(c,vec3(2.2));
      float d=max(dot(vN,ldir),0.); float term=smoothstep(-0.15,0.35,dot(vN,ldir));
      float rim=pow(1.-max(dot(vN,vV),0.),3.);
      vec3 col=c*(0.03+1.5*d*term)+vec3(0.55,0.65,1.0)*rim*0.9*(0.25+term);
      gl_FragColor=vec4(col,1.); }`,
  });
}

function buildSpace(sky, { R = 16, planetPos = V(0, 0, -50), islands = [] } = {}) {
  const g = new THREE.Group();
  const ld = V(-0.6, 0.35, 0.7);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), planetMaterial(TX.planet(), ld));
  planet.position.copy(planetPos);
  planet.rotation.z = 0.25;
  planet.name = 'planet';
  g.add(planet);
  const ringGeo = new THREE.RingGeometry(R * 1.35, R * 2.2, 160, 1);
  const p = ringGeo.attributes.position, uv = ringGeo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    uv.setXY(i, (r - R * 1.35) / (R * 0.85), 0.5);
  }
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: TX.ringTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: '#c9b9a8' }));
  ring.position.copy(planetPos);
  ring.rotation.set(Math.PI / 2 - 0.32, 0.18, 0.25);
  g.add(ring);
  // atmosfera
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(mat3(modelMatrix)*normal);
      vec4 wp=modelMatrix*vec4(position,1.); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(vN,vV)),2.5);
      gl_FragColor=vec4(vec3(0.45,0.6,1.0)*f*1.6,1.); }`,
  }));
  atm.position.copy(planetPos);
  g.add(atm);
  const rock = new THREE.MeshStandardMaterial({ map: TX.rockTex(), roughness: 0.95, color: '#c0aa95', emissive: '#2a1c30', emissiveIntensity: 0.6 });
  const grass = new THREE.MeshStandardMaterial({ color: '#5f9a4a', roughness: 0.9, emissive: '#1a3a2a', emissiveIntensity: 0.5 });
  const trunk = new THREE.MeshStandardMaterial({ color: '#5a3c28', roughness: 0.9 });
  const crown = new THREE.MeshStandardMaterial({ color: '#3f8a4a', roughness: 0.8, emissive: '#102a18', emissiveIntensity: 0.6 });
  const fall = new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#7fd0ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.75 });
  islands.forEach(([pos, s, seed]) => {
    const R2 = TX.rng(seed);
    const isl = new THREE.Group();
    isl.name = 'island';
    isl.userData = { base: pos.clone(), seed };
    const geo = new THREE.ConeGeometry(1, 1.8, 18, 8);
    geo.rotateX(Math.PI);
    const pp = geo.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
      const n = 1 + 0.22 * Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + y * 2 + seed) + (R2() - 0.5) * 0.12;
      pp.setXYZ(i, x * n, y + (y > 0.85 ? 0 : (R2() - 0.5) * 0.12), z * n);
    }
    geo.computeVertexNormals();
    const body = new THREE.Mesh(geo, rock);
    body.position.y = -0.9;
    isl.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.0, 0.16, 24), grass);
    isl.add(top);
    for (let k = 0; k < 4; k++) {
      const a = R2() * 6.28, r = R2() * 0.6;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 8), trunk);
      tr.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
      isl.add(tr);
      const cr = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 10), crown);
      cr.position.set(Math.cos(a) * r, 0.7, Math.sin(a) * r);
      isl.add(cr);
    }
    if (seed % 2 === 0) {
      const wf = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.02, 2.4, 10, 1, true), fall);
      wf.position.set(0.9, -1.1, 0.2);
      isl.add(wf);
    }
    isl.scale.setScalar(s);
    isl.position.copy(pos);
    g.add(isl);
  });
  return g;
}

function animateSpace(g, t) {
  g.traverse((o) => {
    if (o.name === 'island') {
      const { base, seed } = o.userData;
      o.position.y = base.y + Math.sin(t * 0.7 + seed) * 0.25;
      o.rotation.y = t * 0.05 * ((seed % 3) - 1) + seed;
    }
    if (o.name === 'planet') o.rotation.y = t * 0.02;
  });
}

// ───────────────────────── robot z kulą ─────────────────────────
function buildRobot() {
  const white = new THREE.MeshPhysicalMaterial({ color: '#eef1f6', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 });
  const grey = new THREE.MeshStandardMaterial({ color: '#8e98a8', roughness: 0.35, metalness: 0.7 });
  const visorM = new THREE.MeshPhysicalMaterial({ color: '#0b0f1a', roughness: 0.08, clearcoat: 1, metalness: 0.2 });
  const glow = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#58f3ff', emissiveIntensity: 4 });
  const pink = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff6fae', emissiveIntensity: 1.6 });
  const orange = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffb24a', emissiveIntensity: 5 });
  const r = new THREE.Group();
  r.name = 'robot';
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 2.05, -0.8);
  r.add(head);
  head.add(mesh(new RoundedBoxGeometry(1.8, 1.3, 1.25, 8, 0.42), white));
  const visor = mesh(new RoundedBoxGeometry(1.45, 0.92, 0.2, 8, 0.2), visorM);
  visor.position.z = 0.56;
  head.add(visor);
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.CapsuleGeometry(0.09, 0.14, 8, 16), glow, { cast: false });
    eye.name = s < 0 ? 'eyeL' : 'eyeR';
    eye.position.set(s * 0.3, 0.08, 0.67);
    head.add(eye);
    const cheek = mesh(new THREE.CircleGeometry(0.08, 24), pink, { cast: false });
    cheek.position.set(s * 0.52, -0.16, 0.665);
    head.add(cheek);
    const ear = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 32), grey);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(s * 0.95, 0, 0);
    head.add(ear);
    const earGlow = mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 32), glow, { cast: false });
    earGlow.rotation.y = Math.PI / 2;
    earGlow.position.set(s * 1.05, 0, 0);
    head.add(earGlow);
  }
  const smile = mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 32, Math.PI), glow, { cast: false });
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.12, 0.67);
  head.add(smile);
  const ant = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.45, 8), grey);
  ant.position.y = 0.85;
  head.add(ant);
  const antBall = mesh(new THREE.SphereGeometry(0.08, 24, 16), orange, { cast: false });
  antBall.name = 'antBall';
  antBall.position.y = 1.1;
  head.add(antBall);
  const neck = mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 24), grey);
  neck.position.set(0, 1.3, -0.95);
  r.add(neck);
  const body = mesh(new RoundedBoxGeometry(1.55, 1.5, 1.05, 8, 0.4), white);
  body.position.set(0, 0.45, -1.35);
  r.add(body);
  const chest = mesh(new THREE.CircleGeometry(0.16, 32), glow, { cast: false });
  chest.position.set(0, 0.75, -0.82);
  r.add(chest);
  for (const s of [-1, 1]) {
    const sh = V(s * 0.9, 0.8, -1.2), el = V(s * 1.45, -0.1, -0.55), wr = V(s * 1.05, -0.5, 0.15);
    const shM = mesh(new THREE.SphereGeometry(0.26, 32, 24), grey);
    shM.position.copy(sh);
    r.add(shM);
    r.add(limb(sh, el, 0.17, white));
    const elM = mesh(new THREE.SphereGeometry(0.18, 24, 16), grey);
    elM.position.copy(el);
    r.add(elM);
    r.add(limb(el, wr, 0.15, white));
    const hand = mesh(new THREE.SphereGeometry(0.22, 32, 24), white);
    hand.position.set(s * 0.93, -0.5, 0.2);
    hand.scale.set(0.8, 1, 1.1);
    r.add(hand);
    for (let f = 0; f < 3; f++) {
      const a = V(s * 0.86, -0.42 + f * 0.13, 0.32), b = V(s * 0.7, -0.35 + f * 0.17, 0.5);
      r.add(limb(a, b, 0.055, white));
    }
    const th = limb(V(s * 0.85, -0.6, 0.0), V(s * 0.66, -0.78, -0.1), 0.06, white);
    r.add(th);
  }
  return r;
}

// ───────────────────────── złożenie sceny ─────────────────────────
export async function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const M = makeMaterials();
  const sky = TX.spaceSky();

  // ── wnętrze (oba pokoje) ──
  const interior = new THREE.Scene();
  interior.environment = envTex;
  interior.environmentIntensity = 0.32;
  interior.background = new THREE.Color('#000');
  const roomA = buildRoomA(M);
  interior.add(roomA);
  const B = buildRoomB(M, sky);
  interior.add(B.group);
  // wspólna ściana z drzwiami (x∈[3, 3.15])
  const door = { z0: -0.2, z1: 0.8, h: 2.1 };
  const shared = wallPieces(M, { axis: 'z', fixed: 3 + T / 2, a0: -3 - T, a1: 3 + T, hole: { u0: door.z0, u1: door.z1, v0: 0, v1: door.h } });
  interior.add(shared);
  const casing = new THREE.Group();
  for (const xs of [2.985, 3.165]) {
    const add = (sy, sz, y, z) => {
      const m = mesh(new THREE.BoxGeometry(0.03, sy, sz), M.paint);
      m.position.set(xs, y, z);
      casing.add(m);
    };
    add(door.h + 0.08, 0.08, (door.h + 0.08) / 2, door.z0 - 0.04);
    add(door.h + 0.08, 0.08, (door.h + 0.08) / 2, door.z1 + 0.04);
    add(0.08, door.z1 - door.z0 + 0.16, door.h + 0.04, (door.z0 + door.z1) / 2);
  }
  interior.add(casing);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(3.075, 0, door.z0 + 0.01);
  const leafW = door.z1 - door.z0 - 0.02;
  const leaf = mesh(new RoundedBoxGeometry(0.045, door.h - 0.01, leafW, 2, 0.008), M.paint);
  leaf.position.set(0, (door.h - 0.01) / 2, leafW / 2);
  doorPivot.add(leaf);
  for (const [y, hh] of [[0.55, 0.75], [1.5, 0.85]]) for (const xs of [-1, 1]) {
    const pnl = mesh(new THREE.BoxGeometry(0.012, hh, leafW - 0.26), M.paint);
    pnl.position.set(xs * 0.026, y, leafW / 2);
    doorPivot.add(pnl);
  }
  for (const xs of [-1, 1]) {
    const k = mesh(new THREE.SphereGeometry(0.032, 20, 14), M.brass);
    k.position.set(xs * 0.06, 1.0, leafW - 0.09);
    doorPivot.add(k);
    const kr = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), M.brass);
    kr.rotation.z = Math.PI / 2;
    kr.position.set(xs * 0.035, 1.0, leafW - 0.09);
    doorPivot.add(kr);
  }
  interior.add(doorPivot);

  // krajobraz za oknem A
  const land = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 9), new THREE.MeshBasicMaterial({ map: TX.landscape(), color: '#ffffff' }));
  land.position.set(-3.75, 2.2, -10);
  interior.add(land);
  // kosmos za oknem B (odbity w pionie, bo po obrocie pokoju „góra” to -y)
  const spaceB = new THREE.Group();
  spaceB.position.y = ROOM_H;
  spaceB.scale.y = -1;
  const skyB = new THREE.Mesh(new THREE.SphereGeometry(120, 64, 32), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, color: '#b0b0b0' }));
  skyB.position.set(6.4, 1.5, 0);
  spaceB.add(skyB);
  spaceB.add(buildSpace(sky, {
    R: 15, planetPos: V(14, 6.5, -46),
    islands: [[V(4.2, 2.8, -12), 1.0, 2], [V(9.8, 0.2, -16), 1.4, 3], [V(1.5, -1.0, -20), 1.7, 4], [V(12.5, 4.5, -24), 1.2, 5], [V(6.5, 5.0, -18), 0.7, 7], [V(3.0, 1.0, -9), 0.45, 8]],
  }));
  interior.add(spaceB);

  // światła wnętrza
  const hemi = new THREE.HemisphereLight('#e4ecff', '#5a4632', 0.35);
  interior.add(hemi);
  const sun = new THREE.SpotLight('#ffe2b8', 900, 0, 0.22, 0.6, 2);
  sun.position.set(-3.6, 6.2, -9.5);
  sun.target.position.set(-0.7, 0, 0.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 20;
  interior.add(sun, sun.target);
  const lampA = new THREE.PointLight('#ffc98a', 2.3, 7.5, 2);
  lampA.position.set(0, 2.3, -0.6);
  lampA.castShadow = true;
  lampA.shadow.mapSize.set(1024, 1024);
  lampA.shadow.bias = -0.002;
  lampA.shadow.radius = 4;
  interior.add(lampA);
  const fillA = new THREE.PointLight('#fff1e0', 3.5, 9, 2);
  fillA.position.set(1.2, 2.2, 2.3);
  interior.add(fillA);
  const lampB = new THREE.PointLight('#ffc98a', 3.2, 7.5, 2);
  lampB.position.set(B.cx - 0.2, ROOM_H - 2.3, -0.3);
  lampB.castShadow = true;
  lampB.shadow.mapSize.set(1024, 1024);
  lampB.shadow.bias = -0.002;
  interior.add(lampB);
  const cosmic = new THREE.SpotLight('#9a8cff', 1500, 0, 0.3, 0.7, 2);
  // po obrocie pokoju „góra” to -y, więc światło z kosmosu pada od dołu (w układzie świata)
  cosmic.position.set(B.cx + 2.0, -2.0, -10);
  cosmic.target.position.set(B.cx, ROOM_H, 0.5);
  cosmic.castShadow = true;
  cosmic.shadow.mapSize.set(1024, 1024);
  cosmic.shadow.bias = -0.0004;
  interior.add(cosmic, cosmic.target);
  const fillB = new THREE.PointLight('#c9d4ff', 3.0, 9, 2);
  fillB.position.set(B.cx - 1.5, 0.9, 1.5);
  interior.add(fillB);

  // ── zewnątrz: robot trzyma szklaną kulę ──
  const exterior = new THREE.Scene();
  exterior.background = sky;
  exterior.backgroundIntensity = 0.9;
  exterior.environment = envTex;
  exterior.environmentIntensity = 0.55;
  exterior.add(buildSpace(sky, {
    R: 22, planetPos: V(-26, 10, -70),
    islands: [[V(9, 3, -22), 1.6, 2], [V(-12, -6, -26), 2.2, 3], [V(14, -5, -34), 2.0, 4], [V(-5, 8, -30), 1.0, 5], [V(5, -9, -20), 1.2, 6]],
  }));
  const robot = buildRobot();
  exterior.add(robot);
  const globe = new THREE.Group();
  globe.name = 'globe';
  exterior.add(globe);
  const sphere = mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, roughness: 0.0, thickness: 0.08, ior: 1.25, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, specularIntensity: 1,
  }), { cast: false });
  globe.add(sphere);
  const baseDisc = mesh(new THREE.CylinderGeometry(0.9, 0.87, 0.08, 64), M.soil);
  baseDisc.position.y = -0.36;
  globe.add(baseDisc);
  // miniatura pokoju A (przekrój – bez przedniej, prawej ściany i sufitu)
  const mini = roomA.clone(true);
  mini.traverse((o) => {
    if (['ceiling', 'wallFront', 'trimFront', 'trimRight'].includes(o.name)) o.visible = false;
  });
  const miniWrap = new THREE.Group();
  miniWrap.scale.setScalar(0.165);
  miniWrap.position.y = -0.32;
  miniWrap.rotation.y = -0.45;
  miniWrap.add(mini);
  globe.add(miniWrap);
  // ściana z drzwiami w miniaturze – tylko połowa (przekrój)
  const miniLight = new THREE.PointLight('#ffc98a', 0.35, 1.2, 2);
  miniLight.position.set(0, 0.0, -0.05);
  globe.add(miniLight);
  const sparkles = new THREE.Points(
    (() => { const gg = new THREE.BufferGeometry(); const R3 = TX.rng(77); const a = [];
      for (let i = 0; i < 140; i++) { const u = R3() * 2 - 1, th = R3() * 6.28, rr = Math.cbrt(R3()) * 0.92;
        a.push(Math.sqrt(1 - u * u) * Math.cos(th) * rr, u * rr * 0.9 + 0.1, Math.sqrt(1 - u * u) * Math.sin(th) * rr); }
      gg.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return gg; })(),
    new THREE.PointsMaterial({ color: '#ffe9b0', size: 0.022, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  globe.add(sparkles);

  const key = new THREE.DirectionalLight('#fff1e2', 2.6);
  key.position.set(4, 6, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
  key.shadow.bias = -0.0005;
  exterior.add(key);
  const rim = new THREE.DirectionalLight('#a07bff', 2.4);
  rim.position.set(-6, 3, -6);
  exterior.add(rim);
  const warm = new THREE.DirectionalLight('#ffb38a', 1.0);
  warm.position.set(-8, 1, 2);
  exterior.add(warm);
  exterior.add(new THREE.HemisphereLight('#93a8ff', '#1a1030', 0.5));

  // ── kamery, cele renderowania, postprocessing ──
  const camI = new THREE.PerspectiveCamera(55, W / H, 0.03, 400);
  const camE = new THREE.PerspectiveCamera(42, W / H, 0.03, 400);
  const mirrorCam = new THREE.PerspectiveCamera(44, 0.47 / 0.72, 0.05, 400);
  mirrorCam.position.set(0, 0.85, 6.6);
  mirrorCam.lookAt(0, 0.75, 0);
  const rtOpts = { type: THREE.HalfFloatType, samples: 4 };
  const mirrorRT = new THREE.WebGLRenderTarget(560, 860, rtOpts);
  B.mirrorSurface.material = new THREE.MeshBasicMaterial({ map: mirrorRT.texture, color: '#e9eef2' });
  const otherRT = new THREE.WebGLRenderTarget(W, H, rtOpts);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, rtOpts));
  const renderPass = new RenderPass(interior, camI);
  composer.addPass(renderPass);
  const mixPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tOther: { value: null }, mixv: { value: 0 }, flash: { value: 0 }, vig: { value: 0.32 }, seed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tOther; uniform float mixv; uniform float flash; uniform float vig; uniform float seed; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+seed)*43758.5453); }
      void main(){ vec3 a=texture2D(tDiffuse,vUv).rgb; vec3 b=texture2D(tOther,vUv).rgb; vec3 c=mix(a,b,mixv);
        c+=vec3(1.0,0.97,0.92)*flash;
        vec2 q=vUv-0.5; q.x*=0.75; float v=1.-vig*smoothstep(0.18,0.75,length(q)); c*=v;
        c*=1.+(h(vUv*vec2(1080.,1920.))-0.5)*0.035;
        gl_FragColor=vec4(c,1.); }`,
  });
  composer.addPass(mixPass);
  mixPass.uniforms.tOther.value = otherRT.texture;
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.22, 0.5, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ───── oś czasu kamery ─────
  const keysI = cameraKeys([
    [-0.9, [0.95, 1.32, 1.25], [0.08, 1.02, -0.55]],
    [0.0, [0.58, 1.12, 0.3], [0.08, 0.98, -0.55]],
    [2.7, [0.45, 1.22, 0.08], [0.08, 1.32, -0.55]],
    [4.0, [0.95, 1.45, 1.5], [-0.7, 1.05, -0.5]],
    [5.3, [1.2, 1.55, 2.0], [-0.3, 1.65, -1.9]],
    [6.5, [1.2, 1.55, 2.2], [-1.75, 1.45, -2.4]],
    [7.7, [1.45, 1.5, 1.6], [2.8, 1.25, 0.1]],
    [8.9, [1.35, 1.45, 0.65], [3.0, 1.15, 0.3]],
    [10.4, [2.0, 1.45, 0.33], [4.5, 1.6, 0.3]],
    [11.9, [2.6, 1.5, 0.31], [5.0, 1.75, 0.3]],
    [13.1, [4.7, 1.5, 0.3], [7.0, 1.55, 0.3]],
    [15.3, [5.3, 1.5, 0.25], [7.5, 1.5, 0.1]],
    [16.6, [5.8, 1.5, 0.1], [6.6, 1.5, -3.0]],
    [17.8, [6.3, 1.5, -1.25], [6.65, 1.45, -3.0]],
    [18.35, [6.35, 1.5, -0.8], [9.0, 1.5, 0.5]],
    [18.9, [6.4, 1.5, -0.2], [6.6, 1.5, 3.0]],
    [20.1, [6.6, 1.5, 1.75], [6.65, 1.5, 3.0]],
    [20.9, [6.65, 1.5, 2.55], [6.65, 1.5, 3.0]],
  ]);
  const keysE = cameraKeys([
    [20.75, [0, 0.85, 6.6], [0, 0.75, 0]],
    [22.0, [1.7, 1.35, 6.7], [0, 0.6, 0]],
    [23.0, [1.25, 0.8, 5.0], [0, 0.3, 0]],
    [24.0, [0.45, 0.2, 2.65], [0, -0.05, 0]],
    [24.5, [0.12, 0.0, 1.15], [0, -0.15, -0.3]],
  ]);

  const rollAt = (t) => (t < 0 ? 0 : Math.PI * ramp(t, 13.25, 15.25));
  const shake = (t, amp) => [Math.sin(t * 37.1) * amp, Math.sin(t * 29.3 + 1) * amp, Math.sin(t * 41.7 + 2) * amp];

  function renderInterior(t, target) {
    const tg = t >= 24 ? t - 25 : t;
    applyRoomState(roomA, tg);
    doorPivot.rotation.y = 1.7 * ramp(tg, 8.55, 10.2) + 0.03 * Math.sin(tg * 9) * Math.max(0, 1 - Math.abs(tg - 9.3));
    animateSpace(spaceB, t);
    const v = sampleKeys(keysI, tg);
    const sAmp = 0.012 * Math.max(0, Math.sin(Math.PI * clamp((tg - 13.25) / 2.0))) + 0.02 * Math.max(0, 1 - Math.abs(tg - 15.3) * 4);
    const sh = shake(tg, sAmp);
    v[0] += sh[0]; v[1] += sh[1]; v[2] += sh[2];
    applyCamera(camI, v, rollAt(tg) + sh[0] * 0.5);
    // oświetlenie: w drugim pokoju gaśnie słońce z pierwszego
    const inB = tg > 12.6 ? 1 : 0;
    sun.visible = !inB;
    lampA.visible = !inB;
    fillA.visible = !inB;
    lampA.intensity = 2.3 * (1 + 0.04 * Math.sin(tg * 13));
    renderPass.scene = interior;
    renderPass.camera = camI;
    if (target) {
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(interior, camI);
      renderer.setRenderTarget(null);
    }
  }

  function updateExterior(t) {
    animateSpace(exterior, t);
    // mini-pokój = ten sam stan co prawdziwy
    applyRoomState(mini, t >= 24 ? t - 25 : Math.min(t, 21));
    const turn = ramp(t, 22.9, 24.3);
    globe.rotation.y = -0.65 * turn + 0.03 * Math.sin(t * 1.5);
    globe.rotation.z = 0.05 * Math.sin(t * 0.8);
    robot.rotation.y = -0.08 * turn;
    robot.rotation.z = 0.04 * Math.sin(t * 0.9);
    robot.position.y = 0.04 * Math.sin(t * 1.4);
    const head = robot.getObjectByName('head');
    head.rotation.z = 0.08 * Math.sin(t * 0.9) - 0.1 * turn;
    head.rotation.x = 0.12 + 0.05 * turn;
    const blink = Math.max(0, 1 - Math.abs(t - 22.35) * 9) + Math.max(0, 1 - Math.abs(t - 19.4) * 9);
    for (const n of ['eyeL', 'eyeR']) robot.getObjectByName(n).scale.y = 1 - 0.9 * clamp(blink);
    robot.getObjectByName('antBall').material.emissiveIntensity = 4 + 2 * Math.sin(t * 6);
    sparkles.rotation.y = t * 0.15;
  }

  function renderExterior(t, cam, target) {
    updateExterior(t);
    if (cam === camE) applyCamera(camE, sampleKeys(keysE, t));
    renderPass.scene = exterior;
    renderPass.camera = cam;
    if (target) {
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(exterior, cam);
      renderer.setRenderTarget(null);
    }
  }

  function renderFrame(t) {
    mixPass.uniforms.seed.value = (t * 17.13) % 10;
    let mixv = 0, flash = 0;
    // odbicie w lustrze (kamera lustra)
    if (t > 17.6 && t < 21.0) {
      updateExterior(t);
      renderer.setRenderTarget(mirrorRT);
      renderer.clear();
      renderer.render(exterior, mirrorCam);
      renderer.setRenderTarget(null);
    }
    if (t < 20.7) {
      renderInterior(t);
    } else if (t < 21.05) {
      // przenikanie: lustro -> kosmos
      renderInterior(t, otherRT);
      renderExterior(t, camE);
      mixv = 1 - smooth((t - 20.7) / 0.35);
      flash = 0.6 * Math.max(0, 1 - Math.abs(t - 20.88) / 0.17);
    } else if (t < 24.15) {
      renderExterior(t, camE);
    } else if (t < 24.55) {
      renderExterior(t, camE, otherRT);
      renderInterior(t);
      mixv = 1 - smooth((t - 24.15) / 0.4);
      flash = 0.5 * Math.max(0, 1 - Math.abs(t - 24.33) / 0.2);
    } else {
      renderInterior(t);
    }
    // błysk przy obrocie pokoju
    flash += 0.18 * Math.max(0, 1 - Math.abs(t - 15.3) * 5);
    mixPass.uniforms.mixv.value = mixv;
    mixPass.uniforms.flash.value = flash;
    composer.render();
  }

  // pierwsze renderowanie kompiluje shadery
  renderFrame(0);
  renderFrame(21.5);
  renderFrame(19);
  return { renderFrame };
}
