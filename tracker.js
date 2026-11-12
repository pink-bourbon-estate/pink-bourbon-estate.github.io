/* tracker.js - one small shared framework that builds a personal tracking tool in your browser.

   Each tool on this site (health metrics, home, car, gym...) is just a short list of "tabs" described in
   its own app.js. This file turns that description into working pages. Tab types:

     log     a form + table + charts + stats for things you record over time (weights, readings, mileage)
     checks  routine jobs with a frequency (daily, weekly, monthly...) that show what is due or overdue
     dates   named dates with a countdown (MOT, insurance, a prescription running out)
     list    a plain tick list you can reset (emergency kit, travel packing)
     notes   free-text notes written in Markdown
     static  fixed reading material (tables, guidance, sources)
     custom  your own function that builds the page (used for timers, calculators and so on)

   A final "Your data" tab is added to every tool: download everything as Markdown (text) or CSV
   (opens in any spreadsheet), make or restore a backup file, or clear it all.

   Privacy: everything stays in this browser (localStorage). Nothing is sent anywhere. No cookies, no tracking.
   Needs charts.js loaded first (for the charts).
*/
(() => {
  'use strict';

  /* ---------------------------------------------------------------- small helpers */

  /** Make an element: h('p', {class:'meta'}, 'text', childNode). Arrays of children are flattened. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (k) => { if (Array.isArray(k)) k.forEach(add); else if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k))); };
    kids.forEach(add);
    return el;
  }
  /** Replace everything inside `el` with the given children. Unlike el.replaceChildren(), this also accepts arrays of children. */
  function fill(el, ...kids) {
    el.replaceChildren();
    const add = (k) => { if (Array.isArray(k)) k.forEach(add); else if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k))); };
    kids.forEach(add);
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const round = (x, d = 1) => { const f = Math.pow(10, d); return Math.round(x * f) / f; };
  /** Add days to an ISO date string (YYYY-MM-DD) and return a new ISO date string. */
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  /** Add whole months, keeping the day of the month where possible. */
  const addMonths = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  /** Whole days from today to an ISO date (negative if the date has passed). */
  const daysUntil = (iso) => Math.round((new Date(iso + 'T12:00:00Z') - new Date(today() + 'T12:00:00Z')) / 86400000);
  const uid = () => Math.random().toString(36).slice(2, 9);

  /** Offer text as a download, entirely in the browser. */
  function saveFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const csvCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const mdCell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

  /** How many days each "every" word means. Months are handled separately so they follow the calendar. */
  const FREQ = { daily: ['d', 1], weekly: ['d', 7], fortnightly: ['d', 14], monthly: ['m', 1], quarterly: ['m', 3], 'six-monthly': ['m', 6], yearly: ['m', 12] };
  const FREQ_ORDER = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'six-monthly', 'yearly'];
  const nextDue = (last, every) => {
    if (!last) return today();                                    // never done: due now
    if (typeof every === 'number') return addDays(last, every);
    const [kind, n] = FREQ[every] || ['d', 7];
    return kind === 'm' ? addMonths(last, n) : addDays(last, n);
  };

  /* ---------------------------------------------------------------- the tool builder */

  function tool(cfg) {
    const root = document.querySelector(cfg.root || '#app');
    const KEY = 'pbe-' + cfg.id + '-v1';
    let store = {};                                                // all of this tool's data: { tabId: data }
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private window: carry on */ } };
    const get = (id, fallback) => (store[id] === undefined ? fallback : store[id]);
    const set = (id, v) => { store[id] = v; save(); };
    const ctx = { h, get, set, today, addDays, addMonths, daysUntil, round, saveFile, uid, rerender: () => show(current) };
    let current = '_dash';

    /* ---- log tab ---- */
    function logTab(t, opts = {}) {
      let rows = get(t.id, []);
      const fields = t.fields;
      const computed = t.computed || [];
      const colsAll = [...fields.filter((f) => f.type !== 'textarea'), ...computed];
      const out = h('div', {}), charts = h('div', {});
      const inputs = {};
      const form = h('div', { class: 'form' }, fields.map((f) => {
        let input;
        if (f.type === 'select') input = h('select', {}, (f.options || []).map((o) => h('option', { value: o }, o)));
        else if (f.type === 'textarea') input = h('textarea', { rows: 2 });
        else input = h('input', { type: f.type === 'check' ? 'checkbox' : (f.type || 'text'), step: f.step || (f.type === 'number' ? 'any' : false), min: f.min, max: f.max, placeholder: f.placeholder });
        if (f.type === 'date') input.value = today();
        else if (f.default !== undefined) input.value = f.default;
        inputs[f.key] = input;
        return h('label', { class: 'fld' }, f.label + (f.unit ? ' (' + f.unit + ')' : ''), input);
      }));
      const filter = t.filterBy ? h('select', { 'aria-label': 'Filter by ' + t.filterBy }) : null;
      const valueOf = (r, c) => (c.fn ? c.fn(r, rows) : r[c.key]);
      const view = () => rows.map((r, i) => [r, i]).filter(([r]) => !filter || !filter.value || r[t.filterBy] === filter.value);

      const draw = () => {
        if (filter) {
          const cur = filter.value, opts = [...new Set(rows.map((r) => r[t.filterBy]).filter(Boolean))].sort();
          fill(filter, h('option', { value: '' }, 'All'), opts.map((o) => h('option', { value: o }, o)));
          filter.value = opts.includes(cur) ? cur : '';
        }
        const shown = view();
        fill(out, shown.length
          ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, colsAll.map((c) => h('th', { class: c.type === 'number' || c.fn ? 'n' : '' }, c.label + (c.unit ? ' (' + c.unit + ')' : ''))), h('th', {}, ''))),
            h('tbody', {}, shown.slice().sort((a, b) => String(b[0].date || '').localeCompare(String(a[0].date || ''))).slice(0, t.maxRows || 200).map(([r, i]) =>
              h('tr', {}, colsAll.map((c) => { const v = valueOf(r, c); return h('td', { class: c.type === 'number' || c.fn ? 'n' : '' }, v === undefined || v === null ? '' : (typeof v === 'boolean' ? (v ? 'yes' : '') : v)); }),
                h('td', {}, h('button', { type: 'button', onclick: () => { rows.splice(i, 1); set(t.id, rows); draw(); } }, 'Delete')))))))
          : h('p', { class: 'meta' }, 'Nothing recorded yet.'));
        // statistics and charts, drawn only from the rows currently shown
        fill(charts, );
        const data = shown.map(([r]) => r);
        if (t.summary && data.length) PBEcharts.stat(charts, t.summary(data));
        (t.charts || []).slice(0, opts.limit || 99).forEach((c) => {
          const box = h('div', { class: 'chart' });
          charts.append(h('h3', {}, c.title), box);
          const sorted = data.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
          if (c.kind === 'bar') {
            const m = new Map(); data.forEach((r) => { const k = valueOf(r, { key: c.by, fn: c.byFn }); if (k) m.set(k, (m.get(k) || []).concat([r])); });
            PBEcharts.bar(box, [...m].map(([k, v]) => ({ label: String(k), value: c.avg ? v.reduce((s, r) => s + (Number(r[c.avg]) || 0), 0) / v.length : v.length })).sort((a, b) => b.value - a.value).slice(0, 12), { unit: c.unit });
          } else {
            const col = fields.find((f) => f.key === c.y) || computed.find((f) => f.key === c.y) || { key: c.y };
            PBEcharts.line(box, sorted.map((r) => ({ x: r.date, y: Number(valueOf(r, col)) })).filter((p) => isFinite(p.y) && p.y !== 0 || c.zero), { unit: c.unit || col.unit });
          }
        });
      };
      const add = () => {
        const r = {};
        for (const f of fields) { const i = inputs[f.key]; r[f.key] = f.type === 'number' ? (i.value === '' ? '' : Number(i.value)) : f.type === 'check' ? i.checked : i.value.trim(); }
        if (t.required && t.required.some((k) => r[k] === '' || r[k] == null)) { out.prepend(h('p', { class: 'note' }, 'Please fill in: ' + t.required.map((k) => fields.find((f) => f.key === k).label).join(', ') + '.')); return; }
        rows.push(r); set(t.id, rows);
        fields.forEach((f) => { if (!f.keep && f.type !== 'date' && f.type !== 'select') inputs[f.key].value = ''; if (f.type === 'check') inputs[f.key].checked = false; });
        draw();
      };
      if (filter) filter.addEventListener('change', draw);
      draw();
      if (opts.only === 'charts') return charts;                    // the dashboard wants just the stats and charts
      return h('div', {}, t.intro ? h('p', { class: 'meta' }, t.intro) : null, h('h2', {}, t.addLabel || 'Add an entry'), form, h('p', {}, h('button', { type: 'button', onclick: add }, 'Add')),
        filter ? h('label', { class: 'fld' }, 'Show', filter) : null, charts, h('h2', {}, 'Entries'), out);
    }

    /* ---- checks tab: routine jobs with a frequency ----
       Each job keeps a list of the dates you did it (hist). "Last done" is the newest of those.
       Two views: a list of what is due, and a grid like a habit tracker where you click a box to put an x in it. */
    function checksTab(t) {
      const wrap = h('div', {});
      let showFilter = 'due', ym = today().slice(0, 7);
      const state = () => {
        const s = get(t.id, { done: {}, hist: {}, custom: [], view: t.view || cfg.view || 'list' });
        if (!s.hist) s.hist = {};
        Object.keys(s.done || {}).forEach((id) => { if (!s.hist[id]) s.hist[id] = [s.done[id]]; });      // older saves only had the last date
        return s;
      };
      const lastOf = (s, id) => (s.hist[id] || []).slice().sort().pop() || '';
      const mark = (s, id, date) => {                                    // click: add the date, or remove it if already there
        const l = s.hist[id] || (s.hist[id] = []), i = l.indexOf(date);
        if (i >= 0) l.splice(i, 1); else l.push(date);
        s.done[id] = lastOf(s, id); set(t.id, s);
      };
      const items = (s) => [...t.items.map((i) => ({ ...i, builtin: true })), ...s.custom];
      const draw = () => {
        const s = state();
        const rowsData = items(s).map((i) => { const last = lastOf(s, i.id); const due = nextDue(last, i.every); return { ...i, last, due, left: daysUntil(due) }; });
        const view = h('p', {}, h('button', { type: 'button', 'aria-pressed': String(s.view !== 'grid'), onclick: () => { s.view = 'list'; set(t.id, s); draw(); } }, 'What is due'), ' ', h('button', { type: 'button', 'aria-pressed': String(s.view === 'grid'), onclick: () => { s.view = 'grid'; set(t.id, s); draw(); } }, 'Grid (tick boxes)'));
        fill(wrap, h('p', { class: 'meta' }, t.intro || 'Tick a job when you have done it. It comes back when it is next due.'), view, s.view === 'grid' ? gridView(s, rowsData) : listView(s, rowsData), h('h3', {}, 'Add your own job'), addForm(s));
      };
      const listView = (s, rowsData) => {
        const groups = [...new Set(rowsData.map((r) => r.group).filter(Boolean))];
        const sel = h('select', { 'aria-label': 'Show' }, [['due', 'Due or overdue'], ['all', 'Everything'], ...FREQ_ORDER.map((f) => [f, 'Only ' + f]), ...groups.map((g) => ['g:' + g, g])].map(([v, l]) => h('option', { value: v }, l)));
        sel.value = showFilter; sel.addEventListener('change', () => { showFilter = sel.value; draw(); });
        const keep = rowsData.filter((r) => showFilter === 'all' || (showFilter === 'due' && r.left <= 0) || r.every === showFilter || showFilter === 'g:' + r.group).sort((a, b) => a.left - b.left);
        const status = (r) => (!r.last ? 'not done yet' : r.left < 0 ? 'overdue by ' + -r.left + ' day' + (r.left === -1 ? '' : 's') : r.left === 0 ? 'due today' : 'due in ' + r.left + ' day' + (r.left === 1 ? '' : 's'));
        return h('div', {}, h('label', { class: 'fld' }, 'Show', sel),
          keep.length ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Job', 'How often', 'Last done', 'Status', ''].map((x) => h('th', {}, x)))),
            h('tbody', {}, keep.map((r) => h('tr', {}, h('td', {}, h('strong', {}, r.name), r.note ? h('span', { class: 'meta block' }, r.note) : null), h('td', {}, typeof r.every === 'number' ? 'every ' + r.every + ' days' : r.every), h('td', {}, r.last || '-'), h('td', { style: r.left < 0 || !r.last ? 'font-weight:600' : '' }, status(r)),
              h('td', {}, h('button', { type: 'button', onclick: () => { mark(s, r.id, today()); draw(); } }, 'Done today'), ' ', r.builtin ? null : h('button', { type: 'button', onclick: () => { s.custom = s.custom.filter((c) => c.id !== r.id); set(t.id, s); draw(); } }, 'Remove')))))))
            : h('p', { class: 'meta' }, 'Nothing due. Choose "Everything" to see all jobs.'));
      };
      const gridView = (s, rowsData) => {
        const [y, m] = ym.split('-').map(Number), n = new Date(y, m, 0).getDate();
        const key = (d) => ym + '-' + String(d).padStart(2, '0');
        const sorted = rowsData.slice().sort((a, b) => FREQ_ORDER.indexOf(a.every) - FREQ_ORDER.indexOf(b.every));
        return h('div', {}, h('p', {}, h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', -1).slice(0, 7); draw(); } }, 'Previous'), ' ', h('strong', {}, ym), ' ', h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', 1).slice(0, 7); draw(); } }, 'Next')),
          h('p', { class: 'meta' }, 'Click a box to put an x in it for the day you did the job; click again to take it out. The outlined box is today.'),
          h('div', { class: 'tablewrap' }, h('table', { class: 'xgrid' }, h('thead', {}, h('tr', {}, h('th', {}, 'Job'), Array.from({ length: n }, (_, i) => h('th', {}, i + 1)))),
            h('tbody', {}, sorted.map((r) => h('tr', {}, h('td', {}, r.name, h('span', { class: 'meta block' }, typeof r.every === 'number' ? 'every ' + r.every + ' days' : r.every)),
              Array.from({ length: n }, (_, i) => { const k = key(i + 1), on = (s.hist[r.id] || []).includes(k);
                return h('td', {}, h('button', { type: 'button', class: 'xbox' + (k === today() ? ' today' : ''), 'aria-label': r.name + ' ' + k, 'aria-pressed': String(on), onclick: () => { mark(s, r.id, k); draw(); } }, on ? '×' : '')); }))))))); 
      };
      const addForm = (s) => {
        const name = h('input', { type: 'text' }), every = h('select', {}, FREQ_ORDER.map((f) => h('option', { value: f }, f))), group = h('input', { type: 'text', placeholder: 'optional' });
        return h('div', {}, h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Job', name), h('label', { class: 'fld' }, 'How often', every), h('label', { class: 'fld' }, 'Group', group)),
          h('p', {}, h('button', { type: 'button', onclick: () => { if (!name.value.trim()) return; s.custom.push({ id: 'c' + uid(), name: name.value.trim(), every: every.value, group: group.value.trim() || 'Mine' }); set(t.id, s); draw(); } }, 'Add the job')));
      };
      draw(); return wrap;
    }

    /* ---- dates tab: named dates with a countdown ---- */
    function datesTab(t) {
      const wrap = h('div', {});
      const draw = () => {
        const s = get(t.id, { dates: {}, custom: [] });
        const items = [...t.items, ...s.custom];
        fill(wrap, h('p', { class: 'meta' }, t.intro || 'Enter each date once. This shows how long is left.'),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['What', 'Date', 'Time left', ''].map((x) => h('th', {}, x)))),
            h('tbody', {}, items.map((i) => { const d = s.dates[i.id] || ''; const left = d ? daysUntil(d) : null;
              const inp = h('input', { type: 'date', value: d, 'aria-label': i.name, onchange: (e) => { s.dates[i.id] = e.target.value; set(t.id, s); draw(); } });
              return h('tr', {}, h('td', {}, h('strong', {}, i.name), i.note ? h('span', { class: 'meta block' }, i.note) : null), h('td', {}, inp),
                h('td', { style: left !== null && left <= 30 ? 'font-weight:600' : '' }, left === null ? '' : left < 0 ? 'passed ' + -left + ' days ago' : left === 0 ? 'today' : left + ' days'),
                h('td', {}, i.custom ? h('button', { type: 'button', onclick: () => { s.custom = s.custom.filter((c) => c.id !== i.id); set(t.id, s); draw(); } }, 'Remove') : null)); })))),
          h('h3', {}, 'Add your own date'), (() => { const n = h('input', { type: 'text' }); return h('div', {}, h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Name', n)), h('p', {}, h('button', { type: 'button', onclick: () => { if (n.value.trim()) { s.custom.push({ id: 'c' + uid(), name: n.value.trim(), custom: true }); set(t.id, s); draw(); } } }, 'Add'))); })());
      };
      draw(); return wrap;
    }

    /* ---- list tab: a plain tick list ---- */
    function listTab(t) {
      const wrap = h('div', {});
      const draw = () => {
        const s = get(t.id, { ticked: {}, custom: [] });
        const items = [...t.items, ...s.custom.map((c) => ({ ...c, custom: true }))];
        const groups = [...new Set(items.map((i) => i.group || ''))];
        const done = items.filter((i) => s.ticked[i.name]).length;
        fill(wrap, h('p', { class: 'meta' }, t.intro || ''), h('p', { class: 'lede' }, done + ' of ' + items.length + ' ticked'),
          groups.map((g) => h('div', {}, g ? h('h3', {}, g) : null, h('ul', { class: 'checklist' }, items.filter((i) => (i.group || '') === g).map((i) => h('li', {},
            h('label', {}, h('input', { type: 'checkbox', checked: !!s.ticked[i.name], onchange: (e) => { s.ticked[i.name] = e.target.checked; set(t.id, s); draw(); } }), ' ', i.name, i.note ? h('span', { class: 'meta block' }, i.note) : null),
            i.custom ? h('button', { type: 'button', onclick: () => { s.custom = s.custom.filter((c) => c.name !== i.name); set(t.id, s); draw(); } }, 'Remove') : null))))),
          h('p', {}, h('button', { type: 'button', onclick: () => { s.ticked = {}; set(t.id, s); draw(); } }, 'Untick everything')),
          (() => { const n = h('input', { type: 'text', placeholder: 'Add your own item' }); return h('p', {}, n, ' ', h('button', { type: 'button', onclick: () => { if (n.value.trim()) { s.custom.push({ name: n.value.trim(), group: 'Mine' }); set(t.id, s); draw(); } } }, 'Add')); })());
      };
      draw(); return wrap;
    }

    /* ---- notes tab: Markdown text notes ---- */
    function notesTab(t) {
      const wrap = h('div', {});
      const draw = () => {
        const notes = get(t.id, []);
        const title = h('input', { type: 'text' }), body = h('textarea', { rows: 5 });
        fill(wrap, h('p', { class: 'meta' }, t.intro || 'Write notes in plain text. Markdown (headings with #, lists with -) is kept as you typed it when you download.'),
          h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Title', title), h('label', { class: 'fld' }, 'Note', body)),
          h('p', {}, h('button', { type: 'button', onclick: () => { if (!title.value.trim() && !body.value.trim()) return; notes.push({ date: today(), title: title.value.trim() || 'Untitled', body: body.value }); set(t.id, notes); draw(); } }, 'Save the note')),
          notes.length ? notes.map((n, i) => [n, i]).reverse().map(([n, i]) => h('div', { class: 'ev' }, h('span', { class: 'time' }, n.date), h('span', { class: 'what' }, h('strong', {}, n.title), h('div', { style: 'white-space:pre-wrap' }, n.body), h('button', { type: 'button', onclick: () => { notes.splice(i, 1); set(t.id, notes); draw(); } }, 'Delete')))) : h('p', { class: 'meta' }, 'No notes yet.'));
      };
      draw(); return wrap;
    }

    /* ---- static tab: fixed reading. blocks: {h, p, list, table:[headers, ...rows], note} ---- */
    function staticTab(t) {
      return h('div', {}, t.blocks.map((b) => [
        b.h ? h('h2', {}, b.h) : null, b.h3 ? h('h3', {}, b.h3) : null, b.p ? h('p', { class: b.lede ? 'lede' : 'meta' }, b.p) : null, b.note ? h('p', { class: 'note' }, b.note) : null,
        b.list ? h('ul', {}, b.list.map((x) => h('li', {}, x))) : null,
        b.table ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, b.table[0].map((x) => h('th', {}, x)))), h('tbody', {}, b.table.slice(1).map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))) : null]));
    }

    /* ---- example data ----
       "Load example data" fills the tool with made-up entries so you can see the dashboard working. They are NOT real.
       Log rows are marked example:true so they can be removed later. Other tabs (routines, dates, tick lists) are
       filled only if they are empty, and remembered in store._ex so "Remove example data" can undo them. */
    const seeded = (seed) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const daysAgo = (n) => addDays(today(), -n);
    function loadExample() {
      const rnd = seeded(42), pick = (a) => a[Math.floor(rnd() * a.length)];
      const ex = cfg.example ? cfg.example({ daysAgo, rnd, pick, today, addDays }) : {};
      const made = new Set(store._ex || []);
      cfg.tabs.forEach((t) => {
        if (t.type === 'log' && ex[t.id]) store[t.id] = (store[t.id] || []).concat(ex[t.id].map((r) => ({ ...r, example: true })));
        else if (t.type === 'checks' && !store[t.id]) {
          const s = { done: {}, hist: {}, custom: [], view: t.view || cfg.view || 'list' };
          t.items.forEach((i) => {
            const [kind, n] = typeof i.every === 'number' ? ['d', i.every] : FREQ[i.every] || ['d', 7], step = kind === 'm' ? n * 30 : n, l = [];
            for (let d = 60 + Math.floor(rnd() * step); d >= 0; d -= Math.max(1, Math.round(step * (0.8 + rnd() * 0.5)))) { if (rnd() < 0.85) l.push(daysAgo(d)); }
            s.hist[i.id] = l; s.done[i.id] = l.slice().sort().pop() || '';
          });
          store[t.id] = s; made.add(t.id);
        } else if (t.type === 'dates' && !store[t.id]) {
          const s = { dates: {}, custom: [] }; t.items.forEach((i, k) => { s.dates[i.id] = addDays(today(), k === 0 ? 19 : 25 + Math.floor(rnd() * 300)); }); store[t.id] = s; made.add(t.id);
        } else if (t.type === 'list' && !store[t.id]) {
          const s = { ticked: {}, custom: [] }; t.items.forEach((i) => { if (rnd() < 0.6) s.ticked[i.name] = true; }); store[t.id] = s; made.add(t.id);
        } else if (t.type === 'notes' && ex[t.id] && !store[t.id]) { store[t.id] = ex[t.id].map((n) => ({ ...n, example: true })); }
      });
      Object.entries(ex._raw || {}).forEach(([k, v]) => { if (store[k] === undefined) { store[k] = v; made.add(k); } });    // data kept by custom tabs
      store._ex = [...made]; save();
    }
    function removeExample() {
      cfg.tabs.forEach((t) => {
        if (t.type === 'log' && Array.isArray(store[t.id])) store[t.id] = store[t.id].filter((r) => !r.example);
        if (t.type === 'notes' && Array.isArray(store[t.id])) store[t.id] = store[t.id].filter((r) => !r.example);
      });
      (store._ex || []).forEach((k) => { delete store[k]; }); delete store._ex; save();
    }
    const exampleButtons = (here) => h('p', {},
      h('button', { type: 'button', onclick: () => { loadExample(); show(here); } }, 'Load example data'), ' ',
      h('button', { type: 'button', onclick: () => { removeExample(); show(here); } }, 'Remove example data'), ' ',
      h('button', { type: 'button', onclick: () => { if (confirm('Delete all the data in this tool from this browser?')) { store = {}; save(); show(here); } } }, 'Clear all my data'));

    /* ---- the Dashboard: an overview made automatically from every tab ---- */
    function dashboardTab() {
      const box = h('div', {});
      const stats = [], attention = [], blocks = [];
      cfg.tabs.forEach((t) => {
        const d = store[t.id];
        if (t.type === 'log' && Array.isArray(d) && d.length) {
          stats.push([t.label + ' entries', d.length]);
          blocks.push(h('div', {}, h('h2', {}, t.label), logTab(t, { only: 'charts', limit: 2 })));
        }
        if (t.type === 'checks' && d) {
          const s = { done: d.done || {}, hist: d.hist || {}, custom: d.custom || [] };
          const all = [...t.items, ...s.custom].map((i) => { const last = (s.hist[i.id] || [s.done[i.id]]).filter(Boolean).sort().pop() || ''; return { ...i, left: daysUntil(nextDue(last, i.every)), last }; });
          const over = all.filter((r) => r.last && r.left < 0), now = all.filter((r) => r.left <= 0);
          stats.push([t.label + ' due or overdue', now.length]); over.sort((a, b) => a.left - b.left).slice(0, 6).forEach((r) => attention.push(r.name + ' (overdue by ' + -r.left + ' day' + (r.left === -1 ? '' : 's') + ')'));
          const perDay = {}; Object.values(s.hist).forEach((l) => l.forEach((x) => { perDay[x] = (perDay[x] || 0) + 1; }));
          const pts = Array.from({ length: 21 }, (_, i) => { const x = addDays(today(), i - 20); return { x, y: perDay[x] || 0 }; });
          const c = h('div', { class: 'chart' }); PBEcharts.line(c, pts, { unit: 'jobs', empty: 'Nothing recorded yet.' });
          blocks.push(h('div', {}, h('h2', {}, t.label + ': jobs done per day, last 3 weeks'), c));
        }
        if (t.type === 'dates' && d) {
          const upcoming = [...t.items, ...(d.custom || [])].map((i) => ({ i, date: (d.dates || {})[i.id] })).filter((x) => x.date).map((x) => ({ ...x, left: daysUntil(x.date) })).sort((a, b) => a.left - b.left);
          upcoming.filter((x) => x.left <= 60).slice(0, 5).forEach((x) => attention.push(x.i.name + (x.left < 0 ? ' (passed ' + -x.left + ' days ago)' : ' (in ' + x.left + ' days)')));
          if (upcoming.length) stats.push(['Next date in', Math.max(0, upcoming.filter((x) => x.left >= 0)[0] ? upcoming.filter((x) => x.left >= 0)[0].left : 0) + ' days']);
        }
        if (t.type === 'list' && d) { const items = [...t.items, ...(d.custom || [])], n = items.filter((i) => (d.ticked || {})[i.name]).length; stats.push([t.label + ' ticked', n + '/' + items.length]); }
      });
      const empty = !stats.length && !(cfg.dashboardExtra && cfg.dashboardExtra(ctx));
      fill(box, h('p', { class: 'meta' }, 'An overview worked out on your device from what you have entered. Nothing is sent anywhere.'),
        empty ? h('p', { class: 'lede' }, 'Nothing to show yet. Add some entries, or load example data to see how the dashboard looks.') : null,
        exampleButtons('_dash'),
        h('p', { class: 'meta' }, 'The example data is made up, to show what the charts look like: it is not from any real person or study. Remove it any time.'));
      if (stats.length) PBEcharts.stat(box, stats.slice(0, 8));
      if (attention.length) box.append(h('h2', {}, 'Needs attention'), h('ul', {}, attention.map((a) => h('li', {}, a))));
      if (cfg.dashboardExtra) { const x = cfg.dashboardExtra(ctx); if (x) box.append(x); }       // a tool can add its own overview (for data kept by custom tabs)
      if (cfg.whatif) box.append(h('h2', {}, 'Play with it'), cfg.whatif(ctx));
      blocks.forEach((b) => box.append(b));
      return box;
    }

    /* ---- the Your data tab ---- */
    function dataTab() {
      const toMarkdown = () => {
        let md = '# ' + cfg.title + '\n\nExported ' + today() + '\n';
        cfg.tabs.forEach((t) => {
          const d = store[t.id]; if (d === undefined) return;
          md += '\n## ' + t.label + '\n\n';
          if (t.type === 'log') md += d.length ? '| ' + t.fields.map((f) => f.label).join(' | ') + ' |\n|' + t.fields.map(() => ' --- |').join('') + '\n' + d.map((r) => '| ' + t.fields.map((f) => mdCell(r[f.key])).join(' | ') + ' |').join('\n') + '\n' : '_No entries._\n';
          else if (t.type === 'notes') md += d.map((n) => '### ' + n.title + ' (' + n.date + ')\n\n' + n.body + '\n').join('\n');
          else if (t.type === 'checks') md += t.items.concat(d.custom || []).map((i) => '- ' + i.name + ' (' + i.every + '): last done ' + ((d.done || {})[i.id] || 'never')).join('\n') + '\n';
          else if (t.type === 'dates') md += t.items.concat(d.custom || []).map((i) => '- ' + i.name + ': ' + ((d.dates || {})[i.id] || 'not set')).join('\n') + '\n';
          else if (t.type === 'list') md += t.items.concat(d.custom || []).map((i) => '- [' + ((d.ticked || {})[i.name] ? 'x' : ' ') + '] ' + i.name).join('\n') + '\n';
          else md += '```json\n' + JSON.stringify(d, null, 2) + '\n```\n';
        });
        return md;
      };
      const logs = cfg.tabs.filter((t) => t.type === 'log' && (store[t.id] || []).length);
      const file = h('input', { type: 'file', accept: '.json,application/json' });
      const msg = h('p', { class: 'meta', role: 'status' });
      file.addEventListener('change', () => {
        const f = file.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => { try { const o = JSON.parse(rd.result); if (o && o.tool === cfg.id && o.data && typeof o.data === 'object') { store = o.data; save(); msg.textContent = 'Restored. Open another tab to see it.'; } else msg.textContent = 'That file is not a backup of this tool.'; } catch (e) { msg.textContent = 'That file could not be read.'; } };
        rd.readAsText(f);
      });
      return h('div', {}, h('p', { class: 'meta' }, 'Your data lives only in this browser. Download a copy now and then: Markdown is plain readable text, CSV opens in any spreadsheet, and the backup file can be restored here later.'),
        h('p', {}, h('button', { type: 'button', onclick: () => saveFile(cfg.id + '.md', toMarkdown(), 'text/markdown') }, 'Download everything (Markdown)'), ' ',
          h('button', { type: 'button', onclick: () => saveFile(cfg.id + '-backup.json', JSON.stringify({ tool: cfg.id, saved: today(), data: store }), 'application/json') }, 'Download a backup')),
        logs.length ? h('div', {}, h('h3', {}, 'Spreadsheet files (CSV)'), h('p', {}, logs.map((t) => [h('button', { type: 'button', onclick: () => saveFile(cfg.id + '-' + t.id + '.csv', t.fields.map((f) => csvCell(f.label)).join(',') + '\n' + store[t.id].map((r) => t.fields.map((f) => csvCell(r[f.key])).join(',')).join('\n') + '\n', 'text/csv') }, t.label), ' ']))) : null,
        h('h3', {}, 'Restore a backup'), h('p', {}, file), msg,
        h('h3', {}, 'Example data and clearing'), exampleButtons('_data'));
    }

    /* ---- tabs and start-up ---- */
    const builders = { log: logTab, checks: checksTab, dates: datesTab, list: listTab, notes: notesTab, static: staticTab, custom: (t) => t.render(ctx) };
    function show(id) {
      current = id;
      const all = [{ id: '_dash', label: 'Dashboard', type: '_dash' }, ...cfg.tabs, { id: '_data', label: 'Your data', type: '_data' }];
      const t = all.find((x) => x.id === id) || all[0];
      fill(root, 
        h('p', { class: 'note' }, cfg.notice || 'Work in progress: expect bugs. Not all of these tools are actively maintained. Your data stays in this browser.'),
        h('nav', { class: 'tabs', 'aria-label': 'Sections' }, all.map((x) => h('a', { href: '#' + x.id, 'aria-current': x.id === t.id ? 'page' : false, onclick: (e) => { e.preventDefault(); show(x.id); } }, x.label))),
        t.type === '_data' ? dataTab() : t.type === '_dash' ? dashboardTab() : builders[t.type](t));
    }
    show(current);
  }

  window.PBE = { daysAgo: (n) => addDays(today(), -n), tool, h, fill, today, addDays, addMonths, daysUntil, round, saveFile, FREQ_ORDER };
})();
