import * as THREE from 'three';
import { makeNoise, rng, clamp } from '../core/math.js';
import { NOISE } from './glsl.js';

// ---------------------------------------------------------------------------
// Smoke / ash puff atlas (4x4 tiles), baked once. R = density, G/B = normal xy.
let ATLAS = null;
export function smokeAtlas() {
  if (ATLAS) return ATLAS;
  const T = 4, S = 128, N = T * S;
  const data = new Uint8Array(N * N * 4);
  const nz = makeNoise(77);
  for (let ty = 0; ty < T; ty++)
    for (let tx = 0; tx < T; tx++) {
      const seed = ty * T + tx;
      const dens = new Float32Array(S * S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const u = (x + 0.5) / S * 2 - 1, v = (y + 0.5) / S * 2 - 1;
          const r = Math.hypot(u, v);
          const n = nz.fbm2(u * 2.2 + seed * 7.3, v * 2.2 - seed * 3.1, 5) * 0.5 + 0.5;
          const n2 = nz.fbm2(u * 5.5 + seed * 1.3, v * 5.5 + seed * 9.1, 4) * 0.5 + 0.5;
          // billowy lumps
          let d = 1 - r * (1.05 + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.35);
          d = clamp(d * 2.2);
          d = d * d * (3 - 2 * d);
          dens[y * S + x] = d;
        }
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const i = y * S + x;
          const dx = (dens[y * S + Math.min(x + 1, S - 1)] - dens[y * S + Math.max(x - 1, 0)]);
          const dy = (dens[Math.min(y + 1, S - 1) * S + x] - dens[Math.max(y - 1, 0) * S + x]);
          const u = (x + 0.5) / S * 2 - 1, v = (y + 0.5) / S * 2 - 1;
          // sphere-ish normal + density gradient bumps
          let nx = u * 0.7 - dx * 2.5, ny = v * 0.7 - dy * 2.5;
          const l = Math.hypot(nx, ny);
          if (l > 1) { nx /= l; ny /= l; }
          const k = ((ty * S + y) * N + (tx * S + x)) * 4;
          data[k] = Math.round(dens[i] * 255);
          data[k + 1] = Math.round((nx * 0.5 + 0.5) * 255);
          data[k + 2] = Math.round((ny * 0.5 + 0.5) * 255);
          data[k + 3] = 255;
        }
    }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.flipY = false;
  tex.needsUpdate = true;
  ATLAS = tex;
  return tex;
}

