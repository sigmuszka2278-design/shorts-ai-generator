#!/usr/bin/env python3
"""
Builds the audio and the caption timeline for the "honey never spoils" Short.

  python3 scripts/honey/build_audio.py

Steps
  1. Polish male voiceover – Piper neural TTS, voice "pl_PL-darkman-medium"
     (downloaded once from the sherpa-onnx GitHub release into .cache/tts).
  2. Word timing – each sentence is synthesised separately; pauses inside it
     are detected and matched to commas / colons, words inside each segment
     are timed by syllable count. Captions are 2–4 words, highlighted words
     come from *asterisks* in scripts/honey/script.json.
  3. Music + sound design – synthesised (no licensed assets): warm pad,
     pulse, cut whooshes / sub hits, honey drips, torch crackle, bee buzz.
  4. Mix (voice ducking, loudness -14 LUFS) → public/honey/soundtrack.wav
     and remotion/honey/timeline.json.

Requirements: python3, numpy, piper-tts (pip install piper-tts), ffmpeg.
"""
from __future__ import annotations

import io
import json
import math
import re
import subprocess
import sys
import tarfile
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "honey" / "script.json"
CACHE = ROOT / ".cache" / "tts"
OUT_AUDIO = ROOT / "public" / "honey" / "soundtrack.wav"
OUT_VOICE = ROOT / "public" / "honey" / "voiceover.wav"
OUT_TIMELINE = ROOT / "remotion" / "honey" / "timeline.json"

VOICE = "pl_PL-darkman-medium"
VOICE_URL = f"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-{VOICE}.tar.bz2"
SR = 48000

# Energetic, conversational pace. Scene 1 has only 3 s, so it is read faster
# and may spill a few hundred ms over the first cut (a classic J-cut).
LENGTH_SCALE = {"default": 0.9, "spoon-intro": 0.74, "spoon-outro": 0.84}
SENTENCE_GAP = 0.14  # seconds between sentences inside a scene
SCENE_LEAD = 0.12  # voice starts this long after a cut


# ───────────────────────────── TTS ─────────────────────────────


def ensure_voice() -> Path:
    model = CACHE / f"vits-piper-{VOICE}" / f"{VOICE}.onnx"
    if model.exists():
        return model
    CACHE.mkdir(parents=True, exist_ok=True)
    print("Pobieranie głosu", VOICE, "…")
    data = urllib.request.urlopen(VOICE_URL, timeout=300).read()
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:bz2") as tar:
        tar.extractall(CACHE, filter="data")
    return model


def synth(voice, text: str, length_scale: float) -> np.ndarray:
    from piper import SynthesisConfig

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voice.synthesize_wav(
            text, w, syn_config=SynthesisConfig(length_scale=length_scale, noise_scale=0.6, noise_w_scale=0.75)
        )
    buf.seek(0)
    with wave.open(buf) as w:
        sr = w.getframerate()
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return resample(pcm, sr, SR)


def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    """High-quality resampling + light voice processing through ffmpeg."""
    proc = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(sr_in), "-ac", "1", "-i", "pipe:0",
            "-af", f"aresample={sr_out},highpass=f=70,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=3,"
                   "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2",
            "-f", "f32le", "-ac", "1", "pipe:1",
        ],
        input=x.astype(np.float32).tobytes(), capture_output=True, check=True,
    )
    return np.frombuffer(proc.stdout, dtype=np.float32).copy()


# ───────────────────────── word timing ─────────────────────────

VOWELS = set("aąeęioóuy")


def syllables(word: str) -> int:
    w = re.sub(r"[^a-ząćęłńóśźż]", "", word.lower())
    count, prev = 0, False
    for i, ch in enumerate(w):
        v = ch in VOWELS
        # "i" before another vowel only softens the consonant (e.g. "nie", "pszczoły" ok)
        if v and ch == "i" and i + 1 < len(w) and w[i + 1] in VOWELS:
            v = False
        if v and not prev:
            count += 1
        prev = v
    return max(1, count)


def envelope(x: np.ndarray, hop: int = 480) -> np.ndarray:
    n = len(x) // hop
    return np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)


def trim(x: np.ndarray) -> np.ndarray:
    env = envelope(x)
    on = np.where(env > env.max() * 0.04)[0]
    if len(on) == 0:
        return x
    a = max(0, on[0] * 480 - 480)
    b = min(len(x), (on[-1] + 2) * 480)
    return x[a:b]


