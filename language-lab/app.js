/* Language Lab (a demo of the idea): paste any text in a language and see its word list, word counts, sentence lengths,
   common phrases and common word beginnings and endings. Words you mark as known are remembered in this browser.
   It uses the browser's built-in text splitter (Intl.Segmenter), which understands word and sentence breaks in
   Japanese, Arabic, Greek and the others, so nothing is downloaded and nothing is sent anywhere.

   What this demo does NOT do yet: word types (noun, verb...) need a tagger for each language, and the daily collection of
   new words from good sources is only planned (see "The plan" below). */
(() => {
  const $ = (id) => document.getElementById(id), KEY = 'pbe-language-lab-v1';
  const LANGS = { ja: 'Japanese', sk: 'Slovak', cs: 'Czech', it: 'Italian', es: 'Spanish', fr: 'French', el: 'Greek', ar: 'Arabic', nb: 'Norwegian' };
  /* Short sample texts written for this demo (a cafe and a park). A native speaker should check them. */
  const SAMPLES = {
    ja: '私は毎朝コーヒーを飲みます。このカフェは駅の近くにあります。窓の外には小さな公園が見えます。週末には友達と一緒に散歩をします。',
    sk: 'Každé ráno pijem kávu. Táto kaviareň je blízko stanice. Za oknom vidím malý park. Cez víkend chodím na prechádzku s priateľmi.',
    cs: 'Každé ráno piji kávu. Tato kavárna je blízko nádraží. Za oknem vidím malý park. O víkendu chodím na procházku s přáteli.',
    it: 'Ogni mattina bevo un caffè. Questo bar è vicino alla stazione. Dalla finestra vedo un piccolo parco. Nel fine settimana faccio una passeggiata con gli amici.',
    es: 'Todas las mañanas bebo un café. Esta cafetería está cerca de la estación. Por la ventana veo un parque pequeño. El fin de semana paseo con mis amigos.',
    fr: 'Chaque matin, je bois un café. Ce café est près de la gare. Par la fenêtre, je vois un petit parc. Le week-end, je me promène avec mes amis.',
    el: 'Κάθε πρωί πίνω καφέ. Αυτό το καφέ είναι κοντά στο σταθμό. Από το παράθυρο βλέπω ένα μικρό πάρκο. Το Σαββατοκύριακο κάνω βόλτα με τους φίλους μου.',
    ar: 'أشرب القهوة كل صباح. هذا المقهى قريب من المحطة. أرى حديقة صغيرة من النافذة. في عطلة نهاية الأسبوع أتمشى مع أصدقائي.',
    nb: 'Hver morgen drikker jeg kaffe. Denne kafeen ligger nær stasjonen. Fra vinduet ser jeg en liten park. I helgen går jeg tur med vennene mine.',
  };
  let known = {}; try { known = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { known = {}; }
  const saveKnown = () => { try { localStorage.setItem(KEY, JSON.stringify(known)); } catch (e) { /* storage blocked */ } };
  const el = (t, a, ...k) => { const e = document.createElement(t); Object.keys(a || {}).forEach((x) => e.setAttribute(x, a[x])); k.flat().forEach((c) => e.append(c && c.nodeType ? c : document.createTextNode(String(c)))); return e; };

  /** Split text into words and sentences with the browser's own segmenter for the chosen language. */
  function split(text, lang) {
    const w = [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)].filter((s) => s.isWordLike).map((s) => s.segment.toLowerCase());
    const s = [...new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(text)].map((x) => x.segment.trim()).filter(Boolean);
    return { words: w, sentences: s };
  }
  const count = (arr) => { const m = new Map(); arr.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const table = (head, rows) => el('div', { class: 'tablewrap' }, el('table', {}, el('thead', {}, el('tr', {}, head.map((x) => el('th', {}, x)))), el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c)))))));

  function analyse() {
    const lang = $('lang').value, text = $('text').value, out = $('out'); out.replaceChildren();
    if (!text.trim()) { out.append(el('p', { class: 'meta' }, 'Paste some text, or press "Load a sample".')); return; }
    const { words, sentences } = split(text, lang), freq = count(words), uniq = freq.length, kn = known[lang] || {};
    const avgS = words.length / Math.max(1, sentences.length), avgW = words.reduce((s, x) => s + [...x].length, 0) / Math.max(1, words.length), fresh = freq.filter(([w]) => !kn[w]);
    const stat = el('div', { class: 'statrow' }); [['Words', words.length], ['Different words', uniq], ['Sentences', sentences.length], ['Words per sentence', avgS.toFixed(1)], ['Letters per word', avgW.toFixed(1)], ['New to me', fresh.length]].forEach(([k, v]) => stat.append(el('div', { class: 'stat' }, el('div', { class: 'big' }, v), el('div', {}, k))));
    out.append(stat);
    out.append(el('h3', {}, 'Word list (most common first)'), el('p', { class: 'meta' }, 'Tick the words you already know. They are saved in this browser, and the "new to me" count updates.'));
    const rows = freq.slice(0, 40).map(([w, n]) => { const c = el('input', { type: 'checkbox', 'aria-label': 'I know ' + w }); c.checked = !!kn[w]; c.addEventListener('change', () => { known[lang] = known[lang] || {}; if (c.checked) known[lang][w] = 1; else delete known[lang][w]; saveKnown(); }); return [el('span', { lang }, w), n, c]; });
    out.append(table(['Word', 'Times', 'Known'], rows));
    out.append(el('p', {}, el('button', { type: 'button', onclick: () => { known[lang] = known[lang] || {}; freq.forEach(([w]) => { known[lang][w] = 1; }); saveKnown(); analyse(); } }, 'Mark all of these as known'), ' ', el('button', { type: 'button', onclick: () => { const csv = 'word,count,known\n' + freq.map(([w, n]) => '"' + w.replace(/"/g, '""') + '",' + n + ',' + (kn[w] ? 'yes' : 'no')).join('\n'); const a = el('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'words-' + lang + '.csv' }); document.body.append(a); a.click(); a.remove(); } }, 'Download the word list (CSV)')));
    // sentences grouped by length
    const groups = { 'Short (up to 6 words)': [], 'Medium (7 to 14 words)': [], 'Long (15 or more)': [] };
    sentences.forEach((s) => { const n = split(s, lang).words.length; (n <= 6 ? groups['Short (up to 6 words)'] : n <= 14 ? groups['Medium (7 to 14 words)'] : groups['Long (15 or more)']).push(s); });
    out.append(el('h3', {}, 'Sentences by length'), table(['Group', 'How many', 'Example'], Object.entries(groups).map(([g, v]) => [g, v.length, el('span', { lang }, v[0] || '')])));
    // common beginnings and endings (only meaningful for languages that write with spaces and inflect by affixes)
    const aff = (len, end) => { const m = new Map(); freq.forEach(([w]) => { const ch = [...w]; if (ch.length > len + 1) { const a = end ? ch.slice(-len).join('') : ch.slice(0, len).join(''); m.set(a, (m.get(a) || 0) + 1); } }); return [...m.entries()].filter((x) => x[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 8); };
    const pre = aff(2, false), suf = aff(2, true);
    out.append(el('h3', {}, 'Common beginnings and endings'), pre.length || suf.length ? table(['Beginning', 'In how many words', 'Ending', 'In how many words'], Array.from({ length: Math.max(pre.length, suf.length) }, (_, i) => [pre[i] ? el('span', { lang }, pre[i][0] + '-') : '', pre[i] ? pre[i][1] : '', suf[i] ? el('span', { lang }, '-' + suf[i][0]) : '', suf[i] ? suf[i][1] : ''])) : el('p', { class: 'meta' }, 'Not enough different words yet: paste more text.'));
    // repeated phrases (two and three words in a row)
    const grams = (n) => { const g = []; for (let i = 0; i + n <= words.length; i++) g.push(words.slice(i, i + n).join(' ')); return count(g).filter((x) => x[1] > 1).slice(0, 8); };
    const ph = [...grams(3), ...grams(2)];
    out.append(el('h3', {}, 'Phrases that repeat'), ph.length ? table(['Phrase', 'Times'], ph.map(([p, n]) => [el('span', { lang }, p), n])) : el('p', { class: 'meta' }, 'No phrase repeats in this much text: try a longer passage.'));
    out.append(el('h3', {}, 'Word types'), el('p', { class: 'meta' }, 'Planned: nouns, verbs and so on need a tagger for each language (for example the open Universal Dependencies models). Not in this demo.'));
  }
  document.addEventListener('DOMContentLoaded', () => {
    Object.keys(LANGS).forEach((k) => $('lang').append(el('option', { value: k }, LANGS[k])));
    $('lang').addEventListener('change', () => { $('text').setAttribute('lang', $('lang').value); $('text').setAttribute('dir', $('lang').value === 'ar' ? 'rtl' : 'ltr'); analyse(); });
    $('text').addEventListener('input', analyse); $('sample').addEventListener('click', () => { $('text').value = SAMPLES[$('lang').value]; analyse(); });
    $('clearknown').addEventListener('click', () => { if (confirm('Forget all the words you marked as known?')) { known = {}; saveKnown(); analyse(); } });
    $('lang').value = 'it'; $('text').value = SAMPLES.it; analyse();
  });
  /* tell the shared tabs (shell.js) where this tool keeps its data, and what example data looks like: a few words marked as known (made up, for the sample texts) */
  PBEshell.data({ id: 'language-lab', title: 'Language Lab', keys: [KEY], sample: () => ({ [KEY]: { es: { 'café': 1, 'estación': 1, 'ventana': 1 }, it: { 'caffè': 1, 'stazione': 1 } } }) });
})();
