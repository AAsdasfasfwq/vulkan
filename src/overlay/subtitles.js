// Burned-in captions in the Zack-D short-phrase style.
import { W, H } from './kit.js';
import { clamp, ease } from '../core/math.js';

export function drawSubtitles(k, vt, caps, style = {}) {
  // binary search the active caption
  let lo = 0, hi = caps.length - 1, idx = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (caps[m].s <= vt) { idx = m; lo = m + 1; } else hi = m - 1;
  }
  if (idx < 0) return;
  const c = caps[idx];
  if (vt > c.hold) return;
  const ctx = k.ctx;
  const txt = c.words.map((w) => w.text).join(' ');
  const age = vt - c.s;
  const pop = 1 + 0.08 * (1 - ease.out(clamp(age / 0.14)));
  const a = clamp(age / 0.06) * clamp((c.hold - vt) / 0.08);
  const y = style.y ?? H * 0.86;
  const size = style.size ?? 50;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W / 2, y);
  ctx.scale(pop, pop);
  k.text(txt, 0, 0, {
    size, weight: 800, color: '#ffffff', tracking: 0.5,
    shadow: { blur: 18, color: 'rgba(0,0,0,0.85)', y: 3 },
    stroke: { width: 5, color: 'rgba(0,0,0,0.55)' },
  });
  ctx.restore();
}
