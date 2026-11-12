/* Projects page filters: a status filter (All / Live / In development / Planned) and a category filter.
   The two work together, and the category you pick stays selected while you switch between statuses.
   Without this script every section is simply shown. Nothing is stored or sent. */
(() => {
  const statusBar = document.getElementById('filter');
  const catBar = document.getElementById('catfilter');
  if (!statusBar || !catBar) return;
  const sections = [...document.querySelectorAll('section[data-status]')];
  const cats = [...new Set([...document.querySelectorAll('.cat')].map((c) => c.dataset.cat))];
  let status = 'all';   // the status chosen
  let cat = 'all';      // the category chosen: it is kept when the status changes

  const apply = () => {
    sections.forEach((s) => { s.hidden = status !== 'all' && s.dataset.status !== status; });
    document.querySelectorAll('.cat').forEach((c) => { c.hidden = cat !== 'all' && c.dataset.cat !== cat; });
    statusBar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === status)));
    catBar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === cat)));
  };
  const button = (bar, key, label, onPick) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.f = key; b.textContent = label;
    b.addEventListener('click', () => { onPick(key); apply(); });
    bar.append(b);
  };
  [['all', 'All'], ['live', 'Live'], ['dev', 'In development'], ['planned', 'Planned']].forEach(([k, l]) => button(statusBar, k, l, (v) => { status = v; }));
  [['all', 'All categories'], ...cats.map((c) => [c, c])].forEach(([k, l]) => button(catBar, k, l, (v) => { cat = v; }));
  apply();
})();
