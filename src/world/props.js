import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, makeNoise, lerp, clamp } from '../core/math.js';
import { font } from '../overlay/kit.js';

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const M = (c, r = 0.6, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
const shadowed = (o) => { o.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); return o; };

// Burlap texture
let BURLAP = null;
function burlap() {
  if (BURLAP) return BURLAP;
  BURLAP = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8a6a43'; g.fillRect(0, 0, w, h);
    const r = rng(4);
    for (let i = 0; i < w; i += 4) { g.fillStyle = `rgba(60,40,20,${0.25 + r() * 0.2})`; g.fillRect(i, 0, 2, h); }
    for (let j = 0; j < h; j += 4) { g.fillStyle = `rgba(200,170,120,${0.12 + r() * 0.15})`; g.fillRect(0, j, w, 2); }
    g.font = font(70, 900, 'serif'); g.fillStyle = 'rgba(40,25,15,0.75)'; g.textAlign = 'center';
    g.fillText('JAVA', w / 2, h * 0.55); g.font = font(30, 700, 'sans'); g.fillText('COFFEE · 1883', w / 2, h * 0.68);
  });
  BURLAP.wrapS = BURLAP.wrapT = THREE.RepeatWrapping;
  return BURLAP;
}

export function makeCoffee() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(0.45 + Math.sin(u * Math.PI) * 0.12 - u * u * 0.08, u * 1.1)); }
  const sack = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M(0xffffff, 0.95, 0, { map: burlap() }));
  const p = sack.geometry.attributes.position, nz = makeNoise(3);
  for (let i = 0; i < p.count; i++) { const k = 1 + nz.n3(p.getX(i) * 4, p.getY(i) * 4, p.getZ(i) * 4) * 0.05; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  sack.geometry.computeVertexNormals();
  g.add(sack);
  // beans
  const bg = new THREE.SphereGeometry(0.035, 8, 6); bg.scale(1, 0.62, 1.35);
  const bm = M(0x3b2010, 0.45);
  const r = rng(7);
  const N = 420;
  const im = new THREE.InstancedMesh(bg, bm, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < 300) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.4; x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = 1.02 + (0.4 - rr) * 0.25 + r() * 0.04; }
    else { const a = r() * 6.28, rr = 0.55 + Math.pow(r(), 2) * 0.8; x = Math.cos(a) * rr + 0.3; z = Math.sin(a) * rr + 0.2; y = 0.02; }
    q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    m.compose(v.set(x, y, z), q, s);
    im.setMatrixAt(i, m);
  }
  g.add(im);
  return shadowed(g);
}

export function makeSugar() {
  const g = new THREE.Group();
  const cg = new THREE.BoxGeometry(0.18, 0.18, 0.18, 2, 2, 2);
  const mat = M(0xfbfaf6, 0.85);
  const r = rng(11);
  const list = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4 - y; x++) for (let z = 0; z < 3 - Math.floor(y / 2); z++) list.push([(x - (3 - y) / 2) * 0.19, 0.09 + y * 0.185, (z - 1) * 0.19]);
  for (let i = 0; i < 7; i++) list.push([(r() - 0.5) * 1.4, 0.09, 0.5 + r() * 0.4]);
  const im = new THREE.InstancedMesh(cg, mat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  list.forEach(([x, y, z], i) => { q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.08, (r() - 0.5) * 0.4, (r() - 0.5) * 0.08)); m.compose(v.set(x, y, z), q, s); im.setMatrixAt(i, m); });
  g.add(im);
  // sugar cane stalks
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10), M(0x9bb04a, 0.6));
    c.rotation.z = Math.PI / 2 + 0.1 * i; c.rotation.y = 0.5 + i * 0.25;
    c.position.set(-0.2, 0.06 + i * 0.1, -0.55);
    g.add(c);
    for (let k = -3; k <= 3; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 16), M(0x6d7d30, 0.6)); ring.position.set(k * 0.22, 0, 0); ring.rotation.y = Math.PI / 2; c.add(ring); }
  }
  return shadowed(g);
}

