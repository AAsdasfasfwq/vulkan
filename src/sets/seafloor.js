import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { NOISE } from '../world/glsl.js';
import { makeNoise, rng, clamp, fract } from '../core/math.js';

// Atlantic sea floor with the telegraph cable and light pulses running along it.
const nz = makeNoise(19);
const floorH = (x, z) => nz.fbm2(x * 0.02, z * 0.02, 4) * 2.2 + nz.n2(x * 0.08, z * 0.08) * 0.3 + Math.sin(x * 0.15 + z * 0.05) * 0.25;

export class SeafloorSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.sky.mesh.visible = false;
    sc.background = new THREE.Color(0x05344a);
    sc.fog = new THREE.FogExp2(0x0a4a62, 0.024);
    this.u = { uTime: this.uTime, uPulse: { value: 0 } };
    const g = new THREE.PlaneGeometry(400, 400, 220, 220);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, floorH(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8a37a, roughness: 0.95 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uTime;\n' + NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= 0.7 + 0.5 * fbm2(vWp.xz * 0.3);
          // ripple marks
          diffuseColor.rgb *= 0.9 + 0.1 * sin(vWp.x * 3.0 + vnoise(vWp.xz * 0.5) * 4.0);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          // caustics
          vec2 cp = vWp.xz * 0.35;
          float c1 = worley(cp + vec2(uTime * 0.12, uTime * 0.05));
          float c2 = worley(cp * 1.3 - vec2(uTime * 0.08, -uTime * 0.1));
          float caus = pow(1.0 - min(c1, c2), 6.0);
          totalEmissiveRadiance += vec3(0.25, 0.55, 0.65) * caus * 0.9 * smoothstep(60.0, 5.0, length(vWp.xz - cameraPosition.xz));`);
    };
    const floor = new THREE.Mesh(g, mat);
    floor.receiveShadow = true;
    sc.add(floor);
    // rocks
    const r = rng(4);
    const rg = new THREE.IcosahedronGeometry(1, 1);
    const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) { const k = 0.75 + r() * 0.45; rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k * 0.7, rp.getZ(i) * k); }
    rg.computeVertexNormals();
    const rocks = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0x4a4a44, roughness: 0.9 }), 260);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300; const s = 0.3 + Math.pow(r(), 3) * 3; m.compose(new THREE.Vector3(x, floorH(x, z) - s * 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), new THREE.Vector3(s, s, s)); rocks.setMatrixAt(i, m); }
    rocks.castShadow = rocks.receiveShadow = true;
    sc.add(rocks);
    // sea grass / kelp strands
    const kelpG = new THREE.PlaneGeometry(0.25, 3, 1, 8);
    kelpG.translate(0, 1.5, 0);
    const kelpM = new THREE.MeshStandardMaterial({ color: 0x5f9a44, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x1d3a14 });
    kelpM.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = instanceMatrix[3].xyz; float hh = position.y / 3.0;
        transformed.x += sin(uTime * 1.2 + ip.x * 0.3 + hh * 2.0) * hh * hh * 0.6;
        transformed.z += cos(uTime * 0.9 + ip.z * 0.3) * hh * hh * 0.4;`);
    };
    const kelp = new THREE.InstancedMesh(kelpG, kelpM, 900);
    for (let i = 0; i < 900; i++) { const x = (r() - 0.5) * 160, z = (r() - 0.5) * 160; const s = 0.5 + r() * 1.4; m.compose(new THREE.Vector3(x, floorH(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s, s)); kelp.setMatrixAt(i, m); }
    sc.add(kelp);
    // the cable
    const pts = [];
    for (let x = -200; x <= 200; x += 4) pts.push(new THREE.Vector3(x, floorH(x, Math.sin(x * 0.02) * 6) + 0.12, Math.sin(x * 0.02) * 6));
    this.cableCurve = new THREE.CatmullRomCurve3(pts);
    const cg = new THREE.TubeGeometry(this.cableCurve, 600, 0.12, 10);
    const n = cg.attributes.position.count;
    const aU = new Float32Array(n);
    for (let i = 0; i < n; i++) aU[i] = Math.floor(i / 11) / 600;
    cg.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
    const cm = new THREE.MeshStandardMaterial({ color: 0x1d1a16, roughness: 0.45, metalness: 0.3 });
    cm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime; sh.uniforms.uPulse = this.u.uPulse;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; varying float vU;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vU; uniform float uTime; uniform float uPulse;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float ph = fract(vU * 6.0 - uTime * 0.45);
          float pulse = exp(-pow((ph - 0.5) * 40.0, 2.0)) * uPulse;
          float ph2 = fract(vU * 11.0 - uTime * 0.7 + 0.3);
          pulse += exp(-pow((ph2 - 0.5) * 60.0, 2.0)) * uPulse * 0.6;
          totalEmissiveRadiance += vec3(1.0, 0.75, 0.35) * pulse * 6.0;`);
    };
    this.cable = new THREE.Mesh(cg, cm);
    this.cable.castShadow = true;
    sc.add(this.cable);
    // god rays
    this.rays = new THREE.Group();
    const rayMat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.uTime },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x) * smoothstep(0.0, 0.7, vUv.y); a *= 0.5 + 0.5*sin(uTime*0.3 + vUv.x*7.0); gl_FragColor = vec4(vec3(0.3,0.6,0.7)*a*0.18, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 14; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(6 + r() * 8, 60), rayMat); pl.position.set((r() - 0.5) * 80, 25, (r() - 0.5) * 60 - 10); pl.rotation.set(0, r() * 3, 0.25); this.rays.add(pl); }
    sc.add(this.rays);
    // marine snow
    const sg = new THREE.BufferGeometry();
    const P = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) P.set([(r() - 0.5) * 80, r() * 30, (r() - 0.5) * 80], i * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9fc8d8, size: 0.06, transparent: true, opacity: 0.7 }));
    sc.add(this.snow);
    // fish school
    const fg = new THREE.ConeGeometry(0.12, 0.6, 5); fg.rotateZ(-Math.PI / 2);
    this.fish = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color: 0x7a9aa8, metalness: 0.6, roughness: 0.3 }), 160);
    this.fishSeeds = Array.from({ length: 160 }, () => [r(), r(), r()]);
    sc.add(this.fish);
    this.key = new THREE.DirectionalLight(0x8fd0e8, 1.8); this.key.position.set(10, 50, 10); this.key.castShadow = true;
    const kc = this.key.shadow.camera; kc.left = -40; kc.right = 40; kc.top = 40; kc.bottom = -40; kc.far = 120;
    sc.add(this.key);
    this.sun.visible = false;
    this.hemi.color.set(0x3a8aa8); this.hemi.groundColor.set(0x1a2a2a); this.hemi.intensity = 0.7;
  }
  nearFar() { return [0.05, 600]; }
  fx() { return { grade: 'cold', bloom: 1.0, bloomThreshold: 0.85, exposure: 1.15, vignette: 0.55 }; }
  update(shot, lt, vt) {
    const p = shot.p || {};
    this.uTime.value = vt;
    this.u.uPulse.value = p.pulse ?? 1;
    this.snow.position.y = -((vt * 0.3) % 10);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    this.fishSeeds.forEach(([a, b, c], i) => {
      const t = vt * 0.15 + a * 6.28;
      const x = Math.cos(t) * 25 + (b - 0.5) * 6, z = Math.sin(t) * 12 - 10 + (c - 0.5) * 6, y = 6 + Math.sin(t * 2 + b * 6) * 1.5 + c * 3;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -t - Math.PI / 2);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      this.fish.setMatrixAt(i, m);
    });
    this.fish.instanceMatrix.needsUpdate = true;
  }
}
