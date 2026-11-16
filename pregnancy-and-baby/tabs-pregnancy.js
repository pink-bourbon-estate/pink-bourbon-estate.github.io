/* tabs-pregnancy.js - "My pregnancy" (due date, week, trimester), "Fertile window" and "Appointments".

   Pregnancy is counted from the first day of your last period (LMP), so a 40-week pregnancy is 280 days from the LMP. If your cycle is
   longer or shorter than 28 days, ovulation (and so the due date) moves by the same number of days. Your dating scan at 11 to 14 weeks
   may give a different date: the NHS uses the scan date, so enter that here if you have one. */
window.PBtabsPregnancy = (() => {
  'use strict';
  const { h, fill } = PBE, ui = PBui, U = PBunits, D = PBdata;

  const dueFromLmp = (lmp, cycle) => ui.plusDays(lmp, 280 + cycle - 28);
  /** { days, weeks, extra, toGo } for a due date and a day (ISO). */
  function gestation(due, day) { const days = ui.daysBetween(ui.plusDays(due, -280), day); return { days, weeks: Math.floor(days / 7), extra: ((days % 7) + 7) % 7, toGo: ui.daysBetween(day, due) }; }
  const trimester = (w) => (w < 13 ? 'first' : w < 27 ? 'second' : 'third');
  const weekStart = (due, w) => ui.plusDays(due, w * 7 - 280);
  /** The saved "my details", with safe defaults. */
  const me = (ctx) => ({ due: '', first: 'yes', name: '', born: '', height: '', preKg: '', ...(ctx.get('me', {}) || {}) });

  /* ---------------------------------------------------------------- My pregnancy */
  function mePage(ctx) {
    const s = me(ctx), u = ui.units(ctx), save = () => ctx.set('me', s);
    const due = h('input', { type: 'date', value: s.due });
    due.addEventListener('change', () => { s.due = due.value; save(); ctx.rerender(); });
    const lmp = h('input', { type: 'date' }), cyc = ui.numberBox(1, 20, 45); cyc.value = 28;
    const calc = h('p', { class: 'meta' });
    const doCalc = () => { if (!lmp.value) { fill(calc, 'Enter the first day of your last period.'); return; } const d = dueFromLmp(lmp.value, Number(cyc.value) || 28); fill(calc, 'Estimated due date: ', h('strong', {}, ui.dateFmt(d)), ' ', h('button', { type: 'button', onclick: () => { s.due = d; save(); ctx.rerender(); } }, 'Use this date')); };
    lmp.addEventListener('change', doCalc); cyc.addEventListener('input', doCalc);
    const first = h('select', {}, [['yes', 'Yes, my first'], ['no', 'No, I have had a baby before']].map(([v, l]) => h('option', { value: v }, l))); first.value = s.first;
    first.addEventListener('change', () => { s.first = first.value; save(); ctx.rerender(); });
    const name = h('input', { type: 'text', value: s.name, placeholder: 'optional' }); name.addEventListener('change', () => { s.name = name.value.trim(); save(); });
    const born = h('input', { type: 'date', value: s.born }); born.addEventListener('change', () => { s.born = born.value; save(); ctx.rerender(); });
    const height = ui.numberBox(0.5, 0); height.value = s.height === '' ? '' : U.lengthShow(u, s.height);
    height.addEventListener('change', () => { const cm = U.lengthFrom(u, height.value); s.height = cm === null ? '' : Math.round(cm * 10) / 10; save(); });
    const pre = ui.weightInput(u, 'adult');
    const preBtn = h('button', { type: 'button', onclick: () => { const kg = pre.read(); if (kg !== null) { s.preKg = Math.round(kg * 100) / 100; save(); ctx.rerender(); } } }, 'Save');

    const out = [h('p', { class: 'meta' }, 'Everything here is worked out on your device from the dates you give. Your midwife\'s dates always come first: if your dating scan gave a different due date, enter the scan date.'),
      h('h2', {}, 'Your dates'), ui.unitBar(ctx),
      h('div', { class: 'form' }, ui.field('Due date', due), ui.field('Is this your first baby?', first), ui.field('Baby\'s name (optional)', name), ui.field('Baby\'s birth date (once born)', born), ui.field('Your height (' + U.lengthSuffix(u) + ')', height)),
      h('h3', {}, 'Work out a due date'), h('div', { class: 'form' }, ui.field('First day of your last period', lmp), ui.field('Usual cycle length (days)', cyc)), calc,
      h('h3', {}, 'Your weight before pregnancy'), pre.el, h('p', {}, preBtn, ' ', s.preKg ? h('span', { class: 'meta' }, 'Saved: ' + U.weightFmt(u, s.preKg)) : null)];

    if (s.due) {
      const g = gestation(s.due, ui.todayLocal()), w = g.weeks;
      out.push(h('h2', {}, 'Where you are'));
      if (s.born) out.push(ui.callout('Your baby was born on ' + ui.dateFmt(s.born) + '. See the Baby tabs. Congratulations!'));
      else if (g.days < 0) out.push(h('p', { class: 'lede' }, 'Your due date is more than 280 days away: check the date.'));
      else if (w > 44) out.push(h('p', { class: 'lede' }, 'That due date was a while ago: check the date, or add your baby\'s birth date above.'));
      else {
        const box = h('div', {}); out.push(box);
        PBEcharts.stat(box, [['Week', w + ' + ' + g.extra], ['Trimester', trimester(w)], [g.toGo >= 0 ? 'Days to go' : 'Days past due', Math.abs(g.toGo)], ['Baby is about the size of a', D.size(w)]]);
        out.push(ui.bar(Math.min(1, g.days / 280)), h('p', {}, h('strong', {}, 'This week: '), D.weekNote(w)));
        if (g.toGo >= 0) out.push(h('p', { class: 'meta' }, Math.floor(g.toGo / 7) + ' weeks and ' + (g.toGo % 7) + ' days until your due date, ' + ui.dateFmt(s.due) + '.'));
      }
      const KEY = [['Second trimester starts', 13], ['Mid-pregnancy scan window opens (scan is at 18 to 21 weeks)', 18], ['Third trimester starts', 27], ['Whooping cough vaccine: ideally by', 32], ['Full term from', 37], ['Due date', 40], ['Induction is offered', 41]];
      out.push(h('h3', {}, 'Key dates'), ui.table(['What', 'Pregnancy week', 'Date'], KEY.map(([t, wk]) => [t, wk, ui.dateFmt(weekStart(s.due, wk))])));
    } else out.push(h('p', { class: 'lede' }, 'Add your due date above to see your week, trimester and key dates.'));
    return h('div', {}, out);
  }

  /* ---------------------------------------------------------------- Fertile window */
  function fertilePage(ctx) {
    const lmp = h('input', { type: 'date' }), cyc = ui.numberBox(1, 20, 45); cyc.value = 28; const out = h('div', {});
    const draw = () => {
      if (!lmp.value) { fill(out, h('p', { class: 'meta' }, 'Enter the first day of your last period.')); return; }
      const c = Number(cyc.value) || 28, ov = ui.plusDays(lmp.value, c - 14);
      fill(out, ui.table(['', 'Date'], [['Estimated ovulation', ui.dateFmt(ov)], ['Fertile window starts (5 days before)', ui.dateFmt(ui.plusDays(ov, -5))], ['Fertile window ends (day after ovulation)', ui.dateFmt(ui.plusDays(ov, 1))], ['Due date if you conceive this cycle', ui.dateFmt(dueFromLmp(lmp.value, c))]]),
        h('p', { class: 'meta' }, 'A guide only: ovulation varies from cycle to cycle. The NHS advises that having sex every 2 to 3 days throughout the month gives the best chance, and that most couples conceive within a year. See your GP if you have been trying for a year (6 months if you are 36 or over).'));
    };
    lmp.addEventListener('change', draw); cyc.addEventListener('input', draw); draw();
    return h('div', {}, h('p', { class: 'meta' }, 'Ovulation usually happens about 14 days before your next period. The days just before and after are when you are most likely to conceive.'),
      h('div', { class: 'form' }, ui.field('First day of your last period', lmp), ui.field('Usual cycle length (days)', cyc)), out,
      ui.callout('Before you start trying: take 400 micrograms of folic acid every day (ideally from 3 months before) and 10 micrograms of vitamin D. See the "Before pregnancy" tab.'));
  }

  /* ---------------------------------------------------------------- Appointments */
  function apptsPage(ctx) {
    const s = { done: {}, dates: {}, custom: [], ...(ctx.get('appts', {}) || {}) }, m = me(ctx), save = () => ctx.set('appts', s), first = m.first !== 'no';
    const list = D.APPOINTMENTS.filter((a) => first || !a.first);
    const dateInput = (id, planned) => { const i = h('input', { type: 'date', value: s.dates[id] || '', 'aria-label': 'Date booked', onchange: (e) => { s.dates[id] = e.target.value; save(); ctx.rerender(); } }); return i; };
    const rows = list.map((a) => {
      const planned = m.due ? weekStart(m.due, a.week) : '', booked = s.dates[a.id] || '';
      const when = booked || planned, left = when ? ui.daysBetween(ui.todayLocal(), when) : null;
      return [h('div', {}, h('strong', {}, a.name), h('span', { class: 'meta block' }, a.what)),
        a.week + ' weeks', planned ? ui.dateFmt(planned) : 'add your due date', dateInput(a.id),
        left === null ? '' : s.done[a.id] ? 'done' : left < 0 ? 'passed' : left === 0 ? 'today' : 'in ' + ui.plural(left, 'day'),
        h('input', { type: 'checkbox', checked: !!s.done[a.id], 'aria-label': 'Done: ' + a.name, onchange: (e) => { s.done[a.id] = e.target.checked; save(); ctx.rerender(); } })];
    });
    const title = h('input', { type: 'text', placeholder: 'e.g. Extra scan, GP, dentist' }), date = h('input', { type: 'date' });
    const own = s.custom.slice().sort((a, b) => a.date.localeCompare(b.date));
    return h('div', {}, h('p', { class: 'meta' }, 'The NHS schedule for an uncomplicated pregnancy: about 10 appointments in a first pregnancy and 7 if you have had a baby before. "Planned" is the week when the visit usually happens, counted from your due date. Your midwife will give you the actual dates, so enter them in the date column. Extra visits may be offered if you need them.'),
      h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Appointment', 'Week', 'Usual date', 'Booked for', 'When', 'Done'].map((x) => h('th', {}, x)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))),
      h('h2', {}, 'Your own appointments'), h('div', { class: 'form' }, ui.field('What', title), ui.field('Date', date)),
      h('p', {}, h('button', { type: 'button', onclick: () => { if (!title.value.trim() || !date.value) return; s.custom.push({ title: title.value.trim(), date: date.value }); save(); ctx.rerender(); } }, 'Add')),
      own.length ? ui.table(['What', 'Date', 'When'], own.map((c) => [c.title, ui.dateFmt(c.date), (() => { const d = ui.daysBetween(ui.todayLocal(), c.date); return d < 0 ? 'passed' : d === 0 ? 'today' : 'in ' + ui.plural(d, 'day'); })()]), (i) => { s.custom.splice(s.custom.indexOf(own[i]), 1); save(); ctx.rerender(); }) : null,
      h('h2', {}, 'After the birth'), ui.table(['When', 'What'], D.AFTER_BIRTH));
  }

  return { mePage, fertilePage, apptsPage, me, gestation, trimester, weekStart, dueFromLmp };
})();
