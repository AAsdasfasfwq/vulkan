import * as THREE from 'three';
import { rng, fract, clamp, smoothstep, lerp, noise, hash1 } from '../core/math.js';
import { boltSegments } from './particles.js';
import { NOISE } from './glsl.js';

const n3 = (x, y, z) => noise.n3(x, y, z);

// Eruption parameters (mutated per frame by the set).
export function makeEruption() {
  return {
    on: false,
    c: [250, 100, -2500],  // crater
    intensity: 1,
    height: 11000,
    baseW: 250,
    topW: 2200,
    umbrella: 0.0,        // 0..1
    umbrellaR: 9000,
    rise: 140,            // m/s apparent rise
    t0: -1e6,             // start time (video seconds) for growth
    dark: 0.16,
    glow: 1.0,
    wind: [0.18, 0.04],   // horizontal drift per metre of height
    size: 1.0,
    bombs: 0,             // 0..1
    bombSpeed: 260,
    lightning: 0,         // 0..1 rate
    surge: 0, surgeT0: 0, surgeSpeed: 120,
    steam: 0,
    count: 1500,
    tint: [1, 0.95, 0.9],
    flash: null,          // output: current lightning {pos, k}
  };
}

export function columnEmitter(E) {
  const N = 2200;
  const r = rng(91);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r()]);
  return {
    fill(t, push) {
      if (!E.on || E.intensity <= 0) return;
      const H = E.height;
      const life = Math.max(H / E.rise, 10);
      const grown = clamp((t - E.t0) * E.rise / H);
      const cap = Math.max(H * grown, 300);
      const count = Math.min(N, Math.floor(E.count));
      for (let i = 0; i < count; i++) {
        const [s0, s1, s2, s3, s4] = seeds[i];
        const a = fract(t / (life * (0.85 + s1 * 0.3)) + s0);
        let hy = H * (1 - Math.pow(1 - a, 1.5));
        let headK = 0;
        if (hy > cap) { headK = clamp((hy - cap) / (H * 0.3)); hy = cap - s2 * Math.min(cap * 0.25, 1500); }
        const yn = hy / H;
        let rad = lerp(E.baseW, E.topW, Math.pow(yn, 0.85)) * (0.25 + 0.75 * Math.sqrt(s2));
        // umbrella spreading at the top
        const um = E.umbrella * smoothstep(0.72, 1.0, yn) * (0.3 + 0.7 * a);
        rad += um * E.umbrellaR * (0.2 + 0.8 * s3);
        if (headK > 0) rad *= 1 + headK * 0.6;
        const th = s3 * Math.PI * 2 * 3 + t * 0.03 * (s4 - 0.5) + n3(s0 * 9, t * 0.02, 1) * 0.8;
        const tx = n3(s0 * 13.1, yn * 3 + t * 0.05, 2), tz = n3(s1 * 7.7, yn * 3 - t * 0.05, 3);
        const x = E.c[0] + Math.cos(th) * rad + tx * rad * 0.35 + E.wind[0] * hy;
        const z = E.c[2] + Math.sin(th) * rad + tz * rad * 0.35 + E.wind[1] * hy;
        const y = E.c[1] + hy - um * 600 * s2;
        const size = (180 + 1100 * Math.pow(yn, 0.9) + um * 1800) * (0.6 + 0.8 * s4) * E.size;
        let al = clamp(a / 0.04) * clamp((1 - a) / 0.12) * E.intensity * 0.95;
        if (headK > 0) al *= 0.9;
        const dk = E.dark * (0.75 + 0.5 * s1) * (0.85 + 0.35 * yn);
        const glow = E.glow * Math.exp(-yn * 9.0) * (s2 < 0.45 ? 1.0 : 0.25) * (0.55 + 0.45 * Math.sin(t * 7 + s0 * 40)) * 0.7;
        push(x, y, z, size, dk * E.tint[0], dk * E.tint[1], dk * E.tint[2], al, s0 * 6.28 + t * 0.04 * (s1 - 0.5), Math.floor(s4 * 16), glow, 0);
      }
    },
  };
}

