"""Procedural soundtrack: playful looping music bed + cartoon sound effects,
all synthesized with numpy (no samples, no dialogue).

The mix is rendered into a circular 20 s buffer so that sounds which ring
past the end (the final POP sparkle) wrap around to the start -> seamless loop.
"""
import math
import wave

import numpy as np

SR = 44100
BPM = 120.0
BEAT = 60.0 / BPM
rng = np.random.default_rng(3)


# ------------------------------------------------------------ primitives
def tt(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.1, sus_t=None):
    t = np.arange(n) / SR
    dur = n / SR
    if sus_t is None:
        sus_t = max(dur - r, a + d)
    e = np.where(t < a, t / max(a, 1e-6),
                 np.where(t < a + d, 1 - (1 - s) * (t - a) / max(d, 1e-6), s))
    rel = np.clip((t - sus_t) / max(r, 1e-6), 0, 1)
    return e * (1 - rel)


def note_freq(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def bandnoise(dur, lo, hi):
    n = int(dur * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= ((f > lo) & (f < hi))
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-9)


def sweep(dur, f0, f1, shape="exp", wave_="sine", vib=0.0, vib_rate=6.0):
    t = tt(dur)
    x = t / dur
    if shape == "exp":
        f = f0 * (f1 / f0) ** x
    else:
        f = f0 + (f1 - f0) * x
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * vib_rate * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == "sine":
        return np.sin(ph)
    if wave_ == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)


# ------------------------------------------------------------ instruments
def pluck(freq, dur=0.5, bright=1.0):
    t = tt(dur)
    x = (np.sin(2 * np.pi * freq * t) + 0.35 * bright * np.sin(2 * np.pi * 4 * freq * t) * np.exp(-t * 30)
         + 0.2 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 8))
    return x * np.exp(-t * 7) * np.minimum(t / 0.002, 1)


def bell(freq, dur=1.2):
    t = tt(dur)
    x = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 4)
         + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 8))
    return x * np.exp(-t * 3.5) * np.minimum(t / 0.002, 1)


def pad(freqs, dur):
    t = tt(dur)
    x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.6, 0.0, 0.7):
            x += np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6))
    x /= len(freqs) * 3
    return x * env_adsr(len(t), a=0.25, d=0.3, s=0.8, r=0.4)


def bass(freq, dur):
    t = tt(dur)
    x = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    return x * env_adsr(len(t), a=0.005, d=0.15, s=0.5, r=0.08)


def kick():
    t = tt(0.3)
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)


def shaker():
    return bandnoise(0.06, 6000, 14000) * np.exp(-tt(0.06) * 60) * 0.5


def clap():
    x = bandnoise(0.15, 1000, 5000)
    return x * np.exp(-tt(0.15) * 30)


# ------------------------------------------------------------ sfx
def sfx_boing(f0=180, f1=520, dur=0.35):
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 14))
    f = f * (1 + 0.08 * np.sin(2 * np.pi * 22 * t) * np.exp(-t * 4))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return x * np.exp(-t * 7) * np.minimum(t / 0.003, 1)


def sfx_bloop(f0=300, f1=900, dur=0.09):
    x = sweep(dur, f0, f1)
    t = tt(dur)
    return x * np.sin(np.pi * t / dur) ** 0.5


def sfx_pop():
    t = tt(0.12)
    x = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 25) + 300) / SR) * np.exp(-t * 35)
    x += bandnoise(0.12, 2000, 9000) * np.exp(-t * 60) * 0.5
    return x


def sfx_whoosh(dur=0.45, lo=300, hi=3000, up=True):
    n = int(dur * SR)
    x = bandnoise(dur, lo, hi)
    t = np.arange(n) / n
    e = np.sin(np.pi * t) ** 2
    if up:
        e *= 0.5 + t
    return x * e


def sfx_thump():
    t = tt(0.25)
    x = np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-t * 25)) / SR) * np.exp(-t * 14)
    x += lowpass_fast(bandnoise(0.25, 80, 900), 0.3) * np.exp(-t * 18) * 0.6
    return x