def pauses(x: np.ndarray, min_len: float = 0.07) -> list[tuple[float, float]]:
    """Internal pauses (start, end) in seconds."""
    env = envelope(x)
    quiet = env < env.max() * 0.035
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet) and (j - i) * 0.01 >= min_len:
                out.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return out


def time_words(words: list[str], audio: np.ndarray) -> list[tuple[float, float]]:
    """Returns (start, end) for every word, relative to the sentence audio."""
    dur = len(audio) / SR
    breaks = [i for i, w in enumerate(words[:-1]) if re.search(r"[,:;—–]$", w)]
    found = pauses(audio)
    segments: list[tuple[int, int, float, float]] = []  # word range + time range
    if breaks and len(found) >= len(breaks):
        chosen = sorted(sorted(found, key=lambda p: p[1] - p[0], reverse=True)[: len(breaks)])
        bounds_w = [0] + [b + 1 for b in breaks] + [len(words)]
        bounds_t = [(0.0, 0.0)] + chosen + [(dur, dur)]
        for k in range(len(bounds_w) - 1):
            segments.append((bounds_w[k], bounds_w[k + 1], bounds_t[k][1], bounds_t[k + 1][0]))
    else:
        segments.append((0, len(words), 0.0, dur))

    times: list[tuple[float, float]] = []
    for w0, w1, t0, t1 in segments:
        weights = [syllables(w) + 0.35 for w in words[w0:w1]]
        total = sum(weights)
        t = t0
        for wt in weights:
            d = (t1 - t0) * wt / total
            times.append((t, t + d))
            t += d
    return times


FUNCTION_WORDS = {"w", "i", "a", "do", "po", "na", "z", "że", "co", "to", "się", "go", "mu", "ten", "który"}


def chunk_words(words: list[str], flags: list[bool]) -> list[list[int]]:
    """Split a sentence into caption chunks of 2–4 words.

    Prefers breaks at punctuation, avoids ending a chunk on a short function
    word and avoids splitting a highlighted phrase."""
    n = len(words)
    if n <= 4:
        return [list(range(n))]
    best: list[float] = [math.inf] * (n + 1)
    prev = [0] * (n + 1)
    best[0] = 0
    for end in range(2, n + 1):
        for size in (2, 3, 4):
            start = end - size
            if start < 0 or best[start] == math.inf:
                continue
            cost = best[start] + abs(size - 3) * 0.6
            inner = words[start : end - 1]
            cost += sum(2.0 for w in inner if re.search(r"[,:;.?!]$", w))
            if end < n and not re.search(r"[,:;.?!]$", words[end - 1]):
                cost += 0.4
                if words[end - 1].lower() in FUNCTION_WORDS:
                    cost += 0.7
                if flags[end - 1] and flags[end]:
                    cost += 0.9
            if cost < best[end]:
                best[end], prev[end] = cost, start
    chunks, end = [], n
    while end > 0:
        chunks.append(list(range(prev[end], end)))
        end = prev[end]
    return chunks[::-1]


# ─────────────────────────── sound design ───────────────────────────

rng = np.random.default_rng(7)


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):  # simple one-pole, fine for a few seconds of audio
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def lowpass_fast(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Zero-phase FFT lowpass with a soft knee – used for long buffers."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, n=len(x)).astype(np.float32)


def add(buf: np.ndarray, sig: np.ndarray, at: float, gain: float = 1.0) -> None:
    s = int(at * SR)
    if s < 0:
        sig, s = sig[-s:], 0
    if s >= len(buf):
        return
    e = min(len(buf), s + len(sig))
    buf[s:e] += sig[: e - s] * gain


def note(midi: float) -> float:
    return 440 * 2 ** ((midi - 69) / 12)


def pad(total: float) -> np.ndarray:
    """Warm, slowly evolving chord bed (D – Bm – G – A), 4 s per chord."""
    out = np.zeros(int(total * SR), dtype=np.float32)
    chords = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]]
    seg = 4.0
    for k in range(math.ceil(total / seg) + 1):
        ch = chords[k % 4]
        t = t_axis(seg + 1.5)
        env = np.minimum(1, t / 1.2) * np.clip((seg + 1.5 - t) / 1.5, 0, 1)
        sig = np.zeros_like(t)
        for m in ch:
            f = note(m)
            for det in (-0.12, 0.12):
                ph = 2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6.28)
                sig += np.sin(ph) * 0.5 + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
        add(out, (sig * env / len(ch)).astype(np.float32), k * seg - 0.5, 0.22)
    return lowpass_fast(out, 1800)


