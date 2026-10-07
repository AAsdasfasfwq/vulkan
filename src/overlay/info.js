// Infographic building blocks (canvas 2D). All take (k, lt, S, o).
import { W, H, PAL, font } from './kit.js';
import { clamp, ease, lerp, rng, smoothstep, fract } from '../core/math.js';

const E = ease;
const appear = (lt, a, d = 0.5) => E.out(clamp((lt - a) / d));

// ---------------------------------------------------------------------------
export function headline(k, lt, S, o) {
  // Editorial typography: small italic serif line + big bold sans word(s)
  const ctx = k.ctx;
  if (o.bg === 'paper') k.bgPaper();
  else if (o.bg === 'ember') emberBg(k, lt);
  else if (o.bg === 'dark') k.bgDark();
  const col = o.bg === 'paper' ? PAL.ink : '#fff';
  const y = o.y ?? H / 2;
  if (o.small) k.kinetic(o.small, W / 2, y - (o.size ?? 150) * 0.62, lt, { size: 44, weight: 400, family: 'serif', italic: true, color: o.bg === 'paper' ? PAL.ink2 : '#d8d0c8', start: o.smallAt ?? 0, stagger: 0.02, mode: 'rise' });
  k.kinetic(o.big, W / 2, y + (o.size ?? 150) * 0.35, lt, { size: o.size ?? 150, weight: 900, color: o.accentBig ? PAL.red : col, start: o.bigAt ?? 0.15, stagger: 0.045, mode: o.mode ?? 'rise', tracking: o.tracking ?? 2 });
  if (o.sub) k.kinetic(o.sub, W / 2, y + (o.size ?? 150) * 0.35 + 80, lt, { size: 34, weight: 600, color: o.bg === 'paper' ? PAL.ink2 : '#cfc7bc', start: o.subAt ?? 0.6, stagger: 0.015, tracking: 6 });
}

export function emberBg(k, lt, c1 = '#7a160c', c2 = '#1a0403') {
  const ctx = k.ctx;
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 80, W * 0.5, H * 0.5, W * 0.75);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // diagonal light streaks like the reference
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ff9a6a';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 380 + lt * 30) % (W + 600)) - 300;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 120, 0); ctx.lineTo(x - 260, H); ctx.lineTo(x - 380, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // floating embers
  const r = rng(3);
  for (let i = 0; i < 60; i++) {
    const x = r() * W, sp = 20 + r() * 40;
    const y = H - ((lt * sp + r() * H) % (H + 40));
    const a = 0.3 + 0.5 * Math.sin(lt * 3 + i);
    k.circle(x + Math.sin(lt + i) * 10, y, 1.5 + r() * 2.5, `rgba(255,${120 + r() * 80},60,${a * 0.6})`);
  }
}

// Big number (counts up) with unit line, e.g. 200 MEGATONS OF TNT
export function bigNumber(k, lt, S, o) {
  const ctx = k.ctx;
  if (o.bg === 'ember') emberBg(k, lt);
  else if (o.bg === 'paper') k.bgPaper();
  else if (o.bg !== 'none') k.bgDark();
  const col = o.bg === 'paper' ? PAL.ink : '#fff';
  const val = k.count(o.from ?? 0, o.to, lt, o.at ?? 0.1, o.dur ?? 1.2, o.fmt ?? ((v) => Math.round(v).toLocaleString('en-US')));
  const sc = 1 + 0.06 * (1 - E.out(clamp((lt - (o.at ?? 0.1)) / 0.6)));
  ctx.save();
  ctx.translate(W / 2, (o.y ?? H / 2) + 40);
  ctx.scale(sc, sc);
  ctx.globalAlpha = appear(lt, o.at ?? 0.05, 0.3);
  k.text((o.prefix ?? '') + val + (o.suffix ?? ''), 0, 0, { size: o.size ?? 280, weight: 900, color: o.color ?? col, tracking: -4, glow: o.bg === 'ember' ? 40 : 0, glowColor: 'rgba(255,120,60,0.6)' });
  ctx.restore();
  if (o.unit) k.kinetic(o.unit, W / 2, (o.y ?? H / 2) + 150, lt, { size: 54, weight: 800, color: o.unitColor ?? (o.bg === 'paper' ? PAL.red : PAL.ember), start: (o.at ?? 0.1) + 0.4, stagger: 0.03, tracking: 8 });
  if (o.small) k.kinetic(o.small, W / 2, (o.y ?? H / 2) - (o.size ?? 280) * 0.62, lt, { size: 40, weight: 400, family: 'serif', italic: true, color: o.bg === 'paper' ? PAL.ink2 : '#e8d8cc', start: 0, stagger: 0.02 });
  if (o.note) k.kinetic(o.note, W / 2, (o.y ?? H / 2) + 220, lt, { size: 30, weight: 500, family: 'serif', italic: true, color: o.bg === 'paper' ? PAL.ink2 : '#d8c8bc', start: (o.at ?? 0.1) + 0.9, stagger: 0.012 });
}

