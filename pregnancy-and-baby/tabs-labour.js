/* tabs-labour.js - the Labour tab: a contraction timer that tells practice tightenings (Braxton Hicks) from labour, and gives an
   estimated birth window with a lower and an upper estimate. The maths is in labour.js; this file only draws it.

   Press the big button when a contraction starts and again when it ends. Everything stays in this browser. */
window.PBtabsLabour = (() => {
  'use strict';
  const { h, fill } = PBE, ui = PBui, L = PBlabour, ns = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, text) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  let exIdx = 0, ticker = null;

  /** A small scatter chart. o: { xmin, xmax, ymin, ymax, xfmt, yunit, pts:[{x,y}], line:[{x,y}], band:[x0,x1], marks:[{x,label}], hline:{y,label}, label } */
  function chart(o) {
    const W = 640, H = 190, l = 46, r = 14, t = 14, b = 26, X = (x) => l + ((W - l - r) * (x - o.xmin)) / (o.xmax - o.xmin || 1), Y = (y) => t + (H - t - b) * (1 - (y - o.ymin) / (o.ymax - o.ymin || 1));
    const s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label, style: 'width:100%;height:auto;max-width:680px;color:var(--ink)' });
    if (o.band) s.append(svg('rect', { x: X(Math.max(o.band[0], o.xmin)), y: t, width: Math.max(1, X(Math.min(o.band[1], o.xmax)) - X(Math.max(o.band[0], o.xmin))), height: H - t - b, style: 'fill:var(--accent);opacity:.18' }));
    [o.ymin, (o.ymin + o.ymax) / 2, o.ymax].forEach((v) => { s.append(svg('line', { x1: l, x2: W - r, y1: Y(v), y2: Y(v), stroke: 'currentColor', opacity: 0.15 })); s.append(svg('text', { x: l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'currentColor' }, String(Math.round(v)))); });
    if (o.hline) { s.append(svg('line', { x1: l, x2: W - r, y1: Y(o.hline.y), y2: Y(o.hline.y), stroke: 'currentColor', 'stroke-dasharray': '2 4', opacity: 0.6 })); s.append(svg('text', { x: W - r, y: Y(o.hline.y) - 3, 'text-anchor': 'end', 'font-size': 10, fill: 'currentColor', opacity: 0.8 }, o.hline.label)); }
    if (o.line && o.line.length > 1) s.append(svg('polyline', { points: o.line.map((p) => X(p.x) + ',' + Y(Math.min(o.ymax, Math.max(o.ymin, p.y)))).join(' '), fill: 'none', style: 'stroke:var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    o.pts.forEach((p) => s.append(svg('circle', { cx: X(p.x), cy: Y(Math.min(o.ymax, p.y)), r: 3, fill: 'currentColor' })));
    (o.marks || []).forEach((m) => { if (m.x < o.xmin || m.x > o.xmax) return; s.append(svg('line', { x1: X(m.x), x2: X(m.x), y1: t, y2: H - b, stroke: 'currentColor', 'stroke-width': 1.5, opacity: 0.7 })); s.append(svg('text', { x: X(m.x) + 3, y: t + 10, 'font-size': 10, fill: 'currentColor' }, m.label)); });
    for (let i = 0; i <= 4; i++) { const x = o.xmin + ((o.xmax - o.xmin) * i) / 4; s.append(svg('text', { x: X(x), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle', 'font-size': 10, fill: 'currentColor' }, o.xfmt(x))); }
    return s;
  }

  /** The two charts (minutes apart, seconds long) for a list of contractions and its analysis. x = function from ms to the chart's x unit. */
  function patternCharts(cs, a, x, xmin, xmax, xfmt, marks) {
    cs = cs.slice().sort((p, q) => p.start - q.start);
    const gaps = cs.slice(1).map((c, i) => ({ x: x(c.start), y: (c.start - cs[i].start) / L.MIN })), gmax = Math.min(40, Math.max(10, ...gaps.map((p) => p.y)));
    const band = a && a.estimate ? [x(a.estimate.low), x(a.estimate.high)] : null;
    let line = null;
    if (a && a.trend && a.stats) {
      const { t0, a: a0, b } = a.trend, from = cs.find((c) => c.start >= t0).start; let to = cs[cs.length - 1].start;
      if (b < -0.3 && a.stats.interval > 2) to += ((a.stats.interval - 2) / -b) * L.HOUR;
      to = Math.min(to, from + 24 * L.HOUR);
      line = Array.from({ length: 21 }, (_, i) => { const t = from + ((to - from) * i) / 20; return { x: x(t), y: Math.max(0, a0 + b * ((t - t0) / L.HOUR)) }; });
    }
    return h('div', { class: 'chart' }, h('p', { class: 'meta' }, 'Minutes apart (start to start). Dotted line: 5 minutes.'),
      chart({ xmin, xmax, ymin: 0, ymax: gmax, xfmt, pts: gaps, line, band, marks, hline: { y: 5, label: '5 min' }, label: 'Minutes between contractions' }),
      h('p', { class: 'meta' }, 'Seconds long. Dotted line: 45 seconds.'),
      chart({ xmin, xmax, ymin: 0, ymax: 100, xfmt, pts: cs.map((c) => ({ x: x(c.start), y: (c.end - c.start) / 1000 })), band, marks, hline: { y: 45, label: '45 s' }, label: 'Length of each contraction in seconds' }));
  }

  function labourPage(ctx) {
    const s = { list: [], running: null, ...(ctx.get('labour', {}) || {}) }, save = () => ctx.set('labour', s), m = PBtabsPregnancy.me(ctx), first = m.first !== 'no', now = Date.now();
    if (ticker) { clearInterval(ticker); ticker = null; }
    const a = L.analyse(s.list, now, first);
    const btn = h('button', { type: 'button', style: 'font-size:22px;padding:22px 12px;width:100%;max-width:46em;display:block' }, s.running ? 'Contraction ending? Press when it stops' : 'A contraction is starting');
    btn.addEventListener('click', () => { if (s.running) { s.list.push({ start: s.running, end: Date.now() }); s.running = null; } else s.running = Date.now(); save(); ctx.rerender(); });
    const live = h('p', { class: 'lede' }, s.running ? 'Timing: 0 s' : s.list.length ? 'Last one ended ' + ui.durFmt(now - s.list[s.list.length - 1].end) + ' ago.' : 'No contractions timed yet.');
    ticker = setInterval(() => {                                    // update the running clock; re-read the pattern each minute
      if (!document.body.contains(btn)) { clearInterval(ticker); ticker = null; return; }
      const t = Date.now(); live.textContent = s.running ? 'Timing: ' + ui.durFmt(t - s.running) : s.list.length ? 'Last one ended ' + ui.durFmt(t - s.list[s.list.length - 1].end) + ' ago.' : 'No contractions timed yet.';
      if (Math.floor(t / 1000) % 60 === 0 && !s.running && s.list.length && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) ctx.rerender();
    }, 1000);

    const out = [h('p', { class: 'meta' }, 'Press the button when a contraction starts and again when it ends. After 4 or more, the tool reads the pattern, tells you whether it looks like practice tightenings (Braxton Hicks) or labour, and gives a guide to when your baby may arrive. It is a guide only: your midwife\'s advice always comes first. Taps shorter than 10 seconds are ignored as accidents.'),
      btn, live];
    if (a.verdict === 'established' || a.verdict === 'tooFrequent') out.push(ui.callout(a.advice, true));
    out.push(h('h2', {}, 'Practice or labour?'), h('p', { class: 'lede' }, a.title));
    if (a.verdict !== 'notEnough') out.push(h('p', { class: 'meta' }, 'Looks like practice'), ui.bar(a.score), h('p', { class: 'meta' }, 'Looks like labour'));
    out.push(h('ul', {}, a.reasons.map((r) => h('li', {}, r))));
    if (a.verdict !== 'established' && a.verdict !== 'tooFrequent') out.push(h('p', { class: 'meta' }, a.advice));
    out.push(h('p', { class: 'meta' }, 'Estimates assume ' + (first ? 'this is your first baby' : 'you have had a baby before') + '. You can change this on the "My pregnancy" tab.'));

    out.push(h('h2', {}, 'Estimated birth time'));
    if (a.estimate) {
      const e = a.estimate;
      out.push(h('p', { class: 'lede' }, 'Around ' + ui.dayTimeFmt(e.mid)),
        ui.table(['', 'Time', 'In about'], [['Earlier estimate (lower bound)', ui.dayTimeFmt(e.low), ui.durFmt(Math.max(0, e.low - now))], ['Most likely', ui.dayTimeFmt(e.mid), ui.durFmt(Math.max(0, e.mid - now))], ['Later estimate (upper bound)', ui.dayTimeFmt(e.high), ui.durFmt(Math.max(0, e.high - now))]]),
        a.since ? h('p', { class: 'meta' }, 'Established pattern since ' + ui.timeFmt(a.since) + ' (' + ui.durFmt(now - a.since) + ' ago).') : null, h('p', { class: 'meta' }, e.basis),
        h('p', { class: 'meta' }, 'A rough guide, not a prediction to plan around. Labour can speed up, slow down or pause, and many babies arrive outside any window. Your midwife\'s assessment comes first.'));
    } else out.push(h('p', { class: 'meta' }, a.verdict === 'notEnough' ? 'Time a few contractions to get an estimate.' : a.verdict === 'practice' ? 'No estimate: these do not look like labour yet.' : 'No estimate yet: the contractions are not getting steadily closer together.'));

    if (s.list.length >= 4) {
      const cs = s.list, xmin = cs[0].start, xmax = Math.max(now, cs[cs.length - 1].end, a.estimate ? Math.min(a.estimate.high, now + 24 * L.HOUR) : 0);
      out.push(h('h2', {}, 'Your pattern'), patternCharts(cs, a, (t) => t, xmin, xmax, (t) => ui.timeFmt(t), [{ x: now, label: 'now' }].concat(a.estimate ? [{ x: a.estimate.mid, label: 'likely' }] : [])),
        h('p', { class: 'meta' }, 'Dots: each contraction. Dashed accent line: the trend, continued forward. Shaded band: the estimated birth window.'));
    }
    const rows = s.list.map((c, i) => [c, i]).reverse();
    out.push(h('h2', {}, 'Log (' + s.list.length + ')'),
      h('p', {}, h('button', { type: 'button', onclick: () => { s.list.pop(); save(); ctx.rerender(); } }, 'Delete the last one'), ' ', h('button', { type: 'button', onclick: () => { if (confirm('Delete every timed contraction?')) { s.list = []; s.running = null; save(); ctx.rerender(); } } }, 'Clear all'), ' ',
        h('button', { type: 'button', onclick: () => ctx.saveFile('contractions.csv', 'start,end,length_seconds,minutes_since_previous_start\n' + s.list.map((c, i) => [new Date(c.start).toISOString(), new Date(c.end).toISOString(), Math.round((c.end - c.start) / 1000), i ? Math.round(((c.start - s.list[i - 1].start) / 60000) * 10) / 10 : ''].join(',')).join('\n') + '\n', 'text/csv') }, 'Download as CSV')),
      s.list.length ? ui.table(['Started', 'Length', 'Since the last one'], rows.slice(0, 30).map(([c, i]) => [ui.dayTimeFmt(c.start), ui.durFmt(c.end - c.start), i ? ui.durFmt(c.start - s.list[i - 1].start) : '-'])) : null);

    out.push(h('h2', {}, 'When to call (NHS)'), h('ul', {}, [
      'Call your midwife or maternity unit if you think you are in labour, if your contractions are regular and about every 5 minutes or closer, or if you are unsure. In a first labour you may be advised to stay at home until they are about 3 to 4 in every 10 minutes, each lasting about a minute.',
      'Call straight away if your waters break, you are bleeding, your baby is moving less than usual, or you are less than 37 weeks pregnant.',
      'Call straight away if you have 6 or more contractions in 10 minutes.', 'Call 999 if you feel your baby is coming now.'].map((t) => h('li', {}, t))));
    out.push(h('h3', {}, 'Practice tightenings or the real thing?'), ui.table(['', 'Braxton Hicks (practice)', 'Labour'], [
      ['Pattern', 'Irregular', 'Regular, coming in a pattern'], ['Over time', 'Do not build up, and often fade', 'Get longer, stronger and closer together'], ['With rest, a drink or a change of position', 'Often ease or stop', 'Carry on'], ['Feel', 'A tightening, usually not painful', 'Painful, often starting in the back and moving to the front']]));

    out.push(examples(ctx, s));
    return h('div', {}, out);
  }

  /* ---- example labours: real labour does not follow one straight line ---- */
  function examples(ctx, s) {
    const all = L.examples(), e = all[Math.min(exIdx, all.length - 1)], snaps = e.snapshots.map((hh) => [hh, L.analyseExample(e, hh)]);
    const last = snaps.slice().reverse().find(([, a]) => a.estimate), end = Math.max(e.contractions[e.contractions.length - 1].end, e.birth || 0), hx = (t) => t / L.HOUR;
    const xmax = Math.max(hx(end), last ? hx(last[1].estimate.high) : 0) + 0.5;
    const marks = snaps.map(([hh], i) => ({ x: hh, label: String(i + 1) })).concat(e.birth ? [{ x: hx(e.birth), label: 'birth' }] : []);
    return h('div', {}, h('h2', {}, 'Example labour patterns'),
      h('p', { class: 'meta' }, 'Real labour does not follow a straight line. These five made-up examples show common shapes, and what this tool would have said at each numbered moment. They are not from real people.'),
      h('div', { class: 'tabs' }, all.map((x, i) => h('a', { href: '#ex' + i, 'aria-current': i === exIdx ? 'page' : false, onclick: (ev) => { ev.preventDefault(); exIdx = i; ctx.rerender(); } }, x.title))),
      h('p', {}, h('strong', {}, e.title + ': '), e.about, ' ', e.first ? 'First baby.' : 'Not the first baby.'),
      patternCharts(e.contractions, last && last[1], hx, 0, xmax, (v) => Math.round(v * 10) / 10 + ' h', marks),
      h('ol', {}, snaps.map(([hh, a]) => h('li', {}, 'At ' + hh + ' hours: ' + a.title + (a.estimate ? '. Estimate ' + Math.round(hx(a.estimate.mid) * 10) / 10 + ' h (between ' + Math.round(hx(a.estimate.low) * 10) / 10 + ' and ' + Math.round(hx(a.estimate.high) * 10) / 10 + ' h)' : '') + '.'))),
      h('p', { class: 'meta' }, e.birth ? 'In this example the baby arrived at about ' + Math.round(hx(e.birth) * 10) / 10 + ' hours.' : 'In this example the tightenings faded away and there was no labour.'),
      h('p', {}, h('button', { type: 'button', onclick: () => { if (s.list.length && !confirm('This replaces the contractions you have timed. Carry on?')) return; const shift = Date.now() - e.contractions[e.contractions.length - 1].end - 2 * L.MIN; s.list = e.contractions.map((c) => ({ start: c.start + shift, end: c.end + shift, example: true })); s.running = null; ctx.set('labour', s); ctx.rerender(); } }, 'Load this example into the timer'), ' ', h('span', { class: 'meta' }, 'Clear all afterwards.')));
  }
  return { labourPage };
})();
