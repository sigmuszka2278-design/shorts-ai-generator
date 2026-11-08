"""Story timeline: maps time t (seconds, 0..20) to renderer parameters,
camera and 2D overlay particles.

Scene 1 (0-3s)   hook: magic flash, puffed-up surprised kitten close-up,
                 whip pan to the glowing shaking egg.
Scene 2 (3-7s)   egg bounces & changes colour, kitten pounces, misses and
                 somersaults into the flowers (petal burst), dizzy head shake.
Scene 3 (7-13s)  suspense: egg wobbles in bursts, cracks spread, light rays,
                 slow dolly-in, flash.
Scene 4 (13-17s) shell pops, baby rainbow-winged dragon appears, inhales...
                 ACHOO - a cloud of colourful bubbles.
Scene 5 (17-20s) friends! dragon blows a giant heart bubble, both amazed,
                 heart drifts onto the kitten's nose and POPS -> kitten puffs
                 into a fluffball, matching the very first frame (seamless loop).
"""
import math
import numpy as np

from params import *  # noqa: F401,F403
from camera import look_at

DURATION = 20.0
TAU = 2.0 * math.pi

K0 = np.array([-0.40, 0.0, 0.0])
K_YAW0 = 0.45
E0 = np.array([0.38, 0.0, -0.05])
K3 = np.array([-0.24, 0.0, -0.02])     # kitten position, scenes 3-4
K3_YAW = 0.85
D5 = np.array([0.08, 0.0, 0.16])      # dragon position, scene 5


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
    if x == 0 or x == 1:
        return x
    return 2 ** (-10 * x) * math.sin((x * 10 - 0.75) * (TAU / 3)) + 1


def bump(t, a, b):
    """0 -> 1 -> 0 smooth bump between a and b"""
    x = seg(t, a, b)
    return math.sin(math.pi * x) if 0 < x < 1 else 0.0


def lerp(a, b, x):
    return a + (b - a) * x


def lerpv(a, b, x):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * x


def hop(t, t0, dur, h):
    x = (t - t0) / dur
    if x <= 0 or x >= 1:
        return 0.0
    return 4 * h * x * (1 - x)


def landing_squash(t, t_land, amt=0.25, dur=0.35):
    """squash-and-stretch spring after a landing"""
    x = t - t_land
    if x < 0 or x > dur:
        return 1.0
    return 1.0 - amt * math.exp(-x * 9) * math.cos(x * 30)


def blink(t, times, dur=0.14):
    v = 1.0
    for tb in times:
        x = (t - tb) / dur
        if 0 <= x <= 1:
            v = min(v, abs(1 - 2 * x) * 0.94 + 0.06)
    return v


def rot_y(v, a):
    """local -> world for a yaw angle a (matches renderer convention)"""
    c, s = math.cos(a), math.sin(a)
    return np.array([c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]])


def head_world(P):
    off = rot_y(np.array([0.0, 0.70, 0.09]), P[K_YAW])
    return np.array([P[K_X], P[K_Y], P[K_Z]]) + off


def kitten_look(P, target):
    h = head_world(P)
    d = np.asarray(target, float) - h
    a = P[K_YAW] + P[K_HTURN]
    c, s = math.cos(a), math.sin(a)
    lx = c * d[0] - s * d[2]
    lz = s * d[0] + c * d[2]
    ly = d[1]
    lz = max(lz, 0.15)
    P[K_LOOKX] = clamp(lx / lz, -0.45, 0.45)
    P[K_LOOKY] = clamp(ly / lz - 0.05, -0.4, 0.5)


def dragon_head_world(P):
    off = rot_y(np.array([0.0, 0.48, 0.06]) * P[D_SCALE], P[D_YAW])
    return np.array([P[D_X], P[D_Y], P[D_Z]]) + off


def dragon_mouth_world(P):
    off = rot_y(np.array([0.0, 0.42, 0.24]) * P[D_SCALE], P[D_YAW])
    return np.array([P[D_X], P[D_Y], P[D_Z]]) + off


def dragon_look(P, target):
    h = dragon_head_world(P)
    d = np.asarray(target, float) - h
    a = P[D_YAW]
    c, s = math.cos(a), math.sin(a)
    lx = c * d[0] - s * d[2]
    lz = max(s * d[0] + c * d[2], 0.15)
    P[D_LOOKX] = clamp(lx / lz, -0.9, 0.9)
    P[D_LOOKY] = clamp(d[1] / lz, -0.7, 0.9)


def rainbow(h):
    h = h % 1.0
    i = h * 6
    r = clamp(abs(i - 3) - 1)
    g = clamp(2 - abs(i - 2))
    b = clamp(2 - abs(i - 4))
    return np.array([r, g, b])


