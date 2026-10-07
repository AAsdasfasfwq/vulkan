// Parses the Whisper JSON (segments + word timestamps) and maps the source
// (voice-over) clock to the video clock, which contains a few inserted
// "breathing" gaps used for wordless explosion illustrations.

export const FPS = 30;

// Gaps inserted into the narration, in SOURCE seconds (chosen at real silences
// in the voice-over, measured with ffmpeg silencedetect).
export const GAPS = [
  { at: 329.05, dur: 3.0, name: 'first-explosion' },
  { at: 441.15, dur: 5.5, name: 'great-explosion' },
  { at: 553.27, dur: 2.5, name: 'tsunami-impact' },
];

export const TAIL = 4.5; // seconds of picture after the last word

export function srcToVideo(s) {
  let v = s;
  for (const g of GAPS) if (s >= g.at) v += g.dur;
  return v;
}

// Returns the source time for a video time, or null inside an inserted gap.
export function videoToSrc(v) {
  let off = 0;
  for (const g of GAPS) {
    const gv = g.at + off; // video time where this gap begins
    if (v < gv) return v - off;
    if (v < gv + g.dur) return null;
    off += g.dur;
  }
  return v - off;
}

const norm = (s) =>
  s.toLowerCase().replace(/[—–]/g, ' ').replace(/[^a-z0-9' ]+/g, '').trim();

export function parseTranscript(json) {
  const words = [];
  const segs = json.segments || [];
  let lastEnd = 0;
  for (const seg of segs) {
    const list = seg.words && seg.words.length ? seg.words : [{ word: seg.text, start: seg.start, end: seg.end }];
    for (const w of list) {
      const raw = (w.word || '').trim();
      if (!raw) continue;
      // Whisper splits hyphenated words ("present" + "-day"): glue them back.
      if (/^[-,.]/.test(w.word || '') && words.length) {
        const pw = words[words.length - 1];
        pw.text += raw;
        pw.key = norm(pw.text);
        pw.e = Math.max(pw.e, w.end);
        pw.ve = srcToVideo(pw.e);
        lastEnd = pw.e;
        continue;
      }
      // Whisper hallucinations at the very end of the file ("For more information...")
      if (w.start >= 855.0) continue;
      let s = Math.max(w.start, lastEnd - 0.05);
      let e = Math.max(w.end, s + 0.05);
      // A word that straddles an inserted gap is spoken after it (Whisper
      // tends to start words early when they follow a silence).
      for (const g of GAPS) if (s < g.at && e > g.at) { s = g.at; e = Math.max(e, s + 0.12); }
      lastEnd = e;
      words.push({ text: raw, key: norm(raw), s, e, vs: srcToVideo(s), ve: srcToVideo(e) });
    }
  }
  // Split hyphen/dash glued tokens for searching only.
  words.forEach((w, i) => (w.i = i));
  const duration = (words.length ? words[words.length - 1].ve : 0) + TAIL;
  return { words, duration };
}

// Phrase finder: anchors visuals on the exact spoken words.
export function makeFinder(words) {
  // Flatten into sub-tokens (a Whisper "word" may contain several, e.g. "gases—water").
  const toks = [];
  words.forEach((w, wi) => w.key.split(/\s+/).filter(Boolean).forEach((t) => toks.push({ t, wi })));
  let cursor = 0; // index into toks
  function search(phrase, from) {
    const q = norm(phrase).split(/\s+/).filter(Boolean);
    for (let i = from; i <= toks.length - q.length; i++) {
      let ok = true;
      for (let k = 0; k < q.length; k++) {
        const t = toks[i + k].t;
        if (t !== q[k] && !(k === q.length - 1 && t.startsWith(q[k]))) { ok = false; break; }
      }
      if (ok) return { first: i, last: i + q.length - 1 };
    }
    return null;
  }
  // After the shot list is built the finder is "sealed": lazy look-ups made
  // while rendering (inside draw closures) search from the current shot.
  let sealed = null;
  const cache = new Map();
  const fromTime = (t) => { let i = 0; while (i < toks.length && words[toks[i].wi].vs < t) i++; return i; };
  const need = (phrase) => {
    let from = cursor;
    if (sealed) {
      const t0 = sealed();
      const key = phrase + '@' + t0;
      if (cache.has(key)) return cache.get(key);
      from = fromTime(t0 - 0.6);
      const r = search(phrase, from);
      if (!r) throw new Error('Phrase not found in transcript (after shot start): "' + phrase + '"');
      cache.set(key, r);
      return r;
    }
    const r = search(phrase, from);
    if (!r) throw new Error('Phrase not found in transcript (after previous anchor): "' + phrase + '"');
    return r;
  };
  return {
    // Video start time of the phrase (searches forward from the previous anchor).
    at(phrase) { const r = need(phrase); cursor = r.first; return words[toks[r.first].wi].vs; },
    end(phrase) { const r = need(phrase); return words[toks[r.last].wi].ve; },
    // Start of a phrase after the current cursor (does not move it).
    peek(phrase) { const r = need(phrase); return words[toks[r.first].wi].vs; },
    reset() { cursor = 0; },
    seal(getShotStart) { sealed = getShotStart; },
  };
}

// Groups words into short caption lines (2-4 words), Zack-D style.
export function buildCaptions(words) {
  const caps = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    caps.push({ words: cur, s: cur[0].vs, e: cur[cur.length - 1].ve });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = cur[cur.length - 1];
    if (prev && w.vs - prev.ve > 0.45) flush();
    cur.push(w);
    const len = cur.map((x) => x.text).join(' ').length;
    const punct = /[.,!?;:—]$/.test(w.text);
    if (punct || cur.length >= 4 || len >= 20) flush();
  }
  flush();
  // Extend each caption to the next one (no flicker), max +0.6 s of hold.
  for (let i = 0; i < caps.length; i++) {
    const next = caps[i + 1];
    caps[i].hold = next ? Math.min(next.s, caps[i].e + 0.6) : caps[i].e + 0.8;
  }
  return caps;
}
