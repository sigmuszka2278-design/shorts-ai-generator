"""Procedural soundtrack for "Gift Box Surprise": bouncy music, a snare drum
roll for the suspense, magic SFX and rubber-duck squeaks. No dialogue.

Synth primitives are shared with ../kitten_rainbow_egg/audio.py.
"""
import math
import os
import sys
import wave

import numpy as np

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "kitten_rainbow_egg"))
import audio as A  # noqa: E402

from timeline import DUCK_BOUNCES  # noqa: E402

SR = A.SR
BEAT = 0.5  # 120 bpm
rng = np.random.default_rng(5)


class Mix:
    """linear (non-looping) stereo mix bus"""

    def __init__(self, dur):
        self.n = int(dur * SR)
        self.buf = np.zeros((self.n, 2))

    def add(self, t, x, gain=1.0, pan=0.0):
        st = int(t * SR)
        if st >= self.n:
            return
        x = x[: self.n - st] * gain
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        self.buf[st:st + len(x), 0] += x * l
        self.buf[st:st + len(x), 1] += x * r


def snare():
    t = A.tt(0.18)
    return A.bandnoise(0.18, 1500, 9000) * np.exp(-t * 22) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5


def roll_hit():
    t = A.tt(0.06)
    return A.bandnoise(0.06, 1800, 9000) * np.exp(-t * 50)


def rubber_squeak(dur=0.28, f0=1600, peak=2500, f1=1400, rich=1.0):
    t = A.tt(dur)
    x = t / dur
    f = np.where(x < 0.35, f0 + (peak - f0) * (x / 0.35), peak + (f1 - peak) * ((x - 0.35) / 0.65))
    f = f * (1 + 0.025 * np.sin(2 * np.pi * 38 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) + 0.45 * rich * np.sin(2 * ph) + 0.25 * rich * np.sin(3 * ph)
    sig += 0.15 * A.bandnoise(dur, 2000, 8000)
    e = np.minimum(t / 0.015, 1) * np.minimum((dur - t) / 0.05, 1)
    return sig * e * 0.6


def quack(dur=0.22, f0=300):
    t = A.tt(dur)
    f = f0 * (1.15 - 0.35 * t / dur)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1.0) - 1
    n = len(saw)
    spec = np.fft.rfft(saw)
    fr = np.fft.rfftfreq(n, 1 / SR)
    form = np.exp(-((fr - 1000) / 350) ** 2) + 0.7 * np.exp(-((fr - 2400) / 500) ** 2) + 0.1
    y = np.fft.irfft(spec * form, n)
    y /= np.abs(y).max() + 1e-9
    return y * np.minimum(t / 0.01, 1) * np.exp(-t * 4)


def fanfare():
    out = np.zeros(int(1.6 * SR))
    for n, d in [(60, 0.0), (64, 0.0), (67, 0.0), (72, 0.0), (76, 0.12), (79, 0.24), (84, 0.36)]:
        t = A.tt(1.2)
        f = A.note_freq(n)
        x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.3 * np.sin(6 * np.pi * f * t))
        x *= A.env_adsr(len(t), a=0.02, d=0.2, s=0.5, r=0.5) * 0.25
        st = int(d * SR)
        out[st:st + len(x)] += x
    return out


