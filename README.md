# Pink Bourbon Estate

**Website: https://pink-bourbon-estate.github.io/**

Tools, ideas and the code behind them: free, open, readable, with no paywall and no tracking.
This repository is the home page, the articles, the about page and the privacy and licence page.

- Plain hand-written HTML and one CSS file. No framework and no build step (one tiny script switches light and dark mode), nothing loaded from other sites.
- Every push to `main` publishes the files as they are (see `.github/workflows/pages.yml`).
- Code is MIT licensed; the writing is CC BY-NC-SA 4.0. Credit is appreciated, please do not resell.

## What is here

- Home, projects, articles, about, privacy and licence: hand-written HTML (written with a small helper script).
- `sourdough-and-baking-timesheet/`: the bake planner, plain JavaScript with comments.
- `brewing-and-fermentation-timesheet/`: the brewing and fermented-food planner, plain JavaScript with comments, with its recipe data in `build_data.py`.
- `coffee-notebook/`: the coffee tool (dial-in, recipes, flavour wheel, grind log, bags, stats, problems, beans), plain JavaScript with comments.
- `charts.js`: small shared chart and history code used by the tools, no outside libraries.
- `sewing-and-knitting-pattern-maker/`: the sewing and knitting pattern tool. Its engine is built from the Toolkits repository on every deploy.

All tools are works in progress: expect bugs, and not every one is actively maintained.
- `tracker.js`: the shared framework behind the newer tools (logs, routines, dates, tick lists, notes, and Markdown/CSV/backup export).
- `bullet-journal/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `meditation/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `health-metrics/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `medicine-and-appointments/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `home-routines/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `car-and-travel/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `gym-and-strength/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
- `sightline/`: three small piano pages (PDF-to-MIDI demo, player, score lab) with a shared engine in `pc.js`; public-domain MIDI in `scores/`, Salamander Grand Piano recordings (CC BY 3.0, Alexander Holm) in `samples/`.
- `mobility-and-physio/`, `skincare-and-care/`, `nutrition-and-macros/`: more small tools built on `tracker.js`.
- `language-lab/`, `chess-lab/`: demos of bigger ideas (see the plan on each page).
- `travel-map/`: trips and steps, countries visited, and a roads-travelled layer. `roads.js` holds the road maths (readable, no drawing), `app.js` the page. Road data is not in the repo: it comes from a file you load or, after a confirm box, from OpenStreetMap (ODbL, credit required). The country outline is Natural Earth (public domain).
- `sounds.js` and `databar.js`: shared sounds (bells, bowls, timers) and the sample/download data bar.
- `.github/scripts/reading.py`: builds the home page's "Now reading" list from independent magazines' public feeds once a day.
- `endurance-training/`: running, cycling and swimming plans and calculators, built on `tracker.js`.
- `books-and-film/`: a small tool built on `tracker.js`; the logic is in its `app.js`.
