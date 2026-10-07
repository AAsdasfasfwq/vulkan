import * as THREE from 'three';
import { rng, lerp, clamp } from '../core/math.js';

// Stylised period characters built from primitives, posed procedurally.
const SKIN = [[0.86, 0.66, 0.52], [0.75, 0.55, 0.42], [0.58, 0.4, 0.28], [0.45, 0.3, 0.2], [0.92, 0.74, 0.62]];
const matCache = new Map();
function mat(c, rough = 0.75, metal = 0) {
  const key = c.join(',') + rough + metal;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color(...c), roughness: rough, metalness: metal }));
  return matCache.get(key);
}
const sarongCache = new Map();
function sarongMat(c) {
  const key = c.join(',');
  if (sarongCache.has(key)) return sarongCache.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = `rgb(${c[0] * 255},${c[1] * 255},${c[2] * 255})`; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(240,210,150,0.8)'; g.lineWidth = 3;
  for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) { g.beginPath(); g.arc(x + 8, y + 8, 5, 0, 6.28); g.stroke(); }
  g.fillStyle = 'rgba(20,10,5,0.6)'; for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 4);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide });
  sarongCache.set(key, m);
  return m;
}
const capsule = (r, l, c) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat(c)); m.castShadow = true; m.receiveShadow = true; return m; };
const sphere = (r, c, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c)); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
const cylinder = (r0, r1, h, c, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), mat(c)); m.castShadow = true; return m; };

export const OUTFITS = {
  gentleman: { coat: [0.05, 0.05, 0.06], vest: [0.42, 0.08, 0.1], shirt: [0.92, 0.9, 0.86], tie: [0.08, 0.08, 0.1], pants: [0.28, 0.27, 0.27], hat: 'top', hatCol: [0.04, 0.04, 0.045], tails: true, belt: null },
  officer: { coat: [0.07, 0.11, 0.24], shirt: [0.9, 0.88, 0.82], pants: [0.88, 0.86, 0.8], hat: 'pith', hatCol: [0.92, 0.9, 0.84], buttons: true, epaulettes: true, sash: [0.75, 0.55, 0.12], belt: [0.08, 0.06, 0.05] },
  merchant: { coat: [0.62, 0.48, 0.3], vest: [0.3, 0.2, 0.12], shirt: [0.95, 0.93, 0.88], tie: [0.45, 0.1, 0.08], pants: [0.82, 0.78, 0.68], hat: 'boater', hatCol: [0.82, 0.7, 0.45] },
  captain: { coat: [0.05, 0.07, 0.16], shirt: [0.9, 0.9, 0.86], tie: [0.05, 0.05, 0.05], pants: [0.05, 0.07, 0.16], hat: 'cap', hatCol: [0.05, 0.06, 0.12], buttons: true, beard: true, epaulettes: true },
  sailor: { coat: [0.1, 0.16, 0.36], shirt: [0.9, 0.9, 0.9], pants: [0.86, 0.86, 0.84], hat: 'sailor', hatCol: [0.92, 0.92, 0.92], collar: [0.9, 0.9, 0.92], belt: [0.15, 0.1, 0.06] },
  sailor2: { coat: [0.62, 0.2, 0.14], shirt: [0.62, 0.2, 0.14], pants: [0.3, 0.25, 0.18], hat: 'bandana', hatCol: [0.15, 0.25, 0.5], beard: true, belt: [0.2, 0.13, 0.07] },
  lady: { dress: [0.6, 0.08, 0.12], trim: [0.95, 0.9, 0.85], hat: 'bonnet', hatCol: [0.95, 0.9, 0.82], parasol: [0.95, 0.92, 0.85] },
  lady2: { dress: [0.12, 0.22, 0.52], trim: [0.95, 0.93, 0.88], hat: 'bonnet', hatCol: [0.9, 0.85, 0.75] },
  lady3: { dress: [0.08, 0.36, 0.26], trim: [0.85, 0.75, 0.5], hat: 'bonnet', hatCol: [0.85, 0.75, 0.55], parasol: [0.85, 0.3, 0.3] },
  villager: { coat: [0.88, 0.85, 0.78], shirt: [0.88, 0.85, 0.78], pants: [0.4, 0.22, 0.1], hat: 'caping', hatCol: [0.78, 0.66, 0.4], sarong: [0.42, 0.2, 0.12] },
  villager2: { coat: [0.16, 0.2, 0.4], shirt: [0.16, 0.2, 0.4], pants: [0.6, 0.12, 0.1], hat: 'none', hatCol: [0, 0, 0], sarong: [0.6, 0.12, 0.1] },
  clerk: { coat: [0.25, 0.18, 0.12], vest: [0.15, 0.12, 0.1], shirt: [0.92, 0.9, 0.86], tie: [0.1, 0.1, 0.1], pants: [0.25, 0.18, 0.12], hat: 'none', hatCol: [0, 0, 0] },
  fireman: { coat: [0.06, 0.08, 0.16], shirt: [0.06, 0.08, 0.16], pants: [0.06, 0.08, 0.16], hat: 'fire', hatCol: [0.75, 0.55, 0.2], buttons: true, belt: [0.1, 0.07, 0.05] },
  modern: { coat: [0.15, 0.2, 0.3], shirt: [0.9, 0.9, 0.9], pants: [0.2, 0.22, 0.25], hat: 'none', hatCol: [0, 0, 0] },
};