// Atmosphere layer chart with a rising eruption column
export function altitude(k, lt, S, o) {
  const ctx = k.ctx;
  const maxKm = o.max ?? 50;
  const y0 = H - 90, y1 = 70;
  const Y = (km) => lerp(y0, y1, km / maxKm);
  // sky gradient by altitude
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#8fb6d8'); g.addColorStop(0.3, '#3d6fa8'); g.addColorStop(0.7, '#16294d'); g.addColorStop(1, '#05070f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars high up
  const r = rng(2);
  for (let i = 0; i < 120; i++) { const x = r() * W, y = r() * Y(maxKm * 0.6); k.circle(x, y, r() * 1.4, `rgba(255,255,255,${0.2 + r() * 0.6})`); }
  // layers
  const layers = [[0, 12, 'TROPOSPHERE'], [12, 50, 'STRATOSPHERE'], [50, 85, 'MESOSPHERE']];
  for (const [a, b, name] of layers) {
    if (a >= maxKm) continue;
    const ya = Y(a), yb = Y(Math.min(b, maxKm));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([6, 10]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(W, yb); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.85;
    k.text(name, W - 60, (ya + yb) / 2 + 10, { size: 28, weight: 800, color: '#fff', align: 'right', tracking: 8, shadow: { blur: 10 } });
    ctx.globalAlpha = 1;
  }
  // ruler
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const step = maxKm > 40 ? 10 : 5;
  for (let km = 0; km <= maxKm; km += step) {
    const y = Y(km);
    ctx.fillRect(110, y - 1, 26, 2);
    k.text(`${km} km`, 96, y + 9, { size: 22, weight: 700, color: '#fff', align: 'right', shadow: { blur: 8 } });
    k.text(`${Math.round(km * 0.621)} mi`, 150, y + 9, { size: 18, weight: 500, color: 'rgba(255,255,255,0.7)', align: 'left' });
  }
  // ground & sea
  ctx.fillStyle = '#0d2a44'; ctx.fillRect(0, y0, W, H - y0);
  // references: Everest + airliner
  if (o.refs !== false) {
    const ex = 420, ey = Y(8.85);
    ctx.fillStyle = '#e8ecf0'; ctx.beginPath(); ctx.moveTo(ex - 170, y0); ctx.lineTo(ex - 40, ey + 40); ctx.lineTo(ex, ey); ctx.lineTo(ex + 50, ey + 50); ctx.lineTo(ex + 180, y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b6b7a'; ctx.beginPath(); ctx.moveTo(ex - 170, y0); ctx.lineTo(ex - 40, ey + 40); ctx.lineTo(ex - 10, ey + 120); ctx.lineTo(ex - 60, y0); ctx.closePath(); ctx.fill();
    k.text('EVEREST 8.8 km', ex, ey - 20, { size: 22, weight: 800, color: '#fff', shadow: { blur: 8 } });
    const ax = 640, ay = Y(11);
    k.text('✈', ax, ay + 12, { size: 40, weight: 400, family: 'ui', color: '#fff' });
    k.text('AIRLINERS 11 km', ax, ay - 26, { size: 20, weight: 700, color: '#fff', shadow: { blur: 8 } });
  }
  // eruption column
  const topKm = lerp(0, o.km, E.out(clamp((lt - (o.at ?? 0.2)) / (o.dur ?? 2.2))));
  const cx = o.x ?? 1150;
  const yt = Y(topKm);
  // volcano
  ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.moveTo(cx - 220, y0); ctx.lineTo(cx - 30, y0 - 70); ctx.lineTo(cx + 30, y0 - 70); ctx.lineTo(cx + 220, y0); ctx.closePath(); ctx.fill();
  if (topKm > 0.1) {
    ctx.save();
    for (let i = 0; i < 70; i++) {
      const f = i / 70;
      const y = lerp(y0 - 70, yt, f);
      const w = lerp(30, 140 + (o.umbrella ? 260 * smoothstep(0.75, 1, f) : 0), Math.pow(f, 0.8));
      const wob = Math.sin(f * 20 + lt * 2) * 10;
      const c = Math.floor(lerp(40, 85, f));
      ctx.fillStyle = `rgba(${c},${c - 6},${c - 10},0.9)`;
      ctx.beginPath(); ctx.ellipse(cx + wob, y, w, 26 + f * 20, 0, 0, Math.PI * 2); ctx.fill();
    }
    const gl = ctx.createRadialGradient(cx, y0 - 70, 5, cx, y0 - 70, 160);
    gl.addColorStop(0, 'rgba(255,140,40,0.9)'); gl.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - 200, y0 - 230, 400, 230);
    ctx.restore();
    // height marker
    ctx.strokeStyle = PAL.ember; ctx.lineWidth = 3; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(cx + 180, yt); ctx.lineTo(cx + 380, yt); ctx.stroke(); ctx.setLineDash([]);
    k.text(`${topKm.toFixed(0)} km`, cx + 400, yt + 16, { size: 54, weight: 900, color: '#fff', align: 'left', shadow: { blur: 16 } });
    k.text(`${(topKm * 0.621).toFixed(0)} miles`, cx + 400, yt + 56, { size: 28, weight: 600, color: PAL.gold, align: 'left', shadow: { blur: 10 } });
  }
}

// Grid of N dots filling progressively (e.g. 10,000 Hiroshimas)
export function dotGrid(k, lt, S, o) {
  const ctx = k.ctx;
  if (o.bg === 'paper') k.bgPaper(); else k.bgDark('#1a1210', '#060404');
  const cols = o.cols ?? 125, rows = o.rows ?? 80;
  const N = cols * rows;
  const gw = o.w ?? 1240, gh = gw * (rows / cols);
  const x0 = (W - gw) / 2 + (o.dx ?? 140), y0 = (H - gh) / 2 + 40;
  const cell = gw / cols;
  const p = E.inOut(clamp((lt - (o.at ?? 0.3)) / (o.dur ?? 2.5)));
  const filled = Math.floor(N * p);
  // first dot highlight
  ctx.fillStyle = o.bg === 'paper' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  for (let i = 0; i < N; i++) { const x = x0 + (i % cols) * cell, y = y0 + Math.floor(i / cols) * cell; ctx.fillRect(x, y, cell * 0.7, cell * 0.7); }
  ctx.fillStyle = o.color ?? PAL.ember;
  for (let i = 0; i < filled; i++) { const x = x0 + (i % cols) * cell, y = y0 + Math.floor(i / cols) * cell; ctx.fillRect(x, y, cell * 0.7, cell * 0.7); }
  // legend: one dot = Hiroshima
  const lx = 200, ly = H / 2;
  const a = appear(lt, 0, 0.4);
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fff'; ctx.fillRect(lx - 14, ly - 140, 28, 28);
  k.text('= 1', lx + 30, ly - 116, { size: 32, weight: 800, color: '#fff', align: 'left' });
  k.text('HIROSHIMA', lx - 20, ly - 70, { size: 30, weight: 900, color: '#fff', align: 'left', tracking: 4 });
  k.text('bomb, 1945', lx - 20, ly - 36, { size: 26, weight: 400, family: 'serif', italic: true, color: '#d8c8bc', align: 'left' });
  ctx.globalAlpha = 1;
  const n = Math.round(10000 * p);
  k.text('×' + n.toLocaleString('en-US'), lx - 20, ly + 80, { size: 86, weight: 900, color: PAL.ember, align: 'left', glow: 20, glowColor: 'rgba(255,120,60,0.5)' });
}

// Horizontal bar comparison
export function bars(k, lt, S, o) {
  const ctx = k.ctx;
  if (o.bg === 'paper') k.bgPaper(); else emberBg(k, lt, '#2a0c08', '#080202');
  const ink = o.bg === 'paper' ? PAL.ink : '#fff';
  const items = o.items;
  const max = Math.max(...items.map((i) => i.v));
  const x0 = 520, wMax = 1200, y0 = H / 2 - (items.length - 1) * 75;
  if (o.title) k.kinetic(o.title, W / 2, 140, lt, { size: 46, weight: 900, color: ink, tracking: 6, stagger: 0.02 });
  items.forEach((it, i) => {
    const a = it.at ?? 0.2 + i * 0.5;
    const p = E.out(clamp((lt - a) / 1.0));
    const y = y0 + i * 150;
    ctx.globalAlpha = appear(lt, a - 0.1, 0.3);
    k.text(it.label, x0 - 40, y + 14, { size: 40, weight: 900, color: ink, align: 'right', tracking: 2 });
    if (it.sub) k.text(it.sub, x0 - 40, y + 50, { size: 24, weight: 400, family: 'serif', italic: true, color: o.bg === 'paper' ? PAL.ink2 : '#d0c0b0', align: 'right' });
    const w = Math.max(6, (it.v / max) * wMax * p);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, it.c0 ?? '#ff9a3a'); g.addColorStop(1, it.c1 ?? '#e2462a');
    k.shadow(20, 'rgba(0,0,0,0.35)', 0, 8);
    k.round(x0, y - 30, w, 60, 8, g);
    k.noShadow();
    k.text(it.valueText ?? `${it.v}`, x0 + w + 24, y + 16, { size: 40, weight: 900, color: ink, align: 'left' });
    ctx.globalAlpha = 1;
  });
}

