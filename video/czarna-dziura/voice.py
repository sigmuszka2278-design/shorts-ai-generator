"""
Polski lektor – neuronowy TTS Piper (głos pl_PL „mc_speech”, działa offline).
Każda kwestia jest syntetyzowana, przycinana z ciszy i dopasowywana tempem
do swojego okna w scenariuszu. Zapisuje build/voice.wav (48 kHz) i build/timing.json.
"""
from __future__ import annotations

import glob
import io
import json
import os
import subprocess
import tarfile
import urllib.request
import wave

import numpy as np

from script import DURATION, SEGMENTS

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache")
BUILD = os.path.join(HERE, "build")
VOICE = os.environ.get("VOICE", "mc_speech")
MODEL_URL = f"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-pl_PL-{VOICE}-medium.tar.bz2"
SR = 48000


def model_path() -> str:
    d = os.path.join(CACHE, f"vits-piper-pl_PL-{VOICE}-medium")
    found = glob.glob(os.path.join(d, "*.onnx"))
    if found:
        return found[0]
    os.makedirs(CACHE, exist_ok=True)
    print("Pobieram model głosu:", MODEL_URL)
    data = urllib.request.urlopen(MODEL_URL).read()
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:bz2") as tf:
        tf.extractall(CACHE, filter="data")
    return glob.glob(os.path.join(d, "*.onnx"))[0]


def synth(voice, text: str, length_scale: float) -> tuple[np.ndarray, int]:
    from piper import SynthesisConfig

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=length_scale, noise_scale=0.7, noise_w_scale=0.7))
    buf.seek(0)
    with wave.open(buf, "rb") as r:
        sr = r.getframerate()
        a = np.frombuffer(r.readframes(r.getnframes()), np.int16).astype(np.float32) / 32768
    return a, sr


def trim(a: np.ndarray, sr: int, thr=0.01) -> np.ndarray:
    env = np.convolve(np.abs(a), np.ones(int(sr * 0.01)) / (sr * 0.01), "same")
    idx = np.nonzero(env > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(0.02 * sr))
    e = min(len(a), idx[-1] + int(0.06 * sr))
    return a[s:e]


def synth_line(voice, text: str, ls: float, gap=0.16):
    """Syntetyzuje zdanie po zdaniu i łączy z kontrolowaną pauzą."""
    import re

    parts = [p for p in re.split(r"(?<=[?!.])\s+", text) if p]
    out, sr = [], 22050
    for k, p in enumerate(parts):
        a, sr = synth(voice, p, ls)
        out.append(trim(a, sr))
        if k < len(parts) - 1:
            out.append(np.zeros(int(gap * sr), np.float32))
    return np.concatenate(out), sr


def resample(a: np.ndarray, sr: int, to: int) -> np.ndarray:
    from scipy.signal import resample_poly
    from math import gcd

    g = gcd(sr, to)
    return resample_poly(a, to // g, sr // g).astype(np.float32)


def chunk_times(chunks: list[str], start: float, dur: float) -> list[tuple[float, float]]:
    w = [len(c) + (5 if c.rstrip()[-1] in ",?!." else 0) for c in chunks]
    tot = sum(w)
    out, t = [], start
    for wi in w:
        d = dur * wi / tot
        out.append((t, t + d))
        t += d
    return out


def main():
    from piper import PiperVoice

    os.makedirs(BUILD, exist_ok=True)
    voice = PiperVoice.load(model_path())
    track = np.zeros(int(DURATION * SR) + SR, np.float32)
    timing = []
    for i, (s0, s1, text, chunks, _hl) in enumerate(SEGMENTS):
        lead = 0.08
        avail = (s1 - s0) - lead - 0.12
        # Tempo: naturalne, a gdy jest zapas – lekko zwolnione (dramatyzm); kilka prób, bo Piper jest stochastyczny.
        best = None
        for ls in (1.12, 1.06, 1.0, 0.95, 0.9, 0.86, 0.82):
            for _attempt in range(3):
                a, sr = synth_line(voice, text, ls)
                if len(a) / sr <= avail:
                    best = (ls, a, sr)
                    break
            if best:
                break
        if best is None:
            raise SystemExit(f"Kwestia {i} nie mieści się w oknie {avail:.2f} s")
        ls, a, sr = best
        a = resample(a, sr, SR)
        start = s0 + lead
        i0 = int(start * SR)
        track[i0:i0 + len(a)] += a
        dur = len(a) / SR
        timing.append({"start": start, "end": start + dur, "length_scale": round(ls, 3),
                       "chunks": [{"text": c, "start": a_, "end": b_} for c, (a_, b_) in zip(chunks, chunk_times(chunks, start, dur))]})
        print(f"[{i}] {start:5.2f}–{start + dur:5.2f} s  (okno {s0:.0f}–{s1:.0f}, tempo ×{1 / ls:.2f})  {text}")
    track = track[: int(DURATION * SR)]
    track /= max(1e-6, np.abs(track).max()) / 0.9
    import soundfile as sf

    sf.write(os.path.join(BUILD, "voice_raw.wav"), track, SR)
    # obróbka: filtr górnoprzepustowy, „obecność”, kompresja – głos lektora
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(BUILD, "voice_raw.wav"), "-af",
                    "highpass=f=70,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=3.5,"
                    "equalizer=f=8000:t=q:w=1:g=1.5,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120:makeup=4dB,"
                    "aecho=0.8:0.5:38|61:0.10|0.06",
                    "-ar", str(SR), os.path.join(BUILD, "voice.wav")], check=True)
    with open(os.path.join(BUILD, "timing.json"), "w") as f:
        json.dump(timing, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
