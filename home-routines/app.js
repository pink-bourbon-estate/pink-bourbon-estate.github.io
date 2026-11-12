/* Home Routines - house jobs by frequency, laundry guidance, meter readings, alarm and safety checks,
   stock checks and humidity. Built on tracker.js. Guidance is general: your appliance manuals and
   garment care labels always come first. */
const D = 'daily', W = 'weekly', M = 'monthly', Q = 'quarterly', Y = 'yearly';
PBE.tool({
  id: 'home-routines',
  title: 'Home Routines',
  view: 'grid',
  /* made-up example meter and humidity readings; routines are filled in automatically */
  example: ({ daysAgo, rnd }) => ({
    meters: [...[0, 1, 2, 3, 4, 5].flatMap((i) => [{ date: daysAgo(150 - i * 30), meter: 'Electricity', reading: Math.round(41000 + i * 240 + rnd() * 40), unit: 'kWh', notes: '' }, { date: daysAgo(150 - i * 30), meter: 'Gas', reading: Math.round(8800 + i * 90 + rnd() * 20), unit: 'm³', notes: '' }, { date: daysAgo(150 - i * 30), meter: 'Water', reading: Math.round(310 + i * 7 + rnd() * 2), unit: 'm³', notes: '' }])],
    humidity: Array.from({ length: 24 }, (_, i) => ({ date: daysAgo(46 - i * 2), room: ['Bedroom', 'Bathroom', 'Kitchen'][i % 3], rh: Math.round(48 + rnd() * 20 + (i % 3 === 1 ? 8 : 0)), temp: Math.round(17 + rnd() * 4), notes: '' })),
  }),
  /* sliders: what does a washing-machine load cost at different temperatures? (typical figures only) */
  whatif: ({ h }) => {
    const st = { loads: 4, price: 28 }, out = h('div', {});
    const KWH = [[30, 0.4], [40, 0.6], [60, 1.0]];                 // rough kWh per cycle: check your machine's label
    const draw = () => PBE.fill(out, h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Wash at', 'Per load', 'Per year'].map((x) => h('th', {}, x)))), h('tbody', {}, KWH.map(([t, k]) => h('tr', {}, h('td', {}, t + ' °C'), h('td', { class: 'n' }, PBE.round(k * st.price / 100, 2) + ' (currency units)'), h('td', { class: 'n' }, PBE.round(k * st.price / 100 * st.loads * 52, 0))))))), h('p', { class: 'meta' }, 'Typical energy per cycle (about 0.4, 0.6 and 1.0 kWh at 30, 40 and 60 °C) is a rough guide only: use your own machine\'s figures. Costs are in whatever currency you enter the price in.'));
    draw();
    return h('div', {}, h('h3', {}, 'What does laundry cost?'), PBEcharts.slider('Loads a week', 1, 14, 1, st.loads, (v) => { st.loads = v; draw(); }), PBEcharts.slider('Price of electricity per kWh', 5, 80, 1, st.price, (v) => { st.price = v; draw(); }, 'pence/cents'), out);
  },
  tabs: [
    { id: 'routines', label: 'Routines', type: 'checks', word: 'Routine', intro: 'Press "Done today" when you finish a routine and it comes back when it is next due. Pick "Everything" to see them all, or a group such as Kitchen. Add your own at the bottom.',
      items: [
        { id: 'bed', name: 'Make beds, tidy surfaces', every: D, group: 'Daily tidy' }, { id: 'dishes', name: 'Wash up, wipe worktops and hob', every: D, group: 'Kitchen' }, { id: 'bins', name: 'Empty kitchen bin if needed, take out food waste', every: D, group: 'Kitchen' },
        { id: 'sweep', name: 'Sweep or quickly hoover high-traffic floors', every: D, group: 'Floors' },
        { id: 'hoover', name: 'Hoover all carpets and rugs', every: W, group: 'Floors' }, { id: 'mop', name: 'Mop hard floors', every: W, group: 'Floors' }, { id: 'bath', name: 'Clean bathroom: sink, toilet, shower, mirror', every: W, group: 'Bathroom' },
        { id: 'sheets', name: 'Wash bed sheets', every: W, note: 'Weekly or fortnightly is common; 60 °C helps against dust mites if the fabric allows.', group: 'Laundry' }, { id: 'towels', name: 'Wash bath towels', every: W, note: 'Wash after about 3 to 4 uses; dry fully.', group: 'Laundry' },
        { id: 'dust', name: 'Dust surfaces, shelves, skirting', every: W, group: 'Dusting' }, { id: 'fridgewipe', name: 'Wipe fridge shelves, bin out-of-date food', every: W, group: 'Kitchen' }, { id: 'alarmtest', name: 'Test smoke alarms (press the button)', every: W, note: 'Fire services commonly advise a weekly test.', group: 'Safety' },
        { id: 'plants', name: 'Water and check house plants', every: W, group: 'Dusting' },
        { id: 'meters', name: 'Take meter readings', every: M, group: 'Bills' }, { id: 'co', name: 'Test carbon monoxide alarms', every: M, group: 'Safety' }, { id: 'washmach', name: 'Run washing machine empty at a hot setting; clean drawer and door seal', every: M, group: 'Appliances' },
        { id: 'dishwasher', name: 'Clean dishwasher filter, run a cleaning cycle', every: M, group: 'Appliances' }, { id: 'kettle', name: 'Descale kettle', every: M, note: 'Hard-water areas may need it more often.', group: 'Appliances' },
        { id: 'waterfilter', name: 'Change water-filter jug cartridge', every: M, note: 'Check the maker\'s advice for your filter.', group: 'Appliances' }, { id: 'fridge', name: 'Fridge and freezer check: temperatures, seals, defrost if needed', every: M, note: 'Fridge about 5 °C or below, freezer about -18 °C.', group: 'Appliances' },
        { id: 'pantry', name: 'Cupboard stock check: food, cleaning supplies, toiletries', every: M, group: 'Stock' }, { id: 'extractor', name: 'Wash cooker hood filters', every: M, group: 'Kitchen' }, { id: 'mattress', name: 'Turn or rotate mattress; air the bed', every: Q, group: 'Bedroom' }, { id: 'oven', name: 'Deep clean oven', every: Q, group: 'Kitchen' },
        { id: 'curtains', name: 'Wash or freshen curtains, vacuum upholstery', every: Q, group: 'Deep clean' }, { id: 'firstaid', name: 'Check first-aid kit: dates, plasters, supplies', every: Q, group: 'Safety' }, { id: 'toolkit', name: 'Check the toolkit: torch batteries, fuses, tape, basics', every: Q, group: 'Safety' }, { id: 'emerg', name: 'Check emergency supplies: torch, batteries, water, candles', every: Q, group: 'Safety' },
        { id: 'drains', name: 'Clean drains, plugholes and the washing-machine hose filter', every: Q, group: 'Appliances' }, { id: 'windows', name: 'Clean windows inside and out', every: Q, group: 'Deep clean' },
        { id: 'boiler', name: 'Boiler service', every: Y, group: 'Safety' }, { id: 'gas', name: 'Gas safety check (if you rent out or are advised)', every: Y, group: 'Safety' }, { id: 'chimney', name: 'Chimney sweep (if you have a fire)', every: Y, group: 'Safety' }, { id: 'alarmbatt', name: 'Replace smoke and CO alarm batteries; check alarm dates', every: Y, note: 'Alarms have a replace-by date, often 10 years.', group: 'Safety' },
        { id: 'gutters', name: 'Clear gutters, check roof and drains', every: Y, group: 'Outside' }, { id: 'deepfridge', name: 'Defrost and deep clean freezer', every: Y, group: 'Appliances' }, { id: 'declutter', name: 'Declutter: clothes, papers, cupboards', every: Y, group: 'Deep clean' }, { id: 'insure', name: 'Review home insurance and utilities deals', every: Y, group: 'Bills' }] },
    { id: 'meters', label: 'Meter readings', type: 'log', addLabel: 'Add a reading',
      intro: 'Electricity and gas are usually in kWh or cubic metres; water in cubic metres. Use the units on your meter. "Used since last" shows the difference from the last reading of the same meter.',
      required: ['reading'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'meter', label: 'Meter', type: 'select', options: ['Electricity', 'Electricity (night)', 'Gas', 'Water'], keep: true }, { key: 'reading', label: 'Reading', type: 'number' }, { key: 'unit', label: 'Unit', type: 'select', options: ['kWh', 'm³', 'units'], keep: true }, { key: 'notes', label: 'Notes' }],
      filterBy: 'meter',
      computed: [{ key: 'used', label: 'Used since last', fn: (r, all) => { const prev = all.filter((x) => x.meter === r.meter && x.date < r.date).sort((a, b) => b.date.localeCompare(a.date))[0]; return prev ? PBE.round(r.reading - prev.reading, 1) : ''; } }],
      charts: [{ title: 'Used since last reading', y: 'used' }] },
    { id: 'humidity', label: 'Humidity', type: 'log', addLabel: 'Add a humidity reading',
      intro: 'A cheap hygrometer works. Indoor humidity of about 40 to 60 % is generally comfortable; above about 60 % for long periods encourages mould and dust mites.',
      required: ['rh'],
      fields: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'room', label: 'Room', keep: true }, { key: 'rh', label: 'Humidity', type: 'number', unit: '%' }, { key: 'temp', label: 'Temperature', type: 'number', unit: '°C' }, { key: 'notes', label: 'Notes (window open, dryer on...)' }],
      filterBy: 'room', charts: [{ title: 'Humidity over time', y: 'rh', unit: '%' }] },
    { id: 'supplies', label: 'Emergency and stock', type: 'list', intro: 'Tick what you have and have checked. Untick everything at the start of each check.',
      items: [
        { group: 'First-aid kit', name: 'Plasters, assorted sizes' }, { group: 'First-aid kit', name: 'Sterile dressings and bandages' }, { group: 'First-aid kit', name: 'Antiseptic wipes' }, { group: 'First-aid kit', name: 'Thermometer' }, { group: 'First-aid kit', name: 'Tweezers and scissors' }, { group: 'First-aid kit', name: 'Disposable gloves' }, { group: 'First-aid kit', name: 'Pain relief (check dates and who it suits)' }, { group: 'First-aid kit', name: 'Anything prescribed for the household (in date)' },
        { group: 'Emergency', name: 'Torch and spare batteries' }, { group: 'Emergency', name: 'Battery or wind-up radio' }, { group: 'Emergency', name: 'Phone power bank, charged' }, { group: 'Emergency', name: 'Bottled water' }, { group: 'Emergency', name: 'Tinned or dried food that needs no cooking' }, { group: 'Emergency', name: 'Blankets' }, { group: 'Emergency', name: 'Copies of key documents and contact numbers' }, { group: 'Emergency', name: 'Fire extinguisher or fire blanket, in date' }, { group: 'Emergency', name: 'Know where the stopcock, gas and fuse board are' },
        { group: 'Toolkit', name: 'Screwdrivers, adjustable spanner, pliers' }, { group: 'Toolkit', name: 'Hammer, tape measure, spirit level' }, { group: 'Toolkit', name: 'Spare fuses and bulbs' }, { group: 'Toolkit', name: 'Duct tape, cable ties, WD-40' }, { group: 'Toolkit', name: 'Plunger' },
        { group: 'Cleaning supplies', name: 'Washing-up liquid, dishwasher tablets, salt' }, { group: 'Cleaning supplies', name: 'Laundry detergent, fabric softener' }, { group: 'Cleaning supplies', name: 'Multi-surface and bathroom cleaner' }, { group: 'Cleaning supplies', name: 'Bin bags, food-waste bags' }, { group: 'Cleaning supplies', name: 'Cloths, sponges, vacuum bags' }, { group: 'Cleaning supplies', name: 'Descaler' },
        { group: 'Cupboard staples', name: 'Rice, pasta, flour, oil' }, { group: 'Cupboard staples', name: 'Tinned tomatoes, beans' }, { group: 'Cupboard staples', name: 'Tea, coffee' }, { group: 'Cupboard staples', name: 'Salt, pepper, spices' }, { group: 'Cupboard staples', name: 'Toilet roll, kitchen roll' }] },
    { id: 'laundry', label: 'Laundry guide', type: 'static', blocks: [
      { h: 'Laundry guide', note: 'Always follow the care label on the garment first, then your washing-machine manual. These are common starting points, not guarantees.' },
      { table: [['Fabric or item', 'Common wash setting', 'Notes'],
        ['Cotton, white or colourfast', '40 to 60 °C', 'Use 60 °C for heavily soiled whites; 30 to 40 °C saves energy and protects colour.'],
        ['Cotton, bright colours or dark', '30 to 40 °C', 'Wash inside out; use colour-care detergent.'],
        ['Polyester and synthetics', '30 to 40 °C', 'Medium or reduced spin; avoid a hot dryer.'],
        ['Wool and knitwear', '20 to 30 °C, wool cycle or hand wash', 'Low or no spin; dry flat; do not wring.'],
        ['Silk and delicates', 'Hand wash or delicates cycle, cool', 'Mild detergent; do not twist; dry away from sun.'],
        ['Linen', '30 to 40 °C', 'Gentle spin; wash with similar items; improves with washing.'],
        ['Denim and jeans', '30 to 40 °C, inside out', 'Wash less often; drying in air keeps shape.'],
        ['Towels', '40 to 60 °C', 'No fabric softener if you want them absorbent; dry fully to avoid mustiness.'],
        ['Bed sheets and duvet covers', '40 to 60 °C', 'About 60 °C helps against dust mites if the label allows.'],
        ['Sportswear and activewear', '30 °C', 'Skip fabric softener (it can coat technical fabric); wash soon after use.'],
        ['Duvets and pillows', 'Per label, often 40 to 60 °C large machine', 'Dry fully, with clean tennis balls if tumbling; check care label.']] },
      { h3: 'The basics', list: ['Sort by colour, fabric and soil level; zip up zips and close Velcro.', 'Do not overfill: leave a hand\'s width at the top of the drum.', 'Use the right amount of detergent for your water hardness and load: more is not cleaner.', 'Leave the door and drawer open after washing to stop smells; clean the filter regularly.', 'Check pockets, and treat stains early, with the right method for the stain.'] },
      { p: 'Washing symbols vary; look at your garment label and the manufacturer\'s symbol guide (for example the GINETEX care labelling system) if unsure.' }] },
  ],
});
