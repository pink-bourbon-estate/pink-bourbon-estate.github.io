/* Books and Film - a private reading and watching list. Built with the shared tracker.js framework:
   each tab below is described by a small object, and tracker.js draws it. Everything is saved in this
   browser only. Download it as Markdown or CSV from the "Your data" tab. */
PBE.tool({
  id: 'books-and-film',
  title: 'Books and Film',
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
        { key: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5, step: 1 },
        { key: 'by', label: 'Recommended by' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      filterBy: 'status',
      summary: (rows) => {
        const done = rows.filter((r) => r.status === 'Finished'), rated = rows.filter((r) => r.rating);
        return [['Entries', rows.length], ['Finished', done.length], ['Still to do', rows.filter((r) => r.status === 'Want to').length], ['Average rating', rated.length ? PBE.round(rated.reduce((s, r) => s + r.rating, 0) / rated.length) + '/5' : '-']];
      },
      charts: [
        { title: 'By kind', kind: 'bar', by: 'kind', unit: 'entries' },
        { title: 'Average rating by kind', kind: 'bar', by: 'kind', avg: 'rating', unit: '/5' },
        { title: 'Who recommends the most', kind: 'bar', by: 'by', unit: 'entries' },
        { title: 'Finished per year', kind: 'bar', by: 'year', byFn: (r) => (r.status === 'Finished' ? String(r.date || '').slice(0, 4) : ''), unit: 'finished' },
      ],
    },
    { id: 'notes', label: 'Notes', type: 'notes', intro: 'Longer thoughts, quotes you want to keep (short ones, with the source), reading lists. Written in plain text or Markdown.' },
  ],
});
