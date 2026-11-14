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


  /* ---- trackers: the log, routine, dates and notes tabs of the tracker tools (tracker.js), and the meditation and kitchen timers ---- */
  const cfg = (o) => ' data-cfg="' + esc(JSON.stringify(o)) + '"';
  add('log', 'Log (form, table, chart)', 'Trackers', { title: 'Weight log', fields: 'Weight|number\nNote|text', chart: 'Weight', unit: ' kg' }, [['title', 'text', 'Title'], ['fields', 'area', 'One field per line: name|number, text or date'], ['chart', 'text', 'Draw a line chart of this number field (its name)'], ['unit', 'text', 'Unit']], (p) => head(p) + '<div class="pb-log"' + cfg({ fields: lines(p.fields).map((l) => l.split('|')), chart: p.chart, unit: p.unit }) + '></div>');
  add('routine', 'Routine checks (due / overdue)', 'Trackers', { title: 'Home routines', data: 'Water the plants|weekly\nClean the kettle|monthly\nWipe the counters|daily' }, [['title', 'text', 'Title'], ['data', 'area', 'One per line: job|daily, weekly, monthly or yearly']], (p) => head(p) + '<div class="pb-routine"' + cfg({ rows: lines(p.data).map((l) => l.split('|')) }) + '></div>');
  add('dates', 'Dates with countdown', 'Trackers', { title: 'Coming up', data: 'Insurance renews|2027-03-01\nPassport check|2027-06-15' }, [['title', 'text', 'Title'], ['data', 'area', 'One per line: name|YYYY-MM-DD']], (p) => head(p) + '<div class="pb-dates"' + cfg({ rows: lines(p.data).map((l) => l.split('|')) }) + '></div>');
  add('notes', 'Notes list', 'Trackers', { title: 'Notes' }, [['title', 'text', 'Title']], (p) => head(p) + '<div class="pb-notes"></div>');
  add('month', 'Month of x boxes', 'Trackers', { title: 'Did it today?' }, [['title', 'text', 'Habit name']], (p) => head(p) + '<div class="pb-month"></div>');
  add('progress', 'Progress bar', 'Trackers', { label: 'Sourdough starter fed', value: 3, max: 7, unit: ' days' }, [['label', 'text', 'Label'], ['value', 'num', 'Value'], ['max', 'num', 'Out of'], ['unit', 'text', 'Unit']], (p) => '<p class="fld">' + esc(p.label) + ' <b>' + esc(p.value) + ' / ' + esc(p.max) + esc(p.unit) + '</b></p><div class="pb-meter" role="img" aria-label="' + esc(p.label) + '"><span style="width:' + Math.min(100, Math.max(0, (+p.value / (+p.max || 1)) * 100)) + '%"></span></div>');
  add('breathe', 'Breathing pacer', 'Time and random', { inh: 4, hold: 4, out: 6, rest: 2 }, [['inh', 'num', 'Breathe in (seconds)'], ['hold', 'num', 'Hold (seconds)'], ['out', 'num', 'Breathe out (seconds)'], ['rest', 'num', 'Rest (seconds)']], (p) => '<div class="pb-breathe"' + cfg({ s: [+p.inh || 0, +p.hold || 0, +p.out || 0, +p.rest || 0] }) + '><div class="orb"></div><p><b class="big">Ready</b> <button type="button">Start</button></p></div>');
  add('sound', 'Bell and bowl sounds', 'Time and random', { sound: 'bowl', every: 0 }, [['sound', 'select', 'Sound', ['bell', 'bowl', 'chime', 'gong', 'wood']], ['every', 'num', 'Repeat every N minutes (0 = only when you press Play)']], (p) => '<p class="pb-sound"' + cfg({ sound: p.sound, every: +p.every || 0 }) + '><button type="button" data-play>Play ' + esc(p.sound) + '</button> ' + (+p.every ? '<button type="button" data-repeat aria-pressed="false">Repeat every ' + (+p.every) + ' min</button>' : '') + '</p>');

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

    // ---- trackers ----
    const E = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mkEl = (tag, text, attrs) => { const e = document.createElement(tag); if (text != null) e.textContent = text; for (const a in (attrs || {})) e.setAttribute(a, attrs[a]); return e; };
    const iso = (d) => d.toISOString().slice(0, 10), todayIso = () => iso(new Date());
    const daysFrom = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
    const store = (w, name) => { const k = w.closest('[data-block]').dataset.block + name; return { read: (d) => { try { return JSON.parse(get(k) || 'null') || d; } catch (e) { return d; } }, write: (v) => put(k, JSON.stringify(v)) }; };
    const lineSvg = (pts, unit) => { if (pts.length < 2) return '<p class="meta">Add two or more entries to see the chart.</p>'; const W = 600, H = 200, ys = pts.map((q) => q[1]), lo = Math.min(...ys), hi = Math.max(...ys) || 1, rng = hi - lo || 1, x = (i) => 20 + (W - 40) * i / (pts.length - 1), y = (v) => H - 14 - (v - lo) / rng * (H - 34); return '<svg class="pb-chart" viewBox="0 0 ' + W + ' ' + (H + 24) + '" role="img" aria-label="Line chart"><line x1="0" y1="' + H + '" x2="' + W + '" y2="' + H + '"/><polyline fill="none" stroke="currentColor" stroke-width="2" points="' + pts.map((q, i) => x(i) + ',' + y(q[1])).join(' ') + '"/>' + pts.map((q, i) => '<circle class="bar" cx="' + x(i) + '" cy="' + y(q[1]) + '" r="3.5"><title>' + E(q[0]) + ': ' + q[1] + E(unit) + '</title></circle>').join('') + '<text x="20" y="' + (H + 16) + '">' + E(pts[0][0]) + '</text><text x="' + (W - 20) + '" y="' + (H + 16) + '" text-anchor="end">' + E(pts[pts.length - 1][0]) + '</text></svg>'; };
    // log: a form, a table and a chart of one number field
    $$('.pb-log').forEach((w) => {
      const c = JSON.parse(w.dataset.cfg), st = store(w, 'log'); let rows = st.read([]);
      const form = mkEl('div', null, { class: 'form' }), inputs = c.fields.map(([name, type]) => { const l = mkEl('label', name, { class: 'fld' }), i = mkEl('input', null, { type: type === 'number' || type === 'date' ? type : 'text', step: 'any' }); if (type === 'date') i.value = todayIso(); l.append(i); form.append(l); return i; });
      const add = mkEl('button', 'Add entry', { type: 'button' }), box = mkEl('div'), chart = mkEl('div');
      add.addEventListener('click', () => { const r = {}; c.fields.forEach(([n], i) => { r[n] = inputs[i].value; }); if (!Object.values(r).some((v) => v)) return; r._d = todayIso(); rows.push(r); st.write(rows); draw(); inputs.forEach((i, n) => { if (c.fields[n][1] !== 'date') i.value = ''; }); });
      const draw = () => {
        box.replaceChildren(); const t = mkEl('table'), hr = mkEl('tr'); t.append(mkEl('thead')); c.fields.forEach(([n]) => hr.append(mkEl('th', n))); hr.append(mkEl('th', '')); t.firstChild.append(hr); const tb = mkEl('tbody'); t.append(tb);
        rows.forEach((r, i) => { const tr = mkEl('tr'); c.fields.forEach(([n]) => tr.append(mkEl('td', r[n]))); const d = mkEl('button', 'Delete', { type: 'button' }); d.addEventListener('click', () => { rows.splice(i, 1); st.write(rows); draw(); }); const td = mkEl('td'); td.append(d); tr.append(td); tb.append(tr); });
        box.append(mkEl('div', null, { class: 'tablewrap' })); box.firstChild.append(t);
        chart.innerHTML = c.chart ? lineSvg(rows.filter((r) => r[c.chart] !== '' && !isNaN(parseFloat(r[c.chart]))).map((r) => [r._d, parseFloat(r[c.chart])]), c.unit) : '';
      };
      w.append(form, mkEl('p'), box, chart); w.children[1].append(add); draw();
    });
    // routine: when each job was last done, and whether it is due
    $$('.pb-routine').forEach((w) => {
      const c = JSON.parse(w.dataset.cfg), st = store(w, 'routine'), every = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
      const draw = () => { const done = st.read({}); w.replaceChildren(); const t = mkEl('table'), tb = mkEl('tbody'); t.append(tb); c.rows.forEach(([n, f]) => { const gap = every[(f || '').trim().toLowerCase()] || 7, last = done[n], since = last ? daysFrom(last, todayIso()) : null; const state = since == null ? 'Not done yet' : since >= gap ? 'Overdue by ' + (since - gap + 1) + ' day(s)' : 'Next in ' + (gap - since) + ' day(s)'; const b = mkEl('button', 'Done today', { type: 'button' }); b.addEventListener('click', () => { done[n] = todayIso(); st.write(done); draw(); }); const tr = mkEl('tr'); tr.append(mkEl('td', n), mkEl('td', f), mkEl('td', state)); const td = mkEl('td'); td.append(b); tr.append(td); tb.append(tr); }); const wrap = mkEl('div', null, { class: 'tablewrap' }); wrap.append(t); w.append(wrap); };
      draw();
    });
    // dates: a countdown to each date; you can change a date
    $$('.pb-dates').forEach((w) => {
      const c = JSON.parse(w.dataset.cfg), st = store(w, 'dates'); const draw = () => { const ov = st.read({}); w.replaceChildren(); const t = mkEl('table'), tb = mkEl('tbody'); t.append(tb); c.rows.forEach(([n, d]) => { const v = ov[n] || d, left = daysFrom(todayIso(), v); const i = mkEl('input', null, { type: 'date', value: v, 'aria-label': n }); i.addEventListener('change', () => { ov[n] = i.value; st.write(ov); draw(); }); const tr = mkEl('tr'), td = mkEl('td'); td.append(i); tr.append(mkEl('td', n), td, mkEl('td', isNaN(left) ? '' : left < 0 ? Math.abs(left) + ' day(s) ago' : left === 0 ? 'Today' : left + ' day(s) to go')); tb.append(tr); }); const wrap = mkEl('div', null, { class: 'tablewrap' }); wrap.append(t); w.append(wrap); };
      draw();
    });
    // notes: write a note, newest first
    $$('.pb-notes').forEach((w) => {
      const st = store(w, 'notes'); let list = st.read([]); const ta = mkEl('textarea', null, { rows: '4', 'aria-label': 'New note' }), b = mkEl('button', 'Add note', { type: 'button' }), out = mkEl('div');
      const draw = () => { out.replaceChildren(); list.map((n, i) => [n, i]).reverse().forEach(([n, i]) => { const d = mkEl('div', null, { class: 'ev' }), x = mkEl('button', 'Delete', { type: 'button' }); x.addEventListener('click', () => { list.splice(i, 1); st.write(list); draw(); }); d.append(mkEl('p', n.d, { class: 'tag' }), mkEl('p', n.t), x); out.append(d); }); };
      b.addEventListener('click', () => { if (!ta.value.trim()) return; list.push({ d: todayIso(), t: ta.value.trim() }); st.write(list); ta.value = ''; draw(); }); w.append(ta, mkEl('p'), out); w.children[1].append(b); draw();
    });
    // month of x boxes
    $$('.pb-month').forEach((w) => {
      const st = store(w, 'month'); let ym = todayIso().slice(0, 7);
      const draw = () => { const done = st.read({}), first = new Date(ym + '-01T12:00:00'), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), off = (first.getDay() + 6) % 7; w.replaceChildren();
        const nav = mkEl('p'), prev = mkEl('button', 'Previous', { type: 'button' }), next = mkEl('button', 'Next', { type: 'button' }); prev.addEventListener('click', () => { const d = new Date(first); d.setMonth(d.getMonth() - 1); ym = iso(d).slice(0, 7); draw(); }); next.addEventListener('click', () => { const d = new Date(first); d.setMonth(d.getMonth() + 1); ym = iso(d).slice(0, 7); draw(); }); nav.append(prev, ' ', mkEl('b', first.toLocaleString(undefined, { month: 'long', year: 'numeric' })), ' ', next); w.append(nav);
        const g = mkEl('div', null, { class: 'pb-days' }); ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((x) => g.append(mkEl('span', x, { class: 'tag' }))); for (let i = 0; i < off; i++) g.append(mkEl('span'));
        for (let d = 1; d <= days; d++) { const key = ym + '-' + String(d).padStart(2, '0'), b = mkEl('button', String(d), { type: 'button', class: 'xbox', 'aria-pressed': String(!!done[key]), 'aria-label': key }); b.addEventListener('click', () => { done[key] = !done[key]; st.write(done); b.setAttribute('aria-pressed', String(!!done[key])); }); g.append(b); } w.append(g); };
      draw();
    });
    // breathing pacer and sounds (each sound is a handful of sine waves that fade out)
    $$('.pb-breathe').forEach((w) => { const s = JSON.parse(w.dataset.cfg).s, labels = ['Breathe in', 'Hold', 'Breathe out', 'Rest'], total = s.reduce((a, b) => a + b, 0) || 1, orb = w.querySelector('.orb'), txt = w.querySelector('b'), btn = w.querySelector('button'); let id = 0, t = 0; const tick = () => { let x = t % total, i = 0; while (x >= s[i]) { x -= s[i]; i++; } txt.textContent = labels[i]; orb.style.transitionDuration = s[i] + 's'; orb.style.transform = i === 0 || i === 1 ? 'scale(1)' : 'scale(.45)'; t++; }; btn.addEventListener('click', () => { if (id) { clearInterval(id); id = 0; btn.textContent = 'Start'; txt.textContent = 'Ready'; orb.style.transform = ''; } else { t = 0; tick(); id = setInterval(tick, 1000); btn.textContent = 'Stop'; } }); });
    let ac; const parts = { bell: [[1, 1], [2.76, .5], [5.4, .25]], bowl: [[1, 1], [1.006, 1], [2.7, .4]], chime: [[1, 1], [3, .4], [5, .2]], gong: [[.5, 1], [1.5, .6], [2.3, .4]], wood: [[1, 1], [2.3, .3]] }, life = { bell: 3, bowl: 6, chime: 2.5, gong: 7, wood: .3 };
    const strike = (n) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const T = ac.currentTime, f = n === 'gong' ? 130 : 440; parts[n].forEach(([m, a]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * m; g.gain.setValueAtTime(0.18 * a, T); g.gain.exponentialRampToValueAtTime(0.0005, T + life[n] / (1 + m / 3)); o.connect(g).connect(ac.destination); o.start(T); o.stop(T + life[n]); }); } catch (e) { /* no audio */ } };
    $$('.pb-sound').forEach((w) => { const c = JSON.parse(w.dataset.cfg); w.querySelector('[data-play]').addEventListener('click', () => strike(c.sound)); const r = w.querySelector('[data-repeat]'); if (r) { let id = 0, n = 0; r.addEventListener('click', () => { if (id) { clearInterval(id); id = 0; r.setAttribute('aria-pressed', 'false'); } else { n = 0; r.setAttribute('aria-pressed', 'true'); id = setInterval(() => { if (++n >= c.every * 60) { n = 0; strike(c.sound); } }, 1000); } }); } });
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
    '.pb-meter{height:8px;background:var(--line)}.pb-meter span{display:block;height:100%;background:var(--ink)}.pb-days{display:grid;grid-template-columns:repeat(7,34px);gap:4px;margin:8px 0}.pb-days .xbox{width:34px;height:34px;font-size:12px}.pb-days .xbox[aria-pressed=true]{background:var(--ink);color:var(--bg)}.pb-breathe .orb{width:160px;height:160px;border:2px solid var(--ink);border-radius:50%;margin:12px 0;transition:transform 4s ease-in-out}.pb-sound button[aria-pressed=true]{background:var(--ink);color:var(--bg)}.pb-log .tablewrap{margin:12px 0}@media print{.pb-tabs,.top nav{display:none}.pb-paper{border-color:#999}}';
  window.PB = { blocks: B, esc, runtime, css: CSS, order: ['Text', 'Charts and tables', 'Controls', 'Trackers', 'Time and random', 'Paper', 'Music'] };
})();
