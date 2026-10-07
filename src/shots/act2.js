// ACT II — 100 years before (1:38 – 2:38)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both, cup } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { islandHeight } from '../world/island.js';
import { XS } from '../sets/xsection.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp, smoothstep } from '../core/math.js';

const up = (x, z, h) => [x, islandHeight(x, z, {}) + h, z];

export default function act2(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  add(card(A.at('100 years before') - 0.15, '100 YEARS BEFORE', 'THE ERUPTION · 1783'));
  add(shot(A.at('The volcano is quiet') - L, 'strait', dolly([-6200, 12, -1200], [-6000, 14, -1100], [0, 300, 0], [0, 300, 0], 30, 'lin'), { mood: 'dawn', sea: 'calm', steam: { at: 'perboewatan', amount: 0.25, h: 300, alpha: 0.3 }, birds: { c: [-5000, 80, -900], r: 300, speed: 0.06, spread: 60, scale: 2.2 } }, { amb: 'oceanCalm', mus: 'calm', fx: { fadeIn: 0.3 } }));
  const t1680 = A.at('Krakatoa last stirred') - L;
  add(shot(t1680, 'strait', dolly([-3200, 160, -4600], [-2950, 150, -4400], [250, 900, -2500], [250, 1000, -2500], 40, 'lin'), { mood: 'golden', erupt: { at: 'perboewatan', height: 3500, intensity: 0.85, glow: 0.3, dark: 0.22, count: 700 }, sea: 'calm' }, {
    amb: 'rumbleSoft', fx: { sepia: 0.85, grain: 0.07, vignette: 0.6 }, sfx: [['projector', 0], ['boomFar', 0.8]],
    draw: both(word('1680', A.peek('1680') - t1680, { y: H * 0.36, size: 200, color: '#f2e2c4', tracking: 10, mode: 'blur' })),
  }));
  add(shot(A.at('but that eruption was moderate') - L, 'strait', orbit([250, 900, -2500], [5200, 5000], [-120, -110], [5, 6], 38), { mood: 'golden', erupt: { at: 'perboewatan', height: 3000, intensity: 0.7, glow: 0.3, dark: 0.24, count: 600 }, sea: 'calm' }, { amb: 'rumbleSoft', fx: { sepia: 0.85, grain: 0.07, vignette: 0.6 }, sfx: [['projector', 0]] }));
  add(shot(A.at('and the memory quickly faded') - L, 'strait', dolly([-4600, 140, 1400], [-4300, 150, 1200], [0, 400, -1200], [0, 400, -1200], 38, 'lin'), { mood: 'golden', erupt: { at: 'perboewatan', height: 2500, intensity: [0.6, 0.0], glow: 0.2, dark: 0.26, count: 500 }, sea: 'calm' }, { amb: 'rumbleSoft', fx: { sepia: 0.9, grain: 0.08, vignette: 0.65, fadeOut: 1.0, desat: 0.4 }, sfx: [['projector', 0]] }));

  add(shot(A.at('Deep beneath the Sunda Strait') - L, 'xsection', orbit([0, -16, -12], [120, 96], [-30, -18], [24, 14], 40, 'inOut'), { magma: 0.8, fill: 0.75, plateSpeed: 0.3, dim: 0.1 }, { amb: 'rumble', mus: 'unease', sfx: [['whooshDown', 0]] }));
  add(shot(A.at('tens of miles underground') - L, 'xsection', orbit([10, -20, -8], [70, 62], [-6, -12], [6, 6], 40), { magma: 0.9, fill: 0.75, plateSpeed: 0.3 }, {
    amb: 'rumble', draw: both(depthRuler()),
  }));
  add(shot(A.at('the Indo-Australian plate continues') - L, 'xsection', orbit([-4, -12, -6], [66, 60], [24, 30], [8, 9], 40), { magma: 0.9, fill: 0.75, hl: 1, plateSpeed: 0.7 }, {
    amb: 'rumble', draw: both(arrow3([-36, -3.6, 0.5], [-14, -4.2, 0.5], 0.1, { color: '#7fd0ff' }), arrow3([-10, -7.5, 0.5], [14, -20.5, 0.5], 0.5, { color: '#7fd0ff' }), pin3(XS.slab, 'INDO-AUSTRALIAN', 0.3, { dir: [-1, -1] }), pin3(XS.eurasian, 'EURASIAN', A.peek('Eurasian plate') - A.peek('the Indo-Australian plate continues'), { dir: [1, -1] })),
  }));
  add(flat(A.at('moving about as fast') - L, (k, lt, S) => fingernail(k, lt, S), { sfx: [['whoosh', 0], ['pop', 0.4], ['pop', 1.0]] }));
  add(shot(A.at('A plug of hardened lava') - L, 'xsection', dolly([5, 14, 24], [3, 11, 16], [0, 6, 0], [0, 7.5, 0], 38), { magma: 1, fill: 0.95, vent: 0.7, plug: [0, 1], pressure: 0.4 }, {
    amb: 'rumble', sfx: [['rockGrind', 0.3], ['thudLow', A.peek('sealed the vent') - A.peek('A plug of hardened')]], draw: pin3(XS.plug, 'HARDENED LAVA PLUG', A.peek('sealed') - A.peek('A plug of hardened'), { dir: [1, -1] }),
  }));
  add(shot(A.at('turning the mountain into a giant') - L, 'studio', dolly([2.2, 1.9, 3.6], [1.8, 1.7, 3.0], [0, 0.7, 0], [0, 0.75, 0], 38), { bg: 'ember', items: [{ kind: 'cooker', pos: [0, 0, 0], appear: 0, spin: 0.05, value: (u) => lerp(0.2, 1, u) }] }, {
    amb: 'none', sfx: [['valveRattle', 0.2]], draw: word('PRESSURE COOKER', A.peek('pressure cooker') - A.peek('turning the mountain into'), { y: 160, size: 84, tracking: 8 }),
  }));
  add(flat(A.at('With every passing decade') - L, (k, lt, S) => decades(k, lt, S), { sfx: [['counterTicks', 0.1], ['riser', 0.2]] }));
  add(shot(A.at('the pressure builds') - L, 'xsection', orbit([0, -9, 0], [30, 26], [10, 0], [6, 8], 38), { magma: 1, fill: 1, pressure: [0.4, 1], plug: 1, strain: [0.3, 1] }, { amb: 'rumble', sfx: [['rumble', 0], ['creak', 0.4]] }));

  // --- tropical paradise -----------------------------------------------------
  add(shot(A.at('On the surface, it is still') - L, 'coast', dolly([-70, 3.5, 30], [-60, 3.2, 22], [20, 6, -40], [24, 7, -40], 40, 'lin'), { layout: 'wild', mood: 'day', sea: 'calm', wind: 1.2 }, { amb: 'beach', mus: 'calm', sfx: [['whoosh', 0], ['birdsong', 0.3]], fx: { grade: 'tropical' } }));
  add(shot(A.at('No one lives on the island') - L, 'strait', dolly(up(-2600, -1500, 220), up(-2100, -900, 260), up(0, 400, 200), up(200, 700, 220), 44, 'lin'), { mood: 'day', wind: 1.2, birds: { c: [-2200, 300, -1100], r: 150, speed: 0.12, spread: 40 } }, { amb: 'jungle' }));
  add(shot(A.at('but sailors often stop there') - L, 'coast', dolly(cup(-14, -1, 1.7), cup(-16, -4, 1.7), cup(-24, -11, 1.2), cup(-26, -12, 1.1), 40), {
    layout: 'wild', mood: 'golden', sea: 'calm', barque: true, barquePos: [-60, 300],
    people: [{ style: 'sailor', at: [-20, -11], rot: -40, pose: { carry: true }, prop: 'bucket' }, { style: 'sailor2', at: [-27, -12], rot: 30, move: [0.6, 0.5], pose: { walk: 0.8, carry: true }, prop: 'log' }, { style: 'sailor', at: [-22, -13.5], rot: 160, pose: { sweep: 0 } }],
  }, { amb: 'beach', fx: { dof: { focus: 7, range: 4, bokeh: 3 } }, sfx: [['waveLap', 0.2]] }));
  add(shot(A.at('collect fresh water and wood') - L, 'coast', dolly([-30, 6, 14], [-26, 5, 10], [-22, 1.8, -10], [-22, 1.8, -10], 36), {
    layout: 'wild', mood: 'golden', sea: 'calm', barque: true, barquePos: [-60, 300],
    people: [{ style: 'sailor', at: [-21, -10], rot: -60, move: [0.7, -0.4], pose: { walk: 0.8, carry: true }, prop: 'bucket' }, { style: 'sailor2', at: [-25, -13], rot: 90, move: [0.9, 0], pose: { walk: 0.9, carry: true }, prop: 'log' }],
  }, { amb: 'beach' }));

  // --- crystals & gases -------------------------------------------------------
  add(shot(A.at('Beneath the thin crust') - L, 'xsection', orbit([0, -6, 0], [46, 34], [-18, -8], [18, 10], 40, 'inOut'), { magma: 1, fill: 0.9, crystals: 0.3, hl: 2 }, { amb: 'rumble', mus: 'unease', sfx: [['whooshDown', 0]] }));
  const tCr = A.at('andesite and') - L;
  add(shot(tCr, 'magma', dolly([6, 4, 22], [3, 2.6, 14], [0, 1, -6], [0, 1, -8], 42), { crystals: [0.1, 1], bubbles: 0.3, crust: 0.6 }, {
    amb: 'lava', sfx: [['crystal', 0.3], ['crystal', 1.2]],
    draw: both(word('ANDESITE', 0.15, { x: W * 0.3, y: H * 0.3, size: 70, tracking: 8 }), word('DACITE', A.peek('dacite') - tCr, { x: W * 0.7, y: H * 0.3, size: 70, tracking: 8 })),
  }));
  add(shot(A.at('As the magma cools') - L, 'xsection', orbit([0, -11, -2], [30, 24], [6, -6], [4, 5], 40), { magma: 1, fill: 0.9, crystals: 1, bubbles: [0, 1] }, { amb: 'rumble', sfx: [['bubbles', 0.2]] }));
  add(shot(A.at('the pressure from its dissolved') - L, 'magma', dolly([0, 2.2, 12], [0, 2.0, 9], [0, 1, -2], [0, 1.4, -3], 44), { crystals: 0.6, bubbles: 1, crust: 0.4, pressure: 0.5 }, { amb: 'lava', sfx: [['bubbles', 0], ['lavaBloop', 0.5]] }));
  const tG = A.at('water vapor') - L;
  const aC = A.peek('carbon dioxide') - tG, aS = A.peek('sulfur dioxide') - tG;
  add(shot(tG, 'studio', dolly([0, 1.6, 6.2], [0, 1.5, 5.4], [0, 0.9, 0], [0, 0.9, 0], 38), {
    bg: 'navy', items: [{ kind: 'H2O', pos: [-2.2, 1.0, 0], appear: 0.05, spin: 0.6, float: true }, { kind: 'CO2', pos: [0, 1.0, 0], appear: aC, spin: 0.6, float: true }, { kind: 'SO2', pos: [2.2, 1.0, 0], appear: aS, spin: 0.6, float: true }],
  }, {
    amb: 'none', sfx: [['pop', 0.05], ['pop', aC], ['pop', aS]],
    draw: both(molLabel([-2.2, 0.2, 0], 'H₂O', 'water vapor', 0.2), molLabel([0, 0.2, 0], 'CO₂', 'carbon dioxide', aC + 0.15), molLabel([2.2, 0.2, 0], 'SO₂', 'sulfur dioxide', aS + 0.15)),
  }));
  add(shot(A.at('steadily increases') - L, 'studio', dolly([0, 0.25, 2.4], [0, 0.2, 2.0], [0, 0, 0], [0, 0, 0], 36), { bg: 'dark', items: [{ kind: 'gauge', pos: [0, 0, 0], appear: 0, spin: 0, value: (u) => lerp(0.55, 0.85, u), jitter: 0.015 }] }, { amb: 'none', sfx: [['gaugeTick', 0.1]] }));
  add(shot(A.at('Deep underground') - L, 'studio', dolly([2.4, 1.2, 3.6], [1.9, 1.0, 2.9], [0, 0.8, 0], [0, 0.7, 0], 38), { bg: 'ember', items: [{ kind: 'spring', pos: [0, 0, 0], appear: 0, spin: 0.15, value: (u) => ease.inOut(u) * 0.85, glow: (u) => u }] }, {
    amb: 'none', sfx: [['springCreak', 0.2], ['riser', 0.6]], fx: { fadeOut: 0.25 }, subsOff: A.peek('the spring is') - A.peek('Deep underground') - 0.05,
    draw: word('the spring is winding tighter', A.peek('the spring is') - A.peek('Deep underground'), { y: H * 0.16, size: 52, mode: 'blur', tracking: 1 }),
  }));
  return S;
}

