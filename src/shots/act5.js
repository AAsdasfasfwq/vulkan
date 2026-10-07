// ACT V — One month before & 24 hours before (4:25 – 6:33)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { drawMap, drawRadius, placeXY } from '../overlay/maps.js';
import { islandHeight } from '../world/island.js';
import { XS } from '../sets/xsection.js';
import { CRATERS } from '../sets/strait.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp, rng } from '../core/math.js';

const julPlume = (o = {}) => ({ at: 'danan', height: 9000, intensity: 0.9, glow: 0.5, dark: 0.18, bombs: 0.2, count: 1400, wind: [0.25, 0.08], ...o });
const augPlume = (o = {}) => ({ at: 'centre', height: 27000, intensity: 1, glow: 1.4, dark: 0.12, bombs: 0.8, bombSpeed: 380, lightning: 0.6, umbrella: 0.7, umbrellaR: 26000, count: 2000, wind: [0.12, 0.04], ...o });

export default function act5(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  // ======================= ONE MONTH BEFORE =======================
  add(card(A.at('One month before') - 0.15, '1 MONTH BEFORE', 'JULY 1883'));
  add(shot(A.at('The volcano becomes active') - L, 'strait', dolly([-8000, 60, 6000], [-7600, 80, 5600], [0, 2000, -400], [0, 2600, -400], 38, 'lin'), { mood: 'day', mood2: 'haze', moodK: 0.4, erupt: julPlume({ t0: -1.0 }), island: { ash: 0.4 } }, { amb: 'eruption', mus: 'tension', sfx: [['boom', 0.5]], fx: { shakes: [{ at: 0.5, amp: 0.6, decay: 2 }] } }));
  add(shot(A.at("This time, the eruption doesn't stop") - L, 'strait', orbit([0, 1500, 0], [16000, 15000], [-150, -120], [5, 6], 40, 'lin'), { mood: 'haze', erupt: julPlume(), island: { ash: 0.5 } }, { amb: 'eruption' }));
  add(shot(A.at('A gray haze hangs') - L, 'strait', dolly([-6000, 8, 9000], [-5900, 8, 8800], [-4000, 40, 6000], [-3900, 40, 6000], 40, 'lin'), {
    mood: 'haze', moodOv: { fog: 0.00045 }, erupt: julPlume(), island: { ash: 0.5 }, ashfall: 0.25,
    ships: [{ id: 'g1', type: 'barque', pos: [-4300, 6500], heading: 20, speed: 3 }, { id: 'g2', type: 'steamer', pos: [-5200, 6100], heading: 20, speed: 4 }],
  }, { amb: 'oceanGrey', fx: { grade: 'ash' } }));
  const ashShip = { pos: [-6500, 7200], heading: 20, speed: 2 };
  add(shot(A.at('Ash blankets the decks') - L, 'strait', onShip(ashShip, [-6, 4.8, -2.5], [-3, 4.6, -2.0], [6, 3.4, 0.5], [8, 3.4, 0.5], 40), {
    mood: 'haze', moodOv: { fog: 0.0004 }, erupt: julPlume(), ashfall: 0.8, shipAsh: 1, ships: [{ id: 'ash1', type: 'barque', ...ashShip }],
    people: [{ style: 'sailor2', ship: 'ash1', at: [2, -1.0], rot: 60, pose: { sweep: 0 }, prop: 'broom' }],
  }, { amb: 'oceanGrey', fx: { grade: 'ash', dof: { focus: 6, range: 3, bokeh: 2.5 } } }));
  add(shot(A.at('Sailors have to sweep') - L, 'strait', onShip(ashShip, [3.6, 4.1, 0.6], [3.3, 4.0, 0.2], [1.8, 3.6, -1.0], [1.9, 3.6, -1.0], 36), {
    mood: 'haze', moodOv: { fog: 0.0004 }, erupt: julPlume(), ashfall: 1, shipAsh: 1, ships: [{ id: 'ash1', type: 'barque', ...ashShip }],
    people: [{ style: 'sailor2', ship: 'ash1', at: [2, -1.0], rot: 60, pose: { sweep: 0 }, prop: 'broom' }, { style: 'sailor', ship: 'ash1', at: [-1.5, 1.2], rot: -30, pose: { sweep: 0 }, prop: 'broom' }],
  }, { amb: 'oceanGrey', sfx: [['sweep', 0.2], ['sweep', 1.3]], fx: { grade: 'ash', dof: { focus: 2, range: 1, bokeh: 3.5 } } }));
  add(shot(A.at('At night, glowing lava') - L, 'strait', dolly([-9000, 30, 5000], [-8700, 34, 4800], [0, 600, -400], [0, 700, -400], 30, 'lin'), {
    mood: 'nightGlow', moodOv: { glowAz: 125, glowEl: 3 }, erupt: julPlume({ glow: 2.2, bombs: 0.5 }), island: { lava: 1.1, ash: 0.5 }, glowLight: 1,
  }, { amb: 'nightEruption', sfx: [['boomFar', 1.0]] }));
  add(shot(A.at("Krakatoa's summit") - L, 'strait', dolly([-2400, 900, 1400], [-2200, 860, 1200], [-250, 450, -200], [-250, 600, -200], 36, 'lin'), {
    mood: 'nightGlow', moodOv: { glowAz: 125, glowEl: 3 }, erupt: julPlume({ glow: 2.4, bombs: 0.8, intensity: 0.8 }), island: { lava: 1.3, ash: 0.6 }, glowLight: 1.4,
  }, { amb: 'nightEruption', sfx: [['lavaBloop', 0.3]] }));
  add(flat(A.at('But the human mind') - L, (k, lt, S2) => INFO.calendar(k, lt, S2, { days: 58 }), { sfx: [['pageFlips', 0]], mus: 'calm' }));
  add(shot(A.at('Even the extraordinary') - L, 'town', dolly([4, 1.7, 28], [3.6, 1.7, 24], [0, 3, -40], [0, 3.2, -40], 40), {
    style: 'batavia', mood: 'haze', ashfall: 0.15,
    people: [{ style: 'merchant', at: [1, 14], rot: 180, move: [0, -1.0], pose: { walk: 1.0 } }, { style: 'lady3', at: [-2, 8], rot: 0, move: [0, 0.8], pose: { walk: 0.8 } }, { style: 'clerk', at: [3, 4], rot: 0, move: [0, 1.1], pose: { walk: 1.1 } }, { style: 'villager', at: [-4, 18], rot: 180, move: [0, -0.9], pose: { walk: 0.9 } }],
  }, { amb: 'crowd' }));
  add(shot(A.at('Merchant ships keep sailing') - L, 'strait', dolly([-6800, 300, 4200], [-6400, 280, 3800], [-3500, 0, 2000], [-3300, 0, 1600], 40, 'lin'), {
    mood: 'haze', erupt: julPlume(), island: { ash: 0.5 },
    ships: [{ id: 'm1', type: 'barque', pos: [-4200, 4200], heading: 75, speed: 4 }, { id: 'm2', type: 'steamer', pos: [-4800, 3000], heading: 80, speed: 6 }, { id: 'm3', type: 'barque', pos: [-3600, 1500], heading: 85, speed: 3.5 }],
  }, { amb: 'oceanGrey' }));
  add(shot(A.at('Colonial officials keep') - L, 'interior', dolly([2.2, 1.35, 0.3], [1.9, 1.3, 0.0], [1.0, 0.9, -1.0], [1.0, 0.9, -1.0], 36), {
    room: 'office', people: [{ style: 'clerk', at: [1.0, -1.7], rot: 0, pose: { hold: true }, prop: 'stamp' }],
  }, { amb: 'room', sfx: [['coins', 0.3], ['stampHit', 0.9], ['coins', 1.5]], fx: { dof: { focus: 1.6, range: 0.8, bokeh: 3 } } }));
  add(flat(A.at('No one evacuates') - L, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'night', center: [[105.6, -5.95], [105.65, -5.9]], scale: [[26000, 30000]], box: [100, -10, 112, 0], hi: true,
    extra: (k, lt, S3, M) => {
      drawRadius(k, M, [-6.1, 105.42], 50, ease.out(clamp((lt - 0.2) / 1.0)), { color: 'rgba(255,110,50,0.95)', fill: 'rgba(255,90,30,0.08)' });
      const [kx, ky] = placeXY(M, 'krakatoa');
      k.circle(kx, ky, 10, PAL.ember);
      for (const [n, nm, d, at] of [['anjer', 'ANJER', [1, -1], 0.6], ['merak', 'MERAK', [1, -1], 0.9], ['telokbetong', 'TELOK BETONG', [-1, -1], 1.2]]) { const [x, y] = placeXY(M, n); k.pin(x, y, nm, lt, { start: at, size: 32, dir: d, len: 60 }); }
      k.ctx.globalAlpha = ease.out(clamp((lt - 1.5) / 0.4));
      k.text('≈ 30 – 60 km', kx, ky + 70, { size: 34, weight: 900, color: '#ffb27a', shadow: { blur: 14 } });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['pop', 0.6], ['pop', 0.9], ['pop', 1.2]] }));

  // --- the deadly process beneath -----------------------------------------------------
  add(shot(A.at('Meanwhile, deep beneath') - L, 'xsection', orbit([0, -8, -4], [90, 60], [-24, -10], [20, 10], 40, 'inOut'), { magma: 1, fill: 0.85, vent: 1, erupt: { height: 30, intensity: 0.7, umbrella: 0.2 }, pressure: 0.5 }, { amb: 'rumble', mus: 'dread', sfx: [['whooshDown', 0]] }));
  add(shot(A.at('The continuous eruptions') - L, 'xsection', orbit([0, -9, 0], [40, 34], [8, 14], [8, 8], 40), { magma: 0.6, fill: [0.85, 0.35], vent: 1, erupt: { height: 30, intensity: 0.8, umbrella: 0.2 } }, { amb: 'rumble', sfx: [['drain', 0.3]], draw: pin3(XS.chamber, 'DRAINING', 0.6, { dir: [1, -1], color: '#ffb27a' }) }));
  add(shot(A.at('Without support from below') - L, 'xsection', orbit([0, -7, 0], [30, 26], [-10, -2], [8, 10], 40), { magma: 0.5, fill: 0.35, vent: 0.8, cracks: [0, 0.5], strain: 0.8 }, { amb: 'rumble', sfx: [['creak', 0.2], ['crackRock', 1.0]] }));
  add(shot(A.at('develop tiny cracks') - L, 'xsection', dolly([3, -3.5, 12], [2, -4.5, 9], [0, -6.5, 0], [0, -6.8, 0], 38), { magma: 0.5, fill: 0.35, cracks: [0.5, 0.9], strain: 1 }, { amb: 'rumble', sfx: [['crackRock', 0.2], ['crackRock', 0.9]] }));
  add(shot(A.at('Around the island, seawater') - L, 'xsection', orbit([0, -3, 0], [34, 28], [20, 8], [14, 10], 40), { magma: 0.5, fill: 0.35, cracks: 1, water: [0, 0.45], strain: 0.8 }, { amb: 'underwaterRumble', sfx: [['waterSeep', 0.2]], draw: arrow3([-16, -2, 0.5], [-7, -5.5, 0.5], 0.4, { color: '#7fd0ff' }) }));
  add(shot(A.at('seeking any opening') - L, 'xsection', dolly([4, -5, 14], [2, -7, 10], [0, -8, 0], [0, -9, 0], 38), { magma: 0.5, fill: 0.35, cracks: 1, water: [0.45, 0.75], steam: [0, 0.3] }, { amb: 'underwaterRumble', sfx: [['hiss', 0.6]], fx: { fadeOut: 0.3 } }));

  // ======================= 24 HOURS BEFORE =======================
  add(card(A.at('24 hours before') - 0.15, '24 HOURS BEFORE', 'AUGUST 26, 1883 · 1 PM'));
  const tFirst = A.at('The first explosion') - L;
  const boomAt = A.peek('explosion') - tFirst + 0.25;
  add(shot(tFirst, 'strait', dolly([-16000, 400, 12000], [-15400, 380, 11500], [0, 3000, 0], [0, 9000, 0], 40, 'lin'), {
    mood: 'haze', mood2: 'storm', moodK: [0, 0.6], erupt: augPlume({ t0: boomAt, rise: 1600, height: 27000 }), island: { ash: 0.6, lava: 0.6 },
    ring: { t0: boomAt, speed: 700, h: 6, w: 120, decay: 9000 }, shock: { t0: boomAt, speed: 1200, k: 1.4, decay: 0.8, c: [-100, 0, -600] },
  }, {
    name: 'first explosion', amb: 'eruption', mus: 'chaos', subs: false,
    sfx: [['bigBoom', boomAt - 0.05], ['rumbleLong', boomAt + 0.2]],
    fx: { flashes: [{ at: boomAt, amp: 6, decay: 3 }], flashColor: [1, 0.85, 0.7], shakes: [{ at: boomAt + 0.35, amp: 2.6, decay: 1.1, zoom: 0.08 }] },
  }));
  add(shot(A.at('Everything before this') - L, 'strait', dolly([-5200, 20, 2400], [-5000, 24, 2300], [0, 6000, -600], [0, 9000, -600], 48, 'lin'), { mood: 'storm', erupt: augPlume({ t0: -4 }), island: { ash: 0.7, lava: 0.8 }, glowLight: 0.6 }, { amb: 'eruption', fx: { shakes: [{ at: 0, amp: 1.2, decay: 1.5 }] } }));
  add(shot(A.at('Krakatoa erupts with a violence') - L, 'strait', orbit([-100, 2500, -600], [9000, 8000], [-80, -60], [3, 6], 42), { mood: 'storm', moodOv: { fog: 0.00018 }, erupt: augPlume({ t0: -8, bombs: 1.0, surge: 1, surgeT0: -2 }), island: { ash: 0.8, lava: 1 }, glowLight: 0.8 }, {
    amb: 'eruption', sfx: [['boom', 0.2], ['boom', 1.4]], fx: { shakes: [{ at: 0.2, amp: 1.5, decay: 2 }, { at: 1.4, amp: 1.2, decay: 2 }], grade: 'fire' },
  }));
  add(flat(A.at('A vast column of black ash') - L, (k, lt, S2) => INFO.altitude(k, lt, S2, { km: 27, max: 50, at: 0.2, dur: A.peek('reaching 17 miles') - A.peek('A vast column of black') + 0.3, umbrella: true }), { sfx: [['riser', 0], ['whooshBig', 0.2]] }));
  add(shot(A.at('Day turns to pitch black') - L, 'strait', dolly([-9000, 30, 9000], [-8800, 32, 8800], [0, 3000, 0], [0, 3000, 0], 44, 'lin'), {
    mood: 'haze', mood2: 'ashDark', moodK: (u) => ease.inOut(u), erupt: augPlume({ t0: -20 }), veil: { amount: [0.3, 1], dark: 0.03, alpha: 0.85 }, island: { ash: 0.8 },
  }, { amb: 'eruption', sfx: [['drone', 0]] }));
  add(flat(A.at('Within roughly 90 miles') - L, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'ash', center: [[105.6, -5.9], [105.6, -5.9]], scale: [[9000, 10500]], box: [98, -12, 113, 1], hi: true,
    extra: (k, lt, S3, M) => {
      drawRadius(k, M, [-6.1, 105.42], 150, ease.out(clamp((lt - 0.1) / 1.2)), { color: 'rgba(255,120,60,0.95)', fill: `rgba(5,4,3,${0.75 * ease.out(clamp((lt - 0.6) / 1.4))})` });
      const [kx, ky] = placeXY(M, 'krakatoa');
      k.circle(kx, ky, 10, PAL.ember);
      k.ctx.globalAlpha = ease.out(clamp((lt - 0.8) / 0.4));
      k.text('150 km · 90 miles', kx, ky - 260, { size: 50, weight: 900, color: '#fff', shadow: { blur: 16 } });
      k.text('TOTAL DARKNESS', kx, ky - 206, { size: 30, weight: 800, color: '#ffb27a', tracking: 10 });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['whoosh', 0]] }));
  add(shot(A.at('darkness swallows everything') - L, 'strait', dolly([-7000, 10, 6500], [-6900, 11, 6400], [0, 1500, 0], [0, 1600, 0], 44, 'lin'), {
    mood: 'ashDark', moodOv: { glowAz: -40 }, erupt: augPlume({ t0: -30, glow: 2.0, lightning: 0.0 }), veil: { amount: 1, dark: 0.02, alpha: 0.9 }, ashfall: 0.8, glowLight: 0.6,
  }, { amb: 'ashStorm' }));
  add(shot(A.at('Only blinding flashes') - L, 'strait', dolly([-6000, 20, 5000], [-5800, 22, 4800], [0, 4000, 0], [0, 4500, 0], 48, 'lin'), {
    mood: 'ashDark', moodOv: { glowAz: -40 }, erupt: augPlume({ t0: -30, glow: 2.0, lightning: 1.0 }), veil: { amount: 1, dark: 0.02, alpha: 0.85 }, ashfall: 0.6, glowLight: 0.6,
  }, { amb: 'ashStorm', sfx: [['thunder', 0.4], ['thunder', 1.6]] }));
  add(flat(A.at('Billions of ash particles') - L, (k, lt, S2) => charges(k, lt, S2, A.peek('generating enormous electrical') - A.peek('Billions of ash particles')), { sfx: [['crackle', 0.2], ['zap', 1.0], ['zap', 2.6], ['zap', 3.4]] }));
  add(shot(A.at('Lightning tears across') - L, 'strait', dolly([-4500, 200, 3000], [-4300, 220, 2900], [0, 7000, -600], [0, 7500, -600], 54, 'lin'), {
    mood: 'ashDark', erupt: augPlume({ t0: -40, glow: 2.2, lightning: 1.0 }), veil: { amount: 1, dark: 0.02, alpha: 0.8 }, glowLight: 0.7,
  }, { amb: 'ashStorm', sfx: [['thunderBig', 0.15], ['thunder', 1.0]], fx: { flashes: [{ at: 0.15, amp: 2.0, decay: 7 }], flashColor: [0.7, 0.75, 1.0] } }));

  // --- the Charles Bal ------------------------------------------------------------------
  const cb = { pos: [-10500, 9500], heading: 30, speed: 1.2 };
  add(shot(A.at('The British ship') - L, 'strait', dolly([-10700, 14, 9620], [-10650, 15, 9600], [-10450, 12, 9450], [-10440, 12, 9440], 40, 'lin'), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'rough', erupt: augPlume({ t0: -50 }), veil: { amount: 1, dark: 0.02, alpha: 0.8 }, glowLight: 0.8, ashfall: 0.6, shipAsh: 0.8,
    ships: [{ id: 'cb', type: 'barque', ...cb, opts: { flag: 0x1a3a8a } }],
  }, { amb: 'ashStorm', draw: stamp('CHARLES BAL', 'British barque · 26 August 1883', 0.2) }));
  add(flat(A.at('trapped just nine miles') - L, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'ash', center: [105.38, -6.05], scale: [[130000, 150000]], box: [104, -7, 107, -5], hi: true,
    extra: (k, lt, S3, M) => {
      const [kx, ky] = placeXY(M, 'krakatoa');
      k.ctx.save(); k.shadow(40, 'rgba(255,100,30,0.8)', 0, 0); k.circle(kx, ky, 26, '#ff6a2a'); k.ctx.restore();
      drawRadius(k, M, [-6.1, 105.42], 15, ease.out(clamp((lt - 0.2) / 0.8)), { color: 'rgba(255,200,120,0.9)' });
      const [sx, sy] = placeXY(M, [-5.98, 105.32]);
      k.pin(sx, sy, 'CHARLES BAL', lt, { start: 0.6, size: 32, dir: [-1, -1], len: 70 });
      k.ctx.globalAlpha = ease.out(clamp((lt - 1.0) / 0.4));
      k.text('15 km · 9 miles', kx + 40, ky + 220, { size: 48, weight: 900, color: '#fff', shadow: { blur: 14 } });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['pop', 0.6]] }));
  const deckPeople = [{ style: 'sailor', ship: 'cb', at: [4, 1.2], rot: 30, pose: { brace: true } }, { style: 'sailor2', ship: 'cb', at: [1, -1.4], rot: -40, pose: { brace: true } }, { style: 'captain', ship: 'cb', at: [-6, 0.4], rot: 80, pose: { point: true } }];
  add(shot(A.at('Red-hot pumice') - L, 'strait', onShip(cb, [-9, 5.6, 2.2], [-7, 5.4, 1.8], [6, 4.0, -0.5], [8, 4.2, -0.5], 44), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'rough', erupt: augPlume({ t0: -55 }), glowLight: 0.8, ashfall: 0.9, rockRain: 1, embers: 1, shipAsh: 0.9,
    ships: [{ id: 'cb', type: 'barque', ...cb, extraRoll: 0.05, opts: { flag: 0x1a3a8a } }], people: deckPeople,
  }, { amb: 'ashStorm', sfx: [['rocksRain', 0], ['thud', 0.6], ['thud', 1.4], ['sizzle', 0.8]], fx: { grade: 'fire', shakes: [{ at: 0.6, amp: 0.6, decay: 3 }, { at: 1.4, amp: 0.6, decay: 3 }] } }));
  add(shot(A.at('Sulfur fills the air') - L, 'strait', onShip(cb, [-2, 5.0, 3.0], [-1.6, 5.0, 2.6], [3, 4.4, 0], [3, 4.4, 0], 38), {
    mood: 'ashDark', moodOv: { glowAz: 135, horizon: [0.12, 0.1, 0.03], fog: 0.004 }, sea: 'rough', erupt: augPlume({ t0: -60 }), glowLight: 0.7, ashfall: 1, embers: 0.6, shipAsh: 1,
    ships: [{ id: 'cb', type: 'barque', ...cb, extraRoll: 0.05 }], people: deckPeople,
  }, { amb: 'ashStorm', sfx: [['cough', 0.6]], fx: { grade: 'ash', saturation: 0.7 } }));
  add(shot(A.at('Breathing becomes') - L, 'strait', onShip(cb, [2.6, 4.9, 0.0], [2.4, 4.85, 0.1], [1.0, 4.6, -1.4], [1.0, 4.6, -1.4], 34), {
    mood: 'ashDark', moodOv: { glowAz: 135, horizon: [0.12, 0.1, 0.03], fog: 0.004 }, sea: 'rough', erupt: augPlume({ t0: -60 }), glowLight: 0.7, ashfall: 1, embers: 0.5, shipAsh: 1,
    ships: [{ id: 'cb', type: 'barque', ...cb, extraRoll: 0.04 }], people: [{ style: 'sailor2', ship: 'cb', at: [1, -1.4], rot: -40, pose: { cough: true } }],
  }, { amb: 'ashStorm', sfx: [['cough', 0.2], ['cough', 1.2]], fx: { grade: 'ash', dof: { focus: 2.2, range: 1, bokeh: 3.5 } } }));
  add(shot(A.at('The captain orders') - L, 'strait', onShip(cb, [-3, 5.3, -2.2], [-3.4, 5.2, -2.0], [-6, 4.8, 0.4], [-6, 4.8, 0.4], 36), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'rough', erupt: augPlume({ t0: -65 }), glowLight: 0.7, ashfall: 0.8, shipAsh: 1,
    ships: [{ id: 'cb', type: 'barque', ...cb, extraRoll: 0.05 }], people: deckPeople,
  }, { amb: 'ashStorm', sfx: [['shout', 0.3], ['hatchSlam', A.peek('hatches sealed') - A.peek('The captain orders') + 0.3]], fx: { shakes: [{ at: A.peek('hatches sealed') - A.peek('The captain orders') + 0.3, amp: 0.8, decay: 4 }] } }));
  add(shot(A.at('Pounded by waves') - L, 'strait', dolly([-10380, 3, 9300], [-10360, 4, 9320], [-10470, 6, 9470], [-10470, 8, 9470], 40, 'lin'), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'storm', erupt: augPlume({ t0: -70 }), glowLight: 0.8, ashfall: 0.8, rockRain: 1, shipAsh: 1,
    ships: [{ id: 'cb', type: 'barque', ...cb, extraRoll: 0.08 }],
  }, { amb: 'ashStorm', sfx: [['waveCrash', 0.3], ['rocksRain', 0.1]] }));
  add(shot(A.at('the crew prepares to die') - L, 'strait', onShip(cb, [-1, 4.6, 1.6], [-0.4, 4.5, 1.2], [3.5, 4.0, 0], [3.5, 4.0, 0], 34), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'rough', erupt: augPlume({ t0: -72 }), glowLight: 0.6, ashfall: 0.7, embers: 0.4, shipAsh: 1,
    ships: [{ id: 'cb', type: 'barque', ...cb, extraRoll: 0.04 }], people: [{ style: 'sailor', ship: 'cb', at: [3.5, 0.5], rot: -100, pose: { brace: true } }, { style: 'sailor2', ship: 'cb', at: [4.2, -0.8], rot: -80, pose: { brace: true, lean: 0.4 } }],
  }, { amb: 'ashStorm', mus: 'grief', fx: { grade: 'ash', dof: { focus: 4, range: 1.5, bokeh: 3 } } }));
  add(flat(A.at('Deep explosions follow every') - L, (k, lt, S2) => INFO.timerRing(k, lt, S2, { period: 1.25 }), { sfx: [['boomLow', 0.05], ['boomLow', 1.3], ['boomLow', 2.55]] }));
  add(shot(A.at('Dozens of miles away') - L, 'coast', dolly([-30, 2.0, -6], [-28, 2.0, -9], [-40, 2, -40], [-40, 2, -40], 40), {
    layout: 'village', mood: 'ashDark', moodOv: { glowAz: 10 }, wind: [1, 3], ashfall: 0.6, quake: 1,
    people: [{ style: 'villager', at: [-36, -24], rot: 160, pose: { brace: true } }, { style: 'villager2', at: [-40, -26], rot: 200, pose: { ears: true } }],
  }, { amb: 'ashStorm', sfx: [['boomFar', 0.3], ['shockThump', A.peek('strike people') - A.peek('Dozens of miles away')], ['shockThump', A.peek('physical blows') - A.peek('Dozens of miles away')]], fx: { shakes: [{ at: A.peek('strike people') - A.peek('Dozens of miles away'), amp: 1.8, decay: 3, zoom: 0.06 }, { at: A.peek('physical blows') - A.peek('Dozens of miles away'), amp: 2.2, decay: 3, zoom: 0.08 }] } }));
  return S;
}

