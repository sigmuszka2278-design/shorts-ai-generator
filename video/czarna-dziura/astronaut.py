"""
Astronauta w skafandrze – renderowany raz metodą ray-marchingu pól odległości (SDF),
z oświetleniem od dysku akrecyjnego i złotym wizjerem odbijającym czarną dziurę.
Wynik: sprite RGBA (liniowe RGB, premultiplied) zapisywany w build/astronaut.npy
"""
from __future__ import annotations

import math

import cv2
import numpy as np


def _len(x, y, z):
    return np.sqrt(x * x + y * y + z * z)


def sd_sphere(p, c, r):
    return _len(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r


def sd_capsule(p, a, b, r):
    pa = [p[i] - a[i] for i in range(3)]
    ba = [b[i] - a[i] for i in range(3)]
    h = np.clip((pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2), 0, 1)
    return _len(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - r


def sd_rbox(p, c, half, r):
    q = [np.abs(p[i] - c[i]) - (half[i] - r) for i in range(3)]
    outside = _len(np.maximum(q[0], 0), np.maximum(q[1], 0), np.maximum(q[2], 0))
    inside = np.minimum(np.maximum(q[0], np.maximum(q[1], q[2])), 0)
    return outside + inside - r


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


# materiały
M_SUIT, M_VISOR, M_PACK, M_PANEL, M_GLOVE, M_BAND = 1, 2, 3, 4, 5, 6


def scene(p):
    """Zwraca (odległość, materiał)."""
    x, y, z = p
    # hełm
    helmet = sd_sphere(p, (0, 1.58, 0.02), 0.31)
    # tułów + biodra
    torso = sd_rbox(p, (0, 1.02, 0), (0.33, 0.36, 0.22), 0.12)
    hips = sd_rbox(p, (0, 0.66, 0), (0.27, 0.13, 0.19), 0.1)
    body = smin(torso, hips, 0.08)
    collar = sd_capsule(p, (-0.2, 1.36, 0.0), (0.2, 1.36, 0.0), 0.11)
    body = smin(body, collar, 0.06)
    # ręce (lekko uniesione – nieważkość)
    arms = np.minimum(
        smin(sd_capsule(p, (-0.36, 1.28, 0), (-0.62, 1.02, 0.12), 0.105), sd_capsule(p, (-0.62, 1.02, 0.12), (-0.66, 0.78, 0.36), 0.095), 0.05),
        smin(sd_capsule(p, (0.36, 1.28, 0), (0.64, 1.22, 0.16), 0.105), sd_capsule(p, (0.64, 1.22, 0.16), (0.72, 1.5, 0.34), 0.095), 0.05),
    )
    gloves = np.minimum(sd_sphere(p, (-0.67, 0.72, 0.4), 0.1), sd_sphere(p, (0.73, 1.56, 0.37), 0.1))
    # nogi
    legs = np.minimum(
        smin(sd_capsule(p, (-0.15, 0.6, 0), (-0.24, 0.18, 0.16), 0.125), sd_capsule(p, (-0.24, 0.18, 0.16), (-0.26, -0.25, 0.02), 0.115), 0.05),
        smin(sd_capsule(p, (0.15, 0.6, 0), (0.2, 0.2, -0.08), 0.125), sd_capsule(p, (0.2, 0.2, -0.08), (0.24, -0.22, 0.12), 0.115), 0.05),
    )
    boots = np.minimum(sd_rbox(p, (-0.27, -0.33, 0.07), (0.11, 0.08, 0.17), 0.05), sd_rbox(p, (0.25, -0.3, 0.17), (0.11, 0.08, 0.17), 0.05))
    suit = smin(smin(body, arms, 0.06), legs, 0.06)
    suit = np.minimum(suit, boots)
    ring = sd_capsule(p, (-0.001, 1.33, 0.02), (0.001, 1.33, 0.02), 0.0)
    ring = np.sqrt((np.sqrt(x * x + (z - 0.02) ** 2) - 0.2) ** 2 + (y - 1.33) ** 2) - 0.05
    suit = np.minimum(suit, ring)
    pack = sd_rbox(p, (0, 1.05, -0.33), (0.3, 0.4, 0.14), 0.06)
    panel = sd_rbox(p, (0, 1.0, 0.24), (0.15, 0.1, 0.04), 0.02)
    # opaski na rękach (pomarańczowe pasy)
    band = np.minimum(sd_capsule(p, (-0.6, 1.04, 0.1), (-0.635, 0.99, 0.13), 0.112), sd_capsule(p, (0.62, 1.21, 0.15), (0.665, 1.24, 0.18), 0.112))

    d = suit
    m = np.full(x.shape, M_SUIT, np.int8)
    for dd, mm in ((helmet, M_SUIT), (pack, M_PACK), (panel, M_PANEL), (gloves, M_GLOVE), (band, M_BAND)):
        sel = dd < d
        d = np.where(sel, dd, d)
        m = np.where(sel, mm, m)
    # wizjer = przednia część hełmu
    vis = (m == M_SUIT) & (helmet <= d + 1e-4) & (z > 0.0) & (((x - 0.0) / 0.25) ** 2 + ((y - 1.6) / 0.17) ** 2 < 1)
    m = np.where(vis, M_VISOR, m)
    return d, m


def render_astronaut(width=900, height=1300, env=None, ss=2) -> np.ndarray:
    W, H = width * ss, height * ss
    # kamera ortograficzno-perspektywiczna, lekko z góry i z boku
    yaw, pitch = math.radians(-24), math.radians(8)
    cam_dist = 6.0
    target = np.array([0.0, 0.68, 0.0])
    fwd = np.array([math.sin(yaw) * math.cos(pitch), -math.sin(pitch), -math.cos(yaw) * math.cos(pitch)])
    fwd = -fwd  # patrzymy na astronautę od przodu
    fwd = np.array([-math.sin(yaw), -math.sin(pitch), -math.cos(yaw)])
    fwd /= np.linalg.norm(fwd)
    pos = target - fwd * cam_dist
    right = np.cross(fwd, [0, 1, 0]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    fov_h = 2 * math.atan(1.05 / cam_dist)
    xs = (np.arange(W) + 0.5) / W * 2 - 1
    ys = 1 - (np.arange(H) + 0.5) / H * 2
    PX, PY = np.meshgrid(xs * math.tan(fov_h / 2), ys * math.tan(fov_h / 2) * H / W)
    dx = fwd[0] + PX * right[0] + PY * up[0]
    dy = fwd[1] + PX * right[1] + PY * up[1]
    dz = fwd[2] + PX * right[2] + PY * up[2]
    n = np.sqrt(dx * dx + dy * dy + dz * dz)
    dx, dy, dz = (dx / n).ravel(), (dy / n).ravel(), (dz / n).ravel()
    t = np.full(dx.shape, 4.0)
    hit = np.zeros(dx.shape, bool)
    active = np.arange(dx.size)
    for _ in range(120):
        if active.size == 0:
            break
        px = pos[0] + dx[active] * t[active]
        py = pos[1] + dy[active] * t[active]
        pz = pos[2] + dz[active] * t[active]
        d, _m = scene((px, py, pz))
        t[active] += d * 0.9
        h = d < 1e-3
        hit[active[h]] = True
        gone = t[active] > 9
        active = active[~(h | gone)]
    idx = np.nonzero(hit)[0]
    px = pos[0] + dx[idx] * t[idx]
    py = pos[1] + dy[idx] * t[idx]
    pz = pos[2] + dz[idx] * t[idx]
    P = (px, py, pz)
    d0, mat = scene(P)
    e = 1e-3
    nx = scene((px + e, py, pz))[0] - scene((px - e, py, pz))[0]
    ny = scene((px, py + e, pz))[0] - scene((px, py - e, pz))[0]
    nz = scene((px, py, pz + e))[0] - scene((px, py, pz - e))[0]
    nn = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    nx, ny, nz = nx / nn, ny / nn, nz / nn
    # AO
    ao = np.ones_like(px)
    for k in range(1, 6):
        h = 0.03 * k
        ao -= (h - scene((px + nx * h, py + ny * h, pz + nz * h))[0]) * (0.9 / k)
    ao = np.clip(ao, 0.15, 1)

    albedo = np.zeros((idx.size, 3))
    albedo[mat == M_SUIT] = (0.82, 0.82, 0.80)
    albedo[mat == M_PACK] = (0.72, 0.73, 0.74)
    albedo[mat == M_PANEL] = (0.12, 0.13, 0.15)
    albedo[mat == M_GLOVE] = (0.42, 0.42, 0.44)
    albedo[mat == M_BAND] = (0.9, 0.35, 0.08)
    # szwy / fałdy materiału – drobny szum
    fold = 0.86 + 0.14 * np.sin(px * 37 + np.sin(py * 23) * 2.5) * np.sin(py * 29 + pz * 17)
    albedo *= fold[:, None]

    def light(L, col, power, wrap=0.0):
        L = np.array(L, float); L /= np.linalg.norm(L)
        ndl = np.clip((nx * L[0] + ny * L[1] + nz * L[2] + wrap) / (1 + wrap), 0, 1)
        # specular (Blinn)
        V = -np.stack([dx[idx], dy[idx], dz[idx]], 1)
        Hh = V + L
        Hh /= np.linalg.norm(Hh, axis=1, keepdims=True)
        ndh = np.clip(nx * Hh[:, 0] + ny * Hh[:, 1] + nz * Hh[:, 2], 0, 1)
        return ndl[:, None] * np.array(col) * power, (ndh ** 40)[:, None] * np.array(col) * power

    d1, s1 = light((-0.7, 0.45, 0.45), (1.0, 0.70, 0.40), 2.0)  # ciepłe światło dysku
    d2, s2 = light((0.8, 0.1, 0.4), (0.30, 0.40, 0.70), 0.30, 0.3)  # zimne wypełnienie (gwiazdy)
    d3, s3 = light((0.6, 0.35, -0.8), (1.0, 0.6, 0.3), 2.2)  # kontra
    col = albedo * (d1 + d2 + d3 + 0.04) * ao[:, None] + (s1 + s2 + s3) * 0.25
    # Fresnel rim
    V = -np.stack([dx[idx], dy[idx], dz[idx]], 1)
    ndv = np.clip(nx * V[:, 0] + ny * V[:, 1] + nz * V[:, 2], 0, 1)
    col += ((1 - ndv) ** 3)[:, None] * np.array([1.0, 0.62, 0.32]) * 0.9

    # wizjer – złote lustro odbijające otoczenie (czarną dziurę)
    vm = mat == M_VISOR
    if vm.any():
        I = np.stack([dx[idx][vm], dy[idx][vm], dz[idx][vm]], 1)
        Nv = np.stack([nx[vm], ny[vm], nz[vm]], 1)
        R = I - 2 * (I * Nv).sum(1, keepdims=True) * Nv
        if env is not None:
            eh, ew = env.shape[:2]
            u = np.clip((R[:, 0] * 0.9 + 0.5) * ew, 0, ew - 1).astype(np.float32)
            v = np.clip((0.5 - R[:, 1] * 0.9) * eh, 0, eh - 1).astype(np.float32)
            refl = env[v.astype(np.int32), u.astype(np.int32)]
        else:
            refl = np.zeros((vm.sum(), 3))
        fres = 0.55 + 0.45 * (1 - ndv[vm]) ** 3
        gold = np.array([1.0, 0.72, 0.32])
        col[vm] = refl * gold * fres[:, None] * 1.5 + s1[vm] * 1.5 + 0.015
    # lampki na panelu
    pm = mat == M_PANEL
    lights = pm & (np.abs(np.sin(px * 60)) > 0.92) & (np.abs(py - 1.03) < 0.02)
    col[lights] = np.where((px[lights] > 0)[:, None], [0.1, 1.6, 0.4], [1.8, 0.25, 0.1])

    img = np.zeros((dx.size, 4), np.float32)
    img[idx, :3] = col
    img[idx, 3] = 1.0
    img = img.reshape(H, W, 4)
    img = cv2.resize(img, (width, height), interpolation=cv2.INTER_AREA)
    return img
