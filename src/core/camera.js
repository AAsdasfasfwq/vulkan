import { Vector3, Quaternion, Matrix4, Euler } from 'three';
import { clamp, lerp, getEase, noise1, DEG, ease } from './math.js';

// Evaluates a shot's camera at local time lt (seconds).
// Supported specs:
//   { pos:[p0,p1], look:[l0,l1], fov:[f0,f1]|f, roll:[r0,r1]|r, ease }
//   { orbit:{ c:[x,y,z], r:[r0,r1], az:[a0,a1], el:[e0,e1] }, look?, fov, ease }
//   { fn:(u, lt, shot) => ({ pos:[...], look:[...], fov, roll }) }
// plus: shake (handheld degrees), shakes:[{at, amp, decay, freq}], tin/tout ('whip').
const _v = new Vector3(), _l = new Vector3(), _m = new Matrix4(), _q = new Quaternion(), _e = new Euler();
const UP = new Vector3(0, 1, 0);

const pair = (v) => (Array.isArray(v) && Array.isArray(v[0]) ? v : [v, v]);
const pairN = (v, d) => (v === undefined ? [d, d] : Array.isArray(v) ? v : [v, v]);
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

function bezier3(p, u) {
  // p: array of 3+ points -> Catmull-like smooth path through quadratic bezier
  if (p.length === 2) return lerp3(p[0], p[1], u);
  if (p.length === 3) {
    const a = lerp3(p[0], p[1], u), b = lerp3(p[1], p[2], u);
    return lerp3(a, b, u);
  }
  const a = bezier3(p.slice(0, -1), u), b = bezier3(p.slice(1), u);
  return lerp3(a, b, u);
}

export function evalCamera(shot, lt, out) {
  const c = shot.cam || {};
  const dur = shot.dur;
  const e = getEase(c.ease || 'drift');
  const uRaw = lt / Math.max(dur, 0.001);
  const u = e(clamp(uRaw, -0.2, 1.2));
  let pos, look, fov, roll = 0;
  if (c.fn) {
    const r = c.fn(u, lt, shot, uRaw);
    pos = r.pos; look = r.look; fov = r.fov ?? 40; roll = r.roll ?? 0;
  } else if (c.orbit) {
    const o = c.orbit;
    const r = lerp(...pairN(o.r, 100), u);
    const az = lerp(...pairN(o.az, 0), u) * DEG;
    const el = lerp(...pairN(o.el, 10), u) * DEG;
    const cc = o.c2 ? lerp3(o.c, o.c2, u) : o.c;
    pos = [cc[0] + r * Math.cos(el) * Math.sin(az), cc[1] + r * Math.sin(el), cc[2] + r * Math.cos(el) * Math.cos(az)];
    look = c.look ? (Array.isArray(c.look[0]) ? bezier3(c.look, u) : c.look) : cc;
    if (o.lookOff) look = [look[0] + o.lookOff[0], look[1] + o.lookOff[1], look[2] + o.lookOff[2]];
  } else {
    const P = pair(c.pos || [[0, 2, 10], [0, 2, 9]]);
    const L = pair(c.look || [[0, 0, 0], [0, 0, 0]]);
    pos = bezier3(P, u);
    look = bezier3(L, u);
  }
  if (fov === undefined) fov = lerp(...pairN(c.fov, 40), u);
  if (!c.fn) roll = lerp(...pairN(c.roll, 0), u);

  // Handheld drift + impact shakes (rotations, degrees).
  const t = shot.t + lt;
  const hh = c.shake ?? 0.25;
  let yaw = hh * noise1(t * 0.35, 1) * 1.0;
  let pitch = hh * noise1(t * 0.3, 2) * 0.7;
  let rl = hh * noise1(t * 0.25, 3) * 0.5;
  const shakes = (shot.fx && shot.fx.shakes) || [];
  for (const s of shakes) {
    const d = lt - s.at;
    if (d < 0) continue;
    const k = (s.amp ?? 1) * Math.exp(-d * (s.decay ?? 2.5)) * clamp(d / 0.04);
    const f = s.freq ?? 18;
    yaw += k * noise1(t * f, 11);
    pitch += k * noise1(t * f, 12);
    rl += k * 0.6 * noise1(t * f, 13);
  }
  // Whip transitions
  const W = 0.32;
  if (shot.tin === 'whip' && lt < W) yaw += (shot.whipDir || 1) * 38 * Math.pow(1 - clamp(lt / W), 3);
  if (shot.tout === 'whip' && lt > dur - W) yaw -= (shot.whipDirOut || 1) * 38 * Math.pow(clamp((lt - (dur - W)) / W), 3);
  if (shot.tin === 'push' && lt < 0.4) fov *= 1 + 0.35 * Math.pow(1 - clamp(lt / 0.4), 3);

  _v.set(pos[0], pos[1], pos[2]);
  _l.set(look[0], look[1], look[2]);
  _m.lookAt(_v, _l, UP);
  _q.setFromRotationMatrix(_m);
  _e.set(pitch * DEG, yaw * DEG, (roll + rl) * DEG, 'YXZ');
  const q2 = new Quaternion().setFromEuler(_e);
  _q.multiply(q2);
  out.pos.copy(_v);
  out.quat.copy(_q);
  out.fov = fov;
  out.look.copy(_l);
  return out;
}

export function makeCamState() {
  return { pos: new Vector3(), quat: new Quaternion(), fov: 40, look: new Vector3() };
}