// Decibel ladder
export function decibels(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgDark('#14161c', '#040406');
  const items = [[0, 'Silence'], [60, 'Conversation'], [110, 'Rock concert'], [140, 'Jet engine at 30 m'], [180, 'Rocket launch'], [194, 'Loudest possible undistorted sound'], [310, 'KRAKATOA (estimated at source)']];
  const x0 = 300, x1 = 1700, yb = H - 200;
  const X = (db) => lerp(x0, x1, db / 320);
  k.text('LOUDNESS (dB)', W / 2, 140, { size: 44, weight: 900, color: '#fff', tracking: 10 });
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x0, yb, x1 - x0, 3);
  items.forEach(([db, label], i) => {
    const a = (o.at ?? 0.2) + i * 0.32;
    const p = E.out(clamp((lt - a) / 0.6));
    if (p <= 0) return;
    const x = X(db);
    const h = lerp(30, 520, db / 320) * p;
    const isK = i === items.length - 1;
    const g = ctx.createLinearGradient(0, yb - h, 0, yb);
    g.addColorStop(0, isK ? '#ff5a1a' : '#6fb8ff'); g.addColorStop(1, isK ? '#7a1a08' : '#1d3a6a');
    k.shadow(isK ? 40 : 10, isK ? 'rgba(255,90,30,0.6)' : 'rgba(0,0,0,0.4)', 0, 0);
    k.round(x - 26, yb - h, 52, h, 6, g);
    k.noShadow();
    ctx.globalAlpha = p;
    k.text(`${db}`, x, yb - h - 18, { size: isK ? 64 : 36, weight: 900, color: isK ? PAL.ember : '#fff' });
    ctx.save(); ctx.translate(x, yb + 24); ctx.rotate(-0.0);
    k.text(label, 0, 26, { size: isK ? 26 : 20, weight: isK ? 900 : 600, color: isK ? PAL.ember : '#cfd6de', align: 'center' });
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

// Strip chart (barograph) with pressure spikes
export function barograph(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgPaper();
  const x0 = 160, x1 = 1760, y0 = 300, rowH = 200;
  const p = clamp((lt - 0.2) / (o.dur ?? 3.0));
  const cities = o.cities ?? ['LONDON', 'PARIS', 'NEW YORK'];
  k.text('BAROMETRIC PRESSURE · AUG 27 – SEP 1, 1883', W / 2, 160, { size: 34, weight: 900, color: PAL.ink, tracking: 4 });
  cities.forEach((c, ci) => {
    const yc = y0 + ci * rowH + 60;
    ctx.strokeStyle = 'rgba(120,90,60,0.25)'; ctx.lineWidth = 1;
    for (let gx = x0; gx <= x1; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, yc - 70); ctx.lineTo(gx, yc + 70); ctx.stroke(); }
    for (let gy = -60; gy <= 60; gy += 20) { ctx.beginPath(); ctx.moveTo(x0, yc + gy); ctx.lineTo(x1, yc + gy); ctx.stroke(); }
    k.text(c, x0 - 20, yc + 10, { size: 26, weight: 900, color: PAL.ink, align: 'right' });
    const pts = [];
    const n = Math.floor(400 * p);
    for (let i = 0; i <= n; i++) {
      const u = i / 400;
      const day = u * 5;
      let y = Math.sin(day * 3.3 + ci) * 6;
      for (let pass = 0; pass < 7; pass++) {
        const tp = 0.3 + ci * 0.06 + pass * 0.72;
        const d = (day - tp) / 0.025;
        y -= Math.exp(-d * d) * (48 - pass * 6) * Math.cos(d * 2.2);
      }
      pts.push([lerp(x0, x1, u), yc + y]);
    }
    k.path(pts, 1, { width: 3, color: '#2a3a7a' });
  });
  for (let d = 0; d <= 5; d++) k.text(`DAY ${d}`, lerp(x0, x1, d / 5), y0 + cities.length * rowH + 40, { size: 20, weight: 700, color: PAL.ink2 });
}

// Wave vs 12-storey building comparison
export function waveScale(k, lt, S, o) {
  const ctx = k.ctx;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c9d8e2'); g.addColorStop(1, '#eef1f2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const yb = H - 120, mPerPx = 40 / 700;
  const Y = (m) => yb - m / mPerPx;
  ctx.fillStyle = '#d9c9a2'; ctx.fillRect(0, yb, W, H - yb);
  // building (12 storeys)
  const bx = 1150, bw = 230;
  const bp = E.out(clamp((lt - 0.1) / 0.8));
  const bh = 37 / mPerPx * bp;
  k.shadow(30, 'rgba(0,0,0,0.25)', 10, 0);
  ctx.fillStyle = '#7d8a96'; ctx.fillRect(bx, yb - bh, bw, bh);
  k.noShadow();
  for (let f = 0; f < 12; f++) for (let c = 0; c < 4; c++) { const y = yb - (f + 1) * (37 / 12 / mPerPx) + 12; if (yb - y > bh) continue; ctx.fillStyle = (f + c) % 3 ? '#cfe3f2' : '#f6d48a'; ctx.fillRect(bx + 18 + c * 53, y, 36, 22); }
  // person scale
  ctx.fillStyle = '#222'; ctx.fillRect(bx - 60, yb - 1.8 / mPerPx, 10, 1.8 / mPerPx);
  k.circle(bx - 55, yb - 1.8 / mPerPx - 6, 6, '#222');
  // wave
  const wp = E.out(clamp((lt - (o.at ?? 0.8)) / 1.4));
  const wh = 40 / mPerPx * wp;
  const wx = lerp(-300, 760, wp);
  ctx.save();
  const wg = ctx.createLinearGradient(0, yb - wh, 0, yb);
  wg.addColorStop(0, '#2f8fa8'); wg.addColorStop(1, '#0d3a52');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(-50, yb);
  ctx.lineTo(-50, yb - wh * 0.7);
  ctx.bezierCurveTo(wx - 300, yb - wh * 0.95, wx - 60, yb - wh * 1.05, wx + 40, yb - wh * 0.86);
  ctx.bezierCurveTo(wx + 110, yb - wh * 0.7, wx + 60, yb - wh * 0.55, wx + 20, yb - wh * 0.6);
  ctx.bezierCurveTo(wx + 120, yb - wh * 0.3, wx + 160, yb - wh * 0.1, wx + 220, yb);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 40; i++) { const f = i / 40; k.circle(lerp(wx - 260, wx + 60, f) + Math.sin(i * 3) * 10, yb - wh * (0.9 + 0.12 * Math.sin(i * 1.7 + lt * 3)), 6 + (i % 5) * 3, 'rgba(255,255,255,0.8)'); }
  ctx.restore();
  // labels
  ctx.globalAlpha = wp;
  ctx.strokeStyle = PAL.red; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(80, Y(40)); ctx.lineTo(W - 80, Y(40)); ctx.stroke(); ctx.setLineDash([]);
  k.text('40 m · 130 ft', W - 90, Y(40) - 20, { size: 46, weight: 900, color: PAL.red, align: 'right' });
  ctx.globalAlpha = bp;
  k.text('12-STOREY BUILDING', bx + bw / 2, yb + 60, { size: 26, weight: 900, color: PAL.ink, tracking: 3 });
  ctx.globalAlpha = 1;
}

