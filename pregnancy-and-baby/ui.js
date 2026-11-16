/* ui.js - small helpers shared by the Pregnancy and Baby tabs: dates, times, tables and the unit switcher. */
window.PBui = (() => {
  'use strict';
  const { h } = PBE, U = PBunits, DAY = 86400000;

  /* ---- dates and times (dates are ISO text, YYYY-MM-DD; times are milliseconds) ---- */
  const parse = (s) => new Date(s + 'T12:00:00Z');
  const iso = (d) => d.toISOString().slice(0, 10);
  const plusDays = (s, n) => iso(new Date(parse(s).getTime() + n * DAY));
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
  const todayLocal = () => new Date().toLocaleDateString('en-CA');                 // the date on your own clock
  const dateFmt = (s) => (s ? parse(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
  const timeFmt = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dayTimeFmt = (ms) => new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const localDateOf = (ms) => new Date(ms).toLocaleDateString('en-CA');
  /** 95000 -> "1 min 35 s"; 5400000 -> "1 h 30 min". */
  const durFmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); if (m < 60) return m + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : ''); return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  /* ---- little page pieces ---- */
  const field = (label, input) => h('label', { class: 'fld' }, label, input);
  /** A shaded note. urgent = bold with an accent bar. */
  const callout = (text, urgent) => h('p', { class: 'note', style: urgent ? 'font-weight:600;border-left:4px solid var(--accent)' : false }, text);
  const bar = (frac) => h('div', { role: 'img', 'aria-label': Math.round(frac * 100) + ' per cent', style: 'border:1px solid var(--ink);height:14px;max-width:46em;margin:6px 0' }, h('div', { style: 'height:100%;background:var(--ink);width:' + Math.round(Math.min(1, Math.max(0, frac)) * 100) + '%' }));
  /** rows = arrays of cells; onDelete(i) adds a Delete button per row (i = index into rows as given). */
  function table(headers, rows, onDelete) {
    return h('div', { class: 'tablewrap' }, h('table', {}, h('thead', {}, h('tr', {}, headers.map((x) => h('th', {}, x)), onDelete ? h('th', {}, '') : null)),
      h('tbody', {}, rows.map((r, i) => h('tr', {}, r.map((c) => h('td', {}, c)), onDelete ? h('td', {}, h('button', { type: 'button', onclick: () => onDelete(i) }, 'Delete')) : null)))));
  }
  const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
  const numberBox = (step, min, max) => h('input', { type: 'number', step: step || 'any', min, max, inputmode: 'decimal' });

  /* ---- units ---- */
  const units = (ctx) => ({ ...U.defaults(), ...(ctx.get('units', {}) || {}) });
  /** The unit switcher: a preset menu plus a menu for each kind of unit. Saved on this device; it only changes what you see and type. */
  function unitBar(ctx) {
    const u = units(ctx), save = (n) => { ctx.set('units', n); ctx.rerender(); };
    const preset = h('select', { 'aria-label': 'Units' }, [...Object.keys(U.PRESETS), 'Custom'].map((k) => h('option', { value: k }, k)));
    preset.value = U.presetName(u);
    preset.addEventListener('change', () => { if (preset.value !== 'Custom') save({ ...U.PRESETS[preset.value] }); });
    const each = Object.keys(U.CHOICES).map((k) => { const s = h('select', {}, U.CHOICES[k].map(([v, l]) => h('option', { value: v }, l))); s.value = u[k]; s.addEventListener('change', () => save({ ...u, [k]: s.value })); return field(U.LABELS[k], s); });
    return h('div', {}, h('div', { class: 'form' }, field('Units', preset)),
      h('details', {}, h('summary', {}, 'Choose each unit separately'), h('div', { class: 'form' }, each), h('p', { class: 'meta' }, 'Your numbers are stored in metric and converted for display, so switching never changes what you saved.')));
  }
  /** One or two number boxes for a weight in the chosen unit. kind = 'adult' or 'baby'. Returns { el, read() -> kg or null, clear() }. */
  function weightInput(u, kind) {
    const fields = kind === 'baby' ? U.babyWeightFields(u) : U.weightFields(u), boxes = fields.map((f) => numberBox(f.step, 0));
    const el = h('div', { class: 'form' }, fields.map((f, i) => field('Weight (' + f.label + ')', boxes[i])));
    const read = () => (kind === 'baby' ? U.babyWeightFrom : U.weightFrom)(u, boxes[0].value, boxes[1] ? boxes[1].value : 0);
    return { el, read, clear: () => boxes.forEach((b) => { b.value = ''; }) };
  }
  return { parse, iso, plusDays, daysBetween, todayLocal, dateFmt, timeFmt, dayTimeFmt, localDateOf, durFmt, plural, field, callout, bar, table, num, numberBox, units, unitBar, weightInput, DAY };
})();
