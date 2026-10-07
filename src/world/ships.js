import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, lerp, clamp } from '../core/math.js';
import { paint } from './plants.js';

// Ship local frame: +X = bow, +Y = up, +Z = starboard. Waterline at y = 0.
function hullGeometry({ L, W, D, free, sheer = 0.6, bow = 2.2, stern = 0.5, colors }) {
  const NX = 40, NS = 14;
  const pos = [], col = [], idx = [];
  const half = (u) => {
    // u in [-1,1] (stern..bow); half-width profile
    const a = u > 0 ? Math.pow(u, bow) : Math.pow(-u, 4.0) * (1 - stern);
    return (W / 2) * Math.sqrt(Math.max(0, 1 - a));
  };
  const deckY = (u) => free + sheer * u * u + (u > 0.85 ? (u - 0.85) * 4 : 0) * 0.6;
  for (let i = 0; i <= NX; i++) {
    const u = (i / NX) * 2 - 1;
    const x = u * L / 2;
    const hw = half(u);
    const top = deckY(u);
    for (let j = 0; j <= NS; j++) {
      const v = j / NS; // 0 = deck edge, 1 = keel centre
      const ang = v * Math.PI / 2;
      const y = top - (top + D) * Math.sin(ang) ** 0.9 * (v < 1 ? 1 : 1);
      const z = hw * Math.cos(ang) ** 0.6;
      pos.push(x, y, z);
      let c;
      if (y > top - 0.12) c = colors.rail;
      else if (y > colors.stripeY0 && y < colors.stripeY1) c = colors.stripe;
      else if (y > 0.05) c = colors.top;
      else if (y > -0.35) c = colors.boot ?? colors.bottom;
      else c = colors.bottom;
      col.push(...c);
    }
  }
  const row = NS + 1;
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NS; j++) {
      const a = i * row + j, b = a + row, c = a + 1, d = b + 1;
      idx.push(a, c, b, b, c, d);
    }
  // mirror for port side
  const n = pos.length / 3;
  for (let k = 0; k < n; k++) { pos.push(pos[k * 3], pos[k * 3 + 1], -pos[k * 3 + 2]); col.push(col[k * 3], col[k * 3 + 1], col[k * 3 + 2]); }
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NS; j++) {
      const a = n + i * row + j, b = a + row, c = a + 1, d = b + 1;
      idx.push(a, b, c, b, d, c);
    }
  // transom (stern) cap
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // deck
  const shape = new THREE.Shape();
  const pts = [];
  for (let i = 0; i <= NX; i++) { const u = (i / NX) * 2 - 1; pts.push([u * L / 2, half(u) * 0.98]); }
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (const p of pts) shape.lineTo(p[0], p[1]);
  for (let i = pts.length - 1; i >= 0; i--) shape.lineTo(pts[i][0], -pts[i][1]);
  const dg = new THREE.ShapeGeometry(shape, 2);
  dg.rotateX(Math.PI / 2);
  // follow sheer
  const dp = dg.attributes.position;
  for (let k = 0; k < dp.count; k++) { const u = dp.getX(k) / (L / 2); dp.setY(k, deckY(clamp(u, -1, 1)) - 0.08); }
  // plank stripes via vertex colour is too coarse -> plain colour, detail in material noise
  paint(dg, colors.deck);
  dg.computeVertexNormals();
  const out = mergeGeometries([g.toNonIndexed(), stripUV(dg.toNonIndexed())]);
  out.computeVertexNormals();
  return { geo: out, deckY, half };
}
const stripUV = (g) => { g.deleteAttribute('uv'); return g; };

function box(w, h, d, c, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return stripUV(paint(g.toNonIndexed(), c));
}
function cyl(r0, r1, h, c, x, y, z, seg = 8, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return stripUV(paint(g.toNonIndexed(), c));
}