export function makeSpices() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector2(0.15 + Math.sin(u * Math.PI * 0.5) * 0.55, u * 0.32)); }
  for (let i = 12; i >= 0; i--) { const u = i / 12; pts.push(new THREE.Vector2(0.12 + Math.sin(u * Math.PI * 0.5) * 0.5, 0.03 + u * 0.3)); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M(0x6b3e1f, 0.5));
  g.add(bowl);
  const r = rng(3);
  // peppercorns + star anise + cinnamon
  const pg = new THREE.SphereGeometry(0.025, 6, 5);
  const im = new THREE.InstancedMesh(pg, M(0x2a1a12, 0.7), 300);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 300; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.5; m.makeTranslation(Math.cos(a) * rr, 0.24 + (0.5 - rr) * 0.12 + r() * 0.03, Math.sin(a) * rr); im.setMatrixAt(i, m); }
  g.add(im);
  const star = new THREE.Shape();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 0.05 : 0.13; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const sg = new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(sg, M(0x7a3b1c, 0.6)); s.rotation.x = -Math.PI / 2 + (r() - 0.5) * 0.4; s.rotation.z = r() * 6; s.position.set((r() - 0.5) * 0.6, 0.32, (r() - 0.5) * 0.6); g.add(s); }
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10, 1, true), M(0x8a4a22, 0.75, 0, { side: THREE.DoubleSide }));
    c.rotation.z = Math.PI / 2; c.rotation.y = r() * 3; c.position.set(0.75 + r() * 0.3, 0.04 + i * 0.07, (r() - 0.5) * 0.5);
    g.add(c);
  }
  for (let i = 0; i < 4; i++) {
    const ch = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 10), M(0xc0201a, 0.35));
    ch.rotation.z = Math.PI / 2 + (r() - 0.5) * 0.5; ch.rotation.y = r() * 6; ch.position.set(-0.8 + (r() - 0.5) * 0.3, 0.05, 0.3 + (r() - 0.5) * 0.5);
    g.add(ch);
  }
  return shadowed(g);
}

export function makeCooker() {
  const g = new THREE.Group();
  const steel = M(0xc9ced4, 0.22, 0.95);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.68, 0.9, 48), steel); pot.position.y = 0.45; g.add(pot);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.72, 48, 12, 0, Math.PI * 2, 0, Math.PI / 5), steel); lid.position.y = 0.6; g.add(lid);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.04, 8, 48), steel); rim.rotation.x = Math.PI / 2; rim.position.y = 0.9; g.add(rim);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.14), M(0x161616, 0.5)); h.position.set(s * 0.95, 0.85, 0); g.add(h); }
  const valve = new THREE.Group(); valve.position.y = 1.08; g.add(valve);
  const vb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 16), M(0x2b2b2b, 0.4, 0.6)); valve.add(vb);
  const vw = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 16), M(0x8a1d14, 0.4, 0.3)); vw.position.y = 0.1; valve.add(vw);
  g.userData.valve = valve;
  return shadowed(g);
}

export function makeSpring() {
  class Helix extends THREE.Curve {
    getPoint(t) { const a = t * Math.PI * 2 * 9; return new THREE.Vector3(Math.cos(a) * 0.4, t * 1.6, Math.sin(a) * 0.4); }
  }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 600, 0.05, 10, false), M(0x9aa2aa, 0.25, 1.0));
  const g = new THREE.Group(); g.add(m);
  const plateM = M(0x3a3d42, 0.4, 0.8);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 40), plateM); top.position.y = 1.65; g.add(top);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 40), plateM); bot.position.y = -0.05; g.add(bot);
  g.userData = { coil: m, top };
  return shadowed(g);
}