# ---------------------------------------------------------------- cameras
def cam_shot_a(t):
    """loop shot: kitten face close-up (identical at t=0 and t=20)"""
    P = np.zeros(NPARAMS)
    P[K_X], P[K_Y], P[K_Z] = K0
    P[K_YAW] = K_YAW0
    P[K_HTURN] = 0.25
    head = head_world(P)
    ang = K_YAW0 + 0.25 - 0.30
    dist = lerp(1.55, 1.30, ss(t / 1.25))
    eye = head + np.array([math.sin(ang) * dist, 0.06, math.cos(ang) * dist])
    target = head + np.array([0.02, -0.10, 0.0])
    return eye, target, 38.0


SHOT_A_END = cam_shot_a(0.0)


def camera(t):
    roll = 0.0
    shake = 0.0
    if t < 1.25:
        eye, tgt, fov = cam_shot_a(t)
        roll = -0.05 * (1 - ss(t / 1.25))
    elif t < 3.0:
        e_egg = E0 + np.array([0.10, 0.24, 1.10])
        t_egg = E0 + np.array([0.0, 0.25, 0.0])
        if t < 1.55:  # whip pan
            x = ss(seg(t, 1.25, 1.55))
            ea, ta, fa = cam_shot_a(1.25)
            eye = lerpv(ea, e_egg, x)
            tgt = lerpv(ta, t_egg, x)
            fov = lerp(fa, 42.0, x)
        else:
            x = ss(seg(t, 2.35, 3.0))
            eye = lerpv(e_egg + np.array([0, 0, -0.06 * seg(t, 1.55, 2.35)]),
                        np.array([-0.02, 0.64, 2.6]), x)
            tgt = lerpv(t_egg, np.array([0.0, 0.36, 0.0]), x)
            fov = lerp(42.0, 46.0, x)
        shake = 0.004 * bump(t, 1.55, 2.4)
    elif t < 7.0:
        x = ss(seg(t, 4.4, 5.6))
        eye = lerpv([-0.02, 0.64, 2.6], [0.50, 0.66, 2.55], x)
        tgt = lerpv([0.0, 0.36, 0.0], [0.52, 0.32, 0.15], x)
        fov = 46.0
        shake = 0.012 * math.exp(-max(0, t - 5.15) * 6) * (t > 5.15)
    elif t < 13.0:
        x = ss(seg(t, 7.0, 12.9))
        eye = lerpv([0.08, 0.44, 1.95], [0.33, 0.30, 1.12], x)
        tgt = lerpv([0.08, 0.36, 0.0], [0.33, 0.27, -0.05], x)
        fov = 45.0
        # little shakes with the egg's wobbles
        shake = 0.003 * egg_wobble_env(t) + 0.006 * seg(t, 12.3, 12.9)
    elif t < 17.0:
        x = ss(seg(t, 13.0, 14.0))
        eye = lerpv([0.30, 0.36, 1.25], [0.10, 0.48, 2.0], x)
        tgt = lerpv([0.33, 0.30, -0.05], [0.10, 0.38, 0.0], x)
        fov = 45.0
        shake = 0.02 * math.exp(-max(0, t - 13.0) * 5) * (t > 13.0) \
            + 0.012 * math.exp(-max(0, t - 15.5) * 6) * (t > 15.5)
    else:
        e2 = np.array([-0.16, 0.62, 2.10])
        t2 = np.array([-0.16, 0.50, 0.0])
        if t < 18.6:
            eye, tgt, fov = e2, t2, 45.0
        elif t < 19.25:  # tilt up a bit to watch the heart
            x = ss(seg(t, 18.6, 19.25))
            eye = e2 + np.array([0, -0.06, 0.05]) * x
            tgt = t2 + np.array([0, 0.18, 0]) * x
            fov = 45.0 + 2.0 * x
        else:
            x = ss(seg(t, 19.25, 20.0))
            ea, ta, fa = SHOT_A_END
            eye = lerpv(e2 + np.array([0, -0.06, 0.05]), ea, x)
            tgt = lerpv(t2 + np.array([0, 0.18, 0]), ta, x)
            fov = lerp(47.0, fa, x)
            roll = -0.05 * x
    if shake > 0:
        k = t * 53.0
        off = np.array([math.sin(k * 1.3), math.sin(k * 1.7 + 1), math.sin(k * 1.1 + 2)]) * shake
        eye = eye + off
        tgt = tgt + off * 0.5
    return look_at(eye, tgt, fov, roll)


# ---------------------------------------------------------------- egg
WOBBLES = [(7.55, 0.15), (8.75, 0.30), (9.85, 0.45), (10.85, 0.60), (11.55, 0.72), (12.05, 0.85)]


def egg_wobble_env(t):
    e = 0.0
    for tw, _ in WOBBLES:
        e = max(e, bump(t, tw, tw + 0.42))
    if 12.3 <= t < 13.0:
        e = max(e, 0.6 + 0.6 * seg(t, 12.3, 12.95))
    return e


