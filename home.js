/* Home page: "Listening to" and "Now reading".
   Both are plain and local to this site:
   - Listening to picks a random track from the most played on BBC Radio 6 Music in the last week,
     read from the Radio 6 Collection's own data file (same website, nothing from anywhere else).
   - Now reading shows the latest Standart magazine article. It is looked up when the site is
     built each day (see .github/workflows/pages.yml) and saved to now-reading.json, so your browser
     never contacts Standart. It only links to the article.
   If either can't load, the plain link already on the page stays. */
(() => {
  const el = (tag, attrs, text) => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.textContent = text; return e; };

  fetch('BBC-Radio-6-Music-Collection/data/windows.json').then((r) => r.json()).then((w) => {
    const rows = (w.week && w.week.tracks || []).slice(0, 100);   // [artist, title, plays, artist id, letter]
    if (!rows.length) return;
    const [artist, title, , id, letter] = rows[Math.floor(Math.random() * rows.length)];
    const p = document.getElementById('listening');
    const link = el('a', { href: 'BBC-Radio-6-Music-Collection/artist/' + letter + '/' + id + '/' }, artist);
    p.replaceChildren(link, document.createTextNode(' - ' + title));
    p.append(el('span', { class: 'meta block' }, 'Picked at random from this week’s most played on BBC Radio 6 Music'));
  }).catch(() => {});

  fetch('now-reading.json').then((r) => r.json()).then((a) => {
    if (!a || !a.title || !/^https:\/\/standartmag\.com\//.test(a.url)) return;
    const p = document.getElementById('reading');
    p.replaceChildren(el('a', { href: a.url, rel: 'noopener' }, a.title));
    p.append(el('span', { class: 'meta block' }, 'Latest from Standart magazine'));
  }).catch(() => {});
})();
