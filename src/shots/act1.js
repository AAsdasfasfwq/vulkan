// ACT I — The Victorian world, the strait, the island, the hidden threat (0:00 – 1:38)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { drawMap, drawRadius, drawRoute, placeXY } from '../overlay/maps.js';
import { islandHeight } from '../world/island.js';
import { XS } from '../sets/xsection.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp } from '../core/math.js';

const up = (x, z, h) => [x, islandHeight(x, z, {}) + h, z];

export default function act1(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  // --- 0:00 Victorian industry --------------------------------------------
  add(shot(0, 'town', dolly([0, 70, 170], [0, 48, 105], [0, 30, -320], [0, 26, -320], 42, 'lin'), { style: 'victorian', mood: 'dusk' }, { fx: { fadeIn: 1.0 }, amb: 'city', mus: 'wonder', sfx: [['riserSoft', 0]] }));
  add(shot(A.at('drew to a close') - L, 'town', dolly([-30, 3, 20], [-26, 4, 8], [10, 70, -480], [10, 72, -480], 34), { style: 'victorian', mood: 'dusk' }, { amb: 'city' }));
  add(shot(A.at('humanity seemed') - L, 'town', dolly([3.6, 1.55, 24.8], [3.1, 1.65, 23.6], [1.2, 1.9, 10], [1.2, 2.1, 10], 36), {
    style: 'victorian', mood: 'dusk', people: [{ style: 'gentleman', at: [1.6, 21], rot: 180 }, { style: 'lady', at: [-2.5, 6], rot: 175, move: [0, -0.9], pose: { walk: 0.9 } }, { style: 'gentleman', at: [-4, 12], rot: 185, move: [0, -1.1], pose: { walk: 1.1 } }],
  }, { fx: { dof: { focus: 3.4, range: 1.5, bokeh: 3 } } }));
  const steamer = { pos: [-7000, 9000], heading: 20, speed: 7 };
  add(shot(A.at('conquering nature itself') - L, 'strait', onShip(steamer, [12, 2.5, 9], [5, 3, 9.5], [40, 4, -10], [40, 6, -10], 40), { mood: 'golden', sea: 'rough', ships: [{ id: 'st1', type: 'steamer', ...steamer }] }, { amb: 'ocean', sfx: [['whoosh', 0]] }));

  // --- Steam engines / railroads / telegraph ------------------------------
  add(shot(A.at('Steam engines drove') - L, 'machine', orbit([-3, 4.2, -2], [11, 9], [35, 20], [8, 4], 40), { speed: 2.4 }, { amb: 'factory', sfx: [['whoosh', 0], ['steamHiss', 0.4]] }));
  add(shot(A.at('the factories around') - L, 'machine', dolly([9, 4.8, 4.5], [7.5, 4.6, 4.2], [4, 4.2, 1.2], [5, 4.3, 1.2], 38), { speed: 2.4 }, { amb: 'factory', fx: { dof: { focus: 4, range: 2, bokeh: 3 } } }));
  add(shot(A.at('around the clock') - L, 'machine', dolly([3.5, 9.5, 2], [3.2, 9.0, 1.6], [2.5, 8.6, -5], [2.6, 8.8, -5], 32), { speed: 2.4 }, { amb: 'factory', draw: clockSpin }));
  add(shot(A.at('Steel railroads') - L, 'land', dolly([-30, 1.6, 4.5], [-20, 1.5, 4.2], [-80, 2.5, 0], [-60, 2.5, 0], 38, 'lin'), { mood: 'golden', trainX: -140, trainSpeed: 22 }, { amb: 'wind', sfx: [['trainPass', 0.1], ['whoosh', 0]] }));
  add(shot(A.at('stitched continents') - L, 'globe', dolly([0, 2, 33], [0, 1, 29], [0, 0, 0], [0, 0, 0], 40), { ll: [[30, -20], [25, 20]], cables: [0, 1], cloud: 0.35, dots: ['london', 'newyork', 'bombay', 'singapore', 'batavia', 'suez'] }, { amb: 'space', sfx: [['whoosh', 0], ['dataBlips', 0.2]] }));
  add(shot(A.at('Thousands of miles') - L, 'seafloor', dolly([-30, 2.2, 6], [-18, 1.6, 4.5], [0, 0.4, 0], [6, 0.3, 0], 42, 'lin'), { pulse: 1 }, { amb: 'underwater', sfx: [['whoosh', 0], ['sonar', 0.6]] }));
  add(shot(A.at('crossed the ocean floor') - L, 'seafloor', dolly([12, 0.7, -2.5], [16, 0.6, -2.0], [40, 0.3, 2], [44, 0.3, 2], 34, 'lin'), { pulse: 1 }, { amb: 'underwater', fx: { dof: { focus: 4, range: 3, bokeh: 3 } } }));
  add(shot(A.at('connecting the world') - L, 'globe', orbit([0, 0, 0], [30, 27], [-10, 10], [8, 4], 40), {
    ll: [[40, -40], [20, 40]], cables: 1, cableK: 1.4, cloud: 0.35, dots: ['london', 'newyork', 'lisbon', 'bombay', 'singapore', 'batavia', 'suez', 'aden'],
    arcs: [{ id: 'ln', from: 'london', to: 'newyork', start: 0.2, dur: 1.2 }, { id: 'lb', from: 'london', to: 'bombay', start: 0.6, dur: 1.4 }],
  }, { amb: 'space', sfx: [['dataBlips', 0.1]] }));

  // --- Science / masters ---------------------------------------------------
  add(shot(A.at('Science had become') - L, 'interior', dolly([2.6, 1.25, 0.6], [2.1, 1.2, 0.3], [0.6, 1.0, -1.2], [0.7, 1.05, -1.2], 36), { room: 'study' }, {
    amb: 'room', fx: { dof: { focus: 2.0, range: 1.2, bokeh: 3.5 } }, subsOff: A.peek('a new religion') - A.peek('Science had') - 0.1, sfx: [['hit', A.peek('religion') - A.peek('Science had') ]],
    draw: both(word('SCIENCE', 0.05, { y: H * 0.3, size: 130 }), word('a new religion', A.peek('a new religion') - A.peek('Science had'), { y: H * 0.3 + 90, size: 54, mode: 'blur', tracking: 2 })),
  }));
  add(shot(A.at('People truly believed') - L, 'town', dolly([5, 1.7, 30], [4.6, 1.7, 26], [0, 2.4, -40], [0, 2.4, -40], 40), {
    style: 'victorian', mood: 'dusk', people: [
      { style: 'gentleman', at: [2, 12], rot: 180, move: [0, -1.2], pose: { walk: 1.2 } }, { style: 'lady2', at: [3, 14], rot: 180, move: [0, -1.1], pose: { walk: 1.0 } },
      { style: 'gentleman', at: [-3, 4], rot: 0, move: [0, 1.2], pose: { walk: 1.2 } }, { style: 'lady', at: [-1.5, 18], rot: 180, move: [0, -0.9], pose: { walk: 0.9 } },
      { style: 'clerk', at: [5.5, 2], rot: 10, move: [0, 1.0], pose: { walk: 1.0 } }, { style: 'merchant', at: [-5, 22], rot: 180, move: [0, -1.0], pose: { walk: 1.0 } }],
  }, { amb: 'city' }));
  const stormShip = { pos: [-9000, 11000], heading: 30, speed: 6 };
  add(shot(A.at('no longer at the mercy') - L, 'strait', onShip(stormShip, [-30, 7, 22], [-22, 6, 20], [10, 6, 0], [16, 7, 0], 44), { mood: 'storm', sea: 'storm', rain: 0.6, ships: [{ id: 'st2', type: 'steamer', ...stormShip, extraRoll: 0.04 }] }, { amb: 'storm', sfx: [['thunder', 0.6]] }));
  add(flat(A.at('They were its masters') - L, (k, lt, S) => INFO.headline(k, lt, S, { bg: 'paper', small: 'they were its', big: 'MASTERS', size: 190, smallAt: 0, bigAt: A.peek('masters') - A.peek('They were its') - 0.05 }), { sfx: [['hit', A.peek('masters') - A.peek('They were its')]], mus: 'wonder' }));

  // --- Dutch East Indies, trade ---------------------------------------------
  add(shot(A.at('The Dutch East Indies') - L, 'globe', dolly([0, 3, 38], [0, 1.5, 26], [0, 0, 0], [0, 0, 0], 40, 'inOut'), { ll: [[25, 40], [-2, 112]], cloud: 0.45, dots: ['batavia'] }, {
    amb: 'space', sfx: [['whoosh', 0]], draw: gpin([-2.5, 112], 'DUTCH EAST INDIES', 0.9, { size: 36 }),
  }));
  add(shot(A.at('present-day Indonesia') - L, 'globe', dolly([0, 1, 22], [0, 0.5, 19], [0, 0, 0], [0, 0, 0], 38), { ll: [[-2, 112], [-3, 110]], cloud: 0.4, dots: ['batavia'] }, {
    amb: 'space', draw: both(gpin([-2.5, 112], 'DUTCH EAST INDIES', 0.0, { size: 36, sub: 'present-day Indonesia' })),
  }));
  add(shot(A.at('was a vital hub') - L, 'globe', orbit([0, 0, 0], [30, 28], [-8, 8], [6, 10], 40), {
    ll: [[0, 80], [10, 60]], cloud: 0.35, dots: ['batavia', 'amsterdam', 'london', 'newyork', 'shanghai', 'bombay'],
    arcs: [{ id: 't1', from: 'batavia', to: 'amsterdam', start: 0.1, dur: 1.4, col: [1, 0.75, 0.3] }, { id: 't2', from: 'batavia', to: 'shanghai', start: 0.4, dur: 0.9, col: [1, 0.75, 0.3] }, { id: 't3', from: 'batavia', to: 'bombay', start: 0.6, dur: 1.0, col: [1, 0.75, 0.3] }, { id: 't4', from: 'batavia', to: 'newyork', start: 0.9, dur: 1.6, col: [1, 0.75, 0.3], lift: 0.12 }],
  }, { amb: 'space', sfx: [['dataBlips', 0.1]] }));
  const tEx = A.at('exporting coffee') - L;
  const aSugar = A.peek('sugar') - tEx, aSpice = A.peek('spices') - tEx;
  add(shot(tEx, 'studio', dolly([0, 2.4, 7.4], [0, 2.2, 6.6], [0, 0.55, 0], [0, 0.5, 0], 38), {
    bg: 'light', items: [{ kind: 'coffee', pos: [-2.4, 0, 0], appear: 0.1, spin: 0.1 }, { kind: 'sugar', pos: [0, 0, 0.4], appear: aSugar, spin: 0.1 }, { kind: 'spices', pos: [2.4, 0, 0], appear: aSpice, spin: 0.1 }],
  }, {
    amb: 'none', sfx: [['pop', 0.1], ['pop', aSugar], ['pop', aSpice]],
    draw: both(studioLabel([-2.4, 1.5, 0], 'COFFEE', 0.3), studioLabel([0, 1.1, 0.4], 'SUGAR', aSugar + 0.2), studioLabel([2.4, 0.8, 0], 'SPICES', aSpice + 0.2)),
  }));

  // --- Sunda Strait ----------------------------------------------------------
  const fleet = (t0) => [
    { id: 'f1', type: 'barque', pos: [-5600, 7600], heading: 35, speed: 4 },
    { id: 'f2', type: 'barque', pos: [-6400, 8400], heading: 35, speed: 4.2, opts: { hull: [0.18, 0.1, 0.06] } },
    { id: 'f3', type: 'steamer', pos: [-7200, 7400], heading: 32, speed: 5 },
    { id: 'f4', type: 'barque', pos: [-5000, 9300], heading: 38, speed: 3.8, opts: { hull: [0.05, 0.12, 0.2] } },
    { id: 'f5', type: 'barque', pos: [-8100, 9000], heading: 30, speed: 4.4 },
  ];
  add(shot(A.at('Every day, dozens') - L, 'strait', dolly([-7600, 160, 10400], [-7000, 130, 9800], [-6000, 0, 8200], [-5600, 0, 7800], 40, 'lin'), { mood: 'golden', ships: fleet(), birds: { c: [-6500, 60, 8800], r: 300, speed: 0.08, spread: 60, scale: 2.0 } }, { amb: 'ocean', sfx: [['whoosh', 0], ['gulls', 0.3]] }));
  const tMap = A.at('passed through the Sunda') - L;
  const aJava = A.peek('Java and') - tMap, aSum = A.peek('Sumatra') - tMap;
  add(flat(tMap, (k, lt, S) => drawMap(k, lt, S, {
    theme: 'night', center: [[104.5, -4.2], [105.4, -5.9]], scale: [[5200, 9000]], box: [100, -10, 112, 0], hi: true,
    extra: (k, lt, S, M) => {
      // ship traffic dots
      for (let i = 0; i < 14; i++) { const u = ((lt * 0.08 + i / 14) % 1); const a = [lerp(-5.2, -6.6, u) + Math.sin(i) * 0.08, lerp(104.9, 106.1, u) + Math.cos(i) * 0.05]; const [x, y] = M.P(a); k.circle(x, y, 5, 'rgba(255,220,160,0.9)'); }
      drawRoute(k, M, [-5.0, 104.6], [-6.8, 106.3], ease.out(clamp(lt / 1.4)), { color: '#ffd28a', width: 3, dash: [12, 10], head: false, glow: 8 });
      const [jx, jy] = placeXY(M, [-6.7, 106.6]); const [sx, sy] = placeXY(M, [-4.6, 104.5]);
      k.pin(jx, jy, 'JAVA', lt, { start: aJava, size: 46, dir: [1, 1], len: 70 });
      k.pin(sx, sy, 'SUMATRA', lt, { start: aSum, size: 46, dir: [-1, -1], len: 70 });
      k.ctx.globalAlpha = ease.out(clamp((lt - 0.3) / 0.5));
      const [mx, my] = placeXY(M, [-5.85, 105.6]);
      k.text('SUNDA STRAIT', mx + 40, my, { size: 30, weight: 400, family: 'serif', italic: true, color: '#cfe2f2', align: 'left', tracking: 6 });
      k.ctx.globalAlpha = 1;
    },
  }), { amb: 'ocean', sfx: [['whoosh', 0], ['pop', aJava], ['pop', aSum]] }));
  const tMid = A.at('In the middle of that strait') - L;
  add(flat(tMid, (k, lt, S) => drawMap(k, lt, S, {
    theme: 'night', center: [[105.4, -5.9], [105.42, -6.1]], scale: [[9000, 60000]], box: [100, -10, 112, 0], hi: true,
    extra: (k, lt, S, M) => {
      const [x, y] = placeXY(M, 'krakatoa');
      const s = lerp(4, 40, ease.inOut(clamp(lt / S.dur)));
      // stylised island outline (not in the 1:10m data at this zoom)
      k.ctx.save(); k.shadow(30, 'rgba(255,120,40,0.6)', 0, 0);
      k.ctx.fillStyle = '#3d6a32'; k.ctx.beginPath(); k.ctx.ellipse(x, y, s * 0.55, s, 0.2, 0, Math.PI * 2); k.ctx.fill(); k.ctx.restore();
      k.pin(x, y, 'KRAKATOA', lt, { start: 0.5, size: 52, dir: [1, -1], len: 90, color: '#fff', sub: 'volcanic island' });
    },
  }), { amb: 'ocean', sfx: [['zoomIn', 0], ['pop', 0.5]] }));
  add(shot(A.at('stood the picturesque') - L, 'strait', dolly([-7400, 30, 9800], [-5800, 420, 7400], [0, 380, 600], [0, 360, 0], 40, 'inOut'), { mood: 'golden', ships: [{ id: 'f1', type: 'barque', pos: [-4200, 5600], heading: 60, speed: 3 }], birds: { c: [-5600, 220, 7600], r: 200, speed: 0.1, spread: 50, scale: 2.2 } }, {
    amb: 'ocean', mus: 'wonder', sfx: [['whooshBig', 0], ['gulls', 0.5]], draw: word('KRAKATOA', A.peek('Krakatoa') - A.peek('stood the picturesque'), { y: H * 0.22, size: 150, tracking: 22, mode: 'track' }),
  }));

  // --- Rainforest, birds -------------------------------------------------------
  add(shot(A.at('Dense, emerald-green') - L, 'strait', dolly(up(-1900, 4300, 160), up(-1200, 3500, 150), up(400, 2300, 120), up(500, 2000, 100), 46, 'lin'), { mood: 'day', wind: 1.2, birds: { c: [-1300, 260, 3600], r: 120, speed: 0.15, spread: 30 } }, { amb: 'jungle', sfx: [['whoosh', 0]] }));
  add(shot(A.at('covered its slopes') - L, 'strait', dolly(up(-2300, 1500, 90), up(-2050, 1100, 85), up(-1200, 300, 120), up(-1000, 0, 140), 44, 'lin'), { mood: 'day', wind: 1.2 }, { amb: 'jungle', fx: { dof: { focus: 300, range: 200, bokeh: 1.5 } } }));
  add(shot(A.at('alive with birdsong') - L, 'strait', dolly([-2950, 18, 2400], [-2930, 21, 2330], [-2600, 40, 2100], [-2600, 45, 2100], 38), { mood: 'day', wind: 1.4, birds: { c: [-2820, 40, 2240], r: 60, h: 8, speed: 0.35, spread: 22, scale: 1.0 } }, { amb: 'jungle', sfx: [['birdsong', 0]] }));

  // --- Subduction ---------------------------------------------------------------
  add(shot(A.at('But Krakatoa sits') - L, 'strait', dolly([-2200, 2400, 5200], [-200, 900, 1000], [0, 300, 0], [0, 0, -200], 44, 'in'), { mood: 'day' }, { tin: 'push', amb: 'rumble', sfx: [['whooshDown', 0.3], ['rumble', 0.6]], mus: 'unease' }));
  add(shot(A.at('above a subduction zone') - L, 'xsection', orbit([0, -12, -10], [118, 92], [32, 22], [16, 12], 40, 'inOut'), { magma: 0.6, fill: 0.7, plateSpeed: 0.4 }, {
    amb: 'rumble', sfx: [['whooshBig', 0]], draw: both(word('SUBDUCTION ZONE', 0.4, { y: 150, size: 70, tracking: 10 })),
  }));
  add(shot(A.at('Here, the Indo-Australian') - L, 'xsection', orbit([-14, -10, -6], [70, 62], [18, 24], [10, 8], 40), { magma: 0.6, fill: 0.7, hl: 1, plateSpeed: 0.6 }, {
    amb: 'rumble', sfx: [['pop', 0.6]], draw: both(pin3(XS.slab, 'INDO-AUSTRALIAN PLATE', 0.5, { dir: [-1, -1], size: 34 }), arrow3([-38, -3.5, 0.5], [-16, -3.8, 0.5], 0.3, { color: '#7fd0ff' })),
  }));
  add(shot(A.at('forces its way beneath') - L, 'xsection', orbit([8, -14, -6], [74, 68], [-12, -18], [10, 8], 40), { magma: 0.7, fill: 0.7, hl: 2, plateSpeed: 0.8 }, {
    amb: 'rumble', sfx: [['pop', A.peek('Eurasian') - A.peek('forces its way')]], draw: both(pin3(XS.eurasian, 'EURASIAN PLATE', A.peek('Eurasian') - A.peek('forces its way'), { dir: [1, -1], size: 34 }), arrow3([-12, -6, 0.5], [12, -18.5, 0.5], 0.2, { color: '#7fd0ff' })),
  }));
  add(shot(A.at('at roughly two and a half') - L, 'xsection', orbit([-6, -9, 0], [40, 36], [8, 12], [6, 5], 38), { magma: 0.7, fill: 0.7, hl: 1, plateSpeed: 0.5 }, {
    amb: 'rumble', sfx: [['counterTicks', 0.2]], draw: both(arrow3([-30, -5.2, 0.5], [-12, -6.5, 0.5], 0.1, { color: '#7fd0ff' }), counter((v) => `${v.toFixed(1)} in / year`, 0, 2.5, 0.25, 1.4, { y: 190, size: 84, label: '≈ 6 CM — AS FAST AS FINGERNAILS GROW' })),
  }));
  add(shot(A.at('Over millions of years') - L, 'xsection', orbit([8, -20, -6], [60, 54], [-4, 4], [4, 6], 40), { magma: [0.2, 1], fill: 0.6, plateSpeed: 2.5 }, {
    amb: 'rumble', sfx: [['counterTicks', 0.1]], draw: counter((v) => `${Math.round(v).toLocaleString('en-US')} years`, 0, 3000000, 0.1, 2.4, { y: 170, size: 80 }),
  }));
  add(shot(A.at('friction and melting rock') - L, 'magma', dolly([0, 5, 28], [0, 3.5, 18], [0, 1, 0], [0, 0.5, -2], 44), { bubbles: 0.6, crust: 0.5 }, { amb: 'lava', sfx: [['lavaBloop', 0.4]] }));
  add(shot(A.at('generate enormous quantities') - L, 'xsection', orbit([6, -18, -4], [52, 46], [-14, -6], [6, 8], 40), { magma: 1, fill: [0.55, 0.75], plateSpeed: 1.2 }, { amb: 'rumble', sfx: [['rumble', 0.3]] }));
  add(shot(A.at('That thick magma collects') - L, 'xsection', orbit([0, -11, -2], [44, 30], [4, -6], [4, 3], 40, 'inOut'), { magma: 1, fill: [0.35, 0.95], plateSpeed: 0.5 }, {
    amb: 'rumble', sfx: [['lavaBloop', 0.4]], draw: pin3(XS.chamber, 'MAGMA CHAMBER', 0.6, { dir: [1, -1], size: 36 }),
  }));
  add(shot(A.at('turning the island into a time bomb') - L, 'xsection', orbit([0, -6, 0], [34, 30], [-8, 4], [8, 10], 40), { magma: 1, fill: 0.95, pressure: [0.3, 1], plug: 1 }, {
    amb: 'rumble', sfx: [['tickTock', 0.0], ['hit', A.peek('time bomb') - A.peek('turning the island')]], draw: word('TIME BOMB', A.peek('time bomb') - A.peek('turning the island'), { y: 170, size: 110, color: '#ffb27a', tracking: 8 }),
  }));
  add(shot(A.at('a pressure vessel') - L, 'studio', dolly([0, 0.2, 2.6], [0, 0.15, 2.2], [0, 0, 0], [0, 0, 0], 36), { bg: 'dark', items: [{ kind: 'gauge', pos: [0, 0, 0], appear: 0, spin: 0, value: (u) => lerp(0.35, 1.04, ease.inOut(u)), jitter: 0.02, scale: 1 }] }, { amb: 'none', sfx: [['creak', 0.3], ['gaugeTick', 0.2]] }));
  add(shot(A.at('with its release valve') - L, 'xsection', dolly([4, 12, 22], [2.5, 10.5, 15], [0, 7, 0], [0, 7.5, 0], 38), { magma: 1, fill: 1, pressure: 1, plug: 1, vent: 0.75 }, {
    amb: 'rumble', sfx: [['thudLow', A.peek('jammed shut') - A.peek('with its release valve')]], draw: pin3(XS.plug, 'SEALED VENT', A.peek('jammed') - A.peek('with its release valve'), { dir: [1, -1], size: 36, sub: 'a plug of hardened lava' }),
  }));

  // --- Landmark ------------------------------------------------------------------
  const lm = { pos: [-5600, 5600], heading: 45, speed: 2 };
  add(shot(A.at('To sailors, it was simply') - L, 'strait', onShip(lm, [8, 5.4, 2.6], [10, 5.2, 2.2], [0, 300, 0], [0, 320, 0], 40, { lookWorld: true }), {
    mood: 'golden', ships: [{ id: 'lm', type: 'barque', ...lm }], people: [{ style: 'sailor', ship: 'lm', at: [16, 1.2], rot: 90 }, { style: 'captain', ship: 'lm', at: [13, -1.6], rot: 70, pose: { telescope: true }, prop: 'telescope' }],
  }, { amb: 'ocean', mus: 'wonder', sfx: [['shipCreak', 0.2], ['gulls', 1.0]] }));
  add(shot(A.at('A beautiful green mountain') - L, 'strait', dolly([-4200, 5, 5200], [-4000, 5, 5000], [0, 320, 0], [0, 330, 0], 30, 'lin'), { mood: 'golden', sea: 'calm', birds: { c: [-3500, 40, 4500], r: 200, speed: 0.1, spread: 40, scale: 2.0 } }, { amb: 'ocean' }));
  add(shot(A.at('rising above brilliant') - L, 'strait', dolly([3500, 900, 6500], [3000, 760, 5600], [0, 250, 0], [0, 260, 0], 40, 'lin'), { mood: 'day' }, { amb: 'ocean' }));
  add(shot(A.at('No one imagined') - L, 'strait', dolly([-4600, 40, -3600], [-3800, 60, -3000], [0, 300, 0], [0, 320, 0], 34, 'lin'), { mood: 'golden', mood2: 'dusk', moodK: [0, 0.6] }, { amb: 'rumble', mus: 'unease', sfx: [['rumble', 0.2]], fx: { grade: 'warm' } }));
  add(shot(A.at('enough energy to tear') - L, 'xsection', orbit([0, -6, 0], [48, 40], [-20, -10], [12, 16], 40), { magma: 1, fill: 1, pressure: 1, cracks: [0, 1], strain: 1, plug: 1 }, { amb: 'rumble', sfx: [['crackRock', 0.2], ['rumble', 0.0]], fx: { shakes: [{ at: 0.4, amp: 1.2, decay: 2 }] } }));
  add(shot(A.at("alter the planet's climate") - L, 'globe', orbit([0, 0, 0], [30, 26], [10, -10], [10, 6], 40), { ll: [[-6, 105], [-6, 80]], cloud: 0.35, veil: [0.0, 0.9], veilK: [0.2, 1] }, { amb: 'space', sfx: [['whoosh', 0], ['drone', 0.2]] }));
  add(shot(A.at('and show humanity') - L, 'strait', dolly([-5200, 3, 4600], [-5150, 3.5, 4560], [0, 400, 0], [0, 420, 0], 26), { mood: 'storm', sea: 'normal', ships: [{ id: 'lm', type: 'barque', pos: [-3800, 3400], heading: 120, speed: 2 }] }, { amb: 'wind', fx: { fadeOut: 0.5, grade: 'cold' }, sfx: [['drone', 0]] }));

  return S;
}

