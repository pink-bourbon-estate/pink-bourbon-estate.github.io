/* Gym and Strength - a one-rep-max and working-weight calculator, strength standards, a lifts log,
   exercises by movement pattern with progressions, programme templates and mobility.
   Built on tracker.js. Not coaching and not medical advice: train within your limits, learn technique
   from a qualified coach where you can, and stop if something hurts in a sharp or unusual way. */

/* ---- the maths (plain functions, easy to test) ---- */

/** Estimated one-rep max from a set. Epley: weight x (1 + reps/30). Brzycki: weight x 36/(37 - reps). Both are rough; they are least reliable above about 10 reps. */
function est1RM(weight, reps) {
  if (!(weight > 0) || !(reps >= 1)) return 0;
  if (reps === 1) return weight;
  const epley = weight * (1 + reps / 30);
  const brzycki = reps < 37 ? (weight * 36) / (37 - reps) : epley;
  return (epley + brzycki) / 2;                                    // the average of two common formulas
}
/** Common approximate "reps you can do at a % of your one-rep max" table. A guide: people vary a lot. */
const PCT_REPS = [[100, 1], [95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15], [60, 20], [50, 30]];
/** Round a weight to the nearest step your plates allow (for example 2.5 kg). */
const toStep = (w, step) => (step > 0 ? Math.round(w / step) * step : w);

/* ---- Jeff Nippard's published strength standards (bodyweight multiples of a one-rep max) ----
   From his "How Strong Should You Be? (Noob to Freak)" page: jeffnippard.com/blogs/news/how-strong-should-you-be-noob-to-freak-1
   Each number is where that level STARTS. Below "intermediate" is beginner or noob. The page covers only squat,
   bench press and deadlift, uses bodyweight but not height, and says to enter 250 lb (about 113 kg) if you weigh more.
   Some women's beginner figures came from image captions on that page, so check the source. */
const STANDARDS = {
  male:   { squat: [1.25, 1.75, 2.5, 3.0], bench: [1.0, 1.5, 2.0, 2.25], deadlift: [1.5, 2.25, 3.0, 3.5] },
  female: { squat: [1.0, 1.5, 1.75, 2.25], bench: [0.5, 0.75, 1.0, 1.25], deadlift: [1.25, 1.75, 2.25, 3.0] },
};
const LEVELS = ['Beginner or noob', 'Intermediate', 'Advanced', 'Elite', 'Freak'];

/* ---- exercises by movement pattern, each with a progression ladder (easier first) ---- */
const PATTERNS = [
  ['Squat', ['Box squat to a high box', 'Goblet squat', 'Bodyweight squat to depth', 'Front squat', 'Back squat', 'Paused back squat', 'Pistol squat (advanced bodyweight)']],
  ['Hinge', ['Hip hinge with a dowel', 'Kettlebell deadlift', 'Romanian deadlift', 'Conventional deadlift', 'Deficit or paused deadlift', 'Single-leg Romanian deadlift']],
  ['Horizontal push', ['Wall push-up', 'Incline push-up', 'Knee push-up', 'Push-up', 'Dumbbell bench press', 'Barbell bench press', 'Paused bench press', 'Archer or weighted push-up']],
  ['Vertical push', ['Pike push-up', 'Half-kneeling landmine press', 'Seated dumbbell shoulder press', 'Standing barbell overhead press', 'Push press', 'Handstand push-up (advanced)']],
  ['Horizontal pull', ['Band row', 'Inverted row (high bar)', 'Inverted row (low bar)', 'One-arm dumbbell row', 'Barbell row', 'Chest-supported row', 'Feet-elevated inverted row']],
  ['Vertical pull', ['Dead hang', 'Band-assisted pull-up', 'Lat pulldown', 'Negative pull-up', 'Chin-up', 'Pull-up', 'Weighted pull-up']],
  ['Single leg and lunge', ['Split squat', 'Reverse lunge', 'Bulgarian split squat', 'Walking lunge', 'Step-up', 'Weighted Bulgarian split squat']],
  ['Carry and core', ['Dead bug', 'Plank', 'Side plank', 'Farmer carry', 'Suitcase carry', 'Hanging knee raise', 'Ab wheel rollout', 'Hanging leg raise']],
  ['Isolation and accessories', ['Biceps curl', 'Triceps pushdown', 'Lateral raise', 'Face pull', 'Leg curl', 'Leg extension', 'Calf raise', 'Hip thrust']],
];
const EXERCISES = [...new Set(PATTERNS.flatMap((p) => p[1]))].sort();

/* ---- programme templates: [exercise, which lift sets the weight, sets, reps, % of that lift's 1RM] ---- */
const LIFT_KEYS = { squat: 'Squat', bench: 'Bench press', deadlift: 'Deadlift', press: 'Overhead press', row: 'Barbell row' };
const PROGRAMMES = {
  'Full body, 3 days a week': { A: [['Back squat', 'squat', 3, 5, 80], ['Bench press', 'bench', 3, 5, 80], ['Barbell row', 'row', 3, 8, 70], ['Plank', null, 3, '30 to 60 s', 0]], B: [['Deadlift', 'deadlift', 3, 5, 80], ['Overhead press', 'press', 3, 6, 75], ['Pull-up or pulldown', null, 3, 'AMRAP', 0], ['Split squat', 'squat', 3, 8, 50]], note: 'Alternate A, B, A one week and B, A, B the next, with a rest day between sessions.' },
  'Upper and lower, 4 days a week': { 'Upper 1': [['Bench press', 'bench', 4, 5, 80], ['Barbell row', 'row', 4, 6, 75], ['Overhead press', 'press', 3, 8, 70], ['Pull-up or pulldown', null, 3, 8, 0], ['Biceps curl and triceps pushdown', null, 2, 12, 0]], 'Lower 1': [['Back squat', 'squat', 4, 5, 80], ['Romanian deadlift', 'deadlift', 3, 8, 60], ['Split squat', 'squat', 3, 10, 45], ['Calf raise', null, 3, 12, 0]], 'Upper 2': [['Overhead press', 'press', 4, 5, 80], ['Bench press', 'bench', 3, 8, 70], ['Barbell row', 'row', 3, 10, 65], ['Lateral raise and face pull', null, 3, 15, 0]], 'Lower 2': [['Deadlift', 'deadlift', 3, 4, 82], ['Front or paused squat', 'squat', 3, 6, 65], ['Hip thrust', null, 3, 10, 0], ['Leg curl', null, 3, 12, 0]], note: 'Typically Monday, Tuesday, Thursday, Friday.' },
  'Push, pull, legs (repeat twice, 6 days)': { Push: [['Bench press', 'bench', 4, 6, 78], ['Overhead press', 'press', 3, 8, 70], ['Incline dumbbell press', null, 3, 10, 0], ['Lateral raise', null, 3, 15, 0], ['Triceps pushdown', null, 3, 12, 0]], Pull: [['Deadlift', 'deadlift', 3, 5, 80], ['Barbell row', 'row', 4, 8, 70], ['Pull-up or pulldown', null, 3, 8, 0], ['Face pull', null, 3, 15, 0], ['Biceps curl', null, 3, 12, 0]], Legs: [['Back squat', 'squat', 4, 6, 78], ['Romanian deadlift', 'deadlift', 3, 8, 60], ['Leg press or split squat', null, 3, 10, 0], ['Leg curl', null, 3, 12, 0], ['Calf raise', null, 4, 12, 0]], note: 'Push, Pull, Legs, then again. Rest one day a week. This is a lot of volume: start with fewer sets and build up.' },
};

