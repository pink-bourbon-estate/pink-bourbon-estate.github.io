/* tabs-body.js - "Weight, BP and glucose" and "Baby movements".

   Weight, blood pressure and blood glucose are records for you and your midwife. The NHS gives no target for weight gain in pregnancy,
   so none is set here (the US Institute of Medicine ranges are shown, labelled, for reference only). The blood pressure alerts follow
   NHS and NICE advice on pre-eclampsia. Baby movements follow NHS advice: do NOT count kicks or use a target number; get to know your
   own baby's pattern, and phone straight away if it changes. */
window.PBtabsBody = (() => {
  'use strict';
  const { h, fill } = PBE, ui = PBui, U = PBunits, D = PBdata, round = PBE.round;
  const sortedDesc = (rows) => rows.map((r, i) => [r, i]).sort((a, b) => (b[0].date + (b[0].time || '')).localeCompare(a[0].date + (a[0].time || '')));
  const byDate = (rows) => rows.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  function bodyPage(ctx) {
    const u = ui.units(ctx), s = { weights: [], bps: [], glucose: [], ...(ctx.get('body', {}) || {}) }, save = () => ctx.set('body', s), m = PBtabsPregnancy.me(ctx), today = ui.todayLocal();
    const out = [h('p', { class: 'meta' }, 'Records for you and your midwife. They are saved only in this browser. Take them to your appointments.'), ui.unitBar(ctx)];

    /* ---- weight ---- */
    const wDate = h('input', { type: 'date', value: today }), wIn = ui.weightInput(u, 'adult'), wNote = h('input', { type: 'text' });
    const wChart = h('div', { class: 'chart' }), ws = byDate(s.weights), latest = ws[ws.length - 1];
    out.push(h('h2', {}, 'Weight'), h('div', { class: 'form' }, ui.field('Date', wDate), ui.field('Notes', wNote)), wIn.el,
      h('p', {}, h('button', { type: 'button', onclick: () => { const kg = wIn.read(); if (kg === null) return; s.weights.push({ date: wDate.value, kg: round(kg, 2), notes: wNote.value.trim() }); save(); ctx.rerender(); } }, 'Add weight')));
    if (latest) {
      const base = m.preKg || ws[0].kg, stats = [['Latest', U.weightFmt(u, latest.kg)], [m.preKg ? 'Change since before pregnancy' : 'Change since first entry', U.weightChange(u, latest.kg - base)]];
      if (m.preKg && m.height) { const bmi = m.preKg / ((m.height / 100) ** 2); stats.push(['Pre-pregnancy BMI', round(bmi)]); }
      PBEcharts.stat(wChart, stats);
      PBEcharts.line(wChart, ws.map((r) => ({ x: r.date, y: u.weight === 'kg' ? r.kg : round(r.kg * 2.2046226) })), { unit: u.weight === 'kg' ? 'kg' : 'lb', empty: 'Add two weights to see a chart.' });
      out.push(wChart, ui.table(['Date', 'Weight', 'Notes'], sortedDesc(s.weights).slice(0, 60).map(([r]) => [r.date, U.weightFmt(u, r.kg), r.notes || '']), (i) => { s.weights.splice(sortedDesc(s.weights)[i][1], 1); save(); ctx.rerender(); }));
    }
    const ref = m.preKg && m.height ? D.iom(m.preKg / ((m.height / 100) ** 2)) : null;
    out.push(h('details', {}, h('summary', {}, 'About weight gain in pregnancy'), h('p', { class: 'meta' }, 'The NHS does not set a target for how much weight to gain, and does not advise weighing yourself at every appointment: weight is checked at booking and your midwife will discuss it if there is a concern. Gain varies a lot and is not a measure of how well you are doing. Do not diet to lose weight in pregnancy. If you are worried, talk to your midwife.'),
      ref ? h('p', { class: 'meta' }, 'For reference only (US Institute of Medicine, not NHS): for ' + ref[0] + ' before pregnancy, the usual total gain with one baby is about ' + (u.weight === 'kg' ? ref[1] + ' to ' + ref[2] + ' kg' : round(ref[1] * 2.2046226, 0) + ' to ' + round(ref[2] * 2.2046226, 0) + ' lb') + '.') : h('p', { class: 'meta' }, 'Add your height and pre-pregnancy weight on the "My pregnancy" tab to see the US reference range.')));

    /* ---- blood pressure ---- */
    const bd = h('input', { type: 'date', value: today }), bt = h('input', { type: 'time' }), sy = ui.numberBox(1, 40, 300), di = ui.numberBox(1, 20, 200), pu = ui.numberBox(1, 20, 250);
    const bp = byDate(s.bps), lastBp = bp[bp.length - 1], bpChart = h('div', { class: 'chart' });
    out.push(h('h2', {}, 'Blood pressure'), h('p', { class: 'meta' }, 'Sit quietly for five minutes first, feet flat, arm supported at heart height. If you have a home monitor, take it to your midwife to be checked.'),
      h('div', { class: 'form' }, ui.field('Date', bd), ui.field('Time', bt), ui.field('Top number, systolic (mmHg)', sy), ui.field('Bottom number, diastolic (mmHg)', di), ui.field('Pulse (bpm), optional', pu)),
      h('p', {}, h('button', { type: 'button', onclick: () => { if (!sy.value || !di.value) return; s.bps.push({ date: bd.value, time: bt.value, sys: Number(sy.value), dia: Number(di.value), pulse: pu.value ? Number(pu.value) : '' }); save(); ctx.rerender(); } }, 'Add reading')));
    if (lastBp) {
      if (lastBp.sys >= 160 || lastBp.dia >= 110) out.push(ui.callout('Your latest reading (' + lastBp.sys + '/' + lastBp.dia + ') is very high. Call your midwife, maternity unit or 111 now, or go to A&E, especially if you also have a headache, blurred vision, pain under your ribs or sudden swelling.', true));
      else if (lastBp.sys >= 140 || lastBp.dia >= 90) out.push(ui.callout('Your latest reading (' + lastBp.sys + '/' + lastBp.dia + ') is 140/90 or higher. Tell your midwife or maternity unit today. High blood pressure in pregnancy can be a sign of pre-eclampsia.', true));
      if (bp.length > 1) { PBEcharts.line(bpChart, bp.map((r) => ({ x: r.date, y: r.sys })), { unit: 'systolic, mmHg' }); out.push(h('h3', {}, 'Top number over time'), bpChart); }
      out.push(ui.table(['Date', 'Time', 'Reading', 'Pulse'], sortedDesc(s.bps).slice(0, 60).map(([r]) => [r.date, r.time || '', r.sys + '/' + r.dia, r.pulse || '']), (i) => { s.bps.splice(sortedDesc(s.bps)[i][1], 1); save(); ctx.rerender(); }));
    }
    out.push(h('p', { class: 'meta' }, 'Your midwife checks your blood pressure and urine at every appointment. Pre-eclampsia signs: severe headache, vision problems, pain just under the ribs, sudden swelling of the face, hands or feet, and feeling generally unwell.'));

    /* ---- blood glucose ---- */
    const gd = h('input', { type: 'date', value: today }), gt = h('input', { type: 'time' }), gv = ui.numberBox(0.1, 0), gw = h('select', {}, ['Fasting', '1 hour after a meal', '2 hours after a meal', 'Before a meal', 'Bedtime', 'Other'].map((x) => h('option', { value: x }, x)));
    const gl = byDate(s.glucose), gChart = h('div', { class: 'chart' });
    out.push(h('h2', {}, 'Blood glucose'), h('p', { class: 'meta' }, 'For people who have been asked to check their blood glucose (for example with gestational diabetes). Your own care team\'s targets always come first.'),
      h('div', { class: 'form' }, ui.field('Date', gd), ui.field('Time', gt), ui.field('Reading (' + U.glucoseSuffix(u) + ')', gv), ui.field('When', gw)),
      h('p', {}, h('button', { type: 'button', onclick: () => { const mm = U.glucoseFrom(u, gv.value); if (mm === null) return; s.glucose.push({ date: gd.value, time: gt.value, mmol: round(mm, 2), when: gw.value }); save(); ctx.rerender(); } }, 'Add reading')));
    const target = { 'Fasting': 5.3, '1 hour after a meal': 7.8, '2 hours after a meal': 6.4 };
    if (gl.length) {
      const l = gl[gl.length - 1];
      if (target[l.when] && l.mmol > target[l.when]) out.push(ui.callout('Your latest reading (' + U.glucoseFmt(u, l.mmol) + ', ' + l.when.toLowerCase() + ') is above the NICE target of ' + U.glucoseFmt(u, target[l.when]) + '. Tell your diabetes or maternity team: they may want to change your plan.'));
      if (gl.length > 1) { PBEcharts.line(gChart, gl.map((r) => ({ x: r.date, y: Number(U.glucoseShow(u, r.mmol)) })), { unit: U.glucoseSuffix(u) }); out.push(gChart); }
      out.push(ui.table(['Date', 'Time', 'Reading', 'When'], sortedDesc(s.glucose).slice(0, 60).map(([r]) => [r.date, r.time || '', U.glucoseFmt(u, r.mmol), r.when]), (i) => { s.glucose.splice(sortedDesc(s.glucose)[i][1], 1); save(); ctx.rerender(); }));
    }
    out.push(h('p', { class: 'meta' }, 'NICE targets in pregnancy for women with diabetes: ' + D.GLUCOSE_TARGETS.map(([k, v]) => k.toLowerCase() + ' below ' + U.glucoseFmt(u, v)).join(', ') + '. Targets can be different for you.'));
    return h('div', {}, out);
  }

  /* ---------------------------------------------------------------- Baby movements */
  function movesPage(ctx) {
    const s = { first: '', log: [], ...(ctx.get('moves', {}) || {}) }, save = () => ctx.set('moves', s), m = PBtabsPregnancy.me(ctx);
    const FEELS = ['Moving as usual', 'Moving less than usual', 'Moving differently', 'Cannot feel any movement'];
    const date = h('input', { type: 'date', value: ui.todayLocal() }), time = h('input', { type: 'time', value: new Date().toTimeString().slice(0, 5) }), feel = h('select', {}, FEELS.map((x) => h('option', { value: x }, x))), note = h('input', { type: 'text' });
    const first = h('input', { type: 'date', value: s.first }); first.addEventListener('change', () => { s.first = first.value; save(); ctx.rerender(); });
    const out = [ui.callout('If your baby is moving less than usual, moving differently, or you cannot feel them move: phone your midwife or maternity unit straight away, day or night. Do not wait until the next day, do not wait to see if it settles, and do not use a heartbeat monitor or app at home to reassure yourself.', true),
      h('p', { class: 'meta' }, 'NHS and Tommy\'s advice: do not count kicks or aim for a set number of movements. Every baby has their own pattern, so the best thing is to get to know yours (usually from about 24 weeks, once movements are regular). From then, a change in that pattern is what matters. You can feel movements from about 16 to 24 weeks; if you have not felt any by 24 weeks, tell your midwife.'),
      h('h2', {}, 'First movements'), h('div', { class: 'form' }, ui.field('Date you first felt your baby move', first)), (() => { if (!s.first || !m.due) return h('p', { class: 'meta' }, 'Enter your due date on "My pregnancy" to see which week this was.'); const g = PBtabsPregnancy.gestation(m.due, s.first); return h('p', { class: 'meta' }, 'That was at ' + g.weeks + ' weeks and ' + g.extra + ' days.' + (g.weeks >= 25 ? ' If you were over 24 weeks before you felt movement, mention it to your midwife.' : '')); })(),
      h('h2', {}, 'A note of how today felt'), h('p', { class: 'meta' }, 'Optional: a diary of how movements felt, to show your midwife. It does not need to be done every day.'),
      h('div', { class: 'form' }, ui.field('Date', date), ui.field('Time', time), ui.field('How did it feel?', feel), ui.field('Notes (e.g. after a meal, at night)', note)),
      h('p', {}, h('button', { type: 'button', onclick: () => { s.log.push({ date: date.value, time: time.value, feel: feel.value, notes: note.value.trim() }); save(); ctx.rerender(); } }, 'Add note'))];
    const rows = sortedDesc(s.log);
    if (rows.length && rows[0][0].feel !== FEELS[0]) out.splice(1, 0, ui.callout('Your latest note says "' + rows[0][0].feel.toLowerCase() + '". Please phone your midwife or maternity unit now if you have not already.', true));
    if (rows.length) {
      const asUsual = s.log.filter((r) => r.feel === FEELS[0] && r.time), slot = (t) => { const hr = Number(t.slice(0, 2)); return hr < 6 ? 'Night (midnight to 6am)' : hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening'; };
      if (asUsual.length >= 5) { const c = {}; asUsual.forEach((r) => { c[slot(r.time)] = (c[slot(r.time)] || 0) + 1; }); const box = h('div', { class: 'chart' }); PBEcharts.bar(box, Object.entries(c).map(([label, value]) => ({ label, value })), { unit: 'notes' }); out.push(h('h3', {}, 'When you have noted usual movements'), box, h('p', { class: 'meta' }, 'This is only a picture of your own notes, not a target.')); }
      out.push(ui.table(['Date', 'Time', 'How it felt', 'Notes'], rows.slice(0, 60).map(([r]) => [r.date, r.time || '', r.feel, r.notes || '']), (i) => { s.log.splice(rows[i][1], 1); save(); ctx.rerender(); }));
    }
    return h('div', {}, out);
  }
  return { bodyPage, movesPage };
})();
