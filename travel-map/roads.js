/* roads.js: the road and path logic for the Travel Map. No map drawing in here, just the maths, so it is easy to read and test.

   What it does:
   1. overpassQuery   builds the question we would ask OpenStreetMap's Overpass service ("all roads inside this box")
   2. parseOverpass   turns its answer into a simple list of "ways" (a way is one road or path: a name and a line of points)
   3. parseGeoJSON    does the same for a roads file you bring yourself (for example exported from OS Open Roads or OpenStreetMap)
   4. match           snaps your routes onto the roads: which roads did you actually travel along?
   5. stats           how many kilometres of road there are in the area, and how many you have travelled
   6. routeUrl        builds a request to a routing service (OSRM) that draws the road route between your stops
   7. parseGoogleLink pulls the stops out of a pasted Google Maps directions link (best effort)

   Where the road data comes from, and the licences, is explained on the Travel Map page and in the README.
   A "way" looks like: { id, name, ref, kind, path (true for footpaths and the like), pts: [[lon, lat], ...] } */
const TMroads = (() => {
  'use strict';
  const MAIN = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'];
  const PATHS = ['footway', 'path', 'track', 'cycleway', 'bridleway', 'steps', 'pedestrian'];

  /** Distance in metres between two [lon, lat] points (haversine formula). */
  function dist(a, b) {
    const R = 6371008.8, rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  /** Length of a line of points in metres. */
  const length = (pts) => pts.reduce((s, p, i) => (i ? s + dist(pts[i - 1], p) : 0), 0);

  /** The Overpass question. bbox = [south, west, north, east]. withPaths adds footpaths, tracks, cycleways and so on. */
  function overpassQuery(bbox, withPaths) {
    const kinds = MAIN.concat(withPaths ? PATHS : []).join('|');
    return '[out:json][timeout:60];\nway["highway"~"^(' + kinds + ')$"](' + bbox.map((x) => x.toFixed(5)).join(',') + ');\nout tags geom;';
  }
  /** Turn an Overpass JSON answer into ways. */
  function parseOverpass(json) {
    return (json.elements || []).filter((e) => e.type === 'way' && e.geometry && e.geometry.length > 1).map((e) => ({
      id: 'w' + e.id, name: (e.tags && e.tags.name) || '', ref: (e.tags && e.tags.ref) || '', kind: (e.tags && e.tags.highway) || '',
      path: PATHS.includes(e.tags && e.tags.highway), pts: e.geometry.map((g) => [g.lon, g.lat]),
    }));
  }
  /** Turn a GeoJSON roads file into ways. Works with files from OpenStreetMap exports and with OS Open Roads (which uses names such as name1 and roadClassification). */
  function parseGeoJSON(gj) {
    const out = [];
    (gj.features || []).forEach((f, i) => {
      const g = f.geometry || {}, p = f.properties || {}, lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      const kind = p.highway || p.roadClassification || p.class || p.formOfWay || '';
      lines.forEach((l, j) => { if (l.length > 1) out.push({ id: 'g' + i + '_' + j, name: p.name || p.name1 || p.roadName || '', ref: p.ref || p.roadNumber || p.roadClassificationNumber || '', kind, path: PATHS.includes(kind) || /path|footway|track/i.test(kind), pts: l.map((c) => [c[0], c[1]]) }); });
    });
    return out;
  }
  /** Add extra points to long straight pieces (at most `step` metres apart). Without this a long road with two end points would count as
      "travelled" along its whole length even if you only drove a short part of it. */
  function subdivide(ways, step) { ways.forEach((w) => { w.pts = densify(w.pts, step || 40); }); return ways; }
  /** A box [south, west, north, east] around some [lon, lat] points, with a margin in degrees. */
  function bboxOf(pts, margin) {
    let s = 90, w = 180, n = -90, e = -180; pts.forEach(([lo, la]) => { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo); });
    return [s - margin, w - margin, n + margin, e + margin];
  }

  /* ---------------------------------------------------------------- matching a route to roads */
  /** Spread points along a route so they are at most `step` metres apart, so no road is skipped between two far-apart points. */
  function densify(pts, step) {
    const out = [];
    pts.forEach((p, i) => { if (!i) { out.push(p); return; } const d = dist(pts[i - 1], p), n = Math.max(1, Math.ceil(d / step)); for (let k = 1; k <= n; k++) out.push([pts[i - 1][0] + ((p[0] - pts[i - 1][0]) * k) / n, pts[i - 1][1] + ((p[1] - pts[i - 1][1]) * k) / n]); });
    return out;
  }
  const CELL = 0.002;                                                                // grid cell size in degrees (about 200 m)
  /** A grid so we only compare a point with nearby road pieces instead of every road. */
  function buildGrid(ways) {
    const g = new Map();
    ways.forEach((w, wi) => w.pts.forEach((p, si) => {
      if (!si) return; const a = w.pts[si - 1], x0 = Math.floor(Math.min(a[0], p[0]) / CELL), x1 = Math.floor(Math.max(a[0], p[0]) / CELL), y0 = Math.floor(Math.min(a[1], p[1]) / CELL), y1 = Math.floor(Math.max(a[1], p[1]) / CELL);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + ',' + y; if (!g.has(k)) g.set(k, []); g.get(k).push([wi, si]); }
    }));
    return g;
  }
  /** Distance in metres from point p to the segment a-b, using a flat local approximation (fine over a few hundred metres). */
  function toSegment(p, a, b) {
    const kx = Math.cos((p[1] * Math.PI) / 180) * 111320, ky = 110540, ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
    return Math.hypot(ax + t * dx, ay + t * dy);
  }
  /** Snap routes to roads.
      routes: lists of [lon, lat] points. opts: tolerance (metres, default 20), minHits (a road needs this many matching points to count, default 3).
      Returns { travelled: Set of "wayIndex:segmentIndex", ways: the ways list }.
      How: for each point (spread to 15 m apart) find the nearest road piece within the tolerance. Staying on the same road as the
      previous point is favoured (a small penalty for switching), so a side road that you only cross is not counted unless several
      points match it. This is a simple method, not a full map matcher: a proper one (such as Valhalla's Meili) weighs the whole
      route at once and copes better with poor GPS. */
  function match(routes, ways, opts) {
    opts = opts || {}; const tol = opts.tolerance || 20, minHits = opts.minHits || 3, grid = buildGrid(ways), hits = new Map(), wayHits = new Map();
    routes.forEach((r) => {
      let prev = -1;
      densify(r, 15).forEach((p) => {
        const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL); let best = null, bd = 1e9;
        for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) (grid.get(x + ',' + y) || []).forEach(([wi, si]) => { const w = ways[wi], d = toSegment(p, w.pts[si - 1], w.pts[si]), score = d + (wi === prev || prev < 0 ? 0 : 6); if (d <= tol && score < bd) { bd = score; best = [wi, si]; } });
        if (best) { const k = best[0] + ':' + best[1]; hits.set(k, (hits.get(k) || 0) + 1); wayHits.set(best[0], (wayHits.get(best[0]) || 0) + 1); prev = best[0]; } else prev = -1;
      });
    });
    const travelled = new Set(); hits.forEach((_, k) => { if ((wayHits.get(Number(k.split(':')[0])) || 0) >= minHits) travelled.add(k); });
    return { travelled, ways };
  }
  /** Totals: kilometres of road in the area, kilometres travelled, the share, and the names of roads travelled. */
  function stats(m) {
    let total = 0, done = 0; const names = new Map();
    m.ways.forEach((w, wi) => w.pts.forEach((p, si) => { if (!si) return; const d = dist(w.pts[si - 1], p); total += d; if (m.travelled.has(wi + ':' + si)) { done += d; const n = w.name || w.ref; if (n) names.set(n, (names.get(n) || 0) + d); } }));
    return { totalKm: total / 1000, doneKm: done / 1000, share: total ? done / total : 0, names: [...names.entries()].sort((a, b) => b[1] - a[1]).map(([n, d]) => [n, d / 1000]) };
  }

  /* ---------------------------------------------------------------- routing and links */
  /** The address to ask a routing service for the road route through some stops. profile: 'car', 'bike' or 'foot'.
      These are the public FOSSGIS OSRM servers; they are a free community service, so please be gentle. Change the address here if it moves. */
  function routeUrl(stops, profile) {
    const p = { car: 'routed-car', bike: 'routed-bike', foot: 'routed-foot' }[profile] || 'routed-car';
    return 'https://routing.openstreetmap.de/' + p + '/route/v1/driving/' + stops.map((s) => s[0].toFixed(5) + ',' + s[1].toFixed(5)).join(';') + '?overview=full&geometries=geojson';
  }
  /** Stops from a pasted Google Maps directions link. Best effort: Google's link format is not documented and can change.
      Returns [{name, lon, lat}] (lon and lat are null when the link did not contain coordinates). Short links (maps.app.goo.gl) do not work: open the link and paste the full address. */
  function parseGoogleLink(url) {
    let names = []; const m = url.match(/\/maps\/dir\/([^?]*?)(\/@|\/data=|$)/); if (m) names = m[1].split('/').filter(Boolean).map((s) => decodeURIComponent(s.replace(/\+/g, ' ')));
    const coords = []; const re = /!1d(-?\d+\.\d+)!2d(-?\d+\.\d+)/g; let c; while ((c = re.exec(url))) { const p = [Number(c[1]), Number(c[2])]; if (!coords.length || coords[coords.length - 1][0] !== p[0] || coords[coords.length - 1][1] !== p[1]) coords.push(p); }
    const n = Math.max(names.length, coords.length), out = [];
    for (let i = 0; i < n; i++) { const nm = names[i] || ('Stop ' + (i + 1)), asCoord = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(nm) ? nm.split(',').map(Number) : null; out.push({ name: asCoord ? 'Stop ' + (i + 1) : nm, lon: coords[i] ? coords[i][0] : asCoord ? asCoord[1] : null, lat: coords[i] ? coords[i][1] : asCoord ? asCoord[0] : null }); }
    return out;
  }
  return { dist, length, overpassQuery, parseOverpass, parseGeoJSON, bboxOf, densify, subdivide, match, stats, routeUrl, parseGoogleLink, MAIN, PATHS };
})();
if (typeof module !== 'undefined') module.exports = TMroads;
