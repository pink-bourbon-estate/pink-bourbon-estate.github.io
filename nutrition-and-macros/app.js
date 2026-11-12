/* Nutrition and Macros - work out calorie and macro targets for cutting, maintaining or lean bulking, keep a food list,
   log meals against your targets, and build day meal plans that scale to your numbers. Built on tracker.js.
   Saved in this browser only. Not medical or dietitian advice (see the notice and the Databases tab).

   The maths, in plain words:
   - BMR (calories you burn at rest) uses the Mifflin-St Jeor equation: 10 x kg + 6.25 x cm - 5 x age, then +5 (male) or -161 (female).
   - TDEE (total daily energy) is BMR x an activity number (1.2 desk job and little exercise ... 1.9 very hard training).
   - Target calories = TDEE adjusted for your goal (a cut, maintenance or a lean bulk).
   - Protein is set per kilo of body weight, fat as a share of calories, and carbohydrate fills what is left.
   These are estimates and starting points: adjust from what your weight actually does over a few weeks. */

const ACTIVITY = [['Little exercise, desk job', 1.2], ['Light: 1 to 3 workouts a week', 1.375], ['Moderate: 3 to 5 workouts a week', 1.55], ['Hard: 6 to 7 workouts a week', 1.725], ['Very hard: physical job plus training', 1.9]];
/** Goals: calorie change as a share of TDEE, and protein in grams per kilo of body weight. Common published ranges, not rules. */
const GOALS = { 'Cut (lose fat)': { adj: -0.2, protein: 2.2, note: 'A moderate deficit, often described as losing about 0.5 to 1 % of body weight a week. Slower is easier to keep and tends to protect muscle.' }, 'Maintain': { adj: 0, protein: 1.8, note: 'Eating at about your maintenance calories.' }, 'Lean bulk (gain muscle)': { adj: 0.1, protein: 1.8, note: 'A small surplus, often described as gaining about 0.25 to 0.5 % of body weight a week, to add muscle with less fat.' } };
/** Mifflin-St Jeor resting energy. */
const bmr = (sex, kg, cm, age) => 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
/** Work out targets. fatPct is the share of calories from fat. */
function targets(o) {
  const g = GOALS[o.goal], tdee = bmr(o.sex, o.kg, o.cm, o.age) * o.act, kcal = Math.round((tdee * (1 + g.adj)) / 10) * 10, protein = Math.round(o.kg * (o.protein || g.protein)), fat = Math.round((kcal * (o.fatPct / 100)) / 9), carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr(o.sex, o.kg, o.cm, o.age)), tdee: Math.round(tdee), kcal, protein, fat, carbs };
}

/* A starter list of everyday foods, per 100 g (approximate, rounded, typical values). Always check the label of what you actually eat.
   [name, kcal, protein, carbs, fat, usual serving in grams] */