// People icon grid counter (36,000)
export function peopleCount(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgDark('#121315', '#030304');
  const cols = 60, rows = 20;
  const p = E.inOut(clamp((lt - 0.3) / (o.dur ?? 2.5)));
  const cw = 24, x0 = (W - cols * cw) / 2, y0 = 430;
  for (let i = 0; i < cols * rows; i++) {
    const x = x0 + (i % cols) * cw, y = y0 + Math.floor(i / cols) * 28;
    const on = i < cols * rows * p;
    const c = on ? 'rgba(226,70,42,0.95)' : 'rgba(255,255,255,0.12)';
    k.circle(x + 8, y, 4.5, c);
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x + 2, y + 6, 12, 14, 4); ctx.fill();
  }
  const n = Math.round(lerp(0, o.to ?? 36000, p));
  k.text((o.prefix ?? '') + n.toLocaleString('en-US') + (o.plus ? '+' : ''), W / 2, 300, { size: 170, weight: 900, color: '#fff' });
  k.text(o.label ?? 'LIVES LOST', W / 2, 370, { size: 34, weight: 800, color: PAL.red, tracking: 14 });
}

// Temperature anomaly chart
export function tempChart(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgPaper();
  const x0 = 220, x1 = 1700, yc = 560, sy = 260;
  k.text('GLOBAL TEMPERATURE CHANGE', W / 2, 150, { size: 42, weight: 900, color: PAL.ink, tracking: 6 });
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
  const years = [1880, 1881, 1882, 1883, 1884, 1885, 1886, 1887, 1888];
  years.forEach((y, i) => k.text(String(y), lerp(x0, x1, i / 8), yc + 300, { size: 22, weight: 700, color: PAL.ink2 }));
  const p = E.inOut(clamp((lt - 0.2) / (o.dur ?? 2.5)));
  const f = (u) => { const yr = 1880 + u * 8; const d = yr - 1883.7; return 0.05 * Math.sin(yr * 5) - (d > 0 ? 1.2 * (d / 0.8) * Math.exp(1 - d / 0.8) : 0); };
  const pts = [];
  for (let i = 0; i <= 200 * p; i++) { const u = i / 200; pts.push([lerp(x0, x1, u), yc - f(u) * sy]); }
  const end = k.path(pts, 1, { width: 6, color: '#2a6fd6' });
  // fill below
  if (pts.length > 2) { ctx.beginPath(); ctx.moveTo(pts[0][0], yc); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.lineTo(pts[pts.length - 1][0], yc); ctx.closePath(); ctx.fillStyle = 'rgba(42,111,214,0.15)'; ctx.fill(); }
  if (end) k.circle(end[0], end[1], 9, '#2a6fd6');
  const mp = appear(lt, (o.dur ?? 2.5) * 0.75, 0.6);
  ctx.globalAlpha = mp;
  const mx = lerp(x0, x1, (1884.5 - 1880) / 8), my = yc + 1.2 * sy;
  k.text('−1.2 °C', mx + 30, my + 20, { size: 72, weight: 900, color: '#2a6fd6', align: 'left' });
  k.text('(−2.2 °F)', mx + 34, my + 64, { size: 30, weight: 600, color: PAL.ink2, align: 'left' });
  ctx.globalAlpha = 1;
}

