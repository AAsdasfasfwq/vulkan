import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { NOISE } from '../world/glsl.js';
import { PuffCloud } from '../world/particles.js';
import { plumeletEmitter } from '../world/eruption.js';
import { rng, clamp, fract, lerp, ease } from '../core/math.js';

// Inside the magma chamber: molten lake, crystals, gas bubbles, inrushing sea water.
export class MagmaSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.sky.mesh.visible = false;
    sc.background = new THREE.Color(0x060201);
    sc.fog = new THREE.FogExp2(0x1a0602, 0.035);
    this.u = { uTime: this.uTime, uHeat: { value: 1 }, uCrust: { value: 0.4 }, uPressure: { value: 0 } };
    const lg = new THREE.PlaneGeometry(200, 200, 260, 260);
    lg.rotateX(-Math.PI / 2);
    const lava = new THREE.Mesh(lg, new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: NOISE + `uniform float uTime; uniform float uPressure; varying vec3 vW; varying float vH;
        void main(){ vec3 p = position; float h = fbm2(p.xz*0.12 + uTime*0.05)*1.4 + sin(p.x*0.3+uTime*0.8)*0.15*(1.0+uPressure*2.0); p.y += h; vH = h; vW = (modelMatrix*vec4(p,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }`,
      fragmentShader: NOISE + `uniform float uTime; uniform float uHeat; uniform float uCrust; uniform float uPressure; varying vec3 vW; varying float vH;
        void main(){
          vec2 q = vW.xz * 0.16 + vec2(uTime*0.03, uTime*0.02);
          vec2 w2 = worley2(q);
          float edge = w2.y - w2.x;
          vec2 w3 = worley2(q * 3.1 + 7.0);
          float edge2 = w3.y - w3.x;
          float flow = fbm2(vW.xz*0.06 - uTime*0.04);
          float open = smoothstep(0.65, 0.95, flow + (1.0 - uCrust) * 0.4);      // patches of open molten lava
          float crack = smoothstep(0.09 + (1.0 - uCrust) * 0.08, 0.0, edge) + 0.5 * smoothstep(0.05, 0.0, edge2);
          float hotK = clamp(max(crack, open), 0.0, 1.0);
          vec3 hot = mix(vec3(0.85,0.16,0.02), vec3(1.0,0.55,0.12), clamp(crack * 0.8 + open * 0.5, 0.0, 1.0)) * (1.4 + uPressure*1.2) * uHeat;
          vec3 cr = vec3(0.045,0.03,0.025) * (0.6 + 0.7*vnoise(vW.xz*1.5)) + vec3(0.2,0.04,0.0) * smoothstep(0.25, 0.0, edge) * 0.4;
          vec3 c = mix(cr, hot, hotK);
          float d = length(cameraPosition - vW);
          c = mix(c, vec3(0.12,0.03,0.01), 1.0 - exp(-0.03*d));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    sc.add(lava);
    // rocky ceiling
    const cg = new THREE.SphereGeometry(80, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2);
    const cp = cg.attributes.position;
    const r = rng(6);
    for (let i = 0; i < cp.count; i++) { const v = new THREE.Vector3(cp.getX(i), cp.getY(i), cp.getZ(i)); const k = 1 + (Math.sin(v.x * 0.2) * Math.cos(v.z * 0.17) * 0.06 + (r() - 0.5) * 0.02); v.multiplyScalar(k); v.y *= 0.35; cp.setXYZ(i, v.x, v.y, v.z); }
    cg.computeVertexNormals();
    const ceil = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.85, side: THREE.BackSide }));
    sc.add(ceil);
    this.ceil = ceil;
    // crystals
    const xg = new THREE.CylinderGeometry(0.0, 0.5, 1, 6); xg.translate(0, 0.5, 0);
    const xg2 = new THREE.CylinderGeometry(0.5, 0.5, 2, 6); xg2.translate(0, -1, 0);
    this.crystals = new THREE.InstancedMesh(xg, new THREE.MeshPhysicalMaterial({ color: 0xcfd9de, roughness: 0.12, metalness: 0.05, clearcoat: 1, emissive: 0x1a0603, transparent: true, opacity: 0.92 }), 70);
    this.crystalSeeds = Array.from({ length: 70 }, () => [r(), r(), r(), r(), r()]);
    sc.add(this.crystals);
    // bubbles
    this.bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.25, metalness: 0.2, emissive: 0xff5a10, emissiveIntensity: 0.9 }), 120);
    this.bubbleSeeds = Array.from({ length: 120 }, () => [r(), r(), r(), r()]);
    sc.add(this.bubbles);
    // water jet (sea water rushing in) + steam
    this.jet = new THREE.Mesh(new THREE.CylinderGeometry(3, 6, 60, 32, 20, true), new THREE.ShaderMaterial({
      uniforms: { uTime: this.uTime, uK: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0);} `,
      fragmentShader: NOISE + `uniform float uTime; uniform float uK; varying vec2 vUv; varying vec3 vW; void main(){ float n = fbm2(vec2(vUv.x*12.0, vUv.y*6.0 + uTime*3.0)); float a = smoothstep(0.35, 0.7, n) * uK; vec3 c = mix(vec3(0.1,0.35,0.6), vec3(0.8,0.95,1.0), n) * 1.6; gl_FragColor = vec4(c*a, a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    this.jet.position.set(0, 30, -10);
    sc.add(this.jet);
    this.puffs = new PuffCloud(1500);
    this.steam = { on: false, c: [0, 0, -10], h: 32, spread: 18, size: 6, life: 3.4, alpha: 0.42, col: [0.78, 0.76, 0.76], n: 480, seed: 8, wind: [0.2, 0.3], glow: 0.28 };
    this.puffs.emitters.push(plumeletEmitter(this.steam));
    sc.add(this.puffs.mesh);
    this.glow = new THREE.PointLight(0xff5a14, 300, 120, 1.2); this.glow.position.set(0, 4, 0); sc.add(this.glow);
    this.sun.visible = false;
    this.hemi.color.set(0xff6a30); this.hemi.groundColor.set(0xff3a10); this.hemi.intensity = 0.25;
  }
  nearFar() { return [0.1, 600]; }
  fx() { return { grade: 'fire', bloom: 1.0, bloomThreshold: 1.0, exposure: 0.85, vignette: 0.55 }; }
  update(shot, lt, vt) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.uTime.value = vt;
    this.u.uPressure.value = val(p.pressure, u, lt, 0);
    this.u.uCrust.value = val(p.crust, u, lt, 0.4);
    const cr = val(p.crystals, u, lt, 0);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    this.crystalSeeds.forEach(([a, b, c, d, e], i) => {
      const grow = clamp(cr * 1.4 - a * 0.6);
      const ang = b * Math.PI * 2, rad = 14 + c * 10;
      const x = Math.cos(ang) * rad * 0.6 + (b - 0.5) * 8, z = -Math.abs(Math.sin(ang)) * rad * 0.5 - 4;
      q.setFromEuler(new THREE.Euler((d - 0.5) * 1.2, e * 6, (a - 0.5) * 1.2));
      const L = (0.8 + e * 2.2) * ease.out(grow);
      m.compose(v.set(x, 0.9, z), q, s.set(0.25 + d * 0.4, Math.max(L, 0.001), 0.25 + d * 0.4));
      this.crystals.setMatrixAt(i, m);
    });
    this.crystals.instanceMatrix.needsUpdate = true;
    const bb = val(p.bubbles, u, lt, 0);
    this.bubbleSeeds.forEach(([a, b, c, d], i) => {
      const ph = fract(vt * (0.12 + d * 0.1) + a);
      const x = (b - 0.5) * 50, z = (c - 0.5) * 40 - 5;
      const y = 0.6;
      const sc = (0.6 + d * 1.8) * bb * Math.sin(Math.PI * clamp(ph * 1.15)) * (ph > 0.86 ? 0 : 1);
      m.compose(v.set(x, y, z), q.identity(), s.setScalar(Math.max(sc, 0.0001)));
      this.bubbles.setMatrixAt(i, m);
    });
    this.bubbles.instanceMatrix.needsUpdate = true;
    const wk = val(p.water, u, lt, 0);
    this.jet.material.uniforms.uK.value = wk;
    this.jet.visible = wk > 0.01;
    this.steam.on = wk > 0.01 || !!p.steam;
    this.steam.amount = Math.max(wk, val(p.steam, u, lt, 0));
    this.glow.intensity = 300 * (1 + this.u.uPressure.value);
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.set(0, -1, 0); PU.uSunCol.value.set(2.0, 0.6, 0.2); PU.uAmb.value.set(0.5, 0.35, 0.3); PU.uFogDensity.value = 0.01; PU.uFogColor.value.set(0.15, 0.04, 0.01);
  }
  afterCamera(shot, lt, vt, cam) { this.puffs.update(vt, cam.position); }
}
