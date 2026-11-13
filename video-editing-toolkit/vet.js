/* Video Editing Toolkit demo page.

   HONEST NOTE: this is a demonstration, not the converter. It uses only what a browser has built in (a hidden <video>, a canvas,
   Web Audio and MediaRecorder), so the jobs are small versions of the real ones: frames as JPEG, audio as WAV, compression as a
   short WebM preview. The real work is done by ffmpeg in the desktop app. The "same job in the app" boxes are built by the
   functions near the top of this file, which mirror the argument builders in the app's engine.rs, so the commands you see are
   the ones the app runs (the app adds a few housekeeping flags such as -nostdin and -progress).

   Nothing is uploaded or stored: the video stays in this tab. Plain JavaScript, no libraries. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------ the same helpers the app has (engine.rs) */
  const humanSize = (b) => {
    const u = ['B', 'KB', 'MB', 'GB', 'TB']; let v = b, i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return i === 0 ? b + ' B' : v.toFixed(1) + ' ' + u[i];
  };
  /** "t02m05s" (or "t1h02m05s"); milliseconds added when the interval is not a whole number of seconds. */
  const timeLabel = (secs, withMs) => {
    const total = Math.round(secs * 1000), ms = total % 1000, s = Math.floor(total / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60, p2 = (n) => String(n).padStart(2, '0');
    return (h > 0 ? 't' + h + 'h' + p2(m) + 'm' + p2(sec) + 's' : 't' + p2(m) + 'm' + p2(sec) + 's') + (withMs ? String(ms).padStart(3, '0') + 'ms' : '');
  };
  const clock = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const q = (s) => (/[\s'"]/.test(s) ? '"' + s + '"' : s);
  const stemOf = (name) => name.replace(/\.[^.]+$/, '') || 'video';

  const cmdCompress = (name, o) => {
    const a = ['ffmpeg', '-i', q(name), '-map', '0:v:0', '-map', '0:a:0', '-c:v', o.codec, '-crf', o.crf, '-preset', o.preset, '-pix_fmt', 'yuv420p'];
    if (o.codec === 'libx265') a.push('-tag:v', 'hvc1');
    if (o.width) a.push('-vf', '"scale=\'min(' + o.width + ',iw)\':-2"');
    a.push('-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', q(stemOf(name) + '_compressed.mp4'));
    return a.join(' ');
  };
  const AUDIO = { mp3: ['libmp3lame', true], m4a: ['aac', true], aac: ['aac', true], opus: ['libopus', true], wav: ['pcm_s16le', false] };
  const cmdAudio = (name, o) => {
    const [enc, rate] = AUDIO[o.format], a = ['ffmpeg', '-i', q(name), '-vn', '-map', '0:a:0', '-c:a', enc];
    if (rate) a.push('-b:a', o.kbps + 'k');
    if (o.mono) a.push('-ac', '1');
    if (o.format === 'aac') a.push('-f', 'adts');
    a.push(q(stemOf(name) + '.' + o.format));
    return a.join(' ');
  };
  const fmtNum = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : String(x));
  const cmdFrames = (name, o) => {
    const a = ['ffmpeg'];
    if (o.start > 0) a.push('-ss', fmtNum(o.start));
    let vf = "select='gte(t+0.001,selected_n*" + fmtNum(o.interval) + ")'";
    if (o.dedupe) vf += ',mpdecimate';
    vf += ",scale='min(" + o.width + ",iw)':-2";
    a.push('-i', q(name), '-an', '-sn', '-vf', '"' + vf + '"', '-fps_mode', 'passthrough', '-enc_time_base', '1/1000', '-frame_pts', '1', '-q:v', '5', 'vet_%08d.jpg');
    return a.join(' ') + '\n\n(each file is then renamed from its own timestamp, for example ' + q(stemOf(name)) + '_' + timeLabel(o.start, false) + '.jpg)';
  };

  /* ------------------------------------------------------------ the source video */
  const S = { file: null, name: 'video.mp4', url: null, duration: 0, w: 0, h: 0, size: 0 };
  const once = (el, ev, ms) => new Promise((res, rej) => { const t = ms ? setTimeout(() => rej(new Error('timed out waiting for ' + ev)), ms) : 0; el.addEventListener(ev, () => { clearTimeout(t); res(); }, { once: true }); el.addEventListener('error', () => { clearTimeout(t); rej(new Error('the browser could not read this video')); }, { once: true }); });

  /** Recorded WebM files report an infinite length until the end is found; this finds it. */
  async function fixDuration(v) {
    if (Number.isFinite(v.duration)) return v.duration;
    const done = new Promise((res) => { const on = () => { if (Number.isFinite(v.duration)) { v.removeEventListener('durationchange', on); res(); } }; v.addEventListener('durationchange', on); });
    v.currentTime = 1e7; await Promise.race([done, sleep(4000)]);
    v.currentTime = 0; try { await once(v, 'seeked', 3000); } catch (e) { /* fine */ }
    return v.duration;
  }
  async function openHidden() {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = S.url;
    await once(v, 'loadedmetadata', 15000); await fixDuration(v); return v;
  }
  const seek = (v, t) => new Promise((res) => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = Math.min(t, Math.max(0, (v.duration || t) - 0.001)); setTimeout(done, 4000); });

  async function useVideo(blob, name) {
    if (S.url) URL.revokeObjectURL(S.url);
    S.file = blob; S.name = name; S.size = blob.size; S.url = URL.createObjectURL(blob);
    const pv = $('preview'); pv.src = S.url;
    try {
      await once(pv, 'loadedmetadata', 15000); S.duration = await fixDuration(pv); S.w = pv.videoWidth; S.h = pv.videoHeight;
      if (!S.w) throw new Error('no picture found in this file');
    } catch (e) {
      $('srcstatus').textContent = 'This browser could not open that file (' + e.message + '). Try an MP4 or WebM, or use the sample. The desktop app reads almost every format.';
      $('srcinfo').hidden = true; setReady(false); return;
    }
    const f = $('facts'); f.replaceChildren();
    [['File', name], ['Size', humanSize(S.size)], ['Length', clock(S.duration) + ' (' + S.duration.toFixed(1) + ' s)'], ['Picture', S.w + ' x ' + S.h]].forEach(([k, v]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; f.append(dt, dd); });
    $('srcinfo').hidden = false; $('srcstatus').textContent = 'Ready. Nothing has left this tab.';
    $('f-start').max = Math.max(0, Math.floor(S.duration - 1)); $('f-int').max = Math.max(1, Math.min(60, Math.floor(S.duration)));
    $('f-int').value = Math.min($('f-int').value, $('f-int').max); $('f-start').value = Math.min($('f-start').value, $('f-start').max);
    setReady(true); clearResults(); refreshCommands();
  }
  function setReady(on) { ['f-run', 'a-run', 'c-run'].forEach((id) => { $(id).disabled = !on; }); }

  /* ------------------------------------------------------------ the sample clip, drawn and recorded in the browser */
  function drawSlide(g, t, W, H) {
    const per = 3, i = Math.min(3, Math.floor(t / per)), hue = [210, 30, 150, 330][i];
    g.fillStyle = 'hsl(' + hue + ' 45% 90%)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'hsl(' + hue + ' 50% 25%)'; g.font = '700 64px sans-serif'; g.textAlign = 'center'; g.fillText('Slide ' + (i + 1), W / 2, H / 2 - 10);
    g.font = '24px sans-serif'; g.fillText('Sample lecture', W / 2, H / 2 + 34);
    g.font = '18px monospace'; g.textAlign = 'left'; g.fillText(clock(t), 16, H - 18);
    g.fillRect(0, H - 6, (W * t) / 12, 6);
    g.beginPath(); g.arc(40 + ((t * 90) % (W - 80)), 38, 8, 0, Math.PI * 2); g.fill(); // a small moving dot, so the picture is never perfectly still
  }
  async function makeSample() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream || !(window.AudioContext || window.webkitAudioContext)) throw new Error('this browser cannot record a sample; choose your own video instead');
    const W = 640, H = 360, total = 12, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const ac = new (window.AudioContext || window.webkitAudioContext)(), osc = ac.createOscillator(), gain = ac.createGain(), dest = ac.createMediaStreamDestination();
    gain.gain.value = 0.05; osc.connect(gain); gain.connect(dest); osc.start();
    const stream = c.captureStream(30); dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : {}), chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    drawSlide(g, 0, W, H); rec.start(500); const t0 = performance.now();
    await new Promise((res) => { const id = setInterval(() => { const t = (performance.now() - t0) / 1000; if (t >= total) { clearInterval(id); res(); return; } drawSlide(g, t, W, H); osc.frequency.value = [262, 330, 392, 523][Math.min(3, Math.floor(t / 3))]; $('srcstatus').textContent = 'Making the sample: ' + Math.round((t / total) * 100) + '%. Keep this tab in front.'; }, 33); });
    rec.stop(); await stopped; osc.stop(); ac.close();
    return new Blob(chunks, { type: 'video/webm' });
  }

  /* ------------------------------------------------------------ frames */
  let frames = [], thumbUrls = [];
  const frameOpts = () => ({ interval: +$('f-int').value, start: +$('f-start').value, width: +$('f-w').value, dedupe: $('f-dd').checked });
  const small = (canvas) => { const c = document.createElement('canvas'); c.width = 32; c.height = 18; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(canvas, 0, 0, 32, 18); return g.getImageData(0, 0, 32, 18).data; };
  const diff = (a, b) => { let s = 0, n = 0; for (let i = 0; i < a.length; i += 4) { s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3; } return s / n; };

  async function runFrames() {
    const o = frameOpts(), qlt = +$('f-q').value / 100, MAX = 60; $('f-run').disabled = true; $('f-zip').disabled = true; clearFrames();
    try {
      const v = await openHidden(), cw = Math.min(o.width, v.videoWidth), ch = Math.round((cw * v.videoHeight) / v.videoWidth / 2) * 2, c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
      const withMs = Math.abs(o.interval - Math.round(o.interval)) > 1e-9 || Math.abs(o.start - Math.round(o.start)) > 1e-9; let prev = null, skipped = 0, capped = false;
      for (let i = 0; ; i++) {
        const t = o.start + i * o.interval; if (t > v.duration - 0.05 && i > 0) break; if (t >= v.duration) break;
        if (frames.length >= MAX) { capped = true; break; }
        $('f-status').textContent = 'Reading the frame at ' + clock(t) + '...'; await seek(v, t); g.drawImage(v, 0, 0, cw, ch);
        const sm = small(c); if (o.dedupe && prev && diff(prev, sm) < 3) { skipped++; continue; } prev = sm;
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', qlt)); const url = URL.createObjectURL(blob); thumbUrls.push(url);
        const name = stemOf(S.name) + '_' + timeLabel(withMs ? t : Math.round(t), withMs) + '.jpg'; frames.push({ name, blob });
        const fig = document.createElement('figure'), img = document.createElement('img'), cap = document.createElement('figcaption'); img.src = url; img.alt = 'Frame at ' + clock(t); cap.textContent = name + ' · ' + humanSize(blob.size); fig.append(img, cap); $('f-thumbs').append(fig);
      }
      const total = frames.reduce((a, f) => a + f.blob.size, 0);
      $('f-status').textContent = frames.length + ' frame' + (frames.length === 1 ? '' : 's') + ', ' + humanSize(total) + ' in all' + (skipped ? ', ' + skipped + ' skipped as repeats' : '') + (capped ? '. The demo stops at ' + MAX + ' frames; the app has no limit.' : '.');
      $('f-zip').disabled = frames.length === 0;
    } catch (e) { $('f-status').textContent = 'Could not extract frames: ' + e.message; }
    $('f-run').disabled = false;
  }
  function clearFrames() { thumbUrls.forEach((u) => URL.revokeObjectURL(u)); thumbUrls = []; frames = []; $('f-thumbs').replaceChildren(); $('f-status').textContent = ''; $('f-zip').disabled = true; }

  /* A small .zip writer (files stored, not squeezed: JPEGs are already compressed). */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true);
      parts.push(lh, name, f.data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch, name); offset += 30 + name.length + size;
    }
    const cdSize = central.reduce((a, p) => a + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  function save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  async function zipFrames() {
    const files = []; for (const f of frames) files.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) });
    save(makeZip(files), stemOf(S.name) + '_frames.zip');
  }

  /* ------------------------------------------------------------ audio */
  let wavBlob = null;
  const audioOpts = () => ({ format: $('a-fmt').value, kbps: +$('a-kb').value, mono: $('a-mono').checked });
  function toWav(chans, rate, mono) {
    const n = chans[0].length, nch = mono ? 1 : chans.length, buf = new ArrayBuffer(44 + n * nch * 2), d = new DataView(buf), w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); d.setUint32(4, 36 + n * nch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, nch, true); d.setUint32(24, rate, true); d.setUint32(28, rate * nch * 2, true); d.setUint16(32, nch * 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * nch * 2, true);
    let p = 44;
    for (let i = 0; i < n; i++) for (let k = 0; k < nch; k++) { const s = mono ? chans.reduce((a, c) => a + c[i], 0) / chans.length : chans[k][i]; d.setInt16(p, Math.max(-1, Math.min(1, s)) * 0x7fff, true); p += 2; }
    return new Blob([buf], { type: 'audio/wav' });
  }
  function drawWave(data) {
    const cv = $('a-wave'), g = cv.getContext('2d'), W = cv.width, H = cv.height, step = Math.max(1, Math.floor(data.length / W)), css = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, W, H); g.fillStyle = css.getPropertyValue('--ink').trim() || '#111';
    for (let x = 0; x < W; x++) { let lo = 1, hi = -1; for (let i = x * step; i < Math.min(data.length, (x + 1) * step); i++) { const s = data[i]; if (s < lo) lo = s; if (s > hi) hi = s; } if (hi < lo) continue; g.fillRect(x, ((1 - hi) * H) / 2, 1, Math.max(1, ((hi - lo) * H) / 2)); }
  }
  async function runAudio() {
    const o = audioOpts(), LIMIT = 600; $('a-run').disabled = true; $('a-dl').disabled = true; $('a-out').hidden = true; $('a-facts').hidden = true;
    if (S.size > 600 * 1024 * 1024) { $('a-status').textContent = 'That file is too big to decode in a browser tab. The app has no such limit.'; $('a-run').disabled = false; return; }
    $('a-status').textContent = 'Reading the audio track...';
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(); let ab;
      try { ab = await ac.decodeAudioData(await S.file.arrayBuffer()); } catch (e) { throw new Error('no audio track was found, or this browser cannot decode it. The app tells these apart and reads almost every format'); }
      ac.close();
      const keep = Math.min(ab.length, Math.floor(LIMIT * ab.sampleRate)), chans = []; for (let k = 0; k < ab.numberOfChannels; k++) chans.push(ab.getChannelData(k).subarray(0, keep));
      wavBlob = toWav(chans, ab.sampleRate, o.mono);
      const mono = new Float32Array(keep); for (let i = 0; i < keep; i++) { let s = 0; for (const c of chans) s += c[i]; mono[i] = s / chans.length; }
      drawWave(mono); $('a-audio').src = URL.createObjectURL(wavBlob); $('a-out').hidden = false;
      const secs = keep / ab.sampleRate; showAudioFacts(secs, ab.sampleRate, ab.numberOfChannels, o);
      $('a-status').textContent = 'Done' + (ab.length > keep ? ' (the demo reads the first ' + LIMIT / 60 + ' minutes only)' : '') + '. This is the WAV the browser made; the app would write ' + o.format + '.'; $('a-dl').disabled = false;
    } catch (e) { $('a-status').textContent = 'Could not extract audio: ' + e.message + '.'; }
    $('a-run').disabled = false;
  }
  function showAudioFacts(secs, rate, nch, o) {
    const est = o.format === 'wav' ? secs * rate * (o.mono ? 1 : nch) * 2 : (secs * o.kbps * 1000) / 8, box = $('a-facts'); box.replaceChildren();
    [[clock(secs), 'Length'], [rate + ' Hz, ' + (o.mono ? 'mono' : nch + ' ch'), 'As recorded'], [humanSize(wavBlob.size), 'WAV made here'], ['about ' + humanSize(est), 'In the app as ' + o.format + (o.format === 'wav' ? '' : ' at ' + o.kbps + ' kbit/s')]].forEach(([b, s]) => { const d = document.createElement('div'), bb = document.createElement('b'), ss = document.createElement('span'); bb.textContent = b; ss.textContent = s; d.append(bb, ss); box.append(d); });
    box.hidden = false;
  }

  /* ------------------------------------------------------------ compress */
  const cmpOpts = () => ({ codec: $('c-codec').value, crf: +$('c-crf').value, preset: $('c-preset').value, width: +$('c-w').value });
  async function runCompress() {
    $('c-run').disabled = true; $('c-pair').hidden = true; $('c-bars').hidden = true;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { $('c-status').textContent = 'This browser cannot record video, so it cannot make the preview. The command below still shows what the app runs.'; $('c-run').disabled = false; return; }
    let ac;
    try {
      const v = await openHidden(), span = Math.min(v.duration, 20), kbps = +$('c-br').value, maxw = +$('c-w').value, cw = Math.round(Math.min(maxw || v.videoWidth, v.videoWidth) / 2) * 2, ch = Math.round((cw * v.videoHeight) / v.videoWidth / 2) * 2;
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
      v.muted = false; ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume();
      const src = ac.createMediaElementSource(v), dest = ac.createMediaStreamDestination(); src.connect(dest); // routed to the recorder only, so nothing plays aloud
      const stream = c.captureStream(30); dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)), chunks = [];
      const rec = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: kbps * 1000, audioBitsPerSecond: 96000 }, mime ? { mimeType: mime } : {}));
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); }; const stopped = new Promise((r) => { rec.onstop = r; });
      v.currentTime = 0; await once(v, 'seeked', 4000).catch(() => {}); g.drawImage(v, 0, 0, cw, ch); rec.start(500); await v.play();
      await new Promise((res) => { const id = setInterval(() => { g.drawImage(v, 0, 0, cw, ch); $('c-status').textContent = 'Recording the preview in real time: ' + Math.round((v.currentTime / span) * 100) + '%.'; if (v.currentTime >= span || v.ended) { clearInterval(id); res(); } }, 33); });
      v.pause(); rec.stop(); await stopped; ac.close();
      const out = new Blob(chunks, { type: 'video/webm' }), origPart = (S.size * span) / S.duration;
      showCompressed(out, origPart, span);
    } catch (e) { $('c-status').textContent = 'Could not make the preview: ' + e.message + '.'; if (ac) ac.close(); }
    $('c-run').disabled = false;
  }
  let cUrl = null;
  function showCompressed(out, origPart, span) {
    if (cUrl) URL.revokeObjectURL(cUrl); cUrl = URL.createObjectURL(out);
    $('c-orig').src = S.url; $('c-new').src = cUrl; $('c-pair').hidden = false;
    $('c-orig-meta').textContent = 'Original: about ' + humanSize(origPart) + ' for these ' + span.toFixed(0) + ' seconds (' + humanSize(S.size) + ' for the whole file).';
    $('c-new-meta').textContent = 'Demo preview (WebM): ' + humanSize(out.size) + ' for the same ' + span.toFixed(0) + ' seconds.';
    const pct = Math.max(0, Math.min(100, (out.size / origPart) * 100)), bars = $('c-bars'); bars.replaceChildren();
    const p = document.createElement('p'); p.className = 'meta'; p.textContent = 'Preview is ' + pct.toFixed(0) + '% of the original size' + (pct >= 100 ? ': this clip was already small or already well compressed, so there was little to save.' : ' (' + (100 - pct).toFixed(0) + '% smaller).');
    const b = document.createElement('div'); b.className = 'bar2'; const i = document.createElement('i'); i.style.width = pct + '%'; b.append(i); bars.append(b, p); bars.hidden = false;
    $('c-status').textContent = 'Done. Press play on each to compare.';
  }

  /* ------------------------------------------------------------ wiring */
  function refreshCommands() {
    const name = S.file ? S.name : 'my-video.mp4';
    $('o-fint').textContent = $('f-int').value + ' s'; $('o-fstart').textContent = $('f-start').value + ' s'; $('o-fq').textContent = $('f-q').value;
    $('o-akb').textContent = $('a-kb').value + ' kbit/s'; $('o-cbr').textContent = $('c-br').value + ' kbit/s'; $('o-ccrf').textContent = $('c-crf').value;
    $('f-cmd').textContent = cmdFrames(name, frameOpts()); $('a-cmd').textContent = cmdAudio(name, audioOpts()); $('c-cmd').textContent = cmdCompress(name, cmpOpts());
    $('a-kb').disabled = $('a-fmt').value === 'wav';
  }
  function clearResults() { clearFrames(); $('a-out').hidden = true; $('a-facts').hidden = true; $('a-status').textContent = ''; $('a-dl').disabled = true; $('c-pair').hidden = true; $('c-bars').hidden = true; $('c-status').textContent = ''; }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ['frames', 'audio', 'compress'].forEach((j) => { $('p-' + j).hidden = j !== b.dataset.job; });
    }));
    document.querySelectorAll('.ctl input, .ctl select').forEach((el) => el.addEventListener('input', refreshCommands));
    $('file').addEventListener('change', () => { const f = $('file').files[0]; if (f) useVideo(f, f.name); });
    $('sample').addEventListener('click', async () => {
      $('sample').disabled = true;
      try { const blob = await makeSample(); await useVideo(blob, 'sample-lecture.webm'); } catch (e) { $('srcstatus').textContent = 'Could not make the sample: ' + e.message + '.'; }
      $('sample').disabled = false;
    });
    const pk = $('picker');
    ['dragenter', 'dragover'].forEach((ev) => pk.addEventListener(ev, (e) => { e.preventDefault(); pk.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => pk.addEventListener(ev, (e) => { e.preventDefault(); pk.classList.remove('over'); }));
    pk.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) useVideo(f, f.name); });
    $('f-run').addEventListener('click', runFrames); $('f-zip').addEventListener('click', zipFrames);
    $('a-run').addEventListener('click', runAudio); $('a-dl').addEventListener('click', () => wavBlob && save(wavBlob, stemOf(S.name) + '.wav'));
    $('c-run').addEventListener('click', runCompress);
    refreshCommands();
  });
})();
