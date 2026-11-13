/* Gym and Strength - a sets-and-reps planner (estimate your max, get a starting weight, then a next-session suggestion and a rest timer),
   a per-exercise progress graph, a lifts log, strength standards, programmes (templates, Conjugate, Golden and silver era), a week planner
   and exercises by movement pattern with progressions. Shoulder prehab and mobility now live in the Mobility and Physio tool.
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


/* ---- sets and reps helpers ---- */

/** Work out what to do next time from what you did. Plain "double progression": fill the rep range, then add weight.
    `reps` is the reps done in each set, `w` the weight, `rpe` the effort of the last set (0 if unknown). Returns {title, detail, why, nextWeight}. */
function nextStep(o) {
  const { reps, w, rpe, lo, hi, step, hist } = o, sets = reps.length, bump = step * Math.max(1, Math.round((w * 0.025) / step)), lower = (f) => Math.max(0, toStep(w * f, step));
  const allTop = reps.every((r) => r >= hi), allIn = reps.every((r) => r >= lo), firstLow = reps[0] < lo, dropoff = !firstLow && reps.some((r) => r < lo);
  // has the weight been stuck? Three sessions at this weight without the total reps going up
  const same = (hist || []).slice(-3).filter((x) => x.weight === w), stuck = same.length >= 3 && same.every((x, i, a) => i === 0 || x.reps.reduce((s2, v) => s2 + v, 0) <= a[i - 1].reps.reduce((s2, v) => s2 + v, 0));
  const stallNote = stuck ? ' You have been at this weight for three sessions without more reps: consider an easier week (about 10 % lighter), more sleep and food, or a slightly different rep range.' : '';
  if (rpe >= 10 && !allIn) return { title: 'Lower the weight a little', detail: 'Next time try ' + lower(0.925) + ' kg for ' + sets + ' x ' + lo + ' to ' + hi + '.', why: 'The last set was all-out and some sets fell below ' + lo + ' reps. A slightly lighter weight lets you build the reps back up.' + stallNote, nextWeight: lower(0.925) };
  if (firstLow) return { title: 'Lower the weight', detail: 'Next time try ' + lower(0.93) + ' kg for ' + sets + ' x ' + lo + ' to ' + hi + '.', why: 'Your first set was below the bottom of your rep range (' + lo + '), so the weight was a bit heavy for this range. (A bad day, poor sleep or a short rest can do this too: one session is not a trend.)' + stallNote, nextWeight: lower(0.93) };
  if (dropoff) return { title: 'Same weight, rest longer', detail: 'Stay at ' + w + ' kg and rest 3 to 4 minutes between sets next time.', why: 'The first sets were in range but the later sets dropped below ' + lo + ': that usually means tiredness between sets rather than a weight that is too heavy.' + stallNote, nextWeight: w };
  if (allTop && rpe >= 9.5) return { title: 'Stay at this weight once more', detail: 'Do ' + w + ' kg again and see if the top reps feel a little easier.', why: 'You hit the top of the range, but the last set was close to your limit. Repeating it makes the next jump smaller and safer.' + stallNote, nextWeight: w };
  if (allTop) return { title: 'Add weight', detail: 'Next time try ' + (w + bump) + ' kg and start again at ' + lo + ' reps a set, working back up to ' + hi + '.', why: 'Every set reached the top of the range (' + hi + ' reps), which is the usual sign to go heavier.', nextWeight: w + bump };
  const need = reps.map((r, i) => (r < hi ? 'set ' + (i + 1) + ' (' + r + ' to ' + (r + 1) + ')' : null)).filter(Boolean);
  return { title: 'Same weight, add reps', detail: 'Stay at ' + w + ' kg and try for one more rep on: ' + need.join(', ') + '.', why: 'All sets were inside your rep range but not all at the top. Add reps first, then weight.' + stallNote, nextWeight: w };
}
const sessionHistory = (ex, get) => (get('srlog', []) || []).filter((x) => x.exercise === ex);
/** Keep a session (for the advice next time) and add its best set to the Lifts log (for the graph). */
function saveSession(ex, w, reps, rpe, s, a, get, set, today) {
  const log = get('srlog', []) || []; log.push({ date: today(), exercise: ex, weight: w, reps, rpe: rpe || '', advice: a.title }); set('srlog', log);
  const lifts = get('lifts', []) || []; lifts.push({ date: today(), exercise: ex, weight: w, reps: Math.max(...reps), sets: reps.length, rpe: rpe || '', notes: 'From Sets and reps' }); set('lifts', lifts);
}
/** A rest timer: choose a length and it counts down and chimes. */
function restTimer(h) {
  const node = h('div', {}), disp = h('p', { class: 'lede', id: 'rest_disp', 'aria-live': 'polite' }, 'Rest: not running'); let t = null, end = 0;
  const stop = () => { if (t) clearInterval(t); t = null; };
  const go = (secs) => { stop(); end = Date.now() + secs * 1000; if (window.PBEsound) { try { PBEsound.strike('wood'); } catch (e) { /* silent */ } } t = setInterval(() => { if (!document.body.contains(disp)) { stop(); return; } const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); disp.textContent = left ? 'Rest: ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : 'Rest over: next set'; if (!left) { stop(); if (window.PBEsound) { PBEsound.strike('chime'); setTimeout(() => PBEsound.strike('chime'), 700); } } }, 250); };
  node.append(h('p', { class: 'meta' }, 'Common guidance: about 1 to 2 minutes for lighter sets of 12 or more, 2 to 3 minutes for 6 to 12 reps, 3 to 5 minutes for heavy sets of 1 to 5. Press a length when you finish a set; it chimes when time is up.'), disp,
    h('p', {}, [60, 90, 120, 180, 240, 300].map((s2) => h('span', {}, h('button', { type: 'button', onclick: () => go(s2) }, s2 >= 120 ? s2 / 60 + ' min' : s2 + ' s'), ' ')), h('button', { type: 'button', onclick: () => { stop(); disp.textContent = 'Rest: not running'; } }, 'Cancel')));
  return { node };
}
/** Fold the Conjugate and Golden era tabs into one Programmes tab with three buttons, and put the tabs in a sensible order. */
function mergeProgrammes(tabs) {
  const by = (id) => tabs.find((t) => t.id === id), tpl = by('plan'), conj = by('conj'), gold = by('golden');
  const merged = { id: 'plan', label: 'Programmes', type: 'custom', render: (ctx) => {
    const box = ctx.h('div', {}), views = [['Templates', tpl], ['Conjugate (Westside)', conj], ['Golden and silver era', gold]], bar = ctx.h('div', { class: 'penbar' });
    const show = (i) => { PBE.fill(box, views[i][1].render(ctx)); [...bar.children].forEach((b, j) => b.setAttribute('aria-pressed', j === i)); };
    views.forEach(([name], i) => bar.append(ctx.h('button', { type: 'button', 'aria-pressed': i === 0, onclick: () => show(i) }, name)));
    const first = ctx.h('div', {}); setTimeout(() => show(0), 0); return ctx.h('div', {}, bar, box, first);
  } };
  const order = ['orm', 'progress', 'lifts', 'plan', 'week', 'std', 'ex', 'prog', 'notes'];
  return order.map((id) => (id === 'plan' ? merged : by(id))).filter(Boolean);
}

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
  tabs: mergeProgrammes([
    /* 1. SETS AND REPS: estimate your max, plan the sets, then check a session and see what to do next */
    { id: 'orm', label: 'Sets and reps', type: 'custom', render: ({ h, get, set, round, today, rerender }) => {
      /* what is stored: srx[exercise] = {w, r, sets, lo, hi, rir, step, weight, rest}; srlog = list of saved sessions */
      const store = get('srx', {}), cur = get('srcur', EXERCISES.includes('Back squat') ? 'Back squat' : EXERCISES[0]);
      let ex = cur; const S = () => Object.assign({ w: 80, r: 8, sets: 3, lo: 8, hi: 12, rir: 2, step: 2.5, orm: 0 }, store[ex] || {});
      const root = h('div', {}), sec = h('div', {});
      const save = (o) => { store[ex] = Object.assign(S(), o); set('srx', store); set('srcur', ex); };
      const field = (id, label, v, extra) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value: v, step: 'any', min: 0, ...extra }));
      const num = (id) => Number(document.getElementById(id).value) || 0;
      const rest = restTimer(h);
      /** the sessions from the lifts log for this exercise: used to make the estimate better */
      const history = () => (get('lifts', []) || []).filter((x) => x.exercise === ex && x.weight && x.reps).sort((a, b) => (a.date < b.date ? -1 : 1));
      const logOrm = () => { const hs = history().slice(-8); if (!hs.length) return 0; const top = hs.map((x) => est1RM(x.weight, x.reps)).sort((a, b) => b - a).slice(0, 3); return top.reduce((s2, v) => s2 + v, 0) / top.length; };

      const draw = () => {
        const s = S(), orm = s.orm || est1RM(s.w, s.r), hist = history(), lo = s.lo, hi = s.hi, sets = s.sets, step = s.step;
        const confidence = hist.length >= 8 ? 'good: based on ' + hist.length + ' logged sets' : hist.length >= 3 ? 'fair: ' + hist.length + ' logged sets so far' : 'rough: one set (log more sessions and it improves)';
        // starting weight: the weight you could lift for the TOP of the rep range with `rir` reps left in the tank
        const effReps = hi + s.rir, pct = ((1 / (1 + effReps / 30)) + ((37 - effReps) / 36)) / 2, start = toStep(orm * pct, step);
        PBE.fill(sec,
          h('h3', {}, '1. Your estimated one-rep max'),
          h('p', { class: 'lede' }, orm ? round(orm) + ' kg for ' + ex : 'Enter a weight and reps'),
          h('p', { class: 'meta' }, 'Estimate confidence: ' + confidence + '. Above about 10 reps the formula is rough. It averages the Epley and Brzycki formulas.'),
          hist.length ? h('p', {}, h('button', { type: 'button', onclick: () => { const v = logOrm(); if (v) { save({ orm: Math.round(v * 10) / 10 }); draw(); } } }, 'Use the estimate from my lifts log (' + round(logOrm()) + ' kg)'), ' ', s.orm ? h('button', { type: 'button', onclick: () => { save({ orm: 0 }); draw(); } }, 'Go back to my typed set') : null) : null,
          h('h3', {}, '2. Your starting weight'),
          h('p', { class: 'lede' }, sets + ' x ' + lo + ' to ' + hi + ' at ' + round(start, 1) + ' kg'),
          h('p', { class: 'meta' }, 'That is about ' + Math.round((start / orm) * 100) + ' % of your one-rep max: the weight you could probably lift ' + hi + ' times with ' + s.rir + ' reps still in the tank, so you can work up from ' + lo + ' to ' + hi + ' reps. A set of ' + hi + ' reps should feel hard but not like a grind.'),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Reps', 'Weight (at ' + s.rir + ' reps left)', '% of 1RM'].map((x) => h('th', {}, x)))), h('tbody', {}, [3, 5, 6, 8, 10, 12, 15].map((rp) => { const e = rp + s.rir, p2 = ((1 / (1 + e / 30)) + ((37 - e) / 36)) / 2; return h('tr', {}, h('td', {}, rp), h('td', { class: 'n' }, round(toStep(orm * p2, step), 1) + ' kg'), h('td', { class: 'n' }, Math.round(p2 * 100) + ' %')); })))),
          h('h3', {}, '3. After your session: what next?'),
          sessionBox(s, start, orm));
      };
      const sessionBox = (s, start, orm) => {
        const box = h('div', {}), wUsed = h('input', { id: 'u_w', type: 'number', step: 'any', value: s.weight || start }), setBoxes = Array.from({ length: s.sets }, (_, i) => h('input', { class: 'u_r', type: 'number', min: 0, step: 1, 'aria-label': 'Reps in set ' + (i + 1), placeholder: 'set ' + (i + 1), style: 'width:5em' })), rpe = h('input', { id: 'u_rpe', type: 'number', min: 1, max: 10, step: 0.5, placeholder: '1-10 (optional)' }), out = h('div', {});
        const advise = () => {
          const reps = setBoxes.map((x) => Number(x.value)).filter((x) => x > 0), w = Number(wUsed.value) || 0, r = Number(rpe.value) || 0;
          if (!reps.length || !w) { PBE.fill(out, h('p', { class: 'meta' }, 'Type the reps you did in each set to see a suggestion.')); return; }
          const a = nextStep({ reps, w, rpe: r, lo: s.lo, hi: s.hi, step: s.step, hist: sessionHistory(ex, get) });
          PBE.fill(out, h('p', { class: 'lede' }, a.title), h('p', {}, a.detail), h('p', { class: 'meta' }, a.why),
            h('p', {}, h('button', { type: 'button', onclick: () => { saveSession(ex, w, reps, r, s, a, get, set, today); save({ weight: a.nextWeight }); draw(); } }, 'Save this session and set up the next one'), ' ', h('span', { class: 'meta' }, 'It also adds your best set to the Lifts log, so the Progress graph updates.')));
        };
        const form = h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Weight used (kg)', wUsed), h('label', { class: 'fld' }, 'Reps in each set', h('span', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, ...setBoxes)), h('label', { class: 'fld' }, 'How hard was the last set? (RPE)', rpe));
        form.addEventListener('input', advise); advise();
        const log = get('srlog', []).filter((x) => x.exercise === ex).slice(-6).reverse();
        box.append(h('p', { class: 'meta' }, 'Next time, the same advice uses what you did: all sets at the top of the range means more weight; sets in range means more reps; a drop-off in the last sets means the same weight with longer rests; and so on. The more sessions you save, the better it spots a stall.'),
          form, out, h('h3', {}, 'Rest timer'), rest.node, log.length ? h('div', {}, h('h3', {}, 'Recent sessions'), h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Date', 'Weight', 'Reps', 'RPE', 'What it said'].map((x) => h('th', {}, x)))), h('tbody', {}, log.map((x) => h('tr', {}, h('td', {}, x.date), h('td', { class: 'n' }, x.weight + ' kg'), h('td', {}, x.reps.join(', ')), h('td', {}, x.rpe || ''), h('td', {}, x.advice))))))) : null);
        return box;
      };
      /* the top form: exercise, a set you did, the plan */
      const exInput = h('input', { id: 'sr_ex', list: 'sr_exlist', value: ex, 'aria-label': 'Exercise' }), dl = h('datalist', { id: 'sr_exlist' }, EXERCISES.map((e) => h('option', { value: e })));
      const form = h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Exercise', exInput, dl), field('p_w', 'A hard set you have done: weight (kg)', S().w), field('p_r', '... reps', S().r, { step: 1 }),
        field('p_sets', 'Sets you want to do', S().sets, { step: 1 }), field('p_lo', 'Rep range: from', S().lo, { step: 1 }), field('p_hi', '... to', S().hi, { step: 1 }), field('p_rir', 'Reps to leave in the tank', S().rir, { step: 1, max: 5 }), field('p_step', 'Smallest plate jump (kg)', S().step, { step: 0.25 }));
      exInput.addEventListener('change', () => { ex = exInput.value.trim() || ex; set('srcur', ex); rerender(); });
      form.addEventListener('input', (e) => { if (e.target === exInput) return; save({ w: num('p_w'), r: num('p_r'), sets: Math.max(1, num('p_sets')), lo: num('p_lo'), hi: Math.max(num('p_lo'), num('p_hi')), rir: num('p_rir'), step: num('p_step') || 2.5, orm: 0 }); draw(); });
      root.append(h('p', { class: 'meta' }, 'Pick an exercise and enter a hard set you have done. It estimates your one-rep max, tells you what weight to start your sets and rep range with, and after each session tells you whether to add weight, add reps, stay, or rest longer. Everything is saved per exercise.'), form, sec);
      draw(); return root;
    } },
    /* PROGRESS: one exercise over time */
    { id: 'progress', label: 'Progress', type: 'custom', render: ({ h, get, round }) => {
      const statBox = (pairs) => { const b = h('div', {}); PBEcharts.stat(b, pairs); return b; };
      const rows = (get('lifts', []) || []).filter((x) => x.exercise && x.weight), names = [...new Set(rows.map((x) => x.exercise))].sort();
      const out = h('div', {});
      if (!names.length) return h('div', {}, h('p', { class: 'meta' }, 'Nothing to chart yet. Log some sets in the Lifts log or the Sets and reps tab, or load example data in the Example Data tab.'));
      const ex = h('select', { id: 'pg_ex' }, names.map((n) => h('option', { value: n }, n))), metric = h('select', { id: 'pg_m' }, [['orm', 'Estimated one-rep max'], ['weight', 'Heaviest weight'], ['vol', 'Volume (weight x reps x sets)']].map(([v, l]) => h('option', { value: v }, l))), span = h('select', { id: 'pg_s' }, [['28', 'Last 4 weeks'], ['84', 'Last 12 weeks'], ['182', 'Last 6 months'], ['365', 'Last year'], ['0', 'All time']].map(([v, l]) => h('option', { value: v }, l)));
      span.value = '0'; ex.value = names.includes('Back squat') ? 'Back squat' : names[0];
      const draw = () => {
        const cut = Number(span.value) ? new Date(Date.now() - Number(span.value) * 86400000).toISOString().slice(0, 10) : '', m = metric.value;
        const mine = rows.filter((x) => x.exercise === ex.value && x.date >= cut).sort((a, b) => (a.date < b.date ? -1 : 1));
        const val = (x) => (m === 'orm' ? est1RM(x.weight, x.reps || 1) : m === 'weight' ? x.weight : x.weight * (x.reps || 1) * (x.sets || 1));
        const byDay = {}; mine.forEach((x) => { byDay[x.date] = Math.max(byDay[x.date] || 0, val(x)); });                                // best value per day
        const pts = Object.keys(byDay).sort().map((d) => ({ x: d, y: Math.round(byDay[d] * 10) / 10 }));
        const box = h('div', { class: 'chart' }); PBEcharts.line(box, pts, { unit: m === 'vol' ? 'kg' : 'kg', empty: 'Not enough sessions in this period: log at least two.', title: ex.value + ' over time' });
        const first = pts[0], last = pts[pts.length - 1], best = pts.length ? Math.max(...pts.map((p) => p.y)) : 0, days = first && last ? Math.max(1, (new Date(last.x) - new Date(first.x)) / 86400000) : 0;
        PBE.fill(out, box, pts.length > 1 ? statBox([['Sessions', pts.length], ['First', first.y + ' kg'], ['Latest', last.y + ' kg'], ['Change', (last.y - first.y >= 0 ? '+' : '') + round(last.y - first.y) + ' kg'], ['Per month', (last.y - first.y >= 0 ? '+' : '') + round(((last.y - first.y) / days) * 30.4, 1) + ' kg'], ['Best', best + ' kg']]) : null,
          h('p', { class: 'meta' }, 'One point per day (the best set that day). Estimated one-rep max uses the average of the Epley and Brzycki formulas, so it can compare sessions with different reps.'));
      };
      [ex, metric, span].forEach((x) => x.addEventListener('change', draw)); draw();
      return h('div', {}, h('p', { class: 'meta' }, 'Follow one exercise over any period.'), h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Exercise', ex), h('label', { class: 'fld' }, 'Measure', metric), h('label', { class: 'fld' }, 'Period', span)), out);
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
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Technique cues, injuries to avoid, plans, things your coach told you.' },
  ]),
});
function round1(x) { return Math.round(x * 10) / 10; }
