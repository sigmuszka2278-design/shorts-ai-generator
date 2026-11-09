"""Storyboard for "Gift Box Surprise" (15 s).

0-3 s    red box shakes, lid pops, a tiny fluffy kitten jumps out.
3-7 s    blue box glows, a baby dragon pops out and blows bubbles.
7-11 s   golden box shakes dramatically, sparkles everywhere, suspense
         (lid peeks open... slams shut... silence).
11-15 s  BOOM - a giant yellow rubber duck springs out and bounces happily on
         the box; kitten & dragon jump in surprise. Final SQUEAK!
"""
import math
import os
import sys

import numpy as np

from params import *  # noqa: F401,F403

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "kitten_rainbow_egg"))
from camera import look_at  # noqa: E402  (shared helper)

DURATION = 15.0
TAU = 2 * math.pi

# layout
BOX_POS = [np.array([-0.70, 0.0, 0.30]), np.array([0.70, 0.0, 0.30]), np.array([0.0, 0.0, -0.55])]
BOX_H = [0.34, 0.34, 0.46]
K_LAND = np.array([-0.36, 0.0, 1.08])
D_LAND = np.array([0.36, 0.0, 1.08])
KS = 0.55   # tiny kitten
DS = 0.75   # mini dragon
US = 1.25   # giant duck


# ---------------------------------------------------------------- helpers
def clamp(x, a=0.0, b=1.0):
    return a if x < a else (b if x > b else x)


def seg(t, a, b):
    return clamp((t - a) / (b - a))


def ss(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out_back(x, k=1.70158):
    x = clamp(x) - 1.0
    return 1 + (k + 1) * x ** 3 + k * x ** 2


def ease_out_elastic(x):
    x = clamp(x)
    if x in (0.0, 1.0):
        return x
    return 2 ** (-10 * x) * math.sin((x * 10 - 0.75) * (TAU / 3)) + 1


def bump(t, a, b):
    x = seg(t, a, b)
    return math.sin(math.pi * x) if 0 < x < 1 else 0.0


def lerp(a, b, x):
    return a + (b - a) * x


def lerpv(a, b, x):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * x


def hop(t, t0, dur, h):
    x = (t - t0) / dur
    return 4 * h * x * (1 - x) if 0 < x < 1 else 0.0


def spring(t, t0, amt=0.25, freq=30, damp=9):
    x = t - t0
    if x < 0:
        return 1.0
    return 1.0 - amt * math.exp(-x * damp) * math.cos(x * freq)


def blink(t, times, dur=0.14):
    v = 1.0
    for tb in times:
        x = (t - tb) / dur
        if 0 <= x <= 1:
            v = min(v, abs(1 - 2 * x) * 0.94 + 0.06)
    return v


def rot_y(v, a):
    c, s = math.cos(a), math.sin(a)
    return np.array([c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]])


def rainbow(h):
    h = h % 1.0
    i = h * 6
    return np.array([clamp(abs(i - 3) - 1), clamp(2 - abs(i - 2)), clamp(2 - abs(i - 4))])


def kitten_head(P):
    return np.array([P[K_X], P[K_Y], P[K_Z]]) + rot_y(np.array([0, 0.70, 0.09]) * P[K_SCALE], P[K_YAW])


def dragon_head(P):
    return np.array([P[D_X], P[D_Y], P[D_Z]]) + rot_y(np.array([0, 0.48, 0.06]) * P[D_SCALE], P[D_YAW])


def dragon_mouth(P):
    return np.array([P[D_X], P[D_Y], P[D_Z]]) + rot_y(np.array([0, 0.42, 0.24]) * P[D_SCALE], P[D_YAW])


def duck_head(P):
    return np.array([P[U_X], P[U_Y], P[U_Z]]) + rot_y(np.array([0, 1.25, 0.3]) * P[U_SCALE], P[U_YAW])


def gaze(target, head, yaw, lim=(0.45, 0.4, 0.5)):
    d = np.asarray(target, float) - head
    c, s = math.cos(yaw), math.sin(yaw)
    lx = c * d[0] - s * d[2]
    lz = max(s * d[0] + c * d[2], 0.15)
    return clamp(lx / lz, -lim[0], lim[0]), clamp(d[1] / lz, -lim[1], lim[2])


def box_top(i, P=None):
    return BOX_POS[i] + np.array([0, 2 * BOX_H[i], 0])


