/* Run, Bike and Swim - training plans, session ideas, a week planner, pace and zone calculators,
   a training log with a dashboard, and a habit grid. Built on tracker.js.

   HOW THE PLAN BUILDER WORKS (so you can read and change it):
   1. You choose a sport, a goal distance, your level, how many weeks and how many sessions a week.
   2. A "progression" function turns the week number into: how far through the build you are (0 to 1),
      whether it is a cut-back week (every 4th week is lighter), and a taper factor for the last weeks.
   3. Each sport has a list of session "roles" (easy, long, quality...). A small function writes each session
      from the progress number: longer long runs, more or longer intervals, and so on.
   The plans follow ordinary, widely used coaching ideas (mostly easy running with a little hard work, gradual
   increases, a lighter week every fourth week, a taper before the race). They are NOT copies of any app's or
   coach's plans (such as Runna or Nike Run Club, which are proprietary): they are original, simple
   plans for you to adjust. Not medical advice: if you are new to exercise, have a health condition or feel
   pain, check with a doctor, and listen to your body. */

/* ---------------------------------------------------------------- small helpers */
const mmss = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hms = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
/** Parse "25:30" or "1:45:00" (or plain minutes like "25") into seconds. */
const toSec = (t) => { const p = String(t).trim().split(':').map(Number); if (p.some((x) => !isFinite(x))) return 0; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60; };
/** Riegel's formula: predict a time for another distance from a known result (T2 = T1 x (D2/D1)^1.06). A rough guide. */
const riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);
const r1 = (x) => Math.round(x * 10) / 10;

/** Running pace zones (seconds per km) worked out from a 5K time. These are rough, generic multipliers. */
function runZones(t5k) {
  const p = t5k / 5;
  return { easy: [p * 1.22, p * 1.4], long: [p * 1.2, p * 1.38], marathon: [riegel(t5k, 5, 42.195) / 42.195, 0], half: [riegel(t5k, 5, 21.0975) / 21.0975, 0], tenk: [riegel(t5k, 5, 10) / 10, 0], tempo: [p * 1.06, p * 1.1], interval: [p * 0.96, p * 1.0], rep: [p * 0.86, p * 0.92], fiveK: [p, 0] };
}
/** Cycling power zones from FTP (functional threshold power), the common 7-zone percentages. */
const BIKE_ZONES = [['1 Active recovery', 0, 55, 'very easy spinning'], ['2 Endurance', 56, 75, 'all-day pace, can chat'], ['3 Tempo', 76, 90, 'steady, breathing deeper'], ['4 Threshold', 91, 105, 'hard but sustainable for about an hour'], ['5 VO2 max', 106, 120, '3 to 8 minute efforts'], ['6 Anaerobic', 121, 150, '30 seconds to 2 minutes'], ['7 Sprint', 151, 0, 'all-out, under 15 seconds']];
/** Swim: critical swim speed (CSS) pace per 100 m from a 400 m and a 200 m time trial: (T400 - T200) / 2. */
const cssPer100 = (t400, t200) => (t400 - t200) / 2;

/* ---------------------------------------------------------------- the progression */
/** For week i of n (0-based): how far through the build (p, 0..1), the volume factor, and what to call the week. */
function progression(i, n, taper) {
  const build = Math.max(1, n - taper);
  if (i >= build) { const fs = { 1: [0.6], 2: [0.75, 0.5], 3: [0.8, 0.6, 0.4] }[taper] || [0.6]; return { p: 1, f: fs[i - build] || 0.5, phase: 'Taper', last: i === n - 1 }; }
  const p = build === 1 ? 1 : i / (build - 1), cut = (i + 1) % 4 === 0 && i < build - 1;
  return { p, f: cut ? 0.75 : 1, phase: cut ? 'Easier week' : p < 0.34 ? 'Base' : p < 0.8 ? 'Build' : 'Peak', last: i === n - 1 };
}

