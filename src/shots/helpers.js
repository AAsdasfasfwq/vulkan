// Helpers for authoring the shot list.
import { DEG, lerp, clamp, ease } from '../core/math.js';
import { PEAKS } from '../world/island.js';

export const LEAD = 0.12; // cut slightly before the word lands

export const K = {
  rakata: [PEAKS.rakata[0], 813, PEAKS.rakata[1]],
  danan: [PEAKS.danan[0], 450, PEAKS.danan[1]],
  perb: [PEAKS.perboewatan[0], 120, PEAKS.perboewatan[1]],
  mid: [0, 300, 0],
  centre: [-100, 60, -600],
};

export function card(t, main, sub, extra = {}) {
  return { t, card: { main, sub, ...(extra.card || {}) }, subs: false, sfx: [['cardHit', 0.0], ['tickTock', 0.15]], amb: 'none', name: 'card ' + main, ...extra };
}

// Camera: straight dolly between two points (with look targets)
export const dolly = (p0, p1, l0, l1 = l0, fov = 40, ease = 'drift', more = {}) => ({ pos: [p0, p1], look: [l0, l1], fov, ease, ...more });
// Camera: orbit around c
export const orbit = (c, r, az, el, fov = 40, ease = 'drift', more = {}) => ({ orbit: { c, r, az, el }, fov, ease, ...more });

// Ship-relative camera (follows a moving ship). ship: { pos:[x,z], heading, speed }
export function onShip(ship, off0, off1, look0, look1 = look0, fov = 42, more = {}) {
  const h = (ship.heading ?? 0) * DEG, sp = ship.speed ?? 0;
  const W = (x, z, v) => [x + Math.cos(h) * v[0] + Math.sin(h) * v[2], v[1], z - Math.sin(h) * v[0] + Math.cos(h) * v[2]];
  return {
    fn: (u, lt) => {
      const x = ship.pos[0] + Math.cos(h) * sp * lt, z = ship.pos[1] - Math.sin(h) * sp * lt;
      const e = ease.inOut(clamp(u, 0, 1)) * 0.6 + clamp(u, 0, 1) * 0.4;
      const o = [lerp(off0[0], off1[0], e), lerp(off0[1], off1[1], e), lerp(off0[2], off1[2], e)];
      const l = [lerp(look0[0], look1[0], e), lerp(look0[1], look1[1], e), lerp(look0[2], look1[2], e)];
      return { pos: W(x, z, o), look: l.length === 3 && more.lookWorld ? l : W(x, z, l), fov: more.fov1 ? lerp(fov, more.fov1, e) : fov };
    },
    shake: more.shake ?? 0.35,
  };
}

export const shot = (t, set, cam, p = {}, extra = {}) => ({ t, set, cam, p, ...extra });

// A 2D-only shot
export const flat = (t, draw, extra = {}) => ({ t, draw, ...extra });

// Merge draw functions
export const both = (...fns) => (k, lt, S) => { for (const f of fns) if (f) { k.ctx.save(); f(k, lt, S); k.ctx.restore(); } };