# ---------------------------------------------------------------- boxes
def set_box(P, i, **kw):
    o = B0 + i * B_STRIDE
    P[o + BX_X], P[o + BX_Z] = BOX_POS[i][0], BOX_POS[i][2]
    P[o + BX_H] = BOX_H[i]
    P[o + BX_SQ] = 1.0
    for k, v in kw.items():
        P[o + globals()["BX_" + k]] = v


def shake(t, a, b, amp, freq=34):
    if not (a <= t < b):
        return 0.0, 0.0
    e = math.sin(math.pi * seg(t, a, b)) ** 0.5
    return amp * e * math.sin(t * freq), 0.4 * amp * e * math.sin(t * freq * 0.83 + 1)


def lid_fly(t, t0, dirx, dirz, up=1.6, spin=5.0):
    x = t - t0
    if x <= 0:
        return 0.0, 0.0, 0.0, 0.0
    if x > 1.3:
        return -9.0, 0.0, 0.0, 0.0  # gone
    return up * x - 2.0 * x * x + 0.02, dirx * x, dirz * x, spin * x


def boxes(P, t):
    # ---- red box
    tz, tx = shake(t, 0.0, 0.85, 0.16, 38)
    hopy = hop(t, 0.10, 0.22, 0.06) + hop(t, 0.42, 0.22, 0.08) + hop(t, 0.68, 0.2, 0.05)
    sq = spring(t, 0.32, 0.12) * spring(t, 0.64, 0.12) * spring(t, 0.88, 0.25)
    ly, lx, lz, lr = lid_fly(t, 0.85, -1.3, -1.2, 2.6, -6.0)
    if t < 0.85:
        ly = 0.03 * max(0.0, math.sin(t * 38))  # lid rattling
    set_box(P, 0, TZ=tz, TX=tx, HOP=hopy, SQ=sq, LIDY=ly, LIDX=lx, LIDZ=lz, LIDROT=lr,
            OPEN=1.0 if t >= 0.85 else 0.0, GLOW=0.6 * math.exp(-max(0, t - 0.85) * 4) * (t > 0.85))
    # ---- blue box: glows, then pops
    glow = 0.0
    if 2.8 <= t < 4.2:
        glow = ss(seg(t, 2.8, 3.6)) * (0.75 + 0.25 * math.sin(t * 14))
    elif t >= 4.2:
        glow = 0.9 * math.exp(-(t - 4.2) * 2.5) + 0.15
    tz, tx = shake(t, 3.4, 4.2, 0.07, 30)
    sq = 1.0 + 0.04 * math.sin(t * 9) * (2.8 < t < 4.2)
    sq *= spring(t, 4.2, 0.2)
    ly, lx, lz, lr = lid_fly(t, 4.2, 1.3, -1.2, 2.6, 6.0)
    if 3.6 < t < 4.2:
        ly = 0.04 * max(0.0, math.sin(t * 30))
    set_box(P, 1, TZ=tz, TX=tx, SQ=sq, GLOW=glow, LIDY=ly, LIDX=lx, LIDZ=lz, LIDROT=lr,
            OPEN=1.0 if t >= 4.2 else 0.0)
    # ---- golden box: dramatic shaking with suspense beats
    g = 2
    tz = tx = 0.0
    hopy = 0.0
    sq = 1.0
    ly = lx = lz = lr = 0.0
    glow = 0.15 + 0.1 * math.sin(t * 3)
    if 7.0 <= t < 11.0:
        inten = seg(t, 7.0, 10.6)
        for a, b, amp in [(7.1, 7.6, 0.08), (7.9, 8.5, 0.12), (9.25, 9.9, 0.16), (10.0, 10.55, 0.22)]:
            z_, x_ = shake(t, a, b, amp, 30 + 15 * inten)
            tz += z_
            tx += x_
        for t0, h in [(8.0, 0.08), (8.25, 0.10), (9.3, 0.14), (9.6, 0.16), (10.05, 0.2), (10.3, 0.22)]:
            hopy += hop(t, t0, 0.2, h)
            sq *= spring(t, t0 + 0.2, 0.18)
        # lid peeks open... and slams shut
        ly = 0.22 * bump(t, 8.7, 9.15) ** 0.5
        if 8.7 <= t < 9.15:
            lr = -0.25 * bump(t, 8.7, 9.15)
        glow = 0.2 + 0.7 * inten + 1.0 * bump(t, 8.7, 9.15)
        if 10.55 <= t < 11.0:
            # the quiet beat: swelling slowly
            sq = 1.0 + 0.12 * ss(seg(t, 10.6, 10.98))
            glow = 0.9 + 0.6 * seg(t, 10.6, 11.0)
    if t >= 11.0:
        ly, lx, lz, lr = lid_fly(t, 11.0, 1.2, -1.0, 3.0, 7.0)
        glow = 0.4 + 2.0 * math.exp(-(t - 11.0) * 3)
        # the duck landing on the box squashes it
        sq = duck_box_squash(t)
    set_box(P, g, TZ=tz, TX=tx, HOP=hopy, SQ=sq, GLOW=glow, LIDY=ly, LIDX=lx, LIDZ=lz, LIDROT=lr,
            OPEN=1.0 if t >= 11.0 else 0.0)