// ---------------------------------------------------------------------------
// Sorted, lit billboard puffs. Emitters fill per-particle data on the CPU each
// frame (pure functions of time), then everything is depth sorted back-to-front.
export class PuffCloud {
  constructor(max = 4000) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // xyz + size
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // tint rgb + alpha
    this.aExt = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // rot, tile, glow, emissive
    for (const a of [this.aPos, this.aCol, this.aExt]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos);
    g.setAttribute('iCol', this.aCol);
    g.setAttribute('iExt', this.aExt);
    g.instanceCount = 0;
    this.geo = g;
    this.uniforms = {
      uAtlas: { value: smokeAtlas() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Vector3(1, 1, 1) },
      uAmb: { value: new THREE.Vector3(0.3, 0.3, 0.3) },
      uGlowCol: { value: new THREE.Vector3(3, 0.8, 0.2) },
      uFlash: { value: new THREE.Vector4(0, 0, 0, 0) }, // xyz pos, w strength
      uFlashCol: { value: new THREE.Vector3(0.7, 0.75, 1.0) },
      uFogDensity: { value: 0.00005 },
      uFogColor: { value: new THREE.Vector3(0.6, 0.7, 0.8) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec4 iPos; attribute vec4 iCol; attribute vec4 iExt;
        varying vec2 vUv; varying vec4 vCol; varying vec4 vExt; varying vec3 vWorld; varying vec3 vRight; varying vec3 vUp; varying vec3 vFwd; varying float vNear;
        void main() {
          float c = cos(iExt.x), s = sin(iExt.x);
          vNear = length(cameraPosition - iPos.xyz) / max(iPos.w, 1e-3);
          vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 wp = iPos.xyz + (right * q.x + up * q.y) * iPos.w;
          vRight = right * c + up * s; vUp = -right * s + up * c;
          vFwd = normalize(cameraPosition - iPos.xyz);
          float tile = iExt.y;
          vec2 tuv = position.xy * 0.5 + 0.5;
          vUv = (vec2(mod(tile, 4.0), floor(tile / 4.0)) + tuv) * 0.25;
          vCol = iCol; vExt = iExt; vWorld = wp;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uGlowCol;
        uniform vec4 uFlash; uniform vec3 uFlashCol; uniform float uFogDensity; uniform vec3 uFogColor;
        varying vec2 vUv; varying vec4 vCol; varying vec4 vExt; varying vec3 vWorld; varying vec3 vRight; varying vec3 vUp; varying vec3 vFwd; varying float vNear;
        void main() {
          vec4 tx = texture2D(uAtlas, vUv);
          // puffs that brush the lens fade out instead of filling the frame
          float d = tx.r * vCol.a * smoothstep(0.5, 1.8, vNear);
          if (d < 0.004) discard;
          vec2 n2 = tx.gb * 2.0 - 1.0;
          vec3 n = normalize(vRight * n2.x + vUp * n2.y + vFwd * sqrt(max(1.0 - dot(n2, n2), 0.05)));
          float sunL = clamp(dot(n, uSunDir) * 0.8 + 0.25, 0.0, 1.0);
          // self-shadowing: dense cores and undersides are darker
          float core = mix(1.0, 0.45, tx.r * tx.r);
          float under = 0.55 + 0.45 * clamp(n.y * 0.6 + 0.5, 0.0, 1.0);
          vec3 col = vCol.rgb * (uAmb * under + uSunCol * sunL * core);
          // silver lining when backlit
          float back = pow(max(dot(-vFwd, uSunDir), 0.0), 5.0);
          col += uSunCol * vCol.rgb * back * (1.0 - tx.r) * 1.5;
          // underglow from lava (vExt.z) and emissive heat (vExt.w)
          col += uGlowCol * vExt.z * (0.6 + 0.4 * clamp(-n.y + 0.5, 0.0, 1.0)) * core;
          col += uGlowCol * vExt.w * 2.0;
          // white-hot cores where the heat is extreme
          col += vec3(1.6, 1.25, 0.7) * max(vExt.w - 0.9, 0.0) * 1.6 * core;
          // lightning illumination
          if (uFlash.w > 0.0) {
            float fd = length(vWorld - uFlash.xyz);
            col += uFlashCol * uFlash.w * exp(-fd * 0.00045) * (0.4 + 0.6 * tx.r);
          }
          float dist = length(cameraPosition - vWorld);
          float fog = 1.0 - exp(-uFogDensity * dist);
          col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));
          gl_FragColor = vec4(col * d, d);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.emitters = [];
    this.tmp = { pos: new Float32Array(max * 4), col: new Float32Array(max * 4), ext: new Float32Array(max * 4), key: new Float32Array(max), idx: new Uint32Array(max) };
  }

  // emitter.fill(t, push) where push(x,y,z,size, r,g,b,a, rot, tile, glow, emis)
  update(t, camPos) {
    const T = this.tmp;
    let n = 0;
    const max = this.max;
    const push = (x, y, z, size, r, g, b, a, rot, tile, glow = 0, emis = 0) => {
      if (n >= max || a <= 0.002 || size <= 0) return;
      const i4 = n * 4;
      T.pos[i4] = x; T.pos[i4 + 1] = y; T.pos[i4 + 2] = z; T.pos[i4 + 3] = size;
      T.col[i4] = r; T.col[i4 + 1] = g; T.col[i4 + 2] = b; T.col[i4 + 3] = a;
      T.ext[i4] = rot; T.ext[i4 + 1] = tile; T.ext[i4 + 2] = glow; T.ext[i4 + 3] = emis;
      const dx = x - camPos.x, dy = y - camPos.y, dz = z - camPos.z;
      T.key[n] = dx * dx + dy * dy + dz * dz;
      T.idx[n] = n;
      n++;
    };
    for (const e of this.emitters) if (e.enabled !== false) e.fill(t, push);
    const idx = Array.from(T.idx.subarray(0, n));
    idx.sort((a, b) => T.key[b] - T.key[a]);
    const P = this.aPos.array, C = this.aCol.array, E = this.aExt.array;
    for (let j = 0; j < n; j++) {
      const s = idx[j] * 4, d = j * 4;
      P[d] = T.pos[s]; P[d + 1] = T.pos[s + 1]; P[d + 2] = T.pos[s + 2]; P[d + 3] = T.pos[s + 3];
      C[d] = T.col[s]; C[d + 1] = T.col[s + 1]; C[d + 2] = T.col[s + 2]; C[d + 3] = T.col[s + 3];
      E[d] = T.ext[s]; E[d + 1] = T.ext[s + 1]; E[d + 2] = T.ext[s + 2]; E[d + 3] = T.ext[s + 3];
    }
    this.geo.instanceCount = n;
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aExt.needsUpdate = true;
    this.aPos.addUpdateRange?.(0, n * 4);
    this.count = n;
  }
}

// ---------------------------------------------------------------------------
// Additive streaks (lava bombs, sparks, rain, embers, lightning segments).
export class StreakCloud {
  constructor(max = 6000, { additive = true } = {}) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aA = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // head xyz, width
    this.aB = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // tail xyz, alpha
    this.aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); // colour (HDR)
    for (const a of [this.aA, this.aB, this.aC]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.aA); g.setAttribute('iB', this.aB); g.setAttribute('iC', this.aC);
    g.instanceCount = 0;
    this.geo = g;
    this.uniforms = { uFogDensity: { value: 0 }, uFogColor: { value: new THREE.Vector3() } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec4 iA; attribute vec4 iB; attribute vec3 iC;
        varying vec3 vC; varying float vA; varying vec2 vUv; varying float vDist;
        void main() {
          vec3 a = iB.xyz, b = iA.xyz;
          vec3 p = mix(a, b, position.x);
          vec3 dir = b - a;
          vec3 toCam = normalize(cameraPosition - p);
          vec3 side = cross(dir, toCam);
          float sl = length(side);
          side = sl > 1e-5 ? side / sl : vec3(1.0, 0.0, 0.0);
          float w = iA.w * mix(0.55, 1.0, position.x);
          p += side * position.y * w;
          vC = iC; vA = iB.w; vUv = position.xy; vDist = length(cameraPosition - p);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uFogDensity; uniform vec3 uFogColor;
        varying vec3 vC; varying float vA; varying vec2 vUv; varying float vDist;
        void main() {
          float e = 1.0 - abs(vUv.y);
          e = e * e;
          float l = smoothstep(0.0, 0.25, vUv.x);
          float fog = exp(-uFogDensity * vDist);
          gl_FragColor = vec4(vC * e * l * vA * fog, e * l * vA);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide, // the ribbon's winding flips with its direction on screen
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.emitters = [];
  }

  update(t) {
    let n = 0;
    const A = this.aA.array, B = this.aB.array, C = this.aC.array, max = this.max;
    const push = (hx, hy, hz, tx, ty, tz, w, r, g, b, a = 1) => {
      if (n >= max || a <= 0.002) return;
      const i4 = n * 4, i3 = n * 3;
      A[i4] = hx; A[i4 + 1] = hy; A[i4 + 2] = hz; A[i4 + 3] = w;
      B[i4] = tx; B[i4 + 1] = ty; B[i4 + 2] = tz; B[i4 + 3] = a;
      C[i3] = r; C[i3 + 1] = g; C[i3 + 2] = b;
      n++;
    };
    for (const e of this.emitters) if (e.enabled !== false) e.fill(t, push);
    this.geo.instanceCount = n;
    this.aA.needsUpdate = this.aB.needsUpdate = this.aC.needsUpdate = true;
    this.count = n;
  }
}

// Lightning bolt generator (midpoint displacement with branches) -> segments.
export function boltSegments(a, b, seed, rough = 0.32, depth = 6, branches = true) {
  const r = rng(seed);
  let segs = [[a, b]];
  let off = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * rough;
  const out = [];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const [p, q] of segs) {
      const m = [(p[0] + q[0]) / 2 + (r() - 0.5) * off, (p[1] + q[1]) / 2 + (r() - 0.5) * off * 0.5, (p[2] + q[2]) / 2 + (r() - 0.5) * off];
      next.push([p, m], [m, q]);
      if (branches && d < 4 && r() < 0.18) {
        const dir = [m[0] - p[0], m[1] - p[1], m[2] - p[2]];
        const e = [m[0] + dir[0] * (1.2 + r()) + (r() - 0.5) * off, m[1] + dir[1] * (1.2 + r()), m[2] + dir[2] * (1.2 + r()) + (r() - 0.5) * off];
        out.push(...boltSegments(m, e, seed * 7 + d * 13 + next.length, rough, depth - d - 1, false).map((s) => [...s, 0.45]));
      }
    }
    segs = next;
    off *= 0.5;
  }
  return out.concat(segs.map((s) => [...s, 1]));
}
