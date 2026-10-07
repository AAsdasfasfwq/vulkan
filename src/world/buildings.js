import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, lerp } from '../core/math.js';
import { paint } from './plants.js';
import { NOISE } from './glsl.js';

const prep = (g, c) => { g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv'); return paint(g, c); };
const box = (w, h, d, c, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return prep(g, c); };
const cyl = (r0, r1, h, c, x = 0, y = 0, z = 0, seg = 8) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y, z); return prep(g, c); };
const pyr = (w, h, d, c, x, y, z, ry = 0) => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y + h / 2, z); return prep(g, c); };
const prism = (w, h, d, c, x, y, z, ry = 0) => {
  // gabled roof along x
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2); if (ry) g.rotateY(ry); g.translate(x, y, z);
  return prep(g, c);
};

export const MATS = {};
// Facade detail without textures: colour variation, street-level grime, rain streaks and
// (for brick buildings) a running-bond brick pattern with stone storey bands. The brick
// pattern fades out with screen-space frequency so distant facades never shimmer.
function facade(m, brick) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON; varying vec3 vWQ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = normal; vWQ = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE + '\nvarying vec3 vOP; varying vec3 vON; varying vec3 vWQ;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 an = abs(normalize(vON));
        float wall = 1.0 - smoothstep(0.4, 0.75, an.y);
        vec2 fuv = an.x > an.z ? vOP.zy : vOP.xy;
        float big = vnoise(vWQ.xz * 0.045 + vWQ.y * 0.02);
        diffuseColor.rgb *= 0.86 + 0.26 * big;
        float streak = vnoise(vec2(fuv.x * 1.7, vOP.y * 0.12 + 3.0));
        diffuseColor.rgb *= 1.0 - wall * (0.2 * (1.0 - smoothstep(0.0, 2.2, vOP.y)) + 0.13 * smoothstep(0.55, 0.9, streak));
        ${brick ? `
        vec2 b = fuv / vec2(0.5, 0.17); b.x += 0.5 * floor(b.y);
        vec2 fw = fwidth(b);
        float fade = wall * (1.0 - smoothstep(0.3, 0.8, max(fw.x, fw.y)));
        vec2 f = fract(b);
        float dx = min(f.x, 1.0 - f.x), dy = min(f.y, 1.0 - f.y);
        float mortar = 1.0 - smoothstep(0.035, 0.035 + fw.x, dx) * smoothstep(0.07, 0.07 + fw.y, dy);
        float bn = hash12(floor(b));
        vec3 bc = diffuseColor.rgb * (0.82 + 0.34 * bn);
        bc = mix(bc, vec3(0.34, 0.31, 0.28), mortar * 0.55);
        diffuseColor.rgb = mix(diffuseColor.rgb, bc, fade);
        float sy = mod(vOP.y, 3.6);
        float band = (1.0 - smoothstep(0.24, 0.32, sy)) * step(0.5, vOP.y) * wall;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.44, 0.4, 0.35), band * 0.7);` : ''}
      }`);
  };
  m.customProgramCacheKey = () => 'facade' + (brick ? 1 : 0);
  return m;
}

export function buildingMat() {
  if (!MATS.b) MATS.b = facade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), false);
  return MATS.b;
}
export function brickMat() {
  if (!MATS.brick) MATS.brick = facade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }), true);
  return MATS.brick;
}

// Unlit window panes with frames, mullions, curtains (lit) or dark sky-reflecting glass (unlit).
// style 0 = sash window, 1 = modern curtain-wall panel. Colour scale (material.color) dims them.
export function windowMat(style = 0) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true });
  m.defines = { USE_UV: '' };
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 w = vUv;
        float lum = dot(diffuseColor.rgb, vec3(0.333));
        float lit = smoothstep(0.06, 0.16, lum);
        float fx = ${style ? '0.035' : '0.085'}, fy = ${style ? '0.05' : '0.06'};
        float edge = 1.0 - step(fx, w.x) * step(w.x, 1.0 - fx) * step(fy, w.y) * step(w.y, 1.0 - fy);
        float mull = ${style ? '1.0 - step(0.012, abs(w.x - 0.5))' : 'max(1.0 - step(0.024, abs(w.x - 0.5)), 1.0 - step(0.02, abs(w.y - 0.64)))'};
        float frame = clamp(edge + mull, 0.0, 1.0);
        float curtain = ${style ? '1.0' : 'mix(0.42, 1.0, smoothstep(0.36, 0.2, abs(w.x - 0.5)))'};
        vec3 inside = diffuseColor.rgb * curtain * (0.68 + 0.45 * w.y);
        vec3 glass = mix(vec3(0.025, 0.03, 0.04), vec3(0.12, 0.14, 0.18), smoothstep(0.1, 1.0, w.y + 0.2 * (w.x - 0.5)));
        vec3 c = mix(glass, inside, lit);
        vec3 fc = vec3(${style ? '0.05, 0.055, 0.06' : '0.075, 0.06, 0.05'});
        vec3 res = mix(c, fc, frame);
        vec2 fw = fwidth(w);
        float far = smoothstep(0.1, 0.3, max(fw.x, fw.y));
        diffuseColor.rgb = mix(res, mix(c, fc, 0.3), far);
      }`);
  };
  m.customProgramCacheKey = () => 'window' + style;
  return m;
}

