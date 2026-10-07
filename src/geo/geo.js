import { feature } from 'topojson-client';
import land50 from 'world-atlas/land-50m.json';
import land10json from 'world-atlas/land-10m.json';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { makeNoise, clamp, smoothstep } from '../core/math.js';

export const LAND50 = feature(land50, land50.objects.land);
let LAND10 = null;
export function land10() {
  if (!LAND10) LAND10 = feature(land10json, land10json.objects.land);
  return LAND10;
}

// Cities and places used throughout the film [lat, lon]
export const PLACES = {
  krakatoa: [-6.1, 105.42],
  batavia: [-6.2, 106.82],
  anjer: [-6.06, 105.88],
  merak: [-5.93, 106.0],
  telokbetong: [-5.43, 105.26],
  london: [51.5, -0.12],
  paris: [48.86, 2.35],
  newyork: [40.71, -74.0],
  boston: [42.36, -71.06],
  lisbon: [38.72, -9.14],
  moscow: [55.75, 37.62],
  rodrigues: [-19.7, 63.42],
  singapore: [1.29, 103.85],
  bombay: [19.07, 72.88],
  aden: [12.8, 45.03],
  suez: [29.97, 32.55],
  malta: [35.9, 14.5],
  gibraltar: [36.14, -5.35],
  valentia: [51.9, -10.35],
  heartscontent: [47.87, -53.37],
  madras: [13.08, 80.27],
  darwin: [-12.46, 130.84],
  adelaide: [-34.93, 138.6],
  hongkong: [22.3, 114.17],
  shanghai: [31.23, 121.47],
  alexandria: [31.2, 29.9],
  capetown: [-33.92, 18.42],
  rio: [-22.9, -43.2],
  sanfrancisco: [37.77, -122.42],
  tokyo: [35.68, 139.76],
};

// Telegraph network of the early 1880s (approximate routes)
export const CABLES = [
  ['valentia', 'heartscontent'], ['heartscontent', 'newyork'], ['newyork', 'boston'], ['london', 'valentia'], ['london', 'paris'],
  ['london', 'lisbon'], ['lisbon', 'gibraltar'], ['gibraltar', 'malta'], ['malta', 'alexandria'], ['alexandria', 'suez'],
  ['suez', 'aden'], ['aden', 'bombay'], ['bombay', 'madras'], ['madras', 'singapore'], ['singapore', 'batavia'],
  ['batavia', 'darwin'], ['darwin', 'adelaide'], ['singapore', 'hongkong'], ['hongkong', 'shanghai'], ['shanghai', 'tokyo'],
  ['lisbon', 'rio'], ['london', 'moscow'], ['aden', 'capetown'], ['newyork', 'sanfrancisco'],
];

// Equirectangular Earth albedo texture (canvas), stylised but natural.
export function earthTexture(W = 4096, H = 2048, style = 'natural') {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.2);
  const path = geoPath(proj, ctx);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); path(LAND50); ctx.fill();
  const mask = ctx.getImageData(0, 0, W, H);
  const out = ctx.createImageData(W, H);
  const nz = makeNoise(5);
  const d = mask.data, o = out.data;
  // low-res noise grids, bilinearly sampled
  const GW = 1024, GH = 512;
  const gA = new Float32Array(GW * GH), gB = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    gA[y * GW + x] = nz.fbm2(x * 0.016, y * 0.016, 4) * 0.5 + 0.5;
    gB[y * GW + x] = nz.n2(x * 0.08, y * 0.08) * 0.5 + 0.5;
  }
  const samp = (g, x, y) => {
    const fx = (x / W) * (GW - 1), fy = (y / H) * (GH - 1);
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(x0 + 1, GW - 1), y1 = Math.min(y0 + 1, GH - 1);
    const tx = fx - x0, ty = fy - y0;
    return (g[y0 * GW + x0] * (1 - tx) + g[y0 * GW + x1] * tx) * (1 - ty) + (g[y1 * GW + x0] * (1 - tx) + g[y1 * GW + x1] * tx) * ty;
  };
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y / H) * 180;
    const al = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lon = (x / W) * 360 - 180;
      const m = d[i] / 255;
      const n = samp(gA, x, y);
      const n2 = samp(gB, x, y);
      // ocean
      let r = 6 + 10 * n, g = 30 + 26 * n, b = 70 + 40 * n;
      const shelf = 0;
      if (m > 0.02) {
        // biome by latitude + noise
        let lr, lg, lb;
        const desert = smoothstep(14, 24, al) * (1 - smoothstep(32, 40, al)) * smoothstep(0.35, 0.6, n + (lon > -20 && lon < 60 ? 0.25 : 0) + (lon > 110 && lon < 150 && lat < 0 ? 0.25 : 0));
        const tropic = 1 - smoothstep(10, 22, al);
        const boreal = smoothstep(50, 62, al);
        lr = 60 + 30 * n; lg = 90 + 40 * n; lb = 40 + 15 * n; // temperate
        lr = lr * (1 - tropic) + (25 + 20 * n) * tropic; lg = lg * (1 - tropic) + (80 + 40 * n) * tropic; lb = lb * (1 - tropic) + (25 + 10 * n) * tropic;
        lr = lr * (1 - desert) + (190 + 30 * n2) * desert; lg = lg * (1 - desert) + (155 + 25 * n2) * desert; lb = lb * (1 - desert) + (100 + 20 * n2) * desert;
        lr = lr * (1 - boreal) + (55 + 20 * n) * boreal; lg = lg * (1 - boreal) + (75 + 20 * n) * boreal; lb = lb * (1 - boreal) + (55 + 10 * n) * boreal;
        const ice = smoothstep(66, 74, al + n * 6);
        lr = lr * (1 - ice) + 235 * ice; lg = lg * (1 - ice) + 240 * ice; lb = lb * (1 - ice) + 245 * ice;
        r = r * (1 - m) + lr * m; g = g * (1 - m) + lg * m; b = b * (1 - m) + lb * m;
      } else {
        const ice = smoothstep(72, 80, al + n * 8);
        r = r * (1 - ice) + 230 * ice; g = g * (1 - ice) + 236 * ice; b = b * (1 - ice) + 242 * ice;
      }
      o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  // coastline accents
  ctx.strokeStyle = 'rgba(160,190,200,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); path(LAND50); ctx.stroke();
  return c;
}

export function latLonToVec(lat, lon, r = 1) {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
}