const ATOM = { O: [0xd8382c, 0.32], H: [0xf2f2f2, 0.2], C: [0x2a2d33, 0.3], S: [0xf2c12e, 0.38] };
export function makeMolecule(kind) {
  const g = new THREE.Group();
  const atom = (e, x, y, z) => { const [c, r] = ATOM[e]; const a = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), M(c, 0.3, 0.05)); a.position.set(x, y, z); g.add(a); return a; };
  const bond = (a, b) => { const d = a.position.distanceTo(b.position); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, d, 12), M(0xbfc4ca, 0.3, 0.5)); c.position.copy(a.position).add(b.position).multiplyScalar(0.5); c.lookAt(b.position); c.rotateX(Math.PI / 2); g.add(c); };
  if (kind === 'H2O') { const o = atom('O', 0, 0, 0); const h1 = atom('H', -0.42, -0.3, 0); const h2 = atom('H', 0.42, -0.3, 0); bond(o, h1); bond(o, h2); }
  if (kind === 'CO2') { const c = atom('C', 0, 0, 0); const o1 = atom('O', -0.62, 0, 0); const o2 = atom('O', 0.62, 0, 0); bond(c, o1); bond(c, o2); }
  if (kind === 'SO2') { const s = atom('S', 0, 0.05, 0); const o1 = atom('O', -0.55, -0.32, 0); const o2 = atom('O', 0.55, -0.32, 0); bond(s, o1); bond(s, o2); }
  return shadowed(g);
}

export function makeGauge() {
  const g = new THREE.Group();
  const brass = M(0xb88a3e, 0.28, 0.9);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 64), brass); body.rotation.x = Math.PI / 2; g.add(body);
  const bez = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 12, 64), brass); bez.position.z = 0.09; g.add(bez);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.56, 64), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2);
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    c.lineWidth = 26; c.strokeStyle = '#c4271d'; c.beginPath(); c.arc(0, 0, 200, a0 + (a1 - a0) * 0.72, a1); c.stroke();
    c.lineWidth = 26; c.strokeStyle = '#e3a52a'; c.beginPath(); c.arc(0, 0, 200, a0 + (a1 - a0) * 0.5, a0 + (a1 - a0) * 0.72); c.stroke();
    c.strokeStyle = '#1b1b1b';
    for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * (i / 40); const l = i % 5 === 0 ? 34 : 16; c.lineWidth = i % 5 === 0 ? 5 : 2.5; c.beginPath(); c.moveTo(Math.cos(a) * 225, Math.sin(a) * 225); c.lineTo(Math.cos(a) * (225 - l), Math.sin(a) * (225 - l)); c.stroke(); }
    c.fillStyle = '#1b1b1b'; c.font = font(40, 800, 'sans'); c.textAlign = 'center';
    for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * (i / 8); c.fillText(String(i * 25), Math.cos(a) * 160, Math.sin(a) * 160 + 14); }
    c.font = font(34, 700, 'serif', true); c.fillText('PRESSURE', 0, 110);
  }) }));
  face.position.z = 0.092; g.add(face);
  const needle = new THREE.Group(); needle.position.z = 0.11; g.add(needle);
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.46, 0.012), M(0x111111, 0.4)); nd.position.y = 0.2; needle.add(nd);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), brass); hub.rotation.x = Math.PI / 2; needle.add(hub);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.58, 64), new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, clearcoat: 1 }));
  glass.position.z = 0.12; g.add(glass);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16), brass); pipe.position.y = -0.85; g.add(pipe);
  g.userData = { needle, set(v) { needle.rotation.z = -(Math.PI * 0.75 + Math.PI * 1.5 * clamp(v, 0, 1.08)) + Math.PI / 2; } };
  return shadowed(g);
}