// Year / growth chart for Anak Krakatau
export function growth(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgDark('#14181c', '#050607');
  const data = [[1927, 0], [1930, 25], [1950, 140], [1970, 200], [1990, 260], [2010, 320], [2018, 338]];
  const x0 = 260, x1 = 1660, yb = 860, sy = 1.7;
  const p = E.inOut(clamp((lt - 0.2) / (o.dur ?? 2.6)));
  k.text('ANAK KRAKATAU · HEIGHT ABOVE SEA', W / 2, 150, { size: 38, weight: 900, color: '#fff', tracking: 6 });
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x0, yb, x1 - x0, 2);
  const X = (y) => lerp(x0, x1, (y - 1927) / 91);
  for (const [y] of data) k.text(String(y), X(y), yb + 44, { size: 22, weight: 700, color: '#9aa4ae' });
  // cone silhouettes growing
  const cur = lerp(1927, 2018, p);
  for (const [y, h] of data) {
    if (y > cur) break;
    const x = X(y), hh = h * sy;
    ctx.fillStyle = y === 2018 ? '#3a2a22' : 'rgba(80,70,64,0.6)';
    ctx.beginPath(); ctx.moveTo(x - hh * 0.9 - 20, yb); ctx.lineTo(x - 8, yb - hh); ctx.lineTo(x + 8, yb - hh); ctx.lineTo(x + hh * 0.9 + 20, yb); ctx.closePath(); ctx.fill();
    k.text(`${h} m`, x, yb - hh - 16, { size: 22, weight: 800, color: '#fff' });
  }
  const rp = appear(lt, (o.dur ?? 2.6) * 0.6, 0.5);
  ctx.globalAlpha = rp;
  k.text('≈ 5 m / year', W / 2, 300, { size: 90, weight: 900, color: PAL.ember });
  k.text('(16 feet)', W / 2, 350, { size: 30, weight: 600, color: '#d8c8bc' });
  ctx.globalAlpha = 1;
}

