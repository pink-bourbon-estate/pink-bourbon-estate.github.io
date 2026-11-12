/* Sightline player page: pick a piece, hear it on a sampled piano, and practise with the controls.
   Uses pc.js for everything musical. Each control just changes a setting on the Player (see pc.js). */
(() => {
  const $ = (id) => document.getElementById(id), BASE = '../scores/', SAMPLES = '../samples/';
  const LEVELS = ['', '1: the tune on the main beats', '2: the whole tune', '3: tune plus held bass notes', '4: tune plus the bass line', '5: tune with one harmony note', '6: full right hand', '7: everything'];
  let fall, score, player, drawn, level = 7, on = new Map(), nowBar = -1;

  /** Draw (or redraw) the score for the current difficulty and wire up clicks. */
  function draw() {
    const notes = PC.simplify(score, level); player.setNotes(notes);
    drawn = PC.engrave(score, notes, { width: 1000 }); const svg = drawn.svg, geo = drawn.geo;
    const first = svg.firstChild, hl = {};
    geo.bars.forEach((b) => { const r = PC.el('rect', { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, class: 'barhl' }); svg.insertBefore(r, first); hl[b.i] = r;
      const hit = PC.el('rect', { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, class: 'barhit' }); hit.addEventListener('click', () => clickBar(b.i)); svg.appendChild(hit); });
    drawn.hl = hl; drawn.ph = PC.el('line', { class: 'playhead', y1: 0, y2: 0, x1: 0, x2: 0, visibility: 'hidden' }, svg);
    $('score').replaceChildren(svg); on.clear(); shade();
    $('count').textContent = notes.length + ' notes shown (of ' + score.notes.length + ')';
  }
  /** Colour the bars of the loop region. */
  function shade() { if (!drawn) return; Object.keys(drawn.hl).forEach((i) => { drawn.hl[i].classList.toggle('loop', player.loop.on && i >= player.loop.a && i <= player.loop.b); drawn.hl[i].classList.toggle('now', Number(i) === nowBar); }); }
  /** Click a bar: first click sets the loop start, a later bar extends the end, earlier resets. */
  function clickBar(i) {
    const L = player.loop;
    if (!L.on || i < L.a || (L.a !== L.b && i >= L.a)) { L.a = i; L.b = i; } else { L.b = Math.max(L.a, i); }
    L.on = true; $('loopon').checked = true; $('la').value = L.a + 1; $('lb').value = L.b + 1; shade(); status('Loop: bars ' + (L.a + 1) + ' to ' + (L.b + 1) + '. Click another bar to change the end.');
  }
  const status = (t) => { $('status').textContent = t; };
  function onEvent(e) {
    if (fall) fall.onEvent(e);
    if (e.type === 'step') {
      const delay = Math.max(0, (e.time - PC.Piano.ctx.currentTime) * 1000);
      setTimeout(() => {
        e.ids.forEach((id) => { const n = drawn.geo.note[id]; if (n) { n.el.classList.add('on'); on.set(id, performance.now() + Math.max(120, e.off * 1000)); } });
        const bar = Math.floor(e.pos / score.barLen); if (bar !== nowBar) { nowBar = bar; shade(); const b = drawn.geo.bars.find((x) => x.i === bar); if (b) { const box = $('score'), y = (b.y0 / drawn.geo.height) * box.scrollHeight; if (y < box.scrollTop || y > box.scrollTop + box.clientHeight - 120) box.scrollTop = y - 20; } }
        $('pos').value = e.pos; $('where').textContent = 'Bar ' + (bar + 1) + ' of ' + score.bars;
      }, delay);
    } else if (e.type === 'seek') { $('pos').value = e.pos; nowBar = Math.floor(e.pos / score.barLen); $('where').textContent = 'Bar ' + (nowBar + 1) + ' of ' + score.bars; shade(); }
    else if (e.type === 'pause' || e.type === 'end') { $('play').textContent = 'Play'; if (e.type === 'end') status('Finished.'); }
  }
  /** Switch the highlights off when a note's time is up. */
  function frame() { const t = performance.now(); on.forEach((end, id) => { if (t >= end) { const n = drawn.geo.note[id]; if (n) n.el.classList.remove('on'); on.delete(id); } }); requestAnimationFrame(frame); }

  async function open(id) {
    if (player) player.pause();
    score = await PC.loadPiece(id, BASE); player = new PC.Player(score, onEvent);
    $('title').textContent = score.meta.title; $('by').textContent = score.meta.by + ' · ' + score.meta.src;
    $('pos').max = score.total - 1; $('pos').value = 0; $('tempo').value = 100; $('trans').value = 0; level = Number($('level').value);
    player.bpm = score.bpm; settings(); draw(); onEvent({ type: 'seek', pos: 0 }); status(score.bars + ' bars, ' + score.num + '/' + score.den + ', about ' + score.bpm + ' beats a minute.');
  }
  /** Read every control into the player. */
  function settings() {
    const pct = Number($('tempo').value); player.bpm = Math.round(score.bpm * pct / 100); $('tempo_o').textContent = pct + '% (about ' + player.bpm + ' bpm)';
    player.transpose = Number($('trans').value); $('trans_o').textContent = (player.transpose > 0 ? '+' : '') + player.transpose + ' semitones';
    player.hands = { R: $('hR').checked, L: $('hL').checked }; player.metronome = $('metro').checked; player.countIn = $('count_in').checked;
    const L = player.loop; L.on = $('loopon').checked; L.a = Math.max(0, Math.min(score.bars - 1, (Number($('la').value) || 1) - 1)); L.b = Math.max(L.a, Math.min(score.bars - 1, (Number($('lb').value) || score.bars) - 1)); L.times = Number($('times').value) || 0;
    $('level_o').textContent = LEVELS[Number($('level').value)]; shade();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    PC.PIECES.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.title + ' (' + p.level + ')'; $('piece').appendChild(o); });
    $('piece').value = 'am-anh116';
    ['tempo', 'trans', 'hR', 'hL', 'metro', 'count_in', 'loopon', 'la', 'lb', 'times'].forEach((id) => $(id).addEventListener('input', settings));
    $('level').addEventListener('input', () => { level = Number($('level').value); settings(); draw(); });
    $('piece').addEventListener('change', () => open($('piece').value));
    $('pos').addEventListener('input', () => player.seek(Number($('pos').value)));
    $('play').addEventListener('click', async () => {
      if (player.playing) { player.pause(); return; }
      $('play').textContent = 'Loading...'; if (!PC.Piano.ready) { status('Loading the piano (about 2 MB, once)...'); await PC.Piano.load(SAMPLES, (f) => status('Loading the piano: ' + Math.round(f * 100) + '%')); }
      status(PC.Piano.fallback ? 'The recordings could not load, so a simple synthesised piano is used.' : 'Playing on a sampled grand piano.'); await player.play(); $('play').textContent = 'Pause';
    });
    $('stop').addEventListener('click', () => { player.stop(); on.forEach((e, id) => drawn.geo.note[id].el.classList.remove('on')); on.clear(); });
    $('dl').addEventListener('click', () => PC.download(score.meta.id + '-level' + level + '.mid', PC.writeMidi(score, PC.simplify(score, level), player.bpm, player.transpose)));
    fall = PCfall.attach($('fall'), () => player);
    const q = new URLSearchParams(location.search).get('piece'); if (q && PC.PIECES.some((x) => x.id === q)) $('piece').value = q;
    await open($('piece').value); requestAnimationFrame(frame);
  });
})();
