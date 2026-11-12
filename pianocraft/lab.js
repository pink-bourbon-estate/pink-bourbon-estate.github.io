/* PianoCraft score lab: mark up a score (pen, highlighter, text, fingering), simplify it, and tick off practice steps.
   Markup is saved in this browser only (localStorage), separately for each piece and difficulty level. */
(() => {
  const $ = (id) => document.getElementById(id), KEY = 'pbe-pianocraft-lab-v1';
  const STEPS = ['Listen to it, and sing or hum the tune', 'Count the beats and clap the rhythm', 'Right hand alone, slowly', 'Left hand alone, slowly', 'Hands together, slowly', 'Learn it by heart', 'Bring it up to tempo', 'Transpose it into another key'];
  let score, drawn, tool = 'pen', finger = '1', level = 5, store = {}, items = [], cur = null;
  const load = () => { try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage blocked: markup lasts until you leave the page */ } };
  const k = () => score.meta.id + ':' + level;
  const status = (t) => { $('status').textContent = t; };

  /** Turn a saved item into an SVG shape inside the markup layer. */
  function shape(it, layer) {
    if (it.t === 'pen' || it.t === 'hl') return PC.el('path', { d: it.d, class: it.t === 'pen' ? 'mk-pen' : 'mk-hl' }, layer);
    const t = PC.el('text', { x: it.x, y: it.y, class: it.t === 'text' ? 'mk-text' : 'mk-fing' }, layer); t.textContent = it.s; return t;
  }
  function draw() {
    const notes = PC.simplify(score, level); drawn = PC.engrave(score, notes, { width: 1000 }); const svg = drawn.svg;
    const layer = PC.el('g', { id: 'mk' }, svg); items = (store[k()] || {}).items || []; items.forEach((it) => shape(it, layer));
    $('score').replaceChildren(svg); svg.style.touchAction = 'none'; wire(svg, layer);
    $('count').textContent = notes.length + ' notes shown (of ' + score.notes.length + ')';
    const done = (store[k()] || {}).steps || []; document.querySelectorAll('#steps input').forEach((c, i) => { c.checked = !!done[i]; });
  }
  /** Mouse, finger or pen: convert a pointer position to score coordinates. */
  function pt(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 }; }
  function wire(svg, layer) {
    svg.addEventListener('pointerdown', (e) => {
      const p = pt(svg, e);
      if (tool === 'pen' || tool === 'hl') { cur = { t: tool, d: 'M' + p.x + ' ' + p.y }; cur.el = shape(cur, layer); svg.setPointerCapture(e.pointerId); }
      else if (tool === 'text') { const s = $('txt').value.trim(); if (s) add({ t: 'text', x: p.x, y: p.y, s }, layer); }
      else if (tool === 'fing') { let best = null, bd = 1e9; drawn.geo.heads.forEach((h) => { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h; } }); if (best && bd < 40) add({ t: 'fing', x: best.x, y: best.y + (best.hand === 'R' ? -14 : 22), s: finger }, layer); }
    });
    svg.addEventListener('pointermove', (e) => { if (!cur) return; const p = pt(svg, e); cur.d += ' L' + p.x + ' ' + p.y; cur.el.setAttribute('d', cur.d); });
    const end = () => { if (!cur) return; const it = { t: cur.t, d: cur.d }; cur.el.remove(); cur = null; if (it.d.includes('L')) add(it, layer); };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  }
  function add(it, layer) { items.push(it); shape(it, layer); (store[k()] = store[k()] || {}).items = items; save(); }
  function undo() { if (!items.length) return; items.pop(); (store[k()] = store[k()] || {}).items = items; save(); draw(); }
  function clear() { items = []; (store[k()] = store[k()] || {}).items = []; save(); draw(); }

  async function open(id) {
    score = await PC.loadPiece(id, '../scores/'); $('title').textContent = score.meta.title; $('by').textContent = score.meta.by + ' · ' + score.meta.src; draw(); status('Pick a tool, then draw on the score.');
  }
  document.addEventListener('DOMContentLoaded', () => {
    load(); PC.PIECES.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.title; $('piece').appendChild(o); });
    $('steps').replaceChildren(...STEPS.map((s, i) => { const li = document.createElement('li'), lb = document.createElement('label'), c = document.createElement('input'); c.type = 'checkbox'; c.addEventListener('change', () => { const e = (store[k()] = store[k()] || {}); e.steps = e.steps || []; e.steps[i] = c.checked; save(); }); lb.append(c, document.createTextNode(s)); li.appendChild(lb); return li; }));
    document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => { tool = b.dataset.tool; document.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', x === b)); status(({ pen: 'Pen: draw on the score.', hl: 'Highlighter: drag over bars or notes.', text: 'Text: type a note in the box, then click where it should go.', fing: 'Fingering: click near a note to add the finger number.' })[tool]); }));
    document.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { finger = b.dataset.f; document.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b)); tool = 'fing'; document.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.tool === 'fing')); }));
    $('piece').addEventListener('change', () => open($('piece').value)); $('undo').addEventListener('click', undo); $('clear').addEventListener('click', clear); $('print').addEventListener('click', () => window.print());
    $('level').addEventListener('input', () => { level = Number($('level').value); $('level_o').textContent = ['', '1: tune on main beats', '2: whole tune', '3: + held bass', '4: + bass line', '5: tune + one harmony note', '6: full right hand', '7: everything'][level]; draw(); });
    $('svg').addEventListener('click', () => { const c = $('score').firstChild.cloneNode(true), st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = '.stl,.stem{stroke:#111}.flag{stroke:#111;fill:none}.full{fill:#111}.open{fill:#fff;stroke:#111}.dot{fill:#111}text{font:12px sans-serif}.clef{font:italic 700 30px Georgia,serif}.barno{fill:#888;font-size:9px}.mk-pen{fill:none;stroke:#e0245e;stroke-width:1.8}.mk-hl{fill:none;stroke:#ffd400;stroke-width:9;opacity:.45}.mk-text{fill:#2a7fff}.mk-fing{fill:#e0245e;font-weight:700;text-anchor:middle}'; c.insertBefore(st, c.firstChild); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); const s = new XMLSerializer().serializeToString(c); PC.download(score.meta.id + '-marked.svg', s, 'image/svg+xml'); });
    $('mid').addEventListener('click', () => PC.download(score.meta.id + '-level' + level + '.mid', PC.writeMidi(score, PC.simplify(score, level), score.bpm, 0)));
    $('level').value = 5; $('level_o').textContent = '5: tune + one harmony note'; open('am-anh116');
  });
})();