const FOODS = [['Porridge oats (dry)', 370, 12, 60, 8, 40], ['Semi-skimmed milk', 47, 3.6, 4.8, 1.7, 200], ['Greek yoghurt, 0 % fat', 57, 10, 4, 0.2, 150], ['Whole egg', 143, 12.5, 0.7, 10, 60], ['Egg white', 52, 11, 0.7, 0.2, 33], ['Chicken breast (raw)', 110, 23, 0, 1.5, 150], ['Turkey mince 2 % fat (raw)', 110, 23, 0, 2, 125], ['Lean beef mince 5 % (raw)', 137, 21, 0, 5, 125], ['Salmon fillet (raw)', 200, 20, 0, 13, 120], ['White fish (cod, raw)', 82, 18, 0, 0.7, 140], ['Tuna in water (drained)', 110, 25, 0, 1, 110], ['Tofu, firm', 120, 13, 2, 7, 120], ['Lentils (cooked)', 116, 9, 20, 0.4, 150], ['Chickpeas (tinned, drained)', 120, 8, 16, 2.5, 120], ['White rice (raw)', 360, 7, 79, 0.6, 75], ['Brown rice (raw)', 350, 8, 74, 2.8, 75], ['Pasta (dry)', 350, 12, 70, 1.5, 80], ['Potato (raw)', 77, 2, 17, 0.1, 250], ['Sweet potato (raw)', 86, 1.6, 20, 0.1, 200], ['Wholemeal bread', 230, 10, 41, 3, 40], ['White bread', 245, 8.5, 47, 2, 40], ['Banana', 89, 1.1, 23, 0.3, 120], ['Apple', 52, 0.3, 14, 0.2, 180], ['Blueberries', 57, 0.7, 14, 0.3, 80], ['Broccoli', 34, 2.8, 7, 0.4, 90], ['Spinach', 23, 2.9, 3.6, 0.4, 60], ['Mixed salad leaves', 18, 1.5, 2, 0.2, 60], ['Tomato', 18, 0.9, 3.9, 0.2, 80], ['Avocado', 160, 2, 9, 15, 80], ['Olive oil', 884, 0, 0, 100, 10], ['Peanut butter', 600, 25, 12, 50, 20], ['Almonds', 580, 21, 22, 50, 25], ['Cheddar cheese', 410, 25, 0.1, 34, 30], ['Cottage cheese', 98, 11, 3.4, 4.3, 100], ['Whey protein powder', 400, 80, 8, 6, 30], ['Dark chocolate (70 %)', 580, 8, 35, 43, 20], ['Honey', 304, 0.3, 82, 0, 15]];
const DAYS = {
  'Cut day (high protein, about 1800 to 2200 kcal)': [['Breakfast', [['Porridge oats (dry)', 50], ['Semi-skimmed milk', 200], ['Blueberries', 80], ['Whey protein powder', 25]]], ['Lunch', [['Chicken breast (raw)', 170], ['White rice (raw)', 60], ['Broccoli', 150], ['Olive oil', 8]]], ['Snack', [['Greek yoghurt, 0 % fat', 200], ['Banana', 100]]], ['Dinner', [['White fish (cod, raw)', 200], ['Potato (raw)', 250], ['Spinach', 80], ['Olive oil', 8]]]],
  'Maintenance day (about 2200 to 2600 kcal)': [['Breakfast', [['Whole egg', 120], ['Wholemeal bread', 80], ['Avocado', 60], ['Tomato', 80]]], ['Lunch', [['Tuna in water (drained)', 110], ['Pasta (dry)', 85], ['Mixed salad leaves', 60], ['Olive oil', 10]]], ['Snack', [['Apple', 180], ['Peanut butter', 25]]], ['Dinner', [['Salmon fillet (raw)', 140], ['Brown rice (raw)', 80], ['Broccoli', 150]]]],
  'Bulk day (high carbohydrate, about 3000 to 3400 kcal)': [['Breakfast', [['Porridge oats (dry)', 90], ['Semi-skimmed milk', 300], ['Banana', 120], ['Peanut butter', 30], ['Whey protein powder', 30]]], ['Lunch', [['Chicken breast (raw)', 200], ['White rice (raw)', 100], ['Mixed salad leaves', 60], ['Olive oil', 12]]], ['Snack', [['Greek yoghurt, 0 % fat', 250], ['Honey', 20], ['Almonds', 30]]], ['Dinner', [['Lean beef mince 5 % (raw)', 200], ['Pasta (dry)', 110], ['Tomato', 150], ['Cheddar cheese', 30]]]],
};
const macro = (f, g) => ({ kcal: (f[1] * g) / 100, p: (f[2] * g) / 100, c: (f[3] * g) / 100, f: (f[4] * g) / 100 });
const sum = (xs) => xs.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });

