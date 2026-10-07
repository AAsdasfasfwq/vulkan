// 2D drawing kit for overlays, infographics and kinetic typography.
// Everything is laid out in a 1920x1080 design space.
import { clamp, ease, lerp, rng } from '../core/math.js';

export const W = 1920, H = 1080;
export const FONTS = {
  sans: 'Montserrat',
  serif: '"Playfair Display"',
  display: '"Bebas Neue"',
  ui: 'Inter',
};
export const PAL = {
  paper: '#ECE8E1',
  paper2: '#E2DCD2',
  ink: '#151515',
  ink2: '#3A3A3A',
  red: '#E2462A',
  ember: '#FF7A2F',
  gold: '#F5B83D',
  deep: '#0B0F17',
  navy: '#0E1A2B',
  sea: '#123B5A',
  teal: '#2EC4B6',
  white: '#FFFFFF',
  ash: '#8A8580',
};

export function font(size, weight = 800, family = 'sans', italic = false) {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${FONTS[family] || family}`;
}

export function makeKit(ctx) {
  const k = {
    ctx,
    t: 0,
    // ---- primitives ------------------------------------------------------
    save() { ctx.save(); },
    restore() { ctx.restore(); },
    alpha(a) { ctx.globalAlpha = clamp(a); },
    fill(c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); },
    rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); },
    round(x, y, w, h, r, c, stroke) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
      if (c) { ctx.fillStyle = c; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width || 2; ctx.stroke(); }
    },
    circle(x, y, r, c, stroke) {
      ctx.beginPath(); ctx.arc(x, y, Math.max(r, 0), 0, Math.PI * 2);
      if (c) { ctx.fillStyle = c; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width || 2; if (stroke.dash) ctx.setLineDash(stroke.dash); ctx.stroke(); ctx.setLineDash([]); }
    },
    shadow(blur = 30, color = 'rgba(0,0,0,0.35)', ox = 0, oy = 12) {
      ctx.shadowBlur = blur; ctx.shadowColor = color; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy;
    },
    noShadow() { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; },
    // polyline drawn up to progress p (0..1)
    path(pts, p = 1, { width = 4, color = '#fff', dash = null, cap = 'round', glow = 0 } = {}) {
      if (pts.length < 2 || p <= 0) return;
      let total = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
      let rem = total * clamp(p);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      let end = pts[0];
      for (let i = 1; i < pts.length && rem > 0; i++) {
        const d = seg[i - 1];
        if (rem >= d) { ctx.lineTo(pts[i][0], pts[i][1]); end = pts[i]; rem -= d; }
        else { const u = rem / d; end = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; ctx.lineTo(end[0], end[1]); rem = 0; }
      }
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = cap; ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      if (glow) { ctx.shadowBlur = glow; ctx.shadowColor = color; }
      ctx.stroke();
      ctx.setLineDash([]);
      if (glow) k.noShadow();
      return end;
    },
    arc(x, y, r, a0, a1, p = 1, opts = {}) {
      const pts = []; const n = 64;
      for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      return k.path(pts, p, opts);
    },
    // great-circle-ish curved arc between two points (bulge)
    curve(a, b, bulge, p = 1, opts = {}) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const cx = mx - dy * bulge, cy = my + dx * bulge;
      const pts = [];
      for (let i = 0; i <= 64; i++) { const u = i / 64; pts.push([(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]]); }
      return k.path(pts, p, opts);
    },
    arrowHead(x, y, ang, size, color) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.7, size * 0.65); ctx.lineTo(-size * 0.35, 0); ctx.lineTo(-size * 0.7, -size * 0.65); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.restore();
    },
    // ---- text ------------------------------------------------------------
    text(str, x, y, o = {}) {
      const size = o.size ?? 48;
      ctx.font = font(size, o.weight ?? 800, o.family ?? 'sans', o.italic);
      ctx.textAlign = o.align ?? 'center';
      ctx.textBaseline = o.baseline ?? 'alphabetic';
      ctx.fillStyle = o.color ?? '#fff';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.tracking ?? 0}px`;
      if (o.shadow) k.shadow(o.shadow.blur ?? 24, o.shadow.color ?? 'rgba(0,0,0,0.6)', o.shadow.x ?? 0, o.shadow.y ?? 4);
      if (o.glow) { ctx.shadowBlur = o.glow; ctx.shadowColor = o.glowColor ?? o.color ?? '#fff'; }
      if (o.stroke) { ctx.lineWidth = o.stroke.width; ctx.strokeStyle = o.stroke.color; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
      ctx.fillText(str, x, y);
      if (o.shadow || o.glow) k.noShadow();
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    },
    measure(str, o = {}) {
      ctx.font = font(o.size ?? 48, o.weight ?? 800, o.family ?? 'sans', o.italic);
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.tracking ?? 0}px`;
      const w = ctx.measureText(str).width;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      return w;
    },
    // Kinetic per-letter reveal. mode: rise | drop | scale | blur | type | track
    kinetic(str, x, y, lt, o = {}) {
      const start = o.start ?? 0, stagger = o.stagger ?? 0.035, dur = o.dur ?? 0.45;
      const size = o.size ?? 64;
      const out = o.out; // {at, dur}
      const fo = { ...o, align: 'left' };
      const chars = [...str];
      const widths = chars.map((c) => k.measure(c, fo));
      const tr = o.tracking ?? 0;
      const total = widths.reduce((a, b) => a + b, 0) + tr * (chars.length - 1);
      let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
      const mode = o.mode ?? 'rise';
      for (let i = 0; i < chars.length; i++) {
        const lt0 = lt - start - i * stagger;
        let u = clamp(lt0 / dur);
        let a = ease.out(u);
        if (out) a *= 1 - ease.inOut(clamp((lt - out.at - i * (out.stagger ?? 0.012)) / (out.dur ?? 0.3)));
        if (a <= 0.001) { cx += widths[i] + tr; continue; }
        ctx.save();
        const e = ease.out(u);
        let dx = 0, dy = 0, sc = 1, blur = 0;
        if (mode === 'rise') dy = (1 - e) * size * 0.55;
        else if (mode === 'drop') dy = -(1 - e) * size * 0.55;
        else if (mode === 'scale') sc = lerp(1.8, 1, ease.out(u));
        else if (mode === 'blur') { blur = (1 - e) * 18; sc = lerp(1.15, 1, e); }
        else if (mode === 'type') a = u > 0 ? 1 : 0;
        else if (mode === 'track') dx = (i - chars.length / 2) * (1 - e) * size * 0.25;
        ctx.globalAlpha *= a;
        if (blur > 0.5 && 'filter' in ctx) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        const px = cx + widths[i] / 2 + dx, py = y + dy;
        ctx.translate(px, py); ctx.scale(sc, sc);
        k.text(chars[i], 0, 0, { ...o, align: 'center' });
        ctx.restore();
        cx += widths[i] + tr;
      }
      return total;
    },
    // Rolling number counter
    count(from, to, lt, start, dur, fmt = (v) => Math.round(v).toLocaleString('en-US'), e = 'out') {
      const u = clamp((lt - start) / dur);
      return fmt(lerp(from, to, (ease[e] || ease.out)(u)));
    },
    // Map/screen label pin with leader line
    pin(x, y, label, lt, o = {}) {
      const start = o.start ?? 0;
      const u = clamp((lt - start) / 0.5);
      if (u <= 0) return;
      const e = ease.out(u);
      const col = o.color ?? '#fff';
      const dot = o.dot ?? 7;
      ctx.save();
      ctx.globalAlpha *= o.alpha ?? 1;
      // pulse
      const pr = dot + ((lt - start) % 1.6) * 22;
      k.circle(x, y, pr, null, { color: col, width: 2 * (1 - ((lt - start) % 1.6) / 1.6) });
      k.circle(x, y, dot * e, col);
      const dir = o.dir ?? [1, -1];
      const len = (o.len ?? 70) * e;
      const ex = x + dir[0] * len * 0.7, ey = y + dir[1] * len * 0.7;
      k.path([[x, y], [ex, ey], [ex + dir[0] * len * 0.6, ey]], e, { width: 2, color: col });
      const tx = ex + dir[0] * (len * 0.6 + 10);
      ctx.globalAlpha *= clamp((lt - start - 0.2) / 0.35);
      k.text(label, tx, ey + (o.size ?? 30) * 0.35, { size: o.size ?? 30, weight: o.weight ?? 800, color: col, align: dir[0] > 0 ? 'left' : 'right', tracking: o.tracking ?? 2, shadow: o.shadow ?? { blur: 12, color: 'rgba(0,0,0,0.7)' } });
      if (o.sub) k.text(o.sub, tx, ey + (o.size ?? 30) * 0.35 + 30, { size: 22, weight: 500, family: 'serif', italic: true, color: col, align: dir[0] > 0 ? 'left' : 'right', shadow: { blur: 10, color: 'rgba(0,0,0,0.7)' } });
      ctx.restore();
    },
    // Background helpers
    bgPaper(seed = 1) {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 100, W * 0.5, H * 0.5, W * 0.75);
      g.addColorStop(0, '#F4F1EC'); g.addColorStop(1, '#D9D3C9');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    bgDark(c1 = '#16181D', c2 = '#050506') {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.7);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    vignette(a = 0.55) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
  };
  return k;
}

// Pre-rendered grain tiles for 2D-only frames.
let GRAIN = null;
export function grainOverlay(ctx, frame, amount = 0.06) {
  if (!GRAIN) {
    GRAIN = [];
    for (let n = 0; n < 4; n++) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const id = g.createImageData(256, 256);
      const r = rng(99 + n);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = (r() * 255) | 0;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      GRAIN.push(c);
    }
  }
  const tile = GRAIN[frame % 4];
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  const ox = ((frame * 73) % 256), oy = ((frame * 151) % 256);
  ctx.translate(-ox, -oy);
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}