// Ash veil: very large dark sprites that fill the sky around the plume
export function veilEmitter(E, V) {
  const N = 220;
  const r = rng(1234);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
  return {
    fill(t, push) {
      if (!V.on || V.amount <= 0) return;
      for (let i = 0; i < N * V.amount; i++) {
        const [a, b, c, d] = seeds[i];
        const ang = a * Math.PI * 2 + t * 0.002;
        const rad = V.r0 + (V.r1 - V.r0) * Math.sqrt(b);
        const x = V.c[0] + Math.cos(ang) * rad, z = V.c[2] + Math.sin(ang) * rad;
        const y = V.y0 + (V.y1 - V.y0) * c;
        const dk = V.dark * (0.7 + 0.6 * d);
        push(x, y, z, V.size * (0.6 + 0.8 * d), dk, dk * 0.95, dk * 0.9, V.alpha, a * 9, Math.floor(d * 16), V.glow * (1 - c), 0);
      }
    },
  };
}

// Pyroclastic base surge ring expanding over the sea
export function surgeEmitter(E) {
  const N = 900;
  const r = rng(555);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
  return {
    fill(t, push) {
      if (!E.on || E.surge <= 0) return;
      const dt = t - E.surgeT0;
      if (dt < 0) return;
      const R = dt * E.surgeSpeed * (1 - Math.exp(-dt * 0.05)) / (dt * 0.05 + 1e-3) * 0.05 + dt * E.surgeSpeed * 0.6;
      for (let i = 0; i < N; i++) {
        const [a, b, c, d] = seeds[i];
        const ang = a * Math.PI * 2;
        const rr = R * (0.55 + 0.45 * Math.sqrt(b));
        const h = (60 + 600 * c * c) * clamp(dt / 4) * (1.2 - rr / (R + 1));
        const x = E.c[0] + Math.cos(ang) * rr, z = E.c[2] + Math.sin(ang) * rr;
        const size = (220 + 700 * c) * (0.6 + 0.8 * d) * (0.5 + clamp(dt / 10));
        const al = E.surge * clamp(dt / 0.6) * (0.65 + 0.35 * d);
        const dk = E.dark * (0.9 + 0.6 * c) * 1.3;
        push(x, h + size * 0.25, z, size, dk * 1.05, dk, dk * 0.92, al, a * 20 + t * 0.05, Math.floor(d * 16), E.glow * 0.5 * (1 - c), 0);
      }
    },
  };
}

// Explosive burst: a hemispherical fireball / pyroclastic dome expanding from
// the vent, glowing inside and darkening as it cools. B = { on, c, t0, R, k }
export function burstEmitter(B) {
  const N = 1300;
  const r = rng(321);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r()]);
  return {
    fill(t, push) {
      if (!B.on) return;
      const dt = t - B.t0;
      if (dt < 0 || dt > 40) return;
      const grow = 1 - Math.exp(-dt * (B.speed ?? 0.9));
      for (let i = 0; i < N; i++) {
        const [a, b, c, d, e] = seeds[i];
        // direction biased upward (hemisphere, slightly flattened)
        const th = a * Math.PI * 2;
        const el = Math.asin(Math.pow(b, 0.7));
        const shell = 0.55 + 0.45 * Math.pow(c, 0.5);
        const R = B.R * grow * shell * (0.85 + 0.3 * e);
        const x = B.c[0] + Math.cos(th) * Math.cos(el) * R;
        const z = B.c[2] + Math.sin(th) * Math.cos(el) * R;
        const y = B.c[1] + Math.sin(el) * R * (B.flat ?? 0.75) + dt * dt * 6 * (1 - el);
        const size = (B.R * 0.12 + B.R * 0.25 * grow) * (0.5 + 0.9 * d);
        // the whole fireball starts incandescent; the outer, upper skin cools into black ash
        // first while the base and the core keep burning through the gaps
        const cool = 0.3 + 1.1 * shell * shell * (0.35 + 0.65 * Math.sin(el)) + 0.25 * c;
        const heat = Math.exp(-dt * cool) * (0.55 + 0.45 * d) * (1.25 - 0.35 * shell);
        const dk = 0.05 + 0.07 * e;
        const al = clamp(dt / 0.08) * (B.k ?? 1) * (0.75 + 0.25 * d) * clamp((40 - dt) / 10);
        push(x, y, z, size, dk, dk * 0.92, dk * 0.85, al, a * 30 + dt * 0.1 * (d - 0.5), Math.floor(e * 16), 0.45 * (1 - Math.sin(el)) * Math.exp(-dt * 0.08), heat * (B.heat ?? 1.5) * (0.4 + 0.6 * d));
      }
    },
  };
}