PBE.tool({
  id: 'nutrition-and-macros',
  title: 'Nutrition and Macros',
  example: ({ daysAgo }) => ({
    setup: { sex: 'male', age: 30, cm: 178, kg: 80, act: 1.55, goal: 'Maintain', fatPct: 28 },
    diary: Array.from({ length: 6 }, (_, d) => DAYS['Maintenance day (about 2200 to 2600 kcal)'].flatMap(([meal, items]) => items.map(([n, g]) => { const f = FOODS.find((x) => x[0] === n), m = macro(f, g); return { date: daysAgo(d), meal, food: n, grams: g, kcal: Math.round(m.kcal), p: Math.round(m.p), c: Math.round(m.c), f: Math.round(m.f) }; }))).flat(),
  }),
  whatif: ({ h, round }) => {
    const st = { kg: 80, deficit: 400 }, out = h('div', {});
    const draw = () => { const wk = (st.deficit * 7) / 7700; PBE.fill(out, h('p', { class: 'lede' }, 'A steady ' + st.deficit + ' kcal a day below maintenance is about ' + round(wk, 2) + ' kg a week (' + round((wk / st.kg) * 100, 2) + ' % of body weight).'), h('p', { class: 'meta' }, 'Uses the rule of thumb of about 7700 kcal per kilo of body weight. It is a rough guide: the body adapts, water shifts, and real results vary. Judge by your weight over several weeks.')); };
    draw(); return h('div', {}, h('h3', {}, 'What does a daily calorie gap do?'), PBEcharts.slider('Body weight', 45, 150, 1, st.kg, (v) => { st.kg = v; draw(); }, 'kg'), PBEcharts.slider('Daily calories below (+) or above (-) maintenance', -600, 1000, 50, st.deficit, (v) => { st.deficit = v; draw(); }, 'kcal'), out);
  },
  notice: 'General information and a notebook, not medical or dietitian advice. Numbers are estimates. If you have a health condition, are pregnant, are under 18, or counting food has ever felt hard for you, talk to a doctor or registered dietitian first. Work in progress: expect bugs. Your data stays in this browser.',
  tabs: [
    { id: 'targets', label: 'Targets', type: 'custom', render: ({ h, get, set, round }) => {
      const s = get('setup', { sex: 'male', age: 30, cm: 175, kg: 75, act: 1.55, goal: 'Maintain', fatPct: 28 }), out = h('div', {});
      const sel = (id, opts, v) => { const e = h('select', { id }, opts.map(([val, l]) => h('option', { value: val }, l))); e.value = v; return e; };
      const num = (id, label, v, ex) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value: v, step: 'any', min: 0, ...ex }));
      const draw = () => {
        const g = (id) => document.getElementById(id).value, o = { sex: g('t_sex'), age: Number(g('t_age')), cm: Number(g('t_cm')), kg: Number(g('t_kg')), act: Number(g('t_act')), goal: g('t_goal'), fatPct: Number(g('t_fat')) || 28 };
        set('setup', o); if (!(o.age && o.cm && o.kg)) { PBE.fill(out, h('p', { class: 'meta' }, 'Fill in the boxes to see your numbers.')); return; }
        const t = targets(o), gl = GOALS[o.goal];
        PBE.fill(out, h('p', { class: 'lede' }, t.kcal + ' kcal a day: ' + t.protein + ' g protein, ' + t.carbs + ' g carbohydrate, ' + t.fat + ' g fat'),
          h('p', { class: 'meta' }, 'Resting energy about ' + t.bmr + ' kcal; with your activity about ' + t.tdee + ' kcal to maintain. ' + gl.note),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['', 'Per day', 'Per kg body weight', 'Share of calories'].map((x) => h('th', {}, x)))), h('tbody', {}, [['Protein', t.protein, 4], ['Carbohydrate', t.carbs, 4], ['Fat', t.fat, 9]].map(([n, gm, k]) => h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, gm + ' g'), h('td', { class: 'n' }, round(gm / o.kg, 1) + ' g/kg'), h('td', { class: 'n' }, Math.round((gm * k / t.kcal) * 100) + ' %')))))),
          h('p', { class: 'meta' }, 'Protein is set per kilo of body weight (many sports-nutrition reviews describe about 1.6 to 2.2 g per kg as useful for building or keeping muscle); fat is a share of calories; carbohydrate is what is left. Treat these as a starting point and adjust from your own results over three or four weeks.'),
          h('p', {}, h('button', { type: 'button', onclick: () => { set('goalset', { kcal: t.kcal, p: t.protein, c: t.carbs, f: t.fat }); out.append(h('p', { class: 'meta' }, 'Saved as your daily targets for the Diary.')); } }, 'Use these as my daily targets')));
      };
      const form = h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Sex (for the equation)', sel('t_sex', [['male', 'Male'], ['female', 'Female']], s.sex)), num('t_age', 'Age', s.age), num('t_cm', 'Height (cm)', s.cm), num('t_kg', 'Weight (kg)', s.kg), h('label', { class: 'fld' }, 'Activity', sel('t_act', ACTIVITY.map(([l, v]) => [v, l]), s.act)), h('label', { class: 'fld' }, 'Goal', sel('t_goal', Object.keys(GOALS).map((k) => [k, k]), s.goal)), num('t_fat', 'Fat, % of calories', s.fatPct));
      form.addEventListener('input', draw); setTimeout(draw, 0);
      return h('div', {}, h('p', { class: 'meta' }, 'Work out calories and macros for a cut, maintenance or lean bulk. Everything is calculated in your browser.'), form, out);
    } },
    { id: 'diary', label: 'Food diary', type: 'custom', render: ({ h, get, set, today, round, rerender }) => {
      const foods = get('foods', null) || FOODS, rows = get('diary', []), tg = get('goalset', null), date = get('diaryday', today());
      const day = rows.filter((r) => r.date === date), tot = sum(day.map((r) => ({ kcal: r.kcal, p: r.p, c: r.c, f: r.f })));
      const dl = h('datalist', { id: 'fd_list' }, foods.map((f) => h('option', { value: f[0] }))), inFood = h('input', { id: 'fd_food', list: 'fd_list', placeholder: 'Type to find a food' }), inG = h('input', { id: 'fd_g', type: 'number', min: 0, step: 'any', placeholder: 'grams' }), meal = h('select', { id: 'fd_meal' }, ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => h('option', { value: m }, m))), dsel = h('input', { type: 'date', value: date });
      inFood.addEventListener('change', () => { const f = foods.find((x) => x[0] === inFood.value); if (f && !inG.value) inG.value = f[5]; });
      dsel.addEventListener('change', () => { set('diaryday', dsel.value || today()); rerender(); });
      const bar = (label, v, target, unit) => h('div', { style: 'margin:6px 0' }, h('div', { class: 'meta' }, label + ': ' + Math.round(v) + (target ? ' of ' + target : '') + ' ' + unit), target ? h('div', { style: 'background:var(--line);height:8px' }, h('div', { style: 'background:var(--ink);height:8px;width:' + Math.min(100, (v / target) * 100) + '%' })) : null);
      const add = () => { const f = foods.find((x) => x[0] === inFood.value.trim()), g = Number(inG.value); if (!f || !g) return; const m = macro(f, g); rows.push({ date, meal: meal.value, food: f[0], grams: g, kcal: Math.round(m.kcal), p: Math.round(m.p * 10) / 10, c: Math.round(m.c * 10) / 10, f: Math.round(m.f * 10) / 10 }); set('diary', rows); rerender(); };
      const byDay = {}; rows.forEach((r) => { byDay[r.date] = (byDay[r.date] || 0) + (r.kcal || 0); });
      const pts = Object.keys(byDay).sort().slice(-14).map((d) => ({ x: d, y: Math.round(byDay[d]) })), chart = h('div', { class: 'chart' }); PBEcharts.line(chart, pts, { unit: 'kcal', empty: 'Log a few days to see calories over time.' });
      return h('div', {}, h('p', { class: 'meta' }, 'Pick a food, enter the grams (weigh it raw or as the list says), and add it. ' + (tg ? '' : 'Set your daily targets in the Targets tab to see progress bars.')), h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Day', dsel), h('label', { class: 'fld' }, 'Meal', meal), h('label', { class: 'fld' }, 'Food', inFood, dl), h('label', { class: 'fld' }, 'Grams', inG)), h('p', {}, h('button', { type: 'button', onclick: add }, 'Add to the diary')),
        h('h3', {}, 'Totals for ' + date), bar('Calories', tot.kcal, tg && tg.kcal, 'kcal'), bar('Protein', tot.p, tg && tg.p, 'g'), bar('Carbohydrate', tot.c, tg && tg.c, 'g'), bar('Fat', tot.f, tg && tg.f, 'g'),
        day.length ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Meal', 'Food', 'g', 'kcal', 'P', 'C', 'F', ''].map((x) => h('th', {}, x)))), h('tbody', {}, day.map((r) => h('tr', {}, h('td', {}, r.meal), h('td', {}, r.food), h('td', { class: 'n' }, r.grams), h('td', { class: 'n' }, r.kcal), h('td', { class: 'n' }, r.p), h('td', { class: 'n' }, r.c), h('td', { class: 'n' }, r.f), h('td', {}, h('button', { type: 'button', onclick: () => { rows.splice(rows.indexOf(r), 1); set('diary', rows); rerender(); } }, 'Delete'))))))) : h('p', { class: 'meta' }, 'Nothing logged for this day.'),
        h('h3', {}, 'Calories, last 14 days logged'), chart);
    } },
    { id: 'foods', label: 'My foods', type: 'custom', render: ({ h, get, set, rerender }) => {
      const foods = get('foods', null) || FOODS.map((f) => f.slice());
      const inp = (id, ph, w) => h('input', { id, placeholder: ph, style: 'width:' + (w || 7) + 'em' });
      const add = () => { const g = (id) => document.getElementById(id).value; if (!g('f_n').trim()) return; foods.push([g('f_n').trim(), Number(g('f_k')) || 0, Number(g('f_p')) || 0, Number(g('f_c')) || 0, Number(g('f_f')) || 0, Number(g('f_s')) || 100]); set('foods', foods); rerender(); };
      return h('div', {}, h('p', { class: 'meta' }, 'Values per 100 g. The starter list is approximate and rounded: always check the label of what you actually eat, and add your own foods below (from a label or from a database listed on the Databases tab).'),
        h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Name', inp('f_n', 'e.g. Granola', 14)), h('label', { class: 'fld' }, 'kcal per 100 g', inp('f_k', '')), h('label', { class: 'fld' }, 'Protein g', inp('f_p', '')), h('label', { class: 'fld' }, 'Carbs g', inp('f_c', '')), h('label', { class: 'fld' }, 'Fat g', inp('f_f', '')), h('label', { class: 'fld' }, 'Usual serving g', inp('f_s', ''))), h('p', {}, h('button', { type: 'button', onclick: add }, 'Add food')),
        h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Food', 'kcal', 'Protein', 'Carbs', 'Fat', 'Serving g', ''].map((x) => h('th', {}, x)))), h('tbody', {}, foods.map((f, i) => h('tr', {}, h('td', {}, f[0]), f.slice(1).map((v) => h('td', { class: 'n' }, v)), h('td', {}, h('button', { type: 'button', onclick: () => { foods.splice(i, 1); set('foods', foods); rerender(); } }, 'Remove'))))))));
    } },
    { id: 'plans', label: 'Meal plans', type: 'custom', render: ({ h, get, set, round }) => {
      const foods = get('foods', null) || FOODS, tg = get('goalset', null), names = Object.keys(DAYS), out = h('div', {});
      const sel = h('select', { id: 'mp_day' }, names.map((n) => h('option', { value: n }, n))), scale = h('input', { id: 'mp_k', type: 'number', value: tg ? tg.kcal : 2400, step: 50 });
      const draw = () => {
        const plan = DAYS[sel.value], base = sum(plan.flatMap(([, items]) => items.map(([n, g]) => macro(foods.find((x) => x[0] === n) || [n, 0, 0, 0, 0], g)))), k = (Number(scale.value) || base.kcal) / (base.kcal || 1), pr = (n) => Math.round(n * k / 5) * 5;
        PBE.fill(out, h('p', { class: 'lede' }, Math.round(base.kcal * k) + ' kcal: ' + Math.round(base.p * k) + ' g protein, ' + Math.round(base.c * k) + ' g carbohydrate, ' + Math.round(base.f * k) + ' g fat'),
          h('p', { class: 'meta' }, 'Portions are scaled by ' + round(k, 2) + ' x to reach the calories you typed. Weights are raw or as listed; round to what your scales and packs allow.'),
          plan.map(([meal, items]) => h('div', {}, h('h3', {}, meal), h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, items.map(([n, g]) => { const m = macro(foods.find((x) => x[0] === n) || [n, 0, 0, 0, 0], pr(g)); return h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, pr(g) + ' g'), h('td', { class: 'n' }, Math.round(m.kcal) + ' kcal'), h('td', { class: 'n' }, Math.round(m.p) + ' P')); })))))),
          h('p', { class: 'meta' }, 'These are general example days built from the starter food list, to show how a plan adds up: they are not anyone\'s published plan. To base plans on a specific coach\'s approach, add their meals as your own foods and plans.'));
      };
      sel.addEventListener('change', draw); scale.addEventListener('input', draw); draw();
      return h('div', {}, h('p', { class: 'meta' }, 'Example days for a cut, maintenance and a lean bulk. Type your calorie target and every portion scales to fit.'), h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Example day', sel), h('label', { class: 'fld' }, 'My calories', scale)), out);
    } },
    { id: 'db', label: 'Databases', type: 'static', blocks: [
      { h: 'Where food data comes from', note: 'Summaries from general knowledge: check each source\'s own page for current details. I could not verify every claim here, so treat this as a starting list.' },
      { table: [['Source', 'What it is', 'Good for', 'Watch out for'], ['McCance and Widdowson\'s Composition of Foods (CoFID)', 'The official UK government food composition dataset, published on GOV.UK.', 'Generic foods (raw, cooked), reliable lab-based values.', 'Fewer branded products and almost no restaurant dishes.'], ['Open Food Facts', 'A free, open database built by volunteers, with barcode lookup and many UK products.', 'Packaged foods; free to download; open licence.', 'User-entered, so some entries are wrong or incomplete: check against the pack.'], ['Nutracheck', 'A UK calorie-counting app with a large UK database, which I understand also covers many restaurant and fast-food menus.', 'UK supermarket and restaurant items in one place.', 'A paid app; check whether entries are verified.'], ['MyFitnessPal and similar apps', 'Large databases, mostly user-submitted.', 'Convenience and range.', 'Duplicate and inaccurate entries are common: prefer ones marked verified, or confirm with the label.'], ['Restaurant and chain menus', 'Large chains in England have had to show calories on menus since 2022, and many publish fuller nutrition tables online.', 'Eating out.', 'Portions and recipes change; figures are for the standard item.']] },
      { h: 'Tips for accurate logging', list: ['Weigh food on scales when you can, and note whether the figure is for raw or cooked weight.', 'Prefer the pack label or a verified entry over a random user entry.', 'Log what you actually ate, including oil, sauces and drinks.', 'Look at the weekly average rather than one day.'] },
      { h: 'If tracking is not good for you', p: 'Counting food suits some people and not others. If it makes you anxious, takes over your day, or you have ever struggled with food or eating, stop and talk to a doctor or a registered dietitian. Beat (beateatingdisorders.org.uk) offers support in the UK.' },
      { h: 'Sources used for the targets', list: ['Mifflin MD and others (1990), "A new predictive equation for resting energy expenditure in healthy individuals", American Journal of Clinical Nutrition.', 'Protein of about 1.6 to 2.2 g per kg: summarised from sports-nutrition reviews (for example Morton et al. 2018, British Journal of Sports Medicine): from general knowledge, not re-checked.', 'About 7700 kcal per kg of body weight is a widely used rule of thumb, and only approximate.'] }] },
  ],
});
