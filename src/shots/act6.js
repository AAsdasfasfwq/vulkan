// ACT VI — One hour before, THE ERUPTION, the sound (6:33 – 8:53)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { drawMap, drawRadius, drawRoute, placeXY } from '../overlay/maps.js';
import { islandHeight } from '../world/island.js';
import { XS } from '../sets/xsection.js';
import { CRATERS } from '../sets/strait.js';
import { PLACES } from '../geo/geo.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp, rng, makeNoise } from '../core/math.js';

const big = (o = {}) => ({ at: 'centre', height: 30000, intensity: 1, glow: 1.6, dark: 0.11, bombs: 1, bombSpeed: 420, lightning: 0.7, umbrella: 0.9, umbrellaR: 30000, count: 2100, wind: [0.1, 0.03], ...o });

export default function act6(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  // ======================= ONE HOUR BEFORE =======================
  add(card(A.at('One hour before') - 0.15, '1 HOUR BEFORE', 'AUGUST 27, 1883 · 9 AM'));
  const tE = A.at('Early that morning') - L;
  const exAt = A.peek('another explosion') - tE + 0.4;
  add(shot(tE, 'strait', dolly([-11000, 60, 7000], [-10800, 64, 6800], [0, 2500, -600], [0, 3200, -600], 40, 'lin'), {
    mood: 'dawn', mood2: 'blast', moodK: 0.6, erupt: big({ t0: exAt, rise: 1200, height: 22000, umbrella: 0.4 }), island: { ash: 0.8, lava: 1 }, glowLight: 0.5,
    ring: { t0: exAt, speed: 500, h: 3, w: 100 }, burst: { t0: exAt, R: 3000, speed: 1.2, heat: 1.8, c: [-100, 0, -600] },
  }, { amb: 'eruption', mus: 'chaos', sfx: [['bigBoom', exAt]], fx: { flashes: [{ at: exAt, amp: 2.5, decay: 6 }], shakes: [{ at: exAt + 0.3, amp: 1.8, decay: 1.5, zoom: 0.05 }] } }));
  add(shot(A.at('Krakatoa is already close') - L, 'strait', dolly([-3200, 500, 2600], [-3000, 520, 2300], [-100, 300, -400], [-100, 360, -400], 42, 'lin'), {
    mood: 'blast', erupt: big({ t0: -10, height: 18000, surge: 0.6, surgeT0: -3 }), island: { ash: 0.9, lava: 1.0 }, glowLight: 0.8, ashfall: 0.4,
  }, { amb: 'eruption', sfx: [['boom', 0.6], ['crackRock', 1.6]], fx: { shakes: [{ at: 0.6, amp: 1, decay: 2 }] } }));
  add(shot(A.at('Its structure can no longer') - L, 'xsection', orbit([0, -4, 0], [34, 30], [-14, -6], [10, 12], 40), { magma: 0.6, fill: 0.35, cracks: 1, strain: 1, collapse: [0, 0.18], erupt: { height: 34, intensity: 0.9 } }, { amb: 'rumble', sfx: [['crackRock', 0.2], ['rockGrind', 0.8]], fx: { shakes: [{ at: 0.2, amp: 0.8, decay: 1.5 }] } }));
  add(shot(A.at('The enormous dome') - L, 'xsection', orbit([0, -5, 0], [42, 36], [6, 16], [10, 8], 40), { magma: 0.6, fill: 0.35, cracks: 1, strain: 1, collapse: [0.18, 0.75], erupt: { height: 34, intensity: 0.8 } }, {
    amb: 'rumble', sfx: [['collapse', 0.4], ['rockGrind', 0.2]], fx: { shakes: [{ at: 0.6, amp: 1.4, decay: 1.2 }] }, draw: pin3(XS.roof, 'THE DOME CAVES IN', 0.8, { dir: [1, -1], color: '#ffb27a' }),
  }));
  add(shot(A.at('Millions of tons of seawater') - L, 'magma', dolly([18, 10, 28], [14, 8, 22], [0, 12, -10], [0, 8, -10], 46), { water: [0.2, 1], crust: 0.3, pressure: 0.5, bubbles: 0.5 }, { amb: 'lava', sfx: [['waterRush', 0], ['hissBig', 0.8]] }));
  add(shot(A.at('rush into the opening') - L, 'xsection', orbit([0, -6, 0], [30, 26], [-4, 6], [10, 10], 40), { magma: 0.6, fill: 0.35, cracks: 1, collapse: 0.75, water: [0.2, 1] }, { amb: 'underwaterRumble', sfx: [['waterRush', 0]], draw: arrow3([-14, 0, 0.5], [-4, -7, 0.5], 0.1, { color: '#7fd0ff', width: 14 }) }));
  const tT = A.at('pouring directly onto magma') - L;
  add(shot(tT, 'studio', dolly([0.9, 1.6, 4.4], [0.7, 1.55, 3.8], [0, 1.5, 0], [0, 1.6, 0], 36), { bg: 'ember', items: [{ kind: 'thermo', pos: [0, 0, 0], appear: 0, spin: 0.08, value: (u, lt) => ease.out(clamp(lt / 2.2)) * 0.98 }] }, {
    amb: 'none', sfx: [['riser', 0], ['sizzle', 0.6]], draw: counter((v) => `${Math.round(v).toLocaleString('en-US')} °C`, 20, 1000, 0.1, 2.2, { x: W * 0.7, y: H * 0.45, size: 110, label: '≈ 1,830 °F' }),
  }));
  add(flat(A.at('The physics is simple') - L, (k, lt, S2) => INFO.headline(k, lt, S2, { bg: 'ember', small: 'the physics is simple and', big: 'MERCILESS', size: 170, bigAt: A.peek('merciless') - A.peek('The physics is simple') }), { sfx: [['hit', A.peek('merciless') - A.peek('The physics is simple')]] }));
  add(shot(A.at('At that temperature') - L, 'magma', dolly([8, 4, 18], [6, 3.5, 14], [0, 4, -10], [0, 6, -10], 46), { water: 1, steam: 1, crust: 0.2, pressure: 1 }, { amb: 'lava', sfx: [['steamBurst', A.peek('flashes into steam') - A.peek('At that temperature')]], fx: { flashes: [{ at: A.peek('flashes into steam') - A.peek('At that temperature'), amp: 1.2, decay: 4 }] } }));
  const tX = A.at('expanding to thousands') - L;
  add(shot(tX, 'studio', dolly([0, 2.6, 9], [0, 3.2, 11], [0, 1.4, 0], [0, 2.0, 0], 40), {
    bg: 'navy', items: [{ kind: 'waterCube', id: 'wc', pos: [-2.2, 0.15, 1.2], appear: 0, scale: 0.3, spin: 0.3 }, { kind: 'steamCube', id: 'sc', pos: [1.4, 0.0, -1.0], appear: 0.4, scale: 1, spin: 0.08 }],
  }, {
    amb: 'none', sfx: [['steamBurst', 0.4], ['riser', 0.4]],
    draw: both(steamScale(), counter((v) => `×${Math.round(v).toLocaleString('en-US')}`, 1, 1700, 0.5, 1.8, { y: 170, size: 120, label: 'VOLUME OF STEAM' })),
  }));
  add(shot(A.at('But the steam has nowhere') - L, 'xsection', orbit([0, -7, 0], [32, 28], [12, 4], [8, 9], 40), { magma: 0.5, fill: 0.35, cracks: 1, collapse: 0.8, water: 1, steam: [0.3, 1], pressure: 1 }, { amb: 'rumble', sfx: [['hiss', 0.1], ['creak', 0.8]] }));
  add(shot(A.at('It is trapped beneath') - L, 'xsection', dolly([5, -6, 16], [3, -7.5, 12], [0, -9, 0], [0, -9.5, 0], 40), { magma: 0.5, fill: 0.35, cracks: 1, collapse: 0.8, water: 1, steam: 1, pressure: 1 }, { amb: 'rumble', sfx: [['heartbeat', 0.2]] }));
  const tP = A.at('The pressure rises beyond') - L;
  add(shot(tP, 'studio', dolly([0, 0.2, 2.2], [0, 0.18, 1.6], [0, 0, 0], [0, 0, 0], 36), { bg: 'dark', items: [{ kind: 'gauge', pos: [0, 0, 0], appear: 0, spin: 0, value: (u) => lerp(0.8, 1.08, ease.in(u)), jitter: 0.05 }] }, {
    amb: 'none', mus: 'silence', sfx: [['riserBig', 0], ['glassCrack', A.peek('grasp') - tP]], draw: (k, lt, S2) => INFO.cracks(k, lt, S2, { at: A.peek('grasp') - tP, dur: 0.35, n: 11 }),
  }));

  // ======================= THE ERUPTION =======================
  add(card(A.at('The eruption') - 0.1, 'THE ERUPTION', 'AUGUST 27, 1883 · 10:02 AM', { sfx: [['cardHitBig', 0], ['heartbeat', 0.3]] }));
  const t3 = A.at('The third and most powerful') - L;
  const bang = A.peek('strikes') - t3 + 0.3;
  const gapEnd = A.gap('great-explosion') + A.gapDur('great-explosion');
  add(shot(t3, 'strait', dolly([-26000, 70, 19000], [-25800, 72, 18850], [-100, 3500, -600], [-100, 3700, -600], 32, 'lin'), {
    mood: 'blast', erupt: big({ t0: -30, height: 16000, umbrella: 0.4, glow: 1.2 }), island: { ash: 0.9, lava: 1.2 }, glowLight: 0.4,
  }, { name: 'before the blast', amb: 'eruption', subs: true, sfx: [['riserBig', 0.0]] }));
  // the blast itself (cut exactly on "strikes")
  const tB = t3 + bang - 0.05;
  const tB2 = tB + 2.2;
  const tB3 = Math.max(tB2 + 1.6, gapEnd - 2.2);
  const blastP = (rel) => ({
    mood: 'blast', island: { ash: 1, lava: 2, destroyedAt: Math.max(0, 0.15 - rel) },
    erupt: big({ t0: -rel, rise: 2600, height: 42000, umbrella: 1, surge: 1, surgeT0: 0.3 - rel, surgeSpeed: 320, glow: 1.6, lightning: rel > 1 ? 1 : 0.3 }),
    burst: { t0: -rel, R: 7500, speed: 1.0, heat: 2.2, c: [-100, 0, -600] },
    ring: { t0: 0.05 - rel, speed: 900, h: 14, w: 220, decay: 20000 }, shock: { t0: -rel, speed: 2200, k: 2.4, decay: 0.35, c: [-100, 0, -600] }, glowLight: 1.4,
  });
  add(shot(tB, 'strait', dolly([-22000, 90, 16500], [-21300, 140, 16000], [-100, 2500, -600], [-100, 6000, -600], 42, 'lin'), blastP(0), {
    name: 'THE BLAST', amb: 'eruptionMax', mus: 'chaos', subs: false,
    sfx: [['megaBoom', 0.0], ['rumbleLong', 0.4], ['debris', 0.8]],
    fx: { flashes: [{ at: 0, amp: 3.5, decay: 5 }], flashColor: [1, 0.9, 0.75], shakes: [{ at: 0.05, amp: 2.2, decay: 1.4, zoom: 0.1, freq: 22 }], bloom: 1.0 },
  }));
  add(shot(tB2, 'strait', dolly([-11000, 7000, 24000], [-10200, 7200, 23000], [-100, 5000, -600], [-100, 9000, -600], 48, 'lin'), blastP(tB2 - tB), { name: 'blast wide', amb: 'eruptionMax', subs: false, fx: { shakes: [{ at: 0, amp: 1.0, decay: 1.2 }], bloom: 0.95 } }));
  add(shot(tB3, 'strait', dolly([-7600, 16, 9400], [-7590, 16, 9390], [-100, 4500, -600], [-100, 5200, -600], 44, 'lin'), { ...blastP(tB3 - tB), shock: { t0: -(tB3 - tB), speed: 2200, k: 2.8, decay: 0.12, c: [-100, 0, -600] } }, {
    name: 'shock arrives', amb: 'eruptionMax', subs: false, sfx: [['shockThump', 0.55], ['windBlast', 0.6], ['debris', 0.7]],
    fx: { shakes: [{ at: 0.55, amp: 3.2, decay: 1.6, zoom: 0.12 }], flashes: [{ at: 0.5, amp: 0.8, decay: 6 }] },
  }));

  // --- the numbers ----------------------------------------------------------------------
  add(flat(A.at('The energy released') - L, (k, lt, S2) => INFO.bigNumber(k, lt, S2, { bg: 'ember', to: 200, at: A.peek('200 megatons') - A.peek('The energy released'), dur: 1.0, unit: 'MEGATONS OF TNT', small: 'in a fraction of a second', note: 'estimated energy of the final explosion' }), { mus: 'awe', sfx: [['counterTicks', A.peek('200 megatons') - A.peek('The energy released')], ['hit', A.peek('megatons') - A.peek('The energy released')]] }));
  add(flat(A.at('That is 10,000 times') - L, (k, lt, S2) => INFO.dotGrid(k, lt, S2, { at: 0.3, dur: 2.6 }), { sfx: [['fillTicks', 0.3]] }));
  add(flat(A.at('Four times the power') - L, (k, lt, S2) => INFO.bars(k, lt, S2, {
    title: 'EXPLOSIVE YIELD', items: [
      { label: 'HIROSHIMA', sub: '1945', v: 0.015, valueText: '0.015 Mt', at: 0.2, c0: '#9aa4ae', c1: '#6a747e' },
      { label: 'TSAR BOMBA', sub: '1961 · most powerful weapon ever built', v: 50, valueText: '50 Mt', at: A.peek('the Tsar Bomba') - A.peek('Four times the power'), c0: '#ffd27a', c1: '#ff9a3a' },
      { label: 'KRAKATOA', sub: '1883', v: 200, valueText: '200 Mt', at: A.peek('the most powerful weapon') - A.peek('Four times the power') + 0.6 },
    ],
  }), { sfx: [['pop', 0.2], ['whoosh', A.peek('the Tsar Bomba') - A.peek('Four times the power')], ['hit', A.peek('the most powerful weapon') - A.peek('Four times the power') + 0.6]] }));
  const tC = A.at('Krakatoa ceases to exist') - L;
  add(shot(tC, 'strait', dolly([300, 26000, 1400], [300, 24000, 1300], [0, 0, 0], [0, 0, 0], 24, 'lin'), { mood: 'day', island: { destroyedAt: A.peek('ceases to exist') - tC + 0.35 }, sea: 'calm' }, {
    amb: 'wind', subs: true, sfx: [['bigBoom', A.peek('ceases to exist') - tC + 0.3]], fx: { flashes: [{ at: A.peek('ceases to exist') - tC + 0.3, amp: 3, decay: 3 }], grade: 'film' },
  }));
  add(flat(A.at('Two-thirds of the island') - L, (k, lt, S2) => twoThirds(k, lt, S2), { sfx: [['whoosh', 0], ['dissolve', 0.6]] }));
  add(shot(A.at('millions of tons of solid rock') - L, 'strait', dolly([-6000, 1500, 5200], [-5200, 1400, 4400], [-100, 500, -600], [-100, 900, -600], 44, 'lin'), {
    mood: 'blast', erupt: big({ t0: -20, height: 40000, surge: 0.6, surgeT0: -15 }), island: { destroyed: 1 }, glowLight: 1.0, surfSteam: { at: [-100, 0, -600], amount: 1, h: 900, spread: 2500, size: 500 },
  }, { amb: 'eruptionMax' }));
  add(shot(A.at('becoming searing gas') - L, 'strait', dolly([-3200, 900, 2800], [-2800, 1100, 2400], [-100, 2500, -600], [-100, 4000, -600], 52, 'lin'), {
    mood: 'blast', erupt: big({ t0: -25, height: 40000, bombs: 1, bombSpeed: 700 }), island: { destroyed: 1 }, glowLight: 1.0, embers: 0.5,
  }, { amb: 'eruptionMax', sfx: [['debris', 0], ['whooshBig', 1.2]], fx: { grade: 'fire' } }));
  add(flat(A.at('hurled as high as 50 miles') - L, (k, lt, S2) => INFO.altitude(k, lt, S2, { km: 80, max: 100, at: 0.1, dur: 1.8, umbrella: true, refs: false }), { sfx: [['riser', 0], ['whooshBig', 0.1]], draw2: null }));

  // --- SOUND -------------------------------------------------------------------------------
  const tS = A.at('But in that instant') - L;
  add(flat(tS, (k, lt, S2) => soundWord(k, lt, S2, A.peek('sound. Krakatoa') - tS), { mus: 'silence', sfx: [['silenceRing', 0.1], ['hit', A.peek('sound. Krakatoa') - tS]] }));
  add(flat(A.at('Krakatoa produces the loudest') - L, (k, lt, S2) => INFO.decibels(k, lt, S2, { at: 0.2 }), { mus: 'awe', sfx: [['blipUp', 0.2], ['blipUp', 0.52], ['blipUp', 0.84], ['blipUp', 1.16], ['blipUp', 1.48], ['blipUp', 1.8], ['hit', 2.12]] }));
  add(shot(A.at('At this intensity') - L, 'strait', dolly([-9000, 30, 7000], [-8900, 30, 6900], [-100, 400, -600], [-100, 400, -600], 40, 'lin'), {
    mood: 'blast', erupt: big({ t0: -40, height: 40000 }), island: { destroyed: 1 }, glowLight: 0.8,
    shock: { t0: -6.5, speed: 1300, k: 2.6, decay: 0.12, c: [-100, 0, -600] }, ring: { t0: -6.5, speed: 1300, h: 6, w: 150, decay: 40000 },
  }, { amb: 'eruptionMax', sfx: [['shockThump', 1.2], ['windBlast', 1.25]], fx: { shakes: [{ at: 1.2, amp: 3.2, decay: 1.6, zoom: 0.12 }] } }));
  add(flat(A.at('On ships within roughly 37') - L, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'ash', center: [105.5, -6.0], scale: [[42000, 46000]], box: [103, -8, 108, -4], hi: true,
    extra: (k, lt, S3, M) => {
      const [kx, ky] = placeXY(M, 'krakatoa');
      drawRadius(k, M, [-6.1, 105.42], 60, ease.out(clamp((lt - 0.2) / 1.0)), { color: 'rgba(255,90,60,0.95)', fill: 'rgba(255,60,30,0.12)' });
      const r = rng(4);
      for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 0.12 + r() * 0.38; const [x, y] = M.P([-6.1 + Math.sin(a) * d, 105.42 + Math.cos(a) * d]); k.circle(x, y, 7, '#fff'); }
      k.ctx.globalAlpha = ease.out(clamp((lt - 0.9) / 0.4));
      k.text('60 km · 37 miles', kx, ky - 330, { size: 50, weight: 900, color: '#fff', shadow: { blur: 16 } });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['whoosh', 0]] }));
  const ear = { pos: [-38000, 30000], heading: 40, speed: 0.5 };
  add(shot(A.at("sailors' eardrums") - L, 'strait', onShip(ear, [-1.0, 4.9, 1.8], [-0.7, 4.85, 1.5], [2, 4.6, 0], [2, 4.6, 0], 34), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'rough', ships: [{ id: 'ear', type: 'barque', ...ear }], ashfall: 0.5, shipAsh: 0.6,
    people: [{ style: 'sailor', ship: 'ear', at: [2, 0.2], rot: -100, pose: { ears: true } }, { style: 'sailor2', ship: 'ear', at: [3.4, -1.2], rot: -70, pose: { ears: true } }],
  }, { amb: 'tinnitus', sfx: [['earRing', 0]], fx: { zoomBlur: 0.03, desat: 0.4, dof: { focus: 3, range: 1.4, bokeh: 3.5 } } }));
  add(shot(A.at('Many bleed') - L, 'strait', onShip(ear, [0.6, 4.75, 0.6], [0.8, 4.7, 0.5], [2, 4.6, 0.1], [2, 4.6, 0.1], 28), {
    mood: 'ashDark', moodOv: { glowAz: 135 }, sea: 'rough', ships: [{ id: 'ear', type: 'barque', ...ear }], ashfall: 0.5, shipAsh: 0.6,
    people: [{ style: 'sailor', ship: 'ear', at: [2, 0.2], rot: -100, pose: { ears: true } }],
  }, { amb: 'tinnitus', fx: { desat: 0.6, vignette: 0.75, grade: 'fire', dof: { focus: 1.4, range: 0.6, bokeh: 4 } } }));
  const tSw = A.at('The shock wave races') - L;
  add(shot(tSw, 'strait', dolly([-60000, 9000, 40000], [-56000, 9000, 37000], [-100, 0, -600], [-100, 0, -600], 40, 'lin'), {
    mood: 'blast', erupt: big({ t0: -50, height: 40000 }), island: { destroyed: 1 },
    shock: { t0: -1, speed: 1800, k: 2.5, decay: 0.12, c: [-100, 0, -600] }, ring: { t0: -1, speed: 1800, h: 30, w: 400, decay: 60000 },
  }, { amb: 'eruptionMax', sfx: [['whooshBig', 0.3]], draw: word('FASTER THAN SOUND', A.peek('faster than the speed') - tSw, { y: H * 0.18, size: 84, tracking: 10 }) }));
  // --- Batavia ------------------------------------------------------------------------------
  const runners = [
    { style: 'villager', at: [-3, -8], rot: 0, move: [0, 4.2], pose: { walk: 3.5 } }, { style: 'merchant', at: [2, -14], rot: 0, move: [0, 4.0], pose: { walk: 3.2 } },
    { style: 'lady', at: [0.5, -4], rot: 0, move: [0, 2.6], pose: { walk: 2.4 } }, { style: 'clerk', at: [-1, -18], rot: 0, move: [0, 4.4], pose: { walk: 3.5 } },
    { style: 'villager2', at: [4, -10], rot: 10, move: [-0.4, 3.8], pose: { walk: 3.2 } }, { style: 'officer', at: [-4.5, -2], rot: -15, move: [0.5, 3], pose: { walk: 3.0 } },
  ];
  add(shot(A.at('In Batavia, a hundred') - L, 'town', dolly([0, 12, 60], [0, 10, 52], [0, 2, -20], [0, 2, -20], 40), { style: 'batavia', mood: 'haze', moodOv: { fog: 0.0012 }, people: runners }, { amb: 'crowdPanic', sfx: [['boomFar', 0.0]], draw: stamp('BATAVIA', '160 km from Krakatoa · 10:02 AM', 0.2) }));
  add(shot(A.at('the blast is so deafening') - L, 'town', dolly([3, 1.6, 14], [2.8, 1.6, 13.4], [0, 2, -5], [0, 2, -5], 38), { style: 'batavia', mood: 'haze', moodOv: { fog: 0.0012 }, people: runners.map((r) => ({ ...r, pose: { ears: true }, move: [0, 0] })) }, {
    amb: 'crowdPanic', sfx: [['shockThump', 0.15], ['windowsRattle', 0.2]], fx: { shakes: [{ at: 0.15, amp: 2.5, decay: 2.2, zoom: 0.08 }] },
  }));
  add(shot(A.at('people rush into the streets') - L, 'town', dolly([-1.5, 1.2, 4], [-1.5, 1.3, 7], [0, 1.6, -10], [0, 1.6, -10], 42, 'lin'), { style: 'batavia', mood: 'haze', moodOv: { fog: 0.0012 }, people: runners }, { amb: 'crowdPanic', sfx: [['footsteps', 0]] }));
  add(shot(A.at('convinced artillery shells') - L, 'town', dolly([6, 1.3, 8], [5.6, 1.35, 7.2], [0, 6, -40], [0, 8, -40], 34), {
    style: 'batavia', mood: 'haze', moodOv: { fog: 0.0012 },
    people: [{ style: 'officer', at: [2, 2], rot: 180, pose: { lookUp: -0.5, point: true } }, { style: 'merchant', at: [3.5, 3.5], rot: 200, pose: { lookUp: -0.4 } }, { style: 'lady2', at: [0.5, 4], rot: 170, pose: { lookUp: -0.3 } }],
  }, { amb: 'crowdPanic', sfx: [['boomFar', 0.3], ['boomFar', 1.1]] }));
  // --- the sound travels -------------------------------------------------------------------
  const tR = A.at('Four hours later') - L;
  add(flat(tR, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'night', center: [[95, -10], [85, -12]], scale: [[900, 820]], box: [20, -45, 140, 30],
    extra: (k, lt, S3, M) => {
      const p = ease.inOut(clamp((lt - 0.3) / 2.2));
      drawRoute(k, M, PLACES.krakatoa, PLACES.rodrigues, p, { color: '#ff8a3a', width: 4 });
      const [kx, ky] = placeXY(M, 'krakatoa'), [rx, ry] = placeXY(M, 'rodrigues');
      k.circle(kx, ky, 10, PAL.ember);
      k.pin(rx, ry, 'RODRIGUES ISLAND', lt, { start: A.peek('Rodriguez') - tR, size: 32, dir: [-1, 1], len: 60 });
      k.ctx.globalAlpha = ease.out(clamp((lt - 1.4) / 0.4));
      k.text('4,800 km · 3,000 miles', (kx + rx) / 2, (ky + ry) / 2 - 40, { size: 44, weight: 900, color: '#fff', shadow: { blur: 16 } });
      k.text('+4 HOURS', (kx + rx) / 2, (ky + ry) / 2 + 20, { size: 36, weight: 900, color: '#ffb27a', tracking: 8 });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['whoosh', 0], ['pop', A.peek('Rodriguez') - tR]] }));
  const tM = A.at('If the volcano had erupted') - L;
  add(flat(tM, (k, lt, S2) => drawMap(k, lt, S2, {
    theme: 'night', center: [[20, 50], [16, 48]], scale: [[1500, 1400]], box: [-20, 30, 60, 70],
    extra: (k, lt, S3, M) => {
      const [mx, my] = placeXY(M, 'moscow'), [lx, ly] = placeXY(M, 'lisbon');
      const aM = A.peek('Moscow') - tM, aL = A.peek('Lisbon') - tM;
      k.pin(mx, my, 'MOSCOW', lt, { start: aM, size: 34, dir: [1, -1] });
      if (lt > aM) { const rr = (lt - aM) * 420; k.circle(mx, my, rr, null, { color: `rgba(255,140,60,${Math.max(0, 1 - rr / 1600)})`, width: 4 }); k.circle(mx, my, rr * 0.8, null, { color: `rgba(255,140,60,${Math.max(0, 0.6 - rr / 2000)})`, width: 2 }); }
      drawRoute(k, M, PLACES.moscow, PLACES.lisbon, ease.inOut(clamp((lt - aM) / Math.max(aL - aM, 0.5))), { color: '#ff8a3a', width: 4, dash: [14, 10] });
      k.pin(lx, ly, 'LISBON', lt, { start: aL, size: 34, dir: [-1, 1] });
      k.ctx.globalAlpha = ease.out(clamp((lt - aL - 0.2) / 0.4));
      k.text('≈ 3,900 km', (mx + lx) / 2, (my + ly) / 2 - 50, { size: 44, weight: 900, color: '#fff', shadow: { blur: 16 } });
      k.ctx.globalAlpha = 1;
    },
  }), { sfx: [['pop', A.peek('Moscow') - tM], ['boomFar', A.peek('Moscow') - tM], ['pop', A.peek('Lisbon') - tM]] }));
  const tG = A.at('The pressure wave will circle') - L;
  add(shot(tG, 'globe', orbit([0, 0, 0], [31, 29], [-20, 20], [12, 8], 40), { ll: [[-6, 105], [10, 60]], cloud: 0.45, ringA: 1, ringK: (u, lt) => lt * 2.2, rings: 7 }, {
    amb: 'space', sfx: [['pulseWave', 0.2], ['pulseWave', 1.6], ['pulseWave', 3.0]], draw: counter((v) => `${Math.min(7, Math.max(1, Math.ceil(v)))}×`, 0, 7, 0.2, 3.4, { x: W - 240, y: 220, size: 120, label: 'AROUND THE GLOBE', ease: 'lin' }),
  }));
  add(flat(A.at('Instruments in London') - L, (k, lt, S2) => INFO.barograph(k, lt, S2, { dur: 3.4 }), { sfx: [['penScratch', 0.2]] }));
  add(shot(A.at("Earth's atmosphere is ringing") - L, 'globe', dolly([0, 4, 40], [0, 2, 34], [0, 0, 0], [0, 0, 0], 40), { ll: [[-6, 105], [-6, 95]], cloud: 0.45, ringA: 0.9, ringK: (u, lt) => 3.6 + lt * 2.0, rings: 7, sunGlare: 1.2, sunAz: 60 }, {
    amb: 'space', sfx: [['bell', 0.3]], fx: { fadeOut: 0.4 },
  }));
  return S;
}

