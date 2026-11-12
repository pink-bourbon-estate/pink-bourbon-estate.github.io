/* Sourdough and Baking Timesheet - a bake planner that runs entirely in your browser.

   Read this file top to bottom: it is arranged in the same order you use the tool.

     1. Maths    baker's percentages turned into grams (calculator)
     2. Clock    steps turned into times, adjusted for room temperature (schedule)
     3. Water    the water temperature that gets the dough to the right temperature
     4. Screen   the tabs: Plan, Weigh-out, Timeline, Water, Sources

   It is a web copy of BakeCraft, a desktop program written in Rust whose code lives at
   https://github.com/pink-bourbon-estate/Toolkits (folder "bakecraft"). The recipes in data.json
   were produced by that program: each is the AVERAGE of published school and bakery formulas,
   and every source is listed (with a link where one exists) on the Sources tab.

   Privacy: nothing is sent anywhere. Your plan is kept in this browser (localStorage) so it is
   still here tomorrow; clear your site data and it is gone. No cookies, no analytics.

   Work in progress: expect bugs. The times are estimates; trust the dough over the clock.
*/
(() => {
  'use strict';

  const root = document.getElementById('app');
  let DATA = null;       // recipes + sources, from data.json
  let bakes = [];        // the plan: one entry per bake
  let tab = 'plan';
  const STORE = 'baking-timesheet-plan-v1';

  /* ------------------------------------------------------------------ small helpers */

  /** Make an element: h('p', {class:'meta'}, 'text', childNode). */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const recipeOf = (key) => DATA.recipes.find((r) => r.key === key);
  const round1 = (x) => Math.round(x * 10) / 10;
  /** Grams a kitchen scale can show: one decimal under 20 g, whole grams above. */
  const roundG = (g) => (Math.abs(g) < 20 ? round1(g) : Math.round(g));
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dayName = (ms) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  const MIN = 60000;
  /** A value for <input type="datetime-local"> from a timestamp (local time). */
  const toLocalInput = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  function save() { try { localStorage.setItem(STORE, JSON.stringify(bakes)); } catch (e) { /* private window: carry on without saving */ } }
  function load() { try { const s = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(s) ? s.filter((b) => recipeOf(b.recipe_key)) : []; } catch (e) { return []; } }

  /** Offer text as a download, entirely in the browser. */
  function saveFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------ 1. MATHS (calculator.rs) */
  /*
     Baker's maths in four lines:
       1. Add up every overall percentage:  flour 100 + water 72 + salt 2 ... = 174 %
       2. Total dough wanted:               2 loaves x 900 g = 1800 g
       3. Total flour = dough / (sum / 100)
       4. Each ingredient = total flour x its % / 100
     A levain or poolish holds part of the flour and water. We work out the OVERALL totals first,
     so the hydration slider is the TRUE hydration, then subtract what is already in the
     preferment to get what you weigh on mix day.
  */
  const YEAST = { instant: 1, 'active dried': 1.25, fresh: 3 };   // grams of each = 1 g instant
  const POOLISH_YEAST_PCT = 0.1;   // a poolish needs very little yeast: % of its own flour
  const EGG_G = 58;                // a UK large egg out of the shell

  const eggNote = (name, g) => {
    if (!/egg/i.test(name)) return '';
    const n = g / EGG_G;
    return 'about ' + (Math.abs(n - Math.round(n)) > 0.2 ? n.toFixed(1) : Math.round(n)) + ' large eggs';
  };

  function calculate(r, inp) {
    const ycf = YEAST[inp.yeast_type] || 1;
    const hyd = inp.hydration;
    const totalPct = 100 + hyd + r.salt + r.yeast_instant + r.rollin_butter + r.extras.reduce((s, e) => s + e[1], 0);
    const totalDough = inp.pieces * inp.piece_weight * (1 + inp.waste_pct / 100);
    const flourInLoaves = totalDough / (totalPct / 100);   // flour that ends up in the dough you bake
    /*
       Keeping back some dough as your next starter (sourdough only).
       After the first mix, BEFORE the salt goes in, you cut off `cut` grams of that dough. It has the
       same ratios as the loaves, so its flour must be added to the mix on top of the loaves' flour:
         pre-salt percentage total P0 = total percentage - salt %
         extra flour = cut x 100 / P0
       Everything except the salt is weighed against that bigger flour total; the salt is worked out
       from the flour that stays in the loaves, so the loaves keep exactly the recipe's ratios.
    */
    const cut = r.preferment === 'levain' ? Math.max(0, inp.starter_cut || 0) : 0;
    const totalFlour = flourInLoaves + (cut * 100) / (totalPct - r.salt);
    const g = (pct) => (totalFlour * pct) / 100;
    const gSalt = (pct) => (flourInLoaves * pct) / 100;
    const L = (name, grams, pct, note) => ({ name, grams, pct: pct ?? null, note: note || '', total: name.startsWith('=') });
    const sheet = { overall: [], preferment: [], final: [], cutaway: [], lamination: [], divide: [], totalFlour, totalDough, cut };

    // overall formula (what the whole dough contains)
    r.flour_blend.forEach(([n, s]) => sheet.overall.push(L(n, roundG(g(s)), s)));
    r.liquids.forEach(([n, s]) => { const p = (hyd * s) / 100; sheet.overall.push(L(n, roundG(g(p)), round1(p), eggNote(n, g(p)))); });
    if (r.salt > 0) sheet.overall.push(L('Salt', roundG(gSalt(r.salt)), r.salt));
    if (r.yeast_instant > 0) sheet.overall.push(L('Yeast (' + inp.yeast_type + ')', roundG(g(r.yeast_instant * ycf)), Math.round(r.yeast_instant * ycf * 100) / 100));
    r.extras.forEach(([n, p]) => sheet.overall.push(L(n, roundG(g(p)), p)));
    if (r.rollin_butter > 0) sheet.overall.push(L('Roll-in butter (lamination)', roundG(g(r.rollin_butter)), r.rollin_butter));

    // split out the preferment (levain or poolish); it uses the first flour and first liquid
    const prefFlour = r.preferment ? g(r.pff) : 0;
    const prefWater = (prefFlour * r.pref_hydration) / 100;
    let prefYeast = 0;
    const mainFlour = r.flour_blend[0][0], mainLiquid = r.liquids[0][0];
    if (r.preferment === 'levain') {
      const seed = (prefFlour * r.seed_pct) / 100;
      sheet.preferment = [
        L('Ripe starter (100 % hydration)', roundG(seed), null, "the 'seed'"),
        L(mainFlour, roundG(prefFlour - seed / 2)),
        L(mainLiquid + ' (~26-28 C)', roundG(prefWater - seed / 2)),
        L('= Levain total', roundG(prefFlour + prefWater), null, Math.round(r.pref_hydration) + ' % hydration; holds ' + r.pff + ' % of the flour'),
      ];
    } else if (r.preferment === 'poolish') {
      prefYeast = (prefFlour * POOLISH_YEAST_PCT) / 100;
      sheet.preferment = [
        L(mainFlour, roundG(prefFlour)),
        L(mainLiquid + ' (~20 C)', roundG(prefWater)),
        L('Yeast (' + inp.yeast_type + ')', Math.round(prefYeast * ycf * 100) / 100, null, 'a pinch: use scales that read 0.1 g or 1/16 tsp'),
        L('= Poolish total', roundG(prefFlour + prefWater + prefYeast * ycf)),
      ];
    }

    // final dough = overall minus what is already in the preferment
    r.flour_blend.forEach(([n, s]) => sheet.final.push(L(n, roundG(g(s) - (n === mainFlour ? prefFlour : 0)))));
    r.liquids.forEach(([n, s]) => {
      const gr = g((hyd * s) / 100) - (n === mainLiquid ? prefWater : 0);
      sheet.final.push(L(n, roundG(gr), null, /^water/i.test(n) ? 'temperature: see the Water tab' : eggNote(n, gr)));
    });
    if (r.preferment) sheet.final.push(L(r.preferment === 'levain' ? 'Levain (all of it)' : 'Poolish (all of it)', roundG(prefFlour + prefWater + prefYeast * ycf)));
    if (r.salt > 0) sheet.final.push(L('Salt', roundG(gSalt(r.salt)), null, cut > 0 ? 'add AFTER you have cut away the starter' : ''));
    if (cut > 0) sheet.cutaway = [L('Cut away after the first mix, before the salt', cut, null, 'this dough is your next starter: keep it in a clean jar, and feed it before the next bake')];
    if (r.yeast_instant > 0) sheet.final.push(L('Yeast (' + inp.yeast_type + ')', roundG(Math.max(g(r.yeast_instant) - prefYeast, 0) * ycf)));
    r.extras.forEach(([n, p]) => sheet.final.push(L(n, roundG(g(p)))));

    if (r.rollin_butter > 0) sheet.lamination = [L('Cold unsalted butter (82 %+ fat) for the block', roundG(g(r.rollin_butter)), null, 'pound into a flat square, as cold-but-bendy as the dough')];
    sheet.divide = [L((r.rollin_butter > 0 ? 'Cut ' : 'Divide into ') + inp.pieces + ' x ' + r.piece_name, roundG(inp.piece_weight), null, r.rollin_butter > 0 ? 'each piece (dough + butter)' : 'raw dough per piece')];
    return sheet;
  }

  /* ------------------------------------------------------------------ 2. CLOCK (schedule.rs) */
  /*
     Yeast and sourdough bacteria roughly DOUBLE their speed for every ~9 C warmer. For steps
     marked temp_sensitive:  minutes = default x 2 ^ ((reference temp - your room) / 9),
     kept between 0.4x and 2.5x so a silly number cannot give a silly answer. Fridge steps are
     not adjusted. This is a rule of thumb: the "done when" cue is the real test.
  */
  const tempFactor = (room, ref) => Math.min(2.5, Math.max(0.4, Math.pow(2, (ref - room) / 9)));
  const stepMinutes = (step, room, ref, override) => {
    const base = override ?? step.minutes;
    return step.temp_sensitive ? Math.round(base * tempFactor(room, ref)) : base;
  };

  /** Lay one bake's steps out on the clock. Returns events {start,end,name,...} in ms. */
  function timeline(b, index) {
    const r = recipeOf(b.recipe_key);
    const ev = [];
    let prevEnd = b.anchor;
    r.steps.forEach((s, i) => {
      const mins = stepMinutes(s, b.room_c, r.ref_temp_c, b.overrides && b.overrides[i]);
      if (mins <= 0) return;                               // a step set to 0 is skipped
      const start = i === 0 ? b.anchor : prevEnd + s.start_offset * MIN;   // negative offset = overlap
      const end = start + mins * MIN;
      ev.push({ bake: index, label: b.label, name: s.name, start, end, fold: false, how: s.how, done: s.done_when });
      s.folds_at.forEach((f, n) => {                       // folds sit at fixed gaps inside the step
        if (start + f * MIN < end) ev.push({ bake: index, label: b.label, name: '   Fold ' + (n + 1) + ' of ' + s.folds_at.length, start: start + f * MIN, end: start + f * MIN + 5 * MIN, fold: true, how: 'Wet hands: lift, stretch and fold the dough over itself on 4 sides.', done: '' });
      });
      prevEnd = s.start_offset < 0 ? Math.max(prevEnd, end) : end;
    });
    if (b.mode === 'finish' && ev.length) {                // "ready by": slide so the last step ends then
      const shift = b.anchor - Math.max(...ev.map((e) => e.end));
      ev.forEach((e) => { e.start += shift; e.end += shift; });
    }
    return ev;
  }
  const merged = () => bakes.flatMap((b, i) => timeline(b, i)).sort((a, b) => a.start - b.start || Number(a.fold) - Number(b.fold));

  /** Hands-on moments from DIFFERENT bakes starting within `win` minutes of each other. */
  function clashes(ev, win = 10) {
    const hands = ev.map((e, i) => i).filter((i) => ev[i].fold || (ev[i].end - ev[i].start) / MIN <= 30);
    const hit = new Set();
    hands.forEach((a, p) => {
      for (const b of hands.slice(p + 1)) {
        if (ev[b].start - ev[a].start > win * MIN) break;   // sorted, so nothing later can be close
        if (ev[a].bake !== ev[b].bake) { hit.add(a); hit.add(b); }
      }
    });
    return hit;
  }

  /* ------------------------------------------------------------------ 3. WATER (water.rs) */
  /*
     Fermentation times assume the dough comes off the mixer at a set temperature (the DDT).
       water temp = DDT x N - (flour + room [+ preferment]) - friction
     N is 3 for a straight dough and 4 when there is a levain or poolish. "Friction" is the heat
     your mixing adds; the starting values below are guesses, so calibrate once with your own mixer.
  */
  const FRICTION = { 'by hand': 4, 'stand mixer': 12, 'spiral mixer': 14 };
  const waterTemp = (ddt, flour, room, pref, fr) => (pref == null ? ddt * 3 - (flour + room) - fr : ddt * 4 - (flour + room + pref) - fr);
  const frictionFromMix = (dough, flour, room, water, pref) => (pref == null ? dough * 3 - (flour + room + water) : dough * 4 - (flour + room + water + pref));
  const waterAdvice = (w) => (w < 2 ? 'Below 2 C: use iced water and chill the flour, or accept a warmer dough and shorten the bulk.'
    : w > 40 ? 'Above 40 C: too hot for starter and yeast. Use 38-40 C water and give the bulk more time or a warmer spot.'
    : 'OK: weigh the water at this temperature.');

  /* ------------------------------------------------------------------ 4. SCREEN */

  const num = (id, label, value, attrs = {}) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value, step: 'any', ...attrs }));

  function bannerNote() {
    return h('p', { class: 'note' }, 'Work in progress: expect bugs. Not all of these tools are actively maintained. The times are estimates: fermentation follows temperature, flour and starter strength, not the clock. When the dough and the timer disagree, go with the dough.');
  }

  /* ---- Plan tab: add a bake, see the list ---- */
  function planTab() {
    const first = DATA.recipes[0];
    const sel = h('select', { id: 'recipe', 'aria-label': 'Recipe' }, DATA.recipes.map((r) => h('option', { value: r.key }, r.name)));
    const desc = h('p', { class: 'meta', id: 'desc' });
    const pieces = num('pieces', 'How many', first.default_pieces, { min: 1, step: 1, 'data-slider': '1,24,1' });
    const pieceLabel = h('span', { class: 'meta', id: 'pl' });
    const weight = num('weight', 'Grams of raw dough each', first.default_piece_weight, { min: 1, 'data-slider': '30,1500,10' });
    const hyd = num('hyd', first.liquid_label, first.hydration, { step: 0.5, 'data-slider': '40,110,0.5' });
    const range = h('span', { class: 'meta', id: 'range' });
    // yeast choice only for recipes that use yeast (not sourdough, which uses a starter, and not pasta)
    const yeast = h('label', { class: 'fld' }, 'Yeast type', h('select', { id: 'yeast' }, Object.keys(YEAST).map((y) => h('option', { value: y }, y))));
    // sourdough only: dough cut away after the first mix, before salt, to become the next starter
    const starter = num('starter', 'Starter to keep back (g)', 150, { min: 0, step: 10, 'data-slider': '0,400,10' });
    const starterNote = h('span', { class: 'meta', id: 'sn' }, 'Cut this much dough off after the first mix, before the salt goes in. 150 g is enough to start two more batches of loaves. It is added on top of the loaves, so your ratios stay the same. Set 0 if you keep your starter another way.');
    const waste = num('waste', 'Bowl loss %', 1, { min: 0, max: 10, step: 0.5, 'data-slider': '0,10,0.5' });
    const room = num('room', 'Kitchen temperature (C)', 21, { min: 5, max: 35, step: 0.5, 'data-slider': '5,35,0.5' });
    const mode = h('label', { class: 'fld' }, 'Plan by', h('select', { id: 'mode' }, h('option', { value: 'finish' }, 'Ready by (finish time)'), h('option', { value: 'start' }, 'Start at')));
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(10, 0, 0, 0);
    const when = h('label', { class: 'fld' }, 'When', h('input', { id: 'when', type: 'datetime-local', value: toLocalInput(t.getTime()) }));

    const refresh = () => {
      const r = recipeOf(sel.value);
      desc.textContent = r.description;
      pieces.querySelector('input').value = r.default_pieces;
      weight.querySelector('input').value = r.default_piece_weight;
      hyd.firstChild.textContent = r.liquid_label;
      hyd.querySelector('input').value = r.hydration;
      pieceLabel.textContent = 'Per ' + r.piece_name + '.';
      const sour = r.preferment === 'levain';
      yeast.hidden = r.yeast_instant <= 0;
      starter.hidden = !sour; starterNote.hidden = !sour;
      range.textContent = r.school_range ? 'The published formulas range from ' + r.school_range[0] + ' to ' + r.school_range[1] + ' %.' : '';
    };
    sel.addEventListener('change', refresh); refresh();

    const add = () => {
      const r = recipeOf(sel.value);
      const v = (id) => Number(root.querySelector('#' + id).value);
      const p = v('pieces');
      if (!(p >= 1) || !(v('weight') > 0)) { msg.textContent = 'Enter at least one piece, weighing more than 0 g.'; return; }
      const anchor = new Date(root.querySelector('#when').value).getTime();
      if (Number.isNaN(anchor)) { msg.textContent = 'Choose a date and time.'; return; }
      msg.textContent = '';
      bakes.push({ recipe_key: r.key, label: r.name + ' x' + p, pieces: p, piece_weight: v('weight'), hydration: v('hyd'), yeast_type: root.querySelector('#yeast').value, starter_cut: v('starter'), waste_pct: v('waste'), anchor, mode: root.querySelector('#mode').value, room_c: v('room'), overrides: {} });
      save(); show('weigh');
    };
    const msg = h('p', { class: 'meta', role: 'status' });

    const list = bakes.length
      ? h('div', {}, h('h2', {}, 'Your plan (' + bakes.length + ')'), h('ol', { class: 'plan' }, bakes.map((b, i) => h('li', {},
        h('strong', {}, b.label), ' · ' + (b.mode === 'finish' ? 'ready by ' : 'start ') + dayName(b.anchor) + ' ' + hhmm(b.anchor) + ' · room ' + b.room_c + ' C ',
        h('button', { type: 'button', onclick: () => { bakes.splice(i, 1); save(); show('plan'); } }, 'Remove')))),
        h('button', { type: 'button', onclick: () => { bakes = []; save(); show('plan'); } }, 'Clear the plan'))
      : h('p', { class: 'meta' }, 'No bakes yet. Add one above, then open Weigh-out and Timeline. Add several to see them on one timeline.');

    return h('div', {}, h('h2', {}, 'Add a bake'), h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Recipe', sel), desc, pieces, pieceLabel, weight, hyd, range, yeast, starter, starterNote, waste, room, mode, when),
      h('p', {}, h('button', { type: 'button', onclick: add }, 'Add to plan'), ' ', msg), list);
  }

  /* ---- Weigh-out tab: every gram ---- */
  function sheetBlock(title, lines, showPct) {
    if (!lines.length) return null;
    return h('section', {}, h('h3', {}, title), h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, lines.map((l) => h('tr', { class: l.total ? 'tot' : '' },
      h('td', {}, l.name), h('td', { class: 'n' }, l.grams + ' g'), h('td', { class: 'n' }, showPct && l.pct != null ? l.pct + ' %' : ''), h('td', { class: 'meta' }, l.note)))))));
  }
  function sheetText(b, s, r) {
    const out = [r.name + '  -  ' + b.pieces + ' x ' + r.piece_name + ' @ ' + b.piece_weight + ' g',
      r.liquid_label + ': ' + b.hydration + ' %   |   total flour ' + Math.round(s.totalFlour) + ' g   |   total dough ' + Math.round(s.totalDough) + ' g (incl. bowl loss)', ''];
    const block = (title, lines, pct) => {
      if (!lines.length) return;
      out.push(title, '-'.repeat(title.length));
      lines.forEach((l) => out.push('  ' + l.name.padEnd(46) + String(l.grams).padStart(8) + ' g  ' + (pct && l.pct != null ? String(l.pct).padStart(6) + ' %' : '        ') + (l.note ? '   (' + l.note + ')' : '')));
      out.push('');
    };
    block("OVERALL FORMULA (baker's %)", s.overall, true); block('PREFERMENT - mix first', s.preferment); block('FINAL DOUGH - mix day', s.final); block('NEXT STARTER', s.cutaway); block('LAMINATION', s.lamination); block('DIVIDE', s.divide);
    out.push('BAKE: ' + r.bake); if (r.notes) out.push('NOTE: ' + r.notes);
    return out.join('\n') + '\n';
  }
  function weighTab() {
    if (!bakes.length) return h('p', { class: 'meta' }, 'Add a bake on the Plan tab first.');
    return h('div', {}, bakes.map((b) => {
      const r = recipeOf(b.recipe_key);
      const s = calculate(r, b);
      return h('article', { class: 'bake' }, h('h2', {}, b.label),
        h('p', { class: 'lede' }, 'Total flour ' + Math.round(s.totalFlour) + ' g' + (r.flour_blend.length > 1 ? ' (' + r.flour_blend.map(([n, p]) => roundG((s.totalFlour * p) / 100) + ' g ' + n.replace(/ \(.*\)/, '').toLowerCase()).join(', ') + ')' : '') + ' · ' + (s.cut ? 'mix ' + Math.round(s.totalDough + s.cut) + ' g, cut ' + s.cut + ' g, bake ' + Math.round(s.totalDough) + ' g · ' : 'total dough ' + Math.round(s.totalDough) + ' g · ') + r.liquid_label.split(' (')[0] + ' ' + b.hydration + ' %'),
        sheetBlock('Preferment: mix first', s.preferment), sheetBlock('Final dough: mix day', s.final), sheetBlock('Your next starter', s.cutaway), sheetBlock('Lamination', s.lamination), sheetBlock('Divide', s.divide),
        h('p', {}, h('strong', {}, 'Bake: '), r.bake), r.notes ? h('p', { class: 'meta' }, r.notes) : null,
        sheetBlock("Overall formula (baker's percentages), for checking", s.overall, true),
        h('p', {}, h('button', { type: 'button', onclick: () => saveFile(r.key + '-weigh-out.txt', sheetText(b, s, r), 'text/plain') }, 'Download TXT'), ' ', h('button', { type: 'button', onclick: () => window.print() }, 'Print')));
    }));
  }

  /* ---- Timeline tab: all bakes on one sheet ---- */
  const csvQ = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  function timelineTab() {
    if (!bakes.length) return h('p', { class: 'meta' }, 'Add a bake on the Plan tab first.');
    const ev = merged(), hit = clashes(ev);
    const text = () => { let day = '', out = []; ev.forEach((e) => { const d = dayName(e.start); if (d !== day) { out.push('', d.toUpperCase(), '-'.repeat(d.length)); day = d; }
      out.push('  ' + hhmm(e.start) + ' - ' + hhmm(e.end) + '  [' + e.label + ']  ' + e.name.trim() + (e.fold ? '' : '  (' + (e.end - e.start) / MIN + ' min)'));
      if (e.how && !e.fold) out.push('                 how:  ' + e.how); if (e.done) out.push('                 done when: ' + e.done); }); return out.join('\n').trim() + '\n'; };
    const csv = () => 'day,start,end,minutes,bake,step,how,done_when\n' + ev.map((e) => [new Date(e.start).toISOString().slice(0, 10), hhmm(e.start), hhmm(e.end), (e.end - e.start) / MIN, csvQ(e.label), csvQ(e.name.trim()), csvQ(e.how), csvQ(e.done)].join(',')).join('\n') + '\n';
    let day = '';
    const rows = [];
    ev.forEach((e, i) => {
      const d = dayName(e.start);
      if (d !== day) { rows.push(h('h3', {}, d)); day = d; }
      rows.push(h('div', { class: 'ev' + (e.fold ? ' fold' : '') + (hit.has(i) ? ' clash' : '') },
        h('span', { class: 'time' }, hhmm(e.start) + ' - ' + hhmm(e.end)), h('span', { class: 'what' }, h('strong', {}, e.name.trim()), ' ', h('span', { class: 'meta' }, '[' + e.label + ']' + (e.fold ? '' : ' ' + (e.end - e.start) / MIN + ' min')),
          e.how && !e.fold ? h('span', { class: 'meta block' }, e.how) : null, e.done ? h('span', { class: 'meta block' }, 'Done when: ' + e.done) : null, hit.has(i) ? h('span', { class: 'meta block' }, 'Another bake needs your hands within 10 minutes of this.') : null)));
    });
    return h('div', {}, h('p', { class: 'lede' }, ev.length + ' steps across ' + bakes.length + (bakes.length === 1 ? ' bake.' : ' bakes. Steps that need your hands at nearly the same time as another bake are marked.')),
      h('p', {}, h('button', { type: 'button', onclick: () => saveFile('timeline.csv', csv(), 'text/csv') }, 'Download CSV'), ' ', h('button', { type: 'button', onclick: () => saveFile('timeline.txt', text(), 'text/plain') }, 'Download TXT'), ' ', h('button', { type: 'button', onclick: () => window.print() }, 'Print')),
      rows);
  }

  /* ---- Water tab ---- */
  function waterTab() {
    const out = h('p', { class: 'lede', role: 'status', 'aria-live': 'polite' });
    const ids = ['ddt', 'flour', 'wroom', 'pref', 'fr'];
    const mixer = h('label', { class: 'fld' }, 'Mixing', h('select', { id: 'mix' }, Object.keys(FRICTION).map((m) => h('option', { value: m }, m))));
    const usePref = h('label', { class: 'fld' }, h('input', { id: 'usepref', type: 'checkbox' }), ' The dough contains a levain or poolish');
    const calc = () => {
      const v = (id) => Number(root.querySelector('#' + id).value);
      const fr = root.querySelector('#fr').value === '' ? FRICTION[root.querySelector('#mix').value] : v('fr');
      const w = waterTemp(v('ddt'), v('flour'), v('wroom'), root.querySelector('#usepref').checked ? v('pref') : null, fr);
      out.textContent = 'Water at ' + round1(w) + ' C. ' + waterAdvice(w);
    };
    const cal = h('p', { class: 'lede', role: 'status' });
    const calibrate = () => {
      const v = (id) => Number(root.querySelector('#' + id).value);
      const f = frictionFromMix(v('cdough'), v('cflour'), v('croom'), v('cwater'), root.querySelector('#cpref').value === '' ? null : v('cpref'));
      cal.textContent = 'Your mixer adds about ' + round1(f) + ' C of friction. Type that into "Friction" above.';
    };
    const form = h('div', { class: 'form' }, num('ddt', 'Desired dough temperature (C)', 25), num('flour', 'Flour temperature (C)', 20), num('wroom', 'Room temperature (C)', 21), mixer, num('pref', 'Levain / poolish temperature (C)', 24), usePref,
      num('fr', 'Friction (C), leave blank to use the mixing method', '', { placeholder: 'auto' }));
    form.addEventListener('input', calc); setTimeout(calc, 0);
    return h('div', {}, h('p', { class: 'meta' }, 'Fermentation times assume the dough comes off the mix at a set temperature. Water is the easy thing to adjust. Formula: water = DDT x N - (flour + room [+ preferment]) - friction, with N = 3 for a straight dough and 4 with a preferment.'),
      form, out, h('h2', {}, 'Calibrate your mixer (once)'), h('p', { class: 'meta' }, 'After a normal mix, probe the dough and enter what you used. The answer is your own friction value.'),
      h('div', { class: 'form', onclick: null }, num('cdough', 'Dough temperature after mixing (C)', 25), num('cflour', 'Flour (C)', 20), num('croom', 'Room (C)', 21), num('cwater', 'Water (C)', 30), num('cpref', 'Levain / poolish (C), blank if none', '', { placeholder: 'none' }), h('p', {}, h('button', { type: 'button', onclick: calibrate }, 'Work out my friction'))), cal);
  }

  /* ---- Sources tab: where every number comes from ---- */
  /*
     Every published formula is stored as baker's percentages (flour = 100). To show GRAMS we need a size,
     so each recipe family has "how many" and "grams each" boxes, starting at the Plan tab's numbers.
     Each formula has a different total percentage, so the same dough weight needs a different amount of
     flour in each one:
         total % = 100 + liquid + salt + yeast + eggs + milk + sugar + butter + oil + roll-in butter
         flour (g) = pieces x grams each / (total % / 100)
         ingredient (g) = flour x its % / 100
     Only the ingredients you weigh are shown: flour (split by type where the source says so), water, salt,
     starter, yeast, butter (dough and roll-in added together), oil, and so on. The starter is already
     counted inside the flour and water, so its column is "of which".
  */
  const FAMILIES = { sourdough: 'Sourdough', baguette: 'Baguette', focaccia: 'Focaccia', brioche: 'Brioche', croissant: 'Croissant', pasta_egg: 'Fresh egg pasta', pasta_semola: 'Semola pasta' };
  const SRC = { unit: 'g', size: {} };   // remembered while you move between tabs: grams or percentages, and the sizes you typed

  /** The flour types a source states in its notes, as percentages of its flour: [white, wholemeal, rye]. null if it does not say. */
  function flourSplit(s) {
    const n = (s.notes || '').toLowerCase();
    let m;
    if ((m = n.match(/(\d+) % white \/ (\d+) % wholemeal/))) return [Number(m[1]), Number(m[2]), 0];
    if ((m = n.match(/(\d+) % (whole wheat|wholemeal)/))) return [100 - Number(m[1]), Number(m[1]), 0];
    if ((m = n.match(/(\d+) % rye/))) return [100 - Number(m[1]), 0, Number(m[1])];
    return null;
  }
  const FLOUR_TYPES = ['White flour', 'Wholemeal flour', 'Rye flour'];

  function sourcesTab() {
    const unitBtn = (u, label) => h('button', { type: 'button', class: 'seg', 'aria-pressed': SRC.unit === u ? 'true' : 'false', onclick: () => { SRC.unit = u; show('sources'); } }, label);
    const sections = Object.entries(FAMILIES).map(([fam, title]) => {
      const src = DATA.sources.filter((s) => s.recipe === fam);
      if (!src.length) return null;
      const recipes = DATA.recipes.filter((r) => r.family === fam);
      const base = recipes[0];
      const plural = base.piece_name === 'loaf' ? 'loaves' : base.piece_name.replace(/ \(.*\)/, '') + 's';
      const size = SRC.size[fam] || (SRC.size[fam] = { n: base.default_pieces, w: base.default_piece_weight });
      const splitFlours = fam === 'sourdough';                    // only sourdough mixes several flours in this data
      const preferment = base.preferment === 'levain' ? 'Starter (levain)' : base.preferment === 'poolish' ? 'Poolish' : null;
      // the columns: [label, function(values, flourG) -> grams, key used to decide whether to show it]
      const defs = [
        ['Water', (v) => v.hydration, fam === 'pasta_egg' ? 'Eggs' : 'Water'],
        ['Salt', (v) => v.salt],
        ['Starter', (v, f) => (v.pff ? (f * v.pff / 100) * (1 + (v.pref_hydration || 100) / 100) / f * 100 : null), preferment || ''],
        ['Yeast', (v) => v.yeast_instant],
        ['Eggs', (v) => v.eggs], ['Milk', (v) => v.milk], ['Sugar', (v) => v.sugar],
        ['Butter', (v) => ((v.butter || 0) + (v.rollin_butter || 0)) || null],
        ['Oil', (v) => v.oil],
      ];
      const label = (d) => d[2] || d[0];
      const used = defs.filter((d) => src.some((s) => d[1](s.values, 100)));   // hide columns nobody uses
      const avgValues = () => {
        const real = src.filter((s) => !s.reference_only);
        const keys = ['hydration', 'salt', 'pff', 'pref_hydration', 'yeast_instant', 'eggs', 'milk', 'sugar', 'butter', 'rollin_butter', 'oil'];
        return Object.fromEntries(keys.map((k) => { const v = real.filter((s) => s.values[k] != null).map((s) => s.values[k]); return [k, v.length ? v.reduce((a, b) => a + b, 0) / v.length : null]; }));
      };
      const out = h('div', {});
      const nIn = h('input', { type: 'number', min: 1, step: 1, value: size.n, 'aria-label': 'How many ' + plural });
      const wIn = h('input', { type: 'number', min: 1, step: 'any', value: size.w, 'aria-label': 'Grams per ' + base.piece_name });

      /* One table row. `values` holds percentages; in grams mode they are turned into grams. */
      const row = (name, values, split, cls) => {
        const total = 100 + ['hydration', 'salt', 'yeast_instant', 'eggs', 'milk', 'sugar', 'butter', 'oil', 'rollin_butter'].reduce((s, k) => s + (values[k] || 0), 0);
        const flour = (size.n * size.w) / (total / 100);
        const amt = (pct) => (pct == null || pct === 0 ? h('td', { class: 'n' }, '') : SRC.unit === '%' ? h('td', { class: 'n' }, String(Math.round(pct * 10) / 10) + ' %') : h('td', { class: 'n' }, roundG((flour * pct) / 100) + ' g'));
        const eggCell = (pct) => { const c = amt(pct); if (pct && SRC.unit === 'g') c.append(h('span', { class: 'meta block' }, eggNote('egg', (flour * pct) / 100).replace('about ', '~'))); return c; };
        const flourCells = splitFlours
          ? FLOUR_TYPES.map((_, i) => (split ? amt(split[i]) : h('td', { class: 'n meta' }, i === 0 ? 'not stated' : '')))
          : [];
        return h('tr', { class: cls || '' }, h('td', {}, name),
          h('td', { class: 'n' }, SRC.unit === '%' ? '100 %' : roundG(flour) + ' g'),
          flourCells.map((c, i) => (SRC.unit === 'g' && split && split[i] ? h('td', { class: 'n' }, roundG((flour * split[i]) / 100) + ' g') : c)),
          used.map((d) => (d[0] === 'Eggs' || (d[0] === 'Water' && fam === 'pasta_egg') ? eggCell(d[1](values, flour)) : amt(d[1](values, flour)))),
          h('td', { class: 'n' }, SRC.unit === '%' ? Math.round(total) + ' %' : Math.round(size.n * size.w) + ' g'));
      };
      const draw = () => {
        size.n = Math.max(1, Number(nIn.value) || 1); size.w = Math.max(1, Number(wIn.value) || 1);
        const head = h('tr', {}, h('th', {}, 'Source'), h('th', { class: 'n' }, 'Total flour'), splitFlours ? FLOUR_TYPES.map((t) => h('th', { class: 'n' }, t)) : null, used.map((d) => h('th', { class: 'n' }, label(d))), h('th', { class: 'n' }, SRC.unit === '%' ? 'Total %' : 'Total dough'));
        const body = src.map((s) => row(h('span', {}, s.reference_only ? h('em', {}, '(comparison only) ') : null, h('strong', {}, s.name), ' ',
          h('span', { class: 'meta' }, s.origin + '. ' + s.citation + ' '), s.url ? h('a', { href: s.url, rel: 'noopener noreferrer' }, 'link') : null, s.notes ? h('span', { class: 'meta block' }, s.notes) : null), s.values, flourSplit(s)));
        const classic = base.flour_blend.map(([, p]) => p);
        body.push(row(h('strong', {}, 'Average (used by the recipe)'), avgValues(), [classic[0] || 100, classic[1] || 0, classic[2] || 0], 'tot'));
        const blends = recipes.map((r) => {
          const sh = calculate(r, { pieces: size.n, piece_weight: size.w, hydration: r.hydration, yeast_type: 'instant', waste_pct: 0, starter_cut: 0 });
          return h('p', { class: 'meta' }, h('strong', {}, r.name + ': '), roundG(sh.totalFlour) + ' g flour = ' + r.flour_blend.map(([n, s]) => roundG((sh.totalFlour * s) / 100) + ' g ' + n.replace(/ \(.*\)/, '').toLowerCase()).join(' + ') + '.');
        });
        out.replaceChildren(h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, head), h('tbody', {}, body))), ...blends);
      };
      nIn.addEventListener('input', draw); wIn.addEventListener('input', draw); draw();
      return h('section', {}, h('h2', {}, title),
        h('div', { class: 'form' }, h('label', { class: 'fld' }, 'How many ' + plural, nIn), h('label', { class: 'fld' }, 'Grams per ' + base.piece_name, wIn)), out);
    });
    return h('div', {}, h('p', { class: 'lede' }, "Every recipe is the average of published formulas from schools and bakeries. Sources a home-baking book supplies are shown for comparison only and are never averaged. Please buy the books: they are excellent."),
      h('div', { class: 'segs', role: 'group', 'aria-label': 'Show amounts as' }, h('span', { class: 'meta' }, 'Show: '), unitBtn('g', 'Grams'), unitBtn('%', "Percentages (flour = 100)")),
      h('p', { class: 'meta' }, 'In grams, each formula is scaled to the same dough weight, so you can compare the sources. Flour is split into types only where the source says how. The starter is already counted inside the flour and water. Butter is the butter in the dough plus any roll-in butter.'),
      sections, h('p', { class: 'meta' }, 'The same data, with its code comments, is in sources.rs and data.json in the source repository.'));
  }

  /* ---- Starter tab: make one from nothing, or refresh one ---- */
  /* Amounts in grams of flour and of water added each day (equal parts, so 100 % hydration). */
  const STARTER_DAYS = [[1, 10, 10], [2, 10, 10], [3, 10, 10], [4, 10, 10], [5, 40, 40], [6, 40, 40], [7, 80, 80]];
  function starterTab() {
    let running = 0;
    const rows = STARTER_DAYS.map(([d, f, w]) => { running += f + w; return h('tr', {}, h('td', {}, 'Day ' + d), h('td', { class: 'n' }, (d === 1 ? 'Mix ' : 'Add ') + f + ' g'), h('td', { class: 'n' }, w + ' g'), h('td', { class: 'n' }, running + ' g')); });
    return h('div', {}, h('h2', {}, 'No starter yet? Make one in 7 days'),
      h('p', { class: 'meta' }, 'Equal weights of flour and water, fed daily, in a clean jar with the lid resting on top (not sealed), somewhere warm (about 24-26 C). Wholemeal or rye flour wakes a starter faster than white.'),
      h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Day', 'Flour', 'Water', 'Total if you discard nothing'].map((t, i) => h('th', { class: i ? 'n' : '' }, t)))), h('tbody', {}, rows))),
      h('p', { class: 'meta' }, 'Written this way, nothing is thrown away, so by day 7 the jar would hold about 400 g. If you want about 200 g at the end of day 7, keep only 40 g of starter before that last feed and discard the rest (it makes good pancakes). Use it once it reliably doubles within 4 to 8 hours of a feed and smells pleasantly sour, not sharp or like nail varnish.'),
      h('h2', {}, 'Already have a starter that needs waking up?'),
      h('p', { class: 'meta' }, 'Keep a small amount (about 10-20 g), discard the rest, and feed it equal weights of flour and water (for example 20 g starter, 20 g flour, 20 g water). Repeat once or twice a day until it doubles within 4 to 8 hours, then it is ready to use. A starter kept in the fridge needs this two or three days before a bake. This is general guidance, not a tested recipe: judge by how the starter behaves.'),
      h('h2', {}, 'Keeping it going'),
      h('p', { class: 'meta' }, 'Each time you bake, the Plan tab can tell you how much dough to cut off after the first mix, before the salt, to be your next starter (150 g by default). That dough already has the levain in it, so it is a ready-made starter: put it in a clean jar and feed it before the next bake.'));
  }

  /* ---- history: counts and charts of what you have made (see ../charts.js) ---- */
  function historyTab() {
    return PBEcharts.history({ storeKey: 'sourdough-baking-history-v1', noun: 'bake', recipes: DATA.recipes.map((r) => ({ key: r.key, name: r.name, group: r.family })) });
  }

  /* ---- tabs and start-up ---- */
  const TABS = [['plan', 'Plan'], ['weigh', 'Weigh-out'], ['timeline', 'Timeline'], ['water', 'Water'], ['starter', 'Starter'], ['history', 'History'], ['sources', 'Sources']];
  function show(t) {
    tab = t;
    const body = { plan: planTab, weigh: weighTab, timeline: timelineTab, water: waterTab, starter: starterTab, history: historyTab, sources: sourcesTab }[t]();
    root.replaceChildren(
      bannerNote(),
      h('nav', { class: 'tabs', 'aria-label': 'Sections' }, TABS.map(([k, l]) => h('a', { href: '#' + k, 'aria-current': k === t ? 'page' : false, onclick: (e) => { e.preventDefault(); show(k); } }, l))),
      body);
  }

  fetch('data.json').then((r) => r.json()).then((d) => {
    DATA = d; bakes = load(); show(bakes.length ? 'weigh' : 'plan');
  }).catch(() => { root.replaceChildren(h('p', { class: 'lede' }, 'The recipe data could not be loaded. Try again in a minute.')); });
})();
