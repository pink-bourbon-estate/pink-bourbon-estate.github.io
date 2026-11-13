/* roadtiles.js: reads the road tiles that are published with this site (see .github/scripts/build_roads.py).

   The tiles are small JSON files in travel-map/roads-data/. They are made once a month from open data, so the Travel Map never
   has to ask another server for roads. Two sets may exist:
     os     roads of Great Britain from Ordnance Survey's OS Open Roads (Open Government Licence)
     paths  footpaths, tracks, cycleways and bridleways from OpenStreetMap (ODbL licence)
   If the files are not there yet (the monthly build has not run), everything here quietly reports "no tiles".

   There are three levels of detail: 1 = motorways and A roads (zoomed out), 2 = plus B roads, 3 = everything (zoomed in).
   A "way" is { id, name, ref, cls, path, pts: [[lon, lat], ...], bb: [west, south, east, north] }, the same shape roads.js uses.
   Class numbers: 0 motorway, 1 A road, 2 B road, 3 other classified, 4 minor, 5 footpath, 6 track, 7 cycleway, 8 bridleway. */
const TMtiles = (() => {
  'use strict';
  const BASE = 'roads-data/', SETS = ['os', 'paths'], KINDS = ['motorway', 'a_road', 'b_road', 'classified', 'minor', 'footway', 'track', 'cycleway', 'bridleway'];
  const sets = {};                                                           // name -> { index, have: {level: Set of tile keys}, tiles: Map(url -> Promise of ways) }
  const MAX_TILES = 900;                                                     // never ask for more than this many files at once

  /** Look for the index files. Returns { any, built, credits }. Safe to call more than once. */
  async function init() {
    await Promise.all(SETS.map(async (name) => {
      if (sets[name]) return;
      try {
        const r = await fetch(BASE + name + '/index.json'); if (!r.ok) return;
        const index = await r.json(), have = {}; Object.keys(index.levels).forEach((lv) => { have[lv] = new Set(index.levels[lv].tiles); });
        sets[name] = { index, have, tiles: new Map() };
      } catch (e) { /* no tiles published: fine */ }
    }));
    const found = SETS.filter((n) => sets[n]);
    return { any: found.length > 0, hasPaths: !!sets.paths, built: found.map((n) => sets[n].index.built).sort().pop() || '', credits: found.map((n) => sets[n].index.credit) };
  }

  /** Which level suits a map this many degrees wide? 0 means "too far out to draw roads". */
  const levelFor = (deg) => (deg > 14 ? 0 : deg > 3 ? 1 : deg > 0.8 ? 2 : 3);

  /** Turn one tile file into ways. */
  function decode(set, level, key, j) {
    const ix = set.index, lv = ix.levels[level], P = ix.precision, [cx, cy] = key.split('_').map(Number), x0 = ix.origin[0] + cx * lv.w, y0 = ix.origin[1] + cy * lv.h;
    return j.r.map(([id, cls, ni, ri, flat]) => {
      const pts = []; let x = 0, y = 0, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      for (let i = 0; i < flat.length; i += 2) { x = i ? x + flat[i] : flat[i]; y = i ? y + flat[i + 1] : flat[i + 1]; const lo = x0 + x / P, la = y0 + y / P; pts.push([lo, la]); if (lo < minx) minx = lo; if (lo > maxx) maxx = lo; if (la < miny) miny = la; if (la > maxy) maxy = la; }
      return { id: level + ':' + id, name: j.s[ni] || '', ref: j.s[ri] || '', cls, kind: KINDS[cls] || '', path: cls >= 5, pts, bb: [minx, miny, maxx, maxy] };
    });
  }
  /** Fetch (once) the tile and keep the answer. */
  function tile(name, level, key) {
    const set = sets[name], url = BASE + name + '/L' + level + '/' + key + '.json';
    if (!set.tiles.has(url)) set.tiles.set(url, fetch(url).then((r) => (r.ok ? r.json() : { s: [], r: [] })).then((j) => decode(set, level, key, j)).catch(() => []));
    return set.tiles.get(url);
  }
  /** The tile keys of a set at a level that overlap a box [west, south, east, north]. */
  function keysFor(set, level, box) {
    const lv = set.index.levels[level]; if (!lv) return [];
    const o = set.index.origin, out = [];
    for (let x = Math.floor((box[0] - o[0]) / lv.w); x <= Math.floor((box[2] - o[0]) / lv.w); x++) for (let y = Math.floor((box[1] - o[1]) / lv.h); y <= Math.floor((box[3] - o[1]) / lv.h); y++) { const k = x + '_' + y; if (set.have[level].has(k)) out.push(k); }
    return out;
  }
  /** Ways with duplicates removed (a road that crosses a tile edge is in both tiles). */
  function merge(lists) { const seen = new Map(); lists.forEach((l) => l.forEach((w) => { if (!seen.has(w.id)) seen.set(w.id, w); })); return [...seen.values()]; }

  /** Roads for the part of the map on screen: box = [west, south, east, north]. Returns { ways, level, capped }. */
  async function forView(box, withPaths) {
    const level = levelFor(box[2] - box[0]); if (!level) return { ways: [], level: 0, capped: false };
    const jobs = []; SETS.forEach((n) => { if (sets[n] && (n === 'os' || withPaths) && (n === 'os' || level === 3)) keysFor(sets[n], level, box).forEach((k) => jobs.push([n, k])); });
    const capped = jobs.length > MAX_TILES; const lists = await Promise.all(jobs.slice(0, MAX_TILES).map(([n, k]) => tile(n, level, k)));
    return { ways: merge(lists).filter((w) => w.bb[2] >= box[0] && w.bb[0] <= box[2] && w.bb[3] >= box[1] && w.bb[1] <= box[3]), level, capped };
  }
  /** Full-detail roads along a route (every tile it touches, plus the next one over), for matching. onProgress(done, total) is optional. */
  async function forRoute(pts, withPaths, onProgress) {
    const want = new Map();
    SETS.forEach((n) => { if (!sets[n] || (n === 'paths' && !withPaths) || !sets[n].index.levels['3']) return; const lv = sets[n].index.levels['3'], o = sets[n].index.origin;
      pts.forEach(([lo, la]) => { const cx = Math.floor((lo - o[0]) / lv.w), cy = Math.floor((la - o[1]) / lv.h); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = (cx + dx) + '_' + (cy + dy); if (sets[n].have['3'].has(k)) want.set(n + '/' + k, [n, k]); } }); });
    const jobs = [...want.values()]; if (jobs.length > MAX_TILES) return { ways: [], tooBig: jobs.length };
    let done = 0; const lists = await Promise.all(jobs.map(([n, k]) => tile(n, 3, k).then((w) => { done++; if (onProgress) onProgress(done, jobs.length); return w; })));
    return { ways: merge(lists), tooBig: 0 };
  }
  return { init, levelFor, forView, forRoute };
})();
