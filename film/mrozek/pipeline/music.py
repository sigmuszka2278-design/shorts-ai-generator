"""Spokojna muzyka fortepianowa do filmu – komponowana i syntezowana w kodzie (bez cudzych nagrań).

Fortepian: synteza addytywna (alikwoty z lekką nieharmonicznością, osobne tempo wybrzmiewania
dla każdego alikwotu, miękki atak młoteczka), pogłos: splot z syntetyczną odpowiedzią sali.
Forma: d-moll, 60 BPM, powolne arpeggia lewej ręki i rzadka, śpiewna melodia prawej.
Sekcje (w sekundach) dopasowują nastrój do rozdziałów filmu.

Użycie:  python film/mrozek/pipeline/music.py [długość_s]
Wynik:   public/mrozek/music/piano.m4a
"""
import os
import subprocess
import sys

import numpy as np
from scipy.signal import fftconvolve

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SR = 44100
BPM = 60
BEAT = 60 / BPM


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def piano_note(m: int, dur: float, vel: float, rng: np.random.Generator) -> np.ndarray:
    f0 = midi_hz(m)
    length = dur + 2.5
    t = np.arange(int(length * SR)) / SR
    B = 0.00012 * (f0 / 261.0)  # nieharmoniczność strun
    out = np.zeros_like(t)
    for k in range(1, 13):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = (0.9 ** k) / k ** 0.6 * (1.0 if k > 1 else 1.2)
        amp *= 1 + 0.25 * vel * (k - 1) / 6  # mocniejsze uderzenie = jaśniejsza barwa
        decay = (0.9 + 0.012 * m) * (1 + 0.45 * k)  # wyższe alikwoty gasną szybciej
        detune = 1 + rng.normal(0, 0.0004)
        out += amp * np.sin(2 * np.pi * fk * detune * t + rng.uniform(0, 6.28)) * np.exp(-decay * t / 3.2)
    attack = 1 - np.exp(-t / 0.004)
    # tłumik po puszczeniu klawisza
    release = np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.35))
    hammer = rng.normal(0, 1, len(t)) * np.exp(-t / 0.006) * 0.02
    return (out * attack * release + hammer) * vel * (0.85 if m > 70 else 1.0)


def reverb_ir(seconds: float = 3.2) -> np.ndarray:
    rng = np.random.default_rng(3)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-t / 0.75)
    # łagodniejsze wysokie tony w ogonie
    k = 64
    ir = np.convolve(ir, np.ones(k) / k, mode="same") * 0.6 + ir * 0.4 * np.exp(-t / 0.15)
    ir[0] = 1.0
    return ir / np.abs(ir).sum() * 6


# akordy (MIDI) – d-moll: i – VI – III – VII, iv – i – V…
PROGS = {
    "calm": [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]],
    "dark": [[50, 57, 62, 65], [43, 50, 55, 58], [45, 52, 57, 61], [50, 57, 62, 65]],
    "warm": [[41, 48, 53, 57], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]],
}
# melodia: (akord, takt w akordzie, wysokość) – prosty, śpiewny motyw
MOTIF = [74, 72, 69, 72, 70, 69, 65, 67]


def compose(total: float) -> np.ndarray:
    rng = np.random.default_rng(7)
    out = np.zeros(int((total + 6) * SR))
    bar = 4 * BEAT
    sections = [(0, "calm"), (95, "dark"), (150, "calm"), (215, "warm"), (290, "dark"), (330, "calm"), (380, "warm")]
    t = 0.0
    bar_i = 0
    while t < total:
        mood = [m for s, m in sections if s <= t][-1]
        chord = PROGS[mood][bar_i % 4]
        # lewa ręka: bas + arpeggio ósemkowe
        events = [(0.0, chord[0] - 12, 3.8, 0.42)]
        pattern = [chord[1], chord[2], chord[3], chord[2]]
        for j, n in enumerate(pattern * 2):
            events.append((j * BEAT / 2, n, 1.6, 0.20 + 0.04 * (j % 4 == 0)))
        # prawa ręka: rzadka melodia co drugi takt
        if bar_i % 2 == 1 and mood != "dark":
            m = MOTIF[(bar_i // 2) % len(MOTIF)]
            events.append((BEAT * 0.5, m, 2.4, 0.30))
            events.append((BEAT * 2.5, MOTIF[(bar_i // 2 + 3) % len(MOTIF)], 1.4, 0.22))
        elif mood == "dark" and bar_i % 2 == 1:
            events.append((BEAT, chord[3] + 12, 2.8, 0.18))
        for off, m, dur, vel in events:
            jitter = rng.normal(0, 0.008)
            s = int((t + off + jitter) * SR)
            if s < 0:
                continue
            note = piano_note(m, dur, vel * rng.uniform(0.9, 1.05), rng)
            e = min(len(out), s + len(note))
            out[s:e] += note[: e - s]
        t += bar
        bar_i += 1
    wet = fftconvolve(out, reverb_ir())[: len(out)]
    mix = out * 0.55 + wet * 0.45
    fade = np.ones_like(mix)
    n_in, n_out = int(4 * SR), int(8 * SR)
    fade[:n_in] = np.linspace(0, 1, n_in)
    end = int(total * SR)
    fade[end - n_out:end] = np.linspace(1, 0, n_out)
    fade[end:] = 0
    mix *= fade
    return mix[:end] / (np.abs(mix).max() + 1e-9) * 0.8


def main() -> None:
    total = float(sys.argv[1]) if len(sys.argv) > 1 else 440
    audio = compose(total)
    out_dir = os.path.join(ROOT, "public", "mrozek", "music")
    os.makedirs(out_dir, exist_ok=True)
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-c:a", "aac", "-b:a", "128k", os.path.join(out_dir, "piano.m4a")], input=pcm, check=True)
    print(f"Muzyka: {total:.0f}s → public/mrozek/music/piano.m4a")


if __name__ == "__main__":
    main()
