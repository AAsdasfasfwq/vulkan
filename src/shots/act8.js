// ACT VIII — One month after, one year after, 140 years after, conclusion (10:40 – end)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both, cup } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { drawMap, drawRadius, drawRoute, placeXY } from '../overlay/maps.js';
import { XS } from '../sets/xsection.js';
import { CRATERS } from '../sets/strait.js';
import { PLACES } from '../geo/geo.js';
import { W, H, PAL, font } from '../overlay/kit.js';
import { clamp, ease, lerp, rng } from '../core/math.js';

const anakPlume = (o = {}) => ({ at: 'anak', height: 3000, intensity: 0.8, glow: 0.8, dark: 0.12, bombs: 0.3, bombSpeed: 160, count: 900, wind: [0.3, 0.05], ...o });

export default function act8(A, D) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  // ======================= ONE MONTH AFTER =======================
  add(card(A.at('One month after') - 0.15, '1 MONTH AFTER', 'SEPTEMBER 1883'));
  add(shot(A.at('the effects spread far') - L, 'globe', orbit([0, 0, 0], [32, 28], [-30, 10], [10, 5], 40), { ll: [[-6, 110], [0, 60]], cloud: 0.4, veil: [0.25, 0.75], veilK: 1 }, { amb: 'space', mus: 'awe', sfx: [['whoosh', 0], ['drone', 0.3]] }));
  const tV = A.at('More than 5 cubic miles') - L;
  add(flat(tV, (k, lt, S2) => ashCube(k, lt, S2), { sfx: [['whoosh', 0], ['hit', 0.6]] }));
  add(shot(A.at('along with tens of millions') - L, 'studio', dolly([0, 1.8, 7.5], [0, 1.6, 6.4], [0, 1.2, 0], [0, 1.3, 0], 40), {
    bg: 'ember', items: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ kind: 'SO2', id: 'so' + i, pos: [(i - 3) * 1.3, 0.8 + (i % 3) * 0.55, -(i % 2) * 1.2], appear: 0.1 + i * 0.12, spin: 0.5 + i * 0.1, float: true, scale: 0.8 })),
  }, { amb: 'none', sfx: [['pop', 0.1], ['pop', 0.34], ['pop', 0.58], ['pop', 0.82]], draw: word('SO₂', 0.2, { y: H * 0.2, size: 120, tracking: 6 }) }));
  add(shot(A.at('have been blasted into') - L, 'globe', dolly([0, -6, 13.2], [0, -5.6, 12.6], [0, -9.4, 0], [0, -9.2, 0], 50), { ll: [[-6, 105], [-6, 100]], cloud: 0.5, veil: 0.9, veilK: 1, sunAz: 80, sunGlare: 0.6 }, { amb: 'space' }));
  add(shot(A.at('High-altitude winds carry') - L, 'globe', orbit([0, 0, 0], [30, 28], [0, 60], [4, 8], 40, 'lin'), { ll: [[-6, 100], [-6, 40]], cloud: 0.45, veil: [0.75, 1], veilK: 1 }, { amb: 'space', sfx: [['wind', 0]] }));
  add(shot(A.at('and people begin to see') - L, 'town', dolly([2, 1.5, 22], [1.8, 1.4, 20], [0, 9, -60], [0, 12, -60], 40), {
    style: 'victorian', mood: 'violet', smoke: false, people: [{ style: 'gentleman', at: [1, 12], rot: 180, pose: { lookUp: -0.5 } }, { style: 'lady', at: [2.4, 13], rot: 185, pose: { lookUp: -0.4 } }, { style: 'clerk', at: [-1.5, 10], rot: 175, pose: { lookUp: -0.45, point: true } }],
  }, { amb: 'eveningTown', fx: { dof: { focus: 9, range: 4, bokeh: 2 } } }));
  add(shot(A.at('For months, the sky') - L, 'strait', dolly([-9000, 6, 9000], [-8960, 6, 8960], [0, 400, 0], [0, 600, 0], 34, 'lin'), { mood: 'violet', sea: 'calm', island: { destroyed: 1 } }, { amb: 'oceanCalm', mus: 'awe' }));
  const tBs = A.at('Light passing through') - L;
  add(shot(tBs, 'land', dolly([-200, 14, 160], [-186, 15, 150], [-60, 92, -400], [-50, 96, -400], 40, 'lin'), { mood: 'blueSun', moodOv: { sunEl: 9, sunAz: 165, sunSize: 0.045 }, train: false }, {
    amb: 'wind', draw: word('BLUE SUN', A.peek('blue or green') - tBs, { y: H * 0.18, size: 90, color: '#bfe8ff', tracking: 14 }),
  }));
  add(shot(A.at('Sunrise and sunset become') - L, 'strait', dolly([-7000, 30, -2000], [-6800, 32, -2100], [-20000, 300, 4000], [-20000, 300, 4000], 38, 'lin'), { mood: 'blood', sea: 'calm', island: { destroyed: 1 } }, { amb: 'oceanCalm', sfx: [['drone', 0]] }));
  const tSk = A.at('The sky burns blood red') - L;
  const aCr = A.peek('crimson') - tSk, aVi = A.peek('violet') - tSk;
  add(shot(tSk, 'land', dolly([-100, 20, 80], [-80, 22, 70], [-1000, 60, 600], [-1000, 60, 600], 38, 'lin'), {
    mood: 'blood', mood2: 'violet', moodK: (u, lt) => ease.inOut(clamp((lt - aCr) / Math.max(aVi - aCr + 0.5, 0.5))), train: false,
  }, { amb: 'wind', draw: both(word('BLOOD RED', 0.1, { y: H * 0.2, size: 78, color: '#ff5a3a', tracking: 10, out: aCr - 0.05 }), word('CRIMSON', aCr, { y: H * 0.2, size: 78, color: '#e8325a', tracking: 10, out: aVi - 0.05 }), word('VIOLET', aVi, { y: H * 0.2, size: 78, color: '#b57aff', tracking: 10 })) }));
  const firemen = [{ style: 'fireman', at: [-1, -6], rot: 180, move: [0, -3.8], pose: { walk: 3.2 } }, { style: 'fireman', at: [1.2, -3], rot: 180, move: [0, -3.6], pose: { walk: 3.2 } }, { style: 'fireman', at: [0, 0], rot: 180, move: [0, -3.9], pose: { walk: 3.2 } }];
  add(shot(A.at('In New York and London') - L, 'town', dolly([4, 2.2, 20], [3.6, 2.0, 14], [0, 2, -30], [0, 2.4, -40], 40), { style: 'ny', mood: 'nightGlow', moodOv: { glow: [3.4, 0.5, 0.12], glowAz: 180, glowEl: 2, glowSize: 3 }, people: firemen, wagon: [0, 6, 4, 0] }, { amb: 'eveningTown', mus: 'tension', sfx: [['fireBell', 0.1], ['hooves', 0.2]], draw: stamp('NEW YORK', 'October 1883', 0.2) }));
  add(shot(A.at('repeatedly respond') - L, 'town', dolly([-2, 1.4, -14], [-1.8, 1.4, -16], [0, 1.6, -26], [0, 1.6, -30], 36, 'lin'), { style: 'ny', mood: 'nightGlow', moodOv: { glow: [3.4, 0.5, 0.12], glowAz: 180, glowEl: 2, glowSize: 3 }, people: firemen.map((f) => ({ ...f, at: [f.at[0], f.at[1] - 12] })), wagon: [0, -6, 4, 0] }, { amb: 'eveningTown', sfx: [['fireBell', 0], ['footsteps', 0.2]] }));
  add(shot(A.at('People mistake the glow') - L, 'town', dolly([0, 3, 30], [0, 3.6, 24], [0, 20, -400], [0, 22, -400], 42, 'lin'), {
    style: 'ny', mood: 'nightGlow', moodOv: { glow: [4.0, 0.6, 0.12], glowAz: 180, glowEl: 2, glowSize: 2.5 },
    people: [{ style: 'gentleman', at: [1, 12], rot: 180, pose: { point: true } }, { style: 'lady2', at: [2.2, 13], rot: 180 }, { style: 'fireman', at: [-1.4, 10], rot: 180, pose: { lookUp: -0.2 } }, { style: 'clerk', at: [-3, 14], rot: 190 }],
  }, { amb: 'eveningTown', fx: { fadeOut: 0.3 } }));

  // ======================= ONE YEAR AFTER =======================
  add(card(A.at('One year after') - 0.15, '1 YEAR AFTER', '1884'));
  add(shot(A.at('the sulfur haze in the stratosphere') - L, 'globe', orbit([0, 0, 0], [30, 27], [30, 10], [6, 10], 40), { ll: [[10, 60], [20, 30]], cloud: 0.4, mirror: [0.3, 1], veil: 1, veilK: 0.8, sunAz: 50, sunGlare: 1.0 }, { amb: 'space', mus: 'unease' }));
  add(flat(A.at("reflecting some of the sun's") - L, (k, lt, S2) => mirrorDiagram(k, lt, S2), { sfx: [['whoosh', 0], ['shimmer', 0.6]] }));
  add(shot(A.at('A volcanic winter begins') - L, 'land', dolly([-60, 4, 30], [-50, 4, 26], [-200, 10, -100], [-200, 10, -100], 40, 'lin'), { mood: 'overcast', snowCover: 1, snow: 0.9, train: false, wind: 1.6 }, { amb: 'winterWind', fx: { grade: 'cold' } }));
  add(flat(A.at("Earth's average") - L, (k, lt, S2) => INFO.tempChart(k, lt, S2, { dur: 2.6 }), { sfx: [['whoosh', 0], ['dropTone', 0.6]] }));
  add(shot(A.at('For the global climate') - L, 'globe', dolly([0, 3, 34], [0, 2, 26], [0, 0, 0], [0, 0, 0], 40, 'in'), { ll: [[30, 20], [40, 10]], cloud: 0.6, storm: 0.6, night: 0.15 }, { amb: 'space', sfx: [['lowHit', A.peek('tremendous shock') - A.peek('For the global climate')]], fx: { shakes: [{ at: A.peek('tremendous shock') - A.peek('For the global climate'), amp: 1.2, decay: 2 }] } }));
  add(shot(A.at('Weather patterns go haywire') - L, 'globe', orbit([0, 0, 0], [28, 26], [-20, 30], [20, 12], 40), { ll: [[45, -20], [45, 40]], cloud: 0.7, storm: 1, night: 0.15 }, { amb: 'storm', sfx: [['thunder', 0.5]] }));
  add(shot(A.at('Record snowfalls') - L, 'land', dolly([30, 2.2, 22], [26, 2.0, 18], [60, 4, -40], [60, 4, -40], 40, 'lin'), { mood: 'overcast', snowCover: 1, snow: 1, train: true, trainX: 60, trainSpeed: 6, wind: 1.8 }, { amb: 'winterWind', fx: { grade: 'cold' }, sfx: [['trainWhistle', 0.6]] }));
  add(shot(A.at('Relentless rain') - L, 'land', dolly([-30, 1.8, 120], [-28, 1.7, 115], [-60, 1, 40], [-60, 1, 40], 40, 'lin'), { mood: 'storm', wet: 1, rain: 1, train: false, wind: 2 }, { amb: 'rain', fx: { grade: 'cold' }, draw: stamp('EUROPE', 'Failed harvests, 1884', 0.3) }));
  add(shot(A.at('Summer is unnaturally cold') - L, 'land', dolly([0, 3, 60], [4, 3, 56], [40, 10, -80], [40, 10, -80], 40, 'lin'), { mood: 'overcast', frost: 0.7, snow: 0.2, train: false }, { amb: 'winterWind', fx: { grade: 'cold' }, draw: stamp('SUMMER 1884', 'unnaturally cold', 0.2) }));
  add(shot(A.at('Krakatoa becomes a turning point') - L, 'interior', dolly([3.0, 1.6, 1.4], [2.4, 1.5, 0.9], [0.8, 1.0, -1.1], [0.8, 1.0, -1.1], 38), { room: 'study' }, { amb: 'room', mus: 'calm', fx: { dof: { focus: 2.6, range: 1.4, bokeh: 3 } } }));
  add(shot(A.at("Britain's Royal Society") - L, 'interior', dolly([0.85, 1.25, -0.35], [0.75, 1.15, -0.45], [0.6, 0.86, -0.8], [0.6, 0.86, -0.8], 32), { room: 'study' }, { amb: 'room', sfx: [['pageTurn', 0.3]], fx: { dof: { focus: 0.45, range: 0.25, bokeh: 4 } }, draw: stamp('ROYAL SOCIETY', 'London · report of 1888', 0.3) }));
  add(flat(A.at('of observations, tracking') - L, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'paper', center: [[60, 20], [40, 15]], scale: [[260, 240]],
    extra: (k, lt, S3, M) => {
      const r = rng(11);
      for (let i = 0; i < 120; i++) {
        const at = 0.15 + i * 0.022;
        if (lt < at) break;
        const lat = -40 + r() * 100, lon = -150 + r() * 330;
        const [x, y] = M.P([lat, lon]);
        const a = ease.back(clamp((lt - at) / 0.3));
        k.circle(x, y, 7 * a, i % 3 ? PAL.red : '#2a6fd6');
      }
      k.kinetic('OBSERVATIONS OF UNUSUAL SKIES · 1883–1886', W / 2, 120, lt, { size: 40, weight: 900, color: PAL.ink, stagger: 0.012, tracking: 4 });
    },
  }), { sfx: [['fillTicks', 0.15]] }));
  add(shot(A.at('The work helps lay') - L, 'globe', orbit([0, 0, 0], [30, 27], [-10, 20], [10, 12], 40), { ll: [[30, 0], [30, 40]], cloud: 0.4, flow: [0.2, 1] }, { amb: 'space', mus: 'awe', sfx: [['shimmer', 0.2]] }));
  add(shot(A.at('and the study of atmospheric') - L, 'globe', dolly([0, 8, 30], [0, 5, 26], [0, 0, 0], [0, 0, 0], 40), { ll: [[50, 20], [40, 60]], cloud: 0.35, flow: 1 }, { amb: 'space' }));
  add(shot(A.at('For the first time, humanity') - L, 'globe', orbit([0, 0, 0], [34, 30], [0, 25], [8, 6], 40, 'lin'), { ll: [[15, 80], [15, 40]], cloud: 0.45, sunGlare: 0.8, sunAz: 70 }, { amb: 'space' }));
  add(shot(A.at('as one interconnected') - L, 'globe', orbit([0, 0, 0], [30, 28], [10, -10], [6, 4], 40), {
    ll: [[20, 70], [25, 50]], cloud: 0.35, dots: ['krakatoa', 'london', 'newyork', 'moscow', 'bombay', 'shanghai', 'capetown', 'rio'],
    arcs: ['london', 'newyork', 'moscow', 'bombay', 'shanghai', 'capetown', 'rio'].map((c, i) => ({ id: 'ic' + i, from: 'krakatoa', to: c, start: 0.1 + i * 0.12, dur: 1.0, col: [0.4, 0.8, 1.0] })),
  }, { amb: 'space', sfx: [['dataBlips', 0.1]] }));
  const tH = A.at('A mountain exploding in Asia') - L;
  add(flat(tH, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'paper', center: [[70, 25], [60, 30]], scale: [[480, 520]], box: [-30, -20, 140, 75],
    extra: (k, lt, S3, M) => {
      const [kx, ky] = placeXY(M, 'krakatoa');
      k.ctx.save(); k.shadow(30, 'rgba(226,70,42,0.7)', 0, 0); k.circle(kx, ky, 14, PAL.red); k.ctx.restore();
      k.pin(kx, ky, 'ASIA', lt, { start: 0.1, color: PAL.ink, size: 34, dir: [1, 1], shadow: { blur: 0 } });
      drawRoute(k, M, PLACES.krakatoa, [50, 10], ease.inOut(clamp((lt - 0.4) / 1.8)), { color: PAL.red, width: 5 });
      const [ex, ey] = M.P([50, 10]);
      const ap = A.peek('hunger to Europe') - tH;
      k.pin(ex, ey, 'EUROPE', lt, { start: ap, color: PAL.ink, size: 34, dir: [-1, -1] });
      k.ctx.globalAlpha = ease.out(clamp((lt - ap) / 0.4));
      k.text('FAILED HARVESTS · HUNGER', W / 2, H - 110, { size: 46, weight: 900, color: PAL.red, tracking: 6 });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['whoosh', 0.4], ['lowHit', A.peek('hunger to Europe') - tH]], fx: { fadeOut: 0.25 } }));

  // ======================= 140 YEARS AFTER =======================
  add(card(A.at('140 years after') - 0.15, '140 YEARS AFTER', 'TODAY'));
  const cs = { pos: [-7000, 9000], heading: 25, speed: 7 };
  add(shot(A.at('Today, giant') - L, 'strait', dolly([-6520, 46, 9520], [-6430, 42, 9430], [-6990, 25, 8990], [-6955, 25, 8975], 38, 'lin'), { mood: 'day', island: { destroyed: 1, anak: 300 }, steam: { at: 'anak', amount: 0.3, h: 300 }, ships: [{ id: 'cs', type: 'container', ...cs, roll: 0.2 }] }, { amb: 'ocean', mus: 'modern', sfx: [['shipHorn', 0.8]] }));
  add(shot(A.at('Passenger jets') - L, 'strait', dolly([-1500, 12, 5600], [-1480, 12, 5560], [-1820, 2600, 3200], [-1340, 2640, 3200], 26, 'lin'), { mood: 'day', island: { destroyed: 1, anak: 300 }, jet: { pos: [-1900, 2700, 3200], speed: 240 } }, { amb: 'ocean', sfx: [['jetPass', 0]] }));
  const tI = A.at('The age of steam') - L;
  add(flat(tI, (k, lt, S2) => INFO.iconsRow(k, lt, S2, {
    items: [
      { icon: 'steam', label: 'STEAM', old: true, at: 0.1, strike: A.peek('given way') - tI },
      { icon: 'telegraph', label: 'TELEGRAPH', old: true, at: A.peek('telegraph has') - tI, strike: A.peek('given way') - tI + 0.15 },
      { icon: 'internet', label: 'INTERNET', at: A.peek('internet') - tI },
      { icon: 'ai', label: 'A.I.', at: A.peek('artificial intelligence') - tI },
      { icon: 'rover', label: 'MARS ROVERS', at: A.peek('Mars rovers') - tI },
    ],
  }), { sfx: [['pop', 0.1], ['pop', A.peek('telegraph has') - tI], ['strike', A.peek('given way') - tI], ['pop', A.peek('internet') - tI], ['pop', A.peek('artificial intelligence') - tI], ['pop', A.peek('Mars rovers') - tI]] }));
  add(shot(A.at('We feel even more powerful') - L, 'town', dolly([0, 260, 420], [0, 220, 340], [0, 120, -300], [0, 110, -300], 42, 'lin'), { style: 'modern', mood: 'night', windows: 1.2 }, { amb: 'cityModern' }));
  const boat = { pos: [-3200, 1800], heading: 30, speed: 6 };
  add(shot(A.at('But sail to the site') - L, 'strait', onShip(boat, [-12, 2.6, 1.4], [-9, 2.5, 1.2], [-150, 200, -900], [-150, 200, -900], 40, { lookWorld: true }), { mood: 'golden', island: { destroyed: 1, anak: 300 }, steam: { at: 'anak', amount: 0.4, h: 400 }, ships: [{ id: 'boat', type: 'longboat', ...boat }] }, { amb: 'ocean', mus: 'unease' }));
  add(shot(A.at("you won't find empty water") - L, 'strait', dolly([-2400, 120, 400], [-2100, 110, 200], [-150, 150, -900], [-150, 160, -900], 40, 'lin'), { mood: 'golden', island: { destroyed: 1, anak: 300 }, steam: { at: 'anak', amount: 0.5, h: 500 } }, { amb: 'ocean' }));
  const t27 = A.at('In 1927') - L;
  add(shot(t27, 'strait', dolly([-1400, 20, -300], [-1300, 22, -380], [-150, 120, -900], [-150, 260, -900], 40, 'lin'), {
    mood: 'overcast', island: { destroyed: 1, anak: 12 }, erupt: anakPlume({ height: 1600, intensity: 1, dark: 0.07, glow: 0.1, bombs: 0.4, bombSpeed: 120 }), boil: { c: [-150, -900], r: 500, k: 1 }, surfSteam: { at: [-150, 0, -900], amount: 0.8, h: 500, spread: 300, size: 120 },
  }, { amb: 'surtsey', sfx: [['steamBurst', 0.4], ['boomLow', 1.0]], draw: word('1927', 0.15, { y: H * 0.22, size: 160, tracking: 10 }) }));
  add(shot(A.at('The sea began to boil') - L, 'strait', dolly([-600, 8, -700], [-560, 9, -730], [-150, 4, -900], [-150, 10, -900], 44, 'lin'), { mood: 'overcast', moodOv: { fog: 0.00006 }, island: { destroyed: 1, anak: 0 }, boil: { c: [-150, -900], r: 400, k: 1 }, surfSteam: { at: [-150, 0, -900], amount: 0.55, h: 400, spread: 300, size: 90 } }, { amb: 'surtsey', sfx: [['boilingSea', 0]] }));
  add(shot(A.at('The volcano was returning') - L, 'strait', orbit([-150, 300, -900], [3600, 3300], [-120, -95], [5, 6], 36), { mood: 'overcast', island: { destroyed: 1, anak: 60 }, erupt: anakPlume({ height: 2400, dark: 0.08, wind: [0.3, 0.05] }), boil: { c: [-150, -900], r: 400, k: 0.5 } }, { amb: 'surtsey', sfx: [['boomLow', 0.5]] }));
  const tAk = A.at('Local people named it') - L;
  add(shot(tAk, 'strait', dolly([-2600, 60, 1000], [-2400, 64, 800], [-150, 250, -900], [-150, 300, -900], 36, 'lin'), { mood: 'dusk', island: { destroyed: 1, anak: 200 }, erupt: anakPlume({ glow: 1.2 }), glowLight: 0.3 }, {
    amb: 'eruptionSoft', mus: 'awe', subsOff: A.peek('Anak Krakatau') - tAk - 0.1, draw: both(word('ANAK KRAKATAU', A.peek('Anak Krakatau') - tAk, { y: H * 0.22, size: 110, tracking: 14 }), word('the child of Krakatoa', A.peek('the child of') - tAk, { y: H * 0.22 + 76, size: 46, mode: 'blur', tracking: 2 })),
  }));
  add(shot(A.at('chamber beneath it never') - L, 'xsection', orbit([0, -9, -2], [50, 40], [-12, 0], [10, 8], 40), { magma: 1, fill: [0.4, 0.8], cone: 0.45, bare: true }, { amb: 'rumble' }));
  add(shot(A.at('The grinding tectonic') - L, 'xsection', orbit([0, -14, -6], [80, 70], [20, 28], [12, 10], 40), { magma: 1, fill: 0.8, cone: 0.45, bare: true, plateSpeed: 1.2, hl: 1 }, { amb: 'rumble', sfx: [['rockGrind', 0.2]], draw: arrow3([-36, -3.6, 0.5], [-14, -4.2, 0.5], 0.1, { color: '#7fd0ff' }) }));
  add(flat(A.at('Anak Krakatau grows') - L, (k, lt, S2) => INFO.growth(k, lt, S2, { dur: 2.6 }), { sfx: [['counterTicks', 0.2]] }));
  add(shot(A.at('It is alive') - L, 'strait', dolly([-1500, 40, -200], [-1400, 44, -280], [-150, 300, -900], [-150, 340, -900], 42, 'lin'), {
    mood: 'nightGlow', moodOv: { glowAz: 120 }, island: { destroyed: 1, anak: 320 }, erupt: anakPlume({ height: 3500, glow: 2.2, bombs: 0.9, bombSpeed: 150, lightning: 0.5 }), glowLight: 0.8,
  }, { amb: 'nightEruption', sfx: [['boomLow', 0.3], ['boomLow', 1.5], ['boomLow', 2.6]] }));
  const t18 = A.at('In December 2018') - L;
  add(shot(t18, 'strait', dolly([-4200, 30, 1800], [-4100, 32, 1700], [-150, 400, -900], [-150, 450, -900], 34, 'lin'), {
    mood: 'nightGlow', moodOv: { glowAz: 120 }, island: { destroyed: 1, anak: 330 }, erupt: anakPlume({ height: 5000, glow: 2.0, bombs: 0.6, lightning: 0.6 }), glowLight: 0.8,
  }, { amb: 'nightEruption', mus: 'tension', draw: both(word('DECEMBER 2018', 0.1, { y: H * 0.2, size: 96, tracking: 12 })) }));
  add(shot(A.at('During another eruption') - L, 'xsection', orbit([-4, -2, 0], [36, 30], [-20, -10], [10, 10], 40), { magma: 1, fill: 0.8, cone: 0.45, bare: true, slide: [0, 1], erupt: { height: 12, intensity: 0.3 } }, { amb: 'rumble', sfx: [['landslide', A.peek('flank collapsed') - A.peek('During another eruption')]] }));
  add(shot(A.at('triggering a local tsunami') - L, 'strait', dolly([-3000, 400, 1600], [-2800, 380, 1400], [-150, 0, -900], [-150, 0, -900], 42, 'lin'), {
    mood: 'nightGlow', moodOv: { glowAz: 120 }, island: { destroyed: 1, anak: 300 }, erupt: anakPlume({ height: 5000, glow: 1.8 }), glowLight: 0.7, ring: { t0: -0.5, speed: 70, h: 5, w: 60 },
  }, { amb: 'nightEruption', sfx: [['splashBig', 0.1], ['tsunamiRoar', 0.6]] }));
  add(shot(A.at('The waves hit the shores') - L, 'coast', dolly(cup(-40, -50, 2.0), cup(-40, -56, 2.2), [-20, 3, 100], [-20, 4, 100], 42, 'lin'), {
    layout: 'resort', mood: 'night', tsunami: { z0: 260, speed: 24, H: 6, t0: 0, curl: 0.4 }, wind: 1,
    people: [{ style: 'modern', at: [-30, -24], rot: 10 }, { style: 'modern', at: [-26, -22], rot: -30 }, { style: 'lady2', at: [-34, -28], rot: 20 }],
  }, { amb: 'nightBeach', sfx: [['waveCrash', 2.6]] }));
  add(shot(A.at('without warning') - L, 'coast', dolly(cup(-28, -18, 1.6), cup(-28, -19.5, 1.6), cup(-28, -30, 1.4), cup(-28, -30, 1.4), 34), {
    layout: 'resort', mood: 'night', tsunami: { z0: 110, speed: 24, H: 6, t0: 0, curl: 0.4 },
    people: [{ style: 'modern', at: [-30, -24], rot: 10 }, { style: 'modern', at: [-26, -22], rot: -30 }, { style: 'lady2', at: [-34, -28], rot: 20 }],
  }, { amb: 'nightBeach', sfx: [['tsunamiRoar', 0.3]], fx: { dof: { focus: 6, range: 3, bokeh: 3 } } }));
  add(shot(A.at('The earthquake-based warning') - L, 'studio', dolly([1.2, 1.5, 2.4], [1.0, 1.4, 2.0], [0.2, 0.7, 0], [0.2, 0.7, 0], 36), { bg: 'dark', items: [{ kind: 'seismo', pos: [0, 0, 0], appear: 0, spin: 0, flat: true }] }, {
    amb: 'room', sfx: [['flatTone', 0.2]], draw: word('SILENT', A.peek('stayed silent') - A.peek('The earthquake-based warning'), { y: H * 0.2, size: 120, color: '#ff6a4a', tracking: 18 }),
  }));
  add(shot(A.at('This tsunami had been') - L, 'xsection', dolly([-14, 6, 20], [-12, 5, 16], [-5, 2, 0], [-5, 1, 0], 38), { magma: 1, fill: 0.8, cone: 0.45, bare: true, slide: 1, water: 0 }, { amb: 'rumble', draw: pin3([-6, 2, 0], 'LANDSLIDE', A.peek('landslide') - A.peek('This tsunami had been'), { dir: [-1, -1], color: '#ffb27a' }) }));
  add(flat(A.at('More than 400') - L, (k, lt, S2) => INFO.peopleCount(k, lt, S2, { to: 400, plus: true, dur: 1.6, label: 'LIVES LOST · 2018' }), { mus: 'grief', sfx: [['lowHit', 1.8]], fx: { fadeOut: 0.3 } }));

  // ======================= CONCLUSION =======================
  add(shot(A.at('The eruption of Krakatoa in 1883') - L, 'interior', dolly([0.4, 1.35, 0.4], [0.5, 1.25, 0.1], [0.6, 0.86, -0.8], [0.6, 0.86, -0.8], 34), { room: 'study' }, { amb: 'room', mus: 'outro', fx: { dof: { focus: 1.2, range: 0.6, bokeh: 3.5 } } }));
  add(shot(A.at('It is an enduring reminder') - L, 'town', dolly([300, 340, 500], [240, 300, 420], [0, 100, -300], [0, 100, -300], 40, 'lin'), { style: 'modern', mood: 'night', windows: 1.2 }, { amb: 'cityModern' }));
  const tSk2 = A.at('with its skyscrapers') - L;
  add(shot(tSk2, 'town', dolly([40, 8, 60], [36, 30, 52], [0, 200, -150], [0, 260, -150], 50, 'lin'), { style: 'modern', mood: 'night', windows: 1.2 }, { amb: 'cityModern' }));
  add(shot(A.at('satellites') - L, 'globe', dolly([9, 3, 25], [8, 3.6, 22.5], [0, 0, 0], [0, 0, 0], 40, 'lin'), { ll: [[20, 100], [20, 90]], cloud: 0.45, sats: true, night: 0.6, sunAz: 120 }, { amb: 'space' }));
  add(shot(A.at('and digital networks') - L, 'globe', orbit([0, 0, 0], [26, 24], [20, 0], [6, 4], 40), {
    ll: [[30, 100], [30, 70]], cloud: 0.35, sats: true, cables: 1, cableK: 2.2, dots: ['london', 'newyork', 'tokyo', 'shanghai', 'singapore', 'bombay', 'sydney', 'sanfrancisco'],
    arcs: [{ id: 'n1', from: 'tokyo', to: 'sanfrancisco', start: 0.0, dur: 0.8, col: [0.4, 0.8, 1] }, { id: 'n2', from: 'london', to: 'singapore', start: 0.2, dur: 0.8, col: [0.4, 0.8, 1] }, { id: 'n3', from: 'newyork', to: 'london', start: 0.3, dur: 0.6, col: [0.4, 0.8, 1] }],
  }, { amb: 'space', sfx: [['dataBlips', 0]] }));
  add(shot(A.at('rests on a thin') - L, 'xsection', orbit([0, -6, -10], [60, 46], [10, -4], [14, 8], 40, 'inOut'), { city: true, magma: 0.8, fill: 0.9, pressure: 0.5, cone: 0.0, bg: 0x05060a }, { amb: 'rumble', sfx: [['rumbleDeep', 0.2]], subsOff: A.peek('fragile crust') - A.peek('rests on a thin') - 0.45, draw: word('a thin, fragile crust', A.peek('fragile crust') - A.peek('rests on a thin') - 0.4, { y: H * 0.16, size: 56, mode: 'blur', tracking: 2 }) }));
  add(shot(A.at('above an ocean of liquid fire') - L, 'magma', dolly([0, 14, 60], [0, 10, 44], [0, 1, 0], [0, 1, -10], 52, 'lin'), { crust: 0.3, pressure: 0.3, bubbles: 0.4 }, { amb: 'lava' }));
  add(shot(A.at('We do not own this planet') - L, 'globe', dolly([0, 2, 44], [0, 1.5, 38], [0, 0, 0], [0, 0, 0], 40, 'lin'), { ll: [[0, 60], [0, 40]], cloud: 0.5, sunGlare: 1.0, sunAz: 60 }, { amb: 'space', mus: 'outro' }));
  add(shot(A.at('We are tenants') - L, 'strait', dolly([-9000, 12, 1200], [-8960, 12, 1180], [-150, 300, -900], [-150, 320, -900], 32, 'lin'), { mood: 'dawn', sea: 'calm', island: { destroyed: 1, anak: 330 }, steam: { at: 'anak', amount: 0.5, h: 600 }, birds: { c: [-7000, 80, 800], r: 300, speed: 0.08, spread: 60, scale: 2.2 } }, { amb: 'oceanCalm' }));
  const tN = A.at('And nature can change') - L;
  add(shot(tN, 'strait', dolly([-4200, 20, 1600], [-4000, 22, 1450], [-150, 600, -900], [-150, 900, -900], 38, 'lin'), {
    mood: 'nightGlow', moodOv: { glowAz: 120 }, island: { destroyed: 1, anak: 330 }, erupt: anakPlume({ height: 6000, glow: 2.4, bombs: 1, lightning: 0.7, t0: A.peek('at any moment') - tN, rise: 400 }), glowLight: 1,
  }, { amb: 'nightEruption', sfx: [['bigBoom', A.peek('at any moment') - tN]], fx: { flashes: [{ at: A.peek('at any moment') - tN, amp: 2.5, decay: 4 }], shakes: [{ at: A.peek('at any moment') - tN + 0.2, amp: 1.6, decay: 1.5 }] } }));
  const tEnd = A.at('without notice') - L;
  add(flat(tEnd + 0.95, (k, lt, S2) => endTitle(k, lt, S2), { mus: 'end', sfx: [['cardHitBig', 0.05]], subs: false }));
  return S;
}

