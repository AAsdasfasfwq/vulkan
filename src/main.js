import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import '@fontsource/montserrat/latin-900.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/playfair-display/latin-700-italic.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import { Film } from './core/film.js';
import { FPS, GAPS } from './core/transcript.js';
import { renderSoundtrack, encodeWavChunks } from './audio/mixer.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const scale = parseFloat(params.get('scale') || (RENDER ? '1' : '0.5'));
const subs = params.get('subs') !== '0';

async function loadFonts() {
  const specs = [
    '500 40px Montserrat', '600 40px Montserrat', '700 40px Montserrat', '800 40px Montserrat', '900 40px Montserrat',
    'italic 400 40px "Playfair Display"', 'italic 700 40px "Playfair Display"', '700 40px "Playfair Display"',
    '400 40px "Bebas Neue"', '400 40px Inter', '600 40px Inter',
  ];
  await Promise.all(specs.map((s) => document.fonts.load(s, 'AaBb0123')));
  await document.fonts.ready;
}

async function boot() {
  const status = document.getElementById('status');
  await loadFonts();
  const json = await (await fetch('./media/krakatoa.json')).json();
  const canvas = document.getElementById('out');
  const film = new Film(canvas, { scale, subtitles: subs, msaa: parseInt(params.get('msaa') || '4', 10) });
  film.load(json);
  window.film = film;

  if (RENDER) {
    document.body.classList.add('render');
    let soundtrack = null;
    window.KRAKATOA = {
      fps: FPS,
      frames: film.frames,
      duration: film.duration,
      gaps: GAPS,
      shots: film.shots.map((s) => ({ t: s.t, dur: s.dur, set: s.set || (s.card ? 'card' : '2d'), name: s.name || '' })),
      gl: (() => {
        const gl = film.engine.renderer.getContext();
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      })(),
      warm(a, b) { film.warm(a / FPS, b / FPS); return true; },
      frame(i, quality = 0.93) {
        film.renderFrame(i);
        return canvas.toDataURL('image/jpeg', quality);
      },
      frameShot(i) { const s = film.renderFrame(i); return s.index; },
      async audio() {
        soundtrack = await renderSoundtrack(film);
        soundtrack.chunks = encodeWavChunks(soundtrack.buffer, 4 * 1024 * 1024);
        return { chunks: soundtrack.chunks.length, sampleRate: soundtrack.buffer.sampleRate, length: soundtrack.buffer.length };
      },
      audioChunk(i) { return soundtrack.chunks[i]; },
    };
    status.textContent = 'ready';
    window.__READY = true;
    return;
  }

  // ---------------- interactive preview ----------------
  const { Preview } = await import('./audio/preview.js');
  const player = new Preview(film);
  const seek = document.getElementById('seek');
  const info = document.getElementById('info');
  const btn = document.getElementById('play');
  seek.max = film.duration;
  let t = parseFloat(params.get('t') || '0');
  let playing = false;
  status.textContent = `${film.shots.length} shots · ${film.duration.toFixed(1)} s · ${film.engine.renderer.getContext().getParameter(0x1f01)}`;
  const fmt = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  const draw = () => {
    const f = Math.min(film.frames - 1, Math.floor(t * FPS));
    const s = film.renderFrame(f);
    info.textContent = `${fmt(t)} / ${fmt(film.duration)} · shot ${s.index} ${s.set || (s.card ? 'card' : '2d')}`;
    seek.value = t;
  };
  const loop = () => {
    if (playing) {
      t = player.time();
      if (t >= film.duration) { playing = false; player.stop(); btn.textContent = '▶ Play'; }
    }
    draw();
    requestAnimationFrame(loop);
  };
  btn.onclick = async () => {
    if (playing) { playing = false; player.stop(); btn.textContent = '▶ Play'; }
    else { await player.play(t); playing = true; btn.textContent = '❚❚ Pause'; }
  };
  seek.oninput = () => { t = parseFloat(seek.value); if (playing) player.play(t); };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); btn.click(); }
    if (e.code === 'ArrowRight') { t = Math.min(film.duration, t + 2); if (playing) player.play(t); }
    if (e.code === 'ArrowLeft') { t = Math.max(0, t - 2); if (playing) player.play(t); }
  });
  loop();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('status').textContent = 'ERROR: ' + e.message;
  window.__ERROR = String(e && e.stack || e);
});
