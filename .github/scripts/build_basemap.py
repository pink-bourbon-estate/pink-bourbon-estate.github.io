#!/usr/bin/env python3
"""build_basemap.py: turn Natural Earth data (public domain) into the small files the Travel Map uses to look like a normal map.

The map already draws country shapes (travel-map/countries-50m.json). This adds what makes it read as a proper map:
lakes, rivers and the names of cities and towns. Everything is plain JSON published with the site, so visitors never ask another
server for it.

Usage:   python3 build_basemap.py <folder with the Natural Earth GeoJSON files> travel-map/basemap
Input files needed in that folder (from github.com/nvkelso/natural-earth-vector, "geojson" folder):
  ne_50m_lakes.geojson
  ne_50m_rivers_lake_centerlines.geojson
  ne_10m_populated_places_simple.geojson
Output:
  water.json    {"lakes": [[[lon, lat], ...], ...], "rivers": [[[lon, lat], ...], ...]}      (outer rings of lakes only)
  places.json   [[name, lon, lat, minZoom, kind], ...]   kind: 0 town or city, 1 national capital, 2 very large city
                minZoom is the map width in degrees below which the name is shown (bigger number = appears sooner).
Run it by hand now and then; Natural Earth changes rarely, so the output is committed to the repository.
"""
import json
import os
import sys

# A place is shown when the map is narrower than this many degrees wide. Chosen by population: (smallest population, width).
WIDTH_BY_POP = [(5_000_000, 360), (2_000_000, 120), (1_000_000, 60), (500_000, 30), (200_000, 16), (100_000, 8), (50_000, 4), (20_000, 2)]


def load(folder, name):
    with open(os.path.join(folder, name + '.geojson'), encoding='utf-8') as f:
        return json.load(f)['features']


def rnd(pts, nd=2):
    """Round to 2 decimals (about a kilometre) and drop points that become identical."""
    out = []
    for p in pts:
        q = [round(p[0], nd), round(p[1], nd)]
        if not out or q != out[-1]:
            out.append(q)
    return out


def water(folder):
    lakes, rivers = [], []
    for f in load(folder, 'ne_50m_lakes'):
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            ring = rnd(poly[0])
            if len(ring) >= 4:
                lakes.append(ring)
    for f in load(folder, 'ne_50m_rivers_lake_centerlines'):
        if f['properties'].get('featurecla') != 'River':          # lake centre lines are not rivers
            continue
        g = f['geometry']
        lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
        for line in lines:
            line = rnd(line)
            if len(line) >= 2:
                rivers.append(line)
    return {'lakes': lakes, 'rivers': rivers}


def places(folder):
    out = []
    for f in load(folder, 'ne_10m_populated_places_simple'):
        p = f['properties']
        pop = p.get('pop_max') or 0
        kind = 2 if p.get('megacity') else (1 if p.get('adm0cap') else 0)
        width = next((w for lim, w in WIDTH_BY_POP if pop >= lim), 0)
        if kind == 1:
            width = max(width, 60)                                  # capitals show a little sooner than other places of their size
        if not width:
            continue                                                # small places are left out to keep the file small
        name = p.get('name') or p.get('nameascii')
        if name:
            out.append([name, round(p['longitude'], 3), round(p['latitude'], 3), width, kind])
    out.sort(key=lambda r: (-r[3], r[0]))
    return out


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 1
    folder, out = argv[1], argv[2]
    os.makedirs(out, exist_ok=True)
    for name, data in (('water.json', water(folder)), ('places.json', places(folder))):
        with open(os.path.join(out, name), 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
        print(name, os.path.getsize(os.path.join(out, name)) // 1024, 'KB')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