// Steam / smoke from a point (e.g. vents, quiet crater, ship funnels)
export function plumeletEmitter(S) {
  const N = S.n ?? 120;
  const r = rng(S.seed ?? 3);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
  return {
    enabled: true,
    fill(t, push) {
      if (!S.on || (S.amount ?? 1) <= 0) return;
      const life = S.life ?? 20;
      for (let i = 0; i < N; i++) {
        const [a0, b, c, d] = seeds[i];
        const a = fract(t / life + a0);
        const h = (S.h ?? 600) * Math.pow(a, 0.8);
        const spread = (S.spread ?? 80) * (0.3 + a * 2.5);
        const x = S.c[0] + (b - 0.5) * spread + (S.wind?.[0] ?? 0.4) * h + n3(a0 * 9, t * 0.05, 4) * spread * 0.4;
        const z = S.c[2] + (c - 0.5) * spread + (S.wind?.[1] ?? 0.1) * h;
        const y = S.c[1] + h;
        const size = (S.size ?? 60) * (0.4 + a * 2.2) * (0.7 + d * 0.6);
        const al = clamp(a / 0.08) * (1 - a) * (S.alpha ?? 0.6) * (S.amount ?? 1);
        const col = S.col ?? [0.85, 0.85, 0.85];
        push(x, y, z, size, col[0], col[1], col[2], al, a0 * 10 + t * 0.08, Math.floor(d * 16), (S.glow ?? 0) * (1 - a), 0);
      }
    },
  };
}

// Ballistic lava bombs (additive streaks)
export function bombEmitter(E) {
  const N = 260;
  const r = rng(77);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r()]);
  const g = 9.81;
  return {
    fill(t, push) {
      if (!E.on || E.bombs <= 0) return;
      const n = Math.floor(N * E.bombs);
      for (let i = 0; i < n; i++) {
        const [a, b, c, d, e] = seeds[i];
        const v = E.bombSpeed * (0.45 + 0.6 * b);
        const el = (60 + 28 * c) * Math.PI / 180, az = d * Math.PI * 2;
        const T = (2 * v * Math.sin(el)) / g * 0.9;
        const tt = fract(t / T + a) * T;
        const pos = (q) => [E.c[0] + Math.cos(az) * Math.cos(el) * v * q, E.c[1] + Math.sin(el) * v * q - 0.5 * g * q * q, E.c[2] + Math.sin(az) * Math.cos(el) * v * q];
        const h = pos(tt), tl = pos(Math.max(tt - 0.35, 0));
        if (h[1] < 0) continue;
        const cool = Math.exp(-tt * 0.06);
        const w = (14 + 26 * e) * E.size;
        push(h[0], h[1], h[2], tl[0], tl[1], tl[2], w, 9 * cool, 2.4 * cool * cool, 0.45 * cool * cool * cool, clamp(tt / 0.3) * (0.4 + 0.6 * cool));
      }
    },
  };
}

// Lightning in the plume. Produces bolts and exposes the current flash.
export function lightningEmitter(E) {
  const cache = new Map();
  return {
    fill(t, push) {
      E.flash = null;
      if (!E.on || E.lightning <= 0) return;
      const period = lerp(2.2, 0.35, E.lightning);
      const slot = Math.floor(t / period);
      for (let k = 0; k < 3; k++) {
        const s = slot - k;
        const h = hash1(s * 3.7 + 11);
        if (h > 0.2 + E.lightning * 0.78) continue;
        const t0 = s * period + hash1(s * 1.3) * period * 0.6;
        const dt = t - t0;
        const len = 0.22 + hash1(s * 5.1) * 0.2;
        if (dt < 0 || dt > len) continue;
        const flick = (Math.sin(dt * 90 + s) > -0.3 ? 1 : 0.25) * (1 - dt / len);
        const H = E.height * clamp((t - E.t0) * E.rise / E.height);
        const ang = hash1(s * 9.1) * Math.PI * 2, ang2 = ang + (hash1(s * 2.2) - 0.5) * 2;
        const R = lerp(E.baseW, E.topW, 0.5) * (0.4 + hash1(s * 4.4) * 0.8);
        const y0 = H * (0.25 + 0.5 * hash1(s * 6.6));
        const toSea = hash1(s * 8.8) < 0.35;
        const a = [E.c[0] + Math.cos(ang) * R * 0.5 + E.wind[0] * y0, E.c[1] + y0, E.c[2] + Math.sin(ang) * R * 0.5];
        const b = toSea
          ? [E.c[0] + Math.cos(ang2) * R * 2.5, 0, E.c[2] + Math.sin(ang2) * R * 2.5]
          : [E.c[0] + Math.cos(ang2) * R * 1.6 + E.wind[0] * y0, E.c[1] + y0 * (0.6 + hash1(s * 7.7) * 0.8), E.c[2] + Math.sin(ang2) * R * 1.6];
        let segs = cache.get(s);
        if (!segs) {
          segs = boltSegments(a, b, s * 31 + 7, 0.35, 7, true);
          cache.set(s, segs);
          if (cache.size > 40) cache.delete(cache.keys().next().value);
        }
        const wBase = Math.max(30, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.006) * (E.boltW ?? 1);
        for (const [p, q, wk] of segs) {
          push(q[0], q[1], q[2], p[0], p[1], p[2], wBase * wk * 3.0, 2.0 * flick, 2.4 * flick, 5.0 * flick, 0.5 * wk);
          push(q[0], q[1], q[2], p[0], p[1], p[2], wBase * wk * 0.6, 14 * flick, 15 * flick, 22 * flick, wk);
        }
        const k2 = flick * (toSea ? 1.3 : 1);
        if (!E.flash || k2 > E.flash.k) E.flash = { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], k: k2 };
      }
    },
  };
}