function depthRuler() {
  return (k, lt, S) => {
    const ctx = k.ctx;
    const a = ease.out(clamp((lt - 0.2) / 0.5));
    ctx.globalAlpha = a;
    const x = 150, y0 = 260, y1 = 860;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y0, 4, (y1 - y0) * a);
    for (let i = 0; i <= 5; i++) { const y = lerp(y0, y1, i / 5); ctx.fillRect(x, y, 26, 3); k.text(`${i * 10} km`, x + 40, y + 10, { size: 26, weight: 800, color: '#fff', align: 'left', shadow: { blur: 10 } }); }
    k.text('DEPTH', x, y0 - 30, { size: 30, weight: 900, color: PAL.ember, align: 'left', tracking: 6 });
    ctx.globalAlpha = 1;
  };
}

function fingernail(k, lt, S) {
  const ctx = k.ctx;
  k.bgPaper();
  k.kinetic('AS FAST AS A FINGERNAIL GROWS', W / 2, 160, lt, { size: 54, weight: 900, color: PAL.ink, stagger: 0.02, tracking: 4 });
  // finger
  const fx = 560, fy = 560;
  const a = ease.out(clamp((lt - 0.2) / 0.5));
  ctx.save();
  ctx.globalAlpha = a;
  k.shadow(40, 'rgba(0,0,0,0.25)', 0, 20);
  k.round(fx - 360, fy - 90, 420, 180, 90, '#e2b494');
  k.noShadow();
  const grow = ease.inOut(clamp((lt - 0.6) / 2.2));
  k.round(fx - 40, fy - 70, 110 + grow * 26, 140, 50, '#f4d6c8');
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(fx + 50 + grow * 26, fy - 64, 18, 128);
  ctx.strokeStyle = 'rgba(120,70,50,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(fx - 190 + i * 30, fy, 50, -0.8, 0.8); ctx.stroke(); }
  ctx.restore();
  // plate arrow
  const px = 1100, py = 560;
  ctx.globalAlpha = ease.out(clamp((lt - 0.9) / 0.5));
  const g = ctx.createLinearGradient(px, 0, px + 600, 0);
  g.addColorStop(0, '#3a4452'); g.addColorStop(1, '#5a6a7e');
  k.shadow(30, 'rgba(0,0,0,0.25)', 0, 14);
  ctx.save(); ctx.translate(px, py); ctx.rotate(0.18);
  k.round(0, -60, 520, 120, 10, g);
  k.noShadow();
  const sh = (lt * 40) % 120;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = -1; i < 5; i++) ctx.fillRect(i * 120 + sh, -60, 40, 120);
  k.arrowHead(560, 0, 0, 50, PAL.red);
  ctx.restore();
  k.text('TECTONIC PLATE', px + 260, py + 150, { size: 32, weight: 900, color: PAL.ink, tracking: 4 });
  k.text('FINGERNAIL', fx - 140, fy + 150, { size: 32, weight: 900, color: PAL.ink, tracking: 4 });
  ctx.globalAlpha = ease.out(clamp((lt - 1.4) / 0.4));
  k.text('≈ 4 – 6 cm a year', W / 2, H - 150, { size: 64, weight: 900, color: PAL.red });
  ctx.globalAlpha = 1;
}