# ---------------------------------------------------------------- duck
DUCK_BOUNCES = [(11.75, 0.45, 0.35), (12.25, 0.45, 0.30), (12.75, 0.45, 0.32), (13.25, 0.45, 0.28), (13.75, 0.6, 0.55)]


def duck_box_squash(t):
    sq = 1.0
    for t0, dur, h in DUCK_BOUNCES:
        sq *= 1 - 0.25 * bump(t, t0 - 0.12, t0 + 0.05)
    sq *= 1 - 0.35 * bump(t, 14.35 - 0.12, 14.35 + 0.12)
    return sq


def duck(P, t):
    if t < 11.0:
        P[U_VIS] = 0.0
        return
    P[U_VIS] = 1.0
    base = box_top(2) + np.array([0, -0.35, 0])  # sits down inside the open box
    P[U_X], P[U_Z] = base[0], base[2] + 0.05
    P[U_YAW] = 0.0
    P[U_EYE] = 1.0
    P[U_SQ] = 1.0
    x = t - 11.0
    # spring out of the box
    rise = ease_out_back(seg(t, 11.0, 11.4), 2.2)
    P[U_SCALE] = US * lerp(0.35, 1.0, ease_out_back(seg(t, 11.0, 11.35), 2.0))
    y = base[1] + lerp(-0.6, 0.0, rise)
    P[U_SQ] = 1 + 0.25 * math.exp(-x * 6) * math.sin(x * 28)
    # happy bounces on top of the box (squash on each landing)
    yb = 0.0
    sq = 1.0
    for t0, dur, h in DUCK_BOUNCES:
        yb += hop(t, t0, dur, h)
        sq *= spring(t, t0 + dur, 0.22, 26, 8)
        if t0 - 0.12 < t < t0:
            sq *= 1 - 0.18 * bump(t, t0 - 0.12, t0)
    # last big bounce lands at 14.35 with the big squeak
    sq *= spring(t, 14.35, 0.32, 24, 6)
    if t > 11.4:
        P[U_SQ] *= sq
    P[U_Y] = y + yb * duck_box_squash(t) ** 0
    P[U_TILT] = 0.16 * math.sin((t - 11.4) * TAU * 1.0) * (t > 11.4) * (1 - seg(t, 14.2, 14.5) * 0.7)
    P[U_YAW] = 0.25 * math.sin((t - 11.4) * 2.0) * (t > 11.4)
    P[U_EYE] = blink(t, [12.1, 13.5])
    # happy squint + open beak on the final squeak
    if t > 14.3:
        P[U_EYE] = lerp(1.0, 0.25, ss(seg(t, 14.32, 14.45)))
        P[U_MOUTH] = ss(seg(t, 14.3, 14.4))
    P[U_MOUTH] = max(P[U_MOUTH], 0.8 * bump(t, 11.05, 11.6))
    P[U_LOOKX] = 0.0
    P[U_LOOKY] = -0.25


