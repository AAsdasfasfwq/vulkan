// Builds the complete sound-effects / ambience / music track for the film in an
// OfflineAudioContext (deterministic). The voice-over is mixed in by render.js
// (ffmpeg) or by the preview player, with the same inserted gaps.
import { Synth } from './synth.js';
import { SFX } from './sfx.js';
import { BEDS, DEFAULT_BED } from './beds.js';
import { scheduleMusic } from './music.js';
import { rng } from '../core/math.js';

export const SR = 48000;

function impulse(ctx, secs = 3.2, decay = 2.8) {
  const n = Math.floor(ctx.sampleRate * secs);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c), r = rng(91 + c);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (r() * 2 - 1) * Math.pow(1 - t, decay) * (i < 200 ? i / 200 : 1); }
  }
  return b;
}

// Speech activity intervals from word timings (video time)
function speech(film) {
  const out = [];
  let cur = null;
  for (const w of film.words) {
    if (cur && w.vs - cur[1] < 0.4) cur[1] = w.ve;
    else { if (cur) out.push(cur); cur = [w.vs, w.ve]; }
  }
  if (cur) out.push(cur);
  return out;
}

// Ducking under the narration. Only the spans that touch [from, until] are scheduled,
// times are relative to `from` (block rendering) and never negative.
function duck(param, spans, base, low, from, until) {
  const RI = 0.15, RO = 0.35;
  const valueAt = (t) => {
    for (const [a, b] of spans) {
      if (t >= a - RI && t < a) return base + (low - base) * ((t - (a - RI)) / RI);
      if (t >= a && t <= b) return low;
      if (t > b && t < b + RO) return low + (base - low) * ((t - b) / RO);
    }
    return base;
  };
  param.setValueAtTime(valueAt(from), 0);
  for (const [a, b] of spans) {
    if (b + RO < from || a - RI > until) continue;
    const pts = [[a - RI, base, 'set'], [a, low, 'ramp'], [b, low, 'set'], [b + RO, base, 'ramp']];
    for (const [t, v, kind] of pts) {
      const tt = t - from;
      if (tt <= 0) continue;
      if (kind === 'set') param.setValueAtTime(v, tt); else param.linearRampToValueAtTime(v, tt);
    }
  }
}

// Schedules everything that STARTS inside [from, to) (video seconds) into ctx, whose time 0
// is `from`. Sounds keep ringing past `to`; the caller overlap-adds the tails.
export function buildMix(ctx, film, { from = 0, to = Infinity, tail = 0 } = {}) {
  const dur = film.duration;
  const until = Math.min(dur, to) + tail;
  const master = ctx.createGain(); master.gain.value = 0.85;
  master.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.55;
  verb.connect(verbOut); verbOut.connect(master);
  const mk = (lvl) => { const g = ctx.createGain(); g.gain.value = lvl; const d = ctx.createGain(); g.connect(d); d.connect(master); return { in: g, duck: d }; };
  const sfx = mk(0.9), amb = mk(0.6), mus = mk(0.55);
  const sp = speech(film);
  duck(sfx.duck.gain, sp, 1.0, 0.62, from, until);
  duck(amb.duck.gain, sp, 1.0, 0.7, from, until);
  duck(mus.duck.gain, sp, 1.0, 0.55, from, until);
  const S = new Synth(ctx, sfx.in, verb);
  S.off = from; // absolute time offset, keeps LFO phases continuous across blocks
  const T = (t) => t - from;
  const inBlock = (t) => t >= from && t < to;

  // sound effects
  for (const shot of film.shots) {
    for (const [name, at, opts] of shot.sfx || []) {
      const t = shot.t + (at || 0);
      if (!inBlock(t) || t > dur) continue;
      const fn = SFX[name];
      if (fn) fn(S, T(t), opts || {});
      else console.warn('unknown sfx', name);
    }
  }
  // ambience runs, cut into block-sized pieces that crossfade over XF seconds
  const XF = 0.06;
  const runs = [];
  for (const s of film.shots) {
    const type = s.amb ?? (s.set ? DEFAULT_BED[s.set] : 'none') ?? 'none';
    const last = runs[runs.length - 1];
    if (last && last.type === type) last.t1 = s.t + s.dur;
    else runs.push({ type, t0: s.t, t1: s.t + s.dur });
  }
  const prevDest = S.dest;
  for (const r of runs) {
    if (r.type === 'none' || !BEDS[r.type]) continue;
    const ra = Math.max(0, r.t0 - 0.25), rb = r.t1 + 0.3;
    const pa = Math.max(ra, from - XF), pb = Math.min(rb, to + XF);
    if (pb <= pa || pb < from || pa >= to + XF) continue;
    const g = ctx.createGain();
    const a = Math.max(0, T(pa)), b = T(pb);
    const fadeIn = pa > ra + 1e-6 ? 2 * XF : 0.4;
    const fadeOut = pb < rb - 1e-6 ? 2 * XF : 0.45;
    g.gain.setValueAtTime(0.0001, a);
    g.gain.linearRampToValueAtTime(1, a + fadeIn);
    g.gain.setValueAtTime(1, Math.max(a + fadeIn, b - fadeOut));
    g.gain.linearRampToValueAtTime(0.0001, b);
    g.connect(amb.in);
    S.dest = g;
    BEDS[r.type](S, a, b);
  }
  // music sections (chord grid stays anchored to each section start)
  const secs = [];
  for (const s of film.shots) {
    if (s.mus) {
      const last = secs[secs.length - 1];
      if (last && last.mood === s.mus) continue;
      if (last) last.t1 = s.t;
      secs.push({ mood: s.mus, t0: s.t, t1: dur });
    }
  }
  S.dest = mus.in;
  scheduleMusic(S, secs, { from, to });
  S.dest = prevDest;
  return { master };
}

