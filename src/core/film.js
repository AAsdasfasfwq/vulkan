import * as THREE from 'three';
import { Engine } from './engine.js';
import { parseTranscript, makeFinder, buildCaptions, FPS, GAPS, srcToVideo } from './transcript.js';
import { makeKit, W, H, grainOverlay } from '../overlay/kit.js';
import { drawCard } from '../overlay/cards.js';
import { drawSubtitles } from '../overlay/subtitles.js';
import { clamp } from './math.js';
import { SETS } from '../sets/index.js';
import buildShots from '../shots.js';

const _v = new THREE.Vector3();

export class Film {
  constructor(outCanvas, opts = {}) {
    this.out = outCanvas;
    this.scale = opts.scale ?? 1;
    this.out.width = Math.round(W * this.scale);
    this.out.height = Math.round(H * this.scale);
    this.ctx = this.out.getContext('2d', { alpha: false });
    this.kit = makeKit(this.ctx);
    this.subtitles = opts.subtitles ?? true;
    this.engine = new Engine({ width: this.out.width, height: this.out.height, msaa: opts.msaa });
    this.sets = new Map();
    this.cur = null;
  }

  load(json) {
    const tr = parseTranscript(json);
    this.words = tr.words;
    this.captions = buildCaptions(tr.words);
    const finder = makeFinder(tr.words);
    const A = {
      at: (p, off = 0) => finder.at(p) + off,
      end: (p, off = 0) => finder.end(p) + off,
      peek: (p, off = 0) => finder.peek(p) + off,
      gap: (name) => {
        const g = GAPS.find((x) => x.name === name);
        return srcToVideo(g.at - 1e-4); // video time where the gap begins
      },
      gapDur: (name) => GAPS.find((x) => x.name === name).dur,
      duration: tr.duration,
    };
    const list = buildShots(A).filter(Boolean);
    list.sort((a, b) => a.t - b.t);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      s.index = i;
      s.dur = (i + 1 < list.length ? list[i + 1].t : tr.duration) - s.t;
      s.fx = s.fx || {};
      if (s.tin) s.fx.tin = s.tin;
      // propagate whip-out to the previous shot
      if (s.tin === 'whip' && i > 0 && !list[i - 1].tout) {
        list[i - 1].tout = 'whip';
        list[i - 1].whipDirOut = s.whipDir || 1;
      }
    }
    this.shots = list;
    this.duration = tr.duration;
    this.frames = Math.ceil(tr.duration * FPS);
    return this;
  }

  shotAt(vt) {
    const s = this.shots;
    let lo = 0, hi = s.length - 1, idx = 0;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (s[m].t <= vt) { idx = m; lo = m + 1; } else hi = m - 1;
    }
    return s[idx];
  }

  getSet(name) {
    if (!this.sets.has(name)) {
      const F = SETS[name];
      if (!F) throw new Error('Unknown set ' + name);
      this.sets.set(name, new F(this.engine, this));
    }
    return this.sets.get(name);
  }

  // Preload sets used by shots in a frame range (render workers).
  warm(fromT, toT) {
    for (const s of this.shots) if (s.set && s.t + s.dur >= fromT && s.t <= toT) this.getSet(s.set);
  }

  project(x, y, z) {
    _v.set(x, y, z).project(this.engine.camera);
    return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z < 1 && _v.z > -1];
  }

  renderFrame(frame) {
    const vt = frame / FPS;
    const shot = this.shotAt(vt);
    const lt = vt - shot.t;
    const k = this.kit;
    const ctx = this.ctx;
    const S = { shot, lt, vt, dur: shot.dur, u: clamp(lt / shot.dur), frame, film: this, project: (x, y, z) => this.project(x, y, z) };
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';

    if (shot.set) {
      const set = this.getSet(shot.set);
      if (this.cur !== shot) {
        set.prepare(shot);
        this.cur = shot;
      }
      const fx = { ...(set.fx ? set.fx(shot) : {}), ...shot.fx };
      set.update(shot, lt, vt, fx);
      const nf = set.nearFar ? set.nearFar(shot) : [0.5, 60000];
      const cam = shot.cam || {};
      this.engine.applyCamera(shot, lt, cam.near ?? nf[0], cam.far ?? nf[1]);
      if (set.afterCamera) set.afterCamera(shot, lt, vt, this.engine.camera, fx);
      this.engine.setScene(set.scene);
      this.engine.applyFx(fx, lt, shot.dur, vt);
      this.engine.render();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.engine.glCanvas, 0, 0, this.out.width, this.out.height);
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    } else if (shot.card) {
      this.cur = shot;
      drawCard(k, lt, shot.dur, shot.card);
    } else {
      this.cur = shot;
      ctx.fillStyle = shot.bg || '#000';
      ctx.fillRect(0, 0, W, H);
    }

    if (shot.draw) {
      ctx.save();
      shot.draw(k, lt, S);
      ctx.restore();
      ctx.globalAlpha = 1; ctx.filter = 'none';
    }
    if (!shot.set && !shot.card) {
      // 2D-only shots get their own fades and grain
      const fx = shot.fx || {};
      let fade = 0;
      if (fx.fadeIn) fade = Math.max(fade, 1 - clamp(lt / fx.fadeIn));
      if (fx.fadeOut) fade = Math.max(fade, clamp((lt - (shot.dur - fx.fadeOut)) / fx.fadeOut));
      if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
      for (const f of fx.flashes || []) {
        const d = lt - f.at;
        if (d >= 0) { const a = clamp((f.amp ?? 1) * 0.25 * Math.exp(-d * (f.decay ?? 6))); ctx.fillStyle = `rgba(255,245,230,${a})`; ctx.fillRect(0, 0, W, H); }
      }
      if (fx.grain !== 0) grainOverlay(ctx, frame, fx.grain2d ?? 0.07);
    }
    if (this.subtitles && shot.subs !== false && !shot.card) drawSubtitles(k, vt, this.captions);
    return shot;
  }
}