def lowpass_fast(x, k):
    # cheap exponential smoothing via cumulative filter (vectorised approximation)
    from scipy.signal import lfilter
    return lfilter([k], [1, -(1 - k)], x)


def sfx_rattle(dur, rate=18.0, pitch=900):
    out = np.zeros(int(dur * SR))
    n = int(dur * rate)
    for i in range(n):
        st = int((i / rate + rng.uniform(-0.01, 0.01)) * SR)
        click = np.sin(2 * np.pi * (pitch * rng.uniform(0.8, 1.25)) * tt(0.03)) * np.exp(-tt(0.03) * 140)
        click += bandnoise(0.03, 1500, 6000) * np.exp(-tt(0.03) * 200) * 0.4
        st = max(0, min(st, len(out) - len(click)))
        out[st:st + len(click)] += click * rng.uniform(0.6, 1.0)
    return out


def sfx_crack():
    x = np.zeros(int(0.25 * SR))
    for k in range(4):
        st = int(rng.uniform(0, 0.12) * SR)
        c = bandnoise(0.04, 1500, 12000) * np.exp(-tt(0.04) * 120)
        x[st:st + len(c)] += c * rng.uniform(0.5, 1.0)
    return x


def sfx_shimmer(dur=1.5, base=1200, up=True):
    out = np.zeros(int(dur * SR))
    notes = [72, 76, 79, 84, 88, 91, 96, 100]
    for i in range(18):
        n = notes[i % len(notes)] + (12 if i > 8 else 0)
        st = int((i / 18) * dur * 0.7 * SR) if up else int(rng.uniform(0, dur * 0.7) * SR)
        b = bell(note_freq(n), 0.6) * 0.35
        st = min(st, len(out) - len(b))
        out[st:st + len(b)] += b
    return out


def sfx_riser(dur):
    t = tt(dur)
    x = bandnoise(dur, 400, 9000) * (t / dur) ** 2 * 0.5
    x += sweep(dur, 200, 1400, wave_="tri") * (t / dur) ** 1.5 * 0.35
    return x


def sfx_sneeze():
    # "hehe..." squeaky inhale handled separately; this is the cute "tchoo!"
    t = tt(0.35)
    burst = bandnoise(0.35, 1200, 7000) * np.exp(-t * 14)
    squeak = sweep(0.35, 1800, 700, vib=0.03, vib_rate=30) * np.exp(-t * 10) * 0.6
    return burst * 0.9 + squeak


def sfx_inhale(dur=0.55):
    t = tt(dur)
    x = bandnoise(dur, 800, 4000) * (t / dur) ** 1.2 * 0.5
    x += sweep(dur, 700, 1500, vib=0.02, vib_rate=12) * (t / dur) * 0.25
    return x


def sfx_flutter(dur=0.6):
    t = tt(dur)
    x = bandnoise(dur, 300, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t)) ** 3
    return x * np.sin(np.pi * t / dur)


def sfx_trill(dur=0.5, f=1300):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 16 * t)) * np.sin(np.pi * t / dur)
    return x


def sfx_slide(dur, f0, f1):
    t = tt(dur)
    return sweep(dur, f0, f1, vib=0.015, vib_rate=7, wave_="tri") * np.sin(np.pi * t / dur) ** 0.5


def sfx_inflate(dur):
    t = tt(dur)
    return sweep(dur, 220, 660, vib=0.04, vib_rate=9, wave_="rich") * np.minimum(t / 0.05, 1) * 0.6


def sfx_poof():
    t = tt(0.5)
    return lowpass_fast(bandnoise(0.5, 200, 6000), 0.2) * np.exp(-t * 8) * 2.0


# ------------------------------------------------------------ mixing
class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.buf = np.zeros((self.n, 2))

    def add(self, t, x, gain=1.0, pan=0.0):
        st = int(t * SR) % self.n
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        x = x * gain
        idx = (np.arange(len(x)) + st) % self.n  # circular -> seamless loop
        np.add.at(self.buf[:, 0], idx, x * l)
        np.add.at(self.buf[:, 1], idx, x * r)