// Stateful bus compressor + soft limiter applied in order to the finished stream
// (replaces a DynamicsCompressorNode, which cannot span independently rendered blocks).
function makeDynamics(sr, { threshold = -16, ratio = 3.5, attack = 0.004, release = 0.3, makeup = 4 } = {}) {
  const thr = Math.pow(10, threshold / 20), mk = Math.pow(10, makeup / 20);
  const ca = Math.exp(-1 / (attack * sr)), cr = Math.exp(-1 / (release * sr));
  let env = 0;
  const soft = (x) => { const a = Math.abs(x); if (a <= 0.8) return x; const y = 0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2); return x < 0 ? -y : y; };
  return (L, R, n) => {
    for (let i = 0; i < n; i++) {
      const lvl = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      env = lvl > env ? ca * env + (1 - ca) * lvl : cr * env + (1 - cr) * lvl;
      const g = (env > thr ? Math.pow(env / thr, 1 / ratio - 1) : 1) * mk;
      L[i] = soft(L[i] * g); R[i] = soft(R[i] * g);
    }
  };
}

// Renders the soundtrack block by block. onBlock(L, R, n, startFrame) receives final samples
// in order. Each block holds only the sounds that start inside it, so the Web Audio graph
// stays small and rendering is fast; ringing tails are overlap-added into the next blocks.
export async function renderSoundtrackBlocks(film, onBlock, { block = 30, tail = 18, onProgress } = {}) {
  const total = Math.ceil(film.duration * SR);
  const C = Math.round(block * SR), TL = Math.round(tail * SR);
  const accL = new Float32Array(C + TL), accR = new Float32Array(C + TL);
  const dyn = makeDynamics(SR);
  for (let base = 0; base < total; base += C) {
    const len = Math.min(C + TL, total - base);
    const ctx = new OfflineAudioContext(2, len, SR);
    buildMix(ctx, film, { from: base / SR, to: (base + C) / SR, tail });
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let i = 0; i < len; i++) { accL[i] += L[i]; accR[i] += R[i]; }
    const n = Math.min(C, total - base);
    const outL = accL.slice(0, n), outR = accR.slice(0, n);
    dyn(outL, outR, n);
    await onBlock(outL, outR, n, base);
    accL.copyWithin(0, C); accL.fill(0, TL);
    accR.copyWithin(0, C); accR.fill(0, TL);
    if (onProgress) onProgress(Math.min(1, (base + C) / total));
  }
  return { length: total, sampleRate: SR };
}

// Whole soundtrack as one AudioBuffer (interactive preview).
export async function renderSoundtrack(film, opts = {}) {
  const total = Math.ceil(film.duration * SR);
  const buffer = new AudioBuffer({ length: total, numberOfChannels: 2, sampleRate: SR });
  const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
  await renderSoundtrackBlocks(film, (l, r, n, base) => { L.set(l.subarray(0, n), base); R.set(r.subarray(0, n), base); }, opts);
  return { buffer };
}

// Interleaved 16-bit PCM as base64 (the WAV header is written by render.js)
export function encodePCM16(L, R, n) {
  const bytes = new Uint8Array(n * 4);
  const dv = new DataView(bytes.buffer);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i]));
    dv.setInt16(i * 4, Math.round(l * 32767), true);
    dv.setInt16(i * 4 + 2, Math.round(r * 32767), true);
  }
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
