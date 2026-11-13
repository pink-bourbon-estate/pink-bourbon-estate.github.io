#!/usr/bin/env python3
"""build_roads.py: turn open road data into small map tiles that the Travel Map reads from this site.

Why this exists: asking a free public server (such as OpenStreetMap's Overpass) for roads every time a visitor
opens the map is unkind to that server. Instead, this script runs once a month in the website build (see
.github/workflows/pages.yml), reads a whole data set, cuts it into small files, and they are published with the site.
Visitors then only ever talk to this site.

Two kinds of input (the first argument says which):
  os     OS Open Roads, a GeoPackage file from Ordnance Survey (Great Britain, vehicle roads, free under the Open
         Government Licence). Coordinates are in British National Grid (EPSG:27700) and are converted to longitude and latitude.
  paths  A GeoJSON-sequence file of footpaths, tracks, cycleways and bridleways made from an OpenStreetMap extract with
         "osmium export" (OpenStreetMap data, ODbL licence).

Usage:   python3 build_roads.py os    OpenRoads.gpkg      travel-map/roads-data/os
         python3 build_roads.py paths paths.geojsonseq    travel-map/roads-data/paths
         (add --limit 1000 to read only the first 1000 roads, for a quick test)

What it writes into the output folder:
  index.json          which tiles exist at each level, when it was built, and the credit line to show
  L1/<x>_<y>.json     big roads only (motorways and A roads), simplified: for zooming out
  L2/<x>_<y>.json     plus B roads and other numbered/classified roads, lightly simplified
  L3/<x>_<y>.json     everything, full detail: for zooming in
Each tile file is plain JSON:
  {"s": ["Some Street", "A1", ...],                       a list of names and road numbers (so each is stored once)
   "r": [[id, class, nameIndex, refIndex, [x0, y0, dx1, dy1, ...]], ...]}   one entry per road piece
Coordinates are whole numbers in units of 0.00001 degrees (about one metre): the first point counts from the tile's
south-west corner, and every following point is the change from the one before. travel-map/roadtiles.js reads them.

Class numbers:  0 motorway, 1 A road, 2 B road, 3 other classified road, 4 minor road, 5 footpath or similar, 6 track, 7 cycleway, 8 bridleway.
Needs Python 3.8 or later. The "os" kind also needs pyproj (pip install pyproj). Nothing else.
"""
import json
import math
import os
import sqlite3
import struct
import sys
import zlib
from array import array
from datetime import date

PRECISION = 100000                      # coordinate units per degree (0.00001 degree each)
ORIGIN = (-9.0, 49.0)                   # tiles are counted from this longitude, latitude (south-west of Great Britain)
BOUNDS = (-9.0, 49.0, 3.0, 62.0)        # roads outside this box are ignored (west, south, east, north)
# level: (tile width in degrees, tile height in degrees, biggest class number kept, simplify tolerance in metres)
LEVELS = {1: (1.0, 0.5, 1, 80.0), 2: (0.25, 0.125, 3, 15.0), 3: (0.1, 0.05, 99, 0.0)}


# ------------------------------------------------------------------ reading OS Open Roads (GeoPackage)
def read_wkb(buf, off=0):
    """Read a WKB geometry (LineString or MultiLineString, with or without Z or M). Returns (list of lines, next offset).
    A line is a list of (x, y) pairs."""
    endian = '<' if buf[off] == 1 else '>'
    code = struct.unpack_from(endian + 'I', buf, off + 1)[0]
    off += 5
    has_z = bool(code & 0x80000000) or (code % 10000) // 1000 in (1, 3)       # EWKB flag, or ISO style (1000s = Z, 2000s = M, 3000s = ZM)
    has_m = bool(code & 0x40000000) or (code % 10000) // 1000 in (2, 3)
    kind = code & 0xFF if code & 0xC0000000 else code % 1000
    dims = 2 + (1 if has_z else 0) + (1 if has_m else 0)
    if kind == 2:                                                              # LineString
        n = struct.unpack_from(endian + 'I', buf, off)[0]
        off += 4
        flat = struct.unpack_from(endian + str(n * dims) + 'd', buf, off)
        off += 8 * n * dims
        return [[(flat[i * dims], flat[i * dims + 1]) for i in range(n)]], off
    if kind == 5:                                                              # MultiLineString: a count, then that many LineStrings
        n = struct.unpack_from(endian + 'I', buf, off)[0]
        off += 4
        lines = []
        for _ in range(n):
            part, off = read_wkb(buf, off)
            lines.extend(part)
        return lines, off
    raise ValueError('unsupported geometry type %d' % kind)


