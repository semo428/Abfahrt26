# Erzeugt webapp/map-site.js: Umgebungsplan alfons x (Bahnhof Sigmaringen) aus OpenStreetMap-Daten.
import math, sys, io, xml.etree.ElementTree as ET

SRC = sys.argv[1]
OUT = sys.argv[2]
r = ET.parse(SRC).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in r.findall('node')}

LAT0, LON0 = 48.08690, 9.22195          # Kartenmitte
KX = math.cos(math.radians(LAT0)) * 111320
KY = 110540
W, H = 400, 360                          # viewBox
S = 1.55                                 # Pixel pro Meter (≈ 258 m x 232 m Ausschnitt)

def xy(lat, lon):
    return (W / 2 + (lon - LON0) * KX * S, H / 2 - (lat - LAT0) * KY * S)

def pts(w):
    out = []
    for nd in w.findall('nd'):
        p = nodes.get(nd.get('ref'))
        if p: out.append(xy(*p))
    return out

def d_path(ps, close=False):
    if not ps: return ''
    s = 'M' + ' L'.join('%.1f %.1f' % p for p in ps)
    return s + (' Z' if close else '')

ways = []
for w in r.findall('way'):
    t = {x.get('k'): x.get('v') for x in w.findall('tag')}
    ways.append((w.get('id'), t, pts(w)))

layers = {k: [] for k in ('green', 'parking', 'building', 'station', 'rail', 'platform', 'road_casing', 'road', 'foot')}
labels = {}
ROADW = {'tertiary': 9, 'unclassified': 8, 'residential': 7, 'service': 4.5}

for wid, t, ps in ways:
    if len(ps) < 2: continue
    closed = len(ps) > 2
    if wid == '93866373':
        layers['station'].append(d_path(ps, True)); continue
    if t.get('leisure') == 'park' or t.get('landuse') in ('grass', 'flowerbed'):
        layers['green'].append(d_path(ps, True)); continue
    if t.get('amenity') == 'parking':
        layers['parking'].append(d_path(ps, True)); continue
    if 'building' in t:
        layers['building'].append(d_path(ps, True)); continue
    if t.get('railway') == 'rail':
        layers['rail'].append(d_path(ps)); continue
    if t.get('railway') == 'platform' or t.get('public_transport') == 'platform':
        layers['platform'].append(d_path(ps, closed)); continue
    hw = t.get('highway')
    if hw in ROADW:
        w_ = ROADW[hw] * S
        layers['road_casing'].append((d_path(ps), w_ + 2.2))
        layers['road'].append((d_path(ps), w_))
        name = t.get('name')
        if name:
            # längstes Segment, dessen Mitte gut sichtbar im Ausschnitt liegt
            for a, b in zip(ps, ps[1:]):
                mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                if not (30 < mx < W - 30 and 20 < my < H - 24): continue
                L = math.dist(a, b)
                if L > labels.get(name, (0,))[0]:
                    labels[name] = (L, a, b)
    elif hw in ('footway', 'path', 'steps', 'pedestrian'):
        layers['foot'].append(d_path(ps))

def label_svg(name, a, b):
    ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
    if ang > 90: ang -= 180
    if ang < -90: ang += 180
    cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    if not (12 < cx < W - 12 and 12 < cy < H - 12): return ''
    return '<text class="st" x="%.1f" y="%.1f" transform="rotate(%.1f %.1f %.1f)">%s</text>' % (cx, cy + 3, ang, cx, cy, name)

# wichtige Punkte
ent = xy(48.0867470, 9.2218827)          # Eingang "AlfonsX" (OSM node 5223727732)
bus = xy(48.0863600, 9.2230300)          # Busbahnhof (Mitte der Haltestellen)
park = xy(48.0878500, 9.2203500)         # Parkplatz Landesbahnstraße
tracks = xy(48.0873600, 9.2226000)

def stick(x, y, color):
    # kleines Strichmännchen (Security)
    return ('<g class="guard" transform="translate(%.1f %.1f)">'
            '<circle cx="0" cy="-11" r="3.6" fill="%s"/>'
            '<path d="M0 -7 L0 3 M-5.5 -3 L5.5 -3 M0 3 L-4 11 M0 3 L4 11" stroke="%s" stroke-width="2.6" stroke-linecap="round" fill="none"/>'
            '</g>') % (x, y, color, color)

