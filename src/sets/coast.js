import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { Ocean } from '../world/ocean.js';
import { NOISE } from '../world/glsl.js';
import { makeCrownGeometry, makePalmGeometry, addSway } from '../world/plants.js';
import { hutGeometry, colonialGeometry, lighthouseGroup, prauGeometry, buildingMat, brickMat, windowMat, brickGeometry, windowsGeometry } from '../world/buildings.js';
import { makeSteamer, makeBarque, makeLongboat } from '../world/ships.js';
import { makeFigure, poseFigure, addProp } from '../world/figures.js';
import { PuffCloud, StreakCloud } from '../world/particles.js';
import { makeEruption, columnEmitter, lightningEmitter, bombEmitter } from '../world/eruption.js';
import { makeNoise, rng, clamp, smoothstep, lerp, ease, fract } from '../core/math.js';
import { evalCamera, makeCamState } from '../core/camera.js';

const nz = makeNoise(4242);
// Coast: sea towards +Z, land towards -Z. Beach line around z = 0.
export function coastHeight(x, z) {
  const bend = Math.sin(x * 0.004) * 25 + nz.n2(x * 0.002, 3.3) * 30;
  const zz = z - bend;
  let h;
  if (zz > 30) h = -2.5 - (zz - 30) * 0.06;            // sea floor
  else if (zz > -25) h = lerp(-2.5, 2.2, (30 - zz) / 55); // beach
  else h = 2.2 + (-25 - zz) * 0.035 + smoothstep(-80, -500, zz) * (nz.fbm2(x * 0.003, zz * 0.003, 4) * 0.5 + 0.5) * 60 + smoothstep(-500, -1400, zz) * 120 * (nz.fbm2(x * 0.0012, zz * 0.0012, 3) * 0.5 + 0.6);
  h += nz.n2(x * 0.03, z * 0.03) * 0.25;
  return h;
}