export function makeFigure(style = 'gentleman', seed = 1) {
  const r = rng(seed);
  const o = OUTFITS[style] || OUTFITS.gentleman;
  const skin = SKIN[Math.floor(r() * SKIN.length)];
  const female = !!o.dress;
  const s = female ? 0.95 : 1.0 + (r() - 0.5) * 0.08;
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.95 * s; root.add(hips);
  const spine = new THREE.Group(); hips.add(spine);
  const torsoC = female ? o.dress : o.coat;
  const torso = capsule(0.17 * s, 0.38 * s, torsoC); torso.position.y = 0.3 * s; torso.scale.set(1.08, 1, 0.75); spine.add(torso);
  if (!female) {
    const shirt = new THREE.Mesh(new THREE.PlaneGeometry(0.12 * s, 0.3 * s), mat(o.shirt));
    shirt.position.set(0, 0.42 * s, 0.13 * s); spine.add(shirt);
    if (o.collar) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.02, 0.14 * s), mat(o.collar)); c.position.set(0, 0.58 * s, -0.1 * s); c.rotation.x = 0.5; spine.add(c); for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16 * s, 0.012), mat([0.9, 0.9, 0.92])); st.position.set(sx * 0.045, 0.5 * s, 0.135 * s); st.rotation.z = sx * 0.5; spine.add(st); } }
    if (o.vest) { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.17 * s, 0.26 * s), mat(o.vest)); v.position.set(0, 0.36 * s, 0.127 * s); spine.add(v); }
    if (o.tie) { const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1 * s, 0.01), mat(o.tie)); t2.position.set(0, 0.53 * s, 0.135 * s); spine.add(t2); }
    if (o.belt) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.17 * s, 0.02, 6, 20), mat(o.belt)); b.rotation.x = Math.PI / 2; b.scale.set(1.08, 0.75, 1); b.position.y = 0.12 * s; spine.add(b); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.01), mat([0.8, 0.65, 0.3], 0.3, 0.8)); bk.position.set(0, 0.12 * s, 0.13 * s); spine.add(bk); }
    if (o.sash) { const sh2 = new THREE.Mesh(new THREE.TorusGeometry(0.2 * s, 0.022, 6, 24), mat(o.sash, 0.4, 0.3)); sh2.rotation.set(Math.PI / 2, 0.6, 0); sh2.scale.set(0.95, 0.7, 1.4); sh2.position.y = 0.36 * s; spine.add(sh2); }
    if (o.epaulettes) for (const sx of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.1), mat([0.85, 0.65, 0.2], 0.3, 0.8)); ep.position.set(sx * 0.2 * s, 0.6 * s, 0); spine.add(ep); }
    if (o.tails) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.45 * s, 0.04), mat(o.coat)); tl.position.set(0, -0.05 * s, -0.12 * s); tl.rotation.x = 0.12; spine.add(tl); }
    if (o.buttons) for (let b = 0; b < 4; b++) { const bt = sphere(0.012, [0.85, 0.7, 0.3]); bt.position.set(0.05, 0.22 * s + b * 0.08, 0.13 * s); spine.add(bt); }
  } else {
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.15 * s, 0.02, 6, 16), mat(o.trim)); trim.rotation.x = Math.PI / 2; trim.position.y = 0.58 * s; trim.scale.set(1.05, 0.75, 1); spine.add(trim);
  }
  const neck = new THREE.Group(); neck.position.y = 0.62 * s; spine.add(neck);
  const neckM = cylinder(0.05, 0.05, 0.1, skin); neckM.position.y = 0.04; neck.add(neckM);
  const head = new THREE.Group(); head.position.y = 0.16 * s; neck.add(head);
  const skull = sphere(0.11 * s, skin, 0.92, 1.08, 1.0); head.add(skull);
  // face details
  for (const sx of [-1, 1]) {
    const ew = sphere(0.02, [0.95, 0.93, 0.9], 1, 0.7, 0.4); ew.position.set(sx * 0.038, 0.02, 0.093); head.add(ew);
    const e = sphere(0.013, [0.06, 0.04, 0.03], 1, 1, 0.5); e.position.set(sx * 0.038, 0.02, 0.1); head.add(e);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), mat([0.18, 0.12, 0.08])); brow.position.set(sx * 0.038, 0.045, 0.1); head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 6), mat(skin)); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.0, 0.115); head.add(nose);
  const hairCol = [[0.12, 0.08, 0.05], [0.25, 0.16, 0.08], [0.06, 0.05, 0.05], [0.5, 0.36, 0.2], [0.45, 0.42, 0.4]][Math.floor(r() * 5)];
  const hair = sphere(0.114 * s, hairCol, 0.95, 0.9, 1.0); hair.position.set(0, 0.025, -0.012); head.add(hair);
  if (female) { const bun = sphere(0.06, hairCol); bun.position.set(0, 0.03, -0.1); head.add(bun); }
  if (!female && (o.beard || r() < 0.35)) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.02), mat(hairCol)); m.position.set(0, -0.03, 0.105); head.add(m);
    if (o.beard) { const b = sphere(0.075, hairCol, 1, 0.8, 0.7); b.position.set(0, -0.07, 0.06); head.add(b); }
  }
  // hats
  if (o.hat === 'top') { const c = cylinder(0.085, 0.09, 0.2, o.hatCol); c.position.y = 0.17; head.add(c); const b = cylinder(0.16, 0.16, 0.012, o.hatCol, 18); b.position.y = 0.075; head.add(b); }
  if (o.hat === 'pith') { const c = sphere(0.14, o.hatCol, 1, 0.75, 1.15); c.position.y = 0.06; head.add(c); const b = cylinder(0.18, 0.18, 0.01, o.hatCol, 18); b.position.y = 0.03; b.scale.z = 1.2; head.add(b); }
  if (o.hat === 'boater') { const c = cylinder(0.11, 0.11, 0.06, o.hatCol); c.position.y = 0.11; head.add(c); const b = cylinder(0.17, 0.17, 0.01, o.hatCol, 18); b.position.y = 0.08; head.add(b); const band = cylinder(0.112, 0.112, 0.02, [0.1, 0.1, 0.12]); band.position.y = 0.095; head.add(band); }
  if (o.hat === 'cap') { const c = cylinder(0.12, 0.11, 0.06, o.hatCol); c.position.y = 0.1; head.add(c); const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.07), mat([0.02, 0.02, 0.02])); v.position.set(0, 0.075, 0.1); head.add(v); }
  if (o.hat === 'sailor') { const c = cylinder(0.12, 0.12, 0.04, o.hatCol); c.position.y = 0.1; head.add(c); }
  if (o.hat === 'caping') { const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.13, 18), mat(o.hatCol)); c.position.y = 0.13; c.castShadow = true; head.add(c); }
  if (o.hat === 'bonnet') { const c = sphere(0.135, o.hatCol, 1, 0.9, 1.05); c.position.set(0, 0.04, -0.02); head.add(c); const br = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 18, Math.PI), mat(o.hatCol)); br.position.set(0, 0.02, 0.04); head.add(br); }
  if (o.hat === 'bandana') { const c = sphere(0.118 * s, o.hatCol, 0.96, 0.8, 1.02); c.position.set(0, 0.035, -0.01); head.add(c); }
  if (o.hat === 'fire') { const c = sphere(0.14, o.hatCol, 1, 0.8, 1.3); c.position.y = 0.05; head.add(c); }

  // arms
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.21 * s, 0.52 * s, 0); spine.add(sh);
    const up = capsule(0.05 * s, 0.24 * s, torsoC); up.position.y = -0.15 * s; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.3 * s; sh.add(el);
    const fo = capsule(0.042 * s, 0.22 * s, female ? o.trim ?? torsoC : torsoC); fo.position.y = -0.13 * s; el.add(fo);
    const hand = sphere(0.045 * s, skin, 0.8, 1.1, 0.6); hand.position.y = -0.28 * s; el.add(hand);
    const prop = new THREE.Group(); prop.position.y = -0.3 * s; el.add(prop);
    arms.push({ sh, el, prop });
  }
  // legs or skirt
  const legs = [];
  if (female) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector2(0.16 + Math.pow(u, 1.6) * 0.42 + (u > 0.95 ? 0.02 : 0), -u * 0.95 * s)); }
    const sk = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat(o.dress, 0.65)); sk.castShadow = true; sk.receiveShadow = true;
    sk.position.y = 0.05; hips.add(sk);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 6, 32), mat(o.trim)); hem.rotation.x = Math.PI / 2; hem.position.y = -0.88 * s; hips.add(hem);
  } else {
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(sx * 0.09 * s, 0, 0); hips.add(hip);
      const th = capsule(0.07 * s, 0.36 * s, o.pants); th.position.y = -0.22 * s; hip.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.46 * s; hip.add(kn);
      const sh = capsule(0.058 * s, 0.34 * s, o.pants); sh.position.y = -0.2 * s; kn.add(sh);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.26), mat(o.sarong ? skin : [0.06, 0.05, 0.05])); ft.position.set(0, -0.44 * s, 0.05); ft.castShadow = true; kn.add(ft);
      legs.push({ hip, kn });
    }
    if (o.sarong) { const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 16, 1, true), sarongMat(o.sarong)); sg.position.y = -0.3; hips.add(sg); }
  }
  if (o.parasol) {
    const pole = cylinder(0.008, 0.008, 0.9, [0.3, 0.2, 0.1]); pole.position.y = 0.3; arms[1].prop.add(pole);
    const can = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.22, 16, 1, true), new THREE.MeshStandardMaterial({ color: new THREE.Color(...o.parasol), side: THREE.DoubleSide, roughness: 0.8 }));
    can.position.y = 0.72; can.castShadow = true; arms[1].prop.add(can);
  }
  root.userData = { hips, spine, neck, head, arms, legs, s, female, phase: r() * 10, style };
  return root;
}

