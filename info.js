/* info.js: the words for the Sources and FAQ tabs of every project (the shared tabs are built by shell.js).

   One entry per project, named after the project's folder:
     sources: [ { h: 'Group heading', note: 'optional line', items: [ { t: 'Title', u: 'https://link (optional)', n: 'what was taken from it' } ] } ]
     faq:     [ { q: 'Question', a: 'Answer' } ]
     keys:    the browser storage keys the project uses (so My Data can export them), for pages not built on tracker.js
     exampleNote: an optional sentence for the Example Data tab

   How honest to be: where a figure or practice is common knowledge that I have not checked against a published source, the entry says so.
   If you spot a mistake or a missing source, please open an issue on GitHub. */
window.PBEinfo = {
  'books-and-film': {
    sources: [{ h: 'Where this comes from', items: [{ t: 'Your own entries', n: 'a list of what you have read, watched or want to see; nothing is looked up from other sites.' }] }],
    faq: [{ q: 'Does it look up covers or ratings?', a: 'No. It never contacts another site. You type the title, who recommended it and your own rating.' }, { q: 'How do I bring in a list I already have?', a: 'Use the Import tab. It is read in your browser and never uploaded.' }],
  },
  'brewing-and-fermentation-timesheet': {
    keys: ['brewing-timesheet-plan-v1', 'brewing-fermentation-history-v1'],
    faq: [{ q: 'What does "starting point" mean on a recipe?', a: 'It is typical home practice that has not been checked against a published source yet. "From a published recipe" means the main figures were taken from a page listed on the Sources tab and scaled to your batch.' }, { q: 'Is this food-safety advice?', a: 'No. Read the Safety tab and follow your own judgement and official food-safety guidance. If something looks, smells or tastes wrong, do not eat or drink it.' }, { q: 'Why are the figures scaled?', a: 'Each recipe is stored for one batch size and scaled to the amount you ask for. Salt and sugar percentages are kept, not the grams.' }],
  },
  'bullet-journal': {
    sources: [{ h: 'Method', items: [{ t: 'Ryder Carroll, "The Bullet Journal Method"', u: 'https://bulletjournal.com', n: 'the idea of rapid logging, with dots, tasks, events and notes, migrated month to month. This tool is my own digital take on it, not an official one.' }] }],
    faq: [{ q: 'Is this the official Bullet Journal?', a: 'No. It follows the idea of rapid logging from the book, but it is an independent tool and is not connected to the author.' }, { q: 'What is migration?', a: 'At the end of a month you move the tasks that still matter to the next month and let the rest go. It is how the method keeps your list honest.' }],
  },
  'car-and-travel': {
    sources: [{ h: 'Official guidance', items: [{ t: 'GOV.UK: road fuel price data', u: 'https://www.gov.uk/guidance/access-fuel-price-data', n: 'to compare your own fill-ups with the going rate (address as given in the tool; I have not re-checked that it is still current).' }, { t: 'GOV.UK: driving abroad', u: 'https://www.gov.uk', n: 'search gov.uk for "driving abroad": rules differ by country and change, so check before you travel.' }] },
      { h: 'Rules of thumb', items: [{ t: 'POWDERS (Petrol, Oil, Water, Damage, Electrics, Rubber, Screenwash)', n: 'a common driving-instructor mnemonic for the weekly checks; not from one source.' }, { t: 'UK minimum legal tyre tread of 1.6 mm', n: 'across the central three-quarters of the tyre; check the current rule on GOV.UK.' }] }],
    faq: [{ q: 'Does it replace my car handbook or a mechanic?', a: 'No. Follow your handbook and a qualified mechanic.' }, { q: 'How are miles per gallon worked out?', a: 'From the odometer difference between fill-ups and the litres you add, using the UK gallon (4.546 litres). It is only as accurate as how you fill the tank.' }],
  },
  'chess-lab': {
    keys: ['pbe-chess-lab-v1'],
    sources: [{ h: 'Opening lines', note: 'The lines in this demo (Italian Game, Ruy Lopez, Sicilian Najdorf set-up) are written from general opening knowledge. I have not verified every move against a published book or database, so treat them as a starting point.', items: [{ t: 'Stockfish (a possible future engine)', u: 'https://stockfishchess.org', n: 'open source under the GPL, which has its own conditions; not used yet.' }] }],
    faq: [{ q: 'Are the lines checked?', a: 'Not yet. They are a starting point for the demo: check them against a book or an opening database before relying on them.' }, { q: 'What is stored?', a: 'Only your own practice counts for each line, in this browser.' }],
  },
  'coffee-notebook': {
    keys: ['coffee-notebook-log-v1', 'coffee-notebook-bags-v1'],
    sources: [
      { h: 'Where figures came from', items: [{ t: 'Achieving the Gold Cup Standard (Seattle Coffee Gear)', u: 'https://www.seattlecoffeegear.com/blogs/learning-center/achieving-the-gold-cup-standard-your-guide-to-brewing-excellence', n: '55 g per litre, 1.15 to 1.35 % TDS, 18 to 22 % extraction, 195 to 205 F.' }, { t: 'James Hoffmann\'s AeroPress recipe (Lamose)', u: 'https://secure.lamose.com/blogs/recipes/james-hoffmanns-aeropress-recipe-world-champion-method', n: '11 g, 200 ml at about 96 C, 2-minute steep, gentle press.' }, { t: 'Sprudge on Morgan Eckroth\'s "Coffee, for Here"', u: 'https://sprudge.com/coffee-for-here-the-new-book-by-morgan-eckroth-is-now-on-pre-order-780003.html', n: 'a handbook with 40 cafe-style drink recipes, including espresso tonic.' }] },
      { h: 'People and channels worth your time', note: 'Read or watched by me.', items: [{ t: 'James Hoffmann', n: 'YouTube and the books "The World Atlas of Coffee" and "How to Make the Best Coffee at Home": brewing technique, the AeroPress and V60, origins and processing.' }, { t: 'Lance Hedrick', n: 'YouTube: espresso dialling-in, puck preparation and workflow.' }, { t: 'Andrew and Serena (andsercoffee)', u: 'https://youtube.com/@andsercoffee', n: 'YouTube: coffee omakase style drinks, coffee cocktails and experiments.' }, { t: 'Morgan Eckroth', n: 'YouTube and "Coffee, for Here": cafe-style and funkier recipes.' }] },
      { h: 'Reading educators often point to (to follow up)', note: 'Listed for you to follow up. I have not checked these line by line.', items: [{ t: 'Scott Rao', n: '"Everything but Espresso", "The Professional Barista\'s Handbook", "The Coffee Roaster\'s Companion".' }, { t: 'Christopher Hendon and Maxwell Colonna-Dashwood', n: '"Water for Coffee".' }, { t: 'Jonathan Gagne', n: '"The Physics of Filter Coffee".' }, { t: 'Barista Hustle (Matt Perger)', n: 'articles and courses.' }, { t: 'Illy and Viani', n: '"Espresso Coffee: The Science of Quality".' }, { t: 'Specialty Coffee Association', n: 'Coffee Taster\'s Flavor Wheel, the Gold Cup brewing standard and the cupping protocol.' }, { t: 'World Coffee Research', n: 'the Sensory Lexicon and the Arabica Variety Catalog.' }] },
      { h: 'Roasters and collectives', items: [{ t: 'Taith (Lewes, UK)', u: 'https://taithcoffee.com', n: 'coffees including Pink Bourbon, the namesake of this site.' }, { t: 'April Coffee Roasters (Copenhagen)', n: 'a lighter-roast, clarity-first style that has influenced many roasters.' }] }],
    faq: [{ q: 'What does "starting point" mean on a recipe?', a: 'Common practice that I have not checked against a published source. "From a published source" means the figures are on the Sources tab.' }, { q: 'Is caffeine safe for me?', a: 'It affects people differently. Be careful in pregnancy and with heart conditions, and ask your doctor or pharmacist if unsure.' }],
  },
  'endurance-training': {
    sources: [{ h: 'Plans and conventions', note: 'Pace zones, FTP zones, CSS and fuelling figures are widely published coaching conventions (Coggan power zones, Riegel\'s formula, the 80/20 easy-to-hard idea). I wrote them from general knowledge, not from one source.', items: [{ t: 'Coach magazine, "Running training plans explained"', n: 'running session types and plan lengths (for example Couch to 5K at 8 weeks, 10K in 8 to 10 weeks, half marathon about 12 weeks, marathon about 16 weeks).' }, { t: 'Commercial apps and club plans (Runna, TrainingPeaks and others)', n: 'their plans are proprietary: this tool does not copy them, but is built on the same common ideas. Worth a look if you want a coached experience.' }] }],
    faq: [{ q: 'Is this a coaching plan?', a: 'No. It builds a simple example plan from common ideas. See a coach or doctor before a big change in training, and stop if something hurts in a sharp or unusual way.' }, { q: 'Where do the pace zones come from?', a: 'From your own test or recent result using common percentage conventions. They are rough: use effort and how you feel as well.' }],
  },
  'gym-and-strength': {
    sources: [
      { h: 'Strength standards', items: [{ t: 'Jeff Nippard, "How Strong Should You Be? (Noob to Freak)"', u: 'https://jeffnippard.com/blogs/news/how-strong-should-you-be-noob-to-freak-1', n: 'bodyweight standards, summarised by hand; some beginner figures for women could not be matched exactly.' }] },
      { h: 'Conjugate method', items: [{ t: 'Westside Barbell, "What the Conjugate Method Actually Is"', u: 'https://www.westside-barbell.com/a/blog/what-the-conjugate-method-actually-is', n: 'the concept and the three methods (it gives no percentages).' }, { t: 'Box Programming, "The Conjugate Method Explained"', u: 'https://boxprogramming.com/an-overview-of-the-conjugate-method/', n: 'the weekly template.' }] },
      { h: 'Golden and silver era routines', items: [{ t: 'GymTalk, "The Reg Park Mr Universe Course"', u: 'https://gymtalk.com/?p=19051' }, { t: 'GymTalk, "The Steve Reeves Classic Physique Routine"', u: 'https://gymtalk.com/?p=17485', n: 'from Reeves\' May 1951 Your Physique article.' }, { t: 'GymTalk, "The Bill Pearl Bulk and Power Routine"', u: 'https://gymtalk.com/?p=20795' }] },
      { h: 'Formulas', items: [{ t: 'Epley: weight x (1 + reps/30), and Brzycki: weight x 36/(37 - reps)', n: 'estimated one-rep max. Both are rough and least reliable above about 10 reps. The tool averages them.' }] }],
    faq: [{ q: 'How does "Sets and reps" decide the next weight?', a: 'It estimates a one-rep max from a set, sets your working weight from the sets and reps you choose, and then compares your logged sessions: if you hit the top of the range it suggests more weight, if you miss it suggests the same weight, a lower weight or a longer rest.' }, { q: 'Is this safe for me?', a: 'It is a record keeper, not a coach. Learn technique from a qualified coach, and stop if something hurts in a sharp or unusual way.' }],
  },
  'health-metrics': {
    sources: [{ h: 'Where to find general information', items: [{ t: 'NHS (nhs.uk)', u: 'https://www.nhs.uk', n: 'pages on blood pressure, temperature, blood sugar and weight.' }, { t: 'Diabetes UK, the British Heart Foundation and similar charities', n: 'clear, current guides.' }] }],
    faq: [{ q: 'What is this for?', a: 'It is a place to record your own readings so you have them to talk through with your doctor or nurse. It does not interpret them.' }, { q: 'Why are there no "normal ranges"?', a: 'Ranges depend on the person and the device, so only a professional who knows you should say what a number means for you.' }],
  },
  'home-routines': {
    sources: [{ h: 'Guidance', items: [{ t: 'Garment care labels and your washing-machine manual', n: 'always come first; the laundry guide is general and not a replacement.' }, { t: 'Check intervals (daily, weekly, monthly)', n: 'common household practice: not from a published standard. Change them to suit your home.' }] }],
    faq: [{ q: 'Can I change how often a job is due?', a: 'Yes: add your own jobs with the frequency you want. The built-in ones are a starting point.' }],
  },
  'language-lab': {
    keys: ['pbe-language-lab-v1'],
    sources: [{ h: 'Sample text', items: [{ t: 'Short texts written for this demo', n: 'a cafe and a park, written for this demo. A native speaker has not reviewed them yet: treat them as a starting point.' }] },
      { h: 'Planned (not built)', note: 'Sources I would draw on, only where they are free to reuse and respectful.', items: [{ t: 'Public-domain books, scripts and film writing; openly licensed articles; titles of respected magazines', n: 'to build word lists per language. Nothing is collected yet.' }] }],
    faq: [{ q: 'Does it send my text anywhere?', a: 'No. The analysis (word list, sentence length, repeated phrases, common beginnings and endings) happens in your browser.' }, { q: 'Which languages?', a: 'The demo has short sample texts only. Paste any text in any language that uses spaces between words.' }],
  },
  'medicine-and-appointments': {
    sources: [{ h: 'Where this comes from', items: [{ t: 'Your own entries and your medicine labels', n: 'the tool never suggests doses. Follow your prescriber and pharmacist.' }] }],
    faq: [{ q: 'Does it tell me what to take?', a: 'No. It records what you tell it, and counts days and gaps from your own label figures.' }, { q: 'Who can see this?', a: 'Only someone using this browser on this device. Download a copy to take to an appointment.' }],
  },
  'meditation': {
    sources: [{ h: 'Where to learn more', items: [{ t: 'NHS: "Mindfulness"', u: 'https://www.nhs.uk', n: 'a short, careful introduction (search nhs.uk for mindfulness).' }, { t: 'Mark Williams and Danny Penman, "Mindfulness: A practical guide to finding peace in a frantic world"', n: 'a book with an eight-week course.' }, { t: 'Jon Kabat-Zinn, "Full Catastrophe Living"', n: 'the origins of mindfulness-based stress reduction.' }, { t: 'A local meditation or Buddhist centre, or a qualified teacher' }] },
      { h: 'Sounds', items: [{ t: 'Bells, bowls and bath sounds', n: 'made in your browser from simple tones, so no recordings are used. They are an approximation of the real instruments.' }] }],
    faq: [{ q: 'Is meditation right for everyone?', a: 'Not always. If it brings up distress, stop and speak to a doctor or a qualified teacher.' }, { q: 'Do the sounds need a download?', a: 'No. They are made by your browser as you play them.' }],
  },
  'mobility-and-physio': {
    sources: [{ h: 'Sources', items: [{ t: 'Precision Nutrition: shoulder prehab article', u: 'https://www.precisionnutrition.com/?p=14646', n: 'circuits and problem areas.' }, { t: 'A qualified physiotherapist', n: 'the only way to get advice that fits your own shoulder.' }] }],
    faq: [{ q: 'Is this a treatment plan?', a: 'No. It is general information and a log. If anything hurts in a sharp or unusual way, or does not settle, see a physiotherapist or doctor.' }],
  },
  'nutrition-and-macros': {
    sources: [{ h: 'Targets', items: [{ t: 'Mifflin MD and others (1990), "A new predictive equation for resting energy expenditure in healthy individuals"', n: 'American Journal of Clinical Nutrition.' }, { t: 'Morton et al. (2018), British Journal of Sports Medicine', n: 'protein of about 1.6 to 2.2 g per kg, summarised from general knowledge, not re-checked.' }, { t: 'About 7700 kcal per kg of body weight', n: 'a widely used rule of thumb, only approximate.' }] },
      { h: 'Foods', note: 'The starter foods list is approximate and rounded: always check the label. Summaries are from general knowledge and I could not verify every claim, so treat it as a starting list.', items: [{ t: 'UK food databases (see the Databases tab)', n: 'what exists and what each offers.' }] }],
    faq: [{ q: 'Are the numbers exact?', a: 'No. Starter foods are rounded, and calorie targets are estimates. Check labels, and talk to a registered dietitian for personal advice.' }, { q: 'Is this for everyone?', a: 'No. It is a documenting tool. If food or weight worries you, please speak to your GP.' }],
  },
  'sewing-and-knitting-pattern-maker': {
    sources: [{ h: 'Code', items: [{ t: 'Pattern kit source code', u: 'https://github.com/pink-bourbon-estate/Toolkits/tree/main/patternkit', n: 'the pattern maths. The method and credits are on the privacy and licence page.' }] }],
    faq: [{ q: 'Does it work yet?', a: 'It is in development and may show an error in the browser. See the note at the top of the page.' }, { q: 'Do my measurements leave my device?', a: 'No. The pattern is generated in your browser.' }, { q: 'How do I print it at the right size?', a: 'Print at 100 % ("actual size", not "fit to page") and check the test square against a ruler before cutting.' }],
    exampleNote: 'This tool stores nothing, so there is no example data to load or remove.',
  },
  'sightline': {
    keys: ['pbe-sightline-lab-v1'],
    sources: [{ h: 'Music', items: [{ t: 'The Mutopia Project', u: 'https://www.mutopiaproject.org', n: 'every piece is public domain; the MIDI files come from its typesetters, named on each page and in scores/LICENSES.txt.' }] },
      { h: 'Piano sound', items: [{ t: 'Salamander Grand Piano, recorded by Alexander Holm', n: 'used under Creative Commons Attribution 3.0 (CC BY 3.0). The recordings are kept in this site\'s own folder.' }] },
      { h: 'Method', items: [{ t: 'Russian-School practice steps', n: 'the ticklist in the Score lab is a general summary and unverified: check with a teacher.' }, { t: 'Desktop app (PDF reading)', u: 'https://github.com/pink-bourbon-estate/Toolkits', n: 'does the real PDF reading; the web demo does not read your own PDFs.' }] }],
    faq: [{ q: 'Can it read my own PDF?', a: 'Not in the browser yet. The demo shows how a page is read using public-domain pieces.' }, { q: 'What about guitar tab?', a: 'Planned. Sightline is meant to work for other instruments too.' }],
    exampleNote: 'Sightline comes with public-domain example pieces built in. Your markup is the only data stored.',
  },
  'skincare-and-care': {
    sources: [{ h: 'Guidance', items: [{ t: 'NHS (nhs.uk): sunscreen and looking after your teeth', u: 'https://www.nhs.uk', n: 'NHS guidance on sunscreen and dental care; follow the pages themselves.' }, { t: 'Your product\'s own label', n: 'the one to follow for how to use it and how long it lasts after opening (the open-jar symbol).' }] }],
    faq: [{ q: 'Is this skin advice?', a: 'No. It is a diary and a routine list. For a skin problem, ask a pharmacist, GP or dermatologist.' }],
  },
  'sourdough-and-baking-timesheet': {
    keys: ['baking-timesheet-plan-v1', 'sourdough-baking-history-v1'],
    faq: [{ q: 'Where do the recipes come from?', a: 'Each recipe is the average of published formulas from schools and bakeries. Sources a home-baking book supplies are shown for comparison and are never averaged. See the Sources tab.' }, { q: 'What are baker\'s percentages?', a: 'Every ingredient as a percentage of the flour weight, so a recipe scales to any batch size.' }],
  },
  'travel-map': {
    keys: ['pbe-travel-map-v2', 'pbe-travel-map-v1'],
    sources: [{ h: 'Map data', items: [{ t: 'Natural Earth country outlines', u: 'https://www.naturalearthdata.com', n: 'public domain; packaged by world-atlas (ISC licence), kept on this site.' }, { t: 'OpenStreetMap', u: 'https://www.openstreetmap.org/copyright', n: 'road and path data, used under the Open Database Licence (ODbL), credit: OpenStreetMap contributors. Only fetched when you press the button and confirm.' }, { t: 'Overpass API', u: 'https://wiki.openstreetmap.org/wiki/Overpass_API', n: 'the service that returns roads inside a map box. The main server asks for light use.' }, { t: 'OSRM routing (FOSSGIS)', u: 'https://routing.openstreetmap.de', n: 'road routes between steps. I have not been able to test its web addresses from here.' }] },
      { h: 'Other road data', items: [{ t: 'Ordnance Survey OS Open Roads', u: 'https://www.ordnancesurvey.co.uk/products/os-open-roads', n: 'roads only, Great Britain only, a free download you can load as a roads file. Check its current licence wording; I believe it is the Open Government Licence but have not verified that.' }] },
      { h: 'Ideas followed', items: [{ t: 'Polarsteps', n: 'the model for trips, steps and stats.' }, { t: 'God\'s Eye View (bilawalsidhu on GitHub)', u: 'https://github.com/bilawalsidhu/gods-eye-view', n: 'also uses OpenStreetMap roads, OSRM routing and optionally its own Overpass server. I read most but not all of its description.' }] }],
    faq: [{ q: 'Does anything leave my device?', a: 'Only when you press "Fetch roads" or "Draw the route by road" and confirm. The box shows exactly what is sent.' }, { q: 'Why can I not just have every road?', a: 'A free static site holds about 1 GB, and a country\'s roads are bigger than that. So the tool asks for the roads in a small box around your trip, or you load a roads file.' }, { q: 'How good is the road matching?', a: 'It is simple: it snaps points of your route to the nearest road. It can confuse parallel roads and struggles with poor GPS. Treat it as a starting point.' }],
  },
};
