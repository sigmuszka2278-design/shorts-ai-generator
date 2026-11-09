"""
Muzyka i efekty dźwiękowe – w całości syntezowane w kodzie (bez licencjonowanych plików).
Tajemniczy, kinowy ambient w a-moll + uderzenia, whooshe, tykanie zwalniającego zegara,
dudnienie przy horyzoncie zdarzeń, migotliwe dzwonki we wnętrzu i finałowe uderzenie.
Miks z lektorem (ducking) -> build/mix.wav
"""
from __future__ import annotations

import json
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

from script import DURATION, TRANSITIONS

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
SR = 48000
N = int(DURATION * SR)
rng = np.random.default_rng(42)
T = np.arange(N) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env_adsr(n, a, d, s, r, sustain_level=0.7):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    s_len = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, a, False), np.linspace(1, sustain_level, d, False),
                        np.full(s_len, sustain_level), np.linspace(sustain_level, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def place(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    if buf.ndim == 2:
        buf[i:i + n] += sig[:n] * gain if sig.ndim == 2 else sig[:n, None] * gain
    else:
        buf[i:i + n] += sig[:n] * gain


def reverb_ir(seconds=3.5, decay=2.8, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([r.normal(size=n), r.normal(size=n)], 1) * np.exp(-t * decay)[:, None]
    ir = lp(ir.T, 6000).T
    ir[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))


def reverb(x, wet=0.35, seconds=3.5, decay=2.8):
    ir = reverb_ir(seconds, decay)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet


def saw(f, t, detune=0.0):
    ph = (f * (1 + detune)) * t
    return 2 * (ph - np.floor(ph + 0.5))


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# --------------------------------------------------------------------------- muzyka
def music():
    out = np.zeros((N, 2))
    # 1) dron basowy A1 + E2, powoli „oddychający” filtr
    drone = np.zeros(N)
    for f, g in ((55.0, 1.0), (82.41, 0.5), (110.0, 0.35)):
        for dt in (-0.004, 0.0, 0.005):
            drone += g * saw(f, T + rng.random(), dt)
    cutoff = 220 + 160 * (0.5 + 0.5 * np.sin(2 * np.pi * T / 7.0))
    # filtr zmienny: blokowo
    y = np.zeros(N)
    blk = 4800
    zi = None
    from scipy.signal import sosfilt_zi
    for i in range(0, N, blk):
        sos = butter(2, cutoff[i], "low", fs=SR, output="sos")
        if zi is None:
            zi = sosfilt_zi(sos) * 0
        y[i:i + blk], zi = sosfilt(sos, drone[i:i + blk], zi=zi)
    drone = y * 0.12
    # dynamika drona wg scen
    lvl = np.interp(T, [0, 0.3, 4, 9, 15, 17.9, 18.0, 18.6, 21, 26, 26.3, 29, 30],
                    [0.0, 1.0, 0.8, 0.9, 1.0, 1.4, 0.2, 0.25, 0.55, 0.6, 1.2, 1.2, 0.0])
    out += (drone * lvl)[:, None]

    # 2) pad akordowy (a-moll – F – d-moll – E), miękkie piły z detune
    chords = [(0, [57, 60, 64, 69]), (4, [53, 57, 60, 65]), (9, [50, 57, 62, 65]), (15, [52, 56, 59, 64]),
              (21, [45, 57, 60, 64]), (26, [53, 57, 60, 64]), (28, [57, 61, 64, 69])]
    pad = np.zeros((N, 2))
    for k, (t0, notes) in enumerate(chords):
        t1 = chords[k + 1][0] if k + 1 < len(chords) else DURATION
        n = int((t1 - t0 + 1.2) * SR)
        tt = np.arange(n) / SR
        sig = np.zeros((n, 2))
        for m in notes:
            f = midi(m)
            for ch, dt in ((0, -0.003), (1, 0.003)):
                sig[:, ch] += saw(f, tt + rng.random(), dt) + 0.5 * saw(f * 2, tt, -dt)
        sig = lp(sig.T, 1400).T
        sig *= env_adsr(n, 1.0, 0.5, 0, 1.2, 0.8)[:, None]
        place(pad, sig, t0, 0.018)
    pad_lvl = np.interp(T, [0, 1, 15, 17.8, 18.0, 21, 21.5, 26, 27, 30], [0.4, 1, 1, 1.3, 0.0, 0.0, 0.8, 0.8, 1.3, 1.0])
    out += pad * pad_lvl[:, None]

    # 3) puls „serca” – sub-kick, przyspiesza przed horyzontem
    beat_times = []
    t = 4.0
    while t < 17.9:
        beat_times.append(t)
        beat_times.append(t + 0.22)
        bpm = 64 if t < 15 else 64 + (t - 15) * 30
        t += 60 / bpm
    for bt in beat_times:
        n = int(0.45 * SR)
        tt = np.arange(n) / SR
        f = 48 + 60 * np.exp(-tt * 30)
        k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
        place(out, np.stack([k, k], 1), bt, 0.30)

    # 4) narastający riser przed horyzontem (15–18 s)
    n = int(3.0 * SR)
    tt = np.arange(n) / SR
    noise = rng.normal(size=n)
    riser = np.zeros(n)
    for i in range(0, n, 2400):
        f = 300 + 5000 * (i / n) ** 2
        riser[i:i + 2400] = bp(noise[i:i + 2400 + 2400], f * 0.8, f * 1.25)[:2400][: len(riser[i:i + 2400])]
    riser += 0.3 * np.sin(2 * np.pi * np.cumsum(80 + 600 * (tt / 3) ** 2) / SR)
    riser *= (tt / 3) ** 2
    place(out, np.stack([riser, riser], 1), 15.0, 0.06)

    # 5) migotliwe dzwonki tajemnicy (21–26 s) – pentatonika w wysokim rejestrze
    bell_notes = [81, 84, 88, 86, 93, 91, 88, 84, 86, 81]
    for i, m in enumerate(bell_notes):
        bt = 21.3 + i * 0.48
        n = int(2.5 * SR)
        tt = np.arange(n) / SR
        f = midi(m)
        s = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 3)) * np.exp(-tt * 2.2)
        pan = 0.5 + 0.4 * np.sin(i * 1.7)
        place(out, np.stack([s * (1 - pan), s * pan], 1), bt, 0.035)
    # finałowe arpeggio na końcu
    for i, m in enumerate([69, 72, 76, 81, 84]):
        bt = 26.4 + i * 0.35
        n = int(3 * SR)
        tt = np.arange(n) / SR
        f = midi(m)
        s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 1.6)
        place(out, np.stack([s, s], 1), bt, 0.03)
    return reverb(out, 0.35)