function ashCube(k, lt, S) {
  const ctx = k.ctx;
  k.bgDark('#1a1816', '#060505');
  const p = ease.out(clamp((lt - 0.2) / 0.9));
  const cx = W / 2 - 220, cy = H / 2 + 120, s = 360 * p;
  ctx.save();
  // isometric cube
  const top = [[cx, cy - s], [cx + s * 0.87, cy - s * 1.5], [cx, cy - s * 2], [cx - s * 0.87, cy - s * 1.5]];
  const left = [[cx - s * 0.87, cy - s * 1.5], [cx, cy - s], [cx, cy], [cx - s * 0.87, cy - s * 0.5]];
  const right = [[cx, cy - s], [cx + s * 0.87, cy - s * 1.5], [cx + s * 0.87, cy - s * 0.5], [cx, cy]];
  const poly = (pts, c) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
  poly(left, '#4a4642'); poly(right, '#36322f'); poly(top, '#6a6560');
  ctx.restore();
  k.text('20 km³', W / 2 + 330, H / 2 - 20, { size: 150, weight: 900, color: '#fff' });
  k.text('5 cubic miles of ash', W / 2 + 330, H / 2 + 40, { size: 40, weight: 400, family: 'serif', italic: true, color: '#d8d0c8' });
  k.text('BLASTED INTO THE SKY', W / 2 + 330, H / 2 + 110, { size: 32, weight: 900, color: PAL.ember, tracking: 8 });
}

