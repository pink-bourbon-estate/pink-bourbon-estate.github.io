/* Travel Map (a demo of the idea): pin the places you have been, draw routes, and add the GPS position from photos.
   Everything stays on your device: the map outline is a file on this site (Natural Earth country outlines, public domain),
   nothing is sent anywhere, and a photo is never uploaded or stored: only the place it was taken (and its date) is read
   from the photo in your browser. You can import a GPX file (from a running or cycling app), a KML or GeoJSON route,
   and download everything as GeoJSON.

   NOT in this demo yet: street-level maps (they need road data, see "The plan" on the page), and highlighting the roads you
   drove along from a route. Today a route is drawn as a line on a country map. */
(() => {
  const $ = (id) => document.getElementById(id), KEY = 'pbe-travel-map-v1', NS = 'http://www.w3.org/2000/svg', SIZE = 1000;
  let data = { pins: [], routes: [] }, view = { x: 0, y: 0, w: SIZE, h: SIZE }, mode = 'pan', countries = null;
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.pins) data = d; } catch (e) { /* start empty */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ } };
  const uid = () => Math.random().toString(36).slice(2, 9);
  /* Mercator: longitude/latitude -> x, y in a 1000 x 1000 square (north at the top) */
  const px = (lon) => ((lon + 180) / 360) * SIZE, py = (lat) => { const l = Math.max(-82, Math.min(82, lat)) * Math.PI / 180; return (0.5 - Math.log(Math.tan(Math.PI / 4 + l / 2)) / (2 * Math.PI)) * SIZE; };
  const unx = (x) => (x / SIZE) * 360 - 180, uny = (y) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y / SIZE))) * 180) / Math.PI;
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); Object.keys(a || {}).forEach((k) => e.setAttribute(k, a[k])); if (p) p.append(e); return e; };

  /** Turn a TopoJSON file (countries as shared arcs) into SVG path text. */
  function topoPaths(t) {
    const [sx, sy] = t.transform.scale, [tx, ty] = t.transform.translate;
    const arcs = t.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
    const ring = (idx) => { const pts = []; idx.forEach((i) => { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); }); return 'M' + pts.map(([lo, la]) => px(lo).toFixed(1) + ' ' + py(la).toFixed(1)).join('L') + 'Z'; };
    return t.objects.countries.geometries.map((g) => ({ name: g.properties.name, d: (g.type === 'Polygon' ? [g.arcs] : g.arcs).map((poly) => poly.map(ring).join('')).join('') }));
  }

  function draw() {
    const svg = $('map'); svg.replaceChildren(); svg.setAttribute('viewBox', [view.x, view.y, view.w, view.h].join(' '));
    el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: 'var(--bg)' }, svg);
    (countries || []).forEach((c) => { const p = el('path', { d: c.d, fill: 'var(--soft)', stroke: 'var(--mute)', 'stroke-width': 0.6, 'vector-effect': 'non-scaling-stroke' }, svg); const t = el('title', {}, p); t.textContent = c.name; });
    const k = view.w / SIZE;                                                                 // zoom factor: bigger map features when zoomed in
    data.routes.forEach((r) => { if (r.pts.length > 1) el('polyline', { points: r.pts.map(([lo, la]) => px(lo).toFixed(2) + ',' + py(la).toFixed(2)).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, svg); });
    data.pins.forEach((p) => { const g = el('g', { style: 'cursor:pointer' }, svg), c = el('circle', { cx: px(p.lon), cy: py(p.lat), r: Math.max(1.2, 5 * k), fill: p.photo ? 'var(--ink)' : 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': Math.max(0.4, 1.5 * k) }, g); const t = el('title', {}, g); t.textContent = p.name + (p.date ? ' (' + p.date + ')' : '') + (p.note ? ': ' + p.note : ''); g.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Remove "' + p.name + '"?')) { data.pins = data.pins.filter((x) => x.id !== p.id); save(); draw(); list(); } }); });
    list();
  }
  function list() {
    const rows = [...data.pins.map((p) => ({ date: p.date || '', text: (p.photo ? 'Photo: ' : '') + p.name, lat: p.lat, lon: p.lon })), ...data.routes.map((r) => ({ date: r.date || '', text: 'Route: ' + r.name + ' (' + r.pts.length + ' points)', lat: r.pts[0] && r.pts[0][1], lon: r.pts[0] && r.pts[0][0] }))].sort((a, b) => (a.date < b.date ? -1 : 1));
    const ul = $('timeline'); ul.replaceChildren(...rows.map((r) => { const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = (r.date ? r.date + '  ' : '') + r.text; b.addEventListener('click', () => { if (r.lon != null) { view = { x: px(r.lon) - 40, y: py(r.lat) - 40, w: 80, h: 80 }; draw(); } }); li.append(b); return li; }));
    $('count').textContent = data.pins.length + ' places, ' + data.routes.length + ' routes';
  }
  const zoom = (f, cx, cy) => { const nw = Math.max(2, Math.min(SIZE, view.w * f)); cx = cx == null ? view.x + view.w / 2 : cx; cy = cy == null ? view.y + view.h / 2 : cy; view = { x: Math.max(0, Math.min(SIZE - nw, cx - (cx - view.x) * nw / view.w)), y: Math.max(0, Math.min(SIZE - nw, cy - (cy - view.y) * nw / view.w)), w: nw, h: nw }; draw(); };
  const at = (e) => { const svg = $('map'), r = svg.getBoundingClientRect(); return [view.x + ((e.clientX - r.left) / r.width) * view.w, view.y + ((e.clientY - r.top) / r.height) * view.h]; };

  /* ----- reading files ----- */
  const num = (s) => Number(s);
  function readGPX(txt) { const d = new DOMParser().parseFromString(txt, 'text/xml'), pts = [...d.querySelectorAll('trkpt, rtept')].map((n) => [num(n.getAttribute('lon')), num(n.getAttribute('lat'))]), name = (d.querySelector('trk > name, rte > name, metadata > name') || {}).textContent || 'GPX route', t = (d.querySelector('trkpt time, metadata time') || {}).textContent; if (pts.length) data.routes.push({ id: uid(), name, date: t ? t.slice(0, 10) : '', pts: thin(pts) }); d.querySelectorAll('wpt').forEach((n) => data.pins.push({ id: uid(), name: (n.querySelector('name') || {}).textContent || 'Waypoint', lat: num(n.getAttribute('lat')), lon: num(n.getAttribute('lon')), date: '', note: '' })); }
  function readKML(txt) { const d = new DOMParser().parseFromString(txt, 'text/xml'); d.querySelectorAll('Placemark').forEach((pm) => { const name = (pm.querySelector('name') || {}).textContent || 'Place', co = pm.querySelector('coordinates'); if (!co) return; const pts = co.textContent.trim().split(/\s+/).map((s) => s.split(',').map(Number)).filter((a) => a.length >= 2 && isFinite(a[0])).map((a) => [a[0], a[1]]); if (pm.querySelector('LineString')) data.routes.push({ id: uid(), name, date: '', pts: thin(pts) }); else if (pts[0]) data.pins.push({ id: uid(), name, lon: pts[0][0], lat: pts[0][1], date: '', note: '' }); }); }
  function readGeo(txt) { const j = JSON.parse(txt), fs = j.type === 'FeatureCollection' ? j.features : [j.type === 'Feature' ? j : { type: 'Feature', geometry: j, properties: {} }]; fs.forEach((f) => { const g = f.geometry || {}, name = (f.properties && (f.properties.name || f.properties.title)) || 'Imported'; if (g.type === 'Point') data.pins.push({ id: uid(), name, lon: g.coordinates[0], lat: g.coordinates[1], date: (f.properties && f.properties.date) || '', note: '' }); if (g.type === 'LineString') data.routes.push({ id: uid(), name, date: (f.properties && f.properties.date) || '', pts: thin(g.coordinates.map((c) => [c[0], c[1]])) }); if (g.type === 'MultiLineString') g.coordinates.forEach((l) => data.routes.push({ id: uid(), name, date: '', pts: thin(l.map((c) => [c[0], c[1]])) })); }); }
  /** Keep at most about 1500 points of a long route so the page stays quick. */
  const thin = (p) => (p.length > 1500 ? p.filter((_, i) => i % Math.ceil(p.length / 1500) === 0 || i === p.length - 1) : p);
  /** Read the GPS position and date from a JPEG photo's EXIF block (in the browser; the photo itself is not kept). */
  function exif(buf) {
    const v = new DataView(buf); if (v.getUint16(0) !== 0xffd8) return null; let o = 2;
    while (o < v.byteLength - 4) { const m = v.getUint16(o), len = v.getUint16(o + 2); if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { return parseTiff(v, o + 10); } if ((m & 0xff00) !== 0xff00) break; o += 2 + len; }
    return null;
  }
  function parseTiff(v, b) {
    const le = v.getUint16(b) === 0x4949, u16 = (o) => v.getUint16(o, le), u32 = (o) => v.getUint32(o, le), size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
    const ifd = (off) => { const out = {}, n = u16(b + off); for (let i = 0; i < n; i++) { const e = b + off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), bytes = (size[type] || 1) * cnt, vo = bytes > 4 ? b + u32(e + 8) : e + 8; out[tag] = { type, cnt, vo }; } return out; };
    const rat = (vo, i) => v.getUint32(vo + i * 8, le) / (v.getUint32(vo + i * 8 + 4, le) || 1), str = (t) => { let s = ''; for (let i = 0; i < t.cnt - 1; i++) s += String.fromCharCode(v.getUint8(t.vo + i)); return s; };
    const i0 = ifd(u32(b + 4)), res = {};
    if (i0[0x8769]) { const ex = ifd(u32(i0[0x8769].vo)); if (ex[0x9003]) res.date = str(ex[0x9003]).slice(0, 10).replace(/:/g, '-'); }
    if (i0[0x8825]) { const g = ifd(u32(i0[0x8825].vo)); if (g[2] && g[4]) { const dms = (t) => rat(t.vo, 0) + rat(t.vo, 1) / 60 + rat(t.vo, 2) / 3600; res.lat = dms(g[2]) * (str(g[1]) === 'S' ? -1 : 1); res.lon = dms(g[4]) * (str(g[3]) === 'W' ? -1 : 1); } }
    return res.lat != null ? res : null;
  }

  /* ----- sample data: a made-up rail trip (the dates are relative to today) ----- */
  function sample() {
    const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const stops = [['London', 51.5, -0.12, 20], ['Paris', 48.86, 2.35, 18], ['Zurich', 47.38, 8.54, 15], ['Milan', 45.46, 9.19, 13], ['Florence', 43.77, 11.26, 11], ['Rome', 41.9, 12.5, 9]];
    stops.forEach(([name, lat, lon, ago]) => data.pins.push({ id: uid(), name, lat, lon, date: day(ago), note: 'Sample', sample: true }));
    data.routes.push({ id: uid(), name: 'Sample rail trip', date: day(20), pts: stops.map((s) => [s[2], s[1]]), sample: true });
  }
  document.addEventListener('DOMContentLoaded', async () => {
    const svg = $('map'); let drag = null;
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const [cx, cy] = at(e); zoom(e.deltaY > 0 ? 1.25 : 0.8, cx, cy); }, { passive: false });
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', (e) => { if (!drag) return; const r = svg.getBoundingClientRect(), dx = ((e.clientX - drag.x) / r.width) * view.w, dy = ((e.clientY - drag.y) / r.height) * view.h; if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true; if (drag.moved) { view.x = Math.max(0, Math.min(SIZE - view.w, drag.vx - dx)); view.y = Math.max(0, Math.min(SIZE - view.h, drag.vy - dy)); svg.setAttribute('viewBox', [view.x, view.y, view.w, view.h].join(' ')); } });
    svg.addEventListener('pointerup', (e) => { const was = drag; drag = null; if (was && !was.moved && mode === 'pin') { const [x, y] = at(e), name = $('pinname').value.trim() || 'Place'; data.pins.push({ id: uid(), name, lat: uny(y), lon: unx(x), date: $('pindate').value || new Date().toISOString().slice(0, 10), note: '' }); save(); draw(); } else draw(); });
    $('zin').addEventListener('click', () => zoom(0.6)); $('zout').addEventListener('click', () => zoom(1.6)); $('home').addEventListener('click', () => { view = { x: 0, y: 0, w: SIZE, h: SIZE }; draw(); });
    $('uk').addEventListener('click', () => { view = { x: px(-11), y: py(60), w: px(5) - px(-11), h: px(5) - px(-11) }; draw(); }); $('eu').addEventListener('click', () => { view = { x: px(-12), y: py(62), w: px(30) - px(-12), h: px(30) - px(-12) }; draw(); });
    $('modepin').addEventListener('click', () => { mode = mode === 'pin' ? 'pan' : 'pin'; $('modepin').setAttribute('aria-pressed', mode === 'pin'); $('modepin').textContent = mode === 'pin' ? 'Pin mode on: click the map' : 'Add a pin by clicking'; });
    $('files').addEventListener('change', async (e) => { for (const f of e.target.files) { try { if (/\.gpx$/i.test(f.name)) readGPX(await f.text()); else if (/\.kml$/i.test(f.name)) readKML(await f.text()); else if (/\.(geo)?json$/i.test(f.name)) readGeo(await f.text()); else if (/\.jpe?g$/i.test(f.name)) { const r = exif(await f.arrayBuffer()); if (r) data.pins.push({ id: uid(), name: 'Photo', lat: r.lat, lon: r.lon, date: r.date || '', note: '', photo: true }); else $('msg').textContent = 'No GPS position found in ' + f.name + '.'; } } catch (err) { $('msg').textContent = 'Could not read ' + f.name + '.'; } } save(); draw(); e.target.value = ''; });
    $('dlgeo').addEventListener('click', () => { const g = { type: 'FeatureCollection', features: [...data.pins.map((p) => ({ type: 'Feature', properties: { name: p.name, date: p.date, note: p.note }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })), ...data.routes.map((r) => ({ type: 'Feature', properties: { name: r.name, date: r.date }, geometry: { type: 'LineString', coordinates: r.pts } }))] }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(g, null, 1)], { type: 'application/geo+json' })); a.download = 'my-travel-map.geojson'; document.body.append(a); a.click(); a.remove(); });
    $('loads').addEventListener('click', () => { if (!data.pins.some((p) => p.sample)) sample(); save(); draw(); });
    $('rems').addEventListener('click', () => { data.pins = data.pins.filter((p) => !p.sample); data.routes = data.routes.filter((r) => !r.sample); save(); draw(); });
    $('clear').addEventListener('click', () => { if (confirm('Delete every pin and route from this browser?')) { data = { pins: [], routes: [] }; save(); draw(); } });
    try { const t = await (await fetch('countries-50m.json')).json(); countries = topoPaths(t); } catch (e) { $('msg').textContent = 'The map outline could not load.'; }
    draw();
  });
})();
