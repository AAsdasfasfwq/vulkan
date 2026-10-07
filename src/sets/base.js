import * as THREE from 'three';
import { Sky } from '../world/sky.js';
import { clamp, lerp } from '../core/math.js';

export class BaseSet {
  constructor(engine, film) {
    this.engine = engine;
    this.film = film;
    this.scene = new THREE.Scene();
    this.sky = new Sky();
    this.scene.add(this.sky.mesh);
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.sun = sun;
    this.scene.add(sun, sun.target);
    this.hemi = new THREE.HemisphereLight(0xaaccff, 0x445533, 1);
    this.scene.add(this.hemi);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.0001);
    this.uTime = { value: 0 };
    this.uWind = { value: 1 };
    this.moodState = null;
  }

  // Applies a mood (optionally blended) to sky, lights and fog.
  mood(name, ov = {}, name2 = null, k = 0) {
    const s = this.sky.apply(name, ov, name2, k);
    this.sun.color.setRGB(...s.light);
    this.sun.intensity = s.lightI;
    this.hemi.color.setRGB(...s.hemiSky);
    this.hemi.groundColor.setRGB(...s.hemiGround);
    this.hemi.intensity = s.hemiI;
    this.scene.fog.color.setRGB(...s.horizon);
    this.scene.fog.density = ov.fog ?? s.fog;
    this.moodState = s;
    return s;
  }

  env(intensity = 1) {
    const key = this.sky.envKey();
    const tex = this.engine.envFor(key, () => {
      const sc = new THREE.Scene();
      sc.add(new THREE.Mesh(this.sky.mesh.geometry, this.sky.mesh.material));
      return sc;
    });
    this.scene.environment = tex;
    this.scene.environmentIntensity = intensity;
  }

  fitShadow(center, radius, dist = 3) {
    const d = this.sky.uniforms.uSunDir.value;
    const sun = this.sun;
    sun.target.position.set(center[0], center[1], center[2]);
    sun.position.set(center[0] + d.x * radius * dist, center[1] + Math.max(d.y, 0.08) * radius * dist, center[2] + d.z * radius * dist);
    const c = sun.shadow.camera;
    c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
    c.near = radius * 0.1; c.far = radius * dist * 2.5;
    c.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
  }

  // Resolve a value that may be animated over the shot: number | [a,b] | fn(u, lt)
  static val(v, u, lt, def) {
    if (v === undefined) return def;
    if (typeof v === 'function') return v(u, lt);
    if (Array.isArray(v) && typeof v[0] === 'number' && v.length === 2) return lerp(v[0], v[1], u);
    return v;
  }

  prepare() {}
  update() {}
}

export const val = BaseSet.val;
