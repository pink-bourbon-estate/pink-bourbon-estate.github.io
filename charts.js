/* charts.js - tiny, dependency-free SVG charts shared by the tools on this site.

   Everything is drawn in the browser from numbers you already have on your device. Nothing is sent anywhere.
   Colours come from the page's own theme (var(--ink) and var(--bg)) so charts work in light and dark mode.

   Usage:
     PBEcharts.bar(container, [{label:'Espresso', value:12}, ...], {unit:'shots'})
     PBEcharts.line(container, [{x:'2026-01-02', y:28}, ...], {unit:'s'})        x can be dates or text
     PBEcharts.stat(container, [['Shots', 42], ['Avg rating', '4.1']])           a row of big numbers
*/
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const fmt = (n) => (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
  const empty = (box, msg) => { const p = document.createElement('p'); p.className = 'meta'; p.textContent = msg || 'Not enough data yet.'; box.append(p); };

  /** A horizontal bar chart: one row per item, bars drawn from zero. */
  function bar(box, data, opt = {}) {
    if (!data.length) return empty(box, opt.empty);
    const W = 600, rowH = 26, left = 150, right = 60, H = data.length * rowH + 8;
    const max = Math.max(...data.map((d) => d.value), 0.0001);
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opt.title || 'Bar chart', style: 'width:100%;height:auto;max-width:640px' });
    data.forEach((d, i) => {
      const y = i * rowH + 4, w = ((W - left - right) * d.value) / max;
      svg.append(el('text', { x: left - 8, y: y + 14, 'text-anchor': 'end', 'font-size': 11, fill: 'currentColor' }, d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label));
      svg.append(el('rect', { x: left, y, width: Math.max(w, 1), height: rowH - 8, fill: 'currentColor', opacity: 0.8 }));
      svg.append(el('text', { x: left + w + 6, y: y + 14, 'font-size': 11, fill: 'currentColor' }, fmt(d.value) + (opt.unit ? ' ' + opt.unit : '')));
    });
    box.append(svg);
  }

  /** A line chart over time (or over any ordered labels). Points are joined in the order given. */
  function line(box, pts, opt = {}) {
    if (pts.length < 2) return empty(box, opt.empty);
    const W = 600, H = 200, l = 44, r = 12, t = 12, b = 28;
    const ys = pts.map((p) => p.y);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (lo === hi) { lo -= 1; hi += 1; }
    const X = (i) => l + ((W - l - r) * i) / (pts.length - 1), Y = (v) => t + (H - t - b) * (1 - (v - lo) / (hi - lo));
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opt.title || 'Line chart', style: 'width:100%;height:auto;max-width:640px' });
    [lo, (lo + hi) / 2, hi].forEach((v) => {                               // three light grid lines with labels
      svg.append(el('line', { x1: l, x2: W - r, y1: Y(v), y2: Y(v), stroke: 'currentColor', opacity: 0.15 }));
      svg.append(el('text', { x: l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'currentColor' }, fmt(v)));
    });
    svg.append(el('polyline', { points: pts.map((p, i) => X(i) + ',' + Y(p.y)).join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }));
    pts.forEach((p, i) => svg.append(el('circle', { cx: X(i), cy: Y(p.y), r: 3, fill: 'currentColor' }, null)));
    [0, pts.length - 1].forEach((i) => svg.append(el('text', { x: X(i), y: H - 8, 'text-anchor': i ? 'end' : 'start', 'font-size': 10, fill: 'currentColor' }, String(pts[i].x))));
    if (opt.unit) svg.append(el('text', { x: W - r, y: t + 2, 'text-anchor': 'end', 'font-size': 10, fill: 'currentColor', opacity: 0.7 }, opt.unit));
    box.append(svg);
  }

  /** A row of big numbers: stat(box, [['Shots', 42], ['Average rating', 4.1]]). */
  function stat(box, pairs) {
    const row = document.createElement('div'); row.className = 'statrow';
    pairs.forEach(([k, v]) => { const d = document.createElement('div'); d.className = 'stat'; const n = document.createElement('div'); n.className = 'big'; n.textContent = v; const l = document.createElement('div'); l.className = 'meta'; l.textContent = k; d.append(n, l); row.append(d); });
    box.append(row);
  }

  /* ---------- history: a "how often have I made each thing, and how did it go" page ----------
     PBEcharts.history({ storeKey, noun:'bake', recipes:[{key, name, group}] }) returns a page (a DOM element).
     It keeps its own list in this browser (localStorage under storeKey), draws counts and ratings,
     and can load made-up example entries (labelled as such) or clear everything. */
  function history(opt) {
    const box = document.createElement('div');
    const read = () => { try { const v = JSON.parse(localStorage.getItem(opt.storeKey) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    const write = (v) => { try { localStorage.setItem(opt.storeKey, JSON.stringify(v)); } catch (e) { /* carry on without saving */ } };
    const mk = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const k in (attrs || {})) { if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } kids.flat().forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(String(c)))); return e; };
    const name = (key) => (opt.recipes.find((r) => r.key === key) || { name: key }).name;
    const groupOf = (key) => { const g = String((opt.recipes.find((r) => r.key === key) || {}).group || '').replace(/_/g, ' '); return g.charAt(0).toUpperCase() + g.slice(1); };
    const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    const tally = (items, f) => { const m = new Map(); items.forEach((x) => { const k = f(x); if (k) (m.get(k) || m.set(k, []).get(k)).push(x); }); return [...m]; };

    function draw() {
      const list = read();
      box.replaceChildren();
      const sel = mk('select', { id: 'hrec' }, opt.recipes.map((r) => mk('option', { value: r.key }, r.name)));
      const date = mk('input', { id: 'hdate', type: 'date', value: new Date().toISOString().slice(0, 10) });
      const rate = mk('input', { id: 'hrate', type: 'number', min: 1, max: 5, step: 1, placeholder: '1-5' });
      const note = mk('input', { id: 'hnote', type: 'text' });
      const lab = (t, input) => mk('label', { class: 'fld' }, t, input);
      box.append(mk('p', { class: 'meta' }, 'Record each ' + opt.noun + ' you do, and how it went. The charts below are worked out on your device from your own entries. Saved only in this browser; clear it any time.'),
        mk('h2', {}, 'Record one'), mk('div', { class: 'form' }, lab('What did you make?', sel), lab('Date', date), lab('Rating (1-5)', rate), lab('Notes', note)),
        mk('p', {}, mk('button', { type: 'button', onclick: () => { list.push({ key: sel.value, date: date.value, rating: Number(rate.value) || 0, notes: note.value.trim() }); write(list); draw(); } }, 'Add to history')),
        mk('h2', {}, 'Your numbers'));
      if (!list.length) box.append(mk('p', { class: 'meta' }, 'Nothing recorded yet.'));
      else {
        const rated = list.filter((e) => e.rating > 0);
        stat(box, [[(opt.plural || opt.noun + 's').charAt(0).toUpperCase() + (opt.plural || opt.noun + 's').slice(1) + ' recorded', list.length], ['Different recipes', new Set(list.map((e) => e.key)).size], ['Average rating', rated.length ? Math.round(avg(rated.map((e) => e.rating)) * 10) / 10 + '/5' : '-']]);
        const c1 = mk('div', { class: 'chart' }), c2 = mk('div', { class: 'chart' }), c3 = mk('div', { class: 'chart' }), c4 = mk('div', { class: 'chart' });
        bar(c1, tally(list, (e) => e.key).map(([k, v]) => ({ label: name(k), value: v.length })).sort((a, b) => b.value - a.value).slice(0, 12), { unit: 'times' });
        if (opt.recipes.some((r) => r.group)) bar(c2, tally(list, (e) => groupOf(e.key)).map(([k, v]) => ({ label: k, value: v.length })).sort((a, b) => b.value - a.value), { unit: 'times' });
        bar(c3, tally(rated, (e) => e.key).map(([k, v]) => ({ label: name(k), value: avg(v.map((e) => e.rating)) })).sort((a, b) => b.value - a.value).slice(0, 12), { unit: '/5' });
        line(c4, tally(list, (e) => String(e.date).slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ x: k, y: v.length })), { unit: 'per month', empty: 'Needs entries from at least two different months.' });
        box.append(mk('h3', {}, 'Most made'), c1, ...(opt.recipes.some((r) => r.group) ? [mk('h3', {}, 'By kind'), c2] : []), mk('h3', {}, 'Best rated (your own ratings)'), c3, mk('h3', {}, 'Per month'), c4);
        const top = tally(rated, (e) => e.key).filter(([, v]) => v.length >= 2).map(([k, v]) => [k, avg(v.map((e) => e.rating)), v.length]).sort((a, b) => b[1] - a[1])[0];
        const most = tally(list, (e) => e.key).sort((a, b) => b[1].length - a[1].length)[0];
        box.append(mk('h3', {}, 'What your history suggests'), mk('ul', {}, mk('li', {}, 'You make ' + name(most[0]) + ' most (' + most[1].length + ' times).'), top ? mk('li', {}, 'You rate ' + name(top[0]) + ' highest, ' + Math.round(top[1] * 10) / 10 + '/5 over ' + top[2] + ' entries.') : null),
          mk('p', { class: 'meta' }, 'Plain counts and averages of your own entries, not expert advice.'));
        box.append(mk('h3', {}, 'Entries'), mk('div', { class: 'tablewrap' }, mk('table', {}, mk('tbody', {}, list.map((e, i) => [e, i]).reverse().slice(0, 40).map(([e, i]) => mk('tr', {}, mk('td', {}, e.date), mk('td', {}, name(e.key), e.example ? mk('span', { class: 'meta block' }, '(example)') : null), mk('td', { class: 'n' }, e.rating ? e.rating + '/5' : ''), mk('td', { class: 'meta' }, e.notes || ''), mk('td', {}, mk('button', { type: 'button', onclick: () => { list.splice(i, 1); write(list); draw(); } }, 'Delete'))))))));
      }
      box.append(mk('h2', {}, 'Example or clear'), mk('p', { class: 'meta' }, 'The example entries are made up to show what the charts look like. They are not from any real study or person, and they are labelled (example).'),
        mk('p', {}, mk('button', { type: 'button', onclick: () => {
          let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
          const ex = []; for (let i = 0; i < 36; i++) { const r = opt.recipes[Math.floor(Math.pow(rnd(), 2) * opt.recipes.length)]; ex.push({ key: r.key, date: new Date(Date.UTC(2026, Math.floor(i / 6), 1 + (i % 6) * 4)).toISOString().slice(0, 10), rating: 2 + Math.floor(rnd() * 4), notes: '', example: true }); }
          write(read().concat(ex)); draw(); } }, 'Load example entries'), ' ',
          mk('button', { type: 'button', onclick: () => { write(read().filter((e) => !e.example)); draw(); } }, 'Remove example entries'), ' ',
          mk('button', { type: 'button', onclick: () => { if (confirm('Delete your whole history from this browser?')) { write([]); draw(); } } }, 'Clear all my history')));
    }
    draw();
    return box;
  }

  window.PBEcharts = { bar, line, stat, history };
})();