# ---------------------------------------------------------------- kitten
def kitten(P, t):
    P[K_SCALE] = KS
    P[K_SQ] = 1.0 + 0.012 * math.sin(t * 5.5)
    P[K_EYE] = 1.0
    P[K_EARS] = 1.0
    P[K_TAIL] = math.sin(t * 4.0)
    if t < 0.88:
        P[K_VIS] = 0.0
        return
    P[K_VIS] = 1.0
    top = box_top(0)
    inside = BOX_POS[0] + np.array([0, 0.05, 0])
    if t < 1.45:
        # pops up inside the box
        x = ease_out_back(seg(t, 0.92, 1.25), 2.5)
        pos = lerpv(inside + np.array([0, -0.2, 0]), inside + np.array([0, 0.30, 0]), x)
        P[K_X], P[K_Y], P[K_Z] = pos
        P[K_YAW] = 0.25
        P[K_EYE] = 0.1 if t < 1.1 else 1.15
        P[K_EARS] = lerp(0.0, 1.15, ss(seg(t, 1.05, 1.2)))
        P[K_PUFF] = 0.25 * math.exp(-(t - 1.0) * 4)
        P[K_HTILT] = 0.25 * ss(seg(t, 1.2, 1.4))
        P[K_MOUTH] = 0.35 * bump(t, 1.05, 1.45)
    elif t < 2.0:
        # jump out to the front
        x = seg(t, 1.45, 2.0)
        a = inside + np.array([0, 0.30, 0])
        pos = lerpv(a, K_LAND, ss(x) * 0.6 + x * 0.4) + np.array([0, hop(t, 1.45, 0.55, 0.42), 0])
        P[K_X], P[K_Y], P[K_Z] = pos
        P[K_YAW] = 0.25
        P[K_PITCH] = lerp(-0.2, 0.25, x)
        P[K_SQ] = 1 + 0.15 * math.sin(math.pi * x)
        P[K_LEGS] = math.sin(math.pi * x)
        P[K_EYE] = 1.15
        P[K_MOUTH] = 0.3
    else:
        P[K_X], P[K_Y], P[K_Z] = K_LAND
        P[K_YAW] = 0.35
        P[K_SQ] *= spring(t, 2.0, 0.28, 28, 8)
        P[K_EYE] = blink(t, [2.55, 5.0, 8.4, 12.6])
        P[K_HTILT] = 0.22 * bump(t, 2.15, 2.9)
        # look toward the blue box action
        if t > 2.9:
            P[K_YAW] = lerp(0.35, 0.6, ss(seg(t, 2.9, 3.4)))
            P[K_HTURN] = 0.25 * ss(seg(t, 2.9, 3.4))
        if 3.3 < t < 7.0:
            P[K_TAIL] = math.sin(t * 6)
            P[K_EYE] *= 1.08
            # bats at a bubble
            P[K_LEGS] = 0.6 * bump(t, 5.9, 6.35) + 0.6 * bump(t, 6.35, 6.8)
            P[K_HTILT] = -0.2 * bump(t, 5.6, 6.9)
            P[K_SMILE] = 1.0
        if 7.0 <= t < 11.0:
            # turn to the shaking golden box, nervous
            P[K_YAW] = lerp(0.6, -0.15, ss(seg(t, 7.0, 7.5)))
            P[K_HTURN] = lerp(0.25, -0.15, ss(seg(t, 7.0, 7.5)))
            env = gold_shake_env(t)
            P[K_EARS] = 1.0 - 0.8 * env
            P[K_PITCH] = -0.15 * env
            P[K_PUFF] = 0.25 * env
            P[K_EYE] = (1.1 + 0.1 * env) * blink(t, [8.4])
            P[K_TAIL] = math.sin(t * (3 + 10 * env))
            P[K_MOUTH] = 0.3 * env
            if 10.55 <= t:
                P[K_PITCH] = 0.12 * ss(seg(t, 10.55, 10.95))  # leans in curiously...
                P[K_EARS] = 1.1
        if t >= 11.0:
            P[K_YAW] = -0.15
            P[K_HTURN] = -0.15
            jump = hop(t, 11.12, 0.55, 0.45) + hop(t, 14.38, 0.5, 0.38)
            P[K_Y] = jump
            P[K_PUFF] = max(0.55 * math.exp(-max(0, t - 11.15) * 1.5) * (t > 11.15),
                            0.6 * ss(seg(t, 14.38, 14.55)))
            P[K_EYE] = 1.2 * (blink(t, [12.9]) if t < 14.3 else 1.0)
            P[K_MOUTH] = 0.7 * (1 - seg(t, 12.0, 12.6)) + 0.7 * seg(t, 14.38, 14.5)
            P[K_EARS] = 1.2
            P[K_LEGS] = 0.8 * bump(t, 11.12, 11.67) + 0.8 * bump(t, 14.38, 14.88)
            P[K_SQ] *= spring(t, 11.67, 0.3, 28, 8) * spring(t, 14.88, 0.3, 28, 8)
            P[K_HNOD] = -0.25 * ss(seg(t, 11.3, 11.8))  # look up at the giant duck
            P[K_TAIL] = math.sin(t * 12) if 12.0 < t < 14.3 else P[K_TAIL]
            if 12.2 < t < 14.3:
                # bob along with the bouncing duck
                P[K_HTILT] = 0.15 * math.sin((t - 11.4) * TAU)


