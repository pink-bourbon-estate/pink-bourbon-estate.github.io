/* Sightline "PDF to MIDI" demo page.
   HONEST NOTE: a browser cannot reliably read a PDF's music symbols, so this page does not. It takes a public-domain
   piece (stored as MIDI), draws it as a page of sheet music, then ANIMATES the steps the desktop app performs on a real PDF
   (find the staves, find the barlines, find the music-font symbols, turn them into pitch and rhythm). The boxes are drawn
   from the MIDI data we already have. The MIDI file you download is that data written back out. */
(() => {
  const $ = (id) => document.getElementById(id), NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  let score, drawn, busy = false;
  const pitchName = (p, sf) => { const s = PC.spell(p, sf); return NAMES[((s.step % 7) + 7) % 7] + (s.acc > 0 ? '#' : s.acc < 0 ? 'b' : '') + (Math.floor(s.step / 7)); };
  const DURN = { 16: 'whole', 12: 'dotted half', 8: 'half', 6: 'dotted quarter', 4: 'quarter', 3: 'dotted eighth', 2: 'eighth', 1: 'sixteenth' };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const status = (t) => { $('status').textContent = t; };
  const stage = (n, state) => { const el = document.querySelectorAll('#stages span')[n]; el.className = state; };

  async function open(id) {
    score = await PC.loadPiece(id, '../scores/'); drawn = PC.engrave(score, score.notes, { width: 1000 });
    $('page').replaceChildren(drawn.svg); drawn.svg.style.opacity = '0.9'; $('results').hidden = true; document.querySelectorAll('#stages span').forEach((s) => (s.className = ''));
    status(score.meta.title + ': ' + score.bars + ' bars. Press "Read this page".'); $('dl').disabled = true; $('hear').disabled = true;
  }
  async function read() {
    if (busy) return; busy = true; $('read').disabled = true; const svg = drawn.svg, g = PC.el('g', {}, svg), geo = drawn.geo, t = 1 - Number($('speed').value) / 10 + 0.1;
    const wait = (ms) => sleep(ms * (0.1 + t * 3));
    // 1: staves
    stage(0, 'on'); status('1. Finding the staves (the groups of five lines)...');
    for (const s of geo.staves) { PC.el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, class: 'ov-staff' }, g); await wait(110); } stage(0, 'done');
    // 2: barlines
    stage(1, 'on'); status('2. Finding the barlines and counting bars...');
    for (const b of geo.bars) { PC.el('rect', { x: b.x0, y: b.y0 + 12, width: b.x1 - b.x0, height: b.y1 - b.y0 - 18, class: 'ov-bar' }, g); await wait(35); } stage(1, 'done');
    // 3: glyphs, swept left to right per system
    stage(2, 'on'); status('3. Finding the music-font symbols: noteheads, stems, flags and accidentals...');
    let n = 0; const scan = PC.el('line', { class: 'ov-scan', x1: 0, x2: 0, y1: 0, y2: 0 }, g);
    for (const sy of geo.systems.keys()) {
      const sys = geo.systems[sy], heads = geo.heads.filter((h) => h.sys === sy).sort((a, b) => a.x - b.x); scan.setAttribute('y1', sys.y + 10); scan.setAttribute('y2', sys.y + sys.h - 20);
      for (const h of heads) { scan.setAttribute('x1', h.x); scan.setAttribute('x2', h.x); PC.el('rect', { x: h.x - 8, y: h.y - 7, width: 16, height: 14, class: 'ov-head' }, g); n++; if (n % 3 === 0) await wait(14); }
    }
    scan.remove(); stage(2, 'done');
    // 4: pitch and rhythm labels (only on the first system, to keep the page readable)
    stage(3, 'on'); status('4. Reading each symbol: which line or space it sits on gives the pitch, its shape gives the length...');
    for (const h of geo.heads.filter((x) => x.sys === 0)) { PC.el('text', { x: h.x - 6, y: h.y + (h.hand === 'R' ? -12 : 20), class: 'ov-pitch' }, g).textContent = pitchName(h.pitch, score.sf); await wait(8); }
    stage(3, 'done'); stage(4, 'done');
    // results table
    const acc = geo.heads.filter((h) => h.acc).length, rows = score.notes.slice(0, 14);
    $('stats').textContent = geo.staves.length + ' staves, ' + score.bars + ' bars, ' + geo.heads.length + ' noteheads, ' + acc + ' accidentals, time signature ' + score.num + '/' + score.den + ', about ' + score.bpm + ' beats a minute.';
    $('rows').replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); [Math.floor(r.start / score.barLen) + 1, 1 + (r.start % score.barLen) / (16 / score.den), r.hand === 'R' ? 'right' : 'left', pitchName(r.pitch, score.sf) + ' (MIDI ' + r.pitch + ')', DURN[PC.stdDur(r.dur)]].forEach((c) => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }); return tr; }));
    $('results').hidden = false; $('dl').disabled = false; $('hear').disabled = false; status('Done: ' + score.notes.length + ' notes turned into MIDI. Download the file, or hear it on the piano.'); busy = false; $('read').disabled = false;
  }
  document.addEventListener('DOMContentLoaded', () => {
    PC.PIECES.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.title; $('piece').appendChild(o); });
    $('piece').addEventListener('change', () => { if (!busy) open($('piece').value); }); $('read').addEventListener('click', read);
    $('dl').addEventListener('click', () => PC.download(score.meta.id + '.mid', PC.writeMidi(score, score.notes, score.bpm, 0)));
    $('hear').addEventListener('click', async () => { if (window.__pl && window.__pl.playing) { window.__pl.pause(); $('hear').textContent = 'Hear it'; return; } $('hear').textContent = 'Loading...'; if (!PC.Piano.ready) await PC.Piano.load('../samples/'); window.__pl = new PC.Player(score, (e) => { if (e.type === 'end' || e.type === 'pause') $('hear').textContent = 'Hear it'; }); await window.__pl.play(); $('hear').textContent = 'Stop'; });
    $('openp').addEventListener('click', () => { location.href = '../player/?piece=' + encodeURIComponent($('piece').value); });
    open('am-anh116');
  });
})();
