/* Projects page filter: All / Live / In development / Planned.
   Without this script every section is simply shown. Nothing is stored or sent. */
(() => {
  const bar = document.getElementById('filter');
  if (!bar) return;
  const sections = [...document.querySelectorAll('section[data-status]')];
  const options = [['all', 'All'], ['live', 'Live'], ['dev', 'In development'], ['planned', 'Planned']];
  const show = (which) => {
    sections.forEach((s) => { s.hidden = which !== 'all' && s.dataset.status !== which; });
    bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === which)));
  };
  options.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.f = key; b.textContent = label;
    b.addEventListener('click', () => show(key));
    bar.append(b);
  });
  show('all');
})();
