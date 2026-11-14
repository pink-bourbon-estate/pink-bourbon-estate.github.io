/* Template builder (builder.js). Plain JavaScript, written to be read.
   A project is a title and a list of pages (tabs); a page is a list of panels; a panel is a type from blocks.js plus its values.
   Everything lives in this browser (localStorage) until you download it. Nothing is sent anywhere. */
(() => {
  const { blocks: BL, esc, runtime, css: BLOCK_CSS, order } = window.PB;
  const $ = (id) => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const KEY = 'pbt-project';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

  let S = null;                       // the project: { title, pages: [{ name, blocks: [{ id, t, p }] }], cur, sel }
  const mk = (t, p, w) => ({ id: uid(), t, p: Object.assign({}, p || {}), w: [25, 33, 50, 66, 75, 100].includes(+w) ? +w : 100 });
  const page = (name, ...b) => ({ name, blocks: b });

  /* ---------------------------------------------------------------- starting points */
  { const st = document.createElement('style'); st.textContent = BLOCK_CSS; document.head.append(st); }   // the panels look the same here as in the finished page
  const TEMPLATES = [
    ['Blank', 'An empty page with a heading.', () => ({ title: 'My page', pages: [page('Home', mk('heading', { text: 'My page', level: '1' }), mk('text'))] })],
    ['Tracker', 'Habit boxes, a tick list and a chart, plus a notes page.', () => ({ title: 'My tracker', pages: [page('Today', mk('heading', { text: 'Today', level: '1' }), mk('habits'), mk('checklist'), mk('log'), mk('routine'), mk('dates')), page('Notes', mk('notes')), page('Month', mk('month')), page('Notes paper', mk('plain', { rows: 20, lined: true }))] })],
    ['Notebook', 'Cornell notes, grid and plain paper, piano and tab.', () => ({ title: 'My notebook', pages: [page('Cornell', mk('cornell')), page('Grid', mk('grid')), page('Plain', mk('plain', { rows: 24, lined: true })), page('Music', mk('piano'), mk('tab'))] })],
    ['Dashboard', 'Big numbers, charts, a table, a slider and a drop-down.', () => ({ title: 'My dashboard', pages: [page('Overview', mk('heading', { text: 'Overview', level: '1' }), mk('stats'), mk('bar', {}, 50), mk('pie', {}, 50), mk('line', {}, 50), mk('histogram', {}, 50), mk('table')), page('More charts', mk('boxplot'), mk('scatter', {}, 50), mk('treemap', {}, 50), mk('radar', {}, 33), mk('gauge', {}, 33), mk('waterfall', {}, 33), mk('heatmap'), mk('tree')), page('Tools', mk('slider'), mk('dropdown'), mk('toggle'), mk('timer'), mk('random'))] })],

    ['CRISP-DM project', 'The six phases of a data mining project, with tasks to tick off and places for findings.', () => {
      const ph = (name, why, tasks, extra) => page(name, mk('heading', { text: name, level: '1' }), mk('text', { text: why }), mk('checklist', { title: 'Tasks', data: tasks }), ...(extra || []), mk('notes', { title: 'Findings and decisions' }));
      return { title: 'CRISP-DM project', pages: [
        page('Overview', mk('heading', { text: 'CRISP-DM project', level: '1' }), mk('text', { text: 'CRISP-DM (the cross-industry standard process for data mining) is a way to organise a data project in six phases. The order is not strict: you will often go back, for example from modelling to data preparation. Use one page per phase and tick tasks off as you go.' }),
          mk('table', { title: 'The six phases', data: 'Phase, Main question, Typical output\n1 Business understanding, What problem are we solving?, Objectives and success criteria\n2 Data understanding, What data do we have?, Data description and quality report\n3 Data preparation, How do we make it usable?, The final dataset\n4 Modeling, Which techniques work?, Candidate models and settings\n5 Evaluation, Does it meet the business goal?, Review and decision\n6 Deployment, How is it used and kept up to date?, Plan, monitoring, final report' }),
          mk('fields', { title: 'About this project', data: 'Project name\nOwner\nStart date\nData sources', cols: '2' }), mk('note', { text: 'Phase names follow the public CRISP-DM guide (see the IBM SPSS Modeler documentation). The wording here is original.' })),
        ph('1 Business understanding', 'Agree what success looks like before touching data. Write the goal in business terms first, then restate it as a data task.', 'Determine the business objectives\nAssess the situation (resources, risks, constraints)\nDetermine the data mining goals\nProduce the project plan', [mk('fields', { title: 'Objectives', data: 'Business objective\nSuccess criteria\nData mining goal', cols: '1' })]),
        ph('2 Data understanding', 'Collect the first data and get to know it: what is there, how clean it is and whether it can answer the question.', 'Collect the initial data\nDescribe the data\nExplore the data\nVerify data quality', [mk('log', { title: 'Data sources', fields: 'Source|text\nRows|number\nIssues|text', chart: 'Rows', unit: '' })]),
        ph('3 Data preparation', 'Build the dataset the models will use. This usually takes the most time.', 'Select the data\nClean the data\nConstruct new fields\nIntegrate data from several sources\nFormat the data for the tool'),
        ph('4 Modeling', 'Try suitable techniques, keep a test design apart from the training data, and record every run.', 'Select modeling techniques\nGenerate a test design\nBuild the models\nAssess the models', [mk('log', { title: 'Model runs', fields: 'Model|text\nSettings|text\nScore|number', chart: 'Score', unit: '' })]),
        ph('5 Evaluation', 'Judge the results against the business goal, not just the accuracy score, and check the process for gaps.', 'Evaluate the results against the business objectives\nReview the process\nDetermine the next steps', [mk('fields', { title: 'Decision', data: 'Result in one sentence\nGo or no go\nReason', cols: '1' })]),
        ph('6 Deployment', 'Plan how the results are used, watched and updated, and write up what you learned.', 'Plan deployment\nPlan monitoring and maintenance\nProduce the final report\nReview the project', [mk('dates', { title: 'Review dates', data: 'First check|2027-01-01\nRetrain review|2027-06-01' })])
      ] };
    }],
    ['Architectural plan set', 'A drawing register and drawing sheets with a standard title block, ready to print (30x40, 24x36, A1, A3). Unbranded.', () => ({ title: 'Plan set', pages: [
      page('Sheet A-101', mk('sheet', { sheetTitle: 'Ground floor plan', sheetNo: 'A-101' })),
      page('Sheet A-102', mk('sheet', { sheetTitle: 'First floor plan', sheetNo: 'A-102' })),
      page('Sheet A-201', mk('sheet', { sheetTitle: 'Elevations', sheetNo: 'A-201', scale: '1:50 @ 30x40' })),
      page('Register', mk('heading', { text: 'Drawing register', level: '1' }), mk('table', { data: 'Sheet, Title, Scale, Rev, Date\nA-101, Ground floor plan, 1:100, A, 2026-01-01\nA-102, First floor plan, 1:100, A, 2026-01-01\nA-201, Elevations, 1:50, A, 2026-01-01' }), mk('plain', { rows: 8, lined: true })),
      page('General notes', mk('heading', { text: 'General notes', level: '1' }), mk('checklist', { title: 'Standard notes', data: 'All dimensions in millimetres unless noted\nDo not scale from this drawing\nVerify all dimensions on site\nRead with the structural and services drawings' }), mk('plain', { rows: 16, lined: true }))
    ] })],
    ['Meeting minutes', 'Attendees, agenda, notes, decisions and an action list. Print-friendly.', () => ({ title: 'Meeting minutes', pages: [page('Minutes',
      mk('heading', { text: 'Meeting minutes', level: '1' }), mk('fields', { data: 'Meeting title\nDate\nTime\nLocation\nChair\nMinutes taken by', cols: '3' }),
      mk('log', { title: 'Attendees', fields: 'Name|text\nRole|text\nPresent or apologies|text', chart: '', unit: '' }),
      mk('log', { title: 'Agenda', fields: 'Item|text\nLead|text\nTime (min)|number', chart: '', unit: '' }),
      mk('notes', { title: 'Discussion' }),
      mk('log', { title: 'Decisions', fields: 'Decision|text\nOwner|text', chart: '', unit: '' }),
      mk('log', { title: 'Action items', fields: 'Action|text\nOwner|text\nDue|date\nStatus|text', chart: '', unit: '' }),
      mk('fields', { title: 'Next meeting', data: 'Date\nTime\nLocation', cols: '3' }))] })],
    ['Landing page', 'A big opening, a washi-tape list with filter, and questions.', () => ({ title: 'My site', pages: [page('Home', mk('hero'), mk('tape'), mk('faq'))] })]
  ];

  const clean = (j) => {               // accept a project from a file only if it has the right shape
    if (!j || !Array.isArray(j.pages) || !j.pages.length || j.pages.length > 30) throw new Error('This file is not a Template project.');
    return { title: String(j.title || 'Imported').slice(0, 120), pages: j.pages.map((pg) => ({ name: String(pg.name || 'Page').slice(0, 60), blocks: (pg.blocks || []).filter((b) => BL[b.t]).slice(0, 300).map((b) => mk(b.t, b.p, b.w)) })) };
  };

  /** Turn a web page into panels: headings and paragraphs become their own panels, everything else a Custom HTML panel. */
  function fromHtml(src) {
    const d = new DOMParser().parseFromString(src, 'text/html');
    d.querySelectorAll('script,style,link,iframe,object,embed,noscript,header.top,footer,.skip,nav').forEach((e) => e.remove());
    const root = d.querySelector('main') || d.body, pages = [page('Page')];
    [...root.children].forEach((el) => {
      if (el.dataset && el.dataset.pbeTab) { pages.push(page(el.dataset.pbeTab)); }
      const cur = pages[pages.length - 1].blocks, tag = el.tagName.toLowerCase();
      if (/^h[1-3]$/.test(tag)) cur.push(mk('heading', { text: el.textContent.trim(), level: tag[1] }));
      else if (tag === 'p' && !el.querySelector('a,button,input')) cur.push(mk('text', { text: el.textContent.trim() }));
      else if (el.innerHTML.trim()) cur.push(mk('html', { code: el.outerHTML }));
    });
    const out = pages.filter((p, i) => p.blocks.length || i === 0);
    return { title: (d.title || 'Imported page').replace(/\s*-\s*Pink Bourbon Estate\s*$/i, ''), pages: out };
  }

  /* ---------------------------------------------------------------- saving */
  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { const ok = put(KEY, JSON.stringify({ title: S.title, pages: S.pages })); $('saved').textContent = ok ? 'Saved in this browser' : 'Not saved (storage blocked): download to keep it'; }, 300); };
  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' })); a.download = name; document.body.append(a); a.click(); a.remove(); };
  const slug = () => (S.title || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';

  /* ---------------------------------------------------------------- drawing */
  const cur = () => S.pages[S.cur];
  const blockHtml = (b) => { const d = BL[b.t]; try { return d.html(Object.assign({}, d.defaults, b.p)); } catch (e) { return '<p class="note">This panel could not be drawn.</p>'; } };
  let timers = [];
  function live(root, key) {           // start the panels' behaviour, and stop the clocks of the last drawing
    timers.forEach(clearInterval); timers = [];
    const orig = window.setInterval; window.setInterval = (...a) => { const id = orig(...a); timers.push(id); return id; };
    try { runtime(root, key); } finally { window.setInterval = orig; }
  }

  function drawCanvas() {
    const c = $('canvas'), b = cur().blocks;
    c.classList.toggle('preview', $('preview').getAttribute('aria-pressed') === 'true');
    c.innerHTML = b.length ? b.map((x, i) => '<div class="blk' + (x.id === S.sel ? ' sel' : '') + '" data-block="' + x.id + '" data-i="' + i + '" style="--w:' + (x.w || 100) + '"><div class="tb" role="toolbar" aria-label="' + esc(BL[x.t].name) + '"><button type="button" class="drag" aria-label="Drag to move" title="Drag to move, also sideways">⠿</button><button type="button" data-act="up" aria-label="Move up">↑</button><button type="button" data-act="down" aria-label="Move down">↓</button><button type="button" data-act="dup" aria-label="Duplicate">Copy</button><button type="button" data-act="del" aria-label="Delete">✕</button></div>' + blockHtml(x) + '<span class="rs" title="Drag to change width"></span></div>').join('') : '<p class="tpl-empty">This page is empty. Choose a panel on the left to add it.</p>';
    live(c, 'pbt-edit:' + slug() + ':');
    if (c.classList.contains('preview')) return;
    // click a title or text and type straight into it (the right-hand editor follows along)
    c.querySelectorAll('[data-edit]').forEach((el) => {
      const blk = cur().blocks.find((x) => x.id === el.closest('.blk').dataset.block), key = el.dataset.edit;
      try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; }
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.spellcheck = true; el.classList.add('ed');
      el.addEventListener('input', () => {
        blk.p[key] = el.innerText.replace(/\n{3,}/g, '\n\n').replace(/\n$/, ''); save();
        const f = $('inspector').querySelector('[data-key="' + key + '"]'); if (f && document.activeElement !== f) f.value = blk.p[key];
      });
    });
  }
  function drawPages() {
    const w = $('pages'); w.replaceChildren();
    S.pages.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === S.cur)); b.textContent = p.name; b.addEventListener('click', () => { S.cur = i; S.sel = null; draw(); }); w.append(b); });
    const act = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'small'; b.textContent = label; b.addEventListener('click', () => { fn(); save(); draw(); }); w.append(b); };
    act('+ Page', () => { S.pages.push(page('Page ' + (S.pages.length + 1))); S.cur = S.pages.length - 1; S.sel = null; });
    act('Rename', () => { const n = prompt('Name of this page', cur().name); if (n && n.trim()) cur().name = n.trim().slice(0, 60); });
    act('◀', () => { if (S.cur > 0) { [S.pages[S.cur - 1], S.pages[S.cur]] = [S.pages[S.cur], S.pages[S.cur - 1]]; S.cur--; } });
    act('▶', () => { if (S.cur < S.pages.length - 1) { [S.pages[S.cur + 1], S.pages[S.cur]] = [S.pages[S.cur], S.pages[S.cur + 1]]; S.cur++; } });
    act('Delete page', () => { if (S.pages.length > 1 && confirm('Delete the page "' + cur().name + '" and its panels?')) { S.pages.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1); S.sel = null; } });
  }
  function drawPalette() {
    const p = $('palette'); p.replaceChildren();
    order.forEach((g) => { const h = document.createElement('h3'); h.textContent = g; p.append(h); Object.values(BL).filter((d) => d.group === g || (g === 'Music' && d.group === 'Music')).forEach((d) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = '+ ' + d.name; b.addEventListener('click', () => addBlock(d.t)); p.append(b); }); });
  }
  function drawForm(w) {
    const b = cur().blocks.find((x) => x.id === S.sel);
    if (!b) { w.innerHTML = '<p class="meta">Click a panel to edit it. Panels can be moved, copied and deleted with the small buttons that appear above them.</p>'; return; }
    const d = BL[b.t], vals = Object.assign({}, d.defaults, b.p);
    const h = document.createElement('h3'); h.textContent = d.name; w.append(h);
    { const l = document.createElement('label'), s = document.createElement('select'); l.className = 'fld'; l.append('Width'); [25, 33, 50, 66, 75, 100].forEach((n) => s.append(new Option(n + '%', n))); s.value = b.w || 100; s.addEventListener('change', () => { b.w = +s.value; save(); drawCanvas(); }); l.append(s); w.append(l); }
    d.fields.forEach(([key, type, label, choices]) => {
      const l = document.createElement('label'); l.className = 'fld'; l.append(label);
      let el;
      if (type === 'area') { el = document.createElement('textarea'); el.value = vals[key]; }
      else if (type === 'select') { el = document.createElement('select'); choices.forEach((c) => el.append(new Option(c, c))); el.value = vals[key]; }
      else if (type === 'check') { el = document.createElement('input'); el.type = 'checkbox'; el.checked = !!vals[key]; el.style.width = 'auto'; }
      else { el = document.createElement('input'); el.type = type === 'num' ? 'number' : 'text'; el.value = vals[key]; }
      el.addEventListener(type === 'select' || type === 'check' ? 'change' : 'input', () => {
        b.p[key] = type === 'check' ? el.checked : el.value; save();
        const box = $('canvas').querySelector('[data-block="' + b.id + '"]'); if (box) { drawCanvas(); }
      });
      el.dataset.key = key; l.append(el); w.append(l);
    });
    if (!d.fields.length) { const p = document.createElement('p'); p.className = 'meta'; p.textContent = 'This panel has nothing to edit.'; w.append(p); }
  }

  /* ---------------------------------------------------------------- the right-hand editor: boxes ("Form") or code ("Code") */
  const pref = (k, d) => get('pbt-' + k) || d, setPref = (k, v) => put('pbt-' + k, v);
  const pretty = (html) => {          // lay HTML out one tag per line, indented, so it is easy to read
    const VOID = /^<(br|hr|img|input|meta|link|circle|path|rect|line|polyline)\b/i; let d = 0, out = [];
    (html.match(/<[^>]+>|[^<]+/g) || []).forEach((t) => {
      if (/^<\//.test(t)) d = Math.max(0, d - 1);
      if (!/^\s+$/.test(t)) out.push('  '.repeat(d) + t.trim());
      if (/^<[a-z]/i.test(t) && !/\/>$/.test(t) && !VOID.test(t) && !/^<\/|<!--/.test(t)) d++;
    });
    return out.join('\n');
  };
  const squash = (s) => s.replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1').trim();
  const panelHtml = (b) => blockHtml(b).replace(/ data-edit="[a-z]+"/g, '');
  const pageHtml = () => S.pages.map((p, i) => '<section data-page="' + i + '">\n' + p.blocks.map((x) => '<div data-block="' + x.id + '" style="--w:' + (x.w || 100) + '">\n' + pretty(panelHtml(x)) + '\n</div>').join('\n') + '\n</section>').join('\n');

  function drawCode(w) {
    const scope = pref('scope', 'panel'), fmt = pref('fmt', 'html'), b = cur().blocks.find((x) => x.id === S.sel);
    const row = (label, key, opts) => { const l = document.createElement('label'), s = document.createElement('select'); l.className = 'fld'; l.append(label); opts.forEach(([v, t]) => s.append(new Option(t, v))); s.value = pref(key, opts[0][0]); s.addEventListener('change', () => { setPref(key, s.value); drawInspector(); }); l.append(s); w.append(l); };
    row('Show the code for', 'scope', [['panel', 'This panel only'], ['page', 'The whole project']]);
    row('As', 'fmt', [['html', 'HTML (what the page is made of)'], ['json', 'Settings (what this builder saves)']]);
    const ta = document.createElement('textarea'), msg = document.createElement('p'); ta.className = 'codebox'; ta.spellcheck = false; ta.setAttribute('aria-label', 'Code'); msg.className = 'meta'; msg.setAttribute('role', 'status');
    let text = '';
    if (scope === 'panel') {
      if (!b) { w.append(Object.assign(document.createElement('p'), { className: 'meta', textContent: 'Click a panel on the page to see its code. Or choose "The whole project" above.' })); return; }
      text = fmt === 'json' ? JSON.stringify({ type: b.t, width: b.w || 100, settings: Object.assign({}, BL[b.t].defaults, b.p) }, null, 2) : pretty(panelHtml(b));
    } else text = fmt === 'json' ? JSON.stringify({ title: S.title, pages: S.pages }, null, 2) : pageHtml();
    ta.value = text; ta.rows = 18; w.append(ta);
    const note = scope === 'panel' && fmt === 'html' ? 'Applying turns this panel into a "Custom HTML" panel that you edit as code only. Its behaviour (sliders, ticks, clock) keeps working if you keep its class names.' : scope === 'page' && fmt === 'html' ? 'Applying keeps every panel you did not change as it was (still editable in boxes). A panel whose code you changed becomes a "Custom HTML" panel.' : 'Applying changes the panel exactly, and you can keep using the boxes afterwards.';
    const hint = document.createElement('p'); hint.className = 'meta'; hint.textContent = note; w.append(hint);
    const apply = document.createElement('button'), undo = document.createElement('button'); apply.type = undo.type = 'button'; apply.textContent = 'Apply'; undo.textContent = 'Revert'; undo.addEventListener('click', () => { ta.value = text; msg.textContent = ''; });
    const run = () => {
      try {
        if (fmt === 'json') {
          const j = JSON.parse(ta.value);
          if (scope === 'panel') { if (!BL[j.type]) throw new Error('Unknown panel type "' + j.type + '".'); b.t = j.type; b.p = Object.assign({}, j.settings || {}); b.w = [25, 33, 50, 66, 75, 100].includes(+j.width) ? +j.width : 100; }
          else { const n = clean(j); S.title = n.title; S.pages = n.pages; S.cur = Math.min(S.cur, S.pages.length - 1); S.sel = null; $('title').value = S.title; }
        } else if (scope === 'panel') {
          const list = cur().blocks, i = list.indexOf(b); list[i] = mk('html', { code: ta.value }, b.w); S.sel = list[i].id;
        } else {
          const d = new DOMParser().parseFromString('<body>' + ta.value + '</body>', 'text/html'), secs = [...d.querySelectorAll('section[data-page]')];
          if (!secs.length) throw new Error('Keep the <section data-page="..."> wrappers: they mark the pages.');
          const all = new Map(S.pages.flatMap((p) => p.blocks).map((x) => [x.id, x]));
          const pages = secs.map((sec, i) => ({ name: (S.pages[i] && S.pages[i].name) || 'Page ' + (i + 1), blocks: [...sec.children].filter((c) => c.matches('[data-block]')).map((c) => { const old = all.get(c.dataset.block), w = parseFloat((c.getAttribute('style') || '').replace(/.*--w:\s*(\d+).*/, '$1')) || 100; if (old && squash(panelHtml(old)) === squash(c.innerHTML)) { old.w = [25, 33, 50, 66, 75, 100].includes(w) ? w : old.w; return old; } if (old && old.t === 'html') return Object.assign(old, { p: { code: c.innerHTML }, w }); return mk('html', { code: c.innerHTML }, w); }) }));
          S.pages = pages; S.cur = Math.min(S.cur, pages.length - 1); S.sel = null;
        }
        save(); draw();
      } catch (e) { msg.textContent = 'Could not apply: ' + e.message; }
    };
    apply.addEventListener('click', run); ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); } });
    if (fmt === 'json') ta.addEventListener('input', () => { try { JSON.parse(ta.value); msg.textContent = 'Valid'; } catch (e) { msg.textContent = 'Not valid yet: ' + e.message; } });
    const bar = document.createElement('p'); bar.append(apply, ' ', undo); w.append(bar, msg);
  }
  function drawInspector() {
    const w = $('inspector'), mode = pref('mode', 'form'); w.replaceChildren();
    const seg = document.createElement('p'); seg.className = 'seg';
    [['form', 'Boxes'], ['code', 'Code']].forEach(([m, t]) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = t; x.setAttribute('aria-pressed', String(mode === m)); x.addEventListener('click', () => { setPref('mode', m); drawInspector(); }); seg.append(x); });
    w.append(seg); if (mode === 'code') drawCode(w); else drawForm(w);
  }
  function draw() { drawPages(); drawCanvas(); drawInspector(); }

  function addBlock(t) {
    const list = cur().blocks, i = list.findIndex((x) => x.id === S.sel), nb = mk(t, BL[t].defaults);
    list.splice(i < 0 ? list.length : i + 1, 0, nb); S.sel = nb.id; save(); draw();
  }
  // width: drag the right edge of a panel; it snaps to 25, 33, 50, 66, 75 or 100 percent
  $('canvas').addEventListener('pointerdown', (e) => {
    const rs = e.target.closest('.rs'); if (!rs) return; e.preventDefault();
    const box = rs.closest('.blk'), blk = cur().blocks.find((x) => x.id === box.dataset.block), cv = $('canvas').getBoundingClientRect(), left = box.getBoundingClientRect().left;
    const snap = (x) => [25, 33, 50, 66, 75, 100].reduce((a, n) => (Math.abs(n - x) < Math.abs(a - x) ? n : a), 100);
    const move = (ev) => { blk.w = snap((ev.clientX - left) / cv.width * 100); box.style.setProperty('--w', blk.w); };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); save(); drawInspector(); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  // moving: drag the grip; drop on the left or right half of another panel to put it before or after, so panels can sit side by side
  let dragId = null;
  $('canvas').addEventListener('mousedown', (e) => { const g = e.target.closest('.drag'); if (g) { g.closest('.blk').draggable = true; } });
  $('canvas').addEventListener('dragstart', (e) => { const box = e.target.closest && e.target.closest('.blk'); if (!box || !box.draggable) return; dragId = box.dataset.block; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
  $('canvas').addEventListener('dragend', () => { dragId = null; $('canvas').querySelectorAll('.blk').forEach((x) => { x.draggable = false; x.classList.remove('dropl', 'dropr'); }); });
  $('canvas').addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); const t = e.target.closest('.blk'); $('canvas').querySelectorAll('.blk').forEach((x) => x.classList.remove('dropl', 'dropr')); if (t && t.dataset.block !== dragId) { const r = t.getBoundingClientRect(); t.classList.add(e.clientX < r.left + r.width / 2 ? 'dropl' : 'dropr'); } });
  $('canvas').addEventListener('drop', (e) => {
    if (!dragId) return; e.preventDefault(); const t = e.target.closest('.blk'); if (!t || t.dataset.block === dragId) return;
    const list = cur().blocks, from = list.findIndex((x) => x.id === dragId), item = list.splice(from, 1)[0], r = t.getBoundingClientRect(), after = e.clientX >= r.left + r.width / 2;
    const to = list.findIndex((x) => x.id === t.dataset.block); list.splice(after ? to + 1 : to, 0, item); S.sel = item.id; dragId = null; save(); draw();
  });
  $('canvas').addEventListener('click', (e) => {
    const box = e.target.closest('.blk'); if (!box || $('canvas').classList.contains('preview')) return;
    const list = cur().blocks, i = +box.dataset.i, act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (a === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      if (a === 'dup') list.splice(i + 1, 0, mk(list[i].t, JSON.parse(JSON.stringify(list[i].p)), list[i].w));
      if (a === 'del') { list.splice(i, 1); S.sel = null; }
      save(); draw(); return;
    }
    if (S.sel !== box.dataset.block) { S.sel = box.dataset.block; $('canvas').querySelectorAll('.blk').forEach((x) => x.classList.toggle('sel', x === box)); drawInspector(); }
  });

  /* ---------------------------------------------------------------- the finished page */
  const FALLBACK_CSS = ':root{--bg:#fff;--ink:#111;--mute:#5f5f5f;--line:#e2e2e2;--soft:#f5f5f3;--accent:#b0124f;--sans:Helvetica,Arial,sans-serif;--mono:ui-monospace,Menlo,Consolas,monospace}@media(prefers-color-scheme:dark){:root{--bg:#111;--ink:#f1f1ee;--mute:#a3a3a0;--line:#2c2c2c;--soft:#1b1b1b;--accent:#ff7aa8}}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 var(--sans)}main{max-width:1100px;margin:0 auto;padding:24px}button,.btn{font:inherit;font-size:12px;text-transform:uppercase;letter-spacing:.08em;background:transparent;color:var(--ink);border:1px solid var(--ink);padding:6px 12px;cursor:pointer}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line)}.note{background:var(--soft);padding:12px 16px}.item{display:grid;grid-template-columns:14px 1fr;gap:14px;padding:14px 0;border-top:1px solid var(--line)}.tape{background:var(--tape);align-self:stretch;transform:rotate(-1.5deg)}';
  async function buildPage() {
    let base = FALLBACK_CSS;
    try { const r = await fetch('../style.css'); if (r.ok) base = await r.text(); } catch (e) { /* offline: use the short built-in style */ }
    const k = 'pb-' + slug() + ':', multi = S.pages.length > 1;
    const body = S.pages.map((p, i) => '<section class="pb-row" data-page="' + i + '"' + (i ? ' hidden' : '') + '>' + p.blocks.map((b) => '<div data-block="' + b.id + '" style="--w:' + (b.w || 100) + '">' + blockHtml(b).replace(/ data-edit="[a-z]+"/g, '') + '</div>').join('\n') + '</section>').join('\n');
    const tabs = multi ? '<div class="pb-tabs" role="group" aria-label="Pages">' + S.pages.map((p, i) => '<button type="button" data-tabbtn="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(p.name) + '</button>').join('') + '</div>' : '';
    return '<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(S.title) + '</title>\n<style>\n' + base + '\n' + BLOCK_CSS + '\n</style>\n</head>\n<body>\n<header class="top"><span class="mark">' + esc(S.title) + '</span></header>\n<main id="main">\n' + tabs + '\n' + body + '\n</main>\n<footer class="foot"><p>Made with Template from Pink Bourbon Estate. No cookies, no tracking.</p></footer>\n<script>\n(' + runtime.toString() + ')(document, ' + JSON.stringify(k) + ');\n<\/script>\n</body>\n</html>\n';
  }

  /* ---------------------------------------------------------------- start screen and buttons */
  function open(proj) {
    S = { title: proj.title, pages: proj.pages, cur: 0, sel: null };
    $('title').value = S.title; $('start').hidden = true; $('editor').hidden = false; $('preview').setAttribute('aria-pressed', 'false');
    drawPalette(); save(); draw();
  }
  TEMPLATES.forEach(([name, text, make]) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<b></b><small></small>'; b.firstChild.textContent = name; b.lastChild.textContent = text; b.addEventListener('click', () => open(make())); $('templates').append(b); });
  const saved = get(KEY); if (saved) { $('resume').hidden = false; $('resume').addEventListener('click', () => { try { open(clean(JSON.parse(saved))); } catch (e) { alert('That project could not be read.'); } }); }
  $('title').addEventListener('input', () => { S.title = $('title').value; save(); });
  $('new').addEventListener('click', () => { if (confirm('Go back to the start screen? Your current project stays saved in this browser.')) { $('editor').hidden = true; $('start').hidden = false; location.reload(); } });
  $('preview').addEventListener('click', () => { const on = $('preview').getAttribute('aria-pressed') !== 'true'; $('preview').setAttribute('aria-pressed', String(on)); document.querySelector('.tpl-cols').style.gridTemplateColumns = on ? '1fr' : ''; $('palette').hidden = $('inspector').hidden = on; drawCanvas(); });
  $('saveproj').addEventListener('click', () => download(slug() + '.project.json', JSON.stringify({ format: 'pbe-template', v: 1, title: S.title, pages: S.pages }, null, 2), 'application/json'));
  $('export').addEventListener('click', async () => download(slug() + '.html', await buildPage(), 'text/html'));

  const fromText = (name, text) => /\.json$/i.test(name) ? clean(JSON.parse(text)) : fromHtml(text);
  $('importfile').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 2e6) return alert('That file is too large (2 MB limit).'); try { open(fromText(f.name, await f.text())); } catch (err) { alert(err.message); } });
  $('importsite').addEventListener('click', async () => { const u = $('sitepages').value; if (!u) return; try { const r = await fetch(u); if (!r.ok) throw new Error('Could not load that page.'); open(fromHtml(await r.text())); } catch (err) { alert(err.message); } });
  fetch('../sitemap.xml').then((r) => r.text()).then((x) => { const sel = $('sitepages'); [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { try { return new URL(m[1]).pathname; } catch (e) { return null; } }).filter((p) => p && p !== '/' && !/^\/(template|tutorials)\//.test(p)).sort().forEach((p) => sel.append(new Option(p.replace(/^\/|\/$/g, '').replace(/-/g, ' '), '..' + p))); }).catch(() => {});
  $('start').hidden = false;
})();
