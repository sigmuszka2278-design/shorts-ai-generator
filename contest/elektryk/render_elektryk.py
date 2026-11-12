#!/usr/bin/env python3
"""Rolka konkursowa "Elektryk – mój zawód przyszłości" (WUP Wrocław).

Animacja ludzików w stylu Pivot Animator: 720x1280 (9:16), 10 kl./s, 58 s, 7 scen.
Renderuje dwie wersje MP4 (czystą i z napisami ekranowymi), napisy lektora .srt
oraz ścieżkę prostych efektów dźwiękowych (syntezowanych w kodzie).

Użycie:  python3 render_elektryk.py [katalog_wyjściowy]
Wymaga: Pillow, numpy, ffmpeg w PATH.
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, SS = 720, 1280, 10, 2  # SS = supersampling (antyaliasing)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ------------------------------------------------------------------ sceny / czasy
SCENES = [  # (nazwa, start_klatka, liczba_klatek)
    ("s1a", 0, 40), ("s1b", 40, 20), ("s2", 60, 70), ("s3", 130, 90),
    ("s4", 220, 100), ("s5", 320, 90), ("s6", 410, 100), ("s7", 510, 70),
]
TOTAL = 580

# ------------------------------------------------------------------ kolory
INK = (26, 26, 26)
WHITE = (245, 245, 245)
YEL = (255, 212, 59)
YEL_D = (230, 170, 0)
GRAY = (150, 150, 150)
RED = (220, 50, 47)


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def seg(f, a, b):
    """Postęp 0..1 w przedziale klatek [a, b] (z wygładzeniem)."""
    if b <= a:
        return 1.0 if f >= a else 0.0
    return ease((f - a) / (b - a))


def mix(c1, c2, t):
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


# ------------------------------------------------------------------ rysowanie
class Canvas:
    def __init__(self, bg):
        self.img = Image.new("RGBA", (W * SS, H * SS), bg + (255,))
        self.d = ImageDraw.Draw(self.img)

    def P(self, pts):
        return [(x * SS, y * SS) for x, y in pts]

    def line(self, pts, col, w=8):
        pts = self.P(pts)
        self.d.line(pts, fill=col, width=int(w * SS), joint="curve")
        r = w * SS / 2
        for x, y in (pts[0], pts[-1]):
            self.d.ellipse((x - r, y - r, x + r, y + r), fill=col)

    def circle(self, c, r, fill=None, outline=None, w=6):
        x, y = c
        self.d.ellipse(((x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS),
                       fill=fill, outline=outline, width=int(w * SS) if outline else 0)

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, w=6, r=0):
        box = (x0 * SS, y0 * SS, x1 * SS, y1 * SS)
        if r:
            self.d.rounded_rectangle(box, r * SS, fill=fill, outline=outline, width=int(w * SS) if outline else 0)
        else:
            self.d.rectangle(box, fill=fill, outline=outline, width=int(w * SS) if outline else 0)

    def poly(self, pts, fill=None, outline=None, w=6):
        self.d.polygon(self.P(pts), fill=fill)
        if outline:
            self.line(list(pts) + [pts[0]], outline, w)

    def pie(self, c, r, a0, a1, fill):
        x, y = c
        self.d.pieslice(((x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS), a0, a1, fill=fill)

    def glow(self, c, r, col=YEL, strength=1.0):
        size = int(r * 2 * SS)
        if size < 4:
            return
        yy, xx = np.mgrid[0:size, 0:size]
        dist = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size / 2)
        a = np.clip(1 - dist, 0, 1) ** 2 * 170 * strength
        layer = np.zeros((size, size, 4), np.uint8)
        layer[..., 0], layer[..., 1], layer[..., 2] = col
        layer[..., 3] = a.astype(np.uint8)
        g = Image.fromarray(layer, "RGBA")
        self.img.alpha_composite(g, (int(c[0] * SS - size / 2), int(c[1] * SS - size / 2)))
        self.d = ImageDraw.Draw(self.img)

    def text(self, xy, s, size, col, anchor="mm"):
        f = ImageFont.truetype(FONT_BOLD, int(size * SS))
        self.d.text((xy[0] * SS, xy[1] * SS), s, font=f, fill=col, anchor=anchor)

    def final(self):
        return self.img.resize((W, H), Image.LANCZOS).convert("RGB")


# ------------------------------------------------------------------ ludzik (Pivot)
L_TORSO, R_HEAD, L_UA, L_LA, L_UL, L_LL = 90, 25, 52, 48, 62, 58
BASE = dict(x=360, gy=1000, lift=0, s=1.0, torso=0, head=0,
            la1=-15, la2=-8, ra1=15, ra2=8, ll1=-8, ll2=-4, rl1=8, rl2=4)


def P(base=None, **kw):
    p = dict(BASE if base is None else base)
    p.update(kw)
    return p


def d(a):
    r = math.radians(a)
    return math.sin(r), math.cos(r)


STAND = P()
ARMS_UP = P(la1=-150, la2=-165, ra1=150, ra2=165)
ARMS_OUT = P(la1=-70, la2=-120, ra1=70, ra2=120)
CROUCH = P(ll1=-50, ll2=20, rl1=50, rl2=-20, la1=-35, la2=-20, ra1=35, ra2=20)
JUMP = P(la1=-160, la2=-170, ra1=160, ra2=170, ll1=-15, ll2=10, rl1=15, rl2=-10)
SAD = P(head=0, la1=-5, la2=-2, ra1=5, ra2=2, torso=0)
WALK = [
    dict(torso=6, ll1=-25, ll2=-30, rl1=28, rl2=8, la1=25, la2=40, ra1=-25, ra2=-10),
    dict(torso=6, ll1=-6, ll2=-45, rl1=4, rl2=2, la1=5, la2=15, ra1=-5, ra2=5),
    dict(torso=6, ll1=28, ll2=8, rl1=-25, rl2=-30, la1=-25, la2=-10, ra1=25, ra2=40),
    dict(torso=6, ll1=4, ll2=2, rl1=-6, rl2=-45, la1=-5, la2=5, ra1=5, ra2=15),
]


def walk(f, base, x0, x1, f0, f1, flip=False):
    """Chód Pivot: cykl 8 klatek (4 pozy x 2 klatki), przesuwany liniowo."""
    t = max(0.0, min(1.0, (f - f0) / max(1, f1 - f0)))
    k = WALK[(int(f - f0) // 2) % 4]
    p = P(base, **k)
    if flip:
        for key in ("torso", "ll1", "ll2", "rl1", "rl2", "la1", "la2", "ra1", "ra2"):
            p[key] = -p[key]
    p["x"] = lerp(x0, x1, t)
    return p


def blend(p1, p2, t):
    t = ease(t)
    out = dict(p1)
    for k, v in p2.items():
        if isinstance(v, (int, float)) and not isinstance(v, bool) and k in p1:
            out[k] = lerp(p1[k], v, t)
        elif t >= 0.5:
            out[k] = v
    return out


def keyed(f, keys):
    """keys: lista (klatka, poza). Interpolacja między klatkami kluczowymi."""
    if f <= keys[0][0]:
        return dict(keys[0][1])
    for (fa, pa), (fb, pb) in zip(keys, keys[1:]):
        if fa <= f <= fb:
            return blend(pa, pb, (f - fa) / max(1, fb - fa))
    return dict(keys[-1][1])


def joints(p):
    s = p["s"]
    feet = [d(p["ll1"])[1] * L_UL + d(p["ll2"])[1] * L_LL,
            d(p["rl1"])[1] * L_UL + d(p["rl2"])[1] * L_LL]
    hy = p["gy"] - max(feet) * s - 5 * s - p["lift"]
    hip = (p["x"], hy)
    ts = d(p["torso"])
    neck = (hip[0] + ts[0] * L_TORSO * s, hip[1] - ts[1] * L_TORSO * s)
    hd = d(p["torso"] + p["head"])
    head = (neck[0] + hd[0] * (R_HEAD + 6) * s, neck[1] - hd[1] * (R_HEAD + 6) * s)
    sh = (lerp(neck[0], hip[0], 0.08), lerp(neck[1], hip[1], 0.08))
    J = dict(hip=hip, neck=neck, head=head, sh=sh)
    for side in ("l", "r"):
        a1, a2 = p[side + "a1"], p[side + "a2"]
        e = (sh[0] + d(a1)[0] * L_UA * s, sh[1] + d(a1)[1] * L_UA * s)
        h = (e[0] + d(a2)[0] * L_LA * s, e[1] + d(a2)[1] * L_LA * s)
        J[side + "elbow"], J[side + "hand"] = e, h
        b1, b2 = p[side + "l1"], p[side + "l2"]
        k = (hip[0] + d(b1)[0] * L_UL * s, hip[1] + d(b1)[1] * L_UL * s)
        ft = (k[0] + d(b2)[0] * L_LL * s, k[1] + d(b2)[1] * L_LL * s)
        J[side + "knee"], J[side + "foot"] = k, ft
    return J


def figure(c, p, col=INK, helmet=False, helmet_pos=None):
    J = joints(p)
    s = p["s"]
    w = 10 * s
    for a, b, e in (("hip", "lknee", "lfoot"), ("hip", "rknee", "rfoot")):
        c.line([J[a], J[b], J[e]], col, w)
    c.line([J["hip"], J["neck"]], col, w)
    for a, b, e in (("sh", "lelbow", "lhand"), ("sh", "relbow", "rhand")):
        c.line([J[a], J[b], J[e]], col, w)
    c.circle(J["head"], R_HEAD * s, fill=col)
    if helmet:
        helmet_draw(c, J["head"], s)
    return J


def helmet_draw(c, head, s):
    hx, hy = head
    r = (R_HEAD + 6) * s
    c.pie((hx, hy - 4 * s), r, 180, 360, fill=YEL)
    c.line([(hx - r - 8 * s, hy - 4 * s), (hx + r + 8 * s, hy - 4 * s)], YEL_D, 7 * s)
    c.line([(hx, hy - 4 * s - r), (hx, hy - 4 * s - r * 0.35)], YEL_D, 4 * s)


# ------------------------------------------------------------------ rekwizyty
def bulb(c, cen, lit, s=1.0, cord_top=None, dark=False, flash=0.0):
    x, y = cen
    if cord_top is not None:
        c.line([(x, cord_top), (x, y - 30 * s)], (90, 90, 90) if not dark else (110, 110, 110), 4)
    if lit:
        c.glow(cen, 150 * s * (1 + 0.15 * flash), YEL, 1.0)
        for i in range(8):
            a = math.radians(i * 45 + 22.5)
            c.line([(x + math.cos(a) * 40 * s, y + math.sin(a) * 40 * s),
                    (x + math.cos(a) * 58 * s, y + math.sin(a) * 58 * s)], YEL, 6 * s)
    c.rect(x - 12 * s, y + 18 * s, x + 12 * s, y + 38 * s, fill=(120, 120, 120))
    c.line([(x - 12 * s, y + 27 * s), (x + 12 * s, y + 27 * s)], (80, 80, 80), 3 * s)
    c.circle(cen, 28 * s, fill=YEL if lit else ((85, 85, 85) if dark else (175, 175, 175)),
             outline=YEL_D if lit else ((60, 60, 60) if dark else (120, 120, 120)), w=4 * s)
    if lit:
        c.circle((x - 9 * s, y - 9 * s), 7 * s, fill=(255, 245, 190))


def building(c, x0, y0, x1, y1, lit_frac, body, edge, dark_win, cols=3, rows=5):
    c.rect(x0, y0, x1, y1, fill=body, outline=edge, w=5)
    cw, ch = (x1 - x0) / cols, (y1 - y0 - 30) / rows
    n, total = 0, cols * rows
    order = [(r, k) for r in range(rows - 1, -1, -1) for k in range(cols)]
    lit_set = set(order[: int(round(lit_frac * total))])
    for r in range(rows):
        for k in range(cols):
            wx, wy = x0 + k * cw + cw * 0.25, y0 + 15 + r * ch + ch * 0.2
            on = (r, k) in lit_set
            c.rect(wx, wy, wx + cw * 0.5, wy + ch * 0.55, fill=YEL if on else dark_win)
            n += 1


def factory(c, x0, y0, x1, y1, body, edge, win, smoke=0.0, smoke_col=(235, 235, 235), f=0):
    teeth = 3
    tw = (x1 - x0) / teeth
    pts = [(x0, y1), (x0, y0)]
    for i in range(teeth):
        pts += [(x0 + i * tw + tw, y0 - 50), (x0 + i * tw + tw, y0)]
    pts += [(x1, y1)]
    c.poly(pts, fill=body, outline=edge, w=5)
    cx = x1 - 55
    c.rect(cx, y0 - 140, cx + 32, y0 - 40, fill=body, outline=edge, w=5)
    for i in range(3):
        wx = x0 + 25 + i * tw
        c.rect(wx, y0 + 40, wx + tw * 0.55, y0 + 90, fill=win)
    if smoke > 0:
        for i in range(4):
            ph = (f * 0.12 + i * 0.25) % 1.0
            r = (14 + 26 * ph) * smoke
            c.circle((cx + 16 + 30 * ph + 6 * i, y0 - 150 - 120 * ph), r, fill=smoke_col)


def pv_panel(c, cx, cy, w, h):
    sk = 18
    pts = [(cx - w / 2 + sk, cy - h / 2), (cx + w / 2 + sk, cy - h / 2), (cx + w / 2 - sk, cy + h / 2), (cx - w / 2 - sk, cy + h / 2)]
    c.poly(pts, fill=(30, 60, 140), outline=(200, 210, 230), w=4)
    for i in (1, 2, 3):
        t = i / 4
        top = (lerp(pts[0][0], pts[1][0], t), pts[0][1])
        bot = (lerp(pts[3][0], pts[2][0], t), pts[3][1])
        c.line([top, bot], (180, 200, 235), 2)
    mid = [((pts[0][0] + pts[3][0]) / 2, cy), ((pts[1][0] + pts[2][0]) / 2, cy)]
    c.line(mid, (180, 200, 235), 2)


def car(c, x, gy, body=(220, 60, 60), edge=INK):
    c.poly([(x, gy - 30), (x, gy - 70), (x + 45, gy - 70), (x + 70, gy - 108), (x + 150, gy - 108),
            (x + 180, gy - 70), (x + 210, gy - 66), (x + 210, gy - 30)], fill=body, outline=edge, w=5)
    c.poly([(x + 78, gy - 72), (x + 96, gy - 100), (x + 140, gy - 100), (x + 160, gy - 72)], fill=(200, 230, 250))
    for wx in (x + 45, x + 165):
        c.circle((wx, gy - 26), 24, fill=(40, 40, 40))
        c.circle((wx, gy - 26), 10, fill=(170, 170, 170))


def charger(c, x, gy, body=(70, 170, 90), edge=INK, screen=(200, 255, 210)):
    c.rect(x, gy - 170, x + 55, gy, fill=body, outline=edge, w=5, r=8)
    c.rect(x + 10, gy - 155, x + 45, gy - 120, fill=screen)
    lightning(c, (x + 27, gy - 137), 13, (30, 120, 50))


def lightning(c, cen, s, col=YEL, w=None):
    x, y = cen
    pts = [(x + 0.3 * s, y - s), (x - 0.4 * s, y + 0.1 * s), (x + 0.3 * s, y + 0.1 * s), (x - 0.3 * s, y + s)]
    c.line(pts, col, w or max(3, s * 0.35))


def cross(c, cen, s, col=RED):
    x, y = cen
    c.line([(x - s, y - s), (x + s, y + s)], col, s * 0.35)
    c.line([(x - s, y + s), (x + s, y - s)], col, s * 0.35)


def cable(c, pts, col=(40, 40, 40), w=7, n=24):
    """Krzywa Béziera (kabel)."""
    if len(pts) == 2:
        c.line(pts, col, w)
        return
    out = []
    for i in range(n + 1):
        t = i / n
        q = list(pts)
        while len(q) > 1:
            q = [(lerp(a[0], b[0], t), lerp(a[1], b[1], t)) for a, b in zip(q, q[1:])]
        out.append(q[0])
    c.line(out, col, w)


def stars(c, f, seed=3, n=28, ymax=760):
    rng = np.random.default_rng(seed)
    for i in range(n):
        x, y = rng.uniform(10, 710), rng.uniform(330, ymax)
        tw = 1.5 + 1.2 * math.sin(f * 0.6 + i)
        c.circle((x, y), tw, fill=(200, 210, 240))


# ------------------------------------------------------------------ SCENA 1A: pokój, światło miga
def s1a(f):
    lit = f < 30 or f in (31, 34, 35)
    bg = (255, 243, 214) if lit else (90, 84, 70)
    c = Canvas(bg)
    wall_ink = INK if lit else (45, 42, 36)
    # okno z wieczornym niebem
    c.rect(60, 420, 230, 620, fill=(40, 60, 120), outline=wall_ink, w=8)
    c.line([(145, 420), (145, 620)], wall_ink, 6)
    c.circle((190, 465), 18, fill=(240, 240, 200))
    # podłoga
    c.line([(0, 1000), (720, 1000)], wall_ink, 6)
    # krzesło
    c.line([(120, 945), (255, 945)], (140, 90, 50), 10)
    c.line([(125, 945), (125, 770)], (140, 90, 50), 10)
    c.line([(135, 945), (135, 1000)], (140, 90, 50), 8)
    c.line([(245, 945), (245, 1000)], (140, 90, 50), 8)
    # biurko + zeszyt
    c.line([(300, 840), (640, 840)], (140, 90, 50), 12)
    c.line([(320, 840), (320, 1000)], (140, 90, 50), 10)
    c.line([(620, 840), (620, 1000)], (140, 90, 50), 10)
    c.rect(330, 826, 420, 836, fill=(80, 140, 220))
    # żarówka
    bulb(c, (450, 360), lit, 1.2, cord_top=0, flash=0.5 * math.sin(f))
    # ludzik siedzi i pisze
    sit = P(x=185, gy=1000, s=1.15, torso=12, head=8, ll1=88, ll2=0, rl1=84, rl2=-4,
            la1=62, la2=96, ra1=58, ra2=100)
    if f < 30:
        sit["ra2"] = 92 if (f // 2) % 2 == 0 else 108
        sit["head"] = 14
    else:
        sit = blend(sit, P(sit, torso=0, head=-6, la1=40, ra1=30, ra2=70), (f - 30) / 6)
    figure(c, sit, INK if lit else (35, 32, 28))
    return c


# ------------------------------------------------------------------ SCENA 1B: ciemność, "?"
def s1b(f):
    c = Canvas((0, 0, 0))
    dim = (45, 45, 45)
    c.line([(0, 1000), (720, 1000)], dim, 5)
    c.line([(300, 840), (640, 840)], dim, 10)
    c.line([(320, 840), (320, 1000)], dim, 8)
    c.line([(620, 840), (620, 1000)], dim, 8)
    bulb(c, (450, 360), False, 1.2, cord_top=0, dark=True)
    sit = P(x=185, gy=1000, s=1.15, torso=0, head=-6, ll1=88, ll2=0, rl1=84, rl2=-4,
            la1=40, la2=96, ra1=30, ra2=70)
    stand = P(x=230, gy=1000, s=1.15)
    out = P(ARMS_OUT, x=230, gy=1000, s=1.15)
    keys = [(0, sit), (5, stand), (9, out)]
    p = keyed(f, keys)
    if f >= 10:
        p["head"] = [-14, 14][(f // 2) % 2]
    J = figure(c, p, WHITE)
    if f >= 6:
        a = seg(f, 6, 10)
        c.text((J["head"][0] + 70, J["head"][1] - 110), "?", 120 * (0.4 + 0.6 * a), YEL)
    return c


# ------------------------------------------------------------------ region (sceny 2 i 3)
HORIZON, FRONT = 780, 1090


def region(c, f, day, win_frac=0.0, smoke=0.0, pv=0.0, sun=0.0):
    if day:
        body1, body2, edge, dwin = (150, 170, 195), (175, 190, 210), (60, 70, 90), (90, 105, 130)
        fbody, ground = (190, 160, 130), (120, 190, 110)
    else:
        body1, body2, edge, dwin = (32, 44, 70), (40, 54, 82), (70, 85, 120), (18, 26, 44)
        fbody, ground = (40, 46, 64), (20, 32, 40)
    if day and sun > 0:
        c.glow((110, 330), 110, YEL, sun)
        c.circle((110, 330), 42 * sun, fill=YEL)
    c.rect(0, HORIZON, 720, H, fill=ground)
    building(c, 30, 430, 170, HORIZON, win_frac, body1, edge, dwin, 3, 6)
    building(c, 190, 540, 310, HORIZON, win_frac, body2, edge, dwin, 2, 4)
    factory(c, 360, 640, 690, HORIZON, fbody, edge, YEL if (day and smoke > 0.3) else dwin, smoke, f=f)
    if pv > 0:
        y_off = (1 - pv) * -400
        pv_panel(c, 100, 412 + y_off, 120, 26)
        pv_panel(c, 250, 522 + y_off, 100, 26)
    # droga z przodu
    c.rect(0, FRONT - 6, 720, FRONT + 8, fill=(90, 90, 90) if day else (50, 55, 65))


def s2(f):
    c = Canvas((11, 20, 38))
    stars(c, f)
    c.circle((600, 360), 34, fill=(220, 220, 200))
    c.circle((588, 352), 30, fill=(11, 20, 38))
    region(c, f, day=False)
    car(c, 40, FRONT, body=(110, 40, 40), edge=(150, 150, 160))
    charger(c, 290, FRONT, body=(40, 70, 50), edge=(150, 150, 160), screen=(30, 40, 35))
    plug_rest = (330, FRONT - 70)
    if f < 40:
        p = walk(f, P(gy=FRONT, s=0.85), 760, 470, 0, 40, flip=True)
        J = figure(c, p, WHITE)
        cable(c, [(318, FRONT - 100), (300, FRONT - 20), plug_rest], (150, 150, 160), 6)
    else:
        base = P(STAND, x=470, gy=FRONT, s=0.85)
        reach = P(base, la1=-70, la2=-95, torso=-8)
        sad = P(SAD, x=470, gy=FRONT, s=0.85, head=0, lift=-8)
        p = keyed(f, [(40, base), (48, reach), (56, reach), (62, sad)])
        J = figure(c, p, WHITE)
        hand = J["lhand"] if f < 56 else (lerp(J["lhand"][0], plug_rest[0], seg(f, 56, 62)),
                                          lerp(J["lhand"][1], plug_rest[1], seg(f, 56, 62)))
        cable(c, [(318, FRONT - 100), (300, FRONT - 10), hand], (150, 150, 160), 6)
        c.rect(hand[0] - 8, hand[1] - 6, hand[0] + 8, hand[1] + 6, fill=(150, 150, 160))
        if f >= 50:
            cross(c, (317, FRONT - 230), 34 * seg(f, 50, 55), RED)
        if f >= 58:
            cross(c, (100, 380), 26 * seg(f, 58, 62), RED)
            cross(c, (525, 520), 26 * seg(f, 60, 64), RED)
    return c


def s3(f):
    c = Canvas((205, 235, 255))
    win = seg(f, 21, 35)
    smoke = seg(f, 36, 46)
    pv = seg(f, 51, 63)
    region(c, f, day=True, win_frac=win, smoke=smoke, pv=pv, sun=seg(f, 0, 12))
    car(c, 40, FRONT)
    charger(c, 290, FRONT)
    plugged = f >= 66
    # elektryk
    if f < 20:
        p = walk(f, P(gy=FRONT, s=0.85), -60, 440, 0, 20)
    else:
        base = P(STAND, x=440, gy=FRONT, s=0.85)
        point_up = P(base, ra1=-150, ra2=-150, la1=150, la2=155)  # wskazuje na bloki
        point_up = P(base, la1=-140, la2=-150)
        pv_pose = P(base, la1=-120, la2=-160, ra1=120, ra2=160)
        plug = P(base, la1=-70, la2=-95, torso=-8)
        thumb = P(base, ra1=110, ra2=175, la1=-15)
        p = keyed(f, [(20, base), (24, point_up), (34, point_up), (38, base), (50, base), (53, pv_pose),
                      (63, pv_pose), (66, plug), (74, plug), (81, base), (84, thumb)])
    J = figure(c, p, INK, helmet=True)
    plug_pt = (215, FRONT - 75)
    if plugged:
        hand = J["lhand"] if f < 75 else plug_pt
        tgt = (lerp(J["lhand"][0], plug_pt[0], seg(f, 66, 74)), lerp(J["lhand"][1], plug_pt[1], seg(f, 66, 74)))
        cable(c, [(318, FRONT - 100), (300, FRONT - 10), tgt], (40, 40, 40), 6)
        if f >= 74 and (f // 2) % 2 == 0:
            lightning(c, (150, FRONT - 170), 30, YEL_D, 8)
        if f >= 74:
            # pasek ładowania
            prog = seg(f, 74, 89)
            c.rect(80, FRONT - 230, 230, FRONT - 205, fill=(255, 255, 255), outline=INK, w=3, r=6)
            c.rect(84, FRONT - 226, 84 + 142 * prog, FRONT - 209, fill=(70, 190, 90), r=4)
    else:
        cable(c, [(318, FRONT - 100), (300, FRONT - 20), (330, FRONT - 70)], (40, 40, 40), 6)
        cross(c, (317, FRONT - 230), 34, RED)
    if f >= 84:
        hx, hy = J["rhand"]
        c.circle((hx, hy), 9, fill=INK)
        c.line([(hx, hy), (hx, hy - 22)], INK, 8)
    return c


# ------------------------------------------------------------------ SCENA 4: dzień pracy
def clock(c, cen, hour):
    x, y = cen
    c.circle(cen, 52, fill=(255, 255, 255), outline=INK, w=6)
    for i in range(12):
        a = math.radians(i * 30)
        c.line([(x + math.sin(a) * 40, y - math.cos(a) * 40), (x + math.sin(a) * 46, y - math.cos(a) * 46)], INK, 3)
    ah = math.radians((hour % 12) * 30)
    c.line([(x, y), (x + math.sin(ah) * 26, y - math.cos(ah) * 26)], INK, 7)
    am = math.radians((hour % 1) * 360)
    c.line([(x, y), (x + math.sin(am) * 38, y - math.cos(am) * 38)], (200, 40, 40), 4)


def socket(c, cen):
    x, y = cen
    c.rect(x - 34, y - 34, x + 34, y + 34, fill=(255, 255, 255), outline=INK, w=5, r=10)
    c.circle((x, y), 20, outline=(120, 120, 120), w=3)
    c.circle((x - 8, y), 4, fill=INK)
    c.circle((x + 8, y), 4, fill=INK)


def multimeter(c, hand, f, show):
    x, y = hand
    c.rect(x - 26, y - 70, x + 26, y + 6, fill=(250, 190, 30), outline=INK, w=4, r=6)
    c.rect(x - 18, y - 62, x + 18, y - 40, fill=(200, 230, 200))
    if show:
        c.text((x, y - 51), "230V", 12, INK)
    c.circle((x, y - 22), 9, fill=(60, 60, 60))


def s4(f):
    c = Canvas((242, 242, 242))
    gy = 1060
    c.rect(0, gy, 720, H, fill=(205, 195, 180))
    c.line([(0, gy), (720, gy)], INK, 6)
    hour = 7 + 8 * (f / 100)
    clock(c, (610, 380), hour)
    sock = (560, 840)
    socket(c, sock)
    bulb_pos = (300, 470)
    bulb_lit = f >= 88
    bulb(c, bulb_pos, bulb_lit, 1.0, cord_top=330)
    # kabel po ścianie (odsłaniany 51–75)
    path = [(40, 600), (520, 600), (560, 640), (560, 800)]
    reveal = seg(f, 52, 74) if f < 76 else 1.0
    if f >= 50:
        lengths = [math.dist(a, b) for a, b in zip(path, path[1:])]
        tot = sum(lengths) * reveal
        pts = [path[0]]
        for (a, b), L in zip(zip(path, path[1:]), lengths):
            if tot <= 0:
                break
            t = min(1.0, tot / L)
            pts.append((lerp(a[0], b[0], t), lerp(a[1], b[1], t)))
            tot -= L
        if len(pts) > 1:
            c.line(pts, (60, 110, 200), 9)
        cable_end = pts[-1]
    base = P(STAND, x=250, gy=gy, s=1.05)
    if f < 25:
        stretch = P(ARMS_UP, x=250, gy=gy, s=1.05)
        p = keyed(f, [(0, base), (11, base), (16, stretch), (21, stretch), (25, base)])
        J = figure(c, p, INK, helmet=f >= 10)
        if f < 10:
            hy = lerp(150, J["head"][1], seg(f, 0, 10))
            helmet_draw(c, (J["head"][0], hy), 1.05)
    elif f < 50:
        meas = P(base, x=lerp(250, 420, seg(f, 25, 31)), ra1=75, ra2=55)
        p = keyed(f, [(25, base), (31, meas)]) if f < 31 else meas
        J = figure(c, p, INK, helmet=True)
        if f >= 29:
            h = J["rhand"]
            cable(c, [(h[0] - 8, h[1] - 10), (h[0] + 40, h[1] + 30), (sock[0] - 8, sock[1])], RED, 4)
            cable(c, [(h[0] + 8, h[1] - 10), (h[0] + 60, h[1] + 50), (sock[0] + 8, sock[1])], INK, 4)
            multimeter(c, h, f, f >= 34)
            if f in (35, 36, 42, 43):
                lightning(c, (sock[0] + 60, sock[1] - 60), 26, YEL_D, 8)
    elif f < 76:
        hold = P(base, la1=-150, la2=-165)
        if f < 52:
            p = keyed(f, [(50, P(base, x=420)), (52, P(hold, x=60))])
        else:
            p = walk(f, P(gy=gy, s=1.05, helmet=True), 60, 500, 52, 74)
            p.update(la1=-150, la2=-170)
        J = figure(c, p, INK, helmet=True)
    else:
        reach = P(base, x=300, ra1=-160, ra2=-178, la1=-160, la2=-178)
        reach = P(base, x=330, la1=-165, la2=-175)
        happy = P(ARMS_OUT, x=330, gy=gy, s=1.05)
        p = keyed(f, [(76, P(base, x=500)), (82, reach), (88, reach), (93, happy)])
        J = figure(c, p, INK, helmet=True)
        if f >= 89:
            c.glow(bulb_pos, 160, YEL, 0.6)
    return c


# ------------------------------------------------------------------ SCENA 5: umiejętności
def s5(f):
    c = Canvas((255, 246, 179))
    gy = 1060
    c.line([(0, gy), (720, gy)], INK, 6)
    base = P(STAND, x=300, gy=gy, s=1.15)
    phase = min(3, f // 22 if f < 66 else 3)
    # ikonki (narysowane, bez tekstu)
    ix, iy = 560, 640
    if phase == 0:  # precyzja – celownik
        p = keyed(f, [(0, base), (6, P(base, torso=20, head=10, ra1=110, ra2=125, la1=-10))])
        if f > 6:
            p["ra2"] += 3 * math.sin(f * 2)
        J = figure(c, p, INK, helmet=True)
        tgt = (J["rhand"][0] + 26, J["rhand"][1] - 4)
        c.circle(tgt, 24, outline=RED, w=4)
        c.line([(tgt[0] - 36, tgt[1]), (tgt[0] + 36, tgt[1])], RED, 3)
        c.line([(tgt[0], tgt[1] - 36), (tgt[0], tgt[1] + 36)], RED, 3)
        c.circle((ix, iy), 70, outline=RED, w=8)
        c.circle((ix, iy), 40, outline=RED, w=8)
        c.circle((ix, iy), 12, fill=RED)
    elif phase == 1:  # logika – ręka przy głowie, żarówka
        think = P(base, ra1=-150, ra2=-30, head=-10, la1=-20)
        p = keyed(f, [(22, base), (28, think)])
        J = figure(c, p, INK, helmet=True)
        if f >= 31:
            bulb(c, (J["head"][0] + 10, J["head"][1] - 140), True, 0.9 * seg(f, 31, 35) + 0.01)
        # zębatki
        for k, (gx, gyy, r) in enumerate(((ix - 25, iy - 20, 46), (ix + 45, iy + 50, 32))):
            rot = f * (12 if k == 0 else -18)
            for i in range(8):
                a = math.radians(i * 45 + rot)
                c.line([(gx + math.cos(a) * r, gyy + math.sin(a) * r), (gx + math.cos(a) * (r + 16), gyy + math.sin(a) * (r + 16))], (90, 90, 90), 14)
            c.circle((gx, gyy), r, fill=(120, 120, 120))
            c.circle((gx, gyy), r * 0.35, fill=(255, 246, 179))
    elif f < 66:  # odpowiedzialność – ręka na sercu, lista
        heart = P(base, la1=30, la2=95, ra1=20)
        p = keyed(f, [(44, base), (50, heart)])
        J = figure(c, p, INK, helmet=True)
        c.rect(ix - 60, iy - 85, ix + 60, iy + 85, fill=(255, 255, 255), outline=INK, w=6, r=8)
        c.rect(ix - 22, iy - 98, ix + 22, iy - 78, fill=(140, 90, 50))
        for i in range(3):
            yy = iy - 40 + i * 45
            if f >= 50 + i * 4:
                c.line([(ix - 42, yy), (ix - 30, yy + 12), (ix - 10, yy - 12)], (40, 160, 70), 6)
            c.line([(ix, yy), (ix + 42, yy)], (150, 150, 150), 5)
    else:  # bezpieczeństwo – wyłącznik
        sw = (560, 820)
        lever_t = seg(f, 70, 76)
        reach = P(base, x=330, ra1=105, ra2=95)
        point = P(base, x=330, la1=-150, la2=-160, ra1=20)
        p = keyed(f, [(66, base), (70, reach), (77, reach), (82, point)])
        J = figure(c, p, INK, helmet=True)
        c.rect(sw[0] - 60, sw[1] - 110, sw[0] + 60, sw[1] + 110, fill=(200, 200, 205), outline=INK, w=6, r=10)
        c.rect(sw[0] - 20, sw[1] - 50, sw[0] + 20, sw[1] + 50, fill=(90, 90, 95))
        ly = lerp(sw[1] - 35, sw[1] + 35, lever_t)
        c.rect(sw[0] - 28, ly - 14, sw[0] + 28, ly + 14, fill=RED if lever_t < 1 else (60, 170, 80), r=5)
        lightning(c, (sw[0], sw[1] - 80), 16, (40, 40, 40), 5)
        c.text((sw[0], sw[1] + 85), "OFF" if lever_t >= 1 else "ON", 22, INK)
        if f >= 80 and (f // 3) % 2 == 0:
            c.glow(J["head"], 90, YEL, 0.7)
    # znacznik postępu (4 kropki)
    for i in range(4):
        c.circle((300 + i * 40, 1150), 10, fill=INK if i <= phase else (210, 200, 140))
    return c


# ------------------------------------------------------------------ SCENA 6: ścieżka (schody)
STEPS = [(0, 200, 1150), (200, 380, 990), (380, 560, 830), (560, 720, 670)]


def school_icon(c, cx, cy):
    c.rect(cx - 45, cy - 20, cx + 45, cy + 45, fill=(240, 200, 150), outline=INK, w=4)
    c.poly([(cx - 55, cy - 20), (cx, cy - 60), (cx + 55, cy - 20)], fill=(200, 70, 60), outline=INK, w=4)
    c.rect(cx - 12, cy + 10, cx + 12, cy + 45, fill=(120, 80, 50))
    c.line([(cx, cy - 60), (cx, cy - 95)], INK, 4)
    c.poly([(cx, cy - 95), (cx + 28, cy - 86), (cx, cy - 77)], fill=(60, 120, 220))


def wrench_icon(c, cx, cy):
    c.line([(cx - 35, cy + 35), (cx + 20, cy - 20)], (110, 110, 120), 14)
    c.circle((cx + 28, cy - 28), 20, fill=(110, 110, 120))
    c.circle((cx + 36, cy - 36), 9, fill=(223, 245, 216))
    c.line([(cx - 35, cy - 30), (cx + 30, cy + 35)], (230, 150, 30), 10)
    c.line([(cx - 35, cy - 30), (cx - 15, cy - 10)], (40, 40, 40), 14)


def cert_icon(c, cx, cy):
    c.rect(cx - 55, cy - 38, cx + 55, cy + 38, fill=(255, 255, 255), outline=(60, 120, 60), w=5)
    for i in range(3):
        c.line([(cx - 38, cy - 18 + i * 14), (cx + 15, cy - 18 + i * 14)], (150, 150, 150), 4)
    c.circle((cx + 32, cy + 18), 14, fill=RED)
    c.text((cx - 10, cy + 22), "SEP", 15, (60, 120, 60))


def s6(f):
    c = Canvas((223, 245, 216))
    step_col = (120, 170, 110)
    for x0, x1, y in STEPS:
        c.rect(x0, y, x1, H, fill=step_col, outline=(60, 100, 60), w=5)
    for (x0, x1, y), num in zip(STEPS[1:], ("1", "2", "3")):
        c.circle((x0 + 30, y + 40), 20, fill=(255, 255, 255))
        c.text((x0 + 30, y + 40), num, 24, (60, 100, 60))
    school_icon(c, 300, 1080)
    wrench_icon(c, 480, 920)
    cert_icon(c, 640, 770)
    # mistrz (elektryk) na stopniu 2
    master = P(STAND, x=530, gy=830, s=0.7)
    if 45 <= f < 60:
        master = P(master, la1=-120, la2=-140)
    # cel na górze – świecąca żarówka
    bulb(c, (640, 380), True, 1.0, cord_top=300)
    # trasa skoków
    stops = [(100, 1150), (300, 990), (460, 830), (630, 670)]
    jumps = [(11, 21), (40, 50), (65, 75)]
    p = None
    for i, (a, b) in enumerate(jumps):
        if f < a:
            x, y = stops[i]
            p = P(STAND, x=x, gy=y, s=0.7)
            break
        if f <= b:
            t = (f - a) / (b - a)
            (x0, y0), (x1, y1) = stops[i], stops[i + 1]
            if t < 0.2:
                p = P(CROUCH, x=x0, gy=y0, s=0.7)
            elif t > 0.85:
                p = P(CROUCH, x=x1, gy=y1, s=0.7)
            else:
                u = (t - 0.2) / 0.65
                x = lerp(x0, x1, u)
                y = lerp(y0, y1, u) - math.sin(u * math.pi) * 110
                p = P(JUMP, x=x, gy=y, s=0.7)
            break
    if p is None:
        x, y = stops[-1]
        p = P(STAND, x=x, gy=y, s=0.7)
        if f >= 92:
            p = blend(p, P(ARMS_UP, x=x, gy=y, s=0.7), (f - 92) / 4)
    if 50 < f <= 60:  # przy mistrzu – przybicie piątki
        p = P(p, ra1=120, ra2=130)
        master = P(master, la1=-120, la2=-130)
    figure(c, master, INK, helmet=True)
    on_head = f >= 92
    J = figure(c, p, INK, helmet=on_head)
    if 80 <= f < 92:
        hy = lerp(420, J["head"][1], seg(f, 80, 91))
        helmet_draw(c, (J["head"][0], hy), 0.7)
    return c


# ------------------------------------------------------------------ SCENA 7: wszystko się zapala
BULBS7 = [(80, 420, 300), (180, 520, 300), (280, 400, 300), (360, 560, 300), (440, 400, 300), (540, 520, 300), (640, 420, 300)]


def s7(f):
    all_lit = seg(f, 26, 34)
    c = Canvas(mix((0, 0, 0), (40, 30, 0), all_lit))
    # girlanda – kabel
    cable(c, [(0, 300), (360, 360), (720, 300)], (90, 90, 90), 5)
    for i, (x, y, top) in enumerate(BULBS7):
        on = f >= i * 4
        bulb(c, (x, y), on, 0.95, cord_top=top + 20, dark=True)
    # panorama miasta
    sky = [(0, 900), (60, 900), (60, 820), (130, 820), (130, 870), (200, 870), (200, 780), (250, 760), (300, 780),
           (300, 880), (380, 880), (380, 800), (460, 800), (460, 860), (530, 860), (530, 760), (600, 760), (600, 850), (720, 850), (720, 960), (0, 960)]
    c.poly(sky, fill=(20, 20, 28))
    rng = np.random.default_rng(7)
    for i in range(36):
        x, y = rng.uniform(10, 700), rng.uniform(790, 950)
        inside = c.img.getpixel((int(x * SS), int(y * SS)))[:3] == (20, 20, 28)
        if inside:
            on = f >= 28 + (i % 6) * 2
            c.rect(x, y, x + 10, y + 12, fill=YEL if on else (45, 45, 55))
    gy = 1180
    c.rect(0, 960, 720, H, fill=(25, 25, 32))
    base = P(STAND, x=360, gy=gy, s=1.05)
    if f < 28:
        p = keyed(f, [(0, base), (8, P(base, head=-12)), (16, P(base, head=12)), (24, base)])
    elif f < 58:
        k = (f - 28) % 10
        if k < 2:
            p = P(CROUCH, x=360, gy=gy, s=1.05)
        elif k < 8:
            u = (k - 2) / 6
            p = P(JUMP, x=360, gy=gy, s=1.05, lift=math.sin(u * math.pi) * 110)
        else:
            p = P(CROUCH, x=360, gy=gy, s=1.05)
    else:
        p = P(ARMS_UP, x=360, gy=gy, s=1.05)
    J = figure(c, p, WHITE, helmet=True)
    if f >= 30:
        rng = np.random.default_rng(f)
        for i in range(10):
            a = rng.uniform(0, 2 * math.pi)
            r = rng.uniform(90, 170)
            cx, cy = J["head"][0] + math.cos(a) * r, J["head"][1] - 40 + math.sin(a) * r
            c.line([(cx - 6, cy), (cx + 6, cy)], YEL, 4)
            c.line([(cx, cy - 6), (cx, cy + 6)], YEL, 4)
    return c


SCENE_FN = dict(s1a=s1a, s1b=s1b, s2=s2, s3=s3, s4=s4, s5=s5, s6=s6, s7=s7)

# ------------------------------------------------------------------ teksty
LEKTOR = [  # (start s, koniec s, tekst)
    (0.3, 3.6, "Wieczór. Odrabiam lekcje i nagle… ciemność."),
    (3.7, 5.9, "Co by było, gdyby nikt tego nie naprawił?"),
    (6.2, 9.4, "Dolny Śląsk bez elektryków: nowe osiedla bez światła,"),
    (9.4, 12.8, "stojące fabryki i auta elektryczne, których nikt nie naładuje."),
    (13.2, 17.4, "A teraz z elektrykami: oświetlone osiedla, działające fabryki,"),
    (17.4, 21.8, "fotowoltaika na dachach i ładowarki przy drogach. Tak wygląda przyszłość regionu."),
    (22.2, 26.4, "Dzień elektryka? Rano kask i narzędzia. Potem pomiary miernikiem,"),
    (26.4, 31.8, "układanie kabli, montaż i szukanie usterek. Każdy dzień jest inny."),
    (32.2, 36.4, "Potrzebujesz precyzji, logicznego myślenia i odpowiedzialności."),
    (36.4, 40.8, "A najważniejsze jest bezpieczeństwo: najpierw wyłączasz prąd, potem pracujesz."),
    (41.2, 45.6, "Jak zacząć? Technikum albo szkoła branżowa, praktyki u doświadczonego elektryka,"),
    (45.6, 50.8, "a potem egzamin i świadectwo kwalifikacyjne SEP. Wtedy pracujesz legalnie i bezpiecznie."),
    (51.2, 54.8, "Elektryk to zawód, który zapala światło w całym regionie."),
    (54.8, 57.9, "To mój zawód przyszłości!"),
]

NAPISY = [  # (start klatka, koniec klatka, tekst ekranowy)
    (36, 60, "Co by było, gdyby\nnikt tego nie naprawił?"),
    (64, 130, "Region BEZ elektryków"),
    (134, 220, "Region Z elektrykami"),
    (222, 245, "7:00  kask i narzędzia"),
    (245, 270, "9:00  pomiary"),
    (270, 296, "12:00  układanie kabli"),
    (296, 320, "15:00  usterka naprawiona ✔"),
    (322, 342, "Precyzja"),
    (342, 364, "Logiczne myślenie"),
    (364, 386, "Odpowiedzialność"),
    (386, 410, "Bezpieczeństwo"),
    (412, 440, "1. Technikum / szkoła branżowa"),
    (440, 465, "2. Praktyki"),
    (465, 510, "3. Uprawnienia SEP"),
    (514, 580, "ELEKTRYK\nmój zawód przyszłości\nDolny Śląsk"),
]


def overlay_text(img, f):
    for a, b, txt in NAPISY:
        if a <= f < b:
            d = ImageDraw.Draw(img, "RGBA")
            size = 52 if "\n" not in txt else 46
            if f >= 514:
                size = 50
            while True:
                font = ImageFont.truetype(FONT_BOLD, size)
                box = d.multiline_textbbox((W / 2, 0), txt, font=font, anchor="ma", align="center", spacing=10)
                if box[2] - box[0] <= W - 100 or size <= 24:
                    break
                size -= 2
            tw, th = box[2] - box[0], box[3] - box[1]
            y = 120 if f < 514 else 120
            pop = min(1.0, (f - a + 1) / 3)
            pad = 24
            d.rounded_rectangle((W / 2 - tw / 2 - pad, y - pad, W / 2 + tw / 2 + pad, y + th + pad + 6), 22,
                                fill=(0, 0, 0, int(170 * pop)))
            col = (255, 212, 59) if f >= 514 else (255, 255, 255)
            d.multiline_text((W / 2, y), txt, font=font, fill=col + (int(255 * pop),), anchor="ma", align="center", spacing=10)
    return img


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def write_texts():
    with open(os.path.join(OUT, "lektor_napisy.srt"), "w", encoding="utf-8") as fh:
        for i, (a, b, t) in enumerate(LEKTOR, 1):
            fh.write(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{t}\n\n")
    with open(os.path.join(OUT, "napisy_ekranowe.srt"), "w", encoding="utf-8") as fh:
        for i, (a, b, t) in enumerate(NAPISY, 1):
            fh.write(f"{i}\n{srt_time(a / FPS)} --> {srt_time(b / FPS)}\n{t}\n\n")


# ------------------------------------------------------------------ efekty dźwiękowe
SR = 44100


def tone(freq, dur, vol=0.3, decay=6.0, kind="sine"):
    t = np.linspace(0, dur, int(SR * dur), False)
    if kind == "sine":
        w = np.sin(2 * np.pi * freq * t)
    elif kind == "saw":
        w = 2 * ((freq * t) % 1) - 1
    else:
        w = np.random.default_rng(1).uniform(-1, 1, t.size)
    env = np.exp(-decay * t) * np.minimum(1, t / 0.005)
    return w * env * vol


def write_sfx(path):
    buf = np.zeros(int(SR * TOTAL / FPS) + SR)

    def put(sec, snd):
        i = int(sec * SR)
        buf[i:i + snd.size] += snd[: max(0, buf.size - i)]

    click = tone(0, 0.05, 0.5, 60, "noise") + tone(1800, 0.05, 0.3, 80)
    buzz = tone(110, 0.25, 0.12, 6, "saw")
    for fr in (30, 32, 34, 36):
        put(fr / FPS, buzz)
    put(3.95, click)                                        # gaśnie
    put(5.5, tone(330, 0.5, 0.15, 5) + 0)                   # pytanie
    put(11.0, tone(140, 0.6, 0.18, 4))                      # brak prądu (bum)
    for i, fr in enumerate(range(151, 166, 3)):              # okna zapalają się
        put((130 + (fr - 130)) / FPS, tone(660 + i * 110, 0.25, 0.12, 9))
    put((130 + 74) / FPS, buzz)
    put((130 + 88) / FPS, tone(880, 0.4, 0.18, 6) + np.pad(tone(1320, 0.3, 0.12, 6), (0, int(SR * 0.1))))
    put(22.0 + 1.0, click)                                   # kask
    for fr in (35, 42):
        put((220 + fr) / FPS, buzz)
    put((220 + 88) / FPS, tone(990, 0.35, 0.16, 7))          # żarówka
    for k in range(4):
        put((320 + k * 22 + 2) / FPS, tone(520 + k * 130, 0.3, 0.14, 8))
    put((320 + 76) / FPS, click)
    for k, fr in enumerate((16, 45, 70)):                    # skoki po schodach
        put((410 + fr) / FPS, tone(440 * (1.25 ** k), 0.3, 0.15, 8))
    put((410 + 92) / FPS, tone(1046, 0.5, 0.14, 5))
    notes = [523, 587, 659, 698, 784, 880, 988]
    for i, n in enumerate(notes):                           # żarówki w finale
        put((510 + i * 4) / FPS, tone(n, 0.4, 0.14, 6))
    for k in range(3):
        put((510 + 30 + k * 10) / FPS, tone(392, 0.15, 0.12, 12))
    for n in (523, 659, 784, 1046):
        put((510 + 58) / FPS, tone(n, 1.2, 0.1, 2.5))
    buf = buf[: int(SR * TOTAL / FPS)]
    buf = np.clip(buf, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())


# ------------------------------------------------------------------ render
def ffmpeg(out, audio):
    return subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", audio, "-map", "0:v", "-map", "1:a",
         "-vf", "fps=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)


def render_frame(f):
    for name, start, n in SCENES:
        if start <= f < start + n:
            return SCENE_FN[name](f - start).final()
    raise ValueError(f)


def main():
    os.makedirs(OUT, exist_ok=True)
    only = os.environ.get("PREVIEW")
    if only:  # podgląd wybranych klatek: PREVIEW=0,35,100
        for f in map(int, only.split(",")):
            overlay_text(render_frame(f), f).save(os.path.join(OUT, f"podglad_{f:03}.png"))
        return
    write_texts()
    sfx = os.path.join(OUT, "efekty_dzwiekowe.wav")
    write_sfx(sfx)
    clean = ffmpeg(os.path.join(OUT, "elektryk_bez_napisow.mp4"), sfx)
    subs = ffmpeg(os.path.join(OUT, "elektryk_z_napisami.mp4"), sfx)
    for f in range(TOTAL):
        img = render_frame(f)
        clean.stdin.write(img.tobytes())
        subs.stdin.write(overlay_text(img.copy(), f).tobytes())
        if f % 50 == 0:
            print(f"klatka {f}/{TOTAL}", flush=True)
    for p in (clean, subs):
        p.stdin.close()
        p.wait()
    print("gotowe:", OUT)


if __name__ == "__main__":
    main()