# --------------------------------------------------------------------------- efekty
def boom(length=3.0, f0=38, punch=1.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = f0 + 90 * np.exp(-tt * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
    crack = lp(rng.normal(size=n), 2500) * np.exp(-tt * 25) * 0.6 * punch
    rumble = lp(rng.normal(size=n), 90, 4) * np.exp(-tt * 1.2) * 4.0
    s = body + crack + rumble
    return np.stack([s, s], 1) / np.abs(s).max()


def whoosh(length=0.9, up=True, seed=0):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    tt = np.arange(n) / SR
    x = r.normal(size=n)
    y = np.zeros(n)
    blk = 960
    for i in range(0, n, blk):
        p = i / n
        f = 300 + 3500 * (p if up else 1 - p) ** 1.5
        seg = bp(x[max(0, i - blk):i + blk], f * 0.6, min(f * 1.6, 20000))
        y[i:i + blk] = seg[-min(blk, n - i):] if i > 0 else seg[:min(blk, n - i)]
    e = np.sin(np.pi * np.clip(tt / length, 0, 1)) ** 2
    y *= e
    pan = np.linspace(-0.8, 0.8, n) if up else np.linspace(0.8, -0.8, n)
    st = np.stack([y * (1 - pan) / 2 + y * 0.3, y * (1 + pan) / 2 + y * 0.3], 1)
    return st / np.abs(st).max()


def tick(freq=2600, length=0.06):
    n = int(length * SR)
    tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * tt) + 0.5 * np.sin(2 * np.pi * freq * 1.5 * tt)) * np.exp(-tt * 90)
    s += hp(rng.normal(size=n), 3000) * np.exp(-tt * 200) * 0.5
    return np.stack([s, s], 1)