def egg_params(P, t):
    P[E_VIS] = 1.0
    P[E_SQ] = 1.0
    P[E_X], P[E_Y], P[E_Z] = E0
    P[E_HUE] = t * 0.25
    P[E_GLOW] = 0.7 + 0.15 * math.sin(t * 5)
    tilt_x = 0.0
    tilt_z = 0.0
    if t < 3.0:
        # shaking in the grass
        env = 0.5 + 0.5 * max(0.0, math.sin(t * 4.2))
        tilt_z = 0.16 * env * math.sin(t * 38)
        tilt_x = 0.06 * env * math.sin(t * 31 + 1)
        P[E_SQ] = 1.0 + 0.04 * math.sin(t * 22)
    elif t < 7.0:
        P[E_HUE] = t * 0.25 + (t - 3.0) * 0.6  # colours cycle faster
        P[E_GLOW] = 0.95 + 0.2 * math.sin(t * 9)
        y = 0.0
        x_off = np.zeros(3)
        hops = [(3.05, 0.42, 0.28, [0.00, 0, 0.00], [-0.06, 0, 0.10]),
                (3.55, 0.42, 0.34, [-0.06, 0, 0.10], [0.06, 0, 0.04]),
                (4.05, 0.38, 0.22, [0.06, 0, 0.04], [0.0, 0, 0.0]),
                (4.55, 1.05, 0.95, [0.0, 0, 0.0], [0.0, 0, 0.0])]
        sq = 1.0
        for (t0, dur, h, a, b) in hops:
            if t0 <= t < t0 + dur:
                x = (t - t0) / dur
                y = hop(t, t0, dur, h)
                x_off = lerpv(a, b, x)
                tilt_z = 0.6 * math.sin(x * TAU) * (0.3 if h < 0.5 else 1.0)
                sq = 1.0 + 0.12 * math.sin(math.pi * x)  # stretch in air
            sq = sq * landing_squash(t, t0 + dur, 0.28)
            if t < t0:
                # anticipation squash before each hop
                sq = sq * (1 - 0.18 * bump(t, t0 - 0.12, t0 + 0.02))
        if t >= 5.6:
            x_off = np.zeros(3)
            # giggle wobble after landing
            tilt_z = 0.18 * math.sin(t * 30) * math.exp(-(t - 5.6) * 2.5)
        P[E_X], P[E_Y], P[E_Z] = E0 + x_off + np.array([0, y, 0])
        P[E_SQ] = sq
    elif t < 13.0:
        env = egg_wobble_env(t)
        tilt_z = 0.20 * env * math.sin(t * 36)
        tilt_x = 0.07 * env * math.sin(t * 29 + 1)
        P[E_SQ] = 1.0 + 0.05 * env * math.sin(t * 25)
        crack = 0.0
        for tw, c in WOBBLES:
            if t > tw + 0.1:
                crack = c
        if t > 12.3:
            crack = lerp(0.85, 1.0, seg(t, 12.3, 12.8))
        P[E_CRACK] = crack
        P[E_GLOW] = lerp(0.7, 1.6, seg(t, 7.0, 12.9)) + 0.3 * env
    else:
        P[E_SPLIT] = 1.0
        P[E_GLOW] = 0.5 + 1.8 * math.exp(-(t - 13.0) * 2.0)
        P[E_HUE] = t * 0.25
        # flying cap
        x = t - 13.0
        if x < 1.2:
            P[E_CX] = 0.55 * x
            P[E_CY] = 2.2 * x - 2.6 * x * x
            P[E_CZ] = 0.25 * x
            P[E_CROT] = -5.0 * x
        else:
            P[E_CY] = -3.0  # gone (below ground)
        if t >= 17.0:
            P[E_GLOW] = 0.35
    P[E_TX] = tilt_x
    P[E_TZ] = tilt_z


# ---------------------------------------------------------------- kitten
def kitten_defaults(P, t):
    P[K_X], P[K_Y], P[K_Z] = K0
    P[K_YAW] = K_YAW0
    P[K_SQ] = 1.0 + 0.012 * math.sin(t * 5.5)  # breathing
    P[K_EYE] = 1.0
    P[K_EARS] = 1.0
    P[K_TAIL] = math.sin(t * 3.0)


