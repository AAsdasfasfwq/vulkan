// Dev helper: render individual frames to JPG.
// node tools/snap.mjs --frames 0,60,120 --scale 0.5 --out snaps [--times 1.5,30] [--shots] [--chrome path]
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './server.mjs';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes('--' + k);
const root = path.resolve(get('root', 'dist'));
const out = path.resolve(get('out', 'snaps'));
fs.mkdirSync(out, { recursive: true });
const scale = get('scale', '0.5');
const { srv, port } = await serve(root);
const chrome = get('chrome', process.env.CHROME_PATH);
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chrome || undefined,
  protocolTimeout: 0,
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-features=CanvasNoise', ...(has('swiftshader') || process.env.SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])],
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.setViewport({ width: 960, height: 540 });
await page.goto(`http://127.0.0.1:${port}/index.html?render=1&scale=${scale}&msaa=${get('msaa', '4')}${has('nosubs') ? '&subs=0' : ''}`);
await page.waitForFunction('window.__READY || window.__ERROR', { timeout: 0 });
const err = await page.evaluate('window.__ERROR');
if (err) { console.error(err); process.exit(1); }
const info = await page.evaluate(() => ({ frames: KRAKATOA.frames, fps: KRAKATOA.fps, gl: KRAKATOA.gl, shots: KRAKATOA.shots }));
console.log('frames', info.frames, 'gl', info.gl, 'shots', info.shots.length);
let frames = [];
if (get('frames')) frames = get('frames').split(',').map(Number);
if (get('times')) frames = frames.concat(get('times').split(',').map((t) => Math.round(parseFloat(t) * info.fps)));
if (has('shots')) {
  const from = parseFloat(get('from', '0')), to = parseFloat(get('to', '1e9'));
  const pos = parseFloat(get('pos', '0.5'));
  info.shots.forEach((s, i) => { if (s.t >= from && s.t < to) frames.push(Math.round((s.t + s.dur * pos) * info.fps)); });
}
if (get('range')) { const [a, b, st] = get('range').split(':').map(Number); for (let f = a; f < b; f += st || 1) frames.push(f); }
const t0 = Date.now();
for (const f of frames) {
  const t1 = Date.now();
  const url = await page.evaluate((i) => KRAKATOA.frame(i, 0.9), f);
  const fn = path.join(out, `f${String(f).padStart(6, '0')}.jpg`);
  fs.writeFileSync(fn, Buffer.from(url.split(',')[1], 'base64'));
  console.log(fn, (Date.now() - t1) + 'ms');
}
console.log('total', (Date.now() - t0) / 1000, 's');
await browser.close();
srv.close();
