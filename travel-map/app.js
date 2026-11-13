/* Travel Map v2 (work in progress): trips made of steps (a bit like Polarsteps), plus a "roads you have travelled" layer.

   What stays private: your trips live only in this browser (localStorage). The map outline is a file on this site.
   Photos are never uploaded or kept: only the place and date inside them are read, in your browser.

   What can contact another server: ONLY three buttons, and each one first shows you exactly what will be sent and asks you to confirm.
     1. "Fetch roads from OpenStreetMap"   sends a map box (south, west, north, east) to the Overpass service.
     2. "Draw the route by road"            sends your step coordinates to the OSRM routing service.
   Nothing is sent on page load, and nothing is sent unless you press the button and say yes.

   The road maths (matching a route to roads, kilometres, parsing a Google Maps link) is in roads.js, loaded before this file. */
(() => {
  const $ = (id) => document.getElementById(id), KEY = 'pbe-travel-map-v2', OLD = 'pbe-travel-map-v1', NS = 'http://www.w3.org/2000/svg', SIZE = 1000;
  const R = TMroads;
  /* ---------------------------------------------------------------- state */
  let data = { trips: [], cur: null }, view = { x: 0, y: 0, w: SIZE, h: SIZE }, mode = 'pan', countries = null;
  let ways = [], viewWays = [], hotPath = '', matched = null, tileInfo = null, loadTimer = null;   // road data lives in memory only. ways = roads you loaded yourself; viewWays = roads from the site's tiles for the part of the map on screen
  const uid = () => Math.random().toString(36).slice(2, 9), today = () => new Date().toISOString().slice(0, 10);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: the map still works for this visit */ } };
  /** Load saved trips. If there is a version 1 save ({pins, routes}), move it into one trip called "My trip" so nothing is lost. */
  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.trips) { data = d; } else { const o = JSON.parse(localStorage.getItem(OLD) || 'null'); if (o && (o.pins || o.routes)) data = { trips: [{ id: uid(), name: 'My trip', steps: o.pins || [], routes: o.routes || [] }], cur: null }; } } catch (e) { /* start empty */ }
    ensure();
  }
  /** Make sure there is always at least one trip and that the chosen trip exists. */
  function ensure() {
    if (!data.trips.length) data.trips.push({ id: uid(), name: 'My trip', steps: [], routes: [] });
    if (!data.trips.some((t) => t.id === data.cur)) data.cur = data.trips[0].id;
  }
  const trip = () => data.trips.find((t) => t.id === data.cur);
  const say = (m) => { $('msg').textContent = m || ''; };

  /* ---------------------------------------------------------------- map maths */
  const px = (lon) => ((lon + 180) / 360) * SIZE, py = (lat) => { const l = Math.max(-82, Math.min(82, lat)) * Math.PI / 180; return (0.5 - Math.log(Math.tan(Math.PI / 4 + l / 2)) / (2 * Math.PI)) * SIZE; };
  const unx = (x) => (x / SIZE) * 360 - 180, uny = (y) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y / SIZE))) * 180) / Math.PI;
  const f5 = (n) => n.toFixed(5);                                          // 5 decimals is under a metre even when zoomed far in
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); Object.keys(a || {}).forEach((k) => e.setAttribute(k, a[k])); if (p) p.append(e); return e; };
  const pt = ([lo, la]) => f5(px(lo)) + ' ' + f5(py(la));

  /** Turn the country file (TopoJSON) into SVG path text AND lists of longitude/latitude points (used to work out which countries you visited). */
  function topoPaths(t) {
    const [sx, sy] = t.transform.scale, [tx, ty] = t.transform.translate;
    const arcs = t.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
    const ring = (idx) => { const pts = []; idx.forEach((i) => { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); }); return pts; };
    /* a jump of more than 180 degrees of longitude means the outline crosses the date line: start a new piece instead of drawing a line across the map */
    return t.objects.countries.geometries.map((g) => { const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs).map((poly) => poly.map(ring)); return { name: g.properties.name, polys, d: polys.map((poly) => poly.map((r) => r.map(([lo, la], i) => (!i || Math.abs(lo - r[i - 1][0]) > 180 ? 'M' : 'L') + px(lo).toFixed(1) + ' ' + py(la).toFixed(1)).join('')).join('')).join('') }; });
  }
  /** Is the point inside the ring? (the classic "count the edge crossings" test) */
  function inRing(lon, lat, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { if ((r[i][1] > lat) !== (r[j][1] > lat) && lon < ((r[j][0] - r[i][0]) * (lat - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; } return c; }
  /** Which country is this point in? Returns its name, or '' (open sea). Holes in a country (lakes, enclaves) are respected. */
  function countryAt(lon, lat) {
    for (const c of countries || []) for (const poly of c.polys) if (inRing(lon, lat, poly[0]) && !poly.slice(1).some((h) => inRing(lon, lat, h))) return c.name;
    return '';
  }

  /* ---------------------------------------------------------------- drawing */
  const haveRoads = () => ways.length > 0 || viewWays.length > 0;
  /** The bounding box [west, south, east, north] of a road piece (worked out once). */
  const bbOf = (w) => { if (!w.bb) { let a = 180, b = 90, c = -180, d = -90; w.pts.forEach(([lo, la]) => { if (lo < a) a = lo; if (lo > c) c = lo; if (la < b) b = la; if (la > d) d = la; }); w.bb = [a, b, c, d]; } return w.bb; };
  /** The visible part of the map as [west, south, east, north] in degrees. */
  const viewBox = () => [unx(view.x), uny(view.y + view.h), unx(view.x + view.w), uny(view.y)];
  /** Road pieces on screen, merged into one path per kind of road (cheap to draw even with thousands of pieces).
      Kinds: 0 motorway, 1 A road, 2 B and other classified roads, 3 minor roads (and roads you loaded yourself), 4 footpaths, tracks and cycleways. */
  function roadPaths() {
    const v = viewBox(), d = ['', '', '', '', ''];
    ways.concat(viewWays).forEach((w) => { const b = bbOf(w); if (b[2] < v[0] || b[0] > v[2] || b[3] < v[1] || b[1] > v[3]) return; const c = w.cls, k = c === 0 ? 0 : c === 1 ? 1 : c === 2 || c === 3 ? 2 : c >= 5 ? 4 : 3; d[k] += 'M' + w.pts.map(pt).join('L'); });
    return d;
  }

  /* ---------------------------------------------------------------- the map's look (sea, land, water, roads, names) */
  /** Colours for a normal-looking map, in light or dark mode (follows the site's theme switch, or the device setting). */
  function palette() {
    const t = document.documentElement.getAttribute('data-theme'), dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    return dark
      ? { sea: '#16232c', land: '#2a2a28', visited: '#463c27', border: '#55554f', text: '#d6d4cc', halo: '#2a2a28', seaText: '#7f9fb3', road: ['#a8672b', '#8c7437', '#5a5a55', '#444440', '#8a6a55'], casing: ['#2a1a0c', '#2a2410', '#1c1c1a', '#1c1c1a', null] }
      : { sea: '#b9d9e8', land: '#f3f0e8', visited: '#ecd9a6', border: '#b3ad9f', text: '#3d3a33', halo: '#f3f0e8', seaText: '#5d86a0', road: ['#f6a05a', '#fbd98b', '#ffffff', '#ffffff', '#a8704f'], casing: ['#c7742a', '#d9b04f', '#cfc9bb', '#d8d3c6', null] };
  }
  const basemap = { lakes: '', rivers: '', places: [] };                   // water and place names, read from basemap/ (made by .github/scripts/build_basemap.py)
  /** The map width on screen in degrees of longitude. Smaller means more zoomed in. */
  const degWide = () => (view.w / SIZE) * 360;
  /** A point's position in the map's own units, or null if it is off screen. */
  const onScreen = (lon, lat, m) => { const x = px(lon), y = py(lat), k = m || 0; return x < view.x - k || x > view.x + view.w + k || y < view.y - k || y > view.y + view.h + k ? null : [x, y]; };

  /** Draw lakes, rivers and the roads, thicker the closer you are. */
  function drawWaterAndRoads(svg, pal) {
    const deg = degWide();
    if (basemap.lakes) el('path', { d: basemap.lakes, fill: pal.sea, stroke: pal.sea, 'stroke-width': 0.5, 'vector-effect': 'non-scaling-stroke' }, svg);
    if (basemap.rivers && deg < 90) el('path', { d: basemap.rivers, fill: 'none', stroke: pal.sea, 'stroke-width': deg < 8 ? 1.4 : 0.8, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, svg);
    if (!haveRoads()) return;
    const p = roadPaths(), z = deg > 8 ? 0 : deg > 2 ? 1 : deg > 0.5 ? 2 : deg > 0.12 ? 3 : 4;        // closer in = wider roads
    const wid = [[1.6, 1.2, 0.8, 0.6, 0.6], [2.4, 1.8, 1.2, 0.8, 0.7], [3.4, 2.8, 2, 1.2, 0.9], [4.6, 4, 3, 2, 1.2], [6, 5.4, 4.2, 3, 1.6]][z];
    [3, 2, 1, 0].forEach((k) => { if (p[k] && pal.casing[k]) el('path', { d: p[k], fill: 'none', stroke: pal.casing[k], 'stroke-width': wid[k] + 1.6, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg); });
    [3, 2, 1, 0].forEach((k) => { if (p[k]) el('path', { d: p[k], fill: 'none', stroke: pal.road[k], 'stroke-width': wid[k], 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg); });
    if (p[4] && deg < 0.6) el('path', { d: p[4], fill: 'none', stroke: pal.road[4], 'stroke-width': 1.2, 'stroke-dasharray': '3 2', 'vector-effect': 'non-scaling-stroke' }, svg);
  }

  /** Country names and place names, with a simple "do not overlap" rule so the map stays readable. */
  function drawLabels(svg, pal) {
    const deg = degWide(), k = view.w / (svg.clientWidth || 900), boxes = [];           // k = map units per screen pixel
    const free = (x, y, w, h) => { for (const b of boxes) if (x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]) return false; boxes.push([x, y, w, h]); return true; };
    const text = (x, y, s, size, o) => { const t = el('text', Object.assign({ x, y, 'font-size': size, fill: pal.text, stroke: pal.halo, 'stroke-width': size * 0.28, 'paint-order': 'stroke', 'stroke-linejoin': 'round', 'pointer-events': 'none', 'font-family': 'system-ui, sans-serif' }, o || {}), svg); t.textContent = s; return t; };
    if (deg > 1.5) (countries || []).forEach((c) => {                                  // country names, in the middle of each country's biggest piece
      if (!c.lab) { let best = null; c.polys.forEach((poly) => { const r = poly[0]; let a = 1e9, b = 1e9, e = -1e9, f = -1e9; r.forEach(([lo, la]) => { if (lo < a) a = lo; if (lo > e) e = lo; if (la < b) b = la; if (la > f) f = la; }); let wrap = 0; if (e - a > 200) { a = 1e9; e = -1e9; r.forEach(([lo]) => { const u = lo < 0 ? lo + 360 : lo; if (u < a) a = u; if (u > e) e = u; }); wrap = 1; }   /* a piece that crosses the date line (Russia, Fiji): measure it on the far side of 180 */ const area = (e - a) * (f - b), mid = (a + e) / 2; if (!best || area > best.area) best = { area, x: px(wrap && mid > 180 ? mid - 360 : mid), y: py((b + f) / 2), w: px(e) - px(a) }; }); c.lab = best || { area: 0, x: 0, y: 0, w: 0 }; }
      const size = 10 * k, name = c.name.toUpperCase(), width = name.length * size * 0.72;
      if (c.lab.w < width * 1.15 || !onScreen(unx(c.lab.x), uny(c.lab.y), 0) || !free(c.lab.x - width / 2, c.lab.y - size, width, size * 1.4)) return;
      text(c.lab.x, c.lab.y, name, size, { 'text-anchor': 'middle', 'letter-spacing': size * 0.12, fill: pal.border, 'font-weight': 600, 'stroke-width': size * 0.2 });
    });
    let n = 0;
    for (const p of basemap.places) {                                                  // places are sorted biggest first, so big ones win any clash
      if (p[3] < deg || n > 90) continue;
      const pos = onScreen(p[1], p[2], 0); if (!pos) continue;
      const size = (p[4] ? 12.5 : 11) * k, width = p[0].length * size * 0.56;
      if (!free(pos[0] - size * 0.4, pos[1] - size, width + size, size * 1.6)) continue;
      el('circle', { cx: pos[0], cy: pos[1], r: (p[4] ? 3 : 2.2) * k, fill: pal.text, stroke: pal.halo, 'stroke-width': 0.8 * k }, svg);
      text(pos[0] + 5 * k, pos[1] + 3.5 * k, p[0], size, p[4] ? { 'font-weight': 600 } : {});
      n++;
    }
  }
  /** The travelled roads as one path, drawn on top in the accent colour. */
  function buildHot() { hotPath = ''; if (!matched) return; matched.ways.forEach((w, wi) => w.pts.forEach((p, si) => { if (si && matched.travelled.has(wi + ':' + si)) hotPath += 'M' + pt(w.pts[si - 1]) + 'L' + pt(p); })); }
  const resetMatch = () => { matched = null; hotPath = ''; };
  /** After the map moves, load the road tiles for what is on screen (from this site, no outside server), a moment after the movement stops. */
  function scheduleTiles() {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(async () => {
      if (!tileInfo || !tileInfo.any) return;
      const r = await TMtiles.forView(viewBox(), $('withpaths').checked);
      viewWays = r.ways; draw(true);
      $('roadnote').textContent = r.level ? (r.capped ? 'Zoom in a little: too many map tiles are in view to show them all.' : '') : 'Zoom in to see roads.';
    }, 200);
  }
  function draw(skipLoad) {
    const svg = $('map'); svg.replaceChildren(); svg.setAttribute('viewBox', [view.x, view.y, view.w, view.h].map((n) => +n.toFixed(5)).join(' '));
    const pal = palette();
    el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: pal.sea }, svg);                       // the sea
    (countries || []).forEach((c) => { const p = el('path', { d: c.d, fill: visited().has(c.name) ? pal.visited : pal.land, stroke: pal.border, 'stroke-width': 0.6, 'vector-effect': 'non-scaling-stroke' }, svg); const t = el('title', {}, p); t.textContent = c.name + (visited().has(c.name) ? ' (visited)' : ''); });
    drawWaterAndRoads(svg, pal);
    if (hotPath) el('path', { d: hotPath, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round' }, svg);
    drawLabels(svg, pal);
    const t = trip(), r = 5 * view.w / (svg.clientWidth || 900);                           // pin radius in screen pixels, whatever the zoom
    t.routes.forEach((rt) => { if (rt.pts.length > 1) el('polyline', { points: rt.pts.map((p) => f5(px(p[0])) + ',' + f5(py(p[1]))).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': haveRoads() ? 1.2 : 2.5, 'stroke-dasharray': haveRoads() ? '4 3' : '', 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, svg); });
    sorted().forEach((s, i) => { const g = el('g', {}, svg); el('circle', { cx: f5(px(s.lon)), cy: f5(py(s.lat)), r: r, fill: s.photo ? 'var(--ink)' : 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': r * 0.3 }, g); const tt = el('title', {}, g); tt.textContent = (i + 1) + '. ' + s.name + (s.date ? ' (' + s.date + ')' : '') + (s.note ? ': ' + s.note : ''); });
    lists();
    if (!skipLoad) scheduleTiles();
  }
  const sorted = () => trip().steps.slice().sort((a, b) => ((a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : 0));
  let visitedCache = null;
  /** The set of country names that contain at least one of the steps or route points of this trip. */
  function visited() {
    if (!visitedCache) { const s = new Set(), t = trip(); if (countries) { t.steps.forEach((p) => { const c = countryAt(p.lon, p.lat); if (c) s.add(c); }); t.routes.forEach((rt) => rt.pts.filter((_, i) => i % 25 === 0).forEach((p) => { const c = countryAt(p[0], p[1]); if (c) s.add(c); })); } visitedCache = s; }
    return visitedCache;
  }
  function lists() {
    const t = trip(), st = sorted(), ul = $('timeline');
    ul.replaceChildren(...st.map((s, i) => { const li = document.createElement('li'), go = document.createElement('button'), rm = document.createElement('button'); go.type = rm.type = 'button'; go.textContent = (i + 1) + '. ' + (s.date ? s.date + '  ' : '') + (s.photo ? 'Photo: ' : '') + s.name; rm.textContent = 'Remove'; rm.setAttribute('aria-label', 'Remove ' + s.name);
      go.addEventListener('click', () => { fit([s.lon - 0.5, s.lat - 0.5, s.lon + 0.5, s.lat + 0.5]); });
      rm.addEventListener('click', () => { t.steps = t.steps.filter((x) => x.id !== s.id); visitedCache = null; save(); draw(); }); li.append(go, ' ', rm); return li; }));
    /* trip statistics */
    let km = 0; st.forEach((s, i) => { if (i) km += R.dist([st[i - 1].lon, st[i - 1].lat], [s.lon, s.lat]) / 1000; });
    const routeKm = t.routes.reduce((a, rt) => a + R.length(rt.pts) / 1000, 0), dates = st.map((s) => s.date).filter(Boolean), days = dates.length ? Math.round((new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000) + 1 : 0;
    const v = [...visited()].sort();
    $('stats').textContent = st.length + ' steps · ' + (days ? days + ' days · ' : '') + v.length + (v.length === 1 ? ' country' : ' countries') + ' · ' + Math.round(km).toLocaleString('en-GB') + ' km in a straight line between steps' + (routeKm ? ' · ' + Math.round(routeKm).toLocaleString('en-GB') + ' km of routes' : '');
    $('countrylist').textContent = v.length ? 'Countries: ' + v.join(', ') : '';
    /* trip picker */
    const sel = $('tripsel'); sel.replaceChildren(...data.trips.map((x) => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; if (x.id === data.cur) o.selected = true; return o; }));
    /* roads panel */
    const n = ways.length + viewWays.length;
    $('roadstats').textContent = n ? n.toLocaleString('en-GB') + ' road pieces on screen' + (matched ? '' : '. Press "Highlight roads I travelled".') : 'No roads on screen.';
    $('count').textContent = view.w < 25 && !haveRoads() && !(tileInfo && tileInfo.any) ? 'You are zoomed in past the country outlines, so there is nothing to see here until roads are loaded (see Roads below) or you zoom out.' : (viewWays.length && tileInfo ? tileInfo.credits.join('. ') + '.' : '');
  }
  /** Zoom the map to a box [west, south, east, north]. A square view is used because the map is square. */
  function fit(b) { const x0 = px(b[0]), x1 = px(b[2]), y0 = py(b[3]), y1 = py(b[1]), w = Math.max(0.01, x1 - x0, y1 - y0) * 1.15, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; view = { x: Math.max(0, Math.min(SIZE - w, cx - w / 2)), y: Math.max(0, Math.min(SIZE - w, cy - w / 2)), w, h: w }; draw(); }
  const zoom = (f, cx, cy) => { const nw = Math.max(0.01, Math.min(SIZE, view.w * f)); cx = cx == null ? view.x + view.w / 2 : cx; cy = cy == null ? view.y + view.h / 2 : cy; view = { x: Math.max(0, Math.min(SIZE - nw, cx - (cx - view.x) * nw / view.w)), y: Math.max(0, Math.min(SIZE - nw, cy - (cy - view.y) * nw / view.w)), w: nw, h: nw }; draw(); };
  const at = (e) => { const r = $('map').getBoundingClientRect(); return [view.x + ((e.clientX - r.left) / r.width) * view.w, view.y + ((e.clientY - r.top) / r.height) * view.h]; };

  /* ---------------------------------------------------------------- reading files */
  const thin = (p) => (p.length > 1500 ? p.filter((_, i) => i % Math.ceil(p.length / 1500) === 0 || i === p.length - 1) : p);   // keep long routes to about 1500 points
  const addStep = (o) => trip().steps.push({ id: uid(), name: o.name || 'Place', lat: o.lat, lon: o.lon, date: o.date || '', note: o.note || '', photo: !!o.photo, sample: !!o.sample });
  const addRoute = (o) => { if (o.pts.length > 1) trip().routes.push({ id: uid(), name: o.name || 'Route', date: o.date || '', pts: thin(o.pts), sample: !!o.sample, road: !!o.road }); };
  function readGPX(txt) { const d = new DOMParser().parseFromString(txt, 'text/xml'), pts = [...d.querySelectorAll('trkpt, rtept')].map((n) => [Number(n.getAttribute('lon')), Number(n.getAttribute('lat'))]), name = (d.querySelector('trk > name, rte > name, metadata > name') || {}).textContent || 'GPX route', tm = (d.querySelector('trkpt time, metadata time') || {}).textContent; addRoute({ name, date: tm ? tm.slice(0, 10) : '', pts }); d.querySelectorAll('wpt').forEach((n) => addStep({ name: (n.querySelector('name') || {}).textContent, lat: Number(n.getAttribute('lat')), lon: Number(n.getAttribute('lon')) })); }
  function readKML(txt) { const d = new DOMParser().parseFromString(txt, 'text/xml'); d.querySelectorAll('Placemark').forEach((pm) => { const name = (pm.querySelector('name') || {}).textContent || 'Place', co = pm.querySelector('coordinates'); if (!co) return; const pts = co.textContent.trim().split(/\s+/).map((s) => s.split(',').map(Number)).filter((a) => a.length >= 2 && isFinite(a[0])).map((a) => [a[0], a[1]]); if (pm.querySelector('LineString')) addRoute({ name, pts }); else if (pts[0]) addStep({ name, lon: pts[0][0], lat: pts[0][1] }); }); }
  function readGeo(txt) { const j = JSON.parse(txt), fs = j.type === 'FeatureCollection' ? j.features : [j.type === 'Feature' ? j : { type: 'Feature', geometry: j, properties: {} }]; fs.forEach((f) => { const g = f.geometry || {}, p = f.properties || {}, name = p.name || p.title || 'Imported'; if (g.type === 'Point') addStep({ name, lon: g.coordinates[0], lat: g.coordinates[1], date: p.date }); if (g.type === 'LineString') addRoute({ name, date: p.date, pts: g.coordinates.map((c) => [c[0], c[1]]) }); if (g.type === 'MultiLineString') g.coordinates.forEach((l) => addRoute({ name, pts: l.map((c) => [c[0], c[1]]) })); }); }
  /** Read the GPS position and date from a JPEG photo's EXIF block (in the browser; the photo itself is not kept). */
  function exif(buf) { const v = new DataView(buf); if (v.getUint16(0) !== 0xffd8) return null; let o = 2; while (o < v.byteLength - 4) { const m = v.getUint16(o), len = v.getUint16(o + 2); if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return parseTiff(v, o + 10); if ((m & 0xff00) !== 0xff00) break; o += 2 + len; } return null; }
  function parseTiff(v, b) {
    const le = v.getUint16(b) === 0x4949, u16 = (o) => v.getUint16(o, le), u32 = (o) => v.getUint32(o, le), size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };
    const ifd = (off) => { const out = {}, n = u16(b + off); for (let i = 0; i < n; i++) { const e = b + off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), bytes = (size[type] || 1) * cnt, vo = bytes > 4 ? b + u32(e + 8) : e + 8; out[tag] = { type, cnt, vo }; } return out; };
    const rat = (vo, i) => v.getUint32(vo + i * 8, le) / (v.getUint32(vo + i * 8 + 4, le) || 1), str = (t) => { let s = ''; for (let i = 0; i < t.cnt - 1; i++) s += String.fromCharCode(v.getUint8(t.vo + i)); return s; };
    const i0 = ifd(u32(b + 4)), res = {};
    if (i0[0x8769]) { const ex = ifd(u32(i0[0x8769].vo)); if (ex[0x9003]) res.date = str(ex[0x9003]).slice(0, 10).replace(/:/g, '-'); }
    if (i0[0x8825]) { const g = ifd(u32(i0[0x8825].vo)); if (g[2] && g[4]) { const dms = (t) => rat(t.vo, 0) + rat(t.vo, 1) / 60 + rat(t.vo, 2) / 3600; res.lat = dms(g[2]) * (str(g[1]) === 'S' ? -1 : 1); res.lon = dms(g[4]) * (str(g[3]) === 'W' ? -1 : 1); } }
    return res.lat != null ? res : null;
  }

  /* ---------------------------------------------------------------- sample and practice data (clearly made up) */
  /** A made-up rail trip so you can see how trips look. Dates are relative to today. */
  function sample() {
    const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), t = { id: uid(), name: 'Sample rail trip (made up)', steps: [], routes: [], sample: true };
    data.trips.push(t); data.cur = t.id; visitedCache = null;
    [['London', 51.5, -0.12, 20], ['Paris', 48.86, 2.35, 18], ['Zurich', 47.38, 8.54, 15], ['Milan', 45.46, 9.19, 13], ['Florence', 43.77, 11.26, 11], ['Rome', 41.9, 12.5, 9]].forEach(([name, lat, lon, ago]) => addStep({ name, lat, lon, date: day(ago), note: 'Sample', sample: true }));
    addRoute({ name: 'Sample rail trip', pts: t.steps.map((s) => [s.lon, s.lat]), sample: true });
  }
  /** A tiny invented street grid (a 12 by 12 block "town" in the sea off West Africa, where there is no real town) and a route through it,
      so you can try "Highlight roads I travelled" with no internet and no files. Nothing here is a real place. */
  function practice() {
    const o = [0.0, 0.0], gap = 0.002, n = 12; ways = [];
    for (let i = 0; i <= n; i++) {
      ways.push({ id: 'pe' + i, name: 'Made-up Street ' + (i + 1), ref: '', kind: 'residential', path: false, pts: [[o[0], o[1] + i * gap], [o[0] + n * gap, o[1] + i * gap]] });
      ways.push({ id: 'pn' + i, name: 'Made-up Avenue ' + (i + 1), ref: '', kind: 'residential', path: false, pts: [[o[0] + i * gap, o[1]], [o[0] + i * gap, o[1] + n * gap]] });
    }
    ways.push({ id: 'pp', name: 'Made-up Footpath', ref: '', kind: 'footway', path: true, pts: [[o[0] + 0.0005, o[1] + 0.0005], [o[0] + 0.0235, o[1] + 0.0235]] });
    R.subdivide(ways);
    const t = { id: uid(), name: 'Practice area (made up)', steps: [], routes: [], sample: true }; data.trips.push(t); data.cur = t.id; visitedCache = null;
    const route = [[0.0, 0.0], [0.008, 0.0], [0.008, 0.012], [0.016, 0.012], [0.016, 0.02], [0.024, 0.02]];
    addStep({ name: 'Start', lon: route[0][0], lat: route[0][1], date: today(), sample: true }); addStep({ name: 'Finish', lon: route[5][0], lat: route[5][1], date: today(), sample: true }); addRoute({ name: 'Practice drive', pts: route, sample: true });
    resetMatch(); viewWays = []; fit([-0.002, -0.002, 0.026, 0.026]);
  }

  /* ---------------------------------------------------------------- roads: consent, fetch, match */
  /** Ask for consent, showing exactly what will be sent. Returns true if the person says yes. */
  const consent = (what, where, sent) => confirm('This will contact ' + where + ' (a server run by someone else).\n\nWhat is sent: ' + sent + '\n\nIt also sees your internet address, as any website does. Nothing is stored by this site.\n\n' + what + '\n\nContinue?');
  /** The box for the roads fetch: around the current trip (steps and routes), or the part of the map on screen if the trip is empty. */
  function roadBox() {
    const t = trip(), pts = t.steps.map((s) => [s.lon, s.lat]).concat(...t.routes.map((r) => r.pts));
    return pts.length ? R.bboxOf(pts, 0.005) : [uny(view.y + view.h), unx(view.x), uny(view.y), unx(view.x + view.w)];
  }
  const MAXDEG = 0.6;                                                       // biggest box we will ask for (about 65 km), to be kind to the free server
  async function fetchRoads() {
    const b = roadBox(); if (b[2] - b[0] > MAXDEG || b[3] - b[1] > MAXDEG) { say('That area is too big for a free fetch (the limit is about ' + MAXDEG + ' degrees across). Zoom in on part of the trip, or load a roads file instead.'); return; }
    const q = R.overpassQuery(b, $('opaths').checked), server = $('overpass').value, host = new URL(server).host;
    if (!consent('Roads' + ($('opaths').checked ? ' and paths' : '') + ' inside the box will be returned and kept in this page only.', 'an OpenStreetMap Overpass server (' + host + ')', 'this query only, no names or trip details:\n\n' + q)) return;
    say('Asking OpenStreetMap for roads... this can take up to a minute.'); $('fetchroads').disabled = true;
    try {
      const res = await fetch(server, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      if ([429, 502, 503, 504].includes(res.status)) throw new Error('That free server is busy or down right now (error ' + res.status + '). This is common. Wait a minute and try again, or pick the other server in the list. Nothing is wrong with your data.');
      if (!res.ok) throw new Error('The server answered with an error (' + res.status + ').');
      ways = R.subdivide(R.parseOverpass(await res.json())); resetMatch(); say(ways.length ? 'Loaded ' + ways.length + ' road pieces. Road data © OpenStreetMap contributors (ODbL).' : 'No roads found in that box.'); fit([b[1], b[0], b[3], b[2]]);
    } catch (e) { say(e.message || 'Could not reach the server. You can load a roads file instead.'); } finally { $('fetchroads').disabled = false; }
  }
  async function highlight() {
    const routes = trip().routes.map((r) => r.pts); if (!routes.length) { say('This trip has no route yet. Import a GPX/KML/GeoJSON route, paste a Google Maps link, or draw one by road.'); return; }
    let use = ways.slice();
    if (tileInfo && tileInfo.any) {                                                       // full-detail roads from this site's tiles, only where the route goes
      say('Loading the roads along your route...');
      const r = await TMtiles.forRoute([].concat(...routes.map((rt) => R.densify(rt, 500))), $('withpaths').checked, (d, t) => say('Loading roads: ' + d + ' of ' + t + ' map tiles'));
      if (r.tooBig) { say('This route touches ' + r.tooBig + ' map tiles, which is more than one go can handle. Try a shorter route or one trip leg at a time.'); return; }
      use = use.concat(r.ways); say('');
    }
    if (!use.length) { say('No road data covers this route. Zoom in somewhere in Great Britain once the site\'s road tiles are built, load a roads file, or try the practice area.'); return; }
    R.subdivide(use, 40); matched = R.match(routes, use, { tolerance: Number($('tol').value) || 20 }); buildHot(); const s = R.stats(matched); draw();
    $('roadresult').textContent = s.doneKm.toFixed(1) + ' km travelled of ' + s.totalKm.toFixed(1) + ' km of road along your route (' + Math.round(s.share * 100) + '%).' + (s.names.length ? ' Roads: ' + s.names.slice(0, 15).map((n) => n[0] + ' ' + n[1].toFixed(1) + ' km').join(', ') + (s.names.length > 15 ? ' and ' + (s.names.length - 15) + ' more' : '') + '.' : '');
  }
  async function routeByRoad() {
    const st = sorted(); if (st.length < 2) { say('Add at least two steps first.'); return; }
    const prof = $('profile').value, stops = st.map((s) => [s.lon, s.lat]), url = R.routeUrl(stops, prof);
    if (stops.length > 25) { say('Too many steps for one request (25 at most).'); return; }
    if (!consent('The road route between your steps will be drawn on the map.', 'the OSRM routing service run by FOSSGIS (routing.openstreetmap.de)', 'the coordinates of your ' + stops.length + ' steps, in the web address:\n\n' + url)) return;
    say('Asking for the route...');
    try { const res = await fetch(url); if (!res.ok) throw new Error('The routing server answered with an error (' + res.status + ').'); const j = await res.json(); if (!j.routes || !j.routes[0]) throw new Error('No road route found between those steps.'); addRoute({ name: 'By road (' + prof + ')', pts: j.routes[0].geometry.coordinates, road: true }); save(); draw(); say('Route added: ' + (j.routes[0].distance / 1000).toFixed(1) + ' km by road, according to the routing server. Routing © OpenStreetMap contributors.'); }
    catch (e) { say(e.message || 'Could not reach the routing server.'); }
  }
  function googleLink() {
    const stops = R.parseGoogleLink($('glink').value.trim()); if (!stops.length) { say('No stops found. Paste the full address from the browser (not a short maps.app.goo.gl link).'); return; }
    const withXY = stops.filter((s) => s.lon != null); withXY.forEach((s) => addStep({ name: s.name, lat: s.lat, lon: s.lon, date: today() }));
    if (withXY.length > 1) addRoute({ name: 'From Google Maps link', pts: withXY.map((s) => [s.lon, s.lat]) });
    save(); draw(); say(withXY.length ? 'Added ' + withXY.length + ' stops' + (withXY.length < stops.length ? ' (' + (stops.length - withXY.length) + ' had a name but no coordinates in the link, so were skipped: this page does not look places up on other sites)' : '') + '. Use "Draw the route by road" to get the roads between them.' : 'The link had place names (' + stops.map((s) => s.name).join(', ') + ') but no coordinates, and looking names up would mean contacting another site. Pin them by clicking the map instead.');
  }
  const download = (obj, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/geo+json' })); a.download = name; document.body.append(a); a.click(); a.remove(); };

  /* ---------------------------------------------------------------- the shared My Data and Example Data tabs (see shell.js) */
  const allGeo = () => ({ type: 'FeatureCollection', features: [].concat(...data.trips.map((t) => [...t.steps.map((p) => ({ type: 'Feature', properties: { trip: t.name, name: p.name, date: p.date, note: p.note }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })), ...t.routes.map((r) => ({ type: 'Feature', properties: { trip: t.name, name: r.name, date: r.date }, geometry: { type: 'LineString', coordinates: r.pts } }))])) });
  const reloadTo = (msg) => { PBEshell.flash(msg); try { history.replaceState(null, '', '#example-data'); } catch (e) { /* ignore */ } location.reload(); };
  PBEshell.custom({
    id: 'travel-map', title: 'Travel Map',
    summary: () => [['Trips', data.trips.length], ['Steps', data.trips.reduce((n, t) => n + t.steps.length, 0)], ['Routes', data.trips.reduce((n, t) => n + t.routes.length, 0)]],
    md: () => '# Travel Map\n\nExported ' + today() + '\n' + data.trips.map((t) => '\n## ' + t.name + '\n\n| # | Date | Step | Latitude | Longitude | Note |\n| --- | --- | --- | --- | --- | --- |\n' + t.steps.slice().sort((x, y) => ((x.date || '') < (y.date || '') ? -1 : 1)).map((s, i) => '| ' + (i + 1) + ' | ' + (s.date || '') + ' | ' + s.name.replace(/\|/g, '/') + ' | ' + s.lat + ' | ' + s.lon + ' | ' + (s.note || '').replace(/\|/g, '/') + ' |').join('\n') + '\n\nRoutes: ' + t.routes.length + '\n').join(''),
    csv: () => [{ name: 'travel-map-steps.csv', text: 'trip,date,step,latitude,longitude,note\n' + [].concat(...data.trips.map((t) => t.steps.map((s) => [t.name, s.date, s.name, s.lat, s.lon, s.note].map(PBEshell.csvCell).join(',')))).join('\n') + '\n' }],
    extra: [{ label: 'Download as GeoJSON (for other map tools)', fn: () => download(allGeo(), 'my-travel-map.geojson') }],
    backup: () => ({ tool: 'travel-map', saved: today(), data: { trips: data.trips, cur: data.cur } }),
    restore: (b) => { if (!b || b.tool !== 'travel-map' || !b.data || !b.data.trips) return false; data = { trips: b.data.trips, cur: b.data.cur }; ensure(); save(); reloadTo('Backup restored.'); return true; },
    clear: () => { data = { trips: [], cur: null }; ensure(); save(); reloadTo('All data was deleted from this browser.'); },
    load: () => { sample(); save(); reloadTo('Example trip loaded: open the Map and Trips tabs.'); },
    remove: () => { data.trips = data.trips.filter((t) => !t.sample); ensure(); save(); reloadTo('Example data removed.'); },
  });

  /** If the tiles are missing, read the small report the monthly build leaves on the site, so the page can say what happened. */
  async function buildReport() {
    try {
      const r = await fetch('roads-status.json'); if (!r.ok) { $('tileinfo').textContent += ' No build report was found either, so the monthly build has probably not run since this feature was added (see the Actions tab on GitHub).'; return; }
      const j = await r.json(); $('tileinfo').textContent += ' Last build report (' + j.month + '): roads ' + j.roads + ', paths ' + j.paths + (j.cached === 'true' ? ' (tiles came from the cache)' : '') + '. If a step says "failure", its short log is at travel-map/roads-build-os.log or roads-build-paths.log on the site.';
    } catch (e) { /* no report: nothing to add */ }
  }
  /* ---------------------------------------------------------------- wiring up the page */
  document.addEventListener('DOMContentLoaded', async () => {
    load(); const svg = $('map'); let drag = null;
    TMtiles.init().then((i) => { tileInfo = i; $('tileinfo').textContent = i.any ? 'Street map from this site (built ' + i.built + '): ' + i.credits.join('. ') + '. Zoom in to see roads' + (i.hasPaths ? '; footpaths and tracks appear when you zoom in close.' : '. Footpaths and tracks are not built yet.') : 'The street-map tiles have not been built yet (they are made by a monthly job on this site). Until then you can load a roads file, try the practice area, or ask OpenStreetMap directly (under the heading below).'; $('tilestatus').textContent = i.any ? '' : 'No street-map tiles on this site yet, so only country outlines show. See Roads below.'; if (!i.any) buildReport(); draw(); });
    window.addEventListener('resize', () => draw());                      // redraw when the Map tab is shown again (pin sizes depend on the map's width on screen)
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const [cx, cy] = at(e); zoom(e.deltaY > 0 ? 1.25 : 0.8, cx, cy); }, { passive: false });
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', (e) => { if (!drag) return; const r = svg.getBoundingClientRect(), dx = ((e.clientX - drag.x) / r.width) * view.w, dy = ((e.clientY - drag.y) / r.height) * view.h; if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true; if (drag.moved) { view.x = Math.max(0, Math.min(SIZE - view.w, drag.vx - dx)); view.y = Math.max(0, Math.min(SIZE - view.h, drag.vy - dy)); svg.setAttribute('viewBox', [view.x, view.y, view.w, view.h].map((n) => +n.toFixed(5)).join(' ')); } });
    svg.addEventListener('pointerup', (e) => { const was = drag; drag = null; if (was && !was.moved && mode === 'pin') { const [x, y] = at(e); addStep({ name: $('pinname').value.trim() || 'Place', lat: Number(uny(y).toFixed(5)), lon: Number(unx(x).toFixed(5)), date: $('pindate').value || today() }); visitedCache = null; save(); } draw(); });
    $('zin').addEventListener('click', () => zoom(0.6)); $('zout').addEventListener('click', () => zoom(1.6)); $('home').addEventListener('click', () => { view = { x: 0, y: 0, w: SIZE, h: SIZE }; draw(); });
    $('uk').addEventListener('click', () => fit([-11, 49, 2.5, 61])); $('eu').addEventListener('click', () => fit([-12, 34, 30, 62]));
    $('fittrip').addEventListener('click', () => { const t = trip(), pts = t.steps.map((s) => [s.lon, s.lat]).concat(...t.routes.map((r) => r.pts)); if (pts.length) { const b = R.bboxOf(pts, 0.01); fit([b[1], b[0], b[3], b[2]]); } });
    $('modepin').addEventListener('click', () => { mode = mode === 'pin' ? 'pan' : 'pin'; $('modepin').setAttribute('aria-pressed', mode === 'pin'); $('modepin').textContent = mode === 'pin' ? 'Pin mode on: click the map' : 'Add a step by clicking'; });
    /* trips */
    $('tripsel').addEventListener('change', (e) => { data.cur = e.target.value; visitedCache = null; resetMatch(); save(); draw(); });
    $('newtrip').addEventListener('click', () => { const n = $('tripname').value.trim(); if (!n) { say('Type a trip name first.'); return; } const t = { id: uid(), name: n, steps: [], routes: [] }; data.trips.push(t); data.cur = t.id; $('tripname').value = ''; visitedCache = null; save(); draw(); });
    $('renametrip').addEventListener('click', () => { const n = $('tripname').value.trim(); if (!n) { say('Type the new name first.'); return; } trip().name = n; $('tripname').value = ''; save(); draw(); });
    $('deltrip').addEventListener('click', () => { if (!confirm('Delete the trip "' + trip().name + '" from this browser?')) return; data.trips = data.trips.filter((t) => t.id !== data.cur); ensure(); visitedCache = null; save(); draw(); });
    /* import */
    $('files').addEventListener('change', async (e) => { for (const f of e.target.files) { try { if (/\.gpx$/i.test(f.name)) readGPX(await f.text()); else if (/\.kml$/i.test(f.name)) readKML(await f.text()); else if (/\.(geo)?json$/i.test(f.name)) readGeo(await f.text()); else if (/\.jpe?g$/i.test(f.name)) { const r = exif(await f.arrayBuffer()); if (r) addStep({ name: 'Photo', lat: r.lat, lon: r.lon, date: r.date, photo: true }); else say('No GPS position found in ' + f.name + '.'); } } catch (err) { say('Could not read ' + f.name + '.'); } } visitedCache = null; save(); draw(); e.target.value = ''; });
    $('roadsfile').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { ways = R.subdivide(R.parseGeoJSON(JSON.parse(await f.text()))); resetMatch(); say(ways.length ? 'Loaded ' + ways.length + ' road pieces from your file (it stays on your device). Check the licence of the data you used.' : 'No lines found in that file. It should be GeoJSON with LineString features.'); draw(); } catch (err) { say('Could not read that roads file.'); } e.target.value = ''; });
    $('glinkgo').addEventListener('click', googleLink);
    $('withpaths').addEventListener('change', () => { viewWays = []; scheduleTiles(); });
    $('fetchroads').addEventListener('click', fetchRoads); $('highlight').addEventListener('click', highlight); $('routeroad').addEventListener('click', routeByRoad);
    $('practice').addEventListener('click', () => { practice(); save(); draw(); say('Practice area loaded: a made-up street grid and route. Press "Highlight roads I travelled".'); });
    $('clearroads').addEventListener('click', () => { ways = []; viewWays = []; resetMatch(); $('roadresult').textContent = ''; draw(); });
    $('dlroads').addEventListener('click', () => { if (!matched) { say('Highlight the roads first.'); return; } download({ type: 'FeatureCollection', features: matched.ways.map((w, wi) => ({ w, wi })).filter(({ w, wi }) => w.pts.some((_, si) => matched.travelled.has(wi + ':' + si))).map(({ w }) => ({ type: 'Feature', properties: { name: w.name, ref: w.ref, highway: w.kind, source: 'Contains data from OpenStreetMap contributors (ODbL) if fetched from OpenStreetMap' }, geometry: { type: 'LineString', coordinates: w.pts } })) }, 'roads-i-travelled.geojson'); });
    try { countries = topoPaths(await (await fetch('countries-50m.json')).json()); } catch (e) { say('The map outline could not load.'); }
    /* lakes, rivers and place names (files on this site; the map still works without them) */
    try { const w = await (await fetch('basemap/water.json')).json(); basemap.lakes = w.lakes.map((r) => 'M' + r.map(pt).join('L') + 'Z').join(''); basemap.rivers = w.rivers.map((l) => 'M' + l.map(pt).join('L')).join(''); } catch (e) { /* not built: plain map */ }
    try { basemap.places = await (await fetch('basemap/places.json')).json(); } catch (e) { /* not built: no place names */ }
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => draw(true));
    new MutationObserver(() => draw(true)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    visitedCache = null; draw();
  });
})();
