// Ambience beds: continuous textures for a time span [t0, t1] routed into `out`.
import { SFX } from './sfx.js';

function loopNoise(S, buf, t0, t1, chain, level) {
  const s = S.src(buf, t0, t1 - t0 + 0.5);
  let node = s;
  for (const n of chain) { node.connect(n); node = n; }
  const g = S.gain(level);
  node.connect(g);
  g.connect(S.dest);
  return g;
}
function lfoGain(S, g, t0, t1, rate, depth, base) {
  // amplitude movement via automation points (deterministic)
  const p = g.gain;
  p.setValueAtTime(base, t0);
  for (let t = t0; t < t1; t += 0.25) p.linearRampToValueAtTime(base * (1 - depth * (0.5 + 0.5 * Math.sin(t * rate * 6.283 + Math.sin(t * rate * 2.1) * 1.3))), t);
}
const events = (S, t0, t1, every, fn) => { let t = t0 + S.rand(0, every); while (t < t1 - 0.3) { fn(t); t += every * S.rand(0.6, 1.4); } };

const ocean = (lvl, lp = 700) => (S, t0, t1) => {
  const g = loopNoise(S, S.pink, t0, t1, [S.filt('lowpass', lp, 0.6)], lvl);
  lfoGain(S, g, t0, t1, 0.11, 0.55, lvl);
  loopNoise(S, S.white, t0, t1, [S.filt('highpass', 3500, 0.5)], lvl * 0.08);
};
const wind = (lvl, f = 500) => (S, t0, t1) => {
  const bp = S.filt('bandpass', f, 0.9);
  const g = loopNoise(S, S.pink, t0, t1, [bp], lvl);
  for (let t = t0; t < t1; t += 0.6) bp.frequency.linearRampToValueAtTime(f * (0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t * 0.37 + Math.sin(t * 0.13) * 2))), t);
  lfoGain(S, g, t0, t1, 0.07, 0.6, lvl);
};
const insects = (lvl, f = 6500) => (S, t0, t1) => {
  const g = loopNoise(S, S.white, t0, t1, [S.filt('bandpass', f, 8)], lvl);
  lfoGain(S, g, t0, t1, 0.3, 0.5, lvl);
};
const crickets = (lvl) => (S, t0, t1) => events(S, t0, t1, 0.45, (t) => { for (let i = 0; i < 3; i++) S.tone(t + i * 0.045, { f0: 4400 + S.rand(-200, 200), a: 0.003, d: 0.02, peak: lvl, wet: 0.2, pan: S.rand(-0.7, 0.7) }); });
const birds = (lvl, every = 0.6) => (S, t0, t1) => events(S, t0, t1, every, (t) => { const f = S.rand(2400, 5200); for (let i = 0; i < 1 + Math.floor(S.rand(0, 4)); i++) S.chirp(t + i * 0.12, f, f * S.rand(0.7, 1.35), S.rand(0.05, 0.12), lvl, S.rand(-0.8, 0.8)); });
const murmur = (lvl, f = 650) => (S, t0, t1) => { const g = loopNoise(S, S.pink, t0, t1, [S.filt('bandpass', f, 1.4)], lvl); lfoGain(S, g, t0, t1, 1.8, 0.5, lvl); };
const rumbleBed = (lvl, f = 90) => (S, t0, t1) => { const g = loopNoise(S, S.brown, t0, t1, [S.filt('lowpass', f, 0.7)], lvl); lfoGain(S, g, t0, t1, 0.09, 0.5, lvl); };
const roar = (lvl) => (S, t0, t1) => { rumbleBed(lvl, 320)(S, t0, t1); const g = loopNoise(S, S.pink, t0, t1, [S.filt('bandpass', 900, 0.8)], lvl * 0.25); lfoGain(S, g, t0, t1, 0.5, 0.6, lvl * 0.25); };
const booms = (every, kind = 'boomFar') => (S, t0, t1) => events(S, t0, t1, every, (t) => SFX[kind](S, t));
const thunders = (every) => (S, t0, t1) => events(S, t0, t1, every, (t) => SFX.thunder(S, t));
const combine = (...fns) => (S, t0, t1) => fns.forEach((f) => f(S, t0, t1));