def gold_shake_env(t):
    e = 0.0
    for a, b, amp in [(7.1, 7.6, 0.4), (7.9, 8.5, 0.6), (9.25, 9.9, 0.8), (10.0, 10.55, 1.0)]:
        e = max(e, amp * bump(t, a, b) ** 0.5)
    e = max(e, 0.8 * bump(t, 8.7, 9.15))
    return e


# ---------------------------------------------------------------- dragon
def dragon(P, t):
    P[D_SCALE] = DS
    P[D_SQ] = 1.0
    P[D_EYE] = 1.0
    if t < 4.2:
        P[D_VIS] = 0.0
        return
    P[D_VIS] = 1.0
    inside = BOX_POS[1] + np.array([0, 0.08, 0])
    P[D_YAW] = -0.3
    if t < 4.95:
        x = ease_out_back(seg(t, 4.2, 4.55), 2.6)
        P[D_X], P[D_Y], P[D_Z] = lerpv(inside + np.array([0, -0.25, 0]), inside + np.array([0, 0.30, 0]), x)
        P[D_SQ] = 1 + 0.2 * math.exp(-(t - 4.2) * 6) * math.sin((t - 4.2) * 35)
        P[D_WING] = lerp(-1.2, 0.3, ease_out_elastic(seg(t, 4.4, 4.95)))
        P[D_EYE] = 0.08 if t < 4.4 else 1.15
    elif t < 5.45:
        x = seg(t, 4.95, 5.45)
        a = inside + np.array([0, 0.30, 0])
        P[D_X], P[D_Y], P[D_Z] = lerpv(a, D_LAND, x) + np.array([0, hop(t, 4.95, 0.5, 0.40), 0])
        P[D_WING] = 0.3 + 0.5 * math.sin(t * 40)
        P[D_SQ] = 1 + 0.12 * math.sin(math.pi * x)
    else:
        P[D_X], P[D_Y], P[D_Z] = D_LAND
        P[D_SQ] = spring(t, 5.45, 0.25, 28, 8)
        P[D_WING] = 0.3 + 0.12 * math.sin(t * 10)
        P[D_YAW] = lerp(-0.3, -0.75, ss(seg(t, 5.45, 5.8)))
        if 5.6 <= t < 7.0:
            # blowing bubbles (puffs)
            P[D_MOUTH] = 0.45 + 0.15 * math.sin(t * 18)
            P[D_HNOD] = -0.15
            P[D_EYE] = 0.35
            P[D_SQ] *= 1 + 0.04 * math.sin(t * 18)
        if t >= 7.0:
            P[D_YAW] = lerp(-0.75, 0.15, ss(seg(t, 7.0, 7.5)))
            env = gold_shake_env(t) if t < 11 else 0
            P[D_EYE] = (1.1 + 0.1 * env) * blink(t, [9.6])
            P[D_WING] = 0.3 - 0.9 * env if t < 11 else P[D_WING]
            P[D_SQ] *= 1 - 0.08 * env
        if t >= 11.0:
            jump = hop(t, 11.15, 0.55, 0.42) + hop(t, 14.4, 0.5, 0.36)
            P[D_Y] = jump
            P[D_WING] = 0.3 + 0.7 * (bump(t, 11.15, 11.7) + bump(t, 14.4, 14.9)) * math.sin(t * 45) \
                + 0.9 * (bump(t, 11.15, 11.7) + bump(t, 14.4, 14.9))
            P[D_EYE] = 1.2
            P[D_MOUTH] = 0.8 * (1 - seg(t, 12.0, 12.6)) + 0.8 * seg(t, 14.4, 14.5)
            P[D_HNOD] = -0.3 * ss(seg(t, 11.3, 11.8))
            P[D_SQ] *= spring(t, 11.7, 0.3, 28, 8) * spring(t, 14.9, 0.3, 28, 8)


