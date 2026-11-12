/* Meditation - a quiet timer with a start bell, interval bells and an end bell, a breathing pacer,
   and a private log of your sittings with streaks. Built on tracker.js.
   The bells are made in your browser with the Web Audio API: no sound files are downloaded.
   If you have a medical or mental-health condition, meditation can sometimes bring up difficult feelings:
   go gently, and talk to a professional if it is distressing. This is not medical advice. */

/** Play one bell-like sound. The sound comes from sounds.js (bell, bowl, chime, gong, wood); `freq` is the pitch in Hz. */
function bell(freq) { PBEsound.strike(bell.sound || 'bell', bell.sound === 'bell' || !bell.sound ? freq : undefined); }
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
/** Breathing patterns: [name, [[phase, seconds], ...]] */
const PACERS = { 'None': [], 'Box breathing (4-4-4-4)': [['In', 4], ['Hold', 4], ['Out', 4], ['Hold', 4]], 'Relaxing breath (4-7-8)': [['In', 4], ['Hold', 7], ['Out', 8]], 'Even breath (5-5)': [['In', 5], ['Out', 5]], 'Longer out-breath (4-6)': [['In', 4], ['Out', 6]] };

PBE.tool({
  id: 'meditation',
  title: 'Meditation',
  /* made-up example sittings: most days over two months */
  example: ({ daysAgo, rnd, pick }) => ({
    sits: Array.from({ length: 62 }, (_, i) => i).filter((i) => rnd() < 0.75).map((i) => ({ date: daysAgo(61 - i), minutes: pick([5, 10, 10, 15, 20]), kind: pick(['Breath focus', 'Breath focus', 'Body scan', 'Loving-kindness', 'Open awareness']), before: 2 + Math.floor(rnd() * 2), after: 3 + Math.floor(rnd() * 3), notes: '' })),
  }),
  /* sliders: what does a habit add up to? */
  whatif: ({ h }) => {
    const st = { mins: 10, days: 5 }, out = h('div', {});
    const draw = () => { const yr = (st.mins * st.days * 52) / 60; PBE.fill(out, h('p', { class: 'lede' }, st.mins + ' minutes, ' + st.days + ' days a week, adds up to about ' + PBE.round(yr, 0) + ' hours in a year (' + PBE.round(yr / 24, 1) + ' full days).'), h('p', { class: 'meta' }, 'Even a few minutes counts: regular beats long.')); };
    draw();
    return h('div', {}, h('h3', {}, 'What would a habit add up to?'), PBEcharts.slider('Minutes a sitting', 1, 60, 1, st.mins, (v) => { st.mins = v; draw(); }, 'min'), PBEcharts.slider('Days a week', 1, 7, 1, st.days, (v) => { st.days = v; draw(); }), out);
  },
  notice: 'Not medical advice. If meditation brings up distress, go gently and speak to a professional. Work in progress: expect bugs. Your data stays in this browser.',
  tabs: [
    { id: 'timer', label: 'Timer', type: 'custom', render: ({ h, get, set, today }) => {
      const opts = get('timeropts', { mins: 10, every: 0, kind: 'Breath focus', pacer: 'None' });
      const wrap = h('div', {}), big = h('div', { class: 'big', style: 'font-size:64px;font-weight:300;margin:12px 0', 'aria-live': 'off' }, mmss(opts.mins * 60)), phase = h('p', { class: 'lede', 'aria-live': 'polite' }), msg = h('p', { class: 'meta', role: 'status' });
      const num = (id, label, v, ex) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value: v, step: 'any', ...ex }));
      const kind = h('select', { id: 't_kind' }, ['Breath focus', 'Body scan', 'Loving-kindness', 'Open awareness', 'Walking', 'Guided', 'Other'].map((k) => h('option', { value: k }, k)));
      const pacer = h('select', { id: 't_pacer' }, Object.keys(PACERS).map((k) => h('option', { value: k }, k)));
      const snd = h('select', { id: 't_snd' }, PBEsound.names.map((k) => h('option', { value: k }, k))), amb = h('select', { id: 't_amb' }, [['none', 'None'], ['bath', 'Sound bath (bowls over a soft drone)'], ['drone', 'Soft drone'], ['ocean', 'Ocean'], ['rain', 'Rain']].map(([v, l]) => h('option', { value: v }, l)));
      kind.value = opts.kind; pacer.value = opts.pacer; snd.value = opts.snd || 'bowl'; amb.value = opts.amb || 'none'; let stopAmb = null;
      let timer = null, endAt = 0, started = 0, nextBell = 0, total = 0;
      const stop = (finished) => {
        if (timer) clearInterval(timer); timer = null; if (stopAmb) { stopAmb(); stopAmb = null; }
        const done = Math.round((Math.min(Date.now(), endAt) - started) / 60000);
        startBtn.textContent = 'Start'; phase.textContent = '';
        if (finished) { bell(396); PBE.fill(msg, 'Finished. ', h('button', { type: 'button', onclick: () => save(opts.mins) }, 'Save this sitting to the log')); }
        else if (done >= 1) PBE.fill(msg, 'Stopped after about ' + done + ' min. ', h('button', { type: 'button', onclick: () => save(done) }, 'Save it to the log'));
        big.textContent = mmss(opts.mins * 60);
      };
      const save = (mins) => { const rows = get('sits', []); rows.push({ date: today(), minutes: mins, kind: kind.value, before: '', after: '', notes: '' }); set('sits', rows); msg.textContent = 'Saved to the log.'; };
      const tick = () => {
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); big.textContent = mmss(left);
        if (opts.every > 0 && Date.now() >= nextBell && left > 0) { bell(660); nextBell += opts.every * 60000; }
        const steps = PACERS[opts.pacer] || [];
        if (steps.length) { const cycle = steps.reduce((s, p) => s + p[1], 0); let t = ((Date.now() - started) / 1000) % cycle; for (const [name, secs] of steps) { if (t < secs) { phase.textContent = name + ' ' + (Math.floor(secs - t) + 1); break; } t -= secs; } }
        if (left <= 0) stop(true);
      };
      const startBtn = h('button', { type: 'button', onclick: () => {
        if (timer) { stop(false); return; }
        opts.mins = Number(document.getElementById('t_mins').value) || 10; opts.every = Number(document.getElementById('t_every').value) || 0; opts.kind = kind.value; opts.pacer = pacer.value; opts.snd = snd.value; opts.amb = amb.value; bell.sound = snd.value; set('timeropts', opts); if (opts.amb !== 'none') stopAmb = PBEsound.ambient(opts.amb);
        started = Date.now(); total = opts.mins * 60000; endAt = started + total; nextBell = opts.every > 0 ? started + opts.every * 60000 : Infinity;
        bell(528); msg.textContent = ''; startBtn.textContent = 'Stop'; timer = setInterval(tick, 250); tick();
      } }, 'Start');
      wrap.append(h('p', { class: 'meta' }, 'Set a length, optional interval bells, and a breathing pacer if you want one. Keep this tab open while you sit. Bells are generated in your browser: make sure your sound is on.'),
        h('div', { class: 'form' }, num('t_mins', 'Minutes', opts.mins, { min: 1 }), num('t_every', 'Bell every (minutes, 0 for none)', opts.every, { min: 0 }), h('label', { class: 'fld' }, 'Style', kind), h('label', { class: 'fld' }, 'Breathing pacer', pacer), h('label', { class: 'fld' }, 'Bell sound', snd), h('label', { class: 'fld' }, 'Background sound', amb)),
        h('p', {}, h('button', { type: 'button', onclick: () => { bell.sound = snd.value; bell(528); } }, 'Hear the bell sound')),
        big, phase, h('p', {}, startBtn), msg);
      return wrap;
    } },
    { id: 'sits', label: 'Log', type: 'log', addLabel: 'Add a sitting by hand', intro: 'Sittings saved from the timer appear here. Add earlier ones, and note how you felt, 1 (low or restless) to 5 (calm or clear).',
      required: ['minutes'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'minutes', label: 'Minutes', type: 'number', step: 1 }, { key: 'kind', label: 'Style', type: 'select', options: ['Breath focus', 'Body scan', 'Loving-kindness', 'Open awareness', 'Walking', 'Guided', 'Other'], keep: true }, { key: 'before', label: 'Before (1-5)', type: 'number', min: 1, max: 5, step: 1 }, { key: 'after', label: 'After (1-5)', type: 'number', min: 1, max: 5, step: 1 }, { key: 'notes', label: 'Notes' }],
      summary: (r) => {
        const days = [...new Set(r.map((x) => x.date))];
        // streak = consecutive days ending today (or yesterday, if you have not sat yet today)
        let d = days.includes(PBE.today()) ? PBE.today() : PBE.addDays(PBE.today(), -1), streak = 0;
        while (days.includes(d)) { streak++; d = PBE.addDays(d, -1); }
        return [['Sittings', r.length], ['Total minutes', r.reduce((s, x) => s + (x.minutes || 0), 0)], ['Days practised', days.length], ['Current streak (days)', streak]];
      },
      charts: [{ title: 'Minutes per sitting over time', y: 'minutes', unit: 'min' }, { title: 'Sittings by style', kind: 'bar', by: 'kind', unit: 'sittings' }, { title: 'Mood after (1-5) over time', y: 'after' }] },
    { id: 'how', label: 'Ways to practise', type: 'static', blocks: [
      { h: 'Ways to practise', p: 'Start small: five minutes a day is more useful than an hour once. If your mind wanders, that is normal: noticing and coming back is the practice.' },
      { h3: 'Breath focus', p: 'Sit comfortably. Feel the breath where it is clearest: nostrils, chest or belly. When you notice you have drifted, gently return. You can count breaths from 1 to 10 and begin again.' },
      { h3: 'Body scan', p: 'Move your attention slowly from the feet up to the head, noticing sensations without trying to change them. It also works lying down.' },
      { h3: 'Loving-kindness', p: 'Quietly repeat kind phrases (such as "may you be well, may you be at ease") first for yourself, then for someone you care about, then for others, including difficult people.' },
      { h3: 'Open awareness', p: 'Rest attention on whatever is arising, sounds, thoughts or sensations, without choosing, simply noticing.' },
      { h3: 'Breathing pacers on the timer', p: 'Box breathing (in 4, hold 4, out 4, hold 4) is used for calm focus. 4-7-8 and longer out-breaths are often used to wind down. If holding the breath makes you uncomfortable, skip the holds. Stop if you feel dizzy.' },
      { h: 'Where to learn more', list: ['NHS: "Mindfulness" (nhs.uk) for a short, careful introduction.', 'Mark Williams and Danny Penman, "Mindfulness: A practical guide to finding peace in a frantic world" (a book with an eight-week course).', 'Jon Kabat-Zinn, "Full Catastrophe Living" (the origins of mindfulness-based stress reduction).', 'Your local meditation or Buddhist centre, or a qualified teacher.'] },
      { p: 'The list is a pointer for further reading; I have not copied content from these sources.' }] },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Reflections, teachers\' words you want to remember, intentions.' },
  ],
});
