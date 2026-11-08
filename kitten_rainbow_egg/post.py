"""2D compositing: glow halo, god rays, bloom, bubbles, heart bubble,
sparkles, petals, flash, grading."""
import math
import numpy as np
from scipy.ndimage import gaussian_filter, zoom

from camera import project


def _hsv(h, s, v):
    h = np.asarray(h) % 1.0
    r = np.clip(np.abs(h * 6 - 3) - 1, 0, 1)
    g = np.clip(2 - np.abs(h * 6 - 2), 0, 1)
    b = np.clip(2 - np.abs(h * 6 - 4), 0, 1)
    rgb = np.stack([r, g, b], -1)
    s = np.asarray(s, dtype=np.float64)
    if s.ndim:
        s = s[..., None]
    return v * (1 - s + s * rgb)


def _patch(img, cx, cy, rad):
    H, W, _ = img.shape
    x0 = int(max(0, math.floor(cx - rad)))
    x1 = int(min(W, math.ceil(cx + rad + 1)))
    y0 = int(max(0, math.floor(cy - rad)))
    y1 = int(min(H, math.ceil(cy + rad + 1)))
    if x0 >= x1 or y0 >= y1:
        return None
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    return (slice(y0, y1), slice(x0, x1)), xx - cx, yy - cy


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def draw_halo(img, cam, p, rad, col, inten):
    H, W, _ = img.shape
    pr = project(cam, p, W, H)
    if pr is None:
        return
    x, y, z, sc = pr
    R = rad * sc * 2.2
    pt = _patch(img, x, y, R)
    if pt is None:
        return
    sl, dx, dy = pt
    r = np.sqrt(dx * dx + dy * dy) / max(R, 1)
    g = np.exp(-r * r * 6) * inten
    img[sl] += g[..., None] * np.asarray(col)[None, None, :]


def draw_rays(img, cam, p, inten, t):
    if inten <= 0.01:
        return
    H, W, _ = img.shape
    pr = project(cam, p, W, H)
    if pr is None:
        return
    x, y, z, sc = pr
    R = 0.9 * H
    pt = _patch(img, x, y, R)
    if pt is None:
        return
    sl, dx, dy = pt
    r = np.sqrt(dx * dx + dy * dy) + 1e-6
    a = np.arctan2(dy, dx)
    rays = (0.5 + 0.5 * np.sin(a * 9 + t * 1.5)) ** 6 + 0.6 * (0.5 + 0.5 * np.sin(a * 14 - t * 2.1)) ** 10
    fall = np.exp(-r / (0.12 * H * (0.6 + 0.6 * inten))) * smoothstep(0.03 * sc, 0.3 * sc, r)
    col = _hsv(a / (2 * math.pi) + t * 0.1, 0.35, 1.0)
    img[sl] += (rays * fall * inten * 0.35)[..., None] * col


def draw_sparkle(img, cam, p, size, inten, hue):
    if inten <= 0.01:
        return
    H, W, _ = img.shape
    pr = project(cam, p, W, H)
    if pr is None:
        return
    x, y, z, sc = pr
    s = max(size * sc, 1.2)
    R = s * 3.5
    pt = _patch(img, x, y, R)
    if pt is None:
        return
    sl, dx, dy = pt
    ax, ay = np.abs(dx) / s, np.abs(dy) / s
    star = np.exp(-ax * 1.3) * np.exp(-(ay * 6) ** 2) + np.exp(-ay * 1.3) * np.exp(-(ax * 6) ** 2)
    core = np.exp(-(ax * ax + ay * ay) * 2.5)
    col = _hsv(hue, 0.45, 1.0)
    img[sl] += ((star * 0.8 + core * 1.2) * inten)[..., None] * (0.5 * col + 0.5)


def draw_bubble(img, cam, p, rad, alpha, hue, t):
    if alpha <= 0.01 or rad <= 0:
        return
    H, W, _ = img.shape
    pr = project(cam, p, W, H)
    if pr is None:
        return
    x, y, z, sc = pr
    R = rad * sc
    if R < 1.0:
        return
    pt = _patch(img, x, y, R + 2)
    if pt is None:
        return
    sl, dx, dy = pt
    r = np.sqrt(dx * dx + dy * dy) / R
    inside = smoothstep(1.0 + 1.5 / R, 1.0, r)
    a = np.arctan2(dy, dx)
    col = _hsv(hue + a / (2 * math.pi) + r * 0.6 + t * 0.15, 0.55, 1.0)
    al = (0.06 + 0.6 * smoothstep(0.65, 1.0, r) ** 2) * inside * alpha
    reg = img[sl]
    reg[:] = reg * (1 - al[..., None]) + col * al[..., None]
    # highlights
    hx, hy = dx / R + 0.38, dy / R + 0.38
    hl = smoothstep(0.24, 0.08, np.sqrt(hx * hx * 1.4 + hy * hy)) * inside
    hx2, hy2 = dx / R - 0.42, dy / R - 0.40
    hl2 = smoothstep(0.12, 0.03, np.sqrt(hx2 * hx2 + hy2 * hy2)) * inside
    reg += ((hl * 0.95 + hl2 * 0.6) * alpha)[..., None]