# ---------------------------------------------------------------- camera
def camera(t):
    roll = 0.0
    shake_amt = 0.0
    wide = (np.array([0.0, 1.25, 4.6]), np.array([0.0, 0.45, 0.0]), 44.0)
    if t < 3.0:
        # hook: punch-in on the shaking red box
        red_e = np.array([-0.40, 0.85, 3.0])
        red_t = np.array([-0.62, 0.45, 0.40])
        x = ss(seg(t, 0.0, 0.7))
        eye = lerpv(np.array([-0.2, 1.05, 3.9]), red_e, x)
        tgt = lerpv(np.array([-0.45, 0.50, 0.3]), red_t, x)
        fov = 44.0
        if t > 1.4:
            y = ss(seg(t, 1.4, 2.4))
            eye = lerpv(eye, np.array([-0.25, 0.70, 3.0]), y)
            tgt = lerpv(tgt, np.array([-0.40, 0.38, 0.80]), y)
        if t > 2.6:
            y = ss(seg(t, 2.6, 3.0))
            eye = lerpv(eye, np.array([0.40, 0.85, 3.0]), y)
            tgt = lerpv(tgt, np.array([0.60, 0.45, 0.40]), y)
        shake_amt = 0.006 * (t < 0.85) + 0.012 * math.exp(-max(0, t - 0.85) * 6) * (t > 0.85)
    elif t < 7.0:
        e1 = np.array([0.40, 0.85, 3.0])
        t1 = np.array([0.60, 0.45, 0.40])
        e2 = np.array([0.0, 0.80, 3.45])
        t2 = np.array([0.0, 0.40, 0.85])
        x = ss(seg(t, 5.0, 5.9))
        eye = lerpv(e1, e2, x)
        tgt = lerpv(t1, t2, x)
        fov = 44.0
        shake_amt = 0.012 * math.exp(-max(0, t - 4.2) * 6) * (t > 4.2)
    elif t < 11.0:
        # low dramatic angle, slow push on the golden box
        x = ss(seg(t, 7.0, 10.95))
        eye = lerpv(np.array([0.0, 0.70, 4.1]), np.array([0.0, 0.62, 3.5]), x)
        tgt = lerpv(np.array([0.0, 0.55, 0.0]), np.array([0.0, 0.58, -0.3]), x)
        fov = 44.0
        roll = 0.04 * math.sin(t * 0.8)
        shake_amt = 0.008 * gold_shake_env(t)
    else:
        # pull back to reveal the giant duck
        x = ss(seg(t, 11.0, 11.6))
        eye = lerpv(np.array([0.0, 0.62, 3.5]), np.array([0.0, 1.0, 5.1]), x)
        tgt = lerpv(np.array([0.0, 0.58, -0.3]), np.array([0.0, 1.05, -0.1]), x)
        fov = 44.0
        shake_amt = 0.03 * math.exp(-(t - 11.0) * 4) + 0.02 * math.exp(-max(0, t - 14.35) * 5) * (t > 14.35)
        # bouncy camera on each duck landing
        for t0, dur, h in DUCK_BOUNCES:
            shake_amt += 0.006 * math.exp(-max(0, t - t0 - dur) * 10) * (t > t0 + dur)
    if shake_amt > 0:
        k = t * 53.0
        off = np.array([math.sin(k * 1.3), math.sin(k * 1.7 + 1), math.sin(k * 1.1 + 2)]) * shake_amt
        eye = eye + off
        tgt = tgt + off * 0.5
    return look_at(eye, tgt, fov, roll)


# ---------------------------------------------------------------- lights
def lights(P, t):
    P[SUN_INT] = 1.0
    P[G_INT] = 0.0
    if 0.85 <= t < 2.0:
        P[G_X], P[G_Y], P[G_Z] = box_top(0) + np.array([0, 0.2, 0.3])
        P[G_R], P[G_G], P[G_B] = 1.0, 0.8, 0.6
        P[G_INT] = 1.2 * math.exp(-(t - 0.85) * 3)
    if 2.8 <= t < 7.0:
        P[G_X], P[G_Y], P[G_Z] = box_top(1) + np.array([0, 0.1, 0.35])
        P[G_R], P[G_G], P[G_B] = 0.5, 0.75, 1.0
        P[G_INT] = 1.4 * P[B0 + 1 * B_STRIDE + BX_GLOW]
    if t >= 7.0:
        P[G_X], P[G_Y], P[G_Z] = box_top(2) + np.array([0, 0.15, 0.4])
        P[G_R], P[G_G], P[G_B] = 1.0, 0.82, 0.4
        P[G_INT] = 0.9 * P[B0 + 2 * B_STRIDE + BX_GLOW]
        if 7.0 <= t < 11.0:
            P[SUN_INT] = lerp(1.0, 0.75, ss(seg(t, 7.0, 9.0)))
        else:
            P[SUN_INT] = lerp(0.75, 1.0, ss(seg(t, 11.0, 11.4)))