// Javanese stilt hut with thatched roof (~6 m)
export function hutGeometry(seed = 1) {
  const r = rng(seed);
  const wood = [0.42 + r() * 0.1, 0.3, 0.18];
  const thatch = [0.62 + r() * 0.1, 0.5 + r() * 0.08, 0.28];
  const w = 4 + r() * 2, d = 3.5 + r() * 1.5;
  const parts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(cyl(0.12, 0.12, 1.6, [0.3, 0.22, 0.14], sx * w * 0.45, 0.8, sz * d * 0.45, 6));
  parts.push(box(w, 0.2, d, wood, 0, 1.6, 0));
  parts.push(box(w * 0.94, 2.1, d * 0.92, [0.7, 0.58, 0.38], 0, 2.75, 0));
  parts.push(box(1, 1.5, 0.05, [0.2, 0.14, 0.08], 0, 2.5, d * 0.47));
  parts.push(prism(w * 1.25, 2.4, d * 1.4, thatch, 0, 3.8, 0));
  parts.push(box(0.4, 0.15, 1.4, wood, 0, 1.0, d * 0.8));
  return mergeGeometries(parts);
}

// Dutch colonial house: white walls, red tiled hip roof, veranda columns
export function colonialGeometry(seed = 1) {
  const r = rng(seed);
  const w = 10 + r() * 8, d = 8 + r() * 4, h = 4.5 + r() * 1.5;
  const wall = [0.9, 0.88, 0.82], roof = [0.62 + r() * 0.1, 0.22, 0.12];
  const parts = [box(w, h, d, wall, 0, h / 2, 0)];
  parts.push(pyr(w * 1.2, 3.2, d * 1.25, roof, 0, h, 0));
  for (let i = 0; i < 5; i++) parts.push(cyl(0.18, 0.18, h - 0.4, [0.95, 0.94, 0.9], -w / 2 + 0.6 + i * ((w - 1.2) / 4), (h - 0.4) / 2, d / 2 + 1.6, 8));
  parts.push(box(w + 1, 0.3, 3.4, [0.6, 0.55, 0.5], 0, 0.15, d / 2 + 1.2));
  for (let i = 0; i < 4; i++) parts.push(box(1.0, 1.8, 0.1, [0.12, 0.22, 0.18], -w / 2 + 1.8 + i * ((w - 3.6) / 3), h * 0.5, d / 2 + 0.05));
  return mergeGeometries(parts);
}

