/* tabs-baby.js - "Vaccines", "Baby log", "Growth" and "Development".

   Vaccine dates follow the NHS and UKHSA routine schedule in England (other UK nations differ slightly: ask your GP surgery).
   The baby log records feeds, sleep, nappies, vitamin D and temperature. The temperature alerts follow NHS advice for babies under
   3 months (38 °C or higher) and 3 to 6 months (39 °C or higher). Milestones are the US CDC checklists, which the NHS also points to. */
window.PBtabsBaby = (() => {
  'use strict';
  const { h } = PBE, ui = PBui, U = PBunits, D = PBdata, round = PBE.round, P = PBtabsPregnancy;
  const ageDays = (ctx) => { const m = P.me(ctx); return m.born ? ui.daysBetween(m.born, ui.todayLocal()) : null; };
  const ageText = (d) => (d < 14 ? ui.plural(d, 'day') : d < 70 ? Math.floor(d / 7) + ' weeks' : d < 730 ? Math.floor(d / 30.44) + ' months' : Math.floor(d / 365.25) + ' years');

  /* ---------------------------------------------------------------- Vaccines */
  function vaccinesPage(ctx) {
    const s = { given: {}, ...(ctx.get('vaccines', {}) || {}) }, save = () => ctx.set('vaccines', s), m = P.me(ctx), today = ui.todayLocal();
    const givenBox = (id) => h('input', { type: 'date', value: s.given[id] || '', 'aria-label': 'Date given', onchange: (e) => { s.given[id] = e.target.value; save(); ctx.rerender(); } });
    const status = (id, due) => { if (s.given[id]) return 'given'; if (!due) return ''; const d = ui.daysBetween(today, due); return d < 0 ? 'due now or overdue: contact your GP surgery' : d === 0 ? 'due today' : 'due in ' + ui.plural(d, 'day'); };
    const mum = D.MUM_VACCINES.map((v) => {
      const from = m.due && v.from ? P.weekStart(m.due, v.from) : '', by = m.due && v.by ? P.weekStart(m.due, v.by) : '';
      return [h('div', {}, h('strong', {}, v.name), h('span', { class: 'meta block' }, v.when)), from ? 'from ' + ui.dateFmt(from) + (by ? ', ideally by ' + ui.dateFmt(by) : '') : v.from ? 'from ' + v.from + ' weeks' : 'any time', givenBox(v.id), s.given[v.id] ? 'given' : ''];
    });
    // the baby schedule counts from the birth date, or from the due date until the baby is born
    const base = m.born || m.due, est = !m.born && m.due;
    const baby = D.BABY_DOSES.map((v) => { const due = base ? ui.plusDays(base, v.days) : ''; return [h('div', {}, h('strong', {}, v.age), h('span', { class: 'meta block' }, v.what)), due ? (est ? 'about ' : '') + ui.dateFmt(due) : 'add your due or birth date', givenBox(v.id), status(v.id, due)]; });
    return h('div', {}, h('p', { class: 'meta' }, 'NHS routine vaccines. Your GP surgery or maternity service books them, and your midwife or health visitor can tell you what is due. Record the date each one is given (your baby\'s red book is the official record).'),
      h('h2', {}, 'In pregnancy'), ui.table(['Vaccine', 'When', 'Date given', ''], mum),
      h('h2', {}, 'For your baby'), est ? h('p', { class: 'meta' }, 'Dates are estimated from your due date until you add the birth date on the "My pregnancy" tab. The schedule is the one in England for babies born on or after 1 July 2024.') : null,
      ui.table(['Age and vaccines', 'Due', 'Date given', 'Status'], baby), h('ul', {}, D.BABY_VACCINE_NOTES.map((n) => h('li', { class: 'meta' }, n))),
      ui.callout('Vaccines are safe and are the best protection for your baby. Side effects are usually mild. Call 111 or your GP if your baby is unwell after a vaccine, or 999 in an emergency.'));
  }

  /* ---------------------------------------------------------------- Baby log */
  const KINDS = [['feed-l', 'Breastfeed (left)'], ['feed-r', 'Breastfeed (right)'], ['bottle', 'Bottle feed'], ['solids', 'Solids'], ['sleep', 'Sleep'], ['wet', 'Wet nappy'], ['dirty', 'Dirty nappy'], ['both', 'Wet and dirty nappy'], ['vitd', 'Vitamin D drops'], ['temp', 'Temperature'], ['note', 'Note']];
  const kindName = (k) => (KINDS.find((x) => x[0] === k) || [0, k])[1];
  const isFeed = (k) => ['feed-l', 'feed-r', 'bottle', 'solids'].includes(k), isWet = (k) => k === 'wet' || k === 'both', isDirty = (k) => k === 'dirty' || k === 'both';
  const localInput = (ms) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };

  function babyPage(ctx) {
    const s = { events: [], ...(ctx.get('baby', {}) || {}) }, save = () => ctx.set('baby', s), u = ui.units(ctx), age = ageDays(ctx), now = Date.now(), name = P.me(ctx).name || 'your baby';
    const add = (ev) => { s.events.push(ev); save(); ctx.rerender(); };
    const quick = (k) => h('button', { type: 'button', onclick: () => add({ t: Date.now(), kind: k }) }, kindName(k) + ' now');
    const when = h('input', { type: 'datetime-local', value: localInput(now) }), kind = h('select', {}, KINDS.map(([v, l]) => h('option', { value: v }, l))), amount = ui.numberBox('any', 0), note = h('input', { type: 'text' });
    const amountField = ui.field('Amount', amount);
    const sync = () => { const k = kind.value; amountField.firstChild.textContent = k === 'bottle' ? 'Volume (' + U.volumeSuffix(u) + ')' : k === 'temp' ? 'Temperature (' + U.tempSuffix(u) + ')' : k === 'sleep' || k.startsWith('feed-') ? 'Minutes' : 'Amount (optional)'; };
    kind.addEventListener('change', sync); sync();
    const out = [h('p', { class: 'meta' }, 'A private log of feeds, sleep, nappies, vitamin D and temperature, to show your midwife or health visitor. There is no "right" number of feeds or hours of sleep: newborns feed on demand, often 8 to 12 times in 24 hours.'),
      ui.unitBar(ctx), h('h2', {}, 'Quick add'), h('p', {}, [quick('wet'), ' ', quick('dirty'), ' ', quick('both'), ' ', quick('vitd')]),
      h('h2', {}, 'Add an entry'), h('div', { class: 'form' }, ui.field('When', when), ui.field('What', kind), amountField, ui.field('Notes', note)),
      h('p', {}, h('button', { type: 'button', onclick: () => {
        const k = kind.value, v = ui.num(amount.value), ev = { t: new Date(when.value).getTime() || Date.now(), kind: k, notes: note.value.trim() };
        if (k === 'bottle' && v !== null) ev.ml = round(U.volumeFrom(u, v), 0); else if (k === 'temp' && v !== null) ev.c = round(U.tempFrom(u, v), 1); else if (v !== null) ev.mins = v;
        add(ev); } }, 'Add'))];
    const ev = s.events, last24 = ev.filter((e) => now - e.t < 86400000), sleepMin = last24.filter((e) => e.kind === 'sleep').reduce((a, e) => a + (e.mins || 0), 0);
    const day = PBEcharts.stat; const box = h('div', {}); day(box, [['Feeds in 24 h', last24.filter((e) => isFeed(e.kind)).length], ['Wet nappies', last24.filter((e) => isWet(e.kind)).length], ['Dirty nappies', last24.filter((e) => isDirty(e.kind)).length], ['Sleep logged', Math.floor(sleepMin / 60) + ' h ' + (sleepMin % 60) + ' min']]);
    out.push(h('h2', {}, 'Last 24 hours'), box);
    if (age !== null && age >= 5 && last24.length && last24.filter((e) => isWet(e.kind)).length < 6) out.push(h('p', { class: 'meta' }, 'The NHS says that from about day 5 a baby usually has at least 6 heavy wet nappies in 24 hours. If you are logging every one and there are fewer, or the wee is dark or strong-smelling, talk to your midwife, health visitor or GP.'));
    const t = ev.filter((e) => e.kind === 'temp').sort((a, b) => b.t - a.t)[0];
    if (t) {
      if (age !== null && ((age < 91 && t.c >= 38) || (age < 183 && t.c >= 39))) out.push(ui.callout('The last temperature, ' + U.tempFmt(u, t.c) + ', is high for a baby of ' + ageText(age) + '. The NHS says to call 111 or your GP now (' + (age < 91 ? '38 °C or higher under 3 months' : '39 °C or higher at 3 to 6 months') + '). Call 999 if your baby is floppy, hard to wake, or has a rash that does not fade under a glass.', true));
      else if (t.c < 36) out.push(ui.callout('The last temperature, ' + U.tempFmt(u, t.c) + ', is low. Check your thermometer and the room, and call 111 or your midwife or health visitor if your baby stays cold or is drowsy or feeding poorly.', true));
    }
    // seven-day bars: feeds and wet nappies per day
    const days = Array.from({ length: 7 }, (_, i) => ui.localDateOf(now - (6 - i) * 86400000)), per = (f) => days.map((d) => ({ label: d, value: ev.filter((e) => ui.localDateOf(e.t) === d && f(e.kind)).length }));
    if (ev.length) { const c1 = h('div', { class: 'chart' }), c2 = h('div', { class: 'chart' }); PBEcharts.bar(c1, per(isFeed), { unit: 'feeds' }); PBEcharts.bar(c2, per(isWet), { unit: 'wet nappies' }); out.push(h('h3', {}, 'Feeds per day, last 7 days'), c1, h('h3', {}, 'Wet nappies per day'), c2); }
    const describe = (e) => kindName(e.kind) + (e.ml ? ': ' + U.volumeFmt(u, e.ml) : e.c ? ': ' + U.tempFmt(u, e.c) : e.mins ? ': ' + e.mins + ' min' : '');
    const rows = ev.map((e, i) => [e, i]).sort((a, b) => b[0].t - a[0].t).slice(0, 80);
    out.push(h('h2', {}, 'Entries'), rows.length ? ui.table(['When', 'What', 'Notes'], rows.map(([e]) => [ui.dayTimeFmt(e.t), describe(e), e.notes || '']), (i) => { s.events.splice(rows[i][1], 1); save(); ctx.rerender(); }) : h('p', { class: 'meta' }, 'Nothing recorded for ' + name + ' yet.'),
      h('p', {}, h('button', { type: 'button', onclick: () => ctx.saveFile('baby-log.csv', 'time,what,volume_ml,temperature_c,minutes,notes\n' + ev.slice().sort((a, b) => a.t - b.t).map((e) => [new Date(e.t).toISOString(), kindName(e.kind), e.ml || '', e.c || '', e.mins || '', '"' + (e.notes || '').replace(/"/g, '""') + '"'].join(',')).join('\n') + '\n', 'text/csv') }, 'Download as CSV')));
    out.push(h('h3', {}, 'Vitamin D'), h('p', { class: 'meta' }, 'NICE and the NHS advise 8.5 to 10 micrograms of vitamin D a day for breastfed babies from birth. Babies having more than 500 ml of infant formula a day do not need drops, because formula already contains it.'));
    return h('div', {}, out);
  }

  /* ---------------------------------------------------------------- Growth */
  function growthPage(ctx) {
    const s = { rows: [], ...(ctx.get('growth', {}) || {}) }, save = () => ctx.set('growth', s), u = ui.units(ctx), m = P.me(ctx);
    const date = h('input', { type: 'date', value: ui.todayLocal() }), w = ui.weightInput(u, 'baby'), len = ui.numberBox('any', 0), head = ui.numberBox('any', 0), sfx = U.lengthSuffix(u);
    const rows = s.rows.slice().sort((a, b) => a.date.localeCompare(b.date));
    const out = [h('p', { class: 'meta' }, 'Record your baby\'s weight, length and head size. In the UK your health visitor plots these on the UK-WHO growth chart in the red book. It is the pattern over time that matters, not one number, and babies often lose a little weight in the first days and regain it by about 2 weeks. Talk to your health visitor if you are worried.'), ui.unitBar(ctx),
      h('div', { class: 'form' }, ui.field('Date', date), ui.field('Length (' + sfx + ')', len), ui.field('Head circumference (' + sfx + ')', head)), w.el,
      h('p', {}, h('button', { type: 'button', onclick: () => { const kg = w.read(), L = U.lengthFrom(u, len.value), H = U.lengthFrom(u, head.value); if (kg === null && L === null && H === null) return; s.rows.push({ date: date.value, kg: kg === null ? '' : round(kg, 3), cm: L === null ? '' : round(L, 1), head: H === null ? '' : round(H, 1) }); save(); ctx.rerender(); } }, 'Add'))];
    if (rows.length) {
      const wr = rows.filter((r) => r.kg !== ''), c1 = h('div', { class: 'chart' }), c2 = h('div', { class: 'chart' }), c3 = h('div', { class: 'chart' });
      if (wr.length) PBEcharts.stat(c1, [['Latest weight', U.babyWeightFmt(u, wr[wr.length - 1].kg)], ['Entries', rows.length]]);
      PBEcharts.line(c1, wr.map((r) => ({ x: r.date, y: u.weight === 'kg' ? r.kg : round(r.kg * 2.2046226, 2) })), { unit: u.weight === 'kg' ? 'kg' : 'lb' });
      PBEcharts.line(c2, rows.filter((r) => r.cm !== '').map((r) => ({ x: r.date, y: Number(U.lengthShow(u, r.cm)) })), { unit: sfx });
      PBEcharts.line(c3, rows.filter((r) => r.head !== '').map((r) => ({ x: r.date, y: Number(U.lengthShow(u, r.head)) })), { unit: sfx });
      out.push(h('h3', {}, 'Weight'), c1, h('h3', {}, 'Length'), c2, h('h3', {}, 'Head circumference'), c3,
        ui.table(['Date', 'Weight', 'Length', 'Head'], rows.map((r) => [r.date, r.kg === '' ? '' : U.babyWeightFmt(u, r.kg), U.lengthFmt(u, r.cm), U.lengthFmt(u, r.head)]), (i) => { s.rows.splice(s.rows.indexOf(rows[i]), 1); save(); ctx.rerender(); }));
    }
    out.push(ui.callout('Call your health visitor or GP if your baby is not feeding well, has fewer wet nappies than usual, or seems very sleepy, or if you are worried about weight. Tell them if your baby has lost more than a tenth of their birth weight.'));
    return h('div', {}, out);
  }

  /* ---------------------------------------------------------------- Development */
  function milestonesPage(ctx) {
    const s = { ticked: {}, ...(ctx.get('miles', {}) || {}) }, save = () => ctx.set('miles', s), age = ageDays(ctx), months = age === null ? null : age / 30.44;
    const current = months === null ? -1 : D.MILESTONES.reduce((best, [mo], i) => (mo <= months + 0.5 ? i : best), -1);
    const label = (mo) => (mo < 24 ? mo + ' months' : mo % 12 === 0 ? mo / 12 + ' years' : Math.floor(mo / 12) + ' years ' + (mo % 12) + ' months');
    return h('div', {}, h('p', { class: 'meta' }, 'Milestones are the things most children can do by a given age. They are a guide, not a test: children develop at their own pace, and babies born early may reach them later. The checklists below are the US CDC\'s "Learn the Signs. Act Early" lists, shortened; the NHS recommends talking to your health visitor or GP if you are worried, and your child gets health visitor reviews at 9 to 12 months and 2 to 2½ years.'),
      months === null ? h('p', { class: 'meta' }, 'Add your baby\'s birth date on the "My pregnancy" tab to open the right age automatically.') : h('p', { class: 'lede' }, 'Your baby is ' + ageText(age) + ' old.'),
      D.MILESTONES.map(([mo, items], i) => h('details', { open: i === current ? true : false }, h('summary', {}, h('strong', {}, 'By ' + label(mo)), ' ', h('span', { class: 'meta' }, items.filter((_, k) => s.ticked[mo + '-' + k]).length + ' of ' + items.length + ' ticked')),
        h('ul', { class: 'checklist' }, items.map(([area, text], k) => h('li', {}, h('label', {}, h('input', { type: 'checkbox', checked: !!s.ticked[mo + '-' + k], onchange: (e) => { s.ticked[mo + '-' + k] = e.target.checked; save(); } }), ' ', text, h('span', { class: 'meta block' }, area)))))) ),
      ui.callout('Talk to your health visitor or GP if your baby has lost skills they once had, or if you are worried about how they move, hear, see, talk or play with others. You know your child best, and you do not need to wait for a review.'));
  }
  return { vaccinesPage, babyPage, growthPage, milestonesPage };
})();
