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
  const mk = (t, p) => ({ id: uid(), t, p: Object.assign({}, p || {}) });
  const page = (name, ...b) => ({ name, blocks: b });

  /* ---------------------------------------------------------------- starting points */
  const TEMPLATES = [
    ['Blank', 'An empty page with a heading.', () => ({ title: 'My page', pages: [page('Home', mk('heading', { text: 'My page', level: '1' }), mk('text'))] })],
    ['Tracker', 'Habit boxes, a tick list and a chart, plus a notes page.', () => ({ title: 'My tracker', pages: [page('Today', mk('heading', { text: 'Today', level: '1' }), mk('habits'), mk('checklist'), mk('line')), page('Notes', mk('plain', { rows: 20, lined: true }))] })],
    ['Notebook', 'Cornell notes, grid and plain paper, piano and tab.', () => ({ title: 'My notebook', pages: [page('Cornell', mk('cornell')), page('Grid', mk('grid')), page('Plain', mk('plain', { rows: 24, lined: true })), page('Music', mk('piano'), mk('tab'))] })],
    ['Dashboard', 'Big numbers, charts, a table, a slider and a drop-down.', () => ({ title: 'My dashboard', pages: [page('Overview', mk('heading', { text: 'Overview', level: '1' }), mk('stats'), mk('bar'), mk('line'), mk('table')), page('Tools', mk('slider'), mk('dropdown'), mk('toggle'), mk('timer'), mk('random'))] })],
    ['Landing page', 'A big opening, a washi-tape list with filter, and questions.', () => ({ title: 'My site', pages: [page('Home', mk('hero'), mk('tape'), mk('faq'))] })]
  ];

  const clean = (j) => {               // accept a project from a file only if it has the right shape
    if (!j || !Array.isArray(j.pages) || !j.pages.length || j.pages.length > 30) throw new Error('This file is not a Template project.');
    return { title: String(j.title || 'Imported').slice(0, 120), pages: j.pages.map((pg) => ({ name: String(pg.name || 'Page').slice(0, 60), blocks: (pg.blocks || []).filter((b) => BL[b.t]).slice(0, 300).map((b) => mk(b.t, b.p)) })) };
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
    c.innerHTML = b.length ? b.map((x, i) => '<div class="blk' + (x.id === S.sel ? ' sel' : '') + '" data-block="' + x.id + '" data-i="' + i + '"><div class="tb" role="toolbar" aria-label="' + esc(BL[x.t].name) + '"><button type="button" data-act="up" aria-label="Move up">↑</button><button type="button" data-act="down" aria-label="Move down">↓</button><button type="button" data-act="dup" aria-label="Duplicate">Copy</button><button type="button" data-act="del" aria-label="Delete">✕</button></div>' + blockHtml(x) + '</div>').join('') : '<p class="tpl-empty">This page is empty. Choose a panel on the left to add it.</p>';
    live(c, 'pbt-edit:' + slug() + ':');
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
  function drawInspector() {
    const w = $('inspector'); w.replaceChildren();
    const b = cur().blocks.find((x) => x.id === S.sel);
    if (!b) { w.innerHTML = '<p class="meta">Click a panel to edit it. Panels can be moved, copied and deleted with the small buttons that appear above them.</p>'; return; }
    const d = BL[b.t], vals = Object.assign({}, d.defaults, b.p);
    const h = document.createElement('h3'); h.textContent = d.name; w.append(h);
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
      l.append(el); w.append(l);
    });
    if (!d.fields.length) { const p = document.createElement('p'); p.className = 'meta'; p.textContent = 'This panel has nothing to edit.'; w.append(p); }
  }
  function draw() { drawPages(); drawCanvas(); drawInspector(); }

  function addBlock(t) {
    const list = cur().blocks, i = list.findIndex((x) => x.id === S.sel), nb = mk(t, BL[t].defaults);
    list.splice(i < 0 ? list.length : i + 1, 0, nb); S.sel = nb.id; save(); draw();
  }
  $('canvas').addEventListener('click', (e) => {
    const box = e.target.closest('.blk'); if (!box || $('canvas').classList.contains('preview')) return;
    const list = cur().blocks, i = +box.dataset.i, act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (a === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      if (a === 'dup') list.splice(i + 1, 0, mk(list[i].t, JSON.parse(JSON.stringify(list[i].p))));
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
    const body = S.pages.map((p, i) => '<section data-page="' + i + '"' + (i ? ' hidden' : '') + '>' + p.blocks.map((b) => '<div data-block="' + b.id + '">' + blockHtml(b) + '</div>').join('\n') + '</section>').join('\n');
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