def music(mx):
    C, F, G, Am = [60, 64, 67], [53, 57, 60], [55, 59, 62], [57, 60, 64]
    # bars (2 s each): 0-2 2-4 4-6 6-8 | suspense 8-10.6 | duck 11-15
    prog = [(0.0, C), (2.0, F), (4.0, G), (6.0, C)]
    mel = [72, 76, 79, 76, 77, 76, 74, 72]
    for t0, ch in prog:
        span = 2.0 if t0 < 6.0 else 1.0
        mx.add(t0, A.pad([A.note_freq(n) for n in ch], span + 0.3), 0.09)
        for k in range(int(span / BEAT)):
            tb = t0 + k * BEAT
            mx.add(tb, A.kick(), 0.32 if k % 2 == 0 else 0.0)
            mx.add(tb, A.bass(A.note_freq(ch[0] - 24 + (7 if k % 2 else 0)), BEAT * 0.8), 0.22)
            if k % 2 == 1:
                mx.add(tb, A.clap(), 0.10)
            mx.add(tb, A.shaker(), 0.10, 0.35)
            mx.add(tb + BEAT / 2, A.shaker(), 0.16, 0.35)
        for k in range(int(span / (BEAT / 2))):
            n = mel[k % len(mel)] + (ch[0] - 60)
            mx.add(t0 + k * BEAT / 2, A.pluck(A.note_freq(n), 0.4), 0.11, -0.2)
    # 7-10.6: suspense pad + heartbeat, snare roll from 9.2 that speeds up and swells
    mx.add(7.0, A.pad([A.note_freq(n) for n in [57, 60, 64, 69]], 3.7), 0.13)
    t = 7.1
    while t < 9.2:
        mx.add(t, A.kick(), 0.28)
        mx.add(t + 0.15, A.kick(), 0.16)
        t += 0.6
    t = 9.2
    while t < 10.55:
        x = (t - 9.2) / 1.35
        mx.add(t, roll_hit(), 0.12 + 0.35 * x, rng.uniform(-0.1, 0.1))
        t += 0.09 - 0.045 * x
    # (silence 10.6 - 11.0)
    # 11-15: party! brighter, faster
    for t0, ch in [(11.0, C), (12.0, F), (13.0, G), (14.0, C)]:
        mx.add(t0, A.pad([A.note_freq(n + 12) for n in ch], 1.3), 0.08)
        for k in range(2):
            tb = t0 + k * BEAT
            mx.add(tb, A.kick(), 0.36)
            mx.add(tb + BEAT / 2, snare(), 0.14)
            mx.add(tb, A.bass(A.note_freq(ch[0] - 24 + 12 * k), BEAT * 0.8), 0.25)
            for s in range(4):
                mx.add(tb + s * BEAT / 4, A.shaker(), 0.12, 0.35)
        for k, n in enumerate([79, 81, 79, 76]):
            mx.add(t0 + k * BEAT / 2, A.pluck(A.note_freq(n + (ch[0] - 60)), 0.35, 1.3), 0.11, -0.2)


