import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { Ocean } from '../world/ocean.js';
import { Island, PEAKS, makeCoastStrip, islandHeight } from '../world/island.js';
import { makeCrownGeometry, makePalmGeometry, addSway } from '../world/plants.js';
import { PuffCloud, StreakCloud } from '../world/particles.js';
import { makeEruption, columnEmitter, veilEmitter, surgeEmitter, plumeletEmitter, bombEmitter, lightningEmitter, burstEmitter, shockSprayEmitter, Shockwave } from '../world/eruption.js';
import { makeBarque, makeSteamer, makeContainerShip, makeLongboat, setShipAsh } from '../world/ships.js';
import { makeFigure, poseFigure, addProp } from '../world/figures.js';
import { clamp, lerp, rng, fract, smoothstep, ease } from '../core/math.js';
import { evalCamera, makeCamState } from '../core/camera.js';
import { Birds } from '../world/birds.js';

const CRATERS = {
  perboewatan: [PEAKS.perboewatan[0], 70, PEAKS.perboewatan[1]],
  danan: [PEAKS.danan[0], 400, PEAKS.danan[1]],
  rakata: [PEAKS.rakata[0], 780, PEAKS.rakata[1]],
  centre: [-100, 60, -600],
  anak: [PEAKS.anak[0], 0, PEAKS.anak[1]],
};

