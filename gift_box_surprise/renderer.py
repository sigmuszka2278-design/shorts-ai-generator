"""SDF ray-marching renderer for the "Gift Box Surprise" Short.

Reuses the kitten and baby-dragon rigs from ../kitten_rainbow_egg and adds
three gift boxes (with pop-off lids and bows), a giant rubber duck, a
candy-coloured round platform and a clean pastel studio backdrop.
"""
import math
import numpy as np
from numba import njit, prange

from params import *  # noqa: F401,F403

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



M_GRASS_UNUSED = 99
M_BOX = 30        # +box index
M_RIBBON = 33     # +box index
M_BOXIN = 36      # +box index
M_DUCK = 40
M_BEAK = 41
M_DUCKEYE = 42
M_PLAT = 43
M_FLOOR = 44

BOX_BODY = np.array([[0.96, 0.20, 0.27], [0.22, 0.52, 1.00], [1.00, 0.76, 0.18]])
BOX_RIB = np.array([[1.00, 0.86, 0.30], [1.00, 0.55, 0.82], [0.92, 0.12, 0.30]])
# --------------------------------------------------------------------------
# kitten
# --------------------------------------------------------------------------
@njit(fastmath=True)
def kitten_sdf(px, py, pz, P):
    ksc = P[K_SCALE]
    qx = (px - P[K_X]) / ksc
    qy = (py - P[K_Y]) / ksc
    qz = (pz - P[K_Z]) / ksc
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
    dscale = min(sq, ss) * ksc

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
# gift boxes
# --------------------------------------------------------------------------
@njit(fastmath=True, inline='always')
def sd_round_box(x, y, z, bx, by, bz, r):
    qx = abs(x) - bx + r
    qy = abs(y) - by + r
    qz = abs(z) - bz + r
    ox = max(qx, 0.0); oy = max(qy, 0.0); oz = max(qz, 0.0)
    return math.sqrt(ox * ox + oy * oy + oz * oz) + min(max(qx, max(qy, qz)), 0.0) - r


@njit(fastmath=True)
def box_sdf(px, py, pz, P, i):
    o = B0 + i * B_STRIDE
    h = P[o + BX_H]
    s = h / 0.4
    qx = px - P[o + BX_X]
    qy = py - P[o + BX_HOP]
    qz = pz - P[o + BX_Z]
    # tilt about the base
    c = math.cos(-P[o + BX_TZ]); sn = math.sin(-P[o + BX_TZ])
    qx, qy = c * qx - sn * qy, sn * qx + c * qy
    c = math.cos(-P[o + BX_TX]); sn = math.sin(-P[o + BX_TX])
    qy, qz = c * qy - sn * qz, sn * qy + c * qz
    sq = P[o + BX_SQ]
    ss = 1.0 / math.sqrt(sq)
    qy /= sq
    qx /= ss
    qz /= ss
    dscale = min(sq, ss)

    # body
    by = qy - h
    d = sd_round_box(qx, by, qz, h, h, h, 0.045 * s)
    inside = False
    if P[o + BX_OPEN] > 0.5:
        dc = sd_round_box(qx, by - h, qz, h - 0.045 * s, h * 1.9, h - 0.045 * s, 0.02)
        d = max(d, -dc)
        if abs(qx) < h - 0.04 * s and abs(qz) < h - 0.04 * s and by > -h + 0.03 * s:
            inside = True
    best = d
    mat = M_BOXIN + i if inside else M_BOX + i
    u = qx / s; v = by / s; w = qz / s

    # lid (+bow)
    lx = qx - P[o + BX_LIDX]
    ly = qy - 2.0 * h - P[o + BX_LIDY]
    lz = qz - P[o + BX_LIDZ]
    a = -P[o + BX_LIDROT]
    c = math.cos(a); sn = math.sin(a)
    ly, lz = c * ly - sn * lz, sn * ly + c * lz
    lx2, ly2 = c * lx - sn * ly, sn * lx + c * ly
    lx = 0.6 * lx + 0.4 * lx2
    dl = sd_round_box(lx, ly - 0.03 * s, lz, h + 0.035 * s, 0.065 * s, h + 0.035 * s, 0.03 * s)
    if dl < best:
        best = dl
        mat = M_BOX + i
        u = lx / s; v = 1.0 + ly / s; w = lz / s
    bx_ = abs(lx)
    dknot = sd_sphere(lx, ly - 0.13 * s, lz, 0.065 * s)
    # two bow loops leaning outwards
    lpx = bx_ - 0.13 * s
    lpy = ly - 0.17 * s
    cc = math.cos(0.55); sx = math.sin(0.55)
    rx_ = cc * lpx + sx * lpy
    ry_ = -sx * lpx + cc * lpy
    dloop = sd_ellipsoid(rx_, ry_, lz, 0.13 * s, 0.075 * s, 0.05 * s)
    dloop = max(dloop, -sd_ellipsoid(rx_, ry_, lz, 0.09 * s, 0.035 * s, 0.2 * s))
    dbow = smin(dknot, dloop, 0.02 * s)
    if dbow < best:
        best = dbow
        mat = M_RIBBON + i
        u = lx / s; v = ly / s; w = lz / s
    return best * dscale, mat, u, v, w