def build(dur=15.0):
    mx = Mix(dur)
    music(mx)
    # --- 0-3 s: red box
    mx.add(0.0, A.sfx_rattle(0.85, 18, 700), 0.6, -0.3)
    for t0 in (0.10, 0.42, 0.68):
        mx.add(t0, A.sfx_boing(220, 480, 0.25), 0.35, -0.3)
    mx.add(0.84, A.sfx_pop(), 0.9, -0.3)
    mx.add(0.85, A.sfx_whoosh(0.5, 600, 7000, up=False), 0.4, -0.3)
    mx.add(0.86, A.sfx_shimmer(1.2), 0.45, -0.3)
    mx.add(0.95, A.sfx_boing(300, 800, 0.35), 0.4, -0.3)       # kitten pops up
    mx.add(1.12, A.sfx_slide(0.22, 900, 1800), 0.22, -0.3)     # cute surprised chirp
    mx.add(1.45, A.sfx_whoosh(0.45, 500, 5000), 0.35, -0.2)
    mx.add(1.98, A.sfx_bloop(500, 220, 0.09), 0.4, -0.2)
    mx.add(2.5, A.sfx_bloop(1400, 2200, 0.05), 0.2, -0.2)      # blink
    # --- 3-7 s: blue box
    mx.add(2.8, A.sfx_riser(1.4) * 0.6, 0.35, 0.3)
    mx.add(2.9, A.sfx_shimmer(1.3, up=False), 0.3, 0.3)
    mx.add(3.5, A.sfx_rattle(0.7, 16, 900), 0.35, 0.3)
    mx.add(4.18, A.sfx_pop(), 0.9, 0.3)
    mx.add(4.2, A.sfx_shimmer(1.2), 0.45, 0.3)
    mx.add(4.22, A.sfx_boing(260, 750, 0.4), 0.4, 0.3)
    mx.add(4.45, A.sfx_flutter(0.6), 0.35, 0.3)
    mx.add(4.95, A.sfx_whoosh(0.45, 500, 5000), 0.3, 0.2)
    mx.add(5.45, A.sfx_bloop(500, 220, 0.09), 0.4, 0.2)
    for i in range(30):
        tb = 5.6 + rng.uniform(0, 1.4)
        f0 = rng.uniform(450, 950)
        mx.add(tb, A.sfx_bloop(f0, f0 * 2.2, 0.07), 0.15, rng.uniform(-0.3, 0.4))
    for i in range(10):
        mx.add(6.6 + rng.uniform(0, 1.6), A.sfx_pop(), 0.1, rng.uniform(-0.4, 0.2))
    mx.add(6.1, A.sfx_bloop(900, 1500, 0.06), 0.2, -0.2)       # paw bat
    mx.add(6.55, A.sfx_bloop(1000, 1700, 0.06), 0.2, -0.2)
    # --- 7-11 s: golden box suspense
    for a, b, amp in [(7.1, 7.6, 0.08), (7.9, 8.5, 0.12), (9.25, 9.9, 0.16), (10.0, 10.55, 0.22)]:
        mx.add(a, A.sfx_rattle(b - a, 16 + 60 * amp, 420), 0.35 + 2.0 * amp)
    for t0, h in [(8.0, 0.08), (8.25, 0.10), (9.3, 0.14), (9.6, 0.16), (10.05, 0.2), (10.3, 0.22)]:
        mx.add(t0 + 0.2, A.sfx_thump(), 0.4 + 1.5 * h)
    mx.add(7.0, A.sfx_shimmer(3.5, up=False), 0.3)
    mx.add(8.7, A.sfx_slide(0.3, 300, 500), 0.25)              # creak open...
    mx.add(8.72, A.sfx_shimmer(0.6), 0.4)
    mx.add(9.12, A.sfx_thump(), 0.8)                          # ...SLAM
    mx.add(10.75, A.bell(A.note_freq(96), 0.4), 0.12)         # tiny "tink" in the silence
    # --- 11 s: BOOM
    mx.add(10.98, A.sfx_pop(), 1.0)
    mx.add(11.0, A.sfx_thump(), 1.0)
    mx.add(11.0, fanfare(), 0.6)
    mx.add(11.0, A.sfx_whoosh(1.0, 300, 9000, up=False), 0.5)
    mx.add(11.0, A.sfx_shimmer(1.6), 0.5)
    mx.add(11.05, A.sfx_boing(120, 420, 0.6), 0.7)            # giant duck springs out
    mx.add(11.15, A.sfx_slide(0.3, 800, 2200), 0.35, -0.3)    # kitten "fweet!"
    mx.add(11.2, A.sfx_slide(0.3, 1000, 2600), 0.3, 0.3)      # dragon "fweet!"
    mx.add(11.45, rubber_squeak(0.3), 0.6)
    for t0, dur, h in DUCK_BOUNCES:
        mx.add(t0, A.sfx_boing(200, 420, 0.3), 0.25)
        mx.add(t0 + dur - 0.02, rubber_squeak(0.2, 1500 + 400 * rng.uniform(), 2300, 1500), 0.45)
    mx.add(12.9, A.sfx_bloop(1400, 2200, 0.05), 0.2, -0.3)
    # --- grand finale: big funny SQUEEEAK + quack + boing
    mx.add(14.33, rubber_squeak(0.55, 1300, 2800, 1100, 1.4), 1.0)
    mx.add(14.38, A.sfx_slide(0.3, 900, 2400), 0.35, -0.3)
    mx.add(14.42, A.sfx_slide(0.3, 1100, 2800), 0.3, 0.3)
    mx.add(14.6, quack(0.18, 320), 0.55)
    mx.add(14.78, quack(0.26, 280), 0.6)
    mx.add(14.62, A.sfx_boing(500, 150, 0.35), 0.3)
    return mx


def write_wav(path, dur=15.0):
    x = build(dur).buf
    x = x / (np.max(np.abs(x)) + 1e-9) * 1.6
    x = np.tanh(x) / np.tanh(1.6) * 0.92
    # short fade-out at the very end
    n = int(0.05 * SR)
    x[-n:] *= np.linspace(1, 0, n)[:, None]
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    return path


if __name__ == "__main__":
    write_wav(sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav")
