import * as THREE from 'three';
import { NOISE, SKY } from './glsl.js';
import { makeNoise } from '../core/math.js';

// Procedural tileable normal map for small ripples.
function makeRippleNormalMap(size = 512, seed = 7) {
  const nz = makeNoise(seed);
  const h = new Float32Array(size * size);
  const P = 8; // periodic noise via 4D torus trick approximation: sample circle in 3D
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
      // map torus -> 3D for tileable noise (two circles mixed)
      let v = 0, amp = 1, f = 1, norm = 0;
      for (let o = 0; o < 5; o++) {
        const r = 1.2 * f;
        v += amp * nz.n3(Math.cos(a) * r + o * 3.1, Math.sin(a) * r + Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9 + o * 1.7);
        norm += amp; amp *= 0.5; f *= 2.0;
      }
      h[y * size + x] = v / norm;
    }
  const data = new Uint8Array(size * size * 4);
  const s = 3.0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const xl = h[y * size + ((x - 1 + size) % size)], xr = h[y * size + ((x + 1) % size)];
      const yd = h[((y - 1 + size) % size) * size + x], yu = h[((y + 1) % size) * size + x];
      let nx = (xl - xr) * s, ny = (yd - yu) * s, nzv = 1;
      const l = Math.hypot(nx, ny, nzv);
      nx /= l; ny /= l; nzv /= l;
      const i = (y * size + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nzv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

let RIPPLES = null;

// Wave spectrum: [dirDeg, wavelength, amplitude, steepness]
export const SEAS = {
  calm: [[20, 60, 0.22, 0.5], [70, 31, 0.12, 0.5], [-30, 18, 0.06, 0.45], [110, 11, 0.035, 0.4], [-80, 7, 0.02, 0.35]],
  normal: [[25, 85, 0.55, 0.55], [65, 44, 0.3, 0.55], [-20, 24, 0.16, 0.5], [110, 14, 0.08, 0.45], [-75, 8, 0.04, 0.4]],
  rough: [[25, 110, 1.4, 0.7], [60, 60, 0.8, 0.65], [-15, 32, 0.42, 0.6], [100, 18, 0.2, 0.5], [-70, 10, 0.1, 0.45]],
  storm: [[25, 140, 2.6, 0.75], [55, 75, 1.5, 0.7], [-10, 40, 0.8, 0.65], [95, 22, 0.35, 0.55], [-70, 12, 0.16, 0.5]],
};
const NW = 5;

export function makeWaveUniforms() {
  return {
    uWaves: { value: Array.from({ length: NW }, () => new THREE.Vector4()) },
    uWaveDir: { value: Array.from({ length: NW }, () => new THREE.Vector2()) },
    uTime: { value: 0 },
    uWaveFade: { value: 1800 },
  };
}

export function setWaves(uniforms, sea, scale = 1) {
  const spec = typeof sea === 'string' ? SEAS[sea] : sea;
  for (let i = 0; i < NW; i++) {
    const [d, L, A, Q] = spec[i] || [0, 10, 0, 0];
    const k = (Math.PI * 2) / L;
    const w = Math.sqrt(9.81 * k);
    const a = A * scale;
    const q = Math.min(Q / (k * a * NW + 1e-6), 1.0);
    uniforms.uWaves.value[i].set(k, w, a, q);
    const r = (d * Math.PI) / 180;
    uniforms.uWaveDir.value[i].set(Math.cos(r), Math.sin(r));
  }
}

// CPU sampling (height + normal) used to float ships and objects.
export function sampleWaves(uniforms, x, z, t) {
  let y = 0, nx = 0, nz = 0, ny = 1;
  for (let i = 0; i < NW; i++) {
    const w = uniforms.uWaves.value[i], d = uniforms.uWaveDir.value[i];
    const th = w.x * (d.x * x + d.y * z) - w.y * t + i * 1.7;
    const s = Math.sin(th), c = Math.cos(th);
    y += w.z * s;
    nx -= d.x * w.x * w.z * c;
    nz -= d.y * w.x * w.z * c;
    ny -= w.w * w.x * w.z * s;
  }
  const fade = 1;
  return { y: y * fade, n: new THREE.Vector3(nx, ny, nz).normalize() };
}

export const WAVE_GLSL = /* glsl */ `
#define NW ${NW}
uniform vec4 uWaves[NW];
uniform vec2 uWaveDir[NW];
uniform float uTime;
uniform float uWaveFade;
vec3 gerstner(vec2 p, float fade, out vec3 nrm) {
  vec3 o = vec3(0.0);
  vec3 n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < NW; i++) {
    vec4 w = uWaves[i]; vec2 d = uWaveDir[i];
    float th = w.x * dot(d, p) - w.y * uTime + float(i) * 1.7;
    float s = sin(th), c = cos(th);
    float a = w.z * fade;
    o.x += w.w * a * d.x * c;
    o.z += w.w * a * d.y * c;
    o.y += a * s;
    n.x -= d.x * w.x * a * c;
    n.z -= d.y * w.x * a * c;
    n.y -= w.w * w.x * a * s;
  }
  nrm = normalize(n);
  return o;
}
`;

export class Ocean {
  constructor(sky, opts = {}) {
    if (!RIPPLES) RIPPLES = makeRippleNormalMap();
    const N = opts.segments ?? 448;
    const S = opts.extent ?? 32000;
    const k = 6.0;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((N + 1) * (N + 1) * 3);
    const map = (s) => (Math.sinh(s * k) / Math.sinh(k)) * S;
    let p = 0;
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= N; i++) {
        pos[p++] = map((i / N) * 2 - 1);
        pos[p++] = 0;
        pos[p++] = map((j / N) * 2 - 1);
      }
    const idx = new Uint32Array(N * N * 6);
    p = 0;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        idx[p++] = a; idx[p++] = c; idx[p++] = b;
        idx[p++] = b; idx[p++] = c; idx[p++] = d;
      }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), S * 2);
    this.cellSize = map(1 / N * 2 - 1) - map(-1) ; // unused
    this.centerStep = (Math.sinh(k * (2 / N)) / Math.sinh(k)) * S;

    this.waveUniforms = makeWaveUniforms();
    setWaves(this.waveUniforms, 'normal');
    this.uniforms = {
      ...sky.uniforms,
      ...this.waveUniforms,
      uRipples: { value: RIPPLES },
      uDeep: { value: new THREE.Vector3(0.004, 0.05, 0.11) },
      uShallow: { value: new THREE.Vector3(0.02, 0.32, 0.36) },
      uFogDensity: { value: 0.00005 },
      uFogColor: { value: new THREE.Color() },
      uFoam: { value: 0.35 },
      uRippleStr: { value: 1.0 },
      uRippleScale: { value: 1.0 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uSpec: { value: 1.0 },
      uShoreTex: { value: null },
      uShoreRect: { value: new THREE.Vector4(-1e6, -1e6, 1, 1) },
      uShore: { value: 0 },
      // ring waves: xy = centre, z = radius, w = height
      uRing: { value: new THREE.Vector4(0, 0, 0, 0) },
      uRingW: { value: 60 },
      uRing2: { value: new THREE.Vector4(0, 0, 0, 0) },
      uBoil: { value: new THREE.Vector4(0, 0, 0, 0) }, // centre xz, radius, strength
      uPumice: { value: 0 },
      uPumiceRect: { value: new THREE.Vector4(0, 0, 3000, 0) }, // centre xz, radius
      uGlowPos: { value: new THREE.Vector3(0, 0, 0) },
      uGlowLight: { value: new THREE.Vector3(0, 0, 0) },
      uFlash: { value: 0 },
      uFlashCol: { value: new THREE.Vector3(0.8, 0.85, 1.0) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: NOISE + WAVE_GLSL + /* glsl */ `
        uniform vec4 uRing; uniform float uRingW; uniform vec4 uRing2; uniform vec4 uBoil;
        varying vec3 vWorld; varying vec3 vNormal; varying float vHeight; varying float vRing;
        float ringH(vec2 p, vec4 r, float w, out vec2 g) {
          if (r.w == 0.0) { g = vec2(0.0); return 0.0; }
          vec2 dd = p - r.xy; float rr = length(dd) + 1e-3;
          float x = (rr - r.z) / w;
          float h = r.w * exp(-x * x) * (1.0 - 0.35 * x);
          float dh = r.w * exp(-x * x) * (-2.0 * x * (1.0 - 0.35 * x) - 0.35) / w;
          g = dd / rr * dh;
          return h;
        }
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float dist = length(wp.xz - cameraPosition.xz);
          float fade = 1.0 - smoothstep(uWaveFade * 0.4, uWaveFade, dist);
          vec3 n;
          vec3 off = gerstner(wp.xz, fade, n);
          wp.xyz += off;
          vec2 g1, g2;
          float rh = ringH(wp.xz, uRing, uRingW, g1) + ringH(wp.xz, uRing2, uRingW, g2);
          wp.y += rh;
          vRing = rh;
          n = normalize(n + vec3(-(g1.x + g2.x), 0.0, -(g1.y + g2.y)));
          if (uBoil.w > 0.0) {
            float bd = length(wp.xz - uBoil.xy) / uBoil.z;
            float b = uBoil.w * exp(-bd * bd * 2.0);
            wp.y += b * (vnoise(wp.xz * 0.15 + uTime * 1.3) - 0.3) * 1.5;
          }
          vHeight = off.y;
          vWorld = wp.xyz;
          vNormal = n;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: NOISE + SKY + /* glsl */ `
        uniform sampler2D uRipples;
        uniform vec3 uDeep; uniform vec3 uShallow;
        uniform float uFogDensity; uniform vec3 uFogColor;
        uniform float uFoam; uniform float uRippleStr; uniform float uRippleScale; uniform vec3 uTint; uniform float uSpec;
        uniform float uTime;
        uniform sampler2D uShoreTex; uniform vec4 uShoreRect; uniform float uShore;
        uniform vec4 uBoil; uniform float uPumice; uniform vec4 uPumiceRect;
        uniform vec3 uGlowPos; uniform vec3 uGlowLight; uniform float uFlash; uniform vec3 uFlashCol;
        varying vec3 vWorld; varying vec3 vNormal; varying float vHeight; varying float vRing;
        vec3 rip(vec2 uv) { return texture2D(uRipples, uv).xyz * 2.0 - 1.0; }
        void main() {
          vec3 V = cameraPosition - vWorld;
          float dist = length(V);
          V /= dist;
          // ripple detail fades with distance (anti-sparkle)
          float rs = uRippleStr * (1.0 - smoothstep(200.0, 3500.0, dist));
          vec2 p = vWorld.xz * uRippleScale;
          vec3 r1 = rip(p * 0.021 + vec2(uTime * 0.012, uTime * 0.004));
          vec3 r2 = rip(p * 0.067 - vec2(uTime * 0.008, -uTime * 0.017));
          vec3 r3 = rip(p * 0.0045 + vec2(-uTime * 0.003, uTime * 0.002));
          vec3 dn = vec3(r1.x + r2.x * 0.6 + r3.x * 1.2, 0.0, r1.y + r2.y * 0.6 + r3.y * 1.2);
          vec3 n = normalize(vNormal + dn * 0.32 * rs + vec3(r3.x, 0.0, r3.y) * 0.08);
          float shore = 0.0;
          if (uShore > 0.0) {
            vec2 suv = (vWorld.xz - uShoreRect.xy) / uShoreRect.zw;
            if (suv.x > 0.0 && suv.y > 0.0 && suv.x < 1.0 && suv.y < 1.0) shore = texture2D(uShoreTex, suv).r;
          }
          float NdV = max(dot(n, V), 0.0);
          float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
          vec3 R = reflect(-V, n);
          R.y = abs(R.y) + 0.002;
          vec3 refl = skyColor(normalize(R), false);
          // sun glitter
          float sd = max(dot(R, uSunDir), 0.0);
          vec3 spec = uSunColor * (pow(sd, 900.0) * 7.0 + pow(sd, 120.0) * 0.45 + pow(sd, 14.0) * 0.03) * uSpec * uSunVisible;
          // body colour + fake subsurface on wave crests
          vec3 body = mix(uDeep, uShallow, clamp(0.25 + vHeight * 0.35, 0.0, 1.0) * 0.55);
          float sss = pow(max(dot(-V, uSunDir) * 0.5 + 0.5, 0.0), 3.0) * clamp(vHeight * 0.6 + 0.4, 0.0, 1.0);
          body += uShallow * sss * 0.6 * (0.4 + 0.6 * uSunVisible);
          body = mix(body, uShallow * 1.4, shore * 0.85);
          // sky light on the body
          body *= (0.35 + 0.65 * clamp(uHorizon.g * 1.2, 0.0, 1.5));
          vec3 col = mix(body, refl, F) + spec;
          // foam: crests + shoreline + ring waves
          float fn = fbm2(vWorld.xz * 0.09 + uTime * 0.05);
          float fn2 = vnoise(vWorld.xz * 0.013 + 3.0);
          float crest = smoothstep(0.75, 1.25, vHeight * 0.7 + fn * 0.7 + fn2 * 0.35) * uFoam * smoothstep(0.2, 0.8, fn2);
          float sf = smoothstep(0.55, 0.95, shore + fn * 0.25) * (0.6 + 0.4 * sin(uTime * 1.2 + shore * 18.0));
          float rf = smoothstep(0.5, 3.0, vRing) * (0.5 + 0.5 * fn);
          float foam = clamp(crest + sf + rf, 0.0, 1.0) * (1.0 - smoothstep(1500.0, 6000.0, dist) * 0.6);
          vec3 foamCol = (uHorizon * 0.6 + uSunColor * 0.06 * uSunVisible + uZenith * 0.3) * 1.1;
          col = mix(col, foamCol, foam * 0.85);
          if (uBoil.w > 0.0) {
            float bd = length(vWorld.xz - uBoil.xy) / uBoil.z;
            float b = uBoil.w * smoothstep(1.0, 0.0, bd);
            float bub = smoothstep(0.35, 0.0, worley(vWorld.xz * 0.35 + uTime * 0.8));
            col = mix(col, foamCol * 0.9 + vec3(0.03, 0.025, 0.02), clamp(b * (0.45 + bub * 0.6), 0.0, 1.0));
          }
          if (uPumice > 0.0) {
            float pd = length(vWorld.xz - uPumiceRect.xy) / uPumiceRect.z;
            float cell = worley(vWorld.xz * 0.6);
            float pm = uPumice * smoothstep(1.0, 0.7, pd) * smoothstep(0.05, 0.25, cell + fbm2(vWorld.xz * 0.05) * 0.3);
            vec3 pcol = vec3(0.32, 0.29, 0.25) * (0.6 + 0.6 * vnoise(vWorld.xz * 1.7)) * (uHorizon * 0.8 + uSunColor * 0.05 * max(uSunDir.y, 0.0));
            col = mix(col, pcol, clamp(pm, 0.0, 1.0));
          }
          // volcanic glow light on the water
          if (uGlowLight.r + uGlowLight.g > 0.0) {
            float gd = length(vWorld.xz - uGlowPos.xz);
            float gl = 1.0 / (1.0 + gd * gd * 0.0000025);
            vec3 L = normalize(uGlowPos - vWorld);
            float gs = pow(max(dot(reflect(-V, n), L), 0.0), 40.0);
            col += uGlowLight * (gl * 0.08 + gs * gl * 1.4);
          }
          col += uFlashCol * uFlash * (0.25 + F * 1.5);
          col *= uTint;
          // horizon-aware fog (matches sky dome)
          vec3 fd = normalize(vec3(-V.x, max(-V.y, 0.0) * 0.15 + 0.01, -V.z));
          vec3 fogc = skyBase(fd);
          float fog = 1.0 - exp(-uFogDensity * dist);
          col = mix(col, fogc, clamp(fog, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = false;
    this.material = mat;
  }

  setSea(sea, scale = 1) { setWaves(this.waveUniforms, sea, scale); }

  // Centre the grid on a point (snapped so ripples don't swim).
  center(x, z) {
    const s = this.centerStep;
    this.mesh.position.set(Math.round(x / s) * s, 0, Math.round(z / s) * s);
  }

  applyMood(state, fogDensity) {
    this.uniforms.uDeep.value.set(...state.deep);
    this.uniforms.uShallow.value.set(...state.shallow);
    this.uniforms.uFogDensity.value = fogDensity ?? state.fog;
  }

  heightAt(x, z, t) { return sampleWaves(this.waveUniforms, x, z, t); }
}