def shimmer(length=2.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for k in range(14):
        f = rng.uniform(2500, 7000)
        s += np.sin(2 * np.pi * f * tt + rng.random() * 6) * np.exp(-((tt - rng.uniform(0.1, length - 0.3)) / 0.12) ** 2)
    return np.stack([s, np.roll(s, 300)], 1) / 8


def sfx(timing):
    out = np.zeros((N, 2))
    # start – kinowe uderzenie
    place(out, boom(3.5, 34), 0.0, 0.85)
    # whooshe na przejściach
    for i, t in enumerate(TRANSITIONS):
        big = t in (18.0, 26.0)
        place(out, whoosh(1.1 if big else 0.8, up=(i % 2 == 0), seed=i), t - (0.55 if big else 0.42), 0.40 if big else 0.30)
    # szybki dolot kamery (0–4 s) – narastający szum
    place(out, whoosh(3.6, True, 99), 0.2, 0.18)
    # światło zakrzywiane (4–9 s) – delikatne „ziuuu” promieni
    for k, t in enumerate(np.arange(4.6, 8.6, 0.55)):
        n = int(0.7 * SR)
        tt = np.arange(n) / SR
        f = 1800 - 1200 * tt / 0.7
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.7) ** 2
        pan = 0.5 + 0.4 * np.sin(k)
        place(out, np.stack([s * (1 - pan), s * pan], 1), t, 0.025)
    # tykanie zegara (9–15 s): coraz rzadsze i niższe – dylatacja czasu
    t, k = 9.15, 0
    while t < 15.0:
        p = (t - 9.0) / 6.0
        rate = max(0.18, np.sqrt(max(0.0, 1 - 1 / (10 * (1 - p) + 1.05))))  # tempo zegara jak w obrazie
        place(out, tick(2600 * (0.6 + 0.4 * rate) * (1.0 if k % 2 == 0 else 0.82)), t, 0.22)
        t += 0.42 / rate
        k += 1
    # horyzont zdarzeń: dudnienie 15–18, wielki „bum” w 18 s i podciśnieniowa cisza
    n = int(3.2 * SR)
    tt = np.arange(n) / SR
    rumble = lp(rng.normal(size=n), 70, 4) * (tt / 3.2) ** 1.5 * 6
    rumble += np.sin(2 * np.pi * np.cumsum(30 + 25 * tt / 3.2) / SR) * (tt / 3.2) * 0.8
    place(out, np.stack([rumble, rumble], 1), 15.0, 0.2)
    place(out, boom(4.0, 30, 1.4), 18.0, 1.0)
    # wnętrze: migotanie
    place(out, shimmer(2.5), 21.4, 0.35)
    place(out, shimmer(2.0), 23.6, 0.30)
    # finał: odjazd kamery + uderzenie
    place(out, whoosh(2.4, False, 7), 26.0, 0.28)
    place(out, boom(3.0, 40, 0.8), 25.95, 0.35)
    return out


def main():
    voice, sr = sf.read(os.path.join(BUILD, "voice.wav"))
    assert sr == SR
    voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
    m = music()
    fx = sfx(json.load(open(os.path.join(BUILD, "timing.json"))))
    # ducking muzyki pod lektora
    env = np.convolve(np.abs(voice), np.ones(4800) / 4800, "same")
    env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
    env = np.convolve(env, np.ones(9600) / 9600, "same")
    duck = 1 - 0.45 * env
    bed = m * duck[:, None] * 0.19 + fx * (1 - 0.4 * env)[:, None] * 0.26
    v2 = np.stack([voice, voice], 1)
    for t0 in range(int(DURATION)):
        sl = slice(t0 * SR, (t0 + 1) * SR)
        rv = 20 * np.log10(np.sqrt((v2[sl] ** 2).mean()) + 1e-9)
        rb = 20 * np.log10(np.sqrt((bed[sl] ** 2).mean()) + 1e-9)
        print(f"{t0:2d}s  lektor {rv:6.1f} dB   tło {rb:6.1f} dB")
    mix = bed + v2
    # wyciszenie na końcu
    fade = np.clip((DURATION - T) / 0.6, 0, 1)
    mix *= fade[:, None]
    mix /= np.abs(mix).max() / 0.95
    sf.write(os.path.join(BUILD, "mix.wav"), mix.astype(np.float32), SR)
    sf.write(os.path.join(BUILD, "music_fx.wav"), (m * 0.9 + fx * 0.75).astype(np.float32) / np.abs(m * 0.9 + fx * 0.75).max() * 0.9, SR)
    print("Zapisano build/mix.wav")


if __name__ == "__main__":
    main()