def kitten_params(P, t, eggpos):
    kitten_defaults(P, t)
    egg_c = np.array(eggpos) + np.array([0, 0.25, 0])
    if t < 1.25:
        # loop start: puffed fluffball deflating, wide eyes, "o" mouth
        P[K_HTURN] = 0.25
        x = t / 0.45
        P[K_PUFF] = 0.6 * (1 - ss(x))
        P[K_EYE] = lerp(1.15, 1.08, ss(t / 1.0)) * blink(t, [0.95])
        P[K_MOUTH] = lerp(0.6, 0.15, ss(t / 0.8))
        P[K_HTILT] = 0.22 * ss(seg(t, 0.45, 0.75))
        P[K_EARS] = 1.0 + 0.15 * bump(t, 0.3, 0.7)
        P[K_SQ] *= landing_squash(t, 0.0, 0.12, 0.5)
        kitten_look(P, egg_c)
    elif t < 3.0:
        P[K_HTURN] = lerp(0.25, 0.10, ss(seg(t, 1.3, 2.0)))
        P[K_HTILT] = lerp(0.22, -0.15, ss(seg(t, 2.0, 2.6)))
        P[K_EYE] = 1.08 * blink(t, [2.2])
        P[K_PITCH] = 0.10 * ss(seg(t, 2.3, 2.9))
        P[K_TAIL] = math.sin(t * 5.0)
        kitten_look(P, egg_c)
    elif t < 7.0:
        P[K_HTURN] = 0.05
        P[K_EYE] = 1.1 * blink(t, [3.4])
        P[K_TAIL] = math.sin(t * 7.0)
        # crouch & butt-wiggle
        cr = ss(seg(t, 3.7, 4.0)) * (1 - seg(t, 4.5, 4.55))
        P[K_PITCH] = 0.10 + 0.22 * cr
        P[K_SQ] *= 1 - 0.10 * cr
        P[K_X] += 0.015 * cr * math.sin(t * 40)
        P[K_EARS] = 1 - 0.4 * cr
        P[K_TAIL] = math.sin(t * (7.0 + 10 * cr))
        if t >= 4.5:
            # pounce arc
            L1 = np.array([0.60, 0.0, 0.25])
            L2 = np.array([0.84, 0.0, 0.36])
            if t < 5.15:
                x = seg(t, 4.5, 5.15)
                pos = lerpv(K0, L1, x) + np.array([0, hop(t, 4.5, 0.65, 0.30), 0])
                P[K_X], P[K_Y], P[K_Z] = pos
                P[K_YAW] = lerp(K_YAW0, 1.25, ss(x * 2))
                P[K_PITCH] = lerp(-0.35, 0.45, x)
                P[K_SQ] = 1.0 + 0.15 * math.sin(math.pi * x)
                P[K_LEGS] = ss(x * 3)
                P[K_EARS] = 0.3
                P[K_EYE] = 1.2
                P[K_MOUTH] = 0.6 * ss(seg(t, 4.75, 5.0))
                P[K_HNOD] = -0.25
            elif t < 6.0:
                # somersault into the flowers
                x = seg(t, 5.15, 6.0)
                P[K_X], P[K_Y], P[K_Z] = lerpv(L1, L2, ss(x))
                P[K_Y] = 0.30 * math.sin(math.pi * x)
                P[K_YAW] = 1.25
                P[K_ROLL] = TAU * ss(x)
                P[K_PITCH] = 0.45 * (1 - ss(x))
                P[K_LEGS] = 1 - ss(x)
                P[K_EYE] = 0.08
                P[K_MOUTH] = 0.8
                P[K_EARS] = 0.0
                P[K_SQ] = 1.0 - 0.15 * math.sin(math.pi * x)
            else:
                # dizzy then shakes it off
                P[K_X], P[K_Y], P[K_Z] = L2
                P[K_YAW] = lerp(1.25, 0.25, ss(seg(t, 6.0, 6.5)))
                P[K_SQ] = landing_squash(t, 6.0, 0.30, 0.5)
                dz = 1 - ss(seg(t, 6.35, 6.6))
                P[K_HTILT] = 0.3 * math.sin(t * 9) * dz
                P[K_HNOD] = 0.12 * math.sin(t * 7 + 1) * dz
                P[K_EYE] = lerp(0.45, 1.05, ss(seg(t, 6.6, 6.8)))
                P[K_EARS] = lerp(0.2, 1.0, ss(seg(t, 6.4, 6.9)))
                P[K_HTURN] = 0.35 * math.sin((t - 6.4) * 45) * bump(t, 6.4, 6.75)
                P[K_MOUTH] = 0.3 * dz
                P[K_TAIL] = math.sin(t * 4)
                if t > 6.75:
                    kitten_look(P, egg_c)
                    P[K_LOOKY] += 0.0
    elif t < 17.0:
        # cautious peek at the egg
        P[K_X], P[K_Y], P[K_Z] = K3
        P[K_YAW] = K3_YAW
        P[K_HTURN] = 0.0
        env = egg_wobble_env(t) if t < 13.0 else 0.0
        lean = 0.18 * ss(seg(t, 7.2, 8.0)) + 0.06 * math.sin(t * 1.2)
        P[K_PITCH] = lean - 0.20 * env
        P[K_EARS] = 1.0 - 0.7 * env
        P[K_EYE] = (1.08 + 0.12 * env) * blink(t, [8.2, 10.3, 11.9])
        P[K_SQ] *= 1 - 0.06 * env
        P[K_HTILT] = 0.18 * math.sin(t * 0.9)
        P[K_TAIL] = math.sin(t * 2.0) * 0.6
        P[K_MOUTH] = 0.25 * env
        kitten_look(P, egg_c)
        if t >= 13.0:
            # burst! fur stands up, then curiosity
            x = t - 13.0
            P[K_PUFF] = 0.35 * math.exp(-x * 3)
            P[K_PITCH] = -0.15 * math.exp(-x * 3) + 0.05
            P[K_EYE] = 1.18 * blink(t, [14.1, 15.55, 15.62])
            P[K_EARS] = 1.1
            P[K_MOUTH] = 0.5 * math.exp(-x * 2)
            P[K_HTILT] = 0.25 * ss(seg(t, 14.0, 14.5)) * (1 - ss(seg(t, 15.4, 15.6)))
            if t > 15.5:
                # bubble shower: flinch then delight
                y = t - 15.5
                P[K_SQ] *= 1 - 0.1 * math.exp(-y * 6)
                P[K_EARS] = lerp(0.3, 1.1, ss(seg(t, 15.6, 16.0)))
                P[K_HTILT] = -0.25 * ss(seg(t, 15.8, 16.3))
                P[K_LEGS] = 0.45 * bump(t, 16.2, 16.9)
                P[K_TAIL] = math.sin(t * 8)
                P[K_MOUTH] = 0.35 * ss(seg(t, 15.8, 16.1))
    else:
        # scene 5: friends
        P[K_HTURN] = 0.25
        P[K_HTILT] = 0.0
        if t < 17.65:
            # nuzzle toward the dragon, happy squint
            P[K_HTILT] = -0.28 * bump(t, 17.0, 17.7)
            P[K_EYE] = lerp(1.0, 0.18, bump(t, 17.0, 17.65))
            P[K_TAIL] = math.sin(t * 9)
            kitten_look(P, dragon_head_world(P) if P[D_VIS] else egg_c)
        elif t < 19.25:
            P[K_EYE] = 1.0 + 0.18 * ss(seg(t, 18.5, 18.8))
            P[K_EARS] = 1.0 + 0.15 * ss(seg(t, 18.5, 18.8))
            P[K_MOUTH] = 0.55 * ss(seg(t, 18.6, 18.9))
            P[K_HTILT] = 0.12 * ss(seg(t, 18.6, 19.0))
        else:
            P[K_EYE] = 1.18
            P[K_EARS] = 1.15
            P[K_MOUTH] = 0.55
            P[K_HTILT] = lerp(0.12, 0.0, ss(seg(t, 19.25, 19.5)))
            # POP!
            if t >= 19.55:
                x = t - 19.55
                P[K_PUFF] = 0.6 * ss(x / 0.2)
                P[K_MOUTH] = 0.6
                P[K_SQ] *= 1 + 0.08 * math.exp(-x * 8) * math.sin(x * 40)


