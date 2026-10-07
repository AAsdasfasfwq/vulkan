// Real-time preview playback: voice-over (with the inserted gaps) + the
// offline-rendered effects/music track.
import { GAPS, srcToVideo } from '../core/transcript.js';
import { renderSoundtrack } from './mixer.js';

export class Preview {
  constructor(film) {
    this.film = film;
    this.ctx = null;
    this.voice = null;
    this.fx = null;
    this.sources = [];
    this.offset = 0;
    this.status = document.getElementById('status');
    this.fxPromise = null;
  }
  async ensure() {
    if (!this.ctx) this.ctx = new AudioContext({ sampleRate: 48000 });
    if (!this.voice) {
      const ab = await (await fetch('./media/krakatoa.mp3')).arrayBuffer();
      this.voice = await this.ctx.decodeAudioData(ab);
    }
    if (!this.fxPromise) {
      const st = this.status;
      if (st) st.textContent += ' · rendering sound design…';
      this.fxPromise = renderSoundtrack(this.film).then((r) => {
        this.fx = r.buffer;
        if (st) st.textContent = st.textContent.replace(' · rendering sound design…', ' · sound ready');
        if (this.playing) this.startFx(this.time());
      });
    }
  }
  stopAll() {
    for (const s of this.sources) { try { s.stop(); } catch (e) {} }
    this.sources = [];
  }
  startFx(vt) {
    if (!this.fx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.fx;
    s.connect(this.ctx.destination);
    s.start(this.ctx.currentTime, Math.max(0, vt));
    this.sources.push(s);
  }
  async play(vt) {
    await this.ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stopAll();
    const now = this.ctx.currentTime + 0.05;
    this.t0 = now; this.offset = vt;
    // voice segments between gaps
    const cuts = [0, ...GAPS.map((g) => g.at), this.voice.duration];
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1];
      const va = srcToVideo(a + 1e-4) - 1e-4; // video start of this segment
      const vb = va + (b - a);
      if (vb <= vt) continue;
      const s = this.ctx.createBufferSource();
      s.buffer = this.voice;
      const g = this.ctx.createGain(); g.gain.value = 1.6;
      s.connect(g); g.connect(this.ctx.destination);
      const startIn = Math.max(0, va - vt);
      const off = a + Math.max(0, vt - va);
      s.start(now + startIn, off, b - off);
      this.sources.push(s);
    }
    this.playing = true;
    if (this.fx) { const s = this.ctx.createBufferSource(); s.buffer = this.fx; s.connect(this.ctx.destination); s.start(now, vt); this.sources.push(s); }
  }
  stop() { this.playing = false; this.stopAll(); }
  time() { return this.ctx ? this.offset + (this.ctx.currentTime - this.t0) : this.offset; }
}