export class CoastSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.ocean = new Ocean(this.sky, { extent: 40000, segments: 400 });
    sc.add(this.ocean.mesh);
    // terrain
    const S = 3000, N = 300;
    const g = new THREE.PlaneGeometry(S, S, N, N);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -S / 2 + 400);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) pos.setY(i, coastHeight(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    this.terrainGeo = g;
    this.colorTerrain(false);
    this.terrainU = { uTime: this.uTime, uWet: { value: 0 }, uWetZ: { value: 1e5 } };
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    tm.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.terrainU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uWet; uniform float uWetZ;\n' + NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= 0.78 + 0.4 * fbm2(vWp.xz * 0.08) + 0.12 * vnoise(vWp.xz * 1.3);
          float wet = uWet * step(uWetZ, vWp.z + 0.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.5, 0.45), wet);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.25, uWet * step(uWetZ, vWp.z));');
    };
    this.terrain = new THREE.Mesh(g, tm);
    this.terrain.receiveShadow = true;
    sc.add(this.terrain);
    // vegetation
    this.plantU = { uTime: this.uTime, uWind: this.uWind, uAsh: { value: 0 } };
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    addSway(treeMat, this.plantU, 0.3);
    const palmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
    addSway(palmMat, this.plantU, 0.7);
    const r = rng(17);
    const palms = [], trees = [];
    for (let i = 0; i < 9000 && (palms.length < 520 || trees.length < 4200); i++) {
      const x = (r() - 0.5) * 2600, z = -10 - Math.pow(r(), 1.3) * 1400;
      const h = coastHeight(x, z);
      if (h < 1.8) continue;
      if (z > -140 && palms.length < 520) palms.push([x, h, z]);
      else if (z < -90 && trees.length < 4200) trees.push([x, h, z]);
    }
    this.palmData = palms;
    this.palms = new THREE.InstancedMesh(makePalmGeometry(), palmMat, palms.length);
    this.trees = new THREE.InstancedMesh(makeCrownGeometry(), treeMat, trees.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    this.palmBase = [];
    palms.forEach(([x, h, z], i) => {
      const sc2 = 0.8 + r() * 0.6, ry = r() * Math.PI * 2, tx = (r() - 0.5) * 0.3, tz = (r() - 0.5) * 0.3;
      this.palmBase.push({ x, h, z, sc: sc2, ry, tx, tz, seed: r() });
      q.setFromEuler(new THREE.Euler(tx, ry, tz)); m.compose(p.set(x, h - 0.3, z), q, s.set(sc2, sc2, sc2));
      this.palms.setMatrixAt(i, m);
    });
    trees.forEach(([x, h, z], i) => {
      const sc2 = 10 + r() * 12;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); m.compose(p.set(x, h - 1.5, z), q, s.set(sc2, sc2 * (0.8 + r() * 0.5), sc2));
      this.trees.setMatrixAt(i, m);
      c.setRGB(0.06 + r() * 0.12, 0.26 + r() * 0.18, 0.04 + r() * 0.05); this.trees.setColorAt(i, c);
    });
    this.palms.castShadow = this.trees.castShadow = true;
    this.palms.receiveShadow = this.trees.receiveShadow = true;
    sc.add(this.palms, this.trees);
    // village huts
    this.huts = [];
    const bm = buildingMat();
    for (let i = 0; i < 26; i++) {
      const x = -260 + (i % 13) * 40 + (r() - 0.5) * 14, z = -40 - Math.floor(i / 13) * 30 - r() * 12;
      const mesh = new THREE.Mesh(hutGeometry(i + 3), bm);
      const y = coastHeight(x, z);
      mesh.position.set(x, y, z);
      mesh.rotation.y = (r() - 0.5) * 0.4;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { x, y, z, ry: mesh.rotation.y, seed: r() };
      sc.add(mesh);
      this.huts.push(mesh);
    }
    this.praus = [];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(prauGeometry(i), bm);
      const x = -200 + i * 55 + (r() - 0.5) * 20, z = 8 + r() * 10;
      mesh.position.set(x, coastHeight(x, z) + 0.3, z);
      mesh.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.5;
      mesh.castShadow = true;
      mesh.userData = { x, z, y: mesh.position.y, ry: mesh.rotation.y, seed: r() };
      sc.add(mesh);
      this.praus.push(mesh);
    }
    // Anjer: colonial houses + lighthouse + pier
    this.anjer = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(colonialGeometry(i + 9), bm);
      const x = 120 + (i % 6) * 34 + (r() - 0.5) * 6, z = -60 - Math.floor(i / 6) * 34;
      mesh.position.set(x, coastHeight(x, z), z);
      mesh.rotation.y = (r() - 0.5) * 0.1;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { x, y: mesh.position.y, z, ry: mesh.rotation.y, seed: r() };
      this.anjer.add(mesh);
    }
    this.lighthouse = lighthouseGroup();
    this.lhBase = [60, coastHeight(60, -8), -8];
    this.lighthouse.position.set(...this.lhBase);
    this.anjer.add(this.lighthouse);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 140), new THREE.MeshStandardMaterial({ color: 0x5a412b, roughness: 0.8 }));
    pier.position.set(180, 1.2, 60);
    this.anjer.add(pier);
    for (let i = 0; i < 14; i++) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); pl.position.set(180 + (i % 2 ? 2.6 : -2.6), -1.5, 0 + i * 10); this.anjer.add(pl); }
    sc.add(this.anjer);
    // resort (2018): hotel blocks with lit windows
    this.resort = new THREE.Group();
    const winMat = windowMat(1);
    for (let i = 0; i < 6; i++) {
      const b = brickGeometry(i + 40, { w: 24, d: 14, floors: 3 + (i % 3), color: [0.85, 0.83, 0.78] });
      const mesh = new THREE.Mesh(b.geo, bm);
      const x = -150 + i * 60, z = -70;
      mesh.position.set(x, coastHeight(x, z), z);
      this.resort.add(mesh);
      const wmesh = new THREE.Mesh(windowsGeometry(b, i, 0.7), winMat);
      wmesh.position.copy(mesh.position);
      this.resort.add(wmesh);
    }
    // string lights
    for (let i = 0; i < 40; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 1.0) }));
      bulb.position.set(-200 + i * 10, 4 + Math.sin(i) * 0.4, -28);
      this.resort.add(bulb);
    }
    sc.add(this.resort);
    // ships
    this.berouw = makeSteamer({ kind: 'merchant', L: 42, W: 8 });
    sc.add(this.berouw);
    this.barque = makeBarque({ seed: 4 });
    sc.add(this.barque);
    this.longboat = makeLongboat();
    sc.add(this.longboat);
    // barrels on beach
    this.barrels = new THREE.Group();
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x5e3d22, roughness: 0.7 })); b.position.set(-20 + i * 0.9 + (i > 3 ? 1 : 0), coastHeight(-20, 4) + 0.45, 4 + (i % 2) * 0.8); b.castShadow = true; this.barrels.add(b); }
    sc.add(this.barrels);
    // tsunami wave
    this.wave = this.makeWave();
    sc.add(this.wave);
    // particles
    this.puffs = new PuffCloud(3000);
    this.sprayE = this.sprayEmitter();
    this.E = makeEruption();
    this.puffs.emitters.push(this.sprayE, columnEmitter(this.E));
    this.sparks = new StreakCloud(3000);
    this.sparks.emitters.push(lightningEmitter(this.E), bombEmitter(this.E));
    this.debris = this.makeDebris();
    sc.add(this.puffs.mesh, this.sparks.mesh, this.debris);
    this.flakes = new StreakCloud(4000, { additive: false });
    this.flakes.emitters.push(this.ashEmitter());
    sc.add(this.flakes.mesh);
    // distant volcano silhouette (Krakatoa seen from Java)
    const vg = new THREE.ConeGeometry(4500, 1600, 48, 4);
    this.volcano = new THREE.Mesh(vg, new THREE.MeshStandardMaterial({ color: 0x22301e, roughness: 1 }));
    this.volcano.position.set(-8000, 300, 42000);
    sc.add(this.volcano);
    this.people = [];
    this.camTmp = makeCamState();
    this.W = { on: false, zc: 1e5, H: 0 };
  }

  colorTerrain(bare) {
    const g = this.terrainGeo, pos = g.attributes.position, nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const sl = 1 - nor.getY(i);
      const v = nz.n2(x * 0.01, z * 0.01) * 0.5 + 0.5;
      let c;
      if (y < -0.4) c = [0.3, 0.26, 0.19];
      else if (y < 1.2) c = [0.42, 0.33, 0.22];
      else if (y < 2.6) c = [0.56, 0.45, 0.29];
      else c = [lerp(0.14, 0.08, v), lerp(0.36, 0.24, v), lerp(0.08, 0.05, v)];
      if (sl > 0.35) c = [0.32, 0.27, 0.2];
      if (bare && y > 1.0) c = [0.36 + v * 0.1, 0.29 + v * 0.06, 0.2];
      col.set(c, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.bare = bare;
  }

  makeWave() {
    const NX = 380, NS = 130;
    const g = new THREE.PlaneGeometry(1, 1, NX, NS);
    const uv = g.attributes.uv;
    this.waveU = {
      uZc: { value: 1e5 }, uH: { value: 40 }, uTime: this.uTime, uCurl: { value: 1 }, uWidth: { value: 5200 }, uX0: { value: 0 },
      uSunDir: this.sky.uniforms.uSunDir, uSunColor: this.sky.uniforms.uSunColor, uHorizon: this.sky.uniforms.uHorizon, uZenith: this.sky.uniforms.uZenith,
      uFogDensity: { value: 0.0001 }, uFogColor: { value: new THREE.Color() }, uDark: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.waveU,
      vertexShader: NOISE + /* glsl */ `
        uniform float uZc; uniform float uH; uniform float uTime; uniform float uCurl; uniform float uWidth; uniform float uX0;
        varying vec3 vW; varying float vS; varying float vY; varying vec3 vN;
        vec3 P(vec2 q) {
          float x = uX0 + (q.x - 0.5) * uWidth; // follows the camera so the wall never ends in frame
          float s = mix(-1400.0, 160.0, q.y); // distance in front of crest
          float hx = uH * (0.82 + 0.3 * vnoise(vec2(x * 0.004, uTime * 0.05)) + 0.12 * sin(x * 0.011 + uTime * 0.5));
          float y;
          if (s > 0.0) y = hx * exp(-pow(s / (0.33 * hx + 4.0), 2.0));
          else y = hx * (0.32 + 0.68 * exp(s / (1.4 * hx + 10.0)));
          y = mix(y, 0.7, smoothstep(-900.0, -1400.0, s));
          // plunging lip
          float lip = exp(-pow((s - 0.0) / (0.18 * hx + 2.0), 2.0)) * smoothstep(0.6 * hx, hx, y);
          float z = uZc - s - lip * hx * 0.38 * uCurl;
          y += vnoise(vec2(x * 0.03, s * 0.03 + uTime)) * 1.2 * smoothstep(0.0, -80.0, s);
          return vec3(x, y, z);
        }
        void main() {
          vec2 q = uv;
          vec3 p = P(q);
          vec3 px = P(q + vec2(0.002, 0.0)), pz = P(q + vec2(0.0, 0.002));
          vN = normalize(cross(pz - p, px - p));
          vS = mix(-1400.0, 160.0, q.y); vY = p.y / max(uH, 1.0);
          vW = p;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: NOISE + /* glsl */ `
        uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uHorizon; uniform vec3 uZenith; uniform float uTime;
        uniform float uFogDensity; uniform vec3 uFogColor; uniform float uDark; uniform float uH;
        varying vec3 vW; varying float vS; varying float vY; varying vec3 vN;
        void main() {
          vec3 N = normalize(vN);
          if (!gl_FrontFacing) N = -N;
          vec3 V = normalize(cameraPosition - vW);
          float F = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 deep = vec3(0.006, 0.03, 0.036);
          vec3 turbid = vec3(0.07, 0.075, 0.05); // sediment-laden water at the foot of the wave
          vec3 body = mix(deep, turbid, smoothstep(-50.0, 0.0, vS) * (1.0 - smoothstep(0.2, 0.6, vY)));
          // translucency near the thin crest (light shining through the lip)
          float thin = smoothstep(0.5, 0.95, vY) * smoothstep(45.0, 0.0, abs(vS));
          body += vec3(0.05, 0.36, 0.3) * thin * (0.5 + 0.7 * max(dot(-V, uSunDir), 0.0)) * 1.5;
          vec3 sky = mix(uHorizon, uZenith, clamp(reflect(-V, N).y, 0.0, 1.0));
          vec3 col = mix(body * (0.3 + 0.7 * max(dot(N, uSunDir), 0.0) + 0.3), sky * 0.8, F);
          // whitewater / foam
          float n = fbm2(vec2(vW.x * 0.05, vS * 0.06 - uTime * 0.6));
          float n2 = vnoise(vec2(vW.x * 0.2, vS * 0.25 - uTime * 2.0));
          float crestBand = smoothstep(0.78, 0.98, vY) * smoothstep(30.0, 0.0, abs(vS + 4.0));
          float face = smoothstep(0.0, 25.0, vS) * smoothstep(0.15, 0.6, vY);
          float foam = smoothstep(0.55, 0.8, n) * (crestBand * 1.6 + face * 0.32);
          foam = max(foam, smoothstep(0.62, 0.85, n2) * smoothstep(-160.0, -20.0, vS) * smoothstep(-2.0, -25.0, vS) * 0.55);
          foam += crestBand * smoothstep(0.35, 0.6, n2) * 0.6;
          vec3 foamCol = max(uHorizon * 0.9 + uSunColor * 0.05, vec3(0.42, 0.45, 0.45));
          col = mix(col, foamCol, clamp(foam, 0.0, 1.0) * 0.9);
          col *= 1.0 - uDark;
          float d = length(cameraPosition - vW);
          col = mix(col, uFogColor, 1.0 - exp(-uFogDensity * d));
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    return mesh;
  }

  // water height of the tsunami at world (x, z)
  waveHeight(x, z) {
    if (!this.W.on) return -10;
    const s = this.W.zc - z;
    const H = this.W.H;
    if (s > 0) return H * Math.exp(-Math.pow(s / (0.33 * H + 4), 2));
    return H * (0.32 + 0.68 * Math.exp(s / (1.4 * H + 10)));
  }

  sprayEmitter() {
    const N = 1400, r = rng(5);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        if (!this.W.on || this.W.H < 2) return;
        const H = this.W.H;
        for (let i = 0; i < N; i++) {
          const [a, b, c, d] = seeds[i];
          const ph = fract(t * 0.35 + b);
          const x = (this.waveU.uX0.value ?? 0) + (a - 0.5) * 2400;
          const z = this.W.zc + 5 + ph * 60 - H * 0.2;
          const y = H * (0.85 + 0.15 * Math.sin(x * 0.011)) + ph * H * 0.7;
          const size = (6 + H * 0.5) * (0.5 + ph * 1.8) * (0.6 + d * 0.8);
          const al = (1 - ph) * clamp(ph / 0.1) * 0.75;
          push(x, y, z, size, 0.9, 0.92, 0.92, al, a * 20 + t * 0.3, Math.floor(c * 16), 0, 0);
        }
      },
    };
  }

  makeDebris() {
    const N = 500;
    const g = new THREE.BoxGeometry(1, 1, 1);
    const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 0.9 }), N);
    const r = rng(9);
    this.debrisSeeds = Array.from({ length: N }, () => [r(), r(), r(), r(), r(), r()]);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) { const v = r(); c.setRGB(0.42 + v * 0.3, 0.34 + v * 0.18, 0.24 + v * 0.12); im.setColorAt(i, c); }
    im.castShadow = true;
    im.visible = false;
    return im;
  }

  ashEmitter() {
    const N = 3000, r = rng(808);
    const seeds = Array.from({ length: N }, () => [r(), r(), r(), r()]);
    return {
      fill: (t, push) => {
        const k = this.ashK ?? 0;
        if (k <= 0 || !this.camPos) return;
        const c = this.camPos, S = 60;
        for (let i = 0; i < N * k; i++) {
          const [a, b, cc, d] = seeds[i];
          const x = c.x + (fract(a - c.x / S) - 0.5) * S, z = c.z + (fract(b - c.z / S) - 0.5) * S;
          const y = c.y + (fract(cc - (t * 3) / S - c.y / S) - 0.5) * S * 0.7;
          const gcol = 0.22 + d * 0.15;
          push(x, y, z, x - 0.2, y + 0.35, z, 0.035 + d * 0.03, gcol, gcol, gcol * 0.95, 0.8);
        }
      },
    };
  }

  nearFar(shot) { return [shot.p?.near ?? 0.5, 90000]; }
  fx() { const m = this.moodState || {}; return { exposure: m.exposure ?? 1, grade: 'tropical', bloom: 0.65 }; }

  prepare(shot) {
    const p = shot.p || {};
    this.mood(p.mood ?? 'day', p.moodOv ?? {}, p.mood2 ?? null, 0);
    this.env(1);
    const lay = p.layout ?? 'village';
    for (const h of this.huts) h.visible = lay === 'village';
    for (const pr of this.praus) pr.visible = lay === 'village' || lay === 'wild';
    this.anjer.visible = lay === 'anjer';
    this.resort.visible = lay === 'resort';
    this.barrels.visible = lay === 'wild';
    this.longboat.visible = lay === 'wild';
    this.barque.visible = !!p.barque;
    this.berouw.visible = !!p.berouw;
    this.volcano.visible = !!p.volcano;
    if (!!p.bare !== this.bare) this.colorTerrain(!!p.bare);
    this.trees.visible = !p.bare;
    this.palms.visible = !p.bare;
    this.ocean.setSea(p.sea ?? 'calm', p.seaScale ?? 1);
    evalCamera(shot, 0, this.camTmp);
    this.ocean.center(this.camTmp.pos.x, this.camTmp.pos.z);
    // reset hut transforms
    for (const h of this.huts) { const d = h.userData; h.position.set(d.x, d.y, d.z); h.rotation.set(0, d.ry, 0); }
    for (const h of this.anjer.children) if (h.userData.x !== undefined) { const d = h.userData; h.position.set(d.x, d.y, d.z); h.rotation.set(0, d.ry, 0); }
    this.lighthouse.position.set(...this.lhBase); this.lighthouse.rotation.set(0, 0, 0);
    // people
    for (const f of this.people) f.visible = false;
    for (const pd of p.people || []) {
      let f = this.people.find((x) => !x.visible && x.userData.style === pd.style && x.userData.propKind === (pd.prop || null));
      if (!f) { f = makeFigure(pd.style, 300 + this.people.length * 7); if (pd.prop) addProp(f, pd.prop); f.userData.propKind = pd.prop || null; this.people.push(f); this.scene.add(f); }
      f.visible = true; f.userData.def = pd;
    }
    this.active = this.people.filter((f) => f.visible);
  }

  update(shot, lt, vt, fx) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.uTime.value = vt;
    this.ocean.uniforms.uTime.value = vt;
    this.sky.uniforms.uSkyTime.value = vt;
    const s = this.mood(p.mood ?? 'day', p.moodOv ?? {}, p.mood2 ?? null, val(p.moodK, u, lt, 0));
    this.ocean.applyMood(s);
    this.ocean.uniforms.uShore.value = 0;
    this.ocean.uniforms.uTint.value.set(...(p.waterTint ?? [1, 1, 1]));
    this.uWind.value = val(p.wind, u, lt, 1);
    fx.exposure = (fx.exposure ?? 1) * (p.exposure ?? 1);
    this.ashK = val(p.ashfall, u, lt, 0);
    // tsunami
    const ts = p.tsunami;
    this.W.on = !!ts;
    this.wave.visible = !!ts;
    this.debris.visible = !!ts && (ts.debris ?? true);
    if (ts) {
      const dt = lt - (ts.t0 ?? 0);
      this.W.zc = (ts.z0 ?? 900) - (ts.speed ?? 30) * dt;
      this.W.H = val(ts.H, u, lt, 40);
      this.waveU.uZc.value = this.W.zc;
      this.waveU.uH.value = this.W.H;
      this.waveU.uCurl.value = ts.curl ?? 1;
      this.waveU.uX0.value = Math.round(this.camTmp ? this.camTmp.pos.x / 50 : 0) * 50;
      this.waveU.uFogDensity.value = this.scene.fog.density;
      this.waveU.uFogColor.value.copy(this.scene.fog.color);
      this.terrainU.uWet.value = 1;
      this.terrainU.uWetZ.value = this.W.zc - 10;
      this.wreck(vt);
    } else if (p.wreckage) {
      // aftermath: soaked mud flats littered with wreckage
      this.terrainU.uWet.value = 0.55;
      this.terrainU.uWetZ.value = -1e9;
      this.debris.visible = true;
      const W = p.wreckage, m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
      this.debrisSeeds.forEach(([a, b, c, d, e, f], i) => {
        const x = W.c[0] + (a - 0.5) * 2 * W.r, z = W.c[1] + (b - 0.5) * 2 * W.r;
        q.setFromEuler(new THREE.Euler((c - 0.5) * 0.5, d * 6.28, (e - 0.5) * 0.4));
        const L = 2 + f * 9;
        ps.set(x, coastHeight(x, z) + 0.2, z);
        sc.set(L, 0.35 + c * 0.6, 0.5 + d * 1.4);
        this.debris.setMatrixAt(i, m.compose(ps, q, sc));
      });
      this.debris.instanceMatrix.needsUpdate = true;
    } else {
      this.terrainU.uWet.value = 0;
    }
    // Berouw
    if (p.berouw) {
      const b = this.berouw;
      if (p.berouw === 'wave') {
        b.position.set(p.berouwX ?? 20, this.W.H * 0.78, this.W.zc - 25);
        b.rotation.set(0.25 + Math.sin(vt * 1.5) * 0.06, Math.PI / 2 + 0.6, 0.15);
      } else if (p.berouw === 'anchored') {
        const w = this.ocean.heightAt(300, 260, vt);
        b.position.set(300, w.y * 0.8, 260); b.rotation.set(0, 0.3, Math.sin(vt) * 0.02);
      } else {
        b.position.set(-60, coastHeight(-60, -420) + 1.5, -420);
        b.rotation.set(0.05, 1.1, 0.22);
      }
    }
    if (p.barque) {
      const w = this.ocean.heightAt(-60, 420, vt);
      this.barque.position.set(p.barquePos?.[0] ?? -60, w.y * 0.8, p.barquePos?.[1] ?? 420);
      this.barque.rotation.set(Math.sin(vt * 0.7) * 0.015, p.barqueRot ?? 0.4, w.n.x * 0.3);
    }
    if (this.longboat.visible) { this.longboat.position.set(-24, coastHeight(-24, 9) + 0.45, 9); this.longboat.rotation.set(0.02, 2.2, 0.08); }
    // distant eruption
    const ep = p.erupt;
    this.E.on = !!ep;
    if (ep) Object.assign(this.E, { c: [this.volcano.position.x, 900, this.volcano.position.z], height: val(ep.height, u, lt, 20000), intensity: val(ep.intensity, u, lt, 1), baseW: 700, topW: 5000, umbrella: val(ep.umbrella, u, lt, 0.4), umbrellaR: 16000, rise: 200, t0: ep.t0 !== undefined ? shot.t + ep.t0 : -1e6, dark: ep.dark ?? 0.12, glow: val(ep.glow, u, lt, 0.8), wind: [0.1, 0.0], size: 2.2, bombs: 0, lightning: val(ep.lightning, u, lt, 0), count: 1500, tint: [1, 0.95, 0.9] });
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.copy(this.sky.uniforms.uSunDir.value);
    PU.uSunCol.value.set(...s.light).multiplyScalar(s.lightI * 0.55);
    PU.uAmb.value.set(...s.hemiSky).multiplyScalar(s.hemiI * 0.6).add(new THREE.Vector3(...s.horizon).multiplyScalar(0.3));
    PU.uFogDensity.value = this.scene.fog.density * 0.5;
    PU.uFogColor.value.set(...s.horizon);
    // people
    for (const f of this.active) {
      const d = f.userData.def;
      const pose = typeof d.pose === 'function' ? d.pose(u, lt) : d.pose || {};
      let x = d.at[0], z = d.at[1];
      if (d.move) { x += d.move[0] * lt; z += d.move[1] * lt; }
      f.position.set(x, d.y !== undefined ? d.y : coastHeight(x, z) + (d.dy ?? 0), z);
      f.rotation.set(0, ((d.rot ?? 0) * Math.PI) / 180, 0);
      f.scale.setScalar(d.scale ?? 1);
      poseFigure(f, vt, pose);
    }
    // trembling ground: shake objects slightly
    const quake = val(p.quake, u, lt, 0);
    if (quake > 0) for (const h of this.huts) h.rotation.z = Math.sin(vt * 23 + h.userData.seed * 9) * 0.01 * quake;
  }

  // Huts, houses, palms and the lighthouse are swept by the wave.
  wreck(vt) {
    const zc = this.W.zc, H = this.W.H;
    const sweep = (o, k = 1) => {
      const d = o.userData;
      const passed = d.z - zc; // >0 once the crest has passed the object
      if (passed <= -5) { o.position.set(d.x, d.y, d.z); o.rotation.set(0, d.ry, 0); return; }
      const e = clamp((passed + 5) / 40);
      o.position.set(d.x + Math.sin(d.seed * 20) * 20 * e, Math.max(d.y, this.waveHeight(d.x, o.position.z) - 2.5) - e * e * 6, d.z - passed * 0.92 * e * k);
      o.rotation.set(Math.sin(d.seed * 9) * 1.4 * e, d.ry + Math.sin(d.seed * 13) * 2 * e, Math.cos(d.seed * 7) * 1.2 * e);
    };
    for (const h of this.huts) if (h.visible) sweep(h);
    for (const pr of this.praus) if (pr.visible) sweep(pr, 1.1);
    if (this.anjer.visible) {
      for (const h of this.anjer.children) if (h.userData.x !== undefined) sweep(h, 0.6);
      const lb = this.lhBase;
      const passed = lb[2] - zc;
      const e = clamp((passed + 4) / 30);
      const ee = ease.inOut(e);
      this.lighthouse.position.set(lb[0] + ee * 10, lb[1] + ee * (H * 0.3), lb[2] - ee * 120);
      this.lighthouse.rotation.set(-ee * 1.45, ee * 0.3, ee * 0.2);
    }
    // palms bend and break
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.palmBase.forEach((b, i) => {
      const passed = b.z - zc;
      const e = clamp((passed + 8) / 25);
      q.setFromEuler(new THREE.Euler(b.tx - e * 1.35, b.ry, b.tz + e * (b.seed - 0.5)));
      m.compose(p.set(b.x, b.h - 0.3 - e * 1.5, b.z - e * 8), q, s.set(b.sc, b.sc, b.sc));
      this.palms.setMatrixAt(i, m);
    });
    this.palms.instanceMatrix.needsUpdate = true;
    // debris
    const im = this.debris;
    this.debrisSeeds.forEach(([a, b, c, d, e, f], i) => {
      const x = (a - 0.5) * 1400;
      const sOff = -b * 160 + 6;
      const z = zc - sOff;
      const y = this.waveHeight(x, z) - 0.4 + Math.sin(vt * 2 + i) * 0.4;
      q.setFromEuler(new THREE.Euler(vt * (c - 0.5) * 2 + i, vt * (d - 0.5) + i, vt * (e - 0.5) * 2));
      const L = 1 + f * 7;
      m.compose(p.set(x, y, z), q, s.set(L, 0.25 + c * 0.5, 0.4 + d * 1.2));
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  }

  afterCamera(shot, lt, vt, cam) {
    this.camPos = cam.position;
    this.puffs.update(vt, cam.position);
    this.sparks.update(vt);
    this.flakes.update(vt);
    const look = this.engine.camState.look;
    const dist = cam.position.distanceTo(look);
    this.fitShadow([look.x, Math.max(look.y, 0), look.z], clamp(dist * 0.9, 30, 1500), 3);
  }
}