# ---------------------------------------------------------------- dragon
def dragon_params(P, t):
    P[D_SQ] = 1.0
    P[D_EYE] = 1.0
    P[D_SCALE] = 1.0
    if t < 13.0:
        P[D_VIS] = 0.0
        return
    P[D_VIS] = 1.0
    if t < 17.0:
        x = t - 13.0
        P[D_X], P[D_Z] = E0[0], E0[2] + 0.02
        P[D_YAW] = -0.55
        # pop out with overshoot
        rise = ease_out_back(seg(t, 13.0, 13.45), 2.5)
        P[D_Y] = lerp(-0.30, 0.03, rise)
        P[D_SCALE] = lerp(0.6, 0.85, ss(seg(t, 13.0, 13.3)))
        P[D_SQ] = 1.0 + 0.2 * math.exp(-x * 6) * math.sin(x * 35)
        P[D_WING] = lerp(-1.2, 0.25, ease_out_elastic(seg(t, 13.35, 14.1))) + 0.15 * math.sin(t * 14) * ss(seg(t, 14.1, 14.4))
        P[D_EYE] = (0.08 if t < 13.55 else 1.1) * blink(t, [14.3])
        P[D_HNOD] = 0.0
        if 14.9 <= t < 15.5:
            # inhale...
            y = ss(seg(t, 14.9, 15.45))
            P[D_HNOD] = -0.45 * y
            P[D_SQ] = 1 + 0.12 * y
            P[D_EYE] = lerp(1.1, 0.35, y)
            P[D_MOUTH] = 0.35 * y
            P[D_WING] = 0.25 + 0.55 * y
        elif 15.5 <= t < 16.4:
            # ...ACHOO!
            y = t - 15.5
            k = math.exp(-y * 5)
            P[D_HNOD] = 0.5 * k * math.cos(y * 18) if y > 0.02 else 0.5
            P[D_SQ] = 1 - 0.15 * k
            P[D_EYE] = 0.06 if y < 0.35 else lerp(0.06, 1.1, ss(seg(y, 0.35, 0.5)))
            P[D_MOUTH] = 1.0 * math.exp(-y * 3)
            P[D_WING] = 0.25 + 0.6 * k * math.cos(y * 25)
        mouth = dragon_mouth_world(P)
        if t < 14.3:
            dragon_look(P, camera_eye(t))
        else:
            dragon_look(P, head_world(P))
    else:
        # scene 5: next to the kitten
        P[D_X], P[D_Y], P[D_Z] = D5
        P[D_SCALE] = 0.85
        P[D_YAW] = -0.75
        P[D_WING] = 0.25 + 0.25 * math.sin(t * 16)
        P[D_EYE] = 1.0 * blink(t, [17.35])
        P[D_SQ] = 1 + 0.03 * math.sin(t * 7)
        if t < 17.65:
            P[D_HNOD] = 0.15 * bump(t, 17.0, 17.6)
            P[D_EYE] = lerp(1.0, 0.2, bump(t, 17.05, 17.6))
        elif t < 18.65:
            # blow the heart bubble
            y = seg(t, 17.65, 18.6)
            P[D_MOUTH] = 0.35
            P[D_SQ] = 1 + 0.08 * math.sin(math.pi * y)
            P[D_HNOD] = -0.1 * y
        else:
            P[D_EYE] = 1.18
            P[D_MOUTH] = 0.6 * ss(seg(t, 18.6, 18.9))
            P[D_HNOD] = -0.2
        if t > 19.55:
            P[D_SQ] = 1 + 0.15 * math.exp(-(t - 19.55) * 8) * math.sin((t - 19.55) * 40)


