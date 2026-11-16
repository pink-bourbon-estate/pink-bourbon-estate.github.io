/* data.js - the schedules, lists and advice text for Pregnancy and Baby.

   Everything follows NHS, NICE and UK Health Security Agency (UKHSA) guidance for the UK (see the Sources tab for the page behind each item).
   Where the UK has no published advice, a world-leading body is used and named (the US CDC milestone checklists, the US Institute of
   Medicine weight ranges). Guidance changes: always check the NHS pages and follow your own midwife, GP and health visitor. */
window.PBdata = (() => {
  'use strict';

  /** Routine antenatal appointments (NHS schedule for an uncomplicated pregnancy). first = only offered in a first pregnancy. */
  const APPOINTMENTS = [
    { id: 'a08', week: 8, name: 'Booking appointment', what: 'With a midwife, ideally by 10 weeks (8 to 12). Health history, blood pressure, urine and blood tests. You get your maternity notes and information about screening and where to give birth.' },
    { id: 'a12', week: 12, name: 'Dating scan', what: 'Ultrasound at 11 to 14 weeks to confirm your due date and check development. Optional screening for Down\'s, Edwards\' and Patau\'s syndromes.' },
    { id: 'a16', week: 16, name: '16-week check', what: 'Results of earlier screening, blood pressure and urine. You can have the whooping cough vaccine from 16 weeks.' },
    { id: 'a20', week: 20, name: 'Mid-pregnancy scan', what: 'Ultrasound at 18 to 21 weeks to check how your baby is developing. The whooping cough vaccine is usually offered around now.' },
    { id: 'a25', week: 25, name: '25-week check', first: true, what: 'First pregnancy only. Blood pressure, urine, bump measurement, your baby\'s movements, your mental health and birth preferences.' },
    { id: 'a28', week: 28, name: '28-week check', what: 'Blood tests for anaemia and blood group, and anti-D if you are rhesus negative. RSV vaccine from 28 weeks. Information about labour and newborn screening.' },
    { id: 'a31', week: 31, name: '31-week check', first: true, what: 'First pregnancy only. Preparing for birth, birth preferences and recognising labour. Routine checks.' },
    { id: 'a34', week: 34, name: '34-week check', what: 'Preparing for birth and recognising labour. Routine checks.' },
    { id: 'a36', week: 36, name: '36-week check', what: 'Your midwife feels your bump to check the baby\'s position. Routine checks and birth preparation.' },
    { id: 'a38', week: 38, name: '38-week check', what: 'Your choices if you are still pregnant after 40 weeks. Routine checks.' },
    { id: 'a40', week: 40, name: '40-week check', first: true, what: 'First pregnancy only. Your choices if you are still pregnant after 41 weeks. Routine checks.' },
    { id: 'a41', week: 41, name: '41-week check', what: 'You will be offered a membrane sweep and a date for induction.' },
  ];

  const AFTER_BIRTH = [
    ['Within 72 hours', 'Newborn physical examination: eyes, heart, hips and, in boys, testicles.'],
    ['Soon after birth', 'Newborn hearing screening, in hospital or within the first few weeks.'],
    ['Day 5', 'Blood spot (heel prick) test for rare but serious conditions, usually done by your midwife.'],
    ['10 to 14 days', 'Health visitor\'s new birth visit, usually at home.'],
    ['6 to 8 weeks', 'Your baby\'s second physical examination (usually by a GP) and your own postnatal check.'],
    ['From 8 weeks', 'Your baby\'s first vaccinations (see Vaccines).'],
    ['9 to 12 months and 2 to 2½ years', 'Health visitor development reviews.'],
    ['Within 42 days', 'Register the birth (England, Wales and Northern Ireland; within 21 days in Scotland).'],
  ];

  /** Vaccines offered in pregnancy. from/by are weeks. */
  const MUM_VACCINES = [
    { id: 'm_pert', name: 'Whooping cough (pertussis)', from: 16, by: 32, when: 'Every pregnancy. From 16 weeks, usually around the 20-week scan, ideally before 32 weeks. You can still have it later if you miss that.' },
    { id: 'm_rsv', name: 'RSV', from: 28, when: 'Every pregnancy, from 28 weeks. It helps protect your baby against bronchiolitis in the first months.' },
    { id: 'm_flu', name: 'Flu (injection)', when: 'At any stage of pregnancy, during the flu season (autumn and winter). Not the nasal spray.' },
    { id: 'm_covid', name: 'COVID-19', when: 'Ask your midwife whether it is recommended for you this season, as the offer changes from year to year.' },
  ];

  /** The UK routine baby schedule (children born on or after 1 July 2024). days = age in days when due. */
  const BABY_DOSES = [
    { id: 'b08', age: '8 weeks', days: 56, what: '6-in-1 (1st dose), MenB (1st), rotavirus (1st, by mouth)' },
    { id: 'b12', age: '12 weeks', days: 84, what: '6-in-1 (2nd), MenB (2nd), rotavirus (2nd)' },
    { id: 'b16', age: '16 weeks', days: 112, what: '6-in-1 (3rd), pneumococcal (1st)' },
    { id: 'b1y', age: '1 year', days: 365, what: 'MMRV (1st), pneumococcal (2nd), MenB (3rd)' },
    { id: 'b18m', age: '18 months', days: 548, what: '6-in-1 (4th), MMRV (2nd)' },
    { id: 'b3y4m', age: '3 years 4 months', days: 1217, what: '4-in-1 pre-school booster' },
  ];
  const BABY_VACCINE_NOTES = [
    'Rotavirus has age limits: the first dose must be given before 15 weeks and the second before 24 weeks.',
    'The children\'s flu vaccine (nasal spray) is offered every autumn from age 2.',
    'Only some babies: hepatitis B at birth and later if the mother has hepatitis B, and BCG (TB) in some areas.',
    'Appointments are booked through your GP surgery. Take the red book (personal child health record) with you.',
  ];

  const DAILY = [
    'Folic acid 400 micrograms (until 12 weeks)', 'Vitamin D 10 micrograms', '5 portions of fruit and vegetables', 'Starchy food, wholegrain where you can',
    'Protein: beans, pulses, fish, eggs or meat', 'Dairy or a calcium-fortified alternative', 'Iron-rich food with a source of vitamin C', 'Plenty of water',
  ];
  const NUTRIENTS = [
    ['Folic acid', '400 micrograms a day from before you conceive (ideally 3 months before) until 12 weeks. Some people are prescribed a higher dose: ask your GP.', 'Supplement, plus leafy greens, broccoli and fortified cereals.'],
    ['Vitamin D', '10 micrograms (400 IU) a day. The NHS recommends it all year round in pregnancy. Do not take more than 100 micrograms a day.', 'Supplement; oily fish, eggs and fortified foods add a little.'],
    ['Iron', 'Low iron is common in pregnancy. Your midwife checks your blood at booking and at 28 weeks.', 'Lean red meat, pulses, dried fruit and dark green vegetables. Vitamin C helps you absorb it.'],
    ['Calcium', 'Important for your baby\'s bones and teeth.', 'Milk, cheese, yoghurt, fortified plant drinks, tofu and tinned fish with bones.'],
    ['Omega-3', 'Aim for 1 portion of oily fish a week, and no more than 2.', 'Salmon, mackerel, sardines, trout and herring.'],
    ['Vitamin A', 'Avoid supplements containing vitamin A (retinol), and liver: too much can harm your baby.', 'Pregnancy multivitamins are made without it.'],
  ];
  const AVOID = [
    'Alcohol: the safest choice is not to drink at all.',
    'More than 200 mg of caffeine a day (about 2 mugs of instant coffee, or 1 mug of filter coffee).',
    'All pâté, including vegetable pâté, and liver and liver products.',
    'Raw or undercooked meat, and game shot with lead.',
    'Cold cured meats such as salami, chorizo and prosciutto, unless cooked until steaming hot.',
    'Mould-ripened soft cheese (brie, camembert) and soft blue cheese, unless cooked until steaming hot.',
    'Unpasteurised milk, and cheese made from it.',
    'Raw or runny eggs, unless they carry the British Lion stamp.',
    'Shark, swordfish and marlin; raw shellfish.',
    'Cold-smoked or cured fish (smoked salmon, gravlax, sushi) unless cooked until steaming hot.',
    'More than 2 portions of oily fish a week, or more than 4 medium cans (or 2 steaks) of tuna a week.',
    'Supplements containing vitamin A (retinol), and fish liver oil.',
  ];
  const WARNINGS = [
    'Your baby is moving less than usual, moving differently, or you cannot feel them move. Do not wait until the next day.',
    'Bleeding from the vagina, or fluid leaking (your waters breaking).',
    'Severe headache, problems with your vision, or sudden swelling of the face, hands or feet (possible signs of pre-eclampsia).',
    'Severe tummy pain, or pain that does not go away.',
    'Itching, especially on your hands and feet.',
    'A high temperature, or pain when you pass urine.',
    'Regular tightenings or contractions before 37 weeks.',
    'Feeling very low, or having thoughts of harming yourself: call 111 (choose the mental health option) or Samaritans on 116 123.',
  ];

  /* tick lists: { group, name } */
  const g = (group, items) => items.map((name) => ({ group, name }));
  const PRECONCEPTION = g('Before you conceive', [
    'Start folic acid 400 micrograms a day, ideally 3 months before', 'Take vitamin D 10 micrograms a day', 'Check with your GP that you have had 2 doses of MMR', 'Review your medicines with your GP or pharmacist',
    'Make sure your cervical screening is up to date', 'Stop smoking (free NHS stop smoking support is available) and stop drinking alcohol', 'Aim for a healthy weight', 'Get long-term conditions (diabetes, epilepsy, blood pressure) reviewed',
    'Book a dental check-up', 'Check your maternity pay and leave']);
  const HOSPITAL_BAG = [
    ...g('Documents', ['Maternity notes (or your maternity app login)', 'Birth preferences', 'Phone and a long charger', 'Car seat fitted in the car']),
    ...g('For labour', ['Loose nightie or big T-shirt', 'Dressing gown and slippers', 'Lip balm and hair ties', 'Snacks and drinks, a bottle with a straw', 'Music, headphones, a pillow', 'TENS machine (optional)']),
    ...g('After the birth', ['Maternity pads (lots)', 'Big comfortable knickers', 'Nursing bras and breast pads', 'Loose going-home clothes', 'Toiletries, a towel, glasses']),
    ...g('For your baby', ['3 or 4 vests and sleepsuits', 'Hat and scratch mittens', 'Muslins', 'Newborn nappies and cotton wool or water wipes', 'Blanket', 'Formula and bottles if you plan to formula feed']),
    ...g('For your birth partner', ['Change of clothes', 'Snacks, drinks and change for the car park', 'Phone charger'])];
  const PREPARE = [
    ...g('First trimester', ['Refer yourself to your local maternity service', 'Start folic acid and vitamin D', 'Get a maternity exemption certificate (free prescriptions and NHS dental care)', 'Check whether you can get Healthy Start', 'Plan when to tell work (you must tell your employer by the end of the 15th week before your due week, about 25 weeks)']),
    ...g('Second trimester', ['Ask your midwife for your MATB1 form (from 20 weeks)', 'Plan maternity, paternity or shared parental leave', 'Look at antenatal classes (NHS or NCT)', 'Visit or tour the birth unit', 'Start a list of what to buy']),
    ...g('Third trimester', ['Write your birth preferences and discuss them with your midwife', 'Fit the car seat (i-Size) and practise using it', 'Pack your hospital bag by 36 weeks', 'Set up a safe sleep space: a firm, flat mattress in a cot or Moses basket in your room', 'Save the maternity unit\'s number in your phone', 'Batch-cook some meals and line up help']),
    ...g('After the birth', ['Register the birth (within 42 days; 21 in Scotland)', 'Register your baby with a GP', 'Claim Child Benefit', 'Book the 6 to 8 week checks and first vaccinations', 'Safe sleep: on the back, feet to the foot of the cot, nothing else in it', 'Tell your midwife, health visitor or GP if you feel low for more than 2 weeks'])];
  const TO_BUY = [
    ...g('Essentials', ['Rear-facing car seat (i-Size)', 'Cot, Moses basket or bedside crib with a new, firm, flat mattress', 'Fitted sheets and baby sleeping bags', '6 to 8 vests and sleepsuits (newborn and 0 to 3 months)', 'Hats, socks and a cardigan', 'Newborn nappies, cotton wool or water wipes, barrier cream', 'Changing mat', 'Muslins', 'Baby bath or support and soft towels', 'Room thermometer (16 to 20 °C is ideal)', 'Digital thermometer for your baby', 'Pram, pushchair or sling']),
    ...g('Feeding', ['Breast pads, nipple cream, nursing bras', 'Breast pump (optional)', 'Bottles, steriliser and first infant formula if formula feeding', 'Vitamin D drops for a breastfed baby']),
    ...g('For you', ['Maternity pads', 'Comfortable knickers', 'Pregnancy pillow', 'Easy snacks and a big water bottle']),
    ...g('Nice to have', ['Baby monitor', 'Play mat', 'Bouncer', 'Nappy bin', 'White noise machine'])];

  /** CDC milestone checklists (US), shortened: [age in months, [[area, milestone]]]. The NHS points to similar checklists. */
  const MILESTONES = [
    [2, [['Social', 'Calms down when spoken to or picked up'], ['Social', 'Looks at your face'], ['Language', 'Makes sounds other than crying'], ['Language', 'Reacts to loud sounds'], ['Movement', 'Holds head up when on tummy'], ['Movement', 'Moves both arms and both legs']]],
    [4, [['Social', 'Smiles on their own to get your attention'], ['Social', 'Chuckles when you try to make them laugh'], ['Language', 'Makes sounds back when you talk'], ['Thinking', 'Brings hands to mouth'], ['Movement', 'Holds head steady without support'], ['Movement', 'Pushes up onto elbows on tummy']]],
    [6, [['Social', 'Knows familiar people'], ['Social', 'Laughs'], ['Language', 'Takes turns making sounds with you'], ['Thinking', 'Reaches to grab a toy'], ['Movement', 'Rolls from tummy to back'], ['Movement', 'Leans on hands to support themselves when sitting']]],
    [9, [['Social', 'Is shy or clingy around strangers'], ['Language', 'Makes sounds like "mamamama" and "babababa"'], ['Language', 'Looks when you call their name'], ['Thinking', 'Looks for objects dropped out of sight'], ['Movement', 'Sits without support'], ['Movement', 'Gets into a sitting position alone']]],
    [12, [['Social', 'Plays games with you, like pat-a-cake'], ['Language', 'Waves bye-bye'], ['Language', 'Calls a parent "mama", "dada" or another special name'], ['Thinking', 'Puts something in a container'], ['Movement', 'Pulls up to stand'], ['Movement', 'Picks things up between thumb and finger']]],
    [15, [['Social', 'Shows you affection with hugs or kisses'], ['Language', 'Tries to say 1 or 2 words besides "mama" or "dada"'], ['Language', 'Points to ask for something'], ['Thinking', 'Stacks at least 2 small objects'], ['Movement', 'Takes a few steps alone'], ['Movement', 'Feeds themselves with fingers']]],
    [18, [['Social', 'Points to show you something interesting'], ['Language', 'Tries to say 3 or more words besides "mama" or "dada"'], ['Language', 'Follows one-step directions without gestures'], ['Thinking', 'Scribbles'], ['Movement', 'Walks without holding on'], ['Movement', 'Climbs on and off a sofa alone']]],
    [24, [['Social', 'Notices when others are hurt or upset'], ['Language', 'Says at least 2 words together'], ['Language', 'Points to at least 2 body parts when asked'], ['Thinking', 'Plays with more than one toy at the same time'], ['Movement', 'Kicks a ball'], ['Movement', 'Runs']]],
    [30, [['Social', 'Plays next to other children and sometimes with them'], ['Language', 'Says about 50 words'], ['Language', 'Says words like "I", "me" or "we"'], ['Thinking', 'Uses things to pretend'], ['Movement', 'Jumps off the ground with both feet'], ['Movement', 'Turns book pages one at a time']]],
    [36, [['Social', 'Calms down within 10 minutes after you leave'], ['Language', 'Has a back-and-forth conversation'], ['Language', 'Says their first name when asked'], ['Thinking', 'Draws a circle when shown how'], ['Movement', 'Threads items together, like large beads'], ['Movement', 'Puts on some clothes alone']]],
    [48, [['Social', 'Pretends to be something else during play'], ['Social', 'Comforts others who are hurt or sad'], ['Language', 'Says sentences with 4 or more words'], ['Thinking', 'Names a few colours'], ['Movement', 'Catches a large ball most of the time'], ['Movement', 'Holds a crayon between fingers and thumb']]],
    [60, [['Social', 'Follows rules and takes turns in games'], ['Language', 'Tells a story with at least 2 events'], ['Thinking', 'Counts to 10'], ['Thinking', 'Pays attention for 5 to 10 minutes'], ['Movement', 'Hops on one foot'], ['Movement', 'Does up some buttons']]],
  ];

  /** Rough size comparison for weeks 4 to 42 (babies vary a lot). */
  const SIZES = ['poppy seed', 'sesame seed', 'lentil', 'blueberry', 'raspberry', 'cherry', 'strawberry', 'fig', 'lime', 'lemon', 'peach', 'apple', 'avocado', 'pear', 'pepper', 'mango', 'banana', 'carrot', 'papaya', 'grapefruit', 'corn on the cob', 'swede', 'lettuce', 'cauliflower', 'aubergine', 'butternut squash', 'cabbage', 'coconut', 'pineapple', 'pineapple', 'cantaloupe melon', 'honeydew melon', 'cos lettuce', 'bunch of chard', 'bunch of leeks', 'small watermelon', 'small pumpkin', 'pumpkin', 'watermelon'];
  const size = (w) => SIZES[Math.min(42, Math.max(4, w)) - 4];

  /** A short note for the week, aligned with the NHS schedule. */
  function weekNote(w) {
    if (w <= 5) return 'A pregnancy test can now be positive. Start folic acid (400 micrograms a day) if you have not already, and contact a midwife or GP to start your care.';
    if (w <= 7) return 'The heart is starting to form. Refer yourself to your local maternity service so your booking appointment can happen by 10 weeks.';
    if (w <= 10) return 'Your booking appointment with a midwife is usually now (8 to 12 weeks, ideally by 10).';
    if (w <= 13) return 'Dating scan and optional screening for Down\'s, Edwards\' and Patau\'s syndromes (11 to 14 weeks).';
    if (w <= 15) return 'Second trimester. Many people find nausea eases and energy returns.';
    if (w <= 17) return '16-week check. You can have the whooping cough vaccine from now. You may start to feel movements between 16 and 24 weeks.';
    if (w <= 21) return 'Mid-pregnancy scan, usually between 18 and 21 weeks. The whooping cough vaccine is usually offered around now.';
    if (w <= 23) return 'Get to know your baby\'s pattern of movements as it develops.';
    if (w <= 26) return 'Contact your midwife if you have not felt your baby move by 24 weeks. Ask about glucose testing (24 to 28 weeks) if you are at higher risk of gestational diabetes.';
    if (w <= 28) return 'Third trimester. 28-week blood tests, anti-D if you are rhesus negative, and the RSV vaccine from 28 weeks.';
    if (w <= 33) return 'Think about your birth preferences and how you will know labour has started. Have the whooping cough vaccine before 32 weeks if you can.';
    if (w <= 35) return '34-week check. Pack your hospital bag and fit the car seat.';
    if (w === 36) return '36-week check: your midwife feels for your baby\'s position. Your bag should be ready.';
    if (w <= 39) return 'From 37 weeks your baby is considered full term. Keep phoning straight away about any change in movements.';
    if (w === 40) return 'Your due date. Only a small share of babies arrive on the day itself.';
    if (w === 41) return '41-week check: you will be offered a membrane sweep and a date for induction.';
    return 'After 42 weeks you should be offered extra monitoring if you choose not to be induced.';
  }

  /** US Institute of Medicine weight-gain ranges for one baby, kg. The NHS gives no targets; shown for reference only. */
  function iom(bmi) { return bmi < 18.5 ? ['BMI under 18.5', 12.5, 18] : bmi < 25 ? ['BMI 18.5 to 24.9', 11.5, 16] : bmi < 30 ? ['BMI 25 to 29.9', 7, 11.5] : ['BMI 30 or more', 5, 9]; }
  /** NICE glucose targets in pregnancy for people with diabetes (mmol/L). */
  const GLUCOSE_TARGETS = [['Fasting', 5.3], ['1 hour after a meal', 7.8], ['2 hours after a meal', 6.4]];

  return { APPOINTMENTS, AFTER_BIRTH, MUM_VACCINES, BABY_DOSES, BABY_VACCINE_NOTES, DAILY, NUTRIENTS, AVOID, WARNINGS, PRECONCEPTION, HOSPITAL_BAG, PREPARE, TO_BUY, MILESTONES, size, weekNote, iom, GLUCOSE_TARGETS };
})();