export class StraitSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.ocean = new Ocean(this.sky, { extent: 70000, segments: 448 });
    globalThis.__strait = this;
    sc.add(this.ocean.mesh);
    this.island = new Island();
    sc.add(this.island.mesh);
    this.ocean.uniforms.uShoreTex.value = this.island.shoreTex;
    this.ocean.uniforms.uShoreRect.value.copy(this.island.shoreRect);
    this.ocean.uniforms.uShore.value = 1;
    // vegetation
    this.plantU = { uTime: this.uTime, uWind: this.uWind, uAsh: { value: 0 } };
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    addSway(treeMat, this.plantU, 0.25);
    const palmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
    addSway(palmMat, this.plantU, 0.6);
    const [tm, pm] = this.island.buildVegetation(makeCrownGeometry(0), makePalmGeometry(), treeMat, palmMat);
    sc.add(tm, pm);
    // distant coasts: Sumatra (north) and Java (east)
    const sumatra = makeCoastStrip(140000, 22000, 1500, 31, [0.07, 0.16, 0.06]);
    sumatra.position.set(-10000, 0, -44000);
    const java = makeCoastStrip(140000, 22000, 1300, 47, [0.07, 0.15, 0.06]);
    java.rotation.y = Math.PI / 2; java.position.set(46000, 0, 15000);
    sc.add(sumatra, java);
    this.coasts = [sumatra, java];
    // neighbouring islets (Verlaten, Lang)
    this.islets = [];
    for (const [x, z, h, R] of [[-5200, -2200, 180, 1500], [4200, -3800, 130, 1300], [1800, 5600, 40, 500]]) {
      const g = new THREE.ConeGeometry(R, h * 2, 32, 6);
      g.translate(0, -h * 0.25, 0);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, Math.min(pos.getY(i), h) + Math.sin(pos.getX(i) * 0.01) * 6);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1d4415, roughness: 0.95 }));
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      sc.add(m);
      this.islets.push(m);
    }
    // particles
    this.puffs = new PuffCloud(7000);
    this.sparks = new StreakCloud(7000, { additive: true });
    this.flakes = new StreakCloud(5000, { additive: false });
    sc.add(this.puffs.mesh, this.sparks.mesh, this.flakes.mesh);
    this.E = makeEruption();
    this.V = { on: false, amount: 0, c: [0, 0, 0], r0: 3000, r1: 30000, y0: 2000, y1: 16000, dark: 0.08, size: 9000, alpha: 0.7, glow: 0 };
    this.crSteam = { on: false, c: [...CRATERS.perboewatan], h: 900, spread: 160, size: 110, life: 26, alpha: 0.55, col: [0.8, 0.79, 0.77], n: 140, seed: 5, wind: [0.5, 0.15] };
    this.funnel = { on: false, c: [0, 0, 0], h: 120, spread: 6, size: 9, life: 9, alpha: 0.55, col: [0.08, 0.075, 0.07], n: 90, seed: 9, wind: [-0.9, 0.2] };
    this.surfSteam = { on: false, c: [0, 0, 0], h: 300, spread: 400, size: 120, life: 14, alpha: 0.5, col: [0.92, 0.92, 0.92], n: 160, seed: 21, wind: [0.2, 0.05] };
    this.B = { on: false, c: [0, 0, 0], t0: 0, R: 5000, k: 1 };
    this.SH = { on: false, c: [0, 0, 0], R: 0, k: 0 };
    this.puffs.emitters.push(shockSprayEmitter(this.SH), burstEmitter(this.B), columnEmitter(this.E), veilEmitter(this.E, this.V), surgeEmitter(this.E), plumeletEmitter(this.crSteam), plumeletEmitter(this.funnel), plumeletEmitter(this.surfSteam));
    this.lightning = lightningEmitter(this.E);
    this.sparks.emitters.push(bombEmitter(this.E), this.lightning, this.emberEmitter(), this.rockRainEmitter());
    this.flakes.emitters.push(this.ashfallEmitter(), this.rainEmitter());
    this.shock = new Shockwave();
    sc.add(this.shock.mesh);
    this.glow = new THREE.PointLight(0xff5a1a, 0, 0, 1.2);
    sc.add(this.glow);
    this.fill = { ash: 0, rain: 0, embers: 0, rocks: 0 };
    // ships & people pools
    this.ships = new Map();
    this.people = [];
    this.shipRoot = new THREE.Group();
    sc.add(this.shipRoot);
    // passenger jet with contrail (modern era)
    this.jet = new THREE.Group();
    const jm = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.35, metalness: 0.4 });
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(2.0, 36, 6, 12), jm); fus.rotation.z = Math.PI / 2; this.jet.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 52), jm); wing.position.set(-2, -0.8, 0); this.jet.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 0.5), jm); tail.position.set(-18, 4, 0); this.jet.add(tail);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 16), jm); stab.position.set(-18, 1, 0); this.jet.add(stab);
    for (const z of [-10, 10]) { const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 5, 12), new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.7, roughness: 0.3 })); eng.rotation.z = Math.PI / 2; eng.position.set(0, -2, z); this.jet.add(eng); }
    this.jet.visible = false;
    sc.add(this.jet);
    this.trail = new StreakCloud(400, { additive: false });
    this.trail.emitters.push({ fill: (t, push) => { if (!this.jet.visible) return; const j = this.jet.position; for (let i = 0; i < 200; i++) { const d = i * 25; for (const z of [-10, 10]) push(j.x - d - 30, j.y - 2 - i * 0.02, j.z + z + Math.sin(i * 0.3) * 0.3 * i * 0.02, j.x - d - 55, j.y - 2 - i * 0.02, j.z + z, 1.2 + i * 0.06, 0.95, 0.96, 1.0, 0.85 * Math.exp(-i / 140)); } } });
    sc.add(this.trail.mesh);
    this.birds = new Birds(70, 0x202020);
    sc.add(this.birds.mesh);
    this.camTmp = makeCamState();
  }

  getShip(id, type, opts = {}) {
    if (this.ships.has(id)) return this.ships.get(id);
    let s;
    if (type === 'barque') s = makeBarque({ seed: id.length * 7 + 1, ...opts });
    else if (type === 'warship') s = makeSteamer({ kind: 'warship', ...opts });
    else if (type === 'excursion') s = makeSteamer({ kind: 'excursion', L: 58, W: 10, ...opts });
    else if (type === 'steamer') s = makeSteamer({ kind: 'merchant', ...opts });
    else if (type === 'container') s = makeContainerShip();
    else if (type === 'longboat') s = makeLongboat();
    s.userData.id = id;
    this.ships.set(id, s);
    this.shipRoot.add(s);
    return s;
  }

  nearFar(shot) {
    return [shot.p?.near ?? 1.0, shot.p?.far ?? 140000];
  }

  fx(shot) {
    const m = this.moodState || {};
    return { exposure: m.exposure ?? 1, grade: 'tropical', bloom: 0.7 };
  }

  prepare(shot) {
    const p = shot.p || {};
    this.applyMood(shot, 0, 0);
    this.env(p.envI ?? 1);
    const I = p.island || {};
    this.island.setState({ destroyed: I.destroyed ?? 0, anak: I.anak ?? 0, craterP: I.craterP ?? 0.6 });
    this.ocean.setSea(p.sea ?? 'normal', p.seaScale ?? 1);
    // centre the ocean grid on the shot's opening camera (stable per shot)
    evalCamera(shot, 0, this.camTmp);
    this.ocean.center(this.camTmp.pos.x, this.camTmp.pos.z);
    this.ocean.uniforms.uWaveFade.value = Math.max(1500, this.camTmp.pos.y * 6);
    // ships visibility
    const want = new Set((p.ships || []).map((s) => s.id));
    for (const [id, s] of this.ships) s.visible = want.has(id);
    for (const sd of p.ships || []) this.getShip(sd.id, sd.type, sd.opts).visible = true;
    // people
    for (const f of this.people) f.visible = false;
    let k = 0;
    for (const pd of p.people || []) {
      let f = this.people.find((x) => !x.visible && x.userData.style === pd.style && x.userData.propKind === (pd.prop || null));
      if (!f) {
        f = makeFigure(pd.style, 100 + this.people.length * 13);
        if (pd.prop) addProp(f, pd.prop);
        f.userData.propKind = pd.prop || null;
        this.people.push(f);
        this.scene.add(f);
      }
      f.visible = true;
      f.userData.def = pd;
      k++;
    }
    this.activePeople = this.people.filter((f) => f.visible);
  }

  applyMood(shot, u, lt) {
    const p = shot.p || {};
    const k = val(p.moodK, u, lt, 0);
    return this.mood(p.mood ?? 'day', p.moodOv ?? {}, p.mood2 ?? null, k);
  }

  update(shot, lt, vt, fx) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.uTime.value = vt;
    this.ocean.uniforms.uTime.value = vt;
    this.sky.uniforms.uSkyTime.value = vt;
    this.island.uniforms.uTime.value = vt;
    const s = this.applyMood(shot, u, lt);
    // the horizon glow always comes from the volcano
    {
      const ec = p.erupt ? (typeof p.erupt.at === 'string' ? CRATERS[p.erupt.at] : p.erupt.at || CRATERS.perboewatan) : CRATERS.centre;
      const dx = ec[0] - this.camTmp.pos.x, dz = ec[2] - this.camTmp.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      this.sky.uniforms.uGlowDir.value.set((dx / l) * 0.998, 0.06, (dz / l) * 0.998).normalize();
    }
    this.ocean.applyMood(s, p.waterFog);
    fx.exposure = (fx.exposure ?? 1) * (p.exposure ?? 1);
    // island state
    const I = p.island || {};
    if (I.destroyedAt !== undefined) this.island.setState({ destroyed: lt >= I.destroyedAt ? 1 : 0, anak: I.anak ?? 0, craterP: I.craterP ?? 0.6 });
    this.island.uniforms.uAsh.value = val(I.ash, u, lt, 0);
    this.island.uniforms.uLava.value = val(I.lava, u, lt, 0);
    {
      // always set (frames must not depend on which shot was rendered before)
      const src = p.erupt?.at ?? p.lavaAt ?? p.steam?.at ?? 'perboewatan';
      const c0 = typeof src === 'string' ? CRATERS[src] : src;
      this.island.uniforms.uLavaCenter.value.set(c0[0], 0, c0[2]);
    }
    this.island.uniforms.uBurn.value = val(I.burn, u, lt, 0);
    this.plantU.uAsh.value = val(I.ash, u, lt, 0) * 0.85;
    this.uWind.value = val(p.wind, u, lt, 1);
    for (const m of this.islets) m.material.color.setRGB(...(I.ash ? [0.26, 0.27, 0.22].map((c, i) => lerp([0.11, 0.27, 0.08][i], c, val(I.ash, u, lt, 0))) : [0.11, 0.27, 0.08]));

    // eruption
    const E = this.E, ep = p.erupt;
    E.on = !!ep;
    if (ep) {
      const c = typeof ep.at === 'string' ? CRATERS[ep.at] : ep.at || CRATERS.perboewatan;
      E.c = c;
      E.height = val(ep.height, u, lt, 11000);
      E.intensity = val(ep.intensity, u, lt, 1);
      E.baseW = ep.baseW ?? E.height * 0.03;
      E.topW = ep.topW ?? E.height * 0.2;
      E.umbrella = val(ep.umbrella, u, lt, 0);
      E.umbrellaR = ep.umbrellaR ?? E.height * 0.8;
      E.rise = ep.rise ?? Math.max(60, E.height / 90);
      E.t0 = ep.t0 !== undefined ? shot.t + ep.t0 : -1e6;
      E.dark = ep.dark ?? 0.15;
      E.glow = val(ep.glow, u, lt, 0.8);
      E.wind = ep.wind ?? [0.18, 0.05];
      E.size = ep.size ?? 1;
      E.bombs = val(ep.bombs, u, lt, 0);
      E.bombSpeed = ep.bombSpeed ?? 240;
      E.lightning = val(ep.lightning, u, lt, 0);
      E.surge = val(ep.surge, u, lt, 0);
      E.surgeT0 = shot.t + (ep.surgeT0 ?? 0);
      E.surgeSpeed = ep.surgeSpeed ?? 110;
      E.count = ep.count ?? 1600;
      E.tint = ep.tint ?? [1, 0.95, 0.88];
    } else {
      const src = p.lavaAt ?? p.steam?.at ?? 'perboewatan';
      E.c = typeof src === 'string' ? CRATERS[src] : src;
    }
    // explosive burst dome
    const bp = p.burst;
    this.B.on = !!bp;
    if (bp) Object.assign(this.B, { c: bp.c ?? [E.c[0], 0, E.c[2]], t0: shot.t + (bp.t0 ?? 0), R: bp.R ?? 6000, k: bp.k ?? 1, speed: bp.speed ?? 0.9, heat: bp.heat ?? 1.5, flat: bp.flat ?? 0.75 });
    // veil
    const vp = p.veil;
    this.V.on = !!vp;
    if (vp) Object.assign(this.V, { amount: val(vp.amount, u, lt, 1), c: E.c, r0: vp.r0 ?? 4000, r1: vp.r1 ?? 40000, y0: vp.y0 ?? 3000, y1: vp.y1 ?? 18000, dark: vp.dark ?? 0.05, size: vp.size ?? 12000, alpha: vp.alpha ?? 0.75, glow: vp.glow ?? 0 });
    // crater steam
    const cs = p.steam;
    this.crSteam.on = !!cs;
    if (cs) Object.assign(this.crSteam, { c: typeof cs.at === 'string' ? CRATERS[cs.at] : cs.at || CRATERS.perboewatan, amount: val(cs.amount, u, lt, 1), col: cs.col ?? [0.8, 0.79, 0.77], h: cs.h ?? 900, size: cs.size ?? 110, alpha: cs.alpha ?? 0.55 });
    const ss = p.surfSteam;
    this.surfSteam.on = !!ss;
    if (ss) Object.assign(this.surfSteam, { c: ss.at, amount: val(ss.amount, u, lt, 1), h: ss.h ?? 300, spread: ss.spread ?? 400, size: ss.size ?? 120, col: ss.col ?? [0.9, 0.9, 0.9] });

    // glow light near crater
    const gl = val(p.glowLight, u, lt, 0);
    this.glow.intensity = gl * 1.6e6;
    this.glow.position.set(E.c[0], E.c[1] + 300, E.c[2]);
    this.ocean.uniforms.uGlowPos.value.set(E.c[0], E.c[1], E.c[2]);
    this.ocean.uniforms.uGlowLight.value.set(1.0, 0.25, 0.06).multiplyScalar(gl * 0.45);
    // particles lighting
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.copy(this.sky.uniforms.uSunDir.value);
    PU.uSunCol.value.set(...s.light).multiplyScalar(s.lightI * (p.puffSun ?? 0.55));
    PU.uAmb.value.set(...s.hemiSky).multiplyScalar(s.hemiI * 0.55).add(new THREE.Vector3(...s.horizon).multiplyScalar(0.25));
    PU.uGlowCol.value.set(2.4, 0.62, 0.14).multiplyScalar(p.puffGlow ?? 1);
    PU.uFogDensity.value = this.scene.fog.density * 0.6;
    PU.uFogColor.value.set(...s.horizon);
    this.sparks.uniforms.uFogDensity.value = this.scene.fog.density * 0.3;

    // weather
    this.fill.ash = val(p.ashfall, u, lt, 0);
    this.fill.rain = val(p.rain, u, lt, 0);
    this.fill.embers = val(p.embers, u, lt, 0);
    this.fill.rocks = val(p.rockRain, u, lt, 0);
    this.ocean.uniforms.uPumice.value = val(p.pumice, u, lt, 0);
    this.ocean.uniforms.uPumiceRect.value.set(p.pumiceC?.[0] ?? 0, p.pumiceC?.[1] ?? 0, p.pumiceR ?? 30000, 0);
    const boil = p.boil;
    if (boil) this.ocean.uniforms.uBoil.value.set(boil.c[0], boil.c[1], boil.r, val(boil.k, u, lt, 1)); else this.ocean.uniforms.uBoil.value.set(0, 0, 1, 0);
    this.ocean.uniforms.uTint.value.set(...(p.waterTint ?? [1, 1, 1]));
    this.ocean.uniforms.uFoam.value = p.foam ?? 0.35;

    // ring waves (shock / tsunami)
    const rg = p.ring;
    if (rg) {
      const dt = lt - (rg.t0 ?? 0);
      const R = Math.max(0, dt) * (rg.speed ?? 300);
      const H = dt < 0 ? 0 : val(rg.h, u, lt, 4) * Math.exp(-R / (rg.decay ?? 30000));
      this.ocean.uniforms.uRing.value.set(rg.c?.[0] ?? E.c[0], rg.c?.[1] ?? E.c[2], R, H);
      this.ocean.uniforms.uRingW.value = rg.w ?? 80;
    } else this.ocean.uniforms.uRing.value.set(0, 0, 0, 0);
    const sh = p.shock;
    if (sh) {
      const dt = lt - (sh.t0 ?? 0);
      const R = Math.max(0, dt) * (sh.speed ?? 900);
      const k = dt < 0 ? 0 : (sh.k ?? 1.2) * Math.exp(-dt * (sh.decay ?? 0.45)) * clamp(dt / 0.08);
      const c = sh.c ?? [E.c[0], 0, E.c[2]];
      this._shock = [c, R, k]; // applied in afterCamera with the real camera position
      Object.assign(this.SH, { on: !!sh.spray && dt > 0, c, R, k: clamp(val(sh.spray, u, lt, 0) * Math.min(k, 1)) });
    } else { this._shock = null; this.SH.on = false; }

    setShipAsh(val(p.shipAsh, u, lt, 0));
    // ships
    for (const sd of p.ships || []) {
      const ship = this.ships.get(sd.id);
      const h = ((sd.heading ?? 0) * Math.PI) / 180;
      const sp = sd.speed ?? 0;
      const x = sd.pos[0] + Math.cos(h) * sp * lt;
      const z = sd.pos[1] - Math.sin(h) * sp * lt;
      const w = this.ocean.heightAt(x, z, vt);
      const roll = (sd.roll ?? 1);
      ship.position.set(x, w.y * 0.8 - (sd.sink ?? 0), z);
      ship.rotation.set(0, h, 0);
      // align to wave normal (pitch/roll), damped
      const nl = w.n.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -h);
      ship.rotateX(-nl.z * 0.6 * roll + Math.sin(vt * 0.7 + x) * 0.01 * roll);
      ship.rotateZ(nl.x * 0.4 * roll);
      if (sd.extraRoll) ship.rotateX(Math.sin(vt * 1.4) * sd.extraRoll);
      if (ship.userData.flag) ship.userData.flag.rotation.x = Math.sin(vt * 4 + x) * 0.15;
      if (ship.userData.funnel && sd.smoke !== false && (sd.type === 'warship' || sd.type === 'excursion' || sd.type === 'steamer')) {
        const f = ship.userData.funnel;
        const wp = new THREE.Vector3(...f).applyMatrix4(ship.matrixWorld.compose(ship.position, ship.quaternion, ship.scale));
        this.funnel.on = true;
        this.funnel.c = [wp.x, wp.y, wp.z];
      }
      ship.userData.lt = lt;
    }
    if (!(p.ships || []).some((s) => ['warship', 'excursion', 'steamer'].includes(s.type))) this.funnel.on = false;
    this.shipRoot.updateMatrixWorld(true);
    // people on ships / at positions
    const jt = p.jet;
    this.jet.visible = !!jt;
    if (jt) { this.jet.position.set(jt.pos[0] + (jt.speed ?? 230) * lt, jt.pos[1], jt.pos[2]); }
    // birds: p.birds = { c:[x,y,z], r, h, speed, spread, scale }
    const bd = p.birds;
    this.birds.mesh.visible = !!bd;
    if (bd) {
      const path = (t) => { const a = t * (bd.speed ?? 0.12) + (bd.ph ?? 0); return { pos: [bd.c[0] + Math.cos(a) * bd.r, bd.c[1] + Math.sin(a * 2.3) * (bd.h ?? 6), bd.c[2] + Math.sin(a) * bd.r], dir: [-Math.sin(a), 0.05, Math.cos(a)] }; };
      this.birds.update(vt, path, bd.spread ?? 30, bd.scale ?? 1.4);
    }
    for (const f of this.activePeople) {
      const d = f.userData.def;
      if (d.ship) {
        const ship = this.ships.get(d.ship);
        const dy = ship.userData.deckY ? ship.userData.deckY(clamp((d.at[0]) / (ship.userData.L / 2), -1, 1)) : 0;
        const lp = new THREE.Vector3(d.at[0], dy - 0.05, d.at[1]);
        f.position.copy(lp.applyMatrix4(ship.matrixWorld));
        f.quaternion.copy(ship.quaternion);
        f.rotateY(((d.rot ?? 0) * Math.PI) / 180);
      } else {
        f.position.set(d.at[0], d.at[2] ?? 0, d.at[1]);
        f.rotation.set(0, ((d.rot ?? 0) * Math.PI) / 180, 0);
      }
      f.scale.setScalar(d.scale ?? 1);
      poseFigure(f, vt, typeof d.pose === 'function' ? d.pose(u, lt) : d.pose || {});
    }
  }

  afterCamera(shot, lt, vt, cam, fx) {
    const p = shot.p || {};
    this.camPos = cam.position;
    if (this._shock) this.shock.set(this._shock[0], this._shock[1], this._shock[2], undefined, cam.position);
    if (this.SH.on) this.SH.dCam = Math.hypot(cam.position.x - this.SH.c[0], cam.position.z - this.SH.c[2]);
    else this.shock.set([0, 0, 0], 0, 0);
    this.puffs.update(vt, cam.position);
    this.sparks.update(vt);
    this.flakes.update(vt);
    this.trail.update(vt);
    // lightning flash lights the scene
    const fl = this.E.flash;
    const PU = this.puffs.uniforms;
    if (fl) {
      PU.uFlash.value.set(fl.pos[0], fl.pos[1], fl.pos[2], fl.k * 3.0);
      this.ocean.uniforms.uFlash.value = fl.k * 0.35;
      fx.exposure *= 1 + fl.k * 0.12;
    } else {
      PU.uFlash.value.w = 0;
      this.ocean.uniforms.uFlash.value = 0;
    }
    // shadows around what the camera looks at
    const look = this.engine.camState.look;
    const dist = cam.position.distanceTo(look);
    const rad = clamp(dist * 0.9, 30, 4000);
    this.fitShadow([look.x, Math.max(look.y, 0), look.z], p.shadowR ?? rad, 3);
  }

  // --- camera-local weather emitters ---------------------------------------
  ashfallEmitter() {
    const N = 3000, r = rng(808);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        const k = this.fill.ash;
        if (k <= 0 || !this.camPos) return;
        const c = this.camPos, S = 60;
        const n = Math.floor(N * k);
        for (let i = 0; i < n; i++) {
          const [a, b, cc, d] = seeds[i];
          const fall = 2.5 + d * 2;
          const x = c.x + (fract(a - c.x / S) - 0.5) * S + Math.sin(t * 0.8 + i) * 0.4;
          const z = c.z + (fract(b - c.z / S) - 0.5) * S;
          const y = c.y + (fract(cc - (t * fall) / S - c.y / S) - 0.5) * S * 0.7;
          const g = 0.25 + d * 0.15;
          push(x, y, z, x - 0.2, y + 0.35, z, 0.035 + d * 0.03, g, g * 0.97, g * 0.93, 0.8);
        }
      },
    };
  }
  rainEmitter() {
    const N = 4000, r = rng(707);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        const k = this.fill.rain;
        if (k <= 0 || !this.camPos) return;
        const c = this.camPos, S = 40;
        for (let i = 0; i < N * k; i++) {
          const [a, b, cc, d] = seeds[i];
          const x = c.x + (fract(a - c.x / S) - 0.5) * S;
          const z = c.z + (fract(b - c.z / S) - 0.5) * S;
          const y = c.y + (fract(cc - (t * 14) / S - c.y / S) - 0.5) * S * 0.6;
          push(x, y, z, x - 0.15, y + 0.9, z, 0.012, 0.6, 0.62, 0.65, 0.35);
        }
      },
    };
  }
  emberEmitter() {
    const N = 900, r = rng(606);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        const k = this.fill.embers;
        if (k <= 0 || !this.camPos) return;
        const c = this.camPos, S = 50;
        for (let i = 0; i < N * k; i++) {
          const [a, b, cc, d] = seeds[i];
          const x = c.x + (fract(a - c.x / S + t * 0.01) - 0.5) * S + Math.sin(t * 2 + i) * 0.6;
          const z = c.z + (fract(b - c.z / S) - 0.5) * S;
          const y = c.y + (fract(cc + t * (0.03 + d * 0.04) - c.y / S) - 0.5) * S * 0.6;
          const f = 0.5 + 0.5 * Math.sin(t * 9 + i * 3);
          push(x, y, z, x - 0.05, y - 0.15, z, 0.05 + d * 0.05, 6 * f, 1.6 * f, 0.3 * f, 1);
        }
      },
    };
  }
  // Red-hot pumice and rocks raining down near the camera (Charles Bal deck)
  rockRainEmitter() {
    const N = 260, r = rng(505);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        const k = this.fill.rocks;
        if (k <= 0 || !this.camPos) return;
        const c = this.camPos, S = 90;
        for (let i = 0; i < N * k; i++) {
          const [a, b, cc, d, e] = seeds[i];
          const period = 2.0 + d * 2.0;
          const ph = fract(t / period + cc);
          const x = c.x + (a - 0.5) * S + 25;
          const z = c.z + (b - 0.5) * S - 10;
          const y = c.y + 60 - ph * 80;
          const cool = 0.6 + 0.4 * e;
          const w = 0.12 + e * 0.35;
          push(x, y, z, x - 1.2, y + 5, z + 0.5, w, 7 * cool, 2.2 * cool, 0.45 * cool, clamp(ph / 0.1));
        }
      },
    };
  }
}

export { CRATERS };
