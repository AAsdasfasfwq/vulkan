import * as THREE from 'three';
import { makeNoise, clamp, smoothstep, lerp, rng } from '../core/math.js';
import { NOISE } from './glsl.js';

// Krakatoa, 1883. Units: metres. North = -Z, East = +X.
// Rakata (south, 813 m), Danan (middle, ~450 m), Perboewatan (north, ~120 m).
const nz = makeNoise(18830827);

const cone = (x, z, cx, cz, H, R, p = 1.6) => {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= R) return 0;
  return H * Math.pow(1 - d / R, p);
};

export const PEAKS = {
  rakata: [150, 2300, 813],
  danan: [-250, -200, 450],
  perboewatan: [250, -2500, 122],
  anak: [-150, -900, 0],
};

export function islandHeight(x, z, st = {}) {
  const destroyed = st.destroyed ?? 0;
  // Ragged elongated base
  const ax = x / 2600, az = (z + 50) / 4700;
  let r = Math.hypot(ax, az);
  const ang = Math.atan2(az, ax);
  r += nz.fbm2(Math.cos(ang) * 1.3 + 3, Math.sin(ang) * 1.3 - 1, 4) * 0.28 + nz.n2(x * 0.0012, z * 0.0012) * 0.08;
  let base = (1 - smoothstep(0.82, 1.12, r)) * 38 - smoothstep(0.95, 1.8, r) * 90 - 6;

  let h = base;
  // radial erosion gullies on the cones
  const gully = (cx, cz, R) => {
    const a = Math.atan2(z - cz, x - cx), d = Math.hypot(x - cx, z - cz) / R;
    return (nz.n2(a * 7.0, d * 2.5) * 0.5 + nz.n2(a * 17.0, d * 5) * 0.25) * smoothstep(0.05, 0.4, d) * (1 - smoothstep(0.7, 1.0, d));
  };
  const rak = cone(x, z, PEAKS.rakata[0], PEAKS.rakata[1], 813, 2500, 1.45) * (1 + gully(PEAKS.rakata[0], PEAKS.rakata[1], 2500) * 0.25);
  const dan = cone(x, z, PEAKS.danan[0], PEAKS.danan[1], 450, 2000, 1.5) * (1 + gully(PEAKS.danan[0], PEAKS.danan[1], 2000) * 0.25);
  const per = cone(x, z, PEAKS.perboewatan[0], PEAKS.perboewatan[1], 122, 1300, 1.3);
  h = Math.max(h, base + rak, base + dan, base + per);
  // saddle ridge between the peaks
  const ridgeD = Math.abs(x + 60 + Math.sin(z * 0.001) * 150) / 900;
  if (z > -2800 && z < 2600) h = Math.max(h, base + 80 * Math.max(0, 1 - ridgeD) * (1 - smoothstep(1800, 2700, Math.abs(z - 0))));
  // craters
  const crater = (cx, cz, R, D, k) => {
    const d = Math.hypot(x - cx, z - cz) / R;
    if (d < 1) h -= D * (1 - d * d) * k;
  };
  crater(PEAKS.perboewatan[0], PEAKS.perboewatan[1], 260, 70, st.craterP ?? 0.6);
  crater(PEAKS.danan[0], PEAKS.danan[1], 220, 60, st.craterD ?? 0.4);
  crater(PEAKS.rakata[0], PEAKS.rakata[1], 140, 40, 0.3);
  // fine detail
  h += nz.fbm2(x * 0.004, z * 0.004, 4) * 12 * smoothstep(0, 60, h);

  if (destroyed > 0) {
    // Only the southern half of Rakata survives, cut by a sheer cliff.
    const cut = 1650 + nz.fbm2(x * 0.0015, 7.7, 3) * 260 + Math.abs(x - 150) * 0.12;
    const keep = smoothstep(cut - 60, cut + 140, z);
    let hd = lerp(-260 + nz.fbm2(x * 0.001, z * 0.001, 3) * 60, h, keep);
    // sharp cliff face
    if (keep > 0.02 && keep < 0.98) hd = lerp(-120, h, Math.pow(keep, 0.35));
    // ash/debris remnants: Verlaten & Lang get bigger, ignore here
    // Anak Krakatau
    const ah = st.anak ?? 0;
    if (ah > 0) {
      const d = Math.hypot(x - PEAKS.anak[0], z - PEAKS.anak[1]);
      const R = 260 + ah * 3.2;
      if (d < R) {
        let c = (ah + 260) * Math.pow(1 - d / R, 1.25) - 260;
        const cd = d / (40 + ah * 0.35);
        if (cd < 1) c -= (ah * 0.18) * (1 - cd * cd);
        c += nz.fbm2(x * 0.02, z * 0.02, 3) * 6;
        hd = Math.max(hd, c);
      }
    }
    h = lerp(h, hd, destroyed);
  }
  return h;
}

