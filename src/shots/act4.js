// ACT IV — Three months before: May 1883 (3:25 – 4:25)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { islandHeight } from '../world/island.js';
import { XS } from '../sets/xsection.js';
import { CRATERS } from '../sets/strait.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp } from '../core/math.js';

const mayPlume = (o = {}) => ({ at: 'perboewatan', height: 11000, intensity: 0.85, glow: 0.35, dark: 0.2, bombs: 0.15, count: 1300, wind: [0.22, 0.05], ...o });

export default function act4(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);
  const tCard = A.at('Three months before') - 0.15;
  add(card(tCard, '3 MONTHS BEFORE', 'MAY 20, 1883', { card: { subAt: A.peek('May 20th') - tCard } }));
  const tC = A.at('The illusion of safety') - L;
  add(shot(tC, 'strait', dolly([-5200, 30, 5000], [-5000, 32, 4800], [0, 300, 0], [0, 300, 0], 32, 'lin'), { mood: 'golden', sea: 'calm' }, {
    amb: 'oceanCalm', mus: 'unease', sfx: [['glassCrack', A.peek('crack') - tC]], draw: (k, lt, S2) => INFO.cracks(k, lt, S2, { at: A.peek('crack') - tC, dur: 0.6, cx: W * 0.55, cy: H * 0.45 }),
  }));
  const war = { pos: [-6200, -6800], heading: 70, speed: 5 };
  add(shot(A.at('Passing through the Sunda Strait') - L, 'strait', dolly([-6600, 40, -6400], [-6450, 36, -6650], [-6100, 8, -7000], [-5900, 10, -7300], 40, 'lin'), { mood: 'day', erupt: mayPlume(), ships: [{ id: 'eli', type: 'warship', ...war }] }, { amb: 'ocean', sfx: [['shipHorn', 0.6], ['whoosh', 0]] }));
  add(shot(A.at('the captain of the German') - L, 'strait', onShip(war, [12.0, 5.7, -2.6], [12.5, 5.55, -2.0], [14.6, 5.6, 8], [14.8, 5.7, 8], 38), {
    mood: 'day', erupt: mayPlume(), ships: [{ id: 'eli', type: 'warship', ...war }],
    people: [{ style: 'captain', ship: 'eli', at: [13.4, 1.4], rot: 8, pose: { telescope: true }, prop: 'telescope' }, { style: 'officer', ship: 'eli', at: [11.0, 2.6], rot: -25 }],
  }, { amb: 'ocean', fx: { dof: { focus: 4, range: 2.5, bokeh: 2.5 } }, draw: stamp('SMS ELISABETH', 'German Imperial Navy · 20 May 1883', 0.25) }));
  add(shot(A.at('spots a column of smoke') - L, 'strait', dolly([-5900, 6, -6600], [-5900, 6, -6600], [250, 4000, -2500], [250, 5200, -2500], 9, 'lin'), { mood: 'day', erupt: mayPlume() }, { amb: 'ocean', sfx: [['scope', 0]], draw: (k, lt, S2) => INFO.scope(k, lt, S2, { r: 470 }) }));
  add(flat(A.at('ash rising nearly seven miles') - L, (k, lt, S2) => INFO.altitude(k, lt, S2, { km: 11, max: 30, at: 0.1, dur: 2.0 }), { sfx: [['riser', 0], ['whoosh', 0]] }));
  add(shot(A.at('The volcano has awakened') - L, 'strait', dolly([-2200, 30, -6000], [-1900, 40, -5500], [250, 2500, -2500], [250, 3000, -2500], 46, 'lin'), { mood: 'day', erupt: mayPlume({ intensity: 1, bombs: 0.4, lightning: 0.15 }), island: { ash: 0.25 } }, { amb: 'eruption', mus: 'tension', sfx: [['boom', 0.3]], fx: { shakes: [{ at: 0.3, amp: 0.8, decay: 2 }] } }));
  add(shot(A.at('Deep explosions rumble') - L, 'strait', dolly([-12000, 20, -9000], [-11800, 22, -8800], [250, 2000, -2500], [250, 2100, -2500], 24, 'lin'), { mood: 'dusk', erupt: mayPlume({ glow: 1.0, bombs: 0.6, lightning: 0.4 }), glowLight: 0.4 }, {
    amb: 'eruption', sfx: [['boomFar', 0.3], ['boomFar', 1.4], ['boomFar', 2.3]], fx: { flashes: [{ at: 0.3, amp: 0.6 }, { at: 1.4, amp: 0.5 }], flashColor: [1, 0.5, 0.2] },
  }));
  add(shot(A.at('In Batavia, people') - L, 'town', dolly([3, 1.7, 30], [2.6, 1.7, 27], [0, 3, -40], [0, 3.5, -40], 40), {
    style: 'batavia', mood: 'haze', moodOv: { fog: 0.002 },
    people: [{ style: 'merchant', at: [1, 15], rot: 180, pose: { point: true } }, { style: 'lady3', at: [2, 16], rot: 190 }, { style: 'officer', at: [-2, 14], rot: 170, pose: { lookUp: -0.2 } }, { style: 'villager', at: [-4, 18], rot: 160 }, { style: 'lady2', at: [4, 12], rot: 200 }],
  }, { amb: 'crowd', draw: stamp('BATAVIA', 'May 1883', 0.2) }));
  const tSh = A.at('as a spectacular show') - L;
  add(shot(tSh, 'coast', dolly([172, 3.2, 52], [176, 3.4, 66], [-6000, 2600, 42000], [-6400, 3000, 42000], 40), {
    layout: 'anjer', mood: 'golden', volcano: true, erupt: { height: 18000, intensity: 0.9, glow: 0.4, umbrella: 0.2 },
    people: [{ style: 'gentleman', at: [181, 90], y: 1.5, rot: 10 }, { style: 'lady', at: [179, 92], y: 1.5, rot: 5 }, { style: 'lady2', at: [182, 95], y: 1.5, rot: -5 }, { style: 'merchant', at: [178.5, 86], y: 1.5, rot: 0, pose: { point: true } }],
  }, { amb: 'beach', subsOff: A.peek('spectacular') - tSh - 0.3, draw: word('A SPECTACULAR SHOW', A.peek('spectacular') - tSh, { y: H * 0.2, size: 80, tracking: 10 }) }));
  add(flat(A.at('Local entrepreneurs organize') - L, (k, lt, S2) => INFO.poster(k, lt, S2, {}), { sfx: [['paper', 0], ['stampHit', 0.6]] }));
  const exc = { pos: [-4600, -6200], heading: 55, speed: 4 };
  add(shot(A.at('sightseeing trips') - L, 'strait', dolly([-4800, 18, -5800], [-4650, 20, -5900], [-4400, 6, -6400], [-4300, 8, -6600], 40, 'lin'), { mood: 'day', erupt: mayPlume({ intensity: 0.75 }), ships: [{ id: 'exc', type: 'excursion', ...exc }] }, { amb: 'ocean', sfx: [['paddle', 0], ['shipHorn', 1.0]] }));
  const party = [
    { style: 'lady', ship: 'exc', at: [3, 2.2], rot: 120, prop: 'champagne', pose: { hold: true } }, { style: 'gentleman', ship: 'exc', at: [3.8, 1.0], rot: 90 },
    { style: 'lady2', ship: 'exc', at: [1.5, -1.6], rot: 60 }, { style: 'gentleman', ship: 'exc', at: [0.8, -0.4], rot: 80, prop: 'champagne', pose: { drink: 0.3 } },
    { style: 'lady3', ship: 'exc', at: [5.4, -1.2], rot: 100 }, { style: 'officer', ship: 'exc', at: [-0.5, 2.4], rot: 95 }, { style: 'merchant', ship: 'exc', at: [6.5, 1.6], rot: 110, pose: { point: true } },
  ];
  // the same guests turned to starboard, watching the eruption
  const watchers = [
    { style: 'lady', ship: 'exc', at: [3, 2.2], rot: 12, prop: 'champagne', pose: { hold: true } }, { style: 'gentleman', ship: 'exc', at: [3.9, 1.3], rot: -8, pose: { lookUp: -0.15 } },
    { style: 'lady2', ship: 'exc', at: [1.6, 1.2], rot: 20 }, { style: 'gentleman', ship: 'exc', at: [0.9, 2.6], rot: 5, prop: 'champagne', pose: { drink: 0.3 } },
    { style: 'lady3', ship: 'exc', at: [5.2, 2.8], rot: -15 }, { style: 'officer', ship: 'exc', at: [-0.6, 3.0], rot: 10 }, { style: 'merchant', ship: 'exc', at: [6.6, 2.0], rot: -20, pose: { point: true } },
  ];
  const tW = A.at('Women in hoop skirts') - L;
  add(shot(tW, 'strait', onShip(exc, [-5.5, 5.3, 1.4], [-4.6, 5.2, 1.0], [3, 5.0, 0.4], [3.5, 5.0, 0.4], 40), { mood: 'day', erupt: mayPlume({ intensity: 0.75 }), ships: [{ id: 'exc', type: 'excursion', ...exc }], people: party }, {
    amb: 'deckParty', fx: { dof: { focus: 7, range: 3, bokeh: 2.5 } }, sfx: [['laughter', 0.4]],
  }));
  add(shot(A.at('champagne on deck') - L, 'strait', onShip(exc, [2.0, 5.3, 0.55], [2.1, 5.25, 0.8], [3.0, 4.9, 2.15], [3.0, 4.95, 2.15], 32), { mood: 'day', erupt: mayPlume({ intensity: 0.75 }), ships: [{ id: 'exc', type: 'excursion', ...exc }], people: party }, {
    amb: 'deckParty', sfx: [['glassClink', 0.4], ['cork', 0.1]], fx: { dof: { focus: 1.75, range: 0.7, bokeh: 4 } },
  }));
  add(shot(A.at('watching the volcano hurl') - L, 'strait', onShip(exc, [5.6, 5.6, -2.6], [5.0, 5.55, -2.2], [250, 1800, -2500], [250, 2600, -2500], 40, { lookWorld: true }), {
    mood: 'day', erupt: mayPlume({ intensity: 0.95, bombs: 0.8, bombSpeed: 300 }), ships: [{ id: 'exc', type: 'excursion', ...exc }], people: watchers, island: { ash: 0.3 },
  }, { amb: 'eruption', sfx: [['boomFar', 0.5], ['crowdGasp', 0.7]] }));
  add(shot(A.at('They have no idea') - L, 'strait', onShip(exc, [6.0, 5.05, -1.9], [5.6, 5.0, -1.6], [250, 1300, -2500], [250, 1300, -2500], 30, { lookWorld: true }), { mood: 'day', mood2: 'dusk', moodK: [0.2, 0.5], erupt: mayPlume(), ships: [{ id: 'exc', type: 'excursion', ...exc }], people: watchers }, { amb: 'eruption', mus: 'dread', sfx: [['drone', 0]], fx: { dof: { focus: 4.5, range: 3, bokeh: 2 } } }));
  const cr = CRATERS.perboewatan;
  add(shot(A.at('staring down the barrel') - L, 'strait', dolly([cr[0] + 30, 2200, cr[2] + 40], [cr[0] + 5, 420, cr[2] + 8], [cr[0], 0, cr[2]], [cr[0], 0, cr[2]], 40, 'in'), { mood: 'golden', steam: { at: 'perboewatan', amount: 0.22, h: 400, col: [0.4, 0.37, 0.35] }, island: { lava: 0.75, ash: 0.5 }, glowLight: 0.2, exposure: 0.8 }, { amb: 'eruption', fx: { vignette: 0.75 }, sfx: [['whooshDown', 0.1], ['gunCock', A.peek('loaded shotgun') - A.peek('staring down the barrel')]] }));
  add(shot(A.at('And the trigger') - L, 'xsection', orbit([0, -3, 0], [28, 22], [-6, 6], [6, 10], 40), { magma: 1, fill: 1, pressure: 1, vent: [0.3, 0.9], plug: 0.6, cracks: 0.2 }, { amb: 'rumble', sfx: [['thudLow', 0.3], ['boomLow', 0.6]], fx: { shakes: [{ at: 0.6, amp: 1, decay: 2 }] } }));
  add(shot(A.at('Then the activity subsides') - L, 'strait', dolly([-7000, 200, -5000], [-6800, 200, -4700], [250, 1500, -2500], [250, 1200, -2500], 36, 'lin'), { mood: 'golden', erupt: mayPlume({ intensity: [0.9, 0.15], bombs: 0 }), island: { ash: 0.3 } }, { amb: 'rumbleSoft', mus: 'calm' }));
  add(shot(A.at('Krakatoa seems to pause') - L, 'strait', dolly([-5200, 12, -1200], [-5000, 12, -1000], [0, 250, -1000], [0, 250, -1000], 30, 'lin'), { mood: 'dusk', sea: 'calm', steam: { at: 'perboewatan', amount: 0.4, h: 400 }, island: { ash: 0.3 }, ships: [{ id: 'exc', type: 'excursion', pos: [-3200, -1800], heading: 200, speed: 4 }] }, { amb: 'oceanCalm' }));
  add(shot(A.at('lulling everyone') - L, 'town', dolly([2, 1.7, 24], [1.7, 1.7, 21], [0, 2.6, -30], [0, 2.6, -30], 40), {
    style: 'batavia', mood: 'dusk', lampI: 30,
    people: [{ style: 'lady', at: [1, 10], rot: 180, move: [0, -0.7], pose: { walk: 0.7 } }, { style: 'gentleman', at: [1.6, 10.3], rot: 180, move: [0, -0.7], pose: { walk: 0.7 } }, { style: 'officer', at: [-3, 4], rot: 20, move: [0, 0.8], pose: { walk: 0.8 } }],
  }, { amb: 'eveningTown', sfx: [['churchBell', 0.4]] }));
  add(shot(A.at("But it isn't over") - L, 'strait', dolly([-5200, 40, -1600], [-4400, 40, -1700], [250, 100, -2500], [250, 100, -2500], 32, 'in'), { mood: 'night', island: { lava: 0.35 }, glowLight: 0.3, steam: { at: 'perboewatan', amount: 0.6, h: 500, col: [0.3, 0.2, 0.18], glow: 0.6 } }, { amb: 'night', mus: 'dread', sfx: [['rumbleDeep', 0.2], ['heartbeat', 0.4]] }));
  add(shot(A.at('Inside the crater') - L, 'xsection', orbit([0, -2, 0], [32, 24], [12, -4], [10, 12], 40), { magma: 1, fill: 0.95, pressure: 0.8, plug: [1, 0.4], cracks: [0, 0.6], vent: 0.6 }, { amb: 'rumble', sfx: [['crackRock', 0.5], ['rockGrind', 1.0]], fx: { fadeOut: 0.2 } }));
  return S;
}
