// Procedural film score: pads, plucks, ostinati and drums per section mood.
const N = (s) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (base + (parseInt(m[3]) + 1) * 12 - 69) / 12);
};
const ch = (str) => str.split(' ').map(N);

export const MOODS = {
  wonder: { dur: 4.0, cut: 1900, pad: 0.035, chords: ['D3 A3 D4 F#4 C#5', 'B2 F#3 D4 A4', 'G2 D3 B3 F#4', 'A2 E3 C#4 E4'], arp: 0.02, arpRate: 0.25 },
  calm: { dur: 4.5, cut: 1300, pad: 0.03, chords: ['A2 E3 C4 G4 B4', 'F2 C3 A3 E4', 'C3 G3 E4 G4', 'G2 D3 B3 D4'], piano: 0.02 },
  unease: { dur: 5.0, cut: 850, pad: 0.032, chords: ['D2 A2 F3 E4', 'Bb1 F2 D3 F3', 'G1 D2 Bb2 G3', 'A1 E2 C#3 A3'], plink: 0.012, drone: 'D1' },
  tension: { dur: 4.0, cut: 950, pad: 0.03, chords: ['C2 G2 Eb3 G3', 'Ab1 Eb2 C3 Eb3', 'F1 C2 Ab2 F3', 'G1 D2 B2 D3'], ost: 0.03, ostRate: 0.25, drone: 'C1' },
  dread: { dur: 6.0, cut: 650, pad: 0.03, chords: ['D2 A2 D3 Eb3', 'C2 G2 C3 Db3', 'Bb1 F2 Bb2 B2', 'A1 E2 A2 Bb2'], drone: 'D1', pulse: 0.12 },
  chaos: { dur: 2.5, cut: 1700, pad: 0.035, chords: ['D2 A2 D3 F3', 'Bb1 F2 Bb2 D3', 'C2 G2 C3 E3', 'A1 E2 A2 C#3'], ost: 0.04, ostRate: 0.125, drums: 0.5, drone: 'D1' },
  awe: { dur: 4.0, cut: 1500, pad: 0.035, chords: ['D2 A2 F3 A3 D4', 'Bb1 F2 D3 F3 Bb3', 'F2 C3 A3 C4 F4', 'C2 G2 E3 G3 C4'], choir: 0.025 },
  grief: { dur: 5.0, cut: 950, pad: 0.026, chords: ['A2 E3 A3 C4', 'F2 C3 A3 C4', 'C3 G3 C4 E4', 'E2 B2 G3 B3'], piano: 0.025 },
  modern: { dur: 3.0, cut: 1600, pad: 0.026, chords: ['E2 B2 D3 G3', 'C2 G2 B2 E3', 'G2 D3 G3 B3', 'D2 A2 D3 F#3'], pulseNote: 0.018 },
  outro: { dur: 5.0, cut: 1400, pad: 0.034, chords: ['D2 A2 F3 A3', 'Bb1 F2 D3 F3', 'F2 C3 A3 C4', 'A1 E2 C#3 E3'], choir: 0.02, piano: 0.018 },
  silence: { silent: true },
  end: { dur: 6.0, cut: 1200, pad: 0.04, chords: ['D2 A2 D3 F3 A3'], once: true, choir: 0.025 },
};