export function makeTelegraphKey() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.6), M(0x4a2a16, 0.45)); base.position.y = 0.06; g.add(base);
  const brass = M(0xc49a4c, 0.25, 0.95);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.3), brass); post.position.set(-0.35, 0.24, 0); g.add(post);
  const lever = new THREE.Group(); lever.position.set(-0.35, 0.34, 0); g.add(lever);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.08), brass); arm.position.x = 0.45; lever.add(arm);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.07, 24), M(0x111111, 0.35)); knob.position.set(0.9, 0.06, 0); lever.add(knob);
  for (const x of [-0.6, 0.55]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), brass); s.position.set(x, 0.15, 0.2); g.add(s); }
  // wire
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.6, 0.15, 0.2), new THREE.Vector3(-1.0, 0.05, 0.6), new THREE.Vector3(-2.2, 0.02, 0.9), new THREE.Vector3(-4, 0.02, 0.5)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.02, 6), M(0x6a2a16, 0.5)));
  g.userData = { lever };
  return shadowed(g);
}

export function newspaperTexture(head, sub, city, date) {
  return canvasTex(1024, 1400, (c, w, h) => {
    c.fillStyle = '#ece3cf'; c.fillRect(0, 0, w, h);
    const r = rng(head.length);
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(120,100,70,${r() * 0.05})`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.fillStyle = '#1a1714'; c.textAlign = 'center';
    c.font = font(92, 700, 'serif'); c.fillText(city, w / 2, 120);
    c.fillRect(40, 150, w - 80, 4); c.fillRect(40, 205, w - 80, 2);
    c.font = font(26, 500, 'ui'); c.fillText(date, w / 2, 190);
    c.font = font(110, 900, 'serif'); c.fillText(head, w / 2, 340);
    c.font = font(46, 700, 'serif', true); c.fillText(sub, w / 2, 420);
    c.fillRect(40, 450, w - 80, 2);
    for (let col = 0; col < 4; col++) for (let line = 0; line < 40; line++) {
      const x = 50 + col * 235, y = 490 + line * 22;
      c.fillStyle = `rgba(30,26,22,${0.55 + r() * 0.2})`;
      c.fillRect(x, y, 200 * (line % 9 === 8 ? 0.6 : 0.9 + r() * 0.1), 9);
    }
    // engraved illustration of the eruption (hatched, like a 19th-century woodcut)
    const X = 520, Y = 500, IW = 440, IH = 320;
    c.fillStyle = '#ece3cf'; c.fillRect(X - 10, Y - 10, IW + 20, IH + 70);
    c.save(); c.beginPath(); c.rect(X, Y, IW, IH); c.clip();
    c.fillStyle = '#e4d9c2'; c.fillRect(X, Y, IW, IH);
    c.strokeStyle = 'rgba(30,26,22,0.55)'; c.lineWidth = 1.6;
    for (let yy = Y; yy < Y + IH * 0.62; yy += 5) { c.beginPath(); c.moveTo(X, yy); c.lineTo(X + IW, yy + (r() - 0.5) * 2); c.stroke(); }
    // ash column: stacked billows
    c.fillStyle = '#2a2420';
    for (let i = 0; i < 26; i++) { const t = i / 25; const bx = X + IW * 0.5 + Math.sin(i * 1.7) * 18 * t + t * 40, by = Y + IH * 0.6 - t * IH * 0.62, br = 18 + t * 46; c.beginPath(); c.arc(bx, by, br, 0, 6.283); c.fill(); }
    c.strokeStyle = 'rgba(236,227,207,0.45)'; c.lineWidth = 2;
    for (let i = 0; i < 26; i += 2) { const t = i / 25; const bx = X + IW * 0.5 + Math.sin(i * 1.7) * 18 * t + t * 40, by = Y + IH * 0.6 - t * IH * 0.62, br = 18 + t * 46; c.beginPath(); c.arc(bx - br * 0.2, by - br * 0.2, br * 0.7, 3.6, 5.2); c.stroke(); }
    // cone + sea
    c.fillStyle = '#1e1a16'; c.beginPath(); c.moveTo(X + IW * 0.18, Y + IH * 0.72); c.lineTo(X + IW * 0.47, Y + IH * 0.56); c.lineTo(X + IW * 0.56, Y + IH * 0.56); c.lineTo(X + IW * 0.86, Y + IH * 0.72); c.fill();
    c.strokeStyle = 'rgba(30,26,22,0.75)'; c.lineWidth = 1.4;
    for (let yy = Y + IH * 0.72; yy < Y + IH; yy += 4) { c.beginPath(); for (let xx = X; xx <= X + IW; xx += 20) c.lineTo(xx, yy + Math.sin(xx * 0.08 + yy) * 1.5); c.stroke(); }
    // a small barque on the water
    c.fillStyle = '#1e1a16'; c.fillRect(X + 60, Y + IH * 0.8, 40, 6); c.fillRect(X + 78, Y + IH * 0.8 - 34, 2, 34);
    c.beginPath(); c.moveTo(X + 80, Y + IH * 0.8 - 32); c.lineTo(X + 98, Y + IH * 0.8 - 8); c.lineTo(X + 80, Y + IH * 0.8 - 8); c.fill();
    c.restore();
    c.strokeStyle = '#1a1714'; c.lineWidth = 3; c.strokeRect(X, Y, IW, IH);
    c.fillStyle = '#1a1714'; c.font = font(26, 700, 'serif', true); c.fillText('The Eruption of Krakatoa', X + IW / 2, Y + IH + 40);
  });
}

export function makeNewspaper(head, sub, city, date) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.37, 8, 8), new THREE.MeshStandardMaterial({ map: newspaperTexture(head, sub, city, date), roughness: 0.85, side: THREE.DoubleSide }));
  const p = m.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2.5) * 0.02);
  m.geometry.computeVertexNormals();
  return shadowed(m);
}

export function makeSeismograph() {
  const g = new THREE.Group();
  const wood = M(0x5a3520, 0.45), brass = M(0xc0954a, 0.25, 0.95);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.2), wood); base.position.y = 0.075; g.add(base);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 48, 1), new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.8, map: null }));
  drum.rotation.z = Math.PI / 2; drum.position.set(0.3, 0.65, 0); g.add(drum);
  const paperTex = canvasTex(2048, 512, () => {});
  drum.material.map = paperTex;
  for (const x of [-0.6, 1.2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), brass); s.position.set(x, 0.45, 0); g.add(s); }
  const arm = new THREE.Group(); arm.position.set(-0.9, 1.15, -0.2); g.add(arm);
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.95), brass); a.position.z = 0.4; a.rotation.x = 0.55; arm.add(a);
  const weight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), M(0x333333, 0.3, 0.9)); weight.position.set(-0.9, 1.15, -0.25); g.add(weight);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), brass); stand.position.set(-0.9, 0.6, -0.35); g.add(stand);
  const pen = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 8), M(0x111111, 0.3)); pen.rotation.x = Math.PI; pen.position.set(0.3, 1.1, 0.3); g.add(pen);
  g.userData = { drum, paperTex, pen };
  return shadowed(g);
}

export function makeTNT() {
  const g = new THREE.Group();
  const lbl = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#7a4b25'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(40,20,10,${0.2 + (i % 2) * 0.15})`; c.fillRect(0, i * 29, w, 2); }
    c.fillStyle = '#c3281e'; c.font = font(120, 900, 'sans'); c.textAlign = 'center'; c.fillText('TNT', w / 2, h * 0.62);
    c.font = font(28, 800, 'sans'); c.fillStyle = '#1a1a1a'; c.fillText('HIGH EXPLOSIVE', w / 2, h * 0.86);
  });
  const crate = new THREE.BoxGeometry(1, 0.5, 0.6);
  const mats = [M(0x7a4b25, 0.7), M(0x7a4b25, 0.7), M(0x6a3f1e, 0.7), M(0x6a3f1e, 0.7), new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.7 })];
  const pos = [[0, 0.25, 0], [1.05, 0.25, 0.05], [0.5, 0.75, 0.02], [-1.05, 0.25, -0.05], [-0.52, 0.75, 0.0], [0, 1.25, 0.0]];
  for (const p of pos) { const b = new THREE.Mesh(crate, mats); b.position.set(...p); b.rotation.y = (p[0] * 0.05); g.add(b); }
  return shadowed(g);
}

