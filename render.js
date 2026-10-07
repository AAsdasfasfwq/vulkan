#!/usr/bin/env node
// Krakatoa 1883 — offline renderer.
// Renders every frame deterministically in headless Chrome (Puppeteer) at 30 fps,
// renders the Web Audio sound design offline, mixes it with the voice-over
// (including the inserted explosion pauses) and encodes a YouTube-ready MP4.
//
//   node render.js                       full film, 1920x1080, 30 fps -> out/krakatoa.mp4
//   node render.js --start 430 --end 460 render only a part (seconds of the final video)
//   node render.js --workers 3           parallel browser workers (faster on strong GPUs/CPUs)
//   node render.js --scale 0.5           quick 960x540 preview render
//   node render.js --no-subs             without burned-in subtitles
//   node render.js --headful             show the browser window (some Windows GPUs need this for hardware WebGL)
//   node render.js --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { serve } from './tools/server.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);
if (flag('help') || flag('h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n'));
  process.exit(0);
}

const OUT = path.resolve(ROOT, opt('out', 'out/krakatoa.mp4'));
const TMP = path.resolve(path.dirname(OUT), '.render-tmp');
const SCALE = parseFloat(opt('scale', '1'));
const WORKERS = Math.max(1, parseInt(opt('workers', '1'), 10));
const CRF = opt('crf', '16');
const PRESET = opt('preset', 'slow');
const JPEGQ = parseFloat(opt('quality', '0.93'));
const MSAA = opt('msaa', '4');
const VOICE_GAIN_DB = parseFloat(opt('voice-gain', '13.5'));
const SFX_GAIN = parseFloat(opt('sfx-gain', '1.0'));
const SUBS = !flag('no-subs');
fs.mkdirSync(TMP, { recursive: true });

let FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
try { const m = await import('ffmpeg-static'); if (m.default && fs.existsSync(m.default)) FFMPEG = m.default; } catch {}

const log = (...a) => console.log('[render]', ...a);
const fmtT = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + 'h ' : '') + m + 'm ' + String(x).padStart(2, '0') + 's'; };

function run(cmd, args, { quiet = false } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', quiet ? 'ignore' : 'inherit', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-20000); });
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(cmd + ' failed (' + c + '):\n' + err.slice(-3000)))));
  });
}

// ---------------------------------------------------------------- build
if (!flag('no-build')) {
  log('building with Vite…');
  const { build } = await import('vite');
  await build({ root: ROOT, logLevel: 'warn' });
}
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('dist/ missing — run "npm run build"'); process.exit(1); }
const { srv, port } = await serve(DIST);

// ---------------------------------------------------------------- browser
const chromeArgs = [
  '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb',
];
if (process.platform === 'linux') chromeArgs.push('--no-sandbox');
if (opt('angle')) chromeArgs.push('--use-angle=' + opt('angle'));
if (flag('swiftshader')) chromeArgs.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');

