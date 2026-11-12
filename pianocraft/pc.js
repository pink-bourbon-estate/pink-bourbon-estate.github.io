/* PianoCraft for the web: the shared engine used by the three pages.
   Plain JavaScript, no libraries, nothing loaded from other sites.

   What is in here, in the order you will meet it:
     1. parseMidi      - reads a .mid file into a list of notes
     2. buildScore     - snaps the notes to a sixteenth-note grid and works out the bars
     3. simplify       - the 1 to 7 difficulty slider (1 = just the tune on the main beats, 7 = everything)
     4. engrave        - draws the notes on two staves as an SVG picture (a simple engraver, not a publisher's)
     5. writeMidi      - turns a list of notes back into a .mid file you can download
     6. Piano          - a sampled piano (Salamander Grand Piano, CC BY 3.0) with a synthesised fallback
     7. Player         - the scheduler: tempo, looping bars, repeats, hands, transposing, metronome

   Honest note: this does NOT read PDFs. It reads MIDI files. The "recognition" shown on the convert page is
   drawn from the MIDI data to show what the desktop app does with a real PDF. */
const PC = (() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  /* ================================================================ 1. read a MIDI file */
  /** Read a standard MIDI file (an ArrayBuffer) into {ppq, tempo, num, den, sf, notes}. */
  function parseMidi(buf) {
    const d = new DataView(buf); let p = 0;
    const u32 = () => { const v = d.getUint32(p); p += 4; return v; }, u16 = () => { const v = d.getUint16(p); p += 2; return v; }, u8 = () => d.getUint8(p++);
    const vlq = () => { let v = 0, b; do { b = u8(); v = (v << 7) | (b & 127); } while (b & 128); return v; };
    if (u32() !== 0x4d546864) throw new Error('This is not a MIDI file.');
    u32(); u16(); const ntr = u16(), ppq = u16();
    const out = { ppq, tempo: 500000, num: 4, den: 4, sf: 0, notes: [] }; let seenTempo = false, seenTs = false;
    for (let t = 0; t < ntr; t++) {
      if (u32() !== 0x4d54726b) break;
      const len = u32(), end = p + len; let tick = 0, run = 0; const open = {};
      while (p < end) {
        tick += vlq(); let st = d.getUint8(p);
        if (st < 0x80) st = run; else { p++; if (st < 0xf0) run = st; }
        if (st === 0xff) {
          const type = u8(), n = vlq();
          if (type === 0x51 && !seenTempo) { out.tempo = (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2); seenTempo = true; }
          if (type === 0x58 && !seenTs) { out.num = d.getUint8(p); out.den = 1 << d.getUint8(p + 1); seenTs = true; }
          if (type === 0x59) { out.sf = (d.getInt8(p)); }
          p += n;
        } else if (st === 0xf0 || st === 0xf7) { p += vlq(); } else {
          const hi = st & 0xf0, ch = st & 15;
          const a = u8(), b = (hi === 0xc0 || hi === 0xd0) ? 0 : u8();
          if (ch === 9) continue;                                    // channel 10 is drums, not piano
          if (hi === 0x90 && b > 0) { open[ch + ':' + a] = { tick, vel: b }; }
          else if (hi === 0x80 || (hi === 0x90 && b === 0)) { const o = open[ch + ':' + a]; if (o) { out.notes.push({ tick: o.tick, dur: Math.max(1, tick - o.tick), pitch: a, vel: o.vel, track: t }); delete open[ch + ':' + a]; } }
        }
      }
      p = end;
    }
    return out;
  }

  /* ================================================================ 2. build a score */
  /** Snap to sixteenths, split into hands, work out the bars. `unit` = one sixteenth. */
  function buildScore(m, name) {
    const unit = m.ppq / 4, barLen = Math.round((4 * m.num) / m.den * 4);      // bar length in sixteenths
    const tr = {}; m.notes.forEach((n) => { (tr[n.track] = tr[n.track] || []).push(n.pitch); });
    const ids = Object.keys(tr).map(Number).sort((a, b) => avg(tr[a]) - avg(tr[b]));
    const rightTracks = new Set(ids.length >= 2 ? ids.slice(Math.ceil(ids.length / 2)) : []);
    let notes = m.notes.map((n, i) => ({ id: 'n' + i, start: Math.round(n.tick / unit), dur: Math.max(1, Math.round(n.dur / unit)), pitch: n.pitch, vel: n.vel, hand: ids.length >= 2 ? (rightTracks.has(n.track) ? 'R' : 'L') : (n.pitch >= 60 ? 'R' : 'L') }));
    notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
    const end = notes.reduce((e, n) => Math.max(e, n.start + n.dur), 0);
    return { name: name || 'Piece', bpm: Math.round(60000000 / m.tempo), num: m.num, den: m.den, sf: m.sf, barLen, bars: Math.max(1, Math.ceil(end / barLen)), total: Math.ceil(end / barLen) * barLen, notes };
  }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

  /* ================================================================ 3. simplify (difficulty 1 to 7) */
  /** Returns a smaller set of notes for the difficulty level, like the desktop app's slider.
      1 just the tune on the main beats   2 the whole tune   3 + held bass notes   4 + the bass line
      5 tune with one harmony note        6 full right hand  7 everything */
  function simplify(score, level) {
    if (level >= 7) return score.notes.map((n) => ({ ...n }));
    const groups = {}; score.notes.forEach((n) => { const k = n.hand + n.start; (groups[k] = groups[k] || []).push(n); });
    const keep = [], mainBeat = (n) => n.start % 4 === 0, bar = score.barLen;
    Object.values(groups).forEach((g) => {
      g.sort((a, b) => a.pitch - b.pitch); const n0 = g[0], R = n0.hand === 'R', top = g[g.length - 1], bottom = g[0];
      if (R) {
        if (level === 1) { if (mainBeat(top) && top.dur >= 2) keep.push(top); }
        else if (level <= 4) keep.push(top);
        else if (level === 5) keep.push(top, ...(g.length > 1 ? [g[Math.max(0, g.length - 2)]] : []));
        else keep.push(...g.slice(-3));
      } else {
        if (level === 1) { if (top.start % bar === 0) keep.push(bottom); }
        else if (level === 2) { /* tune only */ }
        else if (level === 3) { if (bottom.start % bar === 0) keep.push(bottom); }
        else if (level === 4) { if (mainBeat(bottom) || bottom.dur >= 4) keep.push(bottom); }
        else if (level === 5) keep.push(bottom, ...(g.length > 1 ? [g[1]] : []));
        else keep.push(...g.slice(0, 3));
      }
    });
    keep.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
    const res = keep.map((n) => ({ ...n }));
    if (level <= 5) {                                                      // let kept notes ring until the next kept note in that hand
      ['R', 'L'].forEach((h) => { const hs = res.filter((n) => n.hand === h); hs.forEach((n, i) => { const nx = hs.find((q, j) => j > i && q.start > n.start); if (nx) n.dur = Math.min(Math.max(n.dur, nx.start - n.start), bar); else n.dur = Math.max(n.dur, 4); }); });
    }
    return res;
  }

  /* ================================================================ 4. the engraver */
  const SHARP = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'], SHARPACC = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const FLAT = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'], FLATACC = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];
  const LET = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  /** Diatonic position (letter steps from C0) and accidental of a MIDI pitch, spelled with sharps or flats by key. */
  function spell(pitch, sf) { const pc = pitch % 12, oct = Math.floor(pitch / 12) - 1, fl = sf < 0, L = (fl ? FLAT : SHARP)[pc]; return { step: oct * 7 + LET[L], acc: (fl ? FLATACC : SHARPACC)[pc] }; }
  const STD = [16, 12, 8, 6, 4, 3, 2, 1];                                  // durations we can draw (in sixteenths)
  const stdDur = (d) => STD.find((s) => s <= d) || 1;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k])); if (parent) parent.appendChild(e); return e; };

  /** Draw a score. opts: {width, notes (defaults to all), showHands:{R,L}}. Returns {svg, geo}.
      geo has the shapes the recognition demo and the player need: staves, bars, heads, and where each note sits. */
  function engrave(score, notes, opts) {
    opts = opts || {}; const W = opts.width || 1000, M = 40, sp = 8;                  // sp = space between staff lines
    const svg = el('svg', { viewBox: '0 0 ' + W + ' 100', role: 'img', 'aria-label': 'Sheet music for ' + score.name, class: 'score' });
    const geo = { staves: [], bars: [], heads: [], note: {}, systems: [], width: W };
    // 1. group notes by bar, work out how wide each bar must be
    const byBar = Array.from({ length: score.bars }, () => []); notes.forEach((n) => { const b = Math.min(score.bars - 1, Math.floor(n.start / score.barLen)); byBar[b].push(n); });
    const barW = byBar.map((ns) => { const onsets = new Set(ns.map((n) => n.start)).size; return Math.max(90, 34 + onsets * 22); });
    // 2. fill systems (lines of music) with bars
    const systems = []; let cur = [], used = 0; const avail = W - 2 * M - 60;
    barW.forEach((w, i) => { if (cur.length && used + w > avail) { systems.push(cur); cur = []; used = 0; } cur.push(i); used += w; }); if (cur.length) systems.push(cur);
    const sysH = 190; let y = 30;
    systems.forEach((bars, si) => {
      const trebleTop = y + 20, bassTop = trebleTop + 4 * sp + 50, left = M + 40, right = W - M, tot = bars.reduce((s, b) => s + barW[b], 0), scale = (right - left) / tot;
      geo.systems.push({ y: y, h: sysH, trebleTop, bassTop });
      [['R', trebleTop], ['L', bassTop]].forEach(([hand, top]) => {
        for (let i = 0; i < 5; i++) el('line', { x1: M, x2: right, y1: top + i * sp, y2: top + i * sp, class: 'stl' }, svg);
        el('text', { x: M + 2, y: top + 3 * sp + 2, class: 'clef' }, svg).textContent = hand === 'R' ? 'G' : 'F';
        geo.staves.push({ x: M, y: top - 2, w: right - M, h: 4 * sp + 4, hand, sys: si });
      });
      el('line', { x1: M, x2: M, y1: trebleTop, y2: bassTop + 4 * sp, class: 'stl' }, svg);
      if (si === 0) { [[trebleTop, score.num], [trebleTop + 2 * sp, score.den], [bassTop, score.num], [bassTop + 2 * sp, score.den]].forEach(([yy, t]) => { el('text', { x: M + 30, y: yy + sp + 2, class: 'ts' }, svg).textContent = t; }); }
      let x0 = left;
      bars.forEach((b) => {
        const w = barW[b] * scale, x1 = x0 + w;
        el('line', { x1: x1, x2: x1, y1: trebleTop, y2: bassTop + 4 * sp, class: 'stl' }, svg);
        const numT = el('text', { x: x0 + 3, y: trebleTop - 10, class: 'barno' }, svg); numT.textContent = b + 1;
        geo.bars.push({ i: b, x0, x1, y0: trebleTop - 14, y1: bassTop + 4 * sp + 8, sys: si });
        const ons = [...new Set(byBar[b].map((n) => n.start))].sort((a, c) => a - c);
        const xOf = (start) => { const k = ons.indexOf(start); return x0 + 18 + (ons.length > 1 ? (k / (ons.length)) * (w - 30) : (w - 30) / 2) + (ons.length === 1 ? 0 : 0); };
        // proportional by time rather than onset count, mixed in for an even look
        const tx = (start) => { const f = (start - b * score.barLen) / score.barLen; return Math.round((xOf(start) * 0.5 + (x0 + 16 + f * (w - 28)) * 0.5)); };
        ['R', 'L'].forEach((hand) => {
          const top = hand === 'R' ? trebleTop : bassTop, base = hand === 'R' ? 30 : 18;      // bottom line: E4 (step 30) or G2 (step 18)
          const yOf = (step) => top + 4 * sp - (step - base) * (sp / 2);
          const hg = {}; byBar[b].filter((n) => n.hand === hand).forEach((n) => { (hg[n.start] = hg[n.start] || []).push(n); });
          Object.keys(hg).forEach((k) => {
            const g = hg[k].sort((a, c) => a.pitch - c.pitch), x = tx(Number(k)), sps = g.map((n) => spell(n.pitch + 0, score.sf)), dur = stdDur(Math.max(...g.map((n) => n.dur)));
            const mid = top + 2 * sp, ys = sps.map((s) => yOf(s.step)), up = (ys.reduce((s, v) => s + v, 0) / ys.length) >= mid;
            const group = el('g', { class: 'nt', 'data-id': g.map((n) => n.id).join(' ') }, svg);
            g.forEach((n, j) => {
              const yy = ys[j], s = sps[j], filled = dur < 8; const ng = el('g', { class: 'hd' }, group);
              for (let ly = top - sp; ly >= yy - 1; ly -= sp) if (yy <= top - sp + 1) el('line', { x1: x - 8, x2: x + 8, y1: ly, y2: ly, class: 'stl' }, ng);       // ledger lines above
              for (let ly = top + 5 * sp; ly <= yy + 1; ly += sp) if (yy >= top + 5 * sp - 1) el('line', { x1: x - 8, x2: x + 8, y1: ly, y2: ly, class: 'stl' }, ng);   // ledger lines below
              el('ellipse', { cx: x, cy: yy, rx: 5, ry: 3.6, transform: 'rotate(-20 ' + x + ' ' + yy + ')', class: filled ? 'full' : 'open' }, ng);
              if (s.acc) el('text', { x: x - 14, y: yy + 4, class: 'acc' }, ng).textContent = s.acc > 0 ? '#' : 'b';
              if ([3, 6, 12].includes(stdDur(n.dur))) el('circle', { cx: x + 9, cy: yy - (Math.round((yy - top) / sp) % 1 === 0 ? 2 : 0), r: 1.4, class: 'dot' }, ng);
              geo.heads.push({ id: n.id, x, y: yy, hand, bar: b, sys: si, pitch: n.pitch, dur, acc: s.acc }); geo.note[n.id] = { x, y: yy, bar: b, sys: si, el: group };
            });
            if (dur < 16) {                                          // stem and flags
              const ex = up ? Math.min(...ys) : Math.max(...ys), sx = up ? x + 4.6 : x - 4.6, sy2 = up ? ex - 28 : ex + 28;
              el('line', { x1: sx, x2: sx, y1: up ? Math.max(...ys) : Math.min(...ys), y2: sy2, class: 'stem' }, group);
              const fl = dur <= 2 || dur === 3 ? (dur === 1 ? 2 : 1) : 0;
              for (let f = 0; f < fl; f++) { const fy = up ? sy2 + f * 5 : sy2 - f * 5; el('path', { d: up ? 'M' + sx + ' ' + fy + ' q 9 5 6 14' : 'M' + sx + ' ' + fy + ' q 9 -5 6 -14', class: 'flag' }, group); }
            }
          });
        });
        x0 = x1;
      });
      y += sysH;
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (y + 10)); geo.height = y + 10;
    return { svg, geo };
  }

  /* ================================================================ 5. write a MIDI file */
  /** Make a format-0 MIDI file (an array of bytes) from a list of notes. */
  function writeMidi(score, notes, bpm, transpose) {
    const ppq = 480, unit = ppq / 4, ev = [];
    notes.forEach((n) => { const p = Math.max(0, Math.min(127, n.pitch + (transpose || 0))); ev.push([Math.round(n.start * unit), 1, p, n.vel || 80], [Math.round((n.start + n.dur) * unit) - 1, 0, p, 0]); });
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const bytes = [], vlq = (v) => { const b = [v & 127]; while ((v >>= 7)) b.unshift((v & 127) | 128); return b; };
    const push = (...a) => a.forEach((x) => bytes.push(x));
    const us = Math.round(60000000 / (bpm || score.bpm)); push(0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255);
    push(0, 0xff, 0x58, 4, score.num, Math.log2(score.den), 24, 8);
    let last = 0; ev.forEach((e) => { vlq(Math.max(0, e[0] - last)).forEach((b) => bytes.push(b)); last = e[0]; push(e[1] ? 0x90 : 0x80, e[2], e[3]); });
    push(0, 0xff, 0x2f, 0);
    const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255, 0x4d, 0x54, 0x72, 0x6b, (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255];
    return new Uint8Array(head.concat(bytes));
  }
  function download(name, data, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type || 'audio/midi' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

  /* ================================================================ 6. the piano sound */
  /** A sampled grand piano. Real recordings (Salamander Grand Piano by Alexander Holm, CC BY 3.0) are stretched
      a few semitones either way to fill in the notes between them. Reverb is a short generated room tail.
      If the recordings cannot load, a softer additive-synth piano is used so the page still works. */
  const Piano = {
    ctx: null, bufs: {}, roots: [], ready: false, fallback: false, out: null,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(this.ctx.destination);
      const dry = this.ctx.createGain(); dry.gain.value = 0.9; dry.connect(comp);
      const rev = this.ctx.createConvolver(), len = this.ctx.sampleRate * 1.8, ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      rev.buffer = ir; const wet = this.ctx.createGain(); wet.gain.value = 0.16; rev.connect(wet); wet.connect(comp);
      this.out = this.ctx.createGain(); this.out.connect(dry); this.out.connect(rev);
    },
    /** Download and decode the recordings (about 2 MB, once). Calls onProgress(0..1). */
    async load(base, onProgress) {
      this.init(); if (this.ready) return;
      const names = [['A0', 21]]; for (let o = 1; o <= 7; o++) [['C', 0], ['Ds', 3], ['Fs', 6], ['A', 9]].forEach(([n, s]) => names.push([n + o, 12 * (o + 1) + s])); names.push(['C8', 108]);
      let done = 0;
      try {
        await Promise.all(names.map(async ([n, midi]) => { const r = await fetch(base + n + '.mp3'); if (!r.ok) throw new Error('sample'); this.bufs[midi] = await this.ctx.decodeAudioData(await r.arrayBuffer()); done++; if (onProgress) onProgress(done / names.length); }));
        this.roots = Object.keys(this.bufs).map(Number).sort((a, b) => a - b);
      } catch (e) { this.fallback = true; }
      this.ready = true;
    },
    /** Play one note at audio time `when` for `dur` seconds. */
    note(pitch, when, dur, vel) {
      const c = this.ctx, v = Math.pow(Math.max(1, vel) / 127, 1.25);
      if (!this.fallback && this.roots.length) {
        let root = this.roots[0]; this.roots.forEach((r) => { if (Math.abs(r - pitch) < Math.abs(root - pitch)) root = r; });
        const s = c.createBufferSource(); s.buffer = this.bufs[root]; s.playbackRate.value = Math.pow(2, (pitch - root) / 12);
        const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800 + v * 9000; g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(v * 0.9, when + 0.004);
        const rel = Math.max(0.35, Math.min(1.1, 0.5 + dur * 0.15)), stopAt = when + Math.max(dur, 0.12);
        g.gain.setValueAtTime(v * 0.9, stopAt); g.gain.exponentialRampToValueAtTime(0.0008, stopAt + rel);     // a gentle release, like lifting a key
        s.connect(f); f.connect(g); g.connect(this.out); s.start(when); s.stop(stopAt + rel + 0.05);
      } else {                                                                       // fallback: a few decaying partials with a soft attack
        const f0 = 440 * Math.pow(2, (pitch - 69) / 12), g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500 + v * 4000;
        const decay = Math.max(0.6, 3.2 - pitch / 40), stopAt = when + Math.max(dur, 0.15);
        g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(v * 0.35, when + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, when + decay); g.gain.setValueAtTime(g.gain.value, when);
        g.connect(lp); lp.connect(this.out);
        [1, 2, 3, 4, 5, 6].forEach((k) => { const o = c.createOscillator(), pg = c.createGain(); o.type = 'sine'; o.frequency.value = f0 * k * Math.sqrt(1 + 0.0004 * k * k); pg.gain.value = 1 / (k * k * 0.8 + 0.2); o.connect(pg); pg.connect(g); o.start(when); o.stop(when + decay + 0.1); });
      }
    },
    click(when, strong) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.value = strong ? 1500 : 1000; g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(strong ? 0.25 : 0.14, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06); o.connect(g); g.connect(this.ctx.destination); o.start(when); o.stop(when + 0.07); },
  };

  /* ================================================================ 7. the player (scheduler) */
  /** Plays a list of notes. All the settings are plain properties you can change while it plays:
      bpm, transpose, metronome, hands {R,L}, loop {on, a, b, times} (bars are 0-based, times 0 = forever). */
  class Player {
    constructor(score, onEvent) {
      this.score = score; this.notes = score.notes; this.onEvent = onEvent || (() => {});
      this.bpm = score.bpm; this.transpose = 0; this.metronome = false; this.countIn = false; this.hands = { R: true, L: true };
      this.loop = { on: false, a: 0, b: 0, times: 0 }; this.playing = false; this.pos = 0; this.pass = 0; this.timer = null;
      this.byStart = new Map(); this.setNotes(score.notes);
    }
    setNotes(ns) { this.notes = ns; this.byStart = new Map(); ns.forEach((n) => { if (!this.byStart.has(n.start)) this.byStart.set(n.start, []); this.byStart.get(n.start).push(n); }); }
    get step() { return 60 / this.bpm / 4; }                                  // seconds per sixteenth note (the tempo is in quarter notes a minute)
    async play() {
      if (this.playing) return; Piano.init(); await Piano.ctx.resume();
      this.playing = true; this.sched = this.pos; this.schedTime = Piano.ctx.currentTime + 0.08; this.pass = 0;
      if (this.countIn && this.pos === (this.loop.on ? this.loop.a * this.score.barLen : 0)) { const beats = this.score.num, bl = (16 / this.score.den) * this.step; for (let i = 0; i < beats; i++) Piano.click(this.schedTime + i * bl, i === 0); this.schedTime += beats * bl; }
      this.timer = setInterval(() => this.tick(), 25); this.tick();
    }
    pause() { this.playing = false; clearInterval(this.timer); this.onEvent({ type: 'pause' }); }
    stop() { this.pause(); this.pos = 0; this.onEvent({ type: 'seek', pos: 0 }); }
    seek(pos) { const was = this.playing; if (was) this.pause(); this.pos = Math.max(0, Math.min(this.score.total - 1, Math.round(pos))); this.onEvent({ type: 'seek', pos: this.pos }); if (was) this.play(); }
    tick() {
      const c = Piano.ctx, S = this.score, barLen = S.barLen, loopEnd = (this.loop.b + 1) * barLen, loopStart = this.loop.a * barLen;
      while (this.schedTime < c.currentTime + 0.15) {
        const s = this.sched, t = this.schedTime;
        if (s % (16 / S.den) === 0 && this.metronome) Piano.click(t, s % barLen === 0);
        const ns = (this.byStart.get(s) || []).filter((n) => this.hands[n.hand]); const ids = [];
        ns.forEach((n) => { Piano.note(n.pitch + this.transpose, t, n.dur * this.step * 0.97, n.vel || 80); ids.push(n.id); });
        this.onEvent({ type: 'step', pos: s, time: t, ids, off: ns.length ? Math.max(...ns.map((n) => n.dur)) * this.step : 0 });
        this.sched++; this.schedTime += this.step; this.pos = this.sched;
        if (this.loop.on && this.sched >= loopEnd) { this.pass++; if (this.loop.times === 0 || this.pass < this.loop.times) { this.sched = loopStart; } }
        if (this.sched >= S.total) { this.onEvent({ type: 'end', time: this.schedTime + 1.2 }); clearInterval(this.timer); this.playing = false; this.pos = 0; return; }
      }
    }
  }

  /* ================================================================ the list of pieces (all public domain) */
  const PIECES = [
    { id: 'am-anh116', file: 'am-anh116.mid', title: 'Minuet in G, BWV Anh. 116', by: 'Anna Magdalena Notebook (Bach circle)', level: 'Easy', src: 'Mutopia Project, typeset by Allen Garvin, public domain' },
    { id: 'am-anh113', file: 'am-anh113.mid', title: 'Minuet in F, BWV Anh. 113', by: 'Anna Magdalena Notebook (Bach circle)', level: 'Easy', src: 'Mutopia Project, typeset by Allen Garvin, public domain' },
    { id: 'handel-menuet-d', file: 'handel-menuet-d.mid', title: 'Minuet in D', by: 'G. F. Handel, Aylesford Pieces', level: 'Easy', src: 'Mutopia Project, typeset by Bas Wassink, public domain' },
    { id: 'burg-100-1', file: 'burg-100-1.mid', title: 'La Candeur, Op. 100 No. 1', by: 'J. F. Burgmuller', level: 'Easy', src: 'Mutopia Project, typeset by Bas Wassink, public domain' },
    { id: 'clementi-36-1-i', file: 'clementi-36-1-i.mid', title: 'Sonatina in C, Op. 36 No. 1, I', by: 'M. Clementi', level: 'Moderate', src: 'Mutopia Project, typeset by Brian D. Rude, public domain' },
    { id: 'chopin-28-7', file: 'chopin-28-7.mid', title: 'Prelude in A, Op. 28 No. 7', by: 'F. Chopin', level: 'Moderate', src: 'Mutopia Project, public domain' },
    { id: 'satie-gymno-1', file: 'satie-gymno-1.mid', title: 'Gymnopedie No. 1', by: 'E. Satie', level: 'Moderate', src: 'Mutopia Project, typeset by Evin Robertson, public domain' },
    { id: 'bach-846', file: 'bach-846.mid', title: 'Prelude in C, BWV 846', by: 'J. S. Bach', level: 'Moderate', src: 'Mutopia Project, typeset by Tobias Erbsland, public domain' },
    { id: 'bach-inv-8', file: 'bach-inv-8.mid', title: 'Invention No. 8 in F, BWV 779', by: 'J. S. Bach', level: 'Harder', src: 'Mutopia Project, typeset by Allen Garvin, public domain' },
    { id: 'fur-elise', file: 'fur-elise.mid', title: 'Fur Elise, WoO 59', by: 'L. van Beethoven', level: 'Harder', src: 'Mutopia Project, typeset by Stelios Samelis, public domain' },
    { id: 'joplin-entertainer', file: 'joplin-entertainer.mid', title: 'The Entertainer', by: 'S. Joplin', level: 'Harder', src: 'Mutopia Project, typeset by Chris Sawer, public domain' },
  ];
  async function loadPiece(id, base) { const p = PIECES.find((x) => x.id === id) || PIECES[0]; const r = await fetch(base + p.file); const s = buildScore(parseMidi(await r.arrayBuffer()), p.title); s.meta = p; return s; }

  return { parseMidi, buildScore, simplify, engrave, writeMidi, download, Piano, Player, PIECES, loadPiece, spell, el, stdDur };
})();