// Vintage excursion poster
export function poster(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgDark('#2a2018', '#0e0a06');
  const pw = 760, ph = 980;
  const x = W / 2 - pw / 2, y = H / 2 - ph / 2 + 30;
  const a = appear(lt, 0, 0.5);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.03 + 0.03 * (1 - a));
  ctx.scale(0.92 + 0.08 * a, 0.92 + 0.08 * a);
  ctx.translate(-W / 2, -H / 2);
  k.shadow(50, 'rgba(0,0,0,0.6)', 0, 20);
  ctx.fillStyle = '#efe2c4'; ctx.fillRect(x, y, pw, ph);
  k.noShadow();
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 6; ctx.strokeRect(x + 24, y + 24, pw - 48, ph - 48);
  ctx.lineWidth = 2; ctx.strokeRect(x + 38, y + 38, pw - 76, ph - 76);
  k.text('EXCURSION', W / 2, y + 150, { size: 96, weight: 700, family: 'serif', color: '#2a1e12' });
  k.text('— TO THE —', W / 2, y + 205, { size: 30, weight: 700, family: 'serif', italic: true, color: '#6a1d14' });
  k.text('KRAKATAU', W / 2, y + 320, { size: 120, weight: 900, color: '#9a1a12', tracking: 6 });
  k.text('VOLCANO IN ERUPTION', W / 2, y + 380, { size: 36, weight: 800, color: '#2a1e12', tracking: 6 });
  // engraving of volcano
  ctx.fillStyle = '#2a1e12';
  ctx.beginPath(); ctx.moveTo(x + 140, y + 700); ctx.lineTo(W / 2 - 30, y + 480); ctx.lineTo(W / 2 + 30, y + 480); ctx.lineTo(x + pw - 140, y + 700); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 9; i++) k.circle(W / 2 + Math.sin(i * 1.7 + lt) * 30, y + 470 - i * 22, 26 + i * 6, `rgba(42,30,18,${0.9 - i * 0.08})`);
  ctx.strokeStyle = '#2a1e12'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + 60, y + 720 + i * 12); ctx.lineTo(x + pw - 60, y + 720 + i * 12); ctx.stroke(); }
  k.text('S.S. LOUDON · DEPARTS BATAVIA', W / 2, y + 830, { size: 28, weight: 800, color: '#2a1e12', tracking: 3 });
  k.text('SUNDAY 27 MAY 1883 · 25 GUILDERS', W / 2, y + 875, { size: 26, weight: 600, family: 'serif', italic: true, color: '#6a1d14' });
  ctx.restore();
}