// Canvas sail: bellied quad grid
function sailGeometry(w0, w1, h, belly, color, seed) {
  const r = rng(seed);
  const NX = 8, NY = 8;
  const pos = [], col = [], idx = [];
  for (let j = 0; j <= NY; j++)
    for (let i = 0; i <= NX; i++) {
      const v = j / NY, u = i / NX;
      const w = lerp(w1, w0, v); // w1 top, w0 bottom
      const z = (u - 0.5) * w;
      const y = -v * h;
      const x = Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 0.9 + 0.1) * belly;
      pos.push(x, y, z);
      const seam = 0.94 + 0.06 * Math.sin(u * 40);
      const k = (0.88 + r() * 0.08) * seam * (1 - v * 0.06);
      col.push(color[0] * k, color[1] * k, color[2] * k);
    }
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function triSail(a, b, c, color, belly = 0.6) {
  const g = new THREE.BufferGeometry();
  const m = [(a[0] + b[0] + c[0]) / 3 + belly, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
  const P = [a, b, m, b, c, m, c, a, m];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
  paint(g, color);
  g.computeVertexNormals();
  return g;
}

const MAT = {};
function mats() {
  if (MAT.hull) return MAT;
  MAT.hull = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 });
  MAT.ash = { value: 0 };
  MAT.hull.onBeforeCompile = (sh) => {
    sh.uniforms.uShipAsh = MAT.ash;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN; uniform float uShipAsh;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.46, 0.45, 0.43), uShipAsh * smoothstep(0.55, 0.95, vWN.y));');
  };
  MAT.sail = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  MAT.rope = new THREE.LineBasicMaterial({ color: 0x1a140e, transparent: true, opacity: 0.85 });
  MAT.metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 });
  return MAT;
}

function rigging(lines) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(lines.flat(2), 3));
  const l = new THREE.LineSegments(g, mats().rope);
  return l;
}

// Three-masted merchant barque, ~48 m.
export function setShipAsh(v) { mats(); MAT.ash.value = v; }