export function makeThermometer() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 2.6, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1 }));
  glass.position.y = 1.5; g.add(glass);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), M(0xd31f12, 0.2, 0, { emissive: 0x6a0800 })); bulb.position.y = 0.1; g.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 16), M(0xd31f12, 0.2, 0, { emissive: 0x6a0800 })); g.add(col);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.06), M(0xe9e1cf, 0.6)); plate.position.set(0, 1.5, -0.16); g.add(plate);
  g.userData = { col, set(v) { const h = 0.2 + 2.6 * clamp(v); col.scale.y = h; col.position.y = 0.25 + h / 2; } };
  g.userData.set(0.2);
  return shadowed(g);
}

export function makeBook(title, sub) {
  const tex = canvasTex(512, 720, (c, w, h) => {
    c.fillStyle = '#5a1d14'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d4af5a'; c.lineWidth = 6; c.strokeRect(30, 30, w - 60, h - 60);
    c.lineWidth = 2; c.strokeRect(46, 46, w - 92, h - 92);
    c.fillStyle = '#e6c56d'; c.textAlign = 'center';
    c.font = font(40, 700, 'serif'); c.fillText('THE ERUPTION', w / 2, 200); c.fillText('OF KRAKATOA', w / 2, 250);
    c.font = font(26, 400, 'serif', true); c.fillText('and Subsequent Phenomena', w / 2, 310);
    c.font = font(22, 700, 'sans'); c.fillText(title, w / 2, 560); c.font = font(20, 500, 'ui'); c.fillText(sub, w / 2, 600);
  });
  const g = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  const side = M(0x5a1d14, 0.6), pages = M(0xede2c8, 0.9);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 1.4), [pages, side, cover, side, pages, pages]);
  b.position.y = 0.11; g.add(b);
  return shadowed(g);
}