export function addProp(fig, kind, side = 1) {
  const a = fig.userData.arms[side === 1 ? 1 : 0];
  let m;
  if (kind === 'glass') {
    m = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 12, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0, side: THREE.DoubleSide }));
    cup.position.y = 0.02; m.add(cup);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.028, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xe9d38a, roughness: 0.1, transparent: true, opacity: 0.8 }));
    liq.position.y = 0.0; m.add(liq);
    m.position.set(0, 0.02, 0.04);
  } else if (kind === 'champagne') {
    m = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 12, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }));
    bowl.rotation.x = Math.PI; bowl.position.y = 0.12; m.add(bowl);
    const liq = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xf2d77a, emissive: 0x2a2000, roughness: 0.1 }));
    liq.rotation.x = Math.PI; liq.position.y = 0.105; m.add(liq);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    stem.position.y = 0.04; m.add(stem);
  } else if (kind === 'broom') {
    m = new THREE.Group();
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), mat([0.45, 0.32, 0.18]));
    h.position.y = -0.3; m.add(h);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 10), mat([0.7, 0.58, 0.3]));
    b.position.y = -0.98; b.rotation.x = Math.PI; m.add(b);
  } else if (kind === 'telescope') {
    m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.55, 12), mat([0.7, 0.55, 0.25], 0.3, 0.8));
    m.rotation.x = Math.PI / 2; m.position.set(0, 0, 0.2);
  } else if (kind === 'stamp') {
    m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 10), mat([0.25, 0.15, 0.1]));
  } else if (kind === 'bucket') {
    m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.25, 12), mat([0.4, 0.28, 0.16]));
    m.position.y = -0.1;
  } else if (kind === 'log') {
    m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), mat([0.38, 0.26, 0.15]));
    m.rotation.z = Math.PI / 2; m.position.y = -0.05;
  }
  if (m) { m.traverse((x) => (x.castShadow = true)); a.prop.add(m); }
  return m;
}