async function openPage() {
  const browser = await puppeteer.launch({
    headless: !flag('headful'),
    executablePath: opt('chrome', process.env.CHROME_PATH) || undefined,
    protocolTimeout: 0,
    args: chromeArgs,
    defaultViewport: { width: 1280, height: 720 },
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  const url = `http://127.0.0.1:${port}/index.html?render=1&scale=${SCALE}&msaa=${MSAA}${SUBS ? '' : '&subs=0'}`;
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  await page.waitForFunction('window.__READY || window.__ERROR', { timeout: 0 });
  const err = await page.evaluate('window.__ERROR');
  if (err) throw new Error(err);
  return { browser, page };
}

const first = await openPage();
const info = await first.page.evaluate(() => ({ frames: KRAKATOA.frames, fps: KRAKATOA.fps, duration: KRAKATOA.duration, gaps: KRAKATOA.gaps, gl: KRAKATOA.gl, shots: KRAKATOA.shots.length }));
log(`film: ${info.duration.toFixed(2)} s, ${info.frames} frames @ ${info.fps} fps, ${info.shots} shots`);
log(`WebGL renderer: ${info.gl}`);
if (/swiftshader|llvmpipe|software/i.test(info.gl)) log('WARNING: software WebGL detected — rendering will be very slow. Try --headful, --angle d3d11 (Windows) or --angle vulkan, or a desktop Chrome via --chrome.');

const FPS = info.fps;
const f0 = Math.max(0, Math.floor(parseFloat(opt('start', '0')) * FPS));
const f1 = Math.min(info.frames, Math.ceil(parseFloat(opt('end', String(info.duration))) * FPS));
const total = f1 - f0;

// ---------------------------------------------------------------- audio
const sfxWav = path.join(TMP, 'sfx.wav');
const audioTask = (async () => {
  if (flag('skip-audio')) return;
  if (fs.existsSync(sfxWav) && flag('reuse-audio')) { log('reusing', sfxWav); return; }
  log('rendering sound design (Web Audio, offline)…');
  const t = Date.now();
  const a = await first.page.evaluate(() => KRAKATOA.audio());
  const fd = fs.openSync(sfxWav, 'w');
  const dataBytes = a.length * 4;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataBytes, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(a.sampleRate, 24);
  h.writeUInt32LE(a.sampleRate * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(dataBytes, 40);
  fs.writeSync(fd, h);
  for (let i = 0; i < a.chunks; i++) {
    const b64 = await first.page.evaluate((k) => KRAKATOA.audioChunk(k), i);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  log(`sound design done in ${((Date.now() - t) / 1000).toFixed(1)} s`);
})();
await audioTask;

// ---------------------------------------------------------------- video
let done = 0;
const tStart = Date.now();
let lastPrint = 0;
function progress() {
  const now = Date.now();
  if (now - lastPrint < 1000 && done < total) return;
  lastPrint = now;
  const el = (now - tStart) / 1000;
  const rate = done / Math.max(el, 0.001);
  const eta = (total - done) / Math.max(rate, 1e-6);
  process.stdout.write(`\r[render] ${done}/${total} frames  ${(100 * done / total).toFixed(1)}%  ${rate.toFixed(2)} fps  elapsed ${fmtT(el)}  ETA ${fmtT(eta)}     `);
}

async function renderRange(worker, a, b, segFile) {
  const { page, browser } = worker;
  await page.evaluate((x, y) => KRAKATOA.warm(x, y), a, b);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film', '-r', String(FPS), '-movflags', '+faststart', segFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  for (let i = a; i < b; i++) {
    const url = await page.evaluate((k, q) => KRAKATOA.frame(k, q), i, JPEGQ);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    done++;
    progress();
  }
  ff.stdin.end();
  await closed;
}

const segs = [];
const per = Math.ceil(total / WORKERS);
const workers = [first];
for (let w = 1; w < WORKERS; w++) workers.push(await openPage());
log(`rendering frames ${f0}–${f1} with ${WORKERS} worker(s)…`);
await Promise.all(workers.map((wk, w) => {
  const a = f0 + w * per, b = Math.min(f1, a + per);
  if (a >= b) return null;
  const seg = path.join(TMP, `seg_${String(w).padStart(2, '0')}.mp4`);
  segs.push(seg);
  return renderRange(wk, a, b, seg);
}));
process.stdout.write('\n');
for (const w of workers) await w.browser.close();
srv.close();
segs.sort();

// ---------------------------------------------------------------- concat + mux
const videoOnly = path.join(TMP, 'video.mp4');
if (segs.length === 1) fs.copyFileSync(segs[0], videoOnly);
else {
  const list = path.join(TMP, 'segments.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', videoOnly]);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (flag('skip-audio')) {
  fs.copyFileSync(videoOnly, OUT);
} else {
  log('mixing voice-over + sound design…');
  const voice = path.join(ROOT, 'public', 'media', 'krakatoa.mp3');
  const t0 = f0 / FPS, t1 = f1 / FPS;
  // voice-over with the inserted pauses
  const cuts = [0, ...info.gaps.map((g) => g.at)];
  const n = cuts.length;
  let fc = `[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=${n}${cuts.map((_, i) => `[v${i}]`).join('')};`;
  const parts = [];
  cuts.forEach((c, i) => {
    const end = i + 1 < n ? `:end=${cuts[i + 1]}` : '';
    fc += `[v${i}]atrim=start=${c}${end},asetpts=PTS-STARTPTS[s${i}];`;
    parts.push(`[s${i}]`);
    if (i + 1 < n) { fc += `aevalsrc=0|0:d=${info.gaps[i].dur}:s=48000[z${i}];`; parts.push(`[z${i}]`); }
  });
  fc += `${parts.join('')}concat=n=${parts.length}:v=0:a=1[vo];`;
  fc += `[vo]acompressor=threshold=-24dB:ratio=3:attack=6:release=200:makeup=1,volume=${VOICE_GAIN_DB}dB,alimiter=limit=0.89:level=false,atrim=start=${t0}:end=${t1},asetpts=PTS-STARTPTS[voice];`;
  fc += `[1:a]atrim=start=${t0}:end=${t1},asetpts=PTS-STARTPTS,volume=${SFX_GAIN}[fx];`;
  fc += `[voice][fx]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95:level=false[aout]`;
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', voice, '-i', sfxWav, '-i', videoOnly, '-filter_complex', fc,
    '-map', '2:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT]);
}
log(`done in ${fmtT((Date.now() - tStart) / 1000)} → ${OUT}`);
if (!flag('keep-tmp')) for (const s of segs) fs.rmSync(s, { force: true });
process.exit(0);
