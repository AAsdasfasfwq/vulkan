import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { NOISE } from '../world/glsl.js';
import { PuffCloud, StreakCloud } from '../world/particles.js';
import { makeEruption, columnEmitter, bombEmitter, lightningEmitter } from '../world/eruption.js';
import { makeCrownGeometry } from '../world/plants.js';
import { clamp, lerp, rng } from '../core/math.js';

// Geological cut-away block through Krakatoa. Front (cut) face at z = 0.
// Section space: x in [-40, 40], y in [-44, 12]; sea level y = 0.
const SECTION = /* glsl */ `
uniform float uTime;
uniform float uShift;      // plate motion phase
uniform float uFill;       // chamber fill 0..1
uniform float uPressure;   // 0..1 glow pulse
uniform float uCracks;     // 0..1 roof cracks
uniform float uWater;      // 0..1 sea water ingress
uniform float uSteam;      // 0..1 steam in chamber
uniform float uCollapse;   // 0..1 roof collapse
uniform float uPlug;       // 0..1 hardened plug in vent
uniform float uMagmaGen;   // 0..1 rising diapirs
uniform float uCrystals;   // 0..1
uniform float uBubbles;    // 0..1
uniform float uVent;       // 0..1 magma up the conduit (eruption)
uniform float uCone;       // cone height scale (Anak / destroyed)
uniform float uStrain;     // 0..1 red strain lines in crust
uniform float uSlide;      // 0..1 flank landslide
uniform float uCity;       // 0..1 city crust (finale)
uniform float uHighlight;  // 0 none, 1 slab, 2 eurasian, 3 chamber
uniform float uDim;

float seaFloor(float x) { return -4.0 + sin(x * 0.21) * 0.3 + sin(x * 0.53) * 0.15; }
float coneTop(float x) {
  float h = (14.0 * uCone) * max(0.0, 1.0 - abs(x) / 12.0) - 4.0;
  // crater
  h -= 1.2 * uCone * smoothstep(1.6, 0.0, abs(x));
  return h;
}
float slabTop(float x) { return x < -16.0 ? -4.4 : -4.4 - (x + 16.0) * 0.55 - pow(max(x + 16.0, 0.0), 2.0) * 0.004; }
vec3 strata(float y, float x, vec3 a, vec3 b) {
  float s = sin(y * 3.1 + vnoise(vec2(x * 0.15, y * 0.6)) * 2.5);
  return mix(a, b, smoothstep(-0.2, 0.9, s));
}
vec4 section(vec2 p) {
  float x = p.x, y = p.y;
  float sf = seaFloor(x);
  float collapseDrop = uCollapse * 7.0;
  float ct = coneTop(x);
  bool inRoof = abs(x) < 9.0 && y > -8.0;
  if (inRoof) ct -= collapseDrop * smoothstep(9.0, 4.0, abs(x));
  float ground = max(sf, ct);
  // sky above cone: transparent
  if (y > ground && y > 0.0) return vec4(0.0);
  vec3 col;
  if (y > ground) {
    // water column
    float d = clamp((0.0 - y) / 6.0, 0.0, 1.0);
    col = mix(vec3(0.05, 0.42, 0.62), vec3(0.01, 0.12, 0.3), d);
    col += 0.05 * vnoise(vec2(x * 0.5 + uTime * 0.3, y * 2.0));
    return vec4(col, 0.92);
  }
  // mantle
  float m = fbm2(vec2(x * 0.07 + uTime * 0.01, y * 0.09 - uTime * 0.02));
  col = mix(vec3(0.62, 0.2, 0.04), vec3(0.22, 0.03, 0.01), smoothstep(-14.0, -44.0, y));
  col *= 0.7 + 0.5 * m;
  col += vec3(0.25, 0.06, 0.0) * smoothstep(0.55, 0.8, fbm2(vec2(x * 0.15 - uTime * 0.03, y * 0.2)));
  float glowM = 0.0;
  // Eurasian continental crust (right / centre)
  float eurBottom = -15.0 - 2.0 * smoothstep(-10.0, 30.0, x);
  bool eur = x > -15.0 + (y + 4.0) * 0.4 && y > eurBottom && y < sf + 0.001;
  // Indo-Australian oceanic slab
  float st = slabTop(x);
  float slabTh = 5.0;
  bool slab = y < st && y > st - slabTh;
  if (eur) {
    col = strata(y, x, vec3(0.55, 0.42, 0.28), vec3(0.42, 0.3, 0.2));
    col *= 0.85 + 0.25 * vnoise(vec2(x * 0.4, y * 0.4));
    if (uHighlight == 2.0) col = mix(col, vec3(0.95, 0.75, 0.35), 0.35 + 0.15 * sin(uTime * 4.0));
  }
  if (slab) {
    float along = x * 0.88 - y * 0.47 + uShift * 3.0;
    float stripes = smoothstep(0.45, 0.5, fract(along * 0.12));
    col = mix(vec3(0.22, 0.26, 0.32), vec3(0.3, 0.34, 0.4), stripes);
    col *= 0.85 + 0.25 * vnoise(vec2(along * 0.5, y));
    // heating as it sinks
    col = mix(col, vec3(0.9, 0.3, 0.05), smoothstep(-18.0, -34.0, y) * 0.6);
    if (uHighlight == 1.0) col = mix(col, vec3(0.4, 0.75, 1.0), 0.35 + 0.15 * sin(uTime * 4.0));
  }
  // cone / volcanic edifice layers
  if (y <= ct && y > sf - 0.5 && abs(x) < 12.0) {
    col = strata(y, x, vec3(0.3, 0.27, 0.25), vec3(0.2, 0.18, 0.17));
    if (y > ct - 0.6 && y > 0.0 && uCone > 0.3 && uCity < 0.5) col = mix(col, vec3(0.12, 0.42, 0.08), 0.85); // jungle skin
  }
  // seabed sediment line
  if (abs(y - sf) < 0.35 && !(abs(x) < 12.0 && ct > sf)) col = vec3(0.6, 0.52, 0.36);
  // magma generation zone + rising diapirs
  if (uMagmaGen > 0.0) {
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float ph = fract(uTime * 0.05 + fi * 0.13);
      vec2 c = vec2(mix(14.0, 2.0, ph) + sin(fi * 2.3) * 4.0, mix(-26.0, -14.0, ph) + sin(fi * 1.7) * 1.5);
      float r = 1.1 + 0.6 * sin(fi);
      float d = length(p - c) - r;
      if (d < 0.0 && !slab) { col = mix(col, vec3(1.0, 0.42, 0.05) * 1.15, uMagmaGen); glowM = max(glowM, uMagmaGen * 1.0); }
    }
    float mz = smoothstep(4.0, 0.0, abs(y - (st + 1.5))) * step(0.0, x) * step(x, 26.0);
    col = mix(col, vec3(1.0, 0.4, 0.05) * 1.3, mz * uMagmaGen * 0.6);
  }
  // magma chamber
  vec2 cc = vec2(0.0, -11.0 - uCollapse * 0.0);
  vec2 q = (p - cc) / vec2(9.0, 3.4);
  float ce = length(q);
  float strainLines = 0.0;
  if (uStrain > 0.0 && ce > 1.0 && ce < 2.2) {
    float a = atan(q.y, q.x);
    strainLines = smoothstep(0.08, 0.0, abs(fract(ce * 4.0 - uTime * 0.6) - 0.5) - 0.42) * smoothstep(2.2, 1.0, ce) * uStrain;
    col = mix(col, vec3(1.0, 0.25, 0.1), strainLines * 0.6);
  }
  float level = mix(-14.4, -7.6, uFill);
  if (ce < 1.0) {
    float n = fbm2(vec2(x * 0.35 + uTime * 0.2, y * 0.5 - uTime * 0.15));
    vec3 lava = mix(vec3(0.95, 0.22, 0.02), vec3(1.0, 0.6, 0.12), n * n) * (1.05 + uPressure * 0.9 * (0.5 + 0.5 * sin(uTime * 5.0)));
    lava *= 0.75 + 0.35 * smoothstep(1.0, 0.2, ce);
    if (y < level) { col = lava; glowM = 1.0 + uPressure; }
    else col = vec3(0.12, 0.08, 0.06); // empty (drained) roof space
    // crystals
    if (uCrystals > 0.0 && y < level) {
      vec2 g = p * vec2(1.6, 2.2);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash12(id);
      if (h < uCrystals * 0.5) {
        float k = max(abs(f.x * 1.4 + f.y * 0.5), abs(f.y * 1.2 - f.x * 0.3));
        if (k < 0.22 * (0.6 + h)) col = mix(vec3(0.85, 0.9, 0.95), vec3(0.4, 0.45, 0.5), step(0.3, h));
      }
    }
    // gas bubbles rising
    if (uBubbles > 0.0 && y < level && ce < 1.0) {
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float ph = fract(uTime * (0.12 + 0.05 * sin(fi)) + fi * 0.37);
        vec2 bc = vec2(sin(fi * 7.1) * 7.0, mix(-14.0, level, ph));
        float d = length(p - bc);
        float rr = 0.35 + 0.25 * fract(fi * 0.71);
        if (d < rr) col = mix(col, vec3(1.0, 0.85, 0.55) * 1.4, uBubbles * smoothstep(rr, rr * 0.6, d) * 0.8);
      }
    }
    // steam
    if (uSteam > 0.0) {
      float s = fbm2(vec2(x * 0.3 - uTime * 0.4, y * 0.6 + uTime * 0.3));
      col = mix(col, vec3(0.92, 0.93, 0.96) * 1.15, uSteam * smoothstep(0.35, 0.75, s) * 0.9);
      glowM += uSteam * 0.5;
    }
  }
  // conduit
  float conduitTop = coneTop(0.0);
  if (abs(x) < 0.9 + y * 0.0 && y > -8.0 && y < conduitTop + 0.5 && ce >= 1.0) {
    float filled = mix(-8.0, conduitTop, uVent);
    if (y < filled) { col = vec3(1.0, 0.42, 0.05) * 1.3; glowM = 1.0; }
    else col = vec3(0.16, 0.13, 0.12);
    if (uPlug > 0.0 && y > conduitTop - 3.5 * uPlug) col = vec3(0.1, 0.09, 0.09) + 0.05 * vnoise(p * 3.0);
  }
  // roof cracks
  if (uCracks > 0.0 && abs(x) < 10.0 && y > -9.0 && y < max(sf, ct)) {
    float cr = 1.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float cx = -6.0 + fi * 3.0 + sin(y * 1.3 + fi * 4.0) * 0.8 + sin(y * 4.1 + fi) * 0.25;
      cr = min(cr, abs(x - cx));
    }
    float reach = mix(-8.0, 2.0, uCracks);
    float k = smoothstep(0.18, 0.0, cr) * step(y, reach);
    col = mix(col, vec3(1.0, 0.45, 0.08) * 1.4, k * (1.0 - uWater));
    col = mix(col, vec3(0.2, 0.6, 1.0) * 1.4, k * uWater);
    glowM = max(glowM, k * 1.2);
  }
  // water rushing in
  if (uWater > 0.0 && ce < 1.25 && y > level - 1.0) {
    float w = fbm2(vec2(x * 0.5, y * 0.8 + uTime * 2.0));
    float reach = mix(-6.0, -14.0, uWater);
    if (y > reach) col = mix(col, vec3(0.2, 0.55, 0.95) * (0.9 + w), uWater * smoothstep(0.3, 0.6, w) * 0.85);
  }
  // landslide (Anak 2018)
  if (uSlide > 0.0 && x < -1.0 && x > -12.0) {
    float sy = ct - (x + 1.0) * -0.3;
    if (y < ct && y > ct - 2.0 * uSlide && x < -2.0) col = mix(col, vec3(0.45, 0.35, 0.25), 0.8);
  }
  // city crust highlight (thin crust over fire)
  if (uCity > 0.0 && y > sf - 2.5 && y <= sf + 0.001) col = mix(col, vec3(0.3, 0.3, 0.32), uCity * 0.6);
  return vec4(col * (1.0 - uDim * 0.6), 1.0 + glowM);
}
`;

