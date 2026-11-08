"""Signed-distance-field ray-marching renderer for the kitten & rainbow egg short.

Everything (kitten, egg, baby dragon, garden) is modelled as smooth SDF
primitives and shaded with a soft "3D cartoon" look: wrap diffuse, sky fill,
warm rim light, soft shadows, ambient occlusion, emissive magic glow.
"""
import math
import numpy as np
from numba import njit, prange

from params import *  # noqa: F401,F403  (index constants)

# --------------------------------------------------------------------------
# static garden layout
# --------------------------------------------------------------------------
# flowers: x, z, scale, hue
FLOWERS = np.array([
    # tumble patch (scene 2) around (0.95, 0.25)
    [0.80, 0.30, 1.10, 0.92], [0.98, 0.42, 1.25, 0.12], [1.12, 0.20, 1.05, 0.80],
    [0.92, 0.10, 1.15, 0.55], [1.20, 0.45, 1.00, 0.02], [0.70, 0.52, 0.95, 0.15],
    [1.05, 0.62, 1.10, 0.70],
    # garden dressing
    [-0.95, 0.35, 1.00, 0.95], [-1.10, -0.20, 1.15, 0.13], [-0.20, 0.55, 0.90, 0.78],
    [0.05, -0.55, 1.05, 0.58], [-0.55, -0.70, 1.20, 0.05], [0.65, -0.45, 1.00, 0.88],
    [-0.75, 0.75, 0.95, 0.50], [0.30, 0.80, 1.00, 0.97], [-1.35, 0.60, 1.10, 0.18],
    [1.45, -0.20, 1.20, 0.62], [-0.15, -1.10, 1.30, 0.84],
], dtype=np.float64)
assert FLOWERS.shape[0] == N_FLOWERS

# mushrooms: x, z, scale, hue
MUSHROOMS = np.array([
    [-1.25, -0.75, 1.0, 0.98],
    [1.30, -0.85, 1.25, 0.03],
    [-0.30, -1.55, 0.8, 0.80],
], dtype=np.float64)

# fluffy pastel trees: x, z, scale, hue
TREES = np.array([
    [-2.3, -3.2, 1.3, 0.92],
    [2.1, -3.8, 1.5, 0.45],
    [0.3, -5.0, 1.6, 0.80],
    [-3.8, -5.5, 1.8, 0.33],
    [3.9, -5.0, 1.7, 0.95],
], dtype=np.float64)


# --------------------------------------------------------------------------
# math helpers
# --------------------------------------------------------------------------
@njit(fastmath=True, inline='always')
def clamp(x, a, b):
    return a if x < a else (b if x > b else x)


@njit(fastmath=True, inline='always')
def smoothstep(a, b, x):
    t = clamp((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


@njit(fastmath=True, inline='always')
def mix(a, b, t):
    return a + (b - a) * t


@njit(fastmath=True, inline='always')
def smin(a, b, k):
    h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return mix(b, a, h) - k * h * (1.0 - h)


@njit(fastmath=True, inline='always')
def length3(x, y, z):
    return math.sqrt(x * x + y * y + z * z)


@njit(fastmath=True, inline='always')
def sd_sphere(x, y, z, r):
    return math.sqrt(x * x + y * y + z * z) - r


@njit(fastmath=True, inline='always')
def sd_ellipsoid(x, y, z, rx, ry, rz):
    k0 = math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2)
    k1 = math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2)
    if k1 < 1e-9:
        return -min(rx, min(ry, rz))
    return k0 * (k0 - 1.0) / k1


@njit(fastmath=True, inline='always')
def sd_capsule(x, y, z, ax, ay, az, bx, by, bz, r):
    pax, pay, paz = x - ax, y - ay, z - az
    bax, bay, baz = bx - ax, by - ay, bz - az
    h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0.0, 1.0)
    return length3(pax - bax * h, pay - bay * h, paz - baz * h) - r