def music(mx, dur):
    # chords per bar (10 bars at 120 bpm = 20 s): C G Am F | C G Am F | F G
    C, G, Am, F = [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]
    prog = [C, G, Am, F, C, G, Am, F, F, G]
    bars = len(prog)
    bar = 4 * BEAT
    melody_a = [76, 79, 81, 79, 76, 74, 72, 74]
    melody_b = [72, 74, 76, 79, 81, 84, 81, 79]
    for b, ch in enumerate(prog):
        t0 = b * bar
        suspense = 3.5 <= b < 6.5     # 7 s .. 13 s
        mx.add(t0, pad([note_freq(n) for n in ch], bar + 0.4), 0.10 if not suspense else 0.14)
        root = note_freq(ch[0] - 24)
        if not suspense:
            for k in (0, 2):
                mx.add(t0 + k * BEAT, bass(root, BEAT * 0.9), 0.22)
            for k in range(4):
                mx.add(t0 + k * BEAT, kick(), 0.35 if k % 2 == 0 else 0.0)
                if k % 2 == 1:
                    mx.add(t0 + k * BEAT, clap(), 0.10, pan=0.1)
            for k in range(8):
                mx.add(t0 + k * BEAT / 2, shaker(), 0.18 if k % 2 else 0.10, pan=0.35)
            mel = melody_a if b % 2 == 0 else melody_b
            for k, n in enumerate(mel):
                # follow the chord loosely
                mx.add(t0 + k * BEAT / 2, pluck(note_freq(n), 0.45), 0.13, pan=-0.2 + 0.05 * (k % 3))
            # sparkly counter-melody on the last two beats
            mx.add(t0 + 3.5 * BEAT, pluck(note_freq(ch[2] + 24), 0.4, 1.5), 0.06, pan=0.4)
        else:
            # suspense: sparse ticking and a soft heartbeat that speeds up
            for k in range(4):
                mx.add(t0 + k * BEAT, pluck(note_freq(ch[0] + 12 + (k % 2) * 7), 0.3, 0.3), 0.07)
    # heartbeat 7..13s accelerating
    t = 7.2
    gap = 0.75
    while t < 12.9:
        mx.add(t, kick(), 0.30)
        mx.add(t + 0.16, kick(), 0.18)
        t += gap
        gap = max(0.32, gap * 0.9)