// Spray and dust thrown up along the shock front where it races across the sea.
export function shockSprayEmitter(SH) {
  const N = 900;
  const r = rng(555);
  const seeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r()]);
  return {
    fill(t, push) {
      if (!SH.on || SH.k <= 0.01 || SH.R < 50) return;
      for (let i = 0; i < N; i++) {
        const [a, b, c, d, e] = seeds[i];
        const th = a * Math.PI * 2;
        const rr = SH.R * (1 - 0.06 * c) + (b - 0.5) * 120;
        const x = SH.c[0] + Math.cos(th) * rr, z = SH.c[2] + Math.sin(th) * rr;
        const y = 10 + c * c * 140 + d * 25;
        const size = (90 + 220 * d) * (0.7 + 0.6 * c);
        const g = 0.62 + 0.25 * e;
        push(x, y, z, size, g, g * 0.97, g * 0.93, 0.42 * SH.k * (1 - 0.75 * c) * smoothstep(250, 1400, Math.abs(SH.R - (SH.dCam ?? 1e9))), a * 40 + t * 0.3, Math.floor(e * 16), 0, 0);
      }
    },
  };
}

// Shockwave condensation dome (Wilson cloud) + bright ring.
export class Shockwave {
  constructor() {
    this.uniforms = { uK: { value: 0 }, uCol: { value: new THREE.Vector3(1, 1, 1) }, uT: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vP;
        void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition-wp.xyz); vY = position.y; vP = position; gl_Position = projectionMatrix*viewMatrix*wp; }`,
      // condensation (Wilson) cloud: a broken, cloudy rim rather than a clean glass shell
      fragmentShader: NOISE + `uniform float uK; uniform vec3 uCol; uniform float uT; varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vP;
        void main(){
          float f = 1.0 - abs(dot(vN, vV));
          float n = fbm3(vP * 4.5 + vec3(0.0, uT * 0.25, 0.0));
          float rim = pow(f, 1.7) * (0.12 + 1.1 * smoothstep(0.42, 0.8, n));
          float haze = 0.1 * smoothstep(0.35, 0.85, n);
          float a = (rim + haze) * uK * smoothstep(0.0, 0.08, vY);
          gl_FragColor = vec4(uCol * a, a * 0.7); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 30;
    this.mesh.visible = false;
  }
  set(center, radius, k, col = [1, 0.97, 0.92], cam = null) {
    // fade while the shell sweeps over the camera (no full-screen rim artefacts)
    if (cam && radius > 1) {
      const dx = cam.x - center[0], dy = (cam.y - center[1]) / 0.55, dz = cam.z - center[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
      k *= smoothstep(0.04, 0.22, Math.abs(d - 1));
    }
    this.mesh.visible = k > 0.001 && radius > 1;
    this.mesh.position.set(center[0], center[1], center[2]);
    this.mesh.scale.set(radius, radius * 0.55, radius);
    this.uniforms.uK.value = k;
    this.uniforms.uT.value = radius * 0.001;
    this.uniforms.uCol.value.set(...col);
  }
}
