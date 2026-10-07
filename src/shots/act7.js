// ACT VII — One hour after (tsunami) & 24 hours after (9:50 – 10:40)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both, cup } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { drawMap, drawRadius, drawRoute, placeXY } from '../overlay/maps.js';
import { XS } from '../sets/xsection.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp } from '../core/math.js';

const after = (o = {}) => ({ at: 'centre', height: 30000, intensity: 0.9, glow: 1.2, dark: 0.11, bombs: 0.3, lightning: 0.4, umbrella: 0.8, umbrellaR: 30000, count: 1800, wind: [0.1, 0.03], ...o });

export default function act7(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  // ======================= ONE HOUR AFTER =======================
  add(card(A.at('One hour after') - 0.15, '1 HOUR AFTER', 'AUGUST 27, 1883 · 11 AM'));
  add(shot(A.at('an explosion this powerful') - L, 'strait', dolly([-7000, 18, 5200], [-6900, 20, 5100], [-100, 300, -600], [-100, 320, -600], 40, 'lin'), {
    mood: 'ashDark', moodOv: { glowAz: -45 }, sea: 'rough', erupt: after(), island: { destroyed: 1 }, glowLight: 0.8,
    ring: { t0: -2, speed: 160, h: 6, w: 180, decay: 40000 },
  }, { amb: 'oceanStorm', mus: 'dread', sfx: [['rumbleDeep', 0.2]] }));
  add(shot(A.at('The collapse of the magma chamber') - L, 'xsection', orbit([0, -5, 0], [40, 34], [-18, -6], [12, 10], 40), { magma: 0.4, fill: 0.2, collapse: 1, water: 1, steam: 0.6, cone: [1, 0.25] }, { amb: 'rumble', sfx: [['collapse', 0.3], ['waterRush', 0.8]] }));
  add(shot(A.at('masses of rock plunging') - L, 'strait', dolly([-3800, 40, 1800], [-3600, 44, 1700], [-100, 200, -600], [-100, 200, -600], 46, 'lin'), {
    mood: 'ashDark', moodOv: { glowAz: -45 }, sea: 'rough', erupt: after({ bombs: 1, bombSpeed: 300 }), island: { destroyed: 1 }, glowLight: 1, surfSteam: { at: [-100, 0, -600], amount: 1, h: 600, spread: 1800, size: 300 },
    ring: { t0: 0.2, speed: 120, h: 12, w: 120, decay: 30000 },
  }, { amb: 'oceanStorm', sfx: [['splashBig', 0.4], ['splashBig', 1.1]] }));
  add(shot(A.at('unleash a catastrophic tsunami') - L, 'strait', dolly([-6200, 1100, 5400], [-5700, 1000, 5000], [-100, 0, -600], [-100, 200, -600], 46, 'lin'), {
    mood: 'blast', erupt: after({ intensity: 0.7 }), island: { destroyed: 1 }, ring: { t0: -6, speed: 220, h: 30, w: 260, decay: 60000 }, foam: 0.6,
  }, { amb: 'oceanStorm', sfx: [['tsunamiRoar', 0.2]], draw: word('TSUNAMI', A.peek('tsunami') - A.peek('unleash a catastrophic'), { y: H * 0.2, size: 130, tracking: 26, mode: 'track' }) }));
  add(shot(A.at('A wall of water roughly') - L, 'coast', dolly(cup(-20, -10, 2.0), cup(-20, -16, 2.4), [-10, 22, 300], [-10, 30, 260], 44), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: 640, speed: 26, H: 40, t0: 0 }, wind: 2,
    people: [{ style: 'villager', at: [-14, -5.5], rot: 10, pose: { lookUp: -0.2 } }, { style: 'villager2', at: [-26, -7], rot: -10, pose: { point: true } }],
  }, { amb: 'tsunamiFar', mus: 'chaos', sfx: [['tsunamiRoar', 0]] }));
  add(flat(A.at('as tall as a 12-story') - L, (k, lt, S2) => INFO.waveScale(k, lt, S2, { at: 0.4 }), { sfx: [['whoosh', 0.4], ['waveCrash', 1.4]] }));
  const tSl = A.at('slams into the coasts') - L;
  const gapS = A.gap('tsunami-impact');
  // approach, then the impact plays across the inserted pause
  add(shot(tSl, 'coast', dolly([-120, 30, -120], [-112, 32, -118], [-40, 8, 40], [-40, 10, 20], 44, 'lin'), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: 260, speed: 32, H: 40, t0: 0 }, wind: 2.5,
    people: [{ style: 'villager', at: [-30, -30], rot: 180, move: [0, -4.5], pose: { walk: 3.5 } }, { style: 'villager2', at: [-50, -38], rot: 180, move: [0, -4.2], pose: { walk: 3.5 } }, { style: 'villager', at: [-10, -26], rot: 180, move: [0, -4.6], pose: { walk: 3.5 } }],
  }, { amb: 'tsunami', sfx: [['tsunamiRoar', 0]], fx: { shakes: [{ at: 1.0, amp: 0.8, decay: 0.4 }] } }));
  add(shot(gapS - 0.3, 'coast', dolly(cup(-34, -74, 1.8), cup(-33, -79, 1.9), [-24, 20, 100], [-24, 34, 100], 50, 'lin'), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: 70, speed: 38, H: 40, t0: 0 }, wind: 3,
  }, { name: 'tsunami impact', amb: 'tsunami', subs: false, sfx: [['waveCrash', 0.2], ['woodBreak', 0.6], ['woodBreak', 1.4], ['debris', 0.8]], fx: { shakes: [{ at: 0.2, amp: 2.2, decay: 1.0 }], bloom: 0.8 } }));
  add(shot(A.at('Entire towns') - L, 'coast', dolly([-300, 220, 200], [-260, 200, 120], [-60, 0, -200], [-40, 0, -260], 44, 'lin'), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: -150, speed: 22, H: 30, t0: 0, curl: 0.5 }, wind: 2,
  }, { amb: 'tsunami', sfx: [['woodBreak', 0.5]] }));
  add(shot(A.at('The wave does more') - L, 'coast', dolly([-170, 46, -270], [-160, 43, -278], [-60, 2, -70], [-60, 2, -90], 44, 'lin'), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: -60, speed: 12, H: 18, t0: 0, curl: 0.3 }, wind: 2,
  }, { amb: 'flood', sfx: [['floodRush', 0]] }));
  add(shot(A.at('It tears away buildings') - L, 'coast', dolly([-10, 42, -340], [-4, 40, -350], [-60, 4, -170], [-60, 4, -185], 40, 'lin'), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: -150, speed: 14, H: 16, t0: 0, curl: 0.2 }, wind: 2,
  }, { amb: 'flood', sfx: [['woodBreak', 0.3], ['treeFall', 1.0]] }));
  add(shot(A.at('stripping the land') - L, 'coast', dolly([-150, 18, -20], [-138, 17, -32], [-40, 2, -200], [-32, 2, -214], 40, 'lin'), { layout: 'none', bare: true, mood: 'tsunami', moodOv: { fog: 0.00045 }, ashfall: 0.3, wind: 0.4, wreckage: { c: [-80, -110], r: 110 } }, { amb: 'windDesolate', mus: 'grief', fx: { grade: 'ash', desat: 0.3 } }));
  // --- Anjer & the lighthouse -------------------------------------------------------------
  add(shot(A.at('In the port town of Anier') - L, 'coast', dolly([20, 12, 120], [30, 11, 100], [100, 8, -40], [110, 10, -50], 40), { layout: 'anjer', mood: 'tsunami', wind: 1.8 }, {
    amb: 'oceanStorm', draw: stamp('ANJER', 'Java · port of the Dutch East Indies', 0.2),
  }));
  add(shot(A.at('a showpiece of the Dutch') - L, 'coast', dolly(cup(150, -10, 1.7), cup(160, -14, 1.8), cup(170, -70, 3), cup(180, -74, 3), 38), { layout: 'anjer', mood: 'tsunami', wind: 1.8 }, { amb: 'oceanStorm', fx: { dof: { focus: 55, range: 25, bokeh: 2 } } }));
  add(shot(A.at('a massive cast-iron lighthouse') - L, 'coast', dolly([-40, 10, 40], [-38, 10, 36], [60, 18, -8], [60, 16, -12], 40, 'lin'), {
    layout: 'anjer', mood: 'tsunami', tsunami: { z0: 80, speed: 30, H: 34, t0: 0 }, wind: 2.5,
  }, { amb: 'tsunami', sfx: [['tsunamiRoar', 0], ['metalGroan', 2.4], ['waveCrash', 2.6]], fx: { shakes: [{ at: 2.6, amp: 1.5, decay: 1.4 }] } }));
  add(shot(A.at('and hurled inland') - L, 'coast', dolly([120, 30, -60], [110, 28, -80], [50, 12, -80], [40, 10, -110], 44, 'lin'), {
    layout: 'anjer', mood: 'tsunami', tsunami: { z0: -15, speed: 28, H: 32, t0: 0 }, wind: 2.5,
  }, { amb: 'tsunami', sfx: [['metalCrash', 0.6], ['debris', 0.2]] }));
  // --- the Berouw --------------------------------------------------------------------------
  add(shot(A.at('The steamship Biro') - L, 'coast', dolly([250, 6, 210], [256, 6, 214], [300, 6, 260], [300, 6, 260], 36), { layout: 'none', berouw: 'anchored', mood: 'tsunami', sea: 'rough', wind: 1.5 }, {
    amb: 'oceanStorm', draw: stamp('BEROUW', 'Dutch gunboat · anchored off Telok Betong', 0.25),
  }));
  add(shot(A.at('is swept nearly two miles') - L, 'coast', dolly([120, 40, 40], [80, 36, -40], [20, 30, -40], [10, 20, -140], 44, 'lin'), {
    layout: 'none', berouw: 'wave', berouwX: 20, mood: 'tsunami', tsunami: { z0: 40, speed: 30, H: 34, t0: 0 }, wind: 2.5,
  }, { amb: 'tsunami', sfx: [['metalGroan', 0.5], ['waveCrash', 1.2]] }));
  add(shot(A.at('It will remain there') - L, 'coast', dolly(cup(-14, -380, 3.5), cup(-22, -388, 4.0), cup(-60, -420, 5), cup(-60, -420, 6), 40, 'lin'), { layout: 'none', berouw: 'jungle', mood: 'haze', bare: false, wind: 0.6 }, { amb: 'jungleQuiet', mus: 'grief', sfx: [['birdsong', 1.0]] }));
  add(shot(A.at('People have no chance') - L, 'coast', dolly(cup(-60, -72, 1.8), cup(-60, -82, 2.0), [-60, 6, 40], [-60, 10, 40], 40, 'lin'), {
    layout: 'village', mood: 'tsunami', tsunami: { z0: 120, speed: 22, H: 40, t0: 0 },
    people: [{ style: 'villager', at: [-58, -50], rot: 180, move: [0, -3.4], pose: { walk: 3.5 } }, { style: 'villager2', at: [-64, -45], rot: 185, move: [0, -3.2], pose: { walk: 3.5 } }, { style: 'villager', at: [-54, -42], rot: 175, move: [0, -3.0], pose: { walk: 3.2 } }],
  }, { amb: 'tsunami', fx: { desat: 0.4, vignette: 0.7 }, sfx: [['heartbeat', 0.2]] }));
  add(flat(A.at('More than 36,000') - L, (k, lt, S2) => INFO.peopleCount(k, lt, S2, { to: 36000, plus: true, dur: 2.6, label: 'LIVES LOST · MOST TO THE TSUNAMI' }), { sfx: [['fillTicks', 0.3], ['lowHit', 2.9]], mus: 'grief' }));
  add(shot(A.at('Across vast areas') - L, 'coast', dolly(cup(-150, -40, 3.5), cup(-146, -46, 3.4), [-60, 8, -200], [-60, 4, -200], 40, 'lin'), { layout: 'none', bare: true, mood: 'tsunami', moodOv: { exposure: 0.75, sunVisible: 0, fog: 0.0009 }, ashfall: 1.0, wind: 0.5, wreckage: { c: [-90, -130], r: 120 } }, { amb: 'windDesolate', fx: { grade: 'ash' } }));
  const tD = A.at('Daylight will not return') - L;
  add(flat(tD, (k, lt, S2) => INFO.bigNumber(k, lt, S2, { bg: 'dark', to: 3, at: 0.2, dur: Math.max(0.6, A.peek('three days') - tD - 0.1), unit: 'DAYS OF DARKNESS', size: 300, small: 'daylight will not return for', smallSize: 58 }), { sfx: [['lowHit', A.peek('three days') - tD]], fx: { fadeOut: 0.3 } }));

  // ======================= 24 HOURS AFTER =======================
  add(card(A.at('24 hours after') - 0.15, '24 HOURS AFTER', 'AUGUST 28, 1883'));
  add(shot(A.at('thanks to the telegraph') - L, 'interior', dolly([1.3, 1.1, -0.35], [1.1, 1.05, -0.5], [0.7, 0.86, -1.0], [0.7, 0.86, -1.0], 32), { room: 'telegraph', clockSpeed: 0.6 }, { amb: 'room', mus: 'tension', sfx: [['morseFast', 0]], fx: { dof: { focus: 0.7, range: 0.35, bokeh: 4 } } }));
  add(shot(A.at('the world experiences') - L, 'globe', orbit([0, 0, 0], [31, 29], [-20, 10], [8, 6], 40), {
    ll: [[0, 100], [25, 40]], cables: 1, cableK: 0.6, cloud: 0.4, dots: ['batavia', 'singapore', 'bombay', 'london', 'newyork', 'boston'],
    arcs: [{ id: 'b1', from: 'batavia', to: 'london', start: 0.2, dur: 1.4, col: [1, 0.3, 0.12] }, { id: 'b2', from: 'batavia', to: 'newyork', start: 0.6, dur: 1.8, col: [1, 0.3, 0.12], lift: 0.14 }, { id: 'b3', from: 'batavia', to: 'sydney', start: 0.4, dur: 1.0, col: [1, 0.3, 0.12] }],
  }, { amb: 'space', sfx: [['dataBlips', 0.1], ['morse', 0.5]], draw: word('BREAKING NEWS', A.peek('breaking news') - A.peek('the world experiences'), { y: H * 0.16, size: 84, color: '#ff8a5a', tracking: 10 }) }));
  const tNp = A.at('Within hours of the catastrophe') - L;
  const aNY = A.peek('New York') - tNp, aBo = A.peek('Boston') - tNp;
  add(shot(tNp, 'studio', dolly([0, 3.2, 5.0], [0, 3.0, 4.4], [0, 0.6, 0], [0, 0.6, 0], 40), {
    bg: 'dark', items: [
      { kind: 'paper', id: 'p0', args: ['TELEGRAM', 'Batavia: Krakatoa in Violent Eruption', 'REUTER\'S AGENCY', 'BATAVIA · AUGUST 27, 1883'], pos: [0.4, 0.03, -1.1], rot: [-Math.PI / 2, 0, -0.35], appear: -1, spin: 0 },
      { kind: 'paper', id: 'p1', args: ['KRAKATOA', 'Terrible Volcanic Eruption in Java', 'THE TIMES', 'LONDON · TUESDAY, AUGUST 28, 1883'], pos: [-1.5, 0.05, 0.2], rot: [-Math.PI / 2, 0, 0.2], appear: A.peek('London') - tNp, spin: 0, drop: 1.4 },
      { kind: 'paper', id: 'p2', args: ['DISASTER', 'Whole Islands Swallowed by the Sea', 'THE NEW YORK TIMES', 'NEW YORK · AUGUST 28, 1883'], pos: [0.1, 0.06, -0.1], rot: [-Math.PI / 2, 0, -0.1], appear: aNY, spin: 0, drop: 1.4 },
      { kind: 'paper', id: 'p3', args: ['JAVA', 'Thousands Perish in the East Indies', 'THE BOSTON GLOBE', 'BOSTON · AUGUST 28, 1883'], pos: [1.6, 0.07, 0.25], rot: [-Math.PI / 2, 0, 0.15], appear: aBo, spin: 0, drop: 1.4 },
    ],
  }, { amb: 'room', sfx: [['morse', 0], ['paperSlap', A.peek('London') - tNp], ['paperSlap', aNY], ['paperSlap', aBo]], draw: word('WITHIN HOURS', 0.05, { y: H * 0.16, size: 84, color: '#ffd9a8', tracking: 12, out: A.peek('London') - tNp - 0.1 }) }));
  add(shot(A.at('announce a disaster') - L, 'studio', dolly([0.1, 1.2, 1.2], [0.1, 1.0, 0.9], [0.1, 0.05, -0.15], [0.1, 0.05, -0.15], 36), {
    bg: 'dark', items: [{ kind: 'paper', id: 'p2', args: ['DISASTER', 'Whole Islands Swallowed by the Sea', 'THE NEW YORK TIMES', 'NEW YORK · AUGUST 28, 1883'], pos: [0.1, 0.06, -0.1], rot: [-Math.PI / 2, 0, -0.1], appear: -1, spin: 0 }],
  }, { amb: 'room', fx: { dof: { focus: 1.2, range: 0.5, bokeh: 3 } } }));
  add(shot(A.at('The technology that made') - L, 'land', dolly([-40, 6.5, 16], [-20, 6.8, 15], [0, 7.4, 6], [20, 7.4, 6], 34, 'lin'), { mood: 'dusk', train: false }, { amb: 'wind', sfx: [['wireHum', 0], ['morse', 0.6]] }));
  add(shot(A.at('is now broadcasting') - L, 'globe', orbit([0, 0, 0], [29, 27], [10, -10], [6, 10], 40), { ll: [[10, 80], [20, 40]], cables: 1, cableK: 1.8, cloud: 0.4, dark: 1, darkR: 0.08, night: 0.3 }, { amb: 'space', sfx: [['drone', 0]] }));
  // --- pumice -------------------------------------------------------------------------------
  add(shot(A.at('The Sunda Strait is blocked') - L, 'strait', dolly([-6000, 600, 6000], [-5600, 560, 5600], [-100, 0, -600], [-100, 0, -600], 40, 'lin'), { mood: 'haze', moodOv: { fog: 0.00008, sunEl: 14, sunAz: 120 }, sea: 'calm', island: { destroyed: 1 }, pumice: 1, pumiceR: 40000, steam: { at: 'anak', amount: 0.3, h: 400 } }, { amb: 'oceanGrey', mus: 'grief' }));
  add(shot(A.at('of tons of pumice') - L, 'strait', dolly([-3000, 2.0, 3000], [-2996, 1.8, 2994], [-2990, 0.2, 2985], [-2988, 0.2, 2980], 36, 'lin'), { mood: 'haze', moodOv: { fog: 0.00008, sunEl: 14, sunAz: 120 }, sea: 'calm', island: { destroyed: 1 }, pumice: 1, pumiceR: 40000 }, { amb: 'oceanGrey', sfx: [['pumiceGrind', 0]], fx: { dof: { focus: 6, range: 4, bokeh: 3 } } }));
  add(flat(A.at('in a solid layer') - L, (k, lt, S2) => pumiceLayer(k, lt, S2), { sfx: [['whoosh', 0], ['pop', 0.8]] }));
  const stuck = { pos: [-5200, 4200], heading: 40, speed: 0.6 };
  add(shot(A.at('ships will struggle') - L, 'strait', dolly([-5150, 14, 4120], [-5148, 14, 4118], [-5200, 6, 4200], [-5195, 6, 4195], 40, 'lin'), { mood: 'haze', moodOv: { fog: 0.00008, sunEl: 14, sunAz: 120 }, sea: 'calm', island: { destroyed: 1 }, pumice: 1, pumiceR: 40000, ships: [{ id: 'stk', type: 'steamer', ...stuck, roll: 0.3 }] }, { amb: 'oceanGrey', sfx: [['pumiceGrind', 0], ['engineStrain', 0.4]], fx: { fadeOut: 0.3 } }));
  return S;
}

