/* Study notes (study.js). Plain JavaScript, written to be read.
   The state is: sources (text plus details for a bibliography), highlights (where in a source's text, and your comment) and a summary.
   Highlights are stored as character positions in the source text, so the text itself is never changed.
   Everything is kept in this browser (localStorage) until you download it. Nothing is sent anywhere. */
(() => {
  const $ = (id) => document.getElementById(id), KEY = 'pbe-study';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 8);
  let S = { title: 'My study notes', sources: [], marks: [], summary: '', style: 'APA 7' };
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Array.isArray(v.sources)) S = Object.assign(S, v); } catch (e) { /* start fresh */ }

  let t; const save = () => { clearTimeout(t); t = setTimeout(() => { let ok = true; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { ok = false; } $('saved').textContent = ok ? 'Saved in this browser' : 'Not saved (storage blocked or full): download your project to keep it'; }, 300); };
  const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' })); a.download = name; document.body.append(a); a.click(); a.remove(); };

  /* ---------------------------------------------------------------- bibliography */
  const people = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [sur, ...g] = x.split(','); return { sur: sur.trim(), given: g.join(',').trim() }; });
  const initials = (g, dots) => g.split(/[\s-]+/).filter(Boolean).map((n) => n[0].toUpperCase() + (dots ? '.' : '')).join(dots ? ' ' : '');
  const join = (a, last) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (last || ' and ') + a[a.length - 1]);
  const longDate = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  function cite(st, s) {
    const a = people(s.author), y = s.year || 'n.d.', T = esc(s.title), P = esc(s.pub), U = s.url ? esc(s.url) : '', vid = s.type === 'video', book = s.type === 'book';
    const name = (p, f) => (p.given ? f(p) : p.sur);
    if (st === 'Harvard') { const au = join(a.map((p) => name(p, (q) => q.sur + ', ' + initials(q.given, false))), ' and '); return (au ? esc(au) + ' ' : '') + '(' + y + ') ' + (book ? '<i>' + T + '</i>' : T + (P ? '. <i>' + P + '</i>' : '')) + (book && P ? '. ' + P : '') + '.' + (U ? ' Available at: ' + U + (s.acc ? ' (Accessed: ' + longDate(s.acc) + ')' : '') + '.' : ''); }
    if (st === 'MLA 9') { const au = a.length > 2 ? esc(a[0].sur + ', ' + a[0].given) + ', et al' : join(a.map((p, i) => esc(i ? (p.given + ' ' + p.sur).trim() : (p.sur + (p.given ? ', ' + p.given : '')))), ', and '); return (au ? au + '. ' : '') + (book ? '<i>' + T + '</i>' : '"' + T + '."') + (P ? ' ' + (book ? '' : '<i>') + P + (book ? '' : '</i>') + ',' : '') + ' ' + esc(y) + (U ? ', ' + U : '') + '.'; }
    if (st.startsWith('Chicago')) { const au = join(a.map((p, i) => esc(i ? (p.given + ' ' + p.sur).trim() : (p.sur + (p.given ? ', ' + p.given : '')))), ', and '); return (au ? au + '. ' : '') + esc(y) + '. ' + (book ? '<i>' + T + '</i>' : '"' + T + '."') + (P ? ' ' + (book ? '' : '<i>') + P + (book ? '' : '</i>') + '.' : '') + (U ? ' ' + U + '.' : ''); }
    const au = join(a.map((p) => name(p, (q) => q.sur + ', ' + initials(q.given, true))), ', & ');   // APA 7
    return (au ? esc(au) + ' ' : '') + '(' + esc(y) + '). ' + (book ? '<i>' + T + '</i>' : '<i>' + T + '</i>' + (vid ? ' [Video]' : '')) + '.' + (P ? ' ' + P + '.' : '') + (U ? ' ' + U : '');
  }
  const sortKey = (s) => (people(s.author)[0] || { sur: s.title }).sur.toLowerCase();

  /* ---------------------------------------------------------------- drawing */
  const sorted = () => S.marks.slice().sort((x, y) => S.sources.findIndex((q) => q.id === x.src) - S.sources.findIndex((q) => q.id === y.src) || x.s - y.s);
  function drawRaw() {
    const box = $('rawbox'); box.replaceChildren();
    if (!S.sources.length) { box.innerHTML = '<p class="meta">Add a source above and its text appears here.</p>'; return; }
    S.sources.forEach((src, n) => {
      const h = document.createElement('p'); h.className = 'rawh'; h.textContent = 'Source ' + (n + 1) + ': ' + src.title; box.append(h);
      const d = document.createElement('div'); d.className = 'rawsrc'; d.dataset.src = src.id;
      let pos = 0; S.marks.filter((m) => m.src === src.id).sort((a, b) => a.s - b.s).forEach((m) => {
        if (m.s > pos) d.append(document.createTextNode(src.text.slice(pos, m.s)));
        const k = document.createElement('mark'); k.dataset.m = m.id; k.textContent = src.text.slice(m.s, m.e); d.append(k); pos = m.e;
      });
      d.append(document.createTextNode(src.text.slice(pos))); box.append(d);
    });
  }
  function drawIdeas() {
    const w = $('ideas'); w.replaceChildren();
    if (!S.marks.length) { w.innerHTML = '<p class="meta">No highlights yet.</p>'; return; }
    sorted().forEach((m) => {
      const src = S.sources.find((x) => x.id === m.src), n = S.sources.indexOf(src) + 1; if (!src) return;
      const d = document.createElement('div'); d.className = 'idea'; d.dataset.m = m.id;
      const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '✕'; x.setAttribute('aria-label', 'Remove highlight');
      x.addEventListener('click', () => { S.marks = S.marks.filter((q) => q.id !== m.id); save(); drawRaw(); drawIdeas(); });
      const q = document.createElement('q'); const text = src.text.slice(m.s, m.e); q.textContent = (text.length > 160 ? text.slice(0, 157) + '...' : text) + ' (source ' + n + ')';
      q.addEventListener('click', () => { const k = document.querySelector('mark[data-m="' + m.id + '"]'); if (k) { k.scrollIntoView({ block: 'center' }); k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 1200); } });
      const c = document.createElement('textarea'); c.value = m.c || ''; c.placeholder = 'Your comment, in your own words'; c.setAttribute('aria-label', 'Comment'); c.addEventListener('input', () => { m.c = c.value; save(); });
      d.append(x, q, c); w.append(d);
    });
  }
  function drawSources() {
    const ol = $('srclist'); ol.replaceChildren();
    S.sources.forEach((s) => { const li = document.createElement('li'); li.textContent = s.title + ' (' + s.text.split(/\s+/).filter(Boolean).length.toLocaleString() + ' words)'; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Remove'; b.addEventListener('click', () => { if (confirm('Remove this source and its highlights?')) { S.sources = S.sources.filter((x) => x.id !== s.id); S.marks = S.marks.filter((m) => m.src !== s.id); save(); draw(); } }); li.append(b); ol.append(li); });
    $('bib').innerHTML = S.sources.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b))).map((s) => '<li>' + cite(S.style, s) + '</li>').join('') || '<li class="meta">Sources you add appear here.</li>';
  }
  function draw() { $('title').value = S.title; $('ctitle').textContent = S.title; $('summary').value = S.summary; $('style').value = S.style; drawSources(); drawRaw(); drawIdeas(); }

  /* ---------------------------------------------------------------- adding text and highlighting */
  const tidy = (x) => String(x).replace(/\r/g, '').replace(/[​-‏⁠﻿]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  function addSource(o) { if (!o.text || !tidy(o.text)) return false; S.sources.push({ id: uid(), title: o.title || 'Untitled source', author: o.author || '', year: o.year || '', pub: o.pub || '', url: o.url || '', type: o.type || 'web', acc: o.acc || '', text: tidy(o.text) }); save(); draw(); return true; }
  $('addsrc').addEventListener('click', () => {
    const ok = addSource({ title: $('s-title').value.trim(), author: $('s-author').value.trim(), year: $('s-year').value.trim(), pub: $('s-pub').value.trim(), url: $('s-url').value.trim(), type: $('s-type').value, acc: $('s-acc').value, text: $('s-text').value });
    if (ok) ['s-title', 's-author', 's-year', 's-pub', 's-url', 's-text'].forEach((i) => { $(i).value = ''; }); else alert('Paste some text first.');
  });
  $('s-file').addEventListener('change', async (e) => { for (const f of e.target.files) { if (f.size > 3e6) { alert(f.name + ' is over 3 MB.'); continue; } const text = await f.text(); const h = text.match(/^#\s+(.+)$/m); addSource({ title: (h ? h[1] : f.name.replace(/\.[^.]+$/, '')), text }); } e.target.value = ''; });
  $('rawbox').addEventListener('mouseup', () => {
    const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const r = sel.getRangeAt(0), d = (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode).closest('.rawsrc'), d2 = (r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentNode).closest('.rawsrc');
    if (!d || d !== d2) return;
    const pre = document.createRange(); pre.selectNodeContents(d); pre.setEnd(r.startContainer, r.startOffset);
    let s = pre.toString().length, e = s + r.toString().length; const src = S.sources.find((x) => x.id === d.dataset.src);
    while (s < e && /\s/.test(src.text[s])) s++; while (e > s && /\s/.test(src.text[e - 1])) e--;
    if (e - s < 3) return;
    if (S.marks.some((m) => m.src === src.id && s < m.e && e > m.s)) { alert('That overlaps an existing highlight. Remove it first, or choose other text.'); sel.removeAllRanges(); return; }
    S.marks.push({ id: uid(), src: src.id, s, e, c: '' }); sel.removeAllRanges(); save(); drawRaw(); drawIdeas();
  });
  $('rawbox').addEventListener('click', (e) => { const k = e.target.closest('mark'); if (k && getSelection().isCollapsed) { const el = document.querySelector('.idea[data-m="' + k.dataset.m + '"] textarea'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } } });
  $('title').addEventListener('input', () => { S.title = $('title').value; $('ctitle').textContent = S.title; save(); });
  $('summary').addEventListener('input', () => { S.summary = $('summary').value; save(); });
  $('style').addEventListener('change', () => { S.style = $('style').value; save(); drawSources(); });

  /* ---------------------------------------------------------------- download, open, new */
  const plain = (h) => h.replace(/<i>(.*?)<\/i>/g, '*$1*').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  $('dlmd').addEventListener('click', () => {
    const lines = ['# ' + S.title, '', '## Main ideas', ''];
    sorted().forEach((m) => { const src = S.sources.find((x) => x.id === m.src); if (src) lines.push('- "' + src.text.slice(m.s, m.e).replace(/\s+/g, ' ') + '" (source ' + (S.sources.indexOf(src) + 1) + ')' + (m.c ? '\n  - ' + m.c.replace(/\n/g, ' ') : '')); });
    lines.push('', '## Summary', '', S.summary, '', '## Sources (' + S.style + ')', '');
    S.sources.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b))).forEach((s) => lines.push('- ' + plain(cite(S.style, s))));
    download((S.title || 'notes').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md', lines.join('\n') + '\n', 'text/markdown');
  });
  $('dljson').addEventListener('click', () => download('study-project.json', JSON.stringify(S, null, 2), 'application/json'));
  $('openjson').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const v = JSON.parse(await f.text()); if (!Array.isArray(v.sources) || !Array.isArray(v.marks)) throw new Error('x'); S = Object.assign({ title: 'Notes', summary: '', style: 'APA 7' }, v); save(); draw(); } catch (err) { alert('That file is not a Study project.'); } });
  $('newnote').addEventListener('click', () => { if (confirm('Start a new, empty note? Download this one first if you want to keep it.')) { S = { title: 'My study notes', sources: [], marks: [], summary: '', style: 'APA 7' }; save(); draw(); } });
  $('print').addEventListener('click', () => print());

  /* ---------------------------------------------------------------- the AI first pass */
  const PROMPT = 'You are helping me study. Read the SOURCE TEXT below. Reply with ONLY a JSON object, no other words, in exactly this shape:\n{"ideas":[{"quote":"...","comment":"..."}],"summary":"..."}\nRules:\n- "quote" must be copied EXACTLY from the source text (one to three sentences). Give 5 to 15 of the most important ideas, in the order they appear.\n- "comment" is a short question or prompt (under 25 words) that helps me think about the idea. Do not answer it for me.\n- "summary" is under 120 words, plain text.\n- Plain text only: no markdown, no links, no tracking marks, no extra keys.\n';
  const allText = () => S.sources.map((s, i) => '--- SOURCE ' + (i + 1) + ': ' + s.title + ' ---\n' + s.text).join('\n\n');
  const copy = async (text, btn) => { try { await navigator.clipboard.writeText(text); const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = o; }, 1500); } catch (e) { prompt('Copy this:', text); } };
  $('cp1').addEventListener('click', (e) => copy(PROMPT + '\nSOURCE TEXT:\n' + allText(), e.target));
  $('cp2').addEventListener('click', (e) => copy(PROMPT, e.target));
  /** Keep plain words only: tags, links, tracking marks, odd invisible characters and citation markers are removed. */
  const scrub = (x, max) => String(x == null ? '' : x).replace(/<[^>]*>/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/【[^】]*】|\[\d+\]|\[cite[^\]]*\]/gi, '').replace(/[​-‏⁠﻿]/g, '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const norm = (x) => x.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
  $('aiimp').addEventListener('click', () => {
    const raw = $('ai').value, a = raw.indexOf('{'), b = raw.lastIndexOf('}'), msg = $('aimsg');
    let j; try { j = JSON.parse(raw.slice(a, b + 1)); } catch (e) { msg.textContent = 'That is not valid JSON. Ask the AI to reply with only the JSON.'; return; }
    let added = 0; const missed = [];
    (Array.isArray(j.ideas) ? j.ideas.slice(0, 40) : []).forEach((it) => {
      const quote = scrub(it && it.quote, 600), comment = scrub(it && it.comment, 300); if (!quote) return;
      let hit = null;
      for (const src of S.sources) {       // find the quote in the source text, ignoring differences in spacing and curly quotes
        const map = []; let flat = ''; for (let i = 0; i < src.text.length; i++) { const ch = src.text[i]; if (/\s/.test(ch)) { if (flat && flat[flat.length - 1] !== ' ') { flat += ' '; map.push(i); } } else { flat += norm(ch); map.push(i); } }
        const q = norm(quote), at = flat.indexOf(q); if (at >= 0) { hit = { src, s: map[at], e: map[at + q.length - 1] + 1 }; break; }
      }
      if (!hit) { missed.push(quote.slice(0, 60)); return; }
      if (S.marks.some((m) => m.src === hit.src.id && hit.s < m.e && hit.e > m.s)) return;
      S.marks.push({ id: uid(), src: hit.src.id, s: hit.s, e: hit.e, c: comment }); added++;
    });
    const sum = scrub(j.summary, 1500); if (sum && !S.summary) { S.summary = sum; }
    save(); draw(); msg.textContent = added + ' highlight(s) added' + (sum ? ', summary ' + (S.summary === sum ? 'filled in' : 'left as you wrote it') : '') + (missed.length ? '. Not found in your text, so skipped: ' + missed.join(' | ') : '') + '.';
  });
  draw();
})();
