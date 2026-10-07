// Chronology title cards: pure text on black ("100 YEARS BEFORE").
import { W, H, font } from './kit.js';
import { clamp, ease, lerp } from '../core/math.js';

export function drawCard(k, lt, dur, card) {
  const ctx = k.ctx;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const fadeOut = clamp((dur - lt) / 0.28);
  const main = card.main;            // e.g. "100 YEARS BEFORE"
  const sub = card.sub;              // e.g. "THE ERUPTION" / date
  const size = card.size ?? 132;
  const inU = clamp(lt / 0.9);
  const e = ease.out(inU);
  // tracking collapses from wide to tight; slow push-in over the whole card
  const tracking = lerp(46, 10, ease.expo(clamp(lt / 1.1)));
  const push = 1 + 0.035 * clamp(lt / Math.max(dur, 0.5));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = e * fadeOut;
  const y = sub ? H / 2 + size * 0.22 : H / 2 + size * 0.36;
  // soft glow pass
  if ('filter' in ctx) {
    ctx.save();
    ctx.filter = `blur(${lerp(26, 14, e).toFixed(1)}px)`;
    ctx.globalAlpha *= 0.35;
    k.text(main, W / 2, y, { size, weight: 800, color: card.glow ?? '#ffb27a', tracking });
    ctx.restore();
  }
  if ('filter' in ctx && inU < 1) ctx.filter = `blur(${((1 - e) * 10).toFixed(1)}px)`;
  k.text(main, W / 2, y, { size, weight: 800, color: '#F6F2EC', tracking });
  ctx.filter = 'none';
  if (sub) {
    const su = clamp((lt - (card.subAt ?? 0.35)) / 0.7);
    ctx.globalAlpha = ease.out(su) * fadeOut * 0.78;
    k.text(sub, W / 2, y + 74, { size: 30, weight: 600, color: '#cfc7bc', tracking: lerp(20, 12, ease.out(su)) });
    // thin rule
    const lw = 380 * ease.inOut(clamp((lt - 0.2) / 0.9));
    ctx.globalAlpha = ease.out(su) * fadeOut * 0.5;
    ctx.fillStyle = card.rule ?? '#E2462A';
    ctx.fillRect(W / 2 - lw / 2, y + 26, lw, 2);
  }
  ctx.restore();
}
