/* Tutorials runner. Chapters come from chapters.js. Your code is saved in this browser (localStorage) only;
   Check looks for the right pieces; Download gives you the file. Plain JavaScript, written to be read. */
(() => {
  const T = window.TUT, $ = (id) => document.getElementById(id);
  const K = (id, part) => 'tut-' + id + '-' + part;
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  let cur = T.chapters[0];

  const code = (c) => { const s = get(K(c.id, 'code')); return s == null ? c.starter : s; };
  const total = T.chapters.reduce((n, c) => n + c.minutes, 0);

  // introduction: what, why, how long
  const intro = $('intro');
  intro.innerHTML = '<p class="tag">Tutorial</p><h1>Build this website yourself</h1><p class="lede"></p>' +
    '<div class="intro-grid"><div><h3>What</h3><p id="iwhat"></p></div><div><h3>Why</h3><p id="iwhy"></p></div>' +
    '<div><h3>How long</h3><p>About <b>' + Math.floor(total / 60) + ' h ' + (total % 60) + ' min</b> in total across ' + T.chapters.length + ' chapters. Each chapter says its own time. Stop and come back any time: your work is saved when you press Save.</p></div></div>' +
    '<p class="note" id="inote"></p><p><button type="button" id="start">Start chapter 1</button></p>';
  intro.querySelector('.lede').textContent = 'Left: what to do and why. Right: where you write it, with a tick or a hint.';
  $('iwhat').textContent = T.intro.what; $('iwhy').textContent = T.intro.why; $('inote').textContent = T.intro.note;
  $('start').addEventListener('click', () => { $('lab').hidden = false; $('start').parentNode.hidden = true; show(cur); $('editor').focus(); });

  function list() {
    const ol = $('chapters'); ol.replaceChildren();
    T.chapters.forEach((c, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; if (c === cur) b.setAttribute('aria-current', 'true');
      if (get(K(c.id, 'done')) === '1') li.className = 'done';
      b.innerHTML = '<span></span><span class="tick" aria-label="done">✓</span>';
      b.firstChild.textContent = (i + 1) + '. ' + c.title;
      b.addEventListener('click', () => { keep(); show(c); });
      li.append(b); ol.append(li);
    });
  }
  const keep = () => { if (cur) put(K(cur.id, 'draft'), $('editor').value); };

  function show(c) {
    cur = c; const i = T.chapters.indexOf(c);
    $('ctag').textContent = 'Chapter ' + (i + 1) + ' of ' + T.chapters.length + ' · about ' + c.minutes + ' minutes · ' + c.kind.toUpperCase();
    $('ctitle').textContent = c.title; $('cnotes').innerHTML = c.notes; $('csolution').textContent = c.solution;
    $('cfile').textContent = c.file;
    const d = get(K(c.id, 'draft')); $('editor').value = d != null ? d : code(c);
    $('status').textContent = ''; $('status').className = '';
    $('previewwrap').hidden = c.kind === 'py';
    list(); preview();
  }

  function check() {
    const text = $('editor').value, fail = cur.checks.find(([re]) => !re.test(text));
    const s = $('status');
    if (text.trim() === cur.starter.trim()) { s.className = 'bad'; s.textContent = '✗ Nothing written yet. Follow the TODO comments.'; return false; }
    if (fail) { s.className = 'bad'; s.textContent = '✗ ' + fail[1]; return false; }
    s.className = 'ok'; s.textContent = '✓ Looks right. (This checks for the right pieces; open the preview or run the file to see it work.)';
    put(K(cur.id, 'done'), '1'); list(); return true;
  }
  function save() { const ok = put(K(cur.id, 'code'), $('editor').value); put(K(cur.id, 'draft'), $('editor').value); $('status').className = ok ? 'ok' : 'bad'; $('status').textContent = ok ? 'Saved in this browser.' : 'Could not save (storage is blocked). Use Download instead.'; preview(); }
  function dl(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; document.body.append(a); a.click(); a.remove(); }

  // preview: the HTML chapter, with every CSS chapter inside <style> and every JS chapter inside <script>
  let timer;
  function preview() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (cur.kind === 'py') return;
      const text = (c) => (c === cur ? $('editor').value : (get(K(c.id, 'draft')) != null ? get(K(c.id, 'draft')) : code(c)));
      const of = (k) => T.chapters.filter((c) => c.kind === k).map(text);
      let html = of('html')[0] || '';
      const style = '<style>' + of('css').join('\n').replace(/<\/style/gi, '<\\/style') + '</style>';
      const script = '<script>try{' + of('js').join('\n;').replace(/<\/script/gi, '<\\/script') + '}catch(e){document.title=e.message}<\/script>';
      html = html.includes('</head>') ? html.replace('</head>', style + '</head>') : style + html;
      html = html.includes('</body>') ? html.replace('</body>', script + '</body>') : html + script;
      $('preview').srcdoc = html;
    }, 400);
  }

  $('editor').addEventListener('input', preview);
  $('editor').addEventListener('keydown', (e) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const t = e.target, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); preview(); } });
  $('check').addEventListener('click', check);
  $('save').addEventListener('click', save);
  $('dl').addEventListener('click', () => dl(cur.file, $('editor').value));
  $('reset').addEventListener('click', () => { if (confirm('Put the starter code back for this chapter? Your saved version is replaced.')) { $('editor').value = cur.starter; put(K(cur.id, 'code'), cur.starter); put(K(cur.id, 'draft'), cur.starter); preview(); } });
  $('dlall').addEventListener('click', () => { keep(); T.chapters.forEach((c, i) => setTimeout(() => dl(c.file, get(K(c.id, 'draft')) != null ? get(K(c.id, 'draft')) : code(c)), i * 300)); });
})();