function pumiceLayer(k, lt, S) {
  const ctx = k.ctx;
  k.bgPaper();
  const yW = 520;
  // water
  const g = ctx.createLinearGradient(0, yW, 0, H);
  g.addColorStop(0, '#3a7a9a'); g.addColorStop(1, '#0d2a44');
  ctx.fillStyle = g; ctx.fillRect(0, yW, W, H - yW);
  const p = ease.out(clamp((lt - 0.2) / 0.8));
  const th = 160 * p; // 3 m layer
  ctx.fillStyle = '#9b8f7c';
  ctx.fillRect(0, yW - th * 0.25, W, th);
  for (let i = 0; i < 260 * p; i++) { const x = (i * 97) % W, y = yW - th * 0.25 + ((i * 53) % Math.max(th, 1)); k.circle(x, y, 6 + (i % 7) * 2, i % 3 ? '#b2a690' : '#7d725f'); }
  // person scale
  const px = 1250, pyB = yW - th * 0.25;
  ctx.fillStyle = '#1a1714'; ctx.fillRect(px - 10, pyB - 96, 20, 96); k.circle(px, pyB - 108, 14, '#1a1714');
  k.text('1.8 m', px + 40, pyB - 50, { size: 28, weight: 800, color: PAL.ink, align: 'left' });
  // ruler
  ctx.globalAlpha = p;
  ctx.fillStyle = PAL.red; ctx.fillRect(560, yW - th * 0.25, 6, th);
  ctx.fillRect(540, yW - th * 0.25, 46, 4); ctx.fillRect(540, yW - th * 0.25 + th - 4, 46, 4);
  k.text('UP TO 3 m', 520, yW + 30, { size: 64, weight: 900, color: PAL.red, align: 'right' });
  k.text('(10 feet) of floating pumice', 520, yW + 80, { size: 30, weight: 400, family: 'serif', italic: true, color: '#e8f0f4', align: 'right' });
  ctx.globalAlpha = 1;
  k.kinetic('A SOLID LAYER OF ROCK', W / 2, 200, lt, { size: 56, weight: 900, color: PAL.ink, stagger: 0.02, tracking: 6 });
}