svg = []
svg.append('<svg class="sitemap" viewBox="0 0 %d %d" role="img" aria-label="Umgebungsplan: alfons x im Bahnhofsgebäude Sigmaringen, Eingang zur Bahnhofstraße, Security am Eingang">' % (W, H))
svg.append('<defs><clipPath id="clipmap"><rect width="%d" height="%d" rx="12"/></clipPath>'
           '<pattern id="pk" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" class="pk-bg"/><path d="M0 7 L7 0" class="pk-line"/></pattern></defs>' % (W, H))
svg.append('<g clip-path="url(#clipmap)"><rect width="%d" height="%d" class="ground"/>' % (W, H))
for d in layers['green']: svg.append('<path d="%s" class="green"/>' % d)
for d in layers['parking']: svg.append('<path d="%s" class="parking"/>' % d)
for d in layers['foot']: svg.append('<path d="%s" class="foot"/>' % d)
for d in layers['rail']: svg.append('<path d="%s" class="rail"/>' % d)
for d in layers['platform']: svg.append('<path d="%s" class="platform"/>' % d)
for d, w_ in layers['road_casing']: svg.append('<path d="%s" class="road-casing" stroke-width="%.1f"/>' % (d, w_))
for d, w_ in layers['road']: svg.append('<path d="%s" class="road" stroke-width="%.1f"/>' % (d, w_))
for d in layers['building']: svg.append('<path d="%s" class="bld"/>' % d)
for d in layers['station']: svg.append('<path d="%s" class="station"/>' % d)
for name, (L, a, b) in labels.items(): svg.append(label_svg(name, a, b))

# Beschriftungen
sx, sy = xy(48.08686, 9.22175)
svg.append('<text class="venue" x="%.1f" y="%.1f">alfons x</text>' % (sx, sy + 4))
svg.append('<text class="area" x="%.1f" y="%.1f">Gleise</text>' % tracks)
svg.append('<g class="poi"><circle cx="%.1f" cy="%.1f" r="9"/><text x="%.1f" y="%.1f">P</text></g>' % (park[0], park[1], park[0], park[1] + 4))
svg.append('<g class="poi bus"><rect x="%.1f" y="%.1f" width="34" height="16" rx="4"/><text x="%.1f" y="%.1f">BUS</text></g>' % (bus[0] - 17, bus[1] - 8, bus[0], bus[1] + 4))

# Eingang + Security
ex, ey = ent
svg.append('<g class="entrance"><circle cx="%.1f" cy="%.1f" r="7"/><path d="M%.1f %.1f l0 -8 m-4 4 l4 -4 l4 4" /></g>' % (ex, ey + 9, ex, ey + 13))
svg.append(stick(ex - 16, ey + 14, '#FFD23F'))
svg.append(stick(ex + 16, ey + 14, '#FFD23F'))
svg.append('<text class="ent-lbl" x="%.1f" y="%.1f">Eingang</text>' % (ex, ey + 40))

# Nordpfeil + Maßstab
svg.append('<g class="north" transform="translate(%d 26)"><path d="M0 -12 L6 6 L0 2 L-6 6 Z"/><text x="0" y="18">N</text></g>' % (W - 22))
m50 = 50 * S
svg.append('<g class="scale"><path d="M14 %d h%.1f"/><text x="%.1f" y="%d">50 m</text></g>' % (H - 14, m50, 14 + m50 / 2, H - 19))
svg.append('</g>')
svg.append('<text class="attr" x="%d" y="%d">© OpenStreetMap-Mitwirkende</text>' % (W - 6, H - 6))
svg.append('</svg>')

out = ''.join(svg)
js = '// Automatisch erzeugt aus OpenStreetMap-Daten (© OpenStreetMap-Mitwirkende, ODbL) – Umgebung alfons x, Bahnhofstraße 7, Sigmaringen\nwindow.ABFAHRT_SITE_SVG = ' + repr(out).replace("\\'", "'") + ';\n'
# repr kann einfache Anführungszeichen erzeugen; sicherer: JSON-String
import json
js = '// Automatisch erzeugt aus OpenStreetMap-Daten (© OpenStreetMap-Mitwirkende, ODbL) – Umgebung alfons x, Bahnhofstraße 7, Sigmaringen\nwindow.ABFAHRT_SITE_SVG = ' + json.dumps(out, ensure_ascii=False) + ';\n'
io.open(OUT, 'w', encoding='utf-8').write(js)
print('labels:', list(labels.keys()))
print('size', len(js), 'entrance at', ent, 'bus', bus, 'park', park)
