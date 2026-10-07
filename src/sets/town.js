import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { NOISE } from '../world/glsl.js';
import { brickGeometry, windowsGeometry, stackGeometry, colonialGeometry, streetLamp, buildingMat, brickMat, windowMat, towerGeometry, towerWindows } from '../world/buildings.js';
import { makeFigure, poseFigure, addProp } from '../world/figures.js';
import { PuffCloud, StreakCloud } from '../world/particles.js';
import { plumeletEmitter } from '../world/eruption.js';
import { makeCrownGeometry, makePalmGeometry, addSway } from '../world/plants.js';
import { rng, clamp, lerp, fract } from '../core/math.js';

export class TownSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    const r = rng(1883);
    // street + ground
    // lit ground: use a standard material instead so the lamps/sun affect it
    const gtex = this.cobbleTexture();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.75, metalness: 0.0, color: 0xffffff }));
    gtex.repeat.set(1000, 1000);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    sc.add(ground);
    this.ground = ground;
    const bm = brickMat();
    const winMat = windowMat(0);
    const winMatM = windowMat(1);
    this.winMat = winMat; this.winMatM = winMatM;
    // Victorian street
    this.victorian = new THREE.Group();
    for (const side of [-1, 1]) {
      let z = -320;
      while (z < 320) {
        const b = brickGeometry(Math.floor(z * 7 + side * 3 + 1000));
        const mesh = new THREE.Mesh(b.geo, bm);
        mesh.position.set(side * (9 + b.d / 2), 0, z + b.w / 2);
        mesh.rotation.y = Math.PI / 2 * side;
        mesh.castShadow = mesh.receiveShadow = true;
        this.victorian.add(mesh);
        const w = new THREE.Mesh(windowsGeometry(b, Math.floor(z + side * 99), 0.55), winMat);
        w.position.copy(mesh.position); w.rotation.copy(mesh.rotation);
        this.victorian.add(w);
        z += b.w + 0.4;
      }
    }
    // factories + stacks in the background
    this.stacks = [];
    for (let i = 0; i < 14; i++) {
      const x = (r() - 0.5) * 700, z = -380 - r() * 500;
      const hall = brickGeometry(500 + i, { w: 40 + r() * 40, d: 25 + r() * 20, floors: 3 + Math.floor(r() * 3) });
      const hm = new THREE.Mesh(hall.geo, bm); hm.position.set(x, 0, z); hm.castShadow = true; this.victorian.add(hm);
      const hw = new THREE.Mesh(windowsGeometry(hall, 600 + i, 0.75), winMat); hw.position.copy(hm.position); this.victorian.add(hw);
      const h = 40 + r() * 35;
      const st = new THREE.Mesh(stackGeometry(h, 2.2 + r() * 1.2), bm);
      st.position.set(x + hall.w * 0.35, 0, z + 4); st.castShadow = true;
      this.victorian.add(st);
      this.stacks.push([x + hall.w * 0.35, h, z + 4]);
    }
    // distant skyline
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI - Math.PI, d = 700 + r() * 1400;
      const b = brickGeometry(2000 + i, { floors: 2 + Math.floor(r() * 5) });
      const m = new THREE.Mesh(b.geo, bm);
      m.position.set(Math.sin(a) * d, 0, Math.cos(a) * d - 200);
      m.rotation.y = r() * 3;
      this.victorian.add(m);
      if (r() < 0.6) { const w = new THREE.Mesh(windowsGeometry(b, 3000 + i, 0.4), winMat); w.position.copy(m.position); w.rotation.copy(m.rotation); this.victorian.add(w); }
    }
    sc.add(this.victorian);
    // lamps
    this.lamps = new THREE.Group();
    this.lampLights = [];
    for (let i = 0; i < 16; i++) {
      for (const side of [-1, 1]) {
        const l = streetLamp();
        l.position.set(side * 7.6, 0, -280 + i * 36);
        this.lamps.add(l);
      }
    }
    for (let i = 0; i < 6; i++) { const pl = new THREE.PointLight(0xffb060, 0, 30, 1.6); pl.position.set((i % 2 ? 1 : -1) * 7.2, 3.9, -10 + Math.floor(i / 2) * 36 - 36); this.lamps.add(pl); this.lampLights.push(pl); }
    sc.add(this.lamps);
    // Batavia: colonial white houses, palms, canal
    this.batavia = new THREE.Group();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 18; i++) {
        const m = new THREE.Mesh(colonialGeometry(i * 3 + (side > 0 ? 1 : 2)), buildingMat());
        m.position.set(side * 20, 0, -300 + i * 34);
        m.rotation.y = -side * Math.PI / 2;
        m.castShadow = m.receiveShadow = true;
        this.batavia.add(m);
      }
    }
    this.plantU = { uTime: this.uTime, uWind: this.uWind, uAsh: { value: 0 } };
    const palmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
    addSway(palmMat, this.plantU, 0.5);
    const palms = new THREE.InstancedMesh(makePalmGeometry(), palmMat, 40);
    const M4 = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) { M4.compose(new THREE.Vector3((i % 2 ? 1 : -1) * 10.5, 0, -300 + i * 16), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(0.9, 0.9, 0.9)); palms.setMatrixAt(i, M4); }
    palms.castShadow = true;
    this.batavia.add(palms);
    sc.add(this.batavia);
    // Modern skyline
    this.modern = new THREE.Group();
    for (let i = 0; i < 90; i++) {
      const b = towerGeometry(i + 1);
      const m = new THREE.Mesh(b.geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.6 }));
      const gx = (i % 10) - 4.5, gz = Math.floor(i / 10);
      m.position.set(gx * 70 + (r() - 0.5) * 20, 0, -150 - gz * 70 + (r() - 0.5) * 20);
      this.modern.add(m);
      const wg = towerWindows(b, i, 0.45);
      if (wg) { const w = new THREE.Mesh(wg, winMatM); w.position.copy(m.position); this.modern.add(w); }
    }
    sc.add(this.modern);
    // fire wagon (steam pumper)
    this.wagon = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0x9a1a12, roughness: 0.45, metalness: 0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89b45, roughness: 0.3, metalness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 4.2), red); body.position.y = 1.2; this.wagon.add(body);
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 20), brass); boiler.position.set(0, 2.2, -1.1); this.wagon.add(boiler);
    for (const [x, z, rr] of [[-1, 1.4, 0.7], [1, 1.4, 0.7], [-1, -1.4, 0.9], [1, -1.4, 0.9]]) { const w = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.07, 8, 20), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); w.position.set(x, rr, z); w.rotation.y = Math.PI / 2; this.wagon.add(w); }
    this.wagon.traverse((o) => (o.castShadow = true));
    sc.add(this.wagon);
    // smoke
    this.puffs = new PuffCloud(3200);
    this.stackSmoke = this.stacks.map((s, i) => ({ on: true, c: s, h: 260, spread: 10, size: 14, life: 30, alpha: 0.6, col: [0.16, 0.15, 0.14], n: 110, seed: 50 + i, wind: [0.6, 0.15] }));
    for (const s of this.stackSmoke) this.puffs.emitters.push(plumeletEmitter(s));
    sc.add(this.puffs.mesh);
    this.flakes = new StreakCloud(3000, { additive: false });
    this.flakes.emitters.push(this.ashEmitter());
    sc.add(this.flakes.mesh);
    this.people = [];
  }

  cobbleTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#2a2622'; g.fillRect(0, 0, 256, 256);
    const r = rng(2);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) {
      const ox = (y % 2) * 21;
      const v = 60 + r() * 50;
      g.fillStyle = `rgb(${v},${v * 0.95},${v * 0.88})`;
      g.beginPath(); g.roundRect(x * 43 + ox - 18, y * 32 + 2, 39, 28, 8); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }

  ashEmitter() {
    const N = 2500, r = rng(808);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        const k = this.ashK ?? 0;
        if (k <= 0 || !this.camPos) return;
        const c = this.camPos, S = 50;
        for (let i = 0; i < N * k; i++) {
          const [a, b, cc, d] = seeds[i];
          const x = c.x + (fract(a - c.x / S) - 0.5) * S, z = c.z + (fract(b - c.z / S) - 0.5) * S;
          const y = c.y + (fract(cc - (t * 2.5) / S - c.y / S) - 0.5) * S * 0.7;
          const g = this.snow ? 0.95 : 0.25 + d * 0.15;
          push(x, y, z, x - 0.2, y + (this.snow ? 0.12 : 0.35), z, this.snow ? 0.06 : 0.035, g, g, g * 0.97, 0.85);
        }
      },
    };
  }

  nearFar() { return [0.3, 30000]; }
  fx() { const m = this.moodState || {}; return { exposure: m.exposure ?? 1, grade: 'warm', bloom: 0.8 }; }

  prepare(shot) {
    const p = shot.p || {};
    const style = p.style ?? 'victorian';
    this.victorian.visible = style === 'victorian' || style === 'ny';
    this.batavia.visible = style === 'batavia';
    this.modern.visible = style === 'modern';
    this.lamps.visible = style !== 'modern' && style !== 'batavia';
    this.wagon.visible = !!p.wagon;
    for (const s of this.stackSmoke) s.on = style === 'victorian' && p.smoke !== false;
    this.mood(p.mood ?? 'dusk', p.moodOv ?? {}, p.mood2 ?? null, 0);
    this.env(0.8);
    for (const f of this.people) f.visible = false;
    for (const pd of p.people || []) {
      let f = this.people.find((x) => !x.visible && x.userData.style === pd.style && x.userData.propKind === (pd.prop || null));
      if (!f) { f = makeFigure(pd.style, 500 + this.people.length * 11); if (pd.prop) addProp(f, pd.prop); f.userData.propKind = pd.prop || null; this.people.push(f); this.scene.add(f); }
      f.visible = true; f.userData.def = pd;
    }
    this.active = this.people.filter((f) => f.visible);
  }

  update(shot, lt, vt, fx) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.uTime.value = vt;
    this.sky.uniforms.uSkyTime.value = vt;
    this.mood(p.mood ?? 'dusk', p.moodOv ?? {}, p.mood2 ?? null, val(p.moodK, u, lt, 0));
    fx.exposure = (fx.exposure ?? 1) * (p.exposure ?? 1);
    for (const l of this.lampLights) l.intensity = p.lampsOn === false ? 0 : (p.lampI ?? 25);
    this.winMat.color.setScalar(p.windows ?? 1);
    this.winMatM.color.setScalar(p.windows ?? 1);
    this.ashK = val(p.ashfall, u, lt, 0);
    this.snow = !!p.snow;
    if (this.snow) this.ashK = val(p.snow, u, lt, 0);
    if (p.wagon) { const w = p.wagon; this.wagon.position.set(w[0], 0, w[1] - (w[2] ?? 0) * lt); this.wagon.rotation.y = w[3] ?? 0; }
    const PU = this.puffs.uniforms;
    const s = this.moodState;
    PU.uSunDir.value.copy(this.sky.uniforms.uSunDir.value);
    PU.uSunCol.value.set(...s.light).multiplyScalar(s.lightI * 0.5);
    PU.uAmb.value.set(...s.hemiSky).multiplyScalar(s.hemiI * 0.5).add(new THREE.Vector3(...s.horizon).multiplyScalar(0.25));
    PU.uFogDensity.value = this.scene.fog.density * 0.5;
    PU.uFogColor.value.set(...s.horizon);
    for (const f of this.active) {
      const d = f.userData.def;
      let x = d.at[0], z = d.at[1];
      if (d.move) { x += d.move[0] * lt; z += d.move[1] * lt; }
      f.position.set(x, 0, z);
      f.rotation.set(0, ((d.rot ?? 0) * Math.PI) / 180, 0);
      poseFigure(f, vt, typeof d.pose === 'function' ? d.pose(u, lt) : d.pose || {});
    }
  }

  afterCamera(shot, lt, vt, cam) {
    this.camPos = cam.position;
    this.puffs.update(vt, cam.position);
    this.flakes.update(vt);
    const look = this.engine.camState.look;
    const dist = cam.position.distanceTo(look);
    this.fitShadow([look.x, 0, look.z], clamp(dist * 0.8, 20, 600), 3);
  }
}