# ---------------------------------------------------------------- overlays
_rng = np.random.default_rng(11)
BURST_R = _rng.normal(size=(40, 3))
BURST_B = _rng.normal(size=(40, 3))
BURST_G = _rng.normal(size=(110, 3))
FOUNTAIN = _rng.uniform([0, 0.6, 0, 0, 0], [TAU, 1.6, 1, 1, 1], size=(90, 5))
CONFETTI = _rng.uniform([-1, 0.8, -1, 0, 0], [1, 2.2, 1, TAU, 1], size=(80, 5))
BUBBLES = _rng.uniform([0, -0.25, 0.012, 0, 1.4, 0], [1.4, 0.25, 0.034, 1, 2.6, TAU], size=(36, 6))
AMBIENT = _rng.uniform([-2.2, 0.1, -2.0, 0, 0], [2.2, 2.6, 1.2, TAU, 1], size=(30, 5))


def burst(ov, center, dirs, t, t0, speed=1.6, life=1.4, size=0.025, inten=1.2, grav=0.4):
    x = t - t0
    if x < 0 or x > life:
        return
    for i, v in enumerate(dirs):
        v = v / (np.linalg.norm(v) + 1e-6) * speed * (0.6 + 0.4 * ((i * 7) % 5) / 4)
        v[1] = abs(v[1]) + 0.3
        p = center + v * (1 - math.exp(-x * 3)) / 3 + np.array([0, -grav * x * x, 0])
        fade = 1 - seg(x, life * 0.45, life)
        ov["sparkles"].append((p, size * fade + 0.004, inten * fade, (i * 0.137) % 1))


def confetti(ov, center, t, t0, n=40, spread=1.0):
    x = t - t0
    if x < 0 or x > 2.2:
        return
    for i, (vx, vy, vz, ph, hue) in enumerate(CONFETTI[:n]):
        v = np.array([vx * spread, vy, vz * spread * 0.7])
        p = center + v * (1 - math.exp(-x * 2.2)) / 2.2 + np.array([0.05 * math.sin(x * 5 + ph), -0.45 * x * x, 0])
        if p[1] < 0.02:
            continue
        ov["petals"].append((p, 0.03, hue, ph + x * 7, 1 - seg(x, 1.6, 2.2)))