# --------------------------------------------------------------------------
# giant rubber duck
# --------------------------------------------------------------------------
@njit(fastmath=True)
def duck_sdf(px, py, pz, P):
    sc = P[U_SCALE]
    qx = (px - P[U_X]) / sc
    qy = (py - P[U_Y]) / sc
    qz = (pz - P[U_Z]) / sc
    c = math.cos(-P[U_YAW]); s = math.sin(-P[U_YAW])
    qx, qz = c * qx + s * qz, -s * qx + c * qz
    c = math.cos(-P[U_TILT]); s = math.sin(-P[U_TILT])
    qx, qy = c * qx - s * qy, s * qx + c * qy
    sq = P[U_SQ]
    ss = 1.0 / math.sqrt(sq)
    qy /= sq
    qx /= ss
    qz /= ss
    dscale = sc * min(sq, ss)

    d = sd_ellipsoid(qx, qy - 0.48, qz + 0.05, 0.58, 0.46, 0.70)
    d = smin(d, sd_ellipsoid(qx, qy - 0.80, qz + 0.62, 0.20, 0.24, 0.17), 0.18)
    dh = sd_sphere(qx, qy - 1.20, qz - 0.20, 0.40)
    d = smin(d, dh, 0.16)
    dw = sd_ellipsoid(abs(qx) - 0.55, qy - 0.58, qz + 0.02, 0.10, 0.22, 0.36)
    d = smin(d, dw, 0.05)
    best = d
    mat = M_DUCK
    u = qx; v = qy; w = qz

    # beak (lower half hinges open)
    db = sd_ellipsoid(qx, qy - 1.12, qz - 0.60, 0.24, 0.07, 0.22)
    hx = qx; hy = qy - 1.08; hz = qz - 0.42
    a = P[U_MOUTH] * 0.45
    c = math.cos(a); s = math.sin(a)
    hy, hz = c * hy - s * hz, s * hy + c * hz
    db = min(db, sd_ellipsoid(hx, hy + 0.02, hz - 0.14, 0.20, 0.055, 0.17))
    if db < best:
        mat = M_BEAK
    best = smin(best, db, 0.03)

    # eyes
    eo = clamp(P[U_EYE], 0.06, 1.2)
    ex = abs(qx) - 0.19
    ey = qy - 1.34
    ez = qz - 0.48
    de = sd_ellipsoid(ex, ey, ez, 0.12, 0.12 * eo, 0.12)
    if de < best:
        best = de
        mat = M_DUCKEYE
        u = qx - math.copysign(0.19, qx)
        v = ey / eo
        w = ez
    return best * dscale, mat, u, v, w


# --------------------------------------------------------------------------
# full scene
# --------------------------------------------------------------------------
PLAT_R = 1.9


