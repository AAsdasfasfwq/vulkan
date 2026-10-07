// Dev helper: renders only the sound-design track to a WAV.
// node tools/audio.mjs <distDir> <out.wav>   (CHROME_PATH=... optional)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './server.mjs';
const root = process.argv[2], out = process.argv[3];
const { srv, port } = await serve(root);
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, protocolTimeout: 0, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?render=1&scale=0.25&msaa=0`);
await page.waitForFunction('window.__READY || window.__ERROR', { timeout: 0 });
const t = Date.now();
const timer = setInterval(async () => { try { const p = await page.evaluate(() => KRAKATOA.audioProgress()); process.stdout.write(`\r${(p * 100).toFixed(0)}% ${((Date.now() - t) / 1000).toFixed(0)}s   `); } catch {} }, 5000);
const a = await page.evaluate(() => KRAKATOA.audio());
clearInterval(timer);
console.log('\naudio', a, (Date.now() - t) / 1000, 's');
const fd = fs.openSync(out, 'w');
const dataBytes = a.length * 4; const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + dataBytes, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(a.sampleRate, 24);
h.writeUInt32LE(a.sampleRate * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(dataBytes, 40);
fs.writeSync(fd, h);
for (let i = 0; i < a.chunks; i++) fs.writeSync(fd, Buffer.from(await page.evaluate((k) => KRAKATOA.audioChunk(k), i), 'base64'));
fs.closeSync(fd);
await browser.close(); srv.close();
