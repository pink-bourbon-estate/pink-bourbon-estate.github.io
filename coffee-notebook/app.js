/* Coffee Notebook - a private coffee tool that runs entirely in your browser.

   Read this file top to bottom. It is arranged in the order of the tabs:

     1. Dial in     dose, yield and time turned into ratio, flow and extraction, plus taste-based advice
     2. Recipes     shot styles and brew methods, scaled to your dose, with a step-by-step clock
     3. Flavour     a simple flavour wheel you can tick off while you taste
     4. Grind log   your own settings and shots, saved in this browser, with CSV download
     5. Problems    sour, bitter, weak, channelling: what to change
     6. Beans       species, varieties, processing and place, and what each tends to taste like
     7. About       why this exists, and every source and reading it leans on

   Privacy: nothing is sent anywhere. Your log lives in this browser (localStorage); clear your site
   data and it is gone. No cookies, no analytics. Download your log as CSV to keep your own copy.

   Work in progress: expect bugs. Not every figure has been checked against a published source:
   every recipe says whether it is "from a source" or a "starting point". Trust your tongue.
*/
(() => {
  'use strict';

  const root = document.getElementById('app');
  const LOG_KEY = 'coffee-notebook-log-v1';       // where your shots are kept in this browser
  const WHEEL_KEY = 'coffee-notebook-wheel-v1';   // which flavours you have ticked

  /* ------------------------------------------------------------------ small helpers */

  /** Make an element: h('p', {class:'meta'}, 'text', childNode). */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const round1 = (x) => Math.round(x * 10) / 10;
  const num = (id, label, value, attrs = {}) => h('label', { class: 'fld' }, label, h('input', { id, type: 'number', value, step: 'any', ...attrs }));
  const val = (id) => Number(root.querySelector('#' + id).value);
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

  /** Read and write JSON in localStorage without ever crashing (private windows can refuse it). */
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* carry on without saving */ } };

  /** Offer text as a download, entirely in the browser. */
  function saveFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** A line saying how well something is backed up. */
  const badge = (status) => h('span', { class: 'meta' }, status === 'source' ? '[from a published source]' : '[starting point: common practice, not yet checked against a source]');

  /* ------------------------------------------------------------------ 1. DIAL IN */
  /*
     The maths of a shot or a brew:
       brew ratio        = water out / coffee in                 (a 1:2 shot: 18 g in, 36 g out)
       flow rate         = yield / time                          (grams per second)
       extraction yield  = TDS % x yield / dose                  (how much of the coffee ended up in the cup)
     TDS (total dissolved solids) needs a refractometer. Without one, use the ratio and your tongue.
     Typical targets are a guide only: filter coffee about 18-22 % extraction at 1.15-1.35 % TDS (the SCA
     "Gold Cup" standard); espresso about 18-22 % extraction at roughly 8-12 % TDS.
  */
  const TASTE_ADVICE = {
    sour: 'Sour, sharp, thin or salty: it is probably under-extracted. Grind finer, make the shot or brew run longer, raise the water temperature a little, or let more water through (a longer ratio). Change one thing at a time.',
    bitter: 'Bitter, dry, harsh or astringent: it is probably over-extracted. Grind coarser, shorten the time, lower the temperature a little, or stop the shot earlier (a shorter ratio).',
    weak: 'Weak and watery: use more coffee for the same water (a shorter ratio), or grind finer. If it is also sour, it is under-extracted rather than just weak.',
    strong: 'Too strong or heavy: use a longer ratio (more water for the same coffee) before you change the grind, then re-check the taste.',
    flat: 'Flat, dull, or papery: the coffee may be stale, the grind inconsistent, or the extraction too low. Try fresher beans (about 1-3 weeks after roasting for espresso), and check the water.',
    balanced: 'Sweet, clear, with acidity you enjoy and a clean finish: write the recipe down in the Grind log. That is your starting point for the next bag.',
  };
  function dialTab() {
    const out = h('div', { role: 'status', 'aria-live': 'polite' });
    const target = h('p', { class: 'meta' });
    const taste = h('select', { id: 'taste' }, [['', 'How does it taste?'], ['sour', 'Sour, sharp or thin'], ['bitter', 'Bitter, dry or harsh'], ['weak', 'Weak or watery'], ['strong', 'Too strong or heavy'], ['flat', 'Flat or dull'], ['balanced', 'Sweet and balanced']].map(([v, l]) => h('option', { value: v }, l)));
    const calc = () => {
      const dose = val('dose'), yld = val('yield'), time = val('time'), tds = val('tds');
      if (!(dose > 0) || !(yld > 0)) { out.replaceChildren(h('p', { class: 'meta' }, 'Enter a dose and a yield.')); return; }
      const ratio = yld / dose;
      const lines = ['Brew ratio 1:' + round1(ratio) + (time > 0 ? ' · flow ' + round1(yld / time) + ' g/s · ' + mmss(time) : '')];
      if (tds > 0) {
        const ey = (tds * yld) / dose;
        lines.push('Extraction yield ' + round1(ey) + ' % at ' + tds + ' % TDS');
        lines.push(ey < 18 ? 'Below about 18 %: likely under-extracted (sour or thin).' : ey > 22 ? 'Above about 22 %: likely over-extracted (bitter or hollow).' : 'In the common 18-22 % window.');
      } else lines.push('Add a TDS reading (from a refractometer) to see the extraction yield.');
      out.replaceChildren(...lines.map((l, i) => h('p', { class: i === 0 ? 'lede' : 'meta' }, l)));
      const t = root.querySelector('#taste').value;
      target.textContent = t ? TASTE_ADVICE[t] : '';
    };
    const form = h('div', { class: 'form' }, num('dose', 'Coffee in (g)', 18, { min: 1, step: 0.1 }), num('yield', 'Liquid out (g)', 36, { min: 1, step: 0.1 }), num('time', 'Time (seconds)', 28, { min: 0 }),
      num('tds', 'TDS % (optional, refractometer)', '', { min: 0, step: 0.01, placeholder: 'optional' }), h('label', { class: 'fld' }, 'Taste', taste));
    form.addEventListener('input', calc); setTimeout(calc, 0);

    /* second calculator: what to weigh for a ratio */
    const planOut = h('p', { class: 'lede', role: 'status' });
    const plan = () => { planOut.textContent = val('pdose') > 0 && val('pratio') > 0 ? 'Weigh ' + round1(val('pdose') * val('pratio')) + ' g of liquid for ' + val('pdose') + ' g of coffee (1:' + val('pratio') + ').' : ''; };
    const form2 = h('div', { class: 'form' }, num('pdose', 'Coffee in (g)', 18, { min: 1, step: 0.1 }), num('pratio', 'Ratio (liquid per 1 of coffee)', 2, { min: 0.5, step: 0.1 }));
    form2.addEventListener('input', plan); setTimeout(plan, 0);

    return h('div', {}, h('p', { class: 'meta' }, 'Dial in one change at a time: keep the dose and the ratio fixed and move only the grind, then taste. Write what you find in the Grind log.'),
      h('h2', {}, 'What did you get?'), form, out, target,
      h('h2', {}, 'What should I weigh?'), form2, planOut,
      h('h3', {}, 'A simple dialling-in routine'),
      h('ol', {}, h('li', {}, 'Pick a starting recipe: espresso 1:2 in about 25-32 seconds; filter about 1:16 (a good starting point from the SCA Gold Cup standard is about 55 g of coffee per litre).'),
        h('li', {}, 'Taste it. Sour or bitter? Use the advice above.'), h('li', {}, 'Change only the grind first. Then the ratio. Then the temperature.'), h('li', {}, 'Write it down. A recipe you can repeat beats one you cannot.')));
  }

  /* ------------------------------------------------------------------ 2. RECIPES */
  /*
     Each recipe has a default dose. Amounts scale in proportion to the dose you type.
     ingredients: [name, amount for the default dose, unit]    steps: [seconds from the start, what to do]
     status: 'source' (figures taken from a page listed in About) or 'start' (common practice, not yet checked).
  */
  const RECIPES = [
    { key: 'espresso', group: 'Espresso styles', name: 'Classic espresso (1:2)', dose: 18, status: 'start',
      blurb: 'The usual café shot: equal care for grind, dose and ratio. 18 g in, 36 g out, about 25-32 seconds, water about 92-95 C.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 36, 'g']],
      steps: [[0, 'Purge the group, dry the basket, dose, distribute and tamp level.'], [0, 'Start the shot and the timer together.'], [25, 'Watch the flow. Stop at your target weight, usually between 25 and 32 seconds.'], [40, 'Stir or swirl the shot, then taste it before adding anything.']] },
    { key: 'ristretto', group: 'Espresso styles', name: 'Ristretto (1:1 to 1:1.5)', dose: 18, status: 'start',
      blurb: 'A short, thick, sweeter shot. Grind slightly coarser than a classic shot or it will run too slow.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 27, 'g']],
      steps: [[0, 'Dose and tamp, then start the shot.'], [20, 'Stop at about 27 g out (20-25 seconds).']] },
    { key: 'lungo', group: 'Espresso styles', name: 'Lungo or allongé (1:3)', dose: 18, status: 'start',
      blurb: 'A longer shot for more volume and a lighter body. Grind a little coarser.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 54, 'g']],
      steps: [[0, 'Dose and tamp, then start the shot.'], [30, 'Stop at about 54 g out (30-40 seconds).']] },
    { key: 'turbo', group: 'Espresso styles', name: 'Turbo shot', dose: 15, status: 'start',
      blurb: 'A fast, high-flow shot: a lower dose, a much coarser grind, and a short run time (about 10-18 seconds), often at a ratio of about 1:3. Fans say it is clearer and sweeter; sceptics say it just tastes different. Taste it and decide.',
      ing: [['Ground coffee', 15, 'g'], ['Espresso out', 45, 'g']],
      steps: [[0, 'Dose and level, tamp lightly. If your machine allows, skip or shorten the pre-infusion.'], [0, 'Start the shot and the timer together.'], [12, 'Stop at about 45 g out. If it takes over 20 seconds, grind coarser.']] },
    { key: 'soup', group: 'Espresso styles', name: '"Soup" style (long, light, high yield)', dose: 18, status: 'start',
      blurb: 'The community word "soup" is used loosely: here it means a long, light-roast, high-yield shot, around 1:3.5 and up, which tastes juicy and tea-like or tomato-like rather than thick. Names vary between groups: if someone gives you a different recipe under this name, trust theirs.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 63, 'g']],
      steps: [[0, 'Dose and level. Use a light roast and slightly hotter water (about 94-96 C).'], [0, 'Start the shot and timer together.'], [32, 'Stop at about 63 g out (30-40 seconds).']] },
    { key: 'slayer', group: 'Espresso styles', name: 'Slayer-style (long low-flow pre-infusion)', dose: 18, status: 'start',
      blurb: 'Slayer machines use a needle valve to give a long, gentle, low-pressure pre-infusion before full pressure. Few home machines can do this exactly, but some let you pre-infuse by hand or by timer. The idea is to soak the puck evenly first, so it can run at a coarser, more even extraction.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 40, 'g']],
      steps: [[0, 'Dose and tamp. Start the low-flow pre-infusion.'], [20, 'About 15-25 seconds of soaking, until the first drops show.'], [25, 'Ramp to full pressure.'], [45, 'Stop at about 40 g out (about 45-60 seconds in total).']] },
    { key: 'lever', group: 'Espresso styles', name: 'Lever machine (declining pressure)', dose: 18, status: 'start',
      blurb: 'On a lever the pressure is made by your arm or a spring, so it rises during pre-infusion and then falls as the shot goes on. Many people like the sweetness and forgiving texture.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 40, 'g']],
      steps: [[0, 'Raise the lever to fill the group and pre-infuse.'], [10, 'Release the lever to pull at about 9 bar.'], [20, 'Pressure declines toward about 5-6 bar as the lever rises.'], [35, 'Stop at about 40 g out.']] },
    { key: 'aeropress', group: 'Filter and immersion', name: 'AeroPress (Hoffmann-style, standard method)', dose: 11, status: 'source',
      blurb: 'An easy, forgiving brew. 11 g of medium-fine coffee, 200 ml of water at about 96 C, a 2-minute steep, then a gentle press. Taken from a published write-up of James Hoffmann\'s recipe.',
      ing: [['Ground coffee (medium-fine, a little finer than table salt)', 11, 'g'], ['Water at about 96 C', 200, 'g']],
      steps: [[0, 'Rinse the paper filter and heat the brewer. Add the coffee.'], [0, 'Start the timer and pour all the water within 10-15 seconds. Do not stir.'], [15, 'Fit the plunger and pull up slightly to make a seal. Do not press.'], [120, 'Take off the plunger and gently swirl the brewer.'], [150, 'Wait 30 seconds for the fines to settle.'], [150, 'Reinsert the plunger and press gently over about 30 seconds. Stop at the hiss.']] },
    { key: 'v60', group: 'Filter and immersion', name: 'V60 pour-over', dose: 15, status: 'start',
      blurb: 'A clean, bright cup. About 1:16.7: 15 g coffee to 250 g water. For James Hoffmann\'s own full technique, watch his video (see About).',
      ing: [['Ground coffee (medium-fine)', 15, 'g'], ['Water at about 96 C', 250, 'g']],
      steps: [[0, 'Rinse the paper, add the coffee, tare the scale. Pour 45 g to bloom; swirl.'], [45, 'Pour slowly to 150 g.'], [75, 'Pour to 250 g.'], [90, 'Give the brewer a gentle swirl.'], [180, 'Drawdown should finish by about 2:30-3:30. Faster means grind finer; slower, coarser.']] },
    { key: 'coldbrew', group: 'Filter and immersion', name: 'Cold brew concentrate', dose: 100, status: 'start',
      blurb: 'A coffee concentrate steeped cold overnight, then diluted. A good place to use less perfect beans.',
      ing: [['Coarse ground coffee', 100, 'g'], ['Cold water', 1000, 'g']],
      steps: [[0, 'Stir the coffee and water in a jar. Cover and refrigerate.'], [12 * 3600, 'Steep for 12-16 hours.'], [16 * 3600, 'Strain through a filter. Dilute about 1:1 with water or milk to taste.']] },
    { key: 'tonic', group: 'Funky', name: 'Espresso tonic', dose: 18, status: 'start',
      blurb: 'Espresso over tonic water and ice: bitter, sweet, fizzy and bright. Light, fruity roasts work best. For many more café-style drinks, see Morgan Eckroth\'s book in About.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 36, 'g'], ['Tonic water, cold', 150, 'ml'], ['Ice', 150, 'g'], ['Lemon or orange slice', 1, 'item']],
      steps: [[0, 'Fill a glass with ice and add the cold tonic.'], [0, 'Pull the espresso shot.'], [30, 'Pour the shot slowly over the back of a spoon so it layers on top.'], [40, 'Add a slice of citrus and drink at once.']] },
    { key: 'shakerato', group: 'Funky', name: 'Caffè shakerato', dose: 18, status: 'start',
      blurb: 'An Italian summer classic: a hot shot shaken hard with ice and a little sugar, until foamy and cold.',
      ing: [['Ground coffee', 18, 'g'], ['Espresso out', 36, 'g'], ['Ice', 80, 'g'], ['Sugar syrup (optional)', 10, 'ml']],
      steps: [[0, 'Pull the shot straight over the ice and syrup in a shaker.'], [10, 'Shake hard for about 10 seconds.'], [20, 'Strain into a cold glass.']] },
  ];

  function recipesTab() {
    const sel = h('select', { id: 'rec', 'aria-label': 'Recipe' }, [...new Set(RECIPES.map((r) => r.group))].map((g) => h('optgroup', { label: g }, RECIPES.filter((r) => r.group === g).map((r) => h('option', { value: r.key }, r.name)))));
    const dose = num('rdose', 'Coffee dose (g)', RECIPES[0].dose, { min: 1, step: 0.1 });
    const out = h('div', {});
    const draw = () => {
      const r = RECIPES.find((x) => x.key === sel.value);
      const k = val('rdose') / r.dose;
      out.replaceChildren(h('p', { class: 'lede' }, r.blurb), h('p', {}, badge(r.status)),
        h('h3', {}, 'Ingredients'), h('div', { class: 'tablewrap' }, h('table', {}, h('tbody', {}, r.ing.map(([n, a, u]) => h('tr', {}, h('td', {}, n), h('td', { class: 'n' }, (u === 'item' ? Math.max(1, Math.round(a * k)) : round1(a * k)) + (u === 'item' ? '' : ' ' + u))))))),
        h('h3', {}, 'Steps'), h('div', {}, r.steps.map(([s, t]) => h('div', { class: 'ev' }, h('span', { class: 'time' }, mmss(s)), h('span', { class: 'what' }, t)))));
    };
    sel.addEventListener('change', () => { root.querySelector('#rdose').value = RECIPES.find((x) => x.key === sel.value).dose; draw(); });
    const form = h('div', { class: 'form' }, h('label', { class: 'fld' }, 'Recipe', sel), dose);
    form.addEventListener('input', draw); setTimeout(draw, 0);
    return h('div', {}, h('p', { class: 'meta' }, 'Pick a style, type your dose, and the amounts scale. Grind settings differ on every grinder: use the Dial in and Grind log tabs to find yours.'), form, out);
  }

  /* ------------------------------------------------------------------ 3. FLAVOUR WHEEL */
  /*
     My own simplified wheel, drawn here in plain code. It is inspired by the idea behind the SCA Coffee
     Taster's Flavor Wheel and the World Coffee Research Sensory Lexicon (see About), but it is NOT a copy
     of either: the families and notes are my own plain-language grouping.
     Click a note to tick it as "tasted". Your ticks stay in this browser.
  */
  const WHEEL = [
    ['Fruity', 8, ['Blackcurrant', 'Raspberry', 'Strawberry', 'Blueberry', 'Grapefruit', 'Lemon', 'Orange', 'Peach', 'Apricot', 'Cherry', 'Pineapple', 'Mango', 'Raisin', 'Fig']],
    ['Floral and tea', 190, ['Black tea', 'Green tea', 'Jasmine', 'Bergamot', 'Rose', 'Chamomile']],
    ['Sweet', 40, ['Honey', 'Caramel', 'Brown sugar', 'Maple', 'Vanilla', 'Molasses']],
    ['Nutty and cocoa', 25, ['Almond', 'Hazelnut', 'Peanut', 'Milk chocolate', 'Dark chocolate', 'Cocoa nib']],
    ['Roasted', 15, ['Toast', 'Smoky', 'Tobacco', 'Malt', 'Burnt']],
    ['Spice', 280, ['Cinnamon', 'Clove', 'Black pepper', 'Nutmeg']],
    ['Winey and funky', 320, ['Winey', 'Boozy', 'Lactic', 'Acetic', 'Fermented']],
    ['Green and savoury', 110, ['Tomato', 'Grassy', 'Herbal', 'Hay', 'Pea pod']],
    ['Off notes', 0, ['Papery', 'Rubbery', 'Medicinal', 'Earthy']],
  ];
  function wheelTab() {
    const ticked = new Set(read(WHEEL_KEY, []));
    const total = WHEEL.reduce((s, f) => s + f[2].length, 0);
    const R0 = 70, R1 = 190, R2 = 300, C = 310;                   // inner, middle and outer radii; centre of the drawing
    const pt = (r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)];
    /** A ring segment between two radii and two angles (in radians, clockwise from the top). */
    const seg = (r1, r2, a1, a2) => {
      const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
      const big = a2 - a1 > Math.PI ? 1 : 0;
      return 'M' + x1 + ' ' + y1 + ' A' + r2 + ' ' + r2 + ' 0 ' + big + ' 1 ' + x2 + ' ' + y2 + ' L' + x3 + ' ' + y3 + ' A' + r1 + ' ' + r1 + ' 0 ' + big + ' 0 ' + x4 + ' ' + y4 + ' Z';
    };
    const ns = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };
    const svg = el('svg', { viewBox: '0 0 620 620', role: 'img', 'aria-label': 'Flavour wheel. Click a note to tick it.', style: 'width:100%;max-width:640px;height:auto' });
    const list = h('p', { class: 'lede', 'aria-live': 'polite' });
    const draw = () => {
      svg.replaceChildren();
      let a = 0;
      WHEEL.forEach(([fam, hue, notes], fi) => {
        const span = (notes.length / total) * 2 * Math.PI;
        const colour = fi === WHEEL.length - 1 ? 'hsl(0 0% 55%)' : 'hsl(' + hue + ' 55% 52%)';
        svg.append(el('path', { d: seg(R0, R1, a, a + span), fill: colour, stroke: 'var(--bg)', 'stroke-width': 2 }));
        // the family name, along the middle of its segment
        const am = a + span / 2, [tx, ty] = pt((R0 + R1) / 2, am);
        const rot = ((am * 180) / Math.PI + 270) % 360, flip = rot > 90 && rot < 270;
        svg.append(el('text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'middle', transform: 'rotate(' + (flip ? rot + 180 : rot) + ' ' + tx + ' ' + ty + ')', fill: '#fff', 'font-size': 11, 'font-weight': 600 }, fam));
        notes.forEach((n, ni) => {
          const a1 = a + (ni / notes.length) * span, a2 = a + ((ni + 1) / notes.length) * span, on = ticked.has(n);
          const p = el('path', { d: seg(R1, R2, a1, a2), fill: on ? colour : 'var(--bg)', stroke: colour, 'stroke-width': 2, style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-pressed': String(on), 'aria-label': n });
          const toggle = () => { ticked.has(n) ? ticked.delete(n) : ticked.add(n); write(WHEEL_KEY, [...ticked]); draw(); };
          p.addEventListener('click', toggle); p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
          svg.append(p);
          const am2 = (a1 + a2) / 2, [nx, ny] = pt((R1 + R2) / 2, am2);
          const rot2 = ((am2 * 180) / Math.PI + 270) % 360, flip2 = rot2 > 90 && rot2 < 270;
          svg.append(el('text', { x: nx, y: ny, 'text-anchor': 'middle', 'dominant-baseline': 'middle', transform: 'rotate(' + (flip2 ? rot2 + 180 : rot2) + ' ' + nx + ' ' + ny + ')', fill: on ? '#fff' : 'var(--ink)', 'font-size': 10, 'pointer-events': 'none' }, n));
        });
        a += span;
      });
      list.textContent = ticked.size ? 'Tasting: ' + [...ticked].join(', ') : 'Click the outer ring to tick what you taste.';
    };
    draw();
    return h('div', {}, h('p', { class: 'meta' }, 'Taste slowly, hot and then as it cools: flavours change. Start in the middle (is it fruity, sweet, roasted?) and move outward. Your ticks stay in this browser.'),
      svg, list, h('p', {}, h('button', { type: 'button', onclick: () => { ticked.clear(); write(WHEEL_KEY, []); draw(); } }, 'Clear the wheel'), ' ',
        h('button', { type: 'button', onclick: () => { try { navigator.clipboard.writeText([...ticked].join(', ')); } catch (e) { /* clipboard unavailable */ } } }, 'Copy the list')),
      h('p', { class: 'meta' }, 'Inspired by the idea of the SCA Coffee Taster\'s Flavor Wheel and the World Coffee Research Sensory Lexicon (see About). This wheel is a simple drawing of my own, not a copy of either.'));
  }

  /* ------------------------------------------------------------------ 4. GRIND LOG */
  const LOG_COLS = ['date', 'bean', 'roaster', 'grinder', 'setting', 'dose', 'yield', 'time', 'tds', 'taste', 'notes'];
  function logTab() {
    let log = read(LOG_KEY, []);
    const out = h('div', {});
    const filter = h('select', { id: 'lf', 'aria-label': 'Filter by bean' });
    const field = (id, label, type, value, attrs) => h('label', { class: 'fld' }, label, h('input', { id, type: type || 'text', value: value ?? '', ...attrs }));
    const today = new Date().toISOString().slice(0, 10);
    const form = h('div', { class: 'form' }, field('l_date', 'Date', 'date', today), field('l_bean', 'Bean'), field('l_roaster', 'Roaster'), field('l_grinder', 'Grinder'), field('l_setting', 'Grind setting'),
      field('l_dose', 'Dose in (g)', 'number', '', { step: 'any' }), field('l_yield', 'Out (g)', 'number', '', { step: 'any' }), field('l_time', 'Time (s)', 'number', '', { step: 'any' }), field('l_tds', 'TDS % (optional)', 'number', '', { step: 'any' }),
      field('l_taste', 'Taste (sour, balanced, bitter...)'), field('l_notes', 'Notes'));
    const csvQ = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const draw = () => {
      const beans = [...new Set(log.map((e) => e.bean).filter(Boolean))];
      const cur = filter.value;
      filter.replaceChildren(h('option', { value: '' }, 'All beans'), beans.map((b) => h('option', { value: b }, b))); filter.value = beans.includes(cur) ? cur : '';
      const rows = log.map((e, i) => [e, i]).filter(([e]) => !filter.value || e.bean === filter.value);
      out.replaceChildren(rows.length
        ? h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Date', 'Bean', 'Grinder', 'Setting', 'In', 'Out', 'Time', 'Ratio', 'Taste', ''].map((t, i) => h('th', { class: i > 3 && i < 8 ? 'n' : '' }, t)))),
          h('tbody', {}, rows.slice().reverse().map(([e, i]) => h('tr', {}, h('td', {}, e.date), h('td', {}, e.bean, e.roaster ? h('span', { class: 'meta block' }, e.roaster) : null), h('td', {}, e.grinder), h('td', {}, e.setting),
            h('td', { class: 'n' }, e.dose || ''), h('td', { class: 'n' }, e.yield || ''), h('td', { class: 'n' }, e.time ? e.time + ' s' : ''), h('td', { class: 'n' }, e.dose && e.yield ? '1:' + round1(e.yield / e.dose) : ''),
            h('td', {}, e.taste, e.notes ? h('span', { class: 'meta block' }, e.notes) : null), h('td', {}, h('button', { type: 'button', onclick: () => { log.splice(i, 1); write(LOG_KEY, log); draw(); } }, 'Delete')))))))
        : h('p', { class: 'meta' }, 'Nothing logged yet.'));
    };
    const add = () => {
      const g = (id) => root.querySelector('#l_' + id).value.trim();
      if (!g('bean') && !g('setting')) return;
      log.push({ date: g('date'), bean: g('bean'), roaster: g('roaster'), grinder: g('grinder'), setting: g('setting'), dose: Number(g('dose')) || 0, yield: Number(g('yield')) || 0, time: Number(g('time')) || 0, tds: Number(g('tds')) || 0, taste: g('taste'), notes: g('notes') });
      write(LOG_KEY, log);
      ['setting', 'time', 'tds', 'taste', 'notes'].forEach((id) => { root.querySelector('#l_' + id).value = ''; });   // keep bean, grinder and dose for the next shot
      draw();
    };
    filter.addEventListener('change', draw); draw();
    return h('div', {}, h('p', { class: 'meta' }, 'Keep your grinder settings and results here. Saved only in this browser: download a CSV to keep your own copy. Grinder numbers mean different things on different grinders, so log the grinder too.'),
      h('h2', {}, 'Add a shot'), form, h('p', {}, h('button', { type: 'button', onclick: add }, 'Add to the log')),
      h('h2', {}, 'Your log'), h('label', { class: 'fld' }, 'Show', filter), out,
      h('p', {}, h('button', { type: 'button', onclick: () => saveFile('coffee-log.csv', LOG_COLS.join(',') + '\n' + log.map((e) => LOG_COLS.map((c) => csvQ(e[c])).join(',')).join('\n') + '\n', 'text/csv') }, 'Download CSV'), ' ',
        h('button', { type: 'button', onclick: () => { if (log.length && confirm('Delete the whole log from this browser?')) { log = []; write(LOG_KEY, log); draw(); } } }, 'Clear the log')));
  }

  /* ------------------------------------------------------------------ 5. PROBLEMS */
  const PROBLEMS = [
    ['Sour, thin, salty', 'Under-extraction: the water did not dissolve enough of the coffee.', 'Grind finer; run the shot or brew longer; hotter water; a longer ratio. Light roasts need more extraction than dark.'],
    ['Bitter, dry, harsh', 'Over-extraction: too much of the later, bitter compounds.', 'Grind coarser; shorter time; slightly cooler water; stop the shot earlier.'],
    ['Weak, watery', 'Too little coffee for the water, or too coarse.', 'Use a shorter ratio, or more coffee; grind finer.'],
    ['Too strong, heavy', 'Ratio is too short for your taste.', 'Add water at a longer ratio; do not change the grind first.'],
    ['Fast, gushing shot (under 15-20 s in a classic shot)', 'Grind too coarse, dose too low, or a channel has opened.', 'Grind finer; check the dose; distribute and tamp level (see Channelling).'],
    ['Slow, dripping or choking shot', 'Grind too fine, dose too high, or the basket is blocked.', 'Grind coarser; check the dose; clean the basket and shower screen.'],
    ['Channelling (spurts, blonde patches, bare spots in the puck)', 'Water finds a path through a crack or loose spot in the puck.', 'Distribute evenly (a tool or tapping), tamp level, check grind uniformity, dry the basket, try a paper filter on top.'],
    ['Bitter and sour at once', 'Uneven extraction, often channelling or an uneven grind.', 'Fix the distribution and puck preparation first; consider a grinder with more even particles.'],
    ['Flat, stale, no aroma', 'Old beans, or beans that are too fresh and still gassy (for espresso).', 'Use beans roasted 1-3 weeks ago for espresso; store airtight, cool and dark; grind just before brewing.'],
    ['Sour milk drinks, thin in milk', 'The shot is too light for milk to carry.', 'Use a darker roast or a shorter ratio for milk drinks.'],
    ['Burnt, ashy, smoky', 'Very dark roast, or water too hot, or a dirty machine.', 'Try a lighter roast, cooler water, and clean the machine (backflush and descale).'],
    ['Metallic or papery', 'Paper filters not rinsed, or limescale and chlorine in the water.', 'Rinse the filter; use filtered water of moderate hardness; descale.'],
    ['Inconsistent results day to day', 'Changing variables: dose, grind, temperature, humidity, bean age.', 'Weigh dose and yield; change one thing at a time; write it down in the Grind log.'],
    ['Different taste with the same recipe on a new bag', 'Beans differ in density, roast and age.', 'Re-dial the grind for each new bag; it is normal to adjust.'],
  ];
  function problemsTab() {
    return h('div', {}, h('p', { class: 'meta' }, 'Taste first, then change one thing. These are common causes, not certainties.'),
      h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['What you taste or see', 'Likely cause', 'Try'].map((t) => h('th', {}, t)))), h('tbody', {}, PROBLEMS.map((p) => h('tr', {}, p.map((c, i) => h('td', { class: i ? 'meta' : '' }, i ? c : h('strong', {}, c)))))))),
      h('h3', {}, 'The five things you can change'), h('ul', {}, h('li', {}, 'Grind size: the biggest lever. Finer extracts more.'), h('li', {}, 'Ratio: how much liquid for the coffee. Longer extracts more and dilutes.'), h('li', {}, 'Time: usually follows from the grind.'),
        h('li', {}, 'Temperature: hotter extracts more. Light roasts like it hotter.'), h('li', {}, 'Water: very soft or very hard water changes taste and extracts differently.')));
  }

  /* ------------------------------------------------------------------ 6. BEANS */
  /*
     General tendencies, not rules: the same origin can taste very different depending on the farm, the
     processing, the roast and how you brew it. Treat this as a map for where to look, not a promise.
  */
  const WANT = [
    ['Grapefruit, lemon, lime', 'Washed coffees from high altitude in East Africa (Kenya, Ethiopia, Rwanda, Burundi), also high-grown Colombia, Guatemala and Costa Rica. Light roast, a hotter brew.'],
    ['Tea-like, floral, bergamot, jasmine', 'Washed Ethiopian heirloom coffees (such as Yirgacheffe or Guji), and Gesha (also spelled Geisha) from Panama, Colombia and Ethiopia. Light roast, clean, long extraction.'],
    ['Red berries, strawberry, raspberry', 'Natural-processed Ethiopian coffees, some Kenyan and Rwandan lots; light roast. Natural processing often adds a jammy, winey fruitiness.'],
    ['Blackcurrant, "tomato soup", savoury-sweet acidity', 'Kenyan SL28 and SL34 washed coffees are known for blackcurrant and tomato-like juiciness. A light-roast, high-yield espresso can taste like a rich tomato soup: bright acidity with savoury depth.'],
    ['Stone fruit, peach, apricot, honey', 'Washed or honey coffees from Colombia, Guatemala, Costa Rica, El Salvador; medium-light roast.'],
    ['Tropical fruit, funky, wine-like', 'Anaerobic and co-fermented lots, natural Ethiopian and some Colombian or Costa Rican coffees. Can be wild; start with a small bag.'],
    ['Chocolate, nuts, caramel, "classic Italian"', 'Brazil (especially natural and pulped-natural), blends with some robusta, India and Sumatra for body; medium to dark roast. Traditional Italian espresso favours low acidity and thick body.'],
    ['Earthy, spicy, heavy', 'Wet-hulled Indonesian coffees (such as Sumatra), Indian monsooned coffees; medium to dark roast.'],
  ];
  function beansTab() {
    const item = (t, b) => h('section', {}, h('h3', {}, t), h('p', { class: 'meta' }, b));
    const sel = h('select', { id: 'want' }, WANT.map(([w], i) => h('option', { value: i }, w)));
    const ans = h('p', { class: 'lede', role: 'status' });
    const show = () => { ans.textContent = WANT[Number(sel.value)][1]; };
    sel.addEventListener('change', show); show();
    return h('div', {}, h('p', { class: 'note' }, 'Tendencies, not guarantees. Farm, processing, roast and brewing all change the cup. A bag\'s own tasting notes beat any general rule.'),
      h('h2', {}, 'What do you want to taste?'), h('label', { class: 'fld' }, 'I would like', sel), ans,
      h('h2', {}, 'The plants'),
      item('Species', 'Coffea arabica makes most specialty coffee: more acidity and aroma, grown higher, more delicate. Coffea canephora (robusta) is hardier, higher in caffeine, more bitter and woody, and gives thick crema in espresso blends, as in many traditional Italian ones. Coffea liberica is rare; "excelsa" is now usually treated as a variety of liberica.'),
      item('Varieties (a few)', 'Typica and Bourbon are old arabica lineages. Gesha is prized for floral, tea-like cups. SL28 and SL34 are Kenyan selections known for fruit and acidity. Caturra, Catuai, Castillo and Mundo Novo are common, productive varieties. Pacamara and Maragogipe have large beans. "Pink Bourbon" is a Colombian name for a rare, sought-after variety; its genetics have been debated, so treat the name as a trade name rather than a guarantee of ancestry.'),
      h('h2', {}, 'Processing'),
      item('Washed', 'The fruit is removed before drying. Clean, bright, high clarity: citrus, tea, florals.'),
      item('Natural', 'Dried whole in the fruit. Heavier body and more sweetness: berries, tropical fruit, wine, sometimes funk.'),
      item('Honey (pulped natural)', 'Some fruit pulp left on while drying. In between: sweet, syrupy, mild fruit.'),
      item('Anaerobic and co-fermented', 'Fermented in sealed tanks, sometimes with fruit or yeast added. Intense, unusual, sometimes divisive flavours: cinnamon, candy, boozy fruit.'),
      h('h2', {}, 'Place and terroir'),
      item('Altitude', 'Higher-grown arabica ripens more slowly and tends to be denser and more acidic and complex.'),
      item('Rough regional guide', 'Ethiopia: floral, tea, citrus (washed), berries (natural). Kenya: blackcurrant, grapefruit, tomato. Rwanda and Burundi: red fruit, sweetness. Colombia: balanced; caramel, red fruit, citrus; highly varied. Brazil: nutty, chocolatey, low acidity. Guatemala, Costa Rica, Honduras, El Salvador: chocolate, stone fruit, citrus. Indonesia: earthy, spicy, heavy.'),
      h('h2', {}, 'Roast level'),
      item('Light, medium, dark', 'Light roasts keep more origin flavour and acidity. Medium roasts balance sweetness and body. Dark roasts taste of the roast: bitter, smoky, chocolatey, with less acidity. Espresso often uses medium to darker roasts, but light roasts are common in specialty cafés.'),
      h('h2', {}, 'Freshness'),
      item('How long after roasting', 'Most beans taste best from about a week to a month after roasting. Espresso often wants a little more rest (about 7-21 days) to let gas escape. Keep beans airtight, cool and dark; grind just before brewing.'));
  }

  /* ------------------------------------------------------------------ 7. ABOUT */
  function aboutTab() {
    const li = (...t) => h('li', {}, ...t);
    const a = (href, text) => h('a', { href, rel: 'noopener noreferrer' }, text);
    return h('div', {}, h('h2', {}, 'Why this exists'),
      h('div', { class: 'prose' },
        h('p', {}, 'The first coffee I really noticed was in London. The Greek and Italian colleagues in the office had a proper coffee culture: an espresso at ten and another at one. One day I was taken to see a friend\'s favourite barista, and the espresso tasted like a rich tomato soup. I have been down the coffee rabbit hole ever since.'),
        h('p', {}, 'More recently I have been enjoying coffees from Taith, and it was while drinking a Pink Bourbon there that I had the idea for this website. Coffee culture is part of Pink Bourbon Estate, so it deserves a tool of its own.'),
        h('p', {}, 'More advanced tools exist. As with everything on this site, this one is for you: your recipes, your data, no tracking. Please enjoy a nice coffee, and thank you for your support.')),
      h('h2', {}, 'Read, watch and buy'),
      h('p', { class: 'meta' }, 'This tool leans on the work of many people. The first group below I have read or watched; the second is reading that the educators named often cite, which I list for you to follow up and have not checked line by line. Please support them: buy the books and visit the roasters.'),
      h('h3', {}, 'Where figures came from'),
      h('ul', {}, li(a('https://www.seattlecoffeegear.com/blogs/learning-center/achieving-the-gold-cup-standard-your-guide-to-brewing-excellence', 'Achieving the Gold Cup Standard'), ' (Seattle Coffee Gear): 55 g per litre, 1.15-1.35 % TDS, 18-22 % extraction, 195-205 F.'),
        li(a('https://secure.lamose.com/blogs/recipes/james-hoffmanns-aeropress-recipe-world-champion-method', 'James Hoffmann\'s AeroPress recipe'), ' (Lamose): 11 g, 200 ml at about 96 C, 2-minute steep, gentle press.'),
        li(a('https://sprudge.com/coffee-for-here-the-new-book-by-morgan-eckroth-is-now-on-pre-order-780003.html', 'Sprudge on Morgan Eckroth\'s "Coffee, for Here"'), ' (Clarkson Potter): a handbook with 40 café-style drink recipes, including espresso tonic.')),
      h('h3', {}, 'People and channels worth your time'),
      h('ul', {}, li(h('strong', {}, 'James Hoffmann'), ': YouTube, and the books "The World Atlas of Coffee" and "How to Make the Best Coffee at Home". A source for brewing technique, the AeroPress and V60, and for what flavours to expect from origins and processing.'),
        li(h('strong', {}, 'Lance Hedrick'), ': YouTube; detailed espresso dialling-in, puck preparation and workflow.'),
        li(h('strong', {}, 'Morgan Eckroth'), ': YouTube and the book "Coffee, for Here": café-style and funkier recipes such as espresso tonic.')),
      h('h3', {}, 'Reading these educators often point to (to follow up)'),
      h('ul', {}, li('Scott Rao: "Everything but Espresso", "The Professional Barista\'s Handbook" and "The Coffee Roaster\'s Companion".'),
        li('Christopher Hendon and Maxwell Colonna-Dashwood: "Water for Coffee".'),
        li('Jonathan Gagné: "The Physics of Filter Coffee".'),
        li('Barista Hustle (Matt Perger) and its articles and courses.'),
        li('Illy and Viani, "Espresso Coffee: The Science of Quality".'),
        li('Specialty Coffee Association: the Coffee Taster\'s Flavor Wheel, the Gold Cup brewing standard and the cupping protocol.'),
        li('World Coffee Research: the Sensory Lexicon and the Arabica Variety Catalog.')),
      h('h3', {}, 'Roasters, ateliers and collectives'),
      h('ul', {}, li(a('https://taithcoffee.com', 'Taith'), ' (Lewes, UK): coffees including Pink Bourbon, the namesake of this site.'),
        li('April Coffee Roasters (Copenhagen): a lighter-roast, clarity-first style that has influenced many roasters.'),
        li('Look for your own local roaster, café or collective: tasting something different with a person who cares is the best education.')),
      h('p', { class: 'meta' }, 'This list is not exhaustive and I may have missed people. Tell me through the GitHub repository and I will add them.'),
      h('h2', {}, 'Please note'), h('p', { class: 'meta' }, 'This is a work in progress and not all tools here are actively maintained. Recipes marked "starting point" are common practice that has not been checked against a published source. Caffeine affects people differently: be careful in pregnancy and with heart conditions, and check with a professional if unsure.'));
  }

  /* ---- tabs and start-up ---- */
  const TABS = [['dial', 'Dial in', dialTab], ['recipes', 'Recipes', recipesTab], ['flavour', 'Flavour', wheelTab], ['log', 'Grind log', logTab], ['problems', 'Problems', problemsTab], ['beans', 'Beans', beansTab], ['about', 'About', aboutTab]];
  function show(t) {
    const body = TABS.find((x) => x[0] === t)[2]();
    root.replaceChildren(
      h('p', { class: 'note' }, 'Work in progress: expect bugs. Not all of these tools are actively maintained. Your data stays in this browser. Taste is the final judge.'),
      h('nav', { class: 'tabs', 'aria-label': 'Sections' }, TABS.map(([k, l]) => h('a', { href: '#' + k, 'aria-current': k === t ? 'page' : false, onclick: (e) => { e.preventDefault(); show(k); } }, l))),
      body);
  }
  show('dial');
})();