@njit(fastmath=True)
def scene(px, py, pz, P):
    best = 1e9
    mat = 0
    u = 0.0; v = 0.0; w = 0.0

    # studio floor + round platform
    df = py + 0.30
    if df < best:
        best = df; mat = M_FLOOR; u = px; v = py; w = pz
    rr = math.sqrt(px * px + pz * pz)
    dpx = rr - PLAT_R
    dpy = abs(py + 0.15) - 0.15
    dp = min(max(dpx, dpy), 0.0) + math.sqrt(max(dpx, 0.0) ** 2 + max(dpy, 0.0) ** 2) - 0.0
    dp = dp - 0.03
    if dp < best:
        best = dp; mat = M_PLAT; u = rr; v = py; w = math.atan2(pz, px)

    if P[K_VIS] > 0.5:
        ks = P[K_SCALE]
        bk = length3(px - P[K_X], py - P[K_Y] - 0.45 * ks, pz - P[K_Z]) - (0.95 + 0.35 * P[K_PUFF]) * ks
        if bk < best:
            if bk > 0.05:
                best = bk; mat = 0
            else:
                d, m, a, b, c = kitten_sdf(px, py, pz, P)
                if d < best:
                    best = d; mat = m; u = a; v = b; w = c

    if P[D_VIS] > 0.5:
        bd = length3(px - P[D_X], py - P[D_Y] - 0.3 * P[D_SCALE], pz - P[D_Z]) - 0.65 * P[D_SCALE]
        if bd < best:
            if bd > 0.05:
                best = bd; mat = 0
            else:
                d, m, a, b, c = dragon_sdf(px, py, pz, P)
                if d < best:
                    best = d; mat = m; u = a; v = b; w = c

    for i in range(3):
        o = B0 + i * B_STRIDE
        h = P[o + BX_H]
        cx = P[o + BX_X]; cz = P[o + BX_Z]
        bb = length3(px - cx, py - P[o + BX_HOP] - h, pz - cz) - 1.9 * h
        if P[o + BX_LIDY] > 0.05:
            bb = min(bb, length3(px - cx - P[o + BX_LIDX], py - P[o + BX_HOP] - 2.0 * h - P[o + BX_LIDY],
                                 pz - cz - P[o + BX_LIDZ]) - 1.6 * h)
        if bb < best:
            if bb > 0.05:
                best = bb; mat = 0
            else:
                d, m, a, b, c = box_sdf(px, py, pz, P, i)
                if d < best:
                    best = d; mat = m; u = a; v = b; w = c

    if P[U_VIS] > 0.5:
        sc = P[U_SCALE]
        bu = length3(px - P[U_X], py - P[U_Y] - 0.85 * sc, pz - P[U_Z]) - 1.05 * sc * max(1.0, 1.0 / P[U_SQ])
        if bu < best:
            if bu > 0.05:
                best = bu; mat = 0
            else:
                d, m, a, b, c = duck_sdf(px, py, pz, P)
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
    # clean pastel studio backdrop with a soft spotlight behind the stage
    t = clamp(ry * 1.6 + 0.3, 0.0, 1.0)
    r = mix(0.98, 0.45, t)
    g = mix(0.62, 0.62, t)
    b = mix(0.85, 1.00, t)
    spot = max(-rz * 0.95 + ry * 0.3, 0.0)
    sg = spot ** 6 * 0.18
    r += sg; g += sg * 0.95; b += sg * 0.85
    # big soft bokeh dots
    for k in range(7):
        ax = math.sin(k * 2.17 + 0.4) * 0.75
        ay = 0.15 + 0.4 * abs(math.sin(k * 1.31 + 1.0))
        dd = length3(rx - ax, ry - ay, (rz + 0.85) * 0.5)
        bo = smoothstep(0.11, 0.07, dd) * 0.10
        hr, hg, hb = hsv(k * 0.15 + 0.05, 0.35, 1.0)
        r += bo * hr; g += bo * hg; b += bo * hb
    return r, g, b