@njit(fastmath=True, inline='always')
def sd_round_cone(x, y, z, ax, ay, az, bx, by, bz, r1, r2):
    # Inigo Quilez' round cone between two points
    bax, bay, baz = bx - ax, by - ay, bz - az
    l2 = bax * bax + bay * bay + baz * baz
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pax, pay, paz = x - ax, y - ay, z - az
    yv = pax * bax + pay * bay + paz * baz
    zv = yv - l2
    qx, qy, qz = pax * l2 - bax * yv, pay * l2 - bay * yv, paz * l2 - baz * yv
    x2 = qx * qx + qy * qy + qz * qz
    y2 = yv * yv * l2
    z2 = zv * zv * l2
    k = math.copysign(1.0, rr) * rr * rr * x2
    if math.copysign(1.0, zv) * a2 * z2 > k:
        return math.sqrt(x2 + z2) * il2 - r2
    if math.copysign(1.0, yv) * a2 * y2 < k:
        return math.sqrt(x2 + y2) * il2 - r1
    return (math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1


@njit(fastmath=True, inline='always')
def hsv(h, s, v):
    h = h - math.floor(h)
    r = clamp(abs(h * 6.0 - 3.0) - 1.0, 0.0, 1.0)
    g = clamp(2.0 - abs(h * 6.0 - 2.0), 0.0, 1.0)
    b = clamp(2.0 - abs(h * 6.0 - 4.0), 0.0, 1.0)
    return (v * mix(1.0, r, s), v * mix(1.0, g, s), v * mix(1.0, b, s))


@njit(fastmath=True, inline='always')
def fur_noise(x, y, z):
    # soft, low-frequency fluffy clumps (fine strands are done in shading)
    a = math.sin((0.74 * x + 0.52 * y + 0.42 * z) * 19.0)
    b = math.sin((-0.31 * x + 0.81 * y - 0.49 * z) * 23.0 + 1.3)
    c = math.sin((0.57 * x - 0.28 * y + 0.77 * z) * 21.0 + 2.6)
    return 0.4 * (a * b + b * c + c * a)


@njit(fastmath=True, inline='always')
def strand_noise(x, y, z):
    a = math.sin(x * 210.0 + math.sin(y * 37.0) * 2.0) * math.sin(y * 190.0 + math.sin(z * 41.0) * 2.0)
    b = math.sin(z * 230.0 + math.sin(x * 29.0) * 2.0)
    return 0.5 * a + 0.3 * b


@njit(fastmath=True, inline='always')
def hash2(a, b):
    v = math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return v - math.floor(v)


# material ids
M_GROUND = 1
M_PETAL = 2
M_FCENTER = 3
M_FUR = 4
M_FUR_HEAD = 5
M_WHITE = 6
M_NOSE = 7
M_EYE = 8
M_EAR_IN = 9
M_EGG = 10
M_EGG_IN = 11
M_DRAGON = 12
M_BELLY = 13
M_WING = 14
M_DEYE = 15
M_HORN = 16
M_HILL = 17
M_STEM = 18
M_MOUTH = 19
M_MUSH_CAP = 20
M_MUSH_STEM = 21
M_TREE = 22
M_TRUNK = 23
M_GRASS = 24


# --------------------------------------------------------------------------
# kitten
# --------------------------------------------------------------------------
@njit(fastmath=True)
def kitten_sdf(px, py, pz, P):
    qx = px - P[K_X]
    qy = py - P[K_Y]
    qz = pz - P[K_Z]
    c = math.cos(-P[K_YAW]); s = math.sin(-P[K_YAW])
    qx, qz = c * qx + s * qz, -s * qx + c * qz
    # forward lean (pitch) & somersault roll about a pivot inside the body
    ang = -(P[K_ROLL] + P[K_PITCH])
    qy -= 0.38
    c = math.cos(ang); s = math.sin(ang)
    qy, qz = c * qy - s * qz, s * qy + c * qz
    qy += 0.38
    sq = P[K_SQ]
    ss = 1.0 / math.sqrt(sq)
    qy /= sq
    qx /= ss
    qz /= ss
    dscale = min(sq, ss)

    puff = P[K_PUFF]
    pf = 1.0 + 0.25 * puff

    best = 1e9
    mat = M_FUR
    u = qx; v = qy; w = qz

    # ---- body
    db = sd_ellipsoid(qx, qy - 0.30, qz, 0.23 * pf, 0.25 * pf, 0.26 * pf)
    # chest fluff
    dchest = sd_ellipsoid(qx, qy - 0.37, qz - 0.165, 0.14 * pf, 0.15 * pf, 0.12 * pf)
    legs = P[K_LEGS]
    # front paws (reach forward when pouncing)
    fpz = 0.20 + 0.16 * legs
    fpy = 0.055 + 0.12 * legs
    dpaw = min(sd_sphere(qx - 0.09, qy - fpy, qz - fpz, 0.072),
               sd_sphere(qx + 0.09, qy - fpy, qz - fpz, 0.072))
    # back feet
    bpz = 0.03 - 0.12 * legs
    dfeet = min(sd_ellipsoid(qx - 0.16, qy - 0.065, qz - bpz, 0.085, 0.07, 0.11),
                sd_ellipsoid(qx + 0.16, qy - 0.065, qz - bpz, 0.085, 0.07, 0.11))
    # tail
    tw = P[K_TAIL]
    t1x = 0.10 * math.sin(tw)
    t2x = 0.16 * math.sin(tw - 0.9)
    dtail = min(sd_capsule(qx, qy, qz, 0.0, 0.12, -0.20, t1x, 0.24, -0.38, 0.058 * pf),
                sd_capsule(qx, qy, qz, t1x, 0.24, -0.38, t2x, 0.50, -0.42, 0.054 * pf))

    # ---- head (in neck space)
    hx = qx; hy = qy - 0.55; hz = qz - 0.05
    # turn (yaw)
    c = math.cos(-P[K_HTURN]); s = math.sin(-P[K_HTURN])
    hx, hz = c * hx + s * hz, -s * hx + c * hz
    # nod (pitch)
    c = math.cos(-P[K_HNOD]); s = math.sin(-P[K_HNOD])
    hy, hz = c * hy - s * hz, s * hy + c * hz
    # tilt (roll)
    c = math.cos(-P[K_HTILT]); s = math.sin(-P[K_HTILT])
    hx, hy = c * hx - s * hy, s * hx + c * hy
    hy -= 0.15
    hz -= 0.03
    hpf = 1.0 + 0.12 * puff
    dh = sd_ellipsoid(hx, hy, hz, 0.31 * hpf, 0.27 * hpf, 0.27 * hpf)
    # cheek fluff tufts
    dh = smin(dh, sd_ellipsoid(abs(hx) - 0.24 * hpf, hy + 0.08, hz - 0.02, 0.09, 0.07, 0.09), 0.06)

    fur = 0.007 + 0.012 * puff
    dfur_body = smin(db, dtail, 0.05) - fur * fur_noise(qx, qy, qz)
    dfur_body = smin(dfur_body, dfeet, 0.04)
    dfur_head = dh - fur * fur_noise(hx * 1.1, hy * 1.1, hz * 1.1)

    if dfur_body < dfur_head:
        dfur = smin(dfur_body, dfur_head, 0.09)
        best = dfur
        mat = M_FUR
        u = qx; v = qy; w = qz
    else:
        dfur = smin(dfur_body, dfur_head, 0.09)
        best = dfur
        mat = M_FUR_HEAD
        u = hx; v = hy; w = hz

    dwh = min(dchest - 0.6 * fur * fur_noise(qx, qy, qz), dpaw)
    if dwh < best:
        best = smin(best, dwh, 0.05)
        mat = M_WHITE
        u = qx; v = qy; w = qz
    else:
        best = smin(best, dwh, 0.05)

    # ears
    ears = P[K_EARS]
    etx = 0.21 + 0.10 * (1.0 - ears)
    ety = 0.37 - 0.13 * (1.0 - ears)
    ax = abs(hx)
    dear = sd_round_cone(ax, hy, hz * 1.6, 0.14, 0.15, 0.0, etx, ety, -0.01, 0.085, 0.014)
    dear *= 0.62
    if dear < best:
        if hz > 0.03 and hy > 0.17:
            mat = M_EAR_IN
        else:
            mat = M_FUR_HEAD
        u = hx; v = hy; w = hz
    best = smin(best, dear, 0.02)

    # muzzle (white) + chin
    dmz = min(sd_sphere(hx - 0.045, hy + 0.06, hz - 0.215, 0.068),
              sd_sphere(hx + 0.045, hy + 0.06, hz - 0.215, 0.068))
    dmz = min(dmz, sd_sphere(hx, hy + 0.11, hz - 0.19, 0.055))
    if dmz < best:
        mat = M_WHITE
        u = hx; v = hy; w = hz
    best = smin(best, dmz, 0.02)

    # mouth ("o" of surprise)
    mo = P[K_MOUTH]
    if mo > 0.02:
        dmo = sd_ellipsoid(hx, hy + 0.135, hz - 0.235, 0.028 + 0.01 * mo, 0.012 + 0.03 * mo, 0.02)
        if dmo < best + 0.004:
            best = min(best, dmo)
            mat = M_MOUTH

    # nose
    dn = sd_ellipsoid(hx, hy + 0.012, hz - 0.285, 0.032, 0.022, 0.02)
    if dn < best:
        best = dn
        mat = M_NOSE
        u = hx; v = hy; w = hz

    # eyes
    eo = clamp(P[K_EYE], 0.06, 1.2)
    er = 0.105
    ex = abs(hx) - 0.125
    ey = hy - 0.025
    ez = hz - 0.165
    de = sd_ellipsoid(ex, ey, ez, er, er * eo, er)
    if de < best:
        best = de
        mat = M_EYE
        # local eye coords (mirror x back so look direction works for both eyes)
        u = hx - math.copysign(0.125, hx)
        v = ey / eo
        w = ez

    return best * dscale, mat, u, v, w


# --------------------------------------------------------------------------
# baby dragon
# --------------------------------------------------------------------------
@njit(fastmath=True)
def dragon_sdf(px, py, pz, P):
    sc = P[D_SCALE]
    qx = (px - P[D_X]) / sc
    qy = (py - P[D_Y]) / sc
    qz = (pz - P[D_Z]) / sc
    c = math.cos(-P[D_YAW]); s = math.sin(-P[D_YAW])
    qx, qz = c * qx + s * qz, -s * qx + c * qz
    sq = P[D_SQ]
    ss = 1.0 / math.sqrt(sq)
    qy /= sq
    qx /= ss
    qz /= ss
    dscale = sc * min(sq, ss)

    best = 1e9
    mat = M_DRAGON
    u = qx; v = qy; w = qz

    # body
    db = sd_ellipsoid(qx, qy - 0.22, qz, 0.155, 0.175, 0.15)
    # tail
    dt = min(sd_round_cone(qx, qy, qz, 0.0, 0.12, -0.10, 0.05, 0.08, -0.30, 0.065, 0.035),
             sd_round_cone(qx, qy, qz, 0.05, 0.08, -0.30, 0.14, 0.16, -0.40, 0.035, 0.012))
    # feet + arms
    dl = min(sd_ellipsoid(abs(qx) - 0.085, qy - 0.04, qz - 0.05, 0.055, 0.045, 0.07),
             sd_sphere(abs(qx) - 0.12, qy - 0.25, qz - 0.10, 0.042))
    d = smin(db, dt, 0.05)
    d = smin(d, dl, 0.03)
    best = d
    # belly
    dbel = sd_ellipsoid(qx, qy - 0.21, qz - 0.055, 0.12, 0.14, 0.11)
    if dbel < best:
        mat = M_BELLY
    best = smin(best, dbel, 0.01)

    # back spikes (rainbow-ish horn material)
    for i in range(3):
        sy = 0.30 - 0.09 * i
        sz = -0.10 - 0.04 * i
        dsp = sd_round_cone(qx, qy, qz, 0.0, sy, sz, 0.0, sy + 0.03, sz - 0.07, 0.03, 0.008)
        if dsp < best:
            mat = M_HORN
            u = 0.3 + 0.2 * i
        best = smin(best, dsp, 0.01)

    # wings
    flap = P[D_WING]
    for side in range(2):
        sgn = 1.0 if side == 0 else -1.0
        wx = qx * sgn - 0.08
        wy = qy - 0.32
        wz = qz + 0.06
        # wing angle: rotate about z (flap) then sweep back a bit
        a = -flap
        c = math.cos(a); s = math.sin(a)
        wx, wy = c * wx - s * wy, s * wx + c * wy
        c = math.cos(0.45); s = math.sin(0.45)
        wx, wz = c * wx + s * wz, -s * wx + c * wz
        # scalloped edge: union of three lobes
        dw = sd_ellipsoid(wx - 0.15, wy - 0.03, wz, 0.16, 0.11, 0.014)
        dw = min(dw, sd_ellipsoid(wx - 0.22, wy - 0.07, wz, 0.10, 0.07, 0.012))
        dw = min(dw, sd_ellipsoid(wx - 0.10, wy - 0.07, wz, 0.10, 0.06, 0.012))
        if dw < best:
            mat = M_WING
            u = wx; v = wy; w = wz
        best = smin(best, dw, 0.015)

    # head (nod about neck)
    hx = qx; hy = qy - 0.36; hz = qz - 0.02
    c = math.cos(-P[D_HNOD]); s = math.sin(-P[D_HNOD])
    hy, hz = c * hy - s * hz, s * hy + c * hz
    hy -= 0.12
    dh = sd_ellipsoid(hx, hy, hz, 0.165, 0.15, 0.15)
    dsn = sd_ellipsoid(hx, hy + 0.045, hz - 0.12, 0.10, 0.07, 0.08)
    dh = smin(dh, dsn, 0.05)
    if dh < best:
        mat = M_DRAGON
        u = hx; v = hy; w = hz
    best = smin(best, dh, 0.05)

    # mouth (sneeze / blow)
    mo = P[D_MOUTH]
    if mo > 0.02:
        dmo = sd_ellipsoid(hx, hy + 0.07, hz - 0.195, 0.03 + 0.01 * mo, 0.008 + 0.028 * mo, 0.02)
        if dmo < best + 0.004:
            best = min(best, dmo)
            mat = M_MOUTH

    # horns
    dho = sd_round_cone(abs(hx), hy, hz, 0.07, 0.10, -0.02, 0.10, 0.20, -0.07, 0.03, 0.01)
    if dho < best:
        mat = M_HORN
        u = 0.1
    best = smin(best, dho, 0.015)
    # little ear fins
    dfin = sd_ellipsoid(abs(hx) - 0.15, hy - 0.03, hz + 0.02, 0.05, 0.03, 0.012)
    if dfin < best:
        mat = M_WING
        u = 0.15; v = 0.0; w = 0.0
    best = smin(best, dfin, 0.02)

    # eyes
    eo = clamp(P[D_EYE], 0.06, 1.2)
    er = 0.062
    ex = abs(hx) - 0.075
    ey = hy - 0.025
    ez = hz - 0.105
    de = sd_ellipsoid(ex, ey, ez, er, er * eo, er)
    if de < best:
        best = de
        mat = M_DEYE
        u = hx - math.copysign(0.075, hx)
        v = ey / eo
        w = ez

    return best * dscale, mat, u, v, w


# --------------------------------------------------------------------------
# rainbow egg
# --------------------------------------------------------------------------
EGG_RX = 0.19
EGG_RY = 0.25


@njit(fastmath=True, inline='always')
def egg_shape(x, y, z):
    # egg: ellipsoid narrowing towards the top
    k = 1.0 - 0.16 * clamp(y / EGG_RY, -1.0, 1.0)
    return sd_ellipsoid(x / k, y, z / k, EGG_RX, EGG_RY, EGG_RX) * k


@njit(fastmath=True, inline='always')
def crack_line(x, z):
    th = math.atan2(x, z)
    t = th * 7.0 / math.pi
    tri = abs((t - math.floor(t)) * 2.0 - 1.0)
    return 0.03 + 0.05 * (tri - 0.5), th


@njit(fastmath=True)
def egg_sdf(px, py, pz, P):
    sq = P[E_SQ]
    ss = 1.0 / math.sqrt(sq)
    qx = px - P[E_X]
    qy = py - P[E_Y]
    qz = pz - P[E_Z]
    # tilt about base point
    c = math.cos(-P[E_TZ]); s = math.sin(-P[E_TZ])
    qx, qy = c * qx - s * qy, s * qx + c * qy
    c = math.cos(-P[E_TX]); s = math.sin(-P[E_TX])
    qy, qz = c * qy - s * qz, s * qy + c * qz
    qy /= sq
    qx /= ss
    qz /= ss
    dscale = min(sq, ss)
    qy -= EGG_RY  # egg centre

    if P[E_SPLIT] < 0.5:
        d = egg_shape(qx, qy, qz)
        return d * dscale, M_EGG, qx, qy, qz

    # bottom shell
    de = egg_shape(qx, qy, qz)
    cy, th = crack_line(qx, qz)
    shell = abs(de) - 0.012
    dbot = max(shell, (qy - cy) * 0.7)
    best = dbot
    mat = M_EGG if de > 0.0 else M_EGG_IN
    if qy > cy - 0.012:
        mat = M_EGG_IN
    u = qx; v = qy; w = qz
    # flying cap
    cx = qx - P[E_CX]
    cyy = qy - P[E_CY]
    cz = qz - P[E_CZ]
    cyy -= 0.03
    c = math.cos(-P[E_CROT]); s = math.sin(-P[E_CROT])
    cx, cyy = c * cx - s * cyy, s * cx + c * cyy
    cyy += 0.03
    dce = egg_shape(cx, cyy, cz)
    ccy, cth = crack_line(cx, cz)
    dcap = max(abs(dce) - 0.012, -(cyy - ccy) * 0.7)
    if dcap < best:
        best = dcap
        mat = M_EGG if dce > 0.0 else M_EGG_IN
        if cyy < ccy + 0.012:
            mat = M_EGG_IN
        u = cx; v = cyy; w = cz
    return best * dscale, mat, u, v, w


# --------------------------------------------------------------------------
# garden
# --------------------------------------------------------------------------
@njit(fastmath=True)
def garden_sdf(px, py, pz, P, dbest):
    best = dbest
    mat = 0
    u = 0.0; v = 0.0; w = 0.0

    # ground with gentle undulation
    gh = 0.02 * math.sin(px * 1.3) * math.sin(pz * 1.1 + 0.4)
    dg = py - gh
    if dg < best:
        best = dg
        mat = M_GROUND
        u = px; v = py; w = pz

    # grass blades (domain repetition, only near the ground, near camera)
    if py < 0.075 and py > -0.02 and pz > -2.5:
        cell = 0.04
        cxi = math.floor(px / cell)
        czi = math.floor(pz / cell)
        dbl = 1e9
        for ox in range(2):
            for oz in range(2):
                ix = cxi + ox
                iz = czi + oz
                hsh = hash2(ix, iz)
                hsh2 = hash2(iz + 3.1, ix - 7.7)
                bx = (ix + hsh * 0.8 - 0.4 + 0.5) * cell - 0.5 * cell
                bz = (iz + hsh2 * 0.8 - 0.4 + 0.5) * cell - 0.5 * cell
                hgt = 0.03 + 0.035 * hsh * hsh2
                lean = (hsh - 0.5) * 0.5
                lx = px - bx - lean * (py - gh)
                lz = pz - bz - lean * 0.6 * (py - gh)
                yy = clamp((py - gh) / hgt, 0.0, 1.0)
                r = 0.0075 * (1.0 - yy) + 0.0012
                db_ = math.sqrt(lx * lx + lz * lz) - r
                db_ = max(db_, py - gh - hgt)
                if db_ < dbl:
                    dbl = db_
        dbl = dbl * 0.7
        if dbl < best:
            best = dbl
            mat = M_GRASS
            u = px; v = (py - gh) / 0.065; w = pz

    # hills
    for i in range(3):
        if i == 0:
            hx, hy, hz, hr = -3.6, -2.0, -6.5, 3.0
        elif i == 1:
            hx, hy, hz, hr = 3.8, -2.6, -7.5, 3.6
        else:
            hx, hy, hz, hr = 0.0, -4.2, -11.0, 5.5
        dhl = sd_sphere(px - hx, py - hy, pz - hz, hr)
        if dhl < best:
            best = dhl
            mat = M_HILL
            u = px; v = py; w = pz

    # trees
    for i in range(TREES.shape[0]):
        tx = TREES[i, 0]; tz = TREES[i, 1]; ts = TREES[i, 2]
        bd = length3(px - tx, py - 1.1 * ts, pz - tz) - 1.0 * ts
        if bd > best:
            continue
        dtr = sd_capsule(px, py, pz, tx, 0.0, tz, tx, 0.9 * ts, tz, 0.09 * ts)
        if dtr < best:
            best = dtr
            mat = M_TRUNK
        dcan = sd_sphere(px - tx, py - 1.2 * ts, pz - tz, 0.55 * ts)
        dcan = smin(dcan, sd_sphere(px - tx - 0.4 * ts, py - 0.95 * ts, pz - tz, 0.4 * ts), 0.2)
        dcan = smin(dcan, sd_sphere(px - tx + 0.42 * ts, py - 1.0 * ts, pz - tz + 0.1, 0.42 * ts), 0.2)
        dcan = smin(dcan, sd_sphere(px - tx + 0.1, py - 1.6 * ts, pz - tz, 0.38 * ts), 0.2)
        if dcan < best:
            best = dcan
            mat = M_TREE
            u = TREES[i, 3]; v = py - tz; w = 0.0

    # mushrooms
    for i in range(MUSHROOMS.shape[0]):
        mx = MUSHROOMS[i, 0]; mz = MUSHROOMS[i, 1]; ms = MUSHROOMS[i, 2]
        bd = length3(px - mx, py - 0.15 * ms, pz - mz) - 0.25 * ms
        if bd > best:
            continue
        dst = sd_round_cone(px, py, pz, mx, 0.0, mz, mx, 0.17 * ms, mz, 0.05 * ms, 0.035 * ms)
        if dst < best:
            best = dst
            mat = M_MUSH_STEM
        lx = px - mx; ly = py - 0.17 * ms; lz = pz - mz
        dcap = sd_ellipsoid(lx, ly, lz, 0.17 * ms, 0.11 * ms, 0.17 * ms)
        dcap = max(dcap, -(ly + 0.01 * ms))
        if dcap < best:
            best = dcap
            mat = M_MUSH_CAP
            u = lx / ms; v = ly / ms; w = lz / ms

    # flowers
    for i in range(FLOWERS.shape[0]):
        fx = FLOWERS[i, 0]; fz = FLOWERS[i, 1]; fs = FLOWERS[i, 2]
        fsq = P[FL_SQ0 + i]
        fh = 0.13 * fs * fsq
        bd = length3(px - fx, py - fh * 0.6, pz - fz) - 0.14 * fs
        if bd > best:
            continue
        dst = sd_capsule(px, py, pz, fx, 0.0, fz, fx, fh, fz, 0.008 * fs)
        if dst < best:
            best = dst
            mat = M_STEM
        lx = px - fx; ly = py - fh; lz = pz - fz
        dc = sd_ellipsoid(lx, ly, lz, 0.028 * fs, 0.02 * fs, 0.028 * fs)
        if dc < best:
            best = dc
            mat = M_FCENTER
        # five petals via polar repetition
        a = math.atan2(lz, lx) + i * 0.7
        sector = 2.0 * math.pi / 5.0
        a = (a + 0.5 * sector) - sector * math.floor((a + 0.5 * sector) / sector) - 0.5 * sector
        rr = math.sqrt(lx * lx + lz * lz)
        ppx = rr * math.cos(a) - 0.045 * fs
        ppz = rr * math.sin(a)
        ppy = ly - 0.15 * (rr - 0.02)  # cup upwards
        dp = sd_ellipsoid(ppx, ppy, ppz, 0.042 * fs, 0.008 * fs, 0.026 * fs)
        if dp < best:
            best = dp * 0.9
            mat = M_PETAL
            u = FLOWERS[i, 3]; v = rr / fs; w = 0.0

    return best, mat, u, v, w


# --------------------------------------------------------------------------
# full scene
# --------------------------------------------------------------------------
@njit(fastmath=True)
def scene(px, py, pz, P):
    best = 1e9
    mat = 0
    u = 0.0; v = 0.0; w = 0.0

    # kitten (bounding sphere)
    bk = length3(px - P[K_X], py - P[K_Y] - 0.45, pz - P[K_Z]) - (0.95 + 0.35 * P[K_PUFF])
    if bk < best:
        if bk > 0.05:
            best = bk
            mat = 0
        else:
            d, m, a, b, c = kitten_sdf(px, py, pz, P)
            if d < best:
                best = d; mat = m; u = a; v = b; w = c

    if P[E_VIS] > 0.5:
        be = length3(px - P[E_X], py - P[E_Y] - 0.3, pz - P[E_Z]) - 0.45
        if P[E_SPLIT] > 0.5:
            be = min(be, length3(px - P[E_X] - P[E_CX], py - P[E_Y] - 0.3 - P[E_CY],
                                 pz - P[E_Z] - P[E_CZ]) - 0.4)
        if be < best:
            if be > 0.05:
                best = be
                mat = 0
            else:
                d, m, a, b, c = egg_sdf(px, py, pz, P)
                if d < best:
                    best = d; mat = m; u = a; v = b; w = c

    if P[D_VIS] > 0.5:
        bd = length3(px - P[D_X], py - P[D_Y] - 0.3 * P[D_SCALE], pz - P[D_Z]) - 0.65 * P[D_SCALE]
        if bd < best:
            if bd > 0.05:
                best = bd
                mat = 0
            else:
                d, m, a, b, c = dragon_sdf(px, py, pz, P)
                if d < best:
                    best = d; mat = m; u = a; v = b; w = c

    d, m, a, b, c = garden_sdf(px, py, pz, P, best)
    if d < best:
        best = d; mat = m; u = a; v = b; w = c
    return best, mat, u, v, w


@njit(fastmath=True, inline='always')
def scene_d(px, py, pz, P):
    d, m, a, b, c = scene(px, py, pz, P)
    return d


@njit(fastmath=True)
def calc_normal(px, py, pz, P):
    e = 0.0015
    k1 = scene_d(px + e, py - e, pz - e, P)
    k2 = scene_d(px - e, py - e, pz + e, P)
    k3 = scene_d(px - e, py + e, pz - e, P)
    k4 = scene_d(px + e, py + e, pz + e, P)
    nx = k1 - k2 - k3 + k4
    ny = -k1 - k2 + k3 + k4
    nz = -k1 + k2 - k3 + k4
    l = length3(nx, ny, nz) + 1e-12
    return nx / l, ny / l, nz / l


@njit(fastmath=True)
def soft_shadow(px, py, pz, lx, ly, lz, P, jitter):
    # soft shadows; penumbra only estimated away from the surface so curved
    # bodies don't self-shadow into contour bands
    res = 1.0
    t = 0.03
    for i in range(32):
        h = scene_d(px + lx * t, py + ly * t, pz + lz * t, P)
        if h < 0.0008:
            return 0.0
        if t > 0.12:
            res = min(res, 12.0 * h / t)
        t += clamp(h, 0.02, 0.3)
        if res < 0.01 or t > 3.0:
            break
    res = clamp(res, 0.0, 1.0)
    return res * res * (3.0 - 2.0 * res)


@njit(fastmath=True)
def calc_ao(px, py, pz, nx, ny, nz, P):
    occ = 0.0
    sca = 1.0
    for i in range(5):
        h = 0.01 + 0.06 * i
        d = scene_d(px + nx * h, py + ny * h, pz + nz * h, P)
        occ += (h - d) * sca
        sca *= 0.75
    return clamp(1.0 - 2.2 * occ, 0.0, 1.0)


@njit(fastmath=True)
def sky(rx, ry, rz, sunx, suny, sunz):
    t = clamp(ry * 1.4 + 0.15, 0.0, 1.0)
    # horizon peach/pink -> lavender -> sky blue
    r = mix(1.00, 0.45, t)
    g = mix(0.80, 0.70, t)
    b = mix(0.82, 1.00, t)
    sd = max(rx * sunx + ry * suny + rz * sunz, 0.0)
    sg = sd ** 24 * 0.6 + sd ** 4 * 0.12
    r += sg; g += sg * 0.9; b += sg * 0.6
    # soft puffy clouds
    if ry > 0.02:
        cu = rx / (ry + 0.25)
        cv = rz / (ry + 0.25)
        cl = math.sin(cu * 3.1 + 0.5) * math.sin(cv * 2.3 + 1.0) + 0.6 * math.sin(cu * 6.7 - cv * 3.3)
        cl = smoothstep(0.55, 1.1, cl) * smoothstep(0.02, 0.25, ry)
        r = mix(r, 1.0, cl * 0.8)
        g = mix(g, 0.97, cl * 0.8)
        b = mix(b, 1.0, cl * 0.8)
    return r, g, b


@njit(fastmath=True)
def material(mat, px, py, pz, u, v, w, nx, ny, nz, P, t):
    """returns albedo rgb, emission rgb, spec strength, fur(0/1)"""
    er = 0.0; eg = 0.0; eb = 0.0
    spec = 0.1
    fur = 0.0
    r = 1.0; g = 1.0; b = 1.0
    if mat == M_GROUND or mat == M_GRASS:
        n1 = math.sin(px * 3.1 + pz * 1.7) * math.sin(pz * 2.3 - px * 0.7)
        n2 = math.sin(px * 13.0) * math.sin(pz * 11.0)
        k = 0.5 + 0.3 * n1 + 0.15 * n2
        r = mix(0.38, 0.58, k); g = mix(0.78, 0.93, k); b = mix(0.30, 0.42, k)
        if mat == M_GRASS:
            y = clamp(v, 0.0, 1.0)
            r = mix(r * 0.75, 0.80, y); g = mix(g * 0.85, 1.0, y); b = mix(b * 0.75, 0.50, y)
    elif mat == M_HILL:
        k = 0.5 + 0.5 * math.sin(px * 1.3 + py * 2.0)
        r = mix(0.40, 0.55, k); g = mix(0.78, 0.88, k); b = mix(0.40, 0.48, k)
    elif mat == M_PETAL:
        cr, cg, cb = hsv(u, mix(0.25, 0.75, smoothstep(0.02, 0.09, v)), 1.0)
        r, g, b = cr, cg, cb
        spec = 0.15
    elif mat == M_FCENTER:
        r, g, b = 1.0, 0.82, 0.25
        er, eg, eb = 0.15, 0.10, 0.0
    elif mat == M_STEM:
        r, g, b = 0.30, 0.70, 0.25
    elif mat == M_FUR or mat == M_FUR_HEAD:
        # orange tabby
        r, g, b = 1.0, 0.56, 0.18
        fur = 1.0
        if mat == M_FUR_HEAD:
            # forehead stripes
            if v > 0.06 and abs(u) < 0.17 and w > -0.05:
                st = smoothstep(0.45, 0.95, math.sin(u * 40.0 + 1.57 + 25.0 * (v - 0.1) * abs(u) * 6.0))
                st *= smoothstep(0.06, 0.14, v) * smoothstep(0.17, 0.10, abs(u))
                r = mix(r, 0.86, st); g = mix(g, 0.38, st); b = mix(b, 0.10, st)
            # cheek blush
            for sgn in (-1.0, 1.0):
                dd = length3(u - sgn * 0.19, v + 0.06, (w - 0.20) * 0.7)
                bl = smoothstep(0.075, 0.0, dd)
                r = mix(r, 1.0, bl * 0.6); g = mix(g, 0.50, bl * 0.6); b = mix(b, 0.55, bl * 0.6)
            # lighter cream lower face
            lf = smoothstep(-0.02, -0.14, v)
            r = mix(r, 1.0, lf * 0.7); g = mix(g, 0.85, lf * 0.7); b = mix(b, 0.65, lf * 0.7)
        else:
            # back stripes
            if w < 0.08 and v > 0.12:
                st = smoothstep(0.55, 0.95, math.sin(v * 34.0 + 0.6 * math.sin(u * 10.0)))
                r = mix(r, 0.86, st); g = mix(g, 0.38, st); b = mix(b, 0.10, st)
            # cream tummy
            lf = smoothstep(0.05, 0.18, w) * smoothstep(0.55, 0.2, v)
            r = mix(r, 1.0, lf * 0.6); g = mix(g, 0.85, lf * 0.6); b = mix(b, 0.65, lf * 0.6)
    elif mat == M_WHITE:
        r, g, b = 1.0, 0.96, 0.90
        fur = 1.0
    if fur > 0.5:
        sn = 0.96 + 0.04 * fur_noise(px * 2.3, py * 2.3, pz * 2.3)
        r *= sn; g *= sn; b *= sn
    elif mat == M_NOSE:
        r, g, b = 1.0, 0.45, 0.58
        spec = 0.6
    elif mat == M_MOUTH:
        r, g, b = 0.45, 0.08, 0.15
    elif mat == M_EAR_IN:
        r, g, b = 1.0, 0.62, 0.68
    elif mat == M_EYE or mat == M_DEYE:
        # glossy cartoon eye: big iris, pupil, two highlights
        l = length3(u, v, w) + 1e-9
        ux = u / l; uy = v / l; uz = w / l
        if mat == M_EYE:
            lx = P[K_LOOKX]; ly = P[K_LOOKY]
        else:
            lx = P[D_LOOKX]; ly = P[D_LOOKY]
        ll = length3(lx, ly, 1.0)
        ca = (ux * lx + uy * ly + uz) / ll
        if mat == M_EYE:
            ir, ig, ib = 0.30, 0.62, 0.32   # green kitten eyes
            ir2, ig2, ib2 = 0.85, 0.85, 0.30
        else:
            ir, ig, ib = 0.55, 0.30, 0.85   # violet dragon eyes
            ir2, ig2, ib2 = 0.95, 0.55, 0.95
        if ca > 0.30:
            k = smoothstep(0.30, 0.95, ca)
            r = mix(ir * 0.4, mix(ir, ir2, 0.6), k)
            g = mix(ig * 0.4, mix(ig, ig2, 0.6), k)
            b = mix(ib * 0.4, mix(ib, ib2, 0.6), k)
            # darker top of iris
            dk = smoothstep(-0.1, 0.5, uy)
            r *= 1.0 - 0.45 * dk; g *= 1.0 - 0.45 * dk; b *= 1.0 - 0.45 * dk
            if ca > 0.78:
                r, g, b = 0.03, 0.02, 0.05
        else:
            r, g, b = 0.97, 0.97, 1.0
        # catch lights (emissive)
        h1 = (ux * -0.38 + uy * 0.45 + uz * 0.81)
        h2 = (ux * 0.30 + uy * -0.32 + uz * 0.90)
        if h1 > 0.975:
            er = er + 1.3; eg = eg + 1.3; eb = eb + 1.3
        if h2 > 0.993:
            er = er + 1.0; eg = eg + 1.0; eb = eb + 1.0
        spec = 1.0
    elif mat == M_EGG or mat == M_EGG_IN:
        hue = P[E_HUE] + v * 1.6 + 0.08 * math.sin(math.atan2(u, w) * 3.0)
        cr, cg, cb = hsv(hue, 0.55, 1.0)
        # pastel polka dots
        dots = math.sin(u * 55.0) * math.sin(v * 55.0 + 1.0) * math.sin(w * 55.0 + 2.0)
        dt_ = smoothstep(0.55, 0.75, dots)
        cr = mix(cr, 1.0, dt_); cg = mix(cg, 1.0, dt_); cb = mix(cb, 1.0, dt_)
        r, g, b = cr, cg, cb
        glow = P[E_GLOW]
        er = cr * 0.28 * glow; eg = cg * 0.28 * glow; eb = cb * 0.28 * glow
        spec = 0.8
        if mat == M_EGG_IN:
            r, g, b = 1.0, 0.95, 0.75
            er = 1.2 * glow; eg = 1.05 * glow; eb = 0.75 * glow
        elif P[E_SPLIT] < 0.5 and P[E_CRACK] > 0.0:
            cy, th = crack_line(u, w)
            prog = P[E_CRACK] * math.pi * 1.05
            if abs(th) < prog:
                cw = abs(v - cy)
                k = smoothstep(0.012, 0.0, cw)
                kh = smoothstep(0.05, 0.0, cw) * 0.5
                er += (k * 4.0 + kh) * 1.0
                eg += (k * 3.6 + kh) * 0.95
                eb += (k * 2.5 + kh) * 0.7
    elif mat == M_DRAGON:
        r, g, b = 0.45, 0.85, 0.80   # mint-teal baby dragon
        # cheek blush
        for sgn in (-1.0, 1.0):
            dd = length3(u - sgn * 0.11, v + 0.05, (w - 0.10) * 0.7)
            bl = smoothstep(0.05, 0.0, dd)
            r = mix(r, 1.0, bl * 0.6); g = mix(g, 0.55, bl * 0.6); b = mix(b, 0.65, bl * 0.6)
        spec = 0.35
    elif mat == M_BELLY:
        r, g, b = 1.0, 0.92, 0.70
        st = smoothstep(0.6, 0.9, math.sin(v * 70.0))
        r *= 1.0 - 0.08 * st; g *= 1.0 - 0.08 * st; b *= 1.0 - 0.08 * st
    elif mat == M_WING:
        hue = u * 3.2 + v * 1.0 + 0.7
        r, g, b = hsv(hue, 0.65, 1.0)
        er = r * 0.25; eg = g * 0.25; eb = b * 0.25
        spec = 0.6
    elif mat == M_HORN:
        r, g, b = hsv(0.12 + u, 0.35, 1.0)
        spec = 0.5
    elif mat == M_MUSH_CAP:
        r, g, b = 0.95, 0.22, 0.30
        dots = math.sin(u * 40.0) * math.sin(w * 40.0) * math.sin(v * 40.0 + 1.0)
        if dots > 0.45:
            r, g, b = 1.0, 0.98, 0.95
        spec = 0.4
    elif mat == M_MUSH_STEM:
        r, g, b = 1.0, 0.95, 0.85
    elif mat == M_TREE:
        r, g, b = hsv(u, 0.40, 1.0)
        n = 0.5 + 0.5 * math.sin(px * 9.0) * math.sin(py * 9.0) * math.sin(pz * 9.0)
        r *= 0.85 + 0.15 * n; g *= 0.85 + 0.15 * n; b *= 0.85 + 0.15 * n
    elif mat == M_TRUNK:
        r, g, b = 0.65, 0.45, 0.32
    return r, g, b, er, eg, eb, spec, fur


@njit(fastmath=True, parallel=True)
def render(P, cam, W, H, out):
    rox, roy, roz = cam[0], cam[1], cam[2]
    fx, fy, fz = cam[3], cam[4], cam[5]
    rx_, ry_, rz_ = cam[6], cam[7], cam[8]
    ux_, uy_, uz_ = cam[9], cam[10], cam[11]
    focal = cam[12]
    aspect = W / H
    t_now = P[TIME]
    # key light (sun) from upper left front
    sunx, suny, sunz = -0.45, 0.75, 0.48
    sl = length3(sunx, suny, sunz)
    sunx /= sl; suny /= sl; sunz /= sl
    sun_int = P[SUN_INT]
    gx, gy, gz = P[G_X], P[G_Y], P[G_Z]
    gcr, gcg, gcb = P[G_R], P[G_G], P[G_B]
    gint = P[G_INT]

    for j in prange(H):
        for i in range(W):
            su = (2.0 * (i + 0.5) / W - 1.0) * aspect
            sv = 1.0 - 2.0 * (j + 0.5) / H
            dx = fx * focal + rx_ * su + ux_ * sv
            dy = fy * focal + ry_ * su + uy_ * sv
            dz = fz * focal + rz_ * su + uz_ * sv
            dl = length3(dx, dy, dz)
            dx /= dl; dy /= dl; dz /= dl

            t = 0.05
            hit = False
            mat = 0
            uu = 0.0; vv = 0.0; ww = 0.0
            for step in range(160):
                px = rox + dx * t; py = roy + dy * t; pz = roz + dz * t
                d, m, a, b, c = scene(px, py, pz, P)
                if d < 0.0006 * t + 0.0002:
                    hit = True
                    mat = m; uu = a; vv = b; ww = c
                    break
                t += d * 0.9
                if t > 30.0:
                    break

            if hit:
                for k in range(3):
                    d, m, a, b, c = scene(rox + dx * t, roy + dy * t, roz + dz * t, P)
                    t += d
                    mat = m; uu = a; vv = b; ww = c
            if not hit or mat == 0:
                cr, cg, cb = sky(dx, dy, dz, sunx, suny, sunz)
            else:
                px = rox + dx * t; py = roy + dy * t; pz = roz + dz * t
                nx, ny, nz = calc_normal(px, py, pz, P)
                ar, ag, ab, er, eg, eb, spec, fur = material(mat, px, py, pz, uu, vv, ww, nx, ny, nz, P, t_now)
                ndl = nx * sunx + ny * suny + nz * sunz
                wrap = 0.45 if fur > 0.5 else 0.25
                dif = clamp((ndl + wrap) / (1.0 + wrap), 0.0, 1.0)
                sh = 1.0
                if dif > 0.0:
                    jit = hash2(i * 1.618 + 0.5, j * 2.414 + 0.25)
                    sh = soft_shadow(px + nx * 0.008, py + ny * 0.008, pz + nz * 0.008, sunx, suny, sunz, P, jit)
                    # near the terminator wrap lighting already shapes the falloff
                    sh = mix(1.0, sh, smoothstep(-0.05, 0.35, ndl))
                    sh = mix(0.35, 1.0, sh)
                ao = calc_ao(px, py, pz, nx, ny, nz, P)
                if mat == M_GRASS or mat == M_GROUND:
                    ao = mix(0.55, 1.0, ao)
                skyl = clamp(0.55 + 0.45 * ny, 0.0, 1.0)
                # light accumulation
                lr = sun_int * dif * sh * 1.25 + skyl * 0.55 * ao * 0.75
                lg = sun_int * dif * sh * 1.15 + skyl * 0.62 * ao * 0.75
                lb = sun_int * dif * sh * 0.95 + skyl * 0.80 * ao * 0.75
                # bounce from grass
                bnc = clamp(-ny, 0.0, 1.0) * 0.18 * ao
                lr += bnc * 0.5; lg += bnc * 0.9; lb += bnc * 0.4
                # magic point light (egg glow / bubble pop)
                if gint > 0.0:
                    lvx = gx - px; lvy = gy - py; lvz = gz - pz
                    ld = length3(lvx, lvy, lvz) + 1e-6
                    gdl = clamp((nx * lvx + ny * lvy + nz * lvz) / ld * 0.75 + 0.25, 0.0, 1.0)
                    att = gint / (1.0 + 6.0 * ld * ld)
                    lr += gcr * gdl * att; lg += gcg * gdl * att; lb += gcb * gdl * att
                cr = ar * lr; cg = ag * lg; cb = ab * lb
                # specular (blinn)
                hx = sunx - dx; hy = suny - dy; hz = sunz - dz
                hl = length3(hx, hy, hz) + 1e-9
                ndh = max((nx * hx + ny * hy + nz * hz) / hl, 0.0)
                spv = spec * (ndh ** 48) * sh * sun_int * 1.5
                cr += spv; cg += spv; cb += spv * 0.95
                # rim / fur sheen
                fres = clamp(1.0 + (nx * dx + ny * dy + nz * dz), 0.0, 1.0)
                rim = fres ** 3 * (0.55 if fur > 0.5 else 0.25) * ao
                cr += rim * 1.0; cg += rim * 0.85; cb += rim * 0.75
                if fur > 0.5:
                    cr += fres ** 1.5 * 0.08 * ar; cg += fres ** 1.5 * 0.08 * ag; cb += fres ** 1.5 * 0.08 * ab
                cr += er; cg += eg; cb += eb
                # aerial perspective
                fog = 1.0 - math.exp(-0.0035 * t * t)
                sr, sg, sb = sky(dx, max(dy, 0.0) * 0.3, dz, sunx, suny, sunz)
                cr = mix(cr, sr, fog); cg = mix(cg, sg, fog); cb = mix(cb, sb, fog)

            out[j, i, 0] = cr
            out[j, i, 1] = cg
            out[j, i, 2] = cb
