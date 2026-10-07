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

function duck(param, spans, base, low, dur) {
  param.setValueAtTime(base, 0);
  for (const [a, b] of spans) {
    param.setValueAtTime(base, Math.max(0, a - 0.15));
    param.linearRampToValueAtTime(low, a);
    param.setValueAtTime(low, b);
    param.linearRampToValueAtTime(base, Math.min(dur, b + 0.35));
  }
}

export function buildMix(ctx, film, { from = 0 } = {}) {
  const dur = film.duration;
  const master = ctx.createGain(); master.gain.value = 0.85;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.3;
  master.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.55;
  verb.connect(verbOut); verbOut.connect(master);
  const mk = (lvl) => { const g = ctx.createGain(); g.gain.value = lvl; const d = ctx.createGain(); g.connect(d); d.connect(master); return { in: g, duck: d }; };
  const sfx = mk(0.9), amb = mk(0.6), mus = mk(0.55);
  const sp = speech(film);
  duck(sfx.duck.gain, sp, 1.0, 0.62, dur);
  duck(amb.duck.gain, sp, 1.0, 0.7, dur);
  duck(mus.duck.gain, sp, 1.0, 0.55, dur);
  const S = new Synth(ctx, sfx.in, verb);
  const T = (t) => t - from; // shift for partial renders

  // sound effects
  for (const shot of film.shots) {
    for (const [name, at, opts] of shot.sfx || []) {
      const t = shot.t + (at || 0);
      if (t < from - 0.5 || t > dur) continue;
      const fn = SFX[name];
      if (fn) fn(S, T(t), opts || {});
      else console.warn('unknown sfx', name);
    }
  }
  // ambience runs
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
    if (r.t1 < from) continue;
    const g = ctx.createGain();
    const a = Math.max(0, T(r.t0 - 0.25)), b = T(r.t1 + 0.3);
    g.gain.setValueAtTime(0.0001, a);
    g.gain.linearRampToValueAtTime(1, a + 0.4);
    g.gain.setValueAtTime(1, Math.max(a + 0.4, b - 0.45));
    g.gain.linearRampToValueAtTime(0.0001, b);
    g.connect(amb.in);
    S.dest = g;
    BEDS[r.type](S, a, b);
  }
  // music sections
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
  scheduleMusic(S, secs.filter((x) => x.t1 > from).map((x) => ({ ...x, t0: Math.max(0, T(x.t0)), t1: T(x.t1) })));
  S.dest = prevDest;
  return { master };
}

export async function renderSoundtrack(film) {
  const len = Math.ceil(film.duration * SR);
  const ctx = new OfflineAudioContext(2, len, SR);
  buildMix(ctx, film);
  const buffer = await ctx.startRendering();
  return { buffer };
}

// Interleaved 16-bit PCM, base64 chunks (the WAV header is written by render.js)
export function encodeWavChunks(buffer, chunkBytes = 4 * 1024 * 1024) {
  const L = buffer.getChannelData(0), R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : L;
  const frames = buffer.length;
  const framesPerChunk = Math.floor(chunkBytes / 4);
  const chunks = [];
  for (let f0 = 0; f0 < frames; f0 += framesPerChunk) {
    const n = Math.min(framesPerChunk, frames - f0);
    const bytes = new Uint8Array(n * 4);
    const dv = new DataView(bytes.buffer);
    for (let i = 0; i < n; i++) {
      const l = Math.max(-1, Math.min(1, L[f0 + i])), r = Math.max(-1, Math.min(1, R[f0 + i]));
      dv.setInt16(i * 4, l * 32767, true);
      dv.setInt16(i * 4 + 2, r * 32767, true);
    }
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    chunks.push(btoa(s));
  }
  return chunks;
}
