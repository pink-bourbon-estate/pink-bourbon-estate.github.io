/* Template: the panel library (blocks.js).
   Every panel on this site is saved here as an editable template. A panel is plain data:
     t       its short name           name/group   how it is listed        defaults   the starting values
     fields  the boxes shown when you edit it: [key, type, label, optional choices]
     html    a function that turns the values into HTML
   The builder (builder.js) uses this list to draw panels, edit them and export them.
   `runtime` is the small script that makes panels work (sliders, tick boxes, clock...). It is copied into every
   exported page, so an exported page needs nothing else and loads nothing from other sites. */
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
  /** "label, value" lines -> [[label, number], ...] */
  const pairs = (s) => lines(s).map((l) => { const i = l.lastIndexOf(','); return [l.slice(0, i < 0 ? l.length : i).trim(), parseFloat(i < 0 ? 0 : l.slice(i + 1)) || 0]; });
  const head = (p) => (p.title ? '<h3>' + esc(p.title) + '</h3>' : '');

  /* ---- charts: drawn as SVG, so they follow light and dark mode and need no library ---- */
  function barChart(p) {
    const d = pairs(p.data), max = Math.max(1, ...d.map((x) => x[1])), w = 600, h = 220, bw = w / Math.max(1, d.length);
    return head(p) + '<svg class="pb-chart" viewBox="0 0 ' + w + ' ' + (h + 30) + '" role="img" aria-label="' + esc(p.title || 'Bar chart') + '"><line x1="0" y1="' + h + '" x2="' + w + '" y2="' + h + '"/>' +
      d.map((x, i) => { const bh = (x[1] / max) * (h - 20); return '<rect class="bar" x="' + (i * bw + bw * 0.15) + '" y="' + (h - bh) + '" width="' + bw * 0.7 + '" height="' + bh + '"><title>' + esc(x[0]) + ': ' + x[1] + esc(p.unit) + '</title></rect><text x="' + (i * bw + bw / 2) + '" y="' + (h + 16) + '" text-anchor="middle">' + esc(x[0]) + '</text><text x="' + (i * bw + bw / 2) + '" y="' + (h - bh - 4) + '" text-anchor="middle">' + x[1] + '</text>'; }).join('') + '</svg>';
  }
  function lineChart(p) {
    const d = pairs(p.data), max = Math.max(1, ...d.map((x) => x[1])), w = 600, h = 220, step = d.length > 1 ? (w - 40) / (d.length - 1) : 0;
    const pt = d.map((x, i) => [20 + i * step, h - 10 - (x[1] / max) * (h - 30)]);
    return head(p) + '<svg class="pb-chart" viewBox="0 0 ' + w + ' ' + (h + 30) + '" role="img" aria-label="' + esc(p.title || 'Line chart') + '"><line x1="0" y1="' + h + '" x2="' + w + '" y2="' + h + '"/>' +
      '<polyline fill="none" stroke="currentColor" stroke-width="2" points="' + pt.map((q) => q.join(',')).join(' ') + '"/>' +
      pt.map((q, i) => '<circle class="bar" cx="' + q[0] + '" cy="' + q[1] + '" r="4"><title>' + esc(d[i][0]) + ': ' + d[i][1] + esc(p.unit) + '</title></circle><text x="' + q[0] + '" y="' + (h + 16) + '" text-anchor="middle">' + esc(d[i][0]) + '</text>').join('') + '</svg>';
  }

  /* ---- paper: plain, grid and Cornell notes. You can type on them; what you type is kept in this browser ---- */
  const paper = (id, cls, rows) => '<textarea class="pb-paper ' + cls + '" rows="' + rows + '" data-id="' + id + '" aria-label="Notes"></textarea>';

  /* ---- piano: two octaves as SVG. Click a key (or tap) to hear it ---- */
  function piano(p) {
    const n = Math.max(1, Math.min(4, +p.octaves || 2)), W = 7 * n, kw = 100 / W, names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], blacks = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 };
    const semis = [0, 2, 4, 5, 7, 9, 11]; let white = '', black = '';
    for (let i = 0; i < W; i++) {
      const note = 12 * Math.floor(i / 7) + semis[i % 7];
      white += '<rect class="wk" data-semi="' + note + '" x="' + i * kw + '%" y="0" width="' + kw + '%" height="100%"><title>' + names[i % 7] + '</title></rect>' + (p.labels ? '<text x="' + (i * kw + kw / 2) + '%" y="94%" text-anchor="middle">' + names[i % 7] + '</text>' : '');
      if (blacks[i % 7] != null) black += '<rect class="bk" data-semi="' + (note + 1) + '" x="' + (i * kw + kw * 0.65) + '%" y="0" width="' + kw * 0.7 + '%" height="60%"/>';
    }
    return head(p) + '<svg class="pb-piano" width="100%" height="150" role="group" aria-label="Piano keyboard, click a key to hear it">' + white + black + '</svg>';
  }
  /* ---- guitar / bass tab: one line per string, type fret numbers between the dashes ---- */
  function tab(p) {
    const names = +p.strings === 4 ? ['G', 'D', 'A', 'E'] : ['e', 'B', 'G', 'D', 'A', 'E'], len = Math.max(8, Math.min(60, +p.length || 32));
    return head(p) + '<textarea class="pb-tab" rows="' + names.length + '" data-id="t" spellcheck="false" aria-label="Tab" data-default="' + esc(names.map((s) => s + '|' + '-'.repeat(len) + '|').join('\n')) + '"></textarea>';
  }

  const B = {};
  const add = (t, name, group, defaults, fields, html) => { B[t] = { t, name, group, defaults, fields, html }; };

  /* ---- text ---- */
  add('heading', 'Heading', 'Text', { text: 'A heading', level: '2' }, [['text', 'text', 'Text'], ['level', 'select', 'Size', ['1', '2', '3']]], (p) => '<h' + p.level + '>' + esc(p.text) + '</h' + p.level + '>');
  add('text', 'Paragraph', 'Text', { text: 'Write something here. A blank line starts a new paragraph.' }, [['text', 'area', 'Text']], (p) => String(p.text).split(/\n\s*\n/).map((x) => '<p>' + esc(x) + '</p>').join(''));
  add('note', 'Note box', 'Text', { text: 'A short note that stands out.' }, [['text', 'area', 'Text']], (p) => '<p class="note">' + esc(p.text) + '</p>');
  add('faq', 'Questions and answers', 'Text', { data: 'Is it free?|Yes.\nDoes it track me?|No.' }, [['data', 'area', 'One per line: question|answer']], (p) => lines(p.data).map((l) => { const [q, ...a] = l.split('|'); return '<details><summary>' + esc(q) + '</summary><p>' + esc(a.join('|')) + '</p></details>'; }).join(''));
  add('hero', 'Big opening', 'Text', { title: 'Tools, ideas and the code behind them.', text: 'A small place for things I made.', button: 'Start', link: '#' }, [['title', 'text', 'Title'], ['text', 'area', 'Text'], ['button', 'text', 'Button label (blank for none)'], ['link', 'text', 'Button link']], (p) => '<div class="pb-hero"><h1>' + esc(p.title) + '</h1><p class="lede">' + esc(p.text) + '</p>' + (p.button ? '<p><a class="btn" href="' + esc(p.link) + '">' + esc(p.button) + '</a></p>' : '') + '</div>');
  add('html', 'Custom HTML', 'Text', { code: '<p>Your own HTML goes here.</p>' }, [['code', 'area', 'HTML (scripts are not allowed here)']], (p) => String(p.code).replace(/<\s*(script|iframe|object|embed)[\s\S]*?<\/\s*\1\s*>/gi, '').replace(/<\s*(script|iframe|object|embed)[^>]*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''));

  /* ---- charts and tables ---- */
  add('bar', 'Bar chart', 'Charts and tables', { title: 'Cups per day', data: 'Mon, 3\nTue, 5\nWed, 2\nThu, 4\nFri, 6', unit: '' }, [['title', 'text', 'Title'], ['data', 'area', 'One per line: label, number'], ['unit', 'text', 'Unit (optional)']], barChart);
  add('line', 'Line chart', 'Charts and tables', { title: 'Weight over time', data: 'Jan, 70\nFeb, 69\nMar, 68.5\nApr, 68\nMay, 67', unit: ' kg' }, [['title', 'text', 'Title'], ['data', 'area', 'One per line: label, number'], ['unit', 'text', 'Unit (optional)']], lineChart);
  add('table', 'Table', 'Charts and tables', { title: '', data: 'Name, Amount, Note\nFlour, 500, strong\nWater, 350, warm' }, [['title', 'text', 'Title'], ['data', 'area', 'One row per line, columns split by commas. The first row is the heading.']], (p) => { const r = lines(p.data).map((l) => l.split(',').map((c) => c.trim())); if (!r.length) return ''; return head(p) + '<div class="tablewrap"><table><thead><tr>' + r[0].map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + r.slice(1).map((x) => '<tr>' + x.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; });
  add('stats', 'Big numbers', 'Charts and tables', { data: 'Recipes, 24\nBakes this year, 112\nStreak, 9' }, [['data', 'area', 'One per line: label, number']], (p) => '<div class="statrow">' + lines(p.data).map((l) => { const i = l.lastIndexOf(','); return '<div class="stat"><div class="big">' + esc(l.slice(i + 1).trim()) + '</div><span>' + esc(l.slice(0, i).trim()) + '</span></div>'; }).join('') + '</div>');

  /* ---- controls ---- */
  add('slider', 'Slider', 'Controls', { title: 'How hot is the water?', min: 20, max: 100, step: 1, value: 60, unit: ' °C' }, [['title', 'text', 'Label'], ['min', 'num', 'Smallest'], ['max', 'num', 'Largest'], ['step', 'num', 'Step'], ['value', 'num', 'Start at'], ['unit', 'text', 'Unit']], (p) => '<label class="fld pb-slider">' + esc(p.title) + ' <b><output>' + esc(p.value) + '</output>' + esc(p.unit) + '</b><input class="slider" type="range" min="' + +p.min + '" max="' + +p.max + '" step="' + +p.step + '" value="' + +p.value + '"></label>');
  add('dropdown', 'Drop-down menu', 'Controls', { title: 'Brew method', data: 'Espresso|18 g in, 36 g out\nPour over|15 g to 250 g water\nFrench press|30 g to 500 g water' }, [['title', 'text', 'Label'], ['data', 'area', 'One per line: choice|what to show']], (p) => '<label class="fld pb-drop">' + esc(p.title) + '<select>' + lines(p.data).map((l) => '<option value="' + esc(l.split('|').slice(1).join('|')) + '">' + esc(l.split('|')[0]) + '</option>').join('') + '</select></label><p class="pb-out note"></p>');
  add('toggle', 'Toggle buttons', 'Controls', { data: 'Metric\nImperial' }, [['data', 'area', 'One button per line (one is on at a time)']], (p) => '<p class="pb-toggle">' + lines(p.data).map((l, i) => '<button type="button" aria-pressed="' + (i === 0) + '">' + esc(l) + '</button>').join(' ') + '</p>');
  add('habits', 'Habit boxes (x grid)', 'Controls', { title: 'This week', data: 'Walk\nStretch\nRead', days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' }, [['title', 'text', 'Title'], ['data', 'area', 'One habit per line'], ['days', 'text', 'Column names, separated by commas']], (p) => { const d = String(p.days).split(',').map((x) => x.trim()).filter(Boolean); return head(p) + '<div class="tablewrap"><table class="xgrid"><thead><tr><th></th>' + d.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + lines(p.data).map((h, r) => '<tr><td>' + esc(h) + '</td>' + d.map((x, c) => '<td><button type="button" class="xbox" data-id="x' + r + '-' + c + '" aria-pressed="false" aria-label="' + esc(h + ' ' + x) + '"></button></td>').join('') + '</tr>').join('') + '</tbody></table></div>'; });
  add('checklist', 'Tick boxes', 'Controls', { title: 'Shopping', data: 'Flour\nSalt\nYeast' }, [['title', 'text', 'Title'], ['data', 'area', 'One item per line']], (p) => head(p) + '<ul class="checklist">' + lines(p.data).map((l, i) => '<li><label><input type="checkbox" data-id="c' + i + '"> ' + esc(l) + '</label></li>').join('') + '</ul>');
  add('tape', 'Washi tape list (with filter)', 'Controls', { data: 'Sourdough|Cooking|325\nCoffee notebook|Coffee|188\nBrewing|Cooking|137', filter: true }, [['data', 'area', 'One per line: name|category|colour 0-360'], ['filter', 'check', 'Show a category drop-down']], (p) => { const it = lines(p.data).map((l) => l.split('|')); const cats = [...new Set(it.map((x) => x[1]))]; return (p.filter ? '<label class="fld pb-filter">Category<select><option value="">All</option>' + cats.map((c) => '<option>' + esc(c) + '</option>').join('') + '</select></label>' : '') + '<div>' + it.map((x) => '<article class="item pb-item" data-cat="' + esc(x[1]) + '" style="--tape:hsl(' + (+x[2] || 0) + ' 55% 62%)"><span class="tape"></span><div><p class="tag">' + esc(x[1]) + '</p><h3>' + esc(x[0]) + '</h3></div></article>').join('') + '</div>'; });

  /* ---- time ---- */
  add('clock', 'Clock', 'Time and random', {}, [], () => '<p class="pb-clock big" data-clock></p>');
  add('timer', 'Countdown timer', 'Time and random', { minutes: 5 }, [['minutes', 'num', 'Minutes']], (p) => '<p class="pb-timer"><b class="big" data-left="' + (+p.minutes || 1) * 60 + '">' + String(+p.minutes || 1).padStart(2, '0') + ':00</b> <button type="button" data-go>Start</button> <button type="button" data-reset>Reset</button></p>');
  add('random', 'Random pick', 'Time and random', { title: 'Tonight I will', data: 'Bake bread\nGo for a walk\nRead a chapter' }, [['title', 'text', 'Label'], ['data', 'area', 'One choice per line']], (p) => '<p class="pb-random" data-pick="' + esc(JSON.stringify(lines(p.data))) + '"><span class="tag">' + esc(p.title) + '</span><br><b class="big"></b> <button type="button">Again</button></p>');

  /* ---- paper ---- */
  add('plain', 'Plain paper', 'Paper', { rows: 12, lined: false }, [['rows', 'num', 'Height (lines)'], ['lined', 'check', 'Ruled lines']], (p) => paper('p', 'plain' + (p.lined ? ' lined' : ''), +p.rows || 12));
  add('grid', 'Grid paper', 'Paper', { rows: 16, size: 24 }, [['rows', 'num', 'Height (lines)'], ['size', 'num', 'Square size (px)']], (p) => '<div style="--sq:' + (+p.size || 24) + 'px">' + paper('p', 'grid', +p.rows || 16) + '</div>');
  add('cornell', 'Cornell notes', 'Paper', { title: 'Topic', cue: 'Cues and questions', notes: 'Notes', summary: 'Summary' }, [['title', 'text', 'Topic heading'], ['cue', 'text', 'Left label'], ['notes', 'text', 'Right label'], ['summary', 'text', 'Bottom label']], (p) => '<div class="pb-cornell"><h3>' + esc(p.title) + '</h3><label class="cue"><span>' + esc(p.cue) + '</span><textarea class="pb-paper" data-id="c-cue"></textarea></label><label class="nts"><span>' + esc(p.notes) + '</span><textarea class="pb-paper" data-id="c-notes"></textarea></label><label class="sum"><span>' + esc(p.summary) + '</span><textarea class="pb-paper" data-id="c-sum"></textarea></label></div>');
  add('piano', 'Piano keyboard', 'Music', { title: '', octaves: 2, labels: true }, [['title', 'text', 'Title'], ['octaves', 'num', 'Octaves (1 to 4)'], ['labels', 'check', 'Show note names']], piano);
  add('tab', 'Guitar / bass tab', 'Music', { title: '', strings: '6', length: 32 }, [['title', 'text', 'Title'], ['strings', 'select', 'Strings', ['6', '4']], ['length', 'num', 'Length (dashes)']], tab);

  /* ---- what makes the panels work. Plain JavaScript, copied into every exported page ---- */
  function runtime(root, key) {
    const $$ = (s) => [...root.querySelectorAll(s)];
    const get = (k) => { try { return localStorage.getItem(key + k); } catch (e) { return null; } };
    const put = (k, v) => { try { localStorage.setItem(key + k, v); } catch (e) { /* storage blocked: still works for this visit */ } };
    // tabs: the buttons show one page at a time
    $$('[data-tabbtn]').forEach((b) => b.addEventListener('click', () => { $$('[data-tabbtn]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $$('[data-page]').forEach((p) => { p.hidden = p.dataset.page !== b.dataset.tabbtn; }); }));
    // sliders show their value
    $$('.pb-slider input').forEach((i) => i.addEventListener('input', () => { i.parentNode.querySelector('output').textContent = i.value; }));
    // drop-down shows its text
    $$('.pb-drop').forEach((l) => { const s = l.querySelector('select'), o = l.nextElementSibling; const sh = () => { o.textContent = s.value; }; s.addEventListener('change', sh); sh(); });
    // toggle buttons: one on at a time
    $$('.pb-toggle').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))))));
    // habit boxes and tick boxes remember themselves
    $$('.xbox').forEach((b) => { const k = b.closest('[data-block]').dataset.block + b.dataset.id; const on = (v) => { b.setAttribute('aria-pressed', String(v)); b.textContent = v ? '×' : ''; }; on(get(k) === '1'); b.addEventListener('click', () => { const v = b.getAttribute('aria-pressed') !== 'true'; on(v); put(k, v ? '1' : '0'); }); });
    $$('input[type=checkbox][data-id]').forEach((c) => { const k = c.closest('[data-block]').dataset.block + c.dataset.id; c.checked = get(k) === '1'; c.addEventListener('change', () => put(k, c.checked ? '1' : '0')); });
    // paper: what you type is kept
    $$('textarea[data-id]').forEach((t) => { const k = t.closest('[data-block]').dataset.block + t.dataset.id; const v = get(k); t.value = v != null ? v : (t.dataset.default || ''); t.addEventListener('input', () => put(k, t.value)); });
    // washi tape filter
    $$('.pb-filter select').forEach((s) => s.addEventListener('change', () => { const box = s.closest('[data-block]'); box.querySelectorAll('.pb-item').forEach((i) => { i.hidden = !!s.value && i.dataset.cat !== s.value; }); }));
    // clock, timer, random
    $$('[data-clock]').forEach((c) => { const t = () => { c.textContent = new Date().toLocaleTimeString(); }; t(); setInterval(t, 1000); });
    $$('.pb-timer').forEach((w) => { const out = w.querySelector('b'), total = +out.dataset.left; let left = total, id = 0; const show = () => { out.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); }; w.querySelector('[data-go]').addEventListener('click', () => { clearInterval(id); id = setInterval(() => { left = Math.max(0, left - 1); show(); if (!left) clearInterval(id); }, 1000); }); w.querySelector('[data-reset]').addEventListener('click', () => { clearInterval(id); left = total; show(); }); });
    $$('.pb-random').forEach((r) => { const list = JSON.parse(r.dataset.pick), out = r.querySelector('b'); const go = () => { out.textContent = list.length ? list[Math.floor(Math.random() * list.length)] : ''; }; r.querySelector('button').addEventListener('click', go); go(); });
    // piano: a short soft tone for each key
    let ctx; $$('.pb-piano rect').forEach((k) => k.addEventListener('pointerdown', () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 261.63 * Math.pow(2, +k.dataset.semi / 12); g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 1.2); } catch (e) { /* no audio */ } k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 160); }));
  }

  /* ---- CSS for the panels (the site's own style.css supplies the base look) ---- */
  const CSS = '.pb-chart{width:100%;height:auto;color:var(--ink)}.pb-chart text{fill:var(--mute);font:11px var(--sans)}.pb-chart line{stroke:var(--line)}.pb-chart .bar{fill:var(--bar,var(--ink))}.pb-hero{padding:32px 0}.pb-hero h1{max-width:14em}' +
    '.pb-paper,.pb-tab{width:100%;font:15px/24px var(--sans);color:var(--ink);background:var(--bg);border:1px solid var(--ink);padding:8px;resize:vertical}.pb-paper.lined{background-image:repeating-linear-gradient(transparent 0 23px,var(--line) 23px 24px)}' +
    '.pb-paper.grid{background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:var(--sq,24px) var(--sq,24px);line-height:var(--sq,24px)}' +
    '.pb-cornell{display:grid;grid-template-columns:30% 1fr;grid-template-rows:auto 1fr auto;border:1px solid var(--ink);min-height:480px}.pb-cornell h3{grid-column:1/-1;margin:0;padding:10px 12px;border-bottom:1px solid var(--ink)}.pb-cornell label{display:flex;flex-direction:column}.pb-cornell label span{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);padding:6px 10px}.pb-cornell .pb-paper{flex:1;border:0;resize:none;min-height:120px}.pb-cornell .cue{border-right:1px solid var(--ink)}.pb-cornell .sum{grid-column:1/-1;border-top:1px solid var(--ink)}' +
    '.pb-piano{display:block;max-width:760px}.pb-piano .wk{fill:#fff;stroke:#111;cursor:pointer}.pb-piano .bk{fill:#111;cursor:pointer}.pb-piano .on{fill:var(--accent)}.pb-piano text{fill:#555;font:11px var(--sans);pointer-events:none}.pb-tab{font:14px/1.3 var(--mono);white-space:pre;overflow-x:auto}' +
    '.pb-slider{max-width:420px}.pb-out{min-height:1.5em}.pb-clock,.pb-timer .big,.pb-random .big{font-size:30px;font-weight:300}.pb-toggle button[aria-pressed=true]{background:var(--ink);color:var(--bg)}.xbox[aria-pressed=true]{background:transparent}' +
    '.pb-tabs{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 20px;border-bottom:1px solid var(--line)}.pb-tabs button{border:0;border-bottom:2px solid transparent;padding:8px 0}.pb-tabs button[aria-pressed=true]{background:transparent;color:var(--ink);border-bottom-color:var(--ink)}.pb-tabs button:hover{background:transparent;color:var(--accent)}' +
    '.item,.tape{}@media print{.pb-tabs,.top nav{display:none}.pb-paper{border-color:#999}}';
  window.PB = { blocks: B, esc, runtime, css: CSS, order: ['Text', 'Charts and tables', 'Controls', 'Time and random', 'Paper', 'Music'] };
})();