function decades(k, lt, S) {
  const ctx = k.ctx;
  INFO.emberBg(k, lt);
  const p = ease.inOut(clamp((lt - 0.1) / Math.max(S.dur - 0.4, 0.5)));
  const year = Math.round(lerp(1783, 1883, p) / 10) * 10;
  k.text(String(Math.min(year, 1880)) + 's', W / 2, H / 2 + 20, { size: 220, weight: 900, color: '#fff', glow: 30, glowColor: 'rgba(255,120,60,0.5)' });
  // pressure bar
  const bw = 900, bx = W / 2 - bw / 2, by = H / 2 + 120;
  k.round(bx, by, bw, 30, 15, 'rgba(255,255,255,0.12)');
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  g.addColorStop(0, '#ffb24a'); g.addColorStop(1, '#ff2a12');
  k.round(bx, by, Math.max(30, bw * p), 30, 15, g);
  k.text('PRESSURE', W / 2, by + 90, { size: 34, weight: 900, color: PAL.ember, tracking: 14 });
}

function molLabel(p, f, name, at) {
  return (k, lt, S) => {
    const [x, y, vis] = S.project(...p);
    if (!vis) return;
    const a = ease.out(clamp((lt - at) / 0.4));
    k.ctx.globalAlpha = a;
    k.text(f, x, y + 30, { size: 64, weight: 900, color: '#fff' });
    k.text(name, x, y + 78, { size: 28, weight: 400, family: 'serif', italic: true, color: '#cfe0f0' });
    k.ctx.globalAlpha = 1;
  };
}