def gpkg_lines(blob):
    """Lines inside a GeoPackage geometry blob (a small header, then WKB). Returns [] for an empty geometry."""
    flags = blob[3]
    if (flags >> 4) & 1:                                                       # the "empty" flag
        return []
    env = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}.get((flags >> 1) & 7, 0)          # an optional bounding box sits before the WKB
    return read_wkb(blob, 8 + env)[0]


def pick(columns, *wanted, avoid=()):
    """Find a column by name, ignoring case and underscores (the exact spelling differs between releases). Prints nothing; returns None if absent."""
    clean = {c.lower().replace('_', ''): c for c in columns}
    for w in wanted:
        for key, real in clean.items():
            if key == w and not any(a in key for a in avoid):
                return real
    for w in wanted:                                                           # second try: the wanted text appears inside the name
        for key, real in clean.items():
            if w in key and not any(a in key for a in avoid):
                return real
    return None


CLASS_OF = {'motorway': 0, 'a road': 1, 'b road': 2, 'classified unnumbered': 3}          # anything else is a minor road (4)


def os_roads(path, limit=None):
    """Yield (id, class, name, ref, lines-in-longitude-latitude) from an OS Open Roads GeoPackage."""
    db = sqlite3.connect(path)
    layers = db.execute("select table_name, srs_id, column_name from gpkg_geometry_columns").fetchall()
    # the road links layer is the one with lines; its name contains "road" and "link"; fall back to the biggest layer
    choice = [l for l in layers if 'road' in l[0].lower() and 'link' in l[0].lower()] or layers
    table, srs, geom = choice[0]
    cols = [r[1] for r in db.execute('pragma table_info("%s")' % table)]
    print('layer %s, srs %s, columns: %s' % (table, srs, ', '.join(cols)), file=sys.stderr)
    c_id = pick(cols, 'id', 'identifier', 'fid')
    c_cls = pick(cols, 'roadclassification', 'classification', avoid=('number',))
    c_ref = pick(cols, 'roadclassificationnumber', 'roadnumber', 'ref')
    c_name = pick(cols, 'name1', 'roadname', 'name')
    if not c_cls:
        print('WARNING: could not find the road classification column; every road will count as minor', file=sys.stderr)
    convert = None
    if srs not in (4326, 4979, 0, -1):                                         # needs converting to longitude and latitude
        from pyproj import Transformer                                         # imported only when needed
        convert = Transformer.from_crs(srs, 4326, always_xy=True).transform
    select = ', '.join('"%s"' % c for c in (c_id, c_cls, c_ref, c_name, geom) if c)
    names = [c for c in (c_id, c_cls, c_ref, c_name, geom) if c]
    n = 0
    for row in db.execute('select %s from "%s"' % (select, table)):
        rec = dict(zip(names, row))
        blob = rec.get(geom)
        if not blob:
            continue
        lines = []
        for line in gpkg_lines(bytes(blob)):
            if convert:
                xs, ys = convert([p[0] for p in line], [p[1] for p in line])
                line = list(zip(xs, ys))
            lines.append(line)
        cls = CLASS_OF.get(str(rec.get(c_cls) or '').strip().lower(), 4)
        yield str(rec.get(c_id) or n), cls, str(rec.get(c_name) or ''), str(rec.get(c_ref) or ''), lines
        n += 1
        if limit and n >= limit:
            return


# ------------------------------------------------------------------ reading OpenStreetMap paths (GeoJSON sequence)
PATH_CLASS = {'footway': 5, 'path': 5, 'pedestrian': 5, 'steps': 5, 'track': 6, 'cycleway': 7, 'bridleway': 8}


def osm_paths(path, limit=None):
    """Yield (id, class, name, ref, lines) from a GeoJSON-sequence file (one feature per line, made by "osmium export -f geojsonseq")."""
    n = 0
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip().lstrip('\x1e')                                 # the format may start each line with a record-separator character
            if not line:
                continue
            feat = json.loads(line)
            geom, props = feat.get('geometry') or {}, feat.get('properties') or {}
            cls = PATH_CLASS.get(props.get('highway'))
            if cls is None:
                continue
            if geom.get('type') == 'LineString':
                lines = [geom['coordinates']]
            elif geom.get('type') == 'MultiLineString':
                lines = geom['coordinates']
            else:
                continue
            yield str(feat.get('id') or props.get('@id') or n), cls, props.get('name') or '', props.get('ref') or '', [[(p[0], p[1]) for p in l] for l in lines]
            n += 1
            if limit and n >= limit:
                return