def kick() -> np.ndarray:
    t = t_axis(0.35)
    f = 48 + 90 * np.exp(-t * 28)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)).astype(np.float32)


def hat() -> np.ndarray:
    t = t_axis(0.06)
    n = rng.standard_normal(len(t)).astype(np.float32)
    n = n - lowpass(n, 6000)
    return n * np.exp(-t * 70) * 0.5


def sub_hit() -> np.ndarray:
    t = t_axis(1.6)
    f = 34 + 40 * np.exp(-t * 6)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)).astype(np.float32)


def whoosh(length: float = 0.55, reverse: bool = True) -> np.ndarray:
    t = t_axis(length)
    n = rng.standard_normal(len(t)).astype(np.float32)
    shape = (t / length) ** 2.2 if reverse else np.sin(np.pi * t / length)
    lp = lowpass(n, 2500) - lowpass(n, 250)
    return lp * shape * 2.2


def drip() -> np.ndarray:
    t = t_axis(0.25)
    f = 650 + 1300 * (1 - np.exp(-t * 30))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * 0.7).astype(np.float32)


def crackle(sec: float) -> np.ndarray:
    out = np.zeros(int(sec * SR), dtype=np.float32)
    base = lowpass_fast(rng.standard_normal(len(out)).astype(np.float32), 500) * 0.25
    out += base
    for _ in range(int(sec * 9)):
        at = rng.uniform(0, sec)
        t = t_axis(rng.uniform(0.004, 0.02))
        pop = rng.standard_normal(len(t)).astype(np.float32) * np.exp(-t * 300)
        add(out, pop, at, rng.uniform(0.2, 0.9))
    return out


