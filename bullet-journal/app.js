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
  /* the dashboard for the journal: counts and charts worked out from the entries and the habit grid */
  dashboardExtra: ({ h, get, today, addDays }) => {
    const bj = get('bj', []), hab = get('habits', null);
    if (!bj.length && !hab) return null;
    const tasks = bj.filter((e) => e.type === 'task'), done = tasks.filter((e) => e.state === 'done'), open = tasks.filter((e) => e.state === 'open');
    const box = h('div', {});
    PBEcharts.stat(box, [['Tasks written', tasks.length], ['Done', done.length], ['Done share', tasks.length ? Math.round((done.length / tasks.length) * 100) + ' %' : '-'], ['Still open', open.length], ['Migrated', tasks.filter((e) => e.state === 'migrated').length], ['Events', bj.filter((e) => e.type === 'event').length], ['Notes', bj.filter((e) => e.type === 'note').length]]);
    const c1 = h('div', { class: 'chart' }), pts = Array.from({ length: 14 }, (_, i) => { const d = addDays(today(), i - 13); return { x: d, y: tasks.filter((e) => e.date === d && e.state === 'done').length }; });
    PBEcharts.line(c1, pts, { unit: 'tasks done' }); box.append(h('h2', {}, 'Tasks done per day, last two weeks'), c1);
    if (hab) {
      const c2 = h('div', { class: 'chart' }), days = Array.from({ length: 30 }, (_, i) => addDays(today(), -i));
      PBEcharts.bar(c2, hab.list.map((n) => ({ label: n, value: days.filter((d) => (hab.ticks[d] || {})[n]).length })).sort((a, b) => b.value - a.value), { unit: 'of 30 days' });
      box.append(h('h2', {}, 'Habits, last 30 days'), c2);
    }
    return box;
  },
  /* made-up example: a fortnight of entries and three habits (kept by the custom tabs, so supplied as raw data) */
  example: ({ today, addDays, rnd, uid: _u }) => {
    const tasks = ['Reply to emails', 'Book the dentist', 'Water the plants', 'Plan the week', 'Pay the bill', 'Call a friend', 'Tidy the desk', 'Read a chapter'], bj = [];
    for (let i = 13; i >= 0; i--) { const d = addDays(today(), -i); tasks.filter(() => rnd() < 0.45).forEach((t) => bj.push({ id: 'x' + i + t.length + Math.round(rnd() * 999), date: d, type: 'task', state: i === 0 ? 'open' : rnd() < 0.7 ? 'done' : 'migrated', text: t })); if (rnd() < 0.4) bj.push({ id: 'e' + i, date: d, type: 'event', state: 'open', text: 'Example event' }); if (rnd() < 0.25) bj.push({ id: 'n' + i, date: d, type: 'note', state: 'open', text: 'An idea worth keeping' }); }
    const ticks = {}; for (let i = 30; i >= 0; i--) { const d = addDays(today(), -i); ticks[d] = { Walk: rnd() < 0.7, Read: rnd() < 0.5, Water: rnd() < 0.8 }; }
    return { _raw: { bj, habits: { list: ['Walk', 'Read', 'Water'], ticks } } };
  },
  /* sliders: how much would a daily plan get done? */
  whatif: ({ h }) => {
    const st = { n: 5, p: 70 }, out = h('div', {});
    const draw = () => PBE.fill(out, h('p', { class: 'lede' }, 'Writing ' + st.n + ' tasks a day and finishing ' + st.p + ' % of them: about ' + Math.round(st.n * st.p / 100 * 30) + ' done in a month, with about ' + Math.round(st.n * (100 - st.p) / 100 * 30) + ' to migrate or cancel.'), h('p', { class: 'meta' }, 'A shorter list you finish is usually kinder than a long list you carry over.'));
    draw();
    return h('div', {}, h('h3', {}, 'How much gets done?'), PBEcharts.slider('Tasks written a day', 1, 15, 1, st.n, (v) => { st.n = v; draw(); }), PBEcharts.slider('Share finished', 10, 100, 5, st.p, (v) => { st.p = v; draw(); }, '%'), out);
  },
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
    /* the journal: a two-page spread that looks like a notebook (monthly log on the left, the chosen day on the right) */
    { id: 'journal', label: 'Journal', type: 'custom', render: ({ h, get, set, today, addMonths, uid }) => {
      const items = get('bj', []); let day = get('bjday', today()), ym = day.slice(0, 7);
      const wrap = h('div', {}), save = () => set('bj', items);
      const mark = (e) => (e.type === 'task' ? (STATE_MARK[e.state] || SIGN.task) : SIGN[e.type]);
      const draw = () => {
        set('bjday', day);
        const [y, m] = ym.split('-').map(Number), n = new Date(y, m, 0).getDate();
        const monthName = new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long' });
        const left = h('div', { class: 'jpage' }, h('div', { class: 'jtitle' }, monthName + ' ' + y),
          h('div', { class: 'jnav' }, h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', -1).slice(0, 7); draw(); } }, '<'), ' ', h('button', { type: 'button', onclick: () => { day = today(); ym = day.slice(0, 7); draw(); } }, 'today'), ' ', h('button', { type: 'button', onclick: () => { ym = addMonths(ym + '-15', 1).slice(0, 7); draw(); } }, '>')),
          Array.from({ length: n }, (_, i) => { const d = ym + '-' + String(i + 1).padStart(2, '0'), es = items.filter((e) => e.date === d), wd = 'SMTWTFS'[new Date(y, m - 1, i + 1).getDay()];
            return h('div', { class: 'jday' + (d === day ? ' sel' : '') + (d === today() ? ' now' : ''), onclick: () => { day = d; draw(); } }, h('span', { class: 'jn' }, i + 1), h('span', { class: 'jw' }, wd), h('span', { class: 'jt' }, es.length ? es.slice(0, 2).map((e) => mark(e) + ' ' + e.text).join('  ') : '')); }));
        const todays = items.filter((e) => e.date === day);
        const type = h('select', { 'aria-label': 'Type' }, [['task', '•'], ['event', '○'], ['note', '–']].map(([v, l]) => h('option', { value: v }, l)));
        const text = h('input', { type: 'text', placeholder: 'write here...', onkeydown: (e) => { if (e.key === 'Enter') add(); } });
        const add = () => { const t = text.value.trim(); if (!t) return; items.push({ id: uid(), date: day, type: type.value, state: 'open', text: t }); save(); draw(); };
        const right = h('div', { class: 'jpage' }, h('div', { class: 'jtitle' }, new Date(day + 'T12:00:00').toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })),
          todays.length ? todays.map((e) => h('div', { class: 'jline' + (e.state === 'done' ? ' jdone' : '') + (e.state === 'cancelled' ? ' jcancel' : '') },
            h('button', { type: 'button', class: 'jmark', title: e.type === 'task' ? 'Click to mark done or open' : '', onclick: () => { if (e.type === 'task') { e.state = e.state === 'done' ? 'open' : 'done'; save(); draw(); } } }, mark(e)), h('span', {}, e.text))) : h('div', { class: 'jline' }, h('span', { style: 'opacity:.5' }, 'a blank page...')),
          h('div', { class: 'jadd' }, type, text, h('button', { type: 'button', onclick: add }, '+')));
        PBE.fill(wrap, h('p', { class: 'meta' }, 'The same entries as the Daily log, drawn as a notebook. Click a day on the left to open it; click a bullet to mark a task done (×). The paper and handwriting style use your device\'s fonts.'), h('div', { class: 'journal' }, left, right));
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
          h('div', { class: 'tablewrap' }, h('table', { class: 'xgrid' }, h('thead', {}, h('tr', {}, h('th', {}, 'Habit'), Array.from({ length: n }, (_, i) => h('th', {}, i + 1)), h('th', {}, 'Days'))),
            h('tbody', {}, s.list.map((hb) => h('tr', {}, h('td', {}, hb, ' ', h('button', { type: 'button', onclick: () => { s.list = s.list.filter((x) => x !== hb); set('habits', s); draw(); } }, 'x')),
              Array.from({ length: n }, (_, i) => { const k = dayKey(i + 1); return h('td', { class: 'n' }, h('button', { type: 'button', class: 'xbox' + (k === today() ? ' today' : ''), 'aria-label': hb + ' ' + k, 'aria-pressed': String(!!(s.ticks[k] || {})[hb]), onclick: () => { (s.ticks[k] = s.ticks[k] || {})[hb] = !(s.ticks[k] || {})[hb]; set('habits', s); draw(); } }, (s.ticks[k] || {})[hb] ? '×' : '')); }),
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
