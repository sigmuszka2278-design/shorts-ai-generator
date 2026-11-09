"""
Fizycznie oparty ray-tracer czarnej dziury Schwarzschilda (jednostki G = c = M = 1).

Dla każdej odległości kamery D całkujemy równanie orbity fotonu
    d²u/dφ² = -u + 3u²        (u = 1/r)
dla siatki kątów α (kąt między promieniem a kierunkiem na czarną dziurę).
Każdy piksel obrazu leży w płaszczyźnie wyznaczonej przez kamerę, środek
czarnej dziury i kierunek piksela – wystarczy więc tablica 1D (po α),
a geometria 3D sprowadza się do obrotu tej płaszczyzny.

Daje to poprawnie:
  * cień czarnej dziury (krytyczny parametr zderzenia b = 3√3 M),
  * pierścień fotonowy i wtórne obrazy dysku (dysk widoczny "nad" i "pod" cieniem),
  * soczewkowanie gwiazd tła,
  * przesunięcie grawitacyjne i dopplerowskie (jaśniejsza strona dysku, która zbliża się do nas).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

R_HORIZON = 2.0
R_ISCO = 6.0


# --------------------------------------------------------------------------- tablica geodezyjnych
@dataclass
class GeodesicTable:
    D: float
    alphas: np.ndarray  # (NA,)
    dphi: float
    u: np.ndarray  # (NA, NP) float32, NaN po zakończeniu
    du: np.ndarray  # (NA, NP) float32
    phi_end: np.ndarray  # (NA,) kąt, przy którym promień uciekł / wpadł
    escaped: np.ndarray  # (NA,) bool
    alpha_max: float


def build_table(D: float, alpha_max: float, na: int = 3000, dphi: float = 0.006, phi_max: float = 3.2 * math.pi) -> GeodesicTable:
    alphas = np.linspace(1e-4, alpha_max, na)
    np_steps = int(phi_max / dphi) + 1
    u = np.full(na, 1.0 / D)
    up = math.sqrt(1 - 2 / D) / D / np.tan(alphas)  # du/dφ na starcie
    U = np.full((na, np_steps), np.nan, dtype=np.float32)
    DU = np.full((na, np_steps), np.nan, dtype=np.float32)
    alive = np.ones(na, bool)
    escaped = np.zeros(na, bool)
    phi_end = np.full(na, phi_max)
    U[:, 0] = u
    DU[:, 0] = up

    def f(u_, up_):
        return up_, -u_ + 3 * u_ * u_

    h = dphi
    for k in range(1, np_steps):
        if not alive.any():
            break
        a = alive
        u0, p0 = u[a], up[a]
        k1u, k1p = f(u0, p0)
        k2u, k2p = f(u0 + 0.5 * h * k1u, p0 + 0.5 * h * k1p)
        k3u, k3p = f(u0 + 0.5 * h * k2u, p0 + 0.5 * h * k2p)
        k4u, k4p = f(u0 + h * k3u, p0 + h * k3p)
        u1 = u0 + h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u)
        p1 = p0 + h / 6 * (k1p + 2 * k2p + 2 * k3p + k4p)
        idx = np.nonzero(a)[0]
        esc = u1 <= 0
        cap = u1 >= 1 / R_HORIZON
        # kąt ucieczki: liniowa interpolacja zera u
        if esc.any():
            ii = idx[esc]
            frac = u0[esc] / (u0[esc] - u1[esc])
            phi_end[ii] = (k - 1 + frac) * h
            escaped[ii] = True
        if cap.any():
            phi_end[idx[cap]] = k * h
        u[a] = u1
        up[a] = p1
        alive[idx[esc | cap]] = False
        keep = ~(esc | cap)
        U[idx[keep], k] = u1[keep]
        DU[idx[keep], k] = p1[keep]
    return GeodesicTable(D, alphas, dphi, U, DU, phi_end, escaped, alpha_max)


# --------------------------------------------------------------------------- pomocnicze
def normalize(v):
    return v / np.linalg.norm(v)


def kelvin_to_rgb(T: np.ndarray) -> np.ndarray:
    """Przybliżenie koloru ciała doskonale czarnego (sRGB liniowe, 0..1)."""
    t = np.clip(T, 1000, 40000) / 100.0
    r = np.where(t <= 66, 255.0, 329.698727446 * np.power(np.maximum(t - 60, 1e-3), -0.1332047592))
    g = np.where(t <= 66, 99.4708025861 * np.log(t) - 161.1195681661, 288.1221695283 * np.power(np.maximum(t - 60, 1e-3), -0.0755148492))
    b = np.where(t >= 66, 255.0, np.where(t <= 19, 0.0, 138.5177312231 * np.log(np.maximum(t - 10, 1e-3)) - 305.0447927307))
    rgb = np.stack([r, g, b], -1).clip(0, 255) / 255.0
    return rgb ** 2.2  # do liniowego


def make_disk_texture(seed: int = 3, nr: int = 512, npsi: int = 2048) -> np.ndarray:
    """Turbulentna tekstura dysku (r × ψ), powtarzalna w ψ."""
    rng = np.random.default_rng(seed)
    tex = np.zeros((nr, npsi), np.float32)
    amp = 1.0
    for octave in range(6):
        h = 4 * 2 ** octave
        w = 16 * 2 ** octave
        n = rng.random((h, w)).astype(np.float32)
        n = np.concatenate([n, n[:, :1]], 1)  # zawinięcie
        n = cv2.resize(n, (npsi + npsi // w, nr), interpolation=cv2.INTER_CUBIC)[:, :npsi]
        tex += amp * n
        amp *= 0.55
    tex -= tex.min()
    tex /= tex.max()
    # smugi wzdłuż orbity
    pad = 128
    tex = np.concatenate([tex[:, -pad:], tex, tex[:, :pad]], 1)
    tex = cv2.GaussianBlur(tex, (0, 0), sigmaX=18, sigmaY=0.8)[:, pad:-pad]
    tex = (tex - tex.mean()) / (tex.std() + 1e-6)
    return tex


# --------------------------------------------------------------------------- niebo
def make_sky(width: int = 8192, seed: int = 7, galaxy_dir=None) -> np.ndarray:
    """Equirektangularna mapa nieba (liniowe RGB float32): gwiazdy, Droga Mleczna, mgławice, galaktyka spiralna."""
    H, W = width // 2, width
    rng = np.random.default_rng(seed)
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(H) + 0.5) / H * np.pi
    LON, LAT = np.meshgrid(lon.astype(np.float32), lat.astype(np.float32))
    X = np.cos(LAT) * np.cos(LON)
    Y = np.cos(LAT) * np.sin(LON)
    Z = np.sin(LAT)

    def noise(scale_h, octaves=6, seed_=0, persistence=0.55):
        r = np.random.default_rng(seed_)
        acc = np.zeros((H, W), np.float32)
        amp, tot = 1.0, 0.0
        for o in range(octaves):
            h = max(2, int(scale_h * 2 ** o))
            n = r.random((h, 2 * h)).astype(np.float32)
            n = np.concatenate([n, n[:, :1]], 1)
            n = cv2.resize(n, (W + W // (2 * h), H), interpolation=cv2.INTER_CUBIC)[:, :W]
            acc += amp * n
            tot += amp
            amp *= persistence
        return acc / tot

    # pasmo galaktyki – wielkie koło nachylone do równika
    gp = normalize(np.array([0.25, -0.35, 0.9]))
    dist_band = (X * gp[0] + Y * gp[1] + Z * gp[2])  # sin szerokości galaktycznej
    n1 = noise(3, 7, 11)
    n2 = noise(6, 6, 12)
    band = np.exp(-(dist_band / 0.16) ** 2) * (0.35 + 0.9 * n1)
    dust = np.clip((n2 - 0.45) * 3.0, 0, 1) * np.exp(-(dist_band / 0.07) ** 2)
    band = band * (1 - 0.85 * dust)
    sky = np.zeros((H, W, 3), np.float32)
    sky += band[..., None] * np.array([0.050, 0.042, 0.036], np.float32)
    core = np.exp(-(dist_band / 0.05) ** 2) * n1 ** 2
    sky += core[..., None] * np.array([0.06, 0.045, 0.03], np.float32)

    # delikatne mgławice
    n3 = noise(2, 6, 21)
    n4 = noise(2, 6, 22)
    neb1 = np.clip(n3 - 0.52, 0, 1) ** 2 * 4
    neb2 = np.clip(n4 - 0.55, 0, 1) ** 2 * 4
    sky += neb1[..., None] * np.array([0.012, 0.018, 0.045], np.float32)
    sky += neb2[..., None] * np.array([0.040, 0.010, 0.030], np.float32)

    # gwiazdy (rozkład potęgowy jasności, gęściej w paśmie)
    n_stars = 120000
    v = rng.normal(size=(n_stars * 2, 3))
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    d = v @ gp
    keep = rng.random(len(v)) < (0.35 + 0.65 * np.exp(-(d / 0.2) ** 2))
    v = v[keep][:n_stars]
    slon = np.arctan2(v[:, 1], v[:, 0])
    slat = np.arcsin(v[:, 2])
    sx = (slon + np.pi) / (2 * np.pi) * W
    sy = (np.pi / 2 - slat) / np.pi * H
    mag = rng.pareto(1.6, len(v)) + 1
    bright = np.clip(0.05 * mag, 0, 40).astype(np.float32)
    temps = rng.choice([3200, 4200, 5200, 5800, 6500, 8000, 11000, 16000], len(v), p=[.12, .16, .18, .16, .14, .12, .08, .04])
    cols = kelvin_to_rgb(temps.astype(np.float32))
    cols /= cols.max(1, keepdims=True)
    stars = np.zeros((H, W, 3), np.float32)
    ix = np.clip(sx.astype(int), 0, W - 1)
    iy = np.clip(sy.astype(int), 0, H - 1)
    np.add.at(stars, (iy, ix), cols * bright[:, None])
    # rozmycie gwiazd: małe i duże (jasne) halo
    stars_small = cv2.GaussianBlur(stars, (0, 0), 0.9)
    stars_halo = cv2.GaussianBlur(stars, (0, 0), 3.0) * 0.12
    sky += stars_small * 1.6 + stars_halo

    if galaxy_dir is not None:
        sky += galaxy_layer(X, Y, Z, galaxy_dir, rng)
    return sky


def galaxy_layer(X, Y, Z, gdir, rng, size=0.30):
    """Galaktyka spiralna widziana pod kątem – w kierunku gdir na niebie."""
    gdir = normalize(np.asarray(gdir, float))
    up = normalize(np.cross(gdir, [0.0, 0.0, 1.0]) if abs(gdir[2]) < 0.9 else np.cross(gdir, [1.0, 0, 0]))
    vv = np.cross(gdir, up)
    dot = X * gdir[0] + Y * gdir[1] + Z * gdir[2]
    a = (X * up[0] + Y * up[1] + Z * up[2]) / np.maximum(dot, 1e-3)
    b = (X * vv[0] + Y * vv[1] + Z * vv[2]) / np.maximum(dot, 1e-3)
    mask = dot > 0.5
    # obrót + nachylenie dysku galaktyki
    ang = 0.6
    ca, sa = math.cos(ang), math.sin(ang)
    x = (ca * a - sa * b) / size
    y = (sa * a + ca * b) / (size * 0.55)
    r = np.sqrt(x * x + y * y) + 1e-6
    th = np.arctan2(y, x)
    arms = 0.5 + 0.5 * np.cos(2 * (th - 2.6 * np.log(r + 0.05)))
    arms = arms ** 3
    disk = np.exp(-r / 0.32)
    bulge = np.exp(-(r / 0.09) ** 2)
    H, W = X.shape
    nz = np.random.default_rng(5).random((H // 6, W // 6)).astype(np.float32)
    nz = cv2.resize(nz, (W, H), interpolation=cv2.INTER_CUBIC)
    lum = disk * (0.25 + 1.1 * arms * (0.6 + 0.6 * nz)) * (r < 1.4)
    out = np.zeros(X.shape + (3,), np.float32)
    out += (lum * mask)[..., None] * np.array([0.30, 0.36, 0.55], np.float32) * 0.9
    out += (bulge * mask)[..., None] * np.array([1.4, 1.1, 0.75], np.float32) * 1.4
    # gromady HII w ramionach
    return out


# --------------------------------------------------------------------------- kamera i render
@dataclass
class Camera:
    D: float  # odległość od środka
    incl: float  # kąt między osią obrotu dysku a kierunkiem na kamerę [rad] (π/2 = widok z boku)
    az: float = 0.0  # azymut kamery
    roll: float = 0.0
    yaw: float = 0.0  # odchylenie spojrzenia od środka [rad]
    pitch: float = 0.0
    hfov: float = math.radians(60)


class BlackHoleRenderer:
    def __init__(self, width=1080, height=1920, sky=None, disk_tex=None):
        self.W, self.H = width, height
        self.sky = sky
        self.sky_h, self.sky_w = sky.shape[:2]
        self.disk_tex = disk_tex if disk_tex is not None else make_disk_texture()
        self._table = None
        self.n = np.array([0.0, 0.0, 1.0])  # oś obrotu dysku
        xs = (np.arange(width, dtype=np.float32) + 0.5) / width * 2 - 1
        ys = 1 - (np.arange(height, dtype=np.float32) + 0.5) / height * 2
        self.px, self.py = np.meshgrid(xs, ys * (height / width))

    def table_for(self, D, alpha_max):
        t = self._table
        if t is None or abs(t.D - D) > 1e-6 or t.alpha_max < alpha_max:
            t = build_table(D, min(alpha_max * 1.02, math.pi - 1e-3))
            self._table = t
        return t

    def render(self, cam: Camera, t: float, disk_gain=1.0, sky_gain=1.0, disk_speed=1.0, disk_alpha=0.92) -> np.ndarray:
        W, H = self.W, self.H
        n = self.n
        # pozycja kamery
        c_hat = np.array([math.sin(cam.incl) * math.cos(cam.az), math.sin(cam.incl) * math.sin(cam.az), math.cos(cam.incl)])
        fwd = -c_hat
        upw = n - np.dot(n, fwd) * fwd
        if np.linalg.norm(upw) < 1e-6:
            upw = np.array([0.0, 1.0, 0.0])
        upw = normalize(upw)
        right = normalize(np.cross(fwd, upw))
        upw = np.cross(right, fwd)
        # roll
        cr, sr = math.cos(cam.roll), math.sin(cam.roll)
        right, upw = cr * right + sr * upw, -sr * right + cr * upw
        # yaw / pitch
        def rot(v, axis, ang):
            axis = normalize(axis)
            return v * math.cos(ang) + np.cross(axis, v) * math.sin(ang) + axis * np.dot(axis, v) * (1 - math.cos(ang))
        fwd2 = rot(rot(fwd, upw, cam.yaw), right, cam.pitch)
        right2 = rot(rot(right, upw, cam.yaw), right, cam.pitch)
        up2 = np.cross(right2, fwd2)

        tanf = math.tan(cam.hfov / 2)
        dx = fwd2[0] + tanf * (self.px * right2[0] + self.py * up2[0])
        dy = fwd2[1] + tanf * (self.px * right2[1] + self.py * up2[1])
        dz = fwd2[2] + tanf * (self.px * right2[2] + self.py * up2[2])
        inv = 1.0 / np.sqrt(dx * dx + dy * dy + dz * dz)
        dx *= inv; dy *= inv; dz *= inv

        cosA = -(dx * c_hat[0] + dy * c_hat[1] + dz * c_hat[2])
        alpha = np.arccos(np.clip(cosA, -1, 1)).astype(np.float32)
        # e2 = składowa d prostopadła do c_hat
        dc = -cosA
        e2x = dx - dc * c_hat[0]
        e2y = dy - dc * c_hat[1]
        e2z = dz - dc * c_hat[2]
        inv = 1.0 / np.maximum(np.sqrt(e2x * e2x + e2y * e2y + e2z * e2z), 1e-9)
        e2x *= inv; e2y *= inv; e2z *= inv

        tab = self.table_for(cam.D, float(alpha.max()))
        NA = len(tab.alphas)
        fa = np.clip((alpha - tab.alphas[0]) / (tab.alphas[1] - tab.alphas[0]), 0, NA - 1.001).astype(np.float32)
        ia0 = fa.astype(np.int32)
        wa = fa - ia0
        ia = np.where(wa > 0.5, ia0 + 1, ia0)
        pe0 = tab.phi_end[ia0].astype(np.float32)
        pe1 = tab.phi_end[ia0 + 1].astype(np.float32)
        smooth = tab.escaped[ia0] & tab.escaped[ia0 + 1] & (np.abs(pe1 - pe0) < 0.5)
        phi_end = np.where(smooth, pe0 + (pe1 - pe0) * wa, tab.phi_end[ia].astype(np.float32))
        escaped = tab.escaped[ia]

        col = np.zeros((H, W, 3), np.float32)
        acc = np.zeros((H, W), np.float32)

        # przecięcia z płaszczyzną dysku
        a_ = float(np.dot(c_hat, n))
        b_ = e2x * n[0] + e2y * n[1] + e2z * n[2]
        phi1 = np.mod(np.arctan2(-a_, b_), np.pi).astype(np.float32)
        NP = tab.u.shape[1]
        xd = np.array([1.0, 0, 0]); yd = np.cross(n, xd)
        for k in range(3):
            phik = phi1 + k * np.pi
            valid = phik < phi_end
            if not valid.any():
                break
            fi = phik / tab.dphi
            i0 = np.clip(fi.astype(np.int32), 0, NP - 2)
            fr = (fi - i0).astype(np.float32)
            u0 = tab.u[ia, i0]
            u1 = tab.u[ia, i0 + 1]
            uu = u0 + (u1 - u0) * fr
            uu = np.where(np.isnan(uu), u0, uu)
            r = 1.0 / np.maximum(uu, 1e-6)
            hit = valid & ~np.isnan(uu) & (r > R_ISCO * 0.98) & (r < 30)
            if not hit.any():
                continue
            du = tab.du[ia, i0]
            cph, sph = np.cos(phik), np.sin(phik)
            # punkt na dysku (kierunek)
            Px = cph * c_hat[0] + sph * e2x
            Py = cph * c_hat[1] + sph * e2y
            Pz = cph * c_hat[2] + sph * e2z
            psi = np.arctan2(Px * yd[0] + Py * yd[1] + Pz * yd[2], Px * xd[0] + Py * xd[1] + Pz * xd[2])
            # styczna do toru (kierunek śledzenia) -> foton biegnie przeciwnie
            rp = -du / np.maximum(uu * uu, 1e-9)
            Tx = rp * Px + r * (-sph * c_hat[0] + cph * e2x)
            Ty = rp * Py + r * (-sph * c_hat[1] + cph * e2y)
            Tz = rp * Pz + r * (-sph * c_hat[2] + cph * e2z)
            tn = 1.0 / np.maximum(np.sqrt(Tx * Tx + Ty * Ty + Tz * Tz), 1e-9)
            # prędkość orbitalna: n × P
            vx = n[1] * Pz - n[2] * Py
            vy = n[2] * Px - n[0] * Pz
            vz = n[0] * Py - n[1] * Px
            vn = 1.0 / np.maximum(np.sqrt(vx * vx + vy * vy + vz * vz), 1e-9)
            cos_th = -(vx * Tx + vy * Ty + vz * Tz) * vn * tn
            rr = np.maximum(r, 3.01)
            v = np.sqrt(1.0 / (rr - 2.0))
            g = np.sqrt(1 - 2 / rr) * np.sqrt(1 - v * v) / (1 - v * cos_th) / math.sqrt(1 - 2 / cam.D)
            # profil temperatury cienkiego dysku
            x = np.clip(R_ISCO / rr, 0, 1)
            prof = (rr / R_ISCO) ** -3 * np.clip(1 - np.sqrt(x), 0, 1)
            prof = prof / 0.0275  # ~max = 1
            T = 4300 * np.power(np.maximum(prof, 1e-6), 0.25) * g
            # tekstura
            omega = rr ** -1.5
            ph = (psi - omega * t * disk_speed * 6.0) / (2 * np.pi)
            tx = (np.mod(ph, 1.0) * self.disk_tex.shape[1]).astype(np.float32)
            ty = (np.clip((np.log(rr) - math.log(R_ISCO)) / (math.log(30) - math.log(R_ISCO)), 0, 1) * (self.disk_tex.shape[0] - 1)).astype(np.float32)
            tv = cv2.remap(self.disk_tex, tx, ty, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            dens = np.clip(0.75 + 0.45 * tv, 0.05, 2.0)
            edge = np.clip((rr - R_ISCO * 0.98) / 0.6, 0, 1) * np.clip((30 - rr) / 16, 0, 1) ** 1.5
            inten = prof * dens * g ** 3.5 * edge * 1.1 * disk_gain
            rgb = kelvin_to_rgb(T.astype(np.float32))
            rgb = rgb / np.maximum(rgb.max(-1, keepdims=True), 1e-6)
            em = rgb * inten[..., None]
            al = np.clip(disk_alpha * edge * np.clip(dens, 0, 1) * np.clip(prof * 4, 0, 1) ** 0.3, 0, 1) * hit
            em = np.where(hit[..., None], np.nan_to_num(em, nan=0.0, posinf=0.0), 0.0).astype(np.float32)
            al = np.nan_to_num(al, nan=0.0).astype(np.float32)
            col += ((1 - acc) * 1.0)[..., None] * em
            acc = acc + (1 - acc) * al

        # tło nieba (zakrzywione kierunki)
        phi_e = phi_end
        ce, se = np.cos(phi_e), np.sin(phi_e)
        ox = ce * c_hat[0] + se * e2x
        oy = ce * c_hat[1] + se * e2y
        oz = ce * c_hat[2] + se * e2z
        lon = np.arctan2(oy, ox)
        lat = np.arcsin(np.clip(oz, -1, 1))
        mx = ((lon + np.pi) / (2 * np.pi) * self.sky_w - 0.5).astype(np.float32)
        my = ((np.pi / 2 - lat) / np.pi * self.sky_h - 0.5).astype(np.float32)
        bg = cv2.remap(self.sky, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        col += bg * (escaped * (1 - acc))[..., None] * sky_gain
        return col


# --------------------------------------------------------------------------- post-processing
def bloom(img: np.ndarray, strength=0.35, threshold=0.9) -> np.ndarray:
    H, W = img.shape[:2]
    bright = np.clip(img - threshold, 0, None)
    out = img.copy()
    small = cv2.resize(bright, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    for s, w in ((3, 0.6), (10, 0.5), (30, 0.4)):
        bl = cv2.GaussianBlur(small, (0, 0), s)
        out += cv2.resize(bl, (W, H), interpolation=cv2.INTER_LINEAR) * strength * w
    return out


def tonemap(img: np.ndarray, exposure=1.0) -> np.ndarray:
    x = img * exposure
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    y = np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)
    return np.power(y, 1 / 2.2)
