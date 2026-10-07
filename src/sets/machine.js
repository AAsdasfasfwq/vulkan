import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { PuffCloud } from '../world/particles.js';
import { plumeletEmitter } from '../world/eruption.js';
import { canvasTex } from '../world/props.js';
import { clamp, rng } from '../core/math.js';

const M = (c, r = 0.5, m = 0, ex = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...ex });

// Victorian engine house: flywheel, piston, governor, gears, furnace.
export class MachineSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.sky.mesh.visible = false;
    sc.background = new THREE.Color(0x0c0806);
    sc.fog = new THREE.FogExp2(0x1a120c, 0.025);
    const iron = M(0x2a2c30, 0.45, 0.85), brass = M(0xc89b45, 0.25, 0.95), red = M(0x6a1a12, 0.5, 0.4), green = M(0x1f3a2c, 0.45, 0.4);
    const brick = canvasTex(512, 512, (c, W, H) => { c.fillStyle = '#3a1c12'; c.fillRect(0, 0, W, H); const r = rng(5); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const v = 0.6 + r() * 0.5; c.fillStyle = `rgb(${120 * v},${55 * v},${35 * v})`; c.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28); } });
    brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(6, 3);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), M(0xffffff, 0.9, 0, { map: brick })); wall.position.set(0, 8, -8); sc.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), M(0x2b2522, 0.7, 0.2)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    // flywheel
    this.fly = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.32, 16, 80), green); this.fly.add(rim);
    for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.18), green); sp.rotation.z = (i / 8) * Math.PI; this.fly.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 24), brass); hub.rotation.x = Math.PI / 2; this.fly.add(hub);
    this.fly.position.set(-3, 4.2, -2); sc.add(this.fly);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 16), iron); axle.rotation.x = Math.PI / 2; axle.position.set(-3, 4.2, -1); sc.add(axle);
    // crank + connecting rod + piston
    this.crank = new THREE.Group(); this.crank.position.set(-3, 4.2, 1.2); sc.add(this.crank);
    const crArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.25), iron); crArm.position.y = 0.8; this.crank.add(crArm);
    this.pin = new THREE.Object3D(); this.pin.position.y = 1.4; this.crank.add(this.pin);
    this.rod = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.22, 0.2), brass); sc.add(this.rod);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.2, 32), red); cyl.rotation.z = Math.PI / 2; cyl.position.set(6.2, 4.2, 1.2); sc.add(cyl);
    for (const x of [4.6, 7.8]) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.2, 32), brass); fl.rotation.z = Math.PI / 2; fl.position.set(x, 4.2, 1.2); sc.add(fl); }
    this.pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 12), M(0xd8dde2, 0.15, 1)); this.pistonRod.rotation.z = Math.PI / 2; sc.add(this.pistonRod);
    const guide = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.6), iron); guide.position.set(3.3, 3.9, 1.2); sc.add(guide);
    // governor
    this.gov = new THREE.Group(); this.gov.position.set(6.2, 6.0, 1.2); sc.add(this.gov);
    const gs = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 10), brass); gs.position.y = 0.8; this.gov.add(gs);
    for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.y = 1.5; arm.rotation.z = s * 0.6; const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), brass); a.position.y = -0.45; arm.add(a); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), brass); b.position.y = -0.9; arm.add(b); this.gov.add(arm); }
    // gears
    this.gears = [];
    const gear = (R, teeth, mat) => {
      const shape = new THREE.Shape();
      for (let i = 0; i < teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2; const rr = i % 2 ? R : R * 1.12; const a2 = a + Math.PI / (teeth * 2); i ? shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); shape.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); }
      const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.25, 0, Math.PI * 2, true); shape.holes.push(hole);
      return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), mat);
    };
    const g1 = gear(1.6, 28, brass); g1.position.set(2.0, 8.5, -5); sc.add(g1);
    const g2 = gear(0.9, 16, iron); g2.position.set(4.6, 8.5, -5); sc.add(g2);
    const g3 = gear(2.4, 40, iron); g3.position.set(-1.2, 10.6, -5.5); sc.add(g3);
    this.gears = [[g1, 1, 28], [g2, -1, 16], [g3, -1, 40]];
    // boiler + furnace
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 9, 40), M(0x3a3634, 0.4, 0.7)); boiler.rotation.z = Math.PI / 2; boiler.position.set(-8, 3, -5); sc.add(boiler);
    for (let i = 0; i < 6; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.06, 6, 40), brass); band.rotation.y = Math.PI / 2; band.position.set(-12 + i * 1.6, 3, -5); sc.add(band); }
    const fire = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 2.2, 0.5) })); fire.position.set(-3.45, 2.2, -5); fire.rotation.y = Math.PI / 2; sc.add(fire);
    this.fireLight = new THREE.PointLight(0xff7a2a, 40, 30, 1.4); this.fireLight.position.set(-2.5, 2.4, -4); sc.add(this.fireLight);
    // gauges on boiler
    for (let i = 0; i < 3; i++) { const gg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24), brass); gg.rotation.x = Math.PI / 2; gg.position.set(-10 + i * 1.2, 5.6, -2.8); sc.add(gg); const f = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), M(0xefe7d6, 0.6)); f.position.set(-10 + i * 1.2, 5.6, -2.74); sc.add(f); }
    // light shaft windows
    for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.5) })); w.position.set(-8 + i * 7, 11, -7.95); sc.add(w); }
    this.key = new THREE.DirectionalLight(0xffe2b8, 4.2); this.key.position.set(-4, 14, 8); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    const sc2 = this.key.shadow.camera; sc2.left = -15; sc2.right = 15; sc2.top = 15; sc2.bottom = -15; sc2.far = 50;
    sc.add(this.key);
    this.sun.visible = false; this.hemi.intensity = 0.7; this.hemi.color.set(0x8a7058); this.hemi.groundColor.set(0x1a1010);
    sc.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.puffs = new PuffCloud(500);
    this.leak = { on: true, c: [7.9, 4.6, 1.2], h: 4, spread: 0.3, size: 0.5, life: 3, alpha: 0.45, col: [0.9, 0.9, 0.88], n: 140, seed: 3, wind: [0.4, 0.05] };
    this.puffs.emitters.push(plumeletEmitter(this.leak));
    sc.add(this.puffs.mesh);
  }
  nearFar() { return [0.05, 400]; }
  fx() { return { grade: 'warm', bloom: 0.8, exposure: 1.35, vignette: 0.45 }; }
  update(shot, lt, vt) {
    const a = vt * (shot.p?.speed ?? 2.4);
    this.fly.rotation.z = -a;
    this.crank.rotation.z = -a;
    this.crank.updateMatrixWorld(true);
    const pinW = new THREE.Vector3(); this.pin.getWorldPosition(pinW);
    const crossX = pinW.x + Math.sqrt(Math.max(25 - Math.pow(pinW.y - 4.2, 2), 0));
    this.rod.position.set((pinW.x + crossX) / 2, (pinW.y + 4.2) / 2, 1.5);
    this.rod.rotation.z = Math.atan2(4.2 - pinW.y, crossX - pinW.x);
    this.pistonRod.position.set(crossX + 1.2, 4.2, 1.2);
    this.gov.rotation.y = a * 1.5;
    for (const [g, d, t] of this.gears) g.rotation.z = (d * a * 28) / t;
    this.fireLight.intensity = 60 + Math.sin(vt * 13) * 8 + Math.sin(vt * 29) * 4;
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.set(-0.3, 0.8, 0.5).normalize(); PU.uSunCol.value.set(1.2, 1.0, 0.8); PU.uAmb.value.set(0.4, 0.32, 0.26); PU.uFogDensity.value = 0.02; PU.uFogColor.value.set(0.1, 0.07, 0.05);
  }
  afterCamera(shot, lt, vt, cam) { this.puffs.update(vt, cam.position); }
}