function mirrorDiagram(k, lt, S) {
  const ctx = k.ctx;
  k.bgDark('#0c1426', '#020308');
  const cx = W / 2, cy = H + 900, R = 1300;
  // earth curve
  const g = ctx.createRadialGradient(cx, cy, R - 60, cx, cy, R + 40);
  g.addColorStop(0, '#1e5a8a'); g.addColorStop(1, '#3a8ad0');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  // haze layer
  const hp = ease.out(clamp(lt / 0.6));
  ctx.strokeStyle = `rgba(230,190,120,${0.75 * hp})`; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(cx, cy, R + 120, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  k.text('SULFATE HAZE', cx + 520, cy - R - 170, { size: 30, weight: 900, color: '#f2d79a', tracking: 6 });
  // sun + rays
  k.circle(250, 200, 70, '#ffd27a');
  const n = 6;
  for (let i = 0; i < n; i++) {
    const st = 0.3 + i * 0.25;
    const p = clamp((lt - st) / 0.7);
    if (p <= 0) continue;
    const x0 = 300, y0 = 240 + i * 8;
    const hitX = 620 + i * 180, hitY = cy - Math.sqrt((R + 120) ** 2 - (hitX - cx) ** 2);
    const reflect = i % 2 === 0;
    const pts = reflect ? [[x0, y0], [hitX, hitY], [hitX + 260, 40]] : [[x0, y0], [hitX, hitY], [hitX + 90, cy - Math.sqrt(R * R - (hitX + 90 - cx) ** 2)]];
    k.path(pts, p, { width: 6, color: reflect ? '#ffd27a' : 'rgba(255,210,122,0.5)', glow: 12 });
  }
  ctx.globalAlpha = ease.out(clamp((lt - 1.2) / 0.4));
  k.text('SUNLIGHT REFLECTED BACK INTO SPACE', W / 2, 120, { size: 40, weight: 900, color: '#fff', tracking: 6 });
  ctx.globalAlpha = 1;
}

function endTitle(k, lt, S) {
  const ctx = k.ctx;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const a = ease.out(clamp(lt / 1.2)) * (1 - clamp((lt - (S.dur - 1.2)) / 1.1));
  ctx.globalAlpha = a;
  const tr = lerp(60, 26, ease.expo(clamp(lt / 1.6)));
  k.text('KRAKATOA', W / 2, H / 2 + 20, { size: 150, weight: 900, color: '#f4efe8', tracking: tr });
  ctx.fillStyle = PAL.red; ctx.fillRect(W / 2 - 160 * a, H / 2 + 60, 320 * a, 3);
  k.text('1883', W / 2, H / 2 + 130, { size: 46, weight: 700, color: '#cfc7bc', tracking: 30 });
  ctx.globalAlpha = 1;
}
