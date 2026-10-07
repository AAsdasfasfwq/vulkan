// ACT III — One year before (2:38 – 3:25)
import { LEAD, K, card, dolly, orbit, onShip, shot, flat, both } from './helpers.js';
import { gpin, pin3, word, tag, stamp, arrow3, counter, INFO } from './ov.js';
import { islandHeight } from '../world/island.js';
import { XS } from '../sets/xsection.js';
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease, lerp, noise1 } from '../core/math.js';

const elite = (pose = {}) => [
  { style: 'officer', at: [-0.95, 1.05], rot: 62, pose: { drink: pose.drink ?? 0.15, ...pose }, prop: 'glass' },
  { style: 'merchant', at: [0.95, 1.2], rot: -64, pose: { look: -0.2, ...pose } },
  { style: 'lady', at: [0.2, 2.55], rot: 180, pose: { ...pose } },
  { style: 'gentleman', at: [-2.4, 2.2], rot: 120, pose: { hold: true, ...pose }, prop: 'glass' },
];

export default function act3(A) {
  const L = LEAD;
  const S = [];
  const add = (s) => (S.push(s), s);

  add(card(A.at('One year before') - 0.15, '1 YEAR BEFORE', 'THE ERUPTION · 1882'));
  add(shot(A.at('The telegraph network now spans') - L, 'globe', orbit([0, 0, 0], [32, 28], [-15, 15], [10, 6], 40), {
    ll: [[35, -10], [15, 70]], cables: 1, cableK: 1.6, cloud: 0.35, dots: ['london', 'newyork', 'lisbon', 'bombay', 'singapore', 'batavia', 'suez', 'aden', 'darwin', 'hongkong'],
  }, { amb: 'space', mus: 'calm', sfx: [['dataBlips', 0.1], ['morse', 0.4]] }));
  const tN = A.at('News from London') - L;
  add(shot(tN, 'globe', dolly([0, 6, 34], [0, 3, 30], [0, 0, 0], [0, 0, 0], 40, 'inOut'), {
    ll: [[38, 20], [10, 75]], cables: 1, cableK: 0.7, cloud: 0.35, dots: ['london', 'batavia'],
    arcs: [{ id: 'news', from: 'london', to: 'batavia', start: 0.3, dur: A.peek('Batavia') - tN, col: [1, 0.45, 0.15], lift: 0.08 }],
  }, { amb: 'space', sfx: [['morse', 0.2], ['pop', A.peek('Batavia') - tN]], draw: both(gpin('london', 'LONDON', 0.1, { dir: [-1, -1] }), gpin('batavia', 'BATAVIA', A.peek('Batavia') - tN, { dir: [1, 1] })) }));
  add(shot(A.at('present-day Jakarta') - L, 'interior', dolly([1.4, 1.2, -0.2], [1.2, 1.15, -0.4], [0.7, 0.86, -1.0], [0.72, 0.86, -1.0], 34), { room: 'telegraph', clockSpeed: 0.2 }, {
    amb: 'room', sfx: [['morse', 0.0]], fx: { dof: { focus: 0.8, range: 0.4, bokeh: 4 } }, draw: stamp('BATAVIA', 'present-day Jakarta', 0.15),
  }));
  add(flat(A.at('in a matter of hours') - L, (k, lt, S) => hoursVsWeeks(k, lt, S), { sfx: [['whoosh', 0], ['strike', 0.8], ['pop', 1.1]] }));

  // --- colonial elite on the veranda ---------------------------------------------
  add(shot(A.at('The colonial elite enjoy') - L, 'interior', dolly([-4.8, 1.8, 3.8], [-4.2, 1.7, 3.4], [0, 1.1, 1.5], [0, 1.1, 1.5], 40), { room: 'veranda', people: elite() }, { amb: 'veranda', sfx: [['glassClink', 0.8]] }));
  add(shot(A.at('comfortable life') - L, 'interior', dolly([3.6, 1.5, 3.4], [3.1, 1.45, 3.0], [0, 1.15, 1.4], [0, 1.15, 1.4], 38), { room: 'veranda', people: elite({ drink: 0.4 }) }, { amb: 'veranda', fx: { dof: { focus: 3.2, range: 1.5, bokeh: 3 } } }));
  add(shot(A.at('Dutch officers and merchants') - L, 'interior', dolly([0.55, 0.98, 2.35], [0.45, 0.95, 2.2], [0.0, 0.9, 1.6], [0.0, 0.88, 1.6], 30), { room: 'veranda', people: elite({ drink: 0.6 }) }, {
    amb: 'veranda', sfx: [['iceClink', A.peek('gin over ice') - A.peek('Dutch officers and')], ['pour', 0.2]], fx: { dof: { focus: 0.75, range: 0.3, bokeh: 4.5 } },
  }));
  add(shot(A.at('on their verandas') - L, 'interior', dolly([-1.5, 1.2, 7.4], [-1.2, 1.35, 6.7], [0, 1.4, 1.5], [0, 1.4, 1.5], 36), { room: 'veranda', people: elite({ drink: 0.2 }) }, { amb: 'veranda' }));
  add(shot(A.at('discussing the latest') - L, 'interior', dolly([0.75, 1.15, 1.75], [0.62, 1.05, 1.62], [0.25, 0.8, 1.6], [0.25, 0.8, 1.6], 30), { room: 'veranda', people: elite() }, {
    amb: 'veranda', sfx: [['paper', 0.1], ['tickerTape', 0.3]], fx: { dof: { focus: 0.5, range: 0.3, bokeh: 4 } }, draw: tickerTape(),
  }));

  // --- beneath them ------------------------------------------------------------
  add(shot(A.at('Beneath them') - L, 'interior', dolly([0, 1.6, 3.2], [0, 0.4, 2.0], [0, 1.0, 1.5], [0, 0.0, 1.6], 40, 'in'), { room: 'veranda', people: elite() }, { tin: 'push', amb: 'veranda', mus: 'unease', sfx: [['whooshDown', 0.2], ['rumble', 0.4]] }));
  add(shot(A.at("Krakatoa's magma chamber") - L, 'xsection', orbit([0, -9, 0], [40, 30], [-10, 2], [8, 6], 40, 'inOut'), { magma: 1, fill: 1, pressure: [0.5, 0.95], plug: 1 }, {
    amb: 'rumble', sfx: [['gaugeTick', 0.4]], draw: both(pin3(XS.chamber, 'APPROACHING ITS LIMIT', 0.5, { dir: [1, -1], color: '#ffb27a' })),
  }));
  add(shot(A.at('Gas pressure inside') - L, 'magma', dolly([4, 2.6, 13], [2.5, 2.2, 9.5], [0, 1, -2], [0, 1.2, -3], 42), { bubbles: 1, crust: 0.3, pressure: [0.4, 1] }, { amb: 'lava', sfx: [['bubbles', 0], ['lavaBloop', 0.3]], fx: { shakes: [{ at: 0.8, amp: 0.5, decay: 3 }] } }));
  add(shot(A.at("puts the island's rocky") - L, 'xsection', orbit([0, -5, 0], [36, 30], [20, 10], [12, 14], 40), { magma: 1, fill: 1, pressure: 1, plug: 1, strain: [0.2, 1], cracks: [0, 0.35] }, { amb: 'rumble', sfx: [['crackRock', 0.6], ['creak', 0.2]], fx: { shakes: [{ at: 0.6, amp: 0.6, decay: 2 }] } }));

  // --- tremors -----------------------------------------------------------------
  add(shot(A.at('Around the Sunda Strait') - L, 'strait', dolly([-9000, 1800, 9000], [-8600, 1700, 8500], [0, 200, 0], [0, 200, 0], 40, 'lin'), { mood: 'day', steam: { at: 'perboewatan', amount: 0.4, h: 500 } }, { amb: 'ocean' }));
  add(shot(A.at('the ground begins to tremble') - L, 'coast', dolly([-40, 3.0, 12], [-36, 2.8, 8], [-60, 3.5, -50], [-58, 3.5, -50], 40), {
    layout: 'village', mood: 'day', sea: 'calm', quake: 1,
    people: [{ style: 'villager', at: [-48, -20], rot: 20, pose: { look: 0.6 } }, { style: 'villager2', at: [-55, -28], rot: -30, pose: { lookUp: -0.3 } }],
  }, { amb: 'village', sfx: [['rumbleQuake', 0.2]], fx: { shakes: [{ at: 0.3, amp: 0.9, decay: 0.6, freq: 22 }, { at: 1.3, amp: 0.7, decay: 0.8, freq: 22 }] } }));
  add(shot(A.at('Local residents notice') - L, 'coast', dolly([-52, 1.9, -14], [-51, 1.85, -15], [-55, 1.6, -24], [-55, 1.7, -24], 34), {
    layout: 'village', mood: 'day', sea: 'calm', quake: 0.6,
    people: [{ style: 'villager', at: [-54, -22], rot: 150, pose: { look: -0.5 } }, { style: 'villager2', at: [-57, -24], rot: 120, pose: { lookUp: -0.2, point: true } }, { style: 'villager', at: [-50, -27], rot: 200 }],
  }, { amb: 'village', sfx: [['rumbleQuake', 0.4]], fx: { dof: { focus: 9, range: 4, bokeh: 3 }, shakes: [{ at: 0.6, amp: 0.5, decay: 1.0, freq: 22 }] } }));
  add(shot(A.at('But seismology is not yet') - L, 'studio', dolly([1.6, 1.6, 2.6], [1.2, 1.4, 2.1], [0.2, 0.7, 0], [0.25, 0.7, 0], 36), { bg: 'paper', items: [{ kind: 'seismo', pos: [0, 0, 0], appear: 0, spin: 0, value: 0.5 }] }, { amb: 'room', sfx: [['penScratch', 0.1]], fx: { dof: { focus: 2.2, range: 1.2, bokeh: 2 } } }));
  add(shot(A.at('No one knows how to read') - L, 'studio', dolly([0.4, 1.1, 1.3], [0.35, 1.05, 1.15], [0.3, 0.75, 0.2], [0.3, 0.75, 0.2], 32), { bg: 'paper', items: [{ kind: 'seismo', pos: [0, 0, 0], appear: 0, spin: 0, value: 0.7 }] }, {
    amb: 'room', sfx: [['penScratch', 0]], draw: word('?', A.peek('warning signs') - A.peek('No one knows how'), { y: H * 0.36, size: 260, color: PAL.red, mode: 'scale' }),
  }));
  add(shot(A.at('Nature is already sounding') - L, 'strait', dolly([-5200, 60, -3000], [-4700, 80, -2700], [250, 300, -2500], [250, 320, -2500], 34, 'lin'), { mood: 'golden', mood2: 'dusk', moodK: 0.4, steam: { at: 'perboewatan', amount: 0.8, h: 700, col: [0.6, 0.58, 0.55] }, birds: { c: [-1500, 200, -2200], r: 2000, speed: 0.4, spread: 80, scale: 2.4 } }, { amb: 'rumble', sfx: [['rumbleDeep', 0.1], ['birdsFlee', 0.4]] }));
  add(shot(A.at('No one is listening') - L, 'interior', dolly([-2.8, 1.4, 4.0], [-2.6, 1.4, 3.8], [0, 1.15, 1.5], [0, 1.15, 1.5], 38), { room: 'veranda', people: elite({ cheer: true }) }, { amb: 'veranda', sfx: [['laughter', 0.0]], fx: { fadeOut: 0.35 } }));
  return S;
}