def camera_eye(t):
    c = camera(t)
    return c[0:3]


# ---------------------------------------------------------------- flowers
FLOWER_SQUASH_SET = [0, 1, 2, 3, 4, 5, 6]


def flower_params(P, t):
    from renderer import FLOWERS
    for i in range(N_FLOWERS):
        v = 1.0 + 0.03 * math.sin(t * 2.0 + i)
        if 3.0 <= t < 7.0 and i in FLOWER_SQUASH_SET:
            fx, fz = FLOWERS[i, 0], FLOWERS[i, 1]
            # squashed when the kitten rolls over them, then springs back
            tc = 5.15 + 0.85 * clamp((fx - 0.66) / 0.40)
            x = t - tc
            if -0.1 < x < 0.9:
                v = 1.0 - 0.6 * bump(x, -0.1, 0.25) + (0.25 * math.exp(-x * 5) * math.sin(x * 25) if x > 0.25 else 0)
        P[FL_SQ0 + i] = v


# ---------------------------------------------------------------- lights
def light_params(P, t):
    P[SUN_INT] = 1.0
    P[G_X], P[G_Y], P[G_Z] = P[E_X], P[E_Y] + 0.3, P[E_Z] + 0.12
    col = rainbow(t * 0.25) * 0.5 + 0.5
    P[G_R], P[G_G], P[G_B] = col
    P[G_INT] = 0.25 + 0.35 * P[E_GLOW]
    if t < 1.25:
        # light from the egg (off-screen right) bathing the kitten's face
        P[G_INT] = 0.9 + 0.4 * math.sin(t * 9)
    if 7.0 <= t < 13.0:
        P[SUN_INT] = lerp(1.0, 0.8, ss(seg(t, 7.0, 10.0)))
        P[G_INT] = lerp(0.5, 1.4, seg(t, 7.0, 12.9))
    if 13.0 <= t < 17.0:
        P[SUN_INT] = lerp(0.8, 1.0, ss(seg(t, 13.0, 13.6)))
        P[G_INT] = 0.4 + 2.0 * math.exp(-(t - 13.0) * 3)
    if t >= 17.0:
        P[G_INT] = 0.15
        if t >= 19.2:
            # rainbow pop light on the kitten's face
            h = head_world(P)
            P[G_X], P[G_Y], P[G_Z] = h + np.array([0.25, 0.05, 0.35])
            P[G_INT] = 0.15 + 1.6 * ss(seg(t, 19.5, 19.65))


# ---------------------------------------------------------------- overlays
_rng = np.random.default_rng(7)
AMBIENT = _rng.uniform([-1.6, 0.15, -1.6, 0, 0], [1.6, 1.4, 1.0, TAU, 1], size=(46, 5))
PETALS = _rng.uniform([-1, 0.4, -1, 0, 0], [1, 1.2, 1, TAU, 1], size=(36, 5))
EGG_BURST = _rng.normal(size=(60, 3))
BUBBLES = np.column_stack([
    _rng.uniform(-1.6, -0.4, 40),   # vx (towards kitten)
    _rng.uniform(0.0, 1.0, 40),     # vy
    _rng.uniform(-0.3, 0.5, 40),    # vz
    _rng.uniform(0.03, 0.075, 40),  # radius
    _rng.uniform(0, 1, 40),         # hue
    _rng.uniform(1.1, 2.6, 40),     # lifetime
    _rng.uniform(0, 0.12, 40),      # spawn delay
])
AMB_BUBBLES = _rng.uniform([-1.0, 0.2, -0.3, 0.02, 0, 0], [0.8, 1.1, 0.5, 0.045, 1, TAU], size=(12, 6))
POP_BURST = _rng.normal(size=(40, 3))