export function makeBarque(opts = {}) {
  const M = mats();
  const r = rng(opts.seed ?? 1);
  const L = 48, W = 9.5;
  const hullCol = opts.hull ?? [0.05, 0.05, 0.055];
  const { geo, deckY, half } = hullGeometry({
    L, W, D: 4.2, free: 3.0, sheer: 0.9, bow: 2.0, stern: 0.4,
    colors: { top: hullCol, stripe: opts.stripe ?? [0.75, 0.72, 0.62], stripeY0: 1.6, stripeY1: 2.2, bottom: [0.45, 0.22, 0.12], boot: [0.62, 0.6, 0.55], rail: [0.33, 0.2, 0.1], deck: [0.55, 0.42, 0.28] },
  });
  const parts = [geo];
  const mastX = [13, 1, -12];
  const mastH = [33, 36, 28];
  const wood = [0.42, 0.3, 0.18];
  const sails = [];
  const ropes = [];
  const sailCol = opts.sailColor ?? [0.93, 0.88, 0.76];
  const furled = opts.furled ?? false;
  mastX.forEach((mx, mi) => {
    const base = deckY(mx / (L / 2));
    parts.push(cyl(0.38, 0.16, mastH[mi], wood, mx, base + mastH[mi] / 2, 0, 8));
    const yards = mi === 2 ? 3 : 5;
    for (let k = 0; k < yards; k++) {
      const y = base + 9 + k * ((mastH[mi] - 11) / yards);
      const yl = lerp(19, 9, k / yards) * (mi === 1 ? 1.05 : 0.95);
      parts.push(cyl(0.13, 0.13, yl, wood, mx, y, 0, 6, Math.PI / 2));
      if (furled) {
        parts.push(cyl(0.32, 0.32, yl * 0.92, sailCol.map((c) => c * 0.85), mx + 0.25, y - 0.25, 0, 6, Math.PI / 2));
      } else if (mi < 2 || k < 2) {
        const h = (mastH[mi] - 11) / yards * 0.98;
        const s = sailGeometry(yl * 0.98, yl * 0.88 * (k === yards - 1 ? 0.85 : 1), h, 1.4 + r() * 0.6, sailCol, mi * 10 + k);
        s.translate(mx + 0.3, y, 0);
        sails.push(s);
      }
      ropes.push([[mx, y, -yl / 2], [mx + (mi === 0 ? 4 : -4), base + 0.5, -half(mx / (L / 2)) * 0.95]]);
      ropes.push([[mx, y, yl / 2], [mx + (mi === 0 ? 4 : -4), base + 0.5, half(mx / (L / 2)) * 0.95]]);
    }
    // shrouds
    for (let s = -1; s <= 1; s += 2)
      for (let q = 0; q < 4; q++) ropes.push([[mx, base + mastH[mi] * 0.7, 0], [mx - 1.5 + q * 1.0, base + 0.4, s * half(mx / (L / 2)) * 0.98]]);
  });
  // spanker (gaff sail) on the mizzen
  const ms = triSail([-12.5, deckY(-0.5) + 3, 0], [-22, deckY(-0.92) + 4, 0], [-12.5, deckY(-0.5) + 22, 0], sailCol, 0.0);
  sails.push(ms);
  // bowsprit + jibs
  const by = deckY(1);
  parts.push(cyl(0.3, 0.15, 14, wood, L / 2 + 5, by + 2.2, 0, 6, 0, Math.PI / 2 - 0.28));
  for (let j = 0; j < 3; j++) {
    const tip = [L / 2 + 6 + j * 2.5, by + 2.6 + j * 0.7, 0];
    sails.push(triSail(tip, [13.2, deckY(13 / 24) + 30 - j * 7, 0], [13.2 + 2, deckY(0.6) + 2 + j * 1, 0], sailCol, 0.9));
    ropes.push([tip, [13, deckY(0.55) + 32 - j * 6, 0]]);
  }
  // stays between masts
  ropes.push([[13, deckY(0.54) + 33, 0], [1, deckY(0.04) + 20, 0]], [[1, deckY(0.04) + 36, 0], [-12, deckY(-0.5) + 22, 0]]);
  // deck furniture
  parts.push(box(6, 2.2, 4.2, [0.45, 0.32, 0.2], -4, deckY(-0.16) + 1.0, 0));
  parts.push(box(4, 1.6, 3.2, [0.48, 0.35, 0.22], 7, deckY(0.3) + 0.8, 0));
  parts.push(box(3.0, 1.4, 6.5, [0.4, 0.28, 0.18], -19, deckY(-0.8) + 0.7, 0));
  parts.push(cyl(0.7, 0.7, 0.2, [0.3, 0.2, 0.1], -20.5, deckY(-0.85) + 2.2, 0, 16, 0, Math.PI / 2));
  for (let b = 0; b < 6; b++) parts.push(cyl(0.38, 0.38, 1.0, [0.38, 0.25, 0.14], -8 + b * 0.85, deckY(-0.3) + 0.5, 3.2 - (b % 2) * 0.8, 10));
  // lifeboat
  parts.push(box(6, 0.9, 1.8, [0.85, 0.85, 0.8], -9, deckY(-0.38) + 2.6, 0));
  const hull = new THREE.Mesh(mergeGeometries(parts), M.hull);
  hull.castShadow = true; hull.receiveShadow = true;
  const sailMesh = new THREE.Mesh(mergeGeometries(sails), M.sail);
  sailMesh.castShadow = true; sailMesh.receiveShadow = true;
  const grp = new THREE.Group();
  grp.add(hull, sailMesh, rigging(ropes));
  // flag
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 2, 6, 2), new THREE.MeshStandardMaterial({ color: opts.flag ?? 0xaa2222, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(-12, deckY(-0.5) + mastH[2] + 1, 1.5);
  flag.rotation.y = Math.PI / 2;
  grp.add(flag);
  grp.userData = { deckY, L, W, kind: 'barque', flag };
  return grp;
}

// Steam warship / corvette (SMS Elisabeth) or merchant steamer.
export function makeSteamer(opts = {}) {
  const M = mats();
  const L = opts.L ?? 70, W = opts.W ?? 12;
  const kind = opts.kind ?? 'warship';
  const hc = kind === 'warship' ? [0.04, 0.045, 0.05] : kind === 'excursion' ? [0.86, 0.84, 0.78] : [0.08, 0.08, 0.09];
  const stripe = kind === 'warship' ? [0.82, 0.8, 0.72] : kind === 'excursion' ? [0.12, 0.25, 0.42] : [0.65, 0.12, 0.08];
  const { geo, deckY, half } = hullGeometry({
    L, W, D: 5, free: 3.6, sheer: 0.7, bow: 2.4, stern: 0.55,
    colors: { top: hc, stripe, stripeY0: 2.4, stripeY1: 3.0, bottom: [0.42, 0.14, 0.1], boot: [0.25, 0.22, 0.2], rail: kind === 'excursion' ? [0.9, 0.88, 0.82] : [0.28, 0.2, 0.12], deck: [0.6, 0.48, 0.32] },
  });
  const parts = [geo];
  const wood = [0.4, 0.28, 0.17];
  const ropes = [];
  const funnelCol = kind === 'warship' ? [0.78, 0.62, 0.35] : kind === 'excursion' ? [0.12, 0.12, 0.12] : [0.15, 0.15, 0.15];
  const fx = kind === 'excursion' ? 0 : -2;
  parts.push(cyl(1.6, 1.5, 9, funnelCol, fx, deckY(0) + 6, 0, 16));
  parts.push(cyl(1.62, 1.62, 1.2, kind === 'excursion' ? [0.75, 0.12, 0.08] : [0.1, 0.1, 0.1], fx, deckY(0) + 10, 0, 16));
  // superstructure
  parts.push(box(16, 2.4, W * 0.55, kind === 'excursion' ? [0.92, 0.9, 0.84] : [0.55, 0.45, 0.32], 2, deckY(0.05) + 1.2, 0));
  parts.push(box(6, 2.0, W * 0.45, [0.9, 0.9, 0.86], 6, deckY(0.15) + 3.4, 0));
  if (kind === 'excursion') {
    // awning + paddle boxes
    parts.push(box(30, 0.15, W * 0.95, [0.86, 0.82, 0.7], -8, deckY(-0.2) + 3.4, 0));
    for (const s of [-1, 1]) parts.push(cyl(3.6, 3.6, 2.2, [0.85, 0.83, 0.77], 0, deckY(0) - 0.6, s * (W / 2 + 0.9), 18, Math.PI / 2));
    for (let p = 0; p < 8; p++) parts.push(cyl(0.08, 0.08, 3.2, [0.3, 0.3, 0.3], -22 + p * 4.2, deckY(-0.2) + 1.7, W * 0.44, 4), cyl(0.08, 0.08, 3.2, [0.3, 0.3, 0.3], -22 + p * 4.2, deckY(-0.2) + 1.7, -W * 0.44, 4));
  }
  const masts = kind === 'excursion' ? [14, -18] : [20, 2, -18];
  masts.forEach((mx, i) => {
    const b = deckY(mx / (L / 2));
    const h = kind === 'excursion' ? 18 : 30 - i * 3;
    parts.push(cyl(0.35, 0.15, h, wood, mx, b + h / 2, 0, 8));
    if (kind !== 'excursion') for (let k = 0; k < 3; k++) {
      const y = b + 10 + k * 6.5;
      const yl = 16 - k * 3.5;
      parts.push(cyl(0.12, 0.12, yl, wood, mx, y, 0, 6, Math.PI / 2));
      parts.push(cyl(0.3, 0.3, yl * 0.9, [0.82, 0.78, 0.68], mx + 0.25, y - 0.25, 0, 6, Math.PI / 2));
    }
    for (const s of [-1, 1]) for (let q = 0; q < 3; q++) ropes.push([[mx, b + h * 0.75, 0], [mx - 1 + q, b + 0.4, s * half(mx / (L / 2)) * 0.97]]);
  });
  ropes.push([[masts[0], deckY(0.6) + 28, 0], [L / 2 + 3, deckY(1) + 1, 0]]);
  if (kind === 'warship') {
    for (let g2 = 0; g2 < 5; g2++) for (const s of [-1, 1]) parts.push(cyl(0.25, 0.25, 2.2, [0.12, 0.12, 0.12], -20 + g2 * 9, deckY(0) - 1.2, s * (half(0) + 0.6), 8, Math.PI / 2));
  }
  parts.push(cyl(0.25, 0.15, 10, wood, L / 2 + 3.5, deckY(1) + 2, 0, 6, 0, Math.PI / 2 - 0.25));
  const hull = new THREE.Mesh(mergeGeometries(parts), M.hull);
  hull.castShadow = true; hull.receiveShadow = true;
  const grp = new THREE.Group();
  grp.add(hull, rigging(ropes));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.3, 6, 2), new THREE.MeshStandardMaterial({ color: opts.flag ?? (kind === 'warship' ? 0xdddddd : 0xaa2222), side: THREE.DoubleSide }));
  flag.position.set(-L / 2 + 1, deckY(-1) + 5, 0);
  flag.rotation.y = Math.PI / 2;
  grp.add(flag);
  grp.userData = { deckY, L, W, kind, funnel: [fx, deckY(0) + 11, 0], flag };
  return grp;
}

