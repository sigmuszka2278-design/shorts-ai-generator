"""
Render obrazu: 30 s, 1080×1920, 30 kl./s.
  python3 render.py --workers 4            # cały film -> build/video.mp4 (bez dźwięku)
  python3 render.py --stills 1.5,6,11      # pojedyncze klatki do podglądu -> build/stills/
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from bh import BlackHoleRenderer, Camera, bloom, make_sky, tonemap
from script import DURATION, FPS, HEIGHT, SEGMENTS, TRANSITIONS, WIDTH

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
W, H = WIDTH, HEIGHT
FONT_BLACK = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FONT_BOLD = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
FONT_SEMI = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
FONT_EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
GOLD = (255, 201, 77)
RED = (255, 90, 60)
CYAN = (110, 220, 255)
GALAXY_DIR = [-1.0, 0.05, 0.25]


# --------------------------------------------------------------------------- narzędzia
def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x, p=3):
    return 1 - (1 - clamp01(x)) ** p


def ease_in_out(x):
    x = clamp01(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def lerp(a, b, t):
    return a + (b - a) * t


def loglerp(a, b, t):
    return math.exp(lerp(math.log(a), math.log(b), t))


@lru_cache(maxsize=64)
def font(path, size):
    return ImageFont.truetype(path, size)


@lru_cache(maxsize=8)
def emoji(ch, size):
    f = font(FONT_EMOJI, 109)
    im = Image.new("RGBA", (160, 160))
    ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    return im.resize((size, int(size * im.height / im.width)), Image.LANCZOS)


class Assets:
    def __init__(self):
        sky_path = os.path.join(BUILD, "sky.npy")
        if not os.path.exists(sky_path):
            os.makedirs(BUILD, exist_ok=True)
            print("Generuję mapę nieba…", flush=True)
            np.save(sky_path, make_sky(8192, galaxy_dir=GALAXY_DIR))
        self.sky = np.load(sky_path)
        self.bh = BlackHoleRenderer(W, H, self.sky)
        self.timing = json.load(open(os.path.join(BUILD, "timing.json")))
        astro_path = os.path.join(BUILD, "astronaut.npy")
        if not os.path.exists(astro_path):
            from astronaut import render_astronaut

            env_cam = Camera(30, math.radians(80), az=2.6, hfov=math.radians(70))
            env = self.bh.render(env_cam, 10.0)
            env = cv2.resize(env, (360, 640), interpolation=cv2.INTER_AREA)
            np.save(astro_path, render_astronaut(900, 1300, env, ss=2))
        self.astro = np.load(astro_path)
        rng = np.random.default_rng(5)
        self.particles = rng.random((420, 4)).astype(np.float32)


# --------------------------------------------------------------------------- obraz (HDR, liniowo)
def bh_frame(A: Assets, cam: Camera, t, exposure=1.0, **kw):
    img = A.bh.render(cam, t, **kw)
    return img * exposure


def scene_hdr(A: Assets, t: float):
    """Zwraca (obraz liniowy HDR, kontekst dla nakładek)."""
    ctx = {}
    if t < 4.0:  # S1: szybki dolot
        p = t / 4.0
        e = ease_out(p, 3)
        cam = Camera(D=loglerp(420, 40, e), incl=math.radians(lerp(76, 83, e)), az=2.2 + 0.25 * e,
                     roll=lerp(-0.22, 0.0, ease_out(p, 2)), pitch=math.radians(-6), hfov=math.radians(lerp(58, 48, e)))
        img = bh_frame(A, cam, t)
        ctx["zoom_blur"] = 0.10 * (1 - ease_out(p, 2))
    elif t < 9.0:  # S2: zakrzywienie światła
        p = (t - 4) / 5
        cam = Camera(D=38, incl=math.radians(86), az=2.5 + 0.06 * p, hfov=math.radians(lerp(36, 33, p)))
        img = bh_frame(A, cam, t, disk_gain=0.42)
        ctx["rays"] = (cam, t - 4.0)
    elif t < 12.0:  # S3a: astronauta z bliska
        p = (t - 9) / 3
        cam = Camera(D=lerp(32, 28, p), incl=math.radians(80), az=2.75 + 0.05 * p, yaw=math.radians(-12), pitch=math.radians(10),
                     hfov=math.radians(62))
        img = bh_frame(A, cam, t)
        img = cv2.GaussianBlur(img, (0, 0), 3.0)  # głębia ostrości
        ctx["astro_close"] = p
    elif t < 15.0:  # S3b: widok obserwatora – astronauta spada, czas zwalnia
        p = (t - 12) / 3
        cam = Camera(D=34, incl=math.radians(81), az=2.62 + 0.03 * p, hfov=math.radians(lerp(42, 38, p)))
        img = bh_frame(A, cam, t)
        ctx["astro_far"] = (cam, p)
    elif t < 18.0:  # S4a: lot przez horyzont
        p = (t - 15) / 3
        e = ease_in_out(p) * 0.6 + p ** 2 * 0.4
        D = loglerp(30, 3.15, e)
        hfov = math.radians(lerp(46, 124, e ** 1.3))
        cam = Camera(D=D, incl=math.radians(lerp(80, 74, p)), az=2.6 + 0.4 * e, roll=0.25 * e ** 2, hfov=hfov)
        img = bh_frame(A, cam, t, disk_speed=1 + 3 * e)
        # świecąca granica – pierścień fotonowy rozszerza się poza kadr
        f = (W / 2) / math.tan(hfov / 2)
        sa = min(0.999, 3 * math.sqrt(3) / D * math.sqrt(1 - 2 / D))
        Rr = f * math.tan(math.asin(sa)) if D > 3 else f * 3
        Rr *= 1 + 0.6 * smooth((t - 17.3) / 0.7)
        img = img + boundary_ring(Rr, (0.5 + 2.5 * smooth((t - 16.4) / 1.4)))
        ctx["shake"] = 6 * e ** 3
        ctx["zoom_blur"] = 0.06 * e ** 2
    elif t < 21.0:  # S4b: za horyzontem – gwiazdy gasną
        p = (t - 18) / 3
        img = boundary_ring(W * (0.8 + 0.25 * p), 0.8 * (1 - smooth(p * 1.6)) ** 2, width=0.05)
        ctx["streaks"] = p
    elif t < 26.0:  # S5: wnętrze – tajemnica
        img = mystery(A, t)
    else:  # S6: odjazd kamery – ogromna czarna dziura na tle galaktyki
        p = (t - 26) / 4
        e = ease_out(p, 2.4)
        cam = Camera(D=loglerp(14, 75, e), incl=math.radians(lerp(70, 81, e)), az=lerp(0.45, 0.02, e), roll=lerp(0.2, 0.0, e),
                     pitch=math.radians(lerp(0, 8, e)), hfov=math.radians(lerp(80, 42, e)))
        img = bh_frame(A, cam, t, sky_gain=1.25)
    return img, ctx


@lru_cache(maxsize=1)
def _radius_map():
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.sqrt((xs - W / 2) ** 2 + (ys - H / 2) ** 2)


def boundary_ring(R, gain, width=0.035):
    r = _radius_map()
    w = max(6.0, R * width)
    ring = np.exp(-((r - R) / w) ** 2) + 0.15 * np.exp(-((r - R) / (w * 4)) ** 2)
    col = np.array([1.0, 0.78, 0.5], np.float32)
    return (ring[..., None] * col * gain).astype(np.float32)


def mystery(A: Assets, t):
    """Tajemnicza ciemność: wirujące mgły, świetliste nitki i drobiny światła."""
    p = (t - 21) / 5
    h, w = H // 4, W // 4
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h * 0.46
    dx, dy = xs - cx, ys - cy
    r = np.sqrt(dx * dx + dy * dy) / w + 1e-3
    th = np.arctan2(dy, dx)
    rng = np.random.default_rng(3)
    fog = np.zeros((h, w), np.float32)
    for k, sc in enumerate((5, 9, 17)):
        g = rng.random((sc, sc)).astype(np.float32)
        g = cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
        ang = th + (0.9 / (r + 0.15)) * 0.25 + t * (0.12 + 0.05 * k)
        mx = (cx + np.cos(ang) * r * w).astype(np.float32)
        my = (cy + np.sin(ang) * r * w).astype(np.float32)
        fog += cv2.remap(g, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT) / (k + 1)
    fog = np.clip(fog - 0.6, 0, None) ** 1.8
    # spiralne nitki światła
    fil = np.zeros_like(r)
    for kk, (arms, tw, sp, amp) in enumerate(((3, 6.0, 1.4, 1.0), (5, 9.0, -0.9, 0.5), (2, 4.0, 2.0, 0.6))):
        spiral = np.cos(arms * th + tw * np.log(r) - t * sp + kk)
        fil += amp * np.exp(-((1 - spiral) / 0.025)) * np.exp(-r * 3.6) * (r > 0.04)
    fil *= 0.6 + 0.4 * np.sin(t * 2.0 + r * 20)
    hue = smooth((t - 23.5) / 1.2)
    c1 = np.array([0.35, 0.18, 0.9]) * (1 - hue) + np.array([0.1, 0.6, 0.8]) * hue
    c2 = np.array([0.9, 0.5, 0.25])
    img = fog[..., None] * c1 * 0.16 + fil[..., None] * c2 * 0.45
    core = np.exp(-(r / 0.05) ** 2)
    img *= (1 - core)[..., None]
    img = cv2.resize(img.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    # drobiny światła spadające spiralą do środka
    P = A.particles
    ang = P[:, 0] * 6.283 + t * (0.4 + P[:, 1])
    rad = ((P[:, 2] - (t - 21) * 0.06 * (0.5 + P[:, 1])) % 1.0) * 0.8 + 0.03
    px = (W / 2 + np.cos(ang) * rad * W).astype(int)
    py = (H * 0.46 + np.sin(ang) * rad * W * 1.2).astype(int)
    tw = 0.5 + 0.5 * np.sin(t * 6 + P[:, 3] * 40)
    pts = np.zeros((H, W, 3), np.float32)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    np.add.at(pts, (py[ok], px[ok]), (np.array([1.0, 0.85, 0.7]) * (tw[ok] * rad[ok] * 6)[:, None]).astype(np.float32))
    pts = cv2.GaussianBlur(pts, (0, 0), 2.2) * 14
    img += pts
    fade_in = smooth((t - 21) / 0.6)
    return img * (0.25 + 0.75 * fade_in) * 1.2


# --------------------------------------------------------------------------- nakładki (sRGB 8-bit, PIL)
def text_layer_size(txt, f, stroke):
    l, t_, r, b = f.getbbox(txt, stroke_width=stroke)
    return r - l, b - t_, l, t_


def draw_text_center(im: Image.Image, txt, cx, cy, size, fill=(255, 255, 255), path=FONT_BLACK, stroke=8, alpha=1.0, scale=1.0,
                     glow=None, shadow=True):
    size = max(8, int(size * scale))
    f = font(path, size)
    tw, th, l, t_ = text_layer_size(txt, f, stroke)
    pad = 40
    layer = Image.new("RGBA", (tw + pad * 2, th + pad * 2))
    d = ImageDraw.Draw(layer)
    if glow:
        g = Image.new("RGBA", layer.size)
        ImageDraw.Draw(g).text((pad - l, pad - t_), txt, font=f, fill=glow + (255,), stroke_width=stroke + 4, stroke_fill=glow + (255,))
        g = Image.fromarray(cv2.GaussianBlur(np.array(g), (0, 0), 12))
        layer = Image.alpha_composite(layer, g)
        d = ImageDraw.Draw(layer)
    if shadow:
        s = Image.new("RGBA", layer.size)
        ImageDraw.Draw(s).text((pad - l, pad - t_ + 6), txt, font=f, fill=(0, 0, 0, 200), stroke_width=stroke + 2, stroke_fill=(0, 0, 0, 200))
        s = Image.fromarray(cv2.GaussianBlur(np.array(s), (0, 0), 6))
        layer = Image.alpha_composite(layer, s)
        d = ImageDraw.Draw(layer)
    d.text((pad - l, pad - t_), txt, font=f, fill=fill + (255,), stroke_width=stroke, stroke_fill=(0, 0, 0, 255))
    if alpha < 1:
        a = np.array(layer)
        a[..., 3] = (a[..., 3] * alpha).astype(np.uint8)
        layer = Image.fromarray(a)
    im.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))
    return tw, th


def draw_caption(im, words, highlight, cx, cy, size, prog, color_hl=GOLD):
    """Napis z wyróżnionymi słowami; prog 0..1 – animacja wejścia (pop)."""
    s = 0.82 + 0.18 * ease_out(prog / 0.6, 3) + 0.04 * math.sin(min(1, prog) * math.pi)
    a = clamp01(prog / 0.35)
    size_s = int(size * s)
    f = font(FONT_BLACK, size_s)
    stroke = max(4, size_s // 9)
    space = f.getlength(" ")
    widths = [f.getlength(wd) for wd in words]
    total = sum(widths) + space * (len(words) - 1)
    max_w = W - 120
    lines, cur, cur_w = [], [], 0.0
    for wd, wdw in zip(words, widths):
        add = wdw + (space if cur else 0)
        if cur and cur_w + add > max_w:
            lines.append(cur)
            cur, cur_w = [], 0.0
            add = wdw
        cur.append((wd, wdw))
        cur_w += add
    lines.append(cur)
    lh = size_s * 1.12
    y0 = cy - lh * (len(lines) - 1) / 2
    pad = 50
    layer = Image.new("RGBA", (W, int(lh * len(lines) + pad * 2 + size_s)))
    sh = Image.new("RGBA", layer.size)
    d, ds = ImageDraw.Draw(layer), ImageDraw.Draw(sh)
    base_y = pad
    for li, line in enumerate(lines):
        lw = sum(x[1] for x in line) + space * (len(line) - 1)
        x = cx - lw / 2
        y = base_y + li * lh
        for wd, wdw in line:
            col = color_hl if wd in highlight else (255, 255, 255)
            ds.text((x, y + 7), wd, font=f, fill=(0, 0, 0, 220), stroke_width=stroke + 3, stroke_fill=(0, 0, 0, 220))
            d.text((x, y), wd, font=f, fill=col + (255,), stroke_width=stroke, stroke_fill=(10, 10, 14, 255))
            x += wdw + space
    sh = Image.fromarray(cv2.GaussianBlur(np.array(sh), (0, 0), 7))
    layer = Image.alpha_composite(sh, layer)
    if a < 1:
        arr = np.array(layer)
        arr[..., 3] = (arr[..., 3] * a).astype(np.uint8)
        layer = Image.fromarray(arr)
    im.alpha_composite(layer, (0, int(y0 - pad - size_s * 0.15)))


def captions(im, A: Assets, t):
    for si, seg in enumerate(A.timing):
        hl = SEGMENTS[si][4]
        for ch in seg["chunks"]:
            nxt_end = ch["end"]
            if ch["start"] - 0.05 <= t < nxt_end + (0.25 if ch is seg["chunks"][-1] else 0):
                prog = (t - ch["start"] + 0.05) / 0.25
                color = RED if si == 3 else GOLD
                cy = 1420 if si != 2 else 1500
                draw_caption(im, ch["text"].split(), hl, W / 2, cy, 92, prog, color)
                return


def title(im, t):
    if t > 4.1:
        return
    a_in = ease_out((t - 0.15) / 0.5, 3)
    a_out = 1 - smooth((t - 3.65) / 0.35)
    a = a_in * a_out
    if a <= 0:
        return
    dy = -40 * (1 - a_in) - 60 * (1 - a_out)
    pulse = 1 + 0.025 * math.sin(t * 7)
    draw_text_center(im, "CO BY SIĘ STAŁO,", W / 2, 300 + dy, 84, alpha=a, scale=pulse)
    draw_text_center(im, "GDYBYŚ WPADŁ DO", W / 2, 400 + dy, 84, alpha=a, scale=pulse)
    tw, _ = draw_text_center(im, "CZARNEJ DZIURY?!", W / 2 - 50, 515 + dy, 100, fill=GOLD, alpha=a, scale=pulse, glow=(255, 140, 30))
    e = emoji("😱", 110)
    if a > 0.05:
        e2 = e.copy()
        arr = np.array(e2)
        arr[..., 3] = (arr[..., 3] * a).astype(np.uint8)
        wob = math.sin(t * 9) * 8
        e2 = Image.fromarray(arr).rotate(wob, resample=Image.BICUBIC, expand=True)
        im.alpha_composite(e2, (int(W / 2 - 50 + tw * pulse / 2 + 18), int(515 + dy - e2.height / 2)))


def label_box(im, txt, x, y, size=40, color=CYAN, alpha=1.0, anchor="mm", path=FONT_BOLD):
    f = font(path, size)
    l, t_, r, b = f.getbbox(txt)
    tw, th = r - l, b - t_
    padx, pady = 22, 14
    bw, bh = tw + padx * 2, th + pady * 2
    if anchor == "mm":
        x0, y0 = x - bw / 2, y - bh / 2
    else:
        x0, y0 = x, y
    layer = Image.new("RGBA", (int(bw) + 4, int(bh) + 4))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((1, 1, bw, bh), radius=bh / 2, fill=(5, 10, 20, int(170 * alpha)), outline=color + (int(230 * alpha),), width=3)
    d.text((padx - l + 1, pady - t_ + 1), txt, font=f, fill=color + (int(255 * alpha),))
    im.alpha_composite(layer, (int(x0), int(y0)))


# --------------------------------------------------------------------------- promienie światła (S2)
@lru_cache(maxsize=1)
def photon_paths():
    """Tory fotonów w polu Schwarzschilda: d²x/dλ² = -3/2·rs·h²·x/r⁵ (rs = 2M) – dokładny kształt orbit światła."""
    paths = []
    for b in (-15, -10.5, -7.4, -5.9, -5.35, -4.2, -2.4, 2.0, 3.8, 5.25, 5.6, 6.6, 8.8, 12.5, 16):
        x = np.array([-40.0, float(b)])
        v = np.array([1.0, 0.0])
        h2 = (x[0] * v[1] - x[1] * v[0]) ** 2
        pts = [x.copy()]
        ds = 0.02
        captured = False

        def acc(x_):
            r = np.hypot(*x_)
            return -1.5 * 2.0 * h2 * x_ / r ** 5

        for _ in range(12000):
            k1v = acc(x); k1x = v
            k2v = acc(x + 0.5 * ds * k1x); k2x = v + 0.5 * ds * k1v
            k3v = acc(x + 0.5 * ds * k2x); k3x = v + 0.5 * ds * k2v
            k4v = acc(x + ds * k3x); k4x = v + ds * k3v
            x = x + ds / 6 * (k1x + 2 * k2x + 2 * k3x + k4x)
            v = v + ds / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
            v /= np.linalg.norm(v)
            r = np.hypot(*x)
            if len(pts) == 0 or np.hypot(*(x - pts[-1])) > 0.15:
                pts.append(x.copy())
            if r < 2.0:
                captured = True
                pts.append(x.copy())
                break
            if r > 45 and x[0] > 0:
                break
        pts = np.array(pts)
        seg = np.hypot(*np.diff(pts, axis=0).T)
        s = np.concatenate([[0], np.cumsum(seg)])
        paths.append((b, pts, s, captured))
    return paths


def draw_rays(im: Image.Image, cam: Camera, tl: float):
    f = (W / 2) / math.tan(cam.hfov / 2)
    k = f / cam.D  # px na M (przybliżenie małych kątów)
    cx, cy = W / 2, H / 2
    layer = np.zeros((H, W, 3), np.float32)
    paths = photon_paths()
    speed = 30.0  # M na sekundę animacji
    for i, (b, pts, s, captured) in enumerate(paths):
        start = 0.15 + (i % 5) * 0.22 + (i // 5) * 0.12
        head = (tl - start) * speed
        if head <= 0:
            continue
        tail = head - 26
        sel = (s <= head) & (s >= max(0, tail))
        if sel.sum() < 2:
            if head > s[-1] and tail > s[-1]:
                continue
        xy = pts[sel]
        if len(xy) < 2:
            continue
        P = np.stack([cx + xy[:, 0] * k, cy - xy[:, 1] * k], 1)
        n = len(P)
        col = np.array([1.0, 0.95, 0.75]) if not captured else np.array([1.0, 0.6, 0.3])
        for j in range(n - 1):
            w = (j + 1) / n
            c = col * (0.15 + 0.85 * w ** 2)
            cv2.line(layer, tuple(np.int32(P[j])), tuple(np.int32(P[j + 1])), c.tolist(), 5, cv2.LINE_AA)
        if head < s[-1]:
            hx, hy = np.int32(P[-1])
            cv2.circle(layer, (int(hx), int(hy)), 7, (col * 2.5).tolist(), -1, cv2.LINE_AA)
    glow = cv2.GaussianBlur(layer, (0, 0), 9)
    layer = layer + glow * 1.6
    # horyzont zdarzeń (r = 2M) – przerywany okrąg
    a = smooth((tl - 2.4) / 0.6)
    hz = np.zeros((H, W, 3), np.float32)
    R = 2.0 * k
    for ang in range(0, 360, 12):
        a0, a1 = math.radians(ang), math.radians(ang + 7)
        p0 = (int(cx + R * math.cos(a0)), int(cy + R * math.sin(a0)))
        p1 = (int(cx + R * math.cos(a1)), int(cy + R * math.sin(a1)))
        cv2.line(hz, p0, p1, (0.45, 0.85, 1.0), 3, cv2.LINE_AA)
    hz = hz + cv2.GaussianBlur(hz, (0, 0), 6) * 1.5
    layer += hz * a
    arr = np.array(im).astype(np.float32) / 255
    arr[..., :3] = 1 - (1 - arr[..., :3]) * (1 - np.clip(layer, 0, 1))
    im.paste(Image.fromarray((arr * 255).astype(np.uint8)))
    if a > 0:
        # etykieta z linią
        d = ImageDraw.Draw(im)
        d.line((cx, cy - R, cx, cy - 5.6 * k - 70), fill=CYAN + (int(255 * a),), width=3)
        label_box(im, "HORYZONT ZDARZEŃ", cx, cy - 5.6 * k - 100, 40, CYAN, a)
    a2 = smooth((tl - 0.6) / 0.5) * (1 - smooth((tl - 4.6) / 0.3))
    if a2 > 0:
        label_box(im, "ŚWIATŁO ZAKRZYWIA SIĘ", W / 2, 300, 40, GOLD, a2)


# --------------------------------------------------------------------------- astronauta i zegar (S3)
def clock_rate(t):
    """Tempo zegara astronauty widziane z daleka: sqrt(1 - rs/r), r maleje od ~11 rs do ~1,05 rs."""
    p = clamp01((t - 9.0) / 6.0)
    r_over_rs = 10 * (1 - p) + 1.05
    return math.sqrt(max(0.0, 1 - 1 / r_over_rs)), r_over_rs


def clock_angle(t):
    # całka tempa (numerycznie), 1 obrót / 2 s przy tempie 1
    ts = np.linspace(9.0, t, 200)
    rates = [clock_rate(x)[0] for x in ts]
    tau = np.trapezoid(rates, ts) if t > 9 else 0.0
    return tau, 2 * math.pi * tau / 2.0


def draw_clock(im, t, cx, cy, R, alpha=1.0, tint=(255, 255, 255)):
    rate, _ = clock_rate(t)
    tau, ang = clock_angle(t)
    S = int(R * 2 + 40)
    layer = Image.new("RGBA", (S, S))
    d = ImageDraw.Draw(layer)
    c = S / 2
    d.ellipse((c - R, c - R, c + R, c + R), fill=(8, 14, 26, int(200 * alpha)), outline=tint + (int(255 * alpha),), width=6)
    for i in range(60):
        a = i / 60 * 2 * math.pi
        r0 = R - (26 if i % 5 == 0 else 14)
        wdt = 5 if i % 5 == 0 else 2
        d.line((c + r0 * math.sin(a), c - r0 * math.cos(a), c + (R - 8) * math.sin(a), c - (R - 8) * math.cos(a)),
               fill=tint + (int(230 * alpha),), width=wdt)
    # wskazówka
    hx, hy = c + (R - 34) * math.sin(ang), c - (R - 34) * math.cos(ang)
    d.line((c - 30 * math.sin(ang), c + 30 * math.cos(ang), hx, hy), fill=GOLD + (int(255 * alpha),), width=8)
    d.ellipse((c - 12, c - 12, c + 12, c + 12), fill=GOLD + (int(255 * alpha),))
    # cyfrowy odczyt
    f = font(FONT_BOLD, int(R * 0.26))
    txt = f"{tau:05.2f} s".replace(".", ",")
    l, t_, r, b = f.getbbox(txt)
    d.text((c - (r - l) / 2, c + R * 0.32), txt, font=f, fill=tint + (int(255 * alpha),))
    im.alpha_composite(layer, (int(cx - S / 2), int(cy - S / 2)))


def rate_bar(im, t, x, y, w, alpha):
    rate, r_rs = clock_rate(t)
    d = ImageDraw.Draw(im)
    f = font(FONT_BOLD, 34)
    d.text((x, y - 48), "TEMPO TWOJEGO ZEGARA", font=f, fill=(220, 235, 255, int(255 * alpha)))
    d.rounded_rectangle((x, y, x + w, y + 26), radius=13, fill=(20, 28, 45, int(200 * alpha)), outline=(150, 190, 255, int(200 * alpha)), width=2)
    col = tuple(int(c) for c in np.array(CYAN) * rate + np.array(RED) * (1 - rate))
    d.rounded_rectangle((x + 4, y + 4, x + 4 + (w - 8) * rate, y + 22), radius=9, fill=col + (int(255 * alpha),))
    f2 = font(FONT_BLACK, 44)
    d.text((x + w + 18, y - 14), f"{rate * 100:.0f}%", font=f2, fill=col + (int(255 * alpha),))
    f3 = font(FONT_SEMI, 30)
    d.text((x, y + 40), f"odległość: {r_rs:.1f} × promień horyzontu".replace(".", ","), font=f3, fill=(190, 205, 230, int(230 * alpha)))


def composite_sprite(base: np.ndarray, spr: np.ndarray, cx, cy, height, angle_deg, tint=(1, 1, 1), gain=1.0):
    """Wkleja sprite RGBA (liniowy, premultiplied) do obrazu liniowego HDR."""
    h0, w0 = spr.shape[:2]
    s = height / h0
    M = cv2.getRotationMatrix2D((w0 / 2, h0 / 2), angle_deg, s)
    M[0, 2] += cx - w0 / 2
    M[1, 2] += cy - h0 / 2
    warped = cv2.warpAffine(spr, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    a = warped[..., 3:4]
    rgb = warped[..., :3] * np.array(tint, np.float32) * gain
    return base * (1 - a) + rgb


# --------------------------------------------------------------------------- post-process i przejścia
def zoom_blur(img: np.ndarray, amount: float, n=7):
    if amount <= 0.002:
        return img
    acc = img.astype(np.float32).copy()
    for i in range(1, n):
        s = 1 + amount * i / n
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s)
        acc += cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return acc / n


def transition_fx(t):
    """(siła zoom-blur, błysk) wokół momentów przejść."""
    zb, fl = 0.0, 0.0
    for tt in TRANSITIONS:
        d = t - tt
        big = tt in (18.0, 26.0)
        if -0.25 < d < 0.3:
            k = 1 - abs(d) / (0.25 if d < 0 else 0.3)
            zb = max(zb, (0.22 if big else 0.14) * k ** 2)
            fl = max(fl, (0.95 if big else 0.45) * k ** 3)
    return zb, fl


def render_frame(A: Assets, fi: int) -> np.ndarray:
    t = fi / FPS
    img, ctx = scene_hdr(A, t)

    # astronauta
    if "astro_close" in ctx:
        p = ctx["astro_close"]
        img = composite_sprite(img, A.astro, W * 0.52 + 30 * math.sin(t * 0.9), H * 0.56 - 25 * math.sin(t * 1.3),
                               1150 * (1.0 + 0.06 * p), -8 + 5 * math.sin(t * 0.7), gain=1.1)
    if "astro_far" in ctx:
        cam, p = ctx["astro_far"]
        rate, _ = clock_rate(t)
        f = (W / 2) / math.tan(cam.hfov / 2)
        sh_r = f * math.tan(math.asin(min(1, 3 * math.sqrt(3) / cam.D * math.sqrt(1 - 2 / cam.D))))
        e = ease_out(p, 1.6)
        x = lerp(W * 0.80, W / 2 + sh_r * 1.02, e)
        y = lerp(H * 0.70, H / 2 + sh_r * 0.10, e)
        hgt = lerp(330, 34, e)
        # przesunięcie ku czerwieni i przyciemnienie (dla odległego obserwatora)
        tint = (1.0, 0.35 + 0.65 * rate, 0.15 + 0.85 * rate)
        img = composite_sprite(img, A.astro, x, y, hgt, 30 * p + 8 * math.sin(t), tint=tint, gain=0.35 + 0.8 * rate)

    img = bloom(img, 0.32, 0.85)
    out = tonemap(img, 1.0)

    # efekty po przejściu – smugi gwiazd znikających za horyzontem
    if "streaks" in ctx:
        out = streak_fade(out, ctx["streaks"], t)

    zb_t, flash = transition_fx(t)
    zb = max(zb_t, ctx.get("zoom_blur", 0.0))
    if zb > 0:
        out = zoom_blur(out.astype(np.float32), zb)
    shake = ctx.get("shake", 0.0) + (14 * max(0, 1 - abs(t - 18.0) / 0.4) if 17.6 < t < 18.4 else 0) + (10 * max(0, 1 - t / 0.5))
    if shake > 0.5:
        rs = np.random.default_rng(fi)
        M = np.float32([[1.02, 0, -W * 0.01 + rs.normal() * shake], [0, 1.02, -H * 0.01 + rs.normal() * shake]])
        out = cv2.warpAffine(out.astype(np.float32), M, (W, H), borderMode=cv2.BORDER_REFLECT)
    if 17.85 < t < 18.5:  # aberracja chromatyczna przy przekroczeniu horyzontu
        k = 1 - abs(t - 18.05) / 0.45
        sft = int(14 * max(0, k))
        if sft:
            out = out.copy()
            out[..., 0] = np.roll(out[..., 0], sft, 1)
            out[..., 2] = np.roll(out[..., 2], -sft, 1)
    if flash > 0:
        fc = np.array([1.0, 0.92, 0.8], np.float32) if t < 20 else np.array([1.0, 1.0, 1.0], np.float32)
        out = out * (1 - flash) + fc * flash
    # fade-in na samym początku z czerni
    out = out * smooth(t / 0.25) if t < 0.25 else out
    # winieta
    out = out * vignette()[..., None]

    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).convert("RGBA")
    overlays(im, A, t, ctx)
    return np.array(im.convert("RGB"))


@lru_cache(maxsize=1)
def vignette():
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xs - W / 2) / (W * 0.75)) ** 2 + ((ys - H / 2) / (H * 0.75)) ** 2)
    return np.clip(1 - 0.45 * r ** 2.2, 0, 1)


def streak_fade(out, p, t):
    """Za horyzontem: ostatnie gwiazdy rozciągają się w smugi i gasną."""
    rng = np.random.default_rng(11)
    layer = np.zeros((H, W, 3), np.float32)
    n = 140
    ang = rng.random(n) * 2 * np.pi
    r0 = rng.random(n) * 0.3 + 0.05
    sp = rng.random(n) * 0.8 + 0.5
    a = (1 - smooth(p * 1.25))
    for i in range(n):
        r1 = (r0[i] + (t - 18) * sp[i] * 0.5) * W
        r2 = r1 + 60 + 300 * p
        x1, y1 = W / 2 + math.cos(ang[i]) * r1, H / 2 + math.sin(ang[i]) * r1
        x2, y2 = W / 2 + math.cos(ang[i]) * r2, H / 2 + math.sin(ang[i]) * r2
        cv2.line(layer, (int(x1), int(y1)), (int(x2), int(y2)), (0.9, 0.95, 1.0), 2, cv2.LINE_AA)
    layer = (layer + cv2.GaussianBlur(layer, (0, 0), 4) * 1.5) * a * 0.8
    return 1 - (1 - out) * (1 - np.clip(layer, 0, 1))


def overlays(im: Image.Image, A: Assets, t: float, ctx):
    title(im, t)
    if "rays" in ctx:
        cam, tl = ctx["rays"]
        draw_rays(im, cam, tl)
    if 9.0 <= t < 15.0:
        a = smooth((t - 9.15) / 0.4)
        if t < 12.0:
            draw_clock(im, t, W - 215, 380, 150, a)
            label_box(im, "TWÓJ ZEGAR", W - 215, 585, 36, GOLD, a)
            ao = smooth((t - 9.3) / 0.4) * (1 - smooth((t - 11.7) / 0.3))
            label_box(im, "👁  dla odległego obserwatora".replace("👁  ", ""), 290, 250, 36, CYAN, ao)
        else:
            pnl = Image.new("RGBA", (W, H))
            ImageDraw.Draw(pnl).rounded_rectangle((100, 190, W - 100, 800), radius=40, fill=(4, 8, 16, 185), outline=(110, 170, 255, 120), width=2)
            im.alpha_composite(pnl)
            draw_clock(im, t, W / 2, 400, 170, 1.0, tint=(255, 255, 255))
            rate_bar(im, t, 150, 680, 620, 1.0)
            if t > 13.6:
                aa = smooth((t - 13.6) / 0.4)
                label_box(im, "czas prawie się zatrzymuje…", W / 2, 1210, 36, RED, aa)
    if 15.0 <= t < 21.0:
        if t >= 16.0:
            a = smooth((t - 16.0) / 0.4) * (1 - smooth((t - 17.8) / 0.25)) if t < 18 else 0
            if a > 0:
                label_box(im, "HORYZONT ZDARZEŃ", W / 2, 330, 44, CYAN, a)
        if t >= 18.05:
            a = smooth((t - 18.05) / 0.35) * (1 - smooth((t - 20.6) / 0.35))
            pulse = 1 + 0.04 * math.sin(t * 10)
            draw_text_center(im, "PUNKT", W / 2, 640, 120, fill=RED, alpha=a, scale=pulse, glow=(255, 40, 20))
            draw_text_center(im, "BEZ POWROTU", W / 2, 780, 120, fill=RED, alpha=a, scale=pulse, glow=(255, 40, 20))
    if 21.0 <= t < 26.0:
        a1 = smooth((t - 22.4) / 0.6) * (1 - smooth((t - 25.6) / 0.4))
        a2 = smooth((t - 23.7) / 0.6) * (1 - smooth((t - 25.6) / 0.4))
        if a1 > 0:
            draw_text_center(im, "osobliwość?", W * 0.32, 420 - 15 * math.sin(t), 56, fill=(200, 180, 255), path=FONT_BOLD, stroke=3,
                             alpha=a1 * 0.85, glow=(120, 80, 255))
        if a2 > 0:
            draw_text_center(im, "kwantowa grawitacja?", W * 0.6, 560 + 15 * math.sin(t * 1.2), 52, fill=(170, 235, 255), path=FONT_BOLD,
                             stroke=3, alpha=a2 * 0.85, glow=(60, 160, 255))
    if t >= 28.95:
        a = smooth((t - 28.95) / 0.3)
        draw_text_center(im, "Napisz w komentarzu!", W / 2, 1420, 76, fill=GOLD, alpha=a, scale=0.9 + 0.1 * a)
        e = emoji("👇", 96)
        arr = np.array(e)
        arr[..., 3] = (arr[..., 3] * a).astype(np.uint8)
        im.alpha_composite(Image.fromarray(arr), (int(W / 2 - 48), int(1520 + 10 * math.sin(t * 8))))
    else:
        captions(im, A, t)


# --------------------------------------------------------------------------- uruchamianie
def worker(args):
    wid, f0, f1, out = args
    A = Assets()
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        frame = render_frame(A, fi)
        p.stdin.write(frame.tobytes())
        if fi % 15 == 0:
            print(f"[w{wid}] klatka {fi} ({fi / FPS:.1f} s)", flush=True)
    p.stdin.close()
    p.wait()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--stills", type=str, default="")
    ap.add_argument("--range", type=str, default="")
    a = ap.parse_args()
    os.makedirs(BUILD, exist_ok=True)
    if a.stills:
        A = Assets()
        os.makedirs(os.path.join(BUILD, "stills"), exist_ok=True)
        for s in a.stills.split(","):
            fi = int(round(float(s) * FPS))
            fr = render_frame(A, fi)
            path = os.path.join(BUILD, "stills", f"f{fi:04d}.jpg")
            cv2.imwrite(path, fr[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 92])
            print(path)
        return
    Assets()  # przygotuj zasoby (cache) przed startem procesów
    total = int(DURATION * FPS)
    f0, f1 = (map(int, a.range.split(":")) if a.range else (0, total))
    # przeplatanie: kawałki po 30 klatek rozdzielane round-robin (równe obciążenie)
    chunks = [(i, min(i + 30, f1)) for i in range(f0, f1, 30)]
    jobs = [(k % a.workers, c0, c1, os.path.join(BUILD, f"part_{c0:04d}.mp4")) for k, (c0, c1) in enumerate(chunks)]
    from multiprocessing import Pool

    with Pool(a.workers) as pool:
        parts = pool.map(worker, jobs, chunksize=1)
    lst = os.path.join(BUILD, "parts.txt")
    with open(lst, "w") as f:
        for pth in parts:
            f.write(f"file '{os.path.basename(pth)}'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                    os.path.join(BUILD, "video.mp4")], check=True)
    print("Zapisano build/video.mp4")


if __name__ == "__main__":
    main()
