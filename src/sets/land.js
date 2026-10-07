import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BaseSet, val } from './base.js';
import { NOISE } from '../world/glsl.js';
import { PuffCloud, StreakCloud } from '../world/particles.js';
import { plumeletEmitter } from '../world/eruption.js';
import { makeCrownGeometry, addSway, paint } from '../world/plants.js';
import { brickGeometry, buildingMat } from '../world/buildings.js';
import { makeFigure, poseFigure } from '../world/figures.js';
import { makeNoise, rng, clamp, lerp, fract, smoothstep } from '../core/math.js';

const nz = makeNoise(77);
export function landHeight(x, z) {
  let h = nz.fbm2(x * 0.0012, z * 0.0012, 4) * 40 + nz.fbm2(x * 0.004, z * 0.004, 3) * 6;
  const rail = Math.exp(-Math.pow(z / 40, 2));
  return lerp(h, Math.min(h, nz.fbm2(x * 0.0012, 0, 4) * 40) * 0.5, rail);
}

export class LandSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    const S = 6000, N = 320;
    const g = new THREE.PlaneGeometry(S, S, N, N);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, landHeight(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    this.landU = { uSnow: { value: 0 }, uWet: { value: 0 }, uTime: this.uTime, uFrost: { value: 0 } };
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.landU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vNw;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed,1.0)).xyz; vNw = normalize(mat3(modelMatrix)*objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vNw; uniform float uSnow; uniform float uWet; uniform float uFrost;\n' + NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          // patchwork fields
          vec2 cell = floor(vWp.xz / vec2(140.0, 90.0) + vec2(vnoise(vWp.xz*0.002)*0.6));
          float h = hash12(cell);
          vec3 wheat = vec3(0.7, 0.55, 0.2), green = vec3(0.16, 0.36, 0.07), plough = vec3(0.3, 0.2, 0.11), grass = vec3(0.22, 0.42, 0.1);
          vec3 c = h < 0.2 ? wheat : h < 0.55 ? green : h < 0.68 ? plough : grass;
          float rows = 0.85 + 0.15 * sin(dot(vWp.xz, vec2(cos(h*6.0), sin(h*6.0))) * 1.6);
          c *= rows * (0.85 + 0.3 * fbm2(vWp.xz * 0.02));
          // hedgerows at field borders
          vec2 f = fract(vWp.xz / vec2(140.0, 90.0) + vec2(vnoise(vWp.xz*0.002)*0.6));
          float hedge = smoothstep(0.015, 0.0, min(min(f.x, 1.0-f.x)*1.0, min(f.y, 1.0-f.y)*1.4));
          c = mix(c, vec3(0.1, 0.2, 0.06), hedge);
          // rail embankment
          float rb = smoothstep(4.5, 2.5, abs(vWp.z));
          c = mix(c, vec3(0.35, 0.32, 0.28) * (0.8 + 0.4*vnoise(vWp.xz*0.8)), rb);
          // weather
          c = mix(c, c * vec3(0.55, 0.5, 0.45), uWet);
          c = mix(c, vec3(0.92, 0.94, 0.98) * (0.9 + 0.1 * vnoise(vWp.xz * 0.3)), uSnow * smoothstep(0.2, 0.7, vNw.y));
          c = mix(c, c * 0.6 + vec3(0.35, 0.38, 0.42), uFrost);
          diffuseColor.rgb = c;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, uWet);');
    };
    this.ground = new THREE.Mesh(g, mat);
    this.ground.receiveShadow = true;
    sc.add(this.ground);
    // rails
    const r = rng(9);
    const sleeperG = new THREE.BoxGeometry(0.25, 0.15, 2.6);
    const sleepers = new THREE.InstancedMesh(sleeperG, new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 }), 3000);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 3000; i++) { const x = -2400 + i * 1.6; m4.makeTranslation(x, landHeight(x, 0) + 0.3, 0); sleepers.setMatrixAt(i, m4); }
    sleepers.receiveShadow = true;
    sc.add(sleepers);
    for (const zz of [-0.72, 0.72]) {
      const pts = [];
      for (let x = -2400; x <= 2400; x += 20) pts.push(new THREE.Vector3(x, landHeight(x, 0) + 0.46, zz));
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, 0.06, 4), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.25, metalness: 0.9 }));
      sc.add(rail);
    }
    this.railY = (x) => landHeight(x, 0) + 0.52;
    // telegraph poles along the line
    const poleParts = [];
    for (let i = 0; i < 120; i++) {
      const x = -2400 + i * 40;
      const y = landHeight(x, 6);
      const p = new THREE.CylinderGeometry(0.12, 0.16, 8, 6); p.translate(x, y + 4, 6); poleParts.push(paint(p.toNonIndexed(), [0.3, 0.22, 0.15]));
      const c = new THREE.BoxGeometry(0.1, 0.1, 1.6); c.translate(x, y + 7.4, 6); poleParts.push(paint(c.toNonIndexed(), [0.3, 0.22, 0.15]));
    }
    const poles = new THREE.Mesh(mergeGeometries(poleParts.map((p) => { p.deleteAttribute('uv'); return p; })), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    poles.castShadow = true;
    sc.add(poles);
    const wpts = [];
    for (let i = 0; i < 119; i++) {
      const x0 = -2400 + i * 40, x1 = x0 + 40;
      for (const dz of [-0.6, 0.6]) for (let k = 0; k < 8; k++) {
        const a = k / 8, b = (k + 1) / 8;
        const y = (u, x) => landHeight(x, 6) + 7.45 - Math.sin(u * Math.PI) * 0.6;
        wpts.push(lerp(x0, x1, a), y(a, lerp(x0, x1, a)), 6 + dz, lerp(x0, x1, b), y(b, lerp(x0, x1, b)), 6 + dz);
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpts, 3));
    this.wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x111111 }));
    sc.add(this.wires);
    // trees & farmhouses
    this.plantU = { uTime: this.uTime, uWind: this.uWind, uAsh: { value: 0 } };
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    addSway(treeMat, this.plantU, 0.25);
    const trees = new THREE.InstancedMesh(makeCrownGeometry(), treeMat, 1600);
    const c = new THREE.Color();
    for (let i = 0; i < 1600; i++) {
      let x, z; do { x = (r() - 0.5) * 5000; z = (r() - 0.5) * 5000; } while (Math.abs(z) < 25);
      const s = 8 + r() * 8;
      m4.compose(new THREE.Vector3(x, landHeight(x, z) - 1, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s, s));
      trees.setMatrixAt(i, m4);
      c.setRGB(0.12 + r() * 0.1, 0.25 + r() * 0.12, 0.07); trees.setColorAt(i, c);
    }
    trees.castShadow = true;
    this.trees = trees;
    sc.add(trees);
    const bm = buildingMat();
    for (let i = 0; i < 30; i++) {
      const b = brickGeometry(900 + i, { w: 10 + r() * 6, d: 7 + r() * 3, floors: 1 + Math.floor(r() * 2), color: [0.75, 0.7, 0.6] });
      const mesh = new THREE.Mesh(b.geo, bm);
      let x, z; do { x = (r() - 0.5) * 3000; z = (r() - 0.5) * 3000; } while (Math.abs(z) < 60);
      mesh.position.set(x, landHeight(x, z), z); mesh.rotation.y = r() * 3; mesh.castShadow = true;
      sc.add(mesh);
    }
    // locomotive
    this.train = this.makeTrain();
    sc.add(this.train);
    this.puffs = new PuffCloud(1600);
    this.smoke = { on: true, c: [0, 0, 0], h: 60, spread: 3, size: 3, life: 6, alpha: 0.7, col: [0.2, 0.19, 0.18], n: 160, seed: 2, wind: [-1.6, 0.2] };
    this.puffs.emitters.push(plumeletEmitter(this.smoke));
    sc.add(this.puffs.mesh);
    this.weather = new StreakCloud(5000, { additive: false });
    this.weather.emitters.push(this.weatherEmitter());
    sc.add(this.weather.mesh);
    this.people = [];
  }

  makeTrain() {
    const g = new THREE.Group();
    const black = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.7 });
    const red = new THREE.MeshStandardMaterial({ color: 0x7a1510, roughness: 0.4, metalness: 0.5 });
    const green = new THREE.MeshStandardMaterial({ color: 0x1d4a2c, roughness: 0.35, metalness: 0.5 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89b45, roughness: 0.25, metalness: 0.95 });
    const loco = new THREE.Group();
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 6, 32), green); boiler.rotation.z = Math.PI / 2; boiler.position.set(1.2, 2.3, 0); loco.add(boiler);
    const smokebox = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.0, 32), black); smokebox.rotation.z = Math.PI / 2; smokebox.position.set(4.6, 2.3, 0); loco.add(smokebox);
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 1.4, 20), black); chim.position.set(4.6, 3.6, 0); loco.add(chim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 12), brass); dome.position.set(1.6, 3.15, 0); loco.add(dome);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 2.2), green); cab.position.set(-2.6, 2.8, 0); loco.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.5), black); roof.position.set(-2.6, 3.95, 0); loco.add(roof);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.4, 1.9), black); frame.position.set(0.8, 1.2, 0); loco.add(frame);
    const buffer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 2.4), red); buffer.position.set(5.2, 1.2, 0); loco.add(buffer);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4, 2.5) })); lamp.position.set(5.15, 2.9, 0); loco.add(lamp);
    this.wheels = [];
    const wheelG = new THREE.Group();
    const mkWheel = (R) => { const w = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 8, 28), red); w.add(t); for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, R * 2, 0.05), red); s.rotation.z = (i / 10) * Math.PI; w.add(s); } const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), brass); hub.rotation.x = Math.PI / 2; w.add(hub); return w; };
    for (const [x, R] of [[-1.6, 0.95], [0.6, 0.95], [3.4, 0.5], [4.4, 0.5]]) for (const z of [-0.98, 0.98]) { const w = mkWheel(R); w.position.set(x, R + 0.05, z); loco.add(w); this.wheels.push([w, R]); }
    this.coupling = [];
    for (const z of [-1.08, 1.08]) { const rod = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.06), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.2 })); rod.position.set(-0.5, 1.0, z); loco.add(rod); this.coupling.push(rod); }
    g.add(loco);
    // tender + carriages
    const tender = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.3), green); tender.position.set(-5.4, 2.0, 0); g.add(tender);
    const coal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 2.0), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })); coal.position.set(-5.4, 3.0, 0); g.add(coal);
    for (let i = 0; i < 4; i++) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.6, 2.6), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x6a1d14 : 0x5a3a1a, roughness: 0.45, metalness: 0.2 })); body.position.y = 2.4; car.add(body);
      const rf = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 9.6, 20, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2a2a2a })); rf.rotation.z = Math.PI / 2; rf.rotation.x = -Math.PI / 2; rf.scale.set(1, 1, 0.35); rf.position.y = 3.7; car.add(rf);
      for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.7) })); wn.position.set(-3.6 + k * 1.45, 2.8, s * 1.31); if (s < 0) wn.rotation.y = Math.PI; car.add(wn); }
      for (const x of [-3.2, 3.2]) for (const z of [-0.98, 0.98]) { const w = mkWheel(0.5); w.position.set(x, 0.55, z); car.add(w); this.wheels.push([w, 0.5]); }
      car.position.set(-12.5 - i * 10.2, 0, 0);
      g.add(car);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.userData.chimney = [4.6, 4.3, 0];
    return g;
  }

  weatherEmitter() {
    const N = 4500, r = rng(31);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        if (!this.camPos) return;
        const rain = this.rainK ?? 0, snow = this.snowK ?? 0;
        const c = this.camPos;
        if (rain > 0) {
          const S = 40;
          for (let i = 0; i < N * rain; i++) { const [a, b, cc] = seeds[i]; const x = c.x + (fract(a - c.x / S) - 0.5) * S, z = c.z + (fract(b - c.z / S) - 0.5) * S, y = c.y + (fract(cc - (t * 16) / S - c.y / S) - 0.5) * S * 0.6; push(x, y, z, x - 0.3, y + 1.0, z, 0.012, 0.55, 0.58, 0.62, 0.45); }
        }
        if (snow > 0) {
          const S = 50;
          for (let i = 0; i < N * snow; i++) { const [a, b, cc, d] = seeds[i]; const x = c.x + (fract(a - c.x / S + Math.sin(t * 0.5 + i) * 0.004) - 0.5) * S, z = c.z + (fract(b - c.z / S) - 0.5) * S, y = c.y + (fract(cc - (t * 1.4) / S - c.y / S) - 0.5) * S * 0.6; push(x, y, z, x - 0.04, y + 0.1, z, 0.05 + d * 0.04, 0.95, 0.96, 1.0, 0.9); }
        }
      },
    };
  }

  nearFar() { return [0.2, 40000]; }
  fx() { const m = this.moodState || {}; return { exposure: m.exposure ?? 1, grade: 'film', bloom: 0.6 }; }

  prepare(shot) {
    const p = shot.p || {};
    this.mood(p.mood ?? 'golden', p.moodOv ?? {}, p.mood2 ?? null, 0);
    this.env(1);
    this.train.visible = p.train !== false;
    for (const f of this.people) f.visible = false;
    for (const pd of p.people || []) {
      let f = this.people.find((x) => !x.visible && x.userData.style === pd.style);
      if (!f) { f = makeFigure(pd.style, 900 + this.people.length * 3); this.people.push(f); this.scene.add(f); }
      f.visible = true; f.userData.def = pd;
    }
    this.active = this.people.filter((f) => f.visible);
  }

  update(shot, lt, vt, fx) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.uTime.value = vt;
    this.sky.uniforms.uSkyTime.value = vt;
    this.mood(p.mood ?? 'golden', p.moodOv ?? {}, p.mood2 ?? null, val(p.moodK, u, lt, 0));
    fx.exposure = (fx.exposure ?? 1) * (p.exposure ?? 1);
    this.landU.uSnow.value = val(p.snowCover, u, lt, 0);
    this.landU.uWet.value = val(p.wet, u, lt, 0);
    this.landU.uFrost.value = val(p.frost, u, lt, 0);
    this.trees.material.color.setScalar(1);
    this.rainK = val(p.rain, u, lt, 0);
    this.snowK = val(p.snow, u, lt, 0);
    this.uWind.value = val(p.wind, u, lt, 1);
    // train
    const speed = p.trainSpeed ?? 18;
    const x = (p.trainX ?? -100) + speed * lt;
    this.train.position.set(x, this.railY(x) - 0.52, 0);
    const ang = (speed * vt);
    for (const [w, R] of this.wheels) w.rotation.z = -ang / R;
    const ca = -ang / 0.95;
    this.coupling.forEach((rod) => { rod.position.set(-0.5 + Math.cos(ca) * 0.35, 1.0 + Math.sin(ca) * 0.35, rod.position.z); });
    const ch = this.train.userData.chimney;
    this.smoke.on = this.train.visible;
    this.smoke.c = [x + ch[0], this.train.position.y + ch[1], ch[2]];
    this.smoke.wind = [-speed * 0.12 - 0.6, 0.15];
    const s = this.moodState;
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.copy(this.sky.uniforms.uSunDir.value);
    PU.uSunCol.value.set(...s.light).multiplyScalar(s.lightI * 0.5);
    PU.uAmb.value.set(...s.hemiSky).multiplyScalar(s.hemiI * 0.6).add(new THREE.Vector3(...s.horizon).multiplyScalar(0.3));
    PU.uFogDensity.value = this.scene.fog.density * 0.5;
    PU.uFogColor.value.set(...s.horizon);
    for (const f of this.active) {
      const d = f.userData.def;
      f.position.set(d.at[0], landHeight(d.at[0], d.at[1]), d.at[1]);
      f.rotation.set(0, ((d.rot ?? 0) * Math.PI) / 180, 0);
      poseFigure(f, vt, d.pose || {});
    }
  }

  afterCamera(shot, lt, vt, cam) {
    this.camPos = cam.position;
    this.puffs.update(vt, cam.position);
    this.weather.update(vt);
    const look = this.engine.camState.look;
    const dist = cam.position.distanceTo(look);
    this.fitShadow([look.x, look.y, look.z], clamp(dist * 0.9, 15, 800), 3);
  }
}
