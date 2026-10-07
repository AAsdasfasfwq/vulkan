import * as THREE from 'three';
import { BaseSet, val } from './base.js';
import { makeFigure, poseFigure, addProp } from '../world/figures.js';
import { makePalmGeometry, addSway } from '../world/plants.js';
import { canvasTex, makeGauge, makeTelegraphKey, makeBook, makeLantern, makeHourglass } from '../world/props.js';
import { PuffCloud } from '../world/particles.js';
import { clamp, lerp, rng } from '../core/math.js';
import { font } from '../overlay/kit.js';

const M = (c, r = 0.6, m = 0, ex = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...ex });

function planks(w, h, base = '#7a5233') {
  const t = canvasTex(1024, 1024, (c, W, H) => {
    const r = rng(3);
    for (let i = 0; i < 16; i++) {
      const v = 0.8 + r() * 0.35;
      c.fillStyle = base; c.globalAlpha = 1; c.fillRect(0, (i * H) / 16, W, H / 16);
      c.fillStyle = `rgba(${40 * v},${25 * v},${12 * v},0.35)`; c.fillRect(0, (i * H) / 16, W, H / 16);
      for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(30,18,8,${r() * 0.15})`; c.fillRect(r() * W, (i * H) / 16 + r() * (H / 16), r() * 300, 2); }
      c.fillStyle = 'rgba(20,12,6,0.6)'; c.fillRect(0, ((i + 1) * H) / 16 - 3, W, 3);
      c.fillRect(r() * W, (i * H) / 16, 3, H / 16);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w, h);
  return t;
}

// Lime-washed ochre plaster over a teak wainscot, painted frieze and two framed paintings.
function verandaWall() {
  return canvasTex(2048, 528, (c, W, H) => {
    const r = rng(21);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#c99a5c'); g.addColorStop(0.7, '#d8ad6c'); g.addColorStop(1, '#b98a52');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,235,200' : '90,55,25'},${r() * 0.06})`; const s = 10 + r() * 90; c.beginPath(); c.ellipse(r() * W, r() * H, s, s * 0.6, r() * 3, 0, 6.28); c.fill(); }
    // frieze
    const fy = H * (1 - 2.95 / 3.6);
    c.fillStyle = '#7a2418'; c.fillRect(0, fy, W, 16); c.fillStyle = '#e0b860'; c.fillRect(0, fy + 18, W, 3); c.fillRect(0, fy - 4, W, 2);
    for (let x = 0; x < W; x += 48) { c.fillStyle = '#e0b860'; c.beginPath(); c.moveTo(x, fy + 8); c.lineTo(x + 8, fy + 2); c.lineTo(x + 16, fy + 8); c.lineTo(x + 8, fy + 14); c.fill(); }
    // wainscot
    const wy = H * (1 - 1.0 / 3.6);
    c.fillStyle = '#4a2c16'; c.fillRect(0, wy, W, H - wy);
    c.fillStyle = '#2e1a0c'; c.fillRect(0, wy, W, 8);
    for (let x = 12; x < W; x += 110) { c.strokeStyle = 'rgba(20,10,4,0.8)'; c.lineWidth = 4; c.strokeRect(x, wy + 22, 90, H - wy - 40); c.strokeStyle = 'rgba(160,110,60,0.35)'; c.lineWidth = 2; c.strokeRect(x + 4, wy + 26, 82, H - wy - 48); }
    // paintings (between the doors at x = -2 and x = +2 m)
    for (const [xm, kind] of [[-2, 0], [2, 1]]) {
      const cx = ((xm + 7) / 14) * W, cy = H * (1 - 2.0 / 3.6), pw = 150, ph = 110;
      c.fillStyle = '#2a1608'; c.fillRect(cx - pw / 2 - 14, cy - ph / 2 - 14, pw + 28, ph + 28);
      c.fillStyle = '#c8962e'; c.fillRect(cx - pw / 2 - 6, cy - ph / 2 - 6, pw + 12, ph + 12);
      const sky = c.createLinearGradient(0, cy - ph / 2, 0, cy + ph / 2);
      if (kind) { sky.addColorStop(0, '#2d4f7a'); sky.addColorStop(0.6, '#e9a45a'); sky.addColorStop(1, '#3a5a3a'); }
      else { sky.addColorStop(0, '#7fa8c8'); sky.addColorStop(0.6, '#f0d8a8'); sky.addColorStop(1, '#2e5a8a'); }
      c.fillStyle = sky; c.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
      c.fillStyle = kind ? '#24462a' : '#2f6a3a';
      c.beginPath(); c.moveTo(cx - pw / 2, cy + ph * 0.25); c.quadraticCurveTo(cx - 10, cy - ph * 0.3, cx + 30, cy + ph * 0.12); c.lineTo(cx + pw / 2, cy + ph * 0.3); c.lineTo(cx + pw / 2, cy + ph / 2); c.lineTo(cx - pw / 2, cy + ph / 2); c.fill();
      if (!kind) { c.fillStyle = '#3a2410'; c.fillRect(cx + 20, cy + 6, 26, 6); c.fillRect(cx + 31, cy - 18, 2, 24); c.fillStyle = '#eee'; c.beginPath(); c.moveTo(cx + 33, cy - 16); c.lineTo(cx + 44, cy + 2); c.lineTo(cx + 33, cy + 2); c.fill(); }
    }
  });
}
function tilesTex() {
  const t = canvasTex(1024, 1024, (c, W, H) => {
    const n = 4, s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s;
      c.fillStyle = '#e6d6b8'; c.fillRect(x, y, s, s);
      c.fillStyle = '#9a3a22'; c.beginPath(); c.moveTo(x + s / 2, y + 12); c.lineTo(x + s - 12, y + s / 2); c.lineTo(x + s / 2, y + s - 12); c.lineTo(x + 12, y + s / 2); c.closePath(); c.fill();
      c.fillStyle = '#e6d6b8'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.26, 0, 6.28); c.fill();
      c.fillStyle = '#1f4a6a'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.ellipse(x + s / 2 + Math.cos(a) * s * 0.12, y + s / 2 + Math.sin(a) * s * 0.12, s * 0.09, s * 0.04, a, 0, 6.28); c.fill(); }
      c.fillStyle = '#c89a3a'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.05, 0, 6.28); c.fill();
      c.fillStyle = '#1f4a6a'; for (const [cx, cy] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]]) { c.beginPath(); c.arc(cx, cy, s * 0.14, 0, 6.28); c.fill(); }
      c.strokeStyle = 'rgba(60,40,25,0.55)'; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14 / 1.3, 10 / 1.3);
  return t;
}
function shutterTex() {
  return canvasTex(256, 512, (c, W, H) => {
    c.fillStyle = '#1f4a3c'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#163629'; c.fillRect(W / 2 - 3, 0, 6, H);
    for (let y = 20; y < H - 20; y += 14) { c.fillStyle = '#2d6150'; c.fillRect(16, y, W / 2 - 26, 7); c.fillRect(W / 2 + 10, y, W / 2 - 26, 7); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(16, y + 7, W / 2 - 26, 3); c.fillRect(W / 2 + 10, y + 7, W / 2 - 26, 3); }
    c.strokeStyle = '#0f2a20'; c.lineWidth = 10; c.strokeRect(5, 5, W - 10, H - 10);
    c.fillStyle = '#c8a040'; c.beginPath(); c.arc(W / 2 - 14, H * 0.52, 6, 0, 6.28); c.fill();
  });
}