// Calendar page flipping
export function calendar(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgDark('#1c1612', '#060504');
  const days = o.days ?? 60;
  const p = clamp((lt - 0.2) / (S.dur - 0.5));
  const d = Math.floor(days * E.inOut(p));
  const date = new Date(Date.UTC(1883, 5, 26 + d));
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const cw = 520, ch = 600, x = W / 2 - cw / 2, y = H / 2 - ch / 2;
  k.shadow(40, 'rgba(0,0,0,0.6)', 0, 16);
  ctx.fillStyle = '#f2ece2'; ctx.fillRect(x, y, cw, ch);
  k.noShadow();
  ctx.fillStyle = '#9a1a12'; ctx.fillRect(x, y, cw, 140);
  k.text(months[date.getUTCMonth()], W / 2, y + 92, { size: 52, weight: 900, color: '#fff', tracking: 8 });
  k.text(String(date.getUTCDate()), W / 2, y + 430, { size: 260, weight: 900, color: '#1a1714' });
  k.text('1883', W / 2, y + 540, { size: 36, weight: 700, color: '#6a5a4a', tracking: 10 });
  for (let i = 0; i < 2; i++) k.circle(x + 140 + i * 240, y + 8, 14, '#222');
  // falling pages
  const frac = fract(days * E.inOut(p));
  ctx.save();
  ctx.globalAlpha = 1 - frac;
  ctx.translate(W / 2, y + 140);
  ctx.rotate(frac * 0.6);
  ctx.fillStyle = '#e8e0d4'; ctx.fillRect(-cw / 2, frac * 300, cw, ch - 140);
  ctx.restore();
}

// Ten-minute timer ring with boom pulses
export function timerRing(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgDark('#1a1210', '#050302');
  const cx = W / 2, cy = H / 2 - 20, R = 260;
  const cyc = (lt / (o.period ?? 1.4)) % 1;
  ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = PAL.ember; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + cyc * Math.PI * 2); ctx.stroke();
  const boom = Math.exp(-cyc * 8);
  k.circle(cx, cy, R * (1 + (1 - Math.exp(-cyc * 3)) * 0.8), null, { color: `rgba(255,120,60,${boom})`, width: 6 });
  const mins = Math.floor(10 - cyc * 10), secs = Math.floor((1 - cyc) * 600) % 60;
  k.text(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, cx, cy + 50, { size: 150, weight: 900, color: '#fff' });
  k.text('EVERY 10 MINUTES', cx, cy + R + 100, { size: 40, weight: 900, color: PAL.ember, tracking: 10 });
}

// Spreading crack lines over the frame
export function cracks(k, lt, S, o) {
  const ctx = k.ctx;
  const p = E.out(clamp((lt - (o.at ?? 0.2)) / (o.dur ?? 1.4)));
  if (p <= 0) return;
  const r = rng(o.seed ?? 3);
  const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  const branch = (x, y, a, len, depth) => {
    let px = x, py = y;
    const segs = 8;
    ctx.lineWidth = Math.max(0.6, depth * 1.2);
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 0; i < segs; i++) {
      if ((i + 1) / segs > p * 1.2) break;
      a += (r() - 0.5) * 0.6;
      px += Math.cos(a) * len / segs; py += Math.sin(a) * len / segs;
      ctx.lineTo(px, py);
      if (depth > 1 && r() < 0.3) { ctx.stroke(); branch(px, py, a + (r() - 0.5) * 1.6, len * 0.5, depth - 1); ctx.beginPath(); ctx.moveTo(px, py); }
    }
    ctx.stroke();
  };
  for (let i = 0; i < (o.n ?? 9); i++) branch(cx, cy, (i / (o.n ?? 9)) * Math.PI * 2 + r() * 0.4, 500 + r() * 600, 3);
  ctx.restore();
}

// Circular telescope vignette
export function scope(k, lt, S, o = {}) {
  const ctx = k.ctx;
  const R = o.r ?? 430;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2, true); ctx.fill('evenodd');
  const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.75, W / 2, H / 2, R);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W / 2 - R, H / 2); ctx.lineTo(W / 2 + R, H / 2); ctx.moveTo(W / 2, H / 2 - R); ctx.lineTo(W / 2, H / 2 + R); ctx.stroke();
  ctx.restore();
}

// Labels for things in a 3D scene: [{ p:[x,y,z], text, sub, at, dir }]
export function labels3D(k, lt, S, list) {
  for (const l of list) {
    const [x, y, vis] = S.project(...l.p);
    if (!vis) continue;
    k.pin(x, y, l.text, lt, { start: l.at ?? 0.2, sub: l.sub, dir: l.dir ?? [1, -1], len: l.len ?? 70, color: l.color ?? '#fff', size: l.size ?? 30 });
  }
}