/* ---------------------------------------------------------------- RUNNING */
const RUN_GOALS = {
  '5K': { km: 5, weeks: 8, peak: [8, 10, 12], taper: 1 }, '10K': { km: 10, weeks: 10, peak: [12, 14, 17], taper: 1 }, 'Half marathon': { km: 21.0975, weeks: 12, peak: [16, 19, 22], taper: 2 },
  'Marathon': { km: 42.195, weeks: 16, peak: [28, 32, 35], taper: 3 }, '50K ultra': { km: 50, weeks: 20, peak: [30, 36, 42], taper: 3 },
};
const RUN_DAYS = { 3: ['Tue', 'Thu', 'Sun'], 4: ['Mon', 'Wed', 'Fri', 'Sun'], 5: ['Mon', 'Tue', 'Thu', 'Fri', 'Sun'], 6: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'] };
const RUN_ROLES = { 3: ['easy', 'quality', 'long'], 4: ['easy', 'quality', 'easy', 'long'], 5: ['easy', 'quality', 'easy', 'tempo', 'long'], 6: ['easy', 'quality', 'easy', 'tempo', 'easy', 'long'] };
const RUNWALK = [[1, 2], [2, 2], [3, 2], [5, 2], [8, 2], [10, 1], [15, 1], [20, 1], [30, 0]];

function runSession(role, o, w, k) {   // o = options, w = progression, k = which quality slot this is (for alternating)
  const g = RUN_GOALS[o.goal], lvl = o.level, peak = g.peak[lvl], start = peak * [0.4, 0.5, 0.6][lvl];
  const long = Math.max(2, Math.round((start + (peak - start) * w.p) * w.f * 2) / 2), z = o.zones, pz = (a) => mmss(a[0]) + ' to ' + mmss(a[1]) + ' per km';
  const easyKm = Math.max(3, Math.round(long * 0.5)), beginnerRW = lvl === 0 && (o.goal === '5K' || o.goal === '10K') && w.p < 0.6;
  if (role === 'easy') {
    if (beginnerRW) { const st = RUNWALK[Math.min(RUNWALK.length - 1, Math.floor(w.p * RUNWALK.length * 1.3))], tot = Math.round(20 + w.p * 15), reps = Math.round(tot / (st[0] + st[1] || 1)); return { label: 'Easy run', detail: 'Run ' + st[0] + ' min / walk ' + st[1] + ' min, ' + reps + ' times (about ' + tot + ' min). Easy, talking pace.', km: tot / 8 }; }
    return { label: 'Easy run', detail: easyKm + ' km easy at ' + pz(z.easy) + ' (or by feel: you can speak in full sentences).' + (k % 2 ? ' Add 5 x 20 s relaxed strides at the end.' : ''), km: easyKm };
  }
  if (role === 'long') {
    let extra = '';
    if ((o.goal === 'Half marathon' || o.goal === 'Marathon') && w.phase === 'Peak' && lvl >= 1) extra = ' Finish the last ' + Math.round(long * 0.25) + ' km at goal race pace.';
    if (o.goal === '50K ultra') extra = ' Practise your race fuelling and walk the steep hills. On the next day, run an easy 40 to 60 minutes on tired legs.';
    return { label: 'Long run', detail: long + ' km long run at ' + pz(z.long) + ' (time on feet matters more than speed).' + extra, km: long };
  }
  if (role === 'tempo') { const mins = Math.round(12 + w.p * 22 * (lvl === 0 ? 0.7 : 1)); return { label: 'Tempo run', detail: '10 min easy, ' + mins + ' min steady tempo at ' + pz(z.tempo) + ' (comfortably hard: a few words at a time), 10 min easy.', km: easyKm + 2 }; }
  // quality slot (intervals / hills / sprints / fartlek), changes with phase
  const f = w.phase === 'Taper' ? 0.6 : 1;
  if (w.phase === 'Base' || (w.phase === 'Easier week')) {
    if (k % 3 === 0) return { label: 'Hill sprints', detail: '10 min easy, then ' + Math.round((6 + w.p * 4) * f) + ' x 10 to 12 s hard uphill sprints (walk back down, full recovery), 10 min easy.', km: 4 };
    if (k % 3 === 1) return { label: 'Intervals (run)', detail: '10 min easy, ' + Math.round((6 + w.p * 4) * f) + ' x 1 min fast (about ' + mmss(z.interval[0]) + ' per km) with 1 min easy jog, 10 min easy. A fartlek: play with speed.', km: 6 };
    return { label: 'Sprints', detail: '15 min easy with drills, then ' + Math.round(6 * f) + ' x 100 m fast but relaxed (walk back, full recovery), 10 min easy.', km: 4 };
  }
  const longGoal = o.goal === 'Half marathon' || o.goal === 'Marathon' || o.goal === '50K ultra';
  const reps = longGoal ? [['6 x 3 min', 3], ['5 x 1 km', 1], ['4 x 1.6 km (1 mile)', 1.6], ['3 x 2 km', 2]] : [['8 x 400 m', 0.4], ['6 x 600 m', 0.6], ['5 x 800 m', 0.8], ['4 x 1 km', 1], ['3 x 1.2 km', 1.2]];
  const pick = reps[Math.min(reps.length - 1, Math.floor(w.p * reps.length))];
  const paceTxt = longGoal ? pz(z.tempo) + ' (threshold)' : mmss(z.interval[0]) + ' to ' + mmss(z.interval[1]) + ' per km (about 3K to 5K pace)';
  return { label: 'Intervals (run)', detail: '15 min easy, ' + pick[0] + ' at ' + paceTxt + ', jog or walk 90 s to 2 min between, 10 min easy.', km: 7 + (typeof pick[1] === 'number' ? 2 : 0) };
}

function genRun(o) {
  const g = RUN_GOALS[o.goal], n = o.weeks, taper = g.taper, days = RUN_DAYS[o.perWeek], roles = RUN_ROLES[o.perWeek], out = [];
  for (let i = 0; i < n; i++) {
    const w = progression(i, n, taper); let q = 0, total = 0;
    const sessions = roles.map((role, idx) => { const s = runSession(role, o, w, role === 'quality' ? q++ : idx); total += s.km || 0; return { day: days[idx], ...s }; });
    if (w.last) { const lastLong = sessions[sessions.length - 1]; lastLong.label = 'Race day'; lastLong.detail = 'RACE: ' + o.goal + '. Start easier than goal pace, fuel and drink as you practised, enjoy it.'; lastLong.km = g.km; total = total - 1 + g.km; }
    out.push({ n: i + 1, phase: w.phase, total: r1(total) + ' km', sessions });
  }
  return out;
}

/* ---------------------------------------------------------------- CYCLING */
const BIKE_GOALS = { '40 km': { weeks: 8, peak: [1.75, 2.25, 2.75], taper: 1 }, '100 km': { weeks: 12, peak: [3, 3.75, 4.5], taper: 1 }, '100 miles (160 km)': { weeks: 16, peak: [4.5, 5.5, 6.5], taper: 2 }, '200 km': { weeks: 18, peak: [5.5, 6.5, 8], taper: 2 } };
const BIKE_DAYS = { 3: ['Tue', 'Thu', 'Sat'], 4: ['Tue', 'Wed', 'Fri', 'Sun'], 5: ['Mon', 'Tue', 'Thu', 'Sat', 'Sun'], 6: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat', 'Sun'] };
const BIKE_ROLES = { 3: ['quality', 'easy', 'long'], 4: ['quality', 'easy', 'quality2', 'long'], 5: ['easy', 'quality', 'easy', 'quality2', 'long'], 6: ['easy', 'quality', 'easy', 'quality2', 'long', 'easy'] };
function bikeSession(role, o, w, k) {
  const g = BIKE_GOALS[o.goal], lvl = o.level, peak = g.peak[lvl], start = peak * [0.45, 0.5, 0.55][lvl], long = r1((start + (peak - start) * w.p) * w.f), ftp = o.ftp, hrs = (h) => Math.round(h * 60) + ' min';
  const zt = (a, b) => (ftp ? Math.round(ftp * a / 100) + ' to ' + Math.round(ftp * b / 100) + ' W (' + a + ' to ' + b + ' % FTP)' : a + ' to ' + b + ' % of FTP, or the matching effort');
  if (role === 'easy') return { label: 'Easy ride', detail: hrs(Math.max(0.75, long * 0.4)) + ' in zone 1 to 2 (' + zt(50, 70) + '). Spin a light gear at 85 to 95 rpm.', h: Math.max(0.75, long * 0.4) };
  if (role === 'long') return { label: 'Long ride', detail: long + ' h endurance ride in zone 2 (' + zt(56, 75) + ')' + (w.phase === 'Peak' ? ', with the last hour at the effort you plan to ride the event' : '') + '. Eat 40 to 60 g of carbohydrate an hour and drink regularly.', h: long };
  const f = w.phase === 'Taper' ? 0.6 : 1, slot = role === 'quality2' ? k + 1 : k;
  if (w.phase === 'Base' || w.phase === 'Easier week') {
    if (slot % 3 === 0) return { label: 'Tempo ride', detail: '15 min warm-up, ' + Math.round(2 * f) + ' x ' + Math.round(10 + w.p * 10) + ' min in zone 3 (' + zt(76, 90) + ') with 5 min easy between, 10 min cool-down.', h: 1.25 };
    if (slot % 3 === 1) return { label: 'Hill reps', detail: '15 min warm-up, ' + Math.round((4 + w.p * 2) * f) + ' x 4 min seated climbing in zone 4 (' + zt(91, 100) + '), ride back down easy, 10 min cool-down.', h: 1.25 };
    return { label: 'Sprints (bike)', detail: '20 min warm-up, ' + Math.round(6 * f) + ' x 10 s all-out sprint from a slow roll (zone 7), 3 to 4 min easy spinning between, 15 min easy. Short and sharp: stop if the effort drops.', h: 1.25 };
  }
  if (slot % 2 === 0) return { label: 'Sweet spot ride', detail: '15 min warm-up, ' + Math.round(f * (2 + Math.round(w.p))) + ' x ' + Math.round(12 + w.p * 10) + ' min at sweet spot, about 88 to 94 % FTP' + (ftp ? ' (' + Math.round(ftp * 0.88) + ' to ' + Math.round(ftp * 0.94) + ' W)' : '') + ', 5 min easy between, 10 min cool-down.', h: 1.5 };
  return { label: 'VO2 intervals', detail: '20 min warm-up, ' + Math.round(f * (4 + w.p * 2)) + ' x 3 min in zone 5 (' + zt(106, 120) + ') with 3 min easy between, 15 min cool-down.', h: 1.25 };
}
function genBike(o) {
  const g = BIKE_GOALS[o.goal], n = o.weeks, days = BIKE_DAYS[o.perWeek], roles = BIKE_ROLES[o.perWeek], out = [];
  for (let i = 0; i < n; i++) {
    const w = progression(i, n, g.taper); let q = 0, total = 0;
    const sessions = roles.map((role, idx) => { const s = bikeSession(role, o, w, role.startsWith('quality') ? q++ : idx); total += s.h || 0; return { day: days[idx], ...s }; });
    if (w.last) { const l = sessions.find((x) => x.label === 'Long ride') || sessions[sessions.length - 1]; l.label = 'Event day'; l.detail = 'EVENT: ' + o.goal + '. Start steadily, eat and drink from the first hour, ride your own pace.'; }
    out.push({ n: i + 1, phase: w.phase, total: r1(total) + ' h', sessions });
  }
  return out;
}

/* ---------------------------------------------------------------- SWIMMING */
const SWIM_GOALS = { '400 m (learn to swim)': { m: 400, weeks: 12, taper: 0, peak: [700, 900, 1100] }, '750 m (sprint triathlon)': { m: 750, weeks: 10, taper: 1, peak: [1200, 1500, 1800] }, '1500 m (Olympic triathlon)': { m: 1500, weeks: 12, taper: 1, peak: [2000, 2500, 3000] }, '1.9 km (half-distance triathlon)': { m: 1900, weeks: 14, taper: 1, peak: [2400, 3000, 3500] }, '3.8 km (full-distance triathlon)': { m: 3800, weeks: 16, taper: 2, peak: [3200, 3800, 4500] } };
const SWIM_DAYS = { 2: ['Tue', 'Sat'], 3: ['Mon', 'Wed', 'Sat'], 4: ['Mon', 'Tue', 'Thu', 'Sat'] };
const SWIM_ROLES = { 2: ['technique', 'endurance'], 3: ['technique', 'quality', 'endurance'], 4: ['technique', 'quality', 'speed', 'endurance'] };
const LEARN = ['Water confidence: get comfortable with your face in the water, blow bubbles, breathe in and out rhythmically while holding the wall.', 'Float and glide: push off the wall in a streamline (arms stretched overhead), glide as far as you can.', 'Kicking: kick on your front with a board, then with your arms in front without a board, small fast kicks from the hips.', 'Arms: practise one-arm drill (one arm extended, the other pulls), then catch-up drill.', 'Breathing: turn your head to the side to breathe, one ear in the water, while kicking with a board.', 'Put it together: swim 25 m lengths of full front crawl, resting as long as you need between.', 'Build: swim 4 x 25 m, then 3 x 50 m, taking 30 s rest.', 'Build: 4 x 50 m then 2 x 100 m, rest 30 s.', 'Build: 3 x 100 m, rest 30 s, practise breathing every 3 strokes.', 'Build: 2 x 200 m with 30 s rest between.', 'Build: 300 m then 100 m, or a continuous 300 m.', 'Goal week: swim 400 m continuously (rest at the wall when you need to), then repeat to check how it felt.'];
function swimSession(role, o, w, week) {
  const g = SWIM_GOALS[o.goal], lvl = o.level, peak = g.peak[lvl], start = peak * [0.45, 0.55, 0.6][lvl], total = Math.round(((start + (peak - start) * w.p) * w.f) / 50) * 50, css = o.css;
  const rest = (s) => (lvl === 0 ? s + 10 : s) + ' s rest', pace = (d) => (css ? mmss(css + d) + ' per 100 m' : 'by feel'), wu = Math.round(total * 0.2 / 50) * 50 || 100, cd = 100;
  const main = Math.max(100, total - wu - cd);
  if (o.goal.startsWith('400') && week <= LEARN.length) return role === 'endurance' || role === 'technique' ? { label: role === 'technique' ? 'Swim technique' : 'Swim endurance', detail: (role === 'technique' ? 'Learn-to-swim focus: ' : 'Practice session: ') + LEARN[week - 1] + ' Keep it short and relaxed: 20 to 30 minutes.', m: Math.min(600, 150 + week * 40) } : { label: 'Swim technique', detail: 'Repeat last session\'s focus and add 4 x 25 m easy swim between rests.', m: 300 };
  if (role === 'technique') return { label: 'Swim technique', detail: wu + ' m easy warm-up, then ' + Math.round(main / 100) + ' x 100 m as 50 m drill (catch-up, fingertip drag or 6-kick switch) + 50 m swim, ' + rest(20) + ', cool down ' + cd + ' m.', m: total };
  if (role === 'quality') return { label: 'Swim threshold', detail: wu + ' m warm-up, ' + Math.round((main / 100) * (w.phase === 'Taper' ? 0.6 : 1)) + ' x 100 m at ' + pace(0) + ' (your CSS), ' + rest(15) + ', cool down ' + cd + ' m.', m: total };
  if (role === 'speed') return { label: 'Swim speed', detail: wu + ' m warm-up, 8 x 25 m sprint (fast but relaxed technique), ' + rest(30) + ', then ' + Math.max(2, Math.round((main - 200) / 200)) + ' x 100 m easy pull (with a pull buoy), cool down ' + cd + ' m.', m: Math.round(total * 0.8) };
  const rep = Math.max(200, Math.min(800, Math.round(g.m / 4 / 50) * 50)), reps = Math.max(2, Math.round(main / rep));
  return { label: 'Swim endurance', detail: wu + ' m warm-up, ' + reps + ' x ' + rep + ' m steady and smooth at ' + pace(10) + ', ' + rest(20) + ', cool down ' + cd + ' m. Practise sighting if you will swim open water.', m: total };
}
function genSwim(o) {
  const g = SWIM_GOALS[o.goal], n = o.weeks, days = SWIM_DAYS[o.perWeek], roles = SWIM_ROLES[o.perWeek], out = [];
  for (let i = 0; i < n; i++) {
    const w = progression(i, n, g.taper); let total = 0;
    const sessions = roles.map((role, idx) => { const s = swimSession(role, o, w, i + 1); total += s.m || 0; return { day: days[idx], ...s }; });
    if (w.last && g.taper > 0) { const l = sessions[sessions.length - 1]; l.label = 'Event day'; l.detail = 'EVENT: ' + o.goal + '. Warm up in the water if allowed, start smooth, sight often.'; }
    out.push({ n: i + 1, phase: o.goal.startsWith('400') ? 'Learn' : w.phase, total: Math.round(total) + ' m', sessions });
  }
  return out;
}

/* ---------------------------------------------------------------- the planner's session menu */
const MENU = [
  { name: 'Easy run', mins: 40 }, { name: 'Long run', mins: 90, hard: true }, { name: 'Intervals (run)', mins: 55, hard: true }, { name: 'Tempo run', mins: 55, hard: true }, { name: 'Hill sprints', mins: 40, hard: true }, { name: 'Sprints', mins: 40, hard: true },
  { name: 'Easy ride', mins: 60 }, { name: 'Long ride', mins: 180, hard: true }, { name: 'Tempo ride', mins: 75, hard: true }, { name: 'Hill reps', mins: 75, hard: true }, { name: 'Sweet spot ride', mins: 90, hard: true }, { name: 'VO2 intervals', mins: 75, hard: true }, { name: 'Sprints (bike)', mins: 75, hard: true },
  { name: 'Swim technique', mins: 40 }, { name: 'Swim endurance', mins: 45 }, { name: 'Swim threshold', mins: 50, hard: true }, { name: 'Swim speed', mins: 40, hard: true }, { name: 'Race day', mins: 120, hard: true }, { name: 'Event day', mins: 240, hard: true },
  { name: 'Strength session', mins: 45 }, { name: 'Mobility and core', mins: 20 }];
const WEEK_TEMPLATES = {
  'Run: 5K, 3 days': { Tue: ['Easy run'], Thu: ['Intervals (run)'], Sat: ['Mobility and core'], Sun: ['Long run'] },
  'Run: 10K, 4 days': { Mon: ['Easy run'], Wed: ['Intervals (run)'], Fri: ['Easy run', 'Strength session'], Sun: ['Long run'] },
  'Run: marathon, 5 days': { Mon: ['Easy run'], Tue: ['Intervals (run)'], Thu: ['Easy run'], Fri: ['Tempo run', 'Mobility and core'], Sun: ['Long run'] },
  'Bike: 100 km, 4 days': { Tue: ['Sweet spot ride'], Wed: ['Easy ride'], Fri: ['VO2 intervals'], Sun: ['Long ride'] },
  'Swim: 3 days': { Mon: ['Swim technique'], Wed: ['Swim threshold'], Sat: ['Swim endurance'] },
  'Triathlon week (swim, bike, run)': { Mon: ['Swim technique'], Tue: ['Intervals (run)', 'Strength session'], Wed: ['Sweet spot ride'], Thu: ['Swim threshold'], Fri: ['Easy run'], Sat: ['Long ride', 'Easy run'], Sun: ['Long run'] },
};

/* ---------------------------------------------------------------- the tool */
PBE.tool({
  id: 'endurance-training',
  title: 'Run, Bike and Swim',
  notice: 'Not medical advice. Plans are original, general and simple: adjust them to how you feel, and check with a doctor if you are new to exercise or have a health condition. Work in progress: expect bugs. Your data stays in this browser.',
  /* made-up example log: eight weeks of mixed training */
  example: ({ daysAgo, rnd, pick }) => ({
    log: Array.from({ length: 52 }, (_, i) => i).filter(() => rnd() < 0.8).map((i) => { const sport = pick(['Run', 'Run', 'Run', 'Bike', 'Swim']), type = sport === 'Run' ? pick(['Easy', 'Easy', 'Long', 'Intervals', 'Tempo']) : sport === 'Bike' ? pick(['Easy', 'Long', 'Intervals']) : pick(['Technique', 'Endurance']);
      const km = sport === 'Run' ? (type === 'Long' ? 11 + rnd() * 5 : 5 + rnd() * 3) : sport === 'Bike' ? (type === 'Long' ? 50 + rnd() * 30 : 22 + rnd() * 10) : 0.8 + rnd() * 0.8, spd = sport === 'Run' ? 5.8 + rnd() * 0.8 : sport === 'Bike' ? 2.2 + rnd() * 0.4 : 2.4 + rnd() * 0.4;
      return { date: daysAgo(55 - i), sport, type, km: Math.round(km * 10) / 10, mins: Math.round(km * spd * (sport === 'Bike' ? 1 : 1) + (sport === 'Swim' ? 0 : 0)), hr: Math.round(135 + rnd() * 25), rpe: type === 'Easy' || type === 'Technique' ? 3 + Math.round(rnd() * 2) : 6 + Math.round(rnd() * 2), notes: '' }; }),
  }),
  /* sliders: what a recent 5K tells you */
  whatif: ({ h }) => {
    const st = { t5: 25, km: 30, easy: 70 }, out = h('div', {});
    const draw = () => { const t = st.t5 * 60, z = runZones(t), long = Math.round(st.km * 0.3); PBE.fill(out, h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Predicted race', 'Time', 'Pace per km'].map((x) => h('th', {}, x)))), h('tbody', {}, [['10K', 10], ['Half marathon', 21.0975], ['Marathon', 42.195]].map(([n, d]) => h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, hms(riegel(t, 5, d))), h('td', { class: 'n' }, mmss(riegel(t, 5, d) / d))))))),
      h('p', { class: 'lede' }, 'Easy pace about ' + mmss(z.easy[0]) + ' to ' + mmss(z.easy[1]) + ' per km. Tempo about ' + mmss(z.tempo[0]) + ' per km. Intervals about ' + mmss(z.interval[0]) + ' per km.'),
      h('p', { class: 'meta' }, 'A week of ' + st.km + ' km with ' + st.easy + ' % of it easy: about ' + Math.round(st.km * st.easy / 100) + ' km easy and ' + Math.round(st.km * (100 - st.easy) / 100) + ' km of quicker running. A long run of about ' + long + ' km would be roughly 30 % of the week. Predictions use Riegel\'s formula: a rough guide that gets less reliable for the marathon.')); };
    draw();
    return h('div', {}, h('h3', {}, 'What does a 5K time predict?'), PBEcharts.slider('Recent 5K time', 15, 45, 0.5, st.t5, (v) => { st.t5 = v; draw(); }, 'minutes'), PBEcharts.slider('Weekly distance', 10, 100, 1, st.km, (v) => { st.km = v; draw(); }, 'km'), PBEcharts.slider('Share of the week that is easy', 50, 95, 5, st.easy, (v) => { st.easy = v; draw(); }, '%'), out);
  },
  tabs: [
    /* plan builder */
    { id: 'plan', label: 'Plan builder', type: 'custom', render: ({ h, get, set }) => {
      const saved = get('planopts', { sport: 'Run', goal: '10K', level: 1, weeks: 10, per: 4, t5: '25:00', ftp: '', css: '' });
      const out = h('div', {});
      const sel = (id, opts, v) => { const s = h('select', { id }, opts.map(([val, label]) => h('option', { value: val }, label))); s.value = v; return s; };
      const sport = sel('e_sport', [['Run', 'Run'], ['Bike', 'Bike'], ['Swim', 'Swim']], saved.sport), goal = h('select', { id: 'e_goal' }), level = sel('e_level', [[0, 'Beginner'], [1, 'Intermediate'], [2, 'Advanced']], saved.level), per = sel('e_per', [[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], saved.per);
      const weeks = h('input', { id: 'e_weeks', type: 'number', min: 4, max: 30, value: saved.weeks }), t5 = h('input', { id: 'e_t5', type: 'text', value: saved.t5, placeholder: 'e.g. 25:00' }), ftp = h('input', { id: 'e_ftp', type: 'number', value: saved.ftp, placeholder: 'watts, optional' }), css = h('input', { id: 'e_css', type: 'text', value: saved.css, placeholder: 'sec per 100 m, optional' });
      const goalsFor = () => ({ Run: Object.keys(RUN_GOALS), Bike: Object.keys(BIKE_GOALS), Swim: Object.keys(SWIM_GOALS) })[sport.value];
      const fillGoals = (keep) => { const gs = goalsFor(); goal.replaceChildren(...gs.map((x) => h('option', { value: x }, x))); goal.value = keep && gs.includes(keep) ? keep : gs[Math.min(1, gs.length - 1)]; };
      fillGoals(saved.goal);
      const defaults = () => { const G = ({ Run: RUN_GOALS, Bike: BIKE_GOALS, Swim: SWIM_GOALS })[sport.value][goal.value]; weeks.value = G.weeks; per.value = sport.value === 'Swim' ? 3 : 4; };
      const build = () => {
        const v = { sport: sport.value, goal: goal.value, level: Number(level.value), weeks: Math.max(4, Math.min(30, Number(weeks.value) || 8)), per: Number(per.value), t5: t5.value, ftp: Number(ftp.value) || 0, css: Number(css.value) || 0 };
        if (v.sport === 'Swim' && v.per > 4) v.per = 4; if (v.sport === 'Swim' && v.per < 2) v.per = 2; if (v.sport !== 'Swim' && v.per < 3) v.per = 3;
        set('planopts', v);
        const o = { goal: v.goal, level: v.level, weeks: v.weeks, perWeek: v.per, zones: runZones(toSec(v.t5) || 1500), ftp: v.ftp, css: v.css };
        const weeksOut = v.sport === 'Run' ? genRun(o) : v.sport === 'Bike' ? genBike(o) : genSwim(o);
        set('plan', { ...v, weeks: weeksOut }); show();
      };
      const show = () => {
        const p = get('plan', null);
        if (!p) { PBE.fill(out, h('p', { class: 'meta' }, 'Choose your goal and press "Build the plan".')); return; }
        const z = runZones(toSec(p.t5) || 1500);
        PBE.fill(out, h('h2', {}, p.sport + ': ' + p.goal + ', ' + p.weeks.length + ' weeks, ' + ['beginner', 'intermediate', 'advanced'][p.level]),
          p.sport === 'Run' ? h('p', { class: 'lede' }, 'Your paces (from a ' + p.t5 + ' 5K): easy ' + mmss(z.easy[0]) + ' to ' + mmss(z.easy[1]) + ', tempo ' + mmss(z.tempo[0]) + ', intervals ' + mmss(z.interval[0]) + ', ' + p.goal + ' about ' + (p.goal === '5K' ? mmss(z.fiveK[0]) : p.goal === '10K' ? mmss(z.tenk[0]) : p.goal === 'Half marathon' ? mmss(z.half[0]) : p.goal === 'Marathon' ? mmss(z.marathon[0]) : mmss(z.easy[0])) + ' per km' + (p.goal === '50K ultra' ? ' (ultras are run by effort: easy pace or slower, walking the hills)' : '') + '.') : null,
          p.sport === 'Swim' && !p.css ? h('p', { class: 'meta' }, 'Add your CSS (see the Calculators tab) to get pace targets in the swim sessions.') : null,
          p.sport === 'Bike' && !p.ftp ? h('p', { class: 'meta' }, 'Add your FTP in watts (see the Calculators tab) to get power targets; otherwise use the zone effort descriptions.') : null,
          h('p', { class: 'meta' }, 'Every fourth week is lighter, and the last weeks taper before the event. Move days around to suit your week: the Week planner can fill a calendar from any week of this plan.'),
          p.weeks.map((w) => h('div', {}, h('h3', {}, 'Week ' + w.n + ' · ' + w.phase + ' · ' + w.total), h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, w.sessions.map((s) => h('tr', {}, h('td', { style: 'width:60px' }, h('strong', {}, s.day)), h('td', { style: 'width:150px' }, s.label), h('td', { class: 'meta' }, s.detail)))))))));
      };
      sport.addEventListener('change', () => { fillGoals(); defaults(); }); goal.addEventListener('change', defaults);
      show();
      return h('div', {}, h('p', { class: 'meta' }, 'Pick a sport, a goal and your level, and it writes a week-by-week plan with easy days, long sessions, intervals, sprints and a taper. Running paces come from a recent 5K time, bike targets from your FTP, and swim targets from your CSS: all optional.'),
        h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Sport', sport), h('label', { class: 'fld' }, 'Goal', goal), h('label', { class: 'fld' }, 'Level', level), h('label', { class: 'fld' }, 'Weeks', weeks), h('label', { class: 'fld' }, 'Sessions a week', per),
          h('label', { class: 'fld' }, 'Recent 5K time (running)', t5), h('label', { class: 'fld' }, 'FTP (cycling)', ftp), h('label', { class: 'fld' }, 'CSS per 100 m (swimming)', css)),
        h('p', {}, h('button', { type: 'button', onclick: build }, 'Build the plan'), ' ', h('button', { type: 'button', onclick: () => window.print() }, 'Print')),
        out);
    } },
    { id: 'week', label: 'Week planner', type: 'custom', render: ({ weekPlanner, get }) => weekPlanner({ id: 'weekplan', sessions: MENU, templates: WEEK_TEMPLATES, intro: 'Plot a training week on a calendar. Dark boxes are hard sessions: the planner warns about back-to-back hard days and missing rest days. You can start from a template or fill it from any week of your plan.',
      fromPlan: (n) => { const p = get('plan', null); if (!p || !p.weeks[n - 1]) return null; const d = {}; p.weeks[n - 1].sessions.forEach((s) => { (d[s.day] = d[s.day] || []).push(MENU.some((m) => m.name === s.label) ? s.label : 'Easy run'); }); return d; } }) },
    { id: 'log', label: 'Training log', type: 'log', addLabel: 'Log a session', intro: 'Log each session. Pace or speed is worked out for you, and the dashboard charts your training. For swimming, enter the distance in kilometres (for example 0.8 for 800 m).',
      required: ['sport', 'km', 'mins'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'sport', label: 'Sport', type: 'select', options: ['Run', 'Bike', 'Swim', 'Strength', 'Other'], keep: true }, { key: 'type', label: 'Session type', type: 'select', options: ['Easy', 'Long', 'Intervals', 'Tempo', 'Sprints', 'Technique', 'Endurance', 'Race', 'Recovery'], keep: true }, { key: 'km', label: 'Distance', type: 'number', unit: 'km' }, { key: 'mins', label: 'Time', type: 'number', unit: 'min' }, { key: 'hr', label: 'Average heart rate', type: 'number', unit: 'bpm' }, { key: 'rpe', label: 'Effort (1-10)', type: 'number', min: 1, max: 10, step: 1 }, { key: 'notes', label: 'Notes' }],
      filterBy: 'sport',
      computed: [{ key: 'pace', label: 'Pace /km', fn: (r) => (r.km && r.mins && r.sport === 'Run' ? mmss((r.mins * 60) / r.km) : r.km && r.mins && r.sport === 'Swim' ? mmss((r.mins * 60) / (r.km * 10)) + ' /100m' : '') }, { key: 'speed', label: 'Speed km/h', fn: (r) => (r.km && r.mins && r.sport !== 'Swim' ? Math.round((r.km / (r.mins / 60)) * 10) / 10 : '') }, { key: 'wk', label: 'Week of', fn: (r) => { const d = new Date(r.date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); } }],
      summary: (r) => [['Sessions', r.length], ['Distance', Math.round(r.reduce((s, x) => s + (x.km || 0), 0)) + ' km'], ['Time', Math.round(r.reduce((s, x) => s + (x.mins || 0), 0) / 6) / 10 + ' h'], ['Longest', Math.max(...r.map((x) => x.km || 0)) + ' km']],
      charts: [{ title: 'Distance per week (km)', kind: 'bar', by: 'wk', avgSum: true, unit: 'km' }, { title: 'Sessions by sport', kind: 'bar', by: 'sport', unit: 'sessions' }, { title: 'Distance of each session over time', y: 'km', unit: 'km' }, { title: 'Sessions by type', kind: 'bar', by: 'type', unit: 'sessions' }] },
    { id: 'habits', label: 'Habits', type: 'checks', view: 'grid', intro: 'The small things that make training work. Tick the boxes as you go.',
      items: [{ id: 'sleep', name: 'Sleep 7 to 9 hours', every: 'daily', group: 'Recovery' }, { id: 'water', name: 'Drink enough water through the day', every: 'daily', group: 'Recovery' }, { id: 'mob', name: 'Mobility and foam rolling, 10 minutes', every: 'daily', group: 'Recovery' },
        { id: 'strides', name: 'Run strides, 5 x 20 seconds', every: 'weekly', group: 'Running' }, { id: 'str', name: 'Strength session (legs, hips, core)', every: 'weekly', group: 'Strength' }, { id: 'core', name: 'Core and hip stability', every: 'weekly', group: 'Strength' },
        { id: 'drills', name: 'Swim drills, 10 minutes', every: 'weekly', group: 'Swimming' }, { id: 'chain', name: 'Clean and lube the bike chain', every: 'monthly', group: 'Bike' }, { id: 'tyres', name: 'Check bike tyre pressure and brakes', every: 'weekly', group: 'Bike' }, { id: 'shoes', name: 'Rotate or check running shoes', every: 'monthly', group: 'Running' }] },
    { id: 'gear', label: 'Gear and dates', type: 'dates', intro: 'Running shoes usually last about 500 to 800 km (300 to 500 miles): note when you started a pair. Also useful: bike service, race entry, goal event.',
      items: [{ id: 'race', name: 'Goal event date' }, { id: 'shoes', name: 'Replace running shoes by' }, { id: 'bike', name: 'Bike service due' }, { id: 'wetsuit', name: 'Check swim gear and wetsuit' }, { id: 'entry', name: 'Race entry deadline' }] },
    { id: 'calc', label: 'Calculators', type: 'custom', render: ({ h, get, set }) => {
      const out = h('div', {});
      const s = get('calc', { dist: 10, time: '50:00', t5: '25:00', ftp: 220, t20: 230, t400: '7:20', t200: '3:30' });
      const f = (id, label, v, type) => h('label', { class: 'fld' }, label, h('input', { id, type: type || 'text', value: v, step: 'any' }));
      const draw = () => {
        const g = (id) => document.getElementById(id).value, dist = Number(g('c_dist')), sec = toSec(g('c_time')), t5 = toSec(g('c_t5')), ftp = Number(g('c_ftp')) || 0, t20 = Number(g('c_t20')) || 0, t400 = toSec(g('c_t400')), t200 = toSec(g('c_t200'));
        set('calc', { dist, time: g('c_time'), t5: g('c_t5'), ftp: g('c_ftp'), t20: g('c_t20'), t400: g('c_t400'), t200: g('c_t200') });
        const ftpUse = ftp || (t20 ? Math.round(t20 * 0.95) : 0), z = t5 ? runZones(t5) : null;
        PBE.fill(out,
          h('h3', {}, 'Pace, speed and time'), dist > 0 && sec > 0 ? h('p', { class: 'lede' }, mmss(sec / dist) + ' per km · ' + mmss(sec / (dist * 0.621371)) + ' per mile · ' + r1(dist / (sec / 3600)) + ' km/h') : h('p', { class: 'meta' }, 'Enter a distance and a time.'),
          h('h3', {}, 'Race predictions (Riegel, from your 5K time)'), t5 ? h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, [['5K', 5], ['10K', 10], ['10 miles', 16.0934], ['Half marathon', 21.0975], ['Marathon', 42.195], ['50K', 50]].map(([n, d]) => h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, hms(riegel(t5, 5, d))), h('td', { class: 'n' }, mmss(riegel(t5, 5, d) / d) + ' /km')))))) : null,
          z ? h('div', {}, h('h3', {}, 'Running zones (per km)'), h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, [['Easy', z.easy], ['Long run', z.long], ['Tempo (threshold)', z.tempo], ['Intervals', z.interval], ['Repetitions and strides', z.rep]].map(([n, a]) => h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, mmss(a[0]) + ' to ' + mmss(a[1]))))))), h('p', { class: 'meta' }, 'Rough multipliers of 5K pace; heart rate and feel are just as valid.')) : null,
          h('h3', {}, 'Cycling zones from FTP'), ftpUse ? h('div', {}, h('p', { class: 'lede' }, 'FTP used: ' + ftpUse + ' W' + (!ftp && t20 ? ' (95 % of your 20-minute average power)' : '')), h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Zone', 'Watts', 'Feel'].map((x) => h('th', {}, x)))), h('tbody', {}, BIKE_ZONES.map(([n, a, b, d]) => h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, b ? Math.round(ftpUse * a / 100) + ' to ' + Math.round(ftpUse * b / 100) : 'over ' + Math.round(ftpUse * a / 100)), h('td', { class: 'meta' }, d))))))) : h('p', { class: 'meta' }, 'Enter your FTP, or your best 20-minute average power (FTP is about 95 % of it).'),
          h('h3', {}, 'Swim: critical swim speed (CSS)'), t400 && t200 && t400 > t200 ? h('div', {}, h('p', { class: 'lede' }, 'CSS pace: ' + mmss(cssPer100(t400, t200)) + ' per 100 m'), h('p', { class: 'meta' }, 'Easy about ' + mmss(cssPer100(t400, t200) + 12) + ', threshold ' + mmss(cssPer100(t400, t200)) + ', speed work about ' + mmss(cssPer100(t400, t200) - 6) + ' per 100 m. (Enter as the plan builder\'s CSS: ' + Math.round(cssPer100(t400, t200)) + ' seconds.)')) : h('p', { class: 'meta' }, 'Swim a 400 m and a 200 m time trial (with a good rest between) and enter both times.'),
          h('h3', {}, 'Fuelling a long session (general guidance)'), h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Duration', 'Carbohydrate while exercising'].map((x) => h('th', {}, x)))), h('tbody', {}, [['under 1 hour', 'not needed for most people; water'], ['1 to 2 hours', 'about 30 to 60 g an hour'], ['2.5 hours and more', 'about 60 to 90 g an hour, from mixed sources, trained in advance']].map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))), h('p', { class: 'meta' }, 'General sports-nutrition figures; practise in training and ask a sports dietitian for advice that fits you. Drink to thirst and in hot weather take more, including salt.'));
      };
      const form = h('div', { class: 'form' }, f('c_dist', 'Distance (km)', s.dist, 'number'), f('c_time', 'Time (h:mm:ss or mm:ss)', s.time), f('c_t5', 'Recent 5K time', s.t5), f('c_ftp', 'FTP (W), if known', s.ftp, 'number'), f('c_t20', '20-minute power (W), if no FTP', s.t20, 'number'), f('c_t400', 'Swim 400 m time', s.t400), f('c_t200', 'Swim 200 m time', s.t200));
      form.addEventListener('input', draw); setTimeout(draw, 0);
      return h('div', {}, h('p', { class: 'meta' }, 'Enter what you know and the numbers update.'), form, out);
    } },
    { id: 'sessions', label: 'Session types', type: 'static', blocks: [
      { h: 'Running sessions', table: [['Session', 'What it is', 'Why'], ['Easy run', 'Conversational pace, you can speak in sentences.', 'Builds your aerobic base with little stress. Most running should be easy.'], ['Long run', 'The longest run of the week, at easy pace.', 'Trains endurance, fuelling and your legs for time on your feet.'], ['Tempo run', '15 to 40 minutes at "comfortably hard", a few words at a time.', 'Raises the pace you can hold for a long time (lactate threshold).'], ['Intervals', 'Repeated efforts (for example 6 x 800 m) with jog recovery.', 'Improves speed and the ability to run hard (VO2 max).'], ['Hill sprints', '8 to 12 seconds all-out uphill, full recovery.', 'Builds power and running form with little impact.'], ['Sprints and strides', 'Short, fast but relaxed 20 s efforts or 100 m.', 'Keeps leg speed and running economy sharp.'], ['Fartlek', 'Unstructured fast and slow ("speed play").', 'A friendly way to introduce quality.'], ['Run/walk', 'Alternate running and walking.', 'A gentle way to start, or to run long.']] },
      { h: 'Cycling sessions', table: [['Session', 'What it is', 'Why'], ['Endurance (zone 2)', 'Long, steady, chatty rides.', 'The foundation of cycling fitness.'], ['Tempo (zone 3)', 'Steady, a bit hard, 10 to 30 minute blocks.', 'Builds muscular endurance.'], ['Sweet spot', '88 to 94 % of FTP in 10 to 30 minute blocks.', 'A very efficient way to raise FTP.'], ['Threshold', '95 to 105 % of FTP, 2 x 20 minutes.', 'Improves the power you can hold for an hour.'], ['VO2 intervals', '3 to 5 minutes at 106 to 120 % FTP, with equal rest.', 'Raises your maximum aerobic power.'], ['Hill reps', 'Repeated climbs of several minutes.', 'Strength and threshold power.'], ['Sprints', '6 to 10 s all-out from a slow roll.', 'Neuromuscular power.'], ['Recovery spin', 'Very easy spinning in zone 1.', 'Helps you recover between hard days.']] },
      { h: 'Swimming sessions', table: [['Session', 'What it is', 'Why'], ['Technique', 'Drills (catch-up, fingertip drag, 6-kick switch, sculling) alternating with swimming.', 'Better technique saves more energy than getting fitter.'], ['Endurance', 'Longer steady swims or repeats of 200 to 800 m.', 'Builds the ability to swim your goal distance.'], ['Threshold', 'Repeats of 100 to 400 m at CSS pace with short rest.', 'Raises the pace you can hold.'], ['Speed', '25 m sprints with long rest, pulling or paddles.', 'Power and efficient fast technique.']] },
      { h: 'The rules behind the plans', list: ['Do most of your training easy and keep hard sessions few: a common guide is about 80 % easy and 20 % hard.', 'Increase volume gradually: roughly no more than 10 % a week.', 'Make every fourth week lighter (about 20 to 30 % less) so your body can absorb the training.', 'Taper before the race: cut volume for 1 to 3 weeks (depending on the distance) but keep a little intensity.', 'Drills in every swim session; strength work for runners and cyclists; sleep and food count as training.', 'If something hurts (sharp, or getting worse), stop and rest; see a physiotherapist if it persists.'] },
      { h: 'Swimming for beginners', list: ['Start in a pool with lane lines and a wall nearby; a coach or beginner lesson makes the biggest difference.', 'Equipment: swimsuit, goggles, swim cap (optional), a kick board and pull buoy for drills.', 'Front crawl in short: lie flat and long, kick from the hips, rotate your body with each stroke, breathe by turning your head to the side (not lifting it).', 'Learn bilateral breathing (every 3 strokes) so you can breathe to both sides.', 'Pool etiquette: circle swim in busy lanes, let faster swimmers pass at the wall, pick a lane that matches your pace.', 'Open water is different: practise sighting (lifting your eyes forward every 6 to 10 strokes) and only swim in supervised places.'] },
      { h: 'Where these ideas come from', list: ['Swim plans and the "10 % a week, easier every fourth week, drills in every session" rules: Swim Science plan pages (swimscience.github.io).', 'Running session types and plan lengths (for example Couch to 5K at 8 weeks, 10K in 8 to 10 weeks, half marathon about 12 weeks, marathon about 16 weeks): Coach magazine, "Running training plans explained".', 'Pace zones, FTP zones, CSS and fuelling figures are widely published coaching conventions (such as Coggan power zones and Riegel\'s formula); I have written them from general knowledge, not from one source.', 'Apps such as Runna, Nike Run Club and TrainingPeaks plans are proprietary: this tool does not copy them, but is built on the same common ideas. Their plans are worth looking at if you want a coached experience.'] }] },
  ],
});
