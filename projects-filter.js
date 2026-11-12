/* Projects page: filter by status and by category ("tape"), and choose how the list is grouped.
   The filters work together and each one stays on when you change another.
   Without this script the whole list is simply shown. Nothing is stored or sent. */
(() => {
  const list = document.getElementById('list');
  const bars = { status: document.getElementById('filter'), cat: document.getElementById('catfilter'), view: document.getElementById('viewopts') };
  if (!list || !bars.status) return;
  const items = [...list.querySelectorAll('.item')];             // the original order, kept so we can rebuild
  const cats = [...new Set(items.map((i) => i.dataset.cat))].sort((a, b) => a.localeCompare(b));
  const state = { status: 'all', cat: 'all', byTape: true, az: true };

  /** Make a button inside a bar; `pressed` says whether it looks selected. */
  const button = (bar, label, onClick, pressed, tape) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', 'false');
    if (tape) b.style.setProperty('--tape', tape);
    b.addEventListener('click', () => { onClick(); draw(); });
    bar.append(b); b.pressedFn = pressed; return b;
  };
  const all = [];
  const chips = [];   // category buttons, so their counts can be refreshed
  [['all', 'All'], ['live', 'Live'], ['dev', 'In development'], ['planned', 'Planned']].forEach(([k, l]) => all.push(button(bars.status, l, () => { state.status = k; }, () => state.status === k)));
  all.push(button(bars.cat, 'All tapes', () => { state.cat = 'all'; }, () => state.cat === 'all'));
  cats.forEach((c) => { const b = button(bars.cat, c, () => { state.cat = c; }, () => state.cat === c, items.find((i) => i.dataset.cat === c).style.getPropertyValue('--tape')); b.dataset.label = c; chips.push(b); all.push(b); });
  all.push(button(bars.view, 'Group by tape', () => { state.byTape = !state.byTape; }, () => state.byTape));
  all.push(button(bars.view, 'A to Z', () => { state.az = !state.az; }, () => state.az));

  function draw() {
    all.forEach((b) => b.setAttribute('aria-pressed', String(b.pressedFn())));
    // each category chip shows how many items it has under the chosen status; empty ones are dimmed
    chips.forEach((b) => {
      const n = items.filter((i) => i.dataset.cat === b.dataset.label && (state.status === 'all' || i.dataset.status === state.status)).length;
      b.textContent = b.dataset.label + ' (' + n + ')'; b.style.opacity = n ? '1' : '0.45';
    });
    let shown = items.filter((i) => (state.status === 'all' || i.dataset.status === state.status) && (state.cat === 'all' || i.dataset.cat === state.cat));
    const order = { live: 0, dev: 1, planned: 2 };
    // A to Z sorts by name; otherwise live comes first, then in development, then planned.
    shown = shown.slice().sort((a, b) => state.az ? a.dataset.name.localeCompare(b.dataset.name) : order[a.dataset.status] - order[b.dataset.status]);
    list.replaceChildren();
    if (state.byTape) {
      cats.forEach((c) => {
        const group = shown.filter((i) => i.dataset.cat === c);
        if (!group.length) return;
        const h = document.createElement('h2'); h.className = 'grp'; h.textContent = c;
        h.style.setProperty('--tape', group[0].style.getPropertyValue('--tape'));
        list.append(h, ...group);
      });
    } else list.append(...shown);
    document.getElementById('empty').hidden = shown.length > 0;
    document.getElementById('empty').textContent = 'Nothing in that category for this status. Try "All" above, or another tape.';
  }
  draw();
})();