// Pose: { walk: speed m/s (0 = idle), drink, sweep, point, ears, run, look, sweepPhase, row, carry, cough, cheer, fall }
export function poseFigure(fig, t, P = {}) {
  const U = fig.userData;
  const ph = t + U.phase;
  const breathe = Math.sin(ph * 1.8) * 0.015;
  U.spine.rotation.set(breathe + (P.lean ?? 0), 0, 0);
  U.neck.rotation.set(0, 0, 0);
  U.head.rotation.set(P.lookUp ?? 0, (P.look ?? 0) + Math.sin(ph * 0.4) * 0.08, 0);
  const [L, R] = U.arms;
  for (const a of U.arms) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
  L.sh.rotation.z = -0.08; R.sh.rotation.z = 0.08;
  L.el.rotation.x = -0.15; R.el.rotation.x = -0.15;
  const walk = P.walk ?? 0;
  const cyc = ph * (walk > 0 ? 2.2 + walk * 1.6 : 0);
  if (U.legs.length) {
    for (let i = 0; i < 2; i++) {
      const sgn = i === 0 ? 1 : -1;
      const sw = walk > 0 ? Math.sin(cyc + i * Math.PI) * (0.35 + walk * 0.12) : 0;
      U.legs[i].hip.rotation.set(-sw, 0, 0);
      U.legs[i].kn.rotation.set(walk > 0 ? Math.max(0, Math.sin(cyc + i * Math.PI + 1.2)) * (0.6 + walk * 0.2) : 0, 0, 0);
    }
  }
  U.hips.position.y = 0.95 * U.s + (walk > 0 ? Math.abs(Math.sin(cyc)) * 0.04 : 0);
  if (walk > 0) {
    L.sh.rotation.x = Math.sin(cyc) * (0.4 + walk * 0.15);
    R.sh.rotation.x = -Math.sin(cyc) * (0.4 + walk * 0.15);
    if (walk > 2) { L.el.rotation.x = R.el.rotation.x = -1.2; U.spine.rotation.x = 0.25; }
  }
  if (P.drink !== undefined) {
    const d = P.drink; // 0..1 lift
    R.sh.rotation.x = -0.5 - d * 0.9; R.sh.rotation.z = 0.2; R.el.rotation.x = -1.4 - d * 0.5;
  }
  if (P.hold) { R.sh.rotation.x = -0.45; R.el.rotation.x = -1.35; }
  if (P.sweep !== undefined) {
    const s = Math.sin(t * 3.2 + U.phase);
    U.spine.rotation.x = 0.35;
    L.sh.rotation.x = -0.6 + s * 0.35; R.sh.rotation.x = -0.9 + s * 0.35;
    L.el.rotation.x = -0.6; R.el.rotation.x = -0.4;
    L.sh.rotation.y = R.sh.rotation.y = s * 0.3;
  }
  if (P.point) { R.sh.rotation.x = -1.45; R.sh.rotation.y = -0.2; R.el.rotation.x = -0.05; }
  if (P.telescope) { R.sh.rotation.x = -1.35; R.sh.rotation.y = 0.55; R.el.rotation.x = -1.6; L.sh.rotation.x = -1.2; L.el.rotation.x = -1.2; L.sh.rotation.y = -0.4; }
  if (P.ears) {
    for (const [a, sg] of [[L, -1], [R, 1]]) { a.sh.rotation.x = -0.4; a.sh.rotation.z = sg * 2.4; a.el.rotation.x = -2.2; }
    U.spine.rotation.x = 0.4 + Math.sin(t * 9) * 0.02;
  }
  if (P.cough) { U.spine.rotation.x = 0.35 + Math.max(0, Math.sin(t * 7)) * 0.15; R.sh.rotation.x = -1.2; R.el.rotation.x = -1.9; R.sh.rotation.z = -0.3; }
  if (P.cheer) { const c = Math.sin(t * 6 + U.phase) * 0.2; R.sh.rotation.z = 2.6 + c; R.sh.rotation.x = 0; }
  if (P.row !== undefined) {
    const s = Math.sin(t * 2.2 + (P.row ?? 0));
    U.spine.rotation.x = 0.2 + s * 0.35;
    L.sh.rotation.x = R.sh.rotation.x = -1.2 - s * 0.4; L.el.rotation.x = R.el.rotation.x = -0.4 + s * 0.4;
  }
  if (P.carry) { L.sh.rotation.x = R.sh.rotation.x = -0.9; L.el.rotation.x = R.el.rotation.x = -0.9; L.sh.rotation.z = -0.3; R.sh.rotation.z = 0.3; }
  if (P.brace) { U.spine.rotation.x = 0.55; L.sh.rotation.x = R.sh.rotation.x = -0.4; L.sh.rotation.z = -0.9; R.sh.rotation.z = 0.9; L.el.rotation.x = R.el.rotation.x = -1.6; }
}