def buzz(sec: float) -> np.ndarray:
    t = t_axis(sec)
    out = np.zeros_like(t)
    for f0, amp in ((228, 1.0), (241, 0.7), (215, 0.6)):
        f = f0 * (1 + 0.03 * np.sin(2 * np.pi * rng.uniform(0.3, 1.1) * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
        out += saw * amp * (0.55 + 0.45 * np.sin(2 * np.pi * rng.uniform(0.15, 0.4) * t + rng.uniform(0, 6)))
    return lowpass_fast(out.astype(np.float32), 1600) * 0.25


def ding() -> np.ndarray:
    t = t_axis(1.4)
    sig = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((1568, 1), (3136, 0.3), (4700, 0.12)))
    return (sig * np.exp(-t * 4) * 0.4).astype(np.float32)


def shrivel() -> np.ndarray:
    t = t_axis(1.1)
    f = 900 * np.exp(-t * 2.2) + 120
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * 0.4
    fizz = (rng.standard_normal(len(t)) * np.exp(-t * 3) * 0.15)
    return (tone + fizz).astype(np.float32)


# ───────────────────────────── main ─────────────────────────────


def main() -> None:
    from piper import PiperVoice

    spec = json.loads(SCRIPT.read_text(encoding="utf8"))
    total = float(spec["durationInSeconds"])
    voice = PiperVoice.load(str(ensure_voice()))

    vo = np.zeros(int(total * SR), dtype=np.float32)
    captions, sentences = [], []
    cursor = 0.0
    for si, scene in enumerate(spec["scenes"]):
        t = max(scene["start"] + (SCENE_LEAD if si else 0.05), cursor + SENTENCE_GAP)
        scale = LENGTH_SCALE.get(scene["id"], LENGTH_SCALE["default"])
        for line in scene["voiceover"]:
            raw_words = line.split()
            # a *highlight* can span several words: "*trzy tysiące lat*."
            inside, flags = False, []
            for w in raw_words:
                if w.startswith("*"):
                    inside = True
                flags.append(inside)
                if re.search(r"\w\*", w):
                    inside = False
            words = [w.replace("*", "") for w in raw_words]
            audio = trim(synth(voice, " ".join(words), scale))
            dur = len(audio) / SR
            add(vo, audio, t)
            wt = time_words(words, audio)
            for chunk in chunk_words(words, flags):
                captions.append(
                    {
                        "start": round(t + wt[chunk[0]][0], 3),
                        "end": round(t + wt[chunk[-1]][1], 3),
                        "scene": scene["id"],
                        "words": [
                            {"text": words[i], "start": round(t + wt[i][0], 3), "highlight": bool(flags[i])}
                            for i in chunk
                        ],
                    }
                )
            sentences.append({"scene": scene["id"], "text": " ".join(words), "start": round(t, 3), "end": round(t + dur, 3)})
            if si + 1 < len(spec["scenes"]) and t + dur > spec["scenes"][si + 1]["start"] + 0.8:
                print(f"UWAGA: zdanie wykracza za scenę: {line!r} ({t + dur:.2f} s)", file=sys.stderr)
            t += dur + SENTENCE_GAP
            cursor = t - SENTENCE_GAP

    # keep each caption on screen until the next one starts (no flicker in short gaps)
    for a, b in zip(captions, captions[1:]):
        gap = b["start"] - a["end"]
        a["end"] = round(b["start"] if gap < 0.45 else a["end"] + 0.25, 3)
    captions[-1]["end"] = round(min(total - 0.05, captions[-1]["end"] + 0.6), 3)

    # ── music & sfx ──
    music = pad(total)
    beat = 60 / 100
    drums = np.zeros_like(music)
    for k in range(int(total / beat)):
        tb = k * beat
        if 3 <= tb < 39.4:
            add(drums, kick(), tb, 0.55 if k % 2 == 0 else 0.32)
            add(drums, hat(), tb + beat / 2, 0.35)
    sfx = np.zeros_like(music)
    for cut in [s["start"] for s in spec["scenes"][1:]]:
        add(sfx, whoosh(0.5), cut - 0.5, 0.55)
        add(sfx, sub_hit(), cut, 0.7)
    for at in (0.6, 1.9, 2.6, 34.2, 35.6, 37.1, 38.4):
        add(sfx, drip(), at, 0.35)
    add(sfx, crackle(7.0), 3.0, 0.22)
    add(sfx, shrivel(), 13.6, 0.5)
    add(sfx, drip(), 19.4, 0.5)
    add(sfx, ding(), 20.2, 0.45)
    add(sfx, buzz(8.0) * np.minimum(1, t_axis(8.0) / 0.3) * np.clip((8 - t_axis(8.0)) / 0.3, 0, 1), 25.0, 0.6)

    # duck music under the voice
    env = envelope(vo, hop=480)
    env = np.convolve(env > env.max() * 0.05, np.ones(25) / 25, mode="same")
    duck = 1 - 0.55 * np.repeat(env, 480)
    duck = np.pad(duck, (0, len(music) - len(duck)), constant_values=1)[: len(music)]

    bed = (music * 0.9 + drums * 0.5) * duck + sfx * 0.8
    # short fades so the end flows into the start when the Short loops
    fade = int(0.08 * SR)
    bed[:fade] *= np.linspace(0.4, 1, fade)
    bed[-fade:] *= np.linspace(1, 0.4, fade)

    vo_n = vo / (np.abs(vo).max() + 1e-9) * 0.9
    bed_n = bed / (np.abs(bed).max() + 1e-9) * 0.45
    # subtle stereo: bed slightly wide, voice centred
    wide = np.roll(bed_n, int(0.011 * SR))
    left = vo_n + bed_n * 0.9 + wide * 0.1
    right = vo_n + bed_n * 0.1 + wide * 0.9
    stereo = np.stack([left, right], axis=1).astype(np.float32)

    OUT_AUDIO.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0",
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(SR), "-c:a", "pcm_s16le", str(OUT_AUDIO),
        ],
        input=stereo.tobytes(), check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
            "-c:a", "pcm_s16le", str(OUT_VOICE),
        ],
        input=vo_n.astype(np.float32).tobytes(), check=True,
    )

    OUT_TIMELINE.parent.mkdir(parents=True, exist_ok=True)
    OUT_TIMELINE.write_text(
        json.dumps(
            {
                "title": spec["title"],
                "durationInSeconds": total,
                "fps": spec["fps"],
                "voice": f"Piper {VOICE}",
                "scenes": [{"id": s["id"], "start": s["start"], "end": s["end"]} for s in spec["scenes"]],
                "sentences": sentences,
                "captions": captions,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf8",
    )
    for s in sentences:
        print(f"{s['start']:6.2f}–{s['end']:6.2f}  [{s['scene']}] {s['text']}")
    print("✓", OUT_AUDIO.relative_to(ROOT), "✓", OUT_TIMELINE.relative_to(ROOT))


if __name__ == "__main__":
    main()
