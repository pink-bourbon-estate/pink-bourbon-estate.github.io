/* Health Metrics - a private log for blood pressure, temperature, blood glucose, weight and body
   measurements. Built on tracker.js. This tool records numbers and draws trends. It does not diagnose
   anything and does not tell you what your numbers mean for you: that is for a clinician who knows you. */
PBE.tool({
  id: 'health-metrics',
  title: 'Health Metrics',
  /* made-up example entries (labelled as examples): about two months of readings */
  example: ({ daysAgo, rnd }) => ({
    bp: Array.from({ length: 30 }, (_, i) => ({ date: daysAgo(58 - i * 2), time: '08:00', sys: Math.round(126 + rnd() * 12 - i * 0.15), dia: Math.round(80 + rnd() * 8), pulse: Math.round(60 + rnd() * 14), arm: 'Left', notes: '' })),
    temp: Array.from({ length: 8 }, (_, i) => ({ date: daysAgo(55 - i * 7), time: '19:00', temp: Math.round((36.4 + rnd() * 0.7 + (i === 5 ? 1.2 : 0)) * 10) / 10, site: 'Ear', notes: i === 5 ? 'felt unwell' : '' })),
    glucose: Array.from({ length: 24 }, (_, i) => ({ date: daysAgo(46 - i * 2), time: i % 2 ? '14:00' : '07:30', value: Math.round((i % 2 ? 6.2 + rnd() * 1.6 : 4.8 + rnd() * 1.2) * 10) / 10, unit: 'mmol/L', when: i % 2 ? '1-2 hours after a meal' : 'Fasting / waking', notes: '' })),
    weight: Array.from({ length: 20 }, (_, i) => ({ date: daysAgo(57 - i * 3), weight: Math.round((82.4 - i * 0.12 + rnd() * 0.8) * 10) / 10, notes: '' })),
    body: [0, 1, 2, 3].map((i) => ({ date: daysAgo(56 - i * 18), height: 175, waist: Math.round(88 - i * 0.8), hips: 99, chest: 100, arm: 33, thigh: 58, neck: 38, bodyfat: '' })),
  }),
  /* sliders on the dashboard: a weight projection and a waist-to-height check */
  whatif: ({ h, get }) => {
    const w = get('weight', []).slice().sort((a, b) => a.date.localeCompare(b.date)), start = w.length ? w[w.length - 1].weight : 80;
    const out = h('div', {}), out2 = h('div', {});
    const st = { rate: 0.3, weeks: 12, waist: 88, height: 175 };
    const draw = () => {
      PBE.fill(out, h('p', { class: 'lede' }, 'If you change by ' + st.rate + ' kg a week for ' + st.weeks + ' weeks you would reach about ' + PBE.round(start - st.rate * st.weeks) + ' kg, starting from ' + start + ' kg.'), h('p', { class: 'meta' }, 'A slow, steady pace is generally easier to keep. For advice about your own weight, speak to a doctor or dietitian.'));
      const r = st.waist / st.height;
      PBE.fill(out2, h('p', { class: 'lede' }, 'Waist-to-height ratio: ' + PBE.round(r, 2) + '.'), h('p', { class: 'meta' }, r < 0.5 ? 'Under 0.5, the figure often quoted as a rough guide.' : 'At or over 0.5, a figure often quoted as a rough sign to look at waist size. It is not a diagnosis.'));
    };
    draw();
    return h('div', {}, h('h3', {}, 'Weight projection'), PBEcharts.slider('Change per week', -1, 1, 0.1, st.rate, (v) => { st.rate = v; draw(); }, 'kg'), PBEcharts.slider('For how many weeks', 1, 52, 1, st.weeks, (v) => { st.weeks = v; draw(); }, 'weeks'), out,
      h('h3', {}, 'Waist to height'), PBEcharts.slider('Waist', 50, 140, 1, st.waist, (v) => { st.waist = v; draw(); }, 'cm'), PBEcharts.slider('Height', 140, 210, 1, st.height, (v) => { st.height = v; draw(); }, 'cm'), out2);
  },
  notice: 'Not medical advice. This only records and charts what you enter. Work in progress: expect bugs. If you feel seriously unwell, or a reading worries you, contact a doctor or emergency services rather than a website. Your data stays in this browser.',
  tabs: [
    { id: 'bp', label: 'Blood pressure', type: 'log', addLabel: 'Add a reading',
      intro: 'Sit quietly for five minutes first, feet flat, arm supported at heart height, and take it at similar times each day. Many clinicians like two readings a minute apart.',
      required: ['sys', 'dia'],
      fields: [
        { key: 'date', label: 'Date', type: 'date' }, { key: 'time', label: 'Time', type: 'time' },
        { key: 'sys', label: 'Top (systolic)', type: 'number', unit: 'mmHg', step: 1 }, { key: 'dia', label: 'Bottom (diastolic)', type: 'number', unit: 'mmHg', step: 1 }, { key: 'pulse', label: 'Pulse', type: 'number', unit: 'bpm', step: 1 },
        { key: 'arm', label: 'Arm', type: 'select', options: ['Left', 'Right'], keep: true }, { key: 'notes', label: 'Notes (stress, coffee, medicine...)' }],
      summary: (r) => { const a = (k) => PBE.round(r.reduce((s, x) => s + (Number(x[k]) || 0), 0) / r.filter((x) => x[k]).length || 0, 0); return [['Readings', r.length], ['Average', a('sys') + '/' + a('dia')], ['Highest top number', Math.max(...r.map((x) => x.sys || 0))]]; },
      charts: [{ title: 'Top number over time', y: 'sys', unit: 'mmHg' }, { title: 'Bottom number over time', y: 'dia', unit: 'mmHg' }, { title: 'Pulse over time', y: 'pulse', unit: 'bpm' }] },
    { id: 'temp', label: 'Temperature', type: 'log', addLabel: 'Add a temperature',
      intro: 'Different thermometers and places (ear, mouth, forehead, under the arm) read differently, so keep to the same one for comparing, and note which you used.',
      required: ['temp'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'time', label: 'Time', type: 'time' }, { key: 'temp', label: 'Temperature', type: 'number', unit: '°C', step: 0.1 },
        { key: 'site', label: 'Where taken', type: 'select', options: ['Ear', 'Mouth', 'Forehead', 'Under the arm'], keep: true }, { key: 'notes', label: 'Notes (symptoms, medicine...)' }],
      summary: (r) => [['Readings', r.length], ['Highest', Math.max(...r.map((x) => x.temp || 0)) + ' °C'], ['Average', PBE.round(r.reduce((s, x) => s + (x.temp || 0), 0) / r.length) + ' °C']],
      charts: [{ title: 'Temperature over time', y: 'temp', unit: '°C' }] },
    { id: 'glucose', label: 'Blood glucose', type: 'log', addLabel: 'Add a glucose reading',
      intro: 'Enter the number your meter shows, and pick the same unit it uses. Use the context box: a reading before a meal and one after are not comparable. Follow your own care team\'s targets.',
      required: ['value'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'time', label: 'Time', type: 'time' }, { key: 'value', label: 'Reading', type: 'number', step: 0.1 },
        { key: 'unit', label: 'Unit', type: 'select', options: ['mmol/L', 'mg/dL'], keep: true },
        { key: 'when', label: 'When', type: 'select', options: ['Fasting / waking', 'Before a meal', '1-2 hours after a meal', 'Bedtime', 'Other'], keep: true }, { key: 'notes', label: 'Notes (meal, exercise, illness...)' }],
      computed: [{ key: 'mmol', label: 'In mmol/L', fn: (r) => (r.value ? PBE.round(r.unit === 'mg/dL' ? r.value / 18.016 : r.value, 1) : '') }],
      summary: (r) => { const v = r.map((x) => (x.unit === 'mg/dL' ? x.value / 18.016 : x.value)).filter(Boolean); return [['Readings', r.length], ['Average', v.length ? PBE.round(v.reduce((a, b) => a + b, 0) / v.length) + ' mmol/L' : '-']]; },
      charts: [{ title: 'Readings over time (mmol/L)', y: 'mmol', unit: 'mmol/L' }, { title: 'Readings by situation (count)', kind: 'bar', by: 'when', unit: 'readings' }] },
    { id: 'weight', label: 'Weight', type: 'log', addLabel: 'Add a weight',
      intro: 'Weigh at the same time of day (many people choose the morning, after the toilet, before eating). Day-to-day swings of a kilo or so are normal, so look at the trend rather than one day.',
      required: ['weight'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'weight', label: 'Weight', type: 'number', unit: 'kg', step: 0.1 }, { key: 'notes', label: 'Notes' }],
      summary: (r) => { const s = r.slice().sort((a, b) => a.date.localeCompare(b.date)); return [['Entries', r.length], ['Latest', s[s.length - 1].weight + ' kg'], ['Change since first', (s.length > 1 ? PBE.round(s[s.length - 1].weight - s[0].weight) : 0) + ' kg']]; },
      charts: [{ title: 'Weight over time', y: 'weight', unit: 'kg' }] },
    { id: 'body', label: 'Body measurements', type: 'log', addLabel: 'Add measurements',
      intro: 'Use a soft tape, relaxed, at the same points each time (for example waist at the navel, hips at the widest point). Leave blank anything you did not measure.',
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'height', label: 'Height', type: 'number', unit: 'cm', keep: true }, { key: 'waist', label: 'Waist', type: 'number', unit: 'cm' }, { key: 'hips', label: 'Hips', type: 'number', unit: 'cm' }, { key: 'chest', label: 'Chest', type: 'number', unit: 'cm' },
        { key: 'arm', label: 'Upper arm', type: 'number', unit: 'cm' }, { key: 'thigh', label: 'Thigh', type: 'number', unit: 'cm' }, { key: 'neck', label: 'Neck', type: 'number', unit: 'cm' }, { key: 'bodyfat', label: 'Body fat (if you have a figure)', type: 'number', unit: '%' }],
      computed: [{ key: 'whr', label: 'Waist:hip', fn: (r) => (r.waist && r.hips ? PBE.round(r.waist / r.hips, 2) : '') }, { key: 'whtr', label: 'Waist:height', fn: (r) => (r.waist && r.height ? PBE.round(r.waist / r.height, 2) : '') }],
      charts: [{ title: 'Waist over time', y: 'waist', unit: 'cm' }, { title: 'Hips over time', y: 'hips', unit: 'cm' }, { title: 'Chest over time', y: 'chest', unit: 'cm' }, { title: 'Upper arm over time', y: 'arm', unit: 'cm' }, { title: 'Thigh over time', y: 'thigh', unit: 'cm' }] },
    { id: 'info', label: 'About the numbers', type: 'static', blocks: [
      { h: 'What these numbers mean', note: 'General information only. Targets differ between people, and you should use the ones your own doctor or nurse gives you.' },
      { h3: 'Blood pressure', p: 'In the UK the NHS describes a healthy range as roughly between 90/60 and under 120/80 mmHg, with high blood pressure usually meaning readings that stay at or above about 140/90 in a clinic or 135/85 at home. One high reading is not a diagnosis; a pattern is what matters. Very high readings with a severe headache, chest pain, confusion or breathlessness need urgent help.' },
      { h3: 'Temperature', p: 'A typical body temperature is about 36 to 37 °C, varying by person, time of day and where it is measured. A temperature of 38 °C or higher is usually called a fever. Check current NHS guidance for babies and young children, where thresholds are different.' },
      { h3: 'Blood glucose', p: 'Targets are set individually. People with diabetes are often given targets by their team; commonly quoted ranges for adults are about 4 to 7 mmol/L before meals, and under about 8.5 to 9 mmol/L two hours after a meal, but your own targets may differ. Low readings (under 4 mmol/L) with symptoms such as shakiness, sweating, confusion need quick treatment as advised by your team.' },
      { h3: 'Weight and body measurements', p: 'Single numbers rarely tell the whole story. A waist measurement of more than about half your height is sometimes used as a rough sign of extra abdominal fat, which is what the waist-to-height ratio on the Body tab shows. It is not a diagnosis.' },
      { h: 'Where these ranges come from', list: ['NHS: "High blood pressure (hypertension)", "Check your blood pressure", "High temperature (fever) in adults", "Blood sugar level targets" and related pages on nhs.uk: please read the current versions.', 'Diabetes UK: blood glucose targets information.'] },
      { p: 'The figures above are summarised from memory of those pages and may be out of date: always check the current pages and ask your clinician.' }] },
  ],
});
