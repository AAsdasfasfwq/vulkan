// Overlay helpers used by shots.
import { W, H, PAL } from '../overlay/kit.js';
import { clamp, ease } from '../core/math.js';
import { latLonToVec } from '../geo/geo.js';
import { PLACES } from '../geo/geo.js';
import * as INFO from '../overlay/info.js';

// Pin on the 3D globe
export const gpin = (place, text, at = 0.2, o = {}) => (k, lt, S) => {
  const g = S.film.getSet('globe');
  const ll = Array.isArray(place) ? place : PLACES[place];
  const v = g.worldOf(ll[0], ll[1], 1.01);
  // hide when on the far side
  const cam = S.film.engine.camera.position;
  if (v.clone().normalize().dot(cam.clone().normalize()) < 0.15) return;
  const [x, y, vis] = S.project(v.x, v.y, v.z);
  if (!vis) return;
  k.pin(x, y, text, lt, { start: at, sub: o.sub, dir: o.dir ?? [1, -1], len: o.len ?? 80, color: o.color ?? '#fff', size: o.size ?? 32 });
};

// Label at a 3D point
export const pin3 = (p, text, at = 0.2, o = {}) => (k, lt, S) => {
  const [x, y, vis] = S.project(...p);
  if (!vis) return;
  k.pin(x, y, text, lt, { start: at, sub: o.sub, dir: o.dir ?? [1, -1], len: o.len ?? 80, color: o.color ?? '#fff', size: o.size ?? 32 });
};

// Kinetic word(s) over 3D footage
export const word = (text, at = 0.1, o = {}) => (k, lt) => {
  const out = o.out;
  const a = out !== undefined ? 1 - clamp((lt - out) / 0.25) : 1;
  if (a <= 0) return;
  k.ctx.globalAlpha = a;
  if (o.small) k.kinetic(o.small, o.x ?? W / 2, (o.y ?? H * 0.42) - (o.size ?? 120) * 0.62, lt, { size: o.smallSize ?? 40, weight: 400, family: 'serif', italic: true, color: o.smallColor ?? '#f2ebe2', start: o.smallAt ?? at - 0.05, stagger: 0.02, shadow: { blur: 18, color: 'rgba(0,0,0,0.8)' } });
  k.kinetic(text, o.x ?? W / 2, o.y ?? H * 0.42, lt, { size: o.size ?? 120, weight: 900, color: o.color ?? '#fff', start: at, stagger: o.stagger ?? 0.04, mode: o.mode ?? 'rise', tracking: o.tracking ?? 4, shadow: { blur: 30, color: 'rgba(0,0,0,0.75)' }, align: o.align ?? 'center' });
  k.ctx.globalAlpha = 1;
};

export const tag = (text, at = 0.1, o = {}) => (k, lt) => INFO.tag(k, lt, { text, at, ...o });

// Little lower-left caption (place / date stamp)
export const stamp = (text, sub, at = 0.15) => (k, lt) => {
  const a = ease.out(clamp((lt - at) / 0.4));
  k.ctx.globalAlpha = a;
  k.rect(110, H - 200, 4, 74, PAL.red);
  k.text(text, 132, H - 158, { size: 36, weight: 900, color: '#fff', align: 'left', tracking: 4, shadow: { blur: 14, color: 'rgba(0,0,0,0.8)' } });
  if (sub) k.text(sub, 132, H - 124, { size: 26, weight: 400, family: 'serif', italic: true, color: '#e8e0d8', align: 'left', shadow: { blur: 12, color: 'rgba(0,0,0,0.8)' } });
  k.ctx.globalAlpha = 1;
};

// Arrow drawn between two 3D points (e.g. plate motion)
export const arrow3 = (a, b, at = 0.2, o = {}) => (k, lt, S) => {
  const [x0, y0, v0] = S.project(...a), [x1, y1, v1] = S.project(...b);
  if (!v0 || !v1) return;
  const p = ease.out(clamp((lt - at) / (o.dur ?? 0.6)));
  if (p <= 0) return;
  const flow = ((lt * (o.speed ?? 0.6)) % 1);
  const ex = x0 + (x1 - x0) * p, ey = y0 + (y1 - y0) * p;
  k.path([[x0, y0], [ex, ey]], 1, { width: o.width ?? 10, color: o.color ?? '#fff', glow: 12 });
  k.arrowHead(ex, ey, Math.atan2(y1 - y0, x1 - x0), o.head ?? 24, o.color ?? '#fff');
  // moving chevrons
  for (let i = 0; i < 3; i++) { const f = ((flow + i / 3) % 1) * p; k.arrowHead(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, Math.atan2(y1 - y0, x1 - x0), 10, 'rgba(255,255,255,0.7)'); }
};

// Counter in a corner over 3D
export const counter = (fmt, from, to, at, dur, o = {}) => (k, lt) => {
  const a = ease.out(clamp((lt - at) / 0.3));
  k.ctx.globalAlpha = a;
  const v = k.count(from, to, lt, at, dur, fmt, o.ease ?? 'inOut');
  k.text(v, o.x ?? W / 2, o.y ?? 200, { size: o.size ?? 96, weight: 900, color: o.color ?? '#fff', shadow: { blur: 24, color: 'rgba(0,0,0,0.8)' }, align: o.align ?? 'center' });
  if (o.label) k.text(o.label, o.x ?? W / 2, (o.y ?? 200) + 50, { size: 30, weight: 800, color: o.labelColor ?? PAL.ember, tracking: 8, shadow: { blur: 14, color: 'rgba(0,0,0,0.8)' }, align: o.align ?? 'center' });
  k.ctx.globalAlpha = 1;
};

export { INFO };