// Victorian brick building / warehouse with lit windows option
export function brickGeometry(seed = 1, opts = {}) {
  const r = rng(seed);
  const w = opts.w ?? 12 + r() * 14, d = opts.d ?? 10 + r() * 8, floors = opts.floors ?? 3 + Math.floor(r() * 4);
  const fh = 3.6;
  const h = floors * fh;
  const brick = opts.color ?? [[0.42, 0.18, 0.12], [0.5, 0.25, 0.15], [0.35, 0.2, 0.15], [0.55, 0.5, 0.42]][Math.floor(r() * 4)];
  const parts = [box(w, h, d, brick, 0, h / 2, 0)];
  parts.push(box(w + 0.6, 0.5, d + 0.6, [0.25, 0.22, 0.2], 0, h + 0.25, 0));
  if (r() < 0.6) parts.push(prism(w, 3, d, [0.2, 0.22, 0.25], 0, h + 0.5, 0));
  // chimneys
  for (let i = 0; i < 2; i++) parts.push(box(1.2, 3, 1.2, brick, (r() - 0.5) * w * 0.7, h + 2, (r() - 0.5) * d * 0.5));
  return { geo: mergeGeometries(parts), w, d, h, floors, fh };
}

// Window grid as separate emissive geometry (front & back faces)
export function windowsGeometry(b, seed = 1, litRatio = 0.6) {
  const r = rng(seed + 77);
  const parts = [];
  const cols = Math.max(2, Math.floor(b.w / 3));
  for (let f = 0; f < b.floors; f++)
    for (let c = 0; c < cols; c++)
      for (const side of [1, -1]) {
        const lit = r() < litRatio;
        const k = lit ? 0.8 + r() * 0.6 : 0.03;
        const col = lit ? [1.0 * k, 0.72 * k, 0.38 * k] : [0.02, 0.02, 0.025];
        const g = new THREE.PlaneGeometry(1.1, 1.7);
        if (side < 0) g.rotateY(Math.PI);
        g.translate(-b.w / 2 + (c + 0.5) * (b.w / cols), f * b.fh + 2.0, side * (b.d / 2 + 0.03));
        parts.push(paint(g.toNonIndexed(), col));
      }
  return mergeGeometries(parts);
}

// Factory chimney stack
export function stackGeometry(h = 45, r0 = 2.6, color = [0.45, 0.2, 0.13]) {
  const parts = [cyl(r0, r0 * 0.62, h, color, 0, h / 2, 0, 16)];
  parts.push(cyl(r0 * 0.75, r0 * 0.75, 1.2, [0.18, 0.16, 0.15], 0, h, 0, 16));
  for (let i = 1; i < 4; i++) parts.push(cyl(lerp(r0, r0 * 0.62, (i * h) / 4 / h) + 0.08, lerp(r0, r0 * 0.62, (i * h) / 4 / h) + 0.08, 0.5, [0.3, 0.14, 0.1], 0, (i * h) / 4, 0, 16));
  return mergeGeometries(parts);
}

// Cast-iron lighthouse (Anjer), ~ 30 m
export function lighthouseGroup() {
  const g = new THREE.Group();
  const white = [0.92, 0.9, 0.86], red = [0.7, 0.12, 0.1], dark = [0.12, 0.12, 0.13];
  const parts = [];
  const H = 28;
  for (let i = 0; i < 7; i++) {
    const y0 = (i * H) / 7, y1 = ((i + 1) * H) / 7;
    const r0 = lerp(3.4, 2.0, y0 / H), r1 = lerp(3.4, 2.0, y1 / H);
    parts.push(cyl(r0, r1, y1 - y0, i % 2 ? red : white, 0, (y0 + y1) / 2, 0, 20));
  }
  parts.push(cyl(3.0, 3.0, 0.5, dark, 0, H + 0.25, 0, 24));
  parts.push(cyl(1.6, 1.6, 3.0, [0.25, 0.25, 0.28], 0, H + 2, 0, 16));
  parts.push(cyl(1.9, 0.2, 1.6, red, 0, H + 4.2, 0, 16));
  parts.push(cyl(4.2, 4.0, 1.2, [0.6, 0.6, 0.58], 0, 0.6, 0, 24));
  const tower = new THREE.Mesh(mergeGeometries(parts), buildingMat());
  tower.castShadow = true; tower.receiveShadow = true;
  g.add(tower);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 2 }));
  lamp.position.y = H + 2; g.add(lamp);
  // gallery rail
  const rail = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.06, 6, 32), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  rail.rotation.x = Math.PI / 2; rail.position.y = H + 1.2; g.add(rail);
  g.userData = { H, lamp };
  return g;
}

