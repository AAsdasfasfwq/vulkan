import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BaseSet, val } from './base.js';
import * as P from '../world/props.js';
import { PuffCloud } from '../world/particles.js';
import { plumeletEmitter } from '../world/eruption.js';
import { clamp, ease, lerp, noise1 } from '../core/math.js';

const BG = {
  light: [0xe9e4dc, 0xd8d1c6],
  dark: [0x1a1b1f, 0x0a0a0c],
  ember: [0x5a120c, 0x1c0504],
  navy: [0x13233a, 0x070c16],
  green: [0x4f8f2a, 0x24451a],
  paper: [0xefe9df, 0xd9d0c1],
  study: [0x3a2a1c, 0x120c08],
  teal: [0x173c40, 0x081618],
};

let ROOM_ENV = null;

export class StudioSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.sky.mesh.visible = false;
    sc.fog = null;
    if (!ROOM_ENV) ROOM_ENV = engine.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    sc.environment = ROOM_ENV;
    sc.environmentIntensity = 0.55;
    // cyclorama
    const g = new THREE.PlaneGeometry(60, 46, 1, 70);
    const pos = g.attributes.position;
    const r0 = 6, F = 18;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + 23; // 0..46 along the sheet
      let z, yy;
      if (y < F) { z = 12 - y; yy = 0; }
      else if (y < F + (Math.PI / 2) * r0) { const a = (y - F) / r0; z = 12 - F - Math.sin(a) * r0; yy = r0 - Math.cos(a) * r0; }
      else { z = 12 - F - r0; yy = r0 + (y - F - (Math.PI / 2) * r0); }
      pos.setXYZ(i, pos.getX(i), yy, z);
    }
    g.computeVertexNormals();
    this.bgMat = new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.95 });
    this.cyc = new THREE.Mesh(g, this.bgMat);
    this.cyc.receiveShadow = true;
    sc.add(this.cyc);
    this.key = new THREE.DirectionalLight(0xfff4e8, 2.6);
    this.key.position.set(-4, 9, 6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.radius = 6;
    this.key.shadow.bias = -0.0005;
    const c = this.key.shadow.camera; c.left = -6; c.right = 6; c.top = 6; c.bottom = -6; c.near = 1; c.far = 30;
    sc.add(this.key);
    this.rim = new THREE.DirectionalLight(0xbcd4ff, 1.2); this.rim.position.set(5, 4, -6); sc.add(this.rim);
    this.sun.visible = false;
    this.hemi.intensity = 0.4;
    this.items = new Map();
    this.root = new THREE.Group();
    sc.add(this.root);
    this.puffs = new PuffCloud(400);
    this.steam = { on: false, c: [0, 1.2, 0], h: 2.5, spread: 0.1, size: 0.25, life: 2.2, alpha: 0.5, col: [1, 1, 1], n: 120, seed: 4, wind: [0.15, 0] };
    this.puffs.emitters.push(plumeletEmitter(this.steam));
    sc.add(this.puffs.mesh);
    this.glowLight = new THREE.PointLight(0xff4a1a, 0, 8, 2);
    sc.add(this.glowLight);
  }

  nearFar() { return [0.05, 200]; }
  fx(shot) { const bg = shot.p?.bg ?? 'light'; return { grade: bg === 'light' || bg === 'paper' ? 'clean' : 'film', bloom: 0.5, bloomThreshold: 1.1, exposure: 1.0, vignette: bg === 'light' ? 0.22 : 0.45, grain: 0.02 }; }

  item(id, kind, args) {
    if (this.items.has(id)) return this.items.get(id);
    let o;
    switch (kind) {
      case 'coffee': o = P.makeCoffee(); break;
      case 'sugar': o = P.makeSugar(); break;
      case 'spices': o = P.makeSpices(); break;
      case 'cooker': o = P.makeCooker(); break;
      case 'spring': o = P.makeSpring(); break;
      case 'H2O': case 'CO2': case 'SO2': o = P.makeMolecule(kind); break;
      case 'gauge': o = P.makeGauge(); break;
      case 'key': o = P.makeTelegraphKey(); break;
      case 'paper': o = P.makeNewspaper(...(args || ['KRAKATOA', 'Terrible Volcanic Eruption', 'THE TIMES', 'LONDON, AUGUST 28, 1883'])); break;
      case 'seismo': o = P.makeSeismograph(); break;
      case 'tnt': o = P.makeTNT(); break;
      case 'thermo': o = P.makeThermometer(); break;
      case 'book': o = P.makeBook(...(args || ['ROYAL SOCIETY', 'LONDON · 1888'])); break;
      case 'waterCube': o = P.makeCube(0x2a8fd8, 0.75, 0x9fd8ff); break;
      case 'steamCube': o = P.makeCube(0xffffff, 0.18, 0xffffff); break;
      case 'hourglass': o = P.makeHourglass(); break;
      case 'lantern': o = P.makeLantern(); break;
      default: o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    }
    o.userData.kind = kind;
    this.items.set(id, o);
    this.root.add(o);
    return o;
  }

  prepare(shot) {
    const p = shot.p || {};
    const [c1] = BG[p.bg ?? 'light'] || BG.light;
    this.bgMat.color.set(c1);
    this.scene.background = new THREE.Color(c1);
    for (const o of this.items.values()) o.visible = false;
    for (const it of p.items || []) this.item(it.id ?? it.kind, it.kind, it.args).visible = true;
    this.key.intensity = p.keyI ?? 2.6;
    this.scene.environmentIntensity = p.envI ?? 0.55;
  }

  update(shot, lt, vt) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.steam.on = false;
    this.glowLight.intensity = 0;
    for (const it of p.items || []) {
      const o = this.items.get(it.id ?? it.kind);
      const a = it.appear ?? 0;
      const k = clamp((lt - a) / (it.popDur ?? 0.45));
      const out = it.out !== undefined ? 1 - clamp((lt - it.out) / 0.3) : 1;
      const sc = (it.scale ?? 1) * ease.back(k) * ease.out(out);
      o.visible = sc > 0.001;
      const pos = it.pos ? (Array.isArray(it.pos[0]) ? it.pos[0].map((v, i) => lerp(v, it.pos[1][i], ease.inOut(u))) : it.pos) : [0, 0, 0];
      const drop = (1 - ease.out(k)) * (it.drop ?? 0.6);
      o.position.set(pos[0], pos[1] + drop, pos[2]);
      o.scale.setScalar(Math.max(sc, 0.0001));
      const spin = it.spin ?? 0.15;
      o.rotation.set(it.rot?.[0] ?? 0, (it.rot?.[1] ?? 0) + lt * spin, it.rot?.[2] ?? 0);
      if (it.float) o.position.y += Math.sin(vt * 1.5 + pos[0]) * 0.04;
      const ud = o.userData;
      if (ud.kind === 'gauge') {
        let v = val(it.value, u, lt, 0.3);
        v += noise1(vt * 6, 3) * (it.jitter ?? 0.01);
        ud.set(v);
      }
      if (ud.kind === 'spring') {
        const c = val(it.value, u, lt, 0);
        ud.coil.scale.y = 1 - c * 0.6;
        ud.top.position.y = 1.65 * (1 - c * 0.6);
        ud.coil.material.emissive = new THREE.Color(0.6 * c, 0.08 * c, 0);
      }
      if (ud.kind === 'cooker') {
        const j = val(it.value, u, lt, 0.5);
        ud.valve.position.y = 1.08 + Math.max(0, Math.sin(vt * 31)) * 0.03 * j;
        ud.valve.rotation.y = vt * 6 * j;
        o.position.x += noise1(vt * 25, 9) * 0.01 * j;
        this.steam.on = true;
        this.steam.amount = j;
        this.steam.c = [o.position.x, o.position.y + 1.25 * o.scale.y, o.position.z];
      }
      if (ud.kind === 'key') {
        const tap = (Math.sin(vt * 22) > 0.2 && Math.sin(vt * 3.1) > -0.3) ? 1 : 0;
        ud.lever.rotation.z = -tap * 0.06;
      }
      if (ud.kind === 'thermo') ud.set(val(it.value, u, lt, 0.3));
      if (ud.kind === 'hourglass') ud.set(val(it.value, u, lt, 0.5));
      if (ud.kind === 'seismo') this.drawSeismo(ud, vt, val(it.value, u, lt, 0.2), it.flat);
      if (it.glow) { this.glowLight.intensity = val(it.glow, u, lt, 0) * 30; this.glowLight.position.set(pos[0], pos[1] + 0.5, pos[2] + 1.5); }
    }
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.set(-0.4, 0.8, 0.5).normalize();
    PU.uSunCol.value.set(1.4, 1.35, 1.3);
    PU.uAmb.value.set(0.6, 0.6, 0.62);
    PU.uFogDensity.value = 0;
  }

  drawSeismo(ud, t, amp, flat) {
    const tex = ud.paperTex;
    const c = tex.image.getContext('2d');
    const W = tex.image.width, H = tex.image.height;
    c.fillStyle = '#efe7d6'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,140,160,0.35)'; c.lineWidth = 2;
    for (let y = 0; y < H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = '#1e1a16'; c.lineWidth = 3; c.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const tt = t - (W - x) / W * 6;
      const a = flat ? 0.02 : amp * (0.5 + 0.5 * Math.sin(tt * 0.7)) * (0.6 + 0.4 * Math.sin(tt * 3.3));
      const y = H / 2 + (Math.sin(tt * 37) * 0.5 + Math.sin(tt * 61 + 1) * 0.3 + noise1(tt * 20, 5) * 0.6) * a * H * 0.45;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    tex.needsUpdate = true;
    ud.drum.rotation.x = -t * 0.5;
  }

  afterCamera(shot, lt, vt, cam) { this.puffs.update(vt, cam.position); }
}