function steamScale() {
  return (k, lt, S) => {
    const st = S.film.getSet('studio');
    const sc = st.items.get('sc');
    if (sc) { const v = lerp(0.2, 4.2, ease.out(clamp((lt - 0.4) / 1.6))); sc.scale.setScalar(v); sc.position.y = v / 2 - 0.0; }
  };
}

function twoThirds(k, lt, S) {
  const ctx = k.ctx;
  k.bgPaper();
  const nz = makeNoise(9);
  const cx = W / 2 - 60, cy = H / 2 + 20, R = 330;
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = R * (1 + nz.n2(Math.cos(a) * 1.5, Math.sin(a) * 1.5) * 0.18);
    pts.push([cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r]);
  }
  const cut = cy + R * 0.32;
  const p = ease.inOut(clamp((lt - 0.5) / 1.4));
  ctx.save();
  // remaining third
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#5a7a4a'; ctx.fillRect(0, cut, W, H);
  ctx.fillStyle = `rgba(226,70,42,${1 - p})`; ctx.fillRect(0, 0, W, cut);
  ctx.restore();
  // outline of the lost part
  ctx.setLineDash([12, 10]); ctx.lineWidth = 4; ctx.strokeStyle = PAL.red;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
  // particles blowing away
  const r = rng(2);
  for (let i = 0; i < 120 * p; i++) { const x = cx + (r() - 0.5) * 360 + p * r() * 600, y = cy - R + r() * (R * 1.3) - p * r() * 200; k.circle(x, y, 3 + r() * 6, `rgba(226,70,42,${(1 - p) * 0.8})`); }
  k.text('2/3', W * 0.72, H / 2 - 20, { size: 220, weight: 900, color: PAL.red });
  k.text('OF THE ISLAND', W * 0.72, H / 2 + 50, { size: 40, weight: 900, color: PAL.ink, tracking: 6 });
  k.text('vaporized', W * 0.72, H / 2 + 100, { size: 38, weight: 400, family: 'serif', italic: true, color: PAL.ink2 });
  ctx.globalAlpha = 0.85;
  k.text('RAKATA', cx, cut + 140, { size: 30, weight: 900, color: '#fff', tracking: 6 });
  ctx.globalAlpha = 1;
}

function soundWord(k, lt, S, aSound) {
  const ctx = k.ctx;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // faint waveform
  const a = ease.out(clamp((lt - aSound) / 0.25));
  ctx.strokeStyle = `rgba(255,120,60,${0.25 + 0.6 * a})`; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) {
    const env = Math.exp(-Math.pow((x - W / 2) / 420, 2));
    const y = H / 2 + Math.sin(x * 0.09 + lt * 20) * 180 * env * a * (0.6 + 0.4 * Math.sin(x * 0.013));
    x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1 - a;
  k.text('the most destructive force is…', W / 2, H / 2 + 20, { size: 44, weight: 400, family: 'serif', italic: true, color: '#d8d0c8' });
  ctx.globalAlpha = a;
  ctx.save(); ctx.translate(W / 2, H / 2 + 70); const sc = 1 + 0.15 * (1 - a); ctx.scale(sc, sc);
  k.text('SOUND', 0, 0, { size: 230, weight: 900, color: '#fff', tracking: 20, glow: 40, glowColor: 'rgba(255,120,60,0.6)' });
  ctx.restore();
  ctx.globalAlpha = 1;
}