export class XSectionSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.sky.mesh.visible = false;
    sc.background = new THREE.Color(0x0b0d12);
    this.u = {
      uTime: { value: 0 }, uShift: { value: 0 }, uFill: { value: 0.8 }, uPressure: { value: 0 }, uCracks: { value: 0 }, uWater: { value: 0 },
      uSteam: { value: 0 }, uCollapse: { value: 0 }, uPlug: { value: 0 }, uMagmaGen: { value: 0 }, uCrystals: { value: 0 }, uBubbles: { value: 0 },
      uVent: { value: 0 }, uCone: { value: 1 }, uStrain: { value: 0 }, uSlide: { value: 0 }, uCity: { value: 0 }, uHighlight: { value: 0 }, uDim: { value: 0 },
    };
    // front cut face
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 56, 1, 1).translate(0, -16, 0),
      new THREE.ShaderMaterial({
        uniforms: this.u,
        vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: NOISE + SECTION + /* glsl */ `
          varying vec2 vP;
          void main(){
            vec4 s = section(vP);
            if (s.a <= 0.0) discard;
            float glow = max(s.a - 1.0, 0.0);
            vec3 c = s.rgb;
            // edge darkening at block boundary
            float e = smoothstep(0.0, 0.6, min(min(vP.x + 40.0, 40.0 - vP.x), vP.y + 44.0));
            c *= 0.55 + 0.45 * e;
            gl_FragColor = vec4(c, 1.0);
          }`,
        transparent: false,
      }),
    );
    sc.add(face);
    this.face = face;
    // block sides (strata only), top water, back
    const sideMat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }`,
      fragmentShader: NOISE + /* glsl */ `
        uniform float uTime; varying vec3 vW;
        void main(){
          float y = vW.y;
          vec3 c;
          if (y > -4.0) c = mix(vec3(0.04,0.35,0.55), vec3(0.01,0.12,0.3), clamp(-y/4.0,0.0,1.0));
          else if (y > -15.0) c = mix(vec3(0.5,0.38,0.25), vec3(0.38,0.27,0.18), 0.5+0.5*sin(y*3.1 + vnoise(vW.zx*0.2)*2.0));
          else c = mix(vec3(0.8,0.26,0.05), vec3(0.4,0.06,0.02), smoothstep(-15.0,-44.0,y)) * (0.8 + 0.4*fbm2(vW.zy*0.08));
          c *= 0.62;
          gl_FragColor = vec4(c,1.0);
        }`,
    });
    const side = new THREE.Mesh(new THREE.PlaneGeometry(36, 48), sideMat);
    side.geometry.translate(0, -20, 0);
    const sideR = side.clone();
    side.rotation.y = -Math.PI / 2; side.position.set(-40, 0, -18);
    sideR.rotation.y = Math.PI / 2; sideR.position.set(40, 0, -18);
    sc.add(side, sideR);
    // top water slab surface
    const waterMat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }`,
      fragmentShader: NOISE + `uniform float uTime; varying vec3 vW;
        void main(){
          float n = fbm2(vW.xz*0.25 + uTime*0.15);
          float d = length(vW.xz - vec2(0.0, 0.0));
          vec3 c = mix(vec3(0.03,0.32,0.55), vec3(0.08,0.55,0.7), smoothstep(13.0, 9.0, d));
          c += vec3(0.25,0.3,0.32)*smoothstep(0.62,0.8,n);
          c += vec3(0.6) * smoothstep(9.2, 8.6, d) * smoothstep(8.0, 8.6, d) * 0.6;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 36), waterMat);
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0, -18);
    sc.add(water);
    this.water = water;
    // half cone (island above water), lathe opened towards the camera
    this.coneGroup = new THREE.Group();
    sc.add(this.coneGroup);
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const r = 8.6 * (1 - u) + 0.0001;
      let y = 10 * u;
      if (r < 1.6) y -= 1.2 * (1 - r / 1.6);
      pts.push(new THREE.Vector2(Math.max(r, 0.01), y));
    }
    const coneGeo = new THREE.LatheGeometry(pts, 40, Math.PI / 2, Math.PI);
    const cc = new Float32Array(coneGeo.attributes.position.count * 3);
    for (let i = 0; i < coneGeo.attributes.position.count; i++) {
      const y = coneGeo.attributes.position.getY(i);
      const k = y > 7.5 ? 0.0 : 1.0;
      const c = k ? [0.1, 0.36, 0.07] : [0.3, 0.26, 0.22];
      cc.set(c, i * 3);
    }
    coneGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    this.cone = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
    this.coneGroup.add(this.cone);
    // trees on the cone
    const r = rng(3);
    const tg = makeCrownGeometry();
    const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), 260);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let n = 0;
    while (n < 260) {
      const a = Math.PI / 2 + r() * Math.PI; // back half
      const rr = 1.8 + r() * 6.6;
      const y = 10 * (1 - rr / 8.6);
      if (y > 7.2) continue;
      const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      if (z > -0.4) continue;
      const s = 0.5 + r() * 0.5;
      m.makeScale(s, s, s).setPosition(x, y - 0.1, z);
      tm.setMatrixAt(n, m);
      col.setRGB(0.08 + r() * 0.1, 0.3 + r() * 0.15, 0.05);
      tm.setColorAt(n, col);
      n++;
    }
    this.trees = tm;
    this.coneGroup.add(tm);
    // city top (finale)
    this.city = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.4, metalness: 0.3, emissive: 0x111111 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });
    for (let i = 0; i < 70; i++) {
      const w = 1 + r() * 2.2, h = 1.5 + Math.pow(r(), 2) * 14, d = 1 + r() * 2.2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bm);
      b.position.set((r() - 0.5) * 70, h / 2, -2 - r() * 32);
      this.city.add(b);
      const wn = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, h * 0.85), winMat);
      wn.position.set(b.position.x, h / 2, b.position.z + d / 2 + 0.01);
      wn.material = winMat;
      this.city.add(wn);
    }
    this.city.visible = false;
    sc.add(this.city);
    // eruption plume above the cone
    this.puffs = new PuffCloud(1600);
    this.E = makeEruption();
    this.puffs.emitters.push(columnEmitter(this.E));
    this.sparks = new StreakCloud(1000);
    this.sparks.emitters.push(bombEmitter(this.E), lightningEmitter(this.E));
    sc.add(this.puffs.mesh, this.sparks.mesh);
    // lights
    this.key = new THREE.DirectionalLight(0xfff1e0, 2.2);
    this.key.position.set(30, 50, 40);
    this.key.castShadow = false;
    sc.add(this.key);
    this.sun.visible = false;
    this.hemi.intensity = 0.8;
    this.hemi.color.set(0x8899bb); this.hemi.groundColor.set(0x332211);
    this.glow = new THREE.PointLight(0xff6a20, 0, 60, 1.5);
    this.glow.position.set(0, -6, 6);
    sc.add(this.glow);
    this.scene.fog = null;
    // dust motes background
    const g = new THREE.BufferGeometry();
    const P = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) P.set([(r() - 0.5) * 220, (r() - 0.5) * 140, -40 - r() * 120], i * 3);
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x556070, size: 0.5, transparent: true, opacity: 0.6 }));
    sc.add(this.motes);
    this.bgCol = new THREE.Color();
  }

  nearFar() { return [0.3, 2000]; }
  fx() { return { grade: 'film', bloom: 0.85, bloomThreshold: 1.0, exposure: 1.0, vignette: 0.55 }; }

  prepare(shot) {
    const p = shot.p || {};
    this.scene.background = new THREE.Color(p.bg ?? 0x0b0d12);
    this.city.visible = !!p.city;
    this.coneGroup.visible = !p.city;
  }

  update(shot, lt, vt) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    const U = this.u;
    U.uTime.value = vt;
    U.uShift.value = vt * (p.plateSpeed ?? 0.25);
    for (const [k, name, def] of [['fill', 'uFill', 0.85], ['pressure', 'uPressure', 0], ['cracks', 'uCracks', 0], ['water', 'uWater', 0], ['steam', 'uSteam', 0], ['collapse', 'uCollapse', 0], ['plug', 'uPlug', 0], ['magma', 'uMagmaGen', 0], ['crystals', 'uCrystals', 0], ['bubbles', 'uBubbles', 0], ['vent', 'uVent', 0], ['cone', 'uCone', 1], ['strain', 'uStrain', 0], ['slide', 'uSlide', 0], ['cityK', 'uCity', 0], ['hl', 'uHighlight', 0], ['dim', 'uDim', 0]])
      U[name].value = val(p[k], u, lt, def);
    if (p.city) U.uCity.value = 1;
    const cone = U.uCone.value;
    this.coneGroup.scale.set(1, Math.max(cone - U.uCollapse.value * 0.7, 0.001), 1);
    this.coneGroup.position.y = -U.uCollapse.value * 0.5;
    this.trees.visible = !p.bare;
    this.cone.material.color.setRGB(1, 1, 1);
    this.glow.intensity = (60 + U.uPressure.value * 140) * (p.glowK ?? 1);
    // eruption plume
    const ep = p.erupt;
    this.E.on = !!ep;
    if (ep) {
      Object.assign(this.E, { c: [0, 9.5 * cone, -2], height: val(ep.height, u, lt, 40), intensity: val(ep.intensity, u, lt, 1), baseW: 1.0, topW: 9, rise: ep.rise ?? 4, t0: ep.t0 !== undefined ? shot.t + ep.t0 : -1e6, dark: ep.dark ?? 0.14, glow: 1.2, wind: [0.15, 0], size: 0.03, bombs: val(ep.bombs, u, lt, 0), bombSpeed: 14, lightning: 0, count: 900, umbrella: val(ep.umbrella, u, lt, 0.3), umbrellaR: 30, tint: [1, 0.93, 0.86] });
    }
    const PU = this.puffs.uniforms;
    PU.uSunDir.value.set(0.4, 0.8, 0.45).normalize();
    PU.uSunCol.value.set(1.2, 1.1, 1.0);
    PU.uAmb.value.set(0.25, 0.27, 0.32);
    PU.uFogDensity.value = 0;
    this.motes.position.y = Math.sin(vt * 0.1) * 2;
  }

  afterCamera(shot, lt, vt, cam) {
    this.puffs.update(vt, cam.position);
    this.sparks.update(vt);
  }
}

// Label anchors (section space -> world) used by overlays.
export const XS = {
  chamber: [0, -11, 0], slab: [-26, -7, 0], slabDeep: [18, -22, 0], eurasian: [24, -9, 0], mantle: [-20, -30, 0],
  vent: [0, 3, 0], crater: [0, 9.5, 0], plug: [0, 8, 0], seafloor: [-30, -4, 0], sea: [-30, -1.5, 0], magmaGen: [10, -22, 0],
  roof: [0, -6.5, 0], island: [0, 6, -4],
};