// Ash particles colliding and building up electrical charge
function charges(k, lt, S, aGen) {
  const ctx = k.ctx;
  k.bgDark('#14121a', '#030305');
  const r = rng(5);
  const N = 70;
  const sep = ease.inOut(clamp((lt - aGen) / 1.6));
  for (let i = 0; i < N; i++) {
    const bx = r() * W, by = r() * H, sp = 30 + r() * 60, ph = r() * 6.28;
    const pos = i % 2 ? -1 : 1;
    let x = bx + Math.sin(lt * 0.7 + ph) * sp, y = (by - lt * (20 + r() * 40) + H * 2) % H;
    y = y * (1 - sep * 0.55) + (pos > 0 ? H * 0.15 : H * 0.85) * sep * 0.55;
    const R = 10 + r() * 22;
    const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, 1, x, y, R);
    g.addColorStop(0, '#9a948c'); g.addColorStop(1, '#3a3632');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    if (sep > 0.05) {
      ctx.globalAlpha = sep;
      k.text(pos > 0 ? '+' : '−', x, y + 12, { size: 34, weight: 900, color: pos > 0 ? '#ff9a5a' : '#7fc0ff' });
      ctx.globalAlpha = 1;
    }
    // collision sparks
    const sp2 = (lt * 3 + i * 0.37) % 1;
    if (sp2 < 0.08) k.circle(x + R, y, 6, 'rgba(200,220,255,0.9)');
  }
  // inner lightning once charges separate
  if (sep > 0.6) {
    const fl = Math.sin(lt * 23) > 0.6 ? 1 : 0;
    if (fl) {
      ctx.strokeStyle = 'rgba(210,225,255,0.95)'; ctx.lineWidth = 5; ctx.shadowBlur = 30; ctx.shadowColor = '#9fc0ff';
      ctx.beginPath(); let x = W * 0.5, y = H * 0.18; ctx.moveTo(x, y);
      const rr = rng(Math.floor(lt * 4));
      while (y < H * 0.82) { x += (rr() - 0.5) * 120; y += 40 + rr() * 50; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
  }
  k.kinetic('ELECTRICAL CHARGE', W / 2, 130, lt, { size: 52, weight: 900, color: '#fff', start: aGen, stagger: 0.03, tracking: 10 });
}
