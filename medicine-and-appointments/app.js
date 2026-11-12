/* Medicine and Appointments - a private place for your medicines, dose-time reminders, repeat
   prescriptions, appointments, condition notes and document locations. Built on tracker.js.

   IMPORTANT: this tool only stores what YOU enter from your prescription label or your prescriber, and
   counts time. It never suggests a dose, never checks interactions and is not medical advice. Always follow the
   label and your prescriber or pharmacist. Reminders only work while this page is open in a browser. */

/* Look at the "meds" list and say what is due today. Called by the Today tab. */
function medSlots(meds) {
  const slots = [];
  meds.filter((m) => m.active !== 'No').forEach((m) => {
    const times = String(m.times || '').split(/[ ,;]+/).filter((x) => /^\d{1,2}:\d{2}$/.test(x)).map((x) => x.padStart(5, '0'));
    times.forEach((t) => slots.push({ med: m, time: t, key: m.name + '|' + t }));
  });
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

PBE.tool({
  id: 'medicine-and-appointments',
  title: 'Medicine and Appointments',
  notice: 'Not medical advice. This only records what you type from your own labels and appointments, and never suggests doses. Follow your prescriber and pharmacist. Work in progress: expect bugs. Your data stays in this browser.',
  tabs: [
    /* the medicines list, which the Today tab reads */
    { id: 'meds', label: 'Medicines', type: 'log', addLabel: 'Add a medicine', intro: 'Copy these from the label or your prescriber: nothing here is a recommendation. Put dose times as 24-hour times separated by commas (for example 08:00, 20:00). Leave times empty for "as needed" medicines. "Minimum hours between doses" is the figure on your label, if it has one.',
      required: ['name'],
      fields: [{ key: 'date', label: 'Date started or noted', type: 'date' }, { key: 'name', label: 'Medicine' }, { key: 'dose', label: 'Dose as on the label (e.g. 1 tablet, 5 ml)' }, { key: 'times', label: 'Dose times (24h, comma separated)', placeholder: '08:00, 20:00' }, { key: 'minHours', label: 'Minimum hours between doses (from label)', type: 'number', step: 0.5 },
        { key: 'what', label: 'What it is for' }, { key: 'prescriber', label: 'Prescriber or pharmacy' }, { key: 'active', label: 'Currently taking?', type: 'select', options: ['Yes', 'No'], keep: true }, { key: 'notes', label: 'Notes (with food, side effects to mention...)' }] },
    /* today: tick off doses, see when the next is due */
    { id: 'today', label: 'Today', type: 'custom', render: ({ h, get, set, today }) => {
      const meds = get('meds', []), slots = medSlots(meds);
      const taken = get('taken', {}), day = taken[today()] || (taken[today()] = {}), last = get('lastdose', {});
      const wrap = h('div', {});
      const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
      const record = (name, key) => { day[key] = now(); taken[today()] = day; set('taken', taken); last[name] = Date.now(); set('lastdose', last); draw(); };
      const waitText = (m) => { if (!m.minHours || !last[m.name]) return ''; const ms = last[m.name] + m.minHours * 3600000 - Date.now(); return ms > 0 ? 'Next dose not before ' + new Date(last[m.name] + m.minHours * 3600000).toTimeString().slice(0, 5) + ' (label says ' + m.minHours + ' hours between doses).' : ''; };
      const draw = () => {
        const asNeeded = meds.filter((m) => m.active !== 'No' && !String(m.times || '').trim());
        const n = now();
        PBE.fill(wrap, 
          h('p', { class: 'meta' }, 'Tick when you take each dose. Times come from the Medicines tab. Reminders appear only while this page is open.'),
          slots.length ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Time', 'Medicine', 'Status', ''].map((x) => h('th', {}, x)))), h('tbody', {}, slots.map((s) => {
            const t = day[s.key]; const late = !t && s.time < n;
            return h('tr', {}, h('td', {}, s.time), h('td', {}, h('strong', {}, s.med.name), s.med.dose ? h('span', { class: 'meta block' }, s.med.dose) : null, waitText(s.med) ? h('span', { class: 'meta block' }, waitText(s.med)) : null),
              h('td', { style: late ? 'font-weight:600' : '' }, t ? 'taken at ' + t : late ? 'not yet taken' : 'later today'), h('td', {}, t ? h('button', { type: 'button', onclick: () => { delete day[s.key]; set('taken', taken); draw(); } }, 'Undo') : h('button', { type: 'button', onclick: () => record(s.med.name, s.key) }, 'Taken now')));
          })))) : h('p', { class: 'meta' }, 'No dose times set yet. Add some on the Medicines tab.'),
          asNeeded.length ? h('div', {}, h('h3', {}, 'As needed'), asNeeded.map((m) => h('div', { class: 'ev' }, h('span', { class: 'time' }, last[m.name] ? new Date(last[m.name]).toTimeString().slice(0, 5) : ''), h('span', { class: 'what' }, h('strong', {}, m.name), ' ', m.dose || '', waitText(m) ? h('span', { class: 'meta block' }, waitText(m)) : null, h('button', { type: 'button', onclick: () => record(m.name, m.name + '|prn' + Date.now()) }, 'Taken now'))))) : null,
          h('h3', {}, 'Notifications'), h('p', { class: 'meta' }, 'Your browser can show a notice at dose time while this tab is open. The notice shows only the medicine name, so think about who can see your screen.'),
          h('p', {}, h('button', { type: 'button', onclick: () => { if ('Notification' in window) Notification.requestPermission().then((p) => { wrap.append(h('p', { class: 'meta' }, 'Notifications: ' + p)); }); } }, 'Allow notifications')));
      };
      draw();
      /* check every 30 seconds whether a dose time has arrived; one timer only, replaced on each visit */
      if (window.__pbeMedTimer) clearInterval(window.__pbeMedTimer);
      window.__pbeMedTimer = setInterval(() => {
        const cur = now(), d = (get('taken', {})[today()]) || {};
        medSlots(get('meds', [])).forEach((s) => { if (s.time === cur && !d[s.key] && 'Notification' in window && Notification.permission === 'granted') new Notification('Medicine time: ' + s.med.name); });
        if (document.contains(wrap)) draw();
      }, 30000);
      return wrap;
    } },
    /* repeat prescriptions: when will it run out */
    { id: 'rx', label: 'Repeat prescriptions', type: 'log', addLabel: 'Add a count', intro: 'Count what you have left on a date, and how many you take a day (from your label), and it works out the run-out date and when to order. Pharmacies and surgeries need different notice: set the lead time in days to suit yours.',
      required: ['name', 'left', 'perDay'],
      fields: [{ key: 'date', label: 'Date counted', type: 'date' }, { key: 'name', label: 'Medicine' }, { key: 'left', label: 'Left (tablets, ml, doses)', type: 'number' }, { key: 'perDay', label: 'Used per day (from label)', type: 'number', step: 0.25 }, { key: 'lead', label: 'Order this many days ahead', type: 'number', step: 1, default: 7, keep: true }, { key: 'notes', label: 'Notes' }],
      filterBy: 'name',
      computed: [{ key: 'run', label: 'Runs out', fn: (r) => (r.left && r.perDay ? PBE.addDays(r.date, Math.floor(r.left / r.perDay)) : '') }, { key: 'order', label: 'Order by', fn: (r) => (r.left && r.perDay ? PBE.addDays(r.date, Math.floor(r.left / r.perDay) - (r.lead || 7)) : '') }, { key: 'days', label: 'Days left from today', fn: (r) => (r.left && r.perDay ? PBE.daysUntil(PBE.addDays(r.date, Math.floor(r.left / r.perDay))) : '') }] },
    { id: 'appts', label: 'Appointments', type: 'log', addLabel: 'Add an appointment', intro: 'Date, who with, what for, and what to bring or ask. "Days away" counts from today (negative means it has passed).',
      required: ['with'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'time', label: 'Time', type: 'time' }, { key: 'with', label: 'Who with (clinic, dentist, specialist...)' }, { key: 'where', label: 'Where' }, { key: 'why', label: 'What for' }, { key: 'ask', label: 'Questions to ask or things to bring', type: 'textarea' }, { key: 'outcome', label: 'What was said or decided', type: 'textarea' }],
      computed: [{ key: 'away', label: 'Days away', fn: (r) => (r.date ? PBE.daysUntil(r.date) : '') }] },
    { id: 'cond', label: 'Condition tracker', type: 'log', addLabel: 'Add a symptom entry', intro: 'Record how a condition or symptom is each day: this helps you describe patterns at an appointment. Severity is your own 0 to 10 (0 none, 10 the worst you can imagine).',
      required: ['condition'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'condition', label: 'Condition or symptom', keep: true }, { key: 'severity', label: 'Severity (0-10)', type: 'number', min: 0, max: 10, step: 1 }, { key: 'triggers', label: 'Possible triggers (food, stress, sleep...)' }, { key: 'helped', label: 'What helped' }, { key: 'notes', label: 'Notes' }],
      filterBy: 'condition', summary: (r) => [['Entries', r.length], ['Average severity', PBE.round(r.reduce((s, x) => s + (x.severity || 0), 0) / r.length)], ['Worst', Math.max(...r.map((x) => x.severity || 0))]],
      charts: [{ title: 'Severity over time', y: 'severity', zero: true }, { title: 'Most common triggers noted', kind: 'bar', by: 'triggers', unit: 'times' }] },
    { id: 'docs', label: 'Documents', type: 'log', addLabel: 'Note where a document is', intro: 'This does not store the documents themselves. It remembers what you have and where to find it, so it is quick to get at (a letter, a test result, a vaccination record, a prescription).',
      required: ['title'],
      fields: [{ key: 'date', label: 'Date of document', type: 'date' }, { key: 'title', label: 'Title' }, { key: 'kind', label: 'Kind', type: 'select', options: ['Letter', 'Test result', 'Prescription', 'Vaccination record', 'Referral', 'Insurance', 'Other'], keep: true }, { key: 'where', label: 'Where it is kept (folder, drawer, app, email)' }, { key: 'expires', label: 'Expires or review by', type: 'date' }, { key: 'notes', label: 'Notes' }] },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Questions for next time, instructions you were given, numbers to call.' },
  ],
});