// Modern skyscraper with emissive window bands
export function towerGeometry(seed = 1) {
  const r = rng(seed);
  const w = 20 + r() * 25, d = 20 + r() * 20, h = 60 + Math.pow(r(), 1.5) * 260;
  const glass = [[0.12, 0.17, 0.25], [0.18, 0.22, 0.28], [0.1, 0.12, 0.16]][Math.floor(r() * 3)];
  const parts = [box(w, h, d, glass, 0, h / 2, 0)];
  if (r() < 0.5) parts.push(box(w * 0.6, h * 0.12, d * 0.6, glass, 0, h + h * 0.06, 0));
  if (r() < 0.3) parts.push(cyl(0.4, 0.2, 25, [0.6, 0.6, 0.6], 0, h + 12, 0, 6));
  return { geo: mergeGeometries(parts), w, d, h };
}
export function towerWindows(b, seed = 1, lit = 0.5) {
  const r = rng(seed + 31);
  const parts = [];
  const floors = Math.floor(b.h / 4);
  for (let f = 1; f < floors; f++) {
    for (const [side, ww] of [[0, b.w], [1, b.d], [2, b.w], [3, b.d]]) {
      const n = Math.floor(ww / 3.5);
      for (let c = 0; c < n; c++) {
        if (r() > lit) continue;
        const k = 0.6 + r() * 0.9;
        const col = r() < 0.7 ? [1.0 * k, 0.85 * k, 0.6 * k] : [0.6 * k, 0.8 * k, 1.0 * k];
        const g = new THREE.PlaneGeometry(2.6, 2.2);
        const off = -ww / 2 + (c + 0.5) * (ww / n);
        g.translate(off, f * 4, 0);
        if (side === 0) g.translate(0, 0, b.d / 2 + 0.05);
        if (side === 1) { g.rotateY(Math.PI / 2); g.translate(b.w / 2 + 0.05, 0, 0); }
        if (side === 2) { g.rotateY(Math.PI); g.translate(0, 0, -b.d / 2 - 0.05); }
        if (side === 3) { g.rotateY(-Math.PI / 2); g.translate(-b.w / 2 - 0.05, 0, 0); }
        parts.push(paint(g.toNonIndexed(), col));
      }
    }
  }
  return parts.length ? mergeGeometries(parts) : null;
}

// Wooden fishing prau boat
export function prauGeometry(seed = 1) {
  const r = rng(seed);
  const parts = [];
  const hull = new THREE.CylinderGeometry(0.6, 0.6, 7, 10, 1, false, 0, Math.PI);
  hull.rotateZ(Math.PI / 2); hull.rotateX(Math.PI); hull.scale(1, 0.7, 1);
  parts.push(prep(hull, [0.5 + r() * 0.2, 0.25, 0.12]));
  parts.push(box(7.6, 0.08, 0.08, [0.3, 0.2, 0.1], 0, 0.1, 2.0));
  parts.push(box(0.08, 0.08, 4.2, [0.3, 0.2, 0.1], 1.5, 0.1, 0.9));
  parts.push(box(0.08, 0.08, 4.2, [0.3, 0.2, 0.1], -1.5, 0.1, 0.9));
  parts.push(cyl(0.06, 0.04, 5, [0.35, 0.25, 0.15], 0, 2.5, 0, 5));
  return mergeGeometries(parts);
}

// Gas street lamp
export function streetLamp() {
  const g = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5, metalness: 0.6 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.6, 8), iron); post.position.y = 1.8; g.add(post);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.5, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb050, emissiveIntensity: 4, transparent: true, opacity: 0.9 }));
  head.position.y = 3.85; g.add(head);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 6), iron); cap.position.y = 4.25; g.add(cap);
  return g;
}