function hoursVsWeeks(k, lt, S) {
  const ctx = k.ctx;
  k.bgPaper();
  k.kinetic('LONDON → BATAVIA', W / 2, 170, lt, { size: 58, weight: 900, color: PAL.ink, stagger: 0.02, tracking: 6 });
  const a1 = ease.out(clamp((lt - 0.15) / 0.4)), a2 = ease.out(clamp((lt - 1.0) / 0.4));
  ctx.globalAlpha = a1;
  k.text('BY SHIP', W * 0.3, 430, { size: 40, weight: 800, color: PAL.ink2, tracking: 6 });
  k.text('6 WEEKS', W * 0.3, 560, { size: 120, weight: 900, color: '#8a8076' });
  const st = ease.out(clamp((lt - 0.8) / 0.25));
  ctx.fillStyle = PAL.red; ctx.fillRect(W * 0.3 - 260, 520, 520 * st, 10);
  ctx.globalAlpha = a2;
  k.text('BY TELEGRAPH', W * 0.7, 430, { size: 40, weight: 800, color: PAL.ink2, tracking: 6 });
  k.text('HOURS', W * 0.7, 560, { size: 140, weight: 900, color: PAL.red });
  ctx.globalAlpha = 1;
  // spinning clock
  const cx = W / 2, cy = 800, R = 90;
  k.circle(cx, cy, R, '#fff', { color: PAL.ink, width: 6 });
  const h = lt * 3, m = lt * 36;
  ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round';
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(h) * 45, cy - Math.cos(h) * 45); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(m) * 70, cy - Math.cos(m) * 70); ctx.stroke();
}

function tickerTape() {
  return (k, lt) => {
    const ctx = k.ctx;
    const y = H - 300;
    const a = ease.out(clamp(lt / 0.3));
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(236,228,210,0.95)'; ctx.fillRect(0, y, W, 70);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y + 66, W, 4);
    const items = ['KOFFIE ▲ 2.4', 'SUIKER ▼ 0.8', 'TABAK ▲ 1.1', 'TIN ▲ 0.6', 'N.H.M. ▲ 3.2', 'INDIGO ▼ 0.3', 'RUBBER ▲ 1.9', 'THEE ▲ 0.7'];
    let x = W - ((lt * 260) % 2600);
    for (let rep = 0; rep < 3; rep++) for (const it of items) {
      const up = it.includes('▲');
      k.text(it, x, y + 48, { size: 34, weight: 800, color: up ? '#1d6b2a' : '#9a1a12', align: 'left', family: 'ui' });
      x += 330;
    }
    ctx.globalAlpha = 1;
  };
}
