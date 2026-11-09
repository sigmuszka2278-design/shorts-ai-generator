"""Ścieżka dźwiękowa: tajemnicza muzyka, efekty zsynchronizowane z ruchem obiektów i lektor (build/voice_*.npy)."""
import json
import wave
from pathlib import Path

import numpy as np

SR = 48000
DUR = 25.0
N = int(SR * DUR)
OUT = Path(__file__).parent / "build"
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR


def buf():
    return np.zeros((N, 2))


def place(dst, sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j = min(N, i + len(sig))
    if j > i:
        dst[i:j] += sig[: j - i] * gain


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lowpass(x, fc):
    """jednobiegunowy filtr dolnoprzepustowy; fc może być tablicą"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def bandnoise(n, f0, f1, q=6):
    """szum przefiltrowany pasmowo (przez FFT) z przemiataniem f0->f1 aproksymowanym blokami"""
    out = np.zeros(n)
    blk = 2048
    for s in range(0, n, blk):
        m = min(blk * 2, n - s)
        u = s / max(1, n)
        fc = f0 * (f1 / f0) ** u
        x = rng.standard_normal(m)
        X = np.fft.rfft(x)
        f = np.fft.rfftfreq(m, 1 / SR)
        X *= np.exp(-0.5 * ((np.log2(np.maximum(f, 1) / fc)) * q / 2) ** 2)
        y = np.fft.irfft(X, m) * np.hanning(m)
        out[s:s + m] += y[: len(out[s:s + m])]
    return out / (np.abs(out).max() + 1e-9)


def tone(freq, n, harm=(1,), amps=None, phase=0):
    t = np.arange(n) / SR
    amps = amps or [1 / (k) for k in harm]
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    ph = 2 * np.pi * np.cumsum(f) / SR + phase
    return sum(a * np.sin(k * ph) for k, a in zip(harm, amps))


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


# ───────────────────────── muzyka ─────────────────────────
music = buf()
CHORDS = [[50, 53, 57, 60], [46, 50, 53, 57], [43, 46, 50, 55], [45, 49, 52, 57]]  # Dm, Bb, Gm, A
for bar in range(int(DUR / 4) + 1):
    ch = CHORDS[bar % 4]
    st = bar * 4.0
    n = int(4.4 * SR)
    sig = np.zeros(n)
    for m in ch:
        for det in (-0.07, 0.07):
            sig += tone(note(m - 12) * 2 ** (det / 12), n, harm=range(1, 9))
    t = np.arange(n) / SR
    sig *= np.minimum(1, t / 0.6) * np.minimum(1, (4.4 - t) / 0.6)
    sig = lowpass(sig, 500 + 400 * np.sin(np.pi * t / 4.4))
    place(music, sig * 0.035, st, pan=-0.2 if bar % 2 else 0.2)
    # bas
    b = tone(note(ch[0] - 24), n, harm=(1, 2, 3), amps=[1, 0.3, 0.1]) * np.minimum(1, t / 0.05) * np.exp(-t / 3)
    place(music, b * 0.12, st)
# pozytywka (arpeggio w ósemkach)
pattern = [0, 2, 1, 3, 2, 1, 3, 2]
for k in range(int(DUR / 0.25)):
    st = k * 0.25
    ch = CHORDS[int(st // 4) % 4]
    m = ch[pattern[k % 8]] + 24
    if k % 16 == 15:
        continue
    n = int(1.2 * SR)
    s = tone(note(m), n, harm=(1, 2, 3, 5), amps=[1, 0.25, 0.12, 0.05]) * env_ad(n, 0.003, 0.35)
    g = 0.05 if st < 12 else 0.065
    place(music, s * g, st, pan=0.5 * np.sin(k * 0.7))
# puls serca / bęben
for k in range(int(DUR / 0.5)):
    st = k * 0.5
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    if st < 12:
        if k % 2 == 0:
            kick = np.sin(2 * np.pi * (50 * t + 40 * (1 - np.exp(-t * 30)) / 30)) * np.exp(-t * 9)
            place(music, kick * 0.16, st)
    elif st < 24.5:
        kick = np.sin(2 * np.pi * (48 * t + 90 * (1 - np.exp(-t * 35)) / 35)) * np.exp(-t * 8)
        place(music, kick * (0.26 if st >= 15.3 else 0.2), st)
        hat = bandnoise(int(0.08 * SR), 8000, 9000, q=2) * env_ad(int(0.08 * SR), 0.001, 0.02)
        place(music, hat * 0.035, st + 0.25, pan=0.3)
        if k % 4 == 2:
            sn = bandnoise(int(0.25 * SR), 1800, 1500, q=1.5) * env_ad(int(0.25 * SR), 0.001, 0.07)
            place(music, sn * 0.08, st)
music *= 0.9

# ───────────────────────── efekty ─────────────────────────
sfx = buf()


def whoosh(start, dur, f0, f1, g=0.35, pan=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = bandnoise(n, f0, f1, q=3) * np.sin(np.pi * t / dur) ** 2
    place(sfx, s * g, start, pan=pan)


def tink(start, g=0.25, base=2650):
    n = int(1.6 * SR)
    s = sum(a * tone(base * r, n) * env_ad(n, 0.001, d) for r, a, d in [(1, 1, 0.5), (1.55, 0.5, 0.3), (2.4, 0.3, 0.18), (3.9, 0.15, 0.1)])
    place(sfx, s * g, start, pan=0.1)


def boom(start, g=0.6, f=42):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (f * t + 60 * (1 - np.exp(-t * 6)) / 6)) * np.exp(-t * 1.6)
    s += bandnoise(n, 300, 80, q=1.5) * np.exp(-t * 4) * 0.4
    place(sfx, s * g, start)


def chime(start, g=0.12, notes=(86, 89, 93, 96, 98)):
    for i, m in enumerate(notes):
        n = int(1.8 * SR)
        place(sfx, tone(note(m), n, harm=(1, 2.76), amps=[1, 0.3]) * env_ad(n, 0.002, 0.6) * g, start + i * 0.07, pan=-0.6 + i * 0.3)


def beep(start, freqs, g=0.12, d=0.09):
    for i, f in enumerate(freqs):
        n = int(d * SR)
        t = np.arange(n) / SR
        s = np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t)
        s = lowpass(s, 3500) * np.minimum(1, t / 0.005) * np.minimum(1, (d - t) / 0.01)
        place(sfx, s * g, start + i * (d + 0.03))


def creak(start, dur, f0=150, f1=230, g=0.18):
    n = int(dur * SR)
    t = np.arange(n) / SR
    jitter = 1 + 0.12 * np.sin(2 * np.pi * 7 * t) + 0.08 * lowpass(rng.standard_normal(n), 20) * 6
    f = (f0 + (f1 - f0) * t / dur) * jitter
    s = tone(f, n, harm=range(1, 14))
    s = lowpass(s, 2200) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 13 * t))) * np.sin(np.pi * t / dur) ** 0.5
    place(sfx, s * g / 3, start, pan=0.5)


# 0–3 s: szklanka unosi się, woda płynie do góry
tink(0.04, 0.22)
n = int(3.8 * SR)
shimmer = np.zeros(n)
for k in range(46):
    st = rng.uniform(0, 3.2)  # n=3.8 s mieści ostatni dźwięk
    m = int(0.35 * SR)
    f = rng.uniform(1500, 4200) * (1 + st / 3)
    shimmer[int(st * SR): int(st * SR) + m] += tone(f, m) * env_ad(m, 0.004, 0.1)
place(sfx, shimmer * 0.05, 0.0)
for k in range(70):  # bulgotanie / bąbelki
    st = rng.uniform(0.0, 7.5) if k > 20 else rng.uniform(0, 3)
    m = int(0.06 * SR)
    tt = np.arange(m) / SR
    f0 = rng.uniform(350, 800)
    s = np.sin(2 * np.pi * (f0 * tt + f0 * 6 * tt * tt)) * env_ad(m, 0.002, 0.018)
    place(sfx, s * (0.11 if st < 3.5 else 0.05), st, pan=rng.uniform(-0.4, 0.4))
# swell magiczny na start
n = int(2.5 * SR)
tt = np.arange(n) / SR
place(sfx, bandnoise(n, 400, 3000, q=2) * np.sin(np.pi * tt / 2.5) * 0.12, 0.0)

# 3–7 s: krzesło, zegar, piłka
creak(3.0, 0.9, 120, 190, 0.22)
n = int(4.5 * SR)
tt = np.arange(n) / SR
hum = tone(68 + 4 * np.sin(2 * np.pi * 0.5 * tt), n, harm=(1, 2, 3), amps=[1, 0.4, 0.15]) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * tt))
place(sfx, hum * np.minimum(1, tt / 0.8) * np.minimum(1, (4.5 - tt) / 1.0) * 0.1, 3.0, pan=-0.3)
whoosh(3.1, 0.9, 300, 900, 0.12, pan=-0.4)


def tick(st, g=0.13, f=3200):
    m = int(0.03 * SR)
    s = bandnoise(m, f, f, q=4) * env_ad(m, 0.0005, 0.006)
    place(sfx, s * g, st, pan=0.35)


for s in range(0, 5):
    tick(s + 0.0, 0.07)
tt_ = 4.2
while tt_ < 7.2:
    rate = min(28, 3 + 14 * (tt_ - 4.2))
    tick(tt_, 0.1 * (1 if tt_ < 6.8 else (7.2 - tt_) / 0.4), 2600 + 300 * np.sin(tt_ * 9))
    tt_ += 1 / rate
n = int(2.6 * SR)
tt = np.arange(n) / SR
whirr = tone(180 + 90 * np.minimum(1, tt), n, harm=range(1, 6)) * np.sin(np.pi * tt / 2.6) ** 2
place(sfx, lowpass(whirr, 1200) * 0.03, 4.4, pan=0.35)
# piłka: start, toczenie, uderzenie w ścianę
m = int(0.25 * SR)
tt = np.arange(m) / SR
place(sfx, np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 25) * 0.35, 5.0, pan=-0.3)
place(sfx, np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 30) * 0.3, 5.62, pan=-0.4)
n = int(3.0 * SR)
tt = np.arange(n) / SR
roll = lowpass(rng.standard_normal(n), 180) * (1 + 0.5 * np.sin(2 * np.pi * 6.3 * tt))
place(sfx, roll / np.abs(roll).max() * np.minimum(1, tt / 0.3) * np.minimum(1, (3 - tt) / 0.8) * 0.3, 5.0, pan=-0.4)
for k in range(3):  # pętla na ścianie – „wuuu”
    whoosh(6.25 + k * 1.0, 0.9, 500, 1400, 0.06, pan=-0.5)

# 7–12 s: drzwi
whoosh(6.95, 0.9, 250, 1500, 0.3, pan=0.4)
tick(8.5, 0.35, 1800)
tick(8.53, 0.25, 1200)
creak(8.6, 1.5, 140, 260, 0.3)
n = int(3.5 * SR)
tt = np.arange(n) / SR
place(sfx, bandnoise(n, 300, 700, q=1.5) * np.minimum(1, tt / 1.0) * np.minimum(1, (3.5 - tt) / 1.0) * 0.08, 9.0, pan=0.4)
n = int(2.1 * SR)
tt = np.arange(n) / SR
riser = bandnoise(n, 300, 6000, q=2) * (tt / 2.1) ** 2 + tone(200 * 2 ** (tt * 1.4), n) * (tt / 2.1) ** 2 * 0.3
place(sfx, riser * 0.22, 10.4)

# 12–18 s: przelot, obrót pokoju, kosmos
boom(12.45, 0.55)
whoosh(12.1, 1.2, 200, 2000, 0.4)
n = int(2.3 * SR)
tt = np.arange(n) / SR
rumble = lowpass(rng.standard_normal(n), 90)
rumble = rumble / np.abs(rumble).max()
groan = lowpass(tone(110 - 40 * tt / 2.3, n, harm=range(1, 10)), 700) * 0.3
place(sfx, (rumble * 0.6 + groan) * np.sin(np.pi * tt / 2.3) * 0.5, 13.2)
whoosh(13.4, 1.8, 150, 600, 0.25, pan=-0.6)
whoosh(14.0, 1.4, 600, 200, 0.25, pan=0.6)
boom(15.3, 0.7, 38)
n = int(3.2 * SR)
tt = np.arange(n) / SR
choir = sum(tone(note(m) * (1 + d), n, harm=(1, 2), amps=[1, 0.2]) for m in (74, 77, 81, 86) for d in (-0.003, 0.003))
place(sfx, choir * np.sin(np.pi * tt / 3.2) ** 2 * 0.025, 15.6)
chime(15.7, 0.08)

# 18–23 s: lustro i robot
whoosh(18.15, 0.7, 400, 3000, 0.35, pan=0.5)
chime(19.4, 0.1, (93, 96, 100, 103, 105))
whoosh(20.45, 0.6, 300, 4000, 0.35)
boom(20.9, 0.55, 36)
chime(20.95, 0.09, (81, 86, 89, 93))
beep(21.7, [880, 1320, 1100], 0.1)
beep(22.3, [1500, 1000], 0.07, 0.06)

# 23–25 s: robot obraca kulę, powrót do początku
n = int(1.8 * SR)
tt = np.arange(n) / SR
glassHum = (tone(523, n) + 0.6 * tone(787, n) + 0.3 * tone(1046 * (1 + 0.002 * np.sin(2 * np.pi * 3 * tt)), n))
place(sfx, glassHum * np.sin(np.pi * tt / 1.8) ** 2 * 0.05, 22.9)
place(sfx, lowpass(rng.standard_normal(n), 120) * np.sin(np.pi * tt / 1.8) * 0.5, 22.9)
beep(23.35, [1200, 1600], 0.06, 0.05)
whoosh(23.85, 0.7, 300, 3500, 0.35)
tink(24.3, 0.18)

# ───────────────────────── lektor ─────────────────────────
voice = buf()
meta = json.loads((OUT / "voice.json").read_text())
venv = np.zeros(N)
for i, line in enumerate(meta):
    v = np.load(OUT / f"voice_{i}.npy").astype(float)
    x = np.arange(int(len(v) * SR / 22050)) / SR * 22050
    v = np.interp(x, np.arange(len(v)), v)
    v = v / (np.abs(v).max() + 1e-9)
    # lekka kompresja + „obecność”
    v = np.tanh(v * 1.8) / np.tanh(1.8)
    hp = v - lowpass(v, 120)
    v = hp + 0.25 * (hp - lowpass(hp, 2500))
    place(voice, v * 0.62, line["start"])
    s = int(line["start"] * SR)
    venv[s: s + len(v)] = 1
venv = np.convolve(venv, np.ones(4800) / 4800, mode="same")

duck = 1 - 0.5 * venv
mix = music * duck[:, None] + sfx * (1 - 0.25 * venv)[:, None] + voice
mix /= np.abs(mix).max() / 0.89
# krótkie wygładzenie początku/końca (bez wyciszenia – pętla)
fade = int(0.01 * SR)
mix[:fade] *= np.linspace(0, 1, fade)[:, None]
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(str(OUT / "audio.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("audio.wav gotowe", mix.shape)
