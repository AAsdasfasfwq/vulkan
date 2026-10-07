import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../core/math.js';

// Adds a wind-sway to instanced plant materials.
export function addSway(mat, uniforms, strength = 1) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uWind = uniforms.uWind;
    sh.uniforms.uAsh = uniforms.uAsh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float hgt = max(position.y, 0.0);
        float ph = ip.x * 0.05 + ip.z * 0.031;
        float sw = (sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.9 + ph * 1.7) * 0.25) * uWind * ${strength.toFixed(3)};
        transformed.x += sw * hgt * hgt * 0.012;
        transformed.z += sw * 0.6 * hgt * hgt * 0.012;
      `);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uAsh;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.4, 0.39, 0.37), uAsh);`);
  };
}

// Broadleaf rainforest crown: a cluster of lumpy blobs on a short trunk. Unit height ~1.
export function makeCrownGeometry(detail = 1) {
  const r = rng(5);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.035, 0.06, 0.55, 5, 1);
  trunk.translate(0, 0.27, 0);
  paint(trunk, [0.22, 0.15, 0.09]);
  parts.push(trunk);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.IcosahedronGeometry(0.28 + r() * 0.12, detail);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const s = 0.85 + r() * 0.3;
      p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.75, p.getZ(k) * s);
    }
    g.translate((r() - 0.5) * 0.35, 0.62 + r() * 0.22, (r() - 0.5) * 0.35);
    paint(g, [1, 1, 1]);
    parts.push(g);
  }
  const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  geo.computeVertexNormals();
  return geo;
}

// Coconut palm: curved segmented trunk + drooping fronds + coconuts. Height ~12 m.
export function makePalmGeometry(height = 12, seed = 3) {
  const r = rng(seed);
  const parts = [];
  const segs = 7;
  const lean = 1.6 + r() * 1.2;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    pts.push(new THREE.Vector3(Math.pow(u, 1.8) * lean, u * height, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.TubeGeometry(curve, 14, 0.22, 6, false);
  // taper + ring texture via vertex colour
  const tp = trunk.attributes.position;
  const tc = new Float32Array(tp.count * 3);
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i);
    const u = y / height;
    const c = curve.getPointAt(Math.min(Math.max(u, 0), 1));
    const k = 1 - u * 0.45;
    tp.setX(i, c.x + (tp.getX(i) - c.x) * k);
    tp.setZ(i, (tp.getZ(i)) * k);
    const ring = 0.75 + 0.25 * Math.sin(y * 9.0);
    tc[i * 3] = 0.36 * ring; tc[i * 3 + 1] = 0.27 * ring; tc[i * 3 + 2] = 0.17 * ring;
  }
  trunk.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  parts.push(trunk);
  const top = curve.getPointAt(1);
  const fronds = 11;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + r() * 0.3;
    const len = 4.2 + r() * 1.4;
    const droop = 0.9 + r() * 0.6;
    const w = 0.9;
    const seg = 8;
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const x = u * len;
      const y = Math.sin(u * Math.PI * 0.55) * 1.1 - u * u * droop * 2.3;
      const ww = w * Math.sin(Math.PI * Math.min(u * 1.1, 1)) * (1 - u * 0.4);
      for (const s of [-1, 0, 1]) {
        const lx = x, ly = y - Math.abs(s) * ww * 0.35, lz = s * ww;
        pos.push(top.x + Math.cos(a) * lx - Math.sin(a) * lz, top.y + ly, top.z + Math.sin(a) * lx + Math.cos(a) * lz);
        const g = s === 0 ? 0.8 : 1.0;
        col.push(0.16 * g, (0.4 + u * 0.08) * g, 0.07 * g);
      }
    }
    for (let i = 0; i < seg; i++) {
      const b = i * 3;
      idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    parts.push(g);
  }
  for (let c = 0; c < 4; c++) {
    const g = new THREE.SphereGeometry(0.22, 6, 5);
    g.translate(top.x + Math.cos(c * 1.6) * 0.35, top.y - 0.4, top.z + Math.sin(c * 1.6) * 0.35);
    paint(g, [0.3, 0.22, 0.08]);
    parts.push(g);
  }
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g; }));
  geo.computeVertexNormals();
  return geo;
}

export function paint(g, c) {
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// Jungle undergrowth/bush: flattened blob
export function makeBushGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = rng(11);
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const s = 0.8 + r() * 0.35;
    p.setXYZ(k, p.getX(k) * s, Math.max(p.getY(k), -0.2) * s * 0.6 + 0.3, p.getZ(k) * s);
  }
  g.computeVertexNormals();
  paint(g, [1, 1, 1]);
  return g;
}