def build(dur=20.0):
    mx = Mix(dur)
    music(mx, dur)

    # ---- scene 1 (hook)
    mx.add(0.0, sfx_shimmer(1.2), 0.45)                        # sparkle tail from the pop
    mx.add(0.05, sfx_boing(500, 260, 0.35), 0.35)              # fur deflating
    mx.add(0.25, sfx_slide(0.35, 600, 1300), 0.25)             # surprised whistle
    mx.add(0.95, sfx_bloop(1400, 2200, 0.05), 0.2)             # blink
    mx.add(1.22, sfx_whoosh(0.4, 500, 5000), 0.55, pan=0.4)    # whip pan
    mx.add(1.5, sfx_rattle(1.5, 14, 750), 0.45, pan=0.15)      # egg shaking
    mx.add(1.55, sfx_shimmer(1.4, up=False), 0.25, pan=0.2)

    # ---- scene 2
    for t0, f1 in [(3.05, 520), (3.55, 600), (4.05, 480)]:
        mx.add(t0, sfx_boing(200, f1), 0.45, pan=0.25)
    for tl in (3.47, 3.97, 4.43):
        mx.add(tl, sfx_bloop(500, 220, 0.08), 0.3, pan=0.25)
    mx.add(3.75, sfx_rattle(0.7, 20, 1800), 0.12, pan=-0.3)   # butt wiggle
    mx.add(4.48, sfx_whoosh(0.5, 400, 4000), 0.5, pan=-0.2)    # pounce
    mx.add(4.5, sfx_boing(250, 900, 0.5), 0.35, pan=0.2)       # egg super-leap
    mx.add(5.12, sfx_thump(), 0.7)
    mx.add(5.15, sfx_poof(), 0.30)
    mx.add(5.18, sfx_shimmer(0.9, up=False), 0.18, pan=0.3)    # petals
    mx.add(5.2, sfx_slide(0.75, 1200, 300), 0.22)              # tumble
    mx.add(5.6, sfx_bloop(500, 200, 0.1), 0.35, pan=-0.2)      # egg lands
    mx.add(5.65, sfx_trill(0.5, 1500), 0.12, pan=-0.2)         # egg giggle
    mx.add(6.0, sfx_thump(), 0.35)
    mx.add(6.42, sfx_rattle(0.33, 40, 500), 0.25)              # head shake brrr

    # ---- scene 3 (suspense)
    mx.add(7.0, sfx_riser(6.0), 0.45)
    for tw, c in [(7.55, .15), (8.75, .3), (9.85, .45), (10.85, .6), (11.55, .72), (12.05, .85)]:
        mx.add(tw, sfx_rattle(0.42, 22, 800), 0.45, pan=0.1)
        mx.add(tw + 0.1, sfx_crack(), 0.6, pan=0.1)
    mx.add(12.3, sfx_rattle(0.65, 30, 900), 0.55, pan=0.1)
    mx.add(12.5, sfx_crack(), 0.6)
    mx.add(12.75, sfx_crack(), 0.7)

    # ---- scene 4 (hatch + sneeze)
    mx.add(12.98, sfx_pop(), 0.9)
    mx.add(13.0, sfx_whoosh(0.8, 300, 8000, up=False), 0.6)
    mx.add(13.0, sfx_shimmer(1.6), 0.6)
    mx.add(13.0, bell(note_freq(84), 2.0), 0.35)
    mx.add(13.0, bell(note_freq(88), 2.0), 0.25)
    mx.add(13.05, sfx_boing(300, 700, 0.4), 0.45, pan=0.15)    # dragon pops up
    mx.add(13.4, sfx_flutter(0.7), 0.4, pan=0.15)
    mx.add(14.3, sfx_bloop(1400, 2200, 0.05), 0.2, pan=0.15)
    mx.add(14.95, sfx_inhale(0.55), 0.5, pan=0.15)
    mx.add(15.5, sfx_sneeze(), 0.75, pan=0.15)
    for i in range(26):
        tb = 15.55 + rng.uniform(0, 1.0)
        f0 = rng.uniform(400, 900)
        mx.add(tb, sfx_bloop(f0, f0 * 2.2, 0.07), 0.16, pan=rng.uniform(-0.6, 0.2))
    for i in range(14):
        mx.add(16.6 + rng.uniform(0, 1.6), sfx_pop(), 0.12, pan=rng.uniform(-0.6, 0.3))

    # ---- scene 5 (friends + heart + POP)
    mx.add(17.0, sfx_shimmer(1.0), 0.25)
    mx.add(17.65, sfx_inflate(0.95), 0.35, pan=0.15)
    mx.add(18.6, sfx_shimmer(1.2), 0.4)
    mx.add(18.62, bell(note_freq(79), 1.5), 0.25)
    mx.add(19.2, sfx_slide(0.35, 1500, 900), 0.25)
    mx.add(19.55, sfx_pop(), 1.0)
    mx.add(19.56, sfx_poof(), 0.5)
    mx.add(19.6, bell(note_freq(96), 1.5), 0.3)
    mx.add(19.75, sfx_whoosh(0.3, 1000, 9000), 0.2)
    return mx


def write_wav(path, dur=20.0):
    mx = build(dur)
    x = mx.buf
    # gentle bus compression + limiter
    peak = np.max(np.abs(x)) + 1e-9
    x = x / peak * 1.6
    x = np.tanh(x) / np.tanh(1.6) * 0.92
    data = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    return path


if __name__ == "__main__":
    import sys
    write_wav(sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav")
