// 2D cartography (d3-geo on canvas) for strait / world maps.
import { geoMercator, geoPath, geoGraticule10, geoDistance, geoInterpolate, geoCircle } from 'd3-geo';
import { LAND50, land10, PLACES } from '../geo/geo.js';
import { W, H, PAL, font } from './kit.js';
import { clamp, ease, lerp, keys } from '../core/math.js';

const regionCache = new Map();
function bboxOfRing(ring) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, y] of ring) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
  return [a, b, c, d];
}
// Land polygons intersecting a lon/lat box (pre-filtered for speed).
export function regionLand(box, hi = false) {
  const key = box.join(',') + hi;
  if (regionCache.has(key)) return regionCache.get(key);
  const src = hi ? land10() : LAND50;
  const polys = [];
  for (const f of src.features) {
    const g = f.geometry;
    const list = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const p of list) {
      const [a, b, c, d] = bboxOfRing(p[0]);
      if (c >= box[0] && a <= box[2] && d >= box[1] && b <= box[3]) polys.push(p);
    }
  }
  const geo = { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: polys } };
  regionCache.set(key, geo);
  return geo;
}

const THEMES = {
  night: { sea0: '#10233a', sea1: '#060c16', land0: '#2e4a33', land1: '#1d3324', coast: 'rgba(170,215,190,0.75)', grid: 'rgba(120,170,210,0.08)', label: '#ffffff', sub: '#b9c9d6', accent: '#ff6a2a' },
  paper: { sea0: '#e6e1d8', sea1: '#d6cfc3', land0: '#bfb39b', land1: '#a99c82', coast: 'rgba(60,45,30,0.6)', grid: 'rgba(60,50,40,0.08)', label: '#151515', sub: '#4a4038', accent: '#E2462A' },
  ash: { sea0: '#2a2a2c', sea1: '#121214', land0: '#4a4642', land1: '#34312e', coast: 'rgba(220,210,200,0.5)', grid: 'rgba(200,200,200,0.06)', label: '#ffffff', sub: '#c8c0b6', accent: '#ff7a2f' },
};

// Draws a map. view: { center:[lon,lat] | keys, scale | keys }, region box for land filtering.
export function drawMap(k, lt, S, o) {
  const ctx = k.ctx;
  const th = THEMES[o.theme ?? 'night'];
  const u = clamp(lt / S.dur);
  const cen = Array.isArray(o.center[0]) ? keys(o.center.map((v, i) => [i / (o.center.length - 1), v]), ease.inOut(u), 'lin') : o.center;
  const sc = Array.isArray(o.scale) ? keys(o.scale.map((v, i) => [i / (o.scale.length - 1), v]), ease.inOut(u), 'lin') : o.scale;
  const proj = geoMercator().center(cen).scale(sc).translate([W / 2, H / 2]).clipExtent([[-10, -10], [W + 10, H + 10]]);
  const path = geoPath(proj, ctx);
  // sea
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, th.sea0); g.addColorStop(1, th.sea1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // graticule
  ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = th.grid; ctx.lineWidth = 1; ctx.stroke();
  // land with lift shadow
  const land = o.box ? regionLand(o.box, o.hi) : LAND50;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
  const lg = ctx.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, th.land0); lg.addColorStop(1, th.land1);
  ctx.beginPath(); path(land); ctx.fillStyle = lg; ctx.fill();
  ctx.restore();
  ctx.beginPath(); path(land); ctx.strokeStyle = th.coast; ctx.lineWidth = 1.4; ctx.stroke();
  const P = (ll) => proj([ll[1], ll[0]]);
  const ctxObj = { proj, P, path, th, u };
  if (o.extra) o.extra(k, lt, S, ctxObj);
  return ctxObj;
}

// Geodesic circle of radius km around a [lat, lon]
export function drawRadius(k, ctxObj, ll, km, p, o = {}) {
  const ctx = k.ctx;
  const circ = geoCircle().center([ll[1], ll[0]]).radius((km / 6371) * (180 / Math.PI) * clamp(p)).precision(2)();
  ctx.beginPath(); ctxObj.path(circ);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  ctx.setLineDash(o.dash ?? [10, 8]);
  ctx.strokeStyle = o.color ?? 'rgba(255,120,60,0.9)'; ctx.lineWidth = o.width ?? 2.5; ctx.stroke();
  ctx.setLineDash([]);
}

// Great-circle route drawn progressively
export function drawRoute(k, ctxObj, a, b, p, o = {}) {
  const ip = geoInterpolate([a[1], a[0]], [b[1], b[0]]);
  const pts = [];
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const q = ctxObj.proj(ip(i / n));
    if (q) pts.push(q);
  }
  const end = k.path(pts, p, { width: o.width ?? 3.5, color: o.color ?? '#ff7a2f', dash: o.dash, glow: o.glow ?? 14 });
  if (end && p > 0.02 && p < 1 && o.head !== false) k.circle(end[0], end[1], 7, '#fff');
  return end;
}

export function placeXY(ctxObj, name) {
  return ctxObj.P(PLACES[name] || name);
}