// --- local overlays -----------------------------------------------------------
function studioLabel(p, text, at) {
  return (k, lt, S) => {
    const [x, y, vis] = S.project(...p);
    if (!vis) return;
    const a = ease.out(clamp((lt - at) / 0.4));
    k.ctx.globalAlpha = a;
    k.text(text, x, y - 30 - (1 - a) * 20, { size: 46, weight: 900, color: PAL.ink, tracking: 6 });
    k.ctx.globalAlpha = 1;
  };
}

function clockSpin(k, lt) {
  const ctx = k.ctx;
  const cx = W - 220, cy = 220, R = 110;
  const a = ease.out(clamp(lt / 0.3));
  ctx.globalAlpha = a * 0.92;
  k.shadow(30, 'rgba(0,0,0,0.6)', 0, 10);
  k.circle(cx, cy, R, '#f2ebe0');
  k.noShadow();
  k.circle(cx, cy, R, null, { color: '#1a1714', width: 6 });
  for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; ctx.fillStyle = '#1a1714'; ctx.fillRect(cx + Math.cos(an) * 88 - 3, cy + Math.sin(an) * 88 - 3, 6, 6); }
  const h = lt * 4, m = lt * 48;
  ctx.strokeStyle = '#1a1714'; ctx.lineCap = 'round';
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(h) * 50, cy - Math.cos(h) * 50); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(m) * 80, cy - Math.cos(m) * 80); ctx.stroke();
  k.text('24 / 7', cx, cy + R + 50, { size: 34, weight: 900, color: '#fff', shadow: { blur: 12 } });
  ctx.globalAlpha = 1;
}