// Modern container ship ~300 m
export function makeContainerShip() {
  const M = mats();
  const L = 300, W = 44;
  const { geo, deckY } = hullGeometry({
    L, W, D: 14, free: 14, sheer: 1.5, bow: 3.2, stern: 0.25,
    colors: { top: [0.05, 0.1, 0.2], stripe: [0.85, 0.85, 0.85], stripeY0: 12.5, stripeY1: 13.4, bottom: [0.55, 0.12, 0.08], boot: [0.55, 0.12, 0.08], rail: [0.85, 0.85, 0.85], deck: [0.3, 0.32, 0.32] },
  });
  const parts = [geo];
  // superstructure at stern
  parts.push(box(18, 34, 38, [0.92, 0.92, 0.9], -120, deckY(-0.8) + 17, 0));
  parts.push(box(10, 3, 48, [0.92, 0.92, 0.9], -116, deckY(-0.8) + 33, 0));
  parts.push(box(6, 16, 9, [0.85, 0.2, 0.12], -134, deckY(-0.9) + 30, 0));
  const hull = new THREE.Mesh(mergeGeometries(parts), M.hull);
  hull.castShadow = true; hull.receiveShadow = true;
  // containers
  const cg = new THREE.BoxGeometry(12.0, 2.5, 2.4);
  const cm = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.3 });
  const cols = [0xb8322a, 0x1f5fa8, 0xe0a21d, 0x2f8f4a, 0xd8d8d8, 0x7a2f8a, 0xc46a1c, 0x2a8c96, 0x8f1f1f, 0x3a3a3a];
  const r = rng(9);
  const list = [];
  for (let bx = -100; bx < 128; bx += 12.6)
    for (let z = -7; z <= 7; z++) {
      const stack = 3 + Math.floor(r() * 5) - (Math.abs(z) > 6 ? 2 : 0);
      for (let s = 0; s < stack; s++) list.push([bx, deckY(bx / 150) + 1.3 + s * 2.55, z * 2.6, cols[Math.floor(r() * cols.length)]]);
    }
  const im = new THREE.InstancedMesh(cg, cm, list.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  list.forEach(([x, y, z, col], i) => { m.makeTranslation(x, y, z); im.setMatrixAt(i, m); c.setHex(col); im.setColorAt(i, c); });
  im.castShadow = true; im.receiveShadow = true;
  const grp = new THREE.Group();
  grp.add(hull, im);
  grp.userData = { deckY, L, W, kind: 'container' };
  return grp;
}

// Small rowing longboat ~8 m
export function makeLongboat() {
  const M = mats();
  const { geo, deckY } = hullGeometry({
    L: 8, W: 2.2, D: 0.5, free: 0.55, sheer: 0.25, bow: 1.8, stern: 0.5,
    colors: { top: [0.85, 0.83, 0.76], stripe: [0.15, 0.3, 0.5], stripeY0: 0.35, stripeY1: 0.5, bottom: [0.5, 0.3, 0.15], boot: [0.4, 0.3, 0.2], rail: [0.45, 0.32, 0.2], deck: [0.5, 0.38, 0.25] },
  });
  const parts = [geo];
  for (let i = 0; i < 4; i++) parts.push(box(0.25, 0.08, 2.0, [0.5, 0.36, 0.22], -2.6 + i * 1.6, 0.35, 0));
  const g = new THREE.Group();
  const hull = new THREE.Mesh(mergeGeometries(parts), M.hull);
  hull.castShadow = true;
  g.add(hull);
  g.userData = { deckY, L: 8, W: 2.2, kind: 'longboat' };
  return g;
}
