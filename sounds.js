/* sounds.js: gentle sounds made in your browser with the Web Audio API. No sound files, nothing downloaded.
   Used by the meditation timer (bells, singing bowl, sound bath) and the kitchen timers on the baking and brewing pages.

   PBEsound.strike(name, freq)  play one sound: 'bell', 'bowl', 'chime', 'gong', 'wood'
   PBEsound.names               the list of one-shot sounds
   PBEsound.ambient(name)       start a background sound ('bath', 'ocean', 'rain', 'drone'); call the returned function to stop it
   PBEsound.timers(host)        add a small kitchen-timer panel (several timers, each with a name and a sound) to an element

   How the sounds are made: a bell or bowl is a handful of sine waves (the "partials") that fade out at different speeds.
   A bowl has partial pairs a few hertz apart, which is what makes the slow, shimmering "wobble". Rain and ocean are
   filtered noise; the ocean's volume rises and falls slowly. */
const PBEsound = (() => {
  let ctx = null;
  const audio = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  const names = ['bell', 'bowl', 'chime', 'gong', 'wood'];

  /** One partial: a sine at `f` hertz that rises quickly to `vol` and fades over `dur` seconds. */
  function partial(c, out, f, vol, dur, when, attack) {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(out); o.start(when); o.stop(when + dur + 0.1);
  }
  function strike(name, freq, dest) {
    try {
      const c = audio(), t = c.currentTime + 0.02, out = dest || c.destination, f = freq || { bell: 528, bowl: 220, chime: 1320, gong: 98, wood: 700 }[name] || 528;
      if (name === 'bowl') { [[1, 0.32, 9], [1.004, 0.3, 9], [2.71, 0.14, 6], [2.725, 0.12, 6], [5.4, 0.05, 3]].forEach(([m, v, d]) => partial(c, out, f * m, v, d, t, 0.05)); }
      else if (name === 'chime') { [[1, 0.22, 4], [2.76, 0.1, 2.6], [5.4, 0.06, 1.6]].forEach(([m, v, d]) => partial(c, out, f * m, v, d, t, 0.004)); }
      else if (name === 'gong') { [[1, 0.35, 10], [1.5, 0.2, 8], [2.02, 0.18, 7], [2.99, 0.1, 5], [4.2, 0.06, 3]].forEach(([m, v, d]) => partial(c, out, f * m, v, d, t, 0.06)); }
      else if (name === 'wood') { partial(c, out, f, 0.4, 0.18, t, 0.002); partial(c, out, f * 2.3, 0.15, 0.1, t, 0.002); }
      else { [[1, 0.4, 5], [2, 0.12, 3.5], [3.01, 0.06, 2]].forEach(([m, v, d]) => partial(c, out, f * m, v, d, t, 0.015)); }   // bell
    } catch (e) { /* no audio available: carry on silently */ }
  }

  /** A looping noise source (white noise through a filter). */
  function noise(c, type, freq, vol) {
    const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = vol; s.connect(f); f.connect(g); s.start(); return { s, g, f };
  }
  /** Start a background sound. Returns a function that fades it out and stops it. */
  function ambient(kind) {
    try {
      const c = audio(), master = c.createGain(); master.gain.value = 0.0001; master.gain.exponentialRampToValueAtTime(1, c.currentTime + 3); master.connect(c.destination);
      const stops = [], timers = [];
      if (kind === 'rain') { const n = noise(c, 'lowpass', 3200, 0.12), h = noise(c, 'highpass', 5000, 0.03); n.g.connect(master); h.g.connect(master); stops.push(() => { n.s.stop(); h.s.stop(); }); }
      if (kind === 'ocean') {
        const n = noise(c, 'lowpass', 700, 0.0), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.12; n.g.gain.value = 0.14; lfo.connect(lg); lg.connect(n.g.gain); n.g.connect(master); lfo.start(); n.s.addEventListener('ended', () => {});
        stops.push(() => { n.s.stop(); lfo.stop(); });
      }
      if (kind === 'drone' || kind === 'bath') {
        [73.42, 110, 146.83, 220].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.045 / (i * 0.5 + 1); l.frequency.value = 0.05 + i * 0.03; lg.gain.value = g.gain.value * 0.6; l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(); l.start(); stops.push(() => { o.stop(); l.stop(); }); });
      }
      if (kind === 'bath') {                                   // random bowls and chimes from a calm pentatonic scale (D, E, G, A, B)
        const scale = [146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440], quiet = c.createGain(); quiet.gain.value = 0.55; quiet.connect(master);
        const next = () => { const f = scale[Math.floor(Math.random() * scale.length)], k = Math.random() < 0.8 ? 'bowl' : Math.random() < 0.5 ? 'gong' : 'chime'; strike(k, k === 'gong' ? f / 2 : f, quiet); timers.push(setTimeout(next, 6000 + Math.random() * 12000)); };
        timers.push(setTimeout(next, 1500));
      }
      return () => { timers.forEach(clearTimeout); try { master.gain.cancelScheduledValues(c.currentTime); master.gain.setValueAtTime(master.gain.value, c.currentTime); master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2); } catch (e) { /* ignore */ } setTimeout(() => stops.forEach((s) => { try { s(); } catch (e) { /* already stopped */ } }), 2200); };
    } catch (e) { return () => {}; }
  }

  /** A little kitchen-timer panel: add several timers, each rings with a sound you choose when it reaches zero. */
  function timers(host) {
    const box = document.createElement('div'); box.style.cssText = 'margin:32px 0;border-top:1px solid var(--line);padding-top:16px';
    box.innerHTML = '<h2>Kitchen timers</h2><p class="meta">Keep this tab open: the sound plays here when a timer reaches zero. Sounds are made in your browser. Press Test to check your volume.</p>';
    const form = document.createElement('div'); form.className = 'form';
    form.innerHTML = '<label class="fld">Name<input type="text" id="kt_name" placeholder="e.g. fold the dough"></label><label class="fld">Minutes<input type="number" id="kt_min" min="0.1" step="any" value="30"></label><label class="fld">Sound<select id="kt_snd"></select></label>';
    const sel = form.querySelector('#kt_snd'); names.forEach((n) => { const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
    const list = document.createElement('ul'); list.style.cssText = 'list-style:none;padding:0';
    const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Start timer'; const test = document.createElement('button'); test.type = 'button'; test.textContent = 'Test sound'; test.addEventListener('click', () => strike(sel.value));
    const items = [];
    const draw = () => { list.replaceChildren(...items.map((it, i) => { const li = document.createElement('li'); li.style.cssText = 'padding:6px 0;border-top:1px solid var(--line);display:flex;gap:12px;align-items:center'; const left = Math.max(0, Math.round((it.end - Date.now()) / 1000)); const t = document.createElement('span'); t.textContent = it.name + ': ' + (left ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : 'done'); const x = document.createElement('button'); x.type = 'button'; x.textContent = left ? 'Cancel' : 'Clear'; x.addEventListener('click', () => { items.splice(i, 1); draw(); }); li.append(t, x); return li; })); };
    add.addEventListener('click', () => { const m = Number(form.querySelector('#kt_min').value) || 1; audio(); items.push({ name: form.querySelector('#kt_name').value.trim() || 'Timer', end: Date.now() + m * 60000, snd: sel.value, rang: false }); draw(); });
    setInterval(() => { let ch = false; items.forEach((it) => { if (!it.rang && Date.now() >= it.end) { it.rang = true; ch = true; strike(it.snd); setTimeout(() => strike(it.snd), 1800); } }); if (items.length || ch) draw(); }, 500);
    box.append(form, add, ' ', test, list); (host || document.getElementById('main') || document.body).appendChild(box);
  }
  return { strike, names, ambient, timers };
})();
