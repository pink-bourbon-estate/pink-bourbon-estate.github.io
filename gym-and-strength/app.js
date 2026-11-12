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
    /* 7. mobility */
    { id: 'mob', label: 'Mobility', type: 'checks', intro: 'Short routines to keep joints moving. Pain-free ranges only: easing into a stretch is fine, forcing it is not.',
      items: [
        { id: 'hip', name: 'Hips: 90/90 switches or deep squat hold, 2 minutes', every: 'daily', group: 'Lower body' }, { id: 'ankle', name: 'Ankles: knee-to-wall drill, 10 each side', every: 'daily', group: 'Lower body' }, { id: 'ham', name: 'Hamstrings: gentle active leg raises or hinge stretch', every: 'daily', group: 'Lower body' },
        { id: 'thor', name: 'Upper back: thoracic extensions over a roll, or thread-the-needle, 10 each', every: 'daily', group: 'Upper body' }, { id: 'shoulder', name: 'Shoulders: wall slides or band dislocates, 10', every: 'daily', group: 'Upper body' }, { id: 'neck', name: 'Neck and wrists: gentle circles and stretches', every: 'daily', group: 'Upper body' },
        { id: 'foam', name: 'Foam roll or self-massage: quads, glutes, upper back', every: 'weekly', group: 'Recovery' }, { id: 'yoga', name: 'Longer stretching or yoga session, 20 to 30 minutes', every: 'weekly', group: 'Recovery' }, { id: 'deload', name: 'Easier week: reduce weights or volume by about half', every: 'quarterly', note: 'Many lifters take one every 4 to 8 weeks of hard training; adjust to how you feel.', group: 'Recovery' }] },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Technique cues, injuries to avoid, plans, things your coach told you.' },
  ],
});
function round1(x) { return Math.round(x * 10) / 10; }
