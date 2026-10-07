// Procedural sound design primitives (Web Audio). Deterministic: all noise is seeded.
import { rng } from '../core/math.js';

export class Synth {
  constructor(ctx, dest, reverb) {
    this.ctx = ctx;
    this.dest = dest;     // dry bus
    this.verb = reverb;   // reverb send bus
    this.sr = ctx.sampleRate;
    this.white = this.noiseBuffer('white', 6, 11);
    this.pink = this.noiseBuffer('pink', 6, 12);
    this.brown = this.noiseBuffer('brown', 6, 13);
    this.r = rng(4242);
  }

  noiseBuffer(type, secs, seed) {
    const n = Math.floor(this.sr * secs);
    const b = this.ctx.createBuffer(2, n, this.sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const r = rng(seed * 7 + ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < n; i++) {
        const w = r() * 2 - 1;
        if (type === 'white') d[i] = w;
        else if (type === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
      // crossfade loop seam
      const F = Math.floor(this.sr * 0.05);
      for (let i = 0; i < F; i++) { const k = i / F; d[n - F + i] = d[n - F + i] * (1 - k) + d[i] * k; }
    }
    return b;
  }

  // --- node helpers ---------------------------------------------------------
  src(buf, t, dur, { loop = true, rate = 1, offset = null } = {}) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = loop; s.playbackRate.value = rate;
    const off = offset ?? this.r() * (buf.duration - 0.5);
    s.start(Math.max(0, t), off);
    s.stop(Math.max(0, t) + dur + 0.05);
    return s;
  }
  filt(type, f, q = 0.7, gain = 0) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gain; return b; }
  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  pan(p = 0) { const s = this.ctx.createStereoPanner(); s.pan.value = p; return s; }
  osc(type, f, t, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(Math.max(0, t)); o.stop(Math.max(0, t) + dur + 0.05); return o; }
  // ADSR-ish envelope on a gain param
  env(g, t, a, peak, d, sustain = 0, hold = 0, r = 0.1) {
    const p = g.gain;
    t = Math.max(0, t);
    p.setValueAtTime(0.00001, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (sustain > 0) { p.setTargetAtTime(peak * sustain, t + a, d / 3); p.setValueAtTime(peak * sustain, t + a + hold); p.setTargetAtTime(0.00001, t + a + hold, r / 3); }
    else p.setTargetAtTime(0.00001, t + a, d / 4);
  }
  out(node, { wet = 0.15, panv = 0 } = {}) {
    const p = this.pan(panv);
    node.connect(p);
    p.connect(this.dest);
    if (wet > 0 && this.verb) { const s = this.gain(wet); p.connect(s); s.connect(this.verb); }
    return p;
  }
  rand(a = 0, b = 1) { return a + (b - a) * this.r(); }

  // ---- building blocks ----------------------------------------------------
  noiseHit(t, { buf = this.white, type = 'lowpass', f0 = 1000, f1 = null, q = 0.7, a = 0.005, d = 0.5, peak = 0.5, wet = 0.15, pan = 0, dur = null }) {
    const s = this.src(buf, t, dur ?? a + d * 2);
    const f = this.filt(type, f0, q);
    if (f1) { f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + a + d); }
    const g = this.gain(0);
    s.connect(f); f.connect(g);
    this.env(g, t, a, peak, d);
    this.out(g, { wet, panv: pan });
  }
  tone(t, { type = 'sine', f0 = 440, f1 = null, a = 0.005, d = 0.4, peak = 0.3, wet = 0.15, pan = 0, glide = null, dur = null }) {
    const o = this.osc(type, f0, t, dur ?? a + d * 2);
    if (f1) { o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 10), t + (glide ?? a + d)); }
    const g = this.gain(0);
    o.connect(g);
    this.env(g, t, a, peak, d);
    this.out(g, { wet, panv: pan });
  }
  sub(t, f0 = 60, f1 = 30, d = 1.5, peak = 0.6) { this.tone(t, { f0, f1, a: 0.01, d, peak, wet: 0.05, glide: d }); }
  bellTone(t, base, d = 3, peak = 0.12, wet = 0.4, partials = [1, 2.0, 2.41, 3.01, 4.53, 5.92]) {
    partials.forEach((p, i) => this.tone(t, { f0: base * p, a: 0.002, d: d / (1 + i * 0.5), peak: peak / (1 + i * 0.6), wet }));
  }
  sweep(t, dur, f0, f1, { buf = this.pink, q = 1.2, peak = 0.3, wet = 0.2, pan0 = -0.6, pan1 = 0.6 } = {}) {
    const s = this.src(buf, t, dur + 0.1);
    const f = this.filt('bandpass', f0, q);
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    f.frequency.exponentialRampToValueAtTime(Math.max(f0 * 0.6, 60), t + dur);
    const g = this.gain(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = this.pan(pan0);
    p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur);
    s.connect(f); f.connect(g); g.connect(p); p.connect(this.dest);
    if (wet > 0) { const sg = this.gain(wet); p.connect(sg); sg.connect(this.verb); }
  }
  rumble(t, dur, { f = 110, peak = 0.35, a = 0.4, wet = 0.1, am = 0.6 } = {}) {
    const s = this.src(this.brown, t, dur + 1);
    const lp = this.filt('lowpass', f, 0.7);
    const g = this.gain(0);
    s.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    // slow random amplitude movement
    let tt = t + a;
    while (tt < t + dur) { tt += 0.25 + this.r() * 0.4; g.gain.linearRampToValueAtTime(peak * (1 - am * this.r()), Math.min(tt, t + dur)); }
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    this.out(g, { wet });
  }
  clicks(t, dur, rate, { f = 3000, q = 4, peak = 0.12, jitter = 0.3, decay = 0.012, wet = 0.08, fade = false } = {}) {
    let tt = t;
    while (tt < t + dur) {
      const k = fade ? 1 - (tt - t) / dur : 1;
      this.noiseHit(tt, { type: 'bandpass', f0: f * (0.8 + this.r() * 0.4), q, a: 0.001, d: decay, peak: peak * k * (0.6 + 0.4 * this.r()), wet, pan: this.rand(-0.4, 0.4) });
      tt += (1 / rate) * (1 + (this.r() - 0.5) * jitter);
    }
  }
  chirp(t, f0, f1, d, peak = 0.05, pan = 0) {
    const o = this.osc('sine', f0, t, d + 0.05);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    const fm = this.osc('sine', 35 + this.r() * 30, t, d + 0.05);
    const fg = this.gain(f0 * 0.04);
    fm.connect(fg); fg.connect(o.frequency);
    const g = this.gain(0);
    o.connect(g);
    this.env(g, t, 0.01, peak, d);
    this.out(g, { wet: 0.25, panv: pan });
  }
  thump(t, peak = 0.6, f0 = 90, f1 = 38, d = 0.35) {
    this.tone(t, { f0, f1, a: 0.003, d, peak, wet: 0.05, glide: d * 0.8 });
    this.noiseHit(t, { f0: 300, d: 0.08, peak: peak * 0.4, wet: 0.05 });
  }
}
