/* Books and Film - a private reading and watching list. Built with the shared tracker.js framework:
   each tab below is described by a small object, and tracker.js draws it. Everything is saved in this
   browser only. Download it as Markdown or CSV from the "My Data" tab. */
PBE.tool({
  id: 'books-and-film',
  title: 'Books and Film',
  /* made-up example list */
  example: ({ daysAgo, rnd, pick }) => ({
    list: [['Book', 'Example Novel One', 'A. Author', 'Finished', 'Owned', 4], ['Book', 'Example Novel Two', 'B. Writer', 'Finished', 'Library', 5], ['Book', 'Example History Book', 'C. Historian', 'In progress', 'Owned', ''], ['Book', 'Example Essays', 'D. Thinker', 'Want to', 'To get', ''], ['Book', 'Example Cookbook', 'E. Chef', 'Finished', 'Owned', 4], ['Book', 'Example Thriller', 'F. Plotter', 'Gave up', 'Borrowed', 2], ['Film', 'Example Film One', 'G. Director', 'Finished', 'Digital or streaming', 4], ['Film', 'Example Film Two', 'H. Auteur', 'Want to', 'To get', ''], ['Film', 'Example Film Three', 'I. Filmmaker', 'Finished', 'Owned', 3], ['Series', 'Example Series', 'J. Showrunner', 'In progress', 'Digital or streaming', ''], ['Documentary', 'Example Documentary', 'K. Maker', 'Finished', 'Digital or streaming', 5], ['Book', 'Example Poems', 'L. Poet', 'Want to', 'To get', ''], ['Book', 'Example Science Book', 'M. Scientist', 'Want to', 'To get', ''], ['Book', 'Example Memoir', 'N. Person', 'Finished', 'Owned', 3], ['Podcast', 'Example Podcast', 'O. Host', 'Want to', 'Digital or streaming', '']].map(([kind, title, creator, status, have, rating], i) => ({ date: daysAgo(150 - i * 9), kind, title, creator, status, have, rating, by: pick(['a friend', 'a podcast', 'a magazine', '']), notes: '' })),
  }),
  /* sliders: how long would the to-do pile take? */
  whatif: ({ h, get }) => {
    const todo = get('list', []).filter((r) => r.status === 'Want to').length || 10, st = { rate: 2 }, out = h('div', {});
    const draw = () => PBE.fill(out, h('p', { class: 'lede' }, 'At ' + st.rate + ' a month, a pile of ' + todo + ' would take about ' + PBE.round(todo / st.rate, 1) + ' months, and you would finish about ' + st.rate * 12 + ' in a year.'), h('p', { class: 'meta' }, 'The pile is the number of entries marked "Want to" (' + todo + ' now; 10 is used if you have none yet).'));
    draw();
    return h('div', {}, h('h3', {}, 'How long would the pile take?'), PBEcharts.slider('Books or films finished a month', 1, 12, 1, st.rate, (v) => { st.rate = v; draw(); }), out);
  },
  tabs: [
    { id: 'list', label: 'My list', type: 'log', addLabel: 'Add a book, film or series',
      intro: 'Add what you want to read or watch, what you are on, and what you have finished. Use "Recommended by" to remember who told you about it. Change an entry by deleting it and adding it again.',
      required: ['title'],
      fields: [
        { key: 'date', label: 'Date added or finished', type: 'date' },
        { key: 'kind', label: 'Kind', type: 'select', options: ['Book', 'Film', 'Series', 'Documentary', 'Article or magazine', 'Audiobook', 'Podcast'], keep: true },
        { key: 'title', label: 'Title' },
        { key: 'creator', label: 'Author or director' },
        { key: 'status', label: 'Status', type: 'select', options: ['Want to', 'In progress', 'Finished', 'Gave up'], keep: true },
        { key: 'have', label: 'Do you have it?', type: 'select', options: ['To get', 'Owned', 'Borrowed', 'Library', 'Digital or streaming'], keep: true },
        { key: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5, step: 1 },
        { key: 'by', label: 'Recommended by' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      filterBy: 'status',
      summary: (rows) => {
        const done = rows.filter((r) => r.status === 'Finished'), rated = rows.filter((r) => r.rating);
        return [['Entries', rows.length], ['Finished', done.length], ['Still to do', rows.filter((r) => r.status === 'Want to').length], ['Owned', rows.filter((r) => r.have === 'Owned').length], ['To get', rows.filter((r) => r.have === 'To get').length], ['Average rating', rated.length ? PBE.round(rated.reduce((s, r) => s + r.rating, 0) / rated.length) + '/5' : '-']];
      },
      charts: [
        { title: 'By kind', kind: 'bar', by: 'kind', unit: 'entries' },
        { title: 'Average rating by kind', kind: 'bar', by: 'kind', avg: 'rating', unit: '/5' },
        { title: 'Owned, to get, borrowed', kind: 'bar', by: 'have', unit: 'entries' },
        { title: 'Who recommends the most', kind: 'bar', by: 'by', unit: 'entries' },
        { title: 'Finished per year', kind: 'bar', by: 'year', byFn: (r) => (r.status === 'Finished' ? String(r.date || '').slice(0, 4) : ''), unit: 'finished' },
      ],
    },
    /* import: bring in a list from a file or pasted text */
    { id: 'import', label: 'Import', type: 'custom', render: ({ h, get, set, today }) => {
      const out = h('div', {}), text = h('textarea', { rows: 8, placeholder: 'Paste a list here: one title per line, or a CSV with a Title column' });
      const by = h('input', { type: 'text', placeholder: 'e.g. a friend, a podcast, a website' });
      const kind = h('select', {}, ['Book', 'Film', 'Series', 'Documentary', 'Article or magazine', 'Audiobook', 'Podcast'].map((k) => h('option', { value: k }, k)));
      const have = h('select', {}, ['To get', 'Owned', 'Borrowed', 'Library', 'Digital or streaming'].map((k) => h('option', { value: k }, k)));
      const status = h('select', {}, ['Want to', 'In progress', 'Finished', 'Gave up'].map((k) => h('option', { value: k }, k)));
      const file = h('input', { type: 'file', accept: '.csv,.txt,.md,.html,.htm,text/*' });
      let parsed = [];
      /** Split one CSV line into cells, understanding "quoted, cells". */
      const csvLine = (l) => { const c = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
      const parse = (raw) => {
        let t = raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/(li|p|div|br|tr|h\d)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ');   // if a web page was pasted, keep just its text
        const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean), rows = [];
        const head = lines[0] ? csvLine(lines[0]).map((x) => x.toLowerCase().trim()) : [], ti = head.findIndex((x) => /^(title|name|book|film)/.test(x));
        if (ti >= 0 && head.length > 1) {                                  // a CSV with headers (for example a Goodreads export)
          const col = (re) => head.findIndex((x) => re.test(x)), ai = col(/author|director|creator/), ri = col(/my rating|^rating/), si = col(/shelf|status/), di = col(/date read|date finished|date/);
          lines.slice(1).forEach((l) => { const c = csvLine(l), title = (c[ti] || '').trim(); if (!title) return; const shelf = String(c[si] || '').toLowerCase(), rating = Number(c[ri]) || 0;
            rows.push({ title, creator: ai >= 0 ? (c[ai] || '').trim() : '', rating: rating >= 1 && rating <= 5 ? rating : '', status: /read$|finished|done/.test(shelf) && !/to-?read/.test(shelf) ? 'Finished' : /current|progress/.test(shelf) ? 'In progress' : '', date: /^\d{4}[-/]\d{2}[-/]\d{2}/.test(c[di] || '') ? c[di].replace(/\//g, '-').slice(0, 10) : '' }); });
        } else lines.forEach((l) => {                                      // a plain list, one item per line
          l = l.replace(/^[\s>*•\-–—\d.)\]]+\s*/, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^["“]|["”]$/g, '').trim(); if (l.length < 2 || l.length > 160) return;
          const m = l.split(/\s+by\s+|\s+[-–—]\s+|\t/i); rows.push({ title: m[0].trim(), creator: (m[1] || '').trim(), rating: '', status: '', date: '' }); });
        return rows;
      };
      const draw = () => {
        const have0 = get('list', []).map((r) => String(r.title).toLowerCase());
        const fresh = parsed.filter((p) => !have0.includes(p.title.toLowerCase()));
        PBE.fill(out, parsed.length ? h('div', {}, h('p', { class: 'lede' }, parsed.length + ' found, ' + fresh.length + ' new (the rest are already on your list).'),
          h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Title', 'Author or director'].map((x) => h('th', {}, x)))), h('tbody', {}, fresh.slice(0, 25).map((p) => h('tr', {}, h('td', {}, p.title), h('td', {}, p.creator)))))), fresh.length > 25 ? h('p', { class: 'meta' }, '...and ' + (fresh.length - 25) + ' more.') : null,
          h('p', {}, h('button', { type: 'button', onclick: () => { const list = get('list', []); fresh.forEach((p) => list.push({ date: p.date || today(), kind: kind.value, title: p.title, creator: p.creator, status: p.status || status.value, have: have.value, rating: p.rating, by: by.value.trim(), notes: '' })); set('list', list); parsed = []; text.value = ''; PBE.fill(out, h('p', { class: 'lede' }, fresh.length + ' added to My list.')); } }, 'Add ' + fresh.length + ' to My list'))) : h('p', { class: 'meta' }, 'Nothing read yet.'));
      };
      file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { text.value = String(r.result).slice(0, 500000); parsed = parse(text.value); draw(); }; r.readAsText(f); });
      return h('div', {}, h('p', { class: 'meta' }, 'Bring in a list of recommendations. Choose a file (a text or Markdown list, a CSV such as a Goodreads export with Title and Author columns, or a saved web page), or paste the text. This tool never contacts other websites: to import from a page, open it, select the list, copy it and paste it here (a browser does not let one site read another site\'s page, and nothing leaves your device).'),
        h('div', { class: 'form' }, h('label', { class: 'fld' }, 'File', file), h('label', { class: 'fld' }, 'Recommended by', by), h('label', { class: 'fld' }, 'Kind', kind), h('label', { class: 'fld' }, 'Do you have them?', have), h('label', { class: 'fld' }, 'Status', status)),
        h('p', {}, text), h('p', {}, h('button', { type: 'button', onclick: () => { parsed = parse(text.value); draw(); } }, 'Read the list')), out);
    } },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Longer thoughts, quotes you want to keep (short ones, with the source), reading lists. Written in plain text or Markdown.' },
  ],
});