export class InteriorSet extends BaseSet {
  constructor(engine, film) {
    super(engine, film);
    const sc = this.scene;
    this.rooms = {};
    // ---------------- VERANDA (Batavia, sunset) ----------------
    const v = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M(0xffffff, 0.35, 0, { map: tilesTex() }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; v.add(floor);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M(0xffffff, 0.7, 0, { map: planks(4, 3, '#6a4426') })); roof.rotation.x = Math.PI / 2; roof.position.y = 3.6; v.add(roof);
    for (let i = 0; i < 7; i++) { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 10), M(0x3a2212, 0.6)); beam.position.set(-6 + i * 2, 3.49, 0); v.add(beam); }
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.6), M(0xffffff, 0.9, 0, { map: verandaWall() })); wall.position.set(0, 1.8, -5); wall.receiveShadow = true; v.add(wall);
    for (const sx of [-7, 7]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.6), M(0xffffff, 0.9, 0, { map: verandaWall() })); sw.rotation.y = -Math.sign(sx) * Math.PI / 2; sw.position.set(sx, 1.8, 0); sw.receiveShadow = true; v.add(sw); }
    for (let i = 0; i < 6; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 3.6, 16), M(0xf3efe4, 0.5)); col.position.set(-6 + i * 2.4, 1.8, 4.5); col.castShadow = true; v.add(col); }
    for (let i = 0; i < 30; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), M(0xf0ebdf, 0.6)); b.position.set(-7 + i * 0.48, 0.4, 4.5); v.add(b); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 0.16), M(0xf0ebdf, 0.6)); rail.position.set(0, 0.84, 4.5); v.add(rail);
    // doors/windows with shutters
    const shut = shutterTex();
    for (let i = 0; i < 3; i++) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.62, 0.08), M(0xf0ead8, 0.5)); fr.position.set(-4 + i * 4, 1.31, -4.97); v.add(fr);
      const d = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.4), M(0xffffff, 0.55, 0, { map: shut })); d.position.set(-4 + i * 4, 1.2, -4.92); v.add(d);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(0.66, 24, 0, Math.PI), M(0x8a5a2a, 0.5, 0, { emissive: 0x2a1406 })); arch.position.set(-4 + i * 4, 2.45, -4.92); v.add(arch);
    }
    // table + chairs + glasses + bottle + newspaper
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 32), M(0x5b3820, 0.35)); top.position.y = 0.76; table.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.76, 10), M(0x3b2414, 0.4)); leg.position.y = 0.38; table.add(leg);
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.82, 0.02, 32), M(0xf4f1ea, 0.85)); cloth.position.y = 0.79; table.add(cloth);
    this.glasses = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.11, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.03, clearcoat: 1, side: THREE.DoubleSide }));
      glass.position.y = 0.055; g.add(glass);
      const gin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.037, 0.07, 20), new THREE.MeshPhysicalMaterial({ color: 0xe6f0ea, transparent: true, opacity: 0.45, roughness: 0.02 }));
      gin.position.y = 0.037; g.add(gin);
      for (let k = 0; k < 3; k++) { const ice = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.7, roughness: 0.05 })); ice.position.set((k - 1) * 0.012, 0.07 + k * 0.004, (k % 2) * 0.01); ice.rotation.set(k, k * 2, 0); g.add(ice); }
      const lime = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.005, 14), M(0x9bd03a, 0.5)); lime.rotation.z = 1.2; lime.position.set(0.04, 0.1, 0); g.add(lime);
      g.position.set(Math.cos(i * 2.1) * 0.35, 0.8, Math.sin(i * 2.1) * 0.35);
      table.add(g); this.glasses.push(g);
    }
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 18), new THREE.MeshPhysicalMaterial({ color: 0x3d6b4f, transparent: true, opacity: 0.75, roughness: 0.1 })); bottle.position.set(-0.15, 0.96, -0.1); table.add(bottle);
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide, map: canvasTex(512, 360, (c, W, H) => {
      c.fillStyle = '#eee5d0'; c.fillRect(0, 0, W, H); c.fillStyle = '#1a1714'; c.font = font(34, 700, 'serif'); c.fillText('JAVA-BODE', 20, 50); c.fillRect(20, 62, W - 40, 2);
      c.font = font(18, 500, 'ui'); const rows = [['Koffie', '+2.4'], ['Suiker', '-0.8'], ['Tabak', '+1.1'], ['Tin', '+0.6'], ['Nederl. Handel-Mij', '+3.2']];
      rows.forEach(([a, b], i) => { c.fillText(a, 24, 100 + i * 34); c.fillStyle = b[0] === '+' ? '#1d6b2a' : '#9a1a12'; c.fillText(b, 380, 100 + i * 34); c.fillStyle = '#1a1714'; });
      c.font = font(14, 400, 'ui'); for (let i = 0; i < 6; i++) c.fillRect(24, 280 + i * 12, 300 + (i % 3) * 40, 3);
    }) }));
    tick.rotation.x = -Math.PI / 2; tick.rotation.z = 0.4; tick.position.set(0.25, 0.805, 0.1); table.add(tick);
    table.position.set(0, 0, 1.5);
    v.add(table);
    this.table = table;
    for (let i = 0; i < 3; i++) {
      const ch = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), M(0x6a4428, 0.5)); seat.position.y = 0.45; ch.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.04), M(0x6a4428, 0.5)); back.position.set(0, 0.75, -0.23); ch.add(back);
      ch.position.set(Math.cos(i * 2.1 + 0.6) * 1.15, 0, 1.5 + Math.sin(i * 2.1 + 0.6) * 1.15);
      ch.lookAt(0, 0, 1.5);
      v.add(ch);
    }
    // ceiling fan
    this.fan = new THREE.Group();
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.16), M(0x5b3820, 0.4)); b.position.x = 0.55; const piv = new THREE.Group(); piv.rotation.y = (i * Math.PI) / 2; piv.add(b); this.fan.add(piv); }
    this.fan.position.set(0, 3.3, 1.5); v.add(this.fan);
    // garden palms outside
    this.plantU = { uTime: this.uTime, uWind: this.uWind, uAsh: { value: 0 } };
    const palmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }); addSway(palmMat, this.plantU, 0.5);
    const palms = new THREE.InstancedMesh(makePalmGeometry(), palmMat, 10);
    const m4 = new THREE.Matrix4(), r = rng(4);
    for (let i = 0; i < 10; i++) { m4.compose(new THREE.Vector3(-14 + i * 3.4 + r() * 2, -0.5, 9 + r() * 8), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(1, 1, 1)); palms.setMatrixAt(i, m4); }
    v.add(palms);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M(0x3d6a22, 0.95)); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.6, 200); v.add(lawn);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), M(0x1c4a6a, 0.15, 0.3)); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.8, 2400); v.add(sea);
    // decor: potted plants, rattan, hanging lanterns, rug, curtains
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.0), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, 360, (c, W, H) => {
      c.fillStyle = '#6a1d14'; c.fillRect(0, 0, W, H); c.strokeStyle = '#d4af5a'; c.lineWidth = 10; c.strokeRect(20, 20, W - 40, H - 40);
      c.fillStyle = '#1d3a5a'; c.fillRect(50, 50, W - 100, H - 100); c.strokeStyle = '#e8c070'; c.lineWidth = 4;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(W / 2, H / 2, 40 + i * 30, 25 + i * 20, 0, 0, 6.28); c.stroke(); }
    }) }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 1.5); v.add(rug);
    const potMat = M(0x9a4a2a, 0.7), leafMat = M(0x2f6a22, 0.7);
    for (const [x, z, k] of [[-5.5, -3.8, 1.2], [5.5, -3.8, 1.1], [-5.6, 3.6, 0.9], [5.4, 3.6, 1.0], [-2.5, -4.2, 0.8]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * k, 0.24 * k, 0.55 * k, 18), potMat); pot.position.set(x, 0.27 * k, z); v.add(pot);
      for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.12 * k, 1.2 * k, 5), leafMat); const a = (i / 9) * 6.28; l.position.set(x + Math.cos(a) * 0.25 * k, 0.9 * k, z + Math.sin(a) * 0.25 * k); l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); v.add(l); }
    }
    for (let i = 0; i < 4; i++) {
      const ln = makeLantern(); ln.scale.setScalar(1.1); ln.position.set(-4.8 + i * 3.2, 2.7, 3.6); v.add(ln);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.85, 4), M(0x222222)); chain.position.set(-4.8 + i * 3.2, 3.2, 3.6); v.add(chain);
    }
    const curtMat = M(0xd8c9a8, 0.9, 0, { side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) { const cu = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.2, 6, 1), curtMat); const cp = cu.geometry.attributes.position; for (let k = 0; k < cp.count; k++) cp.setZ(k, Math.sin(cp.getX(k) * 25) * 0.04); cu.geometry.computeVertexNormals(); cu.position.set(-6 + i * 2.4 + 0.35, 1.9, 4.35); v.add(cu); }
    // side table with fruit bowl & cigar box
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24), M(0x5b3820, 0.35)); st.position.set(-3.2, 0.62, 2.6); v.add(st);
    const stl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8), M(0x3b2414, 0.4)); stl.position.set(-3.2, 0.31, 2.6); v.add(stl);
    for (let i = 0; i < 6; i++) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M([0xe0a020, 0xd84a1a, 0x9bc23a][i % 3], 0.5)); fr.position.set(-3.2 + Math.cos(i) * 0.12, 0.68, 2.6 + Math.sin(i) * 0.12); v.add(fr); }
    this.rooms.veranda = v;
    // ---------------- STUDY (Royal Society / science) ----------------
    const s = new THREE.Group();
    const sfloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), M(0xffffff, 0.5, 0, { map: planks(4, 3, '#4a2c18') })); sfloor.rotation.x = -Math.PI / 2; sfloor.receiveShadow = true; s.add(sfloor);
    const swall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), M(0x2e3b2c, 0.85)); swall.position.set(0, 2, -4); s.add(swall);
    const lwall = swall.clone(); lwall.rotation.y = Math.PI / 2; lwall.position.set(-5, 2, 0); s.add(lwall);
    // bookshelves
    const bookCols = [0x6a1d14, 0x1d3a5a, 0x2f4a22, 0x5a4220, 0x3a1f3f, 0x7a5a2a];
    for (let sh = 0; sh < 5; sh++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 0.4), M(0x3b2414, 0.5)); shelf.position.set(-1.5, 0.4 + sh * 0.65, -3.75); s.add(shelf);
      let x = -3.9;
      while (x < 0.9) { const w = 0.05 + r() * 0.07, h = 0.4 + r() * 0.18; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), M(bookCols[Math.floor(r() * 6)], 0.7)); b.position.set(x + w / 2, 0.43 + sh * 0.65 + h / 2, -3.72); b.rotation.z = (r() - 0.5) * 0.05; s.add(b); x += w + 0.005; }
    }
    // desk with instruments
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.3), M(0x4a2a16, 0.35)); desk.position.set(1.0, 0.8, -1.0); desk.castShadow = desk.receiveShadow = true; s.add(desk);
    for (const [x, z] of [[-0.2, -1.55], [2.2, -1.55], [-0.2, -0.45], [2.2, -0.45]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), M(0x3b2414, 0.4)); l.position.set(x, 0.4, z); s.add(l); }
    const brass = M(0xc49a4c, 0.25, 0.95);
    // globe on stand
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), M(0xc9b48a, 0.5)); gl.position.set(2.0, 1.28, -1.25); s.add(gl);
    const gring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 8, 40), brass); gring.position.copy(gl.position); gring.rotation.y = 0.4; s.add(gring);
    const gst = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 0.42, 12), brass); gst.position.set(2.0, 1.02, -1.25); s.add(gst);
    this.globeProp = gl;
    // telescope
    const tel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.1, 20), brass); tel.position.set(-0.3, 1.45, -1.2); tel.rotation.z = 1.0; s.add(tel);
    const tri = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), brass); tri.position.set(-0.15, 1.1, -1.2); s.add(tri);
    // microscope
    const mic = new THREE.Group();
    const mb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 20), M(0x111111, 0.4, 0.5)); mic.add(mb);
    const marm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.06), brass); marm.position.set(0, 0.17, -0.05); mic.add(marm);
    const mtube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 16), brass); mtube.position.set(0, 0.28, 0.02); mtube.rotation.x = 0.3; mic.add(mtube);
    mic.position.set(0.9, 0.84, -1.3); s.add(mic);
    // books, papers, lamp, ink, maps
    const book = makeBook('ROYAL SOCIETY', 'LONDON · 1888'); book.scale.setScalar(0.38); book.position.set(0.6, 0.84, -0.8); book.rotation.y = 0.3; s.add(book);
    this.book = book;
    for (let i = 0; i < 6; i++) { const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), M(0xeae1cc, 0.9)); pp.rotation.x = -Math.PI / 2; pp.rotation.z = r() * 1.5; pp.position.set(1.2 + r() * 0.8, 0.842 + i * 0.002, -0.9 + r() * 0.3); s.add(pp); }
    const map = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(1024, 680, (c, W, H) => {
      c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(90,70,40,0.4)'; c.lineWidth = 1; for (let i = 0; i < 18; i++) { c.beginPath(); c.moveTo(0, i * 40); c.lineTo(W, i * 40); c.stroke(); c.beginPath(); c.moveTo(i * 60, 0); c.lineTo(i * 60, H); c.stroke(); }
      c.fillStyle = 'rgba(120,90,50,0.55)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(100 + i * 100, 200 + Math.sin(i) * 120, 70, 40 + i * 4, i, 0, 6.28); c.fill(); }
      c.fillStyle = '#9a1a12'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(50 + r() * (W - 100), 50 + r() * (H - 100), 6, 0, 6.28); c.fill(); }
      c.fillStyle = '#2a1e12'; c.font = font(36, 700, 'serif', true); c.fillText('Observations of unusual skies, 1883–84', 40, H - 40);
    }) }));
    map.position.set(2.5, 2.1, -3.95); s.add(map);
    const lamp = makeLantern(); lamp.position.set(-0.05, 0.84, -0.7); s.add(lamp);
    this.lampLight = new THREE.PointLight(0xffa548, 6, 8, 1.6); this.lampLight.position.set(-0.05, 1.2, -0.7); this.lampLight.castShadow = true; s.add(this.lampLight);
    const hg = makeHourglass(); hg.scale.setScalar(0.18); hg.position.set(1.7, 0.84, -0.5); s.add(hg);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.1) })); win.position.set(-4.98, 2.0, -1.5); win.rotation.y = Math.PI / 2; s.add(win);
    this.rooms.study = s;
    // ---------------- TELEGRAPH OFFICE ----------------
    const t = new THREE.Group();
    const tfloor = sfloor.clone(); t.add(tfloor);
    const twall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), M(0x6b5a40, 0.85)); twall.position.set(0, 2, -4); t.add(twall);
    const tdesk = desk.clone(); t.add(tdesk);
    const key = makeTelegraphKey(); key.scale.setScalar(0.35); key.position.set(0.7, 0.84, -1.0); t.add(key);
    this.tkey = key;
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.06), M(0xf0e8d4, 0.8)); tape.rotation.x = -Math.PI / 2; tape.position.set(1.6, 0.845, -0.8); t.add(tape);
    const tlamp = makeLantern(); tlamp.position.set(0.0, 0.84, -1.3); t.add(tlamp);
    const tl = new THREE.PointLight(0xffa548, 6, 8, 1.6); tl.position.set(0.0, 1.25, -1.3); t.add(tl);
    for (let i = 0; i < 8; i++) { const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 10), M(0x5fa070, 0.2)); ins.position.set(-2 + i * 0.6, 3.2, -3.9); t.add(ins); }
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 6, 4), M(0x222222)); wire.rotation.z = Math.PI / 2; wire.position.set(0, 3.25, -3.9); t.add(wire);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.35, 40), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, W, H) => { c.fillStyle = '#efe7d6'; c.beginPath(); c.arc(128, 128, 126, 0, 6.28); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 6; c.stroke(); c.font = font(26, 700, 'serif'); c.fillStyle = '#111'; c.textAlign = 'center'; for (let i = 1; i <= 12; i++) { const a = (i / 12) * 6.28 - 1.57; c.fillText(String(i), 128 + Math.cos(a) * 95, 137 + Math.sin(a) * 95); } }) }));
    clock.position.set(-1.5, 2.6, -3.95); t.add(clock);
    this.clockHands = new THREE.Group(); this.clockHands.position.set(-1.5, 2.6, -3.93);
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.01), M(0x111111)); hh.position.y = 0.09; this.clockHands.add(hh);
    const mh = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.28, 0.01), M(0x111111)); mh.position.y = 0.14; mh.name = 'm'; const mp = new THREE.Group(); mp.add(mh); this.clockHands.add(mp); this.minute = mp;
    t.add(this.clockHands);
    this.rooms.telegraph = t;
    // ---------------- OFFICE (taxes) ----------------
    const o = new THREE.Group();
    const of = sfloor.clone(); o.add(of);
    const ow = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), M(0xd9cfb8, 0.85)); ow.position.set(0, 2, -4); o.add(ow);
    const od = desk.clone(); o.add(od);
    // coins & ledger
    const coinG = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20);
    const coinM = M(0xd4a944, 0.25, 1);
    for (let i = 0; i < 40; i++) { const c = new THREE.Mesh(coinG, coinM); c.position.set(1.2 + (i % 5) * 0.07 + r() * 0.01, 0.844 + Math.floor(i / 5) * 0.006, -0.9 + Math.floor(i / 20) * 0.08); o.add(c); }
    const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.45), [M(0xeae1cc), M(0xeae1cc), M(0x6a1d14), M(0x6a1d14), M(0xeae1cc), M(0xeae1cc)]); ledger.position.set(0.5, 0.86, -0.9); o.add(ledger);
    const olamp = makeLantern(); olamp.position.set(-0.1, 0.84, -1.3); o.add(olamp);
    const ol = new THREE.PointLight(0xffa548, 5, 8, 1.6); ol.position.set(-0.1, 1.25, -1.3); o.add(ol);
    const portrait = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: canvasTex(256, 320, (c, W, H) => { c.fillStyle = '#5a3a1a'; c.fillRect(0, 0, W, H); c.fillStyle = '#2a2a24'; c.fillRect(20, 20, W - 40, H - 40); c.fillStyle = '#c9a77a'; c.beginPath(); c.ellipse(W / 2, 120, 40, 52, 0, 0, 6.28); c.fill(); c.fillStyle = '#1a1a1a'; c.fillRect(70, 170, 116, 130); c.fillStyle = '#d4af5a'; c.font = font(16, 700, 'serif'); c.textAlign = 'center'; c.fillText('WILLEM III', W / 2, 300); }) }));
    portrait.position.set(1.0, 2.3, -3.95); o.add(portrait);
    // Dutch flag
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6, 1, 3), new THREE.MeshStandardMaterial({ map: canvasTex(90, 60, (c) => { c.fillStyle = '#ae1c28'; c.fillRect(0, 0, 90, 20); c.fillStyle = '#fff'; c.fillRect(0, 20, 90, 20); c.fillStyle = '#21468b'; c.fillRect(0, 40, 90, 20); }), side: THREE.DoubleSide }));
    flag.position.set(-2.2, 2.5, -3.9); o.add(flag);
    this.rooms.office = o;
    for (const g of Object.values(this.rooms)) { g.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); sc.add(g); }
    this.people = [];
    this.puffs = new PuffCloud(300);
    sc.add(this.puffs.mesh);
  }

  nearFar() { return [0.03, 6000]; }
  fx(shot) { const m = this.moodState || {}; return { exposure: (m.exposure ?? 1) * 1.05, grade: 'warm', bloom: 0.7 }; }

  prepare(shot) {
    const p = shot.p || {};
    const room = p.room ?? 'veranda';
    for (const [k, g] of Object.entries(this.rooms)) g.visible = k === room;
    this.sky.mesh.visible = room === 'veranda';
    this.mood(p.mood ?? (room === 'veranda' ? 'golden' : 'dusk'), p.moodOv ?? { sunEl: 8, sunAz: 10 }, null, 0);
    if (room !== 'veranda') { this.sun.intensity = 0.6; this.hemi.intensity = 0.25; this.scene.background = new THREE.Color(0x0a0806); }
    else this.scene.background = null;
    this.env(room === 'veranda' ? 0.9 : 0.35);
    for (const f of this.people) f.visible = false;
    for (const pd of p.people || []) {
      let f = this.people.find((x) => !x.visible && x.userData.style === pd.style && x.userData.propKind === (pd.prop || null));
      if (!f) { f = makeFigure(pd.style, 700 + this.people.length * 5); if (pd.prop) addProp(f, pd.prop); f.userData.propKind = pd.prop || null; this.people.push(f); this.scene.add(f); }
      f.visible = true; f.userData.def = pd;
    }
    this.active = this.people.filter((f) => f.visible);
    this.room = room;
  }

  update(shot, lt, vt, fx) {
    const p = shot.p || {};
    const u = clamp(lt / shot.dur);
    this.uTime.value = vt;
    this.sky.uniforms.uSkyTime.value = vt;
    if (this.room === 'veranda') this.mood(p.mood ?? 'golden', p.moodOv ?? { sunEl: 8, sunAz: 10 }, null, 0);
    fx.exposure = (fx.exposure ?? 1) * (p.exposure ?? 1);
    this.fan.rotation.y = vt * 2.2;
    const quake = val(p.quake, u, lt, 0);
    // glasses tremble on the table (earthquakes / pressure waves)
    for (const [i, g] of this.glasses.entries()) { g.position.x = Math.cos(i * 2.1) * 0.35 + Math.sin(vt * 40 + i) * 0.002 * quake; g.rotation.z = Math.sin(vt * 37 + i) * 0.03 * quake; }
    this.table.position.x = Math.sin(vt * 31) * 0.004 * quake;
    if (this.tkey.visible) this.tkey.userData.lever.rotation.z = (Math.sin(vt * 22) > 0.2 && Math.sin(vt * 3.1) > -0.3) ? -0.06 : 0;
    if (this.minute) this.minute.rotation.z = -vt * (p.clockSpeed ?? 0.1);
    this.globeProp.rotation.y = vt * 0.2;
    this.lampLight.intensity = 6 + Math.sin(vt * 11) * 0.4;
    for (const f of this.active) {
      const d = f.userData.def;
      f.position.set(d.at[0], d.at[2] ?? 0, d.at[1]);
      f.rotation.set(0, ((d.rot ?? 0) * Math.PI) / 180, 0);
      poseFigure(f, vt, typeof d.pose === 'function' ? d.pose(u, lt) : d.pose || {});
    }
  }

  afterCamera(shot, lt, vt, cam) {
    const look = this.engine.camState.look;
    this.fitShadow([look.x, 0.5, look.z], 6, 3);
  }
}