# ------------------------------------------------------------------ geometry helpers
def simplify(pts, tol_m):
    """Douglas-Peucker: drop points that sit within tol_m metres of a straight line between their neighbours."""
    if tol_m <= 0 or len(pts) < 3:
        return pts
    kx = math.cos(math.radians(pts[0][1])) * 111320.0
    ky = 110540.0
    flat = [(p[0] * kx, p[1] * ky) for p in pts]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = flat[a]
        bx, by = flat[b]
        dx, dy = bx - ax, by - ay
        length = math.hypot(dx, dy) or 1e-9
        far, far_i = 0.0, -1
        for i in range(a + 1, b):
            d = abs(dy * (flat[i][0] - ax) - dx * (flat[i][1] - ay)) / length
            if d > far:
                far, far_i = d, i
        if far > tol_m:
            keep[far_i] = True
            stack.append((a, far_i))
            stack.append((far_i, b))
    return [p for p, k in zip(pts, keep) if k]


def cells_touched(pts, cw, ch):
    """The tile cells a line passes through (checked every half cell along each segment, so no cell is skipped)."""
    out = set()
    for i, (x, y) in enumerate(pts):
        if i:
            px, py = pts[i - 1]
            steps = max(1, int(max(abs(x - px) / cw, abs(y - py) / ch) * 2) + 1)
        else:
            px, py, steps = x, y, 1
        for s in range(1, steps + 1):
            t = s / steps
            cx, cy = px + (x - px) * t, py + (y - py) * t
            out.add((math.floor((cx - ORIGIN[0]) / cw), math.floor((cy - ORIGIN[1]) / ch)))
    return out


# ------------------------------------------------------------------ building the tiles
def build(records, out_dir, credit):
    """Sort every road into the tiles it touches, at each level, and write the files."""
    tiles = {lv: {} for lv in LEVELS}                                          # level -> {(x, y): [records]}
    count = 0
    for rid, cls, name, ref, lines in records:
        rid32 = zlib.crc32(rid.encode('utf-8'))
        for line in lines:
            line = [p for p in line if BOUNDS[0] <= p[0] <= BOUNDS[2] and BOUNDS[1] <= p[1] <= BOUNDS[3]]
            if len(line) < 2:
                continue
            for lv, (cw, ch, max_cls, tol) in LEVELS.items():
                if cls > max_cls:
                    continue
                pts = simplify(line, tol)
                for cell in cells_touched(pts, cw, ch):
                    tiles[lv].setdefault(cell, []).append((rid32, cls, name, ref, pts))
        count += 1
        if count % 200000 == 0:
            print('read %d roads' % count, file=sys.stderr)
    index = {'built': date.today().isoformat(), 'credit': credit, 'origin': list(ORIGIN), 'precision': PRECISION, 'levels': {}}
    for lv, (cw, ch, _, _) in LEVELS.items():
        folder = os.path.join(out_dir, 'L%d' % lv)
        os.makedirs(folder, exist_ok=True)
        keys = []
        for (cx, cy), recs in sorted(tiles[lv].items()):
            x0, y0 = ORIGIN[0] + cx * cw, ORIGIN[1] + cy * ch                   # the tile's south-west corner
            strings, where, rows = [''], {'': 0}, []
            for rid32, cls, name, ref, pts in recs:
                for s in (name, ref):
                    if s not in where:
                        where[s] = len(strings)
                        strings.append(s)
                flat = array('i')
                px = py = None
                for lon, lat in pts:
                    x, y = round((lon - x0) * PRECISION), round((lat - y0) * PRECISION)
                    if px is None:
                        flat.extend((x, y))
                    else:
                        flat.extend((x - px, y - py))
                    px, py = x, y
                rows.append([rid32, cls, where[name], where[ref], list(flat)])
            with open(os.path.join(folder, '%d_%d.json' % (cx, cy)), 'w', encoding='utf-8') as f:
                json.dump({'s': strings, 'r': rows}, f, ensure_ascii=False, separators=(',', ':'))
            keys.append('%d_%d' % (cx, cy))
        index['levels'][str(lv)] = {'w': cw, 'h': ch, 'tiles': keys}
        print('level %d: %d tiles' % (lv, len(keys)), file=sys.stderr)
    with open(os.path.join(out_dir, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'))
    print('done: %d roads read' % count, file=sys.stderr)


def main(argv):
    limit = None
    if '--limit' in argv:
        i = argv.index('--limit')
        limit = int(argv[i + 1])
        del argv[i:i + 2]
    if len(argv) != 4 or argv[1] not in ('os', 'paths'):
        print(__doc__)
        return 2
    kind, src, out = argv[1], argv[2], argv[3]
    os.makedirs(out, exist_ok=True)
    if kind == 'os':
        build(os_roads(src, limit), out, 'Contains OS data © Crown copyright and database right %d' % date.today().year)
    else:
        build(osm_paths(src, limit), out, 'Paths: © OpenStreetMap contributors (ODbL)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
