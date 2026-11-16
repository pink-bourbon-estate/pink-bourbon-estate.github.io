/* Pregnancy and Baby - a private pregnancy and newborn tracker. Built on tracker.js, like the other tools here.

   The tabs are short descriptions; the pages that need their own code are in the other files in this folder:
     data.js            the schedules, lists and advice (NHS, NICE and UKHSA), with the source for each on the Sources tab
     units.js, ui.js    the unit switcher (everything is stored in metric) and small page helpers
     labour.js          the contraction maths: practice or labour, and the estimated birth window (plain functions)
     tabs-*.js          the tabs that draw their own pages
   This tool records and explains. It does not diagnose anything, and it never replaces your midwife, GP or health visitor. */
(() => {
  'use strict';
  const D = PBdata, P = PBtabsPregnancy, B = PBtabsBody, Lb = PBtabsLabour, Ba = PBtabsBaby, ui = PBui, U = PBunits;
  const custom = (id, label, render) => ({ id, label, type: 'custom', render });

  /** Made-up example data, labelled as such on the Example Data tab: a pregnancy about 28 weeks along, a few days of baby log, and a labour pattern. */
  const example = ({ daysAgo, rnd, addDays, today }) => {
    const [lab] = PBlabour.examples(), snap = lab.contractions.filter((c) => c.end <= 7.5 * PBlabour.HOUR);
    const labShift = Date.now() - snap[snap.length - 1].end - 2 * 60000;            // move the made-up labour so it ends two minutes ago
    const events = []; for (let d = 0; d < 4; d++) for (let k = 0; k < 9; k++) events.push({ t: Date.now() - d * 86400000 - k * 9300000 - 600000, kind: k % 3 === 2 ? 'bottle' : 'feed-' + (k % 2 ? 'l' : 'r'), ...(k % 3 === 2 ? { ml: 90 } : { mins: 15 }) });
    for (let d = 0; d < 4; d++) for (let k = 0; k < 6; k++) events.push({ t: Date.now() - d * 86400000 - k * 12600000 - 1200000, kind: k % 3 === 0 ? 'both' : k % 3 === 1 ? 'wet' : 'dirty' });
    events.push({ t: Date.now() - 3600000, kind: 'temp', c: 36.8 }, { t: Date.now() - 80000000, kind: 'vitd' });
    return { _raw: {
      me: { due: addDays(today(), 84), first: 'yes', name: '', born: '', height: 168, preKg: 63.5 },
      appts: { done: { a08: true, a12: true, a16: true, a20: true }, dates: { a28: addDays(today(), 6) }, custom: [{ title: 'Antenatal class', date: addDays(today(), 20) }] },
      body: { weights: Array.from({ length: 12 }, (_, i) => ({ date: addDays(today(), -(11 - i) * 14), kg: Math.round((63.5 + i * 0.9 + rnd() * 0.5) * 100) / 100, notes: '' })),
        bps: Array.from({ length: 10 }, (_, i) => ({ date: addDays(today(), -(9 - i) * 7), time: '09:00', sys: Math.round(112 + rnd() * 10), dia: Math.round(68 + rnd() * 8), pulse: Math.round(72 + rnd() * 10) })),
        glucose: Array.from({ length: 8 }, (_, i) => ({ date: addDays(today(), -(7 - i) * 2), time: i % 2 ? '10:00' : '07:30', mmol: Math.round((i % 2 ? 6.4 + rnd() * 1.3 : 4.6 + rnd() * 0.8) * 10) / 10, when: i % 2 ? '1 hour after a meal' : 'Fasting' })) },
      moves: { first: addDays(today(), -80), log: [{ date: addDays(today(), -2), time: '21:30', feel: 'Moving as usual', notes: 'busy after dinner' }, { date: addDays(today(), -1), time: '08:15', feel: 'Moving as usual', notes: '' }, { date: today(), time: '14:00', feel: 'Moving as usual', notes: '' }, { date: addDays(today(), -3), time: '22:00', feel: 'Moving as usual', notes: '' }, { date: addDays(today(), -4), time: '07:45', feel: 'Moving as usual', notes: '' }, { date: addDays(today(), -5), time: '19:00', feel: 'Moving as usual', notes: '' }] },
      labour: { list: snap.map((c) => ({ start: c.start + labShift, end: c.end + labShift })), running: null },
      baby: { events },
      growth: { rows: [{ date: addDays(today(), -42), kg: 3.4, cm: 51, head: 35 }, { date: addDays(today(), -28), kg: 3.9, cm: 53, head: 36.2 }, { date: addDays(today(), -14), kg: 4.4, cm: 55, head: 37.4 }] },
      vaccines: { given: { m_pert: addDays(today(), -30) } },
    } };
  };

  /** The Dashboard's own summary block (the rest of the dashboard is built from the tabs). */
  const dashboardExtra = (ctx) => {
    const m = P.me(ctx), box = PBE.h('div', {}), age = m.born ? ui.daysBetween(m.born, ui.todayLocal()) : null, today = ui.todayLocal(), lines = [];
    if (m.due && !m.born) { const g = P.gestation(m.due, today); if (g.days >= 0 && g.weeks <= 44) lines.push(['Week', g.weeks + ' + ' + g.extra], ['Days to go', g.toGo]); }
    if (age !== null) lines.push(['Baby is', age < 14 ? ui.plural(age, 'day') : age < 70 ? Math.floor(age / 7) + ' weeks' : Math.floor(age / 30.44) + ' months']);
    const a = ctx.get('appts', {}) || {}, next = D.APPOINTMENTS.filter((x) => (m.first !== 'no' || !x.first) && !(a.done || {})[x.id]).map((x) => ({ x, d: (a.dates || {})[x.id] || (m.due ? P.weekStart(m.due, x.week) : '') })).filter((y) => y.d && ui.daysBetween(today, y.d) >= 0).sort((p, q) => p.d.localeCompare(q.d))[0];
    if (!lines.length && !next) return null;
    if (lines.length) PBEcharts.stat(box, lines);
    if (next) box.append(PBE.h('p', { class: 'meta' }, 'Next appointment: ' + next.x.name + ', ' + ui.dateFmt(next.d) + '.'));
    return PBE.h('div', {}, PBE.h('h2', {}, 'Right now'), box);
  };

  PBE.tool({
    id: 'pregnancy-and-baby',
    title: 'Pregnancy and Baby',
    example,
    dashboardExtra,
    notice: 'Not medical advice. This records what you enter and shows NHS, NICE and UKHSA guidance for the UK. Work in progress: expect bugs. Always follow your midwife, GP and health visitor. If you are worried about you or your baby, call your midwife or maternity unit, 111, or 999 in an emergency. Your data stays in this browser.',
    tabs: [
      custom('me', 'My pregnancy', P.mePage),
      { id: 'pre', label: 'Before pregnancy', type: 'list', intro: 'Things the NHS suggests when you are planning a baby. Tick them off as you go.', items: D.PRECONCEPTION },
      custom('fertile', 'Fertile window', P.fertilePage),
      custom('appts', 'Appointments', P.apptsPage),
      { id: 'food', label: 'Food and nutrition', type: 'static', blocks: [
        { h: 'Eating well in pregnancy', p: 'You do not need to "eat for two". The NHS says you do not need extra calories in the first 6 months, and about 200 extra calories a day in the last 3 months. A varied diet with the supplements below is the aim.', lede: true },
        { h3: 'The nutrients that matter most', table: [['Nutrient', 'What the NHS says', 'Where it comes from'], ...D.NUTRIENTS] },
        { h3: 'Foods to avoid or limit', list: D.AVOID },
        { h3: 'Staying safe in the kitchen', list: ['Wash your hands, and wash fruit, vegetables and salad.', 'Wash your hands, work surfaces and boards after touching raw meat, and keep it away from other food.', 'Cook meat until steaming hot with no pink inside, and reheat food until steaming hot all the way through.', 'To avoid toxoplasmosis, wear gloves for gardening and ask someone else to change cat litter.'] },
        { note: 'Feeling sick all day or being unable to keep food down (hyperemesis) is not "just morning sickness". Ask your midwife or GP for help.' }] },
      { id: 'daily', label: 'Daily checklist', type: 'checks', word: 'Habit', intro: 'Tick off the daily basics. Open "Grid" to see a month at a glance.', items: D.DAILY.map((name, i) => ({ id: 'd' + i, name, every: 'daily' })) },
      custom('body', 'Weight, BP, glucose', B.bodyPage),
      custom('moves', 'Baby movements', B.movesPage),
      custom('labour', 'Labour', Lb.labourPage),
      { id: 'bag', label: 'Hospital bag', type: 'list', intro: 'Aim to have your bag packed by 36 weeks. Ask your maternity unit if they have a list of their own.', items: D.HOSPITAL_BAG },
      { id: 'prepare', label: 'To prepare', type: 'list', intro: 'What to do, and roughly when.', items: D.PREPARE },
      { id: 'buy', label: 'To buy', type: 'list', intro: 'Safety first: buy a new, firm, flat mattress for the cot and a car seat that fits your car. Second-hand is fine for most other things.', items: D.TO_BUY },
      custom('vaccines', 'Vaccines', Ba.vaccinesPage),
      custom('baby', 'Baby log', Ba.babyPage),
      custom('growth', 'Growth', Ba.growthPage),
      custom('miles', 'Development', Ba.milestonesPage),
      { id: 'help', label: 'When to get help', type: 'static', blocks: [
        { h: 'In pregnancy', note: 'Phone your midwife or maternity unit straight away, day or night, if you notice any of these. Call 999 if it is an emergency.' },
        { list: D.WARNINGS },
        { h3: 'Signs of labour', list: ['A "show" (a sticky jelly-like mucus, sometimes streaked with blood).', 'Backache and period-like cramps.', 'Regular, strengthening contractions.', 'Your waters breaking (a trickle or a gush). Note the colour and phone your maternity unit.'] },
        { h3: 'For a newborn: call 111, your GP or 999', list: ['A high temperature (38 °C or higher under 3 months), or a very low one.', 'Fewer wet nappies, or not feeding well.', 'Breathing fast, grunting or noisily, or skin pulling in under the ribs.', 'Floppy, hard to wake, or a high-pitched cry that is not like their usual cry.', 'A rash that does not fade when you press a glass on it, or a yellow tinge to the skin in the first days that is getting worse.', 'Call 999 if your baby is struggling to breathe, is blue or pale, or is unresponsive.'] },
        { h3: 'For you after the birth', list: ['Heavy bleeding, or passing large clots.', 'A fever, or a tender, red, swollen leg or breast.', 'Feeling low, anxious or unable to cope for more than 2 weeks: tell your midwife, health visitor or GP. Help is available and you are not alone. In a crisis call 111 (mental health option) or Samaritans on 116 123.'] }] },
    ],
  });
})();