def sd_heart(px, py):
    px = np.abs(px)
    a = np.sqrt((px - 0.25) ** 2 + (py - 0.75) ** 2) - math.sqrt(2) / 4
    m = np.maximum(px + py, 0) * 0.5
    b1 = (px - 0.0) ** 2 + (py - 1.0) ** 2
    b2 = (px - m) ** 2 + (py - m) ** 2
    b = np.sqrt(np.minimum(b1, b2)) * np.sign(px - py)
    return np.where(py + px > 1.0, a, b)


def draw_heart(img, cam, p, size, alpha, t):
    if alpha <= 0.01:
        return
    H, W, _ = img.shape
    pr = project(cam, p, W, H)
    if pr is None:
        return
    x, y, z, sc = pr
    S = size * sc * 1.6  # heart coordinate unit in pixels
    pt = _patch(img, x, y, S * 1.0 + 3)
    if pt is None:
        return
    sl, dx, dy = pt
    hx = dx / S
    hy = -dy / S + 0.5
    d = sd_heart(hx, hy)
    aa = 1.5 / S
    inside = smoothstep(aa, -aa, d)
    rim = smoothstep(-0.16, 0.0, d)
    a = np.arctan2(hy - 0.5, hx)
    col = _hsv(a / (2 * math.pi) + d * 3 + t * 0.2, 0.5, 1.0)
    pink = np.array([1.0, 0.55, 0.75])
    col = col * 0.45 + pink * 0.55
    al = (0.22 + 0.70 * rim ** 2) * inside * alpha
    reg = img[sl]
    reg[:] = reg * (1 - al[..., None]) + col * al[..., None]
    # glossy highlights
    h1 = smoothstep(0.13, 0.04, np.sqrt(((hx + 0.42) * 1.0) ** 2 + ((hy - 0.80) * 1.6) ** 2))
    h2 = smoothstep(0.06, 0.015, np.sqrt((hx - 0.35) ** 2 + (hy - 0.85) ** 2))
    reg += ((h1 * 0.95 + h2 * 0.7) * inside * alpha)[..., None]
    # soft pink glow
    glow = np.exp(-np.maximum(d, 0) * 8) * (1 - inside) * 0.25 * alpha
    reg += glow[..., None] * pink


def draw_petal(img, cam, p, size, hue, ang, alpha):
    if alpha <= 0.01:
        return
    H, W, _ = img.shape
    pr = project(cam, p, W, H)
    if pr is None:
        return
    x, y, z, sc = pr
    R = size * sc
    if R < 1:
        return
    pt = _patch(img, x, y, R + 2)
    if pt is None:
        return
    sl, dx, dy = pt
    c, s = math.cos(ang), math.sin(ang)
    u = (c * dx + s * dy) / R
    v = (-s * dx + c * dy) / (R * (0.45 + 0.25 * abs(math.sin(ang * 1.7))))
    r = np.sqrt(u * u + v * v)
    al = smoothstep(1.0, 0.85, r) * alpha
    col = _hsv(hue, 0.5 - 0.3 * r, 1.0)
    reg = img[sl]
    reg[:] = reg * (1 - al[..., None]) + col * al[..., None]


def bloom(img, strength=0.35):
    H, W, _ = img.shape
    lum = img.max(-1)
    bright = img * smoothstep(1.05, 2.0, lum)[..., None]
    small = bright[::4, ::4]
    b1 = gaussian_filter(small, sigma=(3, 3, 0))
    b2 = gaussian_filter(small, sigma=(10, 10, 0))
    b = 0.6 * b1 + 0.6 * b2
    b = zoom(b, (H / b.shape[0], W / b.shape[1], 1), order=1)
    return img + b[:H, :W] * strength


def tonemap(img):
    out = np.where(img < 0.8, img, 0.8 + 0.2 * (1 - np.exp(-(img - 0.8) / 0.2)))
    lum = out.mean(-1, keepdims=True)
    out = lum + (out - lum) * 1.12  # a touch more saturation
    return np.clip(out, 0, 1)


def vignette(img):
    H, W, _ = img.shape
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    return img * (1 - 0.18 * smoothstep(0.7, 1.45, r))[..., None]


_VIG = {}


def composite(img, cam, ov, t):
    H, W, _ = img.shape
    if ov["halo"] is not None:
        p, rad, col, inten = ov["halo"]
        draw_halo(img, cam, p, rad, col, inten)
    if ov["rays"] is not None:
        p, inten, tt = ov["rays"]
        draw_rays(img, cam, p, inten, tt)
    img = bloom(img)
    # far to near
    for (p, size, hue, ang, alpha) in ov["petals"]:
        draw_petal(img, cam, p, size, hue, ang, alpha)
    for (p, rad, alpha, hue) in ov["bubbles"]:
        draw_bubble(img, cam, p, rad, alpha, hue, t)
    if ov["heart"] is not None:
        p, size, alpha, tt = ov["heart"]
        draw_heart(img, cam, p, size, alpha, tt)
    for (p, size, inten, hue) in ov["sparkles"]:
        draw_sparkle(img, cam, p, size, inten, hue)
    if ov["flash"] > 0:
        f = ov["flash"]
        yy, xx = np.mgrid[0:H, 0:W]
        hue = (yy / H * 0.8 + t * 0.5)
        col = _hsv(hue, 0.25, 1.0)
        img = img * (1 - f * 0.85) + col * f * 1.1
    img = tonemap(img)
    key = (H, W)
    if key not in _VIG:
        _VIG[key] = vignette(np.ones((H, W, 3)))
    return img * _VIG[key]
