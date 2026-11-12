/* Bullet Journal - a digital take on the bullet journal method (created by Ryder Carroll: see his book
   "The Bullet Journal Method"). Rapid logging with signifiers, a daily log, migration of unfinished
   tasks, a monthly view, a habit grid and collections. Built on tracker.js. Saved in this browser only.

   Signifiers used here:   •  task     ×  done     >  migrated (moved to today)     <  scheduled (moved to a date)
                           ○  event    –  note     (a cancelled task is shown struck through)                    */

const SIGN = { task: '•', event: '○', note: '–' };
const STATE_MARK = { open: '', done: '×', migrated: '>', scheduled: '<', cancelled: '' };

PBE.tool({
  id: 'bullet-journal',
  title: 'Bullet Journal',
  tabs: [
    /* the daily log */
    { id: 'daily', label: 'Daily log', type: 'custom', render: ({ h, get, set, today, addDays, uid, rerender }) => {
      const items = get('bj', []);
      let day = get('bjday', today());
      const wrap = h('div', {});
      const save = () => set('bj', items);
      const line = (e) => h('div', { class: 'ev' }, h('span', { class: 'time', style: 'min-width:2.2em' }, e.type === 'task' ? (STATE_MARK[e.state] || SIGN.task) : SIGN[e.type]),
        h('span', { class: 'what', style: e.state === 'cancelled' || e.state === 'done' ? 'opacity:.6' + (e.state === 'cancelled' ? ';text-decoration:line-through' : '') : '' }, (e.star ? '* ' : '') + e.text, ' ',
          e.type === 'task' && e.state === 'open' ? [h('button', { type: 'button', onclick: () => { e.state = 'done'; save(); draw(); } }, 'Done'), ' ', h('button', { type: 'button', title: 'Move to today', onclick: () => { e.state = 'migrated'; items.push({ id: uid(), date: today(), type: 'task', state: 'open', text: e.text, star: e.star }); save(); draw(); } }, 'Migrate >'), ' ',
            h('button', { type: 'button', title: 'Schedule for a later date', onclick: () => { const d = prompt('Move to which date? (YYYY-MM-DD)', addDays(day, 7)); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { e.state = 'scheduled'; items.push({ id: uid(), date: d, type: 'task', state: 'open', text: e.text, star: e.star }); save(); draw(); } } }, 'Schedule <'), ' ', h('button', { type: 'button', onclick: () => { e.state = 'cancelled'; save(); draw(); } }, 'Cancel')] : null,
          e.type === 'task' && e.state === 'done' ? h('button', { type: 'button', onclick: () => { e.state = 'open'; save(); draw(); } }, 'Reopen') : null, ' ', h('button', { type: 'button', onclick: () => { items.splice(items.indexOf(e), 1); save(); draw(); } }, 'Delete')));
      const draw = () => {
        set('bjday', day);
        const open = items.filter((e) => e.type === 'task' && e.state === 'open' && e.date < today());
        const type = h('select', { id: 'bj_type' }, [['task', '• Task'], ['event', '○ Event'], ['note', '– Note']].map(([v, l]) => h('option', { value: v }, l)));
        const text = h('input', { type: 'text', id: 'bj_text', placeholder: 'Write it short: a few words', onkeydown: (e) => { if (e.key === 'Enter') add(); } }), star = h('input', { type: 'checkbox', id: 'bj_star' });
        const add = () => { const t = text.value.trim(); if (!t) return; items.push({ id: uid(), date: day, type: type.value, state: 'open', text: t, star: star.checked }); save(); draw(); document.getElementById('bj_text').focus(); };
        const todays = items.filter((e) => e.date === day);
        PBE.fill(wrap, 
          h('p', { class: 'meta' }, 'Rapid logging: write what you need to do (•), what is happening (○) and what you want to remember (–). At the end of the day mark tasks done (×), or migrate (>) the ones that still matter to tomorrow, or schedule (<) them.'),
          h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Day', h('input', { type: 'date', value: day, onchange: (e) => { day = e.target.value || today(); draw(); } })), h('label', { class: 'fld' }, 'Type', type), h('label', { class: 'fld' }, 'Entry', text), h('label', { class: 'fld' }, 'Priority *', star)),
          h('p', {}, h('button', { type: 'button', onclick: add }, 'Add'), ' ', h('button', { type: 'button', onclick: () => { day = today(); draw(); } }, 'Go to today'), ' ', h('button', { type: 'button', onclick: () => { day = addDays(day, -1); draw(); } }, 'Previous day'), ' ', h('button', { type: 'button', onclick: () => { day = addDays(day, 1); draw(); } }, 'Next day')),
          h('h2', {}, day === today() ? 'Today, ' + day : day),
          todays.length ? todays.map(line) : h('p', { class: 'meta' }, 'Nothing logged for this day.'),
          open.length ? h('div', {}, h('h3', {}, 'Open tasks from earlier days (' + open.length + ')'), open.slice(0, 15).map(line), h('p', {}, h('button', { type: 'button', onclick: () => { open.forEach((e) => { e.state = 'migrated'; items.push({ id: uid(), date: today(), type: 'task', state: 'open', text: e.text, star: e.star }); }); save(); day = today(); draw(); } }, 'Migrate all of them to today'))) : null);
      };
      draw(); return wrap;
    } },
    /* the monthly view */
    { id: 'month', label: 'Month', type: 'custom', render: ({ h, get, today, addMonths }) => {
      const items = get('bj', []); let ym = today().slice(0, 7);
      const wrap = h('div', {});
      const draw = () => {
        const mine = items.filter((e) => e.date.slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date));
        const days = [...new Set(mine.map((e) => e.date))];
        const tasks = mine.filter((e) => e.type === 'task'), done = tasks.filter((e) => e.state === 'done').length;
        PBE.fill(wrap, h('p', { class: 'meta' }, 'Everything you logged this month, by day. Use the Daily log to add scheduled things on future dates (the "future log").'),
          h('p', {}, h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', -1).slice(0, 7); draw(); } }, 'Previous'), ' ', h('strong', {}, ym), ' ', h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', 1).slice(0, 7); draw(); } }, 'Next')),
          h('p', { class: 'lede' }, tasks.length + ' tasks, ' + done + ' done, ' + mine.filter((e) => e.type === 'event').length + ' events, ' + mine.filter((e) => e.type === 'note').length + ' notes'),
          days.length ? days.map((d) => h('div', {}, h('h3', {}, d), mine.filter((e) => e.date === d).map((e) => h('div', { class: 'ev' }, h('span', { class: 'time' }, e.type === 'task' ? (STATE_MARK[e.state] || SIGN.task) : SIGN[e.type]), h('span', { class: 'what' }, e.text))))) : h('p', { class: 'meta' }, 'Nothing this month.'));
      };
      draw(); return wrap;
    } },
    /* habit grid */
    { id: 'habits', label: 'Habits', type: 'custom', render: ({ h, get, set, today, addMonths }) => {
      const s = get('habits', { list: ['Walk', 'Read', 'Water'], ticks: {} }); let ym = today().slice(0, 7);
      const wrap = h('div', {});
      const draw = () => {
        const [y, m] = ym.split('-').map(Number), n = new Date(y, m, 0).getDate();
        const dayKey = (d) => ym + '-' + String(d).padStart(2, '0');
        const name = h('input', { type: 'text', placeholder: 'New habit' });
        PBE.fill(wrap, h('p', { class: 'meta' }, 'Tick each day you do a habit. The grid is for one month at a time.'),
          h('p', {}, h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', -1).slice(0, 7); draw(); } }, 'Previous'), ' ', h('strong', {}, ym), ' ', h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', 1).slice(0, 7); draw(); } }, 'Next')),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Habit'), Array.from({ length: n }, (_, i) => h('th', { class: 'n' }, i + 1)), h('th', {}, 'Days'))),
            h('tbody', {}, s.list.map((hb) => h('tr', {}, h('td', {}, hb, ' ', h('button', { type: 'button', onclick: () => { s.list = s.list.filter((x) => x !== hb); set('habits', s); draw(); } }, 'x')),
              Array.from({ length: n }, (_, i) => { const k = dayKey(i + 1); return h('td', { class: 'n' }, h('input', { type: 'checkbox', 'aria-label': hb + ' ' + k, checked: !!(s.ticks[k] || {})[hb], onchange: (e) => { (s.ticks[k] = s.ticks[k] || {})[hb] = e.target.checked; set('habits', s); draw(); } })); }),
              h('td', { class: 'n' }, Array.from({ length: n }, (_, i) => (s.ticks[dayKey(i + 1)] || {})[hb]).filter(Boolean).length)))))),
          h('p', {}, name, ' ', h('button', { type: 'button', onclick: () => { const v = name.value.trim(); if (v && !s.list.includes(v)) { s.list.push(v); set('habits', s); draw(); } } }, 'Add a habit')));
      };
      draw(); return wrap;
    } },
    { id: 'collections', label: 'Collections', type: 'notes', intro: 'A collection is any list on a theme: books to read, gift ideas, trip plans, project notes. Give each one a title. Written in plain text or Markdown.' },
    { id: 'key', label: 'How it works', type: 'static', blocks: [
      { h: 'How the bullet journal works', p: 'This follows the idea of rapid logging from Ryder Carroll\'s "The Bullet Journal Method" (bulletjournal.com). It is a plain digital version, and not affiliated with him or his company.' },
      { table: [['Mark', 'Meaning'], ['•', 'Task: something to do'], ['×', 'Task done'], ['>', 'Task migrated: moved to today'], ['<', 'Task scheduled: moved to a later date'], ['○', 'Event: something that happens on a date'], ['–', 'Note: a fact or thought to remember'], ['*', 'Priority']] },
      { h3: 'A routine', list: ['Morning: look at today\'s log and the open tasks from earlier days.', 'During the day: write quick, short entries.', 'Evening: mark done tasks, migrate the ones that still matter, cancel the ones that do not.', 'Monthly: look at the Month tab and decide what to carry forward.'] }] },
  ],
});
