import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { NOISE } from '../world/glsl.js';
import { earthTexture, PLACES, CABLES, latLonToVec } from '../geo/geo.js';
import { clamp, lerp, rng, keys } from '../core/math.js';

const R = 10;
let EARTH_TEX = null;

function arcPoints(a, b, n = 64, lift = 0.02) {
  const va = new THREE.Vector3(...latLonToVec(...a)), vb = new THREE.Vector3(...latLonToVec(...b));
  const ang = va.angleTo(vb);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = new THREE.Vector3().copy(va).multiplyScalar(Math.sin((1 - u) * ang)).add(vb.clone().multiplyScalar(Math.sin(u * ang))).divideScalar(Math.sin(ang) || 1);
    const h = 1 + lift + Math.sin(u * Math.PI) * lift * 0.5 * Math.min(ang * 3, 2.5);
    pts.push(v.normalize().multiplyScalar(R * h));
  }
  return pts;
}

export class GlobeSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.sky.mesh.visible = false;
    sc.background = new THREE.Color(0x000000);
    sc.fog = null;
    if (!EARTH_TEX) {
      const c = earthTexture(4096, 2048);
      EARTH_TEX = new THREE.CanvasTexture(c);
      EARTH_TEX.colorSpace = THREE.NoColorSpace;
      EARTH_TEX.anisotropy = 8;
      EARTH_TEX.generateMipmaps = true;
    }
    this.u = {
      uMap: { value: EARTH_TEX },
      uSun: { value: new THREE.Vector3(0.6, 0.3, 0.75).normalize() },
      uTime: { value: 0 },
      uNight: { value: 0.12 },
      uCloud: { value: 0.55 },
      uRingK: { value: 0 },        // pressure wave: angular radius (radians), and strength
      uRingA: { value: 0 },
      uRings: { value: 1 },
      uVeil: { value: 0 },         // aerosol veil spread 0..1
      uVeilK: { value: 0 },
      uDark: { value: 0 },         // ash darkness spot
      uDarkR: { value: 0.03 },
      uKrak: { value: new THREE.Vector3(...latLonToVec(...PLACES.krakatoa)) },
      uMirror: { value: 0 },
      uStorm: { value: 0 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uFlow: { value: 0 },
    };
    const earthMat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vObj;
        void main(){ vObj = normalize(position); vN = normalize(mat3(modelMatrix)*normal); vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }`,
      fragmentShader: NOISE + /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uSun; uniform float uTime; uniform float uNight; uniform float uCloud;
        uniform float uRingK; uniform float uRingA; uniform float uRings; uniform float uVeil; uniform float uVeilK;
        uniform float uDark; uniform float uDarkR; uniform vec3 uKrak; uniform float uMirror; uniform float uStorm; uniform vec3 uTint; uniform float uFlow;
        varying vec3 vN; varying vec3 vW; varying vec3 vObj;
        vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){
          vec3 o = normalize(vObj);
          float lat = asin(clamp(o.y, -1.0, 1.0));
          float lon = atan(o.x, o.z);
          vec2 uv = vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.1415926);
          vec3 alb = toLin(texture2D(uMap, uv).rgb);
          vec3 N = normalize(vN);
          vec3 V = normalize(cameraPosition - vW);
          float ndl = dot(N, uSun);
          float day = smoothstep(-0.15, 0.25, ndl);
          // ocean specular
          float isOcean = step(alb.b, alb.g * 1.6 + 0.02) < 0.5 ? 1.0 : 0.0;
          isOcean = smoothstep(0.0, 0.05, alb.b - alb.r * 1.5);
          vec3 H = normalize(uSun + V);
          float nh = max(dot(N, H), 0.0); float spec = (pow(nh, 260.0) * 0.32 + pow(nh, 18.0) * 0.035) * isOcean;
          // clouds
          vec3 cp = o * 3.0 + vec3(uTime * 0.004, 0.0, uTime * 0.002);
          float cl = fbm3(cp * 1.6) ;
          cl = smoothstep(0.56 - uCloud * 0.1, 0.86, cl) * min(uCloud * 1.3, 0.85);
          // storms (weather haywire)
          if (uStorm > 0.0) {
            float sw = fbm3(o * 6.0 + vec3(sin(uTime*0.2), 0.0, cos(uTime*0.2)) * 0.5);
            cl = max(cl, smoothstep(0.55, 0.8, sw) * uStorm);
          }
          vec3 col = alb * (0.03 + 1.25 * max(ndl, 0.0)) ;
          col = mix(col, vec3(1.0) * (0.06 + 1.1 * max(ndl, 0.0)), cl * 0.9);
          col += vec3(1.0, 0.9, 0.75) * spec * day * (1.0 - cl);
          // night side faint
          col += alb * uNight * 0.35 * (1.0 - day);
          // ash darkness spot over the strait
          float dk = acos(clamp(dot(o, normalize(uKrak)), -1.0, 1.0));
          col *= 1.0 - uDark * smoothstep(uDarkR, uDarkR * 0.4, dk) * 0.9;
          // aerosol veil spreading in a band around the tropics then the planet
          if (uVeilK > 0.0) {
            float band = exp(-pow((lat - (-0.1)) / mix(0.08, 1.4, uVeil), 2.0));
            float lonD = abs(mod(lon - atan(uKrak.x, uKrak.z) + 3.14159, 6.28318) - 3.14159);
            float reach = smoothstep(uVeil * 3.4, uVeil * 3.4 - 0.6, lonD) ;
            float swirl = fbm3(o * 4.0 + vec3(uTime * 0.03, 0.0, 0.0));
            float v = band * max(reach, step(0.95, uVeil)) * (0.5 + 0.7 * swirl) * uVeilK;
            col = mix(col, vec3(0.78, 0.6, 0.42) * (0.06 + 0.85 * max(ndl, 0.0)), clamp(v * 0.75, 0.0, 0.5));
          }
          col *= uTint;
          // pressure wave rings (and antipodal reflections)
          if (uRingA > 0.0) {
            float a = dk;
            float k = 0.0;
            for (int i = 0; i < 8; i++) {
              if (float(i) >= uRings) break;
              float r = uRingK - float(i) * 3.14159;
              float rr = (mod(float(i), 2.0) < 0.5) ? r : 3.14159 - r;
              if (r > 0.0 && r < 3.14159) k += exp(-pow((a - rr) / 0.035, 2.0)) * (1.0 - float(i) * 0.1);
            }
            col += vec3(1.0, 0.82, 0.55) * k * uRingA * 2.5;
          }
          // circulation flow lines
          if (uFlow > 0.0) {
            float f = sin(lon * 3.0 + sin(lat * 6.0) * 1.5 - uTime * 0.8 + lat * 8.0);
            float lines = smoothstep(0.92, 1.0, f) * (0.5 + 0.5 * sin(lat * 3.0));
            col += vec3(0.3, 0.75, 1.0) * lines * uFlow * 0.9;
          }
          // atmosphere rim inside
          float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          col += vec3(0.25, 0.5, 1.0) * fr * (0.15 + 0.85 * day) * 0.8;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 100), earthMat);
    this.globe = new THREE.Group();
    this.globe.add(this.earth);
    sc.add(this.globe);
    // atmosphere glow shell
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: { uSun: this.u.uSun, uMirror: this.u.uMirror, uVeilK: this.u.uVeilK },
        vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.0);}`,
        fragmentShader: `uniform vec3 uSun; uniform float uMirror; uniform float uVeilK; varying vec3 vN; varying vec3 vW;
          void main(){ vec3 V = normalize(cameraPosition - vW); float f = 1.0 - max(dot(normalize(vN), V), 0.0); float rim = pow(f, 2.2) * smoothstep(1.0, 0.75, f);
            float day = smoothstep(-0.4, 0.4, dot(normalize(vN), uSun));
            vec3 c = mix(vec3(0.3, 0.55, 1.0), vec3(0.95, 0.7, 0.45), uVeilK * 0.6) * rim * (0.3 + 1.6 * day);
            c += vec3(1.0, 0.85, 0.5) * uMirror * rim * 1.5 * day;
            gl_FragColor = vec4(c, rim); }`,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      }),
    );
    this.globe.add(atm);
    // haze "mirror" shell (sulfur aerosols reflecting sunlight)
    this.mirror = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.025, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: { uSun: this.u.uSun, uMirror: this.u.uMirror, uTime: this.u.uTime },
        vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.0);}`,
        fragmentShader: NOISE + `uniform vec3 uSun; uniform float uMirror; uniform float uTime; varying vec3 vN; varying vec3 vW;
          void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 H = normalize(uSun + V);
            float s = pow(max(dot(N,H),0.0), 18.0); float n = fbm3(N*5.0 + uTime*0.02);
            float a = uMirror * (0.25 + 0.5*n) * smoothstep(-0.1, 0.4, dot(N,uSun));
            gl_FragColor = vec4(vec3(1.0,0.88,0.66)*(a*0.32 + s*uMirror*0.8), a*0.4); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.globe.add(this.mirror);
    // cables
    this.cableMat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.u.uTime, uProg: { value: 1 }, uCol: { value: new THREE.Vector3(1.0, 0.7, 0.3) }, uK: { value: 1 } },
      vertexShader: `attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float uTime; uniform float uProg; uniform vec3 uCol; uniform float uK; varying float vU;
        void main(){ if (vU > uProg) discard; float dash = 0.55 + 0.45 * sin(vU * 120.0 - uTime * 6.0); gl_FragColor = vec4(uCol * (1.2 + dash * 1.6) * uK, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.cables = new THREE.Group();
    for (const [a, b] of CABLES) {
      const pts = arcPoints(PLACES[a], PLACES[b], 48, 0.006);
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 48, 0.018, 4, false);
      const n = g.attributes.position.count;
      const aU = new Float32Array(n);
      for (let i = 0; i < n; i++) aU[i] = Math.floor(i / 5) / 48;
      g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
      this.cables.add(new THREE.Mesh(g, this.cableMat));
    }
    this.globe.add(this.cables);
    // highlighted route / arcs (dynamic)
    this.arcMat = new THREE.ShaderMaterial({
      uniforms: { uProg: { value: 0 }, uCol: { value: new THREE.Vector3(1, 0.4, 0.15) }, uHead: { value: 1 } },
      vertexShader: `attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float uProg; uniform vec3 uCol; uniform float uHead; varying float vU;
        void main(){ if (vU > uProg) discard; float h = exp(-pow((uProg - vU) * 30.0, 2.0)) * uHead; gl_FragColor = vec4(uCol * (2.0 + h * 10.0), 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.arcs = new THREE.Group();
    this.globe.add(this.arcs);
    this.arcCache = new Map();
    // city dots
    this.dots = new THREE.Group();
    this.globe.add(this.dots);
    this.dotGeo = new THREE.SphereGeometry(0.05, 10, 8);
    this.dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) });
    // stars
    const r = rng(8);
    const sg = new THREE.BufferGeometry();
    const P = new Float32Array(5000 * 3), C = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000; i++) {
      const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(800);
      P.set([v.x, v.y, v.z], i * 3);
      const b = 0.3 + r() * 1.2;
      C.set([b, b * (0.9 + r() * 0.1), b * (0.85 + r() * 0.2)], i * 3);
    }
    sg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(C, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true }));
    sc.add(this.stars);
    // sun glare sprite
    this.sunSprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv-0.5)*2.0; float g = exp(-d*d*18.0)*8.0 + exp(-d*4.0)*0.6; gl_FragColor = vec4(vec3(1.0,0.92,0.8)*g, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.sunSprite.visible = false;
    sc.add(this.sunSprite);
    // satellites (modern finale)
    this.sats = new THREE.Group();
    const satMat = new THREE.MeshStandardMaterial({ color: 0xcfd6de, metalness: 0.7, roughness: 0.3 });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1b3d8f, metalness: 0.4, roughness: 0.25, emissive: 0x050a20 });
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Group();
      s.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), satMat));
      const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.01, 0.14), panelMat);
      s.add(pnl);
      s.userData = { inc: r() * Math.PI, ph: r() * 6.28, rad: R * (1.15 + r() * 0.4), sp: 0.05 + r() * 0.05 };
      this.sats.add(s);
    }
    this.sats.visible = false;
    sc.add(this.sats);
    this.sunL = new THREE.DirectionalLight(0xffffff, 2.5);
    sc.add(this.sunL);
    this.sun.visible = false;
    this.hemi.intensity = 0.1;
  }

  nearFar() { return [0.05, 3000]; }
  fx() { return { grade: 'space', bloom: 0.9, bloomThreshold: 0.95, exposure: 1.0, vignette: 0.5 }; }

  arc(id, a, b, lift = 0.05) {
    if (!this.arcCache.has(id)) {
      const pts = arcPoints(a, b, 96, lift);
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 96, 0.035, 5, false);
      const n = g.attributes.position.count;
      const aU = new Float32Array(n);
      for (let i = 0; i < n; i++) aU[i] = Math.floor(i / 6) / 96;
      g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
      const m = new THREE.Mesh(g, this.arcMat.clone());
      this.arcCache.set(id, m);
      this.arcs.add(m);
    }
    return this.arcCache.get(id);
  }

  prepare(shot) {
    const p = shot.p || {};
    for (const m of this.arcCache.values()) m.visible = false;
    for (const a of p.arcs || []) this.arc(a.id, PLACES[a.from] || a.from, PLACES[a.to] || a.to, a.lift ?? 0.05).visible = true;
    this.dots.clear();
    for (const name of p.dots || []) {
      const d = new THREE.Mesh(this.dotGeo, this.dotMat);
      d.position.set(...latLonToVec(...(PLACES[name] || name), R * 1.004));
      this.dots.add(d);
    }
    this.sats.visible = !!p.sats;
    this.sunSprite.visible = !!p.sunGlare;
  }

  // Orient the globe so (lat, lon) faces +Z (towards the default camera)
  orient(lat, lon, tilt = 0) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((lat * Math.PI) / 180, (-lon * Math.PI) / 180, 0, 'XYZ'));
    const qt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (tilt * Math.PI) / 180);
    this.globe.quaternion.copy(qt.multiply(q));
  }

  update(shot, lt, vt) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    const U = this.u;
    U.uTime.value = vt;
    const ll = p.ll ? (Array.isArray(p.ll[0]) ? keys(p.ll.map((v, i) => [i / (p.ll.length - 1), v]), u, p.llEase ?? 'inOut') : p.ll) : [10, 60];
    this.orient(ll[0], ll[1], p.tilt ?? 0);
    const sunAng = ((p.sunAz ?? 35) * Math.PI) / 180;
    U.uSun.value.set(Math.sin(sunAng), p.sunY ?? 0.25, Math.cos(sunAng)).normalize();
    this.sunL.position.copy(U.uSun.value).multiplyScalar(100);
    U.uCloud.value = val(p.cloud, u, lt, 0.5);
    U.uNight.value = p.night ?? 0.15;
    U.uRingA.value = val(p.ringA, u, lt, 0);
    U.uRingK.value = val(p.ringK, u, lt, 0);
    U.uRings.value = p.rings ?? 1;
    U.uVeil.value = val(p.veil, u, lt, 0);
    U.uVeilK.value = val(p.veilK, u, lt, 0);
    U.uDark.value = val(p.dark, u, lt, 0);
    U.uDarkR.value = p.darkR ?? 0.03;
    U.uMirror.value = val(p.mirror, u, lt, 0);
    U.uStorm.value = val(p.storm, u, lt, 0);
    U.uFlow.value = val(p.flow, u, lt, 0);
    this.cables.visible = (p.cables ?? 0) > 0;
    this.cableMat.uniforms.uProg.value = val(p.cables, u, lt, 0);
    this.cableMat.uniforms.uK.value = p.cableK ?? 1;
    for (const a of p.arcs || []) {
      const m = this.arcCache.get(a.id);
      const s = a.start ?? 0, d = a.dur ?? 1.5;
      m.material.uniforms.uProg.value = clamp((lt - s) / d);
      if (a.col) m.material.uniforms.uCol.value.set(...a.col);
    }
    if (this.sats.visible) {
      for (const s of this.sats.children) {
        const d = s.userData;
        const a = d.ph + vt * d.sp;
        s.position.set(Math.cos(a) * d.rad, Math.sin(a) * Math.sin(d.inc) * d.rad, Math.sin(a) * Math.cos(d.inc) * d.rad);
        s.lookAt(0, 0, 0);
      }
    }
    if (this.sunSprite.visible) {
      this.sunSprite.position.copy(U.uSun.value).multiplyScalar(400);
      this.sunSprite.scale.setScalar(p.sunGlare * 120);
      this.sunSprite.lookAt(this.engine.camera.position);
    }
  }

  // screen position of a lat/lon on the current globe orientation
  worldOf(lat, lon, h = 1.005) {
    const v = new THREE.Vector3(...latLonToVec(lat, lon, R * h));
    return v.applyQuaternion(this.globe.quaternion);
  }
}

export const GLOBE_R = R;