const COL = {
  sand: [0.78, 0.66, 0.48], wetSand: [0.45, 0.37, 0.26], grass: [0.14, 0.3, 0.07], jungle: [0.03, 0.13, 0.025],
  jungle2: [0.07, 0.2, 0.035], rock: [0.32, 0.27, 0.22], darkRock: [0.13, 0.11, 0.1], ash: [0.46, 0.44, 0.41], ashDark: [0.22, 0.21, 0.2],
  under: [0.25, 0.3, 0.26],
};

export class Island {
  constructor(opts = {}) {
    this.size = opts.size ?? 12000;
    this.res = opts.res ?? 384;
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.res, this.res);
    geo.rotateX(-Math.PI / 2);
    this.geo = geo;
    this.uniforms = {
      uAsh: { value: 0 },
      uLava: { value: 0 },
      uLavaCenter: { value: new THREE.Vector3(PEAKS.perboewatan[0], 0, PEAKS.perboewatan[1]) },
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uWet: { value: 0 },
    };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.7 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying float vJungle;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#ifdef USE_COLOR\nvJungle = clamp((color.g - color.r * 1.25) * 9.0, 0.0, 1.0);\n#else\nvJungle = 0.0;\n#endif');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying float vJungle;\nuniform float uAsh; uniform float uLava; uniform vec3 uLavaCenter; uniform float uTime; uniform float uBurn;\n' + NOISE + '\nfloat canopy(vec2 p){ float w = worley(p); float w2 = worley(p * 2.3 + 5.0); return (1.0 - w * w) * 0.75 + (1.0 - w2 * w2) * 0.25; }\n')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float dn = fbm2(vWp.xz * 0.05) ;
          float dn2 = vnoise(vWp.xz * 0.6);
          diffuseColor.rgb *= 0.78 + 0.42 * dn + 0.12 * dn2;
          float jk = vJungle * (1.0 - uAsh) * (1.0 - uBurn);
          float cano = canopy(vWp.xz * 0.075);
          vec3 tint = mix(vec3(0.75, 0.95, 0.6), vec3(1.15, 1.1, 0.75), vnoise(vWp.xz * 0.012));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * tint * (0.35 + 0.95 * cano), jk);
          vec3 burnt = vec3(0.24, 0.17, 0.1) * (0.8 + 0.4 * dn);
          diffuseColor.rgb = mix(diffuseColor.rgb, burnt, uBurn * smoothstep(5.0, 30.0, vWp.y));
          float ashMask = uAsh * smoothstep(-2.0, 8.0, vWp.y) * (0.75 + 0.25 * dn);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.44, 0.43, 0.41) * (0.8 + 0.3 * dn2), clamp(ashMask, 0.0, 1.0));
        `)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          {
            float jk2 = vJungle * (1.0 - uAsh);
            if (jk2 > 0.01) {
              vec2 cp = vWp.xz * 0.075; float e = 0.03;
              float h0 = canopy(cp), hx = canopy(cp + vec2(e, 0.0)), hz = canopy(cp + vec2(0.0, e));
              vec3 dnw = vec3(-(hx - h0) / e, 0.0, -(hz - h0) / e) * 0.22 * jk2;
              normal = normalize(normal + (viewMatrix * vec4(dnw, 0.0)).xyz);
            }
          }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (uLava > 0.0) {
            vec2 rel = vWp.xz - uLavaCenter.xz;
            float d = length(rel);
            float a = atan(rel.y, rel.x);
            float ch = 1.0 - smoothstep(0.0, 0.08, abs(vnoise(vec2(a * 9.0, d * 0.004 - uTime * 0.05)) - 0.5));
            float near = 1.0 - smoothstep(60.0, 700.0 * min(uLava, 1.5), d);
            float crat = 1.0 - smoothstep(0.0, 260.0, d);
            float flick = 0.75 + 0.25 * vnoise(vec2(uTime * 3.0, d * 0.01));
            vec3 lava = vec3(4.0, 0.9, 0.12) * (ch * near * near + crat * 1.5) * flick * min(uLava, 1.0);
            totalEmissiveRadiance += lava;
          }
        `);
    };
    this.material = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.state = null;
    this.trees = null;
    this.setState({});
    this.buildShoreTexture();
  }

  setState(st) {
    const key = JSON.stringify([st.destroyed ?? 0, st.anak ?? 0, st.craterP ?? 0.6, st.craterD ?? 0.4]);
    if (this.state === key) return;
    this.state = key;
    this.st = st;
    const pos = this.geo.attributes.position;
    const n = pos.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, islandHeight(x, z, st));
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    const nor = this.geo.attributes.normal;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const slope = 1 - nor.getY(i);
      const v = nz.n2(x * 0.003, z * 0.003) * 0.5 + 0.5;
      const v2 = nz.n2(x * 0.0007 + 9, z * 0.0007) * 0.5 + 0.5;
      let c;
      if (y < -1.5) c = COL.under;
      else if (y < 1.2) c = COL.wetSand;
      else if (y < 7 + v * 6) c = COL.sand;
      else {
        const g = lerp(0, 1, smoothstep(7, 40, y));
        c = mix3(COL.grass, mix3(COL.jungle, COL.jungle2, v), g);
        if (y > 420 + v2 * 200) c = mix3(c, COL.rock, smoothstep(420, 780, y) * 0.8);
        c = mix3(c, COL.rock, smoothstep(0.32, 0.6, slope));
        c = mix3(c, COL.darkRock, smoothstep(0.62, 0.85, slope));
      }
      if ((st.destroyed ?? 0) > 0.5) {
        // sterile remnant: ash grey + dark cliff + Anak black sand
        c = mix3(COL.ash, COL.ashDark, smoothstep(0.35, 0.7, slope) * 0.8 + v * 0.2);
        if (y < 6) c = mix3(COL.ashDark, COL.wetSand, 0.3);
        const da = Math.hypot(x - PEAKS.anak[0], z - PEAKS.anak[1]);
        if (da < 900 && (st.anak ?? 0) > 0) c = mix3(c, [0.08, 0.075, 0.07], 1 - smoothstep(500, 900, da));
      }
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (this.trees) this.trees.visible = (st.destroyed ?? 0) < 0.5;
    if (this.palms) this.palms.visible = (st.destroyed ?? 0) < 0.5;
  }

  // Signed shoreline proximity texture for ocean foam / turquoise shallows.
  buildShoreTexture() {
    const N = 256, S = this.size;
    const data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1) - 0.5) * S, z = (j / (N - 1) - 0.5) * S;
        const h = islandHeight(x, z, {});
        const v = h > 0 ? 1 : clamp(1 + h / 22);
        const k = (j * N + i) * 4;
        data[k] = Math.round(clamp(h > 2 ? 0 : v) * 255);
        data[k + 3] = 255;
      }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.shoreTex = tex;
    this.shoreRect = new THREE.Vector4(-S / 2, -S / 2, S, S);
  }

  buildVegetation(treeGeo, palmGeo, treeMat, palmMat) {
    const r = rng(42);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const trees = [], palms = [];
    let tries = 0;
    while ((trees.length < 16000 || palms.length < 1100) && tries < 600000) {
      tries++;
      const x = (r() - 0.5) * 7000, z = (r() - 0.5) * 11000;
      const y = islandHeight(x, z, {});
      if (y < 3) continue;
      const e = 6;
      const gx = islandHeight(x + e, z, {}) - islandHeight(x - e, z, {});
      const gz = islandHeight(x, z + e, {}) - islandHeight(x, z - e, {});
      const slope = Math.hypot(gx, gz) / (2 * e);
      if (y < 22 && palms.length < 1100 && slope < 0.35) palms.push([x, y, z]);
      else if (y > 9 && y < 740 && slope < 1.25 && trees.length < 16000) trees.push([x, y, z, slope]);
    }
    const tm = new THREE.InstancedMesh(treeGeo, treeMat, trees.length);
    const tcol = new THREE.Color();
    trees.forEach(([x, y, z, sl], i) => {
      const sc = (13 + r() * 13) * (1 - smoothstep(400, 760, y) * 0.5);
      p.set(x, y - 2, z);
      q.setFromAxisAngle(up, r() * Math.PI * 2);
      s.set(sc * (0.8 + r() * 0.4), sc * (0.7 + r() * 0.5), sc * (0.8 + r() * 0.4));
      m.compose(p, q, s);
      tm.setMatrixAt(i, m);
      const v = r();
      tcol.setRGB(lerp(0.05, 0.16, v) * (1 + sl * 0.2), lerp(0.16, 0.32, v * 0.8 + r() * 0.2), lerp(0.025, 0.07, v));
      tm.setColorAt(i, tcol);
    });
    tm.castShadow = true; tm.receiveShadow = true;
    const pm = new THREE.InstancedMesh(palmGeo, palmMat, palms.length);
    palms.forEach(([x, y, z], i) => {
      const sc = 0.85 + r() * 0.5;
      p.set(x, y - 0.3, z);
      q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.25, r() * Math.PI * 2, (r() - 0.5) * 0.25));
      s.set(sc, sc * (0.85 + r() * 0.35), sc);
      m.compose(p, q, s);
      pm.setMatrixAt(i, m);
    });
    pm.castShadow = true; pm.receiveShadow = true;
    this.trees = tm; this.palms = pm;
    this.trees.visible = this.palms.visible = (this.st.destroyed ?? 0) < 0.5;
    return [tm, pm];
  }
}

function mix3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Generic distant coastline (Java / Sumatra) as a long low mountain strip.
export function makeCoastStrip(length, depth, height, seed, color = [0.1, 0.2, 0.08]) {
  const n = makeNoise(seed);
  const geo = new THREE.PlaneGeometry(length, depth, 220, 24);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const edge = smoothstep(-depth / 2, -depth / 2 + depth * 0.25, z);
    const m = (n.fbm2(x * 0.00012, z * 0.0002, 5) * 0.5 + 0.5);
    let y = edge * (20 + Math.pow(m, 1.6) * height) - (1 - edge) * 30;
    y += n.n2(x * 0.002, z * 0.002) * 15 * edge;
    pos.setY(i, y);
    const v = n.n2(x * 0.001, z * 0.001) * 0.5 + 0.5;
    col[i * 3] = color[0] * (0.7 + v * 0.6);
    col[i * 3 + 1] = color[1] * (0.7 + v * 0.6);
    col[i * 3 + 2] = color[2] * (0.7 + v * 0.6);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  return mesh;
}
