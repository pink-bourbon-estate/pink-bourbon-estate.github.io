/* shell.js: the four standard tabs that EVERY project on this site has, always in the same order and the same place:

     Sources | My Data | Example Data | FAQ

   Sources        everything the tool refers to (books, web pages, data sets, licences)
   My Data        what is stored, the data policy, export as Markdown and CSV, back up, restore, delete
   Example Data   load made-up data to see the tool working, and remove it again
   FAQ            common questions

   There are two ways a project uses this file:

   1. Tracker tools (tracker.js) and the tools with their own tab bars (coffee, brewing, baking) call PBEshell.standard(id, ...) to get the
      four tabs as a list, and add them to their own tab bar.
   2. Every other project page just loads this file and info.js. When the page has finished loading, PBEshell.page() wraps the page's
      content in a tab bar: the tool's own tabs first, then the four standard ones. A page can split its own content into several
      tabs by giving the first element of each tab a data-pbe-tab="Name" attribute.

   The words for Sources and FAQ live in info.js (one entry per project). Nothing here is sent anywhere: all data is in this browser.
   Needs no other script. Code is plain JavaScript, written to be read. */
const PBEshell = (() => {
  'use strict';

  /* ---------------------------------------------------------------- small helpers */
  /** Make an element: h('p', {class:'meta'}, 'text', childNode). Arrays of children are flattened. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'class') el.className = v; else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (k) => { if (Array.isArray(k)) k.forEach(add); else if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k))); };
    kids.forEach(add);
    return el;
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const info = (id) => (window.PBEinfo && window.PBEinfo[id]) || {};
  /** Offer text as a file download, entirely in the browser. */
  function download(name, text, type) {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' })), download: name });
    document.body.append(a); a.click(); a.remove();
  }
  /** One CSV cell. Quotes are doubled; a cell starting with = + - or @ gets a leading apostrophe so a spreadsheet never treats it as a formula. */
  const csvCell = (v) => { let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const isRows = (v) => Array.isArray(v) && v.length && v.every((r) => r && typeof r === 'object' && !Array.isArray(r));
  const columns = (rows) => { const c = []; rows.forEach((r) => Object.keys(r).forEach((k) => { if (!c.includes(k)) c.push(k); })); return c; };
  const mdCell = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  /** Remember a one-line message across a page reload (used after loading or deleting data). */
  const flash = (m) => { try { sessionStorage.setItem('pbe-flash', m); } catch (e) { /* ignore */ } };
  const takeFlash = () => { try { const m = sessionStorage.getItem('pbe-flash') || ''; sessionStorage.removeItem('pbe-flash'); return m; } catch (e) { return ''; } };

  /* ---------------------------------------------------------------- data for tools that keep their data under plain localStorage keys */
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const del = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const empty = (v) => v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

  /** Build the "spec" (what the My Data and Example Data tabs work with) from a list of localStorage keys.
      o = { id, title, keys: [...], sample: () => ({ key: value }), reload: true }
      Sample data is only put into keys that are empty, and the keys it filled are remembered so "Remove example data" never touches your own entries. */
  function fromKeys(o) {
    const mark = 'pbe-sample-' + o.id, reload = o.reload !== false, done = (m) => { flash(m); if (reload) location.reload(); };
    return {
      id: o.id, title: o.title || o.id, keys: o.keys,
      summary: () => o.keys.map((k) => { const v = get(k); return [k, v == null ? 'nothing stored' : Array.isArray(v) ? v.length + ' items' : typeof v === 'object' ? Object.keys(v).length + ' entries' : 'stored']; }),
      md: () => {
        let md = '# ' + (o.title || o.id) + '\n\nExported ' + today() + '\n';
        o.keys.forEach((k) => { const v = get(k); if (empty(v)) return; md += '\n## ' + k + '\n\n';
          if (isRows(v)) { const c = columns(v); md += '| ' + c.join(' | ') + ' |\n|' + c.map(() => ' --- |').join('') + '\n' + v.map((r) => '| ' + c.map((x) => mdCell(r[x])).join(' | ') + ' |').join('\n') + '\n'; }
          else md += '```json\n' + JSON.stringify(v, null, 2) + '\n```\n'; });
        return md;
      },
      csv: () => o.keys.map((k) => ({ k, v: get(k) })).filter((x) => !empty(x.v)).map((x) => {
        if (isRows(x.v)) { const c = columns(x.v); return { name: o.id + '-' + x.k + '.csv', text: c.map(csvCell).join(',') + '\n' + x.v.map((r) => c.map((y) => csvCell(r[y])).join(',')).join('\n') + '\n' }; }
        const pairs = Array.isArray(x.v) ? x.v.map((e, i) => [i, e]) : Object.entries(x.v); return { name: o.id + '-' + x.k + '.csv', text: 'key,value\n' + pairs.map(([a, b]) => csvCell(a) + ',' + csvCell(b)).join('\n') + '\n' };
      }),
      backup: () => ({ tool: o.id, saved: today(), data: Object.fromEntries(o.keys.map((k) => [k, get(k)])) }),
      restore: (b) => { if (!b || b.tool !== o.id || !b.data) return false; o.keys.forEach((k) => { if (b.data[k] !== undefined && b.data[k] !== null) put(k, b.data[k]); }); done('Backup restored.'); return true; },
      clear: () => { o.keys.forEach(del); del(mark); done('All data for this tool was deleted from this browser.'); },
      load: o.sample ? () => { const s = o.sample(), added = []; o.keys.forEach((k) => { if (empty(get(k)) && s[k] !== undefined) { put(k, s[k]); added.push(k); } }); put(mark, added); done(added.length ? 'Example data loaded.' : 'Nothing was added: your own entries are already there.'); } : null,
      remove: o.sample ? () => { (get(mark) || []).forEach(del); del(mark); done('Example data removed.'); } : null,
    };
  }

  /* ---------------------------------------------------------------- the four panels */
  const POLICY = [
    'Your data stays on this device. Everything you enter is stored in this browser (localStorage) and nowhere else. This site has no accounts, no cookies and no tracking, and it never reads or sends your entries.',
    'Clearing this browser\'s site data, or using a private window, removes it. Export a copy now and then.',
    'Exports are plain files you own: Markdown is readable text, CSV opens in any spreadsheet, and the backup file can be restored here.',
    'Where a tool contacts another server (at the moment only the Travel Map, and only after you press a button and confirm), the tool says exactly what is sent. See the privacy and licence page for the full wording.',
  ];
  const BASIC_FAQ = [
    ['Where is my data kept?', 'Only in this browser on this device, in a place called localStorage. It is not sent to a server and the site owner cannot see it.'],
    ['How do I move my data to another device?', 'On the My Data tab, download a backup file, open this tool on the other device, and use "Restore a backup" there.'],
    ['Does it work without an internet connection?', 'Once a page has loaded, the tools run in your browser and do not need a connection, except where a tool says it contacts another server. I have not tested offline use on every tool.'],
    ['Why is my data gone?', 'Most often the browser\'s site data was cleared, or you used a private window or a different browser. A backup file (My Data tab) protects against this.'],
    ['Are these tools finished and maintained?', 'No. They are works in progress, and not all are actively maintained. Expect bugs. The code is open and commented on GitHub.'],
  ];

  /** Sources tab. info.sources is a list of groups: { h: 'Heading', note: 'optional line', items: [{ t: 'Title', u: 'https://link', n: 'what was taken from it' }] }. */
  function sources(id, extra) {
    const s = info(id).sources || [];
    return h('div', {},
      h('p', { class: 'meta' }, 'Everything this tool refers to. Where something is marked "starting point" it is common practice that I have not checked against a published source. Please read the originals, and buy the books.'),
      s.length ? s.map((g) => [h('h2', {}, g.h), g.note ? h('p', { class: 'meta' }, g.note) : null,
        h('ul', {}, g.items.map((i) => h('li', {}, i.u ? h('a', { href: i.u, rel: 'noopener noreferrer' }, i.t) : h('strong', {}, i.t), i.n ? ': ' + i.n : '')))]) : h('p', {}, 'This tool has no outside sources: it works only from what you type in.'),
      extra || null,
      h('h2', {}, 'Licences'), h('p', { class: 'meta' }, 'The code on this site is open, under a licence that asks you not to resell it. Details, and the licences of any data or sounds used, are on the ', h('a', { href: '/privacy/' }, 'privacy and licence page'), '.'));
  }
  /** FAQ tab: the tool's own questions (info.faq: [{ q, a }]) first, then the questions every tool shares. */
  function faq(id) {
    const own = (info(id).faq || []).map((x) => [x.q, x.a]), all = own.concat(BASIC_FAQ);
    return h('div', {}, all.map(([q, a]) => h('details', { style: 'margin:10px 0;border-bottom:1px solid var(--line);padding-bottom:8px' }, h('summary', { style: 'cursor:pointer' }, q), h('p', { class: 'meta' }, a))));
  }
  /** My Data tab. spec = { md(), csv(), backup(), restore(obj), clear(), summary() }. */
  function myData(spec) {
    const msg = h('p', { class: 'meta', role: 'status' }, takeFlash()), file = h('input', { type: 'file', accept: '.json,application/json' });
    file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { if (!spec.restore(JSON.parse(rd.result))) msg.textContent = 'That file is not a backup of this tool.'; else msg.textContent = 'Restored.'; } catch (e) { msg.textContent = 'That file could not be read.'; } }; rd.readAsText(f); });
    const csv = spec.csv ? spec.csv() : [];
    return h('div', {},
      h('h2', {}, 'Data policy'), h('ul', {}, POLICY.map((p) => h('li', {}, p))),
      spec.summary ? [h('h2', {}, 'What is stored now'), (() => { const rows = spec.summary(); return rows.length ? h('ul', {}, rows.map(([k, v]) => h('li', {}, k + ': ' + v))) : h('p', { class: 'meta' }, 'Nothing is stored yet.'); })()] : null,
      h('h2', {}, 'Export'),
      h('p', {}, spec.md ? h('button', { type: 'button', onclick: () => download(spec.id + '.md', spec.md(), 'text/markdown') }, 'Download as Markdown') : null, ' ',
        spec.backup ? h('button', { type: 'button', onclick: () => download(spec.id + '-backup.json', JSON.stringify(spec.backup(), null, 1), 'application/json') }, 'Download a backup (JSON)') : null),
      spec.extra ? h('p', {}, spec.extra.map((x) => [h('button', { type: 'button', onclick: x.fn }, x.label), ' '])) : null,
      csv.length ? h('p', {}, csv.map((c) => [h('button', { type: 'button', onclick: () => download(c.name, c.text, 'text/csv') }, 'CSV: ' + c.name.replace(spec.id + '-', '').replace('.csv', '')), ' '])) : (spec.csv ? h('p', { class: 'meta' }, 'No tables to export as CSV yet.') : null),
      spec.restore ? [h('h2', {}, 'Restore a backup'), h('p', {}, file)] : null,
      h('h2', {}, 'Delete'), h('p', {}, h('button', { type: 'button', onclick: () => { if (confirm('Delete all the data this tool keeps in this browser? This cannot be undone. Download a backup first if unsure.')) spec.clear(); } }, 'Delete all my data')), msg);
  }
  /** Example Data tab. spec = { load(), remove() } (or none: the tool then says it has nothing to load). */
  function example(spec, id) {
    const msg = h('p', { class: 'meta', role: 'status' }, takeFlash());
    if (!spec || !spec.load) return h('div', {}, h('p', {}, info(id).exampleNote || 'This tool has no example data to load: it works from what you type in, or from material built into the page.'), msg);
    return h('div', {}, h('p', {}, info(id).exampleNote || 'Load made-up entries to see how this tool looks when it has some data in it.'),
      h('p', { class: 'meta' }, 'Example data is invented and marked as an example. It is not real, and it is not from any person or study. Removing it leaves your own entries alone.'),
      h('p', {}, h('button', { type: 'button', onclick: () => spec.load() }, 'Load example data'), ' ', h('button', { type: 'button', onclick: () => spec.remove() }, 'Remove example data')), msg);
  }
  /** The four standard tabs as a list for tools that have their own tab bar: [{ id, label, build() }].
      spec describes the data (see fromKeys). opts.sources can replace the Sources panel (brewing and baking build theirs from data files). */
  function standard(id, spec, opts) {
    opts = opts || {};
    return [
      { id: '_sources', label: 'Sources', build: () => opts.sources ? opts.sources() : sources(id) },
      { id: '_mydata', label: 'My Data', build: () => myData(spec) },
      { id: '_example', label: 'Example Data', build: () => example(spec, id) },
      { id: '_faq', label: 'FAQ', build: () => faq(id) },
    ];
  }

  /* ---------------------------------------------------------------- pages that are not built on a tab framework */
  let pageSpec = null, claimed = false;
  /** A page registers where its data lives: PBEshell.data({ id, title, keys, sample }). Safe to call more than once. */
  function data(o) { pageSpec = fromKeys(o); return pageSpec; }
  /** A tool whose data does not sit under plain storage keys gives its own spec (see fromKeys for the shape). */
  function custom(spec) { pageSpec = spec; return spec; }
  /** A tool that draws its own tab bar calls this so the page wrapper stays out of the way. */
  const claim = () => { claimed = true; };
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** Wrap the page in tabs. The tool's content becomes the first tab (or several, using data-pbe-tab), then the four standard tabs follow. */
  function page(id) {
    const main = document.getElementById('main'); if (!main || claimed) return;
    const lede = main.querySelector('.lede'); if (!lede) return;
    const first = lede.nextElementSibling, keep = (first && first.classList.contains('note')) ? first : null;    // a "work in progress" note stays above the tabs
    const nodes = []; for (let n = (keep || lede).nextSibling; n; n = n.nextSibling) { if (n.nodeType === 1 && (n.tagName === 'SCRIPT' || n.tagName === 'NOSCRIPT')) continue; if (n.nodeType === 3 && !n.textContent.trim()) continue; nodes.push(n); }
    const panels = []; let cur = null;
    const open = (label) => { cur = { label, id: slug(label), box: h('section', { hidden: true }) }; panels.push(cur); return cur; };
    open(main.dataset.toolTab || 'Tool');
    nodes.forEach((n) => { if (n.nodeType === 1 && n.dataset.pbeTab) { if (cur.box.childNodes.length || panels.length > 1) open(n.dataset.pbeTab); else { cur.label = n.dataset.pbeTab; cur.id = slug(cur.label); } } cur.box.append(n); });
    const spec = pageSpec || fromKeys({ id, title: (main.querySelector('h1') || {}).textContent || id, keys: info(id).keys || [] }), std = standard(id, spec), all = panels.map((p) => ({ id: p.id, label: p.label, el: p.box })).concat(std.map((s) => ({ id: s.id.replace('_', ''), label: s.label, build: s.build })));
    const nav = h('nav', { class: 'tabs', 'aria-label': 'Sections' }), host = h('div', {}), stdBox = h('div', {});
    panels.forEach((p) => host.append(p.box)); host.append(stdBox);                                  // the tool's own panels stay in the page (hidden when not shown), so the tool's code can always find its elements
    const show = (tid, push) => {
      const t = all.find((x) => x.id === tid) || all[0];
      nav.querySelectorAll('a').forEach((a) => a.setAttribute('aria-current', a.dataset.id === t.id ? 'page' : 'false'));
      panels.forEach((p) => { p.box.hidden = p.id !== t.id; });
      stdBox.hidden = !!t.el; if (!t.el) stdBox.replaceChildren(t.build());
      if (push) { try { history.replaceState(null, '', '#' + t.id); } catch (e) { /* ignore */ } }
      window.dispatchEvent(new Event('resize'));                                                    // tools that draw to a measured size can redraw
    };
    all.forEach((t) => nav.append(h('a', { href: '#' + t.id, 'data-id': t.id, onclick: (e) => { e.preventDefault(); show(t.id, true); } }, t.label)));
    (keep || lede).after(nav, host); show(location.hash.slice(1), false);
    window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
  }
  /** Which project is this page? The first folder in the address (so /sightline/player/ is "sightline"). */
  const pageId = () => (location.pathname.split('/').filter(Boolean).filter((s) => !/\.html?$/.test(s))[0] || '');
  document.addEventListener('DOMContentLoaded', () => { const id = pageId(); if (id && window.PBEinfo && window.PBEinfo[id]) page(id); });

  return { h, standard, fromKeys, data, custom, current: () => pageSpec, claim, sources, faq, myData, example, download, csvCell, flash, takeFlash, info, page };
})();
