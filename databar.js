/* databar.js: a small "Your data" bar for the tools that keep their own data (coffee, baking, brewing).
   It adds four buttons: load sample data, remove sample data, download my data, delete all my data.
   Everything happens in this browser (localStorage). Nothing is sent anywhere.

   Use it like this, after the tool's own script:
     PBEdata.bar({ id: 'coffee', keys: ['coffee-notebook-log-v1'], sample: () => ({ 'coffee-notebook-log-v1': [ ... ] }) });
   `keys`   the localStorage keys the tool uses
   `sample` a function returning made-up data for those keys (it is only added where a key is empty)
   The tool reads its data when the page opens, so after a change we reload the page. */
const PBEdata = (() => {
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: nothing to do */ } };
  const del = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const empty = (v) => v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

  function bar(o) {
    const mark = 'pbe-sample-' + o.id, host = document.createElement('div');
    host.className = 'databar'; host.style.cssText = 'margin:32px 0;border-top:1px solid var(--line);padding-top:16px';
    const btn = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); host.append(b, ' '); };
    const h = document.createElement('h2'); h.textContent = 'Your data'; host.appendChild(h);
    const p = document.createElement('p'); p.className = 'meta'; p.textContent = 'Everything you enter stays in this browser. You can load made-up sample data to see how the tool looks, remove it again, download a copy of your own data, or delete everything.'; host.appendChild(p);
    btn('Load sample data', () => { const s = o.sample(), added = []; o.keys.forEach((k) => { if (empty(get(k)) && s[k] !== undefined) { put(k, s[k]); added.push(k); } }); put(mark, added); location.reload(); });
    btn('Remove sample data', () => { (get(mark) || []).forEach(del); del(mark); location.reload(); });
    btn('Download my data', () => { const out = { tool: o.id, saved: new Date().toISOString().slice(0, 10), data: {} }; o.keys.forEach((k) => { out.data[k] = get(k); }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); a.download = o.id + '-data.json'; document.body.appendChild(a); a.click(); a.remove(); });
    btn('Delete all my data', () => { if (confirm('Delete all the data this tool keeps in this browser?')) { o.keys.forEach(del); del(mark); location.reload(); } });
    const note = document.createElement('p'); note.className = 'meta'; note.textContent = 'Sample data is made up, to show how the tool looks. It is not real.'; host.appendChild(note);
    (document.getElementById('main') || document.body).appendChild(host);
  }
  return { bar };
})();