// Lower-third style caption block (used over 3D)
export function tag(k, lt, o) {
  const ctx = k.ctx;
  const a = appear(lt, o.at ?? 0.1, 0.4) * (o.out !== undefined ? 1 - clamp((lt - o.out) / 0.3) : 1);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  const x = o.x ?? 120, y = o.y ?? 150;
  const w = k.measure(o.text, { size: o.size ?? 54, weight: 900, tracking: 4 }) + 60;
  ctx.fillStyle = o.bgc ?? 'rgba(226,70,42,0.92)';
  ctx.fillRect(x, y - (o.size ?? 54) * 0.95, w * E.out(clamp((lt - (o.at ?? 0.1)) / 0.35)), (o.size ?? 54) * 1.3);
  k.text(o.text, x + 30, y, { size: o.size ?? 54, weight: 900, color: '#fff', align: 'left', tracking: 4 });
  if (o.sub) k.text(o.sub, x + 4, y + 52, { size: 30, weight: 500, family: 'serif', italic: true, color: '#fff', align: 'left', shadow: { blur: 12, color: 'rgba(0,0,0,0.8)' } });
  ctx.restore();
}

// Modern-world icons row (steam/telegraph -> internet / AI / Mars rover)
export function iconsRow(k, lt, S, o) {
  const ctx = k.ctx;
  k.bgPaper();
  const items = o.items;
  const n = items.length;
  items.forEach((it, i) => {
    const a = it.at ?? 0.2 + i * 0.45;
    const p = E.back(clamp((lt - a) / 0.5));
    if (p <= 0) return;
    const x = W / 2 + (i - (n - 1) / 2) * 380, y = H / 2 - 40;
    ctx.save();
    ctx.translate(x, y); ctx.scale(p, p);
    k.shadow(40, 'rgba(0,0,0,0.18)', 0, 18);
    k.circle(0, 0, 130, it.old ? '#d8d0c4' : '#fff');
    k.noShadow();
    drawIcon(ctx, it.icon, it.old ? '#6a5a4a' : PAL.red);
    ctx.restore();
    ctx.globalAlpha = clamp((lt - a - 0.2) / 0.4);
    k.text(it.label, x, y + 210, { size: 34, weight: 900, color: it.old ? '#8a7a6a' : PAL.ink, tracking: 3 });
    if (it.old && lt > (it.strike ?? 99)) { const sp = E.out(clamp((lt - it.strike) / 0.3)); ctx.fillStyle = PAL.red; ctx.fillRect(x - 130, y + 196, 260 * sp, 6); }
    ctx.globalAlpha = 1;
  });
}

function drawIcon(ctx, name, c) {
  ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (name === 'steam') { ctx.fillRect(-70, -10, 110, 60); ctx.fillRect(30, -60, 26, 60); ctx.beginPath(); ctx.arc(-40, 62, 22, 0, 6.28); ctx.arc(20, 62, 22, 0, 6.28); ctx.fill(); ctx.beginPath(); ctx.arc(40, -80, 18, 0, 6.28); ctx.arc(64, -96, 14, 0, 6.28); ctx.fill(); }
  else if (name === 'telegraph') { ctx.beginPath(); ctx.moveTo(-80, 50); ctx.lineTo(80, 50); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-50, 30); ctx.lineTo(40, -10); ctx.stroke(); ctx.beginPath(); ctx.arc(50, -16, 18, 0, 6.28); ctx.fill(); ctx.font = '900 40px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('· — ·', 0, -50); }
  else if (name === 'internet') { ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.28); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 30, 70, 0, 0, 6.28); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.moveTo(-60, -35); ctx.lineTo(60, -35); ctx.moveTo(-60, 35); ctx.lineTo(60, 35); ctx.lineWidth = 8; ctx.stroke(); }
  else if (name === 'ai') { ctx.lineWidth = 8; ctx.strokeRect(-55, -55, 110, 110); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-80, i * 30); ctx.lineTo(-55, i * 30); ctx.moveTo(55, i * 30); ctx.lineTo(80, i * 30); ctx.moveTo(i * 30, -80); ctx.lineTo(i * 30, -55); ctx.moveTo(i * 30, 55); ctx.lineTo(i * 30, 80); ctx.stroke(); } ctx.font = '900 54px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('AI', 0, 20); }
  else if (name === 'rover') { ctx.fillRect(-60, -20, 120, 40); ctx.fillRect(-10, -70, 12, 50); ctx.fillRect(-30, -86, 52, 22); for (const x of [-50, 0, 50]) { ctx.beginPath(); ctx.arc(x, 45, 18, 0, 6.28); ctx.fill(); } ctx.fillRect(40, -50, 50, 10); }
}