def overlays(t, P):
    ov = {"sparkles": [], "bubbles": [], "heart": None, "petals": [],
          "rays": None, "halo": None, "flash": 0.0}

    # ambient magic fireflies
    for i, (x, y, z, ph, hue) in enumerate(AMBIENT):
        p = np.array([x + 0.08 * math.sin(t * 0.7 + ph), y + 0.06 * math.sin(t * 1.1 + ph * 2), z])
        tw = 0.5 + 0.5 * math.sin(t * 4.0 + ph * 3)
        ov["sparkles"].append((p, 0.012 + 0.01 * tw, 0.45 * tw, hue))

    egg_c = np.array([P[E_X], P[E_Y] + 0.25, P[E_Z]])
    # egg halo
    if t < 13.4:
        ov["halo"] = (egg_c, 0.28 + 0.12 * P[E_GLOW], rainbow(P[E_HUE] + 0.3) * 0.5 + 0.5, 0.12 * P[E_GLOW])
    if t < 1.25:
        # off-screen egg glow sweeping in from the right
        pass

    # egg sparkles orbiting during suspense
    if 2.0 <= t < 13.0:
        n = 14 if t < 7 else 24
        for i in range(n):
            a = i * 2.39996 + t * (1.2 + 0.4 * (i % 3))
            r = 0.26 + 0.05 * math.sin(t * 2 + i)
            p = egg_c + np.array([r * math.cos(a), 0.18 * math.sin(t * 1.5 + i * 1.3), r * math.sin(a)])
            tw = 0.5 + 0.5 * math.sin(t * 7 + i * 2.1)
            ov["sparkles"].append((p, 0.012 + 0.012 * tw, 0.6 * tw * (0.5 + 0.5 * P[E_GLOW]), (i * 0.13 + t * 0.2) % 1))

    # crack light rays
    if 7.5 <= t < 13.6:
        inten = P[E_CRACK] * (0.5 + 0.5 * egg_wobble_env(t)) if t < 13.0 else 1.5 * math.exp(-(t - 13.0) * 5)
        ov["rays"] = (egg_c + np.array([0, 0.03, 0]), inten, t)

    # flash at the hatch
    if 12.75 <= t < 13.4:
        ov["flash"] = max(ov["flash"], 0.9 * ss(seg(t, 12.75, 13.0)) * (1 - ss(seg(t, 13.0, 13.4))) * 1.0
                          if t < 13.0 else 0.9 * (1 - ss(seg(t, 13.0, 13.4))))

    # hatch sparkle burst
    if 13.0 <= t < 15.0:
        x = t - 13.0
        for i, v in enumerate(EGG_BURST):
            v = v / (np.linalg.norm(v) + 1e-6) * (1.2 + 0.6 * (i % 5) / 4)
            v[1] = abs(v[1]) * 1.2 + 0.3
            p = egg_c + v * (1 - math.exp(-x * 3)) / 3 + np.array([0, -0.15 * x * x, 0])
            fade = 1 - seg(x, 0.6, 2.0)
            ov["sparkles"].append((p, 0.025 * fade + 0.005, 1.2 * fade, (i * 0.17) % 1))

    # petal burst on the tumble
    if 5.1 <= t < 7.0:
        x = t - 5.15
        base = np.array([0.85, 0.08, 0.30])
        for i, (vx, vy, vz, ph, hue) in enumerate(PETALS):
            if x < 0:
                continue
            v = np.array([vx * 0.9, vy * 1.6, vz * 0.7])
            p = base + v * (1 - math.exp(-x * 2.5)) / 2.5 + np.array([0.05 * math.sin(x * 4 + ph), -0.35 * x * x, 0])
            if p[1] < 0.01:
                continue
            ov["petals"].append((p, 0.025, (hue * 0.3 + 0.85) % 1, ph + x * 5, 1 - seg(x, 1.3, 1.8)))

    # sneeze bubbles
    if 15.45 <= t < 17.0:
        x0 = t - 15.5
        Pm = P.copy()
        mouth = np.array([E0[0] - 0.05, 0.42, E0[2] + 0.18])
        for i, (vx, vy, vz, rad, hue, life, delay) in enumerate(BUBBLES):
            x = x0 - delay
            if x < 0:
                continue
            v = np.array([vx, vy, vz])
            k = 3.0
            p = mouth + v * (1 - math.exp(-x * k)) / k + np.array([0.02 * math.sin(x * 5 + i), 0.10 * x, 0])
            grow = ss(x / 0.15)
            pop = seg(x, life, life + 0.08)
            if pop >= 1:
                continue
            ov["bubbles"].append((p, rad * grow * (1 + 0.4 * pop), 1 - pop, hue))
            if 0 < pop:
                ov["sparkles"].append((p, 0.02, 0.8, hue))

    # ambient bubbles in the friends scene
    if 17.0 <= t < 20.0:
        for i, (x, y, z, rad, hue, ph) in enumerate(AMB_BUBBLES):
            p = np.array([x + 0.05 * math.sin(t * 0.8 + ph), y + 0.08 * ((t - 17) * 0.3 + math.sin(t + ph) * 0.3), z])
            ov["bubbles"].append((p, rad, 0.85, hue))

    # heart bubble
    if 17.65 <= t < 19.62:
        mouth = dragon_mouth_world(P)
        if t < 18.6:
            g = ss(seg(t, 17.65, 18.6))
            size = 0.02 + 0.19 * g
            pos = mouth + np.array([-0.04 - 0.05 * g, size * 0.9, 0.04])
        else:
            start = mouth + np.array([-0.09, 0.21 * 0.9, 0.04])
            top = np.array([-0.20, 1.12, 0.20])
            size = 0.21
            if t < 19.2:
                pos = lerpv(start, top, ss(seg(t, 18.6, 19.2)))
            else:
                nose = head_world(P) + rot_y(np.array([0.0, -0.02, 0.36]), P[K_YAW] + P[K_HTURN])
                pos = lerpv(top, nose + np.array([0.0, size * 0.55, 0.05]), ss(seg(t, 19.2, 19.55)))
        wob = 1 + 0.04 * math.sin(t * 9)
        alpha = 1.0 if t < 19.55 else 1 - seg(t, 19.55, 19.62)
        ov["heart"] = (pos, size * wob, alpha, t)
        # sparkles around the heart
        if t > 18.5:
            for i in range(10):
                a = i * TAU / 10 + t * 1.5
                p = pos + np.array([math.cos(a) * size * 1.4, math.sin(a) * size * 1.2, 0.02])
                tw = 0.5 + 0.5 * math.sin(t * 8 + i)
                ov["sparkles"].append((p, 0.012 + 0.01 * tw, 0.8 * tw, (i / 10 + t * 0.3) % 1))

    # final POP burst + loop flash
    if t >= 19.55:
        x = t - 19.55
        nose = head_world(P) + rot_y(np.array([0.0, 0.0, 0.40]), P[K_YAW] + P[K_HTURN])
        for i, v in enumerate(POP_BURST):
            v = v / (np.linalg.norm(v) + 1e-6)
            p = nose + v * 0.5 * (1 - math.exp(-x * 6))
            ov["sparkles"].append((p, 0.02, 1.3 * (1 - seg(x, 0.2, 0.45)), (i * 0.11) % 1))
        ov["flash"] = max(ov["flash"], 0.55 * ss(seg(t, 19.75, 20.0)))
    if t < 0.4:
        # loop-start flash (continues the pop flash from the end)
        ov["flash"] = max(ov["flash"], 0.55 * (1 - ss(t / 0.3)))
        for i, v in enumerate(POP_BURST):
            v = v / (np.linalg.norm(v) + 1e-6)
            Pa = np.zeros(NPARAMS)
            Pa[K_X], Pa[K_Y], Pa[K_Z] = K0
            Pa[K_YAW] = K_YAW0
            nose = head_world(Pa) + rot_y(np.array([0.0, 0.0, 0.40]), K_YAW0 + 0.25)
            p = nose + v * (0.5 + 0.3 * t)
            ov["sparkles"].append((p, 0.02, 1.0 * (1 - seg(t, 0.1, 0.4)), (i * 0.11) % 1))
    return ov


# ---------------------------------------------------------------- main
def frame(t):
    P = np.zeros(NPARAMS)
    P[TIME] = t
    egg_params(P, t)
    dragon_params(P, t)
    kitten_params(P, t, (P[E_X], P[E_Y], P[E_Z]))
    dragon_params(P, t)  # again, now that the kitten pose is known (gaze)
    if t >= 17.0:
        # in the friends scene the dragon sits next to the kitten; look at it/heart
        pass
    flower_params(P, t)
    light_params(P, t)
    cam = camera(t)
    ov = overlays(t, P)
    # kitten gaze in scene 5 follows the heart
    if t >= 17.65 and ov["heart"] is not None:
        kitten_look(P, ov["heart"][0])
        dragon_look(P, ov["heart"][0])
    if 15.5 <= t < 17.0 and ov["bubbles"]:
        # watch the bubbles
        kitten_look(P, np.mean([b[0] for b in ov["bubbles"]], axis=0))
    return P, cam, ov
