/* Brewing and Fermentation Timesheet - a planner for drinks and fermented foods that runs entirely in your browser.

   Read this file top to bottom: it is arranged in the same order you use the tool.

     1. Maths    amounts for your batch size, and an estimate of strength (calculator)
     2. Clock    steps turned into dates and times, adjusted for room temperature (schedule)
     3. Screen   the tabs: Plan, Ingredients, Timeline, Strength, Cultures, Safety, Sources

   It is the sister of the Sourdough and Baking Timesheet and works the same way. The recipes live in
   data.json, which is written by the commented Python file build_data.py in this folder. Each recipe
   is marked "sourced" (the main figures come from a published recipe, listed on the Sources tab) or
   "starting point" (typical home practice that has not yet been checked against a source).

   Privacy: nothing is sent anywhere. Your plan is kept in this browser (localStorage) so it is
   still here tomorrow; clear your site data and it is gone. No cookies, no analytics.

   Work in progress: expect bugs. This is not medical, legal or food-safety advice. When in doubt, throw it out.
*/
(() => {
  'use strict';

  const root = document.getElementById('app');
  let DATA = null;       // recipes + sources, from data.json
  let plan = [];         // the plan: one entry per batch
  let tab = 'plan';
  const STORE = 'brewing-timesheet-plan-v1';

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
  const sourceOf = (id) => DATA.sources.find((s) => s.id === id);
  const round1 = (x) => Math.round(x * 10) / 10;
  const pad = (n) => String(n).padStart(2, '0');
  const MIN = 60000;
  const hhmm = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dayName = (ms) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  const dayShort = (ms) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  /** A value for <input type="datetime-local"> from a timestamp (local time). */
  const toLocalInput = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  /** How long a step lasts, in words people use: minutes, hours or days. */
  const dur = (mins) => (mins < 90 ? mins + ' min' : mins < 48 * 60 ? round1(mins / 60) + ' h' : round1(mins / 1440) + ' days');

  function save() { try { localStorage.setItem(STORE, JSON.stringify(plan)); } catch (e) { /* private window: carry on without saving */ } }
  function load() { try { const s = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(s) ? s.filter((b) => recipeOf(b.recipe_key)) : []; } catch (e) { return []; } }

  /** Offer text as a download, entirely in the browser. */
  function saveFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------ 1. MATHS */
  /*
     Every ingredient is stored as "amount per ONE unit of the base" (per litre of water, per kilogram of
     cabbage, ...). So the amount for your batch is simply:  per x batch size.
     One ingredient in some recipes is adjustable (honey, salt %, sugar): its value comes from the box on
     the Plan tab, times a small multiplier that turns "% of the weight" into "grams per kilogram".

     Strength estimate (drinks with sugar only):
       sugar weight  = every ingredient's weight x its fermentable fraction (honey 0.8, table sugar 1.0 ...)
       liquid volume = the base litres + what the sugar and honey add (sugar 0.63 L per kg, honey 0.70 L per kg)
       original gravity (OG)  = 1 + sugar kg / litres x 0.385        (1 kg of sugar in 1 L reads about 1.385)
       alcohol (ABV)          = (OG - final gravity) x 131.25
     This is an estimate for planning. A hydrometer reading beats any calculation.
  */
  /** Show an amount the way a kitchen tool can measure it. */
  function fmtQty(q, unit) {
    if (unit === 'g') return (q < 20 ? round1(q) : Math.round(q)) + ' g';
    if (unit === 'ml') return (q < 20 ? round1(q) : Math.round(q)) + ' ml';
    if (unit === 'tsp' || unit === 'tbsp') return (Math.max(0.25, Math.round(q * 4) / 4)) + ' ' + unit;
    if (unit === 'tablet') return (Math.max(0.25, Math.round(q * 4) / 4)) + (Math.round(q * 4) / 4 === 1 ? ' tablet' : ' tablets');
    return (Math.max(0.25, Math.round(q * 4) / 4)) + (unit === 'item' ? '' : ' ' + unit);
  }

  /** The adjustable boxes of a recipe, as a list (some recipes have none, some have several). */
  const varsOf = (r) => r.vars || [];
  function calculate(r, inp) {
    const base = inp.amount;
    // the values typed into the adjustable boxes; older saved plans stored a single number
    const vs = inp.vars || (inp.varval != null ? [inp.varval] : varsOf(r).map((x) => x.default));
    const rows = r.ingredients.map((i) => {
      // three ways to get an amount: a fixed amount per base unit, one adjustable box, or a mix of boxes
      const per = i.expr ? i.expr[0] + i.expr[1].reduce((s, [idx, k]) => s + (vs[idx] || 0) * k, 0) : (i.var ? (vs[i.vi || 0] || 0) * i.mult : i.per);
      return { name: i.name, q: Math.max(0, per * base), unit: i.unit, note: i.note, group: i.group || '', sugar: i.sugar, vol: i.vol };
    });
    let est = null;
    if (r.og) {
      let sugarKg = 0, addLitres = 0;
      rows.forEach((x) => { if (x.unit === 'g') { sugarKg += (x.q / 1000) * x.sugar; addLitres += (x.q / 1000) * x.vol; } });
      const litres = base + addLitres;
      const og = 1 + (sugarKg / litres) * 0.385;
      est = { og, fg: r.og.fg, abv: Math.max(0, (og - r.og.fg) * 131.25), litres };
    }
    return { rows, est };
  }

  /* ------------------------------------------------------------------ 2. CLOCK */
  /*
     Yeasts and bacteria roughly DOUBLE their speed for every ~9 C warmer. For steps marked temp_sensitive:
       minutes = default x 2 ^ ((reference temperature - your room) / 9),
     kept between 0.4x and 2.5x so a silly number cannot give a silly answer. Chilling, cooking and
     maturing steps are not adjusted. It is a rule of thumb: the "done when" cue is the real test.
  */
  const tempFactor = (room, ref) => Math.min(2.5, Math.max(0.4, Math.pow(2, (ref - room) / 9)));
  const stepMinutes = (s, room, ref) => (s.temp_sensitive ? Math.round(s.minutes * tempFactor(room, ref)) : s.minutes);

  /** Lay one batch's steps out on the clock. Returns events {start,end,name,...} in ms. */
  function timeline(b, index) {
    const r = recipeOf(b.recipe_key);
    const ev = [];
    let prevEnd = b.anchor;
    r.steps.forEach((s, i) => {
      const mins = stepMinutes(s, b.room_c, r.ref_temp_c);
      const start = i === 0 ? b.anchor : prevEnd;
      const end = start + mins * MIN;
      const hands = s.hands != null ? s.hands : mins <= 30;
      ev.push({ batch: index, label: b.label, name: s.name, start, end, mark: false, hands, how: s.how, done: s.done_when });
      // marks sit inside the step (for example "add nutrient on day 2"); they scale with the room temperature too
      s.marks.forEach(([at, text]) => {
        const when = start + Math.min(at * (s.temp_sensitive ? tempFactor(b.room_c, r.ref_temp_c) : 1), mins) * MIN;
        ev.push({ batch: index, label: b.label, name: text, start: when, end: when + 5 * MIN, mark: true, hands: true, how: '', done: '' });
      });
      prevEnd = end;
    });
    if (b.mode === 'finish' && ev.length) {                // "ready by": slide so the last step ends then
      const shift = b.anchor - Math.max(...ev.map((e) => e.end));
      ev.forEach((e) => { e.start += shift; e.end += shift; });
    }
    return ev;
  }
  const merged = () => plan.flatMap((b, i) => timeline(b, i)).sort((a, b) => a.start - b.start || Number(a.mark) - Number(b.mark));

  /** Hands-on moments from DIFFERENT batches starting within `win` minutes of each other. */
  function clashes(ev, win = 10) {
    const hands = ev.map((e, i) => i).filter((i) => ev[i].hands);
    const hit = new Set();
    hands.forEach((a, p) => {
      for (const b of hands.slice(p + 1)) {
        if (ev[b].start - ev[a].start > win * MIN) break;   // sorted, so nothing later can be close
        if (ev[a].batch !== ev[b].batch) { hit.add(a); hit.add(b); }
      }
    });
    return hit;
  }

  /* ------------------------------------------------------------------ 3. SCREEN */

  const num = (id, label, value, attrs = {}) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value, step: 'any', ...attrs }));
  const GROUPS = { drinks: 'Brewing and drinks', food: 'Fermented and preserved foods' };

  function bannerNote() {
    return h('p', { class: 'note' }, 'Work in progress: expect bugs. Not all of these tools are actively maintained. Times are estimates: fermentation follows temperature, not the clock. This is not medical, legal or food-safety advice: read the Safety tab, and if something looks, smells or tastes wrong, throw it out.');
  }
  /** A small label saying how well a recipe is backed up. */
  const badge = (r) => h('span', { class: 'meta' }, r.status === 'sourced' ? '[from a published recipe]' : '[starting point: not yet checked against a source]');

  /* ---- Plan tab: add a batch, see the list ---- */
  function planTab() {
    const first = DATA.recipes[0];
    const sel = h('select', { id: 'recipe', 'aria-label': 'Recipe' }, Object.entries(GROUPS).map(([g, title]) => h('optgroup', { label: title }, DATA.recipes.filter((r) => r.group === g).map((r) => h('option', { value: r.key }, r.name)))));
    const desc = h('p', { class: 'meta', id: 'desc' });
    const status = h('p', { class: 'meta', id: 'status' });
    const amount = num('amount', first.base_label, first.default_amount, { min: 0.1, step: 'any' });
    // up to three adjustable boxes (for example honey per litre, or cocoa %, milk %, extra cocoa butter %)
    const varBoxes = [0, 1, 2].map((i) => num('varval' + i, 'Adjust', 0, { step: 'any' }));
    const varHints = [0, 1, 2].map(() => h('span', { class: 'meta' }));
    const room = num('room', 'Room temperature (C)', 20, { min: 5, max: 35, step: 0.5, 'data-slider': '5,35,0.5' });
    const mode = h('label', { class: 'fld' }, 'Plan by', h('select', { id: 'mode' }, h('option', { value: 'start' }, 'Start at'), h('option', { value: 'finish' }, 'Ready by (finish time)')));
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(10, 0, 0, 0);
    const when = h('label', { class: 'fld' }, 'When', h('input', { id: 'when', type: 'datetime-local', value: toLocalInput(t.getTime()) }));

    const refresh = () => {
      const r = recipeOf(sel.value);
      desc.textContent = r.description;
      status.replaceChildren(badge(r), r.notes ? ' ' + r.notes : '');
      amount.firstChild.textContent = r.base_label;
      amount.querySelector('input').value = r.default_amount;
      amount.querySelector('input').step = r.amount_step;
      varBoxes.forEach((box, n) => {
        const x = varsOf(r)[n];
        box.hidden = !x; varHints[n].hidden = !x;
        if (x) { box.firstChild.textContent = x.label; const i = box.querySelector('input'); i.value = x.default; i.min = x.min; i.max = x.max; i.step = x.step; varHints[n].textContent = x.hint; }
      });
    };
    sel.addEventListener('change', refresh); refresh();

    const msg = h('p', { class: 'meta', role: 'status' });
    const add = () => {
      const r = recipeOf(sel.value);
      const v = (id) => Number(root.querySelector('#' + id).value);
      if (!(v('amount') > 0)) { msg.textContent = 'Enter an amount greater than 0.'; return; }
      const anchor = new Date(root.querySelector('#when').value).getTime();
      if (Number.isNaN(anchor)) { msg.textContent = 'Choose a date and time.'; return; }
      msg.textContent = '';
      plan.push({ recipe_key: r.key, label: r.name + ' (' + v('amount') + ' ' + r.base_unit + ')', amount: v('amount'), vars: varsOf(r).map((_, n) => v('varval' + n)), anchor, mode: root.querySelector('#mode').value, room_c: v('room') });
      save(); show('weigh');
    };

    const list = plan.length
      ? h('div', {}, h('h2', {}, 'Your plan (' + plan.length + ')'), h('ol', { class: 'plan' }, plan.map((b, i) => h('li', {},
        h('strong', {}, b.label), ' · ' + (b.mode === 'finish' ? 'ready by ' : 'start ') + dayName(b.anchor) + ' ' + hhmm(b.anchor) + ' · room ' + b.room_c + ' C ',
        h('button', { type: 'button', onclick: () => { plan.splice(i, 1); save(); show('plan'); } }, 'Remove')))),
        h('button', { type: 'button', onclick: () => { plan = []; save(); show('plan'); } }, 'Clear the plan'))
      : h('p', { class: 'meta' }, 'Nothing planned yet. Add one above, then open Ingredients and Timeline. Add several to see them on one timeline.');

    return h('div', {}, h('h2', {}, 'Add a batch'), h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Recipe', sel), desc, status, amount, varBoxes.flatMap((b, n) => [b, varHints[n]]), room, mode, when),
      h('p', {}, h('button', { type: 'button', onclick: add }, 'Add to plan'), ' ', msg), list);
  }

  /* ---- Ingredients tab: every amount for your batch ---- */
  function ingredientBlocks(r, c) {
    // keep the groups in the order they first appear; ungrouped ingredients come first under "Ingredients"
    const groups = [];
    c.rows.forEach((x) => { const g = x.group || 'Ingredients'; let blk = groups.find((q) => q[0] === g); if (!blk) { blk = [g, []]; groups.push(blk); } blk[1].push(x); });
    return groups.map(([title, rows]) => h('section', {}, h('h3', {}, title),
      h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, rows.map((x) => h('tr', {}, h('td', {}, x.name), h('td', { class: 'n' }, fmtQty(x.q, x.unit)), h('td', { class: 'meta' }, x.note))))))));
  }
  function estText(c) { return c.est ? 'Estimated original gravity ' + c.est.og.toFixed(3) + ', about ' + round1(c.est.abv) + ' % alcohol if it ferments out to ' + c.est.fg.toFixed(3) + '. A hydrometer is better than this estimate.' : ''; }
  function sheetText(b, c, r) {
    const out = [b.label, r.name + ' - ' + (r.status === 'sourced' ? 'from a published recipe' : 'starting point, not yet checked against a source'), ''];
    c.rows.forEach((x) => out.push('  ' + x.name.padEnd(54) + fmtQty(x.q, x.unit).padStart(12) + (x.note ? '   (' + x.note + ')' : '')));
    if (c.est) out.push('', estText(c));
    out.push('', 'METHOD');
    r.steps.forEach((s, i) => out.push((i + 1) + '. ' + s.name + ' (' + dur(stepMinutes(s, b.room_c, r.ref_temp_c)) + '): ' + s.how + (s.done_when ? ' Done when: ' + s.done_when : '')));
    if (r.safety.length) { out.push('', 'SAFETY'); r.safety.forEach((s) => out.push('- ' + s)); }
    if (r.notes) out.push('', 'NOTE: ' + r.notes);
    return out.join('\n') + '\n';
  }
  function weighTab() {
    if (!plan.length) return h('p', { class: 'meta' }, 'Add a batch on the Plan tab first.');
    return h('div', {}, plan.map((b) => {
      const r = recipeOf(b.recipe_key);
      const c = calculate(r, b);
      return h('article', { class: 'bake' }, h('h2', {}, b.label), h('p', { class: 'lede' }, r.description), h('p', {}, badge(r)),
        ingredientBlocks(r, c),
        c.est ? h('p', { class: 'lede' }, estText(c)) : null,
        h('h3', {}, 'Method'),
        h('ol', {}, r.steps.map((s) => h('li', {}, h('strong', {}, s.name), ' (' + dur(stepMinutes(s, b.room_c, r.ref_temp_c)) + '). ', s.how, s.done_when ? h('span', { class: 'meta block' }, 'Done when: ' + s.done_when) : null))),
        r.safety.length ? h('div', { class: 'note' }, h('strong', {}, 'Safety'), h('ul', {}, r.safety.map((s) => h('li', {}, s)))) : null,
        r.notes ? h('p', { class: 'meta' }, r.notes) : null,
        r.yield ? h('p', { class: 'meta' }, 'Yield: ' + r.yield) : null,
        h('p', {}, h('button', { type: 'button', onclick: () => saveFile(r.key + '-sheet.txt', sheetText(b, c, r), 'text/plain') }, 'Download TXT'), ' ', h('button', { type: 'button', onclick: () => window.print() }, 'Print')));
    }));
  }

  /* ---- Timeline tab: all batches on one sheet ---- */
  const csvQ = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  function timelineTab() {
    if (!plan.length) return h('p', { class: 'meta' }, 'Add a batch on the Plan tab first.');
    const ev = merged(), hit = clashes(ev);
    /** "Mon 16 Nov 10:00 - Mon 30 Nov 10:00" when a step runs past midnight, otherwise "10:00 - 10:30". */
    const span = (e) => (e.mark ? hhmm(e.start) : (dayShort(e.start) === dayShort(e.end) ? hhmm(e.start) + ' - ' + hhmm(e.end) : hhmm(e.start) + ' - ' + dayShort(e.end) + ' ' + hhmm(e.end)));
    const text = () => { let day = '', out = []; ev.forEach((e) => { const d = dayName(e.start); if (d !== day) { out.push('', d.toUpperCase(), '-'.repeat(d.length)); day = d; }
      out.push('  ' + span(e) + '  [' + e.label + ']  ' + e.name.trim() + (e.mark ? '' : '  (' + dur((e.end - e.start) / MIN) + ')'));
      if (e.how && !e.mark) out.push('                 how:  ' + e.how); if (e.done) out.push('                 done when: ' + e.done); }); return out.join('\n').trim() + '\n'; };
    const csv = () => 'day,start,end,minutes,batch,step,how,done_when\n' + ev.map((e) => [new Date(e.start).toISOString().slice(0, 10), hhmm(e.start), hhmm(e.end), (e.end - e.start) / MIN, csvQ(e.label), csvQ(e.name.trim()), csvQ(e.how), csvQ(e.done)].join(',')).join('\n') + '\n';
    let day = '';
    const rows = [];
    ev.forEach((e, i) => {
      const d = dayName(e.start);
      if (d !== day) { rows.push(h('h3', {}, d)); day = d; }
      rows.push(h('div', { class: 'ev' + (e.mark ? ' fold' : '') + (hit.has(i) ? ' clash' : '') },
        h('span', { class: 'time' }, span(e)), h('span', { class: 'what' }, h('strong', {}, e.name.trim()), ' ', h('span', { class: 'meta' }, '[' + e.label + ']' + (e.mark ? '' : ' ' + dur((e.end - e.start) / MIN))),
          e.how && !e.mark ? h('span', { class: 'meta block' }, e.how) : null, e.done ? h('span', { class: 'meta block' }, 'Done when: ' + e.done) : null, hit.has(i) ? h('span', { class: 'meta block' }, 'Another batch needs your hands within 10 minutes of this.') : null)));
    });
    return h('div', {}, h('p', { class: 'lede' }, ev.length + ' steps across ' + plan.length + (plan.length === 1 ? ' batch.' : ' batches. Steps that need your hands at nearly the same time as another batch are marked.')),
      h('p', {}, h('button', { type: 'button', onclick: () => saveFile('timeline.csv', csv(), 'text/csv') }, 'Download CSV'), ' ', h('button', { type: 'button', onclick: () => saveFile('timeline.txt', text(), 'text/plain') }, 'Download TXT'), ' ', h('button', { type: 'button', onclick: () => window.print() }, 'Print')),
      rows);
  }

  /* ---- Strength tab: gravity and alcohol ---- */
  /*
     Two small calculators. ABV = (OG - FG) x 131.25. And the reverse: how much sugar gives a target strength.
       sugar kg = (target % / 131.25) / 0.385 x litres         (assuming the yeast takes it to about 1.000)
     Honey is about 80 % sugar, so use 1.25 times as much honey as sugar.
  */
  function strengthTab() {
    const out = h('p', { class: 'lede', role: 'status', 'aria-live': 'polite' });
    const out2 = h('p', { class: 'lede', role: 'status', 'aria-live': 'polite' });
    const v = (id) => Number(root.querySelector('#' + id).value);
    const calc = () => {
      const abv = (v('og') - v('fg')) * 131.25;
      out.textContent = abv > 0 ? 'About ' + round1(abv) + ' % alcohol by volume.' : 'The original gravity must be higher than the final gravity.';
      const kg = (v('target') / 131.25 / 0.385) * v('litres');
      out2.textContent = v('target') > 0 && v('litres') > 0 ? 'About ' + Math.round(kg * 1000) + ' g of sugar, or ' + Math.round(kg * 1250) + ' g of honey, for ' + v('litres') + ' L at ' + v('target') + ' % (if the yeast ferments it out and can survive that strength).' : '';
    };
    const form = h('div', { class: 'form' }, num('og', 'Original gravity (before fermenting)', 1.09, { step: 0.001 }), num('fg', 'Final gravity (when finished)', 1.0, { step: 0.001 }));
    const form2 = h('div', { class: 'form' }, num('target', 'Target alcohol (%)', 12, { min: 1, max: 20, step: 0.5 }), num('litres', 'Finished volume (litres)', 4, { min: 0.5, step: 0.5 }));
    form.addEventListener('input', calc); form2.addEventListener('input', calc); setTimeout(calc, 0);
    return h('div', {}, h('p', { class: 'meta' }, 'Gravity is read with a hydrometer: it floats higher in sugary liquid. Take a reading before the yeast goes in, and another when fermentation has finished. This only applies to drinks that are meant to contain alcohol.'),
      h('h2', {}, 'Alcohol from gravity'), form, out, h('h2', {}, 'How much sugar for a target strength'), form2, out2,
      h('p', { class: 'meta' }, 'Wine and mead yeasts stop at their own limit, often 12-16 %; ale yeasts stop lower. The estimate does not know that. Never make a drink stronger than your yeast can handle.'));
  }

  /* ---- Cultures tab: starters that the recipes need ---- */
  function culturesTab() {
    const item = (title, body) => h('section', {}, h('h3', {}, title), h('p', { class: 'meta' }, body));
    return h('div', {}, h('p', { class: 'note' }, 'These are general, widely used home methods. They have not been tested here: treat them as starting points and read a trusted guide.'),
      item('Kombucha SCOBY', 'A SCOBY (a rubbery disc of bacteria and yeast) and some finished kombucha as starter liquid. Get them from a friend or a reputable supplier, or grow one from unflavoured raw kombucha in sweet tea. Starter liquid must test pH 4.0 or lower. Each batch makes a new layer: keep one SCOBY and some liquid for next time.'),
      item('Jun SCOBY', 'Jun uses its own culture, not a kombucha SCOBY. Keep it in jun (green tea and honey) and do not feed it plain sugar.'),
      item('Ginger bug (for ginger beer without added yeast)', 'In a jar, mix 2 tablespoons grated ginger and 2 tablespoons sugar with 250 ml water. Feed it 1 tablespoon each of ginger and sugar daily for 5-7 days, in a loosely covered jar. It is ready when it bubbles and smells sweetly of ginger. Use about 60-100 ml of the liquid per litre of drink. Wild starters vary: a bug that does not bubble after two weeks should be thrown away.'),
      item('Water kefir grains', 'Keep the grains in sugar water (about 1/4 cup sugar per quart) and change it every 24-48 hours. They multiply. Rest them in the fridge in sugar water for up to a week if you need a break.'),
      item('Milk kefir grains', 'Keep the grains in milk and change it every day. For a break, refrigerate them in fresh milk for up to a week or two. They are never "rinsed to death": rinsing is rarely needed.'),
      item('Sourdough starter', 'The Sourdough and Baking Timesheet has a seven-day starter guide on its Starter tab.'),
      item('Nuruk', 'The Korean fermentation starter used in rice wine. Buy it from a Korean grocer; strengths vary, so follow the packet.'));
  }

  /* ---- Safety tab ---- */
  function safetyTab() {
    const li = (...t) => h('li', {}, ...t);
    return h('div', {}, h('p', { class: 'note' }, 'This is general guidance, not a substitute for official advice. When in doubt, throw it out.'),
      h('h2', {}, 'Clean first'), h('ul', {}, li('Wash everything and sanitise whatever touches a drink after it has been heated or fermented. Keep hands clean.'), li('Use food-grade containers: glass, glazed crock or food-grade plastic. Never galvanised or unknown metal.')),
      h('h2', {}, 'Salt and acid are safety, not flavour'), h('ul', {}, li('Weigh salt, and do not reduce it below the published range (sauerkraut 1.5-2.5 %; full-sour pickles about 5 % brine).'), li('Keep vegetables submerged. Anything above the brine can grow mould.'), li('Finished ferments should be at pH 4.6 or lower (kombucha starter liquid 4.0 or lower). Cheap pH strips are enough.'), li('Throw away anything with fuzzy mould, slime or a rotten smell. Pink, black or green fuzz is not "just yeast".')),
      h('h2', {}, 'Fizzy bottles'), h('ul', {}, li('Gas builds in sealed bottles. Use bottles made for pressure and open them slowly, over a sink.'), li('Ginger beer: use PET plastic bottles only. A rock-hard bottle means it is time to chill it.'), li('Chilled bottles are much safer. A bottle that has been left warm for too long can burst.')),
      h('h2', {}, 'Alcohol'), h('ul', {}, li('Many of these drinks contain alcohol. Not for children, pregnancy, driving or anyone who avoids alcohol.'), li('Making beer, wine, mead and cider for your own use is legal in many places, including the UK, but selling it is not without a licence. Check the rules where you live.'), li('Distilling spirits at home is illegal in many places, including the UK, and dangerous. This tool does not cover it. Soju is a distilled spirit; the rice wine recipe here is the fermented drink it comes from.')),
      h('h2', {}, 'Honey, garlic and babies'), h('ul', {}, li('Never give honey to a baby under 12 months.'), li('Garlic in plain oil is a botulism risk: keep garlic in honey or acid, never in oil.'), li('Check the pH of fermented garlic honey after two weeks: under 4.6.')),
      h('h2', {}, 'Raw and unpasteurised'), h('ul', {}, li('Kombucha, kefir and raw ferments contain live cultures: not for people with weak immune systems unless a professional says it is fine.'), li('Cream for butter should be pasteurised.')),
      h('h2', {}, 'Jams, chutneys and preserves'), h('ul', {}, li('For shelf-stable jars, follow a tested recipe and its processing time for your altitude. The National Center for Home Food Preservation is a good reference.'), li('Do not cut the sugar, salt or vinegar in a preserve that is meant to keep. They are the preservative.')));
  }

  /* ---- Sources tab: where the numbers come from ---- */
  function sourcesTab() {
    const sourced = DATA.recipes.filter((r) => r.status === 'sourced');
    const start = DATA.recipes.filter((r) => r.status !== 'sourced');
    return h('div', {}, h('p', { class: 'lede' }, 'Recipes marked "from a published recipe" take their main figures from the pages below, scaled to your batch size. Recipes marked "starting point" are typical home practice and have not been checked against a source yet. Please read the original pages and, for books, buy them.'),
      h('h2', {}, 'Published pages used'),
      h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Source'), h('th', {}, 'What was taken from it'))),
        h('tbody', {}, DATA.sources.map((s) => h('tr', {}, h('td', {}, h('strong', {}, s.name), h('span', { class: 'meta block' }, s.origin), h('a', { href: s.url, rel: 'noopener noreferrer' }, 'link')), h('td', { class: 'meta' }, s.used)))))),
      h('h2', {}, 'Recipes checked against a source'), h('ul', {}, sourced.map((r) => h('li', {}, h('strong', {}, r.name), ' - ', r.sources.map((id) => (sourceOf(id) || {}).origin).filter(Boolean).join('; ')))),
      h('h2', {}, 'Starting points (not yet checked)'), h('ul', {}, start.map((r) => h('li', {}, h('strong', {}, r.name), r.notes ? ' - ' + r.notes : ''))),
      h('p', { class: 'meta' }, 'The recipe data, with its comments, is in build_data.py and data.json in the source repository.'));
  }

  /* ---- history: counts and charts of what you have made (see ../charts.js) ---- */
  function historyTab() {
    return PBEcharts.history({ storeKey: 'brewing-fermentation-history-v1', noun: 'batch', plural: 'batches', recipes: DATA.recipes.map((r) => ({ key: r.key, name: r.name, group: r.group })) });
  }

  /* ---- tabs and start-up ---- */
  const TABS = [['plan', 'Plan'], ['weigh', 'Ingredients'], ['timeline', 'Timeline'], ['strength', 'Strength'], ['cultures', 'Cultures'], ['safety', 'Safety'], ['history', 'History'], ['sources', 'Sources']];
  function show(t) {
    tab = t;
    const body = { plan: planTab, weigh: weighTab, timeline: timelineTab, strength: strengthTab, cultures: culturesTab, safety: safetyTab, history: historyTab, sources: sourcesTab }[t]();
    root.replaceChildren(
      bannerNote(),
      h('nav', { class: 'tabs', 'aria-label': 'Sections' }, TABS.map(([k, l]) => h('a', { href: '#' + k, 'aria-current': k === t ? 'page' : false, onclick: (e) => { e.preventDefault(); show(k); } }, l))),
      body);
  }

  fetch('data.json').then((r) => r.json()).then((d) => {
    DATA = d; plan = load(); show(plan.length ? 'weigh' : 'plan');
  }).catch(() => { root.replaceChildren(h('p', { class: 'lede' }, 'The recipe data could not be loaded. Try again in a minute.')); });
})();