/* ---- the tabs ---- */
PBE.tool({
  id: 'gym-and-strength',
  title: 'Gym and Strength',
  /* made-up example lifts: twelve weeks of slow progress on four lifts */
  example: ({ daysAgo, rnd }) => ({
    lifts: [['Back squat', 90, 5], ['Bench press', 62.5, 5], ['Deadlift', 110, 5], ['Standing barbell overhead press', 40, 6]].flatMap(([exercise, w0, reps], k) => Array.from({ length: 12 }, (_, i) => ({ date: daysAgo(84 - i * 7 - k), exercise, weight: Math.round((w0 + i * 2.5 + (rnd() > 0.7 ? 0 : 0)) / 2.5) * 2.5, reps: reps - (rnd() > 0.8 ? 1 : 0), sets: 3, rpe: 7 + Math.round(rnd() * 3 * 2) / 2 / 2, notes: '' }))),
    shoulder: Array.from({ length: 14 }, (_, i) => ({ date: daysAgo(40 - i * 3), side: 'Right', activity: ['Bench press', 'Overhead press', 'Pull-up', 'Warm-up'][i % 4], pain: Math.max(0, Math.round(4 - i * 0.2 + (i % 4 === 1 ? 2 : 0))), where: 'front', notes: '' })),
    prog: [{ date: daysAgo(70), pattern: 'Horizontal push', exercise: 'Incline push-up', step: 2, result: '3 x 10', notes: '' }, { date: daysAgo(40), pattern: 'Horizontal push', exercise: 'Push-up', step: 4, result: '3 x 8', notes: '' }, { date: daysAgo(10), pattern: 'Horizontal push', exercise: 'Push-up', step: 4, result: '3 x 12', notes: '' }, { date: daysAgo(60), pattern: 'Vertical pull', exercise: 'Band-assisted pull-up', step: 3, result: '3 x 6', notes: '' }, { date: daysAgo(15), pattern: 'Vertical pull', exercise: 'Negative pull-up', step: 4, result: '3 x 5', notes: '' }],
  }),
  /* sliders: how much do you need to lift to reach each level at your bodyweight? */
  whatif: ({ h, round }) => {
    const st = { bw: 80, sex: 'male', lift: 'squat', w: 100, r: 5 }, out = h('div', {});
    const sel = h('select', {}, [['male', 'Male'], ['female', 'Female']].map(([v, l]) => h('option', { value: v }, l)));
    const lift = h('select', {}, ['squat', 'bench', 'deadlift'].map((v) => h('option', { value: v }, v)));
    const draw = () => {
      const eff = Math.min(st.bw, 113.4), orm = est1RM(st.w, st.r), b = STANDARDS[st.sex][st.lift], x = orm / eff; let lv = 0; b.forEach((t, i) => { if (x >= t) lv = i + 1; });
      PBE.fill(out, h('p', { class: 'lede' }, 'A set of ' + st.w + ' kg for ' + st.r + ' reps is about a ' + round(orm) + ' kg one-rep max: ' + round(x, 2) + ' x bodyweight, which is ' + LEVELS[lv].toLowerCase() + '.'),
        h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Level', 'Needs a 1RM of'].map((x2) => h('th', {}, x2)))), h('tbody', {}, b.map((m, i) => h('tr', {}, h('td', {}, LEVELS[i + 1] + ' starts at ' + m + ' x'), h('td', { class: 'n' }, round(m * eff) + ' kg')))))),
        h('p', { class: 'meta' }, 'From Jeff Nippard\'s published standards: see the Strength standards tab.'));
    };
    sel.addEventListener('change', () => { st.sex = sel.value; draw(); }); lift.addEventListener('change', () => { st.lift = lift.value; draw(); }); draw();
    return h('div', {}, h('h3', {}, 'Where would a set put you?'), h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Sex', sel), h('label', { class: 'fld' }, 'Lift', lift)),
      PBEcharts.slider('Bodyweight', 40, 130, 1, st.bw, (v) => { st.bw = v; draw(); }, 'kg'), PBEcharts.slider('Weight lifted', 20, 300, 2.5, st.w, (v) => { st.w = v; draw(); }, 'kg'), PBEcharts.slider('Reps', 1, 12, 1, st.r, (v) => { st.r = v; draw(); }), out);
  },
  notice: 'Not coaching or medical advice. Work in progress: expect bugs. Learn technique from a qualified coach if you can, and stop if anything hurts sharply. Your data stays in this browser.',
  tabs: [
    /* 1. one-rep-max calculator */
    { id: 'orm', label: '1RM calculator', type: 'custom', render: ({ h, get, set, round }) => {
      const s = get('orm', { w: 100, r: 5, step: 2.5 });
      const out = h('div', {});
      const field = (id, label, v, extra) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value: v, step: 'any', min: 0, ...extra }));
      const draw = () => {
        const w = Number(document.getElementById('o_w').value), r = Number(document.getElementById('o_r').value), step = Number(document.getElementById('o_s').value) || 0;
        set('orm', { w, r, step });
        const orm = est1RM(w, r);
        if (!orm) { PBE.fill(out, h('p', { class: 'meta' }, 'Enter a weight and a number of reps.')); return; }
        const goals = [['Strength', '3 to 5 sets of 3 to 6 reps', 80, 90], ['Muscle growth', '3 to 4 sets of 6 to 12 reps', 65, 80], ['Endurance', '2 to 3 sets of 12 to 20 reps', 50, 65]];
        PBE.fill(out, h('p', { class: 'lede' }, 'Estimated one-rep max: ' + round(orm) + ' kg'),
          h('p', { class: 'meta' }, r > 10 ? 'Above about 10 reps this estimate is rough: a heavier set of fewer reps gives a better guess.' : 'An estimate: your real max depends on technique, fatigue and the day.'),
          h('h3', {}, 'Weight at each percentage'),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['% of 1RM', 'Weight', 'About how many reps'].map((x) => h('th', {}, x)))), h('tbody', {}, PCT_REPS.map(([p, rp]) => h('tr', {}, h('td', {}, p + ' %'), h('td', { class: 'n' }, round(toStep(orm * p / 100, step), 1) + ' kg'), h('td', { class: 'n' }, rp)))))),
          h('h3', {}, 'Working sets by goal'),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Goal', 'Typical sets and reps', 'Weight range'].map((x) => h('th', {}, x)))), h('tbody', {}, goals.map(([g, sr, lo, hi]) => h('tr', {}, h('td', {}, g), h('td', {}, sr), h('td', { class: 'n' }, round(toStep(orm * lo / 100, step), 1) + ' to ' + round(toStep(orm * hi / 100, step), 1) + ' kg')))))),
          h('p', { class: 'meta' }, 'These are common starting ranges used in strength training, not rules. If a set feels easier or harder than expected, change the weight. The reps-at-percentage table is an approximation: people vary.'));
      };
      const form = h('div', { class: 'form' }, field('o_w', 'Weight lifted (kg)', s.w), field('o_r', 'Reps done', s.r, { step: 1, max: 30 }), field('o_s', 'Round to nearest (kg)', s.step, { step: 0.25 }));
      form.addEventListener('input', draw); setTimeout(draw, 0);
      return h('div', {}, h('p', { class: 'meta' }, 'Enter a hard set you have done and it estimates your one-rep max (the average of the Epley and Brzycki formulas), then works out the weights for other percentages and sets.'), form, out);
    } },
    /* 2. strength standards */
    { id: 'std', label: 'Strength standards', type: 'custom', render: ({ h, get, set, round }) => {
      const s = get('std', { sex: 'male', bw: 80, squat: '', bench: '', deadlift: '' });
      const out = h('div', {});
      const sel = h('select', { id: 's_sex' }, [['male', 'Male'], ['female', 'Female']].map(([v, l]) => h('option', { value: v }, l)));
      sel.value = s.sex;
      const num = (id, label, v) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value: v, step: 'any', min: 0 }));
      const draw = () => {
        const sex = sel.value, bw = Number(document.getElementById('s_bw').value);
        const lifts = ['squat', 'bench', 'deadlift'], vals = {}; lifts.forEach((k) => { vals[k] = Number(document.getElementById('s_' + k).value); });
        set('std', { sex, bw, ...vals });
        const eff = Math.min(bw, 113.4), cap = bw > 113.4;
        const rows = lifts.filter((k) => vals[k] > 0 && eff > 0).map((k) => {
          const b = STANDARDS[sex][k], x = vals[k] / eff; let lv = 0; b.forEach((t, i) => { if (x >= t) lv = i + 1; });
          const next = lv < 4 ? round(b[lv] * eff) + ' kg (' + b[lv] + ' x bodyweight)' : 'top of the chart';
          return h('tr', {}, h('td', {}, k[0].toUpperCase() + k.slice(1)), h('td', { class: 'n' }, vals[k] + ' kg'), h('td', { class: 'n' }, round(x, 2) + ' x'), h('td', {}, LEVELS[lv]), h('td', {}, lv < 4 ? 'Next level (' + LEVELS[lv + 1] + ') starts at ' + next : next));
        });
        PBE.fill(out, rows.length ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Lift', 'Your 1RM', 'x Bodyweight', 'Level', 'Goal'].map((x) => h('th', {}, x)))), h('tbody', {}, rows))) : h('p', { class: 'meta' }, 'Enter your bodyweight and at least one one-rep max (the 1RM tab can estimate it).'),
          cap ? h('p', { class: 'meta' }, 'Bodyweight over about 113 kg (250 lb) is entered as 113 kg, following the source page.') : null);
      };
      const form = h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Sex (the source gives separate tables)', sel), num('s_bw', 'Bodyweight (kg)', s.bw), num('s_squat', 'Squat 1RM (kg)', s.squat), num('s_bench', 'Bench press 1RM (kg)', s.bench), num('s_deadlift', 'Deadlift 1RM (kg)', s.deadlift));
      form.addEventListener('input', draw); setTimeout(draw, 0);
      const tbl = (sex) => h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Lift', 'Intermediate from', 'Advanced from', 'Elite from', 'Freak from'].map((x) => h('th', {}, x)))), h('tbody', {}, ['squat', 'bench', 'deadlift'].map((k) => h('tr', {}, h('td', {}, k), STANDARDS[sex][k].map((v) => h('td', { class: 'n' }, v + ' x')))))));
      return h('div', {}, h('p', { class: 'meta' }, 'Where do your lifts sit against Jeff Nippard\'s published bodyweight standards? These are for a one-rep max, natural, fairly lean lifters, with squat to depth and a paused bench. Height is not part of his chart, so it is not used here.'), form, out,
        h('h3', {}, 'The standards (multiples of bodyweight)'), h('p', { class: 'meta' }, 'Men'), tbl('male'), h('p', { class: 'meta' }, 'Women'), tbl('female'),
        h('p', { class: 'meta' }, 'Source: ', h('a', { href: 'https://jeffnippard.com/blogs/news/how-strong-should-you-be-noob-to-freak-1', rel: 'noopener noreferrer' }, 'Jeff Nippard, "How Strong Should You Be? (Noob to Freak)"'), '. I summarised his table by hand; some beginner figures for women came from picture captions there, so please check the original. Other published standards (for example from strengthlevel.com) differ.'));
    } },
    /* 3. the lifts log */
    { id: 'lifts', label: 'Lifts log', type: 'log', addLabel: 'Log a set', intro: 'Log your hardest or main set for an exercise. The estimated one-rep max is worked out for you, and you can chart it per exercise. Choose the exercise filter to see just one lift.',
      required: ['exercise', 'weight', 'reps'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'exercise', label: 'Exercise', type: 'select', options: EXERCISES, keep: true }, { key: 'weight', label: 'Weight', type: 'number', unit: 'kg' }, { key: 'reps', label: 'Reps', type: 'number', step: 1 }, { key: 'sets', label: 'Sets', type: 'number', step: 1, default: 3, keep: true }, { key: 'rpe', label: 'RPE (effort, 1-10)', type: 'number', min: 1, max: 10, step: 0.5 }, { key: 'notes', label: 'Notes' }],
      filterBy: 'exercise',
      computed: [{ key: 'orm', label: 'Est. 1RM (kg)', fn: (r) => (r.weight && r.reps ? round1(est1RM(r.weight, r.reps)) : '') }, { key: 'vol', label: 'Volume (kg)', fn: (r) => (r.weight && r.reps ? r.weight * r.reps * (r.sets || 1) : '') }],
      summary: (r) => { const best = Math.max(0, ...r.map((x) => est1RM(x.weight, x.reps))); return [['Sets logged', r.length], ['Best est. 1RM', round1(best) + ' kg'], ['Total volume', Math.round(r.reduce((s, x) => s + (x.weight || 0) * (x.reps || 0) * (x.sets || 1), 0)) + ' kg']]; },
      charts: [{ title: 'Estimated 1RM over time', y: 'orm', unit: 'kg' }, { title: 'Weight lifted over time', y: 'weight', unit: 'kg' }, { title: 'Sets by exercise', kind: 'bar', by: 'exercise', unit: 'sets' }] },
    /* 4. exercise list by movement pattern */
    { id: 'ex', label: 'Exercises', type: 'static', blocks: [
      { h: 'Exercises by movement pattern', p: 'Each list goes from easier to harder: move to the next one when you can do the current one with good technique for the top of your rep range on every set (for example 3 sets of 10), then use the Progressions tab to record it.' },
      ...PATTERNS.map(([n, list]) => ({ h3: n, list })),
      { p: 'Progression ladders here are a general guide. Use any ordering your coach suggests, and include pain-free movements only.' }] },
    /* 5. progression tracker */
    { id: 'prog', label: 'Progressions', type: 'log', addLabel: 'Record where you are', intro: 'For each exercise, note which step of its ladder you are on, and what you managed. Over time you see how you moved up.',
      required: ['exercise', 'step'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'pattern', label: 'Pattern', type: 'select', options: PATTERNS.map((p) => p[0]), keep: true }, { key: 'exercise', label: 'Exercise or step you are on' }, { key: 'step', label: 'Step on the ladder (1 = easiest)', type: 'number', step: 1 }, { key: 'result', label: 'What you managed (e.g. 3 x 8)' }, { key: 'notes', label: 'Notes' }],
      filterBy: 'pattern', charts: [{ title: 'Ladder step over time', y: 'step' }, { title: 'Entries by pattern', kind: 'bar', by: 'pattern', unit: 'entries' }] },
    /* 6. programmes */
    { id: 'plan', label: 'Programmes', type: 'custom', render: ({ h, get, set, round }) => {
      const s = get('plan', { name: Object.keys(PROGRAMMES)[0], step: 2.5, squat: '', bench: '', deadlift: '', press: '', row: '' });
      const sel = h('select', { id: 'p_name' }, Object.keys(PROGRAMMES).map((n) => h('option', { value: n }, n)));
      sel.value = s.name;
      const out = h('div', {});
      const draw = () => {
        const name = sel.value, step = Number(document.getElementById('p_step').value) || 0, one = {};
        Object.keys(LIFT_KEYS).forEach((k) => { one[k] = Number(document.getElementById('p_' + k).value); });
        set('plan', { name, step, ...one });
        const prog = PROGRAMMES[name];
        PBE.fill(out, ...Object.keys(prog).filter((d) => d !== 'note').map((day) => h('div', {}, h('h3', {}, day),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Exercise', 'Sets x reps', 'Weight'].map((x) => h('th', {}, x)))), h('tbody', {}, prog[day].map(([ex, key, sets, reps, pct]) => h('tr', {}, h('td', {}, ex), h('td', {}, sets + ' x ' + reps), h('td', { class: 'n' }, key && one[key] ? round(toStep(one[key] * pct / 100, step), 1) + ' kg (' + pct + ' %)' : key ? 'enter the ' + LIFT_KEYS[key] + ' 1RM above' : 'choose a weight that leaves 1 to 3 reps spare')))))))),
          h('p', { class: 'meta' }, prog.note), h('p', { class: 'meta' }, 'Templates are simple, common structures, not a prescription. Add weight when you finish every set and rep with good technique, deload (lighter week) if you feel run down, and change what does not suit you.'));
      };
      const num = (k) => h('label', { class: 'fld' }, LIFT_KEYS[k] + ' 1RM (kg)', h('input', { id: 'p_' + k, type: 'number', step: 'any', min: 0, value: s[k] }));
      const form = h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Programme', sel), h('label', { class: 'fld' }, 'Round weights to (kg)', h('input', { id: 'p_step', type: 'number', step: 'any', value: s.step })), Object.keys(LIFT_KEYS).map(num));
      form.addEventListener('input', draw); setTimeout(draw, 0);
      return h('div', {}, h('p', { class: 'meta' }, 'Pick a template and enter your one-rep maxes (the 1RM tab can estimate them). It works out the weights for each day.'), form, out);
    } },
    /* 7. conjugate / Westside */
    { id: 'conj', label: 'Conjugate (Westside)', type: 'custom', render: ({ h, get, set, round }) => {
      const s = get('conj', { squat: '', bench: '', dl: '', wave: 1, step: 2.5 });
      const out = h('div', {});
      const num = (id, label, v) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value: v, step: 'any', min: 0 }));
      const wave = h('select', { id: 'c_wave' }, [1, 2, 3].map((w) => h('option', { value: w }, 'Week ' + w + ' of the 3-week wave')));
      wave.value = s.wave;
      const draw = () => {
        const sq = Number(document.getElementById('c_sq').value), bp = Number(document.getElementById('c_bp').value), dl = Number(document.getElementById('c_dl').value), w = Number(wave.value), step = Number(document.getElementById('c_st').value) || 0;
        set('conj', { squat: sq, bench: bp, dl, wave: w, step });
        const W = (x, p) => (x ? round(toStep(x * p / 100, step), 1) + ' kg' : 'enter the 1RM');
        const sqP = [50, 55, 60][w - 1], dlP = [50, 55, 60][w - 1], bpP = [40, 45, 50][w - 1], sqSets = w === 3 ? 6 : 8, dlSets = w === 3 ? 8 : 10;
        PBE.fill(out, h('h3', {}, 'Dynamic effort wave, week ' + w),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Lift', 'Sets x reps', '% of 1RM', 'Bar weight (before bands or chains)', 'Rest'].map((x) => h('th', {}, x)))), h('tbody', {},
            h('tr', {}, h('td', {}, 'Box squat (wide stance)'), h('td', {}, sqSets + ' x 3'), h('td', { class: 'n' }, sqP + ' %'), h('td', { class: 'n' }, W(sq, sqP)), h('td', {}, 'every 60 s')),
            h('tr', {}, h('td', {}, 'Speed deadlift (sumo)'), h('td', {}, dlSets + ' x 2'), h('td', { class: 'n' }, dlP + ' %'), h('td', { class: 'n' }, W(dl, dlP)), h('td', {}, 'every 60 s')),
            h('tr', {}, h('td', {}, 'Speed bench'), h('td', {}, '9 x 3'), h('td', { class: 'n' }, bpP + ' %'), h('td', { class: 'n' }, W(bp, bpP)), h('td', {}, 'every 45 s, change grip every 3 sets'))))),
          h('p', { class: 'meta' }, 'Figures follow the weekly template in the box-programming overview (see sources below). The intent is to move the bar as fast as you can: if it slows down, lower the weight. Add bands or chains if you have them (about 25 to 30 % of the load at the top, per that template), and remember the bar weight in the table is the part on the bar before band or chain tension.'));
      };
      const form = h('div', { class: 'form' }, num('c_sq', 'Squat 1RM (kg)', s.squat), num('c_bp', 'Bench press 1RM (kg)', s.bench), num('c_dl', 'Deadlift 1RM (kg)', s.dl), h('label', { class: 'fld' }, 'Wave week', wave), num('c_st', 'Round to (kg)', s.step));
      form.addEventListener('input', draw); setTimeout(draw, 0);
      const prilepin = [['55 to 65 %', '3 to 6', '24', '18 to 30'], ['70 to 75 %', '3 to 6', '18', '12 to 24'], ['80 to 85 %', '2 to 4', '15', '10 to 20'], ['90 % and over', '1 to 2', '7', '4 to 10']];
      return h('div', {}, h('p', { class: 'lede' }, 'Conjugate means "joined together": strength, speed and work capacity are all trained in the same week, every week, instead of in separate blocks. It is the approach Louie Simmons developed at Westside Barbell in Columbus, Ohio, borrowing ideas from Soviet-bloc sports science.'),
        h('h2', {}, 'The three methods'),
        h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Method', 'Purpose', 'How it looks'].map((x) => h('th', {}, x)))), h('tbody', {},
          h('tr', {}, h('td', {}, 'Max effort'), h('td', {}, 'Absolute strength'), h('td', {}, 'Work up to a top single (or triple) on a rotating variation: floor press, box squat, rack pull, good morning. Change the exercise every week or two so you can keep hitting near-maximal loads without stalling.')),
          h('tr', {}, h('td', {}, 'Dynamic effort'), h('td', {}, 'Speed and rate of force development'), h('td', {}, 'Light-to-moderate loads moved as fast as possible, many low-rep sets with short rest, often against bands or chains.')),
          h('tr', {}, h('td', {}, 'Repetition effort'), h('td', {}, 'Muscle size, work capacity, weak points'), h('td', {}, 'Accessory and "special" exercises for 3 to 4 sets of about 8 to 10, picked to fix what limits your main lifts.'))))),
        h('h2', {}, 'Dynamic effort calculator'), form, out,
        h('h2', {}, 'A week in the template'),
        h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Day', 'Session', 'Main work'].map((x) => h('th', {}, x)))), h('tbody', {}, [
          ['Mon', 'Max effort lower', 'Rotating variation (rack deadlift below the knee, high box squat, sumo deadlift off mats...). Build to a 1RM in 6 to 8 sets, then 2 special exercises, abs and band work.'],
          ['Tue', 'Strongman endurance', 'Sled pushes and drags, farmer or front-rack carries, in a timed circuit.'],
          ['Wed', 'Dynamic effort upper', 'Speed bench 9 x 3 at 40 to 50 %, every 45 s, changing grip every 3 sets. Special exercises, abs, band work.'],
          ['Thu', 'Cardiac output', '30 to 60 minutes of steady cyclical work: row, bike or treadmill.'],
          ['Fri', 'Dynamic effort lower', 'Box squat and speed deadlift (table above), then jumps (about 20 to 25) and special exercises.'],
          ['Sat', 'Max effort upper', 'Rotating variation (floor press, seated press, dead press off pins). Build to a 1RM in 6 to 8 sets, then special exercises.'],
          ['Sun', 'Low-intensity', 'Heart rate under about 130: a long, light walk or sled walk.']].map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))),
        h('p', { class: 'meta' }, 'A common simpler version is four days: max effort lower, dynamic effort upper, dynamic effort lower, max effort upper, with at least 72 hours between a max effort and a dynamic effort day for the same body part. The week planner tab has both as templates.'),
        h('h3', {}, 'Rotation'), h('ul', {}, h('li', {}, 'Max effort variations: change weekly (or every two weeks) and retest your competition lifts about every 12 weeks.'), h('li', {}, 'Special exercises: change every 1 to 3 weeks.'), h('li', {}, 'Dynamic effort: change the box height, stance, bar or bands every 3 weeks, in a three-week "wave" where the percentage rises each week then resets.')),
        h('h3', {}, 'Max-effort variations to rotate'), h('p', { class: 'meta' }, 'Lower: box squat (high, parallel, low), safety-squat-bar squat or good morning, rack pull below the knee, deficit or sumo deadlift, front squat, pause squat. Upper: floor press, board press, close-grip bench, seated or standing overhead press, dead press from pins, incline press.'),
        h('h3', {}, 'Special exercises for weak points'), h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Where you stall', 'Often used'].map((x) => h('th', {}, x)))), h('tbody', {}, [['Bottom of the squat or off the floor', 'Good mornings, Romanian deadlifts, glute-ham raise, reverse hyperextension, front squat'], ['Lockout of the bench', 'Triceps work: close-grip press, board press, band pushdowns, JM press'], ['Off the chest', 'Pause bench, dumbbell press, upper-back rows, face pulls'], ['Sticking point mid-range', 'Pin or box work at that height, bands or chains'], ['Core and trunk', 'Weighted ab work, side bends, holds']].map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))),
        h('h3', {}, 'Prilepin\'s chart (how many reps to do at a percentage)'), h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Intensity', 'Reps per set', 'Optimal total reps', 'Range of total reps'].map((x) => h('th', {}, x)))), h('tbody', {}, prilepin.map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))),
        h('p', { class: 'meta' }, 'Prilepin\'s table comes from Soviet weightlifting research and is widely quoted: I have written it from memory of those published figures, so check it before relying on it. The box-programming overview recommends no more than 4 singles over 90 % on the lower max-effort day and 3 on the upper.'),
        h('h3', {}, 'Common mistakes'), h('ul', {}, h('li', {}, 'Treating dynamic effort as a grind: it should be fast and crisp.'), h('li', {}, 'Never rotating the max effort lift, so it stops working.'), h('li', {}, 'Doing too much because every day feels important: keep intensity and volume in balance.'), h('li', {}, 'Choosing accessories at random instead of from your own weak points.')),
        h('h3', {}, 'Sources'), h('ul', {}, h('li', {}, h('a', { href: 'https://www.westside-barbell.com/a/blog/what-the-conjugate-method-actually-is', rel: 'noopener noreferrer' }, 'Westside Barbell, "What the Conjugate Method Actually Is"'), ' (concept and the three methods; it gives no percentages).'), h('li', {}, h('a', { href: 'https://boxprogramming.com/an-overview-of-the-conjugate-method/', rel: 'noopener noreferrer' }, 'Box Programming, "The Conjugate Method Explained"'), ' (the weekly template and the dynamic effort percentages above).'), h('li', {}, 'Louie Simmons, "The Westside Barbell Book of Methods" (his own full programming).')),
        h('p', { class: 'meta' }, 'Conjugate suits lifters who like variety and have some experience; many beginners progress faster on simpler plans. It is a lot of volume of near-maximal work, so recover well.'));
    } },
    /* 8. golden and silver era */
    { id: 'golden', label: 'Golden and silver era', type: 'custom', render: ({ h, get, set, round }) => {
      const COURSES = {
        'Course 1 (8 weeks)': { rep: '8 to 10', setsBy: (w) => (w <= 2 ? 1 : w <= 5 ? 2 : 3), weeks: 8, ex: ['Two-arm press', 'Squat', 'Straight-arm pullover', 'Toe raise (2 sets, one per leg, 10 reps)', 'Shoulder shrugs', 'Bent-over rowing', 'Barbell curls', 'Wrist roller', 'Neck resistance', 'Sit-ups'] },
        'Course 2 (6 weeks)': { rep: '10', setsBy: () => 3, weeks: 6, ex: ['Press behind neck', 'Front squat', 'Bent-arm pullover on bench with barbell', 'Toe raise (3 x 20)', 'Bench press', 'French curl', 'One-arm dumbbell row', 'Dumbbell curl', 'Wrist curl with barbell', 'Side bends'] },
        'Course 3 (8 weeks)': { rep: '10', setsBy: (w) => (w <= 4 ? 3 : 4), weeks: 8, ex: ['Dumbbell press', 'Standing lateral raise', 'Squat', 'Straight-arm pullover on bench with dumbbell', 'Toe raise with partner (4 x 30)', 'Incline dumbbell bench press', 'Lying lateral raise', 'Dumbbell triceps curl', 'Stiff-leg deadlift', 'Chin-ups', 'Incline dumbbell curl', 'Central loading curls', 'Sit-ups on abdominal bench', 'Side bends', 'Reverse barbell curls'] },
        'Course 4 (8 weeks)': { rep: '8', setsBy: () => 3, weeks: 8, ex: ['Press behind neck', 'Dumbbell press', 'Front squat', 'Bent-arm pullover on bench with barbell', 'Toe raise with partner (5 x 30)', 'Incline dumbbell bench press', 'Flat dumbbell bench press', 'Overhead dumbbell triceps curl', 'Parallel-bar dips or lying barbell triceps curl', 'Shoulder shrugs', 'Upright rowing', 'Barbell curl', 'Seated dumbbell curl', 'Leg raises on a chinning bar'] },
      };
      const sel = h('select', {}, Object.keys(COURSES).map((c) => h('option', { value: c }, c))), wk = h('input', { type: 'number', min: 1, max: 8, value: 1, style: 'width:80px' });
      const out = h('div', {});
      const draw = () => { const c = COURSES[sel.value], w = Math.min(Math.max(1, Number(wk.value) || 1), c.weeks); PBE.fill(out, h('p', { class: 'lede' }, sel.value + ', week ' + w + ': ' + c.setsBy(w) + ' set' + (c.setsBy(w) > 1 ? 's' : '') + ' of ' + c.rep + ' reps on each exercise (except where noted).'), h('ol', {}, c.ex.map((e) => h('li', {}, e)))); };
      sel.addEventListener('change', draw); wk.addEventListener('input', draw); draw();
      const tbl = (head, rows) => h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, head.map((x) => h('th', {}, x)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
      return h('div', {}, h('p', { class: 'lede' }, 'Before the 1960s steroid era, the great physiques were built with simple full-body training done three times a week, heavy basics, plenty of food and sleep, and slow, steady progression. This tab has real routines from that era, with their sets, reps and rules, so you can follow one or borrow from it.'),
        h('p', { class: 'note' }, 'These are historical routines reproduced from the web pages listed at the end, which in turn summarise the original magazine and book sources. Their authors\' original wording is not reproduced here. Treat them as a starting point, and use your own judgement and recovery.'),
        h('h2', {}, 'Principles they share'), h('ul', {}, h('li', {}, 'Full-body sessions three times a week on non-consecutive days (Mon, Wed, Fri).'), h('li', {}, 'Compound lifts first: squats, presses, rows, pullovers, deadlifts.'), h('li', {}, 'Start light, and when you complete every set and rep, add about 2.5 kg (5 lb) next session.'), h('li', {}, 'Strict form, full range, a controlled tempo.'), h('li', {}, 'Rest 2 to 3 minutes (Reg Park) up to 3 to 5 minutes (Bill Pearl) between sets on the heavy work, shorter (45 to 60 seconds) in Steve Reeves\' style.'), h('li', {}, 'Eat plain, protein-rich food, sleep 8 hours, rest properly, log your poundages and measurements.')),
        h('h2', {}, 'Reg Park: the Mr Universe course (32 weeks)'), h('p', { class: 'meta' }, 'Four courses (8, 6, 8 and 8 weeks) with a one-week rest after courses 2 and 4, three full-body sessions a week. Start each exercise very light so every rep feels easy.'),
        h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Course', sel), h('label', { class: 'fld' }, 'Week', wk)), out,
        h('h2', {}, 'Steve Reeves: classic physique routine (1951)'), h('p', { class: 'meta' }, 'Three days a week (for example Monday, Wednesday and Saturday), every set taken to failure, 45 to 60 seconds between sets, a 2-second lift and a 3-second lowering with emphasis on the lowering. Breathing squats and pullovers were used to expand the rib cage.'),
        tbl(['Exercise', 'Sets', 'Reps'], [['Incline dumbbell press', '3', '8 to 12, dropping weight'], ['Breathing front squat (superset with the next)', '3', '15'], ['Dumbbell laterals or flyes', '3', '15'], ['Seated barbell curls', '3', '12, slow lowering'], ['Alternate dumbbell forward raise', '2', '15'], ['Bent-over rows', '2', '12'], ['One-arm rows', '2', '12'], ['Barbell split squats', '1', 'until breathless'], ['Lying alternate raise', '2', '15'], ['Good mornings', '1', '15'], ['Dumbbell French press', '3', '12'], ['Calf raises (leg press)', '1', '30 to 40'], ['Bench press', '2', '12']]),
        h('h2', {}, 'Bill Pearl: Bulk and Power routine (3 courses of 6 weeks)'), h('p', { class: 'meta' }, 'Three non-consecutive full-body sessions a week. Everyone starts on course one, using about two-thirds of a maximum, resting 3 to 5 minutes between heavy sets, and adding 2.5 kg once every set and rep is done. The single-set exercises at the start are warm-ups.'),
        tbl(['Course', 'Main work (sets x reps)'], [['1', 'Breathing squats 2x15 (with bent-arm laterals), bench press 2x8, rowing 2x8, press behind neck 2x8, two-hand barbell curl 2x8, bent-leg deadlifts 3x5, calf raises 3x20, shoulder shrugs 2x18, plus light warm-up sets'], ['2', 'Deep knee bends 3-5x6-8, bent-arm pullover 3-5x8-10, military press 2x5-6, one-arm rowing 3x8, bent-leg deadlift 2x8, incline dumbbell press 2x6-8, one-arm French press 3x6-8, standing dumbbell curl 3x6-8, upright rowing 2x8, calf raises 3x15-20'], ['3', 'Bench press 5x5, press behind neck 5x5, barbell row 5x6, bent-arm pullover 3x8, barbell curls 4x6, French press 4x6, box squats 4x5, plus abs']]),
        h('h2', {}, 'Vince Gironda: the 8 x 8 method'), h('p', { class: 'note' }, 'Unverified: I could not open a source page for this one, so this is from my general knowledge and should be checked.'),
        h('p', { class: 'meta' }, 'Pick one or two exercises per body part. Do 8 sets of 8 reps with about 30 seconds between sets, using a weight you could normally lift for about 12 reps (it feels easy early and hard by the end). When you can finish all 8 sets of 8, add a little weight. Gironda is also remembered for a split routine, strict form and high-protein, low-carbohydrate eating.'),
        h('h2', {}, 'The silver era (about 1965 to 1980)'), h('p', { class: 'note' }, 'Unverified: this summary is from general knowledge, and I could not confirm the details from a page I was able to read.'),
        h('p', { class: 'meta' }, 'As the sport grew, training moved to body-part splits (for example chest and back, shoulders and arms, legs) done up to six days a week with higher volume: many sets, supersets, and a lot of focus on the pump. Arnold Schwarzenegger\'s training of that time is the best-known example. These routines were developed by people with exceptional genetics and, in many cases, steroid use, so they are not good templates for most natural lifters.'),
        h('h2', {}, 'Compare the eras'), tbl(['', 'Golden era (about 1940 to 1965)', 'Silver era (about 1965 to 1980)', 'Conjugate / Westside'], [['Frequency', 'Full body, 3 days a week', 'Splits, 4 to 6 days a week', 'Four to seven days a week, by quality'], ['Volume', 'Low to moderate per session', 'High', 'Varies by day'], ['Main aim', 'Size with strength basics', 'Size and shape', 'Strength, speed and size together'], ['Progression', 'Add weight when you complete all reps', 'More sets and intensity techniques', 'Rotate exercises, wave the percentages']]),
        h('h3', {}, 'Sources'), h('ul', {}, h('li', {}, h('a', { href: 'https://gymtalk.com/?p=19051', rel: 'noopener noreferrer' }, 'GymTalk, "The Reg Park Mr Universe Course"')), h('li', {}, h('a', { href: 'https://gymtalk.com/?p=17485', rel: 'noopener noreferrer' }, 'GymTalk, "The Steve Reeves \'Classic Physique\' Routine"'), ' (from Reeves\' May 1951 Your Physique article)'), h('li', {}, h('a', { href: 'https://gymtalk.com/?p=20795', rel: 'noopener noreferrer' }, 'GymTalk, "The Bill Pearl Bulk and Power Routine"')), h('li', {}, 'Reg Park, "Strength and Bulk Training for Weight Gain"; Bill Pearl, "Keys to the Inner Universe"; Steve Reeves, "Building the Classic Physique the Natural Way" (the original books, which I have not read).')));
    } },
    /* 9. shoulder prehab */
    { id: 'prehab', label: 'Shoulder prehab', type: 'static', blocks: [
      { h: 'Shoulder and rotator cuff prehab', note: 'General information from published physiotherapy-style guidance, not a diagnosis or treatment plan. If you have shoulder pain that lasts, wakes you at night, comes with weakness, numbness or tingling, or follows an injury, see a physiotherapist or doctor.' },
      { p: 'The rotator cuff is four small muscles (supraspinatus, infraspinatus, teres minor and subscapularis) that centre the ball of the upper arm in its shallow socket while the bigger muscles move it. Prehab means doing light, controlled work on them and on the shoulder blade muscles so heavy pressing, pulling and overhead lifting are easier on the joint.' },
      { h3: 'Circuit A: push-pattern and trunk (about 10 minutes, 1 to 2 times a week)', list: ['Reverse push-up or inverted row-style press (10 reps)', 'Push-up plus: at the top, push the shoulder blades apart and round the upper back slightly (10 reps)', 'Scarecrow: elbows at 90 degrees, rotate the forearms up and down, 4 seconds up and 6 seconds down (10 reps)', 'Foam-roll the thoracic spine (upper back), about a minute', 'One-arm plank on a ball (advanced), 15 to 20 seconds'] },
      { h3: 'Circuit B: pull-pattern and rotation (about 10 minutes, 1 to 2 times a week)', list: ['Face-down Y raise (10 reps, light)', 'Face-down T raise (10 reps, light)', 'Band external rotation with the arm about 30 degrees from the body: 4 seconds out, 6 seconds back (10 reps)', 'Scapular wall slides (10 reps)', 'Shoulder dislocates with a band or stick, pain-free range (10 reps)'] },
      { p: 'Both circuits use light resistance: they are not max-strength workouts. Stabilising exercises are done for 10 to 20 reps or 30 to 60 seconds; timed holds in the circuits for 15 to 20 seconds. Emphasise the slow lowering on the rotation exercises.' },
      { h3: 'How to do the key exercises', table: [['Exercise', 'How', 'Notes'], ['Band external rotation', 'Elbow bent to 90 degrees and tucked by your side (a rolled towel between arm and body helps), rotate the forearm outward against a light band, return slowly.', 'Stop when the shoulder blade starts to move, not the arm. Light resistance.'], ['Side-lying external rotation', 'Lie on your side with a light dumbbell; rotate the forearm up from your belly, return slowly.', 'The towel roll keeps the elbow in.'], ['Face pull', 'Cable or band at face height; pull toward the face with elbows high and rotate the hands outward.', 'The page recommended face pulls over upright rows.'], ['Y, T and W raises', 'Face down on a bench or bent over; lift arms in a Y, T or W shape with the thumbs up.', 'Very light: it is the shoulder blade muscles you want to feel.'], ['Scapular wall slides', 'Forearms on the wall, slide them up, keeping contact and pushing the blades apart.', 'Good for shoulder-blade control.'], ['Full-can raise', 'Arms raised in the plane of the shoulder blade (about 30 degrees forward of straight to the side) with the thumbs up.', 'Preferred over the "empty can" position with thumbs down.'], ['Thoracic extension', 'Over a foam roller or a chair back, extend the upper back while breathing out.', 'Opens up the posture so the shoulder can sit better.']] },
      { h3: 'By problem area (as listed in the source)', table: [['If you find...', 'Consider'], ['Tight back of the shoulder (less internal rotation)', 'Cross-arm stretch, sleeper stretch, wall slides, dislocates, unilateral presses and pulls'], ['Internal rotators stronger than external', 'Face-down Y and T, band and cable external rotation, push-up plus, scarecrow'], ['Weak lower trapezius', 'Balance every press with a pull; retract the shoulder blades on pulls'], ['Poor body awareness at the shoulder', 'Ball push-ups, ball planks, rhythmic stabilisation on all fours']] },
      { h3: 'Cautions', list: ['Never work through shoulder pain: stop and reassess.', 'Avoid the "high-five" position (arm out and rotated back under load): it stresses the front of the joint.', 'Use the full-can raise, not the empty can.', 'Gym changes that help many people: elbows closer to the body on bench, floor presses, front, Zercher or goblet squats if the back squat position bothers the shoulder, elbows slightly forward on pulldowns and overhead presses.', 'Be careful with explosive overhead lifts.'] },
      { h3: 'Sources', list: ['Precision Nutrition, shoulder prehab article (circuits and problem areas): precisionnutrition.com/?p=14646', 'Please also see a qualified physiotherapist for your own shoulder: this is the only way to get advice that fits you.'] }] },
    { id: 'prehabdo', label: 'Prehab routine', type: 'checks', word: 'Exercise', view: 'grid', intro: 'Tick the boxes as you do them. Light work: it should never hurt.',
      items: [
        { id: 'er', name: 'Band external rotation, 2 x 10 each side', every: 'daily', group: 'Shoulders' }, { id: 'slide', name: 'Scapular wall slides, 10', every: 'daily', group: 'Shoulders' }, { id: 'tx', name: 'Thoracic extension over a roller, 1 minute', every: 'daily', group: 'Shoulders' },
        { id: 'ca', name: 'Circuit A (push pattern and trunk)', every: 'weekly', group: 'Circuits' }, { id: 'cb', name: 'Circuit B (pull pattern and rotation)', every: 'weekly', group: 'Circuits' },
        { id: 'fp', name: 'Face pulls, 2 x 15', every: 'weekly', group: 'Shoulders' }, { id: 'ytw', name: 'Y, T, W raises, light', every: 'weekly', group: 'Shoulders' }, { id: 'hip', name: 'Hip and ankle mobility (squat holds, knee-to-wall)', every: 'daily', group: 'Lower body' }] },
    { id: 'shoulder', label: 'Shoulder log', type: 'log', addLabel: 'Log how the shoulder feels', intro: 'Note pain from 0 (none) to 10 (worst) and what you were doing. Patterns (which lift, which angle) are worth taking to a physiotherapist.',
      required: ['pain'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'side', label: 'Side', type: 'select', options: ['Left', 'Right', 'Both'], keep: true }, { key: 'activity', label: 'Activity or lift' }, { key: 'pain', label: 'Pain (0-10)', type: 'number', min: 0, max: 10, step: 1 }, { key: 'where', label: 'Where (front, top, back, down the arm...)' }, { key: 'notes', label: 'Notes' }],
      filterBy: 'side', summary: (r) => [['Entries', r.length], ['Average pain', PBE.round(r.reduce((s, x) => s + (x.pain || 0), 0) / r.length)], ['Highest', Math.max(...r.map((x) => x.pain || 0))]],
      charts: [{ title: 'Pain over time', y: 'pain', zero: true }, { title: 'Pain average by activity', kind: 'bar', by: 'activity', avg: 'pain', unit: '/10' }] },
    /* week planner */
    { id: 'week', label: 'Week planner', type: 'custom', render: ({ weekPlanner }) => weekPlanner({
      id: 'weekplan', intro: 'Plan a typical training week. Dark boxes are hard sessions; the planner warns about back-to-back hard days and missing rest days. Start from a template, then change it to fit your life.',
      sessions: [
        { name: 'Full body A', mins: 60, hard: true }, { name: 'Full body B', mins: 60, hard: true }, { name: 'Upper body', mins: 60, hard: true }, { name: 'Lower body', mins: 60, hard: true }, { name: 'Push', mins: 60, hard: true }, { name: 'Pull', mins: 60, hard: true }, { name: 'Legs', mins: 60, hard: true },
        { name: 'Max effort lower', mins: 75, hard: true }, { name: 'Max effort upper', mins: 75, hard: true }, { name: 'Dynamic effort lower', mins: 60, hard: true }, { name: 'Dynamic effort upper', mins: 60, hard: false },
        { name: 'Strongman endurance / GPP', mins: 40, hard: true }, { name: 'Cardiac output (easy cardio)', mins: 40, hard: false }, { name: 'Low-intensity walk', mins: 40, hard: false },
        { name: 'Shoulder prehab circuit', mins: 12, hard: false }, { name: 'Mobility', mins: 15, hard: false }, { name: 'Easy run', mins: 40, hard: false }, { name: 'Easy swim', mins: 30, hard: false }, { name: 'Easy ride', mins: 60, hard: false }],
      templates: {
        'Golden era, full body 3 days': { Mon: ['Full body A', 'Shoulder prehab circuit'], Wed: ['Full body B'], Fri: ['Full body A', 'Shoulder prehab circuit'], Sat: ['Low-intensity walk'] },
        'Upper and lower, 4 days': { Mon: ['Upper body'], Tue: ['Lower body', 'Shoulder prehab circuit'], Thu: ['Upper body'], Fri: ['Lower body'], Sat: ['Mobility'] },
        'Push, pull, legs, 6 days': { Mon: ['Push'], Tue: ['Pull', 'Shoulder prehab circuit'], Wed: ['Legs'], Thu: ['Push'], Fri: ['Pull'], Sat: ['Legs'] },
        'Conjugate, 4 days': { Mon: ['Max effort lower'], Tue: ['Shoulder prehab circuit'], Wed: ['Dynamic effort upper'], Fri: ['Dynamic effort lower'], Sat: ['Max effort upper'], Sun: ['Low-intensity walk'] },
        'Conjugate with GPP, 7 days (per the template)': { Mon: ['Max effort lower'], Tue: ['Strongman endurance / GPP'], Wed: ['Dynamic effort upper'], Thu: ['Cardiac output (easy cardio)'], Fri: ['Dynamic effort lower'], Sat: ['Max effort upper'], Sun: ['Low-intensity walk'] },
      } }) },
    /* mobility */
    { id: 'mob', label: 'Mobility', type: 'checks', word: 'Exercise', intro: 'Short routines to keep joints moving. Pain-free ranges only: easing into a stretch is fine, forcing it is not.',
      items: [
        { id: 'hip', name: 'Hips: 90/90 switches or deep squat hold, 2 minutes', every: 'daily', group: 'Lower body' }, { id: 'ankle', name: 'Ankles: knee-to-wall drill, 10 each side', every: 'daily', group: 'Lower body' }, { id: 'ham', name: 'Hamstrings: gentle active leg raises or hinge stretch', every: 'daily', group: 'Lower body' },
        { id: 'thor', name: 'Upper back: thoracic extensions over a roll, or thread-the-needle, 10 each', every: 'daily', group: 'Upper body' }, { id: 'shoulder', name: 'Shoulders: wall slides or band dislocates, 10', every: 'daily', group: 'Upper body' }, { id: 'neck', name: 'Neck and wrists: gentle circles and stretches', every: 'daily', group: 'Upper body' },
        { id: 'foam', name: 'Foam roll or self-massage: quads, glutes, upper back', every: 'weekly', group: 'Recovery' }, { id: 'yoga', name: 'Longer stretching or yoga session, 20 to 30 minutes', every: 'weekly', group: 'Recovery' }, { id: 'deload', name: 'Easier week: reduce weights or volume by about half', every: 'quarterly', note: 'Many lifters take one every 4 to 8 weeks of hard training; adjust to how you feel.', group: 'Recovery' }] },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Technique cues, injuries to avoid, plans, things your coach told you.' },
  ],
});
function round1(x) { return Math.round(x * 10) / 10; }