@njit(fastmath=True)
def material(mat, px, py, pz, u, v, w, nx, ny, nz, P, t):
    """returns albedo rgb, emission rgb, spec strength, fur(0/1)"""
    er = 0.0; eg = 0.0; eb = 0.0
    spec = 0.1
    fur = 0.0
    r = 1.0; g = 1.0; b = 1.0
    if mat == M_GRASS_UNUSED:
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
    elif mat >= M_BOX and mat < M_BOX + 3:
        i = mat - M_BOX
        r, g, b = BOX_BODY[i, 0], BOX_BODY[i, 1], BOX_BODY[i, 2]
        spec = 0.5
        # pattern
        if i == 0:
            dots = math.sin(u * 30.0) * math.sin(v * 30.0 + 1.0) * math.sin(w * 30.0 + 2.0)
            k = smoothstep(0.45, 0.6, dots)
            r = mix(r, 1.0, k); g = mix(g, 0.92, k); b = mix(b, 0.9, k)
        elif i == 1:
            st = smoothstep(0.6, 0.75, math.sin((u + v + w) * 22.0))
            r = mix(r, 0.75, st); g = mix(g, 0.88, st); b = mix(b, 1.0, st)
        else:
            sh = 0.5 + 0.5 * math.sin(u * 40.0 + v * 25.0) * math.sin(w * 40.0 - v * 31.0)
            r *= 0.9 + 0.2 * sh; g *= 0.9 + 0.2 * sh; b *= 0.9 + 0.2 * sh
            spec = 1.4
        # ribbon cross
        if abs(u) < 0.065 or abs(w) < 0.065:
            r, g, b = BOX_RIB[i, 0], BOX_RIB[i, 1], BOX_RIB[i, 2]
            spec = 0.9
        gl = P[B0 + i * B_STRIDE + BX_GLOW]
        er = r * 0.22 * gl; eg = g * 0.22 * gl; eb = b * 0.22 * gl
    elif mat >= M_RIBBON and mat < M_RIBBON + 3:
        i = mat - M_RIBBON
        r, g, b = BOX_RIB[i, 0], BOX_RIB[i, 1], BOX_RIB[i, 2]
        spec = 0.9
    elif mat >= M_BOXIN and mat < M_BOXIN + 3:
        i = mat - M_BOXIN
        r, g, b = BOX_BODY[i, 0] * 0.55, BOX_BODY[i, 1] * 0.55, BOX_BODY[i, 2] * 0.55
        gl = P[B0 + i * B_STRIDE + BX_GLOW]
        er = 0.6 * gl; eg = 0.55 * gl; eb = 0.45 * gl
    elif mat == M_DUCK:
        r, g, b = 1.0, 0.86, 0.12
        spec = 1.3
        for sgn in (-1.0, 1.0):
            dd = length3(u - sgn * 0.27, v - 1.18, (w - 0.42) * 0.7)
            bl = smoothstep(0.09, 0.0, dd)
            r = mix(r, 1.0, bl * 0.6); g = mix(g, 0.55, bl * 0.6); b = mix(b, 0.45, bl * 0.6)
    elif mat == M_BEAK:
        r, g, b = 1.0, 0.48, 0.10
        spec = 1.0
    elif mat == M_DUCKEYE:
        l = length3(u, v, w) + 1e-9
        ux = u / l; uy = v / l; uz = w / l
        lx = P[U_LOOKX]; ly = P[U_LOOKY]
        ca = (ux * lx + uy * ly + uz) / length3(lx, ly, 1.0)
        r, g, b = 0.98, 0.98, 1.0
        if ca > 0.80:
            r, g, b = 0.03, 0.03, 0.06
        if ux * -0.38 + uy * 0.45 + uz * 0.81 > 0.982:
            er = 1.2; eg = 1.2; eb = 1.2
        spec = 1.0
    elif mat == M_PLAT:
        if v > -0.01:
            ring = math.floor(u * 4.0)
            hue = ring * 0.17 + 0.55
            r, g, b = hsv(hue, 0.62, 1.0)
            edge = smoothstep(0.43, 0.49, abs(u * 4.0 - ring - 0.5))
            r = mix(r, 1.0, edge); g = mix(g, 1.0, edge); b = mix(b, 1.0, edge)
        else:
            st = 0.5 + 0.5 * math.sin(w * 24.0 + v * 20.0)
            st = smoothstep(0.4, 0.6, st)
            r = mix(1.0, 0.98, st); g = mix(0.40, 0.95, st); b = mix(0.65, 1.0, st)
        spec = 0.35
    elif mat == M_FLOOR:
        r, g, b = 0.80, 0.55, 0.88
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
                if mat == M_FLOOR or mat == M_PLAT:
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
                fog = 1.0 - math.exp(-0.004 * t * t)
                sr, sg, sb = sky(dx, max(dy, 0.0) * 0.3, dz, sunx, suny, sunz)
                cr = mix(cr, sr, fog); cg = mix(cg, sg, fog); cb = mix(cb, sb, fog)

            out[j, i, 0] = cr
            out[j, i, 1] = cg
            out[j, i, 2] = cb