export const BEDS = {
  none: () => {},
  ocean: ocean(0.11),
  oceanCalm: ocean(0.07, 600),
  oceanGrey: combine(ocean(0.07, 500), wind(0.03, 400)),
  oceanStorm: combine(ocean(0.16, 900), wind(0.08, 600)),
  beach: combine(ocean(0.1, 900), wind(0.02, 700), (S, t0, t1) => events(S, t0, t1, 7, (t) => SFX.gulls(S, t))),
  jungle: combine(insects(0.02), birds(0.018, 0.45), wind(0.015, 900)),
  jungleQuiet: combine(insects(0.012), birds(0.014, 1.2)),
  village: combine(ocean(0.05), birds(0.012, 1.0), murmur(0.012)),
  city: combine(rumbleBed(0.06, 140), murmur(0.02, 550), (S, t0, t1) => events(S, t0, t1, 1.8, (t) => S.bellTone(t, S.rand(260, 520), 0.5, 0.012, 0.5, [1, 2.6, 4.2]))),
  eveningTown: combine(murmur(0.014, 500), crickets(0.006), rumbleBed(0.03, 120)),
  cityModern: combine(rumbleBed(0.05, 400), murmur(0.01, 900)),
  factory: combine(rumbleBed(0.05, 180), (S, t0, t1) => { let t = t0; while (t < t1) { S.thump(t, 0.12, 120, 50, 0.12); S.noiseHit(t + 0.2, { type: 'highpass', f0: 3000, d: 0.12, peak: 0.02, wet: 0.2 }); t += 0.42; } }),
  wind: wind(0.06),
  winterWind: combine(wind(0.07, 800), wind(0.03, 1400)),
  windDesolate: wind(0.05, 380),
  underwater: combine(rumbleBed(0.06, 220), (S, t0, t1) => events(S, t0, t1, 1.2, (t) => S.tone(t, { f0: S.rand(300, 700), f1: S.rand(900, 1500), a: 0.005, d: 0.05, peak: 0.015, wet: 0.5, glide: 0.05 }))),
  underwaterRumble: combine(rumbleBed(0.08, 160), rumbleBed(0.05, 70)),
  rumble: rumbleBed(0.08, 85),
  rumbleSoft: rumbleBed(0.05, 75),
  eruption: combine(roar(0.12), booms(3.5)),
  eruptionMax: combine(roar(0.2), booms(2.2, 'boom'), rumbleBed(0.1, 60)),
  eruptionSoft: combine(roar(0.06), booms(5)),
  nightEruption: combine(crickets(0.006), roar(0.07), booms(3)),
  night: combine(crickets(0.008), ocean(0.05, 500)),
  ashStorm: combine(wind(0.06, 450), roar(0.08), thunders(4), (S, t0, t1) => events(S, t0, t1, 0.9, (t) => S.noiseHit(t, { type: 'bandpass', f0: S.rand(1500, 4000), q: 3, d: 0.03, peak: 0.02, wet: 0.2 }))),
  storm: combine(wind(0.08, 600), (S, t0, t1) => loopNoise(S, S.white, t0, t1, [S.filt('highpass', 900, 0.5), S.filt('lowpass', 7000, 0.5)], 0.035), thunders(5)),
  rain: (S, t0, t1) => { loopNoise(S, S.white, t0, t1, [S.filt('highpass', 900, 0.5), S.filt('lowpass', 7000, 0.5)], 0.045); S.clicks(t0, t1 - t0, 40, { f: 5000, q: 1, peak: 0.01, jitter: 0.9 }); },
  room: combine(rumbleBed(0.015, 200), (S, t0, t1) => { for (let t = Math.ceil(t0); t < t1; t += 1) S.noiseHit(t, { type: 'bandpass', f0: 2600, q: 8, d: 0.015, peak: 0.025, wet: 0.3 }); }),
  veranda: combine(crickets(0.006), birds(0.008, 1.6), murmur(0.01, 600), ocean(0.025, 500)),
  crowd: murmur(0.04, 650),
  crowdPanic: combine(murmur(0.07, 800), murmur(0.04, 1300), (S, t0, t1) => events(S, t0, t1, 0.8, (t) => SFX.shout(S, t))),
  deckParty: combine(murmur(0.03, 650), ocean(0.06), (S, t0, t1) => events(S, t0, t1, 2.2, (t) => SFX.glassClink(S, t))),
  lava: combine(rumbleBed(0.07, 120), (S, t0, t1) => events(S, t0, t1, 0.7, (t) => SFX.lavaBloop(S, t)), (S, t0, t1) => loopNoise(S, S.white, t0, t1, [S.filt('highpass', 4000, 0.5)], 0.008)),
  space: (S, t0, t1) => { const o = S.osc('sine', 46, t0, t1 - t0); const g = S.gain(0.02); o.connect(g); g.connect(S.dest); rumbleBed(0.02, 160)(S, t0, t1); },
  tinnitus: combine(rumbleBed(0.03, 90), (S, t0, t1) => { const o = S.osc('sine', 3900, t0, t1 - t0); const g = S.gain(0.006); o.connect(g); g.connect(S.dest); }),
  tsunami: combine(roar(0.16), (S, t0, t1) => loopNoise(S, S.pink, t0, t1, [S.filt('lowpass', 1500, 0.5)], 0.08)),
  tsunamiFar: combine(rumbleBed(0.08, 200), (S, t0, t1) => loopNoise(S, S.pink, t0, t1, [S.filt('lowpass', 900, 0.5)], 0.05)),
  flood: (S, t0, t1) => loopNoise(S, S.pink, t0, t1, [S.filt('lowpass', 1300, 0.5)], 0.1),
  surtsey: combine(rumbleBed(0.05, 120), (S, t0, t1) => loopNoise(S, S.white, t0, t1, [S.filt('highpass', 2500, 0.5)], 0.02), booms(2.5, 'boomLow')),
  nightBeach: combine(ocean(0.08, 800), crickets(0.007)),
};

export const DEFAULT_BED = { strait: 'ocean', coast: 'beach', town: 'city', interior: 'room', machine: 'factory', land: 'wind', seafloor: 'underwater', magma: 'lava', xsection: 'rumble', globe: 'space', studio: 'none' };