export function makeCube(color, opacity, edges = 0xffffff) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.15, transmission: 0, clearcoat: 0.6 }));
  g.add(c);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: edges }));
  g.add(e);
  return g;
}

export function makeHourglass() {
  const g = new THREE.Group();
  const wood = M(0x5b351e, 0.45);
  for (const y of [0, 1.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32), wood); p.position.y = y; g.add(p); }
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 10), wood); r.position.set(Math.cos(a) * 0.45, 0.8, Math.sin(a) * 0.45); g.add(r); }
  const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector2(0.06 + Math.pow(Math.abs(u - 0.5) * 2, 0.8) * 0.32, 0.05 + u * 1.5)); }
  const gl = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05 }));
  g.add(gl);
  const sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 24), M(0xd9b46a, 0.8)); sandTop.rotation.x = Math.PI; sandTop.position.y = 1.15; g.add(sandTop);
  const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 24), M(0xd9b46a, 0.8)); sandBot.position.y = 0.25; g.add(sandBot);
  g.userData = { sandTop, sandBot, set(v) { sandTop.scale.setScalar(Math.max(0.01, 1 - v)); sandBot.scale.set(0.3 + 0.7 * v, 0.2 + 0.8 * v, 0.3 + 0.7 * v); } };
  return shadowed(g);
}

export function makeLantern() {
  const g = new THREE.Group();
  const metal = M(0x2a2622, 0.4, 0.7);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16), metal); g.add(b);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.36, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd090, emissive: 0xffa040, emissiveIntensity: 3, transparent: true, opacity: 0.8 }));
  glass.position.y = 0.22; g.add(glass);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.15, 16), metal); top.position.y = 0.47; g.add(top);
  return g;
}
