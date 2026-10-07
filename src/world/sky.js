import * as THREE from 'three';
import { NOISE, SKY } from './glsl.js';
import { lerp } from '../core/math.js';

const C = (r, g, b) => new THREE.Vector3(r, g, b);
const dirFromAngles = (elDeg, azDeg) => {
  const el = (elDeg * Math.PI) / 180, az = (azDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
};

// Mood presets (linear HDR). Each describes sky, light, fog and water colour.
export const MOODS = {
  day: {
    zenith: [0.05, 0.2, 0.62], horizon: [0.62, 0.8, 0.98], ground: [0.25, 0.3, 0.33], hazePow: 0.45,
    sunEl: 48, sunAz: -35, sunColor: [9, 8.4, 7.4], sunSize: 0.022,
    cloud: 0.38, cloudLit: [1.25, 1.22, 1.2], cloudDark: [0.55, 0.6, 0.7], cloudScale: 1.2,
    light: [1.0, 0.96, 0.9], lightI: 3.2, hemiSky: [0.55, 0.7, 1.0], hemiGround: [0.3, 0.28, 0.22], hemiI: 0.9,
    fog: 0.000035, deep: [0.004, 0.05, 0.11], shallow: [0.02, 0.32, 0.36], exposure: 0.95,
  },
  golden: {
    zenith: [0.05, 0.15, 0.46], horizon: [1.08, 0.68, 0.38], ground: [0.25, 0.2, 0.16], hazePow: 0.3,
    sunEl: 12, sunAz: -60, sunColor: [9, 5.6, 2.7], sunSize: 0.026,
    cloud: 0.42, cloudLit: [1.4, 0.95, 0.66], cloudDark: [0.42, 0.34, 0.4], cloudScale: 1.1,
    light: [1.0, 0.72, 0.45], lightI: 3.4, hemiSky: [0.5, 0.55, 0.8], hemiGround: [0.35, 0.25, 0.16], hemiI: 0.75,
    fog: 0.00004, deep: [0.006, 0.04, 0.09], shallow: [0.03, 0.25, 0.27], exposure: 1.0,
  },
  dawn: {
    zenith: [0.08, 0.12, 0.34], horizon: [1.0, 0.58, 0.44], ground: [0.2, 0.18, 0.2], hazePow: 0.38,
    sunEl: 5, sunAz: 80, sunColor: [4.6, 2.5, 1.5], sunSize: 0.03,
    cloud: 0.3, cloudLit: [1.25, 0.8, 0.72], cloudDark: [0.35, 0.3, 0.42], cloudScale: 1.0,
    light: [1.0, 0.7, 0.55], lightI: 2.4, hemiSky: [0.45, 0.45, 0.7], hemiGround: [0.3, 0.22, 0.2], hemiI: 0.7,
    fog: 0.00006, deep: [0.01, 0.035, 0.08], shallow: [0.05, 0.2, 0.24], exposure: 1.05,
  },
  dusk: {
    zenith: [0.04, 0.035, 0.12], horizon: [1.1, 0.45, 0.18], ground: [0.1, 0.07, 0.07], hazePow: 0.38,
    sunEl: 2, sunAz: -70, sunColor: [9, 3.6, 1.2], sunSize: 0.03,
    cloud: 0.45, cloudLit: [1.5, 0.6, 0.3], cloudDark: [0.16, 0.1, 0.16], cloudScale: 1.0,
    light: [1.0, 0.5, 0.25], lightI: 2.6, hemiSky: [0.35, 0.3, 0.55], hemiGround: [0.25, 0.14, 0.1], hemiI: 0.6,
    fog: 0.00007, deep: [0.01, 0.02, 0.05], shallow: [0.05, 0.1, 0.12], exposure: 1.05,
  },
  night: {
    zenith: [0.002, 0.004, 0.014], horizon: [0.02, 0.03, 0.065], ground: [0.004, 0.006, 0.01], hazePow: 0.5,
    sunEl: 35, sunAz: 150, sunColor: [0.5, 0.6, 0.85], sunSize: 0.012, sunVisible: 0.6, stars: 1.2,
    cloud: 0.2, cloudLit: [0.05, 0.06, 0.09], cloudDark: [0.01, 0.012, 0.02], cloudScale: 1.0,
    light: [0.55, 0.65, 1.0], lightI: 0.35, hemiSky: [0.2, 0.3, 0.6], hemiGround: [0.03, 0.03, 0.04], hemiI: 0.25,
    fog: 0.00006, deep: [0.001, 0.004, 0.01], shallow: [0.004, 0.012, 0.02], exposure: 1.25,
  },
  nightGlow: {
    zenith: [0.003, 0.003, 0.01], horizon: [0.06, 0.025, 0.03], ground: [0.01, 0.005, 0.005], hazePow: 0.5,
    sunEl: 35, sunAz: 150, sunColor: [0.4, 0.45, 0.7], sunSize: 0.012, sunVisible: 0.5, stars: 0.8,
    cloud: 0.25, cloudLit: [0.08, 0.04, 0.04], cloudDark: [0.012, 0.01, 0.014], cloudScale: 1.0,
    glow: [1.6, 0.32, 0.08], glowSize: 6.0,
    light: [0.5, 0.55, 0.9], lightI: 0.3, hemiSky: [0.25, 0.15, 0.25], hemiGround: [0.06, 0.03, 0.02], hemiI: 0.25,
    fog: 0.00007, deep: [0.002, 0.003, 0.008], shallow: [0.01, 0.01, 0.014], exposure: 1.0,
  },
  haze: {
    zenith: [0.15, 0.16, 0.19], horizon: [0.6, 0.48, 0.34], ground: [0.2, 0.18, 0.16], hazePow: 0.5,
    sunEl: 30, sunAz: -40, sunColor: [3.6, 2.2, 1.1], sunSize: 0.035, sunVisible: 0.6,
    cloud: 0.55, cloudLit: [0.6, 0.57, 0.53], cloudDark: [0.32, 0.3, 0.29], cloudScale: 0.8,
    light: [0.95, 0.85, 0.7], lightI: 1.8, hemiSky: [0.55, 0.53, 0.5], hemiGround: [0.3, 0.28, 0.25], hemiI: 0.9,
    fog: 0.00011, deep: [0.02, 0.04, 0.05], shallow: [0.06, 0.12, 0.12], exposure: 1.0,
  },
  ashDark: {
    zenith: [0.004, 0.0035, 0.003], horizon: [0.03, 0.018, 0.012], ground: [0.006, 0.004, 0.003], hazePow: 0.6,
    sunEl: 20, sunAz: -40, sunColor: [0.3, 0.2, 0.12], sunSize: 0.03, sunVisible: 0.0,
    cloud: 0.0, glow: [1.0, 0.22, 0.05], glowSize: 8.0,
    light: [1.0, 0.45, 0.2], lightI: 0.25, hemiSky: [0.12, 0.08, 0.06], hemiGround: [0.05, 0.03, 0.02], hemiI: 0.25,
    fog: 0.00012, deep: [0.002, 0.002, 0.002], shallow: [0.01, 0.008, 0.006], exposure: 1.15,
  },
  blast: {
    zenith: [0.018, 0.016, 0.018], horizon: [0.24, 0.12, 0.065], ground: [0.04, 0.03, 0.025], hazePow: 0.42,
    sunEl: 6, sunAz: 100, sunColor: [3.0, 1.4, 0.6], sunSize: 0.03, sunVisible: 0.0,
    cloud: 0.6, cloudLit: [0.2, 0.1, 0.055], cloudDark: [0.025, 0.02, 0.02], cloudScale: 0.8,
    glow: [1.7, 0.42, 0.09], glowSize: 5.0, glowAz: -50, glowEl: 4,
    light: [1.0, 0.55, 0.3], lightI: 0.9, hemiSky: [0.24, 0.15, 0.12], hemiGround: [0.07, 0.045, 0.035], hemiI: 0.45,
    fog: 0.00005, deep: [0.008, 0.008, 0.01], shallow: [0.05, 0.035, 0.025], exposure: 1.15,
  },
  storm: {
    zenith: [0.06, 0.07, 0.085], horizon: [0.2, 0.2, 0.21], ground: [0.06, 0.06, 0.06], hazePow: 0.6,
    sunEl: 30, sunAz: -40, sunColor: [1.6, 1.4, 1.2], sunSize: 0.03, sunVisible: 0.0,
    cloud: 0.75, cloudLit: [0.22, 0.22, 0.24], cloudDark: [0.07, 0.07, 0.08], cloudScale: 0.7,
    light: [0.8, 0.82, 0.9], lightI: 0.9, hemiSky: [0.3, 0.32, 0.36], hemiGround: [0.12, 0.12, 0.12], hemiI: 0.8,
    fog: 0.00012, deep: [0.01, 0.02, 0.025], shallow: [0.03, 0.06, 0.06], exposure: 1.15,
  },
  blood: {
    zenith: [0.08, 0.02, 0.12], horizon: [1.6, 0.18, 0.06], ground: [0.12, 0.03, 0.03], hazePow: 0.32,
    sunEl: 2.5, sunAz: -70, sunColor: [10, 2.0, 0.6], sunSize: 0.035,
    cloud: 0.5, cloudLit: [1.6, 0.35, 0.25], cloudDark: [0.22, 0.04, 0.12], cloudScale: 0.9,
    light: [1.0, 0.3, 0.15], lightI: 2.4, hemiSky: [0.5, 0.15, 0.35], hemiGround: [0.25, 0.07, 0.05], hemiI: 0.6,
    fog: 0.00008, deep: [0.02, 0.005, 0.01], shallow: [0.08, 0.03, 0.03], exposure: 1.0,
  },
  violet: {
    zenith: [0.06, 0.02, 0.2], horizon: [1.1, 0.25, 0.4], ground: [0.1, 0.04, 0.08], hazePow: 0.4,
    sunEl: 1.5, sunAz: -70, sunColor: [8, 2.5, 2.2], sunSize: 0.035,
    cloud: 0.4, cloudLit: [1.2, 0.4, 0.6], cloudDark: [0.15, 0.05, 0.18], cloudScale: 0.9,
    light: [0.9, 0.35, 0.45], lightI: 2.0, hemiSky: [0.4, 0.2, 0.5], hemiGround: [0.2, 0.08, 0.1], hemiI: 0.6,
    fog: 0.00008, deep: [0.02, 0.01, 0.03], shallow: [0.07, 0.04, 0.08], exposure: 1.0,
  },
  blueSun: {
    zenith: [0.12, 0.2, 0.2], horizon: [0.62, 0.72, 0.6], ground: [0.2, 0.22, 0.2], hazePow: 0.6,
    sunEl: 30, sunAz: -30, sunColor: [2.2, 5.0, 7.0], sunSize: 0.03,
    cloud: 0.35, cloudLit: [0.7, 0.8, 0.75], cloudDark: [0.35, 0.4, 0.4], cloudScale: 1.0,
    light: [0.6, 0.85, 1.0], lightI: 2.4, hemiSky: [0.45, 0.6, 0.6], hemiGround: [0.25, 0.27, 0.22], hemiI: 0.9,
    fog: 0.00008, deep: [0.01, 0.04, 0.05], shallow: [0.04, 0.16, 0.16], exposure: 1.0,
  },
  overcast: {
    zenith: [0.36, 0.38, 0.42], horizon: [0.62, 0.64, 0.66], ground: [0.25, 0.25, 0.25], hazePow: 0.8,
    sunEl: 40, sunAz: -40, sunColor: [1.5, 1.5, 1.5], sunSize: 0.03, sunVisible: 0.0,
    cloud: 0.8, cloudLit: [0.62, 0.63, 0.66], cloudDark: [0.35, 0.36, 0.38], cloudScale: 0.6,
    light: [0.85, 0.88, 0.95], lightI: 1.1, hemiSky: [0.6, 0.62, 0.68], hemiGround: [0.3, 0.3, 0.28], hemiI: 1.1,
    fog: 0.00012, deep: [0.02, 0.03, 0.04], shallow: [0.05, 0.08, 0.09], exposure: 1.0,
  },
  space: {
    zenith: [0, 0, 0], horizon: [0, 0, 0], ground: [0, 0, 0], hazePow: 1, stars: 1.6,
    sunEl: 10, sunAz: -60, sunColor: [12, 11, 10], sunSize: 0.012, sunVisible: 1,
    cloud: 0,
    light: [1.0, 0.97, 0.92], lightI: 3.2, hemiSky: [0.05, 0.07, 0.12], hemiGround: [0.0, 0.0, 0.0], hemiI: 0.15,
    fog: 0, deep: [0, 0, 0], shallow: [0, 0, 0], exposure: 1.0,
  },
};

export class Sky {
  constructor() {
    this.uniforms = {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: C(1, 1, 1) },
      uSunSize: { value: 0.02 },
      uZenith: { value: C(0, 0, 1) },
      uHorizon: { value: C(1, 1, 1) },
      uGround: { value: C(0.2, 0.2, 0.2) },
      uHazePow: { value: 0.5 },
      uCloudCover: { value: 0.3 },
      uCloudLit: { value: C(1, 1, 1) },
      uCloudDark: { value: C(0.5, 0.5, 0.5) },
      uCloudScale: { value: 1 },
      uSkyTime: { value: 0 },
      uStars: { value: 0 },
      uGlowDir: { value: new THREE.Vector3(0, 0, -1) },
      uGlowColor: { value: C(0, 0, 0) },
      uGlowSize: { value: 4 },
      uSunVisible: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          // rotation-only view so the dome is always centred on the camera, pushed to the far plane
          vec4 pp = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
          gl_Position = vec4(pp.xy, pp.w * 0.99999, pp.w);
        }`,
      fragmentShader: NOISE + SKY + /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          gl_FragColor = vec4(skyColor(d, true), 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.state = null;
    this.fogColor = new THREE.Color();
  }

  // Blend between moods; `m` can be a name or an object. Overrides are merged.
  apply(mood, overrides = {}, mood2 = null, k = 0) {
    const a = { ...(typeof mood === 'string' ? MOODS[mood] : mood), ...overrides };
    const b = mood2 ? { ...(typeof mood2 === 'string' ? MOODS[mood2] : mood2), ...(overrides.__b || {}) } : null;
    const mix = (key, def) => {
      const va = a[key] ?? def, vb = b ? b[key] ?? def : va;
      if (Array.isArray(va)) return va.map((x, i) => lerp(x, vb[i], k));
      return lerp(va, vb, k);
    };
    const s = {};
    for (const key of ['zenith', 'horizon', 'ground', 'sunColor', 'cloudLit', 'cloudDark', 'light', 'hemiSky', 'hemiGround', 'deep', 'shallow'])
      s[key] = mix(key, [0, 0, 0]);
    s.glow = mix('glow', [0, 0, 0]);
    for (const [key, def] of [['hazePow', 0.5], ['sunEl', 30], ['sunAz', 0], ['sunSize', 0.02], ['cloud', 0], ['cloudScale', 1], ['lightI', 1], ['hemiI', 1], ['fog', 0.0001], ['exposure', 1], ['stars', 0], ['glowSize', 4], ['sunVisible', 1]])
      s[key] = mix(key, def);
    s.glowAz = a.glowAz ?? 0;
    s.glowEl = a.glowEl ?? 2;
    const u = this.uniforms;
    u.uZenith.value.set(...s.zenith);
    u.uHorizon.value.set(...s.horizon);
    u.uGround.value.set(...s.ground);
    u.uHazePow.value = s.hazePow;
    u.uSunDir.value.copy(dirFromAngles(s.sunEl, s.sunAz));
    u.uSunColor.value.set(...s.sunColor);
    u.uSunSize.value = s.sunSize;
    u.uCloudCover.value = s.cloud;
    u.uCloudLit.value.set(...s.cloudLit);
    u.uCloudDark.value.set(...s.cloudDark);
    u.uCloudScale.value = s.cloudScale;
    u.uStars.value = s.stars;
    u.uGlowColor.value.set(...s.glow);
    u.uGlowSize.value = s.glowSize;
    u.uGlowDir.value.copy(dirFromAngles(s.glowEl, s.glowAz));
    u.uSunVisible.value = s.sunVisible;
    this.fogColor.setRGB(...s.horizon);
    this.state = s;
    return s;
  }

  // Key that identifies the env map needed for this state (for PMREM caching).
  envKey() {
    const s = this.state;
    if (!s) return '';
    const r = (v) => (Array.isArray(v) ? v.map((x) => x.toFixed(2)).join(',') : v.toFixed(2));
    return [s.zenith, s.horizon, s.ground, s.sunColor, s.sunEl, s.sunAz, s.cloud, s.glow, s.stars].map(r).join('|');
  }
}