def overlays(t, P):
    ov = {"sparkles": [], "bubbles": [], "heart": None, "petals": [], "rays": None, "halo": None, "flash": 0.0}
    for (x, y, z, ph, hue) in AMBIENT:
        tw = 0.5 + 0.5 * math.sin(t * 3.5 + ph * 3)
        p = np.array([x + 0.05 * math.sin(t + ph), y + 0.05 * math.sin(t * 1.3 + ph), z])
        ov["sparkles"].append((p, 0.014 + 0.012 * tw, 0.35 * tw, hue))

    # red box pop
    burst(ov, box_top(0), BURST_R, t, 0.85, 1.4, 1.2, 0.022, 1.0)
    confetti(ov, box_top(0), t, 0.85, 30, 0.8)
    if 0.85 <= t < 1.2:
        ov["flash"] = 0.25 * (1 - seg(t, 0.85, 1.2))

    # blue box glow + pop + bubbles
    bglow = P[B0 + B_STRIDE + BX_GLOW]
    if 2.8 <= t < 5.0:
        ov["halo"] = (BOX_POS[1] + np.array([0, BOX_H[1], 0]), 0.55, np.array([0.55, 0.75, 1.0]), 0.18 * bglow)
    if 3.5 <= t < 4.4:
        ov["rays"] = (box_top(1), 0.6 * seg(t, 3.5, 4.1) * (1 - seg(t, 4.2, 4.4)), t)
    burst(ov, box_top(1), BURST_B, t, 4.2, 1.4, 1.2, 0.022, 1.0)
    if 4.2 <= t < 4.5:
        ov["flash"] = 0.3 * (1 - seg(t, 4.2, 4.5))
    if 5.6 <= t < 9.0:
        mouth = dragon_mouth(P) if P[D_VIS] else box_top(1)
        mouth = np.array([D_LAND[0] - 0.12, 0.32, D_LAND[2] + 0.12])
        for i, (t0, vy, rad, hue, life, ph) in enumerate(BUBBLES):
            x = t - 5.6 - t0
            if x < 0 or x > life:
                continue
            p = mouth + np.array([-0.55 * x - 0.05 * x * x, 0.18 * x + vy * x, 0.12 * x * math.sin(ph)]) \
                + np.array([0.03 * math.sin(x * 4 + ph), 0.02 * math.sin(x * 6 + ph), 0])
            grow = ss(x / 0.2)
            pop = seg(x, life - 0.06, life)
            ov["bubbles"].append((p, rad * 1.6 * grow * (1 + 0.4 * pop), 1 - pop, hue))
            if pop > 0:
                ov["sparkles"].append((p, 0.02, 0.8, hue))

    # golden box: sparkles fountaining from the seams
    if 7.0 <= t < 11.0:
        env = gold_shake_env(t)
        inten = seg(t, 7.0, 10.6)
        top = box_top(2)
        for i, (ang, sp, ph, hue, size) in enumerate(FOUNTAIN):
            if i > 25 + 65 * inten:
                break
            period = 0.9 + 0.5 * ph
            x = (t + ph * 3.0) % period
            r0 = BOX_H[2] + 0.04
            start = top + np.array([r0 * math.cos(ang), -0.05, r0 * math.sin(ang)])
            v = np.array([math.cos(ang) * 0.6, sp, math.sin(ang) * 0.6]) * (0.6 + 0.8 * env)
            p = start + v * x + np.array([0, -1.2 * x * x, 0])
            fade = 1 - x / period
            ov["sparkles"].append((p, 0.012 + 0.018 * size, (0.6 + 0.8 * env) * fade, (hue * 0.15 + 0.08) % 1))
        ov["halo"] = (BOX_POS[2] + np.array([0, BOX_H[2], 0]), 0.6, np.array([1.0, 0.85, 0.45]),
                      0.06 + 0.10 * inten + 0.12 * env)
        ov["rays"] = (top, 0.15 * inten + 0.7 * bump(t, 8.7, 9.15) + 0.4 * seg(t, 10.6, 11.0), t)
    # BOOM
    if 10.9 <= t < 11.5:
        ov["flash"] = 0.8 * ss(seg(t, 10.9, 11.0)) * (1 - ss(seg(t, 11.0, 11.5)))
    burst(ov, box_top(2), BURST_G, t, 11.0, 2.4, 1.8, 0.03, 1.4, 0.5)
    confetti(ov, box_top(2), t, 11.0, 80, 1.6)
    # final squeak sparkles
    if t >= 14.35:
        burst(ov, duck_head(P), BURST_R, t, 14.35, 1.8, 1.0, 0.03, 1.3, 0.2)
    if 11.0 <= t:
        ov["rays"] = (box_top(2) + np.array([0, 0.3, 0]), 1.2 * math.exp(-(t - 11.0) * 3), t)
    return ov


# ---------------------------------------------------------------- main
def frame(t):
    P = np.zeros(NPARAMS)
    P[TIME] = t
    boxes(P, t)
    duck(P, t)
    dragon(P, t)
    kitten(P, t)
    lights(P, t)
    cam = camera(t)
    ov = overlays(t, P)
    eye = cam[0:3]
    # gaze
    if P[K_VIS]:
        if t < 2.9:
            tgt = eye
        elif t < 7.0:
            tgt = np.mean([b[0] for b in ov["bubbles"]], axis=0) if ov["bubbles"] else dragon_head(P) if P[D_VIS] else box_top(1)
        elif t < 11.0:
            tgt = box_top(2)
        else:
            tgt = duck_head(P)
        P[K_LOOKX], P[K_LOOKY] = gaze(tgt, kitten_head(P), P[K_YAW] + P[K_HTURN])
    if P[D_VIS]:
        if t < 5.5:
            tgt = eye
        elif t < 7.0:
            tgt = kitten_head(P)
        elif t < 11.0:
            tgt = box_top(2)
        else:
            tgt = duck_head(P)
        P[D_LOOKX], P[D_LOOKY] = gaze(tgt, dragon_head(P), P[D_YAW], (0.9, 0.7, 0.9))
    return P, cam, ov