function padVoice(S, t, d, f, cut, peak, pan) {
  const ctx = S.ctx;
  const g = S.gain(0);
  const lp = S.filt('lowpass', cut, 0.6);
  for (const det of [-7, 7]) { const o = S.osc('sawtooth', f, t, d + 2.5); o.detune.value = det; o.connect(lp); }
  const sub = S.osc('triangle', f / 2, t, d + 2.5); const sg = S.gain(0.4); sub.connect(sg); sg.connect(lp);
  lp.connect(g);
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + Math.min(1.6, d * 0.4));
  p.setValueAtTime(peak, t + d);
  p.linearRampToValueAtTime(0.0001, t + d + 2.2);
  lp.frequency.setValueAtTime(cut * 0.6, t);
  lp.frequency.linearRampToValueAtTime(cut, t + d * 0.5);
  S.out(g, { wet: 0.55, panv: pan });
}
function pluck(S, t, f, peak, pan, d = 0.9) {
  S.tone(t, { type: 'triangle', f0: f, a: 0.004, d, peak, wet: 0.5, pan });
  S.tone(t, { type: 'sine', f0: f * 2, a: 0.002, d: d * 0.5, peak: peak * 0.4, wet: 0.5, pan });
}
function choir(S, t, d, f, peak, pan) {
  const g = S.gain(0);
  const src = S.osc('sawtooth', f, t, d + 2.5);
  src.detune.value = S.rand(-6, 6);
  const f1 = S.filt('bandpass', 750, 6), f2 = S.filt('bandpass', 1150, 7);
  src.connect(f1); src.connect(f2); f1.connect(g); f2.connect(g);
  const p = g.gain;
  p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + 1.8); p.setValueAtTime(peak, t + d); p.linearRampToValueAtTime(0.0001, t + d + 2.4);
  S.out(g, { wet: 0.7, panv: pan });
}
function taiko(S, t, k) {
  S.tone(t, { f0: 85, f1: 42, a: 0.003, d: 0.45, peak: 0.22 * k, wet: 0.35, glide: 0.3 });
  S.noiseHit(t, { f0: 500, f1: 150, d: 0.12, peak: 0.06 * k, wet: 0.3 });
}

export function scheduleMusic(S, sections) {
  for (const sec of sections) {
    const M = MOODS[sec.mood];
    if (!M || M.silent) continue;
    const { t0, t1 } = sec;
    let i = 0;
    for (let t = t0; t < t1 - 0.5; t += M.dur, i++) {
      const chord = ch(M.chords[i % M.chords.length]);
      const d = Math.min(M.dur, t1 - t);
      chord.forEach((f, k) => padVoice(S, t, d, f, M.cut, M.pad / Math.sqrt(chord.length) * 1.6, (k / (chord.length - 1 || 1) - 0.5) * 1.2));
      if (M.drone) { const o = S.osc('sine', N(M.drone), t, d + 2); const g = S.gain(0); o.connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 1.5); g.gain.setValueAtTime(0.05, t + d); g.gain.linearRampToValueAtTime(0.0001, t + d + 2); S.out(g, { wet: 0.2 }); }
      if (M.arp) for (let a = 0; a < d / M.arpRate; a++) pluck(S, t + a * M.arpRate, chord[(a % (chord.length - 1)) + 1] * 2, M.arp, S.rand(-0.6, 0.6), 0.7);
      if (M.piano) for (let a = 0; a < 3; a++) pluck(S, t + a * (d / 3) + S.rand(0, 0.2), chord[1 + Math.floor(S.rand(0, chord.length - 1))] * 2, M.piano, S.rand(-0.5, 0.5), 1.8);
      if (M.plink && S.r() < 0.7) pluck(S, t + S.rand(0.5, d - 0.5), chord[chord.length - 1] * 4 * (S.r() < 0.5 ? 1 : 1.0595), M.plink, S.rand(-0.8, 0.8), 1.4);
      if (M.ost) for (let a = 0; a < d / M.ostRate; a++) { const f = chord[0] * (a % 4 === 3 ? 2 : 1); const g = S.gain(0); const o = S.osc('sawtooth', f, t + a * M.ostRate, M.ostRate * 1.2); const lp = S.filt('lowpass', 700, 2); o.connect(lp); lp.connect(g); S.env(g, t + a * M.ostRate, 0.005, M.ost, M.ostRate * 0.9); S.out(g, { wet: 0.2 }); }
      if (M.drums) for (let a = 0; a < d / 0.5; a++) taiko(S, t + a * 0.5, (a % 4 === 0 ? 1 : 0.55) * M.drums);
      if (M.choir) chord.slice(1).forEach((f, k) => choir(S, t, d, f * 2, M.choir, (k - 1) * 0.5));
      if (M.pulse) S.sub(t + 0.2, 55, 35, 1.0, M.pulse);
      if (M.pulseNote) for (let a = 0; a < d / 0.5; a++) pluck(S, t + a * 0.5, chord[1] * 2, M.pulseNote, 0, 0.35);
      if (M.once) break;
    }
  }
}
